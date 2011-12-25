var nodespec = require('./common');

var result = require("../lib/hook");
var Hook = result.Hook;

nodespec.describe("Hook", function() {
  this.subject("hook", function() {
    return new Hook(this.options, this.block);
  });
  this.subject("block", function() {
    return this.sinon.spy();
  });
  this.subject("options", function() {
    return { nodespec: this.nodespec, collection: this.collection };
  });
  this.subject("collection", function() {
    return [];
  });
  this.subject("nodespec", function() {
    return nodespec("target for testing");
  });
  this.after(function() { this.nodespec.abandon(); });

  this.before(function() { this.nodespec.DEFAULT_HOOK_TIMEOUT = 17; });

  this.describe("initialisation", function() {
    this.should("default timeout to DEFAULT_HOOK_TIMEOUT", function() {
      this.assert.equal(this.hook.timeout, 17);
    });
    this.should("store hook function as block", function() {
      this.assert.equal(this.hook.block, this.block);
    });
    this.should("append to options.collection", function() {
      var hook = this.hook;
      this.assert.equal(this.collection.length, 1);
      this.assert.equal(this.collection[0], hook);
    });
  });
  this.describe("timeout", function() {
    this.should("read from options", function() {
      this.options.timeout = 7;
      this.assert.equal(this.hook.timeout, 7);
    });
    this.should("be modifiable", function() {
      this.hook.timeout = 9;
      this.assert.equal(this.hook.timeout, 9);
    })
    this.should("be modifiable with timeout_after()", function() {
      this.hook.timeout_after(4);
      this.assert.equal(this.hook.timeout, 4);
    })
  });
});

nodespec.exec();
