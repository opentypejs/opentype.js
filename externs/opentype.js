/**
 * @fileoverview Closure Compiler externs for opentype.js generated from source JSDoc.
 * @externs
 */

/** @const */
var opentype = {};

/**
 * @typedef NamePlatform
 * @type {{
 *      fontFamily: Object<string,string>,
 *      fontSubfamily: Object<string,string>,
 *      fullName: Object<string,string>,
 *      postScriptName: Object<string,string>,
 *      designer: Object<string,string>,
 *      designerURL: Object<string,string>,
 *      manufacturer: Object<string,string>,
 *      manufacturerURL: Object<string,string>,
 *      license: Object<string,string>,
 *      licenseURL: Object<string,string>,
 *      version: Object<string,string>,
 *      description: Object<string,string>,
 *      copyright: Object<string,string>,
 *      trademark: Object<string,string>
 * }}
 */
var NamePlatform;

/**
 * @typedef FontOptions
 * @type Object
 * @property {Boolean} empty - whether to create a new empty font
 * @property {string} familyName
 * @property {string} styleName
 * @property {string=} fullName
 * @property {string=} postScriptName
 * @property {string=} designer
 * @property {string=} designerURL
 * @property {string=} manufacturer
 * @property {string=} manufacturerURL
 * @property {string=} license
 * @property {string=} licenseURL
 * @property {string=} version
 * @property {string=} description
 * @property {string=} copyright
 * @property {string=} trademark
 * @property {Number} unitsPerEm
 * @property {Number} ascender
 * @property {Number} descender
 * @property {Number} createdTimestamp
 * @property {Number} weightClass
 * @property {Number} italicAngle
 * @property {string=} widthClass
 * @property {string=} fsSelection
 */
var FontOptions;

/**
 * @typedef GlyphRenderOptions
 * @type Object
 * @property {string} [script] - script used to determine which features to apply. By default, 'DFLT' or 'latn' is used.
 *                               See https://www.microsoft.com/typography/otspec/scripttags.htm
 * @property {string} [language='dflt'] - language system used to determine which features to apply.
 *                                        See https://www.microsoft.com/typography/developers/opentype/languagetags.aspx
 * @property {boolean} [kerning=true] - whether to include kerning values
 * @property {object} [features] - OpenType Layout feature tags. Used to enable or disable the features of the given script/language system.
 *                                 See https://www.microsoft.com/typography/otspec/featuretags.htm
 * @property {boolean} [hinting=false] - whether to apply font hinting to the outlines
 * @property {integer} [usePalette=0] For COLR/CPAL fonts, the zero-based index of the color palette to use. (Use `Font.palettes.get()` to get the available palettes)
 * @property {boolean} [drawLayers=true] For COLR/CPAL fonts, this can be turned to false in order to draw the fallback glyphs instead
 * @property {boolean} [drawSVG=true] For SVG fonts, this can be turned to false in order to draw the fallback glyphs instead
 */
var GlyphRenderOptions;

/**
 * @typedef GlyphOptions
 * @type Object
 * @property {string} [name] - The glyph name
 * @property {number} [unicode]
 * @property {Array} [unicodes]
 * @property {number} [xMin]
 * @property {number} [yMin]
 * @property {number} [xMax]
 * @property {number} [yMax]
 * @property {number} [advanceWidth]
 * @property {number} [leftSideBearing]
 */
var GlyphOptions;

/**
 * @typedef {Object} SVGImage
 * @prop {number} leftSideBearing
 * @prop {number} baseline
 * @prop {HTMLImageElement} image
 */
var SVGImage;

/**
 * A Font represents a loaded OpenType font file.
 * It contains a set of glyphs and methods to draw text on a drawing context,
 * or to get a path representing the text.
 * @exports opentype.Font
 * @class
 * @param {FontOptions}
 * @constructor
 */
opentype.Font = function() {};

/**
 * @exports opentype.Glyph
 * @class
 * @param {GlyphOptions}
 * @constructor
 */
opentype.Glyph = function() {};

/**
 * A bézier path containing a set of path commands similar to a SVG path.
 * Paths can be drawn on a context using `draw`.
 * @exports opentype.Path
 * @class
 * @constructor
 */
opentype.Path = function() {};

/**
 * A bounding box is an enclosing box that describes the smallest measure within which all the points lie.
 * It is used to calculate the bounding box of a glyph or text path.
 *
 * On initialization, x1/y1/x2/y2 will be NaN. Check if the bounding box is empty using `isEmpty()`.
 *
 * @exports opentype.BoundingBox
 * @class
 * @constructor
 */
opentype.BoundingBox = function() {};

/**
 * Parse the OpenType file data (as an ArrayBuffer) and return a Font object.
 * Throws an error if the font could not be parsed.
 * @param  {ArrayBuffer}
 * @param  {Object} opt - options for parsing
 * @return {opentype.Font}
 */
opentype.parse = function() {};

/**
 * Asynchronously load the font from a URL or a filesystem. When done, call the callback
 * with two arguments `(err, font)`. The `err` will be null on success,
 * the `font` is a Font object.
 * We use the node.js callback convention so that
 * opentype.js can integrate with frameworks like async.js.
 * @alias opentype.load
 * @deprecated
 */
opentype.load = function() {};

/**
 * Synchronously load the font from a URL or file.
 * When done, returns the font object or throws an error.
 * @alias opentype.loadSync
 * @deprecated
 */
opentype.loadSync = function() {};

/**
     * The minimum X coordinate of the bounding box.
     * @type {number}
     */
opentype.BoundingBox.prototype.x1 = function() {};

/**
     * The minimum Y coordinate of the bounding box.
     * @type {number}
     */
opentype.BoundingBox.prototype.y1 = function() {};

/**
     * The maximum X coordinate of the bounding box.
     * @type {number}
     */
opentype.BoundingBox.prototype.x2 = function() {};

/**
     * The maximum Y coordinate of the bounding box.
     * @type {number}
     */
opentype.BoundingBox.prototype.y2 = function() {};

/**
 * Returns true if the bounding box is empty, that is, no points have been added to the box yet.
 */
opentype.BoundingBox.prototype.isEmpty = function() {};

/**
 * Add the point to the bounding box.
 * The x1/y1/x2/y2 coordinates of the bounding box will now encompass the given point.
 * @param {number} x - The X coordinate of the point.
 * @param {number} y - The Y coordinate of the point.
 */
opentype.BoundingBox.prototype.addPoint = function() {};

/**
 * Add a X coordinate to the bounding box.
 * This extends the bounding box to include the X coordinate.
 * This function is used internally inside of addBezier.
 * @param {number} x - The X coordinate of the point.
 */
opentype.BoundingBox.prototype.addX = function() {};

/**
 * Add a Y coordinate to the bounding box.
 * This extends the bounding box to include the Y coordinate.
 * This function is used internally inside of addBezier.
 * @param {number} y - The Y coordinate of the point.
 */
opentype.BoundingBox.prototype.addY = function() {};

/**
 * Add a Bézier curve to the bounding box.
 * This extends the bounding box to include the entire Bézier.
 * @param {number} x0 - The starting X coordinate.
 * @param {number} y0 - The starting Y coordinate.
 * @param {number} x1 - The X coordinate of the first control point.
 * @param {number} y1 - The Y coordinate of the first control point.
 * @param {number} x2 - The X coordinate of the second control point.
 * @param {number} y2 - The Y coordinate of the second control point.
 * @param {number} x - The ending X coordinate.
 * @param {number} y - The ending Y coordinate.
 */
opentype.BoundingBox.prototype.addBezier = function() {};

/**
 * Add a quadratic curve to the bounding box.
 * This extends the bounding box to include the entire quadratic curve.
 * @param {number} x0 - The starting X coordinate.
 * @param {number} y0 - The starting Y coordinate.
 * @param {number} x1 - The X coordinate of the control point.
 * @param {number} y1 - The Y coordinate of the control point.
 * @param {number} x - The ending X coordinate.
 * @param {number} y - The ending Y coordinate.
 */
opentype.BoundingBox.prototype.addQuad = function() {};

/**
     * Variable font variation data, available if the font has variable axes (gvar or cff2 tables).
     * @type {VariationManager|undefined}
     * @alias opentype.Font.prototype.variation
     */
opentype.Font.prototype.variation = function() {};

/**
         * Font name information in multiple languages and platforms.
         * @type {{unicode: ?NamePlatform, macintosh: ?NamePlatform, windows: ?NamePlatform}}
         */
opentype.Font.prototype.names = function() {};

/**
         * Units per em (the font design grid size).
         * @type {number}
         */
opentype.Font.prototype.unitsPerEm = function() {};

/**
         * The ascender value of the font.
         * @type {number}
         */
opentype.Font.prototype.ascender = function() {};

/**
         * The descender value of the font (typically negative).
         * @type {number}
         */
opentype.Font.prototype.descender = function() {};

/**
         * Unix timestamp when the font was created.
         * @type {number}
         */
opentype.Font.prototype.createdTimestamp = function() {};

/**
         * The italic angle of the font in degrees.
         * @type {number}
         */
opentype.Font.prototype.italicAngle = function() {};

/**
         * The weight class of the font (100-900).
         * @type {number}
         */
opentype.Font.prototype.weightClass = function() {};

/**
         * Font table objects containing raw table data.
         * @type {Object}
         */
opentype.Font.prototype.tables = function() {};

/**
     * Indicates if the font is supported. Deprecated - errors are thrown during parsing if font is unsupported.
     * @type {boolean}
     */
opentype.Font.prototype.supported = function() {};

/**
     * The set of glyphs in this font.
     * @type {glyphset.GlyphSet}
     */
opentype.Font.prototype.glyphs = function() {};

/**
     * Character encoding table for the font.
     * @type {Object}
     */
opentype.Font.prototype.encoding = function() {};

/**
     * Glyph positioning information for OpenType layout features.
     * @type {Object}
     */
opentype.Font.prototype.position = function() {};

/**
     * Glyph substitution information for OpenType layout features.
     * @type {Object}
     */
opentype.Font.prototype.substitution = function() {};

/**
     * Color palette manager for COLR/CPAL color fonts.
     * @type {Object}
     */
opentype.Font.prototype.palettes = function() {};

/**
     * Layer manager for COLR layered color fonts.
     * @type {Object}
     */
opentype.Font.prototype.layers = function() {};

/**
     * SVG image manager for SVG table color fonts.
     * @type {Object}
     */
opentype.Font.prototype.svgImages = function() {};

/**
 * Check if the font has a glyph for the given character.
 * @param  {string}
 * @return {Boolean}
 */
opentype.Font.prototype.hasChar = function() {};

/**
 * Convert the given character to a single glyph index.
 * Note that this function assumes that there is a one-to-one mapping between
 * the given character and a glyph; for complex scripts this might not be the case.
 * @param  {string}
 * @return {Number}
 */
opentype.Font.prototype.charToGlyphIndex = function() {};

/**
 * Convert the given character to a single Glyph object.
 * Note that this function assumes that there is a one-to-one mapping between
 * the given character and a glyph; for complex scripts this might not be the case.
 * @param  {string}
 * @return {opentype.Glyph}
 */
opentype.Font.prototype.charToGlyph = function() {};

/**
 * Update features
 * @param {any} options features options
 */
opentype.Font.prototype.updateFeatures = function() {};

/**
 * Convert the given text to a list of Glyph indexes.
 * Note that there is no strict one-to-one mapping between characters and
 * glyphs, so the list of returned glyph indexes can be larger or smaller than the
 * length of the given string.
 * @param  {string}
 * @param  {GlyphRenderOptions} [options]
 * @return {number[]}
 */
opentype.Font.prototype.stringToGlyphIndexes = function() {};

/**
 * Convert the given text to a list of Glyph objects.
 * Note that there is no strict one-to-one mapping between characters and
 * glyphs, so the list of returned glyphs can be larger or smaller than the
 * length of the given string.
 * @param  {string}
 * @param  {GlyphRenderOptions} [options]
 * @return {opentype.Glyph[]}
 */
opentype.Font.prototype.stringToGlyphs = function() {};

/**
 * @param  {string}
 * @return {Number}
 */
opentype.Font.prototype.nameToGlyphIndex = function() {};

/**
 * @param  {string}
 * @return {opentype.Glyph}
 */
opentype.Font.prototype.nameToGlyph = function() {};

/**
 * @param  {Number}
 * @return {String}
 */
opentype.Font.prototype.glyphIndexToName = function() {};

/**
 * Retrieve the value of the kerning pair between the left glyph (or its index)
 * and the right glyph (or its index). If no kerning pair is found, return 0.
 * The kerning value gets added to the advance width when calculating the spacing
 * between glyphs.
 * For GPOS kerning, this method uses the default script and language, which covers
 * most use cases. To have greater control, use font.position.getKerningValue .
 * @param  {opentype.Glyph} leftGlyph
 * @param  {opentype.Glyph} rightGlyph
 * @return {Number}
 */
opentype.Font.prototype.getKerningValue = function() {};

/**
 * @typedef GlyphRenderOptions
 * @type Object
 * @property {string} [script] - script used to determine which features to apply. By default, 'DFLT' or 'latn' is used.
 *                               See https://www.microsoft.com/typography/otspec/scripttags.htm
 * @property {string} [language='dflt'] - language system used to determine which features to apply.
 *                                        See https://www.microsoft.com/typography/developers/opentype/languagetags.aspx
 * @property {boolean} [kerning=true] - whether to include kerning values
 * @property {object} [features] - OpenType Layout feature tags. Used to enable or disable the features of the given script/language system.
 *                                 See https://www.microsoft.com/typography/otspec/featuretags.htm
 * @property {boolean} [hinting=false] - whether to apply font hinting to the outlines
 * @property {integer} [usePalette=0] For COLR/CPAL fonts, the zero-based index of the color palette to use. (Use `Font.palettes.get()` to get the available palettes)
 * @property {boolean} [drawLayers=true] For COLR/CPAL fonts, this can be turned to false in order to draw the fallback glyphs instead
 * @property {boolean} [drawSVG=true] For SVG fonts, this can be turned to false in order to draw the fallback glyphs instead
 */
opentype.Font.prototype.defaultRenderOptions = function() {};

/**
 * Helper function that invokes the given callback for each glyph in the given text.
 * The callback gets `(glyph, x, y, fontSize, options)`.
 * @param {string} text - The text to apply.
 * @param  {number} [x=0] - Horizontal position of the beginning of the text.
 * @param  {number} [y=0] - Vertical position of the *baseline* of the text.
 * @param  {number} [fontSize=72] - Font size in pixels. We scale the glyph units by `1 / unitsPerEm * fontSize`.
 * @param  {GlyphRenderOptions=} options
 * @param  {Function} callback
 */
opentype.Font.prototype.forEachGlyph = function() {};

/**
 * Create a Path object that represents the given text.
 * @param  {string} text - The text to create.
 * @param  {number} [x=0] - Horizontal position of the beginning of the text.
 * @param  {number} [y=0] - Vertical position of the *baseline* of the text.
 * @param  {number} [fontSize=72] - Font size in pixels. We scale the glyph units by `1 / unitsPerEm * fontSize`.
 * @param  {GlyphRenderOptions=} options
 * @return {opentype.Path}
 */
opentype.Font.prototype.getPath = function() {};

/**
 * Create an array of Path objects that represent the glyphs of a given text.
 * @param  {string} text - The text to create.
 * @param  {number} [x=0] - Horizontal position of the beginning of the text.
 * @param  {number} [y=0] - Vertical position of the *baseline* of the text.
 * @param  {number} [fontSize=72] - Font size in pixels. We scale the glyph units by `1 / unitsPerEm * fontSize`.
 * @param  {GlyphRenderOptions=} options
 * @return {opentype.Path[]}
 */
opentype.Font.prototype.getPaths = function() {};

/**
 * Returns the advance width of a text.
 *
 * This is something different than Path.getBoundingBox() as for example a
 * suffixed whitespace increases the advanceWidth but not the bounding box
 * or an overhanging letter like a calligraphic 'f' might have a quite larger
 * bounding box than its advance width.
 *
 * This corresponds to canvas2dContext.measureText(text).width
 *
 * @param  {string} text - The text to create.
 * @param  {number} [fontSize=72] - Font size in pixels. We scale the glyph units by `1 / unitsPerEm * fontSize`.
 * @param  {GlyphRenderOptions=} options
 * @return advance width
 */
opentype.Font.prototype.getAdvanceWidth = function() {};

/**
 * Draw the text on the given drawing context.
 * @param  {CanvasRenderingContext2D} ctx - A 2D drawing context, like Canvas.
 * @param  {string} text - The text to create.
 * @param  {number} [x=0] - Horizontal position of the beginning of the text.
 * @param  {number} [y=0] - Vertical position of the *baseline* of the text.
 * @param  {number} [fontSize=72] - Font size in pixels. We scale the glyph units by `1 / unitsPerEm * fontSize`.
 * @param  {GlyphRenderOptions=} options
 */
opentype.Font.prototype.draw = function() {};

/**
 * Draw the points of all glyphs in the text.
 * On-curve points will be drawn in blue, off-curve points will be drawn in red.
 * @param {CanvasRenderingContext2D} ctx - A 2D drawing context, like Canvas.
 * @param {string} text - The text to create.
 * @param {number} [x=0] - Horizontal position of the beginning of the text.
 * @param {number} [y=0] - Vertical position of the *baseline* of the text.
 * @param {number} [fontSize=72] - Font size in pixels. We scale the glyph units by `1 / unitsPerEm * fontSize`.
 * @param {GlyphRenderOptions=} options
 */
opentype.Font.prototype.drawPoints = function() {};

/**
 * Draw lines indicating important font measurements for all glyphs in the text.
 * Black lines indicate the origin of the coordinate system (point 0,0).
 * Blue lines indicate the glyph bounding box.
 * Green line indicates the advance width of the glyph.
 * @param {CanvasRenderingContext2D} ctx - A 2D drawing context, like Canvas.
 * @param {string} text - The text to create.
 * @param {number} [x=0] - Horizontal position of the beginning of the text.
 * @param {number} [y=0] - Vertical position of the *baseline* of the text.
 * @param {number} [fontSize=72] - Font size in pixels. We scale the glyph units by `1 / unitsPerEm * fontSize`.
 * @param {GlyphRenderOptions=} options
 */
opentype.Font.prototype.drawMetrics = function() {};

/**
 * @param  {string}
 * @return {string}
 */
opentype.Font.prototype.getEnglishName = function() {};

/**
 * Validate
 */
opentype.Font.prototype.validate = function() {};

/**
 * Convert the font object to a SFNT data structure.
 * This structure contains all the necessary tables and metadata to create a binary OTF file.
 * @return {opentype.Table}
 */
opentype.Font.prototype.toTables = function() {};

/**
 * @deprecated Font.toBuffer is deprecated. Use Font.toArrayBuffer instead.
 */
opentype.Font.prototype.toBuffer = function() {};

/**
 * Converts a `opentype.Font` into an `ArrayBuffer`
 * @return {ArrayBuffer}
 */
opentype.Font.prototype.toArrayBuffer = function() {};

/**
 * Initiate a download of the OpenType font.
 * @deprecated
 */
opentype.Font.prototype.download = function() {};

/**
 * @param  {GlyphOptions}
 */
opentype.Glyph.prototype.bindConstructorValues = function() {};

/**
 * @param {number}
 */
opentype.Glyph.prototype.addUnicode = function() {};

/**
 * Calculate the minimum bounding box for this glyph.
 * @return {opentype.BoundingBox}
 */
opentype.Glyph.prototype.getBoundingBox = function() {};

/**
 * Convert the glyph to a Path we can draw on a drawing context.
 * @param  {number} [x=0] - Horizontal position of the beginning of the text.
 * @param  {number} [y=0] - Vertical position of the *baseline* of the text.
 * @param  {number} [fontSize=72] - Font size in pixels. We scale the glyph units by `1 / unitsPerEm * fontSize`.
 * @param  {GlyphRenderOptions=} options - xScale, yScale to stretch the glyph.
 * @param  {opentype.Font} font if hinting is to be used, or CPAL/COLR / variation needs to be rendered, the font
 * @return {opentype.Path}
 */
opentype.Glyph.prototype.getPath = function() {};

/**
 * 
 * @param {opentype.Font} font 
 * @returns {Array}
 */
opentype.Glyph.prototype.getLayers = function() {};

/**
 * @param {opentype.Font} font
 * @returns {SVGImage | undefined}
 */
opentype.Glyph.prototype.getSvgImage = function() {};

/**
 * Split the glyph into contours.
 * This function is here for backwards compatibility, and to
 * provide raw access to the TrueType glyph outlines.
 * @param {Array|null} [transformedPoints=null] Use the supplied transformed points from a glyph variation instead of the regular glyph points
 * @return {Array}
 */
opentype.Glyph.prototype.getContours = function() {};

/**
 * Calculate the xMin/yMin/xMax/yMax/lsb/rsb for a Glyph.
 * @return {Object}
 */
opentype.Glyph.prototype.getMetrics = function() {};

/**
 * Draw the glyph on the given context.
 * @param  {CanvasRenderingContext2D} ctx - A 2D drawing context, like Canvas.
 * @param  {number} [x=0] - Horizontal position of the beginning of the text.
 * @param  {number} [y=0] - Vertical position of the *baseline* of the text.
 * @param  {number} [fontSize=72] - Font size in pixels. We scale the glyph units by `1 / unitsPerEm * fontSize`.
 * @param  {Object=} options - xScale, yScale to stretch the glyph.
 * @param  {opentype.Font} font - if hinting is to be used, or CPAL/COLR / variation needs to be rendered, the font
 */
opentype.Glyph.prototype.draw = function() {};

/**
 * Draw the points of the glyph.
 * On-curve points will be drawn in blue, off-curve points will be drawn in red.
 * @param  {CanvasRenderingContext2D} ctx - A 2D drawing context, like Canvas.
 * @param  {number} [x=0] - Horizontal position of the beginning of the text.
 * @param  {number} [y=0] - Vertical position of the *baseline* of the text.
 * @param  {number} [fontSize=72] - Font size in pixels. We scale the glyph units by `1 / unitsPerEm * fontSize`.
 * @param  {GlyphRenderOptions=} options
 * @param  {opentype.Font} font - used to get the default render options, may be needed for variable fonts in the future
 */
opentype.Glyph.prototype.drawPoints = function() {};

/**
 * Draw lines indicating important font measurements.
 * Black lines indicate the origin of the coordinate system (point 0,0).
 * Blue lines indicate the glyph bounding box.
 * Green line indicates the advance width of the glyph.
 * @param  {CanvasRenderingContext2D} ctx - A 2D drawing context, like Canvas.
 * @param  {number} [x=0] - Horizontal position of the beginning of the text.
 * @param  {number} [y=0] - Vertical position of the *baseline* of the text.
 * @param  {number} [fontSize=72] - Font size in pixels. We scale the glyph units by `1 / unitsPerEm * fontSize`.
 */
opentype.Glyph.prototype.drawMetrics = function() {};

/**
 * Convert the Glyph's Path to a string of path data instructions
 * @param  {object|number} [options={decimalPlaces:2, optimize:true, variation:undefined}] - Options object (or amount of decimal places for floating-point values for backwards compatibility)
 * @param  {opentype.Font} font - A font object is required if variation is to be applied in order to get the variation data from the tables
 * @return {string}
 * @see Path.toPathData
 */
opentype.Glyph.prototype.toPathData = function() {};

/**
 * Sets the path data from an SVG path element or path notation
 * @param  {string|SVGPathElement}
 * @param  {object}
 */
opentype.Glyph.prototype.fromSVG = function() {};

/**
 * Convert the Glyph's Path to an SVG <path> element, as a string.
 * @param  {object|number} [options={decimalPlaces:2, optimize:true, variation:undefined}] - Options object (or amount of decimal places for floating-point values for backwards compatibility)
 * @param  {opentype.Font} font - A font object is required if variation is to be applied in order to get the variation data from the tables 
 * @return {string}
 */
opentype.Glyph.prototype.toSVG = function() {};

/**
 * Convert the path to a DOM element.
 * @param  {object|number} [options={decimalPlaces:2, optimize:true, variation:undefined}] - Options object (or amount of decimal places for floating-point values for backwards compatibility)
 * @param  {opentype.Font} font - A font object is required if variation is to be applied in order to get the variation data from the tables 
 * @return {SVGPathElement}
 */
opentype.Glyph.prototype.toDOMElement = function() {};

/**
     * The list of drawing commands for the path.
     * @type {Array<Object>}
     * @alias opentype.Path.prototype.commands
     */
opentype.Path.prototype.commands = function() {};

/**
     * Fill color for the path. If null, the path is not filled.
     * @type {string|null}
     * @alias opentype.Path.prototype.fill
     */
opentype.Path.prototype.fill = function() {};

/**
     * Stroke color for the path. If null, the path is not stroked.
     * @type {string|null}
     * @alias opentype.Path.prototype.stroke
     */
opentype.Path.prototype.stroke = function() {};

/**
     * Stroke width for the path outline.
     * @type {number}
     * @alias opentype.Path.prototype.strokeWidth
     */
opentype.Path.prototype.strokeWidth = function() {};

/**
 * Draws cubic curve
 * @function
 * curveTo
 * @memberof opentype.Path.prototype
 * @param  {number} x1 - x of control 1
 * @param  {number} y1 - y of control 1
 * @param  {number} x2 - x of control 2
 * @param  {number} y2 - y of control 2
 * @param  {number} x - x of path point
 * @param  {number} y - y of path point
 */
opentype.Path.prototype.
curveTo = function() {};

/**
 * Draws cubic curve
 * @function curveTo
 * @memberof opentype.Path.prototype
 * @alias opentype.Path.prototype.bezierCurveTo
 * @param  {number} x1 - x of control 1
 * @param  {number} y1 - y of control 1
 * @param  {number} x2 - x of control 2
 * @param  {number} y2 - y of control 2
 * @param  {number} x - x of path point
 * @param  {number} y - y of path point
 * @see bezierCurveTo
 */
opentype.Path.prototype.bezierCurveTo = function() {};

/**
 * Draws quadratic curve
 * @function quadTo
 * @memberof opentype.Path.prototype
 * @alias opentype.Path.prototype.quadraticCurveTo
 * @param  {number} x1 - x of control
 * @param  {number} y1 - y of control
 * @param  {number} x - x of path point
 * @param  {number} y - y of path point
 */
opentype.Path.prototype.quadraticCurveTo = function() {};

/**
 * Closes the path
 * @function closePath
 * @memberof opentype.Path.prototype
 */
opentype.Path.prototype.closePath = function() {};

/**
 * Close the path
 * @function close
 * @memberof opentype.Path.prototype
 */
opentype.Path.prototype.close = function() {};

/**
 * Sets the path data from an SVG path element or path notation
 * @param  {string|SVGPathElement}
 * @param  {object}
 */
opentype.Path.prototype.fromSVG = function() {};

/**
 * @param  {number} x
 * @param  {number} y
 */
opentype.Path.prototype.moveTo = function() {};

/**
 * @param  {number} x
 * @param  {number} y
 */
opentype.Path.prototype.lineTo = function() {};

/**
 * Draws cubic curve
 * @function curveTo
 * @memberof opentype.Path.prototype
 * @alias opentype.Path.prototype.bezierCurveTo
 * @param  {number} x1 - x of control 1
 * @param  {number} y1 - y of control 1
 * @param  {number} x2 - x of control 2
 * @param  {number} y2 - y of control 2
 * @param  {number} x - x of path point
 * @param  {number} y - y of path point
 * @see bezierCurveTo
 */
opentype.Path.prototype.curveTo = function() {};

/**
 * Draws quadratic curve
 * @function quadTo
 * @memberof opentype.Path.prototype
 * @alias opentype.Path.prototype.quadraticCurveTo
 * @param  {number} x1 - x of control
 * @param  {number} y1 - y of control
 * @param  {number} x - x of path point
 * @param  {number} y - y of path point
 */
opentype.Path.prototype.quadTo = function() {};

/**
 * Add the given path or list of commands to the commands of this path.
 * @param  {Array} pathOrCommands - another opentype.Path, an opentype.BoundingBox, or an array of commands.
 */
opentype.Path.prototype.extend = function() {};

/**
 * Calculate the bounding box of the path.
 * @returns {opentype.BoundingBox}
 */
opentype.Path.prototype.getBoundingBox = function() {};

/**
 * Draw the path to a 2D context.
 * @param {CanvasRenderingContext2D} ctx - A 2D drawing context.
 */
opentype.Path.prototype.draw = function() {};

/**
 * Convert the Path to a string of path data instructions
 * See http://www.w3.org/TR/SVG/paths.html#PathData
 * @param  {object|number} [options={decimalPlaces:2, optimize:true}] - Options object (or amount of decimal places for floating-point values for backwards compatibility)
 * @return {string}
 */
opentype.Path.prototype.toPathData = function() {};

/**
 * Convert the path to an SVG <path> element, as a string.
 * @param  {object|number} [options={decimalPlaces:2, optimize:true}] - Options object (or amount of decimal places for floating-point values for backwards compatibility)
 * @param  {string} - will be calculated automatically, but can be provided from Glyph's wrapper function
 * @return {string}
 */
opentype.Path.prototype.toSVG = function() {};

/**
 * Convert the path to a DOM element.
 * @param  {object|number} [options={decimalPlaces:2, optimize:true}] - Options object (or amount of decimal places for floating-point values for backwards compatibility)
 * @param  {string} [pathData] - will be calculated automatically, but can be provided from Glyph's wrapper functions
 * @return {SVGPathElement}
 */
opentype.Path.prototype.toDOMElement = function() {};
