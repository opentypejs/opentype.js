import assert from 'assert';
import { Font, Glyph, Path } from '../src/opentype.mjs';
import FeatureQuery from '../src/features/featureQuery.mjs';
import { ContextParams } from '../src/tokenizer.mjs';

/**
 * Build a minimal font with a GSUB chaining context substitution format 2
 * lookup and two nested single substitutions.
 *
 * The first chaining rule matches D A B C and deliberately does nothing.
 * The second matches D A B at the end of the sequence and applies:
 * B(2) -> B.alt1(5) -> B.alt2(6).
 */
function buildChainingSubst2Font() {
    const glyphs = [
        new Glyph({ name: '.notdef', advanceWidth: 500, path: new Path() }),
        new Glyph({ name: 'A', unicode: 0x41, advanceWidth: 500, path: new Path() }),
        new Glyph({ name: 'B', unicode: 0x42, advanceWidth: 500, path: new Path() }),
        new Glyph({ name: 'C', unicode: 0x43, advanceWidth: 500, path: new Path() }),
        new Glyph({ name: 'D', unicode: 0x44, advanceWidth: 500, path: new Path() }),
        new Glyph({ name: 'B.alt1', advanceWidth: 500, path: new Path() }),
        new Glyph({ name: 'B.alt2', advanceWidth: 500, path: new Path() }),
    ];
    const font = new Font({
        familyName: 'ChainingSubst2Test',
        styleName: 'Regular',
        unitsPerEm: 1000,
        ascender: 800,
        descender: -200,
        glyphs: glyphs,
    });

    font.tables.gsub = {
        version: 1,
        scripts: [{
            tag: 'delf',
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
            feature: { params: 0, lookupListIndexes: [2] },
        }],
        lookups: [{
            lookupType: 1,
            lookupFlag: 0,
            subtables: [{
                substFormat: 1,
                coverage: { format: 1, glyphs: [2] },
                deltaGlyphId: 3,
            }],
        }, {
            lookupType: 1,
            lookupFlag: 0,
            subtables: [{
                substFormat: 2,
                coverage: { format: 1, glyphs: [5] },
                substitute: [6],
            }],
        }, {
            lookupType: 6,
            lookupFlag: 0,
            subtables: [{
                substFormat: 2,
                coverage: { format: 1, glyphs: [2] },
                backtrackClassDef: {
                    format: 2,
                    ranges: [
                        { start: 1, end: 1, classId: 1 },
                        { start: 4, end: 4, classId: 2 },
                    ],
                },
                inputClassDef: {
                    format: 2,
                    ranges: [{ start: 2, end: 2, classId: 1 }],
                },
                lookaheadClassDef: {
                    format: 2,
                    ranges: [{ start: 3, end: 3, classId: 1 }],
                },
                chainClassSet: [[], [{
                    backtrack: [1, 2],
                    input: [],
                    lookahead: [1],
                    lookupRecords: [],
                }, {
                    backtrack: [1, 2],
                    input: [],
                    lookahead: [],
                    lookupRecords: [
                        { sequenceIndex: 0, lookupListIndex: 0 },
                        { sequenceIndex: 0, lookupListIndex: 1 },
                    ],
                }]],
            }],
        }],
    };
    return font;
}

function configureSecondInputRule(font, lookupRecords) {
    const subtable = font.tables.gsub.lookups[2].subtables[0];
    subtable.coverage = { format: 1, glyphs: [1] };
    subtable.backtrackClassDef = { format: 2, ranges: [] };
    subtable.inputClassDef = {
        format: 2,
        ranges: [
            { start: 1, end: 1, classId: 1 },
            { start: 2, end: 2, classId: 2 },
        ],
    };
    subtable.lookaheadClassDef = { format: 2, ranges: [] };
    subtable.chainClassSet = [[], [{
        backtrack: [],
        input: [2],
        lookahead: [],
        lookupRecords: lookupRecords,
    }]];
    return subtable;
}

describe('chainingSubstitutionFormat2', function () {
    it('should honor backtrack, rule, and lookup record order', function () {
        const font = buildChainingSubst2Font();

        assert.deepEqual(font.stringToGlyphIndexes('DAB'), [4, 1, 6]);
        assert.deepEqual(font.stringToGlyphIndexes('DABC'), [4, 1, 2, 3]);
        assert.deepEqual(font.stringToGlyphIndexes('ADB'), [1, 4, 2]);
    });

    it('should preserve input positions for a later sequenceIndex', function () {
        const font = buildChainingSubst2Font();
        const query = new FeatureQuery(font);
        const subtable = configureSecondInputRule(font, [
            { sequenceIndex: 1, lookupListIndex: 0 },
            { sequenceIndex: 1, lookupListIndex: 1 },
        ]);

        const lookup = query.getLookupMethod(
            font.tables.gsub.lookups[2],
            subtable
        );
        const result = lookup(new ContextParams([1, 2], 0));

        assert.deepEqual(result, {
            matched: true,
            substitutions: [
                { sequenceIndex: 1, substitution: 5 },
                { sequenceIndex: 1, substitution: 6 },
            ],
        });
        assert.deepEqual(font.stringToGlyphIndexes('AB'), [1, 6]);
    });

    it('should stop after the first matching nested subtable', function () {
        const font = buildChainingSubst2Font();
        const query = new FeatureQuery(font);
        const subtable = configureSecondInputRule(font, [
            { sequenceIndex: 1, lookupListIndex: 0 },
        ]);
        font.tables.gsub.lookups[0].subtables.push({
            substFormat: 2,
            coverage: { format: 1, glyphs: [2] },
            substitute: [6],
        });

        const lookup = query.getLookupMethod(
            font.tables.gsub.lookups[2],
            subtable
        );
        const result = lookup(new ContextParams([1, 2], 0));

        assert.deepEqual(result, {
            matched: true,
            substitutions: [
                { sequenceIndex: 1, substitution: 5 },
            ],
        });
    });

    it('should resolve extension lookups wrapping single substitutions', function () {
        const font = buildChainingSubst2Font();
        const query = new FeatureQuery(font);
        const subtable = configureSecondInputRule(font, [
            { sequenceIndex: 1, lookupListIndex: 0 },
        ]);
        const extension = font.tables.gsub.lookups[0].subtables[0];
        font.tables.gsub.lookups[0] = {
            lookupType: 7,
            lookupFlag: 0,
            subtables: [{
                substFormat: 1,
                lookupType: 1,
                extension: extension,
            }],
        };

        const lookup = query.getLookupMethod(
            font.tables.gsub.lookups[2],
            subtable
        );
        const result = lookup(new ContextParams([1, 2], 0));

        assert.deepEqual(result, {
            matched: true,
            substitutions: [
                { sequenceIndex: 1, substitution: 5 },
            ],
        });
    });

    it('should reject unsupported nested substitution types', function () {
        const font = buildChainingSubst2Font();
        const query = new FeatureQuery(font);
        const subtable = configureSecondInputRule(font, [
            { sequenceIndex: 1, lookupListIndex: 0 },
        ]);
        font.tables.gsub.lookups[0] = {
            lookupType: 4,
            lookupFlag: 0,
            subtables: [{ substFormat: 1 }],
        };

        const lookup = query.getLookupMethod(
            font.tables.gsub.lookups[2],
            subtable
        );

        assert.throws(
            () => lookup(new ContextParams([1, 2], 0)),
            /Substitution type 41 is not supported/
        );
    });

    it('should stop after a matching no-op top-level subtable', function () {
        const font = buildChainingSubst2Font();
        const firstSubtable = font.tables.gsub.lookups[2].subtables[0];
        const laterSubtable = JSON.parse(JSON.stringify(firstSubtable));
        laterSubtable.chainClassSet[1] = [{
            backtrack: [1, 2],
            input: [],
            lookahead: [1],
            lookupRecords: [
                { sequenceIndex: 0, lookupListIndex: 0 },
            ],
        }];
        font.tables.gsub.lookups[2].subtables.push(laterSubtable);

        assert.deepEqual(font.stringToGlyphIndexes('DABC'), [4, 1, 2, 3]);
    });
});
