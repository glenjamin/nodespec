var async = require('async');

var Example = require('./example').Example,
    Result = require('./result').Result

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
    var example = new Example(description, options, block);
    this.examples.push(example);
    return example;
}

ExampleGroup.prototype.exec = function(exec_callback) {
    var result = new Result();
    var self = this;
    async.forEachSeries(
        self.examples,
        function iterator(example, callback) {
            example.exec(self, function(err, data) {
                if (err) {
                    callback(err);
                    return;
                }
                result.add(data.result);
                callback();
            });
        },
        function finished(err) {
            exec_callback(err, result);
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
