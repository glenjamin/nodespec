var async = require('async');

var Example = require('./example').Example;

exports.ExampleGroup = ExampleGroup;

function ExampleGroup(description, options, definition_fn) {
    this.description = description;
    this.options = options;
    this.examples = [];
    definition_fn.call(this);
}

ExampleGroup.prototype.example = function(description, options, block) {
    if (typeof options === 'function') {
        block = options;
        options = {};
    }

    this.examples.push(new Example(description, options, block));
}

ExampleGroup.prototype.exec = function(exec_callback) {
    var results = {
        exit_code: 0,
        total: 0,
        passed: 0,
        failed: 0,
        errored: 0,
        pending: 0
    };
    async.forEachSeries(
        this.examples,
        function iterator(example, callback) {
            example.exec(function(err, data) {
                if (err) {
                    callback(err);
                    return;
                }
                results.total += 1;
                results[data.result] += 1;
                if (data.result == 'failed') {
                    results.exit_code = 1;
                } else if (data.result == 'errored') {
                    results.exit_code = 2;
                }

                callback();
            });
        },
        function finished(err) {
            exec_callback(err, results);
        }
    )
}
