var async = require('async');

var Example = require('./example').Example,
    Result = require('./result').Result

exports.ExampleGroup = ExampleGroup;

function ExampleGroup(description, options, definition_fn) {
    this.description = description;
    this.options = options;
    if (options.parent) {
        var parent = this.parent = options.parent;
        delete options.parent;
        this.full_description = parent.full_description + ' ' + description;
    } else {
        this.full_description = description;
    }
    this.children = [];
    this._before_hooks = [];
    this._after_hooks = [];
    this._subjects = {};
    definition_fn.call(this);
}

ExampleGroup.prototype.describe =
ExampleGroup.prototype.context = function(description, options, definition_fn) {
    if (typeof options === 'function') {
        definition = options;
        options = {};
    }
    options.parent = this;
    example_group = new ExampleGroup(description, options, definition);
    this.children.push(example_group);
    return example_group;
}

ExampleGroup.prototype.before = function(options, block) {
    if (typeof options === 'function') {
        block = options;
        options = {};
    }

    this._before_hooks.push(block);
}
Object.defineProperty(ExampleGroup.prototype, 'before_hooks', {
    get: function() {
        if (this.parent)
            return this.parent.before_hooks.concat(this._before_hooks);
        return this._before_hooks;
    }
});
ExampleGroup.prototype.after = function(options, block) {
    if (typeof options === 'function') {
        block = options;
        options = {};
    }

    this._after_hooks.push(block);
}
Object.defineProperty(ExampleGroup.prototype, 'after_hooks', {
    get: function() {
        if (this.parent)
            return this.parent.after_hooks.concat(this._after_hooks);
        return this._after_hooks;
    }
});

ExampleGroup.prototype.subject = function(name, block) {
    if (arguments.length == 1) {
        block = name;
        name = "subject";
    }

    this._subjects[name] = block;
}
Object.defineProperty(ExampleGroup.prototype, 'subjects', {
    get: function() {
        // TODO: support nesting
        return this._subjects;
    }
});

ExampleGroup.prototype.example = function(description, options, block) {
    if (typeof options === 'function') {
        block = options;
        options = {};
    }
    if (!options) {
        options = {};
    }
    options.group = this;
    var example = new Example(description, options, block);
    this.children.push(example);
    return example;
}

ExampleGroup.prototype.exec = function(emitter, exec_callback) {
    var group_result = new Result();
    var group = this;
    emitter.emit('groupStart', group);
    async.forEachSeries(
        group.children,
        function iterator(example, callback) {
            example.exec(emitter, function(err, result) {
                if (err) {
                    callback(err);
                    return;
                }
                group_result.add(result);
                process.nextTick(callback);
            });
        },
        function finished(err) {
            emitter.emit('groupComplete', group);
            exec_callback(err, group_result);
        }
    );
}
