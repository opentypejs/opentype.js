import assert from 'assert';
import Bidi from '../src/bidi';
import Tokenizer from '../src/tokenizer';
import FeatureQuery from '../src/features/featureQuery';
import { loadSync } from '../src/opentype';

describe('bidi.js', function() {
    let font;
    let bidi;
    let query;
    let arabicTok;
    let arabicWordCheck;
    let arabicSentenceCheck;
    before(function () {
        font = loadSync('./fonts/Scheherazade-Bold.ttf');
        bidi = new Bidi('ltr');
        query = new FeatureQuery(font);
        arabicWordCheck = bidi.contextChecks.arabicWordCheck;
        arabicSentenceCheck = bidi.contextChecks.arabicSentenceCheck;
    });
    describe('arabic contexts', function() {
        before(function () {
            arabicTok = new Tokenizer();
            arabicTok.registerContextChecker(
                'arabicWord',
                arabicWordCheck.arabicWordStartCheck,
                arabicWordCheck.arabicWordEndCheck
            );
            arabicTok.registerContextChecker(
                'arabicSentence',
                arabicSentenceCheck.arabicSentenceStartCheck,
                arabicSentenceCheck.arabicSentenceEndCheck
            );
        });
        it('should match arabic words in a given text', function() {
            arabicTok.tokenize('Hello السلام عليكم');
            const ranges = arabicTok.getContextRanges('arabicWord');
            const words = ranges.map(range => arabicTok.rangeToText(range));
            assert.deepEqual(words, ['السلام', 'عليكم']);
        });
        it('should match mixed arabic sentence', function() {
            arabicTok.tokenize('The king said: ائتوني به أستخلصه لنفسي');
            const ranges = arabicTok.getContextRanges('arabicSentence');
            const sentences = ranges.map(range => arabicTok.rangeToText(range))[0];
            assert.equal(sentences, 'ائتوني به أستخلصه لنفسي');
        });
    });
    describe('getBidiText', function() {
        it('should adjust then render layout direction of bidi text', function() {
            const bidiText = bidi.getBidiText('Be kind, فما كان الرفق في شيء إلا زانه ، ولا نزع من شيء إلا شانه');
            assert.equal(bidiText, 'Be kind, هناش الإ ءيش نم عزن الو ، هناز الإ ءيش يف قفرلا ناك امف');
        });
    });
    describe('applyFeatures', function () {
        before(function () {
            const arabicPresentationForms = ['init', 'medi', 'fina', 'rlig'].map(
                tag => query.getFeature({
                    tag, script: 'arab'
                })
            );
            const charToGlyphIndex = token => font.charToGlyphIndex(token.char);
            bidi.registerModifier('glyphIndex', null, charToGlyphIndex);
            bidi.tokenizer.registerContextChecker(
                'arabicWord',
                arabicWordCheck.arabicWordStartCheck,
                arabicWordCheck.arabicWordEndCheck
            );
            bidi.applyFeatures(arabicPresentationForms);
        });
        it('should apply arabic presentation forms', function() {
            bidi.getBidiText('Hello السلام عليكم');
            const ranges = bidi.tokenizer.getContextRanges('arabicWord');
            const PeaceTokens = bidi.tokenizer.getRangeTokens(ranges[1]);
            const PeaceForms = PeaceTokens.map(token => {
                if (token.state.init) return 'init';
                if (token.state.medi) return 'medi';
                if (token.state.fina) return 'fina';
                return null;
            });
            assert.deepEqual(PeaceForms, [null, 'init', 'medi', 'medi', 'fina', null].reverse());
        });
        it('should apply arabic required letter ligature', function () {
            let glyphIndexes = bidi.getTextGlyphs('لا'); // Arabic word 'لا' : 'no'
            assert.deepEqual(glyphIndexes, [1341, 1330]);
        });
    });
});

