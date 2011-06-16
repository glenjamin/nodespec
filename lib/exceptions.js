var util = require('util');

exports.Pending = Pending;
function Pending(reason) {
    this.name = 'Pending';
    if (reason)
        this.message = reason;
    Error.captureStackTrace(this, Pending);
}
util.inherits(Pending, Error);
