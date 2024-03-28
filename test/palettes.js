import assert  from 'assert';
import { parse } from '../src/opentype.js';
import { PaletteManager } from '../src/palettes.js';
import { readFileSync } from 'fs';
const loadSync = (url, opt) => parse(readFileSync(url), opt);

describe('palettes.js', function() {
    const emojiFont = loadSync('./test/fonts/OpenMojiCOLRv0.ttf');
    const palettes = emojiFont.palettes.getAll();
    const palettesBGRA = emojiFont.palettes.getAll('bgra');
    
    it('returns all palettes', function() {
        assert.equal(Array.isArray(palettes), true);
        assert.equal(palettes.length, 1);
        assert.equal(palettes[0].length, 35);
        assert.deepEqual(palettes[0][7], '#3f3f3f80');
        assert.deepEqual(palettesBGRA[0][0], {r: 0, g:0, b: 0, a: 0.25098039215686274});
    });

    // color parsing and conversion is tested in tables/cpal.js
    it('converts color to integer', function() {
        assert.equal(emojiFont.palettes.toCPALcolor('#12345678'), 0x56341278);
    });

    it('extends palettes', function() {
        emojiFont.palettes.extend(2);
        const firstPalette = emojiFont.palettes.get(0);
        assert.equal(firstPalette.length, 37);
        const lastColor = emojiFont.palettes.toCPALcolor(firstPalette[firstPalette.length-1]);
        const secondLastColor = emojiFont.palettes.toCPALcolor(firstPalette[firstPalette.length-1]);
        assert.equal(lastColor, emojiFont.palettes.defaultValue);
        assert.equal(secondLastColor, emojiFont.palettes.defaultValue);
    });

    it('adds palettes', function() {
        emojiFont.palettes.add();
        let newPalettes = emojiFont.palettes.getAll();
        assert.equal(newPalettes.length, 2);
        const firstPalette = emojiFont.palettes.get(1, 'raw');
        assert.equal(firstPalette.length, 37);
        assert.equal(firstPalette[0], emojiFont.palettes.defaultValue);

        emojiFont.palettes.add(['#ffaa00', '#99cc0048']);
        newPalettes = emojiFont.palettes.getAll();
        assert.equal(newPalettes.length, 3);
        assert.equal(emojiFont.palettes.getColor(0, 2, 'raw'), 0x00aaffff);
        assert.equal(emojiFont.palettes.getColor(1, 2, 'hexa'), '#99cc0048');
        assert.equal(emojiFont.palettes.getColor(3, 2, 'raw'), emojiFont.palettes.defaultValue);
    });
    
    it('deletes palettes', function() {
        const paletteCount = emojiFont.palettes.getAll().length;
        emojiFont.palettes.delete(1);
        assert.equal(emojiFont.palettes.getAll().length, paletteCount - 1);
    });

    it('sets a color', function() {
        emojiFont.palettes.setColor(9, '#987654');
        emojiFont.palettes.setColor(7, '#87654321', 1);
        assert.equal(emojiFont.palettes.getColor(9, 0, 'hexa'), '#987654ff');
        assert.equal(emojiFont.palettes.getColor(7, 1, 'hexa'), '#87654321');
    });

    it('ensures that the CPAL table exists', function() {
        const mockFont = {tables:{}};
        const pm = new PaletteManager(mockFont);
        const colors = ['#ffaa00', '#99cc0048'];
        
        pm.add(colors);
        assert.deepEqual(mockFont.tables.cpal.colorRecords, colors.map(pm.toCPALcolor));
        assert.deepEqual(mockFont.tables.cpal.colorRecordIndices, [0]);

        delete mockFont.tables.cpal;
        pm.extend(48);
        assert.deepEqual(mockFont.tables.cpal.colorRecords, Array(48).fill(pm.defaultValue));
        assert.deepEqual(mockFont.tables.cpal.colorRecordIndices, [0]);
    });
});