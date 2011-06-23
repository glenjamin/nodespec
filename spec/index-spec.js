var nodespec = require('./common');

// This is rather awkward, since nodespec === index !

nodespec.describe("Nodespec", function() {
    this.describe("assert", function() {
        this.before(function() { return this.real_assert = nodespec.assert; });
        this.after(function() { return nodespec.assert = this.real_assert; });
        this.example("defaults to stdlib assert module", function() {
            this.assert.strictEqual(nodespec.assert, require('assert'));
            this.done();
        });
        this.example("can be replaced with custom object", function() {
            var replacement_assert = new Object;
            nodespec.assert = replacement_assert;

            var assert = require('assert');
            assert.strictEqual(nodespec.assert, replacement_assert);
            this.done();
        });
    });
});
nodespec.exec();
