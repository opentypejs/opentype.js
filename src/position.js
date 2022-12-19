// The Position object provides utility methods to manipulate
// the GPOS position table.

import Layout from './layout';

/**
 * @exports opentype.Position
 * @class
 * @extends opentype.Layout
 * @param {opentype.Font}
 * @constructor
 */
function Position(font) {
    Layout.call(this, font, 'gpos', [
        { featureName: 'kern',  supportedLookups: [2]  },
        { featureName: 'mark',  supportedLookups: [4]  }
    ]);
}

Position.prototype = Layout.prototype;

/**
 * Init some data for faster and easier access later.
 */
Position.prototype.init = function() {
    const script = this.getDefaultScriptName();
    this.defaultKerningTables = this.getKerningTables(script);
};

/**
 * Find a glyph pair in a list of lookup tables of type 2 and retrieve the xAdvance kerning value.
 *
 * @param {integer} leftIndex - left glyph index
 * @param {integer} rightIndex - right glyph index
 * @returns {integer}
 */
Position.prototype.getKerningValue = function(kerningLookups, leftIndex, rightIndex) {
    for (let i = 0; i < kerningLookups.length; i++) {
        const subtables = kerningLookups[i].subtables;
        for (let j = 0; j < subtables.length; j++) {
            const subtable = subtables[j];
            const covIndex = this.getCoverageIndex(subtable.coverage, leftIndex);
            if (covIndex < 0) continue;
            switch (subtable.posFormat) {
                case 1:
                    // Search Pair Adjustment Positioning Format 1
                    let pairSet = subtable.pairSets[covIndex];
                    for (let k = 0; k < pairSet.length; k++) {
                        let pair = pairSet[k];
                        if (pair.secondGlyph === rightIndex) {
                            return pair.value1 && pair.value1.xAdvance || 0;
                        }
                    }
                    break;      // left glyph found, not right glyph - try next subtable
                case 2:
                    // Search Pair Adjustment Positioning Format 2
                    const class1 = this.getGlyphClass(subtable.classDef1, leftIndex);
                    const class2 = this.getGlyphClass(subtable.classDef2, rightIndex);
                    const pair = subtable.classRecords[class1][class2];
                    return pair.value1 && pair.value1.xAdvance || 0;
            }
        }
    }
    return 0;
};

/**
 * Find a mark to base attachment pair
 *
 * @param {integer} markGlyphIndex - attached mark glyph index
 * @param {integer} baseGlyphIndex - base glyph index
 * @returns {Object[]}
 */
Position.prototype.getMarkToBaseAttachment = function(lookupTables, markGlyphIndex, baseGlyphIndex) {
    for (let i = 0; i < lookupTables.length; i++) {
        const subtables = lookupTables[i].subtables;
        for (let j = 0; j < subtables.length; j++) {
            const subtable = subtables[j];
            const markCovIndex = this.getCoverageIndex(subtable.markCoverage, markGlyphIndex);
            const baseCovIndex = this.getCoverageIndex(subtable.baseCoverage, baseGlyphIndex);
            if (markCovIndex < 0 || baseCovIndex < 0) continue;
            switch (subtable.posFormat) {
                case 1:
                    const markDefinition = subtable.markArray[markCovIndex];
                    const baseDefinition = subtable.baseArray[baseCovIndex];
                    return {
                        attachmentMarkPoint: markDefinition.attachmentPoint,
                        baseMarkPoint: baseDefinition[markDefinition.class],
                    };
            }
        }
    }
    return undefined;
};

/**
 * List all kerning lookup tables.
 *
 * @param {string} [script='DFLT'] - use font.position.getDefaultScriptName() for a better default value
 * @param {string} [language='dflt']
 * @return {object[]} The list of kerning lookup tables (may be empty), or undefined if there is no GPOS table (and we should use the kern table)
 */
Position.prototype.getKerningTables = function(script, language) {
    return this.getPositionFeatures(['kern'], script, language);
};

/**
 * Assembling features into ordered lookup list
 * Assemble all features (including any required feature) for the glyph run’s language system.
 * Assemble all lookups in these features, in LookupList order, removing any duplicates.
 *
 * https://learn.microsoft.com/en-us/typography/opentype/otspec191alpha/chapter2#lookup-table
 *
 * @param {string[]} list of requested features
 * @param {string} script
 * @param {string} language
 * @return {Object[]} ordered lookup processing list
 */
Position.prototype.getPositionFeatures = function(features, script, language) {
    return this.getFeaturesLookups(features, script, language);
};

export default Position;
