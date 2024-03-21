/*
 * @Author: TonyJR show_3@163.com
 * @Date: 2024-03-19 16:01:40
 * @LastEditors: TonyJR show_3@163.com
 * @LastEditTime: 2024-03-19 19:30:41
 * @FilePath: /opentype.js/src/features/ccmp/contextCheck/ccmpReplacement.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */


function ccmpReplacementStartCheck(contextParams) {
    return contextParams.index === 0 && contextParams.context.length > 1;
}

function ccmpReplacementEndCheck(contextParams) {
    return contextParams.index === contextParams.context.length - 1;
}

export default {
    startCheck: ccmpReplacementStartCheck,
    endCheck: ccmpReplacementEndCheck
};