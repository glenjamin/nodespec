var assert = require('assert');

var sinon = require('sinon');

var exceptions = require('../exceptions');

module.exports = function(nodespec) {
  var assertions = {};
  // prepare object for this.sinon.assert
  sinon.assert.expose(assertions, {prefix: '', includeFail: false});
  // also attach to nodespec.assert
  sinon.assert.expose(nodespec.assert, {prefix: '', includeFail: false});

  var fail = function(msg) {
    throw new assert.AssertionError({
      message: msg,
      stackStartFunction: assertions.fail
    });
  };
  assertions.fail = fail;
  var realFail = nodespec.assert.fail;
  nodespec.assert.fail = function(actual, expected, message, operator) {
    // Sinon failure
    if (expected === undefined) {
      fail(actual)
    // Standard failure
    } else {
      realFail.call(this, actual, expected, message, operator);
    }
  }
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
    // Also increment the assertion counter for mock expectations
    var sinon_mock = context.sinon.mock;
    context.sinon.mock = function mock(object) {
      var new_mock = sinon_mock.call(this, object);
      var sinon_expects = new_mock.expects;
      new_mock.expects = function expects(method) {
        context.assert;
        return sinon_expects.call(this, method);
      }
      return new_mock;
    }
  });
  nodespec.after(function() {
    this.sinon.verifyAndRestore();
  });
};
