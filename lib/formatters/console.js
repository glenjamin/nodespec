var util = require('util');

var async = require('async');

var f = require('./utils');
var c = f.colour;

var BaseFormatter = require('./base').BaseFormatter;

exports.ConsoleFormatter = ConsoleFormatter;

util.inherits(ConsoleFormatter, BaseFormatter);
function ConsoleFormatter(conf, emitter) {
  ConsoleFormatter.super_.call(this, conf, emitter);

  this.output_stream = process.stdout;

  emitter.on('suiteComplete', this.writeFooter.bind(this));

  emitter.on('examplePend', this.record.bind(this, 'pend'));
  emitter.on('exampleFail', this.record.bind(this, 'fail'));
  emitter.on('exampleError', this.record.bind(this, 'error'));

  this.pending = []; this.failures = []; this.errors = [];
  this.recorded = {
    'pend':  this.pending,
    'fail':  this.failures,
    'error': this.errors,
  };

  // Setup colour support
  c.setup(conf, this.output_stream);
}

ConsoleFormatter.prototype.write = function(str, wrap) {
  if (wrap) str = wrap(str);
  return this.output_stream.write(str);
}
ConsoleFormatter.prototype.writeln = function(str, wrap) {
  if (!str) str = '';
  this.write(str, wrap);
  this.write('\n');
}

ConsoleFormatter.prototype.record = function(type, example, error) {
  this.recorded[type].push({example: example, error: error});
}

ConsoleFormatter.prototype.onComplete = function(callback) {
  // Check if the output stream is buffering?
  if (this.write('')) {
    callback();
  } else {
    this.output_stream.once('drain', callback);
  }
}


ConsoleFormatter.prototype.writeFooter = function(results) {
  async.series([
    this.writePending.bind(this),
    this.writeFailures.bind(this),
    this.writeErrors.bind(this),
    this.writeSummary.bind(this, results)
  ]);
};
ConsoleFormatter.prototype.writePending = function(callback) {
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
ConsoleFormatter.prototype.writeFailures = function(callback) {
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
        if (line) {
          this.writeln('     ' + line, c.red);
        }
        msg = error.message.replace(/\n/g, '\n       ');
        this.writeln('       ' + msg, c.red);
        if (error.expected !== undefined || error.actual !== undefined) {
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
ConsoleFormatter.prototype.writeErrors = function(callback) {
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

ConsoleFormatter.prototype.writeSummary = function(results) {
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
  this.writeln('Time Taken: ' + this.time() + 's');
};
