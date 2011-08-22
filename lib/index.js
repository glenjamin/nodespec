var path = require('path');
var assert = require('assert');
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

    Usage:
        (start example)
        var nodespec = require("nodespec");
        var separate_nodespec = nodespec("separate stack",
                                         {Context: AugmentedContext})
        (end example)

    See Also:
        <nodespec.abandon>
*/
function nodespec(name, deps) {
    if (nodespecs[name]) {
        return nodespecs[name];
    }
    var func = function(name, deps) {
        return nodespec(name, deps);
    }

    func.nodespec_name = name;

    func.deps = deps || {};
    for (var d in default_deps) {
        func.deps[d] = func.deps[d] || default_deps[d];
    }
    func.assert = assert;
    func.example_groups = [];
    func.before_hooks = [];
    func.after_hooks = [];

    func.abandon = nodespec.abandon;
    func.require = nodespec.require;
    func.describe = nodespec.describe;
    func.before = nodespec.before;
    func.after = nodespec.after;
    func.mockWith = nodespec.mockWith;
    func.exec = nodespec.exec;

    nodespecs[name] = func;
    return func;
}

/*
    Method: abandon

    Forget this nodespec function

    Subsequent calls to nodespec() with the same name as this instance will
    return a fresh instance instead of the usual behaviour.

    Example:
        (start example)
        var nodespec = require('nodespec');
        var another = nodespec('another');
        another.abandon();
        var again = nodespec('another');
        another !== again;
        (end example)
*/
nodespec.abandon = function abandon() {
    delete nodespecs[this.nodespec_name];
}

var native_require = require;
/*
    Method: require

    Require nodespec test definition files without executing them

    This function is currently the recommended way to load a test suite that
    spans multiple files and then executing it all at once. See the example
    below.

    Arguments:

        target - {string} The path to load, as with the usual
                          nodejs require function

    Example:
        (start example)
        // Note that grep isn't a built-in NodeJS function
        var files = grep('spec/*_spec.js');
        for (var i in files) {
           nodespec.require(files[i]);
        }
        (end example)
*/
nodespec.require = function require(target) {
    var ex = {};
    Error.captureStackTrace(ex);
    stack_line = ex.stack.split('\n')[2];
    base = /at (?:.+\()?(.+):/.exec(stack_line)[1];
    var resolved_target = path.resolve(base, '..', target);
    this.exec = noop;
    native_require(resolved_target);
    this.exec = nodespec.exec;
}
function noop() {}

/*
    Method: describe

    Create an ExampleGroup to describe some behaviour

    Arguments:

        description - {string} The name of the object being described
        options     - {options} (optional) Any additional options to be passed
                      to the <ExampleGroup> constructor
        definition  - {function}

    Returns:

        {<ExampleGroup>} The newly created example group
*/
nodespec.describe = function describe(description, options, definition) {
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

/*
    Method: before

    Add a before hook to be run before all specs in the suite

    Arguments:

        block - {function} The hook definition
*/
nodespec.before = function before(block) {
    this.before_hooks.push(block);
}
/*
    Method: after

    Add an after hook to be run after all specs in the suite

    Arguments:

        block - {function} The hook definition
*/
nodespec.after = function after(block) {
    this.after_hooks.push(block);
}

/*
    Method: mockWith

    Load a pre-defined mocking library

    Supported libs:
        sinon - http://sinonjs.org - Provides a sinon sandbox to each test
*/
nodespec.mockWith = function mockWith(lib) {
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

/*
    Method: exec

    Run all specs currently defined for this suite

    Note that this function will conclude with a call to process.exit
*/
nodespec.exec = function exec() {
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

module.exports = nodespec('default');
