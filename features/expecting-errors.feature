Feature: Expecting errors
    As a: software developer
    I want to: cleanly assert on expected errors
    So that: I can test error conditions of my code

Scenario: Synchronous unit under test errors
    Given a file named "basic-spec.js" with:
    """
    var nodespec = require('nodespec');
    nodespec.describe("Expecting an error", function() {
        this.should("fire my registered callback", function() {
            this.expect(1);
            this.onError(function(ex) {
                this.assert.equal(ex.message, 'fail');
            });
            throw new Error('fail');
        });
    });
    nodespec.exec();
    """
    When I run `node basic-spec.js`
    Then the exit status should be 0
    And the output should contain "1 passed"

Scenario: Asynchronous unit under test errors
    Given a file named "basic-spec.js" with:
    """
    var nodespec = require('nodespec');
    nodespec.describe("Expecting an error", function() {
        this.should("fire my registered callback", function(test) {
            test.expect(1);
            test.onError(function(ex) {
                this.assert.equal(ex.message, 'fail');
                // note no test.done()
            });
            process.nextTick(function() {
                throw new Error('fail');
            });
        });
    });
    nodespec.exec();
    """
    When I run `node basic-spec.js`
    Then the exit status should be 0
    And the output should contain "1 passed"

Scenario: onError is not called after assertion errors
    Given a file named "basic-spec.js" with:
    """
    var nodespec = require('nodespec');
    nodespec.describe("Expecting an error", function() {
        this.should("not fire on assertion failure", function() {
            this.expect(1);
            this.onError(function(ex) {
                console.log('never run');
            });
            this.assert.ok(false);
        });
    });
    nodespec.exec();
    """
    When I run `node basic-spec.js`
    Then the exit status should be 1
    And the output should contain "1 failed"
    And the output should not contain "never run"
