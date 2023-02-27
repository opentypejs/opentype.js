/**
 * Apply Arabic required ligatures feature to a range of tokens
 */

import { applyFeatureToRange } from '../commonFeatureUtils.js';

/**
 * Apply Arabic required ligatures to a context range
 * @param {ContextRange} range a range of tokens
 */
function arabicRequiredLigatures(range) {
    applyFeatureToRange.apply(this, ['arab', 'rlig', range]);
}

export default arabicRequiredLigatures;
export { arabicRequiredLigatures };
