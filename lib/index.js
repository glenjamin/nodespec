var async = require('async');

var ExampleGroup = require('./example_group').ExampleGroup;

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

function exec() {
    var results = {total: 0, passed: 0, failed: 0, pending: 0, errored: 0};
    var exit_code = 0;
    async.forEachSeries(
        example_groups,
        function iterator(group, callback) {
            group.exec(function(err, result) {
                if (err) {
                    callback(err);
                    return;
                }
                results.total += result.total;
                results.passed += result.passed;
                results.failed += result.failed;
                results.pending += result.pending;
                results.errored += result.errored;
                if (result.exit_code > exit_code)
                    exit_code = result.exit_code;
                callback();
            });
        },
        function finished(err) {
            if (err) {
                console.error(err.message);
                exit_code = 3;
            }
            console.log(
                results.total   + " specs (" +
                results.passed  + " passed, " +
                results.pending + " pending, " +
                results.failed  + " failed, " +
                results.errored + " errored)"
            )
            process.exit(exit_code);
        }
    );
}
