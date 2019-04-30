import assert from 'assert';
import Bidi from '../src/bidi';
import { loadSync } from '../src/opentype';

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
        arabicFont = loadSync('./fonts/Scheherazade-Bold.ttf');
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
        latinFont = loadSync('./fonts/FiraSansMedium.woff');
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
});

