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

Scenario: Some failing tests
    Given a file named "basic-spec.js" with:
    """
    var nodespec = require('nodespec');
    nodespec.describe("Dummy Tests", function() {
        this.example("Test 1", function() { this.done(); });
        this.example("Test 2", function() {
            this.assert.ok(false);
            this.done();
        });
        this.example("Test 3", function() {
            this.assert.strictEqual('1', 1);
            this.done();
        });
        this.example("Test 4", function() { this.done(); });
        this.example("Test 5", function() {
            this.expect(1);
            this.done();
        });
        this.example("Test 6", function() {
            var msg = "But with a custom message";
            this.assert.ok(false, msg);
            this.done();
        });
    });
    nodespec.exec();
    """
    When I run `node basic-spec.js -f progress`
    Then the exit status should be 1
    And the output should contain ".FF.FF"
    And the output should contain:
    """
    Failures:

      1) Dummy Tests Test 2
         // ./basic-spec.js:5
         this.assert.ok(false);
           expected: true
                got: false

      2) Dummy Tests Test 3
         // ./basic-spec.js:9
         this.assert.strictEqual('1', 1);
           expected: 1
                got: '1'

      3) Dummy Tests Test 5
         // ./basic-spec.js:13
         <thrown from nodespec>
           Expected 1 assertions but got 0

      4) Dummy Tests Test 6
         // ./basic-spec.js:19
         this.assert.ok(false, msg);
           But with a custom message
    """
    And the output should contain "6 specs (2 passed, 4 failed)"
