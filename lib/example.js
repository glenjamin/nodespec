var assert = require('assert');

var async = require('async');

exports.Example = Example;
Example.DEFAULT_TIMEOUT = 5;
function Example(description, options, block) {
    this.deps = options.deps;
    delete options.deps;
    this.description = description;
    this.options = options;
    this.timeout = options.timeout || this.constructor.DEFAULT_TIMEOUT;
    this.group = options.group;
    delete options.group;
    this.nodespec = options.nodespec;
    delete options.nodespec;
    this.full_description = this.group.full_description + ' ' + description;
    // Remove 2 from the top - new Error and new Example
    var stack = new Error().stack.split('\n').splice(2);
    // Caller is first line outside nodespec/lib
    for (var i = 0; i < stack.length; ++i) {
        if (!/nodespec\/lib/.test(stack[i])) {
            var calling_line = stack[i];
            break;
        }
    }
    var match = /at (?:.+\()?(.+):(\d+):/.exec(calling_line);
    this.file_path = match[1];
    this.line_number = match[2];

    if (block) {
        this.block = block;
    } else {
        this.is_pending = true;
    }
}

Example.prototype.toString = function() {
    return this.full_description + ' at ' +
           this.file_path + ':' + this.line_number;
};

Example.prototype.timeout_after = function(seconds) {
    this.timeout = seconds;
};

Example.prototype.exec = function(emitter, exec_callback) {
    var example = this;
    emitter.emit('exampleStart', example);
    // No block, bail out early
    if (example.is_pending) {
        finished(null, example.deps.SingleResult.PEND);
        return;
    }
    var ctx = new example.deps.Context(example.nodespec, example.deps);
    async.series(
        {
            subjects: function(cb) { example.setup_subjects(ctx, cb); },
            before:   function(cb) { example.exec_before(ctx, cb); },
            spec:     function(cb) { example.exec_spec(ctx, cb); }
        },
        function(err) {
            example.exec_after(ctx, function(after_err) {
                if (!err) {
                    err = after_err;
                }

                if (!err) {
                    finished(null, example.deps.SingleResult.PASS);
                } else {
                    var error_result;
                    if (err instanceof example.deps.Pending) {
                        error_result = example.deps.SingleResult.PEND;
                    } else if (err instanceof assert.AssertionError) {
                        error_result = example.deps.SingleResult.FAIL;
                    } else {
                        error_result = example.deps.SingleResult.ERROR;
                    }
                    error_result.error = err;
                    finished(null, error_result);
                }
            });
        }
    );
    function finished(err, result) {
        emitter.emit('exampleComplete', example, result);
        // Capitalise result.type to make the event name
        var result_event = result.type[0].toUpperCase() + result.type.slice(1);
        emitter.emit('example' + result_event, example, result.error);
        process.nextTick(function() {
            exec_callback(err, result);
        });
    }
};

Example.prototype.exec_spec = function(context, exec_callback) {
    exec_block({
        example: this, block: this.block, context: context,
        type: 'spec', timeout: this.timeout, check_assertions: true
    }, exec_callback);
};
Example.prototype.setup_subjects = function(context, main_callback) {
    for (var name in this.group.subjects) {
        define_subject(context, name, this.group.subjects[name]);
    }
    main_callback();
};
function define_subject(context, name, subject) {
    var value;
    Object.defineProperty(context, name, {
        get: function() {
            if (value)
                return value;
            return value = subject.call(context);
        }
    });
}
Example.prototype.exec_before = function(context, exec_callback) {
    var example = this;
    async.forEachSeries(this.group.before_hooks,
        function iterator(block, callback) {
            exec_block({
                example: example, block: block, context: context,
                type: 'before', timeout: 2, check_assertions: false
                // TODO: configure hook timeout
            }, callback);
        },
        exec_callback
    );
};
Example.prototype.exec_after = function(context, exec_callback) {
    var example = this;
    var errors = [];
    async.forEachSeries(this.group.after_hooks,
        function iterator(block, callback) {
            exec_block({
                example: example, block: block, context: context,
                type: 'after', timeout: 2, check_assertions: false
                // TODO: configure hook timeout
            }, function(err) {
                if (err) errors.push(err);
                callback();
            });
        },
        function() {
            var err;
            if (errors.length == 1) {
                err = errors.pop();
            } else if (errors.length > 1) {
                err = new Error('Multiple failures in after blocks');
                err.errors = errors;
            }
            exec_callback(err);
        }
    );
};

function exec_block(options, callback) {
    var block = options.block;
    var func = (block.length == 1) ? exec_block_async : exec_block_sync ;
    func(options, callback);
}

function exec_block_sync(options, callback) {
    var context = options.context;
    var block = options.block;
    context._setup_done(false);
    var err;
    try {
        block.call(context);
        if (options.check_assertions) {
            err = check_expected_assertions(context);
        }
    } catch (ex) {
       err = ex;
    }
    callback(err);
}

function exec_block_async(options, callback) {
    // This method is rather spidery, everything sort of calls everything else
    // at some point it might be worth trying to tidy it up some more
    var context = options.context;
    var block = options.block;

    var done_timer, ignore_timer;
    // Use the process hook to capture any uncaught error
    var old_listeners = process.listeners('uncaughtException');
    process.removeAllListeners('uncaughtException');
    var cleanup_and_callback = function(err) {
        // Only run cleanup once, but if we get an error later better not eat it
        cleanup_and_callback = function(err) {
            if (err) throw err;
        }

        context._setup_done(function(){});
        clearTimeout(done_timer);
        ignore_timer = true;
        process.removeListener('uncaughtException', arguments.callee);
        old_listeners.forEach(function(listener) {
            process.on('uncaughtException', listener);
        });
        callback(err);
    }
    process.on('uncaughtException', cleanup_and_callback);

    // Setup the test.done() callback for the block
    context._setup_done(function(err) {
        if (options.check_assertions) {
            err = err || check_expected_assertions(context);
        }
        cleanup_and_callback(err);
    });
    block.call(null, context);
    // If we don't hear from the context.done() callback
    // before timeout expires then we have a failing test
    done_timer = setTimeout(function() {
        if (ignore_timer) {
            return;
        }
        var error = new Error('done() not called for ' + options.example);
        cleanup_and_callback(error);
    }, options.timeout * 1000);
}

function check_expected_assertions(context) {
    var expected = context.expected_assertions;
    if (expected && context.assertions != expected) {
        var msg = 'Expected ' + expected +
                  ' assertions but got ' + context.assertions;
        return new assert.AssertionError({ message: msg });
    }
    return null;
}
