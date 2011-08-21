var path = require('path');
var EventEmitter = require('events').EventEmitter;

var async = require('async');

var default_deps = {
    ExampleGroup: require('./example-group').ExampleGroup,
    Example: require('./example').Example,
    Context: require('./context').Context,

    Result: require('./result').Result,
    SingleResult: require('./result').SingleResult,

    Pending: require('./exceptions').Pending,
    ExpectationError: require('./exceptions').ExpectationError
};

/*
    Class: nodespec

    The top-level container object for the nodespec test suite.

    Normal usage:

        (start example)
        var nodespec = require('nodespec');
        nodespec.describe("test behaviour", function() {
            // ... test definitions here
        });
        nodespec.exec();
        (end example)

    Advanced usage:

    As well as acting like a singleton for the test suite, it is also
    callable as a factory-style method if more than one top-level
    container per script execution is needed for some reason.

        (start example)
        var nodespec1 = require('nodespec')("top-level 1");
        var nodespec2 = require('nodespec')("top-level 2");
        (end example)
*/

var nodespecs = {};
/*
    Function: nodespec

    Create another top-level nodespec container, keyed by name

    Arguments:
        name - {string} Name for the separate context, subsequent calls with
                        the same name will return the same object
        deps - {Object} Allows for dependency injection of constructor
                        functions, omitted keys will fall back to defaults
        deps.ExampleGroup     - defaults to <ExampleGroup>
        deps.Example          - defaults to <Example>
        deps.Context          - defaults to <Context>
        deps.Result           - defaults to <Result>
        deps.SingleResult     - defaults to <SingleResult>
        deps.Pending          - defaults to <Pending>
        deps.ExpectationError - defaults to assert.AssertionError

    Returns:
        {function} A new nodespec function, which is itself callable
*/
function nodespec(name, deps) {
    if (nodespecs[name]) {
        return nodespecs[name];
    }
    var func = function(name, deps) {
        return nodespec(name, deps);
    }
    func.abandon = function() {
        delete nodespecs[name];
    }

    func.deps = deps || {};
    for (var d in default_deps) {
        func.deps[d] = func.deps[d] || default_deps[d];
    }
    func.assert = require('assert');
    func.example_groups = [];
    func.describe = describe;
    func.exec = exec;
    func.require = nodespec_require;
    func.before = before;
    func.before_hooks = [];
    func.after = after;
    func.after_hooks = [];
    func.mockWith = mockWith;

    nodespecs[name] = func;
    return func;
}

module.exports = nodespec('default');

function nodespec_require(target) {
    var ex = {};
    Error.captureStackTrace(ex);
    stack_line = ex.stack.split('\n')[2];
    base = /at (?:.+\()?(.+):/.exec(stack_line)[1];
    var resolved_target = path.resolve(base, '..', target);
    this.exec = noop;
    require(resolved_target);
    this.exec = exec;
}
function noop() {}

/*
    Function: describe

    Create an ExampleGroup to describing some behaviour

    Arguments:

        description - {string} The name of the object being described
        options     - {options} (optional) Any additional options to be passed
                      to the <ExampleGroup> constructor
        definition  - {function}

    Returns:

        {<ExampleGroup>} The newly created example group
*/
function describe(description, options, definition) {
    if (typeof options === 'function') {
        definition = options;
        options = {};
    }
    options.parent = this;
    options.nodespec = this;
    options.deps = this.deps;

    new_group = new this.deps.ExampleGroup(description, options, definition);
    this.example_groups.push(new_group);
    return new_group;
}

function before(block) {
    this.before_hooks.push(block);
}
function after(block) {
    this.after_hooks.push(block);
}

function mockWith(lib) {
    try {
        require('./mocks/' + lib)(this);
    } catch (ex) {
        throw new Error('Cannot mock with ' + lib + ', ' +
                        'this usually means a dependency is missing');
    }
}

function initFormatters(emitter) {
    var f = require('./formatters/progress_formatter').ProgressFormatter;
    return new f(emitter);
}

function exec() {
    var emitter = new EventEmitter();
    initFormatters(emitter);
    emitter.emit('suiteStart');
    var overall_result = new this.deps.Result();
    async.forEachSeries(
        this.example_groups,
        function iterator(group, callback) {
            group.exec(emitter, function(err, result) {
                if (err) {
                    callback(err);
                    return;
                }
                overall_result.add(result);
                process.nextTick(callback);
            });
        },
        function finished(err) {
            if (err) {
                console.error(err.message);
                process.exit(3);
            }
            emitter.emit('suiteComplete', overall_result);
            process.exit(overall_result.exit_code);
        }
    );
}
