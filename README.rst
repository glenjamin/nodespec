========
NodeSpec
========

NOTE: This library is currently un-implemented!

A light-weight RSpec_-esque testing framework designed and built
specifically for NodeJS.

..  _RSpec: http://relishapp.com/rspec

.. contents:: :local:

Rationale
=========

There are many existing frameworks for NodeJS already out there, but none
of them quite did what I was looking for. Some were originally built pre-node,
and thus their node support was somewhat "bolted-on", while others seemed to
get a bit carried away with the whole asynchronous nature a little bit.

My complaints can be summarised as:

 *  Running tests asynchronously isn't particularly useful
    (if you try and use mocks it can even be harmful)

 *  Not being able to test asynchronous code is even less useful

Goals
=====

 *  Ground-up support for NodeJS convention callbacks
 *  Only one test running at a time
 *  **No global variables**
 *  RSpec style nested contexts
 *  Easy to use and read setup/teardown functions
 *  Pluggable mocking support
 *  Native assertions, or pluggable replacements/extensions
 *  Multiple output formatters on the same test run

Why not X?
==========

Vows
  Vows only evaluates the topic once, and then runs all the vows and
  sub-contexts against the initial topic. Which is fine for integration
  testing but doesn't work well with mocking.

nodeunit
  Nodeunit actually satisfies most of the criteria above, except it doesn't
  have RSpec-style nested contexts. If I didn't have to urge to roll my own,
  nodeunit is what I'd be using.

Features
========

Currently there are none, as there isn't any code.
See Development_ for why this file exists.

Development
===========

`README Driven Development`_
  Any and all features will be outlined in this readme file *before* the tests
  are written.

BEHAVIOUR Driven Development
  Integration tests which treat the executable as a black-box will be written
  using `cucumber`_ & `aruba`_ (yes, using Ruby)
  before any implementation.

Lots and lots of Unit Tests
  All code will be fully unit tested using NodeSpec itself before release.

.. _`README Driven Development`: http://tom.preston-werner.com/2010/08/23/readme-driven-development.html
.. _`cucumber`: http://cukes.info/
.. _`aruba`: https://github.com/cucumber/aruba

Installation
============

Until there's something worth using, I won't be publishing to npm.

For the moment just install via github tarball::

    npm install https://github.com/glenjamin/nodespec/tarball/master

Usage
=====

NOTE: Exact syntax is currently in flux, It should be established by v0.1.0

Require the module into test files to use it::

    var nodespec = require('nodespec');

Simple spec::

    nodespec.describe("Addition", function() {
        this.example("1 + 1 = 2", function() {
            this.assert.equal(1 + 1, 2);
            // Return non-undefined to indicate not async
            return true;
        });
    });

Simple async spec::

    nodespec.describe("nextTick", function() {
        this.example("fires the callback", function(test) {
            this.expect(2);
            this.assert.strictEqual(this, test);
            process.nextTick(function() {
                this.assert.strictNotEqual(this, test);
                test.done();
            });
        });
    });

Before/After Hooks::

    // Hooks share `this` with tests, but it's rebuilt each time
    nodespec.describe("Some databasey test", function() {
        this.before(function(hook) {
            this.assert.strictEqual(this, hook);
            db_connect(function (err, conn) {
                hook.db = conn;
                hook.db.start_transaction(function(err, tx) {
                    hook.tx = tx;
                    hook.done();
                });
            });
        });
        this.after(function() {
            this.tx.rollback();
            return true; // not async
        });
        this.example("database interaction", function(test) {
            test.expect(2);
            test.db.insert({field: 1}, function(err, result) {
                test.assert.strictEqual(result.affected, 1);
                test.db.get(function(err, result) {
                    test.assert.strictEqual(result.field, 1);
                    test.done();
                });
            });
        });
    });

Copyright
=========

Copyright © 2011 The NodeSpec Authors. See LICENSE and AUTHORS for details.
