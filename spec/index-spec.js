var nodespec = require('./common');

var eg = require('../lib/example_group'),
    r  = require('../lib/result'),
    pf = require('../lib/formatters/progress_formatter');

var Module = require('module').Module;

nodespec.describe("Nodespec", function() {
    this.describe("sandboxing nodespecs", function() {
        this.example("require('nodespec') gives default", function() {
            var nodespec1 = require('../lib/index');
            var nodespec2 = nodespec1('default');
            this.assert.strictEqual(nodespec1, nodespec2);
            // Cleanup, test below proves it works!
            nodespec1.abandon();
        });
        this.example("calling nodespec gives a new copy", function() {
            var new_nodespec = nodespec("new copy");
            this.assert.notStrictEqual(new_nodespec, nodespec);
            var another = nodespec("another");
            this.assert.notStrictEqual(another, nodespec);
            this.assert.notStrictEqual(another, new_nodespec);
            // Cleanup, test below proves it works!
            new_nodespec.abandon(); another.abandon();
        });
        this.example("same name gives the same copy", function() {
            var one_nodespec = nodespec("new copy");
            var two_nodespec = nodespec("new copy");
            this.assert.strictEqual(one_nodespec, two_nodespec);
            // Cleanup, test below proves it works!
            one_nodespec.abandon();
        });
        this.example("abandon() can discard copy", function() {
            var one_nodespec = nodespec("new copy");
            one_nodespec.abandon();
            var two_nodespec = nodespec("new copy");
            this.assert.notStrictEqual(one_nodespec, two_nodespec);
            // Don't leave two_nodespec lying around
            two_nodespec.abandon();
        });
    });
    this.context("sandboxed nodespec module", function() {
        this.before("nodespec", function() {
            this.nodespec = nodespec("fresh nodespec to test");
        });
        this.after(function() {
            this.nodespec.abandon();
        });
        this.describe("assert", function() {
            this.example("defaults to stdlib assert module", function() {
                this.assert.strictEqual(this.nodespec.assert,
                                        require('assert'));
            });
            this.example("can be replaced with custom object", function() {
                var replacement_assert = new Object;
                this.nodespec.assert = replacement_assert;

                this.assert.strictEqual(this.nodespec.assert,
                                        replacement_assert);
            });
        });
        this.describe("describe", function() {
            this.subject("definition", function() { return function(){} });
            this.before(function() {
                this.eg_cls = this.sinon.stub(eg, "ExampleGroup");
                this.eg_cls.prototype = eg.ExampleGroup.prototype;
            });
            this.example("factory for ExampleGroup", function() {
                var group = this.nodespec.describe("a set of tests",
                                                   this.definition);

                this.sinon.assert.calledOnce(this.eg_cls);
                var call = this.eg_cls.getCall(0);

                // Called as constructor
                this.assert.ok(call.thisValue instanceof eg.ExampleGroup);
                // Arg 1 = description
                this.assert.equal(call.args[0], "a set of tests");
                // Arg 2 = options object
                this.assert.equal(typeof call.args[1], 'object');
                // options.parent is nodespec
                this.assert.strictEqual(call.args[1].parent, this.nodespec);
                // options.nodespec is nodespec
                this.assert.strictEqual(call.args[1].nodespec, this.nodespec);
                // Arg 3 = definition function
                this.assert.equal(call.args[2], this.definition);
            });
            this.example("can pass explicit options", function() {
                var options = {};
                var group = this.nodespec.describe("a set of tests",
                                                   options, this.definition);

                this.sinon.assert.calledOnce(this.eg_cls);
                var call = this.eg_cls.getCall(0);

                // Arg 2 = options object
                this.assert.strictEqual(call.args[1], options);
                // options.parent is still set to nodespec
                this.assert.strictEqual(call.args[1].parent, this.nodespec);
                // options.nodespec is still set to nodespec
                this.assert.strictEqual(call.args[1].nodespec, this.nodespec);
            });
            this.example("appends new instance to collection", function() {
                var group = this.nodespec.describe("a set of tests",
                                                   this.definition);
                this.assert.strictEqual(this.nodespec.example_groups.length, 1);
                this.assert.strictEqual(this.nodespec.example_groups[0], group);
            })
        });
        this.describe("require", function() {
            this.example("should call native require", function() {
                var load = this.sinon.stub(Module, "_load");

                this.nodespec.require("some-tests");
                this.sinon.assert.calledOnce(load);
                this.sinon.assert.calledWith(load, __dirname + "/some-tests");
            });
            this.example("should disable exec during the require", function() {
                var load = this.sinon.stub(Module, "_load", function() {
                    this.nodespec.exec();
                }.bind(this));
                var exec = this.sinon.stub(this.nodespec, "exec");

                this.nodespec.require("some-tests");
                this.sinon.assert.notCalled(exec);
            });
        });
        this.describe("global hooks", function() {
            this.subject("block", function(){
                return function(){};
            });
            this.example("before adds block to before_hooks", function() {
                this.nodespec.before(this.block);
                this.assert.equal(this.nodespec.before_hooks.length, 1);
                this.assert.equal(this.nodespec.before_hooks[0], this.block);
            });
            this.example("after adds block to after_hooks", function() {
                this.nodespec.after(this.block);
                this.assert.equal(this.nodespec.after_hooks.length, 1);
                this.assert.equal(this.nodespec.after_hooks[0], this.block);
            });
        })
        this.describe("mockWith", function() {
            this.example("should load named mock support file", function() {
                var Module = require('module').Module;
                var load = this.sinon.stub(Module, "_load");
                var mock_support_mixin = this.sinon.spy();
                load.returns(mock_support_mixin);

                this.nodespec.mockWith("mockingbird");

                this.sinon.assert.calledOnce(load);
                this.sinon.assert.calledWith(load, "./mocks/mockingbird");
                this.sinon.assert.calledOnce(mock_support_mixin);
                this.sinon.assert.calledWith(mock_support_mixin, this.nodespec);
            });
            this.example("should raise for missing support file", function() {
                var Module = require('module').Module;
                var load = this.sinon.stub(Module, "_load", function(module) {
                    var msg = "Error: cannot find module '" + module + "'";
                    throw new Error(msg);
                });

                this.assert.throws(function() {
                    this.nodespec.mockWith("mockingbird");
                }.bind(this),
                'Error', "Cannot mock with mockingbird, "+
                         "this usually means a dependency is missing");
            });
            this.example("should raise for broken support", function() {
                var Module = require('module').Module;
                var load = this.sinon.stub(Module, "_load");
                var mock_support_mixin = function(nodespec) {
                    nodespec = a + b;
                };
                load.returns(mock_support_mixin);

                this.assert.throws(function() {
                    this.nodespec.mockWith("mockingbird");
                }.bind(this),
                'Error', "Cannot mock with mockingbird, "+
                         "this usually means a dependency is missing");
            });
        });
        this.describe("exec", function() {
            this.subject("result", function() { return new Object; });
            this.subject("groups", function() { return []; });
            this.before(function() {
                var s = this.sinon;
                this.res_cls = s.stub(r, "Result");
                this.res_cls.returns(this.result);
                s.stub(this.nodespec, "example_groups", this.groups);
                // TODO: abstract out formatters better
                this.pf_cls = s.stub(pf, "ProgressFormatter", function(ee) {
                    this.emit = s.stub(ee, "emit");
                }.bind(this));
            });
            this.context("no example groups", function() {
                this.before(function() {
                    this.exit = this.sinon.stub(process, "exit");
                });
                this.example("should fire suite events", function() {
                    this.nodespec.exec();

                    this.sinon.assert.calledTwice(this.emit);
                    var c1 = this.emit.getCall(0);
                    this.assert.ok(c1.calledWith("suiteStart"));
                    var c2 = this.emit.getCall(1);
                    this.assert.ok(c2.calledWith("suiteComplete"));
                });
                this.example("should exit process with code", function() {
                    this.result.exit_code = 0;

                    this.nodespec.exec();

                    this.sinon.assert.calledOnce(this.exit);
                    this.sinon.assert.calledWith(this.exit, 0);
                });
            });
            this.context("with example groups", function() {
                this.before(function() {
                    this.g1 = new Object;
                    this.r1 = new Object;
                    this.g1.exec = this.sinon.stub();
                    this.g1.exec.yields(null, this.r1);
                    this.groups.push(this.g1);

                    this.g2 = new Object;
                    this.r2 = new Object;
                    this.g2.exec = this.sinon.stub();
                    this.g2.exec.yields(null, this.r2);
                    this.groups.push(this.g2);

                    this.result.add = this.sinon.stub();
                    this.result.exit_code = 0;
                });
                this.example("should exec each example group", function(test) {
                    test.expect(4);
                    test.sinon.stub(process, "exit", function(code) {
                        var s = test.sinon;

                        test.assert.equal(code, 0);
                        s.assert.calledOnce(test.g1.exec);
                        s.assert.calledOnce(test.g2.exec);
                        s.assert.callOrder(test.g1.exec, test.g2.exec);

                        test.done();
                    });
                    test.nodespec.exec();
                });
                this.example("should add up all the results", function(test) {
                    test.expect(4);
                    test.sinon.stub(process, "exit", function(code) {
                        var s = test.sinon;

                        test.assert.equal(code, 0);
                        s.assert.calledTwice(test.result.add);
                        var c1 = test.result.add.getCall(0);
                        var c2 = test.result.add.getCall(1);

                        test.assert.ok(c1.calledWith(test.r1));
                        test.assert.ok(c2.calledWith(test.r2));

                        test.done();
                    });
                    test.nodespec.exec();
                });
                this.example("should fire suite events", function(test) {
                    test.expect(7);
                    test.sinon.stub(process, "exit", function(code) {
                        var s = test.sinon;

                        test.assert.equal(code, 0);
                        s.assert.calledTwice(test.emit);
                        var c1 = test.emit.getCall(0);
                        var c2 = test.emit.getCall(1);

                        test.assert.ok(c1.calledWith("suiteStart"));
                        test.assert.ok(c2.calledWith("suiteComplete"));

                        // Bit fiddly,
                        // sinon.assert.callOrder only uses first call
                        // emit(start), g1.exec, g2.exec, emit(complete)
                        var o1 = test.emit.callIds[0];
                        var o2 = test.g1.exec.callIds[0];
                        var o3 = test.g2.exec.callIds[0];
                        var o4 = test.emit.callIds[1];
                        test.assert.ok(o1 < o2);
                        test.assert.ok(o2 < o3);
                        test.assert.ok(o3 < o4);

                        test.done();
                    });
                    test.nodespec.exec();
                });
            });
        });
    });
});
nodespec.exec();
