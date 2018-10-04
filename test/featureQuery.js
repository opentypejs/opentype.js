import assert from 'assert';
import { loadSync } from '../src/opentype';
import FeatureQuery from '../src/features/featureQuery';
import Tokenizer, { ContextParams } from '../src/tokenizer';

describe('featureQuery.js', function() {
    let font;
    let query;
    let tokenizer;
    let arabFeatureInit;
    let arabFeatureMedi;
    let arabFeatureFina;
    let arabFeatureRlig;
    before(function () {
        font = loadSync('./fonts/Scheherazade-Bold.ttf');
        query = new FeatureQuery(font);
        tokenizer = new Tokenizer();
        const script = 'arab';
        arabFeatureInit = query.getFeature({tag: 'init', script});
        arabFeatureMedi = query.getFeature({tag: 'medi', script});
        arabFeatureFina = query.getFeature({tag: 'fina', script});
        arabFeatureRlig = query.getFeature({tag: 'rlig', script});
        const charToGlyphIndex = token => font.charToGlyphIndex(token.char);
        tokenizer.registerModifier('glyphIndex', null, charToGlyphIndex);
    });
    describe('getScriptFeature', function () {
        it('should return features indexes of a given script tag', function () {
            let featuresIndexes = query.getScriptFeaturesIndexes('arab');
            assert.equal(featuresIndexes.length, 24);
        });
        it('should return features of a given script', function () {
            let features = query.getScriptFeatures('arab');
            assert.equal(features.length, 24);
        });
        it('should return a feature instance', function () {
            assert.deepEqual(arabFeatureInit.tag, 'init');
        });
        it('find a substitute - single substitution format 2 (12)', function () {
            // Arabic Presentation Forms 'init' 'medi' 'fina'
            const tokens = tokenizer.tokenize('محمد');
            const initContextParams = new ContextParams(tokens, 0); // 'م'
            const initSubstitution = arabFeatureInit.lookup(initContextParams);
            assert.deepEqual(initSubstitution.length, 1); // should return a single substitution
            assert.deepEqual(initSubstitution[0].id, 12); // should return a substitution of type 1 format 2
            assert.deepEqual(initSubstitution[0].substitution[0], 1046); // should return letter 'ﻣ' : 'Meem' initial form index
            const mediContextParams = new ContextParams(tokens, 1); // 'ح'
            const mediSubstitution = arabFeatureMedi.lookup(mediContextParams);
            assert.deepEqual(initSubstitution.length, 1); // should return a single substitution
            assert.deepEqual(initSubstitution[0].id, 12); // should return a substitution of type 1 format 2
            assert.deepEqual(mediSubstitution[0].substitution[0], 798); // should return letter 'ﺤ' : 'Haa' medi form index
            const finaContextParams = new ContextParams(tokens, 3); // 'د'
            const finaSubstitution = arabFeatureFina.lookup(finaContextParams);
            assert.deepEqual(initSubstitution.length, 1); // should return a single substitution
            assert.deepEqual(initSubstitution[0].id, 12); // should return a substitution of type 1 format 2
            assert.deepEqual(finaSubstitution[0].substitution[0], 549); // should return letter 'د' : 'Dal' fina form index
        });
        it('find a substitute - chaining context substitution format 3 (63)', function () {
            const tokens = tokenizer.tokenize('لان'); // arabic word 'لان' : 'soften' indexes after applying presentation forms
            tokens[0].setState('init', [1039]); // set 'ل' : Lam init form value
            tokens[1].setState('fina', [524]); // set 'ا' : Alef fina form value
            let rligContextParams = new ContextParams(tokens, 0); // first letter 'ل' : Lam index
            let substitutions = arabFeatureRlig.lookup(rligContextParams);
            assert.deepEqual(substitutions.length, 1);
            assert.deepEqual(substitutions[0].id, 63);
            let chainingSubst = substitutions[0].substitution;
            assert.deepEqual(chainingSubst.length, 1);
            assert.deepEqual(chainingSubst[0].id, 12);
            assert.deepEqual(chainingSubst[0].substitution[0], 1330); // 1039 => rlig (63) => 1330
        });
        it('find a substitute - ligature substitution format 1 (41)', function () {
            const tokens = tokenizer.tokenize('َّ'); // arabic 'َّ' شده متبوعه بفتحه : Shadda followed by Fatha
            let rligContextParams = new ContextParams(tokens, 0);
            let substitutions = arabFeatureRlig.lookup(rligContextParams);
            assert.deepEqual(substitutions.length, 1);
            assert.deepEqual(substitutions[0].id, 41);
            assert.deepEqual(substitutions[0].substitution, [{ ligGlyph: 1311, components: [1081]}]);
        });
    });
});
