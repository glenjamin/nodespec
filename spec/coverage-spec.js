var nodespec = require('./common');

var coverage = require('../lib/coverage');

nodespec.describe("Code Coverage", function() {
  this.describe("extract files from nodespec", function() {
    this.subject("nodespec", function() { return nodespec('SUT') })
    this.after(function() { this.nodespec.abandon() })
    function addGroup(g, d) {
      return g.describe(d, function(){});
    }
    function addSpec(g, d, f) {
      var e = g.example(d, function(){});
      e.file_path = f;
    }
    this.context("single example", function(it) {
      this.before(function() {
        var g = addGroup(this.nodespec, "group 1");
        addSpec(g, "example", "example.js")
      })
      it("should extract filename", function() {
        var files = coverage.extract_files(this.nodespec);
        this.assert.deepEqual(files, ['example.js'])
      })
    })
    this.context("many examples", function(it) {
      this.before(function() {
        var g = addGroup(this.nodespec, "group 1");
        addSpec(g, "example1", "example.js")
        addSpec(g, "example2", "example.js")
        addSpec(g, "example3", "example.js")
        addSpec(g, "example4", "example.js")
        addSpec(g, "example5", "example.js")
      })
      it("should extract filename", function() {
        var files = coverage.extract_files(this.nodespec);
        this.assert.deepEqual(files, ['example.js'])
      })
    })
    this.context("multiple example groups, multiple files", function(it) {
      this.before(function() {
        var g1 = addGroup(this.nodespec, "group 1");
        addSpec(g1, "example1", "example1.js")
        addSpec(g1, "example2", "example1.js")
        var g2 = addGroup(this.nodespec, "group 2");
        addSpec(g2, "example1", "example2.js")
        addSpec(g2, "example2", "example2.js")
      })
      it("should extract unique filenames", function() {
        var files = coverage.extract_files(this.nodespec);
        this.assert.deepEqual(files, ['example1.js', 'example2.js'])
      })
    })
    this.context("subgroups and subdirs", function(it) {
      this.before(function() {
        var g1 = addGroup(this.nodespec, "group 1");
        addSpec(g1, "example1", "example1.js")
        addSpec(g1, "example2", "example1.js")
        var g1a = addGroup(this.nodespec, "group 1 subgroup a");
        addSpec(g1, "example1", "example1/example-a.js")
        addSpec(g1, "example2", "example1/example-a.js")
        var g1a = addGroup(this.nodespec, "group 1 subgroup a");
        addSpec(g1, "example1", "example1/example-b.js")
        addSpec(g1, "example2", "example1/example-b.js")
      })
      it("should extract unique filenames", function() {
        var files = coverage.extract_files(this.nodespec);
        this.assert.deepEqual(files,
          ['example1.js', 'example1/example-a.js', 'example1/example-b.js'])
      })
    })

  })
})

nodespec.exec();
