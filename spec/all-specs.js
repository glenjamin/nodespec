var fs = require('fs'),
    path = require('path');

var files = [];
function extract_spec_files(dir) {
    var resolved, stat;
    fs.readdirSync(dir).forEach(function(file) {
        resolved = path.resolve(dir, file);
        stat = fs.statSync(resolved);
        if (stat.isDirectory()) {
            extract_spec_files(resolved);
        } else if (/-(?:spec|test).js$/.test(file)) {
            files.push(resolved);
        }
    });
}

extract_spec_files(path.resolve(__dirname));

var nodespec = require('./common');

for (var i in files) {
    nodespec.require(files[i]);
}
nodespec.exec();
