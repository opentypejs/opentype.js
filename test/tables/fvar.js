'use strict';

var assert = require('assert');
var mocha = require('mocha');
var describe = mocha.describe;
var it = mocha.it;
var testutil = require('../testutil.js');
var fvar = require('../../src/tables/fvar.js');

describe('tables/fvar.js', function() {
    var data =
        '00 01 00 00 00 10 00 02 00 02 00 14 00 02 00 0C ' +
        '77 67 68 74 00 64 00 00 01 90 00 00 03 84 00 00 00 00 01 01 ' +
        '77 64 74 68 00 32 00 00 00 64 00 00 00 C8 00 00 00 00 01 02 ' +
        '01 03 00 00 01 2C 00 00 00 64 00 00 ' +
        '01 04 00 00 01 2C 00 00 00 4B 00 00';

    var table = {
        axes: [
            {
                tag: 'wght',
                minValue: 100,
                defaultValue: 400,
                maxValue: 900,
                nameID: 257
            },
            {
                tag: 'wdth',
                minValue: 50,
                defaultValue: 100,
                maxValue: 200,
                nameID: 258
            }
        ],
        instances: [
            {
                nameID: 259,
                coordinates: {wght: 300, wdth: 100}
            },
            {
                nameID: 260,
                coordinates: {wght: 300, wdth: 75}
            }
        ]
    };

    it('can parse a font variations table', function() {
        assert.deepEqual(table, fvar.parse(testutil.unhex(data), 0));
    });

    it('can make a font variations table', function() {
        assert.deepEqual(data, testutil.hex(fvar.make(table).encode()));
    });
});
