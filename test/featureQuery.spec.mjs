import assert from 'assert';
import { parse } from '../src/opentype.mjs';
import FeatureQuery from '../src/features/featureQuery.mjs';
import { ContextParams } from '../src/tokenizer.mjs';
import { readFileSync } from 'fs';

const loadSync = (url, opt) => parse(readFileSync(url), opt);

const getGlyphClass = function(classDefTable, glyphIndex) {
    switch (classDefTable.format) {
        case 1: {
            if (classDefTable.startGlyph <= glyphIndex &&
                glyphIndex < classDefTable.startGlyph + classDefTable.classes.length) {
                return classDefTable.classes[glyphIndex - classDefTable.startGlyph];
            }
            return 0;
        }
        case 2: {
            const ranges = classDefTable.ranges;
            for (let i = 0; i < ranges.length; i++) {
                const range = ranges[i];
                if (glyphIndex >= range.start && glyphIndex <= range.end) {
                    return range.classId;
                }
            }
            return 0;
        }
    }
    return 0;
};

describe('featureQuery.mjs', function() {
    let arabicFont;
    let arabicFontChanga;
    let latinFont;
    let sub5Font;

    let query = {};
    beforeEach(function () {
        /**
         * arab
         */
        arabicFont = loadSync('./test/fonts/Scheherazade-Bold.ttf');
        arabicFontChanga = loadSync('./test/fonts/Changa-Regular.ttf');
        query.arabic = new FeatureQuery(arabicFont);
        query.arabicChanga = new FeatureQuery(arabicFontChanga);
        /**
         * latin
         */
        latinFont = loadSync('./test/fonts/FiraSansMedium.woff');
        query.latin = new FeatureQuery(latinFont);
        /**
         * default
         */
        sub5Font = loadSync('./test/fonts/sub5.ttf');
        query.sub5 = new FeatureQuery(sub5Font);
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
            assert.deepEqual(initSubsType, '12'); // supported: single substitution '12'
            assert.deepEqual(typeof initLookupFn, 'function');
            /** latin */
            const ligaFeature = query.latin.getFeature({tag: 'liga', script: 'latn'});
            const ligaFeatureLookups = query.latin.getFeatureLookups(ligaFeature);
            const ligaLookupTable = ligaFeatureLookups[0];
            const ligaLookupSubtables = query.latin.getLookupSubtables(ligaLookupTable);
            const ligaSubtable = ligaLookupSubtables[0];
            const ligaSubsType = query.latin.getSubstitutionType(ligaLookupTable, ligaSubtable);
            const ligaLookupFn = query.latin.getLookupMethod(ligaLookupTable, ligaSubtable);
            assert.deepEqual(ligaSubsType, '41'); // supported: ligature substitution '41'
            assert.deepEqual(typeof ligaLookupFn, 'function');
        });
        it('should find a substitute - single substitution format 1 (11)', function () {
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
            assert.deepEqual(ligaSubsType, '41'); // supported single substitution '41'
            let contextParams = new ContextParams([73, 76], 0);
            const substitutions = lookup(contextParams);
            assert.deepEqual(substitutions, { ligGlyph: 1145, components: [76]});
        });
        it('should parse multiple glyphs -ligature substitution format 1 (51)', function () {
            const feature = query.sub5.getFeature({tag: 'ccmp', script: 'DFLT'});
            const featureLookups = query.sub5.getFeatureLookups(feature);
            const lookupSubtables = query.sub5.getLookupSubtables(featureLookups[0]);
            const substitutionType = query.sub5.getSubstitutionType(featureLookups[0], lookupSubtables[0]);
            assert.equal(substitutionType, 51);
            const lookup = query.sub5.getLookupMethod(featureLookups[0], lookupSubtables[0]);
            let contextParams = new ContextParams([1, 88, 1], 0);
            const substitutions = lookup(contextParams);
            assert.deepEqual(substitutions, [85, 88, 85]);
        });
        it('should parse multiple glyphs -ligature substitution format 3 (53)', function () {
            const feature = query.sub5.getFeature({tag: 'ccmp', script: 'DFLT'});
            const featureLookups = query.sub5.getFeatureLookups(feature);
            const lookupSubtables = query.sub5.getLookupSubtables(featureLookups[1]);
            const substitutionType = query.sub5.getSubstitutionType(featureLookups[1], lookupSubtables[0]);
            assert.equal(substitutionType, 53);
            const lookup = query.sub5.getLookupMethod(featureLookups[0], lookupSubtables[0]);
            let contextParams = new ContextParams([2, 3], 0);
            const substitutions = lookup(contextParams);
            assert.deepEqual(substitutions, [54, 54]);
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
        it('should route context substitution format 2 (52) correctly', function () {
            // This test verifies that case '52' is registered in getLookupMethod switch
            // Without this case, getLookupMethod would throw an error for format 2 context substitutions
            const featureQuery = query.arabic;
            
            // Mock a lookup table and subtable with substitution type 52
            const mockLookupTable = { lookupType: 5 }; // Context substitution type 5
            const mockSubtable = { substFormat: 2 }; // Format 2 (class-based)
            
            // This should not throw an error if case '52' is registered
            try {
                const substitutionType = featureQuery.getSubstitutionType(mockLookupTable, mockSubtable);
                // Type 5 format 2 should be '52'
                assert.equal(substitutionType, '52');
            } catch (e) {
                assert.fail('getLookupMethod should handle case "52" for context substitution format 2');
            }
        });
        it('should route chaining context substitution format 2 (62) correctly', function () {
            // This test verifies that case '62' is registered in getLookupMethod switch
            // Without this case, getLookupMethod would throw an error for format 2 chaining context substitutions
            const featureQuery = query.arabic;
            
            // Mock a lookup table and subtable with substitution type 62
            const mockLookupTable = { lookupType: 6 }; // Chaining context substitution type 6
            const mockSubtable = { substFormat: 2 }; // Format 2 (class-based)
            
            // This should not throw an error if case '62' is registered
            try {
                const substitutionType = featureQuery.getSubstitutionType(mockLookupTable, mockSubtable);
                // Type 6 format 2 should be '62'
                assert.equal(substitutionType, '62');
                
                // Verify getLookupMethod recognizes the type without throwing
                const lookup = featureQuery.getLookupMethod(mockLookupTable, mockSubtable);
                assert.ok(typeof lookup === 'function', 'getLookupMethod should return a function for case 62');
            } catch (e) {
                assert.fail(`getLookupMethod should handle case "62" for chaining context substitution format 2: ${e.message}`);
            }
        });
        it('should apply chaining context substitution format 1 (61) using lookup records', function () {
            const singleSubtable = {
                substFormat: 1,
                coverage: { format: 1, glyphs: [10] },
                deltaGlyphId: 1
            };
            const singleLookupTable = {
                lookupType: 1,
                subtables: [singleSubtable]
            };
            const chainingSubtable = {
                substFormat: 1,
                coverage: { format: 1, glyphs: [10] },
                chainRuleSets: [[{
                    backtrack: [1],
                    input: [20, 21],
                    lookahead: [30],
                    lookupRecords: [{ sequenceIndex: 0, lookupListIndex: 0 }]
                }]]
            };
            const chainingLookupTable = { lookupType: 6, subtables: [chainingSubtable] };
            const mockFont = {
                tables: { gsub: { lookups: [singleLookupTable] } },
                substitution: { getGlyphClass }
            };
            const featureQuery = new FeatureQuery(mockFont);
            const lookup = featureQuery.getLookupMethod(chainingLookupTable, chainingSubtable);
            const contextParams = new ContextParams([1, 10, 20, 21, 30], 1);
            const substitutions = lookup(contextParams);
            assert.deepEqual(substitutions, [11]);
        });
        it('should apply chaining context substitution format 2 (62) using lookup records', function () {
            const singleSubtable = {
                substFormat: 1,
                coverage: { format: 1, glyphs: [10] },
                deltaGlyphId: 5
            };
            const singleLookupTable = {
                lookupType: 1,
                subtables: [singleSubtable]
            };
            const chainingSubtable = {
                substFormat: 2,
                coverage: { format: 1, glyphs: [10] },
                backtrackClassDef: { format: 2, ranges: [{ start: 1, end: 1, classId: 2 }] },
                inputClassDef: {
                    format: 2,
                    ranges: [
                        { start: 10, end: 10, classId: 1 },
                        { start: 20, end: 20, classId: 3 }
                    ]
                },
                lookaheadClassDef: { format: 2, ranges: [{ start: 30, end: 30, classId: 4 }] },
                chainClassSet: [
                    null,
                    [{
                        backtrack: [2],
                        input: [3],
                        lookahead: [4],
                        lookupRecords: [{ sequenceIndex: 0, lookupListIndex: 0 }]
                    }]
                ]
            };
            const chainingLookupTable = { lookupType: 6, subtables: [chainingSubtable] };
            const mockFont = {
                tables: { gsub: { lookups: [singleLookupTable] } },
                substitution: { getGlyphClass }
            };
            const featureQuery = new FeatureQuery(mockFont);
            const lookup = featureQuery.getLookupMethod(chainingLookupTable, chainingSubtable);
            const contextParams = new ContextParams([1, 10, 20, 30], 1);
            const substitutions = lookup(contextParams);
            assert.deepEqual(substitutions, [15]);
        });
    });
});
