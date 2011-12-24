Feature: Basic asynchronous testing functionality
    As a: software developer
    I want to: Describe and run simple asynchronous unit tests
    So that: I can verify software behaviour

Background:
    Given a file named "calc.js" with:
    """
    exports.calculate =
    function calculate(expression, callback) {
        process.nextTick(function() {
            try {
                callback(null, eval(expression));
            } catch (ex) {
                callback(ex);
            }
        });
    }
    """


Scenario: Single passing spec
    Given a file named "basic-spec.js" with:
    """
    var nodespec = require('nodespec');
    var calc = require('./calc');
    nodespec.describe("Addition", function() {
        this.example("1 + 1 = 2", function(test) {
            calc.calculate("1 + 1", function(err, result) {
                test.assert.strictEqual(result, 2);
                test.done();
            });
        });
    });
    nodespec.exec();
    """
    When I run `node basic-spec.js`
    Then the exit status should be 0
    And the output should contain "1 passed"


Scenario: Single failing spec
    Given a file named "basic-spec.js" with:
    """
    var nodespec = require('nodespec');
    var calc = require('./calc');
    nodespec.describe("Addition", function() {
        this.example("2 + 2 = 5", function(test) {
            calc.calculate("2 + 2", function(err, result) {
                test.assert.strictEqual(result, 5);
                test.done(err);
            });
        });
    });
    nodespec.exec();
    """
    When I run `node basic-spec.js`
    Then the exit status should be 1
    And the output should contain "1 failed"

Scenario: Single pending spec
    Given a file named "basic-spec.js" with:
    """
    var nodespec = require('nodespec');
    var calc = require('./calc');
    nodespec.describe("Addition", function() {
        this.example("2 + ? = 5", function(test) {
            calc.calculate("2 + 3", function(err, result) {
                test.pending("For some reason");
                test.assert.strictEqual(result, 5);
                test.done(err);
            });
        });
    });
    nodespec.exec();
    """
    When I run `node basic-spec.js`
    Then the exit status should be 0
    And the output should contain "1 pending"


Scenario: Single erroring spec
    Given a file named "basic-spec.js" with:
    """
    var nodespec = require('nodespec');
    var calc = require('./calc');
    nodespec.describe("Addition", function() {
        this.example("2 + ? = 5", function(test) {
            calc.calculate("2 + ? = 5", function(err, result) {
                this.assert.strictEqual(result, 3);
                test.done(err);
            });
        });
    });
    nodespec.exec();
    """
    When I run `node basic-spec.js`
    Then the exit status should be 2
    And the output should contain "1 errored"

Scenario: Multiple specs with various results
    Given a file named "basic-spec.js" with:
    """
    var nodespec = require('nodespec');
    var calc = require('./calc');
    nodespec.describe("Addition", function() {
        this.example("1 + 1 = 2", function(test) {
            calc.calculate("1 + 1", function(err, result) {
                test.assert.strictEqual(result, 2);
                test.done();
            });
        });
        this.example("2 + 2 = 5", function(test) {
            calc.calculate("2 + 2", function(err, result) {
                test.assert.strictEqual(result, 5);
                test.done(err);
            });
        });
        this.example("2 + ? = 5", function(test) {
            calc.calculate("2 + 3", function(err, result) {
                test.pending("For some reason");
                test.assert.strictEqual(result, 5);
                test.done(err);
            });
        });
        this.example("2 + ? = 5", function(test) {
            calc.calculate("2 + ? = 5", function(err, result) {
                this.assert.strictEqual(result, 3);
                test.done(err);
            });
        });
    });
    nodespec.exec();
    """
    When I run `node basic-spec.js`
    Then the exit status should be 2
    And the output should contain "4 specs"
    And the output should contain "1 passed"
    And the output should contain "1 failed"
    And the output should contain "1 pending"
    And the output should contain "1 errored"

@slow
Scenario: Done is never called
    Given a file named "basic-spec.js" with:
    """
    var nodespec = require('nodespec');
    var calc = require('./calc');
    nodespec.describe("Addition", function() {
        this.example("2 + 2 = 5", function(test) {
            calc.calculate("2 + 2", function(err, result) {

            });
        });
    });
    nodespec.exec();
    """
    When I run `node basic-spec.js`
    Then the exit status should be 2
    And the output should contain "1 errored"

@slow
Scenario: Done is called before we stop waiting
    Given a file named "basic-spec.js" with:
    """
    var nodespec = require('nodespec');
    var calc = require('./calc');
    nodespec.describe("Addition", function() {
        this.example("2 + 2 = 5", function(test) {
            calc.calculate("2 + 2", function(err, result) {
                setTimeout(test.done, 1500); // 1.5 seconds
            });
        });
    });
    nodespec.exec();
    """
    When I run `node basic-spec.js`
    Then the exit status should be 0
    And the output should contain "1 passed"

@slow
Scenario: Done is called after default timeout
    Given a file named "basic-spec.js" with:
    """
    var nodespec = require('nodespec');
    var calc = require('./calc');
    nodespec.describe("Addition", function() {
        this.example("2 + 2 = 5", function(test) {
            calc.calculate("2 + 2", function(err, result) {
                setTimeout(test.done, 5500); // 5.5 seconds
            });
        });
    });
    nodespec.exec();
    """
    When I run `node basic-spec.js`
    Then the exit status should be 2
    And the output should contain "1 errored"

Scenario: Done is never called (short timeout)
    Given a file named "basic-spec.js" with:
    """
    var nodespec = require('nodespec');
    var calc = require('./calc');
    nodespec.describe("Addition", function() {
        this.example("2 + 2 = 5", function(test) {
            calc.calculate("2 + 2", function(err, result) {

            });
        }).timeout_after(0.01);
    });
    nodespec.exec();
    """
    When I run `node basic-spec.js`
    Then the exit status should be 2
    And the output should contain "1 errored"

Scenario: Done is called too late (short timeout)
    Given a file named "basic-spec.js" with:
    """
    var nodespec = require('nodespec');
    var calc = require('./calc');
    nodespec.describe("Addition", function() {
        this.example("2 + 2 = 5", function(test) {
            calc.calculate("2 + 2", function(err, result) {
                setTimeout(test.done, 100); // 0.1 seconds
            });
        }).timeout_after(0.01);
    });
    nodespec.exec();
    """
    When I run `node basic-spec.js`
    Then the exit status should be 2
    And the output should contain "1 errored"
