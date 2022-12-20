/**
 * Apply kerning positioning advance glyphs advance
 */

function kern(lookupTable, glyphs) {
    const coords = [];
    for (let i = 0; i < glyphs.length; i += 1) {
        const glyph = glyphs[i];
        coords[i] = { xAdvance: 0, yAdvance: 0 };
        if (i > 0) {
            coords[i] = {
                xAdvance: this.position.getKerningValue([lookupTable], glyphs[i - 1].index, glyph.index),
                yAdvance: 0
            };
        }
    }
    return coords;
}

export { kern };
