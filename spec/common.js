var nodespec = require('../lib/index')('selftest');

nodespec.mockWith('sinon');

module.exports = nodespec;
