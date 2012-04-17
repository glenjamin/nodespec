var path = require('path');
var assert = require('assert');
var EventEmitter = require('events').EventEmitter;

var async = require('async');
var tracey = require('tracey');

var default_deps = {
  ExampleGroup: require('./example-group').ExampleGroup,
  Example: require('./example').Example,
  Hook: require('./hook').Hook,
  Context: require('./context').Context,

  Result: require('./result').Result,
  SingleResult: require('./result').SingleResult,

  Pending: require('./exceptions').Pending,
  ExpectationError: require('./exceptions').ExpectationError
};

/*
  File: nodespec module

  The top-level container object for the nodespec test suite.

  Requiring:

    > var nodespec = require('nodespec');

  The nodespec module when included functions as the collection for all
  example groups and behaviours you wish to describe in your system, each
  module that wants to describe tests should require nodespec and use the
  describe method to describe groups of examples.

  Normal usage:

    (start example)
    var nodespec = require('nodespec');
    nodespec.describe("test behaviour", function() {
      // ... test definitions here
    });
    nodespec.exec();
    (end example)

  Advanced usage:

  As well as acting like a singleton for the test suite, it is also callable
  as a factory-style method if more than one top-level container per script
  execution is needed for some reason (see <nodespec>).

    (start example)
    var nodespec1 = require('nodespec')("top-level 1");
    var nodespec2 = require('nodespec')("top-level 2");
    (end example)
*/

var nodespecs = {};
/*
  Function: nodespec

  Create another top-level nodespec container, keyed by name

  Note that this function is not a method of the nodespec module, it is the
  callable module itself.

  Arguments:
    name - {string} Name for the separate context, subsequent calls with
            the same name will return the same object
    deps - {options} Allows for dependency injection of constructor
             functions, omitted keys will fall back to defaults
    deps.ExampleGroup   - defaults to <ExampleGroup>
    deps.Example      - defaults to <Example>
    deps.Context      - defaults to <Context>
    deps.Result       - defaults to <Result>
    deps.SingleResult   - defaults to <SingleResult>
    deps.Pending      - defaults to <Pending>
    deps.ExpectationError - defaults to assert.AssertionError

  Returns:
    {function} A new <Nodespec> function, which is still callable as
           <nodespec>

  Usage:
    (start example)
    var nodespec = require("nodespec");
    var separate_nodespec = nodespec("separate stack",
                     {Context: AugmentedContext})
    (end example)

  See Also:
    <Nodespec.abandon>
*/
function nodespec(name, deps) {
  if (nodespecs[name]) {
    return nodespecs[name];
  }
  var func = function(name, deps) {
    return nodespec(name, deps);
  }

  func.nodespec_name = name;

  func.deps = deps || {};
  for (var d in default_deps) {
    func.deps[d] = func.deps[d] || default_deps[d];
  }
  func.assert = assert;
  func.example_groups = [];
  func.before_hooks = [];
  func.after_hooks = [];
  func.available_formatters = {};
  func.DEFAULT_HOOK_TIMEOUT = 2;

  func.abandon = nodespec.abandon;
  func.require = nodespec.require;
  func.describe = nodespec.describe;
  func.before = nodespec.before;
  func.after = nodespec.after;
  func.mockWith = nodespec.mockWith;
  func.registerFormatter = nodespec.registerFormatter;
  func.shutdownFormatters = nodespec.shutdownFormatters;
  func.run = nodespec.run;
  func.exec = nodespec.exec;

  registerBuiltinFormatters(func);

  // TODO: handle formatter loading properly
  var formatters = [];
  Object.defineProperty(func, 'formatters', {
    get: function() {
      if (!formatters.length) {
        var f = this.available_formatters[this.default_formatter];
        formatters.push(require(f));
      }
      return formatters;
    },
    set: function(override) { formatters = override; }
  });

  nodespecs[name] = func;
  return func;
}

/*
  Class: Nodespec

  Methods attached to the module
*/

/*
  Method: abandon

  Forget this nodespec function

  Subsequent calls to nodespec() with the same name as this instance will
  return a fresh instance instead of the usual behaviour.

  Example:
    (start example)
    var nodespec = require('nodespec');
    var another = nodespec('another');
    another.abandon();
    var again = nodespec('another');
    another !== again;
    (end example)
*/
nodespec.abandon = function abandon() {
  delete nodespecs[this.nodespec_name];
}

/*
  Method: require

  Require nodespec test definition files without executing them

  This function is currently the recommended way to load a test suite that
  spans multiple files and then executing it all at once. See the example
  below.

  Arguments:

    target - {string} The path to load, as with the usual
              nodejs require function

  Example:
    (start example)
    // Note that glob isn't an actual built-in NodeJS function
    var files = glob('spec/*_spec.js');
    for (var i in files) {
       nodespec.require(files[i]);
    }
    (end example)
*/
nodespec.require = function(target) {
  var ex = {};
  var stack  = tracey();
  var base = stack[1].path;
  var resolved_target = path.resolve(base, '..', target);
  this.exec = noop;
  require(resolved_target);
  this.exec = nodespec.exec;
}
function noop() {}

/*
  Method: describe

  Create an <ExampleGroup> to describe some behaviour

  Arguments:

    description - {string} The title of the behaviour being described
    [options] -   {options} Any additional options to be passed to the
            <ExampleGroup> constructor.
    definition  - {function} The group definition

  Returns:

    {<ExampleGroup>} The newly created example group
*/
nodespec.describe = function describe(description, options, definition) {
  if (typeof options === 'function') {
    definition = options;
    options = {};
  }
  options.parent = this;
  options.nodespec = this;
  options.deps = this.deps;

  var new_group = new this.deps.ExampleGroup(description, options, definition);
  this.example_groups.push(new_group);
  return new_group;
}

/*
  Method: before

  Add a before hook to be run before all specs in the suite

  Arguments:

    block - {function} The hook definition

  Returns:

    {<Hook>} The newly added Hook object

  The block will be executed before each spec on a fresh context, any
  exceptions or failed assertions will be treated as belonging to the spec
  being executed. The function can be defined in either procedural or
  asynchronous mode.

  Procedural Usage:

    *this* within the function is bound to the test context, the following
    example makes *'value'* available in every test as *this.variable*.

    (start example)
    nodespec.before(function() {
      this.variable = 'value';
    })
    (end example)

  Asynchronous Usage:

    If the function takes one argument, it is passed the test context and
    executed asynchronously, to signal completion you must call *done()*.
    The following example makes the *value* returned by the async
    function available to every test as *this.variable*.

    (start example)
    nodespec.before(function(hook) {
      async_function(function(err, value) {
        hook.variable = value;
        hook.done();
      });
    });

  See also

    <Nodespec.after>, <ExampleGroup.before>, <ExampleGroup.after>
*/
nodespec.before = function before(options, block) {
  return create_hook(this, this.before_hooks, options, block);
}
/*
  Method: after

  Add an after hook to be run after all specs in the suite

  Arguments:

    block - {function} The hook definition

  Returns:

    {<Hook>} The newly added Hook object

  The block is processed in the same way as <nodespec.before>, with one
  difference: if an assertion fails or an error is thrown in an after block,
  all other after blocks will still be run.

  See also:
    <Nodespec.before>
*/
nodespec.after = function after(options, block) {
  return create_hook(this, this.after_hooks, options, block);
}

function create_hook(nodespec, collection, options, block) {
  if (typeof options === 'function') {
    block = options;
    options = {};
  }
  options.nodespec = nodespec;
  options.collection = collection;
  var hook = new nodespec.deps.Hook(options, block);
  return hook;
}

/*
  Method: mockWith

  Load a pre-defined mocking library

  Arguments:

    lib - {string} The name of a supported mocking library

  Supported libraries:
    sinon - Provides a sinon sandbox to each test as
        context.sinon (<http://sinonjs.org>).
*/
nodespec.mockWith = function mockWith(lib) {
  try {
    require('./mocks/' + lib)(this);
  } catch (ex) {
    throw new Error('Cannot mock with ' + lib + ', ' +
            'this usually means a dependency is missing');
  }
}

/*
  Method: registerFormatter

  Add an additional formatter

  Arguments:
    name     - {string} Name of formatter
    file     - {string} Module path to require,
                expected to export `Formatter`
    set_default  - {boolean} Make this the default formatter
*/
nodespec.registerFormatter =
function registerFormatter(name, file, set_default) {
  this.available_formatters[name] = file;
  if (set_default) {
    this.default_formatter = name;
  }
}

function registerBuiltinFormatters(nodespec) {
  nodespec.registerFormatter(
    'progress', './formatters/progress', 'default');
}

function initFormatters(nodespec, emitter) {
  var formatters = [];
  nodespec.formatters.forEach(function(f) {
    var formatter = f.init(emitter);
    if (formatter) {
      formatters.push(formatter);
    }
  });
  return formatters;
}

nodespec.shutdownFormatters = function(formatters, callback) {
  // Give the formatters chance to flush their buffers
  async.forEach(formatters, function(formatter, next) {
    if (typeof formatter.onComplete == 'function') {
      formatter.onComplete(next);
    } else {
      next();
    }
  }, callback)
}

/*
  Method: run

  Run all specs currently defined for this suite

  Arguments:

    emitter - {EventEmitter} Event emitter to record runner events
    callback - {function} Callback fired on completion of execution
    callback.err  - {Error} undefined or an exception object
    callback.result - {<Result>} if err is undefined, this will contain a
                   summary of the test run

*/
nodespec.run = function run(emitter, callback) {
  // TODO: move more stuff out of run?
  var formatters = initFormatters(this, emitter);
  emitter.emit('suiteStart');
  var overall_result = new this.deps.Result();
  var runner = this;
  async.forEachSeries(
    this.example_groups,
    function iterator(group, next) {
      group.exec(emitter, function(err, result) {
        if (err) {
          callback(err);
          return;
        }
        overall_result.add(result);
        next();
      });
    },
    function finished(err) {
      if (err) return callback(err)

      emitter.emit('suiteComplete', overall_result);

      runner.shutdownFormatters(formatters, function(err) {
        callback(err, overall_result.exit_code)
      })
    }
  );
}

/*
  Method: exec

  Execute all specs currently defined for this suite

  Note that this function will conclude with a call to process.exit
*/
nodespec.exec = function() {
  // TODO: switch out cov properly
  var filter, cov = process.argv.indexOf('--cov');
  if (cov !== -1) {
    if (process.argv[cov + 1]) {
      filter = new RegExp(process.argv[cov + 1]);
    }
    process.argv.splice(cov, 1);
    var coverage = require('./coverage');
    return coverage.exec(this, filter);
  }
  var emitter = new EventEmitter();
  this.run(emitter, function(err, exit_code) {
    if (err) {
      console.error(err.message);
      process.exit(3);
    }
    process.exit(exit_code);
  })
}


/*
  Method: instrument

  Add coverage instrumentation to some source code, necessary to get coverage
  if you are using eval or the vm module as part of the test suite.

  If code coverage is not being collected, this function is a no-op

  Arguments:

    source   - the source code of the module
    filename - the filename of the module being instrumented
    [context] - the evaluation context to be used, required to
                add the special instrumentation functions.
                Only necessary if running the code sandboxed
*/
nodespec.instrument = function(source, filename, context) {
  return source;
}

module.exports = nodespec('default');
