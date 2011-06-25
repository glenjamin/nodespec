var nodespec = require('./common');

var eg = require('../lib/example_group');

nodespec.describe("Nodespec", function() {
    this.describe("sandboxing nodespecs", function() {
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
            });
            this.example("factory for ExampleGroup", function() {
                var group = this.nodespec.describe("a set of tests",
                                                   this.definition);

                this.sinon.assert.calledOnce(this.eg_cls);
                var call = this.eg_cls.getCall(0);

                // Called as constructor
                this.assert.ok(call.calledOn(group));
                // Arg 1 = description
                this.assert.equal(call.args[0], "a set of tests");
                // Arg 2 = options object
                this.assert.equal(typeof call.args[1], 'object');
                // options.parent is nodespec
                this.assert.strictEqual(call.args[1].parent, this.nodespec);
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
                this.assert.strictEqual(options.parent, this.nodespec);

            });
            this.example("appends new instance to collection", function() {
                var group = this.nodespec.describe("a set of tests",
                                                   this.definition);
                this.assert.strictEqual(this.nodespec.example_groups.length, 1);
                this.assert.strictEqual(this.nodespec.example_groups[0], group);
            })
        });
    });
});
nodespec.exec();
