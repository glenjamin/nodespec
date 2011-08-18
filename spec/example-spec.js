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
        return {group: this.group, nodespec: this.nodespec};
    });
    this.subject("block", function() {
        return this.sinon.spy();
    });
    this.subject("group", function() {
        var group = new Object;
        group.full_description = "group description";
        group.before_hooks = [];
        group.after_hooks = [];
        group.subjects = [];
        return group;
    });
    this.subject("nodespec", function() {
        return nodespec("target for testing");
    });
    this.after(function() { this.nodespec.abandon(); });
    this.describe("initialisation", function() {
        this.example("should have description", function() {
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
        this.example("should have block", function() {
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
        this.subject("context", function() {
            var context = new Object;
            context._setup_done = this.sinon.spy(function(done) {
                if (done) { context.done = done; }
            });
            context.check_expected_assertions = this.sinon.stub();
            return context;
        });
        this.subject("emitter", function() {
            var emitter = new Object;
            emitter.emit = this.sinon.spy();
            return emitter;
        });
        this.before(function() {
            var ctx = this.context;
            this.ctx_cls = this.sinon.stub(context, 'Context', function() {
                return ctx;
            });
            this.ctx_cls.prototype = context.Context.prototype;
        });
        this.example("should create context using nodespec", function(test) {
            test.expect(3);
            test.example.exec(test.emitter, function() {
                test.sinon.assert.calledOnce(test.ctx_cls);
                var call = test.ctx_cls.getCall(0);
                test.assert.ok(call.thisValue instanceof context.Context);
                test.assert.strictEqual(call.args[0], test.nodespec);
                test.done();
            });
        });
        this.context("non-async block", function() {
            this.subject("block", function() {
                return this.sinon.spy();
            });
            sync_exec_behaviour(this, {
                type: "pass",
                event: "examplePass"
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
        this.context("non-async block that raises Pending", function() {
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
        this.context("async block", function() {
            this.subject("block", function() {
                var test = this;
                test.block_spy = test.sinon.spy();
                return function(t) {
                    test.block_spy.apply(this, arguments);
                    t.done();
                };
            });
            async_exec_behaviour(this, {
                type: "pass",
                event: "examplePass"
            });
        });
        this.context("async block that throws AssertionError", function() {
            this.subject("block", function() {
                var ex = this.exception;
                var test = this;
                test.block_spy = test.sinon.spy();
                return function(t) {
                    test.block_spy.apply(this, arguments);
                    process.nextTick(function() {
                        throw ex;
                    });
                };
            });
            var group_name = this.description;
            this.subject("exception", function() {
                return new AssertionError({message: group_name});
            });
            async_exec_behaviour(this, {
                type: "fail",
                event: "exampleFail",
                error: "exception"
            });
            this.example("should return fail result", function(test) {
                test.expect(3);
                test.example.exec(test.emitter, function(err, result) {
                    test.assert.equal(err, null);
                    test.assert.ok(result instanceof SingleResult);
                    test.assert.equal(result.type, "fail");
                    test.done();
                });
            });
        });
        this.context("async block that doesn't call done", function() {
            this.subject("block", function() {
                var test = this;
                test.sinon.useFakeTimers();
                test.block_spy = this.sinon.spy();
                return function(t) {
                    test.block_spy.apply(this, arguments);
                    process.nextTick(function() {
                        test.sinon.clock.tick(5100);
                    });
                };
            });
            this.example("should error out after timeout", function(test) {
                test.expect(1);
                test.example.exec(test.emitter, function(err, result) {
                    test.assert.equal(result.type, "error");
                    test.done();
                }).timeout_after(6);
            });
        });
    });
});
nodespec.exec();

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
    var type = options.type, event = options.event, error = options.error;
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
        test.expect(9);
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
            // examplePass(example, error)
            var c3 = test.emitter.emit.getCall(2);
            test.assert.equal(c3.args[0], event);
            test.assert.equal(c3.args[1], test.example);
            test.assert.equal(c3.args[2], error ? test[error] : error);
            test.done();
        })
    });
}
