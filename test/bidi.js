import assert from 'assert';
import Bidi from '../src/bidi.js';
import { parse } from '../src/opentype.js';
import { readFileSync } from 'fs';
const loadSync = (url, opt) => parse(readFileSync(url), opt);

describe('bidi.js', function() {
    let latinFont;
    let arabicFont;
    let bidiFira;
    let bidiScheherazade;
    let arabicTokenizer;

    before(function () {
        /**
         * arab
         */
        arabicFont = loadSync('./test/fonts/Scheherazade-Bold.ttf');
        bidiScheherazade = new Bidi();
        bidiScheherazade.registerModifier(
            'glyphIndex', null, token => arabicFont.charToGlyphIndex(token.char)
        );
        const requiredArabicFeatures = [{
            script: 'arab',
            tags: ['init', 'medi', 'fina', 'rlig']
        }];
        bidiScheherazade.applyFeatures(arabicFont, requiredArabicFeatures);
        bidiScheherazade.getTextGlyphs(''); // initialize bidi.
        arabicTokenizer = bidiScheherazade.tokenizer;
        /**
         * latin
         */
        latinFont = loadSync('./test/fonts/FiraSansMedium.woff');
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
    describe('arabic contexts', function() {
        it('should match arabic words in a given text', function() {
            const tokenizer = bidiScheherazade.tokenizer;
            tokenizer.tokenize('Hello السلام عليكم');
            const ranges = tokenizer.getContextRanges('arabicWord');
            const words = ranges.map(range => tokenizer.rangeToText(range));
            assert.deepEqual(words, ['السلام', 'عليكم']);
        });
        it('should match mixed arabic sentence', function() {
            arabicTokenizer.tokenize('The king said: ائتوني به أستخلصه لنفسي');
            const ranges = arabicTokenizer.getContextRanges('arabicSentence');
            const sentences = ranges.map(range => arabicTokenizer.rangeToText(range))[0];
            assert.equal(sentences, 'ائتوني به أستخلصه لنفسي');
        });
    });
    describe('getBidiText', function() {
        it('should adjust then render layout direction of bidi text', function() {
            const bidiText = bidiScheherazade.getBidiText('Be kind, فما كان الرفق في شيء إلا زانه ، ولا نزع من شيء إلا شانه');
            assert.equal(bidiText, 'Be kind, هناش الإ ءيش نم عزن الو ، هناز الإ ءيش يف قفرلا ناك امف');
        });
    });
    describe('applyFeatures', function () {
        it('should apply arabic presentation forms', function() {
            bidiScheherazade.getTextGlyphs('Hello السلام عليكم');
            const ranges = bidiScheherazade.tokenizer.getContextRanges('arabicWord');
            const PeaceTokens = bidiScheherazade.tokenizer.getRangeTokens(ranges[1]);
            const PeaceForms = PeaceTokens.map(token => {
                if (token.state.init) return 'init';
                if (token.state.medi) return 'medi';
                if (token.state.fina) return 'fina';
                return null;
            });
            assert.deepEqual(PeaceForms, [null, 'init', 'medi', 'medi', 'fina', null].reverse());
        });
        it('should apply arabic required letter ligature', function () {
            let glyphIndexes = bidiScheherazade.getTextGlyphs('لا'); // Arabic word 'لا' : 'no'
            assert.deepEqual(glyphIndexes, [1341, 1330]);
        });
        it('should apply arabic required composition ligature', function () {
            let glyphIndexes = bidiScheherazade.getTextGlyphs('َّ'); // Arabic word 'َّ' : 'Fatha & Shadda'
            assert.deepEqual(glyphIndexes, [1311]);
        });
        it('should apply latin ligature', function () {
            let glyphIndexes = bidiFira.getTextGlyphs('fi'); // fi => ﬁ
            assert.deepEqual(glyphIndexes, [1145]);
        });
    });

    describe('Unicode Variation Sequences (UVSes)', function() {
        it('should be handled correctly', function() {
            const font = loadSync('./test/fonts/TestCMAP14.otf');
            // the string '芦芦󠄀芦󠄁芦󠄂≩≩︀', containing (invisible) variation selectors after some of the characters
            const string = [33446, 33446, 917760, 33446, 917761, 33446, 917762, 8809, 8809, 65024].map(p => String.fromCodePoint(p)).join('');
            assert.deepEqual(font.stringToGlyphIndexes(string), [1, 1, 2, 1, 4, 3]);
        });
    });

    describe('thai scripts', () => {

        let thaiFont;
        let bidiThai;

        before(()=> {
            thaiFont = loadSync('./test/fonts/NotoSansThai-Medium-Testing-v1.ttf');
            bidiThai = new Bidi();
            bidiThai.registerModifier(
                'glyphIndex', null, token => thaiFont.charToGlyphIndex(token.char)
            );
            const requiredThaiFeatures = [{
                script: 'thai',
                tags: ['liga', 'rlig', 'ccmp']
            }];
            bidiThai.applyFeatures(thaiFont, requiredThaiFeatures);
        });

        describe('thai features', () => {
            it('should apply glyph composition', () => {
                let glyphIndexes = bidiThai.getTextGlyphs('่ํ');
                assert.deepEqual(glyphIndexes, [451]);
            });

            it('should apply glyph ligatures', () => {
                let glyphIndexes = bidiThai.getTextGlyphs('ฤๅ');
                assert.deepEqual(glyphIndexes, [459]);
            });

            it('should apply glyph required ligatures', () => {
                let glyphIndexes = bidiThai.getTextGlyphs('ลล');
                assert.deepEqual(glyphIndexes, [352]);
            });
        });

        describe('thai contexts', () => {
            it('should match thai words in a given text', () => {
                const tokenizer = bidiThai.tokenizer;
                tokenizer.tokenize('The king said: เป็นคนใจดีสำหรับทุกคน because ความรักคือทุกสิ่ง');
                const ranges = tokenizer.getContextRanges('thaiWord');
                const words = ranges.map(range => tokenizer.rangeToText(range));
                assert.deepEqual(words, ['เป็นคนใจดีสำหรับทุกคน', 'ความรักคือทุกสิ่ง']);
            });
        });
    });
});
