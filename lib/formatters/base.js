
exports.BaseFormatter = BaseFormatter;

function BaseFormatter(conf, emitter) {
  emitter.on('suiteStart', this.startTimer.bind(this));
  emitter.on('suiteComplete', this.endTimer.bind(this));

  this.conf = conf;
}

BaseFormatter.prototype.startTimer = function() {
  this.startTime = new Date();
}
BaseFormatter.prototype.endTimer = function() {
  this.timeTaken = new Date() - this.startTime;
}
BaseFormatter.prototype.time = function() {
  return this.timeTaken / 1000;
}
