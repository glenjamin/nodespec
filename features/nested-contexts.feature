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
            this.example("1 + 1", function() {
                this.assert.equal(1 + 1, 2);
            });
        });
        this.describe("Subtraction", function() {
            this.example("5 - 2", function() {
                this.assert.equal(5 - 2, 3);
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
        this.before(function () {
            this.counter = 2;
        });
        this.example("Counter is 2", function() {
            this.assert.equal(this.counter, 2);
        });
        this.context("Incremented counter", function() {
            this.before(function () {
                this.counter += 1;
            });
            this.example("Counter is 3", function() {
                this.assert.equal(this.counter, 3);
            });
        });
        this.describe("Decrememted counter", function() {
            this.before(function () {
                this.counter -= 1;
            });
            this.example("Counter is 1", function() {
                this.assert.equal(this.counter, 1);
            });
        });
    });
    nodespec.exec();
    """
    When I run `node basic-spec.js`
    Then the exit status should be 0
    And the output should contain "3 passed"
