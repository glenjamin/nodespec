var util = require('util');

var f = require('./utils');
var c = f.colour;

var ConsoleFormatter = require('./console').ConsoleFormatter;

exports.ProgressFormatter = ProgressFormatter;

exports.init = function(conf, emitter) {
  return new ProgressFormatter(conf, emitter);
}

util.inherits(ProgressFormatter, ConsoleFormatter);
function ProgressFormatter(conf, emitter) {

  // Before the parent event
  emitter.on('suiteComplete', this.writeln.bind(this, '', null));

  ProgressFormatter.super_.call(this, conf, emitter);

  emitter.on('examplePass',  this.dot.bind(this, '.', c.green));
  emitter.on('examplePend',  this.dot.bind(this, '*', c.yellow));
  emitter.on('exampleFail',  this.dot.bind(this, 'F', c.red));
  emitter.on('exampleError', this.dot.bind(this, 'E', c.cyan));

  if (this.output_stream.columns) {
    this.line_width = Math.min(this.LINE_WIDTH, this.output_stream.columns);
  } else {
    this.line_width = this.LINE_WIDTH;
  }


  this.dots = 0;
}

ProgressFormatter.prototype.LINE_WIDTH = 100;

ProgressFormatter.prototype.dot = function(dot, colour) {
  this.dots += 1
  this.write(dot, colour);
  if (this.dots % this.line_width == 0) {
    this.writeln()
    this.dots = 0;
  }
}
