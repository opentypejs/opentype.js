/**
 * Apply Arabic presentation forms to a range of tokens
 */

import { ContextParams } from '../../tokenizer';
import { isIsolatedArabicChar, isTashkeelArabicChar } from '../../char';
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
    const features = this.features.arab;
    const rangeTokens = this.tokenizer.getRangeTokens(range);
    if (rangeTokens.length === 1) return;
    const getSubstitutionIndex = substitution => (
        substitution.length === 1 &&
        substitution[0].id === 12 &&
        substitution[0].substitution
    );
    const applyForm = (tag, token, params) => {
        if (!features.hasOwnProperty(tag)) return;
        let substitution = features[tag].lookup(params) || null;
        let substIndex = getSubstitutionIndex(substitution)[0];
        if (substIndex >= 0) {
            return token.setState(tag, substIndex);
        }
    };
    const tokensParams = new ContextParams(rangeTokens, 0);
    const charContextParams = new ContextParams(rangeTokens.map(t=>t.char), 0);
    rangeTokens.forEach((token, i) => {
        if (isTashkeelArabicChar(token.char)) return;
        tokensParams.setCurrentIndex(i);
        charContextParams.setCurrentIndex(i);
        let CONNECT = 0; // 2 bits 00 (10: can connect next) (01: can connect prev)
        if (willConnectPrev(charContextParams)) CONNECT |= 1;
        if (willConnectNext(charContextParams)) CONNECT |= 2;
        switch (CONNECT) {
            case 0: // isolated * original form
                return;
            case 1: // fina
                applyForm('fina', token, tokensParams);
                break;
            case 2: // init
                applyForm('init', token, tokensParams);
                break;
            case 3: // medi
                applyForm('medi', token, tokensParams);
                break;
        }
    });
}

export default arabicPresentationForms;
export { arabicPresentationForms };
