import assert from 'assert';
import { hex, unhex } from '../testutil';
import meta from '../../src/tables/meta';

// Based on https://github.com/behdad/fonttools/blob/a5968458015b519bc415f3ca7d882a428f45c347/Lib/fontTools/ttLib/tables/_m_e_t_a_test.py
describe('tables/meta.js', function() {
    // The 'dlng' and 'slng' tag with text data containing "augmented" BCP 47
    // comma-separated or comma-space-separated tags. These should be UTF-8 encoded
    // text.
    const data =
        '00 00 00 01 00 00 00 00 00 00 00 28 00 00 00 02 ' +
        '64 6C 6E 67 ' + // dlng
        '00 00 00 28 00 00 00 0E ' +
        '73 6C 6E 67 ' + // slng
        '00 00 00 36 00 00 00 0E ' +
        '4C 61 74 6E 2C 47 72 65 6B 2C 43 79 72 6C ' + // 'Latn,Grek,Cyrl'
        '4C 61 74 6E 2C 47 72 65 6B 2C 43 79 72 6C'; // 'Latn,Grek,Cyrl'

    it('can parse meta table', function() {
        const obj = {
            dlng: 'Latn,Grek,Cyrl',
            slng: 'Latn,Grek,Cyrl'
        };
        assert.deepEqual(obj, meta.parse(unhex(data), 0));
    });

    it('can make meta table', function() {
        const obj = {
            dlng: 'Latn,Grek,Cyrl',
            slng: 'Latn,Grek,Cyrl'
        };

        const hexString = hex(meta.make(obj).encode());
        meta.parse(unhex(hexString), 0);
        assert.deepEqual(data, hexString);
    });
});
