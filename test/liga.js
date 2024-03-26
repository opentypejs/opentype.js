import assert from 'assert';
import Bidi from '../src/bidi.js';
import { parse } from '../src/opentype.js';
import { readFileSync } from 'fs';
const loadSync = (url, opt) => parse(readFileSync(url), opt);

describe('liga', () => {
    let latinFont;
    let bidiFira;
    before(()=> {
        latinFont = loadSync('./test/fonts/liga-sub5.ttf');
        bidiFira = new Bidi();
        bidiFira.registerModifier(
            'glyphIndex', null, token => latinFont.charToGlyphIndex(token.char)
        );
        const latinFeatures = [{
            script: 'latn',
            tags: ['liga', 'rlig']
        }];
        bidiFira.applyFeatures(latinFont, latinFeatures);
    });

    describe('liga sub_5', () => {
        it('deal latn liga sub_5', () => {
            let glyphIndexes = bidiFira.getTextGlyphs('AABCCBAAB'); // AA/AB/BA/BB => [54,54]
            assert.deepEqual(glyphIndexes, [54,54,3,4,4,54,54,54,54]);
        });
    });
});
