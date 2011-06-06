var async = require('async');

var Example = require('./example').Example;

exports.ExampleGroup = ExampleGroup;

function ExampleGroup(description, options, definition_fn) {
    this.description = description;
    this.options = options;
    this.examples = [];
    this.before_hooks = [];
    this.after_hooks = [];
    definition_fn.call(this);
}

ExampleGroup.prototype.before = function(options, block) {
    if (typeof options === 'function') {
        block = options;
        options = {};
    }

    this.before_hooks.push(block);
}
ExampleGroup.prototype.after = function(options, block) {
    if (typeof options === 'function') {
        block = options;
        options = {};
    }

    this.after_hooks.push(block);
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
    var self = this;
    async.forEachSeries(
        self.examples,
        function iterator(example, callback) {
            example.exec(self, function(err, data) {
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
    );
}

ExampleGroup.prototype.exec_before_hooks = function(context, exec_callback) {
    this.exec_hooks('before', context, exec_callback);
}
ExampleGroup.prototype.exec_after_hooks = function(context, exec_callback) {
    this.exec_hooks('after', context, exec_callback);
}

ExampleGroup.prototype.exec_hooks = function(type, context, exec_callback) {
    var hooks = this[type+'_hooks'];
    async.forEachSeries(
        hooks,
        function iterator(hook, callback) {
            hook.call(context);
            callback();
        },
        function finished(err) {
            //exec_callback(err);
        }
    );
}
