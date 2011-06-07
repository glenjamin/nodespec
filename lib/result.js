var levels = {
    4: 'error',
    3: 'fail',
    2: 'pend',
    1: 'pass'
};

exports.Result = Result;
function Result() {
    var level, code;
    for (level in levels) {
        this[levels[level]] = 0;
    }
    this.total = 0;
}

(function() {
    for (var code in levels) {
        Result[levels[code].toUpperCase()] = parseInt(code);
    }
})();

Object.defineProperty(Result.prototype, 'add', {
    value: function(result) {
        if (typeof result === 'number') {
            result = levels[result];
        }
        if (this[result] === undefined) {
            throw new Error('Uknown result type: '+result);
        }
        this[result] += 1;
        this.total += 1;
    }
});

Object.defineProperty(Result.prototype, 'merge', {
    value: function(other) {
        for (var counter in other) {
            this[counter] += other[counter];
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

