// The `GPOS` table contains kerning pairs, among other things.
// https://www.microsoft.com/typography/OTSPEC/gpos.htm

'use strict';

var check = require('../check');
var parse = require('../parse');

// Parse ScriptList and FeatureList tables of GPOS, GSUB, GDEF, BASE, JSTF tables.
// These lists are unused by now, this function is just the basis for a real parsing.
function parseTaggedListTable(data, start) {
    var p = new parse.Parser(data, start),
        n = p.parseUShort(),
        list = [];
    for (var i = 0; i < n; i++) {
        list[p.parseTag()] = { offset: p.parseUShort() };
    }
    return list;
}

// Parse a coverage table in a GSUB, GPOS or GDEF table.
// Format 1 is a simple list of glyph ids,
// Format 2 is a list of ranges. It is expanded in a list of glyphs, maybe not the best idea.
function parseCoverageTable(data, start) {
    var p = new parse.Parser(data, start),
        format = p.parseUShort(),
        count =  p.parseUShort();
    if (format === 1) {
        return p.parseUShortList(count);
    }
    else if (format === 2) {
        var i, begin, end, index, coverage = [];
        for (; count--;) {
            begin = p.parseUShort();
            end = p.parseUShort();
            index = p.parseUShort();
            for (i = begin; i <= end; i++) {
                coverage[index++] = i;
            }
        }
        return coverage;
    }
}

// Parse a Class Definition Table in a GSUB, GPOS or GDEF table.
// Returns a function that gets a class value from a glyph ID.
function parseClassDefTable(data, start) {
    var p = new parse.Parser(data, start),
        format = p.parseUShort();
    if (format === 1) {
        // Format 1 specifies a range of consecutive glyph indices, one class per glyph ID.
        var startGlyph = p.parseUShort(),
            glyphCount = p.parseUShort(),
            classes = p.parseUShortList(glyphCount);
        return function(glyphID) {
            return classes[glyphID - startGlyph] || 0;
        };
    }
    else if (format === 2) {
        // Format 2 defines multiple groups of glyph indices that belong to the same class.
        var rangeCount = p.parseUShort(),
            startGlyphs = [],
            endGlyphs = [],
            classValues = [];
        for (var i = 0; i < rangeCount; i++) {
            startGlyphs[i] = p.parseUShort();
            endGlyphs[i] = p.parseUShort();
            classValues[i] = p.parseUShort();
        }
        return function(glyphID) {
            var l, c, r;
            l = 0;
            r = startGlyphs.length - 1;
            while (l < r) {
                c = (l + r + 1) >> 1;
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
    var p = new parse.Parser(data, start);
    var format, coverageOffset, coverage, valueFormat1, valueFormat2,
        sharedPairSets, firstGlyph, secondGlyph, value1, value2;
    // This part is common to format 1 and format 2 subtables
    format = p.parseUShort();
    coverageOffset = p.parseUShort();
    coverage = parseCoverageTable(data, start+coverageOffset);
    // valueFormat 4: XAdvance only, 1: XPlacement only, 0: no ValueRecord for second glyph
    // Only valueFormat1=4 and valueFormat2=0 is supported.
    valueFormat1 = p.parseUShort();
    valueFormat2 = p.parseUShort();
    if (valueFormat1 !== 4 || valueFormat2 !== 0) return;
    sharedPairSets = {};
    if (format === 1) {
        // Pair Positioning Adjustment: Format 1
        var pairSetCount, pairSetOffsets, pairSetOffset, sharedPairSet, pairValueCount, pairSet;
        pairSetCount = p.parseUShort();
        pairSet = [];
        // Array of offsets to PairSet tables-from beginning of PairPos subtable-ordered by Coverage Index
        pairSetOffsets = p.parseOffset16List(pairSetCount);
        for (firstGlyph = 0; firstGlyph < pairSetCount; firstGlyph++) {
            pairSetOffset = pairSetOffsets[firstGlyph];
            sharedPairSet = sharedPairSets[pairSetOffset];
            if (!sharedPairSet) {
                // Parse a pairset table in a pair adjustment subtable format 1
                sharedPairSet = {};
                p.relativeOffset = pairSetOffset;
                pairValueCount = p.parseUShort();
                for (; pairValueCount--;) {
                    secondGlyph = p.parseUShort();
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
            var pairs = pairSet[leftGlyph];
            if (pairs) return pairs[rightGlyph];
        };
    }
    else if (format === 2) {
        // Pair Positioning Adjustment: Format 2
        var classDef1Offset, classDef2Offset, class1Count, class2Count, i, j,
            getClass1, getClass2, kerningMatrix, kerningRow, covered;
        classDef1Offset = p.parseUShort();
        classDef2Offset = p.parseUShort();
        class1Count = p.parseUShort();
        class2Count = p.parseUShort();
        getClass1 = parseClassDefTable(data, start+classDef1Offset);
        getClass2 = parseClassDefTable(data, start+classDef2Offset);

        // Parse kerning values by class pair.
        kerningMatrix = [];
        for (i = 0; i < class1Count; i++) {
            kerningRow = kerningMatrix[i] = [];
            for (j = 0; j < class2Count; j++) {
                if (valueFormat1) value1 = p.parseShort();
                if (valueFormat2) value2 = p.parseShort();
                // We only support valueFormat1 = 4 and valueFormat2 = 0,
                // so value1 is the XAdvance and value2 is empty.
                kerningRow[j] = value1;
            }
        }

        // Convert coverage list to a hash
        covered = {};
        for(i = 0; i < coverage.length; i++) covered[coverage[i]] = 1;

        // Get the kerning value for a specific glyph pair.
        return function(leftGlyph, rightGlyph) {
            if (!covered[leftGlyph]) return null;
            var class1 = getClass1(leftGlyph),
                class2 = getClass2(rightGlyph),
                kerningRow = kerningMatrix[class1];
            return kerningRow ? kerningRow[class2] : null;
        };
    }
}

// Parse a LookupTable (present in of GPOS, GSUB, GDEF, BASE, JSTF tables).
function parseLookupTable(data, start) {
    var p = new parse.Parser(data, start);
    var table, lookupType, lookupFlag, useMarkFilteringSet, subTableCount, subTableOffsets, subtables, i;
    lookupType = p.parseUShort();
    lookupFlag = p.parseUShort();
    useMarkFilteringSet = lookupFlag & 0x10;
    subTableCount = p.parseUShort();
    subTableOffsets = p.parseOffset16List(subTableCount);
    table = {
        lookupType: lookupType,
        lookupFlag: lookupFlag,
        markFilteringSet: useMarkFilteringSet ? p.parseUShort() : -1
    };
    // LookupType 2, Pair adjustment
    if (lookupType === 2) {
        subtables = [];
        for (i = 0; i < subTableCount; i++) {
            subtables.push(parsePairPosSubTable(data, start + subTableOffsets[i]));
        }
        // Return a function which finds the kerning values in the subtables.
        table.getKerningValue = function(leftGlyph, rightGlyph) {
            for (var i = subtables.length; i--;) {
                var value = subtables[i](leftGlyph, rightGlyph);
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
    var p, tableVersion, lookupListOffset, scriptList, i, featureList, lookupCount,
        lookupTableOffsets, lookupListAbsoluteOffset, table;

    p = new parse.Parser(data, start);
    tableVersion = p.parseFixed();
    check.argument(tableVersion === 1, 'Unsupported GPOS table version.');

    // ScriptList and FeatureList - ignored for now
    scriptList = parseTaggedListTable(data, start+p.parseUShort());
    // 'kern' is the feature we are looking for.
    featureList = parseTaggedListTable(data, start+p.parseUShort());

    // LookupList
    lookupListOffset = p.parseUShort();
    p.relativeOffset = lookupListOffset;
    lookupCount = p.parseUShort();
    lookupTableOffsets = p.parseOffset16List(lookupCount);
    lookupListAbsoluteOffset = start + lookupListOffset;
    for (i = 0; i < lookupCount; i++) {
        table = parseLookupTable(data, lookupListAbsoluteOffset + lookupTableOffsets[i]);
        if (table.lookupType === 2 && !font.getGposKerningValue) font.getGposKerningValue = table.getKerningValue;
    }
}

exports.parse = parseGposTable;
