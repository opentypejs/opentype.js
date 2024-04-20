/**
 * Apply unicode variation sequences to a range of tokens
 */

/**
 * Apply unicode variation squences to a context range
 * @param {ContextRange} range a range of tokens
 * 
 * @TODO: We could incorporate the data from
 * https://www.unicode.org/Public/UCD/latest/ucd/StandardizedVariants.txt
 * https://www.unicode.org/Public/UCD/latest/ucd/emoji/emoji-variation-sequences.txt
 * https://www.unicode.org/ivd/data/2022-09-13/IVD_Sequences.txt
 * and ignore any sequences that are not standardized, but that would have to be
 * kept up-do-date and result in huge data overhead
 */
function unicodeVariationSequence(range) {
    const font = this.query.font;
    const tokens = this.tokenizer.getRangeTokens(range);
    // treat varSelector as if not there (this should have been the default even before supporting UVSes)
    // https://unicode.org/faq/vs.html#6
    tokens[1].setState('deleted', true);
    if(font.tables.cmap && font.tables.cmap.varSelectorList) {
        const baseCodePoint = tokens[0].char.codePointAt(0);
        const vsCodePoint = tokens[1].char.codePointAt(0);
        const selectorLookup = font.tables.cmap.varSelectorList[vsCodePoint];
        if (selectorLookup !== undefined) {
            if (selectorLookup.nonDefaultUVS) {
                const mappings = selectorLookup.nonDefaultUVS.uvsMappings;
                if(mappings[baseCodePoint]) {
                    const replacementGlyphId = mappings[baseCodePoint].glyphID;
                    if(font.glyphs.glyphs[replacementGlyphId] !== undefined) {
                        tokens[0].setState('glyphIndex', replacementGlyphId);
                    }
                }
            }
        }
    }
}

export default unicodeVariationSequence;
