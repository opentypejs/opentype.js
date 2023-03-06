/**
 * Apply Arabic required ligatures feature to a range of tokens
 */

import { ContextParams } from '../../tokenizer.js';
import applySubstitution from '../applySubstitution.js';

// @TODO: use commonFeatureUtils.js for reduction of code duplication
// once #564 has been merged.

/**
 * Update context params
 * @param {any} tokens a list of tokens
 * @param {number} index current item index
 */
function getContextParams(tokens, index) {
    const context = tokens.map(token => token.activeState.value);
    return new ContextParams(context, index || 0);
}

/**
 * Apply Arabic required ligatures to a context range
 * @param {ContextRange} range a range of tokens
 */
function arabicRequiredLigatures(range) {
    const script = 'arab';
    let tokens = this.tokenizer.getRangeTokens(range);
    let contextParams = getContextParams(tokens);
    for (let index = 0; index < contextParams.context.length; index++) {
        contextParams.setCurrentIndex(index);
        let substitutions = this.query.lookupFeature({
            tag: 'rlig', script, contextParams
        });
        if (substitutions.length) {
            for(let i = 0; i < substitutions.length; i++) {
                const action = substitutions[i];
                applySubstitution(action, tokens, index);
            }
            contextParams = getContextParams(tokens);
        }
    }
}

export default arabicRequiredLigatures;
export { arabicRequiredLigatures };
