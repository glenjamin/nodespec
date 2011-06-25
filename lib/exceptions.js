var util = require('util'),
    assert = require('assert');

exports.Pending = Pending;
util.inherits(Pending, Error);
function Pending(reason) {
    this.name = 'Pending';
    if (reason)
        this.message = reason;
    Error.captureStackTrace(this, Pending);
}

exports.ExpectationError = ExpectationError;
util.inherits(ExpectationError, assert.AssertionError);
function ExpectationError(options) {
    if (!options.stackStartFunction)
        options.stackStartFunction = ExpectationError;
    // AssertionError replaces its prototype, so cannot call Function methods
    Function.prototype.call.call(assert.AssertionError, this, options);
    this.name = 'ExpectationError';
}
