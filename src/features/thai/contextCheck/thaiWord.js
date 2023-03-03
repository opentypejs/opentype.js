import { isThaiChar } from '../../../char.js';

/**
 * Thai word context checkers
 */
function thaiWordStartCheck(contextParams) {
    const char = contextParams.current;
    const prevChar = contextParams.get(-1);
    return (
        // ? thai first char
        (prevChar === null && isThaiChar(char)) ||
        // ? thai char preceded with a non thai char
        (!isThaiChar(prevChar) && isThaiChar(char))
    );
}

function thaiWordEndCheck(contextParams) {
    const nextChar = contextParams.get(1);
    return (
        // ? last thai char
        (nextChar === null) ||
        // ? next char is not thai
        (!isThaiChar(nextChar))
    );
}

export default {
    startCheck: thaiWordStartCheck,
    endCheck: thaiWordEndCheck
};
