/*!
 * OpenType.js plugin to support parsing of PostScript/PS1/T1/Adobe Type 1 font files
 * 
 * https://adobe-type-tools.github.io/font-tech-notes/pdfs/T1_SPEC.pdf
 * https://personal.math.ubc.ca/~cass/piscript/type1.pdf
 * 
 * opentype.js
 * https://github.com/opentypejs/opentype.js
 * (c) 2015-present Frederik De Bleser and contributors
 * opentype.js and its plugins may be freely distributed under the MIT license.
 * 
 * Part of this plugin code based on mozilla/pdf.js
 * https://github.com/mozilla/pdf.js
 * Copyright 2012-2021 Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { Type1Parser } from './pdfjs/core/type1_parser.js';
import { Stream } from './pdfjs/core/stream.js';

let isResponsible = new WeakMap();

function findEexecPosition(dataView, pfbHeader) {
    const sequence = [0x65, 0x65, 0x78, 0x65, 0x63]; // "eexec"
    for (let i = pfbHeader; i < dataView.byteLength - sequence.length + 1; i++) {
        let match = true;
        for (let j = 0; j < sequence.length; j++) {
            if (dataView.getUint8(i + j) !== sequence[j]) {
                match = false;
                break;
            }
        }
        if (match) {
            let pos = i + sequence.length + pfbHeader;
            return pos;
        }
    }
    return -1;
}

function extractExtendedHeader(properties) {
    let token;
    let skippedToken;
    let prevToken;
    let supported = true;
    while ((token = this.getToken()) !== null) {
        if (token !== '/') {
            skippedToken = token;
            continue;
        }

        token = this.getToken();
        
        if(skippedToken === undefined && !properties.postScriptName) {
            properties.postScriptName = token;
        } else if(prevToken === 'FontName') {
            properties.fullName = token;
        } else switch (token) {
            case 'FontBBox':
                properties.fontBBox = this.readNumberArray();
                break;
            case '$Blend':
            case 'Blend':
            case 'BlendAxisTypes':
            case 'BlendDesignMap':
            case 'BlendDesignPositions':
            case 'WeightVector':
                if(supported) {
                    supported = false;
                    console.warn('Type1 multiple master fonts are not supported and will contain incorrect data');
                }
                break;
        }
        prevToken = token;
    }        
}

const plugin_cff1file = {
    parseBuffer_signature: function(returnData, params) {
        const { font, createDefaultNamesInfo, data, signature, parse, tableEntries } = params;
        const pfbHeader = parse.getByte(data, 0) === 0x80 && parse.getByte(data, 1) === 0x01 ? 6 : 0;
        if(signature.substring(0,2) !== '%!' && !pfbHeader) return false;
        isResponsible.set(font, true);

        const eexecDelimiter = findEexecPosition(data, pfbHeader);
        
        if ( eexecDelimiter > -1 ) {
            const fontHeader = new Stream(data.buffer, 0, eexecDelimiter, {});
            const fontData = new Stream(data.buffer, eexecDelimiter + 1, undefined, {});

            const fontHeaderParser = new Type1Parser(
                fontHeader,
                false,
                true
            );
            const extendedHeaderParser = new Type1Parser(
                fontHeader,
                false,
                true
            );
            const fontDataParser = new Type1Parser(
                fontData,
                true,
                true
            );

            const properties = {
                widths: []
            };
            
            fontHeaderParser.extractFontHeader(properties);
            extendedHeaderParser.stream.reset();
            extractExtendedHeader.call(extendedHeaderParser, properties);
            
            const glyphData = fontDataParser.extractFontProgram(properties);

            if(properties.builtInEncoding) {
                const charset = [];
                if(properties.builtInEncoding[0] !== '.notdef') {
                    charset.push('.notdef');
                }
            }

            params.numTables = 0;

            font.handledByPlugin = true;
            font.outlinesFormat = 'cff';
            font.nGlyphs = font.numGlyphs = glyphData.charstrings.length || 0;
            const topDict = properties;

            const metaData = {
                copyright: topDict.copyright || topDict.notice,
                familyName: topDict.familyName || '',
                styleName: topDict.weight || '',
                fullName: topDict.fullName,
                version: topDict.version,
                postScriptName: topDict.postScriptName || '',
            };

            font.glyphNames = new params.GlyphNames({});
            font.names = {};
            font.names.unicode = font.names.macintosh = font.names.windows = createDefaultNamesInfo(metaData);

            const fMatrix = properties.fontMatrix || [0.001, 0, 0, 0.001, 0, 0];
            const bBox = properties.fontBBox || [0,0,0,0];
            
            font.tables.cff = {
                topDict: {
                    _defaultWidthX: 0,
                    _nominalWidthX: 0,
                    fontBBox: bBox,
                    fontMatrix: fMatrix
                }
            };

            font.unitsPerEm = fMatrix && fMatrix.length && (1/fMatrix[0]) || 1000;
            
            bBox[0] = bBox[0] || font.unitsPerEm;
            bBox[1] = bBox[1] || properties.descend || -200;
            bBox[2] = bBox[2] || properties.ascend || font.unitsPerEm;
            bBox[3] = bBox[3] || font.unitsPerEm;

            font.ascender = properties.ascend || bBox[2];
            font.descender = properties.descend || bBox[1];

            font.tables.cmap = {
                glyphIndexMap: {}
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
                font._hmtxTableData[i] = {
                    advanceWidth: 0,
                    leftSideBearing: 0
                };
            }

            font.gsubrs = glyphData.subrs;
            font.gsubrsBias = params.cff.calcCFFSubroutineBias(font.gsubrs);

            font.glyphs = new params.glyphset.GlyphSet(font);
            if(!glyphData.charstrings.length && properties.builtInEncoding) {
                if(properties.builtInEncoding[0] !== '.notdef') {
                    font.glyphs.push(0, new params.Glyph({ name: '.notdef' }));
                    font.glyphNames.names.push('.notdef');
                }
                for(let i = 0; i < properties.builtInEncoding.length; i++) {
                    const index = font.glyphs.length;
                    font.glyphs.push(index, new params.Glyph({ index, name: properties.builtInEncoding[i], advanceWidth: properties.widths && properties.widths[i] }));
                }
            } else {
                for (let i = 0; i < font.nGlyphs; i += 1) {
                    font._hmtxTableData[i] = {
                        advanceWidth: glyphData.charstrings[i].width,
                        leftSideBearing: glyphData.charstrings[i].lsb,
                    };
                    const name = glyphData.charstrings[i].glyphName;
                    font.glyphNames.names.push(name);
                    if(properties.builtInEncoding) {
                        const charIndex = properties.builtInEncoding.indexOf(name);
                        (charIndex > -1) && (font.tables.cmap.glyphIndexMap[charIndex] = i);
                    }
                }
                const glyphLoader = function(font, i, glyphName, charString) {
                    return function() {
                        const glyph = params.glyphset.cffGlyphLoader(font, i, charString, 1)();
                        glyph.name = glyphName;
                        glyph.advanceWidth = glyphData.charstrings[i].width;
                        glyph.leftSideBearing = glyphData.charstrings[i].lsb;
                        return glyph;
                    };
                };
                if (params.opt.lowMemory) {
                    font._push = function(i) {
                        const charString = glyphData.charstrings[i].charstring;
                        const glyphName = glyphData.charstrings[i].glyphName;
                        font.glyphs.push(i, glyphLoader(font, i, glyphName, charString));
                    };
                } else {
                    for (let i = 0; i < font.nGlyphs; i += 1) {
                        const charString = glyphData.charstrings[i].charstring;
                        const glyphName = glyphData.charstrings[i].glyphName;
                        font.glyphs.push(i, glyphLoader(font, i, glyphName, charString));
                    }
                }
            }

            font.encoding = new params.CmapEncoding(font.tables.cmap);
        } else {
            console.error('Type 1 font is missing eexec comand or binary data');
            return false;
        }

        return true;
    },
};

export default plugin_cff1file;