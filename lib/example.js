var AssertionError = require('assert').AssertionError;

var nodespec = require('./index');
var Context = require('./context').Context,
    Pending = require('./exceptions').Pending,
    Result = require('./result').Result;

exports.Example = Example;
Example.DEFAULT_TIMEOUT = 5;
function Example(description, options, block) {
    this.description = description;
    this.options = options || {};
    this.timeout = this.options.timeout || Example.DEFAULT_TIMEOUT;
    if (block)
        this.block = block;
    else
        this.is_pending = true;
}

Example.prototype.timeout_after = function(seconds) {
    this.timeout = seconds;
}

Example.prototype.exec = function(group, callback) {
    var data = {result: Result.PEND};
    // No block, bail out early
    if (this.is_pending) {
        callback(null, data);
        return;
    }
    var example = this;
    // Use the process hook to capture any uncaught error
    var catcher = function(err) {
        example._handle_error(err, data, cleanup_and_callback);
    };
    process.once('uncaughtException', catcher);
    // Setup the test.done() callback for the block
    var context = new Context(function(err) {
        err = err || context.check_expected_assertions();
        if (err) {
            example._handle_error(err, data, callback);
            return;
        }
        data.result = Result.PASS;
        cleanup_and_callback(null, data);
    });
    try {
        group.exec_before_hooks(context);
        var retval = example.block.call(context, context);
        // If there is a return value, we don't need to wait for done()
        if (retval !== undefined) {
            data.result = Result.PASS;
            cleanup_and_callback(null, data);
        } else {
            // If we don't hear from the example.done() callback
            // before timeout expires then we have a failing test
            var wait_started = Date.now();
            var waiting = setInterval(function() {
                if (example._timed_out_since(wait_started)) {
                    var err = new AssertionError({
                        message: 'done() not called'
                    });
                    example._handle_error(err, data, cleanup_and_callback);
                }
            }, 50);
        }
    } catch (ex) {
        example._handle_error(ex, data, cleanup_and_callback);
    }
    var finished = false;
    function cleanup_and_callback() {
        // Only run once
        if (finished) return; finished = true;
        
        clearInterval(waiting);
        group.exec_after_hooks(context);
        process.removeListener('uncaughtException', catcher);
        callback.apply(null, arguments);
    }
}

Example.prototype._timed_out_since = function(start_time) {
    var elapsed = (Date.now() - start_time);
    return elapsed > this.timeout * 1000;
}

Example.prototype._handle_error = function(ex, data, callback) {
    if (ex instanceof Pending) {
        data.result = Result.PEND;
    } else if (ex instanceof AssertionError) {
        data.result = Result.FAIL;
    } else {
        data.result = Result.ERROR;
    }
    console.error(this.description + ': ' + ex.toString());
    if (nodespec.verbose)
        console.error(ex.stack);
    data.error = ex;
    callback(null, data);
}
