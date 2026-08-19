import assert from 'assert';
import { Font, Glyph, Path } from '../src/opentype.mjs';
import FeatureQuery from '../src/features/featureQuery.mjs';
import { ContextParams } from '../src/tokenizer.mjs';

/**
 * Build a minimal font with a GSUB Chaining Context Substitution Format 3
 * (lookup type 6, format 3) whose nested SubstLookupRecord references a
 * Single Substitution Format 1 (lookup type 1, format 1) lookup.
 *
 * This reproduces issue #860: chainingSubstitutionFormat3 only handled the
 * nested substitution types "12" (Single, format 2) and "21" (Multiple,
 * format 1), and threw for anything else. A nested Single/format-1 lookup
 * resolves to "11", which used to fall through and throw
 *   Error: Substitution type 11 is not supported in chaining substitution
 *
 * The layout mirrors the real-world trigger (Noto Sans Thai Looped ccmp,
 * which substitutes LO CHULA U+0E2C to a short-tail variant when an above
 * mark follows, via a chaining context whose nested lookup is Single/format-1):
 *
 * Glyph layout:
 *   0: .notdef
 *   1: base       (LO CHULA, unicode 0x0E2C)
 *   2: mark       (above vowel, unicode 0x0E34)
 *   3: base.short (short-tail substitute for base)
 *
 * GSUB structure:
 *   Lookup 0: single substitution (type 1, FORMAT 1): base(1) -> base.short(3)
 *             via deltaGlyphId = 2 (1 + 2 = 3)
 *   Lookup 1: chaining context substitution (type 6, format 3):
 *       backtrackCoverage: []
 *       inputCoverage:     [covers base(1)]
 *       lookaheadCoverage: [covers mark(2)]
 *       lookupRecords:
 *         { sequenceIndex: 0, lookupListIndex: 0 }  <- apply lookup 0 at input pos 0
 *
 * Feature 'ccmp' (script 'DFLT') references lookup 1.
 *
 * Input [base, mark] = [1, 2] should produce [base.short] = [3].
 */
function buildChainingSubst3Font() {
    const glyphs = [
        new Glyph({ name: '.notdef', advanceWidth: 500, path: new Path() }),
        new Glyph({ name: 'base', unicode: 0x0E2C, advanceWidth: 500, path: new Path() }),
        new Glyph({ name: 'mark', unicode: 0x0E34, advanceWidth: 0, path: new Path() }),
        new Glyph({ name: 'base.short', advanceWidth: 500, path: new Path() }),
    ];

    const font = new Font({
        familyName: 'ChainingSubst3Test',
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
            tag: 'ccmp',
            feature: { params: 0, lookupListIndexes: [1] },
        }],
        lookups: [
            // Lookup 0: single substitution FORMAT 1: base(1) -> base.short(3)
            {
                lookupType: 1,
                lookupFlag: 0,
                subtables: [{
                    substFormat: 1,
                    coverage: { format: 1, glyphs: [1] },
                    deltaGlyphId: 2,
                }],
            },
            // Lookup 1: chaining context substitution format 3
            // Match: base followed by mark; apply lookup 0 (Single/format-1) at input pos 0.
            {
                lookupType: 6,
                lookupFlag: 0,
                subtables: [{
                    substFormat: 3,
                    backtrackCoverage: [],
                    inputCoverage: [
                        { format: 1, glyphs: [1] },  // input pos 0: matches base
                    ],
                    lookaheadCoverage: [
                        { format: 1, glyphs: [2] },  // lookahead pos 0: matches mark
                    ],
                    lookupRecords: [
                        { sequenceIndex: 0, lookupListIndex: 0 },
                    ],
                }],
            },
        ],
    };

    return font;
}

describe('chainingSubstitutionFormat3', function () {
    let font;
    let query;

    beforeEach(function () {
        font = buildChainingSubst3Font();
        query = new FeatureQuery(font);
    });

    it('applies a nested Single/format-1 (type 11) lookup without throwing (issue #860)', function () {
        const feature = query.getFeature({ tag: 'ccmp', script: 'DFLT' });
        const featureLookups = query.getFeatureLookups(feature);
        const lookupSubtables = query.getLookupSubtables(featureLookups[0]);
        const substitutionType = query.getSubstitutionType(featureLookups[0], lookupSubtables[0]);
        assert.equal(substitutionType, '63');

        const lookup = query.getLookupMethod(featureLookups[0], lookupSubtables[0]);
        const contextParams = new ContextParams([1, 2], 0);

        // Before the fix this threw:
        //   Error: Substitution type 11 is not supported in chaining substitution
        const substitutions = lookup(contextParams);

        // base(1) -> base.short(3), applied at input position 0.
        assert.deepEqual(substitutions, [3]);
    });

    it('does not throw for a nested type-11 lookup (regression guard for #860)', function () {
        const feature = query.getFeature({ tag: 'ccmp', script: 'DFLT' });
        const featureLookups = query.getFeatureLookups(feature);
        const lookupSubtables = query.getLookupSubtables(featureLookups[0]);
        const lookup = query.getLookupMethod(featureLookups[0], lookupSubtables[0]);
        const contextParams = new ContextParams([1, 2], 0);

        assert.doesNotThrow(() => lookup(contextParams));
    });

    it('returns empty when the lookahead context does not match', function () {
        const feature = query.getFeature({ tag: 'ccmp', script: 'DFLT' });
        const featureLookups = query.getFeatureLookups(feature);
        const lookupSubtables = query.getLookupSubtables(featureLookups[0]);
        const lookup = query.getLookupMethod(featureLookups[0], lookupSubtables[0]);
        // base followed by base (no mark) -> lookahead coverage fails, no substitution.
        const contextParams = new ContextParams([1, 1], 0);
        const substitutions = lookup(contextParams);

        assert.deepEqual(substitutions, []);
    });
});
