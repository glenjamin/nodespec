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
                var result = eval(expression)
                callback(null, result);
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
