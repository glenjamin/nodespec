var fs = require('fs');
var path = require('path');
var Module = require('module').Module;
var EventEmitter = require('events').EventEmitter;

var bunker = require('bunker');

var mkdirp = require('mkdirp');

/*
 Instrument and execute code coverage for the given nodespec runner

 Arguments

    nodespec - {nodespec}

*/
exports.exec = function(nodespec, filter) {
  var specs = exports.extract_specs(nodespec);
  var files = exports.extract_files(nodespec);

  var b = createBunker();

  // Hijack all future requires and instrument
  process.instrumented = true;
  for (var k in Module._cache) { delete Module._cache[k] }
  var originalModule_compile = Module.prototype._compile;
  Module.prototype._compile = function(content, filename) {
    if (!filter || filter.test(filename)) {
      content = b.instrument(content, filename);
    }
    originalModule_compile.call(this, content, filename);
  }

  var runner = require('./index')(nodespec.nodespec_name);
  runner.instrument = b.instrument;
  files.forEach(function(f) {
    runner.require(f);
  })
  var new_specs = exports.extract_specs(runner);
  new_specs.forEach(function(spec, i) {
    spec.line_number = specs[i].line_number;
  })

  var emitter = new EventEmitter();
  runner.run(emitter, function(err, exit_code) {
    outputCoverage(b);
    process.exit(exit_code);
  })
}

function outputCoverage(b) {
  var files = [];
  var totalrun = 0, totalnotrun = 0;
  Object.keys(b.files).forEach(function(filename) {
    var file = b.files[filename];
    var run = 0, notrun = 0, filedata = [];
    filedata.push('--- Uncovered');
    filedata.push('+++ Covered');
    file.lines.forEach(function(line) {
      var token;
      if (line.count === undefined) {
        token = ' ';
      } else if (line.count) {
        run += 1;
        token = '+';
      } else {
        notrun += 1;
        token = '-';
      }
      filedata.push(token + line.src);
    })
    filedata.push('');
    files.push({
      filename: filename,
      run: run,
      notrun: notrun,
      percent: 100 * (run / (run+notrun)),
      output: filedata.join("\n")
    })
    totalrun += run;
    totalnotrun += notrun;
  })
  mkdirp.sync('./coverage');
  consolidatePaths(files);
  var summary = files.map(function(f) {
    return parseFloat(f.percent).toFixed(2) + '%\t' + f.filename;
  }).join("\n") + "\n" +
    (100 * (totalrun / (totalrun+totalnotrun))).toFixed(2) + '%\tOverall\n';
  fs.writeFileSync('./coverage/summary.txt', summary, 'utf8');
  files.forEach(function(f) {
    var dir = path.dirname(f.filename);
    mkdirp.sync('./coverage/' + dir);
    fs.writeFileSync('./coverage/' + f.filename + '.diff', f.output, 'utf8');
  })
}

function consolidatePaths(files) {
  var prefix = files[0].filename;
  if (files.length == 1) {
    files[0].filename = path.basename(prefix);
    return;
  }
  files.slice(1).forEach(function(f) {
    prefix = longestCommonPath(prefix, f.filename);
  })
  files.forEach(function(f) {
    f.filename = f.filename.substring(prefix.lastIndexOf('/') + 1);
  })
}

function longestCommonPath(a, b) {
  for (var i=a.length;i > 0; --i) {
    if (b.indexOf(a.substring(0, i)) === 0) {
      return a.substring(0, i);
    }
  }
  return '';
}

function createBunker() {
  var instrument = {};
  var b = bunker();
  b.assign(global);

  instrument.files = {};

  instrument.instrument = function(src, filename, context) {
    if (typeof context !== 'undefined') {
      b.assign(context);
    }
    var file = this.files[filename] = {
      lines: src.split("\n").map(function(l) { return {src: l} })
    }
    b.sources = [src];
    var end = b.nodes.length;
    // Attempt to undo the pretty formatting of block-wrapped statements
    var compiled = flattenBlocks(b, b.compile());
    // Annotate all new nodes with line information
    b.nodes.slice(end).forEach(function(node) {
      var i = node.start.line;
      file.lines[i].count = 0;
      node.visit = function() { file.lines[i].count += 1; }
    })
    return compiled;
  }

  b.on('node', function(node) { node.visit() })

  return instrument;
}

function flattenBlocks(b, input) {
  // The beautifier outputs blocks onto multiple lines
  // Lets try and reduce most of these back onto one
  var regex = new RegExp('{\\n\\s*(' + b.names.stat +
                         '\\(\\d+\\);)\\n\\s*(.*?;)\\n\\s*}', 'g');
  return input.replace(regex, '{$1$2}');
}

exports.extract_files = function(nodespec) {
  return extractFiles(nodespec.example_groups)
}

function extractFiles(collection, files) {
  files = files || {};

  collection.forEach(function(item) {
    if (item.children) {
      extractFiles(item.children, files);
    } else {
      files[item.file_path] = true;
    }
  })
  return Object.keys(files);
}

exports.extract_specs = function(nodespec) {
  return extractSpecs(nodespec.example_groups)
}

function extractSpecs(collection, specs) {
  specs = specs || [];

  collection.forEach(function(item) {
    if (item.children) {
      extractSpecs(item.children, specs);
    } else {
      specs.push(item)
    }
  })
  return specs;
}
