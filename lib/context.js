var nodespec = require('./index');

var Pending = require('./exceptions').Pending,
    AssertionError = require('assert').AssertionError;

exports.Context = Context;

function Context(done_function) {
    var assertion_count = 0, expected_assertions = 0;
    // non-enumerable instance variable
    Object.defineProperty(this, 'expected_assertions', {
        get: function() { return expected_assertions; },
        set: function(assertions) { expected_assertions = assertions }
    });
    Object.defineProperty(this, 'assert', {
        get: function() {
            assertion_count += 1;
            return nodespec.assert;
        },
        set: function() { throw new Error('Cannot replace `assert`'); }
    });
    Object.defineProperty(this, 'done', {
        get: function() { return done_function; },
        set: function() { throw new Error('Cannot replace `done`'); }
    });
    Object.defineProperty(this, 'check_expected_assertions', {
        get: function() {
            return function() {
                if (this.expected_assertions) {
                    if (assertion_count != expected_assertions) {
                        var msg = "Expected " + expected_assertions +
                                  " assertions but got " + assertion_count;
                        return new AssertionError({ message: msg });
                    }
                }
                return false;
            }
        },
        set: function() {
            throw new Error('Cannot replace `check_expected_assertions`');
        }
    });
}

Object.defineProperty(Context.prototype, 'expect', {
    get: function() {
        return function(assertions) {
            this.expected_assertions = assertions;
        }
    },
    set: function() { throw new Error('Cannot replace `expect`'); }
});

Object.defineProperty(Context.prototype, 'pending', {
    get: function() {
        return function(reason) {
            throw new Pending(reason);
        }
    },
    set: function() { throw new Error('Cannot replace `pending`'); }
});
