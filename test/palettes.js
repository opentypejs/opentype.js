import assert  from 'assert';
import { parse } from '../src/opentype.js';
import { PaletteManager } from '../src/palettes.js';
import { enableMockCanvas } from './testutil.js';
import { readFileSync } from 'fs';
const loadSync = (url, opt) => parse(readFileSync(url), opt);

describe('palettes.js', function() {
    const emojiFont = loadSync('./test/fonts/OpenMojiCOLRv0-subset.otf');
    const palettes = emojiFont.palettes.getAll();
    const palettesBGRA = emojiFont.palettes.getAll('bgra');
    
    it('returns all palettes', function() {
        assert.equal(Array.isArray(palettes), true);
        assert.equal(palettes.length, 1);
        assert.equal(palettes[0].length, 35);
        assert.deepEqual(palettes[0], [
            '#00000040', '#00000066', '#00000099', '#000000ff', '#186648ff', '#1e50a0ff', '#352318ff', '#3f3f3f80', '#3f3f3fff', '#5c9e31ff',
            '#61b2e4ff', '#6a462fff', '#781e32ff', '#8967aaff', '#92d3f5ff', '#9b9b9aff', '#9b9b9aff', '#a57939ff', '#b1cc33ff', '#b399c8ff',
            '#c19a65ff', '#d0cfce80', '#d0cfceff', '#d22f27ff', '#debb90ff', '#e27022ff', '#e67a94ff', '#ea5a47ff', '#f1b31c66', '#f1b31cff',
            '#f4aa41ff', '#fadcbcff', '#fcea2bff', '#ffa7c0ff', '#ffffffff'
        ]);
        assert.deepEqual(palettesBGRA[0][0], {r: 0, g:0, b: 0, a: 0.25098039215686274});
    });

    // color parsing and conversion is tested in tables/cpal.js
    it('converts color to integer', function() {
        assert.equal(emojiFont.palettes.toCPALcolor('#12345678'), 0x56341278);
    });

    it('adds palettes', function() {
        emojiFont.palettes.add();
        let newPalettes = emojiFont.palettes.getAll();
        assert.equal(newPalettes.length, 2);
        const firstPalette = emojiFont.palettes.get(0, 'raw');
        const secondPalette = emojiFont.palettes.get(1, 'raw');
        assert.equal(firstPalette.length, 35);
        assert.equal(secondPalette.length, 35);
        assert.equal(secondPalette[0], emojiFont.palettes.defaultValue);
        assert.deepEqual(emojiFont.tables.cpal.colorRecordIndices, [0,35]);

        emojiFont.palettes.add(['#ffaa00', '#99cc0048']);
        newPalettes = emojiFont.palettes.getAll();
        assert.equal(newPalettes.length, 3);
        assert.equal(emojiFont.palettes.getColor(0, 2, 'raw'), 0x00aaffff);
        assert.equal(emojiFont.palettes.getColor(1, 2, 'hexa'), '#99cc0048');
        assert.equal(emojiFont.palettes.getColor(3, 2, 'raw'), emojiFont.palettes.defaultValue);
        assert.deepEqual(emojiFont.tables.cpal.colorRecordIndices, [0,35,70]);
    });
    
    it('deletes palettes', function() {
        const paletteCount = emojiFont.palettes.getAll().length;
        emojiFont.palettes.delete(2);
        assert.equal(emojiFont.palettes.getAll().length, paletteCount - 1);
        assert.deepEqual(emojiFont.tables.cpal.colorRecordIndices, [0,35]);
    });

    it('extends palettes', function() {
        emojiFont.palettes.extend(2);
        const firstPalette = emojiFont.palettes.get(0);
        const secondPalette = emojiFont.palettes.get(1);
        assert.equal(firstPalette.length, 37);
        assert.equal(secondPalette.length, 37);
        const lastColor = emojiFont.palettes.toCPALcolor(firstPalette[firstPalette.length-1]);
        const secondLastColor = emojiFont.palettes.toCPALcolor(firstPalette[firstPalette.length-1]);
        assert.equal(lastColor, emojiFont.palettes.defaultValue);
        assert.equal(secondLastColor, emojiFont.palettes.defaultValue);
        assert.deepEqual(emojiFont.tables.cpal.colorRecordIndices, [0,37]);
    });

    it('sets a color', function() {
        emojiFont.palettes.setColor(9, '#987654');
        emojiFont.palettes.setColor(7, '#87654321', 1);
        assert.equal(emojiFont.palettes.getColor(9, 0, 'hexa'), '#987654ff');
        assert.equal(emojiFont.palettes.getColor(7, 1, 'hexa'), '#87654321');
    });
    
    it('sets multiple colors at index and extends if necessary', function() {
        enableMockCanvas();
        assert(emojiFont.tables.cpal.numPaletteEntries, 37);
        emojiFont.palettes.setColor(2, ['red','orange','yellow']);
        assert(emojiFont.tables.cpal.numPaletteEntries, 37);
        const expectedSecondPalette = Array(37).fill('#000000ff');
        expectedSecondPalette[7] = '#87654321';
        const expectedPaletteColors = [
            [
                '#00000040', '#00000066', '#ff0000ff', '#ffa500ff', '#ffff00ff', '#1e50a0ff', '#352318ff', '#3f3f3f80', '#3f3f3fff', '#987654ff',
                '#61b2e4ff', '#6a462fff', '#781e32ff', '#8967aaff', '#92d3f5ff', '#9b9b9aff', '#9b9b9aff', '#a57939ff', '#b1cc33ff', '#b399c8ff',
                '#c19a65ff', '#d0cfce80', '#d0cfceff', '#d22f27ff', '#debb90ff', '#e27022ff', '#e67a94ff', '#ea5a47ff', '#f1b31c66', '#f1b31cff',
                '#f4aa41ff', '#fadcbcff', '#fcea2bff', '#ffa7c0ff', '#ffffffff', '#000000ff', '#000000ff'

            ],
            expectedSecondPalette
        ];
        assert.deepEqual(emojiFont.palettes.getAll(), expectedPaletteColors);
        emojiFont.palettes.setColor(36, ['blue','green','purple', 'indigo'], 1);
        assert.equal(emojiFont.tables.cpal.numPaletteEntries, 40);
        assert.deepEqual(emojiFont.tables.cpal.colorRecordIndices, [0, 40]);
        expectedPaletteColors[0] = expectedPaletteColors[0].concat(Array(3).fill('#000000ff'));
        expectedPaletteColors[1] = expectedPaletteColors[1].slice(0,-1).concat('#0000ffff','#008000ff', '#800080ff', '#4b0082ff');
        assert.deepEqual(emojiFont.palettes.getAll(), expectedPaletteColors);
    });
    
    it('deletes a color and sets the replacement value correctly', function() {
        const glyph = emojiFont.glyphs.get(48);
        let layers = glyph.getLayers(emojiFont);
        assert.equal(layers[0].paletteIndex, 22);
        emojiFont.palettes.deleteColor(22, 27);
        assert.equal(emojiFont.tables.cpal.numPaletteEntries, 39);
        layers = glyph.getLayers(emojiFont);
        assert.equal(layers[0].paletteIndex, 26);
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