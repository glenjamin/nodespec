var nodespec = require('./common');

var result = require("../lib/result");
var Result = result.Result,
    SingleResult = result.SingleResult;

nodespec.describe("Result", function() {
    this.describe("Constructor", function() {
        this.subject(function() { return new Result() });
        this.example("should initialise counters", function() {
            this.assert.strictEqual(this.subject.pass, 0);
            this.assert.strictEqual(this.subject.pend, 0);
            this.assert.strictEqual(this.subject.fail, 0);
            this.assert.strictEqual(this.subject.error, 0);
            this.assert.strictEqual(this.subject.total, 0);
            this.done();
        });
    });
    this.describe("add", function() {
        this.context("SingleResult", function() {
            this.subject("result", function() { return new Result(); });
            var describe_single = result_add_single_behaviour.bind(this);
            describe_single("PASS");
            describe_single("PEND");
            describe_single("FAIL");
            describe_single("ERROR");
        });
        this.context("another Result", function() {
            this.subject("result", function() {
                // Result with 1 of each
                var r = new Result();
                r.add(SingleResult.PASS);
                r.add(SingleResult.PEND);
                r.add(SingleResult.FAIL);
                r.add(SingleResult.ERROR);
                return r;
            });
            this.subject("another", function() {
                return {
                    pass: 1, pend: 2, fail: 3,
                    error: 4, total: 10
                };
            });
            this.example("should add all the counters", function() {
                this.result.add(this.another);
                this.assert.strictEqual(this.result.pass,  2);
                this.assert.strictEqual(this.result.pend,  3);
                this.assert.strictEqual(this.result.fail,  4);
                this.assert.strictEqual(this.result.error, 5);
                this.assert.strictEqual(this.result.total, 14);
                this.done();
            });
        });
    });
    this.describe("exit_code", function() {
        this.subject(function() {
            return new Result();
        });
        this.context("empty result", function() {
            this.example("should be 0", function() {
                this.assert.strictEqual(this.subject.exit_code, 0);
                this.done();
            });
        });
        this.context("with a pass", function() {
            this.before(function() {
               this.subject.add(SingleResult.PASS);
               this.done();
            });
            this.example("should be 0", function() {
                this.assert.strictEqual(this.subject.exit_code, 0);
                this.done();
            });
        });
        this.context("with a pend", function() {
            this.before(function() {
               this.subject.add(SingleResult.PEND);
               this.done();
            });
            this.example("should be 0", function() {
                this.assert.strictEqual(this.subject.exit_code, 0);
                this.done();
            });
        });
        this.context("with a fail", function() {
            this.before(function() {
               this.subject.add(SingleResult.FAIL);
               this.done();
            });
            this.example("should be 1", function() {
                this.assert.strictEqual(this.subject.exit_code, 1);
                this.done();
            });
        });
        this.context("with an error", function() {
            this.before(function() {
               this.subject.add(SingleResult.ERROR);
               this.done();
            });
            this.example("should be 2", function() {
                this.assert.strictEqual(this.subject.exit_code, 2);
                this.done();
            });
        });
    });
});
nodespec.exec();

function result_add_single_behaviour(type) {
    var down = type.toLowerCase();
    var all = ['pass', 'pend', 'fail', 'error'];
    all.splice(all.indexOf(down), 1);
    this.describe(type, function() {
        this.subject(function() {
            this.result.add(SingleResult[type]);
            return this.result;
        });
        this.example("should increment "+down, function() {
            this.assert.strictEqual(this.subject[down], 1);
            this.done();
        });
        this.example("should increment total", function() {
            this.assert.strictEqual(this.subject.total, 1);
            this.done();
        });
        this.example("should not incremement others", function() {
            this.assert.strictEqual(this.subject[all[0]], 0);
            this.assert.strictEqual(this.subject[all[1]], 0);
            this.assert.strictEqual(this.subject[all[2]], 0);
            this.done();
        });
    });
}
