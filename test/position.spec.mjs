import assert from 'assert';
import { readFileSync } from 'fs';
import { parse } from '../src/opentype.mjs';

function loadFont(path) {
    return parse(readFileSync(path).buffer);
}


describe('Position.getMarkToBaseTables / getMarkToBaseOffset (Jomhuria)', function () {
    let font;
    before(function () {
        font = loadFont('test/fonts/Jomhuria-Regular.ttf');
    });

    it('finds mark-to-base lookup tables under the arab script', function () {
        const tables = font.position.getMarkToBaseTables('arab');
        assert.ok(tables.length > 0, 'expected at least one mark-to-base lookup table');
    });

    it('returns undefined for a mark/base pair with no defined positioning', function () {
        // Glyph 0 (.notdef) will not be in any mark or base coverage
        const offset = font.position.getMarkToBaseOffset(0, 1, 500, 'arab');
        assert.strictEqual(offset, undefined);
    });

    it('returns a finite xOffset and yOffset for a known mark/base pair', function () {
        // uni0615 (mark, glyph 417) over uni25CC dotted circle (base, glyph 842, advanceWidth 1392)
        const offset = font.position.getMarkToBaseOffset(417, 842, 1392, 'arab');
        assert.ok(offset, 'expected a positioning offset');
        assert.ok(Number.isFinite(offset.xOffset), 'xOffset should be a finite number');
        assert.ok(Number.isFinite(offset.yOffset), 'yOffset should be a finite number');
        assert.strictEqual(offset.xOffset, -1046);
        assert.strictEqual(offset.yOffset, -1356);
    });

    it('returns different offsets for different marks over the same base', function () {
        // uni0615 and uni0617 are distinct marks — their anchors differ
        const base = 842, adv = 1392;
        const offset1 = font.position.getMarkToBaseOffset(417, base, adv, 'arab'); // uni0615
        const offset2 = font.position.getMarkToBaseOffset(419, base, adv, 'arab'); // uni0617
        assert.ok(offset1 && offset2, 'both marks should have positioning data');
        assert.ok(
            offset1.xOffset !== offset2.xOffset || offset1.yOffset !== offset2.yOffset,
            'different marks should produce different offsets'
        );
    });
});
