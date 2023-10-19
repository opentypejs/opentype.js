import assert from 'assert';
import { hex, unhex } from '../testutil.js';
import avar from '../../src/tables/avar.js';

describe('tables/avar.js', function() {
    const fvar = {axes: [
        {tag: 'TEST', minValue: 100, defaultValue: 400, maxValue: 900, name: {en: 'Test'}},
        {tag: 'TEST2', minValue: 0, defaultValue: 1, maxValue: 2, name: {en: 'Test2'}}
    ]};

    const data =
        // version
        '00 01 00 00 ' +
        // reserved, axisCount
        '00 00 00 02 ' +
        // positionMapCount
        '00 05 ' +
        // axisValueMaps
        'C0 00 C0 00 ' +
        'E0 00 00 00 ' +
        '00 00 00 00 ' +
        '20 00 00 00 ' +
        '40 00 40 00 ' +
        // positionMapCount 2
        '00 03 ' +
        // axisValueMaps 2
        'C0 00 C0 00 ' +
        '00 00 00 00 ' +
        '40 00 40 00';

    const table = {
        version: [1, 0],
        axisSegmentMaps: [
            {axisValueMaps: [
                {fromCoordinate: -1, toCoordinate: -1},
                {fromCoordinate: -0.5, toCoordinate: 0},
                {fromCoordinate: 0, toCoordinate: 0},
                {fromCoordinate: 0.5, toCoordinate: 0},
                {fromCoordinate: 1, toCoordinate: 1}
            ]},
            {axisValueMaps: [
                {fromCoordinate: -1, toCoordinate: -1},
                {fromCoordinate: 0, toCoordinate: 0},
                {fromCoordinate: 1, toCoordinate: 1}
            ]}
        ]
    };

    it('can parse an axis variation table', function() {
        assert.deepEqual(avar.parse(unhex(data), 0, fvar), table);
    });

    it('can make an axis variation table', function() {
        const encodedTable = avar.make(table, fvar).encode();
        assert.deepEqual(hex(encodedTable), data);
    });
});
