Feature: Basic synchronous testing functionality
    As a: software developer
    I want to: Describe and run simple synchronous unit tests
    So that: I can verify software behaviour


Scenario: Single passing spec
    Given a file named "basic-spec.js" with:
    """
    var nodespec = require('nodespec');
    nodespec.describe("Addition", function() {
        this.example("1 + 1 = 2", function() {
            this.assert.equal(1 + 1, 2);
        });
    });
    nodespec.exec();
    """
    When I run nodespec with "basic-spec.js"
    Then the exit status should be 0
    And the output should contain "1 passed"


Scenario: Single failing spec
    Given a file named "basic-spec.js" with:
    """
    var nodespec = require('nodespec');
    nodespec.describe("Addition", function() {
        this.example("2 + 2 = 5", function() {
            this.assert.equal(2 + 2, 5);
        });
    });
    nodespec.exec();
    """
    When I run nodespec with "basic-spec.js"
    Then the exit status should be 1
    And the output should contain "1 failed"

Scenario: Single pending spec stub
    Given a file named "basic-spec.js" with:
    """
    var nodespec = require('nodespec');
    nodespec.describe("Addition", function() {
        this.example("1 + 1 = 2");
    });
    nodespec.exec();
    """
    When I run nodespec with "basic-spec.js"
    Then the exit status should be 0
    And the output should contain "1 pending"

Scenario: Single pending spec
    Given a file named "basic-spec.js" with:
    """
    var nodespec = require('nodespec');
    nodespec.describe("Addition", function() {
        this.example("1 + 1 = 2", function() {
            this.pending("Reason for pend");
            this.assert.equal(1 + 1, 2);
        });
    });
    nodespec.exec();
    """
    When I run nodespec with "basic-spec.js"
    Then the exit status should be 0
    And the output should contain "1 pending"

Scenario: Single erroring spec
    Given a file named "basic-spec.js" with:
    """
    var nodespec = require('nodespec');
    nodespec.describe("Addition", function() {
        this.example("1 + 1 = 2", function() {
            a = b + c;
        });
    });
    nodespec.exec();
    """
    When I run nodespec with "basic-spec.js"
    Then the exit status should be 2
    And the output should contain "1 errored"

Scenario: Multiple specs with various results
    Given a file named "basic-spec.js" with:
    """
    var nodespec = require('nodespec');
    nodespec.describe("Addition", function() {
        this.example("1 + 1 = 2", function() {
            this.assert.equal(1 + 1, 2);
        });
        this.example("2 + 2 = 5", function() {
            this.assert.equal(2 + 2, 5);
        });
        this.example("1 + ? = 2");
        this.example("1 + 1 = 2", function() {
            a = b + c;
        });
    });
    nodespec.exec();
    """
    When I run nodespec with "basic-spec.js"
    Then the exit status should be 2
    And the output should contain "4 specs"
    And the output should contain "1 passed"
    And the output should contain "1 failed"
    And the output should contain "1 pending"
    And the output should contain "1 errored"
