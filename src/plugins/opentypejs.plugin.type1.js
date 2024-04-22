/**
 * OpenType.js plugin to support parsing of PostScript/PS1/T1/Adobe Type 1 font files
 * 
 * https://adobe-type-tools.github.io/font-tech-notes/pdfs/T1_SPEC.pdf
 * https://personal.math.ubc.ca/~cass/piscript/type1.pdf
 */
import { Type1Font } from './pdfjs/core/type1_font.js';
import { Stream } from './pdfjs/core/stream.js';

let isResponsible = new WeakMap();

const plugin_cff1file = {
    parseBuffer_signature: function(returnData, params) {
        const { font, data, signature, parse, tableEntries } = params;
        if(!(signature.substring(0,2) === '%!' || (parse.getByte(data, 0) === 0x80 && parse.getByte(data, 1) === 0x01))) return false;
        isResponsible.set(font, true);
        
        const length1 =  new TextDecoder('ascii').decode(data.buffer).indexOf(' eexec');
        console.log(length1);
        console.log(new Type1Font('temp', new Stream(data.buffer), {
            length1,
            length2: data.buffer.byteLength - length1
        }));

        return true;
    },
    parseBuffer_before_addGlyphNames: function(returnData, params) {
        if(!isResponsible.get(params.font)) return false;

        const { font } = params;
    }
};

export default plugin_cff1file;