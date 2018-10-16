import assert from 'assert';
import Tokenizer, { Token } from '../src/tokenizer';
import { isWhiteSpace, isArabicChar } from '../src/char';

describe('tokenizer.js', function() {
    describe('tokenize', function() {
        let tokenizer;
        beforeEach(function() {
            tokenizer = new Tokenizer();
        });
        it('should map some text to a list of tokens', function() {
            let tokens = tokenizer.tokenize('AB');
            assert.equal(tokens[0].char, 'A');
            assert.equal(tokens[1].char, 'B');
        });
        describe('tokenizer events', function () {
            it('should dispatch events start, next, newToken and end', function() {
                let start = false;
                let end = false;
                let chars = '';
                let tokens = [];
                const tokenizerEvents = new Tokenizer({
                    start: () => { start = true; },
                    next: contextParams => chars += contextParams.current,
                    end: () => { end = true; },
                    newToken: token => tokens.push(token)
                });
                tokenizerEvents.tokenize('AB');
                assert.equal(start, true);
                assert.equal(end, true);
                assert.equal(chars, 'AB');
                assert.equal(tokens[0] instanceof Token, true);
            });
        });
        describe('StateModifier', function() {
            it('should register and apply a state modifier to a token or more', function () {
                const isChar = token => {
                    const char = token.char;
                    return !!char && char.length === 1 && /[\w\s]/.test(char);
                };
                const charToCodePoint = token => token.char.codePointAt(0);
                tokenizer.registerModifier('charToCodePoint', isChar, charToCodePoint);
                let tokens = tokenizer.tokenize('Jello World');
                const J = tokens[0];
                assert.equal(J.state.charToCodePoint, 74);
            });
        });
        describe('registerContextChecker', function () {
            let tokenizerContextual;
            let text = 'Hello World';
            let wordStartIndexes = [];
            let wordEndOffsets = [];
            before(function () {
                const onContextStart = (contextName, startIndex) => {
                    if (contextName === 'word') wordStartIndexes.push(startIndex);
                };
                const onContextEnd = (contextName, range) => {
                    if (contextName === 'word') wordEndOffsets.push(range.endOffset);
                };
                tokenizerContextual = new Tokenizer({
                    contextStart: onContextStart,
                    contextEnd: onContextEnd
                });
                function wordStartCheck(contextParams) {
                    const char = contextParams.current;
                    const prevChar = contextParams.get(-1);
                    const check = (
                        (!isWhiteSpace(char) && isWhiteSpace(prevChar)) ||
                        !prevChar && !isWhiteSpace(char)
                    );
                    return check;
                }
                function wordEndCheck(contextParams) {
                    const nextChar = contextParams.get(1);
                    const check = (
                        isWhiteSpace(nextChar) || !nextChar
                    );
                    return check;
                }
                function spaceStartCheck(contextParams) {
                    return isWhiteSpace(contextParams.current);
                }
                function spaceEndCheck(contextParams) {
                    return !isWhiteSpace(contextParams.get(1));
                }
                tokenizerContextual.registerContextChecker('word', wordStartCheck, wordEndCheck);
                tokenizerContextual.registerContextChecker('whitespace', spaceStartCheck, spaceEndCheck);
                tokenizerContextual.tokenize(text);
            });
            it('should dispatch contextual event contextStart and contextEnd', function() {
                assert.deepEqual(wordStartIndexes, [0, 6]);
                assert.deepEqual(wordEndOffsets, [5, 5]);
            });
            it('should retrieve found ranges of a registered context (word)', function () {
                const whitespaceRanges = tokenizerContextual.getContextRanges('whitespace');
                let whiteSpacesCount = 0;
                whitespaceRanges.forEach((range) => {
                    whiteSpacesCount += tokenizerContextual.getRangeTokens(range).length;
                });
                let wordRanges = tokenizerContextual.getContextRanges('word');
                let words = wordRanges.map(range => {
                    const tokens = tokenizerContextual.getRangeTokens(range);
                    return tokens.map(token => token.char).join('');
                });
                assert.deepEqual(words, ['Hello', 'World']);
                assert.deepEqual(whiteSpacesCount, 1);
            });
        });
        describe('insert, delete, and replace a token or a range of tokens', function() {
            let tokens = [];
            beforeEach(function () {
                function AanStartCheck(contextParams) {
                    const char = contextParams.current;
                    const prevChar = contextParams.get(-1);
                    const a = (
                        char.toLowerCase() === 'a' &&
                        (prevChar === null || isWhiteSpace(prevChar))
                    );
                    return a;
                }
                function AanEndCheck(contextParams) {
                    const char = contextParams.current;
                    const nextChar = contextParams.get(1);
                    return (
                        (char.toLowerCase() === 'a' && isWhiteSpace(nextChar)) ||
                        (char === 'n' && isWhiteSpace(nextChar))
                    );
                }
                tokenizer.registerContextChecker(
                    'Aan',
                    AanStartCheck, AanEndCheck
                );
                function arabicWordStartCheck(contextParams) {
                    const char = contextParams.current;
                    const prevChar = contextParams.get(-1);
                    return (
                        (isArabicChar(char) && isWhiteSpace(prevChar)) ||
                        (isArabicChar(char) && prevChar === null)
                    );
                }
                function arabicWordEndCheck(contextParams) {
                    const char = contextParams.current;
                    const nextChar = contextParams.get(1);
                    return (
                        (isArabicChar(char) && isWhiteSpace(nextChar)) ||
                        (isArabicChar(char) && nextChar === null)
                    );
                }
                tokenizer.registerContextChecker(
                    'arabicWord',
                    arabicWordStartCheck, arabicWordEndCheck
                );
                tokens = tokenizer.tokenize('B a voice not an echo');
            });
            function getAan() {
                const AanRanges = tokenizer.getContextRanges('Aan');
                const AanTokens = AanRanges.map(range => tokenizer.getRangeTokens(range));
                return AanTokens.map(tokens => tokens.map(token => token.char).join(''));
            }
            it('should insert a token or more at a specified index', function () {
                tokenizer.insertToken([new Token('e')], 1);
                const quote = tokenizer.tokens.map(t=>t.char).join('');
                assert.equal(quote, 'Be a voice not an echo');
                assert.deepEqual(getAan(), ['a', 'an'],
                'make sure to update contexts ranges after insert, delete, and replace!'
                );
            });
            it('should delete a token at a specific index', function () {
                tokenizer.removeToken(0); // [0:B] a voice not an echo
                tokenizer.removeToken(0); // [0: ]a voice not an echo
                const quote = tokenizer.tokens.map(t=>t.char).join('');
                assert.equal(quote, 'a voice not an echo');
                assert.deepEqual(getAan(), ['a', 'an'],
                'make sure to update contexts ranges after insert, delete, and replace!'
                );
            });
            it('should remove a range of tokens', function() {
                tokenizer.removeRange(9); // ' not an echo'
                const quote = tokenizer.tokens.map(t=>t.char).join('');
                assert.equal(quote, 'B a voice');
                assert.deepEqual(getAan(), ['a'],
                'make sure to update contexts ranges after insert, delete, and replace!'
                );
            });
            it('should replace a token with another token', function() {
                tokenizer.replaceToken(0, new Token('ß')); // B
                const quote = tokenizer.tokens.map(t=>t.char).join('');
                assert.equal(quote, 'ß a voice not an echo');
                assert.deepEqual(getAan(), ['a', 'an'],
                'make sure to update contexts ranges after insert, delete, and replace!'
                );
            });
            it('should replace a range of tokens with tokens list', function () {
                let rangesBefore = tokenizer.getContextRanges('Aan');
                rangesBefore.forEach(range => {
                    let startIndex = range.startIndex;
                    let endOffset = range.endOffset;
                    let newTokens = tokenizer.getRangeTokens(range).map(()=>new Token('…'));
                    tokenizer.replaceRange(startIndex, endOffset, newTokens); // null => end
                });
                const quote = tokenizer.tokens.map(t=>t.char).join('');
                assert.equal(quote, 'B … voice not …… echo');
                assert.deepEqual(getAan(), [],
                'make sure to update contexts ranges after insert, delete, and replace!'
                );
            });
            it('should compose a set of operations', function() {
                // input: 'B a voice not an echo'
                tokenizer.composeRUD([
                    ['insertToken', Array.from(`Don't `).map(c => new Token(c)), 0], // 'Don't B a voice not an echo'
                    ['replaceToken', 6, new Token('b')], // 'Don't b a voice not an echo'
                    ['insertToken', [new Token('e')], 7], // 'Don't be a voice not an echo'
                    ['replaceRange', 11, null, Array.from('follower be a student!').map(c => new Token(c))], // 'Don't be a follower be a student!'
                    ['removeToken', 32]
                ]);
                const quote = tokenizer.tokens.map(t=>t.char).join('');
                assert.equal(quote, `Don't be a follower be a student`);
                assert.deepEqual(getAan(), ['a', 'a'],
                'make sure to update contexts ranges after insert, delete, and replace!'
                );
            });
        });
    });
});
