var util = require('util');

exports.Pending = Pending;
function Pending(reason) {
    Error.call(this, reason);
}
util.inherits(Error, Pending);
