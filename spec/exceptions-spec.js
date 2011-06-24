var nodespec = require('./common');

var exceptions = require("../lib/exceptions");

nodespec.describe("Exceptions", function() {
    this.describe("Pending", function() {
        this.subject(function() {
            return new exceptions.Pending("for a reason");
        })
        this.example("should be an instance of error", function() {
            this.assert.ok(this.subject instanceof Error);
        });
        this.example("should have message", function() {
            this.assert.equal(this.subject.message, "for a reason");
        });
        this.example("should have tidy toString", function() {
            this.assert.equal(this.subject.toString(),
                              "Pending: for a reason");
        });
        this.example("should have a stack trace", function() {
            this.assert.ok(this.subject.stack);
            this.assert.ok(
                this.subject.stack.indexOf('exceptions-spec.js:8') !== -1
            );
        })
    });
});
