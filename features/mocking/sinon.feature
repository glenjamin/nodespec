Feature: Sinon Mocking
    As a: software developer
    I want to: Mock objects with Sinon
    So that: I can test portions of code in isolation

Scenario: Using the sandbox for spies
    Given a file named "sinon-spec.js" with:
    """
    var nodespec = require("nodespec");
    nodespec.mockWith("sinon");
    nodespec.describe("Sinon sandbox", function() {
        this.describe("Spies", function() {
            this.example("pass", function() {
                var spy = this.sinon.spy();
                spy(1, 2, 3);
                this.sinon.assert.calledOnce(spy);
                this.assert.calledWith(spy, 1, 2, 3);
            });
            this.example("fail", function() {
                var spy = this.sinon.spy();
                spy(1, 2, 3);
                this.sinon.assert.calledOnce(spy);
                this.assert.calledWith(spy, 1, 2, 4);
            });
        });
    });
    nodespec.exec();
    """
    When I run `node sinon-spec.js`
    Then the exit status should be 1
    And the output should contain "1 passed"
    And the output should contain "1 failed"

Scenario: Using the sandbox for mocks - automatically verified
    Given a file named "sinon-spec.js" with:
    """
    var nodespec = require("nodespec");
    nodespec.mockWith("sinon");
    nodespec.describe("Sinon sandbox", function() {
        this.describe("Mocks", function() {
            this.subject(function() {
                return { method: function() {} };
            });
            this.example("pass", function() {
                var mock = this.sinon.mock(this.subject);
                mock.expects("method").once().withArgs(1);
                this.subject.method(1);
            });
            this.example("fail", function() {
                var mock = this.sinon.mock(this.subject);
                mock.expects("method").once().withArgs(1);
                this.subject.method(2);
            });
        });
    });
    nodespec.exec();
    """
    When I run `node sinon-spec.js`
    Then the exit status should be 1
    And the output should contain "1 passed"
    And the output should contain "1 failed"

Scenario: Sinon assertions work with expect()
    Given a file named "sinon-spec.js" with:
    """
    var nodespec = require("nodespec");
    nodespec.mockWith("sinon");
    nodespec.describe("Sinon sandbox", function() {
        this.example("pass", function() {
            this.expect(2);
            var spy = this.sinon.spy();
            spy(1, 2, 3);
            this.sinon.assert.calledOnce(spy);
            this.assert.calledWith(spy, 1, 2, 3);
        });
    });
    nodespec.exec();
    """
    When I run `node sinon-spec.js`
    Then the exit status should be 0
    And the output should contain "1 passed"
