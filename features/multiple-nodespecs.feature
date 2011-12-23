Feature: Multiple nodespec objects in play
    As a: software developer
    I want to: Have more than one nodespec module in play
    So that: I can test nodespec without it stomping over itself

Scenario: require('nodespec') equivalent to require('nodespec')('default')
    Given a file named "basic-spec.js" with:
    """
    var nodespec1 = require('nodespec');
    var nodespec2 = require('nodespec')('default');
    nodespec1.describe("Normal", function() {
        this.example("with one test", function() { this.assert.ok(true); });
    });
    nodespec2.describe("explicitly default", function() {
        this.example("with one test", function() { this.assert.ok(true); });
    });
    nodespec1.exec();
    """
    When I run `node basic-spec.js`
    Then the exit status should be 0
    And the output should contain "2 passed"

Scenario: Calling nodespec as a function returns a new named copy
    Given a file named "basic-spec.js" with:
    """
    var nodespec1 = require('nodespec')('something');
    var nodespec2 = require('nodespec')('else');
    nodespec1.describe("Something", function() {
        this.example("with one test", function() { this.assert.ok(true); });
    });
    nodespec2.describe("Else", function() {
        this.example("with one test", function() { this.assert.ok(true); });
    });
    nodespec1.exec();
    """
    When I run `node basic-spec.js`
    Then the exit status should be 0
    And the output should contain "1 passed"

Scenario: Assert can be set differently
    Given a file named "basic-spec.js" with:
    """
    var assert = require('assert');
    var nodespec1 = require('nodespec')('something');
    var nodespec2 = require('nodespec')('else');
    nodespec1.assert = 1;
    nodespec2.assert = 2;
    nodespec1.describe("Something", function() {
        this.example("has it's own assert", function() {
            assert.equal(this.assert, 1);
        });
    });
    nodespec2.describe("Else", function() {
        this.example("has a different one", function() {
            assert.equal(this.assert, 2);
        });
    });
    nodespec1.exec();
    """
    When I run `node basic-spec.js`
    Then the exit status should be 0
    And the output should contain "1 passed"
