import assert from 'assert';
import { Font, Glyph, Path } from '../src/opentype.mjs';

/**
 * Build a two-stage calt font that simulates the Playwrite pattern:
 *
 *   Stage 1 (lookup 0, type 1): a(2) → a.med(3)  — applies to every 'a'
 *   Stage 2 (lookup 1, type 6): when a.med(3) is followed by a.med(3),
 *     expand via sub-lookup 2 (type 2): a.med(3) → [a.med(3), cnct(4)]
 *
 * Feature calt lists lookups [0, 1].  Sub-lookup 2 is not directly in
 * the feature; it is only referenced by the chaining context.
 *
 * The regression: if all lookups are applied at once per position (old
 * behaviour), stage 2 can never see a.med in the lookahead because stage 1
 * hasn't yet run on positions to the right.  With the fix, stage 1 runs
 * over the entire string first, so stage 2 sees the correct lookahead.
 */
function buildMultiStageCaltFont() {
    const glyphs = [
        new Glyph({ name: '.notdef', advanceWidth: 500, path: new Path() }),
        new Glyph({ name: 'space',   unicode: 0x20, advanceWidth: 250, path: new Path() }),
        new Glyph({ name: 'a',       unicode: 0x61, advanceWidth: 500, path: new Path() }),
        new Glyph({ name: 'a.med',   advanceWidth: 500, path: new Path() }),
        new Glyph({ name: 'cnct',    advanceWidth: 0,   path: new Path() }),
    ];

    const font = new Font({
        familyName: 'MultiStageCaltTest',
        styleName: 'Regular',
        unitsPerEm: 1000,
        ascender: 800,
        descender: -200,
        glyphs,
    });

    font.tables.gsub = {
        version: 1,
        scripts: [{
            tag: 'latn',
            script: {
                defaultLangSys: { reserved: 0, reqFeatureIndex: 0xffff, featureIndexes: [0] },
                langSysRecords: [],
            },
        }],
        features: [{
            tag: 'calt',
            feature: { params: 0, lookupListIndexes: [0, 1] },
        }],
        lookups: [
            // Lookup 0 (stage 1): single substitution — a(2) → a.med(3)
            {
                lookupType: 1, lookupFlag: 0,
                subtables: [{
                    substFormat: 2,
                    coverage: { format: 1, glyphs: [2] },
                    substitute: [3],
                }],
            },
            // Lookup 1 (stage 2): chaining context format 3
            //   input=[a.med(3)], lookahead=[a.med(3)] → expand via sub-lookup 2
            {
                lookupType: 6, lookupFlag: 0,
                subtables: [{
                    substFormat: 3,
                    backtrackCoverage: [],
                    inputCoverage:    [{ format: 1, glyphs: [3] }],
                    lookaheadCoverage:[{ format: 1, glyphs: [3] }],
                    lookupRecords: [{ sequenceIndex: 0, lookupListIndex: 2 }],
                }],
            },
            // Lookup 2 (referenced by lookup 1): multiple substitution — a.med(3) → [a.med(3), cnct(4)]
            {
                lookupType: 2, lookupFlag: 0,
                subtables: [{
                    substFormat: 1,
                    coverage: { format: 1, glyphs: [3] },
                    sequences: [[3, 4]],
                }],
            },
        ],
    };

    return font;
}

/**
 * Build a minimal Latin font whose calt feature exercises cross-word-boundary
 * chaining context substitution (GSUB lookup type 6, format 3).
 *
 * Glyph layout:
 *   0  .notdef
 *   1  space   (U+0020) — present so calt backtrack/lookahead can see word edges
 *   2  a       (U+0061)
 *   3  b       (U+0062)
 *   4  a.fina  — alternate 'a' used at the end of a word (followed by space)
 *   5  b.init  — alternate 'b' used at the start of a word (preceded by space)
 *
 * GSUB calt lookup (lookupType 6) has two format-3 subtables:
 *   Rule A: [] backtrack, [a(2)] input, [space(1)] lookahead → a → a.fina
 *   Rule B: [space(1)] backtrack, [b(3)] input, [] lookahead → b → b.init
 *
 * Sub-lookups:
 *   Lookup 0 (type 1 fmt 2): a(2)  → a.fina(4)
 *   Lookup 1 (type 1 fmt 2): b(3)  → b.init(5)
 *   Lookup 2 (type 6 fmt 3): calt chaining context (rules A and B above)
 */
function buildCaltFont() {
    const glyphs = [
        new Glyph({ name: '.notdef', advanceWidth: 500, path: new Path() }),
        new Glyph({ name: 'space',  unicode: 0x20, advanceWidth: 250, path: new Path() }),
        new Glyph({ name: 'a',     unicode: 0x61, advanceWidth: 500, path: new Path() }),
        new Glyph({ name: 'b',     unicode: 0x62, advanceWidth: 500, path: new Path() }),
        new Glyph({ name: 'a.fina', advanceWidth: 500, path: new Path() }),
        new Glyph({ name: 'b.init', advanceWidth: 500, path: new Path() }),
    ];

    const font = new Font({
        familyName: 'CaltCrossWordTest',
        styleName: 'Regular',
        unitsPerEm: 1000,
        ascender: 800,
        descender: -200,
        glyphs,
    });

    font.tables.gsub = {
        version: 1,
        scripts: [{
            tag: 'latn',
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
            tag: 'calt',
            feature: { params: 0, lookupListIndexes: [2] },
        }],
        lookups: [
            // Lookup 0: single substitution — a(2) → a.fina(4)
            {
                lookupType: 1, lookupFlag: 0,
                subtables: [{
                    substFormat: 2,
                    coverage: { format: 1, glyphs: [2] },
                    substitute: [4],
                }],
            },
            // Lookup 1: single substitution — b(3) → b.init(5)
            {
                lookupType: 1, lookupFlag: 0,
                subtables: [{
                    substFormat: 2,
                    coverage: { format: 1, glyphs: [3] },
                    substitute: [5],
                }],
            },
            // Lookup 2: calt — chaining context format 3
            {
                lookupType: 6, lookupFlag: 0,
                subtables: [
                    // Rule A: 'a' when the next glyph is a space → use a.fina
                    {
                        substFormat: 3,
                        backtrackCoverage: [],
                        inputCoverage: [{ format: 1, glyphs: [2] }],
                        lookaheadCoverage: [{ format: 1, glyphs: [1] }],
                        lookupRecords: [{ sequenceIndex: 0, lookupListIndex: 0 }],
                    },
                    // Rule B: 'b' when the previous glyph is a space → use b.init
                    {
                        substFormat: 3,
                        backtrackCoverage: [{ format: 1, glyphs: [1] }],
                        inputCoverage: [{ format: 1, glyphs: [3] }],
                        lookaheadCoverage: [],
                        lookupRecords: [{ sequenceIndex: 0, lookupListIndex: 1 }],
                    },
                ],
            },
        ],
    };

    return font;
}

describe('calt — cross-word-boundary contextual alternates', function () {
    let font;

    beforeEach(function () {
        font = buildCaltFont();
    });

    it('applies both boundary alternates across a word space', function () {
        // "a b": 'a' is the last glyph in the first word (lookahead = space) so
        // Rule A fires; 'b' is the first glyph in the second word (backtrack = space)
        // so Rule B fires.
        //
        // Before the cross-word-boundary fix, each latinWord range was processed
        // with context limited to its own tokens, so the first letter's backtrack
        // and the last letter's lookahead were both empty — neither rule matched.
        const indexes = font.stringToGlyphIndexes('a b');
        assert.deepEqual(indexes, [
            4,  // a.fina  (Rule A: lookahead is space)
            1,  // space   (unchanged)
            5,  // b.init  (Rule B: backtrack is space)
        ]);
    });

    it('does not substitute when no word boundary is present', function () {
        // "ab": the two letters share a word, no space in backtrack or lookahead.
        const indexes = font.stringToGlyphIndexes('ab');
        assert.deepEqual(indexes, [
            2,  // a (unsubstituted)
            3,  // b (unsubstituted)
        ]);
    });

    it('applies the final alternate at the end of a word before a space', function () {
        // "a ": Rule A fires — 'a' lookahead contains the space glyph.
        const indexes = font.stringToGlyphIndexes('a ');
        assert.deepEqual(indexes, [
            4,  // a.fina
            1,  // space
        ]);
    });

    it('applies the initial alternate at the start of a word after a space', function () {
        // " b": Rule B fires — 'b' backtrack (reversed) starts with the space glyph.
        const indexes = font.stringToGlyphIndexes(' b');
        assert.deepEqual(indexes, [
            1,  // space
            5,  // b.init
        ]);
    });

    it('handles a format-3 calt rule whose sub-lookup uses single substitution format 1 (delta)', function () {
        // Fonts like Playwright use type-1 format-1 (delta) sub-lookups inside
        // their calt chaining context rules.  applyLookupRecords previously threw
        // "Substitution type 11 is not supported in chaining substitution" because
        // '11' was absent from chainingSubstitutionFormat3's allowedTypes list.
        //
        // This test replaces lookup 0 with a format-1 (delta) variant:
        //   a(2)  + delta(2)  → a.fina(4)
        // The calt format-3 rule is otherwise identical to Rule A in buildCaltFont.
        const deltaFont = buildCaltFont();
        deltaFont.tables.gsub.lookups[0] = {
            lookupType: 1, lookupFlag: 0,
            subtables: [{
                substFormat: 1,
                coverage: { format: 1, glyphs: [2] },
                deltaGlyphId: 2,          // a(2) + 2 = a.fina(4)
            }],
        };

        const indexes = deltaFont.stringToGlyphIndexes('a ');
        assert.deepEqual(indexes, [
            4,  // a.fina via delta sub-lookup (substFormat 1)
            1,  // space
        ]);
    });
});

describe('calt — multi-stage lookup ordering', function () {
    // Simulates the Playwrite pattern: stage-1 lookups convert base glyphs to
    // contextual forms, stage-2 lookups then expand those forms into
    // [glyph, connector] pairs by checking what already-substituted glyph
    // follows.  Stage 2 can only fire after stage 1 has run over the whole
    // string — which requires each lookup to be applied to all positions
    // before the next lookup starts.

    let font;
    beforeEach(function () { font = buildMultiStageCaltFont(); });

    it('inserts a connector between two consecutive contextual forms', function () {
        // Both a's become a.med in stage 1.  In stage 2, the first a.med has
        // a.med in its lookahead, so it expands to [a.med, cnct].
        const indexes = font.stringToGlyphIndexes('aa');
        assert.deepEqual(indexes, [3, 4, 3]);
    });

    it('does not insert a connector after the last contextual form', function () {
        // Single a → a.med in stage 1, but stage 2 requires a.med in the
        // lookahead, which is absent, so no connector is added.
        const indexes = font.stringToGlyphIndexes('a');
        assert.deepEqual(indexes, [3]);
    });

    it('inserts connectors between all consecutive contextual forms', function () {
        // Three a's all become a.med in stage 1.  Stage 2 inserts a connector
        // after each a.med that has another a.med following it.
        const indexes = font.stringToGlyphIndexes('aaa');
        assert.deepEqual(indexes, [3, 4, 3, 4, 3]);
    });
});
