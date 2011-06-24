var nodespec = require('./common');

var eg = require('../lib/example_group');

nodespec.describe("Nodespec", function() {
    this.subject("nodespec", function() {
        return nodespec("fresh nodespec to test");
    });
    this.after(function() {
        this.nodespec.abandon();
    });
    this.describe("assert", function() {
        this.example("defaults to stdlib assert module", function() {
            this.assert.strictEqual(this.nodespec.assert, require('assert'));
        });
        this.example("can be replaced with custom object", function() {
            var replacement_assert = new Object;
            this.nodespec.assert = replacement_assert;

            this.assert.strictEqual(this.nodespec.assert, replacement_assert);
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
        this.example("appends new instance to collection", function() {
            var group = this.nodespec.describe("a set of tests",
                                               this.definition);
            this.assert.strictEqual(this.nodespec.example_groups.length, 1);
            this.assert.strictEqual(this.nodespec.example_groups[0], group);
        })
    });
});
nodespec.exec();
