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
                throw new TypeError('assertions must be a number');
            expected_assertions = assertions;
        }
    });
    Object.defineProperty(this, 'assert', {
        get: function() {
            assertion_count += 1;
            return nodespec.assert;
        },
        set: function() { throw new Error('Cannot redefine `assert`'); }
    });
    Object.defineProperty(this, 'assertions', {
        get: function() {
            return assertion_count;
        },
        set: function(assertions) {
            assertion_count = assertions;
        }
    });
    Object.defineProperty(this, 'pending', {
        get: function() {
            return function(reason) {
                throw new deps.Pending(reason);
            }
        },
        set: function() { throw new Error('Cannot redefine `pending`'); }
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
                        throw new Error('Cannot redefine `done`');
                    },
                    configurable: true
                });
            }
        };
    },
    set: function() { throw new Error('Cannot redefine `_setup_done`'); }
});

Object.defineProperty(Context.prototype, 'expect', {
    get: function() {
        return function(assertions) {
            this.expected_assertions = assertions;
        }
    },
    set: function() { throw new Error('Cannot redefine `expect`'); }
});
