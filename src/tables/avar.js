// The `avar` table stores information on how to modify a variation along a variation axis
// https://learn.microsoft.com/en-us/typography/opentype/spec/avar

import check from '../check.js';
import { Parser } from '../parse.js';
import table from '../table.js';

function makeAvarAxisValueMap(n, axisValueMap) {
    return new table.Record('axisValueMap_' + n, [
        {name: 'fromCoordinate_' + n, type: 'F2DOT14', value: axisValueMap.fromCoordinate},
        {name: 'toCoordinate_' + n, type: 'F2DOT14', value: axisValueMap.toCoordinate}
    ]);
}

function makeAvarSegmentMap(n, axis) {
    const returnTable = new table.Record('segmentMap_' + n, [
        {name: 'positionMapCount_' + n, type: 'USHORT', value: axis.axisValueMaps.length}
    ]);

    let axisValueMaps = [];
    for (let i = 0; i < axis.axisValueMaps.length; i++) {
        const valueMap = makeAvarAxisValueMap(`${n}_${i}`, axis.axisValueMaps[i]);
        axisValueMaps = axisValueMaps.concat(valueMap.fields);
    }

    returnTable.fields = returnTable.fields.concat(axisValueMaps);

    return returnTable;
}

function makeAvarTable(avar, fvar) {
    check.argument(avar.axisSegmentMaps.length === fvar.axes.length, 'avar axis count must correspond to fvar axis count');

    const result = new table.Table('avar', [
        {name: 'majorVersion', type: 'USHORT', value: 1},
        {name: 'minorVersion', type: 'USHORT', value: 0},
        {name: 'reserved', type: 'USHORT', value: 0},
        {name: 'axisCount', type: 'USHORT', value: avar.axisSegmentMaps.length},
    ]);

    for (let i = 0; i < avar.axisSegmentMaps.length; i++) {
        const axisRecord = makeAvarSegmentMap(i, avar.axisSegmentMaps[i]);
        result.fields = result.fields.concat(axisRecord.fields);
    }

    return result;
}

function parseAvarTable(data, start, fvar) {
    if (!start) {
        start = 0;
    }

    const p = new Parser(data, start);
    const tableVersionMajor = p.parseUShort();
    const tableVersionMinor = p.parseUShort();

    if (tableVersionMajor !== 1) {
        console.warn(`Unsupported avar table version ${tableVersionMajor}.${tableVersionMinor}`);
    }

    p.skip('uShort', 1); // reserved
    const axisCount = p.parseUShort();

    check.argument(axisCount === fvar.axes.length, 'avar axis count must correspond to fvar axis count');

    const axisSegmentMaps = [];
    for (let i = 0; i < axisCount; i++) {
        const axisValueMaps = [];
        const positionMapCount = p.parseUShort();
        for (let j = 0; j < positionMapCount; j++) {
            const fromCoordinate = p.parseF2Dot14();
            const toCoordinate = p.parseF2Dot14();
            axisValueMaps.push({
                fromCoordinate,
                toCoordinate
            });
        }
        axisSegmentMaps.push({
            axisValueMaps
        });
    }

    return {
        version: [tableVersionMajor, tableVersionMinor],
        axisSegmentMaps
    };
}

export default { make: makeAvarTable, parse: parseAvarTable };
