import { SubstitutionAction } from './featureQuery.js';
import { Token } from '../tokenizer.js';

/**
 * Apply single substitution format 1
 * @param {Array} substitutions substitutions
 * @param {any} tokens a list of tokens
 * @param {number} index token index
 */
function singleSubstitutionFormat1(action, tokens, index) {
    tokens[index].setState(action.tag, action.substitution);
}

/**
 * Apply single substitution format 2
 * @param {Array} substitutions substitutions
 * @param {any} tokens a list of tokens
 * @param {number} index token index
 */
function singleSubstitutionFormat2(action, tokens, index) {
    tokens[index].setState(action.tag, action.substitution);
}

/**
 * Apply chaining context substitution format 3
 * @param {Array} substitutions substitutions
 * @param {any} tokens a list of tokens
 * @param {number} index token index
 */
function chainingSubstitutionFormat3(action, tokens, index) {
    for(let i = 0; i < action.substitution.length; i++) {
        const subst = action.substitution[i];
        const token = tokens[index + i];
        token.setState(action.tag, subst);
    }
}

/**
 * Apply ligature substitution format 1
 * @param {Array} substitutions substitutions
 * @param {any} tokens a list of tokens
 * @param {number} index token index
 */
function ligatureSubstitutionFormat1(action, tokens, index) {
    let token = tokens[index];
    token.setState(action.tag, action.substitution.ligGlyph);
    const compsCount = action.substitution.components.length;
    for (let i = 0; i < compsCount; i++) {
        token = tokens[index + i + 1];
        token.setState('deleted', true);
    }
}

/**
 * Apply multiple substitution format 1
 * @param {Array} substitutions substitutions
 * @param {any} tokens a list of tokens
 * @param {number} index token index
 */
function multiSubstitutionFormat1(action, tokens, index) {
    if (this.font && this.tokenizer) {
        const newTokensList = [];
        const substitution = action.substitution;
        for (let i = 0; i < substitution.length; i++) {
            const substitutionGlyphIndex = substitution[i];
            const glyph = this.font.glyphs.get(substitutionGlyphIndex);
            const token = new Token(String.fromCharCode(parseInt(glyph.unicode)));
            token.setState('glyphIndex', substitutionGlyphIndex);
            newTokensList.push(token);
        }

        // Replace single range (glyph) index with multiple glyphs
        if (newTokensList.length) {
            this.tokenizer.replaceRange(index, 1, newTokensList);
        }
    }
}

/**
 * Supported substitutions
 */
const SUBSTITUTIONS = {
    11: singleSubstitutionFormat1,
    12: singleSubstitutionFormat2,
    63: chainingSubstitutionFormat3,
    41: ligatureSubstitutionFormat1, 
    21: multiSubstitutionFormat1
};

/**
 * Apply substitutions to a list of tokens
 * @param {Array} substitutions substitutions
 * @param {any} tokens a list of tokens
 * @param {number} index token index
 */
function applySubstitution(action, tokens, index) {
    if (action instanceof SubstitutionAction && SUBSTITUTIONS[action.id]) {
        SUBSTITUTIONS[action.id].call(this, action, tokens, index);
    }
}

export default applySubstitution;
