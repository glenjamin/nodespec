var tty = require('tty');

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
