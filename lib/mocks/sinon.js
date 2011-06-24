var assert = require('assert');

var sinon = require('sinon');

var nodespec = require('../index');

var assertions = {};
sinon.assert.expose(assertions, {prefix: '', includeFail: false});
assertions.fail = function(msg) {
    throw new assert.AssertionError({
        message: msg,
        stackStartFunction: assertions.fail
    });
};

nodespec.before(function() {
    var context = this;
    Object.defineProperty(context, "sinon", {
        value: sinon.sandbox.create()
    });
    Object.defineProperty(context.sinon, "assert", {
        get: function() {
            // Little trick to increment the assertion counter
            context.assert;
            return assertions;
        }
    });
});
nodespec.after(function() {
    this.sinon.verifyAndRestore();
});