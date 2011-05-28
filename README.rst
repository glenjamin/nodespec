NodeSpec
========

NOTE: This library is currently un-implemented!

A light-weight RSpec_-esque testing framework designed and built
specifically for NodeJS.

..  _RSpec: http://relishapp.com/rspec

.. contents:: :local:

Rationale
---------

There are many existing frameworks for NodeJS already out there, but none
of them quite did what I was looking for. Some were originally build pre-node,
and thus their node support was somewhat "bolted-on", while others seemed to
get a bit carried away with the whole asynchronous nature a little bit.

My complaints can be summarised as:

 *  Running tests asynchronously isn't particularly useful
    (if you try and use mocks it can even be harmful)

 *  Not being able to test asynchronous code is even less useful

Goals
-----

 *  Ground-up support for NodeJS convention callbacks
 *  Only one test running at a time
 *  *No global variables*
 *  RSpec style nested contexts
 *  Easy to use and read setup/teardown functions
 *  Pluggable mocking support
 *  Native assertions, or pluggable replacements/extensions
 *  Multiple output formatters on the same test run

Features
--------

Currently there are none, as there isn't any code.
See Development_ for why this file exists.

Development
-----------

`README Driven Development`_
  Any and all features will be outlined in this readme  file *before* the tests
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
------------

Until there's something worth using, I won't be publishing to npm.

For the moment just install via github tarball::

    npm install https://github.com/glenjamin/nodespec/tarball/master

Usage
-----

NOTE: Exact syntax is currently in flux, It should be established by v0.1.0

test/common.js::

    var nodespec = require('nodespec');

    nodespec.world.app = require('../lib/index');

    nodespec.mockWith('sinon');

    // done_callback indicates the function has completed
    nodespec.beforeEach(function(done_callback) {
        this.app.resetState(done_callback);
    });
    // Returning true indicates callback not necessary
    nodespec.afterAll(function() {
        console.log("I'm your wonderwall");
        return true;
    })

    module.exports = nodespec;

test/calculator.js::

    var nodespec = require('./common');

    var calculator = require('../lib/calculator');

    nodespec.describe('Calculator', function (){
        // This is re-evaluated for each test on demand
        this.let('calc', function() {
            return new calculator.Calculator();
        })
        this.context('simple mode', function() {
            this.beforeEach(function () {
                this.calc.useSimpleMode();
            });

            this.example('should add 1 and 1', function () {
                this.calc.enter(1);
                this.calc.add();
                this.calc.enter(1);
                this.assert.strictEqual(this.calc.equals(), 2);

                return true; // not async
            });
            this.example('should add after an equals', function(done) {
                this.calc.enter(1);
                this.assert.strictEqual(this.calc.equals(), 1);

                this.calc.add();
                this.calc.enter(1);
                this.assert.strictEqual(this.calc.equals(), 2);

                done(); // no return value, so use callback to signal completion
            });
        });
    });


Copyright
---------

Copyright © 2011 The NodeSpec Authors. See LICENSE and AUTHORS for details.
