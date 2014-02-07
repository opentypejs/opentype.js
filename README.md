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
            // Construct a Path object containing the letter shapes of the given text.
            // The other parameters are x, y and fontSize.
            // Note that y is the position of the baseline.
            var path = font.getPath('Hello, World!', 0, 150, 72);
            // If you just want to draw the text you can also use font.draw(ctx, text, x, y, fontSize).
            path.draw(ctx);
        }
    }

See [the project website](http://nodebox.github.io/opentype.js/) for a live demo.

Features
========
* Create a bézier path out of a piece of text.
* Support for composite glyphs (accented letters).
* Support for OpenType (glyf) and PostScript (cff) shapes.
* Kerning support for OpenType shapes (configurable and on by default).
* Very efficient.
* Runs in the browser and node.js.

API
===
##### `opentype.load(url, callback)`
Load the font from the url and execute the callback. The callback gets `(err, font)` where `font` is a Font object. Check if the `err` is null before using the font.

##### `opentype.parse(buffer)`
Parse an `ArrayBuffer` containing OpenType font data and return a `Font` object. This method always returns a Font, but check font.supported to see if the font is in a supported format. The most common cause for unsupported fonts are fonts with Postscript outlines, which we do not yet support.

#### The Font object
A Font represents a loaded OpenType font file. It contains a set of glyphs and methods to draw text on a drawing context, or to get a path representing the text.

* `glyphs`: an indexed list of Glyph objects.
* `unitsPerEm`: X/Y coordinates in fonts are stored as integers. This value determines the size of the grid. Common values are 2048 and 4096.

##### `Font.getPath(text, x, y, fontSize, options)`
Create a Path that represents the given text.
* `x`: Horizontal position of the beginning of the text. (default: 0)
* `y`: Vertical position of the *baseline* of the text. (default: 0)
* `fontSize`: Size of the text in pixels (default: 72).

Options is an optional object containing:
* `kerning`: if true takes kerning information into account (default: true)


##### `Font.draw(ctx, text, x, y, fontSize, options)`
Create a Path that represents the given text.
* `ctx`: A 2D drawing context, like Canvas.
* `x`: Horizontal position of the beginning of the text. (default: 0)
* `y`: Vertical position of the *baseline* of the text. (default: 0)
* `fontSize`: Size of the text in pixels (default: 72).

Options is an optional object containing:
* `kerning`: if true takes kerning information into account (default: true)

##### `Font.drawPoints(ctx, text, x, y, fontSize, options)`
Draw the points of all glyphs in the text. On-curve points will be drawn in blue, off-curve points will be drawn in red. The arguments are the same as `Font.draw`.

##### `Font.drawMetrics(ctx, text, x, y, fontSize, options)`
Draw lines indicating important font measurements for all glyphs in the text.
Black lines indicate the origin of the coordinate system (point 0,0).
Blue lines indicate the glyph bounding box.
Green line indicates the advance width of the glyph.

##### `Font.stringToGlyphs(string)`
Convert the string to a list of glyph objects.
Note that there is no strict 1-to-1 correspondence between the string and glyph list due to
possible substitutions such as ligatures. The list of returned glyphs can be larger or smaller than the length of the given string.

##### `Font.charToGlyph(char)`
Convert the character to a `Glyph` object. Returns null if the glyph could not be found. Note that this function assumes that there is a one-to-one mapping between the given character and a glyph; for complex scripts this might not be the case.

##### `Font.getKerningValue(leftGlyph, rightGlyph)`
Retrieve the value of the [kerning pair](https://en.wikipedia.org/wiki/Kerning) between the left glyph (or its index) and the right glyph (or its index). If no kerning pair is found, return 0. The kerning value gets added to the advance width when calculating the spacing between glyphs.

#### The Glyph object
A Glyph is an individual mark that often corresponds to a character. Some glyphs, such as ligatures, are a combination of many characters. Glyphs are the basic building blocks of a font.

* `font`: A reference to the `Font` object.
* `index`: The index number of the glyph.
* `xMin`, `yMin`, `xMax`, `yMax`: The bounding box of the glyph.
* `points`: The list of points in the glyph. Note that it's more convenient to use `glyph.getPath`.

##### `Glyph.getPath(x, y, fontSize)`
Convert the glyph to a Path we can draw on a drawing context.
* `x`: Horizontal position of the glyph. (default: 0)
* `y`: Vertical position of the *baseline* of the glyph. (default: 0)
* `fontSize`: Font size in pixels (default: 72).

##### `Glyph.draw(ctx, x, y, fontSize)`
Draw the glyph on the given context.
* `ctx`: The drawing context.
* `x`: Horizontal position of the glyph. (default: 0)
* `y`: Vertical position of the *baseline* of the glyph. (default: 0)
* `fontSize`: Font size, in pixels (default: 72).

##### `Glyph.drawPoints(ctx, x, y, fontSize)`
Draw the points of the glyph on the given context.
On-curve points will be drawn in blue, off-curve points will be drawn in red.
The arguments are the same as `Glyph.draw`.

##### `Glyph.drawMetrics(ctx, x, y, fontSize)`
Draw lines indicating important font measurements for all glyphs in the text.
Black lines indicate the origin of the coordinate system (point 0,0).
Blue lines indicate the glyph bounding box.
Green line indicates the advance width of the glyph.
The arguments are the same as `Glyph.draw`.


Planned
=======
* Kerning support for PostScript shapes.
* Better support for composite glyphs (advanced scaling and transformations).
* Support for ligatures and contextual alternates.
* Support for SVG paths.
