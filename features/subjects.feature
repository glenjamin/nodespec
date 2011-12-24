Feature: Subjects
    As a: software developer
    I want to: Use a shorthand for assigning values in contexts
    So that: I can cleanly set up the subjects of assertions

Scenario: Un-named subject
    Given a file named "basic-spec.js" with:
    """
    var nodespec = require('nodespec')
    nodespec.describe("Context with subject", function() {
        this.subject(function() {
            return new Array();
        });
        this.example("Subject available in test", function() {
            this.assert.equal(this.subject.length, 0);
            this.subject.push(1);
            this.assert.equal(this.subject.length, 1);
        });
        this.example("And is reset for each test", function() {
            this.assert.equal(this.subject.length, 0);
        });
    });
    nodespec.exec();
    """
    When I run `node basic-spec.js`
    Then the exit status should be 0
    And the output should contain "2 passed"

Scenario: Named subjects
    Given a file named "basic-spec.js" with:
    """
    var nodespec = require('nodespec')
    nodespec.describe("Context with subject", function() {
        this.subject("left", function() {
            return [1, 2];
        });
        this.subject("right", function() {
            return this.left.concat([3]);
        });
        this.example("All subjects available", function() {
            this.assert.equal(this.left.length, 2);
            this.assert.equal(this.left[0], 1);
            this.assert.equal(this.right.length, 3);
            this.assert.equal(this.right[0], 1);
            this.left[0] = 2;
            this.assert.equal(this.right[0], 1);
        });
    });
    nodespec.exec();
    """
    When I run `node basic-spec.js`
    Then the exit status should be 0
    And the output should contain "1 passed"

Scenario: Calling each other and overwriting
    Given a file named "basic-spec.js" with:
    """
    var nodespec = require('nodespec')
    nodespec.describe("Context with subject", function() {
        this.subject(function() {
            return this.other;
        });
        this.subject("other", function() {
            return 1;
        });
        this.example("Subject calls another", function() {
            this.assert.equal(this.subject, 1);
        });
        this.example("Replace subject in body", function() {
            this.other = 2;
            this.assert.equal(this.subject, 2);
        });
        this.example("Replace subject after use", function() {
            // Note lazy evaluation
            this.assert.equal(this.subject, 1);
            this.assert.equal(this.other, 1);
            this.other = 2;
            this.assert.equal(this.subject, 1);
            this.assert.equal(this.other, 2);
        });
    });
    nodespec.exec();
    """
    When I run `node basic-spec.js`
    Then the exit status should be 0
    And the output should contain "3 passed"

Scenario: Nesting subjects
    Given a file named "basic-spec.js" with:
    """
    var nodespec = require('nodespec')
    nodespec.describe("Context with subject", function() {
        this.subject(function() {
            return new Error();
        });
        this.context("Subject unchanged", function() {
            this.example("message is empty", function() {
                this.assert.equal(this.subject.message, "");
            });
        });
        this.context("Subject replaced", function() {
            this.subject(function() {
                return new Error("message");
            });
            this.example("message is 'message'", function() {
                this.assert.equal(this.subject.message, "message");
            });
        });
    });
    nodespec.exec();
    """
    When I run `node basic-spec.js`
    Then the exit status should be 0
    And the output should contain "2 passed"
