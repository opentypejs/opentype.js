import assert from 'assert';
import Font from '../../src/font.js';
import sfnt from '../../src/tables/sfnt.js';
import name from '../../src/tables/name.js';
import { encode } from '../../src/types.js';

function encodeAndParseTable(table, parser) {
    const bytes = encode.TABLE(table);
    const data = new DataView(new ArrayBuffer(bytes.length), 0);
    for (let k = 0; k < bytes.length; k++) {
        data.setUint8(k, bytes[k]);
    }

    return parser(data, 0);
}

describe('tables/sfnt.js', ()=>{
    let font;
    const defaultFont = {
        familyName: 'MyFont',
        styleName: 'Medium',
        unitsPerEm: 1000,
        ascender: 800,
        descender: 0,
    };

    describe('fontToSfntTable', () => {
        beforeEach(function() {
            font = new Font({...defaultFont});
        });

        it('creates an sfnt table object', ()=>{
            const sfnt_table = sfnt.fontToTable(font);
            assert.ok(sfnt_table);
            assert.equal(sfnt_table.tableName, 'sfnt');
        })

        it('gives default values when no name values are set', ()=>{
            const sfnt_table = sfnt.fontToTable(font);
            const name_table = sfnt_table.tables.find((table)=>table.tableName == "name");

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
                    preferredSubfamily: { en: defaultFont.styleName } // 'Medium'
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
                    preferredSubfamily: { en: defaultFont.styleName } // 'Medium'
                }
            });
        });
    });
});

