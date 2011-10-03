var assert = require('assert');

var sinon = require('sinon');

var exceptions = require('../exceptions');

module.exports = function(nodespec) {
  var assertions = {};
  sinon.assert.expose(assertions, {prefix: '', includeFail: false});
  assertions.fail = function(msg) {
    throw new assert.AssertionError({
      message: msg,
      stackStartFunction: assertions.fail
    });
  };
  sinon.expectation.fail = function(msg) {
    throw new exceptions.ExpectationError({
      message: msg,
      stackStartFunction: sinon.expectation.fail
    });
  }

  nodespec.before(function() {
    var context = this;
    Object.defineProperty(context, 'sinon', {
      value: sinon.sandbox.create()
    });
    Object.defineProperty(context.sinon, 'assert', {
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
};
