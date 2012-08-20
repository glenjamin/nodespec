Feature: Test definition syntax
    As a: software developer
    I want to: Have flexible test definition syntax
    So that: To improve readability of test suites

Scenario: Normal Syntax (.example)
    Given a file named "basic-spec.js" with:
    """
    var nodespec = require('nodespec');
    nodespec.describe("Arithmetic", function() {
        this.example("1 + 1 = 2", function() {
            this.assert.equal(1 + 1, 2);
        });
    });
    nodespec.exec();
    """
    When I run nodespec with "basic-spec.js"
    Then the exit status should be 0
    And the output should contain "1 passed"

Scenario: Behaviour Syntax (.should)
    Given a file named "basic-spec.js" with:
    """
    var nodespec = require('nodespec');
    nodespec.describe("Arithmetic", function() {
        this.should("add 1 and 1 to 2", function() {
            this.assert.equal(1 + 1, 2);
        });
    });
    nodespec.exec();
    """
    When I run nodespec with "basic-spec.js"
    Then the exit status should be 0
    And the output should contain "1 passed"

Scenario: Short Syntax (it)
    Given a file named "basic-spec.js" with:
    """
    var nodespec = require('nodespec');
    nodespec.describe("Arithmetic", function(it) {
        it("should add 1 and 1 to 2", function() {
            this.assert.equal(1 + 1, 2);
        });
    });
    nodespec.exec();
    """
    When I run nodespec with "basic-spec.js"
    Then the exit status should be 0
    And the output should contain "1 passed"
