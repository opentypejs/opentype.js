import assert from 'assert';
import { parse } from '../src/opentype.js';
import { readFileSync } from 'fs';
import { performance } from 'perf_hooks';
const loadSync = (url, opt) => parse(readFileSync(url), opt);

describe('performance tests', function() {
    const notoSansSC = loadSync('./test/fonts/notosanssc-bold.ttf');
    
    it('should not take too long to use toArrayBuffer() on large fonts', function() {
        const start = performance.now();
        const time = performance.now() - start;
        notoSansSC.toArrayBuffer();
        assert(time < 16000, true);
    }).timeout(16000);
});

