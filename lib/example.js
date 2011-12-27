var assert = require('assert');

var async = require('async');
var tracey = require('tracey');

exports.Example = Example;

/*
  Class: Example

  Describes a single piece of behaviour

  Requiring:

    > var Example = require('nodespec/lib/example').Example;

  In general an Example should not be instantiated directly, and instead
  created via <ExampleGroup.example>.
*/

/*
  Constructor: Example

  Arguments:

    description - {string} The title of the behaviour being described
    options   - {options} See below
    block     - {function} The spec definition, can be prodcedural or
                 asynchronous. See <ExampleGroup.example>.
    options.timeout  - {nunber} seconds before assuming spec has stalled
    options.group  - The parent <ExampleGroup> of this spec
    options.nodespec - The top-level <nodespec> function
    options.deps - {options} Constructor function dependency injection
    options.deps.Context    - constructor function for context
    options.deps.SingleResult - constructor function for one result
    options.deps.Pending    - constructor function for pending exception
*/
function Example(description, options, block) {
  this.deps = options.deps;
  delete options.deps;
  this.description = description;
  this.options = options;
  this.timeout = options.timeout || this.constructor.DEFAULT_TIMEOUT;
  this.group = options.group;
  delete options.group;
  this.nodespec = options.nodespec;
  delete options.nodespec;
  this.full_description = this.group.full_description + ' ' + description;
  // Remove 2 from the top - new Error and new Example
  var stack = tracey();
  // Caller is first line outside nodespec/lib
  for (var i = 0; i < stack.length; ++i) {
    if (!/nodespec\/lib/.test(stack[i].path)) {
      var calling_line = stack[i];
      break;
    }
  }
  this.file_path = calling_line.path;
  this.line_number = calling_line.line;

  if (block) {
    this.block = block;
  } else {
    this.is_pending = true;
  }
}

/*
  Constant: DEFAULT_TIMEOUT

  Defaults to 5 seconds

  Returns:
    number
*/
Example.DEFAULT_TIMEOUT = 5;

/*
  Property: description

  The description of this example

  Returns:
    string
*/

/*
  Property: full_description

  The full description, parent's description + this example's

  Returns:
    string
*/

/*
  Property: file_path

  The file where this example was declared

  This is defined as the first file in the stack trace that is not found
  inside nodespec/lib

  Returns:
    string
*/

/*
  Property: line_number

  The line number where this example was declared. See <Example.file_path>.

  Returns:
    number
*/

/*
  Method: toString

  Useful string representation of the example

  Includes full description, file path and line number

  Returns:
    string
*/
Example.prototype.toString = function() {
  return this.full_description + ' at ' +
       this.file_path + ':' + this.line_number;
};

/*
  Method: timeout_after

  Modify the execution timeout

  Arguments:

    seconds - {number} New timeout value
*/
Example.prototype.timeout_after = function(seconds) {
  this.timeout = seconds;
};

/*
  Method: exec

  Execute this example

  All before hooks defined will be executed in sequence, followed by the
  example, followed by all of the after hooks. Any defined subjects will
  be available to the example's context.

  Arguments:

    emitter - {EventEmitter} events from execution will be fired on this
                 emitter
    callback - {function} Callback fired on completion of execution
    callback.err -  {Error} undefined or an exception object
    callback.result - {<SingleResult>} The result of the execution

  Events:

    exampleStart  (Example)    - Example about to be executed
    exampleComplete (Example, err) - Example has finished execution
    examplePass   (Example)    - Example has passed
    exampleFail   (Example, err) - Example has failed
    examplePend   (Example, err) - Example is pending
    exampleError  (Example, err) - Example has errored
*/
Example.prototype.exec = function(emitter, callback/*(err, result)*/) {
  var example = this;
  emitter.emit('exampleStart', example);
  // No block, bail out early
  if (example.is_pending) {
    finished(null, example.deps.SingleResult.PEND);
    return;
  }
  var ctx = new example.deps.Context(example.nodespec, example.deps);
  async.series(
    {
      subjects: function(cb) { example.setup_subjects(ctx, cb); },
      before:   function(cb) { example.exec_before(ctx, cb); },
      spec:   function(cb) { example.exec_spec(ctx, cb); }
    },
    function(err) {
      example.exec_after(ctx, function(after_err) {
        if (!err) {
          err = after_err;
        }

        if (!err) {
          finished(null, example.deps.SingleResult.PASS);
        } else {
          var error_result;
          if (err instanceof example.deps.Pending) {
            error_result = example.deps.SingleResult.PEND;
          } else if (err instanceof assert.AssertionError) {
            error_result = example.deps.SingleResult.FAIL;
          } else {
            error_result = example.deps.SingleResult.ERROR;
          }
          error_result.error = err;
          finished(null, error_result);
        }
      });
    }
  );
  function finished(err, result) {
    emitter.emit('exampleComplete', example, result);
    // Capitalise result.type to make the event name
    var result_event = result.type[0].toUpperCase() + result.type.slice(1);
    emitter.emit('example' + result_event, example, result.error);
    process.nextTick(function() {
      callback(err, result);
    });
  }
};

/*
  Private Method: exec_spec
*/
Example.prototype.exec_spec = function(context, exec_callback) {
  var example = this;
  exec_block({
    example: this, block: this.block, context: context,
    type: 'spec', timeout: this.timeout, check_assertions: true
  }, function(err) {
    if (err) {
      var on_error = context.onError();
      if (on_error) {
        var internal_error = (err instanceof example.deps.Pending ||
                              err instanceof assert.AssertionError)
        if (!internal_error) {
          context.onError(false);
          try {
            on_error.call(context, err);
            err = null;
          } catch (ex) {
            err = ex;
          }
        }
      }
    }
    err = err || check_expected_assertions(example, context);
    return exec_callback(err);
  });
};
/*
  Private Method: setup_subjects
*/
Example.prototype.setup_subjects = function(context, main_callback) {
  for (var name in this.group.subjects) {
    define_subject(context, name, this.group.subjects[name]);
  }
  main_callback();
};
function define_subject(context, name, subject) {
  var value, called;
  Object.defineProperty(context, name, {
    get: function() {
      if (called)
        return value;
      value = subject.call(context);
      called = true;
      return value;
    },
    set: function(val) {
        value = val;
        called = true;
    }
  });
}
/*
  Private Method: exec_before
*/
Example.prototype.exec_before = function(context, exec_callback) {
  var example = this;
  async.forEachSeries(this.group.before_hooks,
    function iterator(hook, callback) {
      exec_block({
        example: example, block: hook.block, context: context,
        type: 'before', timeout: hook.timeout, check_assertions: false
      }, callback);
    },
    exec_callback
  );
};
/*
  Private Method: exec_after
*/
Example.prototype.exec_after = function(context, exec_callback) {
  var example = this;
  var errors = [];
  async.forEachSeries(this.group.after_hooks,
    function iterator(hook, callback) {
      exec_block({
        example: example, block: hook.block, context: context,
        type: 'after', timeout: hook.timeout, check_assertions: false
      }, function(err) {
        if (err) errors.push(err);
        callback();
      });
    },
    function() {
      var err;
      if (errors.length == 1) {
        err = errors.pop();
      } else if (errors.length > 1) {
        if (errors[0] instanceof assert.AssertionError) {
          err = errors.shift();
        } else {
          err = new Error('Multiple failures in after blocks');
          err.errors = errors;
        }
      }
      exec_callback(err);
    }
  );
};

function exec_block(options, callback) {
  var block = options.block;
  var func = (block.length == 1) ? exec_block_async : exec_block_sync ;
  func(options, callback);
}

function exec_block_sync(options, callback) {
  var context = options.context;
  var block = options.block;
  context._setup_done(false);
  var err;
  try {
    block.call(context);
  } catch (ex) {
     err = ex;
  }
  callback(err);
}

function exec_block_async(options, callback) {
  // This method is rather spidery, everything sort of calls everything else
  // at some point it might be worth trying to tidy it up some more
  var context = options.context;
  var block = options.block;

  var done_timer, ignore_timer;
  // Use the process hook to capture any uncaught error
  var old_listeners = process.listeners('uncaughtException');
  process.removeAllListeners('uncaughtException');
  var cleanup_and_callback = function(err) {
    // Only run cleanup once, but if we get an error later better not eat it
    cleanup_and_callback = function(err) {
      if (err) throw err;
    }

    context._setup_done(function() {
      throw new Error('done() called twice from:\n' +
                      options.example.toString());
    });
    clearTimeout(done_timer);
    ignore_timer = true;
    process.removeListener('uncaughtException', arguments.callee);
    old_listeners.forEach(function(listener) {
      process.on('uncaughtException', listener);
    });
    callback(err);
  }
  process.on('uncaughtException', cleanup_and_callback);

  // Setup the test.done() callback for the block
  context._setup_done(cleanup_and_callback);
  block.call(null, context);
  // If we don't hear from the context.done() callback
  // before timeout expires then we have a failing test
  done_timer = setTimeout(function() {
    if (ignore_timer) {
      return;
    }
    var error = new Error('done() not called for ' + options.example);
    cleanup_and_callback(error);
  }, options.timeout * 1000);
}

function check_expected_assertions(example, context) {
  var expected = context.expected_assertions;
  if (expected && context.assertions != expected) {
    var msg = 'Expected ' + expected +
          ' assertions but got ' + context.assertions;
    return new assert.AssertionError({ message: msg });
  }
  if (context.assertions == 0) {
    return new example.deps.Pending("Zero assertions");
  }
  return null;
}
