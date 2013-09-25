var fs = require('fs');
var path = require('path');
var _ = require('./underscore.js');

var openType = require('./opentype.js');

function toArrayBuffer(buffer) {
    var ab = new ArrayBuffer(buffer.length);
    var view = new Uint8Array(ab);
    for (var i = 0; i < buffer.length; ++i) {
        view[i] = buffer[i];
    }
    return ab;
}


function cmapEncodingsForFont(fname) {

    buffer = fs.readFileSync(fname);
    var font = openType.parseFont(toArrayBuffer(buffer));

    _.each(font.cmapEncodingRecords, function (t) {
        console.log("  Platform", t.platformId, "Encoding", t.encodingId, "Format", t.format);
    });
}

// Recursively walk a directory and execute the function for every file.
function walk(dir, fn) {
    var files = fs.readdirSync(dir);
    _.each(files, function (f) {
        var fullName = path.join(dir, f);
        var stat = fs.statSync(fullName);
        if (stat.isFile()) {
            fn(fullName);
        } else if (stat.isDirectory()) {
            walk(fullName, fn);
        }
    });
}

walk('_fonts', function (f) {
        var ext = path.extname(f).toLowerCase();
        if (ext === '.ttf' || ext === '.otf') {
            console.log(f);
            cmapEncodingsForFont(f);
        }
    }
);


