import assert from 'assert';
import { hex, unhex } from '../testutil';
import fvar from '../../src/tables/fvar';

describe('tables/fvar.js', function() {
    const data =
        '00 01 00 00 00 10 00 02 00 02 00 14 00 02 00 0C ' +
        '77 67 68 74 00 64 00 00 01 90 00 00 03 84 00 00 00 00 01 01 ' +
        '77 64 74 68 00 32 00 00 00 64 00 00 00 C8 00 00 00 00 01 02 ' +
        '01 03 00 00 01 2C 00 00 00 64 00 00 ' +
        '01 04 00 00 01 2C 00 00 00 4B 00 00';

    const table = {
        axes: [
            {
                tag: 'wght',
                minValue: 100,
                defaultValue: 400,
                maxValue: 900,
                name: {en: 'Weight', ja: 'ウエイト'}
            },
            {
                tag: 'wdth',
                minValue: 50,
                defaultValue: 100,
                maxValue: 200,
                name: {en: 'Width', ja: '幅'}
            }
        ],
        instances: [
            {
                name: {en: 'Regular', ja: 'レギュラー'},
                coordinates: {wght: 300, wdth: 100}
            },
            {
                name: {en: 'Condensed', ja: 'コンデンス'},
                coordinates: {wght: 300, wdth: 75}
            }
        ]
    };

    it('can parse a font variations table', function() {
        const names = {
            257: {en: 'Weight', ja: 'ウエイト'},
            258: {en: 'Width', ja: '幅'},
            259: {en: 'Regular', ja: 'レギュラー'},
            260: {en: 'Condensed', ja: 'コンデンス'}
        };
        assert.deepEqual(table, fvar.parse(unhex(data), 0, names));
    });

    it('can make a font variations table', function() {
        const names = {
            // When assigning name IDs, numbers below 256 should be ignored,
            // as these are not valid IDs of ‘fvar’ axis or instance names.
            111: {en: 'Name #111'},

            // Existing names with ID 256 or higher should be left untouched,
            // as these can be valid names of font features.
            256: {en: 'Ligatures', ja: 'リガチャ'},

            // Existing names with ID 256 or higher should be re-used.
            257: {en: 'Weight', ja: 'ウエイト'}
        };
        assert.deepEqual(data, hex(fvar.make(table, names).encode()));
        assert.deepEqual(names, {
            111: {en: 'Name #111'},
            256: {en: 'Ligatures', ja: 'リガチャ'},
            257: {en: 'Weight', ja: 'ウエイト'},
            258: {en: 'Width', ja: '幅'},
            259: {en: 'Regular', ja: 'レギュラー'},
            260: {en: 'Condensed', ja: 'コンデンス'}
        });
    });
});
