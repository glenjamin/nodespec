var nodespec = require('./common');

var AssertionError = require('assert').AssertionError;

var Example = require('../lib/example').Example;
var SingleResult = require('../lib/result').SingleResult;
var Pending = require('../lib/exceptions').Pending;
var context = require('../lib/context');

nodespec.describe("Example", function() {
  this.subject("example", function() {
    return new Example("example description", this.options, this.block);
  });
  this.subject("options", function() {
    return {group: this.group, nodespec: this.nodespec, deps: this.deps};
  });
  this.subject("deps", function() {
    return {
      SingleResult: SingleResult,
      Context: this.context_cls,
      Pending: Pending
    };
  });
  this.subject("block", function() {
    return this.sinon.spy();
  });
  this.subject("context_cls", function() {
    var test = this;
    return this.sinon.spy(function() {
      return test.context;
    });
  });
  this.subject("context", function() {
    var context = new Object;
    context._setup_done = this.sinon.spy(function(done) {
      if (done) { context.done = done; }
    });
    context.onError = function() { return false };
    context.assert = require('assert');
    return context;
  });
  this.subject("emitter", function() {
    var emitter = new Object;
    emitter.emit = this.sinon.spy();
    return emitter;
  });
  this.subject("group", function() {
    var group = new Object;
    group.full_description = "group description";
    group.before_hooks = this.before_hooks;
    group.after_hooks = this.after_hooks;
    group.subjects = this.subjects;
    return group;
  });
  this.subject("subjects", function() { return {}; });
  this.subject("before_hooks", function() { return []; });
  this.subject("after_hooks", function() { return []; });
  this.subject("nodespec", function() {
    return nodespec("target for testing");
  });
  this.after(function() { this.nodespec.abandon(); });
  this.describe("initialisation", function(it) {
    this.should("have description", function() {
      this.assert.equal(this.example.description, "example description");
    });
    this.example("timeout defaults to Example.DEFAULT_TIMEOUT", function() {
      this.sinon.stub(Example, "DEFAULT_TIMEOUT", 9);
      this.assert.equal(this.example.timeout, 9);
    });
    this.context("timeout specififed in options", function() {
      this.subject("example", function() {
        this.options.timeout = 99;
        return new Example("custom timeout", this.options, this.block);
      });
      this.example("timeout overridden", function() {
        this.assert.equal(this.example.timeout, 99);
      });
    });
    this.example("group taken from options", function() {
      this.assert.strictEqual(this.example.group, this.group);
    });
    this.example("nodespec taken from options", function() {
      this.assert.strictEqual(this.example.group, this.group);
    });
    this.example("full_description built from group", function() {
      this.assert.equal(this.example.full_description,
                "group description example description");
    });
    this.example("file and line of initialiser recorded", function() {
      // This would normally be the group.example call
      // that defines the test
      this.assert.equal(this.example.file_path, __filename);
      this.assert.equal(this.example.line_number, 12);
    });
    it("should have block", function() {
      this.assert.strictEqual(this.example.block, this.block);
    });
    this.context("called without block", function() {
      this.subject("example", function() {
        return new Example("no block", this.options);
      });
      this.example("should not have block", function() {
        this.assert.equal(this.example.block, undefined);
      });
      this.example("should have is_pending = true", function() {
        this.assert.equal(this.example.is_pending, true);
      });
    })
  });
  this.describe("timeout_after", function() {
    this.example("can modify timeout", function() {
      this.example.timeout_after(7);
      this.assert.equal(this.example.timeout, 7);
    });
  });
  this.describe("exec", function() {
    this.example("should create context using nodespec", function(test) {
      test.expect(4);
      test.example.exec(test.emitter, function() {
        test.sinon.assert.calledOnce(test.context_cls);
        test.assert.ok(test.context_cls.calledWithNew());
        var call = test.context_cls.getCall(0);
        test.assert.strictEqual(call.args[0], test.nodespec);
        test.assert.strictEqual(call.args[1].Pending,
                    test.deps.Pending);
        test.done();
      });
    });
    this.context("no block", function() {
      this.subject("block", function() {
        return undefined;
      });
      exec_behaviour(this, {
        type: "pend",
        event: "examplePend"
      });
    });
    this.context("non-async block", function() {
      this.subject("block", function() {
        return this.sinon.spy();
      });
      sync_exec_behaviour(this, {
        type: "pass",
        event: "examplePass",
        error: null
      });
    });
    this.context("non-async block that throws AssertionError", function() {
      this.subject("block", function() {
        var ex = this.exception;
        return this.sinon.spy(function() { throw ex; });
      });
      this.subject("exception", function() {
        return new AssertionError({message: "fail"});
      });
      sync_exec_behaviour(this, {
        type: "fail",
        event: "exampleFail",
        error: "exception"
      });
    });
    this.context("non-async block that throws Pending", function() {
      this.subject("block", function() {
        var ex = this.exception;
        return this.sinon.spy(function() { throw ex; });
      });
      this.subject("exception", function() {
        return new Pending("reason");
      });
      sync_exec_behaviour(this, {
        type: "pend",
        event: "examplePend",
        error: "exception"
      });
    });
    this.context("non-async block with no assertions", function() {
      this.subject("block", function() {
        var test = this;
        return test.sinon.spy(function() {
          test.context.assertions = 0;
          1 + 1;
        });
      });
      sync_exec_behaviour(this, {
        type: "pend",
        event: "examplePend",
      });
      this.example("result is Pending error", function(test) {
        test.example.exec(test.emitter, function(err, result) {
          test.assert.ok(result.error instanceof Pending);
          test.assert.ok(/zero assertions/i.test(result.error.message));
          test.done();
        });
      });
    });
    this.context("non-async block with ordinary error", function() {
      this.subject("block", function() {
        var ex = this.exception;
        return this.sinon.spy(function() { throw ex; });
      });
      this.subject("exception", function() {
        return new Error("epic fail");
      });
      sync_exec_behaviour(this, {
        type: "error",
        event: "exampleError",
        error: "exception"
      });
    });
    this.context("non-async block with wrong assertion count", function() {
      this.before(function() {
        this.context.assertions = 3;
        this.context.expected_assertions = 5;
      });
      sync_exec_behaviour(this, {
        type: "fail",
        event: "exampleFail",
      });
      this.example("result is assertion error", function(test) {
        test.example.exec(test.emitter, function(err, result) {
          test.assert.ok(result.error instanceof AssertionError);
          test.assert.ok(/expected 5/i.test(result.error.message));
          test.assert.ok(/got 3/i.test(result.error.message));
          test.done();
        });
      });
    });
    this.context("async block", function() {
      this.subject("block", function() {
        var test = this;
        test.block_spy = test.sinon.spy();
        return function(t) {
          test.block_spy.apply(this, arguments);
          process.nextTick(t.done);
        };
      });
      async_exec_behaviour(this, {
        type: "pass",
        event: "examplePass",
        error: null
      });
    });
    this.context("async block throwing async AssertionError", function() {
      this.subject("block", function() {
        var test = this;
        test.block_spy = test.sinon.spy();
        return function(t) {
          test.block_spy.apply(this, arguments);
          process.nextTick(function() {
            throw test.exception;
          });
        };
      });
      this.subject("exception", function() {
        return new AssertionError({message: "block failing assertion"});
      });
      async_exec_behaviour(this, {
        type: "fail",
        event: "exampleFail",
        error: "exception"
      });
    });
    this.context("async block calling back AssertionError", function() {
      this.subject("block", function() {
        var test = this;
        test.block_spy = test.sinon.spy();
        return function(t) {
          test.block_spy.apply(this, arguments);
          process.nextTick(function () {t.done(test.exception)});
        };
      });
      this.subject("exception", function() {
        return new AssertionError({message: "block failing assertion"});
      });
      async_exec_behaviour(this, {
        type: "fail",
        event: "exampleFail",
        error: "exception"
      });
    });
    this.context("async block throwing sync AssertionError", function() {
      this.subject("block", function() {
        var test = this;
        test.block_spy = test.sinon.spy();
        return function(t) {
          test.block_spy.apply(this, arguments);
          throw test.exception;
        };
      });
      this.subject("exception", function() {
        return new AssertionError({message: "block failing assertion"});
      });
      async_exec_behaviour(this, {
        type: "fail",
        event: "exampleFail",
        error: "exception"
      });
    });
    this.context("async block throwing async Pending", function() {
      this.subject("block", function() {
        var test = this;
        test.block_spy = test.sinon.spy();
        return function(t) {
          test.block_spy.apply(this, arguments);
          process.nextTick(function() {
            throw test.exception;
          });
        };
      });
      this.subject("exception", function() {
        return new Pending("test not implemented");
      });
      async_exec_behaviour(this, {
        type: "pend",
        event: "examplePend",
        error: "exception"
      });
    });
    this.context("async block calling back Pending", function() {
      this.subject("block", function() {
        var test = this;
        test.block_spy = test.sinon.spy();
        return function(t) {
          test.block_spy.apply(this, arguments);
          t.done(test.exception);
        };
      });
      this.subject("exception", function() {
        return new Pending("test not implemented");
      });
      async_exec_behaviour(this, {
        type: "pend",
        event: "examplePend",
        error: "exception"
      });
    });
    this.context("async block throwing sync Pending", function() {
      this.subject("block", function() {
        var test = this;
        test.block_spy = test.sinon.spy();
        return function(t) {
          test.block_spy.apply(this, arguments);
          throw test.exception;
        };
      });
      this.subject("exception", function() {
        return new Pending("test not implemented");
      });
      async_exec_behaviour(this, {
        type: "pend",
        event: "examplePend",
        error: "exception"
      });
    });
    this.context("async block with no assertions", function() {
      this.subject("block", function() {
        var test = this;
        test.block_spy = test.sinon.spy();
        return function(t) {
          test.block_spy.apply(this, arguments);
          t.assertions = 0;
          t.done();
        };
      });
      async_exec_behaviour(this, {
        type: "pend",
        event: "examplePend",
      });
      this.example("result is Pending error", function(test) {
        test.example.exec(test.emitter, function(err, result) {
          test.assert.ok(result.error instanceof Pending);
          test.assert.ok(/zero assertions/i.test(result.error.message));
          test.done();
        });
      });
    });
    this.context("async block throwing async Error", function() {
      this.subject("block", function() {
        var test = this;
        test.block_spy = test.sinon.spy();
        return function(t) {
          test.block_spy.apply(this, arguments);
          process.nextTick(function() {
            throw test.exception;
          });
        };
      });
      this.subject("exception", function() {
        return new Error("arbitrary error");
      });
      async_exec_behaviour(this, {
        type: "error",
        event: "exampleError",
        error: "exception"
      });
    });
    this.context("async block calling back Error", function() {
      this.subject("block", function() {
        var test = this;
        test.block_spy = test.sinon.spy();
        return function(t) {
          test.block_spy.apply(this, arguments);
          t.done(test.exception);
        };
      });
      this.subject("exception", function() {
        return new Error("arbitrary error");
      });
      async_exec_behaviour(this, {
        type: "error",
        event: "exampleError",
        error: "exception"
      });
    });
    this.context("async block throwing sync Error", function() {
      this.subject("block", function() {
        var test = this;
        test.block_spy = test.sinon.spy();
        return function(t) {
          test.block_spy.apply(this, arguments);
          throw test.exception;
        };
      });
      this.subject("exception", function() {
        return new Error("arbitrary error");
      });
      async_exec_behaviour(this, {
        type: "error",
        event: "exampleError",
        error: "exception"
      });
    });
    this.context("async block that calls done twice", function() {
      this.subject("block", function() {
        return function(t) {
          t.done();
          process.nextTick(t.done);
        };
      });
      this.example("should throw exception second time", function(test) {
        test.expect(2);
        test.onError(function(ex) {
          test.assert.ok(/called twice/.test(ex.message))
        })
        test.example.exec(test.emitter, function(err, result) {
          test.assert.equal(result.type, "pass");
        })
      })
    });
    this.context("async block that doesn't call done", function() {
      this.subject("block", function() {
        var test = this;
        test.sinon.useFakeTimers();
        test.block_spy = this.sinon.spy();
        return function(t) {
          test.block_spy.apply(this, arguments);
          process.nextTick(function() {
            test.sinon.clock.tick(4000);
          });
        };
      });
      this.before(function() {
        this.example.timeout_after(3.5);
      });
      this.example("should error out after timeout", function(test) {
        test.expect(1);
        test.example.exec(test.emitter, function(err, result) {
          test.assert.equal(result.type, "error");
          test.done();
        })
      });
      this.example("should emit events", function(test) {
        test.expect(11);
        test.example.exec(test.emitter, function(err, result) {
          test.sinon.assert.calledThrice(test.emitter.emit);
          var c1 = test.emitter.emit.getCall(0);
          test.assert.equal(c1.args[0], "exampleStart");
          test.assert.equal(c1.args[1], test.example);
          var c2 = test.emitter.emit.getCall(1);
          test.assert.equal(c2.args[0], "exampleComplete");
          test.assert.equal(c2.args[1], test.example);
          test.assert.equal(c2.args[2], result);
          var c3 = test.emitter.emit.getCall(2);
          test.assert.equal(c3.args[0], "exampleError");
          test.assert.equal(c3.args[1], test.example);
          test.assert.ok(c3.args[2] instanceof Error);
          test.assert.ok(!(c3.args[2] instanceof AssertionError));
          test.assert.ok(
            /done\(\) not called/.test(c3.args[2].message)
          );
          test.done();
        })
      });
    });
    this.context("async block with wrong assertion count", function() {
      this.subject("block", function() {
        var test = this;
        test.block_spy = this.sinon.spy();
        return function(t) {
          test.block_spy.apply(this, arguments);
          process.nextTick(function() {
            t.assertions = 10;
            t.expected_assertions = 4;
            process.nextTick(t.done);
          });
        };
      });
      async_exec_behaviour(this, {
        type: "fail",
        event: "exampleFail",
      });
      this.example("result is assertion error", function(test) {
        test.example.exec(test.emitter, function(err, result) {
          test.assert.ok(result.error instanceof AssertionError);
          test.assert.ok(/expected 4/i.test(result.error.message));
          test.assert.ok(/got 10/i.test(result.error.message));
          test.done();
        });
      });
    });
  });
  this.describe("subjects", function() {
    this.context("one subject", function() {
      this.subject("subjects", function() {
        return { subject: this.subject_dfn }
      });
      this.subject("subject_spy", function() {
        return this.sinon.spy();
      });
      this.subject("subject_dfn", function() {
        var spy = this.subject_spy;
        return function() {
          spy();
          return new Object;
        }
      });
      var describe_block = block_example.bind(this);
      describe_block("lazy eval in sync mode",
        function block() {
          this.assert.strictEqual(this.subject, this.subject);
        },
        function example_exec(test, result) {
          test.expect(2);
          test.assert.ifError(result.error);
          test.sinon.assert.calledOnce(test.subject_spy);
          test.done();
        }
      );
      describe_block("lazy eval in async mode",
        function block(test) {
          process.nextTick(function() {
            test.assert.strictEqual(test.subject, test.subject);
            process.nextTick(test.done);
          })
        },
        function example_exec(test, result) {
          test.expect(2);
          test.assert.ifError(result.error);
          test.sinon.assert.calledOnce(test.subject_spy);
          test.done();
        }
      );
    });
    this.context("multiple subjects", function() {
      this.subject("subjects", function() {
        return { one: this.one_dfn, two: this.two_dfn,
             three: this.three_dfn, four: this.four_dfn }
      });
      this.subject("one_spy", function() { return this.sinon.spy(); });
      this.subject("two_spy", function() { return this.sinon.spy(); });
      this.subject("three_spy", function() { return this.sinon.spy(); });
      this.subject("four_spy", function() { return this.sinon.spy(); });
      this.subject("one_dfn", function() {
        var spy = this.one_spy;
        return function() { spy(); return new Object; }
      });
      this.subject("two_dfn", function() {
        var spy = this.two_spy;
        return function() { spy(); return new Object; }
      });
      this.subject("three_dfn", function() {
        var spy = this.three_spy;
        return function() { spy(); return new Object; }
      });
      this.subject("four_dfn", function() {
        var spy = this.four_spy;
        return function() { spy(); return { two: this.two }; }
      });
      var describe_block = block_example.bind(this);
      describe_block("calling multiple, but not all",
        function block() {
          this.assert.notStrictEqual(this.one, this.two);
          this.assert.notStrictEqual(this.two, this.four);
          this.assert.strictEqual(this.one, this.one);
          this.assert.strictEqual(this.two, this.two);
          this.assert.strictEqual(this.four, this.four);
        },
        function example_exec(test, result) {
          test.expect(5);
          test.assert.ifError(result.error);
          test.sinon.assert.calledOnce(test.one_spy);
          test.sinon.assert.calledOnce(test.two_spy);
          test.sinon.assert.notCalled(test.three_spy);
          test.sinon.assert.calledOnce(test.four_spy);
          test.done();
        }
      );
      describe_block("using each other",
        function block() {
          this.assert.strictEqual(this.four.two, this.two);
        },
        function example_exec(test, result) {
          test.expect(3);
          test.assert.ifError(result.error);
          test.sinon.assert.calledOnce(test.four_spy);
          test.sinon.assert.calledOnce(test.two_spy);
          test.done();
        }
      );
    });
  });
  this.describe("before", function() {
    var placeholder = new Object;
    this.context("successful sync hook", function() {
      sync_before_behaviour.call(this,
        function hook() { this.x = placeholder; },
        function block() { this.assert.strictEqual(this.x, placeholder); },
        "should call hook and spec with no error",
        function(test, result) {
          test.expect(4);
          test.assert.ifError(result.error);
          test.assert.equal(result.type, 'pass');
          test.sinon.assert.calledOnce(test.hook);
          test.sinon.assert.calledOnce(test.block);
          test.done();
        }
      )
    });
    this.context("successful async hook", function() {
      async_before_behaviour.call(this,
        function setup_hooks() {
          var spy = this.hook_spy = this.sinon.spy();
          var hook = function(t) {
            spy.apply(this, arguments);
            t.x = placeholder;
            t.done()
          }
          return [hook]
        },
        function block() { this.assert.strictEqual(this.x, placeholder) },
        "should call hook with context as argument",
        function(test, result) {
          test.expect(6);
          test.assert.ifError(result.error);
          test.assert.equal(result.type, 'pass');
          test.sinon.assert.calledOnce(test.hook_spy);
          test.sinon.assert.calledWith(test.hook_spy, test.context);
          test.sinon.assert.calledOn(test.hook_spy, global)
          test.sinon.assert.calledOnce(test.block);
          test.done();
        }
      )
    })
    this.context("failing sync hook", function() {
      sync_before_behaviour.call(this,
        function hook() { this.assert.ok(false); },
        function block() { this.assert.ok(true); },
        "should call hook but not block, and fail",
        function(test, result) {
          test.expect(4);
          test.assert.ok(result.error);
          test.assert.equal(result.type, 'fail');
          test.sinon.assert.calledOnce(test.hook);
          test.sinon.assert.notCalled(test.block);
          test.done();
        }
      )
    })
    this.context("failing async hook", function() {
      async_before_behaviour.call(this,
        function setup_hooks() {
          var spy = this.hook_spy = this.sinon.spy();
          var hook = function(t) {
            spy.apply(this, arguments);
            process.nextTick(function() { t.assert.ok(false) })
          }
          return [hook]
        },
        function block() { this.assert.ok(true) },
        "should call hook but not block, and fail",
        function(test, result) {
          test.expect(6);
          test.assert.ok(result.error);
          test.assert.equal(result.type, 'fail');
          test.sinon.assert.calledOnce(test.hook_spy);
          test.sinon.assert.calledWith(test.hook_spy, test.context);
          test.sinon.assert.calledOn(test.hook_spy, global)
          test.sinon.assert.notCalled(test.block)
          test.done();
        }
      )
    })
    this.context("erroring sync hook", function() {
      sync_before_behaviour.call(this,
        function hook() { a = c + b },
        function block() { this.assert.ok(true); },
        "should call hook but not block, and error",
        function(test, result) {
          test.expect(4);
          test.assert.ok(result.error);
          test.assert.equal(result.type, 'error');
          test.sinon.assert.calledOnce(test.hook);
          test.sinon.assert.notCalled(test.block);
          test.done();
        }
      )
    });
    this.context("erroring async hook", function() {
      async_before_behaviour.call(this,
        function setup_hooks() {
          var spy = this.hook_spy = this.sinon.spy();
          var hook = function(t) {
            spy.apply(this, arguments);
            process.nextTick(function() { a = c + b })
          }
          return [hook]
        },
        function block() { this.assert.ok(true) },
        "should call hook but not block, and error",
        function(test, result) {
          test.expect(6);
          test.assert.ok(result.error);
          test.assert.equal(result.type, 'error');
          test.sinon.assert.calledOnce(test.hook_spy);
          test.sinon.assert.calledWith(test.hook_spy, test.context);
          test.sinon.assert.calledOn(test.hook_spy, global)
          test.sinon.assert.notCalled(test.block);
          test.done();
        }
      )
    })
    this.context("mutliple successful sync hooks", function() {
      sync_before_behaviour.call(this,
        [function hook1() { this.a = 1 }, function hook2() { this.a = 2 }],
        function block() {
          this.assert.equal(this.a, 2);
        },
        "should call hooks and then the block and pass",
        function(test, result) {
          test.expect(5);
          test.assert.ifError(result.error);
          test.assert.equal(result.type, 'pass');
          test.sinon.assert.calledOnce(test.hook1);
          test.sinon.assert.calledOnce(test.hook2);
          test.sinon.assert.calledOnce(test.block);
          test.done();
        }
      )
    });
    this.context("mutliple successful async hooks", function() {
      async_before_behaviour.call(this,
        function setup_hooks() {
          var spy1 = this.hook1_spy = this.sinon.spy();
          var hook1 = function(t) {
            spy1.apply(this, arguments);
            process.nextTick(function() { t.a = 1; t.done() })
          }
          var spy2 = this.hook2_spy = this.sinon.spy();
          var hook2 = function(t) {
            spy2.apply(this, arguments);
            process.nextTick(function() { t.a = 2; t.done() })
          }
          return [hook1, hook2]
        },
        function block() { this.assert.strictEqual(this.a, 2) },
        "should call hooks and then the block and pass",
        function(test, result) {
          test.expect(5);
          test.assert.ifError(result.error);
          test.assert.equal(result.type, 'pass');
          test.sinon.assert.calledOnce(test.hook1_spy);
          test.sinon.assert.calledOnce(test.hook2_spy);
          test.sinon.assert.calledOnce(test.block);
          test.done();
        }
      )
    })
    this.context("first of 2 sync hooks fails", function() {
      sync_before_behaviour.call(this,
        [
          function hook1() { this.assert.ok(false) },
          function hook2() { this.b = 2 }
        ],
        function block() { this.assert.ok(true); },
        "should call the first hook only, and fail",
        function(test, result) {
          test.expect(5);
          test.assert.ok(result.error);
          test.assert.equal(result.type, 'fail');
          test.sinon.assert.calledOnce(test.hook1);
          test.sinon.assert.notCalled(test.hook2);
          test.sinon.assert.notCalled(test.block);
          test.done();
        }
      )
    })
    this.context("first of 2 async hooks fails", function() {
      async_before_behaviour.call(this,
        function setup_hooks() {
          var spy1 = this.hook1_spy = this.sinon.spy();
          var hook1 = function(t) {
            spy1.apply(this, arguments);
            process.nextTick(function() { t.assert.ok(false) })
          }
          var spy2 = this.hook2_spy = this.sinon.spy();
          var hook2 = function(t) {
            spy2.apply(this, arguments);
            process.nextTick(function() { t.a = 2; t.done() })
          }
          return [hook1, hook2]
        },
        function block() { this.assert.strictEqual(this.a, 2) },
        "should call the first hook only, and fail",
        function(test, result) {
          test.expect(5);
          test.assert.ok(result.error);
          test.assert.equal(result.type, 'fail');
          test.sinon.assert.calledOnce(test.hook1_spy);
          test.sinon.assert.notCalled(test.hook2_spy);
          test.sinon.assert.notCalled(test.block);
          test.done();
        }
      )
    })
    this.context("async hook not calling done", function() {
      async_before_behaviour.call(this,
        function setup_hooks() {
          var spy = this.hook_spy = this.sinon.spy();
          var hook = function(t) { spy.apply(this, arguments); }
          return [hook]
        },
        function block() { this.assert.ok(true) },
        "should call hook, not block and error",
        function(test, result) {
          test.expect(4);
          test.assert.ok(result.error);
          test.assert.equal(result.type, 'error');
          test.sinon.assert.calledOnce(test.hook_spy);
          test.sinon.assert.notCalled(test.block);
          test.done();
        }
      )
    })
    this.context("async hook with longer timeout not calling done", function() {
      async_before_behaviour.call(this,
        function setup_hooks() {
          var test = this;
          test.sinon.useFakeTimers();
          var spy = this.hook_spy = this.sinon.spy();
          var hook = function(t) {
            spy.apply(this, arguments);
            process.nextTick(function() { test.sinon.clock.tick(4500) })
          }
          hook.timeout = 4;
          return [hook]
        },
        function block() { this.assert.ok(true) },
        "should call hook, not block and error",
        function(test, result) {
          test.expect(4);
          test.assert.ok(result.error);
          test.assert.equal(result.type, 'error');
          test.sinon.assert.calledOnce(test.hook_spy);
          test.sinon.assert.notCalled(test.block);
          test.done();
        }
      )
    })
    this.context("async hook calling done twice", function(it) {
      this.subject("before_hooks", function() {
        return [{block: this.hook, timeout: 0.01}]
      })
      this.subject("hook", function() {
        var spy = this.hook_spy = this.sinon.spy();
        return function(t) {
          spy.apply(this, arguments)
          t.done();
          t.done();
        }
      })
      this.subject("block", function() {
        return this.sinon.spy(function block() { this.assert.ok(true); })
      })
      it("should throw error second time", function(test) {
        test.expect(4)
        test.onError(function(err) {
          test.assert.ok(/called twice/.test(err.message))
        })
        test.example.exec(test.emitter, function(err, result) {
            test.assert.ifError(result.error);
            test.assert.equal(result.type, 'pass');
            test.sinon.assert.calledOnce(test.hook_spy);
            test.sinon.assert.calledOnce(test.block);
        })
      })
    })
  });
  this.describe("after", function() {
    var placeholder = new Object;
    this.context("successful sync hook", function() {
      sync_after_behaviour.call(this,
        function block() { this.x = placeholder; },
        function hook() { this.assert.equal(this.x, placeholder) },
        "should call spec and hook with no error",
        function(test, result) {
          test.expect(4);
          test.assert.ifError(result.error);
          test.assert.equal(result.type, 'pass');
          test.sinon.assert.calledOnce(test.block);
          test.sinon.assert.calledOnce(test.hook);
          test.done();
        }
      )
    });
    this.context("failing sync hook", function() {
      sync_after_behaviour.call(this,
        function block() { this.x = placeholder; },
        function hook() { this.assert.equal(this.x, 7) },
        "should call spec and hook and fail",
        function(test, result) {
          test.expect(4);
          test.assert.ok(result.error);
          test.assert.equal(result.type, 'fail');
          test.sinon.assert.calledOnce(test.block);
          test.sinon.assert.calledOnce(test.hook);
          test.done();
        }
      )
    });
    this.context("erroring sync hook", function() {
      sync_after_behaviour.call(this,
        function block() { this.x = placeholder; },
        function hook() { a = b + c },
        "should call spec and hook and error",
        function(test, result) {
          test.expect(4);
          test.assert.ok(result.error);
          test.assert.equal(result.type, 'error');
          test.sinon.assert.calledOnce(test.block);
          test.sinon.assert.calledOnce(test.hook);
          test.done();
        }
      )
    });
    this.context("failing spec with a sync hook", function() {
      sync_after_behaviour.call(this,
        function block() { this.assert.ok(false) },
        function hook() { this.assert.ok(true) },
        "should call spec and fail but still call hook",
        function(test, result) {
          test.expect(4);
          test.assert.ok(result.error);
          test.assert.equal(result.type, 'fail');
          test.sinon.assert.calledOnce(test.block);
          test.sinon.assert.calledOnce(test.hook);
          test.done();
        }
      )
    });
    this.context("failing spec with a failing sync hook", function() {
      sync_after_behaviour.call(this,
        function block() { this.assert.ok(false, 'spec') },
        function hook() { this.assert.ok(false, 'hook') },
        "should call spec and hook, but provide spec's error",
        function(test, result) {
          test.expect(5);
          test.assert.ok(result.error);
          test.assert.equal(result.type, 'fail');
          test.assert.equal(result.error.message, 'spec');
          test.sinon.assert.calledOnce(test.block);
          test.sinon.assert.calledOnce(test.hook);
          test.done();
        }
      )
    });
    this.context("mutliple successful sync hooks", function() {
      sync_after_behaviour.call(this,
        function block() { this.a = 1; },
        [
          function hook1() { this.assert.equal(this.a, 1); this.a = 2 },
          function hook2() { this.assert.equal(this.a, 2); }
        ],
        "should call block, then hooks, and pass",
        function(test, result) {
          test.expect(5);
          test.assert.ifError(result.error);
          test.assert.equal(result.type, 'pass');
          test.sinon.assert.calledOnce(test.block);
          test.sinon.assert.calledOnce(test.hook1);
          test.sinon.assert.calledOnce(test.hook2);
          test.done();
        }
      )
    });
    this.context("mutliple failing sync hooks", function() {
      sync_after_behaviour.call(this,
        function block() { this.a = 1; },
        [
          function hook1() { this.assert.equal(this.a, 2, 'one'); },
          function hook2() { this.assert.equal(this.a, 2, 'two'); }
        ],
        "should call block, then hooks, and return first error",
        function(test, result) {
          test.expect(6);
          test.assert.ok(result.error);
          test.assert.equal(result.type, 'fail');
          test.assert.equal(result.error.message, 'one');
          test.sinon.assert.calledOnce(test.block);
          test.sinon.assert.calledOnce(test.hook1);
          test.sinon.assert.calledOnce(test.hook2);
          test.done();
        }
      )
    });
    this.context("mutliple erroring sync hooks", function() {
      sync_after_behaviour.call(this,
        function block() { this.a = 1; },
        [
          function hook1() { throw new Error('one') },
          function hook2() { throw new Error('two') }
        ],
        "should call block, then hooks, and return all errors",
        function(test, result) {
          test.expect(8);
          test.assert.ok(result.error);
          test.assert.equal(result.type, 'error');
          test.assert.ok(/multiple/i.test(result.error.message));
          test.assert.equal(result.error.errors[0].message, 'one');
          test.assert.equal(result.error.errors[1].message, 'two');
          test.sinon.assert.calledOnce(test.block);
          test.sinon.assert.calledOnce(test.hook1);
          test.sinon.assert.calledOnce(test.hook2);
          test.done();
        }
      )
    });
    this.context("erroring hook followed by failing hook", function() {
      sync_after_behaviour.call(this,
        function block() { this.a = 1; },
        [
          function hook1() { throw new Error('one') },
          function hook2() { this.assert.equal(this.a, 2, 'two') }
        ],
        "should call block, then hooks, and return all errors",
        function(test, result) {
          test.expect(8);
          test.assert.ok(result.error);
          test.assert.equal(result.type, 'error');
          test.assert.ok(/multiple/i.test(result.error.message));
          test.assert.equal(result.error.errors[0].message, 'one');
          test.assert.equal(result.error.errors[1].message, 'two');
          test.sinon.assert.calledOnce(test.block);
          test.sinon.assert.calledOnce(test.hook1);
          test.sinon.assert.calledOnce(test.hook2);
          test.done();
        }
      )
    });
  });
});
nodespec.exec();

/*** Test factories ***/

function block_example(body_desc, block, body) {
  this.context("", function() {
    this.subject("block", function() { return block; });
    this.example(body_desc, function(test) {
      test.example.exec(test.emitter, function(err, result) {
        body(test, result);
      });
    });
  });
}

function sync_exec_behaviour(group, options) {
  group.example("should run block in context", function(test) {
    test.expect(3);
    test.example.exec(test.emitter, function() {
      test.sinon.assert.calledOnce(test.block);
      var call = test.block.getCall(0);
      test.assert.strictEqual(call.thisValue, test.context);
      test.assert.equal(call.args.length, 0);
      test.done();
    });
  });
  exec_behaviour(group, options);
}
function async_exec_behaviour(group, options) {
  group.example("should call block with context", function(test) {
    test.expect(3);
    test.example.exec(test.emitter, function() {
      test.sinon.assert.calledOnce(test.block_spy);
      var call = test.block_spy.getCall(0);
      test.assert.notStrictEqual(call.thisValue, test.context);
      test.assert.strictEqual(call.args[0], test.context);
      test.done();
    });
  });
  exec_behaviour(group, options);
}
function exec_behaviour(group, options) {
  var type = options.type, event = options.event;
  group.example("should return "+type+" result", function(test) {
    test.expect(3);
    test.example.exec(test.emitter, function(err, result) {
      test.assert.equal(err, null);
      test.assert.ok(result instanceof SingleResult);
      test.assert.equal(result.type, type);
      test.done();
    });
  });
  group.example("should emit events", function(test) {
    test.expect('error' in options ? 9 : 8);
    test.example.exec(test.emitter, function(err, result) {
      test.sinon.assert.calledThrice(test.emitter.emit);
      // exampleStart(example)
      var c1 = test.emitter.emit.getCall(0);
      test.assert.equal(c1.args[0], "exampleStart");
      test.assert.equal(c1.args[1], test.example);
      // exampleComplete(example, result)
      var c2 = test.emitter.emit.getCall(1);
      test.assert.equal(c2.args[0], "exampleComplete");
      test.assert.equal(c2.args[1], test.example);
      test.assert.equal(c2.args[2], result);
      // example<event>(example, error)
      var c3 = test.emitter.emit.getCall(2);
      test.assert.equal(c3.args[0], event);
      test.assert.equal(c3.args[1], test.example);
      if ('error' in options) {
        var error = options.error && test[options.error];
        test.assert.equal(c3.args[2], error);
      }
      test.done();
    })
  });
}

function async_before_behaviour(hooks, block, desc, example) {
  async_hook_behaviour.call(this, "before", hooks, block, desc, example);
}
function async_after_behaviour(hooks, block, desc, example) {
  async_hook_behaviour.call(this, "after", hooks, block, desc, example);
}
function sync_before_behaviour(hook, block, desc, example) {
  sync_hook_behaviour.call(this, "before", hook, block, desc, example);
}
function sync_after_behaviour(block, hook, desc, example) {
  sync_hook_behaviour.call(this, "after", hook, block, desc, example);
}

function sync_hook_behaviour(type, hook, block, desc, example) {
  var define_hooks = function() {
    if (hook.map) {
      return hook.map(function(h, i) {
        return this["hook" + (i+1)] = this.sinon.spy(h);
      }.bind(this))
    } else {
      this.hook = this.sinon.spy(hook);
      return [this.hook]
    }
  }
  hook_behaviour.call(this, type, define_hooks, block, desc, example);
}

function async_hook_behaviour(type, hooks, block, desc, example) {
  hook_behaviour.call(this, type, hooks, block, desc, example);
}

function hook_behaviour(type, hooks, block, desc, example) {
  this.subject(type + "_hooks", function() {
    return hooks.call(this).map(function(h) {
      return { block: h, timeout: h.timeout || 0.01 }
    })
  })
  this.subject("block", function() { return this.sinon.spy(block) })
  this.example(desc, function(test) {
    test.example.exec(test.emitter, function(err, result) {
      example(test, result);
    })
  })
}
