/**
 * Apply MarkToBase positioning advance glyphs advance
 */

function mark(lookupTable, glyphs) {
    const coords = [];
    for (let i = 0; i < glyphs.length; i += 1) {
        const glyph = glyphs[i];
        coords[i] = { xAdvance: 0, yAdvance: 0 };
        if (i > 0) {
            const coordinatedPair = this.position.getMarkToBaseAttachment([lookupTable], glyphs[i - 1].index, glyph.index);
            if (coordinatedPair) {
                const { attachmentMarkPoint, baseMarkPoint } = coordinatedPair;
                // Base mark's advanceWidth must be ignored to have a proper positiong for the attachment mark
                coords[i] = {
                    xAdvance: baseMarkPoint.xCoordinate - attachmentMarkPoint.xCoordinate - glyphs[i - 1].advanceWidth,
                    yAdvance: baseMarkPoint.yCoordinate - attachmentMarkPoint.yCoordinate
                };
            }
        }
    }
    return coords;
}

export { mark };
