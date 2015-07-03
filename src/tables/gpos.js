// The `GPOS` table contains kerning pairs, among other things.
// https://www.microsoft.com/typography/OTSPEC/gpos.htm

'use strict';

var check = require('../check');
var parse = require('../parse');
var table = require('../table');

// Parse ScriptList and FeatureList tables of GPOS, GSUB, GDEF, BASE, JSTF tables.
// These lists are unused by now, this function is just the basis for a real parsing.
function parseTaggedListTable(data, start) {
    var p = new parse.Parser(data, start);
    var n = p.parseUShort();
    var list = [];
    for (var i = 0; i < n; i++) {
        list[p.parseTag()] = { offset: p.parseUShort() };
    }

    return list;
}

// Parse a coverage table in a GSUB, GPOS or GDEF table.
// Format 1 is a simple list of glyph ids,
// Format 2 is a list of ranges. It is expanded in a list of glyphs, maybe not the best idea.
function parseCoverageTable(data, start) {
    var p = new parse.Parser(data, start);
    var format = p.parseUShort();
    var count =  p.parseUShort();
    if (format === 1) {
        return p.parseUShortList(count);
    }
    else if (format === 2) {
        var coverage = [];
        for (; count--;) {
            var begin = p.parseUShort();
            var end = p.parseUShort();
            var index = p.parseUShort();
            for (var i = begin; i <= end; i++) {
                coverage[index++] = i;
            }
        }

        return coverage;
    }
}

// Parse a Class Definition Table in a GSUB, GPOS or GDEF table.
// Returns a function that gets a class value from a glyph ID.
function parseClassDefTable(data, start) {
    var p = new parse.Parser(data, start);
    var format = p.parseUShort();
    if (format === 1) {
        // Format 1 specifies a range of consecutive glyph indices, one class per glyph ID.
        var startGlyph = p.parseUShort();
        var glyphCount = p.parseUShort();
        var classes = p.parseUShortList(glyphCount);
        return function(glyphID) {
            return classes[glyphID - startGlyph] || 0;
        };
    }
    else if (format === 2) {
        // Format 2 defines multiple groups of glyph indices that belong to the same class.
        var rangeCount = p.parseUShort();
        var startGlyphs = [];
        var endGlyphs = [];
        var classValues = [];
        for (var i = 0; i < rangeCount; i++) {
            startGlyphs[i] = p.parseUShort();
            endGlyphs[i] = p.parseUShort();
            classValues[i] = p.parseUShort();
        }

        return function(glyphID) {
            var l = 0;
            var r = startGlyphs.length - 1;
            while (l < r) {
                var c = (l + r + 1) >> 1;
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
function parsePairPosSubTable(data, start) {
    var p = new parse.Parser(data, start);
    // This part is common to format 1 and format 2 subtables

    var subTable = {};
    subTable.format = p.parseUShort();
    subTable.coverageOffset = p.parseUShort();
    subTable.coverage = parseCoverageTable(data, start + subTable.coverageOffset);

    // valueFormat 4: XAdvance only, 1: XPlacement only, 0: no ValueRecord for second glyph
    // Only valueFormat1=4 and valueFormat2=0 is supported.
    subTable.valueFormat1 = p.parseUShort();
    subTable.valueFormat2 = p.parseUShort();

    var value1;
    var value2;
    check.argument(subTable.valueFormat1 == 4 && subTable.valueFormat2 == 0,
                   'GPOS table: Only valueFormat1 = 4 and valueFormat2 = 0 is supported.');
    subTable.sharedPairSets = {};
    if (subTable.format === 1) {
        // Pair Positioning Adjustment: Format 1
        var pairSetCount = p.parseUShort();
        subTable.pairSet = [];
        // Array of offsets to PairSet tables-from beginning of PairPos subtable-ordered by Coverage Index
        var pairSetOffsets = p.parseOffset16List(pairSetCount);
        for (var firstGlyph = 0; firstGlyph < pairSetCount; firstGlyph++) {
            var pairSetOffset = pairSetOffsets[firstGlyph];
            var sharedPairSet = subTable.sharedPairSets[pairSetOffset];
            if (!sharedPairSet) {
                // Parse a pairset table in a pair adjustment subtable format 1
                sharedPairSet = {};
                p.relativeOffset = pairSetOffset;
                var pairValueCount = p.parseUShort();
                for (; pairValueCount--;) {
                    var secondGlyph = p.parseUShort();
                    if (subTable.valueFormat1) value1 = p.parseShort();
                    if (subTable.valueFormat2) value2 = p.parseShort();
                    // We only support valueFormat1 = 4 and valueFormat2 = 0,
                    // so value1 is the XAdvance and value2 is empty.
                    sharedPairSet[secondGlyph] = value1;
                }
            }

            subTable.pairSet[subTable.coverage[firstGlyph]] = sharedPairSet;
        }

        subTable.getValue = function(leftGlyph, rightGlyph) {
            var pairs = subTable.pairSet[leftGlyph];
            if (pairs) return pairs[rightGlyph];
        };
        return subTable;
    }
    else if (subTable.format === 2) {
        // Pair Positioning Adjustment: Format 2
        var classDef1Offset = p.parseUShort();
        var classDef2Offset = p.parseUShort();
        var class1Count = p.parseUShort();
        var class2Count = p.parseUShort();
        var getClass1 = parseClassDefTable(data, start + classDef1Offset);
        var getClass2 = parseClassDefTable(data, start + classDef2Offset);

        // Parse kerning values by class pair.
        var kerningMatrix = [];
        for (var i = 0; i < class1Count; i++) {
            var kerningRow = kerningMatrix[i] = [];
            for (var j = 0; j < class2Count; j++) {
                if (subTable.valueFormat1) value1 = p.parseShort();
                if (subTable.valueFormat2) value2 = p.parseShort();
                // We only support valueFormat1 = 4 and valueFormat2 = 0,
                // so value1 is the XAdvance and value2 is empty.
                kerningRow[j] = value1;
            }
        }

        // Convert coverage list to a hash
        var covered = {};
        for (i = 0; i < subTable.coverage.length; i++)
            covered[subTable.coverage[i]] = 1;

        // Get the kerning value for a specific glyph pair.
        subTable.getValue = function(leftGlyph, rightGlyph) {
            if (!covered[leftGlyph]) return;
            var class1 = getClass1(leftGlyph);
            var class2 = getClass2(rightGlyph);
            var kerningRow = kerningMatrix[class1];

            if (kerningRow) {
                return kerningRow[class2];
            }
        };
        return subTable;
    }
}

var LType = Object.freeze({
      SINGLE_ADJUSTMENT: 1
    , PAIR_ADJUSTMENT: 2
    , CURSIVE_ADJUSTMENT: 3
    , MARK_TO_BASE_ATTACHMENT: 4
    , MARK_TO_LIGATURE_ATTACHMENT: 5
    , MARK_TO_MARK_ATTACHMENT: 6
    , CONTEXTUAL_POSITIONING: 7
    , CHAINED_CONTEXTUAL_POSITIONING: 8
    , EXTENSION_POSITIONING: 9
});

// Parse a LookupTable (present in of GPOS, GSUB, GDEF, BASE, JSTF tables).
function parseLookupTable(data, start) {
    var p = new parse.Parser(data, start)
      , lookupType = p.parseUShort()
      , lookupFlag = p.parseUShort()
      , useMarkFilteringSet = lookupFlag & 0x10
      , subTableCount = p.parseUShort()
      , subTableOffsets = p.parseOffset16List(subTableCount)
      , table = {
            lookupType: lookupType,
            lookupFlag: lookupFlag,
            subtables: [],
            markFilteringSet: useMarkFilteringSet ? p.parseUShort() : -1
        }
      ;

    switch (lookupType){
        case LType.SINGLE_ADJUSTMENT:
            //FIX-ME: NotImplementedError
            break;

        case LType.PAIR_ADJUSTMENT: //Pair adjustment
            for (var i = 0; i < subTableCount; i++) {
                table.subtables.push(parsePairPosSubTable(data, start + subTableOffsets[i]));
            }
            break;

        case LType.CURSIVE_ADJUSTMENT:
        case LType.MARK_TO_BASE_ATTACHMENT:
        case LType.MARK_TO_LIGATURE_ATTACHMENT:
        case LType.MARK_TO_MARK_ATTACHMENT:
        case LType.CONTEXTUAL_POSITIONING:
        case LType.CHAINED_CONTEXTUAL_POSITIONING:
        case LType.EXTENSION_POSITIONING:
            //FIX-ME: NotImplementedError
            break;
    }

    // Provide a function which finds the kerning values in the subtables.
    table.getKerningValue = function(leftGlyph, rightGlyph) {
        for (var i = table.subtables.length; i--;) {
            var value = table.subtables[i].getValue(leftGlyph, rightGlyph);
            if (value !== undefined) return value;
        }

        return 0;
    };

    return table;
}

// Parse the `GPOS` table which contains, among other things, kerning pairs.
// https://www.microsoft.com/typography/OTSPEC/gpos.htm
function parseGposTable(data, start, font) {
    var p = new parse.Parser(data, start);

    var gpos = {};
    gpos.tableVersion = p.parseFixed();
    check.argument(gpos.tableVersion === 1, 'Unsupported GPOS table version.');

    // ScriptList and FeatureList - ignored for now
    // 'kern' is the feature we are looking for.
    gpos.scriptList = parseTaggedListTable(data, start + p.parseUShort());
    gpos.featureList = parseTaggedListTable(data, start + p.parseUShort());

    // LookupList
    gpos.lookupList = Array();
    var lookupListOffset = p.parseUShort();
    p.relativeOffset = lookupListOffset;
    var lookupCount = p.parseUShort();
    var lookupTableOffsets = p.parseOffset16List(lookupCount);
    var lookupListAbsoluteOffset = start + lookupListOffset;
    for (var i = 0; i < lookupCount; i++) {
        var table = parseLookupTable(data, lookupListAbsoluteOffset + lookupTableOffsets[i]);
        if (table.lookupType === 2 && !font.getGposKerningValue) font.getGposKerningValue = table.getKerningValue;
        gpos.lookupList.push(table);
    }
    return gpos;
}

function makeGposTable(font) {
    var gpos = font.tables.gpos;

    var t = new table.Table('gpos', [
        {name: 'version', type: 'FIXED', value: gpos.tableVersion},
        {name: 'ScriptListOffset', type: 'USHORT', value: 0}, /* ignored by parser */
        {name: 'FeatureListOffset', type: 'USHORT', value: 0}, /* ignored by parser */
        {name: 'lookupListOffset', type: 'USHORT', value: 0},
        {name: 'lookupCount', type: 'USHORT', value: gpos.lookupCount},
        {name: 'lookupOffsets', type: 'TABLE'}
    ]);

//    t.ScriptList = makeScriptList(gpos); /* ignored by parser */
//    t.FeatureList = makeFeatureList(gpos); /* ignored by parser */

// OVERALL STRUCTURE of the data we need to parse here:
//
//      < UShort lookupListOffset >
//at offset = lookupListOffset:
//      < UShort lookupCount >
//      < Offset16List[lookupCount] lookupTableOffsets >
//
//at offset = start + lookupListOffset + lookupTableOffsets[i]:
//      < LookupTable data entry >

    t.lookupOffsets = [];
    var offset = 0;
    for (var i = 0; i < gpos.lookupCount; i++) {
        //TODO: encode a Lookup entry
        //TODO: offset += lookupEntry.sizeOf()
        t.lookupOffsets.push({name: 'lookup_offset_' + i, type: 'USHORT', value: offset});
        offset += 2;
    }

    return t;
}

exports.parse = parseGposTable;
exports.make = makeGposTable;
