import assert from 'assert';
import Font from '../../src/font.mjs';
import name from '../../src/tables/name.mjs';
import sfnt from '../../src/tables/sfnt.mjs';
import { encode } from '../../src/types.mjs';

function encodeAndParseTable(table, parser) {
    const bytes = encode.TABLE(table);
    const data = new DataView(new ArrayBuffer(bytes.length), 0);
    for (let k = 0; k < bytes.length; k++) {
        data.setUint8(k, bytes[k]);
    }

    return parser(data, 0);
}

describe('tables/sfnt.mjs', function () {
    let font;
    const defaultFont = {
        familyName: 'MyFont',
        styleName: 'Medium',
        unitsPerEm: 1000,
        ascender: 800,
        descender: 0,
    };

    describe('fontToSfntTable', function () {
        beforeEach(function() {
            font = new Font({...defaultFont});
        });

        it('should create an sfnt table object', ()=>{
            const sfnt_table = sfnt.fontToTable(font);
            assert.ok(sfnt_table);
            assert.equal(sfnt_table.tableName, 'sfnt');
        });

        it('should set default values when no name values are set', ()=>{
            const sfnt_table = sfnt.fontToTable(font);
            const name_table = sfnt_table.tables.find((table)=>table.tableName == 'name');

            assert.ok(name_table);
            
            const parsedNameTable = encodeAndParseTable(name_table, name.parse);

            assert.deepEqual(parsedNameTable, {
                macintosh: {
                    copyright: { en: ' ' },
                    fontFamily: { en: defaultFont.familyName }, // 'MyFont'
                    fontSubfamily: { en: defaultFont.styleName }, // 'Medium'
                    fullName: { en: `${defaultFont.familyName} ${defaultFont.styleName}` }, // 'MyFont Medium'
                    version: { en: 'Version 0.1' },
                    postScriptName: { en: `${defaultFont.familyName}${defaultFont.styleName}` }, // 'MyFontMedium'
                    trademark: { en: ' ' },
                    manufacturer: { en: ' ' },
                    designer: { en: ' ' },
                    description: { en: ' ' },
                    manufacturerURL: { en: ' ' },
                    designerURL: { en: ' ' },
                    license: { en: ' ' },
                    licenseURL: { en: ' ' },
                    preferredFamily: { en: defaultFont.familyName }, // 'MyFont'
                    preferredSubfamily: { en: defaultFont.styleName }, // 'Medium'
                    uniqueID: { en: ` : ${defaultFont.familyName} ${defaultFont.styleName}` },
                },
                windows: {
                    copyright: { en: ' ' },
                    fontFamily: { en: defaultFont.familyName }, // 'MyFont'
                    fontSubfamily: { en: defaultFont.styleName }, // 'Medium'
                    fullName: { en: `${defaultFont.familyName} ${defaultFont.styleName}` }, // 'MyFont Medium'
                    version: { en: 'Version 0.1' },
                    postScriptName: { en: `${defaultFont.familyName}${defaultFont.styleName}` }, // 'MyFontMedium'
                    trademark: { en: ' ' },
                    manufacturer: { en: ' ' },
                    designer: { en: ' ' },
                    description: { en: ' ' },
                    manufacturerURL: { en: ' ' },
                    designerURL: { en: ' ' },
                    license: { en: ' ' },
                    licenseURL: { en: ' ' },
                    preferredFamily: { en: defaultFont.familyName }, // 'MyFont'
                    preferredSubfamily: { en: defaultFont.styleName }, // 'Medium'
                    uniqueID: { en: ` : ${defaultFont.familyName} ${defaultFont.styleName}` },
                }
            });
        });

        it('should set values in the names table with the values of the font object\'s names property', ()=>{
            const fontFamily = 'Original Name';
            const fontSubfamily = 'Bold Italic';
            const fullName = 'Original Name Bold Italic';
            const version = 'Version 24';
            const preferredFamily = 'Custom Name';
            const preferredSubfamily = '700 Italic';

            font.names = {
                macintosh: {
                    fontFamily: { en: fontFamily },
                    fontSubfamily: { en: fontSubfamily},
                    fullName: { en: fullName },
                    version: { en: version },
                    preferredFamily: { en: preferredFamily },
                    preferredSubfamily: { en: preferredSubfamily}
                },
                windows: {
                    fontFamily: { en: fontFamily },
                    fontSubfamily: { en: fontSubfamily},
                    fullName: { en: fullName },
                    version: { en: version },
                    preferredFamily: { en: preferredFamily },
                    preferredSubfamily: { en: preferredSubfamily}
                }
            };

            const sfnt_table = sfnt.fontToTable(font);
            const name_table = sfnt_table.tables.find((table)=>table.tableName == 'name');
            const parsedNameTable = encodeAndParseTable(name_table, name.parse);

            assert.deepEqual(parsedNameTable, {
                macintosh: {
                    fontFamily: { en: fontFamily },
                    fontSubfamily: { en: fontSubfamily},
                    fullName: { en: fullName },
                    version: { en: version },
                    preferredFamily: { en: preferredFamily },
                    preferredSubfamily: { en: preferredSubfamily },
                    postScriptName: { en: `${fontFamily.replaceAll(' ', '')}-${fontSubfamily}` },
                    uniqueID: { en: `: ${fontFamily} ${fontSubfamily}` },
                },
                windows: {
                    fontFamily: { en: fontFamily },
                    fontSubfamily: { en: fontSubfamily},
                    fullName: { en: fullName },
                    version: { en: version },
                    preferredFamily: { en: preferredFamily },
                    preferredSubfamily: { en: preferredSubfamily},
                    postScriptName: { en: `${fontFamily.replaceAll(' ', '')}-${fontSubfamily}` },
                    uniqueID: { en: `: ${fontFamily} ${fontSubfamily}` },
                }
            });
        });

        it('should set preferredSubfamily as value of fontSubfamily, if not explicitly set', ()=>{
            const preferredSubfamily = 'Custom Subfamily';
            font.names = { macintosh: {
                fontFamily: {en: defaultFont.familyName },
                fontSubfamily: { en: preferredSubfamily }
            }};

            const sfnt_table = sfnt.fontToTable(font);
            const name_table = sfnt_table.tables.find((table)=>table.tableName == 'name');
            const parsedNameTable = encodeAndParseTable(name_table, name.parse);

            assert.deepEqual(parsedNameTable.macintosh.preferredSubfamily, { en: preferredSubfamily });
            assert.deepEqual(parsedNameTable.windows.preferredSubfamily, { en: preferredSubfamily });
        });
    });
});

