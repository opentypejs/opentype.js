// The Position object provides utility methods to manipulate
// the GPOS position table.

import Layout from './layout.mjs';

/**
 * @exports opentype.Position
 * @class
 * @extends opentype.Layout
 * @param {opentype.Font}
 * @constructor
 */
function Position(font) {
    Layout.call(this, font, 'gpos');
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
                case 1: {
                    // Search Pair Adjustment Positioning Format 1
                    let pairSet = subtable.pairSets[covIndex];
                    for (let k = 0; k < pairSet.length; k++) {
                        let pair = pairSet[k];
                        if (pair.secondGlyph === rightIndex) {
                            return pair.value1 && pair.value1.xAdvance || 0;
                        }
                    }
                    break;      // left glyph found, not right glyph - try next subtable
                }
                case 2: {
                    // Search Pair Adjustment Positioning Format 2
                    const class1 = this.getGlyphClass(subtable.classDef1, leftIndex);
                    const class2 = this.getGlyphClass(subtable.classDef2, rightIndex);
                    const pair = subtable.classRecords[class1][class2];
                    return pair.value1 && pair.value1.xAdvance || 0;
                }
            }
        }
    }
    return 0;
};

/**
 * List all kerning lookup tables.
 *
 * @param {string} [script='DFLT'] - use font.position.getDefaultScriptName() for a better default value
 * @param {string} [language='dflt']
 * @return {object[]} The list of kerning lookup tables (may be empty), or undefined if there is no GPOS table (and we should use the kern table)
 */
Position.prototype.getKerningTables = function(script, language) {
    if (this.font.tables.gpos) {
        return this.getLookupTables(script, language, 'kern', 2);
    }
};

/**
 * Resolve anchor X/Y coordinates, applying variation deltas when the font is variable and
 * the anchor uses VariationIndex (GPOS Anchor format 3). Per GPOS spec, variable fonts use
 * ItemVariationStore in GDEF for anchor adjustment; deltas are added to the default coordinates.
 *
 * Anchor table: GPOS "Anchor table" / AnchorFormat1 — xCoordinate then yCoordinate (int16, design units).
 * https://learn.microsoft.com/en-us/typography/opentype/spec/gpos#anchor-table
 *
 * @param {Object} anchor - Parsed anchor (format 1, 2, or 3) or null
 * @returns {{ x: number, y: number } | null} Resolved coordinates in font units, or null if anchor is null
 */
Position.prototype.resolveAnchorCoordinates = function(anchor) {
    if (!anchor) return null;
    let x = anchor.xCoordinate;
    let y = anchor.yCoordinate;
    const store = this.font.tables.gdef && this.font.tables.gdef.itemVariationStore;
    const vp = this.font.variation && this.font.variation.process;
    const coords = this.font.variation && this.font.variation.get();
    if (store && vp && coords) {
        if (anchor.xVariationIndex) {
            x += vp.getDelta(store, anchor.xVariationIndex.outer, anchor.xVariationIndex.inner, coords);
        }
        if (anchor.yVariationIndex) {
            y += vp.getDelta(store, anchor.yVariationIndex.outer, anchor.yVariationIndex.inner, coords);
        }
    }
    return { x, y };
};

/**
 * List Mark-to-Base positioning lookup tables (GPOS Lookup type 4) for the 'mark' feature.
 * Used to position combining marks relative to base glyphs via anchor points.
 * Also includes type-4 lookups from the script's required feature (required feature often holds 'mark').
 *
 * @param {string} [script='DFLT']
 * @param {string} [language='dflt']
 * @return {Array<{ lookup: object, featureTag: string }>} Lookup tables with type 4 subtables (and their feature tag), or empty array
 */
Position.prototype.getMarkToBaseTables = function(script, language) {
    if (!this.font.tables.gpos) {
        return [];
    }
    const table = this.font.tables.gpos;
    const allLookups = table.lookups || [];
    const allFeatures = table.features || [];
    const seen = new Set();
    const result = [];
    const tryLangSys = (scr, lang) => {
        const langSys = this.getLangSysTable(scr, lang);
        if (!langSys) return;
        const featIndexes = langSys.featureIndexes || [];
        const reqFeatureIndex = langSys.reqFeatureIndex;
        const indices = (reqFeatureIndex !== undefined && reqFeatureIndex !== 0xFFFF && reqFeatureIndex < allFeatures.length)
            ? [reqFeatureIndex].concat(featIndexes.filter(i => i !== reqFeatureIndex))
            : featIndexes;
        for (let f = 0; f < indices.length; f++) {
            const featureRecord = allFeatures[indices[f]];
            if (!featureRecord || !featureRecord.feature) continue;
            const tag = featureRecord.tag;
            const lookupListIndexes = featureRecord.feature.lookupListIndexes || [];
            for (let i = 0; i < lookupListIndexes.length; i++) {
                const lookup = allLookups[lookupListIndexes[i]];
                if (!lookup) continue;
                // Type 9 (Extension Positioning) returns inner subtables transparently via parseLookup9,
                // so its lookup.subtables already contain the wrapped type's data (e.g. mark-to-base).
                if (lookup.lookupType !== 4 && lookup.lookupType !== 9) continue;
                if (!seen.has(lookup)) {
                    seen.add(lookup);
                    result.push({ lookup, featureTag: tag });
                }
            }
        }
    };
    tryLangSys(script || this.getDefaultScriptName(), language);
    if (script !== 'DFLT') tryLangSys('DFLT', 'dflt');
    if (script !== 'latn') tryLangSys('latn', 'dflt');
    return result;
};

/**
 * Get the positioning offset for a mark glyph relative to a base glyph from MarkToBase (GPOS type 4) subtables.
 * The returned offset should be added to the mark's default position (pen after base advance) so that
 * the mark's anchor aligns with the base's anchor. Values are in font units.
 *
 * Known limitations (TODOs):
 * - GSUB 'ccmp'/'mark' features should run before GPOS to ensure the correct base/mark glyphs are present.
 * - GPOS Lookup Type 5 (Mark-to-Ligature) is not implemented; ligature bases fall back to heuristic placement.
 * - GPOS Lookup Type 6 (Mark-to-Mark) is not implemented; stacked marks (e.g. base + mark1 + mark2) only
 *   position the first mark via GPOS — subsequent marks use the heuristic.
 * - GDEF Mark Attachment Class Definition filtering is not applied; we match by anchor coverage only.
 *
 * @param {number} markGlyphIndex - Glyph ID of the combining mark
 * @param {number} baseGlyphIndex - Glyph ID of the base glyph (the preceding glyph)
 * @param {number} baseAdvanceWidth - Advance width of the base glyph (font units)
 * @param {string} [script='DFLT']
 * @param {string} [language='dflt']
 * @returns {{ xOffset: number, yOffset: number } | undefined} Offset in font units, or undefined if no positioning defined
 */
Position.prototype.getMarkToBaseOffset = function(markGlyphIndex, baseGlyphIndex, baseAdvanceWidth, script, language) {
    const entries = this.getMarkToBaseTables(script, language);
    for (let i = 0; i < entries.length; i++) {
        const lookup = entries[i].lookup;
        if (lookup.error) continue;
        const subtables = lookup.subtables || [];
        for (let j = 0; j < subtables.length; j++) {
            const sub = subtables[j].extension !== undefined ? subtables[j].extension : subtables[j];
            if (sub.error) continue;
            if (sub.posFormat !== 1) continue;
            const markCov = sub.markCoverage;
            const baseCov = sub.baseCoverage;
            if (!markCov || !baseCov) continue;
            const markIndex = this.getCoverageIndex(markCov, markGlyphIndex);
            const baseIndex = this.getCoverageIndex(baseCov, baseGlyphIndex);
            if (markIndex < 0 || baseIndex < 0) continue;
            const markRecord = sub.markArray && sub.markArray[markIndex];
            const baseAnchors = sub.baseArray && sub.baseArray[baseIndex];
            if (!markRecord || !markRecord.anchor || !baseAnchors) continue;
            const markClass = markRecord.markClass;
            const baseAnchor = baseAnchors[markClass];
            if (!baseAnchor) continue;
            const markCoord = this.resolveAnchorCoordinates(markRecord.anchor);
            const baseCoord = this.resolveAnchorCoordinates(baseAnchor);
            // GPOS Lookup Type 4: "positioning the mark with respect to the final pen point (advance) position of the base glyph"
            // Align anchors: mark's anchor in world = base's anchor in world.
            //   mark_world_x = penAfterBase + xOffset + markCoord.x  =>  xOffset = baseCoord.x - markCoord.x - baseAdvanceWidth
            //   mark_world_y = yOffset + markCoord.y                 =>  yOffset = baseCoord.y - markCoord.y
            // This is correct for both simple and composite mark glyphs: the GPOS anchor is always in the mark
            // glyph's own coordinate space (spec: "Anchor table … design units"), and the rendering engine draws
            // composite components relative to the positioned glyph origin automatically.  No extra dx/dy
            // correction is needed here — that would override the explicitly authored mark anchor.
            // Spec: https://learn.microsoft.com/en-us/typography/opentype/spec/gpos#lookup-type-4-mark-to-base-attachment-positioning-subtable
            return {
                xOffset: baseCoord.x - markCoord.x - baseAdvanceWidth,
                yOffset: baseCoord.y - markCoord.y
            };
        }
    }
    // Only use GPOS mark-to-base when a single subtable covers both mark and base (direct match).
    // Do not fall back to pairing mark from one subtable with base from another; fonts like Noto Sans
    // may have no intended mark-to-base for e+ring, and the correct behavior is to use component placement only.
    return undefined;
};

export default Position;
