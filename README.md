opentype.js
===========
opentype.js is a JavaScript parser for TrueType and OpenType fonts.

It gives you access to the <strong>letterforms</strong> of text from the browser or node.js.

Here's an example. We load a font using an XMLHttpRequest, then display it on a canvas with id "canvas":

    var req = new XMLHttpRequest();
    req.open('get', 'fonts/Roboto-Black.ttf', true);
    req.responseType = 'arraybuffer';
    req.onload = function () {
        var arrayBuffer = req.response;
        var font = opentype.parseFont(arrayBuffer);
        if (!font.supported) {
            alert('This font is not supported.');
        }
        var ctx = document.getElementById('canvas').getContext('2d');
        // The path is always placed on the baseline, so move it down to make it visible.
        var path = font.getPath('Hello, World!', {x: 0, y: 150, fontSize: 72});
        path.draw(ctx);
    };
    req.send(null);

See `index.html` for a bigger example.

Features
========
* Create a bézier path out of a piece of text.
* Support for composite glyphs (accented letters).
* Support for kerning tables (configurable and on by default).
* Very efficient.
* Runs in the browser and node.js.

Planned
=======
* Support for PostScript outlines.
* Better support for composite glyphs (advanced scaling and transformations).
* Support for ligatures and contextual alternates.

