var level_names = ['error', 'fail', 'pend', 'pass'];

var levels = {}
for(var i in level_names) {
    levels[level_names.length - i] = level_names[i];
};

exports.Result = Result;
function Result() {
    var level, code;
    for (level in levels) {
        this[levels[level]] = 0;
    }
    this.total = 0;
}

for (var code in levels) {
    Result[levels[code].toUpperCase()] = parseInt(code);
}

Object.defineProperty(Result.prototype, 'add', {
    value: function(result) {
        if (result instanceof SingleResult) {
            this[result.type] += 1
            this.total += 1;
        } else {
            for (var counter in result) {
                this[counter] += result[counter];
            }
        }
    }
});

Object.defineProperty(Result.prototype, 'exit_code', {
    get: function(result) {
        if (this.error > 0)
            return 2;
        else if (this.fail > 0)
            return 1;
        return 0;
    }
});

exports.SingleResult = SingleResult;
function SingleResult(result) {
    this.type = result;
    this.error = null;
}
Object.defineProperty(SingleResult.prototype, 'type', {
    get: function() { return this.__type; },
    set: function(result) {
        if (typeof result === 'number') {
            result = levels[result];
        }
        if (level_names.indexOf(result) === -1) {
            throw new Error('Uknown result type: '+result);
        }
        this.__type = result;
    }
});

// Define SingleResult.PASS etc factory methods
level_names.forEach(function(level) {
    Object.defineProperty(SingleResult, level.toUpperCase(), {
        get: function() {
            return new SingleResult(level);
        }
    });
});
