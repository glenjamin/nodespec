var assert = require('assert');

var Pending = require('./exceptions').Pending;

exports.Example = Example;

function Example(description, options, block) {
    this.description = description;
    this.options = options;
    if (block)
        this.block = block;
    else
        this.is_pending = true;
}

Example.prototype.assert = assert;

Example.prototype.pending = function(reason) {
    throw new Pending(reason);
}

Example.prototype.exec = function(callback) {
    var data = {result: 'pending'};
    // No block, bail out early
    if (this.is_pending) {
        callback(null, data);
        return;
    }
    // Use the process hook to capture any uncaught error
    var catcher = function(err) {
        this._handle_error(err, data, clear_catcher);
    }.bind(this);
    process.once('uncaughtException', catcher);
    // Make sure we don't leave the hook around after the test run
    var clear_catcher = function() {
        process.removeListener('uncaughtException', catcher);
        callback.apply(null, arguments);
    };
    // Setup the test.done() callback for the block
    this.done = function(err) {
        if (err) {
            this._handle_error(err, data, callback);
            return;
        }
        data.result = 'passed';
        clear_catcher(null, data);
    }.bind(this);
    try {
        var retval = this.block.call(this, this);
        if (retval !== undefined) {
            data.result = 'passed';
            clear_catcher(null, data);
        }
    } catch (ex) {
        this._handle_error(ex, data, clear_catcher);
    }
}

Example.prototype._handle_error = function(ex, data, callback) {
    if (ex instanceof Pending) {
        data.result = 'pending';
    } else if (ex instanceof assert.AssertionError) {
        data.result = 'failed';
    } else {
        data.result = 'errored';
    }
    console.error(ex.toString());
    data.error = ex;
    callback(null, data);
}
