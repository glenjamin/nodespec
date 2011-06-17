var AssertionError = require('assert').AssertionError;

var async = require('async');

var nodespec = require('./index');
var Context = require('./context').Context,
    Pending = require('./exceptions').Pending,
    Result = require('./result').Result,
    SingleResult = require('./result').SingleResult;

exports.Example = Example;
Example.DEFAULT_TIMEOUT = 5;
function Example(description, options, block) {
    this.description = description;
    this.options = options || {};
    this.timeout = this.options.timeout || Example.DEFAULT_TIMEOUT;
    this.group = options.group;
    delete options.group;
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
    if (block)
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
        emit_callback(null, SingleResult.PEND);
        return;
    }
    var context = new Context();
    async.series(
        {
            before: function(cb) { example.exec_before(context, cb); },
            spec:   function(cb) { example.exec_spec(context, cb); }
        },
        function(err, result) {
            example.exec_after(context, function(after_err) {
                if (!err) {
                    err = after_err;
                }

                if (err) {
                    handle_error(err, emit_callback)
                } else {
                    emit_callback(null, SingleResult.PASS);
                }
            });
        }
    );
    function emit_callback(err, result) {
        emitter.emit('exampleComplete', example, result);
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
    try {
        var retval = block.call(context, context);
    } catch (ex) {
       cleanup_and_callback(ex);
       return;
    }
    // If there is a return value, we don't need to wait for done()
    if (retval !== undefined) {
        cleanup_and_callback();
    } else {
        // If we don't hear from the example.done() callback
        // before timeout expires then we have a failing test
        var wait_started = Date.now();
        var waiting = setInterval(function() {
            if (check_timeout(wait_started, options.timeout)) {
                var err = new Error('done() not called');
                cleanup_and_callback(err);
            }
        }, 50);
    }
    var finished = false;
    function cleanup_and_callback(err) {
        // Only run once
        if (finished) return; finished = true;

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
    var result;
    if (ex instanceof Pending) {
        result = SingleResult.PEND;
    } else if (ex instanceof AssertionError) {
        result = SingleResult.FAIL;
    } else {
        result = SingleResult.ERROR;
    }
    result.error = ex;
    callback(null, result);
}
