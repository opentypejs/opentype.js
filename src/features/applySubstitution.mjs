import { SubstitutionAction } from './featureQuery.mjs';

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
 * Apply multiple substitution format 1 (one glyph → sequence of glyphs).
 * The full sequence is stored on the token; getTextGlyphs expands it into
 * separate glyph indices, and latinContextualAlternates uses only the first
 * element for context matching in subsequent lookups.
 */
function multipleSubstitutionFormat1(action, tokens, index) {
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
        if (Array.isArray(subst)) {
            if (subst.length){
                // Store the full multi-glyph sequence on the token so all
                // fragment glyphs reach the output stream via getTextGlyphs.
                token.setState(action.tag, subst);
            } else {
                token.setState('deleted', true);
            }
            continue;
        }
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
 * Supported substitutions
 */
const SUBSTITUTIONS = {
    11: singleSubstitutionFormat1,
    12: singleSubstitutionFormat2,
    21: multipleSubstitutionFormat1,
    61: chainingSubstitutionFormat3,
    62: chainingSubstitutionFormat3,
    63: chainingSubstitutionFormat3,
    41: ligatureSubstitutionFormat1,
    51: chainingSubstitutionFormat3,
    52: chainingSubstitutionFormat3,
    53: chainingSubstitutionFormat3
};

/**
 * Apply substitutions to a list of tokens
 * @param {Array} substitutions substitutions
 * @param {any} tokens a list of tokens
 * @param {number} index token index
 */
function applySubstitution(action, tokens, index) {
    if (action instanceof SubstitutionAction && SUBSTITUTIONS[action.id]) {
        SUBSTITUTIONS[action.id](action, tokens, index);
    }
}

export default applySubstitution;
