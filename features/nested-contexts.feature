Feature: Nested contexts
    As a: software developer
    I want to: Nest test contexts
    So that: I can organise tests by groups, and share hooks


Scenario: Splitting tests into contexts
    Given a file named "basic-spec.js" with:
    """
    var nodespec = require('nodespec');
    nodespec.describe("Arithmetic", function() {
        this.context("Addition", function() {
            this.example("1 + 1", function(test) {
                test.assert.equal(1 + 1, 2);
                test.done();
            });
        });
        this.describe("Subtraction", function() {
            this.example("5 - 2", function(test) {
                test.assert.equal(5 - 2, 3);
                test.done();
            });
        });
    });
    nodespec.exec();
    """
    When I run `node basic-spec.js`
    Then the exit status should be 0
    And the output should contain "2 passed"

Scenario: Sharing before/after hooks with contexts
    Given a file named "basic-spec.js" with:
    """
    var nodespec = require('nodespec');
    nodespec.describe("Arithmetic", function() {
        this.before(function (hook) {
            hook.counter = 2;
            hook.done();
        });
        this.example("Counter is 2", function() {
            this.assert.equal(this.counter, 2);
            this.done();
        });
        this.context("Incremented counter", function() {
            this.before(function (hook) {
                hook.counter += 1;
                hook.done();
            });
            this.example("Counter is 3", function() {
                this.assert.equal(this.counter, 3);
                this.done();
            });
        });
        this.describe("Decrememted counter", function() {
            this.before(function (hook) {
                hook.counter -= 1;
                hook.done();
            });
            this.example("Counter is 1", function() {
                this.assert.equal(this.counter, 1);
                this.done();
            });
        });
    });
    nodespec.exec();
    """
    When I run `node basic-spec.js`
    Then the exit status should be 0
    And the output should contain "3 passed"
