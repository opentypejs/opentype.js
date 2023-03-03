import assert from 'assert';
import { hex, unhex } from '../testutil.js';
import STAT from '../../src/tables/stat.js';

describe('tables/stat.js', function() {
    // Style Attributes Header, v1.2
    const h10 = '00 01 00 00 00 08 00 03 00 00 00 12 00 04 00 00 00 2A';
    // Style Attributes Header, v1.0
    const h12 = '00 01 00 02 00 08 00 03 00 00 00 14 00 04 00 00 00 2C 12 F0';

    const data =
        // "wght" Axis Record
        '77 67 68 74 01 23 00 01 ' +
        // "ital" Axis Record
        '69 74 61 6C 01 01 00 03 ' +
        // "opsz" Axis Record
        '6F 70 73 7A 00 48 00 02 ' +
        // axisValueOffsets
        '00 08 00 14 00 28 00 38 ' +
        // Axis value table, format 1
        '00 01 00 01 00 02 00 78 01 23 45 67 ' +
        // Axis value table, format 2
        '00 02 00 02 00 01 00 96 00 18 00 00 00 02 00 00 7F FF 00 00 ' +
        // Axis value table, format 3
        '00 03 00 01 00 02 00 FC 00 01 23 00 00 45 67 89 ' +
        // Axis value table, format 4
        '00 04 00 02 00 01 01 48 ' +
        '00 02 80 00 00 00 ' +
        '00 00 01 A4 00 00';

    const table = {
        version: [1, 0],
        axes: [
            { tag: 'wght', nameID: 291, ordering: 1 },
            { tag: 'ital', nameID: 257, ordering: 3 },
            { tag: 'opsz', nameID: 72, ordering: 2 }
        ],
        values: [
            { format: 1, axisIndex: 1, flags: 2, valueNameID: 120, value: 291.2711070420386 },
            { format: 2, axisIndex: 2, flags: 1, valueNameID: 150, nominalValue: 24, rangeMinValue: 2, rangeMaxValue: 32767 },
            { format: 3, axisIndex: 1, flags: 2, valueNameID: 252, value: 1.1367208361944, linkedValue: 69.40444037537193 },
            { format: 4, flags: 1, valueNameID: 328, axisValues: [
                { axisIndex: 2, value: -32768 },
                { axisIndex: 0, value: 420 }
            ] }
        ],
        elidedFallbackNameID: undefined
    };

    it('can parse a font variations table v1.0', function() {
        assert.deepEqual(STAT.parse(unhex(h10 + data)), table);
    });

    // v1.1 and v1.2 headers are identical,
    // v1.2 only added support for value table format 4

    it('can parse a font variations table v1.2', function() {
        table.version[1] = 2;
        table.elidedFallbackNameID = 4848;
        assert.deepEqual(STAT.parse(unhex(h12 + data)), table);
    });

    it('can make a font variations table', function() {
        table.version[1] = 2;
        table.elidedFallbackNameID = 4848;
        const encodedTable = STAT.make(table).encode();
        assert.deepEqual(hex(encodedTable), h12 + ' ' + data);
    });
});
