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
    try {
        var retval = this.block.call(this);
        data.result = 'passed';
    } catch (ex) {
        if (ex instanceof Pending) {
            data.result = 'pending';
        } else if (ex instanceof assert.AssertionError) {
            data.result = 'failed';
        } else {
            data.result = 'errored';
        }
        console.error(ex.toString());
        data.error = ex;
    }

    callback(null, data);
}
