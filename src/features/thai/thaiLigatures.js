/**
 * Apply Thai Ligatures feature to tokens
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
  * Apply Thai required glyphs composition substitutions
  * @param {ContextRange} range a range of tokens
  */
function thaiLigatures(range) {
    const script = 'thai';
    let tokens = this.tokenizer.getRangeTokens(range);
    let contextParams = getContextParams(tokens, 0);
    for(let index = 0; index < contextParams.context.length; index++) {
        contextParams.setCurrentIndex(index);
        let substitutions = this.query.lookupFeature({
            tag: 'liga', script, contextParams
        });
        if (substitutions.length) {
            for(let i = 0; i < substitutions.length; i++) {
                const action = substitutions[i];
                applySubstitution(action, tokens, index);
            }
            contextParams = getContextParams(tokens, index);
        }
    }
}

export default thaiLigatures;
