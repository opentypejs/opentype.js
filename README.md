opentype.js
===========
opentype.js is a JavaScript parser for TrueType and OpenType fonts.

It gives you access to the <strong>letterforms</strong> of text from the browser or node.js.

![Example of opentype.js](https://raw.github.com/nodebox/opentype.js/master/g/hello-world.png)

Here's an example. We load a font, then display it on a canvas with id "canvas":

    opentype.load('fonts/Roboto-Black.ttf', function (err, font) {
        if (err) {
             alert('Font could not be loaded: ' + err);
        } else {
            var ctx = document.getElementById('canvas').getContext('2d');
            // The path is always placed on the baseline, so move it down to make it visible.
            var path = font.getPath('Hello, World!', {x: 0, y: 150, fontSize: 72});
            path.draw(ctx);
        }
    }

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
##### `opentype.load(url, callback)`
Loads the font from the url and execute the callback. The callback gets `(err, font)`. Check if the err is null
before using the font.

##### `opentype.parse(buffer)`
Parse an `ArrayBuffer` containing OpenType font data and return an opentype.Font object. Check font.supported
to see if the font is in a supported format.

##### `Font.getPath(text, options)`
Get a Path representing the text. Options is an optional map containing:
* `x` and `y`: position of the path
* `fontSize`: size of the text in pixels (default: 72)
* `kerning`: if true takes kerning information into account (default: true)

##### `Font.stringToGlyphs(string)`
Convert the string to a list of glyph objects.
Note that there is no strict 1-to-1 correspondence between the string and glyph list due to 
possible substitutions such as ligatures.

##### `Font.charToGlyph(char)`
Convert the character to a glyph object. Returns null if the glyph could not be found.

##### `opentype.glyphToPath(glyph, tx, ty, scale)`
Convert the glyph to a Path we can draw on a Canvas context.

##### `opentype.drawGlyphPoints(ctx, glyph)`
Draw red and blue dots marking the points of the glyph.

##### `opentype.drawMetrics(ctx, glyph)`
Draw lines showing the glyph's bounding box, origin and advance width.

##### `Font.getKerningValue(leftGlyph, rightGlyph)`
Get the kerning value for a pair of glyphs. Return 0 if no kerning information is available.


Planned
=======
* Support for PostScript outlines.
* Better support for composite glyphs (advanced scaling and transformations).
* Support for ligatures and contextual alternates.

