Feature: Expectation counts
    As a: software developer
    I want to: Ensure the correct number of assertions run
    So that: I can test async code reliably


Scenario: Correct number of assertions
    Given a file named "basic-spec.js" with:
    """
    var nodespec = require('nodespec');
    nodespec.describe("Expectation counts", function() {
        this.example("2 assertions expected and 2 called", function() {
            this.expect(2);
            this.assert.strictEqual(1 + 1, 2);
            this.assert.strictEqual(2 + 2, 4);
        });
    });
    nodespec.exec();
    """
    When I run `node basic-spec.js`
    Then the exit status should be 0
    And the output should contain "1 passed"

Scenario: Not enough assertions
    Given a file named "basic-spec.js" with:
    """
    var nodespec = require('nodespec');
    nodespec.describe("Expectation counts", function() {
        this.example("2 assertions expected and 1 called", function() {
            this.expect(2);
            this.assert.strictEqual(1 + 1, 2);
        });
    });
    nodespec.exec();
    """
    When I run `node basic-spec.js`
    Then the exit status should be 1
    And the output should contain "1 failed"

Scenario: Too many assertions
    Given a file named "basic-spec.js" with:
    """
    var nodespec = require('nodespec');
    nodespec.describe("Expectation counts", function() {
        this.example("1 assertion expected and 2 called", function() {
            this.expect(1);
            this.assert.strictEqual(1 + 1, 2);
            this.assert.strictEqual(2 + 2, 4);
        });
    });
    nodespec.exec();
    """
    When I run `node basic-spec.js`
    Then the exit status should be 1
    And the output should contain "1 failed"
