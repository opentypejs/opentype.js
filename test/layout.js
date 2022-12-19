import assert  from 'assert';
import { Font, Path, Glyph } from '../src/opentype';
import Position from '../src/position';
import Substitution from '../src/substitution';

describe('layout.js', function() {
    let font;
    let layout;
    let posLayout;
    const notdefGlyph = new Glyph({
        name: '.notdef',
        unicode: 0,
        path: new Path()
    });
    const defaultLayoutTable = {
        version: 1,
        scripts: [],
        features: [],
        lookups: []
    };

    const glyphs = [notdefGlyph].concat('abcdefghijklmnopqrstuvwxyz'.split('').map(function (c) {
        return new Glyph({
            name: c,
            unicode: c.charCodeAt(0),
            path: new Path()
        });
    }));

    beforeEach(function() {
        font = new Font({
            familyName: 'MyFont',
            styleName: 'Medium',
            unitsPerEm: 1000,
            ascender: 800,
            descender: -200,
            glyphs: glyphs
        });
        layout = new Substitution(font);
        layout.createDefaultTable = function() { return defaultLayoutTable; };

        posLayout = new Position(font);
        posLayout.createDefaultTable = function() { return defaultLayoutTable; };
    });

    describe('getTable', function() {
        it('must not always create an empty default layout table', function() {
            assert.equal(layout.getTable(), undefined);
            assert.equal(layout.getTable(false), undefined);
        });

        it('must create an empty default layout table on demand', function() {
            assert.equal(layout.getTable(true), defaultLayoutTable);
        });
    });

    describe('getScriptTable', function() {
        it('must not create a new script table if it does not exist', function() {
            assert.equal(layout.getScriptTable('DFLT'), undefined);
            assert.equal(layout.getScriptTable('DFLT', false), undefined);
        });

        it('must create an new script table only on demand and if it does not exist', function() {
            const scriptTable = layout.getScriptTable('DFLT', true);
            assert.notEqual(scriptTable, undefined);
            assert.notEqual(scriptTable.defaultLangSys, undefined);
            assert.equal(layout.getScriptTable('DFLT', true), scriptTable, 'must create only one instance for each tag');
        });
    });

    describe('getGlyphClass', function() {
        const classDef1 = {
            format: 1,
            startGlyph: 0x32,
            classes: [
                0, 1, 0, 1, 0, 1, 2, 1, 0, 2, 1, 1, 0,
                0, 0, 2, 2, 0, 0, 1, 0, 0, 0, 0, 2, 1
            ]
        };

        const classDef2 = {
            format: 2,
            ranges: [
                { start: 0x46, end: 0x47, classId: 2 },
                { start: 0x49, end: 0x49, classId: 2 },
                { start: 0xd2, end: 0xd3, classId: 1 }
            ]
        };

        it('should find a glyph class in a format 1 class definition table', function() {
            assert.equal(layout.getGlyphClass(classDef1, 0x32), 0);
            assert.equal(layout.getGlyphClass(classDef1, 0x33), 1);
            assert.equal(layout.getGlyphClass(classDef1, 0x34), 0);
            assert.equal(layout.getGlyphClass(classDef1, 0x38), 2);
            assert.equal(layout.getGlyphClass(classDef1, 0x4a), 2);
            assert.equal(layout.getGlyphClass(classDef1, 0x4b), 1);

            // Any glyph not included in the range of covered glyph IDs automatically belongs to Class 0.
            assert.equal(layout.getGlyphClass(classDef1, 0x31), 0);
            assert.equal(layout.getGlyphClass(classDef1, 0x50), 0);
        });

        it('should find a glyph class in a format 2 class definition table', function() {
            assert.equal(layout.getGlyphClass(classDef2, 0x46), 2);
            assert.equal(layout.getGlyphClass(classDef2, 0x47), 2);
            assert.equal(layout.getGlyphClass(classDef2, 0x49), 2);
            assert.equal(layout.getGlyphClass(classDef2, 0xd2), 1);
            assert.equal(layout.getGlyphClass(classDef2, 0xd3), 1);

            // Any glyph not covered by a ClassRangeRecord is assumed to belong to Class 0.
            assert.equal(layout.getGlyphClass(classDef2, 0x45), 0);
            assert.equal(layout.getGlyphClass(classDef2, 0x48), 0);
            assert.equal(layout.getGlyphClass(classDef2, 0x4a), 0);
            assert.equal(layout.getGlyphClass(classDef2, 0xd4), 0);
        });
    });

    describe('getCoverageIndex', function() {
        const cov1 = {
            format: 1,
            glyphs: [0x4f, 0x125, 0x129]
        };

        const cov2 = {
            format: 2,
            ranges: [
                { start: 6, end: 6, index: 0 },
                { start: 11, end: 11, index: 1 },
                { start: 16, end: 16, index: 2 },
                { start: 18, end: 18, index: 3 },
                { start: 37, end: 41, index: 4 },
                { start: 44, end: 52, index: 9 },
                { start: 56, end: 62, index: 18 }
            ]
        };

        it('should find a glyph in a format 1 coverage table', function() {
            assert.equal(layout.getCoverageIndex(cov1, 0x4f), 0);
            assert.equal(layout.getCoverageIndex(cov1, 0x125), 1);
            assert.equal(layout.getCoverageIndex(cov1, 0x129), 2);

            assert.equal(layout.getCoverageIndex(cov1, 0x33), -1);
            assert.equal(layout.getCoverageIndex(cov1, 0x80), -1);
            assert.equal(layout.getCoverageIndex(cov1, 0x200), -1);
        });

        it('should find a glyph in a format 2 coverage table', function() {
            assert.equal(layout.getCoverageIndex(cov2, 6), 0);
            assert.equal(layout.getCoverageIndex(cov2, 11), 1);
            assert.equal(layout.getCoverageIndex(cov2, 37), 4);
            assert.equal(layout.getCoverageIndex(cov2, 38), 5);
            assert.equal(layout.getCoverageIndex(cov2, 56), 18);
            assert.equal(layout.getCoverageIndex(cov2, 62), 24);

            assert.equal(layout.getCoverageIndex(cov2, 5), -1);
            assert.equal(layout.getCoverageIndex(cov2, 8), -1);
            assert.equal(layout.getCoverageIndex(cov2, 55), -1);
            assert.equal(layout.getCoverageIndex(cov2, 70), -1);
        });
    });

    describe('getFeaturesLookups', () => {

        beforeEach(() => {
            font.tables.gpos = {
                version: 1,
                scripts: [{
                    tag: 'DFLT',
                    script: {
                        defaultLangSys: { reserved: 0, reqFeatureIndex: 0xffff, featureIndexes: [0, 1] },
                        langSysRecords: []
                    }
                }, {
                    tag: 'latn',
                    script: {
                        defaultLangSys: { reserved: 0, reqFeatureIndex: 0xffff, featureIndexes: [0] },
                        langSysRecords: []
                    }
                }],
                features: [{
                    tag: 'mark',
                    feature: { featureParams: 0, lookupListIndexes: [1]}
                }, {
                    tag: 'kern',
                    feature: { featureParams: 0, lookupListIndexes: [0]}
                }],
                lookups: [
                    {
                        lookupType: 2,
                        lookupFlag: 0,
                        subtables: [{
                            posFormat: 1,
                            coverage: {
                                format: 1,
                                glyphs: [3]
                            },
                            pairSets: [
                                [{
                                    secondGlyph: 5,
                                    value1: { xAdvance: -91 }
                                }]
                            ]
                        }]
                    },
                    {
                    lookupType: 4,
                    lookupFlag: 0,
                    subtables: [{
                        posFormat: 1,
                        markCoverage: {
                            format: 1,
                            glyphs: [5]
                        },
                        baseCoverage: {
                            format: 2,
                            ranges: [{
                                start: 2,
                                end: 4,
                                index: 0
                            }]
                        },
                        markArray: [{
                            class: 0,
                            attachmentPoint: {
                                format: 1,
                                xCoordinate: -134,
                                yCoordinate: 812
                            }
                        }],
                        baseArray: [
                            [{
                                format: 1,
                                xCoordinate: -133,
                                yCoordinate: -500
                            }],
                            [{
                                format: 1,
                                xCoordinate: 511,
                                yCoordinate: 91
                            }]
                        ]
                    }]
                }]
            };
        });

        it('should return no lookups tables if layout table is empty', () => {
            font.tables = [];
            const result = posLayout.getFeaturesLookups(['mark']);
            assert.deepStrictEqual(result, []);
        });

        it('should return no lookups tables if is data table is empty', () => {
            font.tables.gpos.lookups = [];
            const result = posLayout.getFeaturesLookups(['mark']);
            assert.deepStrictEqual(result, []);
        });

        it('should return an ordered, union features lookup tables', () => {
            const result = posLayout.getFeaturesLookups(['mark', 'kern', 'mkmk']);
            assert.deepStrictEqual(result, [
                {
                    feature: 'kern',
                    lookupType: 2,
                    lookupFlag: 0,
                    subtables: [{
                        posFormat: 1,
                        coverage: {
                            format: 1,
                            glyphs: [3]
                        },
                        pairSets: [
                            [{
                                secondGlyph: 5,
                                value1: { xAdvance: -91 }
                            }]
                        ]
                    }]
                },
                {
                    feature: 'mark',
                    lookupType: 4,
                    lookupFlag: 0,
                    subtables: [{
                        posFormat: 1,
                        markCoverage: {
                            format: 1,
                            glyphs: [5]
                        },
                        baseCoverage: {
                            format: 2,
                            ranges: [{
                                start: 2,
                                end: 4,
                                index: 0
                            }]
                        },
                        markArray: [{
                            class: 0,
                            attachmentPoint: {
                                format: 1,
                                xCoordinate: -134,
                                yCoordinate: 812
                            }
                        }],
                        baseArray: [
                            [{
                                format: 1,
                                xCoordinate: -133,
                                yCoordinate: -500
                            }],
                            [{
                                format: 1,
                                xCoordinate: 511,
                                yCoordinate: 91
                            }]
                        ]
                    }]
                }]);
        });

        it('should return only supported features', () => {
            posLayout.supportedFeatures = [{ featureName: 'kern',  supportedLookups: [2]  }];
            const result = posLayout.getFeaturesLookups(['mark', 'kern', 'mkmk']);
            assert.deepStrictEqual(result, [
                {
                    feature: 'kern',
                    lookupType: 2,
                    lookupFlag: 0,
                    subtables: [{
                        posFormat: 1,
                        coverage: {
                            format: 1,
                            glyphs: [3]
                        },
                        pairSets: [
                            [{
                                secondGlyph: 5,
                                value1: { xAdvance: -91 }
                            }]
                        ]
                    }]
                }]);
        });

        it('should not return supported features with not supported lookups', () => {
            posLayout.supportedFeatures[0].supportedLookups = [8]; // This lookup 8 is not supported for the requested feature index
            const result = posLayout.getFeaturesLookups(['mark', 'kern', 'mkmk']);
            assert.deepStrictEqual(result, [
                {
                    feature: 'mark',
                    lookupType: 4,
                    lookupFlag: 0,
                    subtables: [{
                        posFormat: 1,
                        markCoverage: {
                            format: 1,
                            glyphs: [5]
                        },
                        baseCoverage: {
                            format: 2,
                            ranges: [{
                                start: 2,
                                end: 4,
                                index: 0
                            }]
                        },
                        markArray: [{
                            class: 0,
                            attachmentPoint: {
                                format: 1,
                                xCoordinate: -134,
                                yCoordinate: 812
                            }
                        }],
                        baseArray: [
                            [{
                                format: 1,
                                xCoordinate: -133,
                                yCoordinate: -500
                            }],
                            [{
                                format: 1,
                                xCoordinate: 511,
                                yCoordinate: 91
                            }]
                        ]
                    }]
                }]);
        });

        it('should support an extension lookup tables', () => {
            font.tables.gpos.features = [{
                tag: 'mark',
                feature: { featureParams: 0, lookupListIndexes: [1, 2]}
            }, {
                tag: 'kern',
                feature: { featureParams: 0, lookupListIndexes: [0]}
            }];
            font.tables.gpos.lookups = [
                {
                    lookupType: 9,
                    lookupFlag: 0,
                    subtables: [
                        {
                            posFormat: 1,
                            extensionLookupType: 2,
                            extension: {
                                posFormat: 1,
                                coverage: {
                                    format: 1,
                                    glyphs: [3]
                                },
                                pairSets: [
                                    [{
                                        secondGlyph: 5,
                                        value1: { xAdvance: -91 }
                                    }]
                                ]
                            }
                        }
                    ]
                },
                {
                    lookupType: 9,
                    lookupFlag: 0,
                    subtables: [
                        {
                            posFormat: 1,
                            extensionLookupType: 8,
                            extension: {
                                posFormat: 1,
                                coverage: {
                                    format: 1,
                                    glyphs: [3]
                                },
                                pairSets: [
                                    [{
                                        secondGlyph: 5,
                                        value1: { xAdvance: -91 }
                                    }]
                                ]
                            }
                        }
                    ]
                },
                {
                lookupType: 9,
                lookupFlag: 0,
                subtables: [
                    {
                        posFormat: 1,
                        extensionLookupType: 4,
                        extension: {
                            posFormat: 1,
                            markCoverage: {
                                format: 1,
                                glyphs: [5]
                            },
                            baseCoverage: {
                                format: 2,
                                ranges: [{
                                    start: 2,
                                    end: 4,
                                    index: 0
                                }]
                            },
                            markArray: [{
                                class: 0,
                                attachmentPoint: {
                                    format: 1,
                                    xCoordinate: -134,
                                    yCoordinate: 812
                                }
                            }],
                            baseArray: [
                                [{
                                    format: 1,
                                    xCoordinate: -133,
                                    yCoordinate: -500
                                }],
                                [{
                                    format: 1,
                                    xCoordinate: 511,
                                    yCoordinate: 91
                                }]
                            ]
                        }
                    }
                ]
            }];

            const result = posLayout.getFeaturesLookups(['mark', 'kern']);

            assert.deepStrictEqual(result, [
                {
                    feature: 'kern',
                    lookupType: 2,
                    lookupFlag: 0,
                    subtables: [{
                        posFormat: 1,
                        coverage: {
                            format: 1,
                            glyphs: [3]
                        },
                        pairSets: [
                            [{
                                secondGlyph: 5,
                                value1: { xAdvance: -91 }
                            }]
                        ]
                    }]
                },
                {
                    feature: 'mark',
                    lookupType: 4,
                    lookupFlag: 0,
                    subtables: [{
                        posFormat: 1,
                        markCoverage: {
                            format: 1,
                            glyphs: [5]
                        },
                        baseCoverage: {
                            format: 2,
                            ranges: [{
                                start: 2,
                                end: 4,
                                index: 0
                            }]
                        },
                        markArray: [{
                            class: 0,
                            attachmentPoint: {
                                format: 1,
                                xCoordinate: -134,
                                yCoordinate: 812
                            }
                        }],
                        baseArray: [
                            [{
                                format: 1,
                                xCoordinate: -133,
                                yCoordinate: -500
                            }],
                            [{
                                format: 1,
                                xCoordinate: 511,
                                yCoordinate: 91
                            }]
                        ]
                    }]
                }]);
        });

        it('should not return supported an extension lookup tables with not supported lookups', () => {
            posLayout.supportedFeatures[0].supportedLookups = [8]; // This lookup 8 is not supported
            font.tables.gpos.features = [{
                tag: 'mark',
                feature: { featureParams: 0, lookupListIndexes: [1, 2]}
            }, {
                tag: 'kern',
                feature: { featureParams: 0, lookupListIndexes: [0]}
            }];
            font.tables.gpos.lookups = [
                {
                    lookupType: 9,
                    lookupFlag: 0,
                    subtables: [
                        {
                            posFormat: 1,
                            extensionLookupType: 2,
                            extension: {
                                posFormat: 1,
                                coverage: {
                                    format: 1,
                                    glyphs: [3]
                                },
                                pairSets: [
                                    [{
                                        secondGlyph: 5,
                                        value1: { xAdvance: -91 }
                                    }]
                                ]
                            }
                        }
                    ]
                },
                {
                    lookupType: 9,
                    lookupFlag: 0,
                    subtables: [
                        {
                            posFormat: 1,
                            extensionLookupType: 8,
                            extension: {
                                posFormat: 1,
                                coverage: {
                                    format: 1,
                                    glyphs: [3]
                                },
                                pairSets: [
                                    [{
                                        secondGlyph: 5,
                                        value1: { xAdvance: -91 }
                                    }]
                                ]
                            }
                        }
                    ]
                },
                {
                lookupType: 9,
                lookupFlag: 0,
                subtables: [
                    {
                        posFormat: 1,
                        extensionLookupType: 4,
                        extension: {
                            posFormat: 1,
                            markCoverage: {
                                format: 1,
                                glyphs: [5]
                            },
                            baseCoverage: {
                                format: 2,
                                ranges: [{
                                    start: 2,
                                    end: 4,
                                    index: 0
                                }]
                            },
                            markArray: [{
                                class: 0,
                                attachmentPoint: {
                                    format: 1,
                                    xCoordinate: -134,
                                    yCoordinate: 812
                                }
                            }],
                            baseArray: [
                                [{
                                    format: 1,
                                    xCoordinate: -133,
                                    yCoordinate: -500
                                }],
                                [{
                                    format: 1,
                                    xCoordinate: 511,
                                    yCoordinate: 91
                                }]
                            ]
                        }
                    }
                ]
            }];

            const result = posLayout.getFeaturesLookups(['mark', 'kern', 'mkmk']);
            assert.deepStrictEqual(result, [
                {
                    feature: 'mark',
                    lookupType: 4,
                    lookupFlag: 0,
                    subtables: [{
                        posFormat: 1,
                        markCoverage: {
                            format: 1,
                            glyphs: [5]
                        },
                        baseCoverage: {
                            format: 2,
                            ranges: [{
                                start: 2,
                                end: 4,
                                index: 0
                            }]
                        },
                        markArray: [{
                            class: 0,
                            attachmentPoint: {
                                format: 1,
                                xCoordinate: -134,
                                yCoordinate: 812
                            }
                        }],
                        baseArray: [
                            [{
                                format: 1,
                                xCoordinate: -133,
                                yCoordinate: -500
                            }],
                            [{
                                format: 1,
                                xCoordinate: 511,
                                yCoordinate: 91
                            }]
                        ]
                    }]
                }]);
        });

    });
});
