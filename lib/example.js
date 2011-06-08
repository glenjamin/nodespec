var assert = require('assert');

var nodespec = require('./index');
var Context = require('./context').Context,
    Pending = require('./exceptions').Pending,
    Result = require('./result').Result;

exports.Example = Example;

function Example(description, options, block) {
    this.description = description;
    this.options = options;
    if (block)
        this.block = block;
    else
        this.is_pending = true;
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
        if (retval !== undefined) {
            data.result = Result.PASS;
            cleanup_and_callback(null, data);
        }
    } catch (ex) {
        example._handle_error(ex, data, cleanup_and_callback);
    }
    function cleanup_and_callback() {
        group.exec_after_hooks(context);
        process.removeListener('uncaughtException', catcher);
        callback.apply(null, arguments);
    };
}

Example.prototype._handle_error = function(ex, data, callback) {
    if (ex instanceof Pending) {
        data.result = Result.PEND;
    } else if (ex instanceof assert.AssertionError) {
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
