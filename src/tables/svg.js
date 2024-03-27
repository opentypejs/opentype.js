import { Parser } from '../parse.js';
import table from '../table.js';
import { isGzip, unGzip } from '../util.js';

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

/**
 * @param {Uint8Array} buf
 * @returns {Promise<string>}
 */
function decodeSvgDocumentWithTinyInflate(buf) {
    try {
        return Promise.resolve(new TextDecoder().decode(isGzip(buf) ? unGzip(buf) : buf));
    } catch (error) {
        return Promise.reject(error);
    }
}
/**
 * @param {Uint8Array} buf
 * @returns {Promise<string>}
 */
function decodeSvgDocumentWithDecompressionStream(buf) {
    if (isGzip(buf)) {
        return new Response(new Response(buf).body.pipeThrough(new DecompressionStream('gzip'))).text();
    }
    try {
        return Promise.resolve(new TextDecoder().decode(buf));
    } catch (error) {
        return Promise.reject(error);
    }
}
/**
 * @param {Uint8Array} buf
 * @returns {Promise<string>}
 */
const decodeSvgDocument = globalThis.DecompressionStream
    ? decodeSvgDocumentWithDecompressionStream
    : decodeSvgDocumentWithTinyInflate;

/**
 * @typedef {string | [string, string, string, string, string, string, string]} SVGTemplate
 */

/**
 * @typedef {Object} SVGImage
 * @prop {number} leftSideBearing
 * @prop {number} baseline
 * @prop {HTMLImageElement} image
 */

/** @type {WeakMap<Uint8Array, Promise<SVGTemplate>>} */
const svgTemplateCache = new WeakMap();

/**
 * @param {SVGTable} svgTable
 * @param {number} glyphId
 * @returns {Promise<SVGImage> | undefined}
 */
function svgImageLoader(svgTable, glyphId) {
    const svgBuf = svgTable.get(glyphId);
    if (svgBuf === undefined) return Promise.resolve();
    let svgTemplatePromise = svgTemplateCache.get(svgBuf);
    if (svgTemplatePromise === undefined) {
        svgTemplatePromise = decodeSvgDocument(svgBuf).then(makeSvgTemplate);
        svgTemplateCache.set(svgBuf, svgTemplatePromise);
    }
    return svgTemplatePromise.then((svgTemplate) => {
        let svgText;
        if (typeof svgTemplate === 'string') {
            svgText = svgTemplate;
        } else {
            svgTemplate[4] = glyphId;
            svgText = svgTemplate.join('');
        }
        const svgImage = makeSvgImage(svgText);
        return svgImage.image.decode().then(() => svgImage);
    });
}

/**
 * https://learn.microsoft.com/en-us/typography/opentype/spec/svg#glyph-identifiers
 * @param {string} text
 * @returns {SVGTemplate}
 */
function makeSvgTemplate(text) {
    const documentStart =  text.indexOf('<svg');
    const contentStart = text.indexOf('>', documentStart + 4) + 1;

    if (/ id=['"]glyph\d+['"]/.test(text.substring(documentStart, contentStart))) {
        return text;
    }

    const contentEnd = text.lastIndexOf('</svg>');
    return [
        text.substring(0, contentStart),
        '<defs>',
        text.substring(contentStart, contentEnd),
        '</defs><use href="#glyph', '', '"/>',
        text.substring(contentEnd),
    ];
}

/**
 * @param {string} text
 * @returns {SVGImage}
 */
function makeSvgImage(text) {
    const svgDocument = new DOMParser().parseFromString(text, 'image/svg+xml');
    /** @type {SVGSVGElement} */
    const svg = svgDocument.documentElement;
    const viewBoxVal = svg.viewBox.baseVal;
    const widthVal = svg.width.baseVal;
    const heightVal = svg.height.baseVal;
    let xScale = 1;
    let yScale = 1;
    if (viewBoxVal.width > 0 && viewBoxVal.height > 0) {
        if (widthVal.unitType === 1) {
            xScale = widthVal.valueInSpecifiedUnits / viewBoxVal.width;
            yScale = heightVal.unitType === 1 ? heightVal.valueInSpecifiedUnits / viewBoxVal.height : xScale;
        } else if (heightVal.unitType === 1) {
            yScale = heightVal.valueInSpecifiedUnits / viewBoxVal.height;
            xScale = yScale;
        }
    }

    const div = document.createElement('div');
    div.style.position = 'fixed';
    div.style.visibility = 'hidden';
    div.appendChild(svg);
    document.body.appendChild(div);
    const bbox = svg.getBBox();
    document.body.removeChild(div);

    const leftSideBearing = (bbox.x - viewBoxVal.x) * xScale;
    const baseline = (viewBoxVal.y - bbox.y) * yScale;
    const width = bbox.width * xScale;
    const height = bbox.height * yScale;

    svg.setAttribute('viewBox', [bbox.x, bbox.y, bbox.width, bbox.height].join(' '));
    if (xScale !== 1) svg.setAttribute('width', width);
    if (yScale !== 1) svg.setAttribute('height', height);

    const image = new Image(width, height);
    image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg.outerHTML);
    return { leftSideBearing, baseline, image };
}

export default {
    make: makeSvgTable,
    parse: parseSvgTable,
    decodeDocument: decodeSvgDocument,
    imageLoader: svgImageLoader,
};
