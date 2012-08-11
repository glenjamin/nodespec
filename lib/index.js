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
function factory(name, deps) {
  if (nodespecs[name]) {
    return nodespecs[name];
  }
  var instance = nodespecs[name] = function nodespec(name, deps){
    return factory.call(null, name, deps)
  };
  instance.__proto__ = Nodespec.prototype;
  Nodespec.call(instance, name, deps);
  return instance;
}

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
function Nodespec(name, deps) {
  this.nodespec_name = name;

  this.deps = deps || {};
  for (var d in default_deps) {
    this.deps[d] = this.deps[d] || default_deps[d];
  }
  this.root = new this.deps.ExampleGroup('', {nodespec: this, deps: this.deps});
  this.available_formatters = {};

  registerBuiltinFormatters(this);

  // TODO: handle formatter loading properly
  var formatters = [];
  Object.defineProperty(this, 'formatters', {
    get: function() {
      if (!formatters.length) {
        var f = this.available_formatters[this.default_formatter];
        formatters.push(require(f));
      }
      return formatters;
    },
    set: function(override) { formatters = override; }
  });
}

/*
  Class: Nodespec

*/

/*
  Constant: DEFAULT_HOOK_TIMEOUT

  Defaults to 2 seconds

  Returns:
    number
*/
Nodespec.prototype.DEFAULT_HOOK_TIMEOUT = 2;

/*
  Property: assert

  The assert object to be returned when accessing assert in a test context

  Defaults to require('assert'), the standard NodeJS assertion module

  Returns:
    module
*/
Nodespec.prototype.assert = assert;


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
Nodespec.prototype.abandon = function abandon() {
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
Nodespec.prototype.require = function(target) {
  var ex = {};
  var stack  = tracey();
  var base = stack[1].path;
  var resolved_target = path.resolve(base, '..', target);
  this.exec = noop;
  require(resolved_target);
  // Revert to prototype
  delete this.exec;
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
Nodespec.prototype.describe =
function describe(description, options, definition) {
  return this.root.describe(description, options, definition);
}

/*
  Method: before

  Add a before hook to be run before all specs in the suite

  Arguments:

    block - {function} The hook definition

  Returns:

    {<Hook>} The newly added Hook object

  See also

    <Nodespec.after>, <ExampleGroup.before>, <ExampleGroup.after>
*/
Nodespec.prototype.before = function before(options, block) {
  return this.root.before(options, block);
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
Nodespec.prototype.after = function after(options, block) {
  return this.root.after(options, block);
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
Nodespec.prototype.mockWith = function mockWith(lib) {
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
Nodespec.prototype.registerFormatter =
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

Nodespec.prototype.shutdownFormatters = function(formatters, callback) {
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
Nodespec.prototype.run = function run(emitter, callback) {
  // TODO: move more stuff out of run?
  var formatters = initFormatters(this, emitter);
  emitter.emit('suiteStart');
  var conf = {}
  if (~process.argv.indexOf('--halt')) {
    conf.halt = true;
  }
  var grep_index = process.argv.indexOf('--grep');
  if (~grep_index) {
    var grep = new RegExp(process.argv[grep_index + 1]);
    conf.filter = function(items) {
      return items.filter(function(item) {
        return item.children || grep.test(item.full_description);
      })
    }
  }
  var runner = this;
  this.root.exec(conf, emitter, function(err, result) {
    if (conf.halt && err === 'halt') err = null;
    if (err) return callback(err);

    emitter.emit('suiteComplete', result);

    runner.shutdownFormatters(formatters, function(err) {
      callback(err, result.exit_code)
    })
  })
}

/*
  Method: exec

  Execute all specs currently defined for this suite

  Note that this function will conclude with a call to process.exit
*/
Nodespec.prototype.exec = function() {
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
Nodespec.prototype.instrument = function(source, filename, context) {
  return source;
}

module.exports = factory('default');
