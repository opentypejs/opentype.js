import assert from 'assert';
import { Font, Glyph, Path } from '../src/opentype.mjs';
import FeatureQuery from '../src/features/featureQuery.mjs';
import { ContextParams } from '../src/tokenizer.mjs';

/**
 * Build a minimal font with a GSUB Context Substitution Format 3 (type 5, format 3)
 * table to exercise contextSubstitutionFormat3.
 *
 * Glyph layout:
 *   0: .notdef
 *   1: A  (unicode 0x41)
 *   2: B  (unicode 0x42)
 *   3: A' (substitute for A)
 *   4: B' (substitute for B)
 *
 * GSUB structure:
 *   Lookup 0: single substitution (type 1, format 2): A(1) → A'(3)
 *   Lookup 1: single substitution (type 1, format 2): B(2) → B'(4)
 *   Lookup 2: context substitution (type 5, format 3):
 *       coverages: [covers A(1), covers B(2)]  ← match A followed by B
 *       lookupRecords:
 *         { sequenceIndex: 0, lookupListIndex: 0 }  ← substitute A → A'
 *         { sequenceIndex: 1, lookupListIndex: 1 }  ← substitute B → B'
 *
 * Feature 'test' (script 'DFLT') references lookup 2.
 *
 * Input [A, B] = [1, 2] should produce [A', B'] = [3, 4].
 * The old bug (iterating all inputs per record) would produce [3, 4, 3, 4].
 */
function buildContextSubst3Font() {
    const glyphs = [
        new Glyph({ name: '.notdef', advanceWidth: 500, path: new Path() }),
        new Glyph({ name: 'A', unicode: 0x41, advanceWidth: 500, path: new Path() }),
        new Glyph({ name: 'B', unicode: 0x42, advanceWidth: 500, path: new Path() }),
        new Glyph({ name: 'A.alt', advanceWidth: 500, path: new Path() }),
        new Glyph({ name: 'B.alt', advanceWidth: 500, path: new Path() }),
    ];

    const font = new Font({
        familyName: 'ContextSubst3Test',
        styleName: 'Regular',
        unitsPerEm: 1000,
        ascender: 800,
        descender: -200,
        glyphs: glyphs,
    });

    font.tables.gsub = {
        version: 1,
        scripts: [{
            tag: 'DFLT',
            script: {
                defaultLangSys: {
                    reserved: 0,
                    reqFeatureIndex: 0xffff,
                    featureIndexes: [0],
                },
                langSysRecords: [],
            },
        }],
        features: [{
            tag: 'test',
            feature: { params: 0, lookupListIndexes: [2] },
        }],
        lookups: [
            // Lookup 0: single substitution A(1) → A'(3)
            {
                lookupType: 1,
                lookupFlag: 0,
                subtables: [{
                    substFormat: 2,
                    coverage: { format: 1, glyphs: [1] },
                    substitute: [3],
                }],
            },
            // Lookup 1: single substitution B(2) → B'(4)
            {
                lookupType: 1,
                lookupFlag: 0,
                subtables: [{
                    substFormat: 2,
                    coverage: { format: 1, glyphs: [2] },
                    substitute: [4],
                }],
            },
            // Lookup 2: context substitution format 3
            // Match: [any in coverage0, any in coverage1] = [A, B]
            // Apply: lookup 0 at position 0, lookup 1 at position 1
            {
                lookupType: 5,
                lookupFlag: 0,
                subtables: [{
                    substFormat: 3,
                    coverages: [
                        { format: 1, glyphs: [1] },  // position 0: matches A
                        { format: 1, glyphs: [2] },  // position 1: matches B
                    ],
                    lookupRecords: [
                        { sequenceIndex: 0, lookupListIndex: 0 },
                        { sequenceIndex: 1, lookupListIndex: 1 },
                    ],
                }],
            },
        ],
    };

    return font;
}

describe('contextSubstitutionFormat3', function () {
    let font;
    let query;

    beforeEach(function () {
        font = buildContextSubst3Font();
        query = new FeatureQuery(font);
    });

    it('should produce correct substitutions for [A, B] → [A\', B\']', function () {
        const feature = query.getFeature({ tag: 'test', script: 'DFLT' });
        const featureLookups = query.getFeatureLookups(feature);
        const lookupSubtables = query.getLookupSubtables(featureLookups[0]);
        const substitutionType = query.getSubstitutionType(featureLookups[0], lookupSubtables[0]);
        assert.equal(substitutionType, '53');

        const lookup = query.getLookupMethod(featureLookups[0], lookupSubtables[0]);
        const contextParams = new ContextParams([1, 2], 0);
        const substitutions = lookup(contextParams);

        // Should produce [A'(3), B'(4)], NOT [3, 4, 3, 4] (old bug)
        assert.deepEqual(substitutions, [3, 4]);
    });

    it('should return empty array when context is too short', function () {
        const feature = query.getFeature({ tag: 'test', script: 'DFLT' });
        const featureLookups = query.getFeatureLookups(feature);
        const lookupSubtables = query.getLookupSubtables(featureLookups[0]);

        const lookup = query.getLookupMethod(featureLookups[0], lookupSubtables[0]);
        const contextParams = new ContextParams([1], 0);
        const substitutions = lookup(contextParams);

        assert.deepEqual(substitutions, []);
    });

    it('should return empty array when glyphs do not match coverages', function () {
        const feature = query.getFeature({ tag: 'test', script: 'DFLT' });
        const featureLookups = query.getFeatureLookups(feature);
        const lookupSubtables = query.getLookupSubtables(featureLookups[0]);

        const lookup = query.getLookupMethod(featureLookups[0], lookupSubtables[0]);
        // B, A (wrong order — coverage[0] expects A, coverage[1] expects B)
        const contextParams = new ContextParams([2, 1], 0);
        const substitutions = lookup(contextParams);

        assert.deepEqual(substitutions, []);
    });

    it('should only substitute at specific sequenceIndex positions', function () {
        // Modify the font to only have one lookupRecord (at position 0)
        font.tables.gsub.lookups[2].subtables[0].lookupRecords = [
            { sequenceIndex: 0, lookupListIndex: 0 },
        ];
        query = new FeatureQuery(font);

        const feature = query.getFeature({ tag: 'test', script: 'DFLT' });
        const featureLookups = query.getFeatureLookups(feature);
        const lookupSubtables = query.getLookupSubtables(featureLookups[0]);

        const lookup = query.getLookupMethod(featureLookups[0], lookupSubtables[0]);
        const contextParams = new ContextParams([1, 2], 0);
        const substitutions = lookup(contextParams);

        // Only position 0 substituted: [A'(3)], position 1 untouched
        assert.deepEqual(substitutions, [3]);
    });
});
