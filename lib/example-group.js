var async = require('async');

exports.ExampleGroup = ExampleGroup;

function ExampleGroup(description, options, definition_fn) {
    this.deps = options.deps;
    delete options.deps;
    this.description = description;
    this.options = options;
    this.nodespec = options.nodespec;
    delete options.nodespec;
    var parent = this.parent = options.parent;
    delete options.parent;
    if (parent && parent.full_description) {
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
ExampleGroup.prototype.context = function(description, options, dfn) {
    if (typeof options === 'function') {
        dfn = options;
        options = {};
    }
    options.parent = this;
    options.nodespec = this.nodespec;
    options.deps = this.deps;
    example_group = new this.deps.ExampleGroup(description, options, dfn);
    this.children.push(example_group);
    return example_group;
};

ExampleGroup.prototype.before = function(options, block) {
    if (typeof options === 'function') {
        block = options;
        options = {};
    }

    this._before_hooks.push(block);
};
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
};
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
        name = 'subject';
    }

    this._subjects[name] = block;
};
Object.defineProperty(ExampleGroup.prototype, 'subjects', {
    get: function() {
        if (!this.parent)
            return this._subjects;
        var all = {};
        for (var s in this.parent.subjects) {
            all[s] = this.parent.subjects[s];
        }
        for (var s in this._subjects) {
            all[s] = this._subjects[s];
        }
        return all;
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
    options.nodespec = this.nodespec;
    options.deps = this.deps;
    var example = new this.deps.Example(description, options, block);
    this.children.push(example);
    return example;
};

ExampleGroup.prototype.exec = function(emitter, exec_callback) {
    var group_result = new this.deps.Result();
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
};
