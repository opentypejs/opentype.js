<div align="center">
  <h1>opentype.js</h1>
  <a href="https://www.npmjs.com/package/opentype.js"><img alt="Latest version on npm" src="https://img.shields.io/npm/v/opentype.js.svg?style=flat" /></a>
  <a href="https://www.npmjs.com/package/opentype.js"><img alt="npm downloads, yearly" src="https://img.shields.io/npm/dy/opentype.js.svg?style=flat" /></a>
  <a href="https://github.com/opentypejs/opentype.js/blob/master/LICENSE"><img alt="MIT License" src="https://img.shields.io/github/license/opentypejs/opentype.js" /></a>
  <a href="https://github.com/opentypejs/opentype.js/actions/workflows/ci.yml?query=branch%3Amaster"><img alt="GitHub Workflow Status (with event)" src="https://img.shields.io/github/actions/workflow/status/opentypejs/opentype.js/ci.yml"></a>
  <br /><br />
</div>

It gives you access to the **letterforms** of text from the browser or Node.js.

See [https://opentype.js.org/](https://opentype.js.org/) for a live demo.

## Features

* Create a bézier path out of a piece of text.
* Support for composite glyphs (accented letters).
* Support for WOFF, OTF, TTF (both with TrueType `glyf` and PostScript `cff` outlines)
* Support for kerning (Using GPOS or the kern table).
* Support for ligatures.
* Support for TrueType font hinting.
* Support arabic text rendering (See issue #364 & PR #359 #361)
* A low memory mode is available as an option (see #329)
* Runs in the browser and Node.js.

## Installation

### via CDN

Select one of the following sources in the next example:

- https://opentype.js.org/dist/opentype.js
- https://cdn.jsdelivr.net/npm/opentype.js
- https://unpkg.com/opentype.js

```html
<!-- using global declaration -->
<script src="https://your.favorite.cdn/opentype.js"></script>
<script>opentype.parse(...)</script>

<!-- using module declaration (need full path) -->
<script type=module>
import { parse } from "https://unpkg.com/opentype.js/dist/opentype.module.js";
parse(...);
</script>
```

### via [npm](http://npmjs.org/) package manager

```sh
npm install opentype.js
```
 
```js
const opentype = require('opentype.js');

import opentype from 'opentype.js'

import { load } from 'opentype.js'
```

Using TypeScript? [See this example](./docs/examples/typescript)

## Contribute

If you plan on improving or debugging opentype.js, you can:

- Fork the [opentype.js](https://github.com/opentypejs/opentype.js) repo
- clone your fork `git clone git://github.com/yourname/opentype.js.git`
- move into the project `cd opentype.js`
- install needed dependencies with `npm install`
- make your changes
    - **option A:** for a simple build, use `npm run build`
    - **option B:** for a development server, use `npm run start` and navigate to the `/docs` folder
- check if all still works fine with `npm run test`
- commit and open a Pull Request with your changes. Thank you!

## Usage

### Loading a WOFF/OTF/TTF font

```js
// case 1: from an URL
const buffer = fetch('/fonts/my.woff').then(res => res.arrayBuffer());
// case 2: from filesystem (node)
const buffer = require('fs').promises.readFile('./my.woff');
// case 3: from an <input type=file id=myfile>
const buffer = document.getElementById('myfile').files[0].arrayBuffer();

// if running in async context:
const font = opentype.parse(await buffer);
console.log(font);

// if not running in async context:
buffer.then(data => {
    const font = opentype.parse(data);
    console.log(font);
})
```

### Loading a WOFF2 font

WOFF2 Brotli compression perform [29% better](https://www.w3.org/TR/WOFF20ER/#appendixB) than it WOFF predecessor.
But this compression is also more complex, and would result in a much heavier (&gt;10×!) opentype.js library (≈120KB => ≈1400KB).

To solve this: Decompress the font beforehand (for example with [fontello/wawoff2](https://github.com/fontello/wawoff2)).

```js
// promise-based utility to load libraries using the good old <script> tag
const loadScript = (src) => new Promise((onload) => document.documentElement.append(
  Object.assign(document.createElement('script'), {src, onload})
));

const buffer = //...same as previous example...

// load wawoff2 if needed, and wait (!) for it to be ready
if (!window.Module) {
  const path = 'https://unpkg.com/wawoff2@2.0.1/build/decompress_binding.js'
  const init = new Promise((done) => window.Module = { onRuntimeInitialized: done});
  await loadScript(path).then(() => init);
}
// decompress before parsing
const font = opentype.parse(Module.decompress(await buffer));
```

### Loading a font (1.x style)

This example relies on the deprecated `.load()` method

```js
// case 1: from an URL
const font = opentype.load('./fonts/my.woff', {}, {isUrl: true});
// case 2: from filesystem
const font = opentype.load('./fonts/my.woff', {}, {isUrl: false});

// ... play with `font` ...
console.log(font.supported);
```

### Writing a font
Once you have a `Font` object (either by using `opentype.load()` or by creating a new one from scratch) you can write it
back out as a binary file.

In the browser, you can use `Font.download()` to instruct the browser to download a binary .OTF file. The name is based
on the font name.
```javascript
// Create the bézier paths for each of the glyphs.
// Note that the .notdef glyph is required.
const notdefGlyph = new opentype.Glyph({
    name: '.notdef',
    advanceWidth: 650,
    path: new opentype.Path()
});

const aPath = new opentype.Path();
aPath.moveTo(100, 0);
aPath.lineTo(100, 700);
// more drawing instructions...
const aGlyph = new opentype.Glyph({
    name: 'A',
    unicode: 65,
    advanceWidth: 650,
    path: aPath
});

const glyphs = [notdefGlyph, aGlyph];
const font = new opentype.Font({
    familyName: 'OpenTypeSans',
    styleName: 'Medium',
    unitsPerEm: 1000,
    ascender: 800,
    descender: -200,
    glyphs: glyphs});
font.download();
```

If you want to inspect the font, use `font.toTables()`
to generate an object showing the data structures that map directly to binary values.
If you want to get an `ArrayBuffer`, use `font.toArrayBuffer()`.


### The Font object
A Font represents a loaded OpenType font file. It contains a set of glyphs and methods to draw text on a drawing context, or to get a path representing the text.

* `glyphs`: an indexed list of Glyph objects.
* `unitsPerEm`: X/Y coordinates in fonts are stored as integers. This value determines the size of the grid. Common values are `2048` and `4096`.
* `ascender`: Distance from baseline of highest ascender. In font units, not pixels.
* `descender`: Distance from baseline of lowest descender. In font units, not pixels.

#### `Font.getPath(text, x, y, fontSize, options)`
Create a Path that represents the given text.
* `x`: Horizontal position of the beginning of the text. (default: `0`)
* `y`: Vertical position of the *baseline* of the text. (default: `0`)
* `fontSize`: Size of the text in pixels (default: `72`).

Options is an optional object containing:
* `kerning`: if true takes kerning information into account (default: `true`)
* `features`: an object with [OpenType feature tags](https://docs.microsoft.com/en-us/typography/opentype/spec/featuretags) as keys, and a boolean value to enable each feature.
Currently only ligature features `"liga"` and `"rlig"` are supported (default: `true`).
* `hinting`: if true uses TrueType font hinting if available (default: `false`).

_**Note:** there is also `Font.getPaths()` with the same arguments, which returns a list of Paths._

#### `Font.draw(ctx, text, x, y, fontSize, options)`
Create a Path that represents the given text.
* `ctx`: A 2D drawing context, like Canvas.
* `x`: Horizontal position of the beginning of the text. (default: `0`)
* `y`: Vertical position of the *baseline* of the text. (default: `0`)
* `fontSize`: Size of the text in pixels (default: `72`).

Options is an optional object containing:
* `kerning`: if `true`, takes kerning information into account (default: `true`)
* `features`: an object with [OpenType feature tags](https://docs.microsoft.com/en-us/typography/opentype/spec/featuretags) as keys, and a boolean value to enable each feature.
Currently only ligature features `"liga"` and `"rlig"` are supported (default: `true`).
* `hinting`: if true uses TrueType font hinting if available (default: `false`).

#### `Font.drawPoints(ctx, text, x, y, fontSize, options)`
Draw the points of all glyphs in the text. On-curve points will be drawn in blue, off-curve points will be drawn in red. The arguments are the same as `Font.draw()`.

#### `Font.drawMetrics(ctx, text, x, y, fontSize, options)`
Draw lines indicating important font measurements for all glyphs in the text.
Black lines indicate the origin of the coordinate system (point 0,0).
Blue lines indicate the glyph bounding box.
Green line indicates the advance width of the glyph.

#### `Font.stringToGlyphs(string)`
Convert the string to a list of glyph objects.
Note that there is no strict 1-to-1 correspondence between the string and glyph list due to
possible substitutions such as ligatures. The list of returned glyphs can be larger or smaller than the length of the given string.

#### `Font.charToGlyph(char)`
Convert the character to a Glyph object. Returns `null` if the glyph could not be found. Note that this function assumes that there is a one-to-one mapping between the given character and a glyph; for complex scripts, this might not be the case.

#### `Font.getKerningValue(leftGlyph, rightGlyph)`
Retrieve the value of the [kerning pair](https://en.wikipedia.org/wiki/Kerning) between the left glyph (or its index) and the right glyph (or its index). If no kerning pair is found, return `0`. The kerning value gets added to the advance width when calculating the spacing between glyphs.

#### `Font.getAdvanceWidth(text, fontSize, options)`
Returns the advance width of a text.

This is something different than `Path.getBoundingBox()`; for example a
suffixed whitespace increases the advancewidth but not the bounding box
or an overhanging letter like a calligraphic 'f' might have a quite larger
bounding box than its advance width.

This corresponds to `canvas2dContext.measureText(text).width`
* `fontSize`: Size of the text in pixels (default: `72`).
* `options`: See `Font.getPath()`

#### The Glyph object
A Glyph is an individual mark that often corresponds to a character. Some glyphs, such as ligatures, are a combination of many characters. Glyphs are the basic building blocks of a font.

* `font`: A reference to the Font object.
* `name`: The glyph name (e.g. `"Aring"`, `"five"`)
* `unicode`: The primary unicode value of this glyph (can be `undefined`).
* `unicodes`: The list of unicode values for this glyph (most of the time this will be `1`, can also be empty).
* `index`: The index number of the glyph.
* `advanceWidth`: The width to advance the pen when drawing this glyph.
* `leftSideBearing`: The horizontal distance from the previous character to the origin (`0, 0`); a negative value indicates an overhang
* `xMin`, `yMin`, `xMax`, `yMax`: The bounding box of the glyph.
* `path`: The raw, unscaled path of the glyph.

##### `Glyph.getPath(x, y, fontSize)`
Get a scaled glyph Path object for use on a drawing context.
* `x`: Horizontal position of the glyph. (default: `0`)
* `y`: Vertical position of the *baseline* of the glyph. (default: `0`)
* `fontSize`: Font size in pixels (default: `72`).

##### `Glyph.getBoundingBox()`
Calculate the minimum bounding box for the unscaled path of the given glyph. Returns an `opentype.BoundingBox` object that contains `x1`/`y1`/`x2`/`y2`.
If the glyph has no points (e.g. a space character), all coordinates will be zero.

##### `Glyph.draw(ctx, x, y, fontSize)`
Draw the glyph on the given context.
* `ctx`: The drawing context.
* `x`: Horizontal position of the glyph. (default: `0`)
* `y`: Vertical position of the *baseline* of the glyph. (default: `0`)
* `fontSize`: Font size, in pixels (default: `72`).

##### `Glyph.drawPoints(ctx, x, y, fontSize)`
Draw the points of the glyph on the given context.
On-curve points will be drawn in blue, off-curve points will be drawn in red.
The arguments are the same as `Glyph.draw()`.

##### `Glyph.drawMetrics(ctx, x, y, fontSize)`
Draw lines indicating important font measurements for all glyphs in the text.
Black lines indicate the origin of the coordinate system (point 0,0).
Blue lines indicate the glyph bounding box.
Green line indicates the advance width of the glyph.
The arguments are the same as `Glyph.draw()`.

##### `Glyph.toPathData(options)`, `Glyph.toDOMElement(options)`, `Glyph.toSVG(options)`, `Glyph.fromSVG(pathData, options)`,
These are currently only wrapper functions for their counterparts on Path objects (see documentation there), but may be extended in the future to pass on Glyph data for automatic calculation.

### The Path object
Once you have a path through `Font.getPath()` or `Glyph.getPath()`, you can use it.

* `commands`: The path commands. Each command is a dictionary containing a type and coordinates. See below for examples.
* `fill`: The fill color of the Path. Color is a string representing a [CSS color](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value). (default: `'black'`)
* `stroke`: The stroke color of the `Path`. Color is a string representing a [CSS color](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value). (default: `null`; the path will not be stroked)
* `strokeWidth`: The line thickness of the `Path`. (default: `1`, but if `stroke` is `null` no stroke will be drawn)

##### `Path.draw(ctx)`
Draw the path on the given 2D context. This uses the `fill`, `stroke`, and `strokeWidth` properties of the Path object.
* `ctx`: The drawing context.

##### `Path.getBoundingBox()`
Calculate the minimum bounding box for the given path. Returns an `opentype.BoundingBox` object that contains `x1`/`y1`/`x2`/`y2`.
If the path is empty (e.g. a space character), all coordinates will be zero.

##### `Path.toPathData(options)`
Convert the Path to a string of path data instructions.
See https://www.w3.org/TR/SVG/paths.html#PathData
* `options`:
  * `decimalPlaces`: The amount of decimal places for floating-point values. (default: `2`)
  * `optimize`: apply some optimizations to the path data, e.g. removing unnecessary/duplicate commands (true/false, default: `true`)
  * `flipY`: whether to flip the Y axis of the path data, because SVG and font paths use inverted Y axes. (`true`: calculate from bounding box, `false`: disable; default: `true`)
  * `flipYBase`: Base value for the base flipping calculation. You'll probably want to calculate this from the font's ascender and descender values. (default: automatically calculate from the path data's bounding box)


##### `Path.toSVG(options)`
Convert the path to an SVG `<path>` element, as a string.
* `options`: see `Path.toPathData()`

##### `Path.fromSVG(pathData, options)`
Retrieve path from SVG path data. 

Either overwriting the path data for an existing path:
```js
const path = new Path();
path.fromSVG('M0 0');
```
Or creating a new Path directly:
```js
const path = Path.fromSVG('M0 0');
```
* `pathData`: Either a string of SVG path commands, or (only in browser context) an `SVGPathElement`
* `options`:
  * `decimalPlaces`, `optimize`, `flipY`, `flipYBase`: see `Path.toPathData()`
  * `scale`: scaling value applied to all command coordinates (default: `1`)
  * `x`/`y`: offset applied to all command coordinates on the x or y axis (default: `0`)

#### Path commands
* **Move To**: Move to a new position. This creates a new contour. Example: `{type: 'M', x: 100, y: 200}`
* **Line To**: Draw a line from the previous position to the given coordinate. Example: `{type: 'L', x: 100, y: 200}`
* **Curve To**: Draw a bézier curve from the current position to the given coordinate. Example: `{type: 'C', x1: 0, y1: 50, x2: 100, y2: 200, x: 100, y: 200}`
* **Quad To**: Draw a quadratic bézier curve from the current position to the given coordinate. Example: `{type: 'Q', x1: 0, y1: 50, x: 100, y: 200}`
* **Close**: Close the path. If stroked, this will draw a line from the first to the last point of the contour. Example: `{type: 'Z'}`


## Versioning

We use [SemVer](https://semver.org/) for versioning.

## License

MIT


Thanks
======
I would like to acknowledge the work of others without which opentype.js wouldn't be possible:

* [pdf.js](https://mozilla.github.io/pdf.js/): for an awesome implementation of font parsing in the browser.
* [FreeType](https://www.freetype.org/): for the nitty-gritty details and filling in the gaps when the spec was incomplete.
* [ttf.js](https://ynakajima.github.io/ttf.js/demo/glyflist/): for hints about the TrueType parsing code.
* [CFF-glyphlet-fonts](https://pomax.github.io/CFF-glyphlet-fonts/): for a great explanation/implementation of CFF font writing.
* [tiny-inflate](https://github.com/foliojs/tiny-inflate): for WOFF decompression.
* [Microsoft Typography](https://docs.microsoft.com/en-us/typography/opentype/spec/otff): the go-to reference for all things OpenType.
* [Adobe Compact Font Format spec](http://download.microsoft.com/download/8/0/1/801a191c-029d-4af3-9642-555f6fe514ee/cff.pdf) and the [Adobe Type 2 Charstring spec](http://download.microsoft.com/download/8/0/1/801a191c-029d-4af3-9642-555f6fe514ee/type2.pdf): explains the data structures and commands for the CFF glyph format.
* All [contributors](https://github.com/opentypejs/opentype.js/graphs/contributors).
