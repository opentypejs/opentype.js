import assert from 'assert';
import { Font, Glyph, Path } from '../src/opentype';
import Substitution from '../src/substitution';

describe('substitution.js', function() {
    let font;
    let substitution;
    const notdefGlyph = new Glyph({
        name: '.notdef',
        unicode: 0,
        path: new Path()
    });

    const glyphs = [notdefGlyph].concat('abcdefghijklmnopqrstuvwxyz'.split('').map(function (c) {
        return new Glyph({
            name: c,
            unicode: c.charCodeAt(0),
            path: new Path()
        });
    }));

    const defaultScriptList = [{
        tag: 'DFLT',
        script: {
            defaultLangSys: {reserved: 0, reqFeatureIndex: 0xffff, featureIndexes: [0]},
            langSysRecords: []
        }
    }];

    beforeEach(function() {
        font = new Font({
            familyName: 'MyFont',
            styleName: 'Medium',
            unitsPerEm: 1000,
            ascender: 800,
            descender: -200,
            glyphs: glyphs
        });
        substitution = new Substitution(font);
    });

    describe('createDefaultTable', function() {
        it('must return an empty default GSUB table', function() {
            assert.deepEqual(substitution.createDefaultTable(), {
                version: 1,
                scripts: [{
                    tag: 'DFLT',
                    script: {
                        defaultLangSys: { reserved: 0, reqFeatureIndex: 0xffff, featureIndexes: [] },
                        langSysRecords: []
                    }
                }],
                features: [],
                lookups: []
            });
        });
    });

    describe('add', function() {
        it('can add single substitutions (lookup type 1 format 2)', function() {
            substitution.add('salt', { sub: 4, by: 10 });
            substitution.add('salt', { sub: 5, by: 11 });
            assert.deepEqual(font.tables.gsub.scripts, defaultScriptList);
            assert.deepEqual(font.tables.gsub.features, [{
                tag: 'salt',
                feature: { params: 0, lookupListIndexes: [0] }
            }]);
            assert.deepEqual(font.tables.gsub.lookups, [{
                lookupFlag: 0,
                lookupType: 1,
                markFilteringSet: undefined,
                subtables: [{
                    substFormat: 2,
                    coverage: { format: 1, glyphs: [4, 5] },
                    substitute: [10, 11]
                }]
            }]);
        });

        it('can add alternate substitutions (lookup type 3)', function() {
            substitution.add('aalt', { sub: 4, by: [5, 6, 7] });
            substitution.add('aalt', { sub: 8, by: [9, 10] });
            assert.deepEqual(font.tables.gsub.scripts, defaultScriptList);
            assert.deepEqual(font.tables.gsub.features, [{
                tag: 'aalt',
                feature: { params: 0, lookupListIndexes: [0] }
            }]);
            assert.deepEqual(font.tables.gsub.lookups, [{
                lookupFlag: 0,
                lookupType: 3,
                markFilteringSet: undefined,
                subtables: [{
                    substFormat: 1,
                    coverage: { format: 1, glyphs: [4, 8] },
                    alternateSets: [[5, 6, 7], [9, 10]]
                }]
            }]);
        });

        it('can add ligatures (lookup type 4)', function() {
            substitution.add('liga', { sub: [4, 5], by: 17 });
            substitution.add('liga', { sub: [4, 6], by: 18 });
            substitution.add('liga', { sub: [8, 1, 2], by: 19 });
            assert.deepEqual(font.tables.gsub.scripts, defaultScriptList);
            assert.deepEqual(font.tables.gsub.features, [{
                tag: 'liga',
                feature: { params: 0, lookupListIndexes: [0] }
            }]);
            assert.deepEqual(font.tables.gsub.lookups, [{
                lookupFlag: 0,
                lookupType: 4,
                markFilteringSet: undefined,
                subtables: [{
                    substFormat: 1,
                    coverage: { format: 1, glyphs: [4, 8] },
                    ligatureSets: [
                        [{ ligGlyph: 17, components: [5] }, { ligGlyph: 18, components: [6] }],
                        [{ ligGlyph: 19, components: [1, 2] }]
                    ]
                }]
            }]);
        });
    });
});
