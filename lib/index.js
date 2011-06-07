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

function exec() {
    var overall_result = new Result();
    async.forEachSeries(
        example_groups,
        function iterator(group, callback) {
            group.exec(function(err, result) {
                if (err) {
                    callback(err);
                    return;
                }
                overall_result.merge(result);
                callback();
            });
        },
        function finished(err) {
            if (err) {
                console.error(err.message);
                process.exit(3);
            }
            console.log(
                overall_result.total + " specs ("   +
                overall_result.pass  + " passed, "  +
                overall_result.pend  + " pending, " +
                overall_result.fail  + " failed, "  +
                overall_result.error + " errored)"
            )
            process.exit(overall_result.exit_code);
        }
    );
}
