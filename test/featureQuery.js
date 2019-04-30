import assert from 'assert';
import { loadSync } from '../src/opentype';
import FeatureQuery from '../src/features/featureQuery';
import { ContextParams } from '../src/tokenizer';

describe('featureQuery.js', function() {
    let arabicFont;
    let arabicFontChanga;
    let latinFont;
    let query = {};
    before(function () {
        /**
         * arab
         */
        arabicFont = loadSync('./fonts/Scheherazade-Bold.ttf');
        arabicFontChanga = loadSync('./fonts/Changa-Regular.ttf');
        query.arabic = new FeatureQuery(arabicFont);
        query.arabicChanga = new FeatureQuery(arabicFontChanga);
        /**
         * latin
         */
        latinFont = loadSync('./fonts/FiraSansMedium.woff');
        query.latin = new FeatureQuery(latinFont);
    });
    describe('getScriptFeature', function () {
        it('should return features indexes of a given script tag', function () {
            /** arab */
            let arabFeaturesIndexes = query.arabic.getScriptFeaturesIndexes('arab');
            assert.equal(arabFeaturesIndexes.length, 24);
            /** latin */
            let latnFeaturesIndexes = query.latin.getScriptFeaturesIndexes('latn');
            assert.equal(latnFeaturesIndexes.length, 20);
        });
        it('should return features of a given script', function () {
            /** arab */
            let arabFeatures = query.arabic.getScriptFeatures('arab');
            assert.equal(arabFeatures.length, 24);
            /** latin */
            let latnFeatures = query.latin.getScriptFeatures('latn');
            assert.equal(latnFeatures.length, 20);
        });
        it('should return a feature lookup tables', function () {
            /** arab */
            const initFeature = query.arabic.getFeature({tag: 'init', script: 'arab'});
            assert.deepEqual(initFeature.lookupListIndexes, [7]);
            const initFeatureLookups = query.arabic.getFeatureLookups(initFeature);
            assert.deepEqual(initFeatureLookups[0], arabicFont.tables.gsub.lookups[7]);
            /** latin */
            const ligaFeature = query.latin.getFeature({tag: 'liga', script: 'latn'});
            assert.deepEqual(ligaFeature.lookupListIndexes, [35]);
            const ligaFeatureLookups = query.latin.getFeatureLookups(ligaFeature);
            assert.deepEqual(ligaFeatureLookups[0], latinFont.tables.gsub.lookups[35]);
        });
        it('should return lookup subtables', function () {
            /** arab */
            const initFeature = query.arabic.getFeature({tag: 'init', script: 'arab'});
            const initFeatureLookups = query.arabic.getFeatureLookups(initFeature);
            const initLookupSubtables = query.arabic.getLookupSubtables(initFeatureLookups[0]);
            assert.deepEqual(initLookupSubtables.length, arabicFont.tables.gsub.lookups[7].subtables.length);
            /** latin */
            const ligaFeature = query.latin.getFeature({tag: 'liga', script: 'latn'});
            const ligaFeatureLookups = query.latin.getFeatureLookups(ligaFeature);
            const ligaLookupSubtables = query.latin.getLookupSubtables(ligaFeatureLookups[0]);
            assert.deepEqual(ligaLookupSubtables.length, latinFont.tables.gsub.lookups[35].subtables.length);
        });
        it('should return subtable lookup method', function () {
            /** arab */
            const initFeature = query.arabic.getFeature({tag: 'init', script: 'arab'});
            const initFeatureLookups = query.arabic.getFeatureLookups(initFeature);
            const initLookupTable = initFeatureLookups[0];
            const initLookupSubtables = query.arabic.getLookupSubtables(initLookupTable);
            const initSubtable = initLookupSubtables[0];
            const initSubsType = query.arabic.getSubstitutionType(initLookupTable, initSubtable);
            const initLookupFn = query.arabic.getLookupMethod(initLookupTable, initSubtable);
            assert.deepEqual(initSubsType, 12); // supported: single substitution '12'
            assert.deepEqual(typeof initLookupFn, 'function');
            /** latin */
            const ligaFeature = query.latin.getFeature({tag: 'liga', script: 'latn'});
            const ligaFeatureLookups = query.latin.getFeatureLookups(ligaFeature);
            const ligaLookupTable = ligaFeatureLookups[0];
            const ligaLookupSubtables = query.latin.getLookupSubtables(ligaLookupTable);
            const ligaSubtable = ligaLookupSubtables[0];
            const ligaSubsType = query.latin.getSubstitutionType(ligaLookupTable, ligaSubtable);
            const ligaLookupFn = query.latin.getLookupMethod(ligaLookupTable, ligaSubtable);
            assert.deepEqual(ligaSubsType, 41); // supported: ligature substitution '41'
            assert.deepEqual(typeof ligaLookupFn, 'function');
        });
        it.only('should find a substitute - single substitution format 1 (11)', function () {
            const feature = query.arabicChanga.getFeature({tag: 'init', script: 'arab'});
            const featureLookups = query.arabicChanga.getFeatureLookups(feature);
            const lookupSubtables = query.arabicChanga.getLookupSubtables(featureLookups[0]);
            const substitutionType = query.arabicChanga.getSubstitutionType(featureLookups[0], lookupSubtables[0]);
            assert.equal(substitutionType, 11);
            const lookup = query.arabicChanga.getLookupMethod(featureLookups[0], lookupSubtables[0]);
            const substitution = lookup(291);
            assert.equal(substitution, 294);
        });
        it('should find a substitute - single substitution format 2 (12)', function () {
            const feature = query.arabic.getFeature({tag: 'init', script: 'arab'});
            const featureLookups = query.arabic.getFeatureLookups(feature);
            const lookupSubtables = query.arabic.getLookupSubtables(featureLookups[0]);
            const substitutionType = query.arabic.getSubstitutionType(featureLookups[0], lookupSubtables[0]);
            assert.equal(substitutionType, 12);
            const lookup = query.arabic.getLookupMethod(featureLookups[0], lookupSubtables[0]);
            const substitution = lookup(351);
            assert.equal(substitution, 910);
        });
        it('should find a substitute - chaining context substitution format 3 (63)', function () {
            const feature = query.arabic.getFeature({tag: 'rlig', script: 'arab'});
            const featureLookups = query.arabic.getFeatureLookups(feature);
            const lookupSubtables = query.arabic.getLookupSubtables(featureLookups[0]);
            const substitutionType = query.arabic.getSubstitutionType(featureLookups[0], lookupSubtables[0]);
            assert.equal(substitutionType, 63);
            const lookup = query.arabic.getLookupMethod(featureLookups[0], lookupSubtables[0]);
            let contextParams = new ContextParams([882, 520], 0);
            const substitutions = lookup(contextParams);
            assert.deepEqual(substitutions, [1348]);
        });
        it('should find a substitute - required ligature substitution format 1 (41)', function () {
            /** arab */
            const initFeature = query.arabic.getFeature({tag: 'rlig', script: 'arab'});
            const initFeatureLookups = query.arabic.getFeatureLookups(initFeature);
            const lookupSubtables = query.arabic.getLookupSubtables(initFeatureLookups[1]);
            const substitutionType = query.arabic.getSubstitutionType(initFeatureLookups[1], lookupSubtables[0]);
            assert.equal(substitutionType, 41);
            const lookup = query.arabic.getLookupMethod(initFeatureLookups[1], lookupSubtables[0]);
            let contextParams = new ContextParams([1075, 1081], 0);
            const substitutions = lookup(contextParams);
            assert.deepEqual(substitutions, { ligGlyph: 1311, components: [1081]});
        });
        it('should find a substitute - ligature substitution format 1 (41)', function () {
            /** latin */
            const ligaFeature = query.latin.getFeature({tag: 'liga', script: 'latn'});
            const ligaFeatureLookups = query.latin.getFeatureLookups(ligaFeature);
            const ligaLookupTable = ligaFeatureLookups[0];
            const ligaLookupSubtables = query.latin.getLookupSubtables(ligaLookupTable);
            const ligaSubtable = ligaLookupSubtables[0];
            const ligaSubsType = query.latin.getSubstitutionType(ligaLookupTable, ligaSubtable);
            const lookup = query.latin.getLookupMethod(ligaLookupTable, ligaSubtable);
            assert.deepEqual(ligaSubsType, 41); // supported single substitution '41'
            let contextParams = new ContextParams([73, 76], 0);
            const substitutions = lookup(contextParams);
            assert.deepEqual(substitutions, { ligGlyph: 1145, components: [76]});
        });
        it('should decompose a glyph - multiple substitution format 1 (21)', function () {
            const feature = query.arabic.getFeature({tag: 'ccmp', script: 'arab'});
            const featureLookups = query.arabic.getFeatureLookups(feature);
            const lookupSubtables = query.arabic.getLookupSubtables(featureLookups[1]);
            const substitutionType = query.arabic.getSubstitutionType(featureLookups[1], lookupSubtables[0]);
            assert.equal(substitutionType, 21);
            const lookup = query.arabic.getLookupMethod(featureLookups[1], lookupSubtables[0]);
            const substitution = lookup(271);
            assert.deepEqual(substitution, [273, 1087]);
        });
    });
});
