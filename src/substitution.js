// The Substitution object provides utility methods to manipulate
// the GSUB substitution table.

'use strict';

var check = require('./check');
var Layout = require('./layout');

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
 * List all ligatures (lookup type 4) for a given script, language, and feature.
 * The result is an array of ligature objects like { sub: [ids], by: id }
 * @param {string} script
 * @param {string} language
 * @param {string} feature - 4-letter feature name (liga, rlig, dlig...)
 */
Substitution.prototype.getLigatures = function(script, language, feature) {
    var lookupTable = this.getLookupTable(script, language, feature, 4);
    if (!lookupTable) { return []; }
    var subtable = lookupTable.subtables[0];
    if (!subtable) { return []; }
    var glyphs = this.expandCoverage(subtable.coverage);
    var ligatureSets = subtable.ligatureSets;
    var ligatures = [];
    for (var i = 0; i < glyphs.length; i++) {
        var startGlyph = glyphs[i];
        var ligSet = ligatureSets[i];
        for (var j = 0; j < ligSet.length; j++) {
            var lig = ligSet[j];
            ligatures.push({
                sub: [startGlyph].concat(lig.components),
                by: lig.ligGlyph
            });
        }
    }
    return ligatures;
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
    switch (feature) {
        case 'dlig':
        case 'liga':
        case 'rlig': return this.getLigatures(script, language, feature);
    }
};

/**
 * Add a substitution to a feature for a given script and language.
 * The result is an array of ligature objects like { sub: [ids], by: id }
 * @param {string} [script='DFLT']
 * @param {string} [language='DFLT']
 * @param {string} feature - 4-letter feature name
 * @param {object} sub - the substitution to add
 */
Substitution.prototype.add = function(script, language, feature, sub) {
    if (arguments.length === 2) {
        feature = arguments[0];
        sub = arguments[1];
        script = language = 'DFLT';
    }
    switch (feature) {
        case 'dlig':
        case 'liga':
        case 'rlig': return this.addLigature(script, language, feature, sub);
    }
};

module.exports = Substitution;
