var fs = require('fs'),
    util = require('util');

var async = require('async');

exports.ProgressFormatter = ProgressFormatter;

function ProgressFormatter(emitter, out) {
    emitter.on('suiteStart', this.suiteStart.bind(this));
    emitter.on('examplePass', this.examplePass.bind(this));
    emitter.on('examplePend', this.examplePend.bind(this));
    emitter.on('exampleFail', this.exampleFail.bind(this));
    emitter.on('exampleError', this.exampleError.bind(this));
    emitter.on('suiteComplete', this.suiteComplete.bind(this));

    this.output_stream = process.stdout;

    this.failures = [];
    this.pending = [];
    this.errors = [];
}

ProgressFormatter.prototype.write = function(str, wrap) {
    if (wrap)
        str = wrap(str);
    this.output_stream.write(str);
    this.output_stream.flush();
}
ProgressFormatter.prototype.writeln = function(str, wrap) {
    if (!str) str = '';
    this.write(str, wrap);
    this.write("\n");
}

ProgressFormatter.prototype.suiteStart = function() {
    this.startTime = new Date();
}

ProgressFormatter.prototype.examplePass = function(example) {
    this.write(green());
    this.write('.');
}
ProgressFormatter.prototype.examplePend = function(example, error) {
    this.write(yellow());
    this.write('*');
    this.pending.push({example: example, error: error});
}
ProgressFormatter.prototype.exampleFail = function(example, error) {
    this.write(red());
    this.write('F');
    this.failures.push({example: example, error: error});
}
ProgressFormatter.prototype.exampleError = function(example, error) {
    this.write(cyan());
    this.write('E');
    this.errors.push({example: example, error: error});
}
ProgressFormatter.prototype.suiteComplete = function(results) {
    this.timeTaken = new Date() - this.startTime;
    this.writeln('', normal);
    async.series([
        this.writePending.bind(this),
        this.writeFailures.bind(this),
        this.writeErrors.bind(this),
        this.writeSummary.bind(this, results)
    ]);
}
ProgressFormatter.prototype.writePending = function(callback) {
    if (this.pending.length == 0) {
        callback();
        return;
    }
    this.writeln();
    this.writeln("Pending:", yellow);
    var i = 1;
    async.forEachSeries(this.pending,
        function iterator(pending, next) {
            var example = pending.example, error = pending.error;
            this.writeln();
            this.writeln('  ' + i + ') ' + example.full_description, yellow);
            if (error) {
                this.locateError(example, error, function(err, location, line) {
                    this.writeln('     // ' + location, yellow);
                    this.writeln('       ' + error.message, yellow);
                    i += 1;
                    next();
                }.bind(this));
            } else {
                var location = relativize_path(example.file_path) +
                               ':' + example.line_number;
                this.writeln('     // ' + location, yellow);
                this.writeln('       <unimplemented>', yellow);
                i += 1;
                next();
            }
        }.bind(this),
        callback
    );
}
ProgressFormatter.prototype.writeFailures = function(callback) {
    if (this.failures.length == 0) {
        callback();
        return;
    }
    this.writeln();
    this.writeln("Failures:", red);
    var i = 1;
    async.forEachSeries(this.failures,
        function iterator(failure, next) {
            var example = failure.example, error = failure.error;
            this.locateError(example, error, function(err, location, line) {
                this.writeln();
                this.writeln('  ' + i + ') ' + example.full_description, red);
                this.writeln('     // ' + location, red);
                if (line)
                    this.writeln('     ' + line, red);
                if (error.message) {
                    this.writeln('       ' + error.message, red);
                } else {
                    this.writeln('       expected: ' +
                                 format_variable(error.expected), red);
                    this.writeln('            got: ' +
                                 format_variable(error.actual), red);
                }
                i += 1;
                next();
            }.bind(this));
        }.bind(this),
        callback
    );
}
ProgressFormatter.prototype.writeErrors = function(callback) {
    if (this.errors.length == 0) {
        callback();
        return;
    }
    this.writeln();
    this.writeln("Errors:", cyan);
    var i = 1;
    async.forEachSeries(this.errors,
        function iterator(item, next) {
            var example = item.example, error = item.error;
            this.locateError(example, error, function(err, location, line) {
                this.writeln();
                this.writeln('  ' + i + ') ' + example.full_description, cyan);
                this.writeln('     // ' + location, cyan);
                if (line)
                    this.writeln('     ' + line, cyan);
                this.writeln('     ' + error, cyan);
                var stack_lines = relevant_trace_lines(example, error);
                for (var l in stack_lines) {
                    this.writeln('       ' + stack_lines[l], cyan);
                }
                i += 1;
                next();
            }.bind(this));
        }.bind(this),
        callback
    );
}
ProgressFormatter.prototype.writeSummary = function(results) {
    this.writeln();
    this.write(results.total + " spec" + (results.total != 1 ? "s" : ""));
    var bits = []
    if (results.pass)
        bits.push(green(results.pass + " passed"));
    if (results.pend)
        bits.push(yellow(results.pend + " pending"));
    if (results.fail)
        bits.push(red(results.fail + " failed"));
    if (results.error)
        bits.push(cyan(results.error + " errored"));
    if (bits.length > 0) {
        this.write(" (" + bits.join(", ") + ")");
    }
    this.writeln();
    this.writeTimeTaken();
}

ProgressFormatter.prototype.writeTimeTaken = function() {
    var secs = this.timeTaken / 1000;
    this.writeln('Time Taken: '+secs+'s');
}

ProgressFormatter.prototype.locateError = function(example, error, callback) {
    var line_match = find_failed_line(error, example.file_path);
    var location;
    if (!line_match) {
        location = relativize_path(example.file_path);
        location += ':' + example.line_number;
    } else {
        location = relativize_path(line_match[1]);
        location += ':' + line_match[2];
    }
    if (callback.length == 2 || !line_match) {
        callback(null, location);
        return;
    }
    get_line(line_match[1], line_match[2], function(err, line) {
        if (err)
            callback(err);
        else
            callback(null, location, line);
    });
}

function relevant_trace_lines(example, error) {
    try {
        var stack = error.stack.split("\n").splice(1);
    } catch (ex) {
        return [];
    }
    var relevant = [];
    for (var i in stack) {
        if (/nodespec\/lib/.test(stack[i])) {
            break;
        }
        var match = /(at (?:.+\()?)(.+):(\d+:\d+\)?)/.exec(stack[i]);
        relevant.push(match[1] + relativize_path(match[2]) + ':' + match[3]);
    }
    return relevant;
}

function find_failed_line(error, file) {
    if (!error.stack) {
        return null;
    }
    var stack = error.stack.split("\n");
    // Find the first line from the stack that is from file
    for (var i=0; i< stack.length; ++i) {
        if (stack[i].indexOf(file+':') !== -1) {
            return /at (?:.+\()?(.+):(\d+):/.exec(stack[i]);
        }
    }
    return null;
}

function format_variable(variable) {
    return util.inspect(variable, false, null);
}

function relativize_path(path) {
    var cwd = process.cwd();
    return path.replace(cwd, '.');
}

function get_line(filename, line_no, callback) {
    line_no = parseInt(line_no);
    var data = fs.readFileSync(filename, 'utf8');
    var lines = data.split("\n");
    if (lines.length >= line_no) {
        callback(null, lines[line_no - 1].trim());
        return;
    }
    throw new Error('File end reached without finding line');
}

function colour(num, str) {
    return "\x1B[" + num + "m" + (str ? str + "\x1B[39m" : "");
}

function green(str) {
    return colour(32, str);
}
function red(str) {
    return colour(31, str);
}
function yellow(str) {
    return colour(33, str);
}
function cyan(str) {
    return colour(36, str);
}
function normal(str) {
    return colour(39, str);
}
