import assert from 'assert';
import { loadSync } from '../src/opentype.js';
import svg from '../src/tables/svg.js';

/** @typedef {import('../src/tables/svg.js').SVGTable} SVGTable */

describe('tables/svg.js', () => {
    /**
     * https://www.fontspace.com/colortube-font-f28146
     * @type {SVGTable}
     */
    const svgTable = loadSync('./test/fonts/Colortube-lWAd.otf').tables.svg;
    const glyphIds = Array.from(svgTable.keys()).sort();

    /**
     * @param {SVGTable} svgTable 
     * @param {number} recordIndex 
     */
    async function checkDocument(svgTable, glyphId) {
        const svgDocBytes = svgTable.get(glyphId);
        const svgDocText = await svg.decodeDocument(svgDocBytes);
        assert(svgDocText.startsWith('<svg '));
        for (const docEntry of svgTable) {
            if (docEntry[1] === svgDocBytes) {
                assert(svgDocText.includes(' id="glyph' + docEntry[0].toString() + '"'));
            }
        }
        assert(svgDocText.endsWith('</svg>'));
    }

    it('can parse SVG table', async () => {
        await checkDocument(svgTable, glyphIds[0]);
        await checkDocument(svgTable, glyphIds[glyphIds.length - 1]);
    });

    it('can make SVG table', () => {
        const bytes = new Uint8Array(svg.make(svgTable).encode());
        const data = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        assert.deepStrictEqual(svg.parse(data, 0), svgTable);
    });

    it('can decode compressed SVG document', async () => {
        const glyphId = glyphIds[0];
        const docStream = new Response(svgTable.get(glyphId)).body;
        const gzipStream = docStream.pipeThrough(new CompressionStream('gzip'));
        const gzipBuffer = await new Response(gzipStream).arrayBuffer();

        const svgTableCopy = new Map(svgTable);
        svgTableCopy.set(glyphId, new Uint8Array(gzipBuffer));
        await checkDocument(svgTableCopy, glyphId);
    });
});
