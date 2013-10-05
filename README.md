opentype.js
===========
opentype.js is a JavaScript parser for TrueType and OpenType fonts.

It gives you access to the <strong>letterforms</strong> of text from the browser or node.js.

![Example of opentype.js](https://raw.github.com/nodebox/opentype.js/master/g/hello-world.png)

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

See [the project website](http://nodebox.github.io/opentype.js/) for a live demo.

Features
========
* Create a bézier path out of a piece of text.
* Support for composite glyphs (accented letters).
* Support for kerning tables (configurable and on by default).
* Very efficient.
* Runs in the browser and node.js.

API
===
##### `opentype.loadFont(pathToFontFile, success, error)`
Loads the font from the passed path and pass the opentype.Font object into the success callback

##### `opentype.parseFont(buffer)`
Parse the OpenType file (as an `ArrayBuffer`) and returns an opentype.Font object.

##### `opentype.Font.getPath(text, options)`
Get a Path representing the text. Options is an optional map containing:
* `x` and `y`: position of the path
* `fontSize`: size of the text in pixels (default: 72)
* `kerning`: if true takes kerning information into account (default: true)

##### `opentype.Font.stringToGlyphs(string)`
Convert the string to a list of glyph objects.
Note that there is no strict 1-to-1 correspondence between the string and glyph list due to
possible substitutions such as ligatures.

##### `path.draw(ctx, options)`
Draw the path to the given context. Context can be either a CanvasRenderingContext2D or a SVG element.
Options is an optional map containing:
* `fill` and `stroke`: colors fill and stroke (default is `{fill: 'black'}`)

##### `path.drawPoints(ctx)`
Draw red and blue dots marking the points of the glyph.

##### `path.drawMetrics(ctx, options)`
Draw lines showing the glyph's bounding box, origin and advance width.
Options is an optional map containing:
* settings for `origin`, `glyphBox` and `advanceWidth` containing `color` and `overlap` of the lines

##### `opentype.Font.charToGlyph(char)`
Convert the character to a glyph object. Returns null if the glyph could not be found.

##### `opentype.glyphToPath(glyph, tx, ty, scale)`
Convert the glyph to a Path we can draw on a Canvas context.

##### `opentype.Font.getKerningValue(leftGlyph, rightGlyph)`
Get the kerning value for a pair of glyphs. Return 0 if no kerning information is available.



Planned
=======
* Support for PostScript outlines.
* Better support for composite glyphs (advanced scaling and transformations).
* Support for ligatures and contextual alternates.

