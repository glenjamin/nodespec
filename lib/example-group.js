var async = require('async');

exports.ExampleGroup = ExampleGroup;

/*
  Class: ExampleGroup

  A collection of sub-groups and specs describing some behaviour

  Requiring:

    > var ExampleGroup = require('nodespec/lib/example-group').ExampleGroup;

  In general ExampleGroup should be not be instantiated directly, and instead
  created using either <Nodespec.describe>, <ExampleGroup.describe> or
  <ExampleGroup.context>.

  Example:
    (start example)
    nodespec.describe("top level example group", function() {
      this.describe("sub-example group", function() {
        this.before(function() { this.variable = 1 });
        this.context("sub-sub-example group", function() {
          this.example("stuff", function() {
            // ... test
          });
        });
      });
    })
    (end example)

*/

/*
  Constructor: ExampleGroup

  Arguments:

    description   - {string} The title of the behaviour being described
    options     - {options} See below
    definition_fn - {function} The group definition, this will be evaluated
            with 'this' set to the new instance

    options.nodespec - the root <nodespec> function
    options.parent   - the parent <ExampleGroup> or <nodespec> for a top
               level group
    options.deps - {options} Constructor function dependency injection
    options.deps.ExampleGroup - constructor function for subgroups
    options.deps.Example    - constructor function for specs
    options.deps.Result     - constructor function for result collection
    options.deps.Context    - constructor function for context
    options.deps.SingleResult - constructor function for one result
    options.deps.Pending    - constructor function for pending exception

*/
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

/*
  Property: children

  List of all subgroups and specs

  Returns:
    Array(<ExampleGroup> | <Example>)
*/

/*
  Property: description

  The description of this group

  Returns:
    string
*/

/*
  Property: full_description

  The full description, parent's description + this group's

  Returns:
    string
*/

/*
  Property: before_hooks

  List of all before hooks defined on this group and its parents

  Returns:
    Array(function)
*/
Object.defineProperty(ExampleGroup.prototype, 'before_hooks', {
  get: function() {
    if (this.parent)
      return this.parent.before_hooks.concat(this._before_hooks);
    return this._before_hooks;
  }
});

/*
  Property: after_hooks

  List of all after hooks defined on this group and its parents

  Returns:
    Array(function)
*/
Object.defineProperty(ExampleGroup.prototype, 'after_hooks', {
  get: function() {
    if (this.parent)
      return this.parent.after_hooks.concat(this._after_hooks);
    return this._after_hooks;
  }
});

/*
  Property: subjects

  List of all subjects defined on this group and its parents

  Returns:
    Array(function)
*/
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


/*
  Method: describe

  Create a sub-<ExampleGroup> to describe some behaviour

  The subgroup will inherit all hooks and subjects of its parent class.

  Arguments:

    description - {string} The title of the behaviour being described
    [options] -   {options} Any additional options to be passed to the
            <ExampleGroup> constructor.
    definition  - {function} The subgroup definition

  Returns:

    {<ExampleGroup>} The newly created example group
*/
ExampleGroup.prototype.describe = function(description, options, dfn) {
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

/*
  Method: context

  An alias for <ExampleGroup.describe>
*/
ExampleGroup.prototype.context = ExampleGroup.prototype.describe;

/*
  Method: before

  Add a before hook to be run before all specs in the group

  Arguments:

    block - {function} The hook definition

  See also:

    <Nodespec.before>, <Nodespec.after>, <ExampleGroup.after>
*/
ExampleGroup.prototype.before = function(options, block) {
  if (typeof options === 'function') {
    block = options;
    options = {};
  }

  this._before_hooks.push(block);
};

/*
  Method: after

  Add an after hook to be run after all specs in the group

  Arguments:

    block - {function} The hook definition

  The block is processed in the same way as <ExampleGroup.before>, with one
  difference: if an assertion fails or an error is thrown in an after block,
  all other after blocks will still be run.

  See also:
    <Nodespec.before>, <Nodespec.after>, <ExampleGroup.before>
*/
ExampleGroup.prototype.after = function(options, block) {
  if (typeof options === 'function') {
    block = options;
    options = {};
  }

  this._after_hooks.push(block);
};

/*
  Method: subject

  Define a "subject" that is lazily evaluated and made available to specs

  Arguments:

    [name] - {string} Optional variable name, defaults to "subject"
    block  - {function} definition function, returns the subject's value

  Usage:

    (start example)
    group.describe("group with an instance", function() {
      this.subject(function() { return new MyClass(); });
      // ... tests
    });
    group.describe("group with fancy tricks", function() {
      this.subject(function() { return new MyClass(this.name); });
      this.subject('name', function() { return "outer name" });
      // ... tests in here have:
      //    context.subject = new MyClass("outer name");
      this.context("with a different name", function() {
        this.subject('name', function() { return "inner name" });
        // ... tests in here have:
        //    context.subject = new MyClass("inner name");
      })
    });
    (end example)

    Subjects functions are evaluated the first time they are accessed with
    'this' set to the spec context, additional accesses will refer to the
    same object. As seen above, this can be used to create instances that
    differ in inner contexts easily.
*/
ExampleGroup.prototype.subject = function(name, block) {
  if (!block) {
    block = name;
    name = 'subject';
  }

  this._subjects[name] = block;
};

/*
  Method: example

  Define an <Example> to be executed against this group, the example will
  be executed with a clean <Context> instance, wrapped with the parent's
  before and after hooks, as well as the defined subjects.

  Arguments:

    description - {string} Behaviour being described
    [options]   - {options} Any additional options to be passed to the
            <Example> constructor.
    block     - {function} The spec definition

  The example can be defined in either procedural or asynchronous mode.

  Procedural Usage:

    *this* within the function is bound to the test context

    (start example)
    group.example("1 + 1 = 2", function() {
      this.assert.equal(1 + 1, 2);
    })
    (end example)

  Asynchronous Usage:

    If the function takes one argument, it is passed the test context and
    executed asynchronously, to signal completion you must call *done()*.

    (start example)
    group.example("1 + 1 = 2", function(test) {
      setTimeout(function() {
        test.assert.equal(1 + 1, 2);
        test.done();
      }, 1000);
    });
    (end example)

  See also:

    <Example>, <Context>
*/
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

/*
  Method: exec

  Execute all of the children of this group in sequence.

  Arguments:

    emitter - {EventEmitter} events from the execution will be fired on
                 this emitter
    callback - {function} Callback fired on completion of execution
    callback.err  - {Error} undefined or an exception object
    callback.result - {<Result>} if err is undefined, this will contain a
                   summary of the test run

  Events:

    groupStart (ExampleGroup) - Group is about to be executed
    groupComplete (ExampleGroup) - Group execution has completed
*/
ExampleGroup.prototype.exec = function(emitter, callback/*(err, result)*/) {
  var group_result = new this.deps.Result();
  var group = this;
  emitter.emit('groupStart', group);
  async.forEachSeries(
    group.children,
    function iterator(child, next) {
      child.exec(emitter, function(err, result) {
        if (err) {
          callback(err);
          return;
        }
        group_result.add(result);
        process.nextTick(next);
      });
    },
    function finished(err) {
      emitter.emit('groupComplete', group);
      callback(err, group_result);
    }
  );
};
