import assert from 'assert';
import { parse } from '../src/opentype.js';
import { readFileSync } from 'fs';
const loadSync = (url, opt) => parse(readFileSync(url), opt);

describe('noto emoji with ccmp', () => {
    let notoEmojiFont;
    let substitution;
    before(()=> {
        notoEmojiFont = loadSync('./test/fonts/noto-emoji.ttf');
    });

    describe('ccmp features', () => {
        
        it('shape emoji with sub_0', () => {
            let options = {
                kerning: true,
                language: 'dflt',
                features: [
                    { script: 'DFLT', tags: ['ccmp'] },
                ]
            };
            let glyphIndexes = notoEmojiFont.stringToGlyphIndexes('👨‍👩‍👧‍👦👨‍👩‍👧',options);
            assert.deepEqual(glyphIndexes, [1463,1462]);
        });

        it('shape emoji with sub_5', () => {
            let options = {
                kerning: true,
                language: 'dflt',
                features: [
                    { script: 'DFLT', tags: ['ccmp'] },
                ]
            };
            let glyphIndexes = notoEmojiFont.stringToGlyphIndexes('🇺🇺',options);
            assert.deepEqual(glyphIndexes, [1850]);
        });
    });
});
