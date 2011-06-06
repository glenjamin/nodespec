Feature: Before and After Hooks
    As a: software developer
    I want to: Specify code blocks to run before or after tests
    So that: I can set-up and tear-down state for tests


Scenario: Setting up with before, not async
    Given a file named "basic-spec.js" with:
    """
    var nodespec = require('nodespec');
    nodespec.describe("Hook behaviour", function() {
        this.before(function() {
            this.variable = 1;
        });
        this.example("Variable is shared with hook", function() {
            this.assert.strictEqual(this.variable, 1);
            this.variable = 2;
            this.done();
        });
        this.example("And hook is run each time", function() {
            this.assert.strictEqual(this.variable, 1);
            this.done();
        });
    });
    nodespec.exec();
    """
    When I run `node basic-spec.js`
    Then the exit status should be 0
    And the output should contain "2 passed"


Scenario: Tearing down with after, not async
    Given a file named "basic-spec.js" with:
    """
    var nodespec = require('nodespec');
    var outside_context = 1;
    nodespec.describe("Hook behaviour", function() {
        this.after(function() {
            outside_context = 2;
        });
        this.example("After hasn't been run", function() {
            this.assert.strictEqual(outside_context, 1);
            this.done();
        });
        this.example("But now it has", function() {
            this.assert.strictEqual(outside_context, 2);
            outside_context = 3;
            this.done();
        });
        this.example("And again after each test", function() {
            this.assert.strictEqual(outside_context, 2);
            this.done();
        });
    });
    nodespec.exec();
    """
    When I run `node basic-spec.js`
    Then the exit status should be 0
    And the output should contain "3 passed"

Scenario: Context is reset for each test
    Given a file named "basic-spec.js" with:
    """
    var nodespec = require('nodespec');
    nodespec.describe("Hook behaviour", function() {
        this.before(function() {
            if (!this.mutable)
                this.mutable = [];
            this.mutable.push(1);
        });
        this.after(function() {
            this.mutable.push(3);
        });
        this.example("Clean first time around", function() {
            this.mutable.push(2);
            this.assert.equal(this.mutable.length, 2);
            this.assert.equal(this.mutable[0], 1);
            this.assert.equal(this.mutable[1], 2);
            this.done();
        });
        this.example("And fresh the second time", function() {
            this.mutable.push(2);
            this.assert.equal(this.mutable.length, 2);
            this.assert.equal(this.mutable[0], 1);
            this.assert.equal(this.mutable[1], 2);
            this.done();
        });
    });
    nodespec.exec();
    """
    When I run `node basic-spec.js`
    Then the exit status should be 0
    And the output should contain "2 passed"
