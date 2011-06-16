var fs = require('fs'),
    util = require('util');

var async = require('async');

exports.ProgressFormatter = ProgressFormatter;

function ProgressFormatter(emitter, out) {
    emitter.on('examplePass', this.examplePass.bind(this));
    emitter.on('exampleFail', this.exampleFail.bind(this));
    emitter.on('suiteComplete', this.suiteComplete.bind(this));

    this.output_stream = process.stdout;

    this.failures = [];
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
ProgressFormatter.prototype.exampleFail = function(example, error) {
    this.write('F');
    this.failures.push({example: example, error: error});
}
ProgressFormatter.prototype.suiteComplete = function(results) {
    this.writeFailures(function() {
        this.writeSummary(results);
    }.bind(this));
}
ProgressFormatter.prototype.writeFailures = function(callback) {
    if (this.failures.length == 0) {
        callback();
        return;
    }

    this.writeln("\n\nFailures:");
    var i = 1;
    async.forEachSeries(this.failures,
        function iterator(failure, next) {
            var example = failure.example, error = failure.error;
            this.locateError(example, error, function(err, location, line) {
                this.writeln();
                this.writeln('  ' + i + ') ' + example.full_description);
                this.writeln('     // ' + location);
                this.writeln('     ' + line);
                if (error.message) {
                    this.writeln('       ' + error.message);
                } else {
                    this.writeln('       expected: ' +
                                 format_variable(error.expected));
                    this.writeln('            got: ' +
                                 format_variable(error.actual));
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
    if (callback.length == 2) {
        callback(null, location);
    }
    if (!line_match) {
        callback(null, location, "<thrown from nodespec>");
        return;
    }
    get_line(line_match[1], line_match[2], function(err, line) {
        if (err)
            callback(err);
        else
            callback(null, location, line);
    });
}

function find_failed_line(error, file) {
    stack = error.stack.split("\n");
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
    data = fs.readFileSync(filename, 'utf8');
    var lines = data.split("\n");
    for (var l in lines) {
        if (l == line_no - 1) {
            callback(null, lines[l].trim());
            return;
        }
    }
    throw new Error('File end reached without finding line');
}
