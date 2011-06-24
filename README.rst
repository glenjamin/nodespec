========
NodeSpec
========

A light-weight RSpec_-esque testing framework designed and built
specifically for NodeJS.

..  _RSpec: http://relishapp.com/rspec

.. contents:: :local:

Features
========

 *  Ground-up support for NodeJS convention callbacks

 *  Only one test running at a time

 *  **No global variables**

 *  RSpec style syntactic sugar

    *  Nested contexts **(not yet implemented)**
    *  Easy to use setup/teardown
    *  Subject helpers **(not yet implemented)**

 *  Pluggable mocking support **(not yet implemented)**

 *  Native assertions

 *  Easy to extend or replace the default assertions **(not yet implemented)**

 *  Multiple output formatters on the same test run **(not yet implemented)**

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

If you'd like to contribute

 1.  Fork the repository on github
 2.  Make your changes
 3.  Run the unit tests
 4.  Run the cucumber tests with `cucumber -p all`
 5.  Push back to github and send me a pull request

If you're fixing a bug, please add a testcase to prove it was broken and is fixed,
if you're adding a new feature, please add cucumber feature file for it.

To be able to run cucumber, you'll need Ruby and Bundler installed, then do `bundle install`.

Installation
============

Until there's something worth using, I won't be publishing to npm.

For the moment just install via github tarball::

    npm install https://github.com/glenjamin/nodespec/tarball/master

Or clone directly from github::

    git clone git://github.com/glenjamin/nodespec
    cd nodespec
    npm link

Usage
=====

Require the module into test files to use it::

    var nodespec = require('nodespec');

And then at the end of each test file::

    nodespec.exec();

Simple spec::

    nodespec.describe("Addition", function() {
        this.example("1 + 1 = 2", function() {
            this.assert.equal(1 + 1, 2);
        });
    });

Simple async spec::

    nodespec.describe("nextTick", function() {
        // Accept 1 argument in the definition for an async test
        this.example("fires the callback", function(test) {
            this.expect(2);
            this.assert.strictEqual(this, test);
            process.nextTick(function() {
                this.assert.strictNotEqual(this, test);
                // async tests must call test.done()
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

Nested contexts with subject::

    nodespec.describe("My Server", function() {
        // This function is executed once when `this.server` is accessed
        this.subject('server', function() {
            return new Server(1337);
        });
        this.context("Strict Mode", function() {
            this.before(function() {
                this.server.use_strict_mode();
            });
            this.example("invalid request fails", function(test) {
                test.expect(1);
                test.server.request('invalid', function(err, result) {
                    test.assert.notEqual(err, null);
                    test.done();
                });
            });
        });
        this.context("Not Strict Mode", function() {
            this.before(function() {
                this.server.dont_use_strict_mode();
            });
            this.example("invalid request fails silently", function(test) {
                test.expect(2);
                test.server.request('invalid', function(err, result) {
                    test.assert.equal(err, null);
                    test.assert.equal(result, null);
                    test.done();
                });
            });
        });
    });

Copyright
=========

Copyright © 2011 The NodeSpec Authors. See LICENSE and AUTHORS for details.
