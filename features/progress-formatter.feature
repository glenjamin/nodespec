Feature: Progress formatter
    As a: software developer
    I want to: See short formatted results of a test suite
    So that: I can interpret the results of running the suite

Scenario: Passing tests only
    Given a file named "basic-spec.js" with:
    """
    var nodespec = require('nodespec');
    nodespec.describe("Dummy Tests", function() {
        this.example("Test 1", function() { this.done(); });
        this.example("Test 2", function() { this.done(); });
        this.example("Test 3", function() { this.done(); });
        this.example("Test 4", function() { this.done(); });
    });
    nodespec.exec();
    """
    When I run `node basic-spec.js -f progress`
    Then the exit status should be 0
    And the output should contain exactly:
    """
    ....
    4 specs (4 passed)
    """
