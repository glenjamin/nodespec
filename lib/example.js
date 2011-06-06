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
    if (this.is_pending) {
        callback(null, data);
        return;
    }
    this.done = function(err) {
        if (err) {
            this._handle_error(err, data, callback);
            return;
        }
        data.result = 'passed';
        callback(null, data);
    }.bind(this);
    catcher = function(err) {
        this._handle_error(err, data, clear_catcher);
    }.bind(this);
    process.once('uncaughtException', catcher);
    clear_catcher = function() {
        process.removeListener('uncaughtException', catcher);
        callback.apply(null, arguments);
    };
    try {
        var retval = this.block.call(this, this);
        if (retval !== undefined) {
            data.result = 'passed';
            callback(null, data);
        }
    } catch (ex) {
        this._handle_error(ex, data, callback);
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
