/*!
 * OpenType.js plugin to support parsing of standalone CFF1 font files
 * 
 * https://adobe-type-tools.github.io/font-tech-notes/pdfs/5176.CFF.pdf
 * 
 * opentype.js
 * https://github.com/opentypejs/opentype.js
 * (c) 2015-present Frederik De Bleser and contributors
 * opentype.js may be freely distributed under the MIT license.
 */

let isResponsible = new WeakMap();

const plugin_cff1file = {
    parseBuffer_signature: function(returnData, params) {
        const { font, data, sizeOf, parse, tableEntries } = params;
        if(!(data.buffer.byteLength > (3 * sizeOf.Card8() + sizeOf.OffSize()) && parse.getByte(data, 0) === 0x01)) return false;
        isResponsible.set(font, true);

        tableEntries.push({ tag: 'CFF ', offset: 0 });
        tableEntries.push({ tag: 'name' });
        tableEntries.push({ tag: 'hmtx' });
        return true;
    },
    parseBuffer_before_addGlyphNames: function(returnData, params) {
        if(!isResponsible.get(params.font)) return false;

        const { font, createDefaultNamesInfo } = params;

        font.numGlyphs = font.nGlyphs;

        const cffTable = font.tables.cff;
        const topDict = cffTable.topDict;
        const psName = cffTable.nameIndex && cffTable.nameIndex.objects.length && cffTable.nameIndex.objects[0] || '';
        const metaData = {
            copyright: topDict.copyright || topDict.notice,
            familyName: topDict.familyName || '',
            styleName: topDict.weight || '',
            fullName: topDict.fullName,
            version: topDict.version,
            postScriptName: psName
        };
        font.names.unicode = font.names.macintosh = font.names.windows = createDefaultNamesInfo(metaData);

        const bBox = topDict.fontBBox;
        const fMatrix = topDict.fontMatrix;
        font.ascender = font.ascender || bBox && bBox.length > 2 && bBox[2] || 0;
        font.descender = font.descender || bBox && bBox.length > 1 && bBox[1] || -200;
        font.unitsPerEm = font.unitsPerEm || fMatrix && fMatrix.length && (1/fMatrix[0]) || 1000;

        font.tables.cmap = {
            glyphIndexMap: []
        };
        font.tables.head = {
            xMin: bBox && bBox.length && bBox[1],
            xMax: bBox && bBox.length > 3 && bBox[3],
            yMin: font.descender,
            yMax: font.ascender,
        };
        font.tables.hhea = {
            descender: font.descender,
            ascender: font.ascender,
        };
        font.tables.os2 = {
            sTypoDescender: font.descender,
            sTypoAscender: font.ascender,
        };
        font._hmtxTableData = {};
        for(let i = 0; i < font.numGlyphs; i++) {
            font._hmtxTableData[i] = {};
        }
    }
};

export default plugin_cff1file;