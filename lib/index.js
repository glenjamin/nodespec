var EventEmitter = require('events').EventEmitter;

var async = require('async');

var ExampleGroup = require('./example_group').ExampleGroup,
    Result = require('./result').Result;

exports.assert = require('assert');
exports.describe = describe;
exports.exec = exec;

var example_groups = [];
function describe(description, options, definition) {
    if (typeof options === 'function') {
        definition = options;
        options = {};
    }

    example_groups.push(new ExampleGroup(description, options, definition));
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
