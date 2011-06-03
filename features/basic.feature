Feature: Basic functionality
    As a: software developer
    I want to: Describe my unit tests
    So that: I can verify software behaviour

@announce
Scenario: Single passing synchronous spec
    Given a file named "basic-spec.js" with:
    """
    var nodespec = require('nodespec');
    nodespec.describe("Addition", function() {
        this.example("1 + 1 = 2", function() {
            this.assert.equal(1 + 1, 2);
            // Return non-undefined to indicate not async
            return true;
        });
    });
    """
    When I run `node basic-spec.js`
    Then the exit status should be 0


Scenario: Single failing synchronous spec
    Given a file named "basic-spec.js" with:
    """
    var nodespec = require('nodespec');
    nodespec.describe("Addition", function() {
        this.example("2 + 2 = 5", function() {
            this.assert.equal(2 + 2, 5);
            // Return non-undefined to indicate not async
            return true;
        });
    });
    """
    When I run `node basic-spec.js`
    Then the exit status should be 1
