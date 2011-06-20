Feature: Subjects
    As a: software developer
    I want to: Use a shorthand for assigning values in contexts
    So that: I can cleanly set up to subjects of assertions

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
            this.done();
        });
        this.example("And is reset for each test", function() {
            this.assert.equal(this.subject.length, 0);
            this.done();
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
            this.done();
        });
    });
    nodespec.exec();
    """
    When I run `node basic-spec.js`
    Then the exit status should be 0
    And the output should contain "1 passed"
