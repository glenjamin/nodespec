Feature: Halting
    As a: software developer
    I want to: Stop test suites when a problem arises
    So that: I can focus on failures as they arise

Scenario: --halt
    Given a file named "basic-spec.js" with:
    """
    var nodespec = require('nodespec')
    nodespec.describe("Some tests", function() {
        this.example("Failing", function() {
            this.assert.equal(2 + 2, 5);
        });
        this.example("Passing", function() {
            this.assert.equal(1 + 1, 2);
        });
    });
    nodespec.exec();
    """
    When I run nodespec with "basic-spec.js --halt"
    Then the exit status should be 1
    And the output should contain "1 spec"
    And the output should contain "1 failed"

Scenario: --halt with nested groups
    Given a file named "basic-spec.js" with:
    """
    var nodespec = require('nodespec')
    nodespec.describe("Some tests", function() {
        this.describe("subset 1", function() {
            this.example("Failing", function() {
                this.assert.equal(2 + 2, 5);
            });
        })
        this.describe("subset 2", function() {
            this.example("Passing", function() {
                this.assert.equal(1 + 1, 2);
            });
        })
    });
    nodespec.exec();
    """
    When I run nodespec with "basic-spec.js --halt"
    Then the exit status should be 1
    And the output should contain "1 spec"
    And the output should contain "1 failed"
