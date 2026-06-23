import assert from 'assert';
import applySubstitution from '../src/features/applySubstitution.mjs';
import { SubstitutionAction } from '../src/features/featureQuery.mjs';
import { Token } from '../src/tokenizer.mjs';

describe('applySubstitution.mjs', function() {
    it('should apply chaining substitutions for ids 61, 62, and 52', function() {
        const tokens = [new Token('a'), new Token('b'), new Token('c')];
        const substitutions = [200, [201], []];
        const tag = 'test';
        const actionIds = [61, 62, 52];

        for (let i = 0; i < actionIds.length; i++) {
            const action = new SubstitutionAction({
                id: actionIds[i],
                tag,
                substitution: substitutions
            });

            applySubstitution(action, tokens, 0);

            assert.equal(tokens[0].getState(tag), 200);
            assert.equal(tokens[1].getState(tag), 201);
            assert.equal(tokens[2].getState('deleted'), true);
        }
    });
});
