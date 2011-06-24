Feature: Running multiple files
    As a: software developer
    I want to: Run multiple files at once
    So that: Separate a test suite into multiple files, then run them

Scenario: Using nodespec.require
    Given a file named "all-specs.js" with:
    """
    var nodespec = require('nodespec');
    nodespec.require("./one-spec.js");
    nodespec.require("./two-spec.js");
    nodespec.exec();
    """
    Given a file named "one-spec.js" with:
    """
    var nodespec = require('nodespec');
    nodespec.describe("One", function() {
        this.example("is one", function() {
            this.assert.equal(1, 1);
        });
    })
    nodespec.exec();
    """
    Given a file named "two-spec.js" with:
    """
    var nodespec = require('nodespec');
    nodespec.describe("Two", function() {
        this.example("is two", function() {
            this.assert.equal(2, 2);
        });
    })
    nodespec.exec();
    """
    When I run `node all-specs.js`
    Then the exit status should be 0
    And the output should contain "2 passed"
