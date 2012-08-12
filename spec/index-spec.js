var nodespec = require('./common');

var eg = require('../lib/example-group');
var hk = require('../lib/hook');
var r  = require('../lib/result');

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
    this.subject("nodespec", function() {
      return nodespec("fresh nodespec to test");
    });
    this.after(function() {
      this.nodespec.abandon();
    });
    this.describe("default values", function() {
      this.should("have DEFAULT_HOOK_TIMEOUT = 2", function() {
        this.assert.equal(this.nodespec.DEFAULT_HOOK_TIMEOUT, 2)
      });
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
      this.subject("definition", function() { return this.sinon.spy() });
      this.subject("nodespec", function() {
        return nodespec("fresh nodespec to test");
      });
      this.example("proxy to root ExampleGroup", function() {
        var group = this.nodespec.describe("a set of tests", this.definition);

        this.assert.ok(group instanceof eg.ExampleGroup);
        this.assert.equal(group.full_description, "a set of tests");
        this.assert.strictEqual(group.nodespec, this.nodespec);

        this.sinon.assert.calledOnce(this.definition);
      });
      this.example("can pass explicit options", function() {
        var group = this.nodespec.describe(
          "a set of tests", {special_setting: 1}, this.definition);

        this.assert.ok(group instanceof eg.ExampleGroup);
        this.assert.equal(group.full_description, "a set of tests");
        this.assert.strictEqual(group.nodespec, this.nodespec);
        this.assert.equal(group.options.special_setting, 1);
        this.sinon.assert.calledOnce(this.definition);
      });
      this.example("appends new instance to collection", function() {
        var group = this.nodespec.describe("a set of tests", this.definition);

        this.assert.strictEqual(this.nodespec.root.children.length, 1);
        this.assert.strictEqual(this.nodespec.root.children[0], group);
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
      this.subject("nodespec", function() {
        var ns = nodespec("fresh nodespec to test");
        this.sinon.spy(ns.root, 'before');
        this.sinon.spy(ns.root, 'after');
        return ns;
      });
      this.subject("block", function(){ return function(){}; });

      this.example("before delegates to root group", function() {
        this.nodespec.before(this.block);
        this.sinon.assert.calledOnce(this.nodespec.root.before);
        this.sinon.assert.calledWith(this.nodespec.root.before, this.block);
      });
      this.example("after delegates to root group", function() {
        this.nodespec.after(this.block);
        this.sinon.assert.calledOnce(this.nodespec.root.after);
        this.sinon.assert.calledWith(this.nodespec.root.after, this.block);
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
    this.describe("exec", function(it) {
      this.subject("nodespec", function() {
        var ns = nodespec("fresh nodespec to test");
        this.sinon.stub(ns, "root", this.root);
        this.sinon.stub(ns, "formatters", [this.formatter]);
        this.exit = this.sinon.stub(process, "exit");
        return ns;
      });
      this.subject("root", function() {
        return { exec: this.sinon.stub().yields(null, this.result) };
      });
      this.subject("result", function() { return new Object });
      this.subject("formatter", function() {
        var test = this;
        return { init: function(conf, emitter) {
          test.emit = test.sinon.stub(emitter, "emit");
        }}
      });
      this.example("should exec root group", function() {
        this.nodespec.exec();
        this.sinon.assert.calledOnce(this.root.exec);
      });
      it("should fire suite events", function() {
        this.nodespec.exec();

        this.sinon.assert.calledTwice(this.emit);
        var c1 = this.emit.getCall(0);
        this.assert.ok(c1.calledWith("suiteStart"));
        var c2 = this.emit.getCall(1);
        this.assert.ok(c2.calledWith("suiteComplete", this.result));
      });
      it("should exit process with result code", function() {
        this.result.exit_code = 17;

        this.nodespec.exec();

        this.sinon.assert.calledOnce(this.exit);
        this.sinon.assert.calledWith(this.exit, 17);
      });
    });
  });
});
nodespec.exec();
