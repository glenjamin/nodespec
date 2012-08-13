Feature: Documentation formatter
    As a: software developer
    I want to: See the names of specs when running a test suite
    So that: I can describe behaviour and produce documentation

Scenario: Passing tests only
    Given a file named "basic-spec.js" with:
    """
    var nodespec = require('nodespec');
    nodespec.describe("Dummy Tests", function() {
        this.example("Test 1", function() { this.assert.ok(true); });
        this.example("Test 2", function() { this.assert.ok(true); });
        this.example("Test 3", function() { this.assert.ok(true); });
        this.example("Test 4", function() { this.assert.ok(true); });
    });
    nodespec.exec();
    """
    When I run `node basic-spec.js -f doc`
    Then the exit status should be 0
    And the output should contain:
    """
    Dummy Tests
      Test 1
      Test 2
      Test 3
      Test 4

    4 specs (4 passed)
    """

Scenario: Some failing tests
    Given a file named "basic-spec.js" with:
    """
    var nodespec = require('nodespec');
    nodespec.describe("Dummy Tests", function() {
        this.example("Test 1", function() { this.assert.ok(true); });
        this.example("Test 2", function() {
            this.assert.ok(false);
        });
        this.example("Test 3", function() {
            this.assert.strictEqual('1', 1);
        });
        this.example("Test 4", function() { this.assert.ok(true); });
        this.example("Test 5", function() {
            this.expect(2);
            this.assert.ok(true);
        });
        this.example("Test 6", function() {
            var msg = "But with a custom message";
            this.assert.ok(false, msg);
        });
    });
    nodespec.exec();
    """
    When I run `node basic-spec.js -f doc`
    Then the exit status should be 1
    And the output should contain:
    """
    Dummy Tests
      Test 1
      FAILED: Test 2
      FAILED: Test 3
      Test 4
      FAILED: Test 5
      FAILED: Test 6
    """
    And the output should contain:
    """
    Failures:

      1) Dummy Tests Test 2
         // ./basic-spec.js:5
         this.assert.ok(false);
           expected: true
                got: false

      2) Dummy Tests Test 3
         // ./basic-spec.js:8
         this.assert.strictEqual('1', 1);
           expected: 1
                got: '1'

      3) Dummy Tests Test 5
         // ./basic-spec.js:11
           Expected 2 assertions but got 1

      4) Dummy Tests Test 6
         // ./basic-spec.js:17
         this.assert.ok(false, msg);
           But with a custom message
    """
    And the output should contain "6 specs (2 passed, 4 failed)"

Scenario: Some pending tests
    Given a file named "basic-spec.js" with:
    """
    var nodespec = require('nodespec');
    nodespec.describe("Dummy Tests", function() {
        this.example("Test 1", function() { this.assert.ok(true); });
        this.example("Test 2", function() { this.assert.ok(true); });
        this.example("Test 3");
        this.example("Test 4", function() {
            this.pending("For this reason");
        });
    });
    nodespec.exec();
    """
    When I run `node basic-spec.js -f doc`
    Then the exit status should be 0
    And the output should contain:
    """
    Dummy Tests
      Test 1
      Test 2
      PENDING: Test 3
      PENDING: Test 4
    """
    And the output should contain:
    """
    Pending:

      1) Dummy Tests Test 3
         // ./basic-spec.js:5
           <unimplemented>

      2) Dummy Tests Test 4
         // ./basic-spec.js:7
           For this reason
    """
    And the output should contain "4 specs (2 passed, 2 pending)"

Scenario: Some errored tests
    Given a file named "lib.js" with:
    """
    exports.fail_async = function(callback) {
        callback(new CustomError("failing function"));
    }
    require('util').inherits(CustomError, Error);
    function CustomError(msg){
        this.name = 'CustomError';
        this.message = msg;
        Error.captureStackTrace(this, CustomError);
    }
    """
    Given a file named "basic-spec.js" with:
    """
    var nodespec = require('nodespec');
    var lib = require('./lib');
    nodespec.describe("Dummy Tests", function() {
        this.example("Test 1", function() {
            a + b
        });
        this.example("Test 2", function() {
            this.assert.ok(true);
        });
        this.example("Test 3", function(test) {
            lib.fail_async(test.done);
        });
    });
    nodespec.exec();
    """
    When I run `node basic-spec.js -f doc`
    Then the exit status should be 2
    And the output should contain:
    """
    Dummy Tests
      ERROR: Test 1
      Test 2
      ERROR: Test 3
    """
    And the output should contain:
    """
    Errors:

      1) Dummy Tests Test 1
         // ./basic-spec.js:5
         a + b
         ReferenceError: a is not defined
           at Context.<anonymous> (./basic-spec.js:5:9)

      2) Dummy Tests Test 3
         // ./basic-spec.js:11
         lib.fail_async(test.done);
         CustomError: failing function
           at Object.exports.fail_async (./lib.js:2:14)
           at ./basic-spec.js:11:13
    """
    And the output should contain "3 specs (1 passed, 2 errored)"

Scenario: Nested describes and contexts
    Given a file named "basic-spec.js" with:
    """
    var nodespec = require('nodespec');
    var spec = function() { this.assert.ok(true); };
    nodespec.describe("Module", function() {
      this.example("1.1", spec);
      this.describe("Section 2", function(it) {
        it("2.1", spec);
        it("2.2", spec);
      })
      this.context("Context 3", function() {
        this.describe("Section 3.1", function(it) {
          it("3.1.1", spec);
          it("3.1.2", spec);
        })
        this.describe("Section 3.2", function(it) {
          it("3.2.1", spec);
          it("3.2.2", spec);
        })
      })
    });
    nodespec.exec();
    """
    When I run `node basic-spec.js -f doc`
    Then the exit status should be 0
    And the output should contain:
    """
    Module
      1.1
      Section 2
        2.1
        2.2
      Context 3
        Section 3.1
          3.1.1
          3.1.2
        Section 3.2
          3.2.1
          3.2.2
    """

@slow
Scenario: Test timing is handled by the formatter
    # This test implicitly asserts that the framework doens't add a whole second
    Given a file named "basic-spec.js" with:
    """
    var nodespec = require('nodespec');
    nodespec.describe("Dummy Tests", function() {
        this.example("3 second test", function(test) {
            test.assert.ok(true);
            setTimeout(test.done, 3000);
        });
    });
    nodespec.exec();
    """
    When I run `node basic-spec.js -f doc`
    Then the exit status should be 0
    And the output should contain "1 spec (1 passed)"
    And the output should match /Time Taken: 3\.\d+s/

@ansi
Scenario: Everything, including colour
    Given a file named "basic-spec.js" with:
    """
    var nodespec = require('nodespec');
    nodespec.describe("Progress Formatter Output", function() {
        this.example("Passing Test", function() { this.assert.ok(true); });
        this.example("Failing Test", function() {
            this.assert.equal(true, false);
        });
        this.example("Pending Test");
        this.example("Errored Test", function() {
            throw new Error("Whoops!");
        });
    });
    nodespec.exec();
    """
    When I run `node basic-spec.js -f doc --colour`
    Then the exit status should be 2
    And the output should contain:
    """
    Progress Formatter Output
    [32m  Passing Test[39m
    [31m  FAILED: Failing Test[39m
    [33m  PENDING: Pending Test[39m
    [36m  ERROR: Errored Test[39m
    """
    And the output should contain:
    """
    [33mPending:[39m

    [33m  1) Progress Formatter Output Pending Test[39m
    [33m     // ./basic-spec.js:7[39m
    [33m       <unimplemented>[39m

    [31mFailures:[39m

    [31m  1) Progress Formatter Output Failing Test[39m
    [31m     // ./basic-spec.js:5[39m
    [31m     this.assert.equal(true, false);[39m
    [31m       expected: false[39m
    [31m            got: true[39m

    [36mErrors:[39m

    [36m  1) Progress Formatter Output Errored Test[39m
    [36m     // ./basic-spec.js:9[39m
    [36m     throw new Error("Whoops!");[39m
    [36m     Error: Whoops![39m
    [36m       at Context.<anonymous> (./basic-spec.js:9:15)[39m

    4 specs ([32m1 passed[39m, [33m1 pending[39m, [31m1 failed[39m, [36m1 errored[39m)
    """
