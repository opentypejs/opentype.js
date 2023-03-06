/**
 * Apply Arabic presentation forms to a range of tokens
 */

import { ContextParams } from '../../tokenizer.js';
import { isIsolatedArabicChar, isTashkeelArabicChar } from '../../char.js';
import { SubstitutionAction } from '../featureQuery.js';
import applySubstitution from '../applySubstitution.js';

/**
 * Check if a char can be connected to it's preceding char
 * @param {ContextParams} charContextParams context params of a char
 */
function willConnectPrev(charContextParams) {
    let backtrack = [].concat(charContextParams.backtrack);
    for (let i = backtrack.length - 1; i >= 0; i--) {
        const prevChar = backtrack[i];
        const isolated = isIsolatedArabicChar(prevChar);
        const tashkeel = isTashkeelArabicChar(prevChar);
        if (!isolated && !tashkeel) return true;
        if (isolated) return false;
    }
    return false;
}

/**
 * Check if a char can be connected to it's proceeding char
 * @param {ContextParams} charContextParams context params of a char
 */
function willConnectNext(charContextParams) {
    if (isIsolatedArabicChar(charContextParams.current)) return false;
    for (let i = 0; i < charContextParams.lookahead.length; i++) {
        const nextChar = charContextParams.lookahead[i];
        const tashkeel = isTashkeelArabicChar(nextChar);
        if (!tashkeel) return true;
    }
    return false;
}

/**
 * Apply arabic presentation forms to a list of tokens
 * @param {ContextRange} range a range of tokens
 */
function arabicPresentationForms(range) {
    const script = 'arab';
    const tags = this.featuresTags[script];
    const tokens = this.tokenizer.getRangeTokens(range);
    if (tokens.length === 1) return;
    let contextParams = new ContextParams(
        tokens.map(token => token.getState('glyphIndex')
        ), 0);
    const charContextParams = new ContextParams(
        tokens.map(token => token.char
        ), 0);
    for(let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        if (isTashkeelArabicChar(token.char)) continue;
        contextParams.setCurrentIndex(i);
        charContextParams.setCurrentIndex(i);
        let CONNECT = 0; // 2 bits 00 (10: can connect next) (01: can connect prev)
        if (willConnectPrev(charContextParams)) CONNECT |= 1;
        if (willConnectNext(charContextParams)) CONNECT |= 2;
        let tag;
        switch (CONNECT) {
            case 1: (tag = 'fina'); break;
            case 2: (tag = 'init'); break;
            case 3: (tag = 'medi'); break;
        }
        if (tags.indexOf(tag) === -1) continue;
        let substitutions = this.query.lookupFeature({
            tag, script, contextParams
        });
        if (substitutions instanceof Error) {
            console.info(substitutions.message);
            continue;
        }
        for(let j = 0; j < substitutions.length; j++) {
            const action = substitutions[j];
            if (action instanceof SubstitutionAction) {
                applySubstitution(action, tokens, j);
                contextParams.context[j] = action.substitution;
            }
        }
    }
}

export default arabicPresentationForms;
export { arabicPresentationForms };
