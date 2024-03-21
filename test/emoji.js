/*
 * @Author: TonyJR show_3@163.com
 * @Date: 2024-03-18 18:24:53
 * @LastEditors: TonyJR show_3@163.com
 * @LastEditTime: 2024-03-22 15:01:25
 * @FilePath: /opentype.js/test/emoji.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
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
