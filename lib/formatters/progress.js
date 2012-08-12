var async = require('async');

var f = require('./utils');
var c = f.colour;

exports.Formatter = ProgressFormatter;

var COLOUR_ENABLED = false;

ProgressFormatter.prototype.LINE_WIDTH = 100;

exports.init = function(conf, emitter) {
  return new ProgressFormatter(conf, emitter);
}
function ProgressFormatter(conf, emitter) {
  emitter.on('suiteStart', this.suiteStart.bind(this));
  emitter.on('examplePass', this.examplePass.bind(this));
  emitter.on('examplePend', this.examplePend.bind(this));
  emitter.on('exampleFail', this.exampleFail.bind(this));
  emitter.on('exampleError', this.exampleError.bind(this));
  emitter.on('suiteComplete', this.suiteComplete.bind(this));

  this.conf = conf;

  this.output_stream = process.stdout;
  this.line_width = Math.min(this.LINE_WIDTH, this.output_stream.columns);

  c.setup(conf, this.output_stream);

  this.dots = 0;
  this.failures = [];
  this.pending = [];
  this.errors = [];
}

ProgressFormatter.prototype.write = function(str, wrap) {
  if (wrap) str = wrap(str);
  return this.output_stream.write(str);
};
ProgressFormatter.prototype.writeln = function(str, wrap) {
  if (!str) str = '';
  this.write(str, wrap);
  this.write('\n');
};

ProgressFormatter.prototype.onComplete = function(callback) {
  if (this.write('')) {
    callback();
  } else {
    this.output_stream.once('drain', callback);
  }
}

ProgressFormatter.prototype.suiteStart = function() {
  this.startTime = new Date();
};

ProgressFormatter.prototype.dot = function(dot, colour) {
  this.dots += 1
  this.write(dot, colour);
  if (this.dots % this.line_width == 0) {
    this.writeln()
    this.dots = 0;
  }
}

ProgressFormatter.prototype.examplePass = function(example) {
  this.dot('.', c.green);
};
ProgressFormatter.prototype.examplePend = function(example, error) {
  this.dot('*', c.yellow);
  this.pending.push({example: example, error: error});
};
ProgressFormatter.prototype.exampleFail = function(example, error) {
  this.dot('F', c.red);
  this.failures.push({example: example, error: error});
};
ProgressFormatter.prototype.exampleError = function(example, error) {
  this.dot('E', c.cyan);
  this.errors.push({example: example, error: error});
};
ProgressFormatter.prototype.suiteComplete = function(results) {
  this.timeTaken = new Date() - this.startTime;
  this.writeln('');
  async.series([
    this.writePending.bind(this),
    this.writeFailures.bind(this),
    this.writeErrors.bind(this),
    this.writeSummary.bind(this, results)
  ]);
};
ProgressFormatter.prototype.writePending = function(callback) {
  if (this.pending.length == 0) {
    callback();
    return;
  }
  this.writeln();
  this.writeln('Pending:', c.yellow);
  var i = 1;
  async.forEachSeries(this.pending,
    function iterator(pending, next) {
      var example = pending.example, error = pending.error;
      this.writeln();
      this.writeln('  ' + i + ') ' + example.full_description, c.yellow);
      if (error) {
        f.locateError(example, error, function(err, location, line) {
          this.writeln('     // ' + location, c.yellow);
          this.writeln('       ' + error.message, c.yellow);
          i += 1;
          next();
        }.bind(this));
      } else {
        var location = f.relativizePath(example.file_path) +
                       ':' + example.line_number;
        this.writeln('     // ' + location, c.yellow);
        this.writeln('       <unimplemented>', c.yellow);
        i += 1;
        next();
      }
    }.bind(this),
    callback
  );
};
ProgressFormatter.prototype.writeFailures = function(callback) {
  if (this.failures.length == 0) {
    callback();
    return;
  }
  this.writeln();
  this.writeln('Failures:', c.red);
  var i = 1;
  async.forEachSeries(this.failures,
    function iterator(failure, next) {
      var example = failure.example, error = failure.error;
      f.locateError(example, error, function(err, location, line) {
        this.writeln();
        this.writeln('  ' + i + ') ' + example.full_description, c.red);
        this.writeln('     // ' + location, c.red);
        if (line)
          this.writeln('     ' + line, c.red);
        if (error.message) {
          msg = error.message.replace(/\n/g, '\n       ');
          this.writeln('       ' + msg, c.red);
        } else {
          this.writeln('       expected: ' +
                 f.formatVariable(error.expected), c.red);
          this.writeln('            got: ' +
                 f.formatVariable(error.actual), c.red);
        }
        var verbose = this.conf.verbose;
        if (verbose) {
          var stack_lines = f.relevantTraceLines(verbose, example, error);
          for (var l in stack_lines) {
            this.writeln('       ' + stack_lines[l], c.red);
          }
        }
        i += 1;
        next();
      }.bind(this));
    }.bind(this),
    callback
  );
};
ProgressFormatter.prototype.writeErrors = function(callback) {
  if (this.errors.length == 0) {
    callback();
    return;
  }
  this.writeln();
  this.writeln('Errors:', c.cyan);
  var i = 1;
  async.forEachSeries(this.errors,
    function iterator(item, next) {
      var example = item.example, error = item.error;
      f.locateError(example, error, function(err, location, line) {
        this.writeln();
        this.writeln('  ' + i + ') ' + example.full_description, c.cyan);
        this.writeln('     // ' + location, c.cyan);
        if (line)
          this.writeln('     ' + line, c.cyan);
        msg = error.toString().replace(/\n/g, '\n       ');
        this.writeln('     ' + msg, c.cyan);
        var verbose = this.conf.verbose;
        var stack_lines = f.relevantTraceLines(verbose, example, error);
        for (var l in stack_lines) {
          this.writeln('       ' + stack_lines[l], c.cyan);
        }
        i += 1;
        next();
      }.bind(this));
    }.bind(this),
    callback
  );
};
ProgressFormatter.prototype.writeSummary = function(results) {
  this.writeln();
  this.write(results.total + ' spec' + (results.total != 1 ? 's' : ''));
  var bits = [];
  if (results.pass)
    bits.push(c.green(results.pass + ' passed'));
  if (results.pend)
    bits.push(c.yellow(results.pend + ' pending'));
  if (results.fail)
    bits.push(c.red(results.fail + ' failed'));
  if (results.error)
    bits.push(c.cyan(results.error + ' errored'));
  if (bits.length > 0) {
    this.write(' (' + bits.join(', ') + ')');
  }
  this.writeln();
  this.writeTimeTaken();
};

ProgressFormatter.prototype.writeTimeTaken = function() {
  var secs = this.timeTaken / 1000;
  this.writeln('Time Taken: ' + secs + 's');
};
