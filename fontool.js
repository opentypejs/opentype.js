var fs = require('fs');
var path = require('path');

var openType = require('./opentype.js');

function toArrayBuffer(buffer) {
    var ab = new ArrayBuffer(buffer.length);
    var view = new Uint8Array(ab);
    for (var i = 0; i < buffer.length; ++i) {
        view[i] = buffer[i];
    }
    return ab;
}

function parseFont(file) {
    var buffer;
    buffer = fs.readFileSync(file);
    return openType.parseFont(toArrayBuffer(buffer));
}


function printFontInfo(font) {
    console.log("  glyphs:", font.numGlyphs, font.glyphs.length);
    console.log("  kerning:", Object.keys(font.kerningPairs).length);
}

// Recursively walk a directory and execute the function for every file.
function walk(dir, fn) {
    var files, i, file;
    files = fs.readdirSync(dir);
    for (i = 0; i < files.length; i += 1) {
        file = files[i];
        var fullName = path.join(dir, file);
        var stat = fs.statSync(fullName);
        if (stat.isFile()) {
            fn(fullName);
        } else if (stat.isDirectory()) {
            walk(fullName, fn);
        }
    }
}

var fontDirectory = path.join(process.env['HOME'], 'Library', 'Fonts');

walk(fontDirectory, function (f) {
        var ext, font;
        ext = path.extname(f).toLowerCase();
        if (ext === '.ttf' || ext === '.otf') {
            font = parseFont(f);
            if (font.supported) {
                console.log(path.basename(f));
                printFontInfo(font);
            }
        }
    }
);

