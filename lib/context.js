var Pending = require('./exceptions').Pending,
    AssertionError = require('assert').AssertionError;

exports.Context = Context;

// We use defineProperty `get` so that we can
// raise an exception on `set` rather than just failing silently
// this is to avoid mysteriously failing tests

function Context(nodespec, deps) {
    var assertion_count = 0, expected_assertions;
    // non-enumerable instance variable
    Object.defineProperty(this, 'expected_assertions', {
        get: function() { return expected_assertions; },
        set: function(assertions) {
            if (typeof assertions !== 'number')
                throw new TypeError("assertions must be a number");
            expected_assertions = assertions;
        }
    });
    Object.defineProperty(this, 'assert', {
        get: function() {
            assertion_count += 1;
            return nodespec.assert;
        },
        set: function() { throw new Error('Cannot replace `assert`'); }
    });
    Object.defineProperty(this, 'check_expected_assertions', {
        get: function() {
            return function() {
                if (expected_assertions) {
                    if (assertion_count != expected_assertions) {
                        var msg = "Expected " + expected_assertions +
                                  " assertions but got " + assertion_count;
                        return new AssertionError({ message: msg });
                    }
                }
                return null;
            }
        },
        set: function() {
            throw new Error('Cannot replace `check_expected_assertions`');
        }
    });
    Object.defineProperty(this, 'pending', {
        get: function() {
            return function(reason) {
                throw new deps.Pending(reason);
            }
        },
        set: function() { throw new Error('Cannot replace `pending`'); }
    });
}

Object.defineProperty(Context.prototype, '_setup_done', {
    get: function() {
        return function(done_function) {
            if (!done_function) {
                delete this.done;
            } else {
                Object.defineProperty(this, 'done', {
                    get: function() { return done_function; },
                    set: function() {
                        throw new Error('Cannot replace `done`');
                    },
                    configurable: true
                });
            }
        };
    },
    set: function() { throw new Error('Cannot replace `_setup_done`'); }
});

Object.defineProperty(Context.prototype, 'expect', {
    get: function() {
        return function(assertions) {
            this.expected_assertions = assertions;
        }
    },
    set: function() { throw new Error('Cannot replace `expect`'); }
});
