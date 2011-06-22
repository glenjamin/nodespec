var level_names = ['error', 'fail', 'pend', 'pass'];

exports.Result = Result;
function Result() {
    var i;
    for (i in level_names) {
        this[level_names[i]] = 0;
    }
    this.total = 0;
}

Object.defineProperty(Result.prototype, 'add', {
    value: function(result) {
        if (result instanceof SingleResult) {
            this[result.type] += 1
            this.total += 1;
        } else {
            for (var counter in this) {
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
    this.type = result.toLowerCase();
    this.error = null;
}

// Define SingleResult.PASS etc factory methods
level_names.forEach(function(level) {
    Object.defineProperty(SingleResult, level.toUpperCase(), {
        get: function() {
            return new SingleResult(level);
        }
    });
});
