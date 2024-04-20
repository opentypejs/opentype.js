import assert from 'assert';
import svg from '../../src/tables/svg.mjs';
import { readFileSync } from 'fs';
import { parse } from '../../src/opentype.mjs';
import { decodeSvgDocument } from '../../src/svgimages.mjs';
const loadSync = (url, opt) => parse(readFileSync(url), opt);

/** @typedef {import('../src/tables/svg.mjs').SVGTable} SVGTable */

describe('tables/svg.mjs', function () {
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
