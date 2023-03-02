import assert from 'assert';
import { unhex } from '../testutil';
import { Parser } from '../../src/parse';
import { parseCmapTableFormat14 } from '../../src/tables/cmap';

describe('tables/cmap.js', function() {

    it('can parse a CMAP format 14 table', function() {
        const cmapData =
            '000E 00000045 00000003 00FE00 000000000000002B0E010000000034000000000E0101000000000000003C000000010022690003000000010082A600000000010082A60002';
        const cmap = {};
        const expectedData = {
            '65024': {
                varSelector: 65024,
                nonDefaultUVS: {
                    uvsMappings: {
                        8809: { glyphID: 3, unicodeValue: 8809 }
                    }
                }
            },
            '917760': {
                varSelector: 917760,
                defaultUVS: {
                    ranges: [{ additionalCount: 0, startUnicodeValue: 33446 }]
                }
            },
            '917761': {
                varSelector: 917761,
                nonDefaultUVS: {
                    uvsMappings: {
                        33446: { glyphID: 2, unicodeValue: 33446}
                    }
                }
            }
        };
        const p = new Parser(unhex(cmapData), 0);
        p.skip('uShort'); // skip format
        assert.doesNotThrow(function() { parseCmapTableFormat14(cmap, p); });
        assert.deepEqual(cmap.varSelectorList, expectedData);
    });

});