/*
 * @Author: TonyJR show_3@163.com
 * @Date: 2024-03-19 16:19:59
 * @LastEditors: TonyJR show_3@163.com
 * @LastEditTime: 2024-03-21 19:31:38
 * @FilePath: /opentype.js/src/features/ccmp/ccmp.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
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
function ccmpReplacementLigatures(range) {
    const script = 'delf';
    const tag = 'ccmp';
    let tokens = this.tokenizer.getRangeTokens(range);
    let contextParams = getContextParams(tokens);
    for(let index = 0; index < contextParams.context.length; index++) {
        if (!this.query.getFeature({tag, script, contextParams})){
            continue;
        }
        contextParams.setCurrentIndex(index);
        let substitutions = this.query.lookupFeature({
            tag, script, contextParams
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

export default ccmpReplacementLigatures;



