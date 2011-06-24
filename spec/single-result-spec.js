var nodespec = require('./common');

var result = require("../lib/result");
var SingleResult = result.SingleResult;

nodespec.describe("Single Result", function() {
    this.describe("Factories", function() {
        var describe_factory = factory_behaviour.bind(this);

        describe_factory("PASS");
        describe_factory("PEND");
        describe_factory("FAIL");
        describe_factory("ERROR");
    });
});
nodespec.exec();

function factory_behaviour(type) {
    this.describe(type, function() {
        this.subject(function() {
            return SingleResult[type];
        });
        this.example("should be an instance of SingleResult", function() {
            this.assert.ok(this.subject instanceof SingleResult);
        });
        var down = type.toLowerCase();
        this.example("should have type '"+down+"'", function() {
            this.assert.strictEqual(this.subject.type, down);
        });
        this.example("should be a fresh instance each call", function() {
            this.assert.notStrictEqual(this.subject,
                                       SingleResult[type]);
        });
        this.describe("error property", function() {
            this.subject("error", function() {
                return new Error("Some form of exception");
            });
            this.example("null by default", function() {
                this.assert.equal(this.subject.error, null);
            });
            this.example("Can be set to an error", function() {
                this.subject.error = this.error;
                this.assert.strictEqual(this.subject.error,
                                        this.error);
            });
        });
    });
}
