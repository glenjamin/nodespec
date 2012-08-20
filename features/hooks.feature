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
        });
        this.example("And hook is run each time", function() {
            this.assert.strictEqual(this.variable, 1);
        });
    });
    nodespec.exec();
    """
    When I run nodespec with "basic-spec.js"
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
        });
        this.example("But now it has", function() {
            this.assert.strictEqual(outside_context, 2);
            outside_context = 3;
        });
        this.example("And again after each test", function() {
            this.assert.strictEqual(outside_context, 2);
        });
    });
    nodespec.exec();
    """
    When I run nodespec with "basic-spec.js"
    Then the exit status should be 0
    And the output should contain "3 passed"


Scenario: Setting up and tearing down with async code
    Given a file named "basic-spec.js" with:
    """
    var nodespec = require('nodespec');
    var outside = 1;
    nodespec.describe("Async Hook behaviour", function() {
        this.before(function(hook) {
            process.nextTick(function() {
                hook.variable = 1;
                hook.done();
            });
        });
        this.after(function(hook) {
            process.nextTick(function() {
                outside = 2;
                hook.done();
            })
        })
        this.example("Before run, but after isnt", function() {
            this.assert.strictEqual(outside, 1);
            this.assert.strictEqual(this.variable, 1);
            this.variable = 2;
        });
        this.example("After has been run by now", function() {
            this.assert.strictEqual(outside, 2);
            this.assert.strictEqual(this.variable, 1);
        });
    });
    nodespec.exec();
    """
    When I run nodespec with "basic-spec.js"
    Then the exit status should be 0
    And the output should contain "2 passed"

Scenario: Failure in before block
    Given a file named "basic-spec.js" with:
    """
    var nodespec = require('nodespec');
    nodespec.describe("Hook behaviour", function() {
        this.before(function() {
            this.assert.equal(1, 2);
        });
        this.example("This example will be marked as failed, and not run", function() {
            this.assert.strictEqual(1, 1);
        });
        this.example("As will this one", function() {
            this.assert.strictEqual(1, 1);
        });
    });
    nodespec.exec();
    """
    When I run nodespec with "basic-spec.js"
    Then the exit status should be 1
    And the output should contain "2 failed"

Scenario: Error in before block
    Given a file named "basic-spec.js" with:
    """
    var nodespec = require('nodespec');
    nodespec.describe("Hook behaviour", function() {
        this.before(function() {
            a + b = c
        });
        this.example("This example will be marked as failed, and not run", function() {
            this.assert.strictEqual(1, 1);
        });
        this.example("As will this one", function() {
            this.assert.strictEqual(1, 1);
        });
    });
    nodespec.exec();
    """
    When I run nodespec with "basic-spec.js"
    Then the exit status should be 2
    And the output should contain "2 errored"

@slow
Scenario: done() not called in async hook times out
    Given a file named "basic-spec.js" with:
    """
    var nodespec = require('nodespec');
    nodespec.describe("Hook behaviour", function() {
        this.before(function(hook) {
            this.stuff = 1
        });
        this.example("This example will not run", function() {
            this.assert.strictEqual(1, 1);
        });
    });
    nodespec.exec();
    """
    When I run nodespec with "basic-spec.js"
    Then the exit status should be 2
    And the output should contain "1 errored"

Scenario: done() called too late (short timeout)
    Given a file named "basic-spec.js" with:
    """
    var nodespec = require('nodespec');
    nodespec.describe("Hook behaviour", function() {
        this.before(function(hook) {
            setTimeout(hook.done, 100);
        }).timeout_after(0.01);
        this.example("This example will not run", function() {
            this.assert.strictEqual(1, 1);
        });
    });
    nodespec.exec();
    """
    When I run nodespec with "basic-spec.js"
    Then the exit status should be 2
    And the output should contain "1 errored"

Scenario: after hooks are called, regardless of test result
    Given a file named "basic-spec.js" with:
    """
    var nodespec = require('nodespec');
    nodespec.describe("Hook behaviour", function() {
        var counter = 0;
        this.after(function() {
            console.log('after #'+ (++counter));
        });
        this.example("passing example", function() {
            this.assert.strictEqual(1, 1);
        });
        this.example("failing example", function() {
            this.assert.strictEqual(1, 2);
        });
        this.example("erroring example", function() {
            this.assert.strictEqual(a, b);
        });
    });
    nodespec.exec();
    """
    When I run nodespec with "basic-spec.js"
    Then the exit status should be 2
    And the output should contain "1 passed"
    And the output should contain "1 failed"
    And the output should contain "1 errored"
    And the output should contain "after #1"
    And the output should contain "after #2"
    And the output should contain "after #3"

Scenario: Failure in after hook
    Given a file named "basic-spec.js" with:
    """
    var nodespec = require('nodespec');
    nodespec.describe("Hook behaviour", function() {
        this.after(function() {
            throw new Error('after errored');
        });
        this.example("passing example now fails", function() {
            this.assert.strictEqual(1, 1);
        });
        this.example("failing example fails with own failure", function() {
            this.assert.strictEqual(1, 2);
        });
        this.example("erroring example fails with own error", function() {
            this.assert.strictEqual(a, b);
        });
    });
    nodespec.exec();
    """
    When I run nodespec with "basic-spec.js"
    Then the exit status should be 2
    And the output should contain "1 failed"
    And the output should contain "2 errored"

Scenario: After hooks are always run
    Given a file named "basic-spec.js" with:
    """
    var nodespec = require('nodespec');
    nodespec.describe("Hook behaviour", function() {
        this.after(function() {
            console.log('first after');
            throw new Error('first cleanup action failed');
        });
        this.after(function() {
            console.log('second after');
            throw new Error('second cleanup action failed');
        });
        this.example("failing example", function() {
            this.assert.strictEqual(1, 2);
        });
    });
    nodespec.exec();
    """
    When I run nodespec with "basic-spec.js"
    Then the exit status should be 1
    And the output should contain "1 failed"
    And the output should contain "first after"
    And the output should contain "second after"

Scenario: Global hooks
    Given a file named "basic-spec.js" with:
    """
    var nodespec = require('nodespec');
    nodespec.before(function() {
        this.something = [1];
    });
    var a = 1;
    nodespec.after(function() {
        a += 1;
    });
    nodespec.describe("Global hooks", function() {
        this.example("are run with every test", function() {
            this.assert.equal(this.something.length, 1);
        });
        this.example("including after hooks", function() {
            this.assert.equal(a, 2);
        });
    });
    nodespec.exec();
    """
    When I run nodespec with "basic-spec.js"
    Then the exit status should be 0
    And the output should contain "2 passed"
