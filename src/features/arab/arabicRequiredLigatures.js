/**
 * Apply Arabic required ligatures feature to a range of tokens
 */

import { ContextParams } from '../../tokenizer';

/**
 * Apply Arabic required ligatures to a context range
 * @param {ContextRange} range a range of tokens
 */
function arabicRequiredLigatures(range) {
    const features = this.features.arab;
    if (!features.hasOwnProperty('rlig')) return;
    let tokens = this.tokenizer.getRangeTokens(range);
    for (let i = 0; i < tokens.length; i++) {
        const lookupParams = new ContextParams(tokens, i);
        let substitution = features.rlig.lookup(lookupParams) || null;
        const chainingContext = (
            substitution.length === 1 &&
            substitution[0].id === 63 &&
            substitution[0].substitution
        );
        const ligature = (
            substitution.length === 1 &&
            substitution[0].id === 41 &&
            substitution[0].substitution[0]
        );
        const token = tokens[i];
        if (!!ligature) {
            token.setState('rlig', [ligature.ligGlyph]);
            for (let c = 0; c < ligature.components.length; c++) {
                const component = ligature.components[c];
                const lookaheadToken = lookupParams.get(c + 1);
                if (lookaheadToken.activeState.value === component) {
                    lookaheadToken.state.deleted = true;
                }
            }
        } else if (chainingContext) {
            const substIndex = (
                chainingContext &&
                chainingContext.length === 1 &&
                chainingContext[0].id === 12 &&
                chainingContext[0].substitution
            );
            if (!!substIndex && substIndex >= 0) token.setState('rlig', substIndex);
        }
    }
}

export default arabicRequiredLigatures;
export { arabicRequiredLigatures };
