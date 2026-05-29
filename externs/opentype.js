/**
 * @fileoverview Closure Compiler externs for opentype.js generated from source JSDoc.
 * @externs
 */

/** @const */
var opentype = {};

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

/** @type {?} */
opentype._parse = function() {};

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
 * @returns {import('./svgimages.mjs').SVGImage | undefined}
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

/** @type {?} */
opentype._parse.prototype.parseByte = function() {};

/** @type {?} */
opentype._parse.prototype.parseChar = function() {};

/** @type {?} */
opentype._parse.prototype.parseCard8 = function() {};

/** @type {?} */
opentype._parse.prototype.parseUShort = function() {};

/** @type {?} */
opentype._parse.prototype.parseCard16 = function() {};

/** @type {?} */
opentype._parse.prototype.parseSID = function() {};

/** @type {?} */
opentype._parse.prototype.parseOffset16 = function() {};

/** @type {?} */
opentype._parse.prototype.parseShort = function() {};

/** @type {?} */
opentype._parse.prototype.parseF2Dot14 = function() {};

/** @type {?} */
opentype._parse.prototype.parseUInt24 = function() {};

/** @type {?} */
opentype._parse.prototype.parseULong = function() {};

/** @type {?} */
opentype._parse.prototype.parseLong = function() {};

/** @type {?} */
opentype._parse.prototype.parseOffset32 = function() {};

/** @type {?} */
opentype._parse.prototype.parseFixed = function() {};

/** @type {?} */
opentype._parse.prototype.parseString = function() {};

/** @type {?} */
opentype._parse.prototype.parseTag = function() {};

/** @type {?} */
opentype._parse.prototype.parseLongDateTime = function() {};

/** @type {?} */
opentype._parse.prototype.parseVersion = function() {};

/** @type {?} */
opentype._parse.prototype.skip = function() {};

/** @type {?} */
opentype._parse.prototype.parseULongList = function() {};

/** @type {?} */
opentype._parse.prototype.parseUShortList = function() {};

/** @type {?} */
opentype._parse.prototype.parseOffset16List = function() {};

/** @type {?} */
opentype._parse.prototype.parseShortList = function() {};

/** @type {?} */
opentype._parse.prototype.parseByteList = function() {};

/**
 * Parse a list of items.
 * Record count is optional, if omitted it is read from the stream.
 * itemCallback is one of the Parser methods.
 */
opentype._parse.prototype.parseList = function() {};

/** @type {?} */
opentype._parse.prototype.parseList32 = function() {};

/**
 * Parse a list of records.
 * Record count is optional, if omitted it is read from the stream.
 * Example of recordDescription: { sequenceIndex: Parser.uShort, lookupListIndex: Parser.uShort }
 */
opentype._parse.prototype.parseRecordList = function() {};

/** @type {?} */
opentype._parse.prototype.parseRecordList32 = function() {};

/** @type {?} */
opentype._parse.prototype.parseTupleRecords = function() {};

/** @type {?} */
opentype._parse.prototype.parseStruct = function() {};

/**
 * Parse a GPOS valueRecord
 * https://docs.microsoft.com/en-us/typography/opentype/spec/gpos#value-record
 * valueFormat is optional, if omitted it is read from the stream.
 */
opentype._parse.prototype.parseValueRecord = function() {};

/**
 * Parse a list of GPOS valueRecords
 * https://docs.microsoft.com/en-us/typography/opentype/spec/gpos#value-record
 * valueFormat and valueCount are read from the stream.
 */
opentype._parse.prototype.parseValueRecordList = function() {};

/** @type {?} */
opentype._parse.prototype.parsePointer = function() {};

/** @type {?} */
opentype._parse.prototype.parsePointer32 = function() {};

/**
 * Parse a list of offsets to lists of 16-bit integers,
 * or a list of offsets to lists of offsets to any kind of items.
 * If itemCallback is not provided, a list of list of UShort is assumed.
 * If provided, itemCallback is called on each item and must parse the item.
 * See examples in tables/gsub.mjs
 */
opentype._parse.prototype.parseListOfLists = function() {};

/** @type {?} */
opentype._parse.prototype.parseCoverage = function() {};

/** @type {?} */
opentype._parse.prototype.parseClassDef = function() {};

/** @type {?} */
opentype._parse.prototype.parseScriptList = function() {};

/** @type {?} */
opentype._parse.prototype.parseFeatureList = function() {};

/** @type {?} */
opentype._parse.prototype.parseLookupList = function() {};

/** @type {?} */
opentype._parse.prototype.parseFeatureVariationsList = function() {};

/** @type {?} */
opentype._parse.prototype.parseVariationStore = function() {};

/** @type {?} */
opentype._parse.prototype.parseItemVariationStore = function() {};

/** @type {?} */
opentype._parse.prototype.parseVariationRegionList = function() {};

/** @type {?} */
opentype._parse.prototype.parseItemVariationSubtable = function() {};

/** @type {?} */
opentype._parse.prototype.parseDeltaSetIndexMap = function() {};

/** @type {?} */
opentype._parse.prototype.parseDeltaSets = function() {};

/** @type {?} */
opentype._parse.prototype.parseTupleVariationStoreList = function() {};

/** @type {?} */
opentype._parse.prototype.parseTupleVariationStore = function() {};

/** @type {?} */
opentype._parse.prototype.parseTupleVariationHeader = function() {};

/** @type {?} */
opentype._parse.prototype.parsePackedPointNumbers = function() {};

/** @type {?} */
opentype._parse.prototype.parsePackedDeltas = function() {};

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
 * @function
 * bezierCurveTo
 * @memberof opentype.Path.prototype
 * @param  {number} x1 - x of control 1
 * @param  {number} y1 - y of control 1
 * @param  {number} x2 - x of control 2
 * @param  {number} y2 - y of control 2
 * @param  {number} x - x of path point
 * @param  {number} y - y of path point
 * @see curveTo
 */
opentype.Path.prototype.
bezierCurveTo = function() {};

/**
 * Draws quadratic curve
 * @function
 * quadraticCurveTo
 * @memberof opentype.Path.prototype
 * @param  {number} x1 - x of control
 * @param  {number} y1 - y of control
 * @param  {number} x - x of path point
 * @param  {number} y - y of path point
 */
opentype.Path.prototype.
quadraticCurveTo = function() {};

/**
 * Draws quadratic curve
 * @function
 * quadTo
 * @memberof opentype.Path.prototype
 * @param  {number} x1 - x of control
 * @param  {number} y1 - y of control
 * @param  {number} x - x of path point
 * @param  {number} y - y of path point
 */
opentype.Path.prototype.
quadTo = function() {};

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

/** @type {?} */
opentype.Path.prototype.bezierCurveTo = function() {};

/**
 * Draws cubic curve
 * @function
 * bezierCurveTo
 * @memberof opentype.Path.prototype
 * @param  {number} x1 - x of control 1
 * @param  {number} y1 - y of control 1
 * @param  {number} x2 - x of control 2
 * @param  {number} y2 - y of control 2
 * @param  {number} x - x of path point
 * @param  {number} y - y of path point
 * @see curveTo
 */
opentype.Path.prototype.curveTo = function() {};

/** @type {?} */
opentype.Path.prototype.quadraticCurveTo = function() {};

/**
 * Draws quadratic curve
 * @function
 * quadTo
 * @memberof opentype.Path.prototype
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

/** @type {?} */
opentype._parse.getByte = function() {};

/** @type {?} */
opentype._parse.getCard8 = function() {};

/** @type {?} */
opentype._parse.getUShort = function() {};

/** @type {?} */
opentype._parse.getCard16 = function() {};

/** @type {?} */
opentype._parse.getShort = function() {};

/** @type {?} */
opentype._parse.getUInt24 = function() {};

/** @type {?} */
opentype._parse.getULong = function() {};

/** @type {?} */
opentype._parse.getFixed = function() {};

/** @type {?} */
opentype._parse.getTag = function() {};

/** @type {?} */
opentype._parse.getOffset = function() {};

/** @type {?} */
opentype._parse.getBytes = function() {};

/** @type {?} */
opentype._parse.bytesToString = function() {};

/** @type {?} */
opentype._parse.Parser = function() {};
