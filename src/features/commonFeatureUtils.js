import { ContextParams } from '../tokenizer.js';
import applySubstitution from './applySubstitution.js';

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
 * Apply feature substitutions to a context range
 * @param {string} script a script tag
 * @param {string} feature 4-letter feature code
 * @param {ContextRange} range a range of tokens
 */
function applyFeatureToRange(script, feature, range) {
    let tokens = this.tokenizer.getRangeTokens(range);
    let contextParams = getContextParams(tokens);
    for (let index = 0; index < contextParams.context.length; index++) {
        contextParams.setCurrentIndex(index);
        let substitutions = this.query.lookupFeature({
            tag: feature, script, contextParams
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

export { getContextParams, applyFeatureToRange };
