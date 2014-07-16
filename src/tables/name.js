// The `name` naming table.
// https://www.microsoft.com/typography/OTSPEC/name.htm

'use strict';

var parse = require('../parse');

// NameIDs for the name table.
var nameTableNames = [
    'copyright',              // 0
    'fontFamily',             // 1
    'fontSubfamily',          // 2
    'uniqueID',               // 3
    'fullName',               // 4
    'version',                // 5
    'postScriptName',         // 6
    'trademark',              // 7
    'manufacturer',           // 8
    'designer',               // 9
    'description',            // 10
    'vendorURL',              // 11
    'designerURL',            // 12
    'licence',                // 13
    'licenceURL',             // 14
    'reserved',               // 15
    'preferredFamily',        // 16
    'preferredSubfamily',     // 17
    'compatibleFullName',     // 18
    'sampleText',             // 19
    'postScriptFindFontName', // 20
    'wwsFamily',              // 21
    'wwsSubfamily'            // 22
];

// Parse the naming `name` table
// Only Windows Unicode English names are supported.
// Format 1 additional fields are not supported
function parseNameTable(data, start) {
    var name = {},
        p = new parse.Parser(data, start);
    name.format = p.parseUShort();
    var count = p.parseUShort(),
        stringOffset = p.offset + p.parseUShort();
    var platformID, encodingID, languageID, nameID, property, byteLength,
        offset, str, i, j, codePoints;
    var unknownCount = 0;
    for(i = 0; i < count; i++) {
        platformID = p.parseUShort();
        encodingID = p.parseUShort();
        languageID = p.parseUShort();
        nameID = p.parseUShort();
        property = nameTableNames[nameID];
        byteLength = p.parseUShort();
        offset = p.parseUShort();
        // platformID - encodingID - languageID standard combinations :
        // 1 - 0 - 0 : Macintosh, Roman, English
        // 3 - 1 - 0x409 : Windows, Unicode BMP (UCS-2), en-US
        if (platformID === 3 && encodingID === 1 && languageID === 0x409) {
            codePoints = [];
            var length = byteLength/2;
            for(j = 0; j < length; j++, offset += 2) {
                codePoints[j] = parse.getShort(data, stringOffset+offset);
            }
            str = String.fromCharCode.apply(null, codePoints);
            if (property) {
                name[property] = str;
            }
            else {
                unknownCount++;
                name['unknown'+unknownCount] = str;
            }
        }

    }
    if (name.format === 1) {
        name.langTagCount = p.parseUShort();
    }
    return name;
}

exports.parse = parseNameTable;
