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
function parseCoverageTable(data, start, subtable) {
    var p = new parse.Parser(data, start);
    subtable.coveragetable = [];
    subtable.coveragetable.format = p.parseUShort();
    subtable.coveragetable.count =  p.parseUShort();
    if (subtable.coveragetable.format === 1) {
        return p.parseUShortList(subtable.coveragetable.count);
    }
    else if (subtable.coveragetable.format === 2) {
        subtable.ranges = [];
        var coverage = [];
        var count = subtable.coveragetable.count;
        for (; count--;) {
            var range = {
                'begin': p.parseUShort(),
                'end': p.parseUShort(),
                'index': p.parseUShort()
            };
            subtable.ranges.push(range);

            var index = range.index;
            for (var j = range.begin; j <= range.end; j++) {
                coverage[index++] = j;
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
    console.error("parsePairPosSubTable(data, start="+start+"): " + p.hexdump(8));

    // This part is common to format 1 and format 2 subtables

    var subTable = {};
    subTable.format = p.parseUShort();
    subTable.coverageOffset = p.parseUShort();

    console.error("subTable.format: " + subTable.format);
    console.error("coverageOffset: " + subTable.coverageOffset);

    subTable.coverage = parseCoverageTable(data, start + subTable.coverageOffset, subTable);

    // valueFormat 4: XAdvance only, 1: XPlacement only, 0: no ValueRecord for second glyph
    // Only valueFormat1=4 and valueFormat2=0 is supported.
    subTable.valueFormat1 = p.parseUShort();
    subTable.valueFormat2 = p.parseUShort();

    console.error("valueFormat1: " + subTable.valueFormat1);
    console.error("valueFormat2: " + subTable.valueFormat2);

    var value1;
    var value2;
    check.argument(subTable.valueFormat1 == 4 && subTable.valueFormat2 == 0,
                   'GPOS table: Only valueFormat1 = 4 and valueFormat2 = 0 is supported.');

    if (subTable.format == 1) {
        // Pair Positioning Adjustment: Format 1
        var pairSetCount = p.parseUShort();
        //console.error("FORMAT==1: pairSetCount: " + pairSetCount);
        var psets = [];
        subTable.pairsets = [];
        // Array of offsets to PairSet tables-from beginning of PairPos subtable-ordered by Coverage Index
        var pairSetOffsets = p.parseOffset16List(pairSetCount);
        for (var firstGlyph = 0; firstGlyph < pairSetCount; firstGlyph++) {
            var pairSetOffset = pairSetOffsets[firstGlyph];
            var sharedPairSet = psets[pairSetOffset];
            if (!sharedPairSet) {
                // Parse a pairset table in a pair adjustment subtable format 1
                sharedPairSet = {valueRecords: []};
                p.relativeOffset = pairSetOffset;
                var pairValueCount = p.parseUShort();
                var value = {};
                for (; pairValueCount--;) {
                    value.secondGlyph = p.parseUShort();
                    if (subTable.valueFormat1) value.v1 = p.parseShort();
                    if (subTable.valueFormat2) value.v2 = p.parseShort();
                    sharedPairSet.valueRecords.push(value);
                    //console.error("VALUE: v1=" + value.v1 + " v2=" + value.v2 + " secondGlyph=" + value.secondGlyph);
                }
                psets[pairSetOffset] = sharedPairSet;
            }

            subTable.pairsets[subTable.coverage[firstGlyph]] = sharedPairSet;
        }

        subTable.getValue = function(leftGlyph, rightGlyph) {
            var pairs = subTable.pairsets[leftGlyph];

            // We only support valueFormat1 = 4 and valueFormat2 = 0,
            // so value1 is the XAdvance and value2 is empty.
            if (pairs) return pairs[rightGlyph].v1;
        };
        return subTable;
    }
    else if (subTable.format == 2) {
        //console.error("FORMAT==2");

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
    console.error("== Parse Lookup Table ==");
//    console.error("== start:" + start + " ==");
    var p = new parse.Parser(data, start);
    console.error(">> hexdump:\n" + p.hexdump());

    var lookupType = p.parseUShort()
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

    console.error("lookupType: ", lookupType);
    console.error("lookupFlag: ", lookupFlag);
    console.error("subTableCount: ", subTableCount);

    switch (lookupType){
        case LType.SINGLE_ADJUSTMENT:
            console.error("FIX-ME: lookup type SINGLE_ADJUSTMENT is not implemented!");
            break;

        case LType.PAIR_ADJUSTMENT:
            console.error("PAIR_ADJUSTMENT start:", start);
            for (var i = 0; i < subTableCount; i++) {
                console.error("parsed subTableOffsets[i]:", subTableOffsets[i]);
                table.subtables.push(parsePairPosSubTable(data, start + subTableOffsets[i]));
            }
            break;

        case LType.CURSIVE_ADJUSTMENT:
            console.error("FIX-ME: lookup type CURSIVE_ADJUSTMENT is not implemented!");
            break;

        case LType.MARK_TO_BASE_ATTACHMENT:
            console.error("FIX-ME: lookup type MARK_TO_BASE_ATTACHMENT is not implemented!");
            break;

        case LType.MARK_TO_LIGATURE_ATTACHMENT:
            console.error("FIX-ME: lookup type MARK_TO_LIGATURE_ATTACHMENT is not implemented!");
            break;

        case LType.MARK_TO_MARK_ATTACHMENT:
            console.error("FIX-ME: lookup type MARK_TO_MARK_ATTACHMENT is not implemented!");
            break;

        case LType.CONTEXTUAL_POSITIONING:
            console.error("FIX-ME: lookup type CONTEXTUAL_POSITIONING is not implemented!");
            break;

        case LType.CHAINED_CONTEXTUAL_POSITIONING:
            console.error("FIX-ME: lookup type CHAINED_CONTEXTUAL_POSITIONING is not implemented!");
            break;

        case LType.EXTENSION_POSITIONING:
            console.error("FIX-ME: lookup type EXTENSION_POSITIONING is not implemented!");
            break;
        default:
            console.error("Invalid Lookup Type!");
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

    console.error("**********************************************************\nparseGposTable");
//  console.error("hexdump:\n" + p.hexdump());

    var gpos = {};
    gpos.tableVersion = p.parseFixed();
    check.argument(gpos.tableVersion === 1, 'Unsupported GPOS table version ('+gpos.tableVersion+').');

    // ScriptList and FeatureList - ignored for now
    // 'kern' is the feature we are looking for.
    gpos.scriptList = parseTaggedListTable(data, start + p.parseUShort());
    gpos.featureList = parseTaggedListTable(data, start + p.parseUShort());

    // LookupList
    gpos.lookupList = Array();
    var lookupListOffset = p.parseUShort();
    p.relativeOffset = lookupListOffset;
    var lookupCount = p.parseUShort();

    console.error("lookupCount:", lookupCount);

    var lookupTableOffsets = p.parseOffset16List(lookupCount);
    var lookupListAbsoluteOffset = start + lookupListOffset;
    console.error("lookupListAbsoluteOffset: " + lookupListAbsoluteOffset);
    for (var i = 0; i < lookupCount; i++) {
        console.error("lookupTableOffsets["+i+"]: " + lookupTableOffsets[i]);
        var table = parseLookupTable(data, lookupListAbsoluteOffset + lookupTableOffsets[i]);
        if (table.lookupType === 2 && !font.getGposKerningValue) font.getGposKerningValue = table.getKerningValue;
        gpos.lookupList.push(table);
    }
    return gpos;
}

function encodeCoverageTable(t, subtable, PREFIX){
    var size = 0;
    t.fields.push({name: PREFIX+'_format', type: 'USHORT', value: subtable.coveragetable.format});
    t.fields.push({name: PREFIX+'_count', type: 'USHORT', value: subtable.coveragetable.count});
    size += 4;

    switch (subtable.format){
        case 1:
            for (var i=0; i < subtable.coveragetable.count; i++){
                t.fields.push({name: PREFIX+"_coverage_"+i, type: 'USHORT', value: subtable.coverage[i]});
                size += 2;
            }
            break;
        case 2:
            check.argument(subtable.ranges.length === subtable.coveragetable.count, 'subtable.ranges.length=' + subtable.ranges.length + ' subtable.count=' + subtable.coveragetable.count);
            var coverage = [];
            for (var i=0; i < subtable.coveragetable.count; i++) {
                var range = subtable.ranges[i];
                t.fields.push({name: PREFIX+"_rage_begin_"+i, type: 'USHORT', value: range.begin});
                t.fields.push({name: PREFIX+"_rage_end_"+i, type: 'USHORT', value: range.end});
                t.fields.push({name: PREFIX+"_rage_index_"+i, type: 'USHORT', value: range.index});
                size += 6;
            }
            break;
        default:
            console.error("wrong coverage subtable format (" + subtable.format + ")");
    }

    return size;
}

function encodePairSet(t, subtable, i){
    var size = 0;
    var pairset = subtable.pairsets[subtable.coverage[i]];
    if (!pairset) console.error("encodePairSet: pairset is undefined! i="+i);
    var pairValueCount = pairset.valueRecords.length;

    t.push({name: "PairValueCount", type: 'USHORT', value: pairValueCount});
    size += 2;
    for (var firstGlyph = 0; firstGlyph < pairValueCount; firstGlyph++) {
        var value = pairset.valueRecords[firstGlyph];
        t.push({name: "value_secondGlyph", type: 'USHORT', value: value.secondGlyph});
        size += 2;

        if (subtable.valueFormat1) { t.push({name: "value_v1", type: 'USHORT', value: value.v1}); size += 2; }
        if (subtable.valueFormat2) { t.push({name: "value_v2", type: 'USHORT', value: value.v2}); size += 2; }
    }

    return size;
}

function encodePairPosSubTable(t, subtable, i, prefix){
    var size = 0;
    var PREFIX = prefix + '_' + i;

    t.fields.push({name: PREFIX+'_format', type: 'USHORT', value: subtable.format});
    t.fields.push({name: PREFIX+'_coverageOffset', type: 'USHORT', value: subtable.coverageOffset});

    encodeCoverageTable(t, subtable, PREFIX);

    t.fields.push({name: PREFIX+'_valueFormat1', type: 'USHORT', value: subtable.valueFormat1});
    t.fields.push({name: PREFIX+'_valueFormat2', type: 'USHORT', value: subtable.valueFormat2});

    switch (subtable.format){
        case 1:
            t.fields.push({name: PREFIX+'_pairSetCount', type: 'USHORT', value: subtable.pairsets.length});

            var pairSetOffsets = [];
            var pairSets = [];
            
            var offset = t.sizeOf();
            for (var j=0; j < subtable.coverage.length; j++){
                pairSetOffsets.push({name: PREFIX+'_offset_'+j, type: 'USHORT', value: offset});
                offset += encodePairSet(pairSets, subtable, j);
            }

            t.fields = t.fields.concat(pairSetOffsets);
            t.fields = t.fields.concat(pairSets);
            break;
        case 2:
            console.error("Not yet implemented: encodePairPosSubTable format=2");
            break;
        default:
            console.error("Invalid subtable format: encodePairPosSubTable format=" + subtable.format);
    }
    return t.sizeOf();
}

function encodeLookupEntry(t, gpos, i){
    console.error("== Encode Lookup Entry ==");
    var start = t.sizeOf();
    var ltable = gpos.lookupList[i];
    var PREFIX = 'lookup_' + i;
    var lookupEntry = new table.Table('LookupEntry', [
        {name: PREFIX+'_type', type: 'USHORT', value: ltable.lookupType}
      , {name: PREFIX+'_flag', type: 'USHORT', value: ltable.lookupFlag}
    ]);
    var size = lookupEntry.sizeOf();

    console.error("ltable.lookupType: " + ltable.lookupType);
    console.error("ltable.lookupFlag: " + ltable.lookupFlag);

    var offsets = [];
    var subtable_data = new table.Table('DATA', []);

    if (table.lookupFlag & 0x10){
        lookupEntry.push({name: PREFIX+'_markFilteringSet', type: 'USHORT', value: ltable.markFilteringSet});
        size += 2;
    }

    switch (ltable.lookupType){
        case LType.SINGLE_ADJUSTMENT:
            console.error("ERROR: Unimplemented Lookup Type: " + ltable.lookupType);
            return 0;

        case LType.PAIR_ADJUSTMENT: //Pair adjustment
            for (var j = 0; j < ltable.subtables.length; j++) {
                offsets.push(size);
                size += encodePairPosSubTable(subtable_data, ltable.subtables[j], j, PREFIX);
            }
            break;

        case LType.CURSIVE_ADJUSTMENT:
        case LType.MARK_TO_BASE_ATTACHMENT:
        case LType.MARK_TO_LIGATURE_ATTACHMENT:
        case LType.MARK_TO_MARK_ATTACHMENT:
        case LType.CONTEXTUAL_POSITIONING:
        case LType.CHAINED_CONTEXTUAL_POSITIONING:
        case LType.EXTENSION_POSITIONING:
            console.error("ERROR: Unimplemented Lookup Type: " + ltable.lookupType);
            return 0;
        default:
            console.error("Invalid Lookup Type: " + ltable.lookupType);
            return 0;
    }

    t.fields = t.fields.concat(lookupEntry.fields);
    t.fields.push({name: PREFIX+'_subtable_count', type: 'USHORT', value: offsets.length})
    console.error("encoded subtable_count:" + offsets.length);

    for (var i=0; i<offsets.length; i++){
        console.error("encoded offsets[i]:" + offsets[i]);
        t.fields.push({name: PREFIX+"_offset_"+i, type: 'USHORT', value: offsets[i]});
    }

    t.fields = t.fields.concat(subtable_data.fields);
    return t.sizeOf() - start;
}

function makeScriptList(t, gpos){
 /* ignored by parser */
 // FIX-ME! For now this is only a void list:
    var numEntries = 0;
    t.fields.push({name: 'ScripitListNumEntries', type: 'USHORT', value: numEntries});
}

function makeFeatureList(t, gpos){
 /* ignored by parser */
 // FIX-ME! For now this is only a void list:
    var numEntries = 0;
    t.fields.push({name: 'FeatureListNumEntries', type: 'USHORT', value: numEntries});
}

function makeGposTable(font) {
    var gpos = font.tables.gpos;
    console.error("------------------------- MAKE GPOS TABLE -------------------------");
    check.argument(gpos.tableVersion === 1, 'Encoding unsupported GPOS table version ('+gpos.tableVersion+').');

    var t = new table.Table('GPOS', [
        {name: 'version', type: 'FIXED', value: 0x00010000 /*gpos.tableVersion*/},
        {name: 'scriptListOffset', type: 'USHORT', value: 0},
        {name: 'featureListOffset', type: 'USHORT', value: 0},
        {name: 'lookupListOffset', type: 'USHORT', value: 0},
    ]);

    t.scriptListOffset = t.sizeOf();
    makeScriptList(t, gpos);

    t.featureListOffset = t.sizeOf();
    makeFeatureList(t, gpos);

    console.error("makeGposTable(): gpos.lookupList.length = " + gpos.lookupList.length);

    t.lookupListOffset = t.sizeOf();

    var lookupOffsets = [];
    var lookupEntries = new table.Table('LookupEntries', []);
    var offset_in_table = 0;
    for (var i = 0; i < gpos.lookupList.length; i++) {
        var size = encodeLookupEntry(lookupEntries, gpos, i);
        if (size>0){
            console.error("encoded offset_in_table: ", offset_in_table);
            lookupOffsets.push(offset_in_table);
            offset_in_table += size;
        }
    }

    console.error("encoded lookupOffsets.length: ", lookupOffsets.length);

    t.fields.push({name: 'lookupCount', type: 'USHORT', value: lookupOffsets.length});
    for (var i = 0; i < lookupOffsets.length; i++) {
        t.fields.push({name: 'LookupOffset_'+i, type: 'USHORT', value: 2 + 2*lookupOffsets.length + lookupOffsets[i]});
    }
    t.fields = t.fields.concat(lookupEntries.fields);
    return t;
}

exports.parse = parseGposTable;
exports.make = makeGposTable;
