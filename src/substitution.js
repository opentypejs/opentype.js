// The Substitution object provides utility methods to manipulate
// the GSUB substitution table.

'use strict';

var check = require('./check');
var Layout = require('./layout');

/**
 * @exports opentype.Substitution
 * @class
 * @extends opentype.Layout
 * @param {opentype.Font}
 * @constructor
 */
var Substitution = function(font) {
    this.font = font;
};

// Check if 2 arrays of primitives are equal.
function arraysEqual(ar1, ar2) {
    var n = ar1.length;
    if (n !== ar2.length) { return false; }
    for (var i = 0; i < n; i++) {
        if (ar1[i] !== ar2[i]) { return false; }
    }
    return true;
}

// Find the first subtable of a lookup table in a particular format.
function getSubstFormat(lookupTable, format, defaultSubtable) {
    var subtables = lookupTable.subtables;
    for (var i = 0; i < subtables.length; i++) {
        var subtable = subtables[i];
        if (subtable.substFormat === format) {
            return subtable;
        }
    }
    if (defaultSubtable) {
        subtables.push(defaultSubtable);
        return defaultSubtable;
    }
}

Substitution.prototype = Layout;

// Get or create the GSUB table.
Substitution.prototype.getGsubTable = function(create) {
    var gsub = this.font.tables.gsub;
    if (!gsub && create) {
        // Generate a default empty GSUB table with just a DFLT script and dflt lang sys.
        this.font.tables.gsub = gsub = {
            version: 1,
            scripts: [{
                tag: 'DFLT',
                script: {
                    defaultLangSys: { reserved: 0, reqFeatureIndex: 0xffff, featureIndexes: [] },
                    langSysRecords: []
                }
            }],
            features: [],
            lookups: []
        };
    }
    return gsub;
};

/**
 * List all single substitutions (lookup type 1) for a given script, language, and feature.
 * @param {string} script
 * @param {string} language
 * @param {string} feature - 4-character feature name ('aalt', 'salt', 'ss01'...)
 */
Substitution.prototype.getSingle = function(script, language, feature) {
    var substitutions = [];
    var lookupTable = this.getLookupTable(script, language, feature, 1);
    if (!lookupTable) { return substitutions; }
    var subtables = lookupTable.subtables;
    for (var i = 0; i < subtables.length; i++) {
        var subtable = subtables[i];
        var glyphs = this.expandCoverage(subtable.coverage);
        var j;
        if (subtable.substFormat === 1) {
            var delta = subtable.deltaGlyphId;
            for (j = 0; j < glyphs.length; j++) {
                var glyph = glyphs[j];
                substitutions.push({ sub: glyph, by: glyph + delta });
            }
        } else {
            var substitute = subtable.substitute;
            for (j = 0; j < glyphs.length; j++) {
                substitutions.push({ sub: glyphs[j], by: substitute[j] });
            }
        }
    }
    return substitutions;
};

/**
 * List all alternates (lookup type 3) for a given script, language, and feature.
 * @param {string} script
 * @param {string} language
 * @param {string} feature - 4-character feature name ('aalt', 'salt'...)
 */
Substitution.prototype.getAlternates = function(script, language, feature) {
    var alternates = [];
    var lookupTable = this.getLookupTable(script, language, feature, 3);
    if (!lookupTable) { return alternates; }
    var subtables = lookupTable.subtables;
    for (var i = 0; i < subtables.length; i++) {
        var subtable = subtables[i];
        var glyphs = this.expandCoverage(subtable.coverage);
        var alternateSets = subtable.alternateSets;
        for (var j = 0; j < glyphs.length; j++) {
            alternates.push({ sub: glyphs[j], by: alternateSets[j] });
        }
    }
    return alternates;
};

/**
 * List all ligatures (lookup type 4) for a given script, language, and feature.
 * The result is an array of ligature objects like { sub: [ids], by: id }
 * @param {string} script
 * @param {string} language
 * @param {string} feature - 4-letter feature name ('liga', 'rlig', 'dlig'...)
 */
Substitution.prototype.getLigatures = function(script, language, feature) {
    var ligatures = [];
    var lookupTable = this.getLookupTable(script, language, feature, 4);
    if (!lookupTable) { return []; }
    var subtables = lookupTable.subtables;
    for (var i = 0; i < subtables.length; i++) {
        var subtable = subtables[i];
        var glyphs = this.expandCoverage(subtable.coverage);
        var ligatureSets = subtable.ligatureSets;
        for (var j = 0; j < glyphs.length; j++) {
            var startGlyph = glyphs[j];
            var ligSet = ligatureSets[j];
            for (var k = 0; k < ligSet.length; k++) {
                var lig = ligSet[k];
                ligatures.push({
                    sub: [startGlyph].concat(lig.components),
                    by: lig.ligGlyph
                });
            }
        }
    }
    return ligatures;
};

/**
 * Add or modify a single substitution (lookup type 1)
 * Format 2, more flexible, is always used.
 * @param {string} [script='DFLT']
 * @param {string} [language='DFLT']
 * @param {object} substitution - { sub: id, delta: number } for format 1 or { sub: id, by: id } for format 2.
 */
Substitution.prototype.addSingle = function(script, language, feature, substitution) {
    var lookupTable = this.getLookupTable(script, language, feature, 1, true);
    var subtable = getSubstFormat(lookupTable, 2, {                // lookup type 1 subtable, format 2, coverage format 1
        substFormat: 2,
        coverage: { format: 1, glyphs: [] },
        substitute: []
    });
    check.assert(subtable.coverage.format === 1, 'Ligature: unable to modify coverage table format ' + subtable.coverage.format);
    var coverageGlyph = substitution.sub;
    var pos = this.binSearch(subtable.coverage.glyphs, coverageGlyph);
    if (pos < 0) {
        pos = -1 - pos;
        subtable.coverage.glyphs.splice(pos, 0, coverageGlyph);
        subtable.substitute.splice(pos, 0, 0);
    }
    subtable.substitute[pos] = substitution.by;
};

/**
 * Add or modify an alternate substitution (lookup type 1)
 * @param {string} [script='DFLT']
 * @param {string} [language='DFLT']
 * @param {object} substitution - { sub: id, by: [ids] }
 */
Substitution.prototype.addAlternate = function(script, language, feature, substitution) {
    var lookupTable = this.getLookupTable(script, language, feature, 3, true);
    var subtable = getSubstFormat(lookupTable, 1, {                // lookup type 3 subtable, format 1, coverage format 1
        substFormat: 1,
        coverage: { format: 1, glyphs: [] },
        alternateSets: []
    });
    check.assert(subtable.coverage.format === 1, 'Ligature: unable to modify coverage table format ' + subtable.coverage.format);
    var coverageGlyph = substitution.sub;
    var pos = this.binSearch(subtable.coverage.glyphs, coverageGlyph);
    if (pos < 0) {
        pos = -1 - pos;
        subtable.coverage.glyphs.splice(pos, 0, coverageGlyph);
        subtable.alternateSets.splice(pos, 0, 0);
    }
    subtable.alternateSets[pos] = substitution.by;
};

/**
 * Add a ligature (lookup type 4)
 * Ligatures with more components must be stored ahead of those with fewer components in order to be found
 * @param {string} [script='DFLT']
 * @param {string} [language='DFLT']
 * @param {object} ligature - { sub: [ids], by: id }
 */
Substitution.prototype.addLigature = function(script, language, feature, ligature) {
    var lookupTable = this.getLookupTable(script, language, feature, 4, true);
    var subtable = lookupTable.subtables[0];
    if (!subtable) {
        subtable = {                // lookup type 4 subtable, format 1, coverage format 1
            substFormat: 1,
            coverage: { format: 1, glyphs: [] },
            ligatureSets: []
        };
        lookupTable.subtables[0] = subtable;
    }
    check.assert(subtable.coverage.format === 1, 'Ligature: unable to modify coverage table format ' + subtable.coverage.format);
    var coverageGlyph = ligature.sub[0];
    var ligComponents = ligature.sub.slice(1);
    var ligatureTable = {
        ligGlyph: ligature.by,
        components: ligComponents
    };
    var pos = this.binSearch(subtable.coverage.glyphs, coverageGlyph);
    if (pos >= 0) {
        // ligatureSet already exists
        var ligatureSet = subtable.ligatureSets[pos];
        for (var i = 0; i < ligatureSet.length; i++) {
            // If ligature already exists, return.
            if (arraysEqual(ligatureSet[i].components, ligComponents)) {
                return;
            }
        }
        // ligature does not exist: add it.
        ligatureSet.push(ligatureTable);
    } else {
        // Create a new ligatureSet and add coverage for the first glyph.
        pos = -1 - pos;
        subtable.coverage.glyphs.splice(pos, 0, coverageGlyph);
        subtable.ligatureSets.splice(pos, 0, [ligatureTable]);
    }
};

/**
 * List all feature data for a given script and language.
 * @param {string} [script='DFLT']
 * @param {string} [language='DFLT']
 * @param {string} feature - 4-letter feature name
 */
Substitution.prototype.getFeature = function(script, language, feature) {
    if (arguments.length === 1) {
        feature = arguments[0];
        script = language = 'DFLT';
    }
    if (/ss\d\d/.test(feature)) {               // ss01 - ss20
        return this.getSingle(script, language, feature);
    }
    switch (feature) {
        case 'aalt':
        case 'salt':
            return this.getSingle(script, language, feature)
                    .concat(this.getAlternates(script, language, feature));
        case 'dlig':
        case 'liga':
        case 'rlig': return this.getLigatures(script, language, feature);
    }
};

/**
 * Add a substitution to a feature for a given script and language.
 *
 * @param {string} [script='DFLT']
 * @param {string} [language='DFLT']
 * @param {string} feature - 4-letter feature name
 * @param {object} sub - the substitution to add (an object like { sub: id or [ids], by: id or [ids] })
 */
Substitution.prototype.add = function(script, language, feature, sub) {
    if (arguments.length === 2) {
        feature = arguments[0];
        sub = arguments[1];
        script = language = 'DFLT';
    }
    if (/ss\d\d/.test(feature)) {               // ss01 - ss20
        return this.addSingle(script, language, feature, sub);
    }
    switch (feature) {
        case 'aalt':
        case 'salt':
            if (typeof sub.by === 'number') {
                return this.addSingle(script, language, feature, sub);
            }
            return this.addAlternate(script, language, feature, sub);
        case 'dlig':
        case 'liga':
        case 'rlig':
            return this.addLigature(script, language, feature, sub);
    }
};

module.exports = Substitution;
