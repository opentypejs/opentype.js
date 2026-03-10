// The `GPOS` table contains kerning pairs, among other things.
// https://docs.microsoft.com/en-us/typography/opentype/spec/gpos

import check from '../check.mjs';
import { Parser } from '../parse.mjs';
import table from '../table.mjs';

const subtableParsers = new Array(10);         // subtableParsers[0] is unused

// https://docs.microsoft.com/en-us/typography/opentype/spec/gpos#lookup-type-1-single-adjustment-positioning-subtable
// this = Parser instance
subtableParsers[1] = function parseLookup1() {
    const start = this.offset + this.relativeOffset;
    const posformat = this.parseUShort();
    if (posformat === 1) {
        return {
            posFormat: 1,
            coverage: this.parsePointer(Parser.coverage),
            value: this.parseValueRecord()
        };
    } else if (posformat === 2) {
        return {
            posFormat: 2,
            coverage: this.parsePointer(Parser.coverage),
            values: this.parseValueRecordList()
        };
    }
    check.assert(false, '0x' + start.toString(16) + ': GPOS lookup type 1 format must be 1 or 2.');
};

// https://docs.microsoft.com/en-us/typography/opentype/spec/gpos#lookup-type-2-pair-adjustment-positioning-subtable
subtableParsers[2] = function parseLookup2() {
    const start = this.offset + this.relativeOffset;
    const posFormat = this.parseUShort();
    check.assert(posFormat === 1 || posFormat === 2, '0x' + start.toString(16) + ': GPOS lookup type 2 format must be 1 or 2.');
    const coverage = this.parsePointer(Parser.coverage);
    const valueFormat1 = this.parseUShort();
    const valueFormat2 = this.parseUShort();
    if (posFormat === 1) {
        // Adjustments for Glyph Pairs
        return {
            posFormat: posFormat,
            coverage: coverage,
            valueFormat1: valueFormat1,
            valueFormat2: valueFormat2,
            pairSets: this.parseList(Parser.pointer(Parser.list(function() {
                return {        // pairValueRecord
                    secondGlyph: this.parseUShort(),
                    value1: this.parseValueRecord(valueFormat1),
                    value2: this.parseValueRecord(valueFormat2)
                };
            })))
        };
    } else if (posFormat === 2) {
        const classDef1 = this.parsePointer(Parser.classDef);
        const classDef2 = this.parsePointer(Parser.classDef);
        const class1Count = this.parseUShort();
        const class2Count = this.parseUShort();
        return {
            // Class Pair Adjustment
            posFormat: posFormat,
            coverage: coverage,
            valueFormat1: valueFormat1,
            valueFormat2: valueFormat2,
            classDef1: classDef1,
            classDef2: classDef2,
            class1Count: class1Count,
            class2Count: class2Count,
            classRecords: this.parseList(class1Count, Parser.list(class2Count, function() {
                return {
                    value1: this.parseValueRecord(valueFormat1),
                    value2: this.parseValueRecord(valueFormat2)
                };
            }))
        };
    }
};

subtableParsers[3] = function parseLookup3() { return { error: 'GPOS Lookup 3 not supported' }; };
subtableParsers[4] = function parseLookup4() { return { error: 'GPOS Lookup 4 not supported' }; };
subtableParsers[5] = function parseLookup5() { return { error: 'GPOS Lookup 5 not supported' }; };
subtableParsers[6] = function parseLookup6() { return { error: 'GPOS Lookup 6 not supported' }; };
subtableParsers[7] = function parseLookup7() { return { error: 'GPOS Lookup 7 not supported' }; };
subtableParsers[8] = function parseLookup8() { return { error: 'GPOS Lookup 8 not supported' }; };
subtableParsers[9] = function parseLookup9() { return { error: 'GPOS Lookup 9 not supported' }; };

// https://docs.microsoft.com/en-us/typography/opentype/spec/gpos
function parseGposTable(data, start) {
    start = start || 0;
    const p = new Parser(data, start);
    const tableVersion = p.parseVersion(1);
    check.argument(tableVersion === 1 || tableVersion === 1.1, 'Unsupported GPOS table version ' + tableVersion);

    if (tableVersion === 1) {
        return {
            version: tableVersion,
            scripts: p.parseScriptList(),
            features: p.parseFeatureList(),
            lookups: p.parseLookupList(subtableParsers)
        };
    } else {
        return {
            version: tableVersion,
            scripts: p.parseScriptList(),
            features: p.parseFeatureList(),
            lookups: p.parseLookupList(subtableParsers),
            variations: p.parseFeatureVariationsList()
        };
    }

}

// GPOS Writing //////////////////////////////////////////////
// NOT SUPPORTED
const subtableMakers = new Array(10);

function addValueRecordFields(table, valueRecord, valueFormat) {
    if (!valueRecord) return;
    const components = ['xPlacement', 'yPlacement', 'xAdvance', 'yAdvance', 'xPlacementDevice', 'yPlacementDevice', 'xAdvanceDevice', 'yAdvanceDevice'];

    for (let i = 0; i < components.length; i++) {
        if (valueFormat & (1 << i)) {
            table.fields.push({ name: components[i], type: 'SHORT', value: valueRecord[components[i]] || 0 });
        }
    }
}

subtableMakers[2] = function makeLookup2(subtable) {

    if (subtable.posFormat === 1) {
        const posTable = new table.Table('pairPosFormat1', [
            {name: 'posFormat', type: 'USHORT', value: 1},
            {name: 'coverage', type: 'TABLE', value: new table.Coverage(subtable.coverage)},
            {name: 'valueFormat1', type: 'USHORT', value: subtable.valueFormat1 },
            {name: 'valueFormat2', type: 'USHORT', value: subtable.valueFormat2 },
        ].concat(table.tableList('pairSets', subtable.pairSets, function(pairSet) {
            const pairSetTable = new table.Table('pairSetTable', []);
            pairSetTable.fields.push({name: 'pairValueCount', type: 'USHORT', value: pairSet.length });
            for (let i = 0; i < pairSet.length; i++) {
                const pair = pairSet[i];
                pairSetTable.fields.push({name: 'secondGlyph', type: 'USHORT', value: pair.secondGlyph });
                addValueRecordFields(pairSetTable, pair.value1, subtable.valueFormat1);
                addValueRecordFields(pairSetTable, pair.value2, subtable.valueFormat2);
            }
            return pairSetTable;
        })));
        return posTable;
    } else if (subtable.posFormat === 2) {
        const posTable = new table.Table('pairPosFormat2', [
            { name: 'posFormat', type: 'USHORT', value: 2 },
            { name: 'coverage', type: 'TABLE', value: new table.Coverage(subtable.coverage) },
            { name: 'valueFormat1', type: 'USHORT', value: subtable.valueFormat1 },
            { name: 'valueFormat2', type: 'USHORT', value: subtable.valueFormat2 },
            { name: 'classDef1', type: 'TABLE', value: new table.ClassDef(subtable.classDef1) },
            { name: 'classDef2', type: 'TABLE', value: new table.ClassDef(subtable.classDef2) },
            { name: 'class1Count', type: 'USHORT', value: subtable.classRecords.length },
            { name: 'class2Count', type: 'USHORT', value: subtable.classRecords[0].length }
        ]);

        for (let i = 0; i < subtable.classRecords.length; i++) {
            const class1Record = subtable.classRecords[i];
            for (let j = 0; j < class1Record.length; j++) {
                const class2Record = class1Record[j];
                addValueRecordFields(posTable, class2Record.value1, subtable.valueFormat1);
                addValueRecordFields(posTable, class2Record.value2, subtable.valueFormat2);
            }
        }

        return posTable;
    } else {
        throw new Error('Lookup type 2 format must be 1 or 2.');
    }
};


/**
 * Subsets the `GPOS` table to only include tables that have been implemented (type 2/kerning).
 * Once write support for all `GPOS` subtables is implemented, this function should be removed.
 * 
 * @param {*} gpos 
 * @returns 
 */
export function subsetGposImplemented(gpos) {
    // Filter lookups to only pair kerning tables; make deep copy to avoid editing original.

    const lookups = [];
    const lookupsIndices = [];
    for(let i = 0; i < gpos.lookups.length; i++) {
        if (gpos.lookups[i].lookupType === 2) {
            lookupsIndices.push(i);
            lookups.push(JSON.parse(JSON.stringify(gpos.lookups[i])));
            // lookups.push(structuredClone(gpos.lookups[i]));
        }   
    }

    if (lookups.length === 0) return;

    const features = [];
    const featuresIndices = [];
    for(let i = 0; i < gpos.features.length; i++) {
        if (gpos.features[i].tag === 'kern') {
            featuresIndices.push(i);
            features.push(JSON.parse(JSON.stringify(gpos.features[i])));
        }
    }

    // Filter features to only include those that reference the pair kerning tables; update lookupListIndexes to match new indices.
    for (let i = 0; i < features.length; i++) {
        features[i].feature.lookupListIndexes = features[i].feature.lookupListIndexes.filter((x) => lookupsIndices.includes(x)).map((x) => lookupsIndices.indexOf(x));
    }

    const scripts = [];

    // Filter scripts to only include those that reference the features; update featureIndexes to match new indices.
    for (let i = 0; i < gpos.scripts.length; i++) {
        const scriptI = JSON.parse(JSON.stringify(gpos.scripts[i]));
        scriptI.script.defaultLangSys.featureIndexes = scriptI.script.defaultLangSys.featureIndexes.filter((x) => featuresIndices.includes(x)).map((x) => featuresIndices.indexOf(x));
        if (scriptI.script.defaultLangSys.featureIndexes.length === 0) continue;
        for (let j = 0; j < scriptI.script.langSysRecords.length; j++) {
            scriptI.script.langSysRecords[j].featureIndexes = scriptI.script.langSysRecords[j].langSys.featureIndexes.filter((x) => featuresIndices.includes(x)).map((x) => featuresIndices.indexOf(x));
        }
        scripts.push(scriptI);
    }

    return {version: gpos.version, lookups, features, scripts};
}



function makeGposTable(gpos, kerningPairs) {

    if (gpos) {
        gpos = subsetGposImplemented(gpos);
    } else if (kerningPairs && Object.keys(kerningPairs).length > 0) {
        gpos = kernToGpos(kerningPairs);
    } else {
        return;
    }

    if (!gpos) return;

    return new table.Table('GPOS', [
        {name: 'version', type: 'ULONG', value: 0x10000},
        {name: 'scripts', type: 'TABLE', value: new table.ScriptList(gpos.scripts)},
        {name: 'features', type: 'TABLE', value: new table.FeatureList(gpos.features)},
        {name: 'lookups', type: 'TABLE', value: new table.LookupList(gpos.lookups, subtableMakers)}
    ]);
}

/**
 * Converts from kerning pairs created from `kern` table to "type 2" lookup for `GPOS` table.
 * @param {Object<string, number>} kerningPairs 
 */
function kernToGpos(kerningPairs) {

    // The main difference between the `kern` and `GPOS` format 1 subtable is that the `kern` table lists every kerning pair,
    // while the `GPOS` format 1 subtable groups together kerning pairs that share the same first glyph.
    const kerningArray = Object.entries(kerningPairs);
    kerningArray.sort(function (a, b) {
        const aLeftGlyph = parseInt(a[0].match(/\d+/)[0]);
        const aRightGlyph = parseInt(a[0].match(/\d+$/)[0]);
        const bLeftGlyph = parseInt(b[0].match(/\d+/)[0]);
        const bRightGlyph = parseInt(b[0].match(/\d+$/)[0]);
        if (aLeftGlyph < bLeftGlyph) {
            return -1;
        }
        if (aLeftGlyph > bLeftGlyph) {
            return 1;
        }
        if (aRightGlyph < bRightGlyph) {
            return -1;
        }
        return 1;
    });

    const nPairs = kerningArray.length;

    const coverage = {
        format: 1,
        glyphs: []
    };
    const pairSets = [];

    for (let i = 0; i < nPairs; i++) {

        let firstGlyph = parseInt(kerningArray[i][0].match(/\d+/)[0]);
        let secondGlyph = parseInt(kerningArray[i][0].match(/\d+$/)[0]);

        if (firstGlyph !== coverage.glyphs[coverage.glyphs.length - 1]) {
            coverage.glyphs.push(firstGlyph);
            pairSets.push([]);
        }

        pairSets[coverage.glyphs.length - 1].push({
            secondGlyph,
            value1: { xAdvance: kerningArray[i][1]}, 
            value2: undefined
        });
    }

    const scripts = [
        {
            tag: 'DFLT',
            script: {
                defaultLangSys: {
                    featureIndexes: [0]
                },
                langSysRecords: []
            }
        }
    ];

    const features = [
        {
            tag: 'kern',
            feature: {
                lookupListIndexes: [0]
            }
        }
    ];

    const lookups = [
        {
            lookupType: 2,
            subtables: [
                {
                    posFormat: 1,
                    coverage: coverage,
                    valueFormat1: 0x0004,
                    valueFormat2: 0x0000,
                    pairSets: pairSets
                }
            ]
        }
    ];

    return {version: 1, scripts, features, lookups};

}

export default { parse: parseGposTable, make: makeGposTable };
