var util = require('util');

var f = require('./utils');
var c = f.colour;

var ConsoleFormatter = require('./console').ConsoleFormatter;

exports.DocumentationFormatter = DocumentationFormatter;

exports.init = function(conf, emitter) {
  return new DocumentationFormatter(conf, emitter);
}

util.inherits(DocumentationFormatter, ConsoleFormatter);
function DocumentationFormatter(conf, emitter) {
  DocumentationFormatter.super_.call(this, conf, emitter);

  emitter.on('suiteStart',     this.suiteStart.bind(this));
  emitter.on('groupStart',     this.groupStart.bind(this));
  emitter.on('groupComplete',  this.groupComplete.bind(this));

  emitter.on('examplePass',    this.example.bind(this, c.green,  ''));
  emitter.on('examplePend',    this.example.bind(this, c.yellow, 'PENDING: '));
  emitter.on('exampleFail',    this.example.bind(this, c.red,    'FAILED: '));
  emitter.on('exampleError',   this.example.bind(this, c.cyan,   'ERROR: '));

  this.indent = 0;
}

DocumentationFormatter.prototype.writeln = function(str, wrap) {
  if (str) {
    str = (new Array(this.indent * 2 + 1)).join(" ") + str;
  }
  DocumentationFormatter.super_.prototype.writeln.call(this, str, wrap);
}

DocumentationFormatter.prototype.suiteStart = function() {
  this.writeln();
}

DocumentationFormatter.prototype.groupStart = function(group) {
  if (group.description) {
    this.writeln(group.description);
    this.indent += 1;
  }
}
DocumentationFormatter.prototype.groupComplete = function(group) {
  if (group.description) {
    this.indent -= 1;
  }
}

DocumentationFormatter.prototype.example = function(colour, prefix, example) {
  this.writeln(prefix + example.description, colour);
}
