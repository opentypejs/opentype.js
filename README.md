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
* Support for emojis and other SVG or COLR/CPAL color glyphs
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
import { parse } from "https://unpkg.com/opentype.js/dist/opentype.mjs";
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

This is done in two steps: first, we load the font file into an `ArrayBuffer` ...
```js
// either from an URL
const buffer = fetch('/fonts/my.woff').then(res => res.arrayBuffer());
// ... or from filesystem (node)
const buffer = require('fs').promises.readFile('./my.woff');
// ... or from an <input type=file id=myfile> (browser)
const buffer = document.getElementById('myfile').files[0].arrayBuffer();
```

... then we `.parse()` it into a `Font` instance
```js
// if running in async context:
const font = opentype.parse(await buffer);
console.log(font);

// if not running in async context:
buffer.then(data => {
    const font = opentype.parse(data);
    console.log(font);
})
```

<details>
<summary>Loading a WOFF2 font</summary>

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
</details>

### Craft a font

It is also possible to craft a Font from scratch by defining each glyph bézier paths.

```javascript
// this .notdef glyph is required.
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

const font = new opentype.Font({
    familyName: 'OpenTypeSans',
    styleName: 'Medium',
    unitsPerEm: 1000,
    ascender: 800,
    descender: -200,
    glyphs: [notdefGlyph, aGlyph]});
```

### Saving a Font

Once you have a `Font` object (from crafting or from `.parse()`) you can save it back out as file.

```js
// using node:fs
fs.writeFileSync("out.otf", Buffer.from(font.toArrayBuffer()));

// using the browser to createElement a <a> that will be clicked 
const href = window.URL.createObjectURL(new Blob([font.toArrayBuffer()]), {type: "font/opentype"});
Object.assign(document.createElement('a'), {download: "out.otf", href}).click();
```

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
* `options`: _{GlyphRenderOptions}_ passed to each glyph, see below

Options is an optional _{GlyphRenderOptions}_ object containing:
* `script`: script used to determine which features to apply (default: `"DFLT"` or `"latn"`)
* `language`: language system used to determine which features to apply (default: `"dflt"`)
* `kerning`: if true takes kerning information into account (default: `true`)
* `features`: an object with [OpenType feature tags](https://docs.microsoft.com/en-us/typography/opentype/spec/featuretags) as keys, and a boolean value to enable each feature.
Currently only ligature features `"liga"` and `"rlig"` are supported (default: `true`).
* `hinting`: if true uses TrueType font hinting if available (default: `false`).
* `colorFormat`: the format colors are converted to for rendering (default: `"hexa"`). Can be `"rgb"`/`"rgba"` for `rgb()`/`rgba()` output, `"hex"`/`"hexa"` for 6/8 digit hex colors, or `"hsl"`/`"hsla"` for `hsl()`/`hsla()` output. `"bgra"` outputs an object with r, g, b, a keys (r/g/b from 0-255, a from 0-1). `"raw"` outputs an integer as used in the CPAL table.
* `fill`: font color, the color used to render each glyph (default: `"black"`)

_**Note:** there is also `Font.getPaths()` with the same arguments, which returns a list of Paths._

#### `Font.draw(ctx, text, x, y, fontSize, options)`
Create a Path that represents the given text.
* `ctx`: A 2D drawing context, like Canvas.
* `x`: Horizontal position of the beginning of the text. (default: `0`)
* `y`: Vertical position of the *baseline* of the text. (default: `0`)
* `fontSize`: Size of the text in pixels (default: `72`).
* `options`: _{GlyphRenderOptions}_ passed to each glyph, see `Font.getPath()`

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
* `options`: _{GlyphRenderOptions}_, see `Font.getPath()`

#### The `Font.palettes` object (`PaletteManager`)

This allows to manage the palettes and colors in the CPAL table, without having to modify the table manually.

###### `Font.palettes.add(colors)`
Add a new palette.
* `colors`: (optional) colors to add to the palette, differences to existing palettes will be filled with the defaultValue.

###### `Font.palettes.delete(paletteIndex)`
Deletes a palette by its zero-based index
* `paletteIndex`: zero-based palette index

###### `Font.palettes.deleteColor(colorIndex, replacementIndex)`
Deletes a specific color index in all palettes and updates all layers using that color with the color currently held in the replacement index
* `colorIndex`: index of the color that should be deleted
* `replacementIndex`: index (according to the palette before deletion) of the color to replace in layers using the color to be to deleted

###### `Font.palettes.cpal()`
Returns the font's cpal table, or false if it does not exist. Used internally.

###### `Font.palettes.ensureCPAL(colors)`
Mainly used internally. Makes sure that the CPAL table exists or is populated with default values.
* `colors`: (optional) colors to populate on creation
returns `true` if it was created, `false` if it already existed.

###### `Font.palettes.extend(num)`
Extend all existing palettes and the numPaletteEntries value by a number of color slots
* `num`: number of additional color slots to add to all palettes

###### `Font.palettes.fillPalette(palette, colors, colorCount)`
Fills a set of palette colors (from a palette index, or a provided array of CPAL color values) with a set of colors, falling back to the default color value, until a given count. *It does not modify the existing palette, returning a new array instead!* Use `Font.palettes.setColor()` instead if needed.
* `palette`: palette index or an Array of CPAL color values to fill the palette with, the rest will be filled with the default color
* `colors`: array of color values to fill the palette with, in a format supported as an output of `colorFormat` in _{GlyphRenderOptions}_, see `Font.getPath()`. CSS color names are also supported in browser context.
* `colorCount`: Number of colors to fill the palette with, defaults to the value of the numPaletteEntries field

###### `Font.palettes.getAll(colorFormat)`
Returns an array of arrays of color values for each palette, optionally in a specified color format
* `colorFormat`: (optional) See _{GlyphRenderOptions}_ at `Font.getPath()`, (default: `"hexa"`)

###### `Font.palettes.getColor(index, paletteIndex, colorFormat)`
Get a specific palette by its zero-based index
* `index`: zero-based index of the color in the palette
* `paletteIndex`: zero-based palette index (default: 0)
* `colorFormat`: (optional) See _{GlyphRenderOptions}_ at `Font.getPath()`, (default: `"hexa"`)

###### `Font.palettes.get(paletteIndex, colorFormat)`
Get a specific palette by its zero-based index
* `paletteIndex`: zero-based palette index
* `colorFormat`: (optional) See _{GlyphRenderOptions}_ at `Font.getPath()`, (default: `"hexa"`)

###### `Font.palettes.setColor(index, colors, paletteIndex)`
Set one or more colors on a specific palette by its zero-based index
* `index`: zero-based color index to start filling from
* `color`: color value or array of color values in a color notation supported as an output of `colorFormat` in _{GlyphRenderOptions}_, see `Font.getPath()`. CSS color names are also supported in browser context.
* `paletteIndex`: zero-based palette index (default: 0)

###### `Font.palettes.toCPALcolor(color)`
Converts a color value string to a CPAL integer color value
* `color`: string in a color notation supported as an output of `colorFormat` in _{GlyphRenderOptions}_, see `Font.getPath()`. CSS color names are also supported in browser context.


##### The `Font.layers` object (`LayerManager`)

This allows to manage the color glyph layers in the COLR table, without having to modify the table manually.

###### `Font.layers.add(glyphIndex, layers, position)`
Adds one or more layers to a glyph, at the end or at a specific position.
* `glyphIndex`: glyph index to add the layer(s) to.
* `layers`: layer object {glyph, paletteIndex}/{glyphID, paletteIndex} or array of layer objects.
* `position`: position to insert the layers at (will default to adding at the end).

###### `Font.layers.ensureCOLR()`
Mainly used internally. Ensures that the COLR table exists and is populated with default values.

###### `Font.layers.get(glyphIndex)`
Gets the layers for a specific glyph
* `glyphIndex`
Returns an array of `{glyph, paletteIndex}` layer objects.

###### `Font.layers.remove(glyphIndex, start, end = start)`
Removes one or more layers from a glyph.
* `glyphIndex`: glyph index to remove the layer(s) from
* `start`: index to remove the layer at
* `end`: (optional) if provided, removes all layers from start index to (and including) end index

###### `Font.layers.setPaletteIndex(glyphIndex, layerIndex, paletteIndex)`
Sets a color glyph layer's paletteIndex property to a new index
* `glyphIndex`: glyph in the font by zero-based glyph index
* `layerIndex`: layer in the glyph by zero-based layer index
* `paletteIndex`: new color to set for the layer by zero-based index in any palette

###### `Font.layers.updateColrTable(glyphIndex, layers)`
Mainly used internally. Updates the colr table, adding a baseGlyphRecord if needed, ensuring that it's inserted at the correct position, updating numLayers, and adjusting firstLayerIndex values for all baseGlyphRecords according to any deletions or insertions.


##### The `Font.variation` object (`VariationManager`)
The `VariationManager` handles variable font properties using the OpenType font variation tables.

###### `Font.variation.activateDefaultVariation()`
Activates the default variation by setting its variation data as the font's default render options. Uses the default instance if available; otherwise, it defaults to the coordinates of all axes.
 
###### `Font.variation.getDefaultCoordinates()`
Returns the default coordinates for the font's variation axes.
* Returns: An object mapping axis tags to their default values.

###### `Font.variation.getDefaultInstanceIndex()`
Determines and returns the index of the default variation instance. Returns `-1` if it cannot be determined.
* Returns: Integer representing the default instance index or `-1`.

###### `Font.variation.getTransform(glyph, coords)`
Just a shortcut for [`Font.variation.process.getTransform()`](#fontvariationprocessgettransformglyph-coords).

###### `Font.variation.getInstanceIndex(coordinates)`
Finds the index of the variation instance that matches the provided coordinates, or `-1` if none match.
* `coordinates`: Object with axis tags as keys and variation values as corresponding values.
* Returns: Integer of the matching instance index or `-1`.

###### `Font.variation.getInstance(index)`
Retrieves a specific variation instance by its zero-based index.
* `index`: Zero-based index of the variation instance.
* Returns: Object representing the variation instance, or `null` if the index is invalid.

###### `Font.variation.set(instanceIdOrObject)`
Sets the variation coordinates to be used by default for rendering in the font's default render options.
* `instanceIdOrObject`: Either the zero-based index of a variation instance or an object mapping axis tags to variation values.

###### `Font.variation.get()`
Gets the current variation settings from the font's default render options.
* Returns: Object with the current variation settings.


##### The `Font.variation.process` object (`VariationProcessor`)
The `VariationProcessor` is a component of the `VariationManager`, used mainly internally for computing and applying variations to the glyphs in a variable font. It handles transformations and adjustments based on the font's variable axes and instances.

###### `Font.variation.process.getNormalizedCoords(coords)`
Returns normalized coordinates for the variation axes based on the current settings.
* `coords`: The coordinates object to normalize (or the variation coords in the font's `defaultRenderOptions` by default)
* Returns: Normalized coordinates as an object mapping axis tags to normalized values.

###### `Font.variation.process.interpolatePoints(points, deltas, scalar)`
Interpolates points based on provided deltas and a scalar value.
* `points`: Array of original points.
* `deltas`: Array of point deltas.
* `scalar`: Scalar value for interpolation.
* Returns: Array of interpolated points.

###### `Font.variation.process.deltaInterpolate(original, deltaValues, scalar)`
Calculates the interpolated value for a single point given original values, deltas, and a scalar.
* `original`: Original value of the point.
* `deltaValues`: Array of delta values for the point.
* `scalar`: Scalar value for interpolation.
* Returns: Interpolated value.

###### `Font.variation.process.deltaShift(points, deltas)`
Applies delta values to shift points.
* `points`: Array of original points.
* `deltas`: Array of deltas to apply.
* Returns: Array of shifted points.

###### `Font.variation.process.transformComponents(components, transformation)`
Transforms components of a glyph using a specified transformation matrix.
* `components`: Components of the glyph.
* `transformation`: Transformation matrix to apply.
* Returns: Transformed components.

###### `Font.variation.process.getTransform(glyph, coords)`
Retrieves a transformed copy of a glyph based on the provided variation coordinates, or the glyph itself if no variation was applied
* `glyph`: Glyph or index of glyph to transform.
* `coords`: Variation coords object (or the variation coords in the font's `defaultRenderOptions` by default)
* Returns: `opentype.Glyph`

###### `Font.variation.process.getVariableAdjustment(adjustment)`
Calculates the variable adjustment for a given adjustment parameter.
* `adjustment`: Adjustment parameter.
* Returns: Adjusted value based on current variation settings.

###### `Font.variation.process.getDelta(deltas)`
Selects the appropriate delta values from a collection of deltas based on the current variation settings.
* `deltas`: Collection of delta values.
* Returns: Appropriate delta values for the current settings.

###### `Font.variation.process.getBlendVector()`
Computes the blend vector for interpolations based on the current settings.
* Returns: Blend vector used for interpolation calculations.


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

##### `Glyph.getPath(x, y, fontSize, options, font)`
Get a scaled glyph Path object for use on a drawing context.
* `x`: Horizontal position of the glyph. (default: `0`)
* `y`: Vertical position of the *baseline* of the glyph. (default: `0`)
* `fontSize`: Font size in pixels (default: `72`).
* `options`: _{GlyphRenderOptions}_, see `Font.getPath()`
* `font`: a font object, needed for rendering COLR/CPAL fonts to get the layers and colors

##### `Glyph.getBoundingBox()`
Calculate the minimum bounding box for the unscaled path of the given glyph. Returns an `opentype.BoundingBox` object that contains `x1`/`y1`/`x2`/`y2`.
If the glyph has no points (e.g. a space character), all coordinates will be zero.

##### `Glyph.draw(ctx, x, y, fontSize, options, font)`
Draw the glyph on the given context.
* `ctx`: The drawing context.
* `x`: Horizontal position of the glyph. (default: `0`)
* `y`: Vertical position of the *baseline* of the glyph. (default: `0`)
* `fontSize`: Font size, in pixels (default: `72`).
* `options`: _{GlyphRenderOptions}_, see `Font.getPath()`
* `font`: a font object, needed for rendering COLR/CPAL fonts to get the layers and colors

##### `Glyph.drawPoints(ctx, x, y, fontSize, options, font)`
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

##### `Glyph.getLayers(font)`
Gets the color glyph layers for this glyph from the specified font's COLR/CPAL tables

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
We would like to acknowledge the work of others without which opentype.js wouldn't be possible:

* [pdf.js](https://mozilla.github.io/pdf.js/): for an awesome implementation of font parsing in the browser.
* [FreeType](https://www.freetype.org/): for the nitty-gritty details and filling in the gaps when the spec was incomplete.
* [ttf.js](https://ynakajima.github.io/ttf.js/demo/glyflist/): for hints about the TrueType parsing code.
* [CFF-glyphlet-fonts](https://pomax.github.io/CFF-glyphlet-fonts/): for a great explanation/implementation of CFF font writing.
* [fontkit](https://github.com/foliojs/fontkit/): for a great implementation of CFF2 parsing and variable font features
* [tiny-inflate](https://github.com/foliojs/tiny-inflate): for WOFF decompression.
* [Microsoft Typography](https://docs.microsoft.com/en-us/typography/opentype/spec/otff): the go-to reference for all things OpenType.
* [Adobe Compact Font Format spec](http://download.microsoft.com/download/8/0/1/801a191c-029d-4af3-9642-555f6fe514ee/cff.pdf) and the [Adobe Type 2 Charstring spec](http://download.microsoft.com/download/8/0/1/801a191c-029d-4af3-9642-555f6fe514ee/type2.pdf): explains the data structures and commands for the CFF glyph format.
* All [contributors](https://github.com/opentypejs/opentype.js/graphs/contributors).
