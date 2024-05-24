/**
 * Unicode Variation Sequence context checkers
 */

function isVariationSequenceSelector(char) {
    if (char === null) return false;
    const charCode = char.codePointAt(0);
    return (
        // Mongolian Variation Selectors
        (charCode >= 0x180B && charCode <= 0x180D) ||
        // Generic Variation Selectors
        (charCode >= 0xFE00 && charCode <= 0xFE0F) ||
        // Ideographic Variation Sequences
        (charCode >= 0xE0100 && charCode <= 0xE01EF)
    );
}

function unicodeVariationSequenceStartCheck(contextParams) {
    const char = contextParams.current;
    const nextChar = contextParams.get(1);
    return (
        (nextChar === null && isVariationSequenceSelector(char)) ||
        (isVariationSequenceSelector(nextChar))
    );
}

function unicodeVariationSequenceEndCheck(contextParams) {
    const nextChar = contextParams.get(1);
    return (
        (nextChar === null) ||
        (!isVariationSequenceSelector(nextChar))
    );
}

export default {
    startCheck: unicodeVariationSequenceStartCheck,
    endCheck: unicodeVariationSequenceEndCheck
};
