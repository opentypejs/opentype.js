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

// subtableMakers[2] = function makeLookup2(subtable) {

//     if (subtable.posFormat === 1) {

//         const pairPosTableData = [
//             {name: 'posFormat', type: 'USHORT', value: 1},
//             {name: 'coverage', type: 'TABLE', value: new table.Coverage(subtable.coverage)},
//             {name: 'valueFormat1', type: 'USHORT', value: subtable.valueFormat1 },
//             {name: 'valueFormat2', type: 'USHORT', value: subtable.valueFormat2 },
//             // {name: 'pairSetCount', type: 'USHORT', value: subtable.pairSets.length },
//         ];

        
//         // let offsetN = 10 + 2 * (subtable.pairSets.length);
//         // for (let i = 0; i < subtable.pairSets.length; i++) {
//         //     result.fields.push({ name: 'pairSetOffsets', type: 'USHORT', value: offsetN });
//         //     offsetN = offsetN + 2 + 4 * (kerningGlyphs2[i].length);
//         // }

//         const pairSets = [];

    
//         // Add PairSet tables (one for each first letter in a kerning pair)
//         for (let i = 0; i < subtable.pairSets.length; i++) {
//             const pairRecords = [];



//             // result.fields.push({ name: 'pairValueCount', type: 'USHORT', value: kerningGlyphs2[i].length });mmemm
//             for (let j = 0; j < subtable.pairSets[i].length; j++) {
//                 pairRecords.push({ name: 'secondGlyph', type: 'USHORT', value: subtable.pairSets[i][j][0] });
//                 pairRecords.push({ name: 'valueRecord1', type: 'USHORT', value: subtable.pairSets[i][j][1] });

//                 // result.fields.push({ name: 'secondGlyph', type: 'USHORT', value: kerningGlyphs2[i][j][0] });
//                 // result.fields.push({ name: 'valueRecord1', type: 'USHORT', value: kerningGlyphs2[i][j][1] });
//                 // console.log("Kerning: " + kerningGlyphs2[i][j][0] + " " + kerningGlyphs2[i][j][1])
//             }
//             pairSets.push({ name: 'pairSet', type: 'TABLE', value: new table.Table('pairSet', pairRecords) });
//         }

//         pairPosTableData.push({ name: 'pairSets', type: 'TABLE', value: new table.Table('pairSets', pairSets) });

//         const pairPosTable = new table.Table('pairPosFormat1', pairPosTableData);
    

//         return pairPosTable;
//         // return lookupTable;
    
//     } else {
//         check.assert(false, 'lookup type 2 format 2 is not yet supported.');
//     }

// };


subtableMakers[2] = function makeLookup2(subtable) {

    if (subtable.posFormat === 1) {

        // const posTable = new table.Table('pairPosFormat1', [
        //     {name: 'posFormat', type: 'USHORT', value: 1},
        //     {name: 'coverage', type: 'TABLE', value: new table.Coverage(subtable.coverage)},
        //     {name: 'valueFormat1', type: 'USHORT', value: subtable.valueFormat1 },
        //     {name: 'valueFormat2', type: 'USHORT', value: subtable.valueFormat2 },
        //     // {name: 'pairSetCount', type: 'USHORT', value: subtable.pairSets.length },
        // ].concat(table.tableList('pairSets', subtable.pairSets, function(pairSet) {
        //     return new table.Table('pairSetTable', [
        //     ].concat(table.tableList('pairValue', pairSet, function(pairValue) {
        //         const xAdvance = pairValue.value1 ? pairValue.value1.xAdvance : undefined;
        //         const yAdvance = pairValue.value2 ? pairValue.value2.yAdvance : undefined;
        //         return new table.Table('pairValueTable',
        //             [{name: 'secondGlyph', type: 'USHORT', value: pairValue.secondGlyph }, 
        //                 {name: 'value1', type: 'USHORT', value: xAdvance }]
        //         );
        //     })));
        // })));


        const posTable = new table.Table('pairPosFormat1', [
            {name: 'posFormat', type: 'USHORT', value: 1},
            {name: 'coverage', type: 'TABLE', value: new table.Coverage(subtable.coverage)},
            {name: 'valueFormat1', type: 'USHORT', value: subtable.valueFormat1 },
            {name: 'valueFormat2', type: 'USHORT', value: subtable.valueFormat2 },
            // {name: 'pairSetCount', type: 'USHORT', value: subtable.pairSets.length },
        ].concat(table.tableList('pairSets', subtable.pairSets, function(pairSet) {

            const pairSetTable = new table.Table('pairSetTable', []);
            pairSetTable.fields.push({name: 'pairValueCount', type: 'USHORT', value: pairSet.length });
            for (let i = 0; i < pairSet.length; i++) {
                const xAdvance = pairSet[i].value1 ? pairSet[i].value1.xAdvance : undefined;
                const yAdvance = pairSet[i].value2 ? pairSet[i].value2.yAdvance : undefined;
                pairSetTable.fields.push({name: 'secondGlyph', type: 'USHORT', value: pairSet[i].secondGlyph });
                pairSetTable.fields.push({name: 'value1', type: 'USHORT', value: xAdvance });
                // pairSetTable.fields.push({name: 'value2', type: 'USHORT', value: yAdvance });
            }
            return pairSetTable;
        })));



        debugger;
        return posTable;


        const pairSetTable = new table.Table('pairSetTable', []);
        

        // Offset #3
        // Start of LookupList Table
        // { name: 'lookupCount', type: 'USHORT', value: 1 },
        // { name: 'lookupOffset', type: 'USHORT', value: 4 },
        // // Start of Lookup table
        // { name: 'lookupType', type: 'USHORT', value: 2 },
        // { name: 'lookupFlag', type: 'USHORT', value: 0 },
        // { name: 'subTableCount', type: 'USHORT', value: 1 },
        // { name: 'lookupOffset2', type: 'USHORT', value: 8 },

        // // Start of lookup subtable (actual kerning info)
        // { name: 'posFormat', type: 'USHORT', value: 1 },
        // { name: 'coverageOffset', type: 'USHORT', value: 10 + 4 * firstGlyphs.length + 4 * nPairs },
        // // X_ADVANCE only
        // { name: 'valueFormat1', type: 'USHORT', value: 4 },
        // // Omit (note: using other formats will impact offset calculations)
        // { name: 'valueFormat2', type: 'USHORT', value: 0 },
        // // pairSetCount: Number of PairSet tables
        // { name: 'pairSetCount', type: 'USHORT', value: firstGlyphs.length },
        // //   {name: 'pairSetOffsets', type: 'USHORT', value: 22},



        // let offsetN = 10 + 2 * (subtable.pairSets.length);
        // for (let i = 0; i < subtable.pairSets.length; i++) {
        //     pairSetTable.fields.push({ name: 'pairSetOffsets', type: 'USHORT', value: offsetN });
        //     offsetN = offsetN + 2 + 4 * (subtable.pairSets[i].length);
        // }
    
        // // Add PairSet tables (one for each first letter in a kerning pair)
        // for (let i = 0; i < subtable.pairSets.length; i++) {
        //     pairSetTable.fields.push({ name: 'pairValueCount', type: 'USHORT', value: subtable.pairSets[i].length });
        //     for (let j = 0; j < subtable.pairSets[i].length; j++) {
        //         pairSetTable.fields.push({ name: 'secondGlyph', type: 'USHORT', value: subtable.pairSets[i][j].secondGlyph });
        //         const xAdvance = subtable.pairSets[i][j].value1 ? subtable.pairSets[i][j].value1.xAdvance : undefined;
        //         pairSetTable.fields.push({ name: 'valueRecord1', type: 'USHORT', value: xAdvance });
        //         // console.log("Kerning: " + kerningGlyphs2[i][j][0] + " " + kerningGlyphs2[i][j][1])
        //     }
        // }
    
        // const posTable = new table.Table('pairPosFormat1', [
        //     {name: 'posFormat', type: 'USHORT', value: 1},
        //     {name: 'coverage', type: 'TABLE', value: new table.Coverage(subtable.coverage)},
        //     {name: 'valueFormat1', type: 'USHORT', value: subtable.valueFormat1 },
        //     {name: 'valueFormat2', type: 'USHORT', value: subtable.valueFormat2 },
        //     {name: 'pairSet', type: 'TABLE', value: pairSetTable},
        //     {name: 'pairSetCount', type: 'USHORT', value: subtable.pairSets.length },
        // ]);

        
        
        // .concat(table.tableList('pairSets', subtable.pairSets, function(pairSet) {

        //     const pairValues = [{name: 'pairValueCount', type: 'USHORT', value: pairSet.length }];
        //     for (let i = 0; i < pairSet.length; i++) {
        //         const xAdvance = pairSet[i].value1 ? pairSet[i].value1.xAdvance : undefined;
        //         const yAdvance = pairSet[i].value2 ? pairSet[i].value2.yAdvance : undefined;
        //         pairValues.push({name: 'secondGlyph', type: 'USHORT', value: pairSet[i].secondGlyph });
        //         pairValues.push({name: 'xAdvance', type: 'USHORT', value: xAdvance });
        //     }

        //     return new table.Table('pairValues', pairValues);
        // })));


        // subtableMakers[3] = function makeLookup3(subtable) {
        //     check.assert(subtable.substFormat === 1, 'Lookup type 3 substFormat must be 1.');
        //     return new table.Table('substitutionTable', [
        //         {name: 'substFormat', type: 'USHORT', value: 1},
        //         {name: 'coverage', type: 'TABLE', value: new table.Coverage(subtable.coverage)}
        //     ].concat(table.tableList('altSet', subtable.alternateSets, function(alternateSet) {
        //         return new table.Table('alternateSetTable', table.ushortList('alternate', alternateSet));
        //     })));
        // };
        

        debugger;

        return posTable;




        const pairPosTableData = [
            {name: 'posFormat', type: 'USHORT', value: 1},
            {name: 'coverage', type: 'TABLE', value: new table.Coverage(subtable.coverage)},
            {name: 'valueFormat1', type: 'USHORT', value: subtable.valueFormat1 },
            {name: 'valueFormat2', type: 'USHORT', value: subtable.valueFormat2 },
            // {name: 'pairSetCount', type: 'USHORT', value: subtable.pairSets.length },
        ];

        


        pairPosTableData.push(...table.tableList('pairSet', subtable.pairSets, function(pairSet) {
            const pairSetTableData = [
                // {name: 'pairValueCount', type: 'USHORT', value: pairSet.length },
            ];

            pairSetTableData.push(...table.tableList('pairValue', pairSet, function(pairValue) {
                const pairValueTableData = [
                    {name: 'secondGlyph', type: 'USHORT', value: pairValue.secondGlyph },
                ];
                const xAdvance = pairValue.value1 ? pairValue.value1.xAdvance : undefined;
                const yAdvance = pairValue.value2 ? pairValue.value2.yAdvance : undefined;
                pairValueTableData.push({name: 'value1', type: 'USHORT', value: xAdvance });
                // pairValueTableData.push({name: 'value2', type: 'USHORT', value: yAdvance });
                return new table.Table('pairValue', pairValueTableData);
            }));

            return new table.Table('pairSet', pairSetTableData);
        }));
    
        // for (let i = 0; i < subtable.pairSets.length; i++) {
    
        //     const pairSetTableData = [
        //         {name: 'pairValueCount', type: 'USHORT', value: subtable.pairSets[i].length },
        //     ];
    
        //     for (let j = 0; j < subtable.pairSets[i].length; j++) {
        //         pairSetTableData.push({ name: 'secondGlyph', type: 'USHORT', value: subtable.pairSets[i][j].secondGlyph });
        //         // if (subtable.pairSets[i][j].value1) pairSetTableData.push({ name: 'value1', type: 'USHORT', value: subtable.pairSets[i][j].value1.xAdvance });
        //         // if (subtable.pairSets[i][j].value2) pairSetTableData.push({ name: 'value2', type: 'USHORT', value: subtable.pairSets[i][j].value1.yAdvance });

        //         const xAdvance = subtable.pairSets[i][j].value1 ? subtable.pairSets[i][j].value1.xAdvance : undefined;
        //         // const yAdvance = subtable.pairSets[i][j].value2 ? subtable.pairSets[i][j].value2.yAdvance : undefined;

        //         pairSetTableData.push({ name: 'value1', type: 'USHORT', value: xAdvance });
        //         // pairSetTableData.push({ name: 'value2', type: 'USHORT', value: yAdvance });

        //     }
    
        //     // posTableData.push({ name: 'pairSet', type: 'TABLE', value: new table.Table('pairSet', pairSetTableData) });
        //     lookupTable.push({ name: 'pairSet', type: 'TABLE', value: new table.Table('pairSet', pairSetTableData) });

        // }

        // return posTable;
    
        return new table.Table('pairPosFormat1', pairPosTableData);
        // return lookupTable;
    
    } else {
        check.assert(false, 'lookup type 2 format 2 is not yet supported.');
    }

};


/**
 * Subsets the `GPOS` table to only include tables that have been implemented (pair kerning using type 2 format 1 subtables).
 * Once write support for all `GPOS` subtables is implemented, this function should be removed.
 * 
 * @param {*} gpos 
 * @returns 
 */
function subsetGposImplemented(gpos) {
    // Filter lookups to only pair kerning tables; make deep copy to avoid editing original.
    const lookups0 = gpos.lookups.filter((x) => x.lookupType === 2).map((x) => JSON.parse(JSON.stringify(x)));
    if (lookups0.length === 0) return;
    // Filter pair kerning tables to only type 2 format 1 subtables.
    const lookups = lookups0.map((x) => {
        x.subtables = x.subtables.filter((y) => y.posFormat === 1);
        return x;
    }).filter((x) => x.subtables.length > 0);
    if (lookups.length === 0) return;

    // const kernTableIndex = gpos.lookups.findIndex((x) => x.lookupType === 2);
    // if (kernTableIndex === -1) return;
    // const kernTableCopy = JSON.parse(JSON.stringify(gpos.lookups[kernTableIndex]));
    // kernTableCopy.subtables = kernTableCopy.subtables.filter((x) => x.posFormat === 1);
    // if (kernTableCopy.subtables.length === 0) return;
    // const lookups = [kernTableCopy];

    const featureIndices = [];
    for(let i = 0; i < gpos.features.length; i++)
        if (gpos.features[i].tag === 'kern')
            featureIndices.push(i);

    const features = gpos.features.filter((x) => x.tag === 'kern').map((x) => JSON.parse(JSON.stringify(x)));
    
    // TODO: This always points to the first lookup table, which may not be correct.
    for (let i = 0; i < features.length; i++) {
        features[i].feature.lookupListIndexes = [0];
    }


    // const featureIndex = gpos.features.findIndex((x) => x.tag === 'kern');
    // const featureTableCopy = JSON.parse(JSON.stringify(gpos.features[featureIndex]));
    // featureTableCopy.feature.lookupListIndexes = [0];
    // const features = [featureTableCopy];

    

    // const scripts = JSON.parse(JSON.stringify(gpos.scripts.filter((x) => x.script.defaultLangSys.featureIndexes.includes(featureIndex))));

    const scripts = [];

    for (let i = 0; i < gpos.scripts.length; i++) {
        const scriptI = JSON.parse(JSON.stringify(gpos.scripts[i]));
        scriptI.script.defaultLangSys.featureIndexes = scriptI.script.defaultLangSys.featureIndexes.filter((x) => featureIndices.includes(x));
        if (scriptI.script.defaultLangSys.featureIndexes.length === 0) continue;
        for (let j = 0; j < scriptI.script.langSysRecords.length; j++) {
            scriptI.script.langSysRecords[j].featureIndexes = scriptI.script.langSysRecords[j].langSys.featureIndexes.filter((x) => featureIndices.includes(x));
        }
        scripts.push(scriptI);


        // scripts[i].script.defaultLangSys.featureIndexes = [0];
        // for (let j = 0; j < scripts[i].script.langSysRecords.length; j++) {
        //     scripts[i].script.langSysRecords[j].featureIndexes = [0];
        // }
    }

    return {lookups, features, scripts};
}



function makeGposTable(gpos) {

    gpos = subsetGposImplemented(gpos);

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
function kernToGposType2(kerningPairs) {

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

    const coverage = [];
    const pairSets = [];

    for (let i = 0; i < nPairs; i++) {

        let firstGlyph = parseInt(kerningArray[i][0].match(/\d+/)[0]);
        let secondGlyph = parseInt(kerningArray[i][0].match(/\d+$/)[0]);

        if (firstGlyph !== coverage[coverage.length - 1]) {
            coverage.push(firstGlyph);
            pairSets.push([]);
        }

        pairSets[coverage.length - 1].push([secondGlyph, kerningArray[i][1]]);
    }

    return {coverage, pairSets};
}

function makeGposTable3(gpos, kerningPairs) {

    gpos = subsetGposImplemented(gpos);

    if (!gpos) return;

    // TODO: This fails with ranges.
    const firstGlyphs = gpos.lookups[0].subtables[0].coverage.glyphs;
    let nPairs = 0;
    for (let i = 0; i < gpos.lookups[0].subtables[0].pairSets.length; i++) {
        nPairs += gpos.lookups[0].subtables[0].pairSets[i].length;
    }

    const kerningGlyphs2 = [];
    for (let i = 0; i < gpos.lookups[0].subtables[0].pairSets.length; i++) {
        kerningGlyphs2[i] = [];
        for (let j = 0; j < gpos.lookups[0].subtables[0].pairSets[i].length; j++) {
            const secondGlyph = gpos.lookups[0].subtables[0].pairSets[i][j].secondGlyph;
            const xAdvance = gpos.lookups[0].subtables[0].pairSets[i][j].value1.xAdvance;
            kerningGlyphs2[i].push([secondGlyph, xAdvance]);
        }
    }

    // var kerningArray = Object.entries(kerningPairs);
    // kerningArray.sort(function (a, b) {
    //     let aLeftGlyph = parseInt(a[0].match(/\d+/)[0]);
    //     let aRightGlyph = parseInt(a[0].match(/\d+$/)[0]);
    //     let bLeftGlyph = parseInt(b[0].match(/\d+/)[0]);
    //     let bRightGlyph = parseInt(b[0].match(/\d+$/)[0]);
    //     if (aLeftGlyph < bLeftGlyph) {
    //         return -1;
    //     }
    //     if (aLeftGlyph > bLeftGlyph) {
    //         return 1;
    //     }
    //     if (aRightGlyph < bRightGlyph) {
    //         return -1;
    //     }
    //     return 1;
    // });

    // const nPairs = kerningArray.length;

    // var firstGlyphs = [];
    // var kerningGlyphs2 = [];

    // for (let i = 0; i < nPairs; i++) {

    //     let firstGlyph = parseInt(kerningArray[i][0].match(/\d+/)[0]);
    //     let secondGlyph = parseInt(kerningArray[i][0].match(/\d+$/)[0]);

    //     if (firstGlyph !== firstGlyphs[firstGlyphs.length - 1]) {
    //         firstGlyphs.push(firstGlyph);
    //         kerningGlyphs2[firstGlyphs.length - 1] = [];
    //     }

    //     kerningGlyphs2[firstGlyphs.length - 1].push([secondGlyph, kerningArray[i][1]]);
    // }

    var result = new table.Table('GPOS', [

        // Start of GPOS Header
        { name: 'majorVersion', type: 'USHORT', value: 1 },
        { name: 'minorVersion', type: 'USHORT', value: 0 },
        { name: 'scriptListOffset', type: 'USHORT', value: 10 },
        { name: 'featureListOffset', type: 'USHORT', value: 48 },
        { name: 'lookupListOffset', type: 'USHORT', value: 62 },

        // Offset #1
        // Start of ScriptList
        { name: 'scriptCount', type: 'USHORT', value: 2 },
        // Script record
        { name: 'scriptTag', type: 'TAG', value: 'DFLT' },
        { name: 'scriptOffset', type: 'USHORT', value: 14 },
        { name: 'scriptTag2', type: 'TAG', value: 'latn' },
        { name: 'scriptOffset2', type: 'USHORT', value: 26 },

        // Start of Script Table #1 (Default)
        { name: 'defaultLangSysOffset', type: 'USHORT', value: 4 },
        { name: 'langSysCount', type: 'USHORT', value: 0 },
        // Start of LangySys Table
        { name: 'lookupOrderOffset', type: 'USHORT', value: 0 }, // Reserved, null
        { name: 'requiredFeatureIndex', type: 'USHORT', value: 65535 },
        { name: 'featureIndexCount', type: 'USHORT', value: 1 },
        { name: 'featureIndex', type: 'USHORT', value: 0 },

        // Start of Script Table #2 (Latin)
        { name: 'defaultLangSysOffset2', type: 'USHORT', value: 4 },
        { name: 'langSysCount2', type: 'USHORT', value: 0 },
        // Start of LangySys Table
        { name: 'lookupOrderOffset2', type: 'USHORT', value: 0 }, // Reserved, null
        { name: 'requiredFeatureIndex2', type: 'USHORT', value: 65535 },
        { name: 'featureIndexCount2', type: 'USHORT', value: 1 },
        { name: 'featureIndex2', type: 'USHORT', value: 0 },

        // Offset #2
        // Start of FeatureList Table
        { name: 'featureCount', type: 'USHORT', value: 1 },
        { name: 'featureTag', type: 'TAG', value: 'kern' },
        { name: 'featureOffset', type: 'USHORT', value: 8 },

        // Start of Feature Table
        { name: 'featureParamsOffset', type: 'USHORT', value: 0 },
        { name: 'lookupIndexCount', type: 'USHORT', value: 1 },
        { name: 'lookupListIndices', type: 'USHORT', value: 0 },

        // Offset #3
        // Start of LookupList Table
        { name: 'lookupCount', type: 'USHORT', value: 1 },
        { name: 'lookupOffset', type: 'USHORT', value: 4 },
        // Start of Lookup table
        { name: 'lookupType', type: 'USHORT', value: 2 },
        { name: 'lookupFlag', type: 'USHORT', value: 0 },
        { name: 'subTableCount', type: 'USHORT', value: 1 },
        { name: 'lookupOffset2', type: 'USHORT', value: 8 },

        // Start of lookup subtable (actual kerning info)
        { name: 'posFormat', type: 'USHORT', value: 1 },
        { name: 'coverageOffset', type: 'USHORT', value: 10 + 4 * firstGlyphs.length + 4 * nPairs },
        // X_ADVANCE only
        { name: 'valueFormat1', type: 'USHORT', value: 4 },
        // Omit (note: using other formats will impact offset calculations)
        { name: 'valueFormat2', type: 'USHORT', value: 0 },
        // pairSetCount: Number of PairSet tables
        { name: 'pairSetCount', type: 'USHORT', value: firstGlyphs.length },
        //   {name: 'pairSetOffsets', type: 'USHORT', value: 22},

    ]);

    var offsetN = 10 + 2 * (firstGlyphs.length);
    for (let i = 0; i < firstGlyphs.length; i++) {
        result.fields.push({ name: 'pairSetOffsets', type: 'USHORT', value: offsetN });
        offsetN = offsetN + 2 + 4 * (kerningGlyphs2[i].length);
    }

    // Add PairSet tables (one for each first letter in a kerning pair)
    for (let i = 0; i < kerningGlyphs2.length; i++) {
        result.fields.push({ name: 'pairValueCount', type: 'USHORT', value: kerningGlyphs2[i].length });
        for (let j = 0; j < kerningGlyphs2[i].length; j++) {
            result.fields.push({ name: 'secondGlyph', type: 'USHORT', value: kerningGlyphs2[i][j][0] });
            result.fields.push({ name: 'valueRecord1', type: 'USHORT', value: kerningGlyphs2[i][j][1] });
            // console.log("Kerning: " + kerningGlyphs2[i][j][0] + " " + kerningGlyphs2[i][j][1])
        }
    }

    // Add Coverage tables (defines which first letters map to which PairSet table)
    result.fields.push({ name: 'coverageFormat', type: 'USHORT', value: 1 }); // Format 1 indicates glyph pairs (format 2 uses classes of glyphs)
    result.fields.push({ name: 'glyphCount', type: 'USHORT', value: firstGlyphs.length });
    for (let i = 0; i < firstGlyphs.length; i++) {
        result.fields.push({ name: 'UppercasePGlyphID', type: 'USHORT', value: firstGlyphs[i] });
    }

    return (result);
}

export default { parse: parseGposTable, make: makeGposTable };
