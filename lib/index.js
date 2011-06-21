var path = require('path');
var EventEmitter = require('events').EventEmitter;

var async = require('async');

var ExampleGroup = require('./example_group').ExampleGroup,
    Result = require('./result').Result;

var nodespec = exports;

nodespec.assert = require('assert');
nodespec.describe = describe;
nodespec.exec = exec;
nodespec.require = nodespec_require;
nodespec.before = before;
nodespec.after = after;
nodespec.mockWith = mockWith;

function nodespec_require(target) {
    var ex = {}
    Error.captureStackTrace(ex);
    stack_line = ex.stack.split("\n")[2];
    base = /at (?:.+\()?(.+):/.exec(stack_line)[1];
    var resolved_target = path.resolve(base, '..', target);
    exports.exec = noop;
    require(resolved_target);
    exports.exec = exec;
}
function noop() {}

var global_parent = {before_hooks: [], after_hooks: []};
var example_groups = [];
function describe(description, options, definition) {
    if (typeof options === 'function') {
        definition = options;
        options = {};
    }
    options.parent = global_parent;

    example_groups.push(new ExampleGroup(description, options, definition));
}

function before(block) {
    global_parent.before_hooks.push(block);
}
function after(block) {
    global_parent.after_hooks.push(block);
}

function mockWith(lib) {
    try {
        require('./mocks/'+lib);
    } catch (ex) {
        throw new Error("Cannot mock with "+lib+", "+
                        "this usually means a dependency is missing");
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
    var overall_result = new Result();
    async.forEachSeries(
        example_groups,
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
