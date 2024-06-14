import assert from 'assert';
import { parse } from '../../src/opentype.mjs';
import { readFileSync } from 'fs';
const loadSync = (url, opt) => parse(readFileSync(url), opt);

describe('tables/vhea.mjs', function() {
    const fonts = {
        notoSansJp: loadSync('./test/fonts/NotoSansJP-Medium.ttf'),
    };
    it('correctly parses the vertical header table', function() {
        // tests for all fonts
        const { notoSansJp } = fonts;
        assert.equal(notoSansJp.tables.vhea.version, 1.1);
        assert.equal(notoSansJp.tables.vhea.ascent, 500);
        assert.equal(notoSansJp.tables.vhea.vertTypoAscender, 500);
        assert.equal(notoSansJp.tables.vhea.descent, -500);
        assert.equal(notoSansJp.tables.vhea.vertTypoDescender, -500);
        assert.equal(notoSansJp.tables.vhea.lineGap, 0);
        assert.equal(notoSansJp.tables.vhea.vertTypoLineGap, 0);
        assert.equal(notoSansJp.tables.vhea.advanceHeightMax, 3000);
        assert.equal(notoSansJp.tables.vhea.minTopSideBearing, -224);
        assert.equal(notoSansJp.tables.vhea.minBottomSideBearing, -689);
        assert.equal(notoSansJp.tables.vhea.yMaxExtent, 2927);
        assert.equal(notoSansJp.tables.vhea.caretSlopeRise, 0);
        assert.equal(notoSansJp.tables.vhea.caretSlopeRun, 1);
        assert.equal(notoSansJp.tables.vhea.caretOffset, 0);
        assert.equal(notoSansJp.tables.vhea.metricDataFormat, 0);
        assert.equal(notoSansJp.tables.vhea.numOfLongVerMetrics, 17481);

        // Directly exposed equivalents to ascender, descender, numberOfHMetrics
        assert.equal(notoSansJp.vertTypoAscender, 500);
        assert.equal(notoSansJp.vertTypoDescender, -500);
        assert.equal(notoSansJp.numOfLongVerMetrics, 17481);
    });
});