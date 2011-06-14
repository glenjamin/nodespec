
exports.ProgressFormatter = ProgressFormatter;

function ProgressFormatter(emitter, out) {
    var formatter = this;
    emitter.on('examplePass', this.examplePass.bind(this));
    emitter.on('suiteComplete', this.suiteComplete.bind(this));
    this.output_stream = process.stdout;
}

ProgressFormatter.prototype.write = function(str) {
    this.output_stream.write(str);
    this.output_stream.flush();
}
ProgressFormatter.prototype.writeln = function(str) {
    if (!str) str = '';
    this.write(str+"\n");
}

ProgressFormatter.prototype.examplePass = function(example) {
    this.write('.');
}
ProgressFormatter.prototype.suiteComplete = function(results) {
    this.writeln();
    this.write(results.total + " specs");
    var bits = []
    if (results.pass)
        bits.push(results.pass + " passed");
    if (results.pend)
        bits.push(results.pend + " pending");
    if (results.fail)
        bits.push(results.fail + " failed");
    if (results.error)
        bits.push(results.error + " errored");
    if (bits.length > 0) {
        this.write(" (" + bits.join(", ") + ")");
    }
}
