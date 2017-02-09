/**
 * @fileoverview Closure Compiler externs for opentype.js version.
 * @see http://opentype.js.org/
 * @externs
 */

/** @const */
var opentype = {};
/**
 * A Font represents a loaded OpenType font file.
 * It contains a set of glyphs and methods to draw text on a drawing context,
 * or to get a path representing the text.
 * @param {FontOptions}
 * @constructor
 */
opentype.Font = function(options) {};

/**
 * Check if the font has a glyph for the given character.
 * @param  {string}
 * @return {Boolean}
 */
opentype.Font.prototype.hasChar = function(c) {};

/**
 * Convert the given character to a single glyph index.
 * Note that this function assumes that there is a one-to-one mapping between
 * the given character and a glyph; for complex scripts this might not be the case.
 * @param  {string}
 * @return {Number}
 */
opentype.Font.prototype.charToGlyphIndex = function(s) {};

/**
 * Convert the given character to a single Glyph object.
 * Note that this function assumes that there is a one-to-one mapping between
 * the given character and a glyph; for complex scripts this might not be the case.
 * @param  {string} c
 * @return {opentype.Glyph}
 */
opentype.Font.prototype.charToGlyph = function(c) {};

/**
 * Convert the given text to a list of Glyph objects.
 * Note that there is no strict one-to-one mapping between characters and
 * glyphs, so the list of returned glyphs can be larger or smaller than the
 * length of the given string.
 * @param  {string} s
 * @param  {Object=} options
 * @return {opentype.Glyph[]}
 */
opentype.Font.prototype.stringToGlyphs = function(s, options) {};

/**
 * @param  {string}
 * @return {Number}
 */
opentype.Font.prototype.nameToGlyphIndex = function(name) {};

/**
 * @param  {string}
 * @return {opentype.Glyph}
 */
opentype.Font.prototype.nameToGlyph = function(name) {};

/**
 * @param  {Number}
 * @return {String}
 */
opentype.Font.prototype.glyphIndexToName = function(gid) {};

/**
 * Retrieve the value of the kerning pair between the left glyph (or its index)
 * and the right glyph (or its index). If no kerning pair is found, return 0.
 * The kerning value gets added to the advance width when calculating the spacing
 * between glyphs.
 * @param  {opentype.Glyph} leftGlyph
 * @param  {opentype.Glyph} rightGlyph
 * @return {Number}
 */
opentype.Font.prototype.getKerningValue = function(leftGlyph, rightGlyph) {};

/**
 * Helper function that invokes the given callback for each glyph in the given text.
 * The callback gets `(glyph, x, y, fontSize, options)`.* @param  {string} text
 * @param  {number} x - Horizontal position of the beginning of the text.
 * @param  {number} y - Vertical position of the *baseline* of the text.
 * @param  {number} fontSize - Font size in pixels. We scale the glyph units by `1 / unitsPerEm * fontSize`.
 * @param  {Object} options
 * @param  {Function} callback
 */
opentype.Font.prototype.forEachGlyph = function(text, x, y, fontSize, options, callback) {};

/**
 * Create a Path object that represents the given text.
 * @param  {string} text - The text to create.
 * @param  {number} [x=0] - Horizontal position of the beginning of the text.
 * @param  {number} [y=0] - Vertical position of the *baseline* of the text.
 * @param  {number} [fontSize=72] - Font size in pixels. We scale the glyph units by `1 / unitsPerEm * fontSize`.
 * @param  {Object=} options
 * @return {opentype.Path}
 */
opentype.Font.prototype.getPath = function(text, x, y, fontSize, options) {};

/**
 * Create an array of Path objects that represent the glyps of a given text.
 * @param  {string} text - The text to create.
 * @param  {number} [x=0] - Horizontal position of the beginning of the text.
 * @param  {number} [y=0] - Vertical position of the *baseline* of the text.
 * @param  {number} [fontSize=72] - Font size in pixels. We scale the glyph units by `1 / unitsPerEm * fontSize`.
 * @param  {Object=} options
 * @return {opentype.Path[]}
 */
opentype.Font.prototype.getPaths = function(text, x, y, fontSize, options) {};

/**
 * Draw the text on the given drawing context.
 * @param  {CanvasRenderingContext2D} ctx - A 2D drawing context, like Canvas.
 * @param  {string} text - The text to create.
 * @param  {number} [x=0] - Horizontal position of the beginning of the text.
 * @param  {number} [y=0] - Vertical position of the *baseline* of the text.
 * @param  {number} [fontSize=72] - Font size in pixels. We scale the glyph units by `1 / unitsPerEm * fontSize`.
 * @param  {Object=} options
 */
opentype.Font.prototype.draw = function(ctx, text, x, y, fontSize, options) {};

/**
 * Draw the points of all glyphs in the text.
 * On-curve points will be drawn in blue, off-curve points will be drawn in red.
 * @param {CanvasRenderingContext2D} ctx - A 2D drawing context, like Canvas.
 * @param {string} text - The text to create.
 * @param {number} [x=0] - Horizontal position of the beginning of the text.
 * @param {number} [y=0] - Vertical position of the *baseline* of the text.
 * @param {number} [fontSize=72] - Font size in pixels. We scale the glyph units by `1 / unitsPerEm * fontSize`.
 * @param {Object=} options
 */
opentype.Font.prototype.drawPoints = function(ctx, text, x, y, fontSize, options) {};

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
 * @param {Object=} options
 */
opentype.Font.prototype.drawMetrics = function(ctx, text, x, y, fontSize, options) {};

/**
 * @param  {string}
 * @return {string}
 */
opentype.Font.prototype.getEnglishName = function(name) {};

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
 * @param {string=} fileName
 */
opentype.Font.prototype.download = function(fileName) {};

// A Glyph is an individual mark that often corresponds to a character.
// Some glyphs, such as ligatures, are a combination of many characters.
// Glyphs are the basic building blocks of a font.
//
// The `Glyph` class contains utility methods for drawing the path and its points.
/**
 * @param {GlyphOptions}
 * @constructor
 */
opentype.Glyph = function(options) {};

/**
 * @param {number}
 */
opentype.Glyph.prototype.addUnicode = function(unicode) {};

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
 * @param  {Object=} options - xScale, yScale to strech the glyph.
 * @return {opentype.Path}
 */
opentype.Glyph.prototype.getPath = function(x, y, fontSize, options) {};

/**
 * Split the glyph into contours.
 * This function is here for backwards compatibility, and to
 * provide raw access to the TrueType glyph outlines.
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
 * @param  {Object=} options - xScale, yScale to strech the glyph.
 */
opentype.Glyph.prototype.draw = function(ctx, x, y, fontSize, options) {};

/**
 * Draw the points of the glyph.
 * On-curve points will be drawn in blue, off-curve points will be drawn in red.
 * @param  {CanvasRenderingContext2D} ctx - A 2D drawing context, like Canvas.
 * @param  {number} [x=0] - Horizontal position of the beginning of the text.
 * @param  {number} [y=0] - Vertical position of the *baseline* of the text.
 * @param  {number} [fontSize=72] - Font size in pixels. We scale the glyph units by `1 / unitsPerEm * fontSize`.
 */
opentype.Glyph.prototype.drawPoints = function(ctx, x, y, fontSize) {};

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
opentype.Glyph.prototype.drawMetrics = function(ctx, x, y, fontSize) {};

/**
 * A bézier path containing a set of path commands similar to a SVG path.
 * Paths can be drawn on a context using `draw`.
 * @constructor
 */
opentype.Path = function() {};

/**
 * @param  {number} x
 * @param  {number} y
 */
opentype.Path.prototype.moveTo = function(x, y) {};

/**
 * @param  {number} x
 * @param  {number} y
 */
opentype.Path.prototype.lineTo = function(x, y) {};

/**
 * Draws cubic curve
 * @param  {number} x1 - x of control 1
 * @param  {number} y1 - y of control 1
 * @param  {number} x2 - x of control 2
 * @param  {number} y2 - y of control 2
 * @param  {number} x - x of path point
 * @param  {number} y - y of path point
 */
opentype.Path.prototype.curveTo = function(x1, y1, x2, y2, x, y) {};

/**
 * Draws cubic curve
 * @param  {number} x1 - x of control 1
 * @param  {number} y1 - y of control 1
 * @param  {number} x2 - x of control 2
 * @param  {number} y2 - y of control 2
 * @param  {number} x - x of path point
 * @param  {number} y - y of path point
 */
opentype.Path.prototype.bezierCurveTo = function(x1, y1, x2, y2, x, y) {};

/**
 * Draws quadratic curve
 * @param  {number} x1 - x of control
 * @param  {number} y1 - y of control
 * @param  {number} x - x of path point
 * @param  {number} y - y of path point
 */
opentype.Path.prototype.quadTo = function(x1, y1, x, y) {};

/**
 * Draws quadratic curve
 * @param  {number} x1 - x of control
 * @param  {number} y1 - y of control
 * @param  {number} x - x of path point
 * @param  {number} y - y of path point
 */
opentype.Path.prototype.quadraticCurveTo = function(x1, y1, x, y) {};

/**
 * Close the path
 */
opentype.Path.prototype.close = function() {};

/**
 * Closes the path
 */
opentype.Path.prototype.closePath = function() {};

/**
 * Add the given path or list of commands to the commands of this path.
 * @param  {Array} pathOrCommands - another opentype.Path, an opentype.BoundingBox, or an array of commands.
 */
opentype.Path.prototype.extend = function(pathOrCommands) {};

/**
 * Calculate the bounding box of the path.
 * @returns {opentype.BoundingBox}
 */
opentype.Path.prototype.getBoundingBox = function() {};

/**
 * @param {CanvasRenderingContext2D} ctx - A 2D drawing context.
 */
opentype.Path.prototype.draw = function(ctx) {};

/**
 * @param  {number} [decimalPlaces=2] - The amount of decimal places for floating-point values
 * @return {string}
 */
opentype.Path.prototype.toPathData = function(decimalPlaces) {};

/**
 * @param  {number} [decimalPlaces=2] - The amount of decimal places for floating-point values
 * @return {string}
 */
opentype.Path.prototype.toSVG = function(decimalPlaces) {};

/**
 * Convert the path to a DOM element.
 * @param  {number} [decimalPlaces=2] - The amount of decimal places for floating-point values
 * @return {SVGPathElement}
 */
opentype.Path.prototype.toDOMElement = function(decimalPlaces) {};

/**
 * @constructor
 */
opentype.Layout = function(font, tableName) {};

/**
 * Binary search an object by "tag" property
 * @param  {Array} arr
 * @param  {string} tag
 * @return {number}
 */
opentype.Layout.prototype.searchTag = function(arr, tag) {};

/**
 * Binary search in a list of numbers
 * @param  {Array} arr
 * @param  {number} value
 * @return {number}
 */
opentype.Layout.prototype.binSearch = function (arr, value) {};

/**
 * Get or create the Layout table (GSUB, GPOS etc).
 * @param  {boolean} create - Whether to create a new one.
 * @return {Object} The GSUB or GPOS table.
 */
opentype.Layout.prototype.getTable = function(create) {};

/**
 * Returns all scripts in the substitution table.
 * @instance
 * @return {Array}
 */
opentype.Layout.prototype.getScriptNames = function() {};

/**
 * Returns all LangSysRecords in the given script.
 * @instance
 * @param {string} script - Use 'DFLT' for default script
 * @param {boolean} create - forces the creation of this script table if it doesn't exist.
 * @return {Array} Array on names
 */
opentype.Layout.prototype.getScriptTable = function(script, create) {};

/**
 * Returns a language system table
 * @instance
 * @param {string} script - Use 'DFLT' for default script
 * @param {string} language - Use 'dlft' for default language
 * @param {boolean} create - forces the creation of this langSysTable if it doesn't exist.
 * @return {Object} An object with tag and script properties.
 */
opentype.Layout.prototype.getLangSysTable = function(script, language, create) {};

/**
 * Get a specific feature table.
 * @instance
 * @param {string} script - Use 'DFLT' for default script
 * @param {string} language - Use 'dlft' for default language
 * @param {string} feature - One of the codes listed at https://www.microsoft.com/typography/OTSPEC/featurelist.htm
 * @param {boolean} create - forces the creation of the feature table if it doesn't exist.
 * @return {Object}
 */
opentype.Layout.prototype.getFeatureTable = function(script, language, feature, create) {};

/**
 * Get the lookup tables of a given type for a script/language/feature.
 * @instance
 * @param {string} [script='DFLT']
 * @param {string} [language='dlft']
 * @param {string} feature - 4-letter feature code
 * @param {number} lookupType - 1 to 8
 * @param {boolean} create - forces the creation of the lookup table if it doesn't exist, with no subtables.
 * @return {Object[]}
 */
opentype.Layout.prototype.getLookupTables = function(script, language, feature, lookupType, create) {};

/**
 * Returns the list of glyph indexes of a coverage table.
 * Format 1: the list is stored raw
 * Format 2: compact list as range records.
 * @instance
 * @param  {Object} coverageTable
 * @return {Array}
 */
opentype.Layout.prototype.expandCoverage = function(coverageTable) {};

/**
 * @extends opentype.Layout
 * @constructor
 * @param {opentype.Font}
 */
opentype.Substitution = function(font) {};

/**
 * Create a default GSUB table.
 * @return {Object} gsub - The GSUB table.
 */
opentype.Substitution.prototype.createDefaultTable = function() {};

/**
 * List all single substitutions (lookup type 1) for a given script, language, and feature.
 * @param {string} script
 * @param {string} language
 * @param {string} feature - 4-character feature name ('aalt', 'salt', 'ss01'...)
 * @return {Array} substitutions - The list of substitutions.
 */
opentype.Substitution.prototype.getSingle = function(feature, script, language) {};

/**
 * List all alternates (lookup type 3) for a given script, language, and feature.
 * @param {string} feature - 4-character feature name ('aalt', 'salt'...)
 * @param {string} script
 * @param {string} language
 * @return {Array} alternates - The list of alternates
 */
opentype.Substitution.prototype.getAlternates = function(feature, script, language) {};

/**
 * List all ligatures (lookup type 4) for a given script, language, and feature.
 * The result is an array of ligature objects like { sub: [ids], by: id }
 * @param {string} feature - 4-letter feature name ('liga', 'rlig', 'dlig'...)
 * @param {string} script
 * @param {string} language
 * @return {Array} ligatures - The list of ligatures.
 */
opentype.Substitution.prototype.getLigatures = function(feature, script, language) {};

/**
 * Add or modify a single substitution (lookup type 1)
 * Format 2, more flexible, is always used.
 * @param {string} feature - 4-letter feature name ('liga', 'rlig', 'dlig'...)
 * @param {Object} substitution - { sub: id, delta: number } for format 1 or { sub: id, by: id } for format 2.
 * @param {string} [script='DFLT']
 * @param {string} [language='dflt']
 */
opentype.Substitution.prototype.addSingle = function(feature, substitution, script, language) {};

/**
 * Add or modify an alternate substitution (lookup type 1)
 * @param {string} feature - 4-letter feature name ('liga', 'rlig', 'dlig'...)
 * @param {Object} substitution - { sub: id, by: [ids] }
 * @param {string} [script='DFLT']
 * @param {string} [language='dflt']
 */
opentype.Substitution.prototype.addAlternate = function(feature, substitution, script, language) {};

/**
 * Add a ligature (lookup type 4)
 * Ligatures with more components must be stored ahead of those with fewer components in order to be found
 * @param {string} feature - 4-letter feature name ('liga', 'rlig', 'dlig'...)
 * @param {Object} ligature - { sub: [ids], by: id }
 * @param {string} [script='DFLT']
 * @param {string} [language='dflt']
 */
opentype.Substitution.prototype.addLigature = function(feature, ligature, script, language) {};

/**
 * List all feature data for a given script and language.
 * @param {string} feature - 4-letter feature name
 * @param {string} [script='DFLT']
 * @param {string} [language='dflt']
 * @return {[type]} [description]
 * @return {Array} substitutions - The list of substitutions.
 */
opentype.Substitution.prototype.getFeature = function(feature, script, language) {};

/**
 * Add a substitution to a feature for a given script and language.
 * @param {string} feature - 4-letter feature name
 * @param {Object} sub - the substitution to add (an Object like { sub: id or [ids], by: id or [ids] })
 * @param {string} [script='DFLT']
 * @param {string} [language='dflt']
 */
opentype.Substitution.prototype.add = function(feature, sub, script, language) {};

/**
 * @param {string} tableName
 * @param {Array} fields
 * @param {Object} options
 * @constructor
 */
opentype.Table = function(tableName, fields, options) {};

/**
 * Encodes the table and returns an array of bytes
 * @return {Array}
 */
opentype.Table.prototype.encode = function() {};

/**
 * Get the size of the table.
 * @return {number}
 */
opentype.Table.prototype.sizeOf = function() {};

/**
 * @type {string}
 */
opentype.Table.prototype.tableName;

/**
 * @type {Array}
 */
opentype.Table.prototype.fields;

/**
 * @extends {opentype.Table}
 * @param {opentype.Table} coverageTable
 * @constructor
 */
opentype.Coverage = function(coverageTable) {};

/**
 * @extends {opentype.Table}
 * @param {opentype.Table} scriptListTable
 * @constructor
 */
opentype.ScriptList = function(scriptListTable) {};

/**
 * @extends {opentype.Table}
 * @param {opentype.Table} featureListTable
 * @constructor
 */
opentype.FeatureList = function(featureListTable) {};

/**
 * @extends {opentype.Table}
 * @param {opentype.Table} lookupListTable
 * @param {Object} subtableMakers
 * @constructor
 */
opentype.LookupList = function(lookupListTable, subtableMakers) {};

/**
 * @constructor
 */
opentype.BoundingBox = function() {};

/**
 * @param  {string} url - The URL of the font to load.
 * @param  {Function} callback - The callback.
 */
opentype.load = function(url, callback) {};

/**
 * @param  {string} url - The URL of the font to load.
 * @return {opentype.Font}
 */
opentype.loadSync = function(url) {};

/**
 * @param  {ArrayBuffer}
 * @return {opentype.Font}
 */
opentype.parse = function(buffer) {};
