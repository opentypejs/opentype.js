function isBrowser() {
    return typeof window !== 'undefined';
}

function isNode() {
    return typeof window === 'undefined';
}

function checkArgument(expression, message) {
    if (!expression) {
        throw message;
    }
}

export { isBrowser, isNode, checkArgument };
