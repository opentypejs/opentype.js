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


function printFontInfo(fname) {
    buffer = fs.readFileSync(fname);
    var font = openType.parseFont(toArrayBuffer(buffer));
    console.log("  glyphs:", font.numGlyphs, font.glyphs.length);
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

walk('/System/Library/Fonts', function (f) {
        var ext = path.extname(f).toLowerCase();
        if (ext === '.ttf' || ext === '.otf') {
            console.log(path.basename(f));
            printFontInfo(f);
        }
    }
);

