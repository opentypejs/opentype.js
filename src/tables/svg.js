import { Parser } from '../parse.js';
import table from '../table.js';

// https://learn.microsoft.com/en-us/typography/opentype/spec/svg

/**
 * @typedef {Map<number, Uint8Array>} SVGTable
 */

/**
 * @param {DataView} data
 * @param {number} offset
 * @returns {SVGTable}
 */
function parseSvgTable(data, offset) {
    const svgTable = new Map();
    const buf = data.buffer;
    const p = new Parser(data, offset);
    const version = p.parseUShort();
    if (version !== 0) return svgTable;

    p.relativeOffset = p.parseOffset32();
    const svgDocumentListOffset = data.byteOffset + offset + p.relativeOffset;
    const numEntries = p.parseUShort();
    const svgDocMap = new Map();
    for (let i = 0; i < numEntries; i++) {
        const startGlyphID = p.parseUShort();
        const endGlyphID = p.parseUShort();
        const svgDocOffset = svgDocumentListOffset + p.parseOffset32();
        const svgDocLength = p.parseULong();
        let svgDoc = svgDocMap.get(svgDocOffset);
        if (svgDoc === undefined) {
            svgDoc = new Uint8Array(buf, svgDocOffset, svgDocLength);
            svgDocMap.set(svgDocOffset, svgDoc);
        }
        for (let i = startGlyphID; i <= endGlyphID; i++) {
            svgTable.set(i, svgDoc);
        }
    }
    return svgTable;
}

/**
 * @param {SVGTable} svgTable
 * @returns {opentype.Table}
 */
function makeSvgTable(svgTable) {
    const glyphIds = Array.from(svgTable.keys()).sort();
    const documentRecords = [];
    const documentBuffers = [];
    const documentOffsets = new Map();
    let nextSvgDocOffset = 0;
    let record = { endGlyphID: null };
    for (let i = 0, l = glyphIds.length; i < l; i++) {
        const glyphId = glyphIds[i];
        const svgDoc = svgTable.get(glyphId);
        let svgDocOffset = documentOffsets.get(svgDoc);
        if (svgDocOffset === undefined) {
            svgDocOffset = nextSvgDocOffset;
            documentBuffers.push(svgDoc);
            documentOffsets.set(svgDoc, svgDocOffset);
            nextSvgDocOffset += svgDoc.byteLength;
        }
        if (glyphId - 1 === record.endGlyphID && svgDocOffset === record.svgDocOffset) {
            record.endGlyphID = glyphId;
        } else {
            record = {
                startGlyphID: glyphId,
                endGlyphID: glyphId,
                svgDocOffset,
                svgDocLength: svgDoc.byteLength,
            };
            documentRecords.push(record);
        }
    }

    const numEntries = documentRecords.length;
    const numDocuments = documentBuffers.length;
    const documentsOffset = 2 + numEntries * (2 + 2 + 4 + 4);
    const fields = new Array(3 + 1 + numEntries * 4 + numDocuments);
    let fieldIndex = 0;

    // SVG Table Header
    fields[fieldIndex++] = { name: 'version', type: 'USHORT', value: 0 };
    fields[fieldIndex++] = { name: 'svgDocumentListOffset', type: 'ULONG', value: 2 + 4 + 4 };
    fields[fieldIndex++] = { name: 'reserved', type: 'ULONG',  value: 0 };

    // SVG Document List
    fields[fieldIndex++] = { name: 'numEntries', type: 'USHORT', value: numEntries };
    for (let i = 0; i < numEntries; i++) {
        const namePrefix = 'documentRecord_' + i;
        const { startGlyphID, endGlyphID, svgDocOffset, svgDocLength } = documentRecords[i];
        fields[fieldIndex++] = { name: namePrefix + '_startGlyphID', type: 'USHORT', value: startGlyphID };
        fields[fieldIndex++] = { name: namePrefix + '_endGlyphID', type: 'USHORT', value: endGlyphID };
        fields[fieldIndex++] = { name: namePrefix + '_svgDocOffset', type: 'ULONG', value: documentsOffset + svgDocOffset };
        fields[fieldIndex++] = { name: namePrefix + '_svgDocLength', type: 'ULONG', value: svgDocLength };
    }

    // SVG Documents
    for (let i = 0; i < numDocuments; i++) {
        fields[fieldIndex++] = { name: 'svgDoc_' + i, type: 'LITERAL', value: documentBuffers[i] };
    }

    return new table.Table('SVG ', fields);
}

export default {
    make: makeSvgTable,
    parse: parseSvgTable,
};
