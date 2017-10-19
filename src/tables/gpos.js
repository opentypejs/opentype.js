// The `GPOS` table contains kerning pairs, among other things.
// https://www.microsoft.com/typography/OTSPEC/gpos.htm

import check from '../check';
import parse from '../parse';

// Parse ScriptList and FeatureList tables of GPOS, GSUB, GDEF, BASE, JSTF tables.
// These lists are unused by now, this function is just the basis for a real parsing.
function parseTaggedListTable(data, start) {
    const p = new parse.Parser(data, start);
    const n = p.parseUShort();
    const list = [];
    for (let i = 0; i < n; i++) {
        list[p.parseTag()] = { offset: p.parseUShort() };
    }

    return list;
}

// Parse a coverage table in a GSUB, GPOS or GDEF table.
// Format 1 is a simple list of glyph ids,
// Format 2 is a list of ranges. It is expanded in a list of glyphs, maybe not the best idea.
function parseCoverageTable(data, start) {
    const p = new parse.Parser(data, start);
    const format = p.parseUShort();
    let count = p.parseUShort();
    if (format === 1) {
        return p.parseUShortList(count);
    } else if (format === 2) {
        const coverage = [];
        for (; count--;) {
            const begin = p.parseUShort();
            const end = p.parseUShort();
            let index = p.parseUShort();
            for (let i = begin; i <= end; i++) {
                coverage[index++] = i;
            }
        }

        return coverage;
    }
}

// Parse a Class Definition Table in a GSUB, GPOS or GDEF table.
// Returns a function that gets a class value from a glyph ID.
function parseClassDefTable(data, start) {
    const p = new parse.Parser(data, start);
    const format = p.parseUShort();
    if (format === 1) {
        // Format 1 specifies a range of consecutive glyph indices, one class per glyph ID.
        const startGlyph = p.parseUShort();
        const glyphCount = p.parseUShort();
        const classes = p.parseUShortList(glyphCount);
        return function(glyphID) {
            return classes[glyphID - startGlyph] || 0;
        };
    } else if (format === 2) {
        // Format 2 defines multiple groups of glyph indices that belong to the same class.
        const rangeCount = p.parseUShort();
        const startGlyphs = [];
        const endGlyphs = [];
        const classValues = [];
        for (let i = 0; i < rangeCount; i++) {
            startGlyphs[i] = p.parseUShort();
            endGlyphs[i] = p.parseUShort();
            classValues[i] = p.parseUShort();
        }

        return function(glyphID) {
            let l = 0;
            let r = startGlyphs.length - 1;
            while (l < r) {
                const c = (l + r + 1) >> 1;
                if (glyphID < startGlyphs[c]) {
                    r = c - 1;
                } else {
                    l = c;
                }
            }

            if (startGlyphs[l] <= glyphID && glyphID <= endGlyphs[l]) {
                return classValues[l] || 0;
            }

            return 0;
        };
    }
}

// Parse a pair adjustment positioning subtable, format 1 or format 2
// The subtable is returned in the form of a lookup function.
function parsePairPosSubTable(data, start) {
    const p = new parse.Parser(data, start);
    // This part is common to format 1 and format 2 subtables
    const format = p.parseUShort();
    const coverageOffset = p.parseUShort();
    const coverage = parseCoverageTable(data, start + coverageOffset);
    // valueFormat 4: XAdvance only, 1: XPlacement only, 0: no ValueRecord for second glyph
    // Only valueFormat1=4 and valueFormat2=0 is supported.
    const valueFormat1 = p.parseUShort();
    const valueFormat2 = p.parseUShort();
    let value1;
    let value2;
    if (valueFormat1 !== 4 || valueFormat2 !== 0) return;
    const sharedPairSets = {};
    if (format === 1) {
        // Pair Positioning Adjustment: Format 1
        const pairSetCount = p.parseUShort();
        const pairSet = [];
        // Array of offsets to PairSet tables-from beginning of PairPos subtable-ordered by Coverage Index
        const pairSetOffsets = p.parseOffset16List(pairSetCount);
        for (let firstGlyph = 0; firstGlyph < pairSetCount; firstGlyph++) {
            const pairSetOffset = pairSetOffsets[firstGlyph];
            let sharedPairSet = sharedPairSets[pairSetOffset];
            if (!sharedPairSet) {
                // Parse a pairset table in a pair adjustment subtable format 1
                sharedPairSet = {};
                p.relativeOffset = pairSetOffset;
                let pairValueCount = p.parseUShort();
                for (; pairValueCount--;) {
                    const secondGlyph = p.parseUShort();
                    if (valueFormat1) value1 = p.parseShort();
                    if (valueFormat2) value2 = p.parseShort();
                    // We only support valueFormat1 = 4 and valueFormat2 = 0,
                    // so value1 is the XAdvance and value2 is empty.
                    sharedPairSet[secondGlyph] = value1;
                }
            }

            pairSet[coverage[firstGlyph]] = sharedPairSet;
        }

        return function(leftGlyph, rightGlyph) {
            const pairs = pairSet[leftGlyph];
            if (pairs) return pairs[rightGlyph];
        };
    } else if (format === 2) {
        // Pair Positioning Adjustment: Format 2
        const classDef1Offset = p.parseUShort();
        const classDef2Offset = p.parseUShort();
        const class1Count = p.parseUShort();
        const class2Count = p.parseUShort();
        const getClass1 = parseClassDefTable(data, start + classDef1Offset);
        const getClass2 = parseClassDefTable(data, start + classDef2Offset);

        // Parse kerning values by class pair.
        const kerningMatrix = [];
        for (let i = 0; i < class1Count; i++) {
            const kerningRow = kerningMatrix[i] = [];
            for (let j = 0; j < class2Count; j++) {
                if (valueFormat1) value1 = p.parseShort();
                if (valueFormat2) value2 = p.parseShort();
                // We only support valueFormat1 = 4 and valueFormat2 = 0,
                // so value1 is the XAdvance and value2 is empty.
                kerningRow[j] = value1;
            }
        }

        // Convert coverage list to a hash
        const covered = {};
        for (let i = 0; i < coverage.length; i++) {
            covered[coverage[i]] = 1;
        }

        // Get the kerning value for a specific glyph pair.
        return function(leftGlyph, rightGlyph) {
            if (!covered[leftGlyph]) return;
            const class1 = getClass1(leftGlyph);
            const class2 = getClass2(rightGlyph);
            const kerningRow = kerningMatrix[class1];

            if (kerningRow) {
                return kerningRow[class2];
            }
        };
    }
}

// Parse a LookupTable (present in of GPOS, GSUB, GDEF, BASE, JSTF tables).
function parseLookupTable(data, start) {
    const p = new parse.Parser(data, start);
    const lookupType = p.parseUShort();
    const lookupFlag = p.parseUShort();
    const useMarkFilteringSet = lookupFlag & 0x10;
    const subTableCount = p.parseUShort();
    const subTableOffsets = p.parseOffset16List(subTableCount);
    const table = {
        lookupType: lookupType,
        lookupFlag: lookupFlag,
        markFilteringSet: useMarkFilteringSet ? p.parseUShort() : -1
    };
    // LookupType 2, Pair adjustment
    if (lookupType === 2) {
        const subtables = [];
        for (let i = 0; i < subTableCount; i++) {
            const pairPosSubTable = parsePairPosSubTable(data, start + subTableOffsets[i]);
            if (pairPosSubTable) subtables.push(pairPosSubTable);
        }
        // Return a function which finds the kerning values in the subtables.
        table.getKerningValue = function(leftGlyph, rightGlyph) {
            for (let i = subtables.length; i--;) {
                const value = subtables[i](leftGlyph, rightGlyph);
                if (value !== undefined) return value;
            }

            return 0;
        };
    }

    return table;
}

// Parse the `GPOS` table which contains, among other things, kerning pairs.
// https://www.microsoft.com/typography/OTSPEC/gpos.htm
function parseGposTable(data, start, font) {
    const p = new parse.Parser(data, start);
    const tableVersion = p.parseFixed();
    check.argument(tableVersion === 1, 'Unsupported GPOS table version.');

    // ScriptList and FeatureList - ignored for now
    parseTaggedListTable(data, start + p.parseUShort());
    // 'kern' is the feature we are looking for.
    parseTaggedListTable(data, start + p.parseUShort());

    // LookupList
    const lookupListOffset = p.parseUShort();
    p.relativeOffset = lookupListOffset;
    const lookupCount = p.parseUShort();
    const lookupTableOffsets = p.parseOffset16List(lookupCount);
    const lookupListAbsoluteOffset = start + lookupListOffset;
    for (let i = 0; i < lookupCount; i++) {
        const table = parseLookupTable(data, lookupListAbsoluteOffset + lookupTableOffsets[i]);
        if (table.lookupType === 2 && !font.getGposKerningValue) font.getGposKerningValue = table.getKerningValue;
    }
}

export default { parse: parseGposTable };
