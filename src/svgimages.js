import { isGzip, unGzip } from './util.js';

/**
 * @typedef {object} SVGDocCacheEntry
 * @prop {Promise<SVGTemplate>} template
 * @prop {Map<number, SVGImageCacheEntry>} images
 */

/**
 * @typedef {string | [string, string, string, string, string, string, string]} SVGTemplate
 */

/**
 * @typedef {object} SVGImageCacheEntry
 * @prop {Promise<SVGImage>} promise
 * @prop {SVGImage | undefined} image
 */

/**
 * @typedef {Object} SVGImage
 * @prop {number} leftSideBearing
 * @prop {number} baseline
 * @prop {HTMLImageElement} image
 */

export class SVGImageManager {
    /**
     * @param {opentype.Font} font
     */
    constructor(font) {
        /** @type {opentype.Font} */
        this.font = font;
        /** @type {WeakMap<Uint8Array, SVGDocCacheEntry>} */
        this.cache = new WeakMap();
    }

    /**
     * @param {number} glyphIndex
     * @returns {SvgImage | undefined}
     */
    get(glyphIndex) {
        const svgImageCacheEntry = this.getOrCreateSvgImageCacheEntry(glyphIndex);
        return svgImageCacheEntry && svgImageCacheEntry.image;
    }

    /**
     * @param {number} glyphIndex
     * @returns {Promise<SvgImage> | undefined}
     */
    getAsync(glyphIndex) {
        const svgImageCacheEntry = this.getOrCreateSvgImageCacheEntry(glyphIndex);
        return svgImageCacheEntry && svgImageCacheEntry.promise;
    }

    /**
     * @param {number} glyphIndex
     * @returns {SVGImageCacheEntry | undefined}
     */
    getOrCreateSvgImageCacheEntry(glyphIndex) {
        const svg = this.font.tables.svg;
        if (svg === undefined) return;

        const svgBuf = svg.get(glyphIndex);
        if (svgBuf === undefined) return;

        let svgDocCacheEntry = this.cache.get(svgBuf);
        if (svgDocCacheEntry === undefined) {
            svgDocCacheEntry = createSvgDocCacheEntry(svgBuf);
            this.cache.set(svgBuf, svgDocCacheEntry);
        }

        let svgImageCacheEntry = svgDocCacheEntry.images.get(glyphIndex);
        if (svgImageCacheEntry === undefined) {
            svgImageCacheEntry = createSvgImageCacheEntry(this.font, svgDocCacheEntry.template, glyphIndex);
            svgImageCacheEntry.promise.then((svgImage) => {
                svgImageCacheEntry.image = svgImage;
                if (typeof this.font.onGlyphUpdated === 'function') {
                    try {
                        this.font.onGlyphUpdated(glyphIndex);
                    } catch (error) {
                        console.error('font.onGlyphUpdated', glyphIndex, error);
                    }
                }
            });
            svgDocCacheEntry.images.set(glyphIndex, svgImageCacheEntry);
        }
        return svgImageCacheEntry;
    }
}

/**
 * @param {Uint8Array} svgBuf
 * @returns {SVGDocCacheEntry}
 */
function createSvgDocCacheEntry(svgBuf) {
    return {
        template: decodeSvgDocument(svgBuf).then(makeSvgTemplate),
        images: new Map(),
    };
}

/**
 * @param {opentype.Font} font
 * @param {Promise<SVGTemplate>} svgTemplatePromise
 * @param {number} glyphIndex
 * @returns {SVGImageCacheEntry}
 */
function createSvgImageCacheEntry(font, svgTemplatePromise, glyphIndex) {
    return {
        promise: svgTemplatePromise.then((svgTemplate) => {
            let svgText;
            if (typeof svgTemplate === 'string') {
                svgText = svgTemplate;
            } else {
                svgTemplate[4] = glyphIndex;
                svgText = svgTemplate.join('');
            }
            const svgImage = makeSvgImage(svgText, font.unitsPerEm);
            return svgImage.image.decode().then(() => svgImage);
        }),
        image: undefined,
    };
}

/**
* @param {Uint8Array} buf
* @returns {Promise<string>}
*/
export const decodeSvgDocument = globalThis.DecompressionStream
    ? decodeSvgDocumentWithDecompressionStream
    : decodeSvgDocumentWithTinyInflate;

/**
 * @param {Uint8Array} buf
 * @returns {Promise<string>}
 */
function decodeSvgDocumentWithTinyInflate(buf) {
    try {
        return Promise.resolve(new TextDecoder().decode(isGzip(buf) ? unGzip(buf) : buf));
    } catch (error) {
        return Promise.reject(error);
    }
}

/**
* @param {Uint8Array} buf
* @returns {Promise<string>}
*/
function decodeSvgDocumentWithDecompressionStream(buf) {
    if (isGzip(buf)) {
        return new Response(new Response(buf).body.pipeThrough(new DecompressionStream('gzip'))).text();
    }
    try {
        return Promise.resolve(new TextDecoder().decode(buf));
    } catch (error) {
        return Promise.reject(error);
    }
}

/**
 * https://learn.microsoft.com/en-us/typography/opentype/spec/svg#glyph-identifiers
 * @param {string} text
 * @returns {SVGTemplate}
 */
export function makeSvgTemplate(text) {
    const documentStart =  text.indexOf('<svg');
    const contentStart = text.indexOf('>', documentStart + 4) + 1;

    if (/ id=['"]glyph\d+['"]/.test(text.substring(documentStart, contentStart))) {
        return text;
    }

    const contentEnd = text.lastIndexOf('</svg>');
    return [
        text.substring(0, contentStart),
        '<defs>',
        text.substring(contentStart, contentEnd),
        '</defs><use href="#glyph', '', '"/>',
        text.substring(contentEnd),
    ];
}

/**
* @param {string} text
* @param {number} unitsPerEm
* @returns {SVGImage}
*/
export function makeSvgImage(text, unitsPerEm) {
    const svgDocument = new DOMParser().parseFromString(text, 'image/svg+xml');
    /** @type {SVGSVGElement} */
    const svg = svgDocument.documentElement;
    const viewBoxVal = svg.viewBox.baseVal;
    const widthVal = svg.width.baseVal;
    const heightVal = svg.height.baseVal;
    let xScale = 1;
    let yScale = 1;
    if (viewBoxVal.width > 0 && viewBoxVal.height > 0) {
        if (widthVal.unitType === 1) {
            xScale = widthVal.valueInSpecifiedUnits / viewBoxVal.width;
            yScale = heightVal.unitType === 1 ? heightVal.valueInSpecifiedUnits / viewBoxVal.height : xScale;
        } else if (heightVal.unitType === 1) {
            yScale = heightVal.valueInSpecifiedUnits / viewBoxVal.height;
            xScale = yScale;
        } else if (unitsPerEm) {
            xScale = unitsPerEm / viewBoxVal.width;
            yScale = unitsPerEm / viewBoxVal.height;
        }
    }

    const div = document.createElement('div');
    div.style.position = 'fixed';
    div.style.visibility = 'hidden';
    div.appendChild(svg);
    document.body.appendChild(div);
    const bbox = svg.getBBox();
    document.body.removeChild(div);

    const leftSideBearing = (bbox.x - viewBoxVal.x) * xScale;
    const baseline = (viewBoxVal.y - bbox.y) * yScale;
    const width = bbox.width * xScale;
    const height = bbox.height * yScale;

    svg.setAttribute('viewBox', [bbox.x, bbox.y, bbox.width, bbox.height].join(' '));
    if (xScale !== 1) svg.setAttribute('width', width);
    if (yScale !== 1) svg.setAttribute('height', height);

    const image = new Image(width, height);
    image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg.outerHTML);
    return { leftSideBearing, baseline, image };
}
