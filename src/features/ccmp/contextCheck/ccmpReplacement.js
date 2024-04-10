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
