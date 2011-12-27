var nodespec = require('./common');

var context = require('../lib/context');

var Pending = require('../lib/exceptions').Pending;
var AssertionError = require('assert').AssertionError;

nodespec.describe("Context", function() {
  this.subject("context", function() {
    return new context.Context(this.nodespec, {Pending: Pending});
  });
  this.subject("nodespec", function() {
    return nodespec("copy for context");
  });

  this.describe("pending", function() {
    this.example("should raise Pending exception", function() {
      this.assert.throws(this.context.pending, Pending);
    });
    this.example("should raise with reason if supplied", function() {
      var test = this;
      this.assert.throws(function() {
        test.context.pending("because");
      }, Pending, "because");
    });
    this.example("should not be replaceable", function() {
      var test = this;
      this.assert.throws(function() {
        test.context.pending = "something else";
      }, Error, 'Cannot replace `pending`');
    });
  });

  this.describe("done function", function() {
    this.example("assigned with _setup_done", function() {
      var func = function done_function() {};
      this.context._setup_done(func);
      this.assert.strictEqual(this.context.done, func);
    });
    this.example("_setup_done cannot be replaced", function() {
      this.assert.throws(function() {
        test.context._setup_done = "something else";
      }, Error, 'Cannot replace `_setup_done`');
    });
    this.example("done cannot be replaced", function() {
      var func = function done_function() {};
      this.context._setup_done(func);
      this.assert.throws(function() {
        test.context.done = "something else";
      }, Error, 'Cannot replace `_setup_done`');
    });
  });

  this.describe("usage", function() {
    this.example("only added properties are enumerable", function() {
      this.context.one = 1;
      this.context.two = 2;

      var props = [];
      for (var i in this.context) {
        props.push(i);
      }
      this.assert.equal(props.length, 2);
      this.assert.equal(props[0], 'one');
      this.assert.equal(props[1], 'two');
    });
  });

  this.describe("Expected assertions", function() {
    this.example("should be undefined by default", function() {
      this.assert.strictEqual(this.context.expected_assertions,
                  undefined);
    });
    this.example("can be set directly", function() {
      this.context.expected_assertions = 5;
      this.assert.strictEqual(this.context.expected_assertions, 5);
    });
    this.example("can be set with expect", function() {
      this.context.expect(5);
      this.assert.strictEqual(this.context.expected_assertions, 5);
    });
    this.example("errors if not set to a number", function(test) {
      [
        function() { test.context.expected_assertions = null; },
        function() { test.context.expected_assertions = "a"; },
        function() { test.context.expected_assertions = {}; },
        function() { test.context.expected_assertions = []; },
        function() { test.context.expect(null); },
        function() { test.context.expect("a"); },
        function() { test.context.expect({}); },
        function() { test.context.expect([]); }
      ].forEach(function(assignment) {
        test.assert.throws(assignment,
                   TypeError, 'assertions must be a number');
      });
      test.done();
    });
  });
  this.describe("Checking number of assertions", function() {
    this.subject("fake_assert", function() { return new Object });
    this.example("0 with assert never called", function() {
      this.assert.equal(this.context.assertions, 0);
    });
    this.example("assert references nodespec.assert", function() {
      this.nodespec.assert = this.fake_assert;
      this.assert.strictEqual(this.context.assert, this.fake_assert);
    });
    this.example("count of accesses to assert", function() {
      this.context.assert; this.context.assert;
      this.context.assert; this.context.assert;
      this.assert.equal(this.context.assertions, 4);
    });
    this.example("can also be incremented explicitly", function() {
      this.context.assert;
      this.context.assertions += 2;
      this.assert.equal(this.context.assertions, 3);
    });
  });
  this.describe("onError", function() {
    this.example("getter false with no function", function() {
      this.assert.equal(this.context.onError(), false);
    });
    this.example("getter returns func previously passed", function() {
      var func = function(){};
      this.assert.equal(this.context.onError(func), func);
      this.assert.equal(this.context.onError(), func);
    })
    this.example("passing false unsets value", function() {
      var func = function(){};
      this.assert.equal(this.context.onError(func), func);
      this.assert.equal(this.context.onError(), func);
      this.assert.equal(this.context.onError(false), false);
      this.assert.equal(this.context.onError(), false);
    })
  });
});
nodespec.exec();
