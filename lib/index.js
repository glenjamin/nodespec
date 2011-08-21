var path = require('path');
var EventEmitter = require('events').EventEmitter;

var async = require('async');

var default_deps = {
    assert: require('assert'),

    ExampleGroup: require('./example-group').ExampleGroup,
    Example: require('./example').Example,
    Context: require('./context').Context,

    Result: require('./result').Result,
    SingleResult: require('./result').SingleResult,

    Pending: require('./exceptions').Pending,
    ExpectationError: require('./exceptions').ExpectationError
};

var nodespecs = {};
function create_nodespec(name, deps) {
    if (nodespecs[name]) {
        return nodespecs[name];
    }
    var func = function(name, deps) {
        return create_nodespec(name, deps);
    }
    func.abandon = function() {
        delete nodespecs[name];
    }
    mixin_nodespec(func, deps);
    nodespecs[name] = func;
    return func;
}
function mixin_nodespec(nodespec, deps) {
    nodespec.deps = setup_deps(deps);
    nodespec.assert = nodespec.deps.assert;
    nodespec.example_groups = [];
    nodespec.describe = describe;
    nodespec.exec = exec;
    nodespec.require = nodespec_require;
    nodespec.before = before;
    nodespec.before_hooks = [];
    nodespec.after = after;
    nodespec.after_hooks = [];
    nodespec.mockWith = mockWith;
}
function setup_deps(deps) {
    deps = deps || {};
    for (var d in default_deps) {
        deps[d] = deps[d] || default_deps[d];
    }
    return deps;
}

module.exports = create_nodespec('default');

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
