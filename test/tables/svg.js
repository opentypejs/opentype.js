import assert from 'assert';
import { loadSync } from '../../src/opentype.js';
import svg from '../../src/tables/svg.js';
import { decodeSvgDocument } from '../../src/svgimages.js';

/** @typedef {import('../src/tables/svg.js').SVGTable} SVGTable */

describe('tables/svg.js', () => {
    /**
     * @type {Array<SVGTable>}
     */
    const svgTables = [
        './test/fonts/TestSVGgradientTransform.otf',
        './test/fonts/TestSVGgzip.otf',
        './test/fonts/TestSVGmultiGlyphs.otf',
    ].map((fontPath) => loadSync(fontPath).tables.svg);

    it('can parse SVG table', async () => {
        for (const svgTable of svgTables) {
            /** @type {Map<Uint8Array, Array<number>>} */
            const documentGlyphs = new Map();
            for (const [glyphId, svgDocBytes] of svgTable) {
                let glyphIds = documentGlyphs.get(svgDocBytes);
                if (glyphIds === undefined) {
                    glyphIds = [];
                    documentGlyphs.set(svgDocBytes, glyphIds);
                }
                glyphIds.push(glyphId);
            }
            for (const [svgDocBytes, glyphIds] of documentGlyphs) {
                const svgDocText = await decodeSvgDocument(svgDocBytes);
                assert(svgDocText.startsWith('<svg '));
                for (const glyphId of glyphIds) {
                    assert(svgDocText.includes(` id="glyph${glyphId.toString()}"`));
                }
                assert(svgDocText.endsWith('</svg>'));
            }
        }
    });

    it('can make SVG table', () => {
        for (const svgTable of svgTables) {
            const bytes = new Uint8Array(svg.make(svgTable).encode());
            const data = new DataView(bytes.buffer);
            assert.deepStrictEqual(svg.parse(data, bytes.byteOffset), svgTable);
        }
    });
});
