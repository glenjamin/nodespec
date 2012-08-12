var fs = require('fs');
var util = require('util');
var tty = require('tty');

var tracey = require('tracey');

exports.formatVariable = function(variable) {
  return util.inspect(variable, false, null);
}

var relativizePath = exports.relativizePath = function(path) {
  return path.replace(process.cwd(), '.');
}

var getLine = exports.getLine = function(filename, line_no, callback) {
  line_no = parseInt(line_no);
  var data = fs.readFileSync(filename, 'utf8');
  var lines = data.split('\n');
  if (lines.length >= line_no) {
    callback(null, lines[line_no - 1].trim());
    return;
  }
  callback(new Error('File end reached without finding line'));
}

/** Stack Traces **/
exports.relevantTraceLines = function(verbose, example, error) {
  try {
    var stack = tracey(error);
  } catch (ex) {
    return [];
  }
  var relevant = [];
  stack.some(function(frame) {
    // Stop when we reach nodespec internals
    if (!verbose && /nodespec\/lib/.test(frame.path)) {
      return true;
    }
    var line;
    if (frame.path) {
      line = frame.raw.replace(frame.path,
                     relativizePath(frame.path));
    } else {
      line = frame.raw;
    }
    relevant.push(line);
    return false;
  });
  return relevant;
}

exports.locateError = function(example, error, callback) {
  var line_match = findFailedLine(error, example.file_path);
  var location;
  if (!line_match) {
    location = relativizePath(example.file_path);
    location += ':' + example.line_number;
  } else {
    location = relativizePath(line_match.path);
    location += ':' + line_match.line;
  }
  if (callback.length == 2 || !line_match) {
    callback(null, location);
    return;
  }
  getLine(line_match.path, line_match.line, function(err, line) {
    callback(err, location, line);
  });
};

var findFailedLine = function(error, file) {
  //TODO: handle cov exclusion better
  if (process.instrumented) {
    return null;
  }
  if (!error.stack) {
    return null;
  }
  var stack = tracey(error);
  // Find the first line from the stack that is from file
  var match = null;
  stack.some(function(frame) {
    if (frame.path && ~frame.path.indexOf(file)) {
      match = frame;
    }
    return match;
  });
  return match;
}

/** Colours **/
var colour = exports.colour = {};

colour.setup = function(conf, stream) {
  this.on = false;
  if (conf.colour !== false && (tty.isatty(stream) || conf.colour)) {
    this.on = true;
  }
};

colour.write = function colour(num, str) {
  if (!this.on) {
    return str;
  }
  str = str ? str + this.normal() : '';
  return '\x1B[' + num + 'm' + str;
}
var colours = {
  'red':    31,
  'green':  32,
  'yellow': 33,
  'cyan':   36,
  'normal': 39,
}
Object.keys(colours).forEach(function(c) {
  colour[c] = function(str) {
    return colour.write(colours[c], str);
  }
})
