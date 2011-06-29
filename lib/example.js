var assert = require('assert');

var async = require('async');

var context = require('./context'),
    exceptions = require('./exceptions'),
    result = require('./result');

exports.Example = Example;
Example.DEFAULT_TIMEOUT = 5;
function Example(description, options, block) {
    this.description = description;
    this.options = options;
    this.timeout = options.timeout || Example.DEFAULT_TIMEOUT;
    this.group = options.group;
    delete options.group;
    this.nodespec = options.nodespec;
    delete options.nodespec;
    this.full_description = this.group.full_description + ' ' + description;
    // Remove 2 from the top - new Error and new Example
    var stack = new Error().stack.split("\n").splice(2);
    // Caller is first line outside nodespec/lib
    for (var i=0; i< stack.length; ++i) {
        if (! /nodespec\/lib/.test(stack[i]) ) {
            var calling_line = stack[i];
            break;
        }
    }
    var match = /\((.+):(\d+):/.exec(calling_line);
    this.file_path = match[1];
    this.line_number = match[2];

    if (block) {
        this.block = block;
    } else {
        this.is_pending = true;
    }
}

Example.prototype.timeout_after = function(seconds) {
    this.timeout = seconds;
}

Example.prototype.exec = function(emitter, exec_callback) {
    var example = this;
    emitter.emit('exampleStart', example);
    // No block, bail out early
    if (example.is_pending) {
        emit_callback(null, result.SingleResult.PEND);
        return;
    }
    var ctx = new context.Context(this.nodespec);
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

                if (err) {
                    handle_error(err, emit_callback)
                } else {
                    emit_callback(null, result.SingleResult.PASS);
                }
            });
        }
    );
    function emit_callback(err, result) {
        emitter.emit('exampleComplete', example, result);
        // Capitalise result.type to make the event name
        var result_event = result.type[0].toUpperCase() + result.type.slice(1);
        emitter.emit('example' + result_event, example, result.error);
        exec_callback(err, result);
    }
}

Example.prototype.exec_spec = function(context, exec_callback) {
    exec_block({
        block: this.block, context: context,
        timeout: this.timeout, check_assertions: true
    }, exec_callback);
}
Example.prototype.setup_subjects = function(context, main_callback) {
    for (var name in this.group.subjects) {
        define_subject(context, name, this.group.subjects[name]);
    }
    main_callback();
}
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
    async.forEachSeries(this.group.before_hooks,
        function iterator(block, callback) {
            exec_block({
                block: block, context: context,
                timeout: 2, check_assertions: false
                // TODO: configure hook timeout
            }, callback);
        },
        exec_callback
    );
}
Example.prototype.exec_after = function(context, exec_callback) {
    var errors = [];
    async.forEachSeries(this.group.after_hooks,
        function iterator(block, callback) {
            exec_block({
                block: block, context: context,
                timeout: 2, check_assertions: false
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
}

function exec_block(options, callback) {
    var context = options.context;
    var block = options.block;

    var async_test = (block.length == 1);

    if (!async_test) {
        context._setup_done(false);
        var err;
        try {
            block.call(context);
            if (options.check_assertions) {
                err = context.check_expected_assertions();
            }
        } catch (ex) {
           err = ex;
        }
        callback(err);
        return;
    } else {
        // Use the process hook to capture any uncaught error
        var catcher = function(err) {
            cleanup_and_callback(err);
        };
        process.on('uncaughtException', catcher);
        // Setup the test.done() callback for the block
        context._setup_done(function(err) {
            if (options.check_assertions) {
                err = err || context.check_expected_assertions();
            }
            cleanup_and_callback(err);
        });
        block.call(null, context);
        // If we don't hear from the context.done() callback
        // before timeout expires then we have a failing test
        var wait_started = Date.now();
        var waiting = setInterval(function() {
            if (check_timeout(wait_started, options.timeout)) {
                cleanup_and_callback(new Error('done() not called'));
            }
        }, 50);
    }

    var finished = false;
    function cleanup_and_callback(err) {
        // Only run cleanup once, but if we get an error later
        // it might be from the catch statement above, so better not eat it
        if (finished) {
            if (err) throw err;
            return;
        }
        finished = true;

        clearInterval(waiting);
        process.removeListener('uncaughtException', catcher);
        callback.apply(null, arguments);
    }
}

function check_timeout(start_time, timeout) {
    var elapsed = (Date.now() - start_time);
    return elapsed > timeout * 1000;
}

function handle_error(ex, callback) {
    var error_result;
    if (ex instanceof exceptions.Pending) {
        error_result = result.SingleResult.PEND;
    } else if (ex instanceof assert.AssertionError) {
        error_result = result.SingleResult.FAIL;
    } else {
        error_result = result.SingleResult.ERROR;
    }
    error_result.error = ex;
    callback(null, error_result);
}
