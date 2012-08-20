Feature: Code coverage
    As a: software developer
    I want to: Understand code coverage provided by tests
    So that: I can identify areas without sufficient tests

Scenario: Text-based coverage report
    Given a file named "basic.js" with:
    """
    exports.a = function(bool) {
        if (bool) {
            return 1;
        } else {
            return 2;
        }
    }
    """
    And a file named "basic-spec.js" with:
    """
    var nodespec = require('nodespec');
    var m = require('./basic');
    nodespec.describe("basic.a", function(it) {
        it("should return 1 when true", function() {
            this.assert.equal(m.a(true), 1);
        });
    });
    nodespec.exec();
    """
    When I run nodespec with "basic-spec.js --cov 'basic.js'"
    Then the exit status should be 0
    And the output should contain "1 passed"
    And the file "./coverage/basic.js.diff" should contain exactly:
    """
    --- Uncovered
    +++ Covered
    +exports.a = function(bool) {
         if (bool) {
    +        return 1;
         } else {
    -        return 2;
         }
     }

    """
