import assert from 'assert';
import { hex, unhex } from './testutil';
import { decode, encode, sizeOf } from '../src/types';

describe('types.js', function() {
    it('can handle BYTE', function() {
        assert.equal(hex(encode.BYTE(0xFE)), 'FE');
        assert.equal(sizeOf.BYTE(0xFE), 1);
    });

    it('can handle CHAR', function() {
        assert.equal(hex(encode.CHAR('@')), '40');
        assert.equal(sizeOf.CHAR('@'), 1);
    });

    it('can handle CHARARRAY', function() {
        assert.equal(hex(encode.CHARARRAY('A/B')), '41 2F 42');
        assert.equal(sizeOf.CHARARRAY('A/B'), 3);
    });

    it('can handle USHORT', function() {
        assert.equal(hex(encode.USHORT(0xCAFE)), 'CA FE');
        assert.equal(sizeOf.USHORT(0xCAFE), 2);
    });

    it('can handle SHORT', function() {
        assert.equal(hex(encode.USHORT(-345)), 'FE A7');
        assert.equal(sizeOf.SHORT(-345), 2);
    });

    it('can handle UINT24', function() {
        assert.equal(hex(encode.UINT24(0xABCDEF)), 'AB CD EF');
        assert.equal(sizeOf.UINT24(0xABCDEF), 3);
    });

    it('can handle ULONG', function() {
        assert.equal(hex(encode.ULONG(0xDEADBEEF)), 'DE AD BE EF');
        assert.equal(sizeOf.ULONG(0xDEADBEEF), 4);
    });

    it('can handle LONG', function() {
        assert.equal(hex(encode.LONG(-123456789)), 'F8 A4 32 EB');
        assert.equal(sizeOf.LONG(-123456789), 4);
    });

    it('can handle FIXED', function() {
        assert.equal(hex(encode.FIXED(0xBEEFCAFE)), 'BE EF CA FE');
        assert.equal(sizeOf.FIXED(0xBEEFCAFE), 4);
    });

    it('can handle FWORD', function() {
        assert.equal(hex(encode.FWORD(-8193)), 'DF FF');
        assert.equal(sizeOf.FWORD(-8193), 2);
    });

    it('can handle UFWORD', function() {
        assert.equal(hex(encode.UFWORD(0xDEED)), 'DE ED');
        assert.equal(sizeOf.UFWORD(0xDEED), 2);
    });

    // FIXME: Test LONGDATETIME when it gets implemented.

    it('can handle TAG', function() {
        assert.equal(hex(encode.TAG('Font')), '46 6F 6E 74');
        assert.equal(sizeOf.TAG('Font'), 4);
    });

    it('can handle Card8', function() {
        assert.equal(hex(encode.Card8(0xFE)), 'FE');
        assert.equal(sizeOf.Card8(0xFE), 1);
    });

    it('can handle Card16', function() {
        assert.equal(hex(encode.Card16(0xCAFE)), 'CA FE');
        assert.equal(sizeOf.Card16(0xCAFE), 2);
    });

    it('can handle OffSize', function() {
        assert.equal(hex(encode.OffSize(0xFE)), 'FE');
        assert.equal(sizeOf.OffSize(0xFE), 1);
    });

    it('can handle SID', function() {
        assert.equal(hex(encode.SID(0xCAFE)), 'CA FE');
        assert.equal(sizeOf.SID(0xCAFE), 2);
    });

    it('can handle NUMBER', function() {
        assert.equal(hex(encode.NUMBER(-32769)), '1D FF FF 7F FF');
        assert.equal(hex(encode.NUMBER(-32768)), '1C 80 00');
        assert.equal(hex(encode.NUMBER(-32767)), '1C 80 01');
        assert.equal(hex(encode.NUMBER(-1133)), '1C FB 93');
        assert.equal(hex(encode.NUMBER(-1132)), '1C FB 94');
        assert.equal(hex(encode.NUMBER(-1131)), 'FE FF');
        assert.equal(hex(encode.NUMBER(-109)), 'FB 01');
        assert.equal(hex(encode.NUMBER(-108)), 'FB 00');
        assert.equal(hex(encode.NUMBER(-107)), '20');
        assert.equal(hex(encode.NUMBER(-106)), '21');
        assert.equal(hex(encode.NUMBER(0)), '8B');
        assert.equal(hex(encode.NUMBER(107)), 'F6');
        assert.equal(hex(encode.NUMBER(108)), 'F7 00');
        assert.equal(hex(encode.NUMBER(109)), 'F7 01');
        assert.equal(hex(encode.NUMBER(1131)), 'FA FF');
        assert.equal(hex(encode.NUMBER(1132)), '1C 04 6C');
        assert.equal(hex(encode.NUMBER(1133)), '1C 04 6D');
        assert.equal(hex(encode.NUMBER(32767)), '1C 7F FF');
        assert.equal(hex(encode.NUMBER(32768)), '1D 00 00 80 00');
        assert.equal(hex(encode.NUMBER(32769)), '1D 00 00 80 01');

        assert.equal(sizeOf.NUMBER(-32769), 5);
        assert.equal(sizeOf.NUMBER(-32768), 3);
        assert.equal(sizeOf.NUMBER(-32767), 3);
        assert.equal(sizeOf.NUMBER(-1133), 3);
        assert.equal(sizeOf.NUMBER(-1132), 3);
        assert.equal(sizeOf.NUMBER(-1131), 2);
        assert.equal(sizeOf.NUMBER(-109), 2);
        assert.equal(sizeOf.NUMBER(-108), 2);
        assert.equal(sizeOf.NUMBER(-107), 1);
        assert.equal(sizeOf.NUMBER(-106), 1);
        assert.equal(sizeOf.NUMBER(0), 1);
        assert.equal(sizeOf.NUMBER(107), 1);
        assert.equal(sizeOf.NUMBER(108), 2);
        assert.equal(sizeOf.NUMBER(109), 2);
        assert.equal(sizeOf.NUMBER(1131), 2);
        assert.equal(sizeOf.NUMBER(1132), 3);
        assert.equal(sizeOf.NUMBER(1133), 3);
        assert.equal(sizeOf.NUMBER(32767), 3);
        assert.equal(sizeOf.NUMBER(32768), 5);
        assert.equal(sizeOf.NUMBER(32769), 5);
    });

    it('can handle NUMBER16', function() {
        assert.equal(hex(encode.NUMBER16(-32768)), '1C 80 00');
        assert.equal(hex(encode.NUMBER16(-1133)), '1C FB 93');
        assert.equal(hex(encode.NUMBER16(-108)), '1C FF 94');
        assert.equal(hex(encode.NUMBER16(0)), '1C 00 00');
        assert.equal(hex(encode.NUMBER16(108)), '1C 00 6C');
        assert.equal(hex(encode.NUMBER16(1133)), '1C 04 6D');
        assert.equal(hex(encode.NUMBER16(32767)), '1C 7F FF');

        assert.equal(sizeOf.NUMBER16(-32768), 3);
        assert.equal(sizeOf.NUMBER16(-1133), 3);
        assert.equal(sizeOf.NUMBER16(-108), 3);
        assert.equal(sizeOf.NUMBER16(0), 3);
        assert.equal(sizeOf.NUMBER16(108), 3);
        assert.equal(sizeOf.NUMBER16(1133), 3);
        assert.equal(sizeOf.NUMBER16(32767), 3);
    });

    it('can handle NUMBER32', function() {
        assert.equal(hex(encode.NUMBER32(-1)), '1D FF FF FF FF');
        assert.equal(hex(encode.NUMBER32(0)), '1D 00 00 00 00');
        assert.equal(hex(encode.NUMBER32(0xDEADBEEF)), '1D DE AD BE EF');

        assert.equal(sizeOf.NUMBER32(-1), 5);
        assert.equal(sizeOf.NUMBER32(0), 5);
        assert.equal(sizeOf.NUMBER32(0xDEADBEEF), 5);
    });

    it('can handle REAL', function() {
        // FIXME: It would be good if somebody who actually understands
        // how REAL.encode() works could write tests for edge cases.
        assert.equal(hex(encode.REAL(0.0)), '1E 0F');
        assert.equal(sizeOf.REAL(0.0), 2);

        assert.equal(hex(encode.REAL(0.1)), '1E 0A 1F');
        assert.equal(sizeOf.REAL(0.1), 3);

        assert.equal(hex(encode.REAL(99.999)), '1E 99 A9 99 FF');
        assert.equal(sizeOf.REAL(99.999), 5);

        assert.equal(hex(encode.REAL(-123456.78)), '1E E1 23 45 6A 78 FF');
        assert.equal(sizeOf.REAL(-123456.78), 7);
    });

    it('can handle NAME', function() {
        assert.equal(hex(encode.NAME('hello')), '68 65 6C 6C 6F');
        assert.equal(sizeOf.NAME('hello'), 5);
    });

    it('can handle STRING', function() {
        assert.equal(hex(encode.STRING('hello')), '68 65 6C 6C 6F');
        assert.equal(sizeOf.STRING('hello'), 5);
    });

    it('can handle UTF16', function() {
        assert.equal(decode.UTF16(unhex('DE AD 5B 57 4F 53'), 2, 4), '字体');
        assert.equal(hex(encode.UTF16('字体')), '5B 57 4F 53');
        assert.equal(sizeOf.UTF16('字体'), 4);

        // In JavaScript, characters outside the Basic Multilingual Plane
        // are represented with surrogate pairs. For example, U+1F404 COW
        // is stored as the surrogate pair U+D83D U+DC04. This is also
        // exactly what we need for representing U+1F404 in UTF-16.
        assert.equal(decode.UTF16(unhex('DE AD D8 3D DC 04'), 2, 4), '\uD83D\uDC04');
        assert.equal(hex(encode.UTF16('\uD83D\uDC04')), 'D8 3D DC 04');
        assert.equal(sizeOf.UTF16('\uD83D\uDC04'), 4);
    });

    it('can handle MACSTRING in Central European encoding', function() {
        const encoding = 'x-mac-ce';
        const data = '42 65 74 F5 74 92 70 75 73';

        assert.equal(
            decode.MACSTRING(unhex('DE AD BE EF ' + data), 4, 9, encoding),
            'Betűtípus');

        assert.equal(hex(encode.MACSTRING('Betűtípus', encoding)), data);  // not in cache
        assert.equal(hex(encode.MACSTRING('Betűtípus', encoding)), data);  // likely cached
        assert.equal(encode.MACSTRING('Betűtípus 字体', encoding), undefined);  // not encodable

        assert.equal(sizeOf.MACSTRING('Betűtípus', encoding), 9);
        assert.equal(sizeOf.MACSTRING('Betűtípus 字体', encoding), 0);
    });

    it('can handle MACSTRING in Croatian encoding', function() {
        const encoding = 'x-mac-croatian';
        const data = 'A9 74 61 6D 70 61 E8';

        assert.equal(
            decode.MACSTRING(unhex('DE AD BE EF ' + data), 4, 7, encoding),
            'Štampač');

        assert.equal(hex(encode.MACSTRING('Štampač', encoding)), data);  // not in cache
        assert.equal(hex(encode.MACSTRING('Štampač', encoding)), data);  // likely cached
        assert.equal(encode.MACSTRING('Štampač 字体', encoding), undefined);  // not encodable

        assert.equal(sizeOf.MACSTRING('Štampač', encoding), 7);
        assert.equal(sizeOf.MACSTRING('Štampač 字体', encoding), 0);
    });

    it('can handle MACSTRING in Cyrillic encoding', function() {
        const encoding = 'x-mac-cyrillic';
        const data = '98 F0 E8 F4 F2 20 46 6F 6F';

        assert.equal(
            decode.MACSTRING(unhex('DE AD BE EF ' + data), 4, 9, encoding),
            'Шрифт Foo');

        assert.equal(hex(encode.MACSTRING('Шрифт Foo', encoding)), data);  // not in cache
        assert.equal(hex(encode.MACSTRING('Шрифт Foo', encoding)), data);  // likely cached
        assert.equal(encode.MACSTRING('Шрифт 字体', encoding), undefined);  // not encodable

        assert.equal(sizeOf.MACSTRING('Шрифт Foo', encoding), 9);
        assert.equal(sizeOf.MACSTRING('Шрифт 字体', encoding), 0);
    });

    it('can handle MACSTRING in Gaelic encoding', function() {
        const encoding = 'x-mac-gaelic';
        const data = '44 9C 69 E0 B6 92';

        assert.equal(
            decode.MACSTRING(unhex('DE AD BE EF ' + data), 4, 6, encoding),
            'Dúiṫċí');

        assert.equal(hex(encode.MACSTRING('Dúiṫċí', encoding)), data);  // not in cache
        assert.equal(hex(encode.MACSTRING('Dúiṫċí', encoding)), data);  // likely cached
        assert.equal(encode.MACSTRING('Dúiṫċí 字体', encoding), undefined);

        assert.equal(sizeOf.MACSTRING('Dúiṫċí Foo', encoding), 10);
        assert.equal(sizeOf.MACSTRING('Dúiṫċí 字体', encoding), 0);
    });

    it('can handle MACSTRING in Greek encoding', function() {
        const encoding = 'x-mac-greek';
        const data = 'A1 F2 E1 ED ED E1 F4 EF F3 E5 E9 F2 C0 20 2E 85 2E';

        assert.equal(
            decode.MACSTRING(unhex('DE AD BE EF ' + data), 4, 17, encoding),
            'Γραμματοσειρά .Ö.');

        assert.equal(hex(encode.MACSTRING('Γραμματοσειρά .Ö.', encoding)), data);  // not in cache
        assert.equal(hex(encode.MACSTRING('Γραμματοσειρά .Ö.', encoding)), data);  // likely cached
        assert.equal(encode.MACSTRING('Γραμματοσειρά 字体', encoding), undefined);  // not encodable

        assert.equal(sizeOf.MACSTRING('Γραμματοσειρά .Ö.', encoding), 17);
        assert.equal(sizeOf.MACSTRING('Γραμματοσειρά 字体', encoding), 0);
    });

    it('can handle MACSTRING in Icelandic encoding', function() {
        const encoding = 'x-mac-icelandic';
        const data = 'DE 97 72 69 73 64 97 74 74 69 72 20 DF 97 20 61 DD 8E 67';

        assert.equal(
            decode.MACSTRING(unhex('DE AD BE EF ' + data), 4, 19, encoding),
            'Þórisdóttir þó aðég');

        assert.equal(hex(encode.MACSTRING('Þórisdóttir þó aðég', encoding)), data);  // not in cache
        assert.equal(hex(encode.MACSTRING('Þórisdóttir þó aðég', encoding)), data);  // likely cached
        assert.equal(encode.MACSTRING('Þórisdóttir 字体', encoding), undefined);  // not encodable

        assert.equal(sizeOf.MACSTRING('Þórisdóttir þó aðég', encoding), 19);
        assert.equal(sizeOf.MACSTRING('Þórisdóttir 字体', encoding), 0);
    });

    it('can handle MACSTRING in Inuit encoding', function() {
        const encoding = 'x-mac-inuit';
        const data = '8A 80 8C 8B AB DA CC C6 93';

        assert.equal(
            decode.MACSTRING(unhex('DE AD BE EF ' + data), 4, 9, encoding),
            'ᐸᐃᑉᐹᒨᕆᔾᔪᑦ');

        assert.equal(hex(encode.MACSTRING('ᐸᐃᑉᐹᒨᕆᔾᔪᑦ', encoding)), data);  // not in cache
        assert.equal(hex(encode.MACSTRING('ᐸᐃᑉᐹᒨᕆᔾᔪᑦ', encoding)), data);  // likely cached
        assert.equal(encode.MACSTRING('ᐸᐃᑉᐹᒨᕆᔾᔪᑦ 字体', encoding), undefined);

        assert.equal(sizeOf.MACSTRING('ᐸᐃᑉᐹᒨᕆᔾᔪᑦ Foo', encoding), 13);
        assert.equal(sizeOf.MACSTRING('ᐸᐃᑉᐹᒨᕆᔾᔪᑦ 字体', encoding), 0);
    });

    it('can handle MACSTRING in Roman encoding', function() {
        const encoding = 'macintosh';
        const data = '86 65 74 6C 69 62 8A 72 67';

        assert.equal(
            decode.MACSTRING(unhex('DE AD BE EF ' + data), 4, 9, encoding),
            'Üetlibärg');

        assert.equal(hex(encode.MACSTRING('Üetlibärg', encoding)), data);  // not in cache
        assert.equal(hex(encode.MACSTRING('Üetlibärg', encoding)), data);  // likely cached
        assert.equal(encode.MACSTRING('Üetlibärg 字体', encoding), undefined);  // not encodable

        assert.equal(sizeOf.MACSTRING('Üetlibärg', encoding), 9);
        assert.equal(sizeOf.MACSTRING('Üetlibärg 字体', encoding), 0);
    });

    it('can handle MACSTRING in Romanian encoding', function() {
        const encoding = 'x-mac-romanian';
        const data = '54 69 70 BE 72 69 72 65';

        assert.equal(
            decode.MACSTRING(unhex('DE AD BE EF ' + data), 4, 8, encoding),
            'Tipărire');

        assert.equal(hex(encode.MACSTRING('Tipărire', encoding)), data);  // not in cache
        assert.equal(hex(encode.MACSTRING('Tipărire', encoding)), data);  // likely cached
        assert.equal(encode.MACSTRING('Tipărire 字体', encoding), undefined);  // not encodable

        assert.equal(sizeOf.MACSTRING('Tipărire', encoding), 8);
        assert.equal(sizeOf.MACSTRING('Tipărire 字体', encoding), 0);
    });

    it('can handle MACSTRING in Turkish encoding', function() {
        const encoding = 'x-mac-turkish';
        const data = '42 61 73 DD 6C 6D DD DF';

        assert.equal(
            decode.MACSTRING(unhex('DE AD BE EF ' + data), 4, 8, encoding),
            'Basılmış');

        assert.equal(hex(encode.MACSTRING('Basılmış', encoding)), data);  // not in cache
        assert.equal(hex(encode.MACSTRING('Basılmış', encoding)), data);  // likely cached
        assert.equal(encode.MACSTRING('Basılmış 字体', encoding), undefined);  // not encodable

        assert.equal(sizeOf.MACSTRING('Basılmış', encoding), 8);
        assert.equal(sizeOf.MACSTRING('Basılmış 字体', encoding), 0);
    });

    it('rejects MACSTRING in unsupported encodings', function() {
        const encoding = 'KOI8-R';
        assert.equal(decode.MACSTRING(unhex('41 42'), 0, 1, encoding), undefined);
        assert.equal(encode.MACSTRING('AB', encoding), undefined);
        assert.equal(sizeOf.MACSTRING('AB', encoding), 0);
    });

    it('can handle INDEX', function() {
        assert.equal(hex(encode.INDEX([])), '00 00');
        assert.equal(sizeOf.INDEX([]), 2);

        const foo = {name: 'foo', type: 'STRING', value: 'hello'};
        const bar = {name: 'bar', type: 'NUMBER', value: 23};
        assert.equal(hex(encode.INDEX([foo, bar])),
                     '00 02 01 01 06 07 68 65 6C 6C 6F A2');
        assert.equal(sizeOf.INDEX([foo, bar]), 12);
    });

    it('can handle DICT', function() {
        assert.equal(hex(encode.DICT({})), '');
        assert.equal(sizeOf.DICT({}), 0);

        const foo = {name: 'foo', type: 'number', value: -1131};
        const bar = {name: 'bar', type: 'number', value: 1131};
        assert.equal(hex(encode.DICT({7: foo, 42: bar})), 'FE FF 07 FA FF 2A');
        assert.equal(sizeOf.DICT({7: foo, 42: bar}), 6);
    });

    it('can handle OPERATOR', function() {
        // FIXME: Somebody who knows CFF should double-check this.
        // Are there edge cases we should test here?
        assert.deepEqual(encode.OPERATOR(1199), [1199]);
        assert.deepEqual(encode.OPERATOR(1200), [12, 0]);
        assert.deepEqual(encode.OPERATOR(2399), [12, 1199]);
    });

    it('can handle OPERAND', function() {
        // FIXME: Somebody who knows CFF should double-check this.
        // Is it really the case that a SID operand becomes a single byte,
        // even though encode.SID would return '00 A2' here?
        assert.equal(hex(encode.OPERAND(23, 'SID')), 'A2');
        assert.equal(hex(encode.OPERAND(23, 'offset')), '1D 00 00 00 17');
        assert.equal(hex(encode.OPERAND(23, 'number')), 'A2');
        assert.equal(hex(encode.OPERAND(23.0, 'real')), '1E 23 FF');
    });

    it('can handle OP', function() {
        assert.equal(hex(encode.OP(0x42)), '42');
        assert.equal(sizeOf.OP(0x42), 1);
    });

    it('can handle CHARSTRING', function() {
        assert.equal(hex(encode.CHARSTRING([])), '');
        assert.equal(sizeOf.CHARSTRING([]), 0);

        // FIXME: Somebody who knows CFF should double-check this;
        // the result seems a little short.
        const ops = [
            {name: 'width', type: 'NUMBER', value: 42},
            {name: 'dx', type: 'NUMBER', value: 17},
            {name: 'dy', type: 'NUMBER', value: -23},
            {name: 'rlineto', type: 'OP', value: 5}
        ];

        // Because encode.CHARSTRING uses a cache, we call it twice
        // for testing both the uncached and the (likely) cached case.
        assert.equal(hex(encode.CHARSTRING(ops)), 'B5 9C 74 05');
        assert.equal(hex(encode.CHARSTRING(ops)), 'B5 9C 74 05');
        assert.equal(sizeOf.CHARSTRING(ops), 4);
    });

    it('can handle OBJECT', function() {
        const obj = {type: 'TAG', value: 'Font'};
        assert.equal(hex(encode.OBJECT(obj)), '46 6F 6E 74');
        assert.equal(sizeOf.OBJECT(obj), 4);
    });

    it('can handle TABLE', function() {
        const table = {
            fields: [
                {name: 'version', type: 'FIXED', value: 0x01234567},
                {name: 'flags', type: 'USHORT', value: 0xBEEF}
            ]
        };
        assert.equal(hex(encode.TABLE(table)), '01 23 45 67 BE EF');
        assert.equal(sizeOf.TABLE(table), 6);
    });

    it('can handle subTABLEs', function() {
        const table = {
            fields: [
                {name: 'version', type: 'FIXED', value: 0x01234567},
                {
                    name: 'subtable', type: 'TABLE', value: {
                        fields: [
                            {name: 'flags', type: 'USHORT', value: 0xBEEF}
                        ]
                    }
                }
            ]
        };
        assert.equal(hex(encode.TABLE(table)), '01 23 45 67 00 06 BE EF');
        assert.equal(sizeOf.TABLE(table), 8);
    });

    it('can handle deeply nested TABLEs', function() {
        // First 58 bytes of Roboto-Black.ttf GSUB table.
        const expected = '00 01 00 00 00 0A 00 20 00 3A ' +                                           // header
            '00 01 44 46 4C 54 00 08 00 04 00 00 00 00 FF FF 00 02 00 00 00 01 ' +                  // script list
            '00 02 6C 69 67 61 00 0E 73 6D 63 70 00 14 00 00 00 01 00 01 00 00 00 01 00 00';        // feature list

        const table = {
            fields: [
                {name: 'version', type: 'FIXED', value: 0x00010000},
                {name: 'scriptList', type: 'TABLE'},
                {name: 'featureList', type: 'TABLE'},
                {name: 'lookupList', type: 'TABLE'}
            ],
            scriptList: {
                fields: [
                    {name: 'scriptCount', type: 'USHORT', value: 1},
                    {name: 'scriptTag_0', type: 'TAG', value: 'DFLT'},
                    {
                        name: 'script_0', type: 'TABLE', value: {
                            fields: [
                            {
                                name: 'defaultLangSys', type: 'TABLE', value: {
                                    fields: [
                                        {name: 'lookupOrder', type: 'USHORT', value: 0},
                                        {name: 'reqFeatureIndex', type: 'USHORT', value: 0xffff},
                                        {name: 'featureCount', type: 'USHORT', value: 2},
                                        {name: 'featureIndex_0', type: 'USHORT', value: 0},
                                        {name: 'featureIndex_1', type: 'USHORT', value: 1}
                                    ]
                                }
                            },
                            {name: 'langSysCount', type: 'USHORT', value: 0}
                            ]
                        }
                    }
                ]
            },
            featureList: {
                fields: [
                    {name: 'featureCount', type: 'USHORT', value: 2},
                    {name: 'featureTag_0', type: 'TAG', value: 'liga'},
                    {
                        name: 'feature_0', type: 'TABLE', value: {
                            fields: [
                                {name: 'featureParams', type: 'USHORT', value: 0},
                                {name: 'lookupCount', type: 'USHORT', value: 1},
                                {name: 'lookupListIndex', type: 'USHORT', value: 1}
                            ]
                        }
                    },
                    {name: 'featureTag_1', type: 'TAG', value: 'smcp'},
                    {
                        name: 'feature_1', type: 'TABLE', value: {
                            fields: [
                                {name: 'featureParams', type: 'USHORT', value: 0},
                                {name: 'lookupCount', type: 'USHORT', value: 1},
                                {name: 'lookupListIndex', type: 'USHORT', value: 0}
                            ]
                        }
                    }
                ]
            },
            lookupList: {fields: []}
        };

        assert.equal(hex(encode.TABLE(table)), expected);
        assert.equal(sizeOf.TABLE(table), 58);
    });

    it('can handle RECORD', function() {
        const table = {
            fields: [
                {name: 'version', type: 'FIXED', value: 0x01234567},
                {name: 'record', type: 'RECORD'}
            ]
        };

        table.record = {
            fields: [
                {name: 'flags_0', type: 'USHORT', value: 0xDEAF},
                {name: 'flags_1', type: 'USHORT', value: 0xCAFE}
            ]
        };

        assert.equal(hex(encode.TABLE(table)), '01 23 45 67 DE AF CA FE');
        assert.equal(sizeOf.TABLE(table), 8);
    });

    it('can handle LITERAL', function() {
        assert.equal(hex(encode.LITERAL([])), '');
        assert.equal(sizeOf.LITERAL([]), 0);

        assert.equal(hex(encode.LITERAL([0xff, 0x23, 0xA7])), 'FF 23 A7');
        assert.equal(sizeOf.LITERAL([0xff, 0x23, 0xA7]), 3);
    });

    it('can encode VARDELTAS', function() {
        const e = function (deltas) {
            return hex(encode.VARDELTAS(deltas));
        };
        assert.equal(e([]), '');

        // zeroes
        assert.equal(e([0]), '80');
        assert.equal(e(new Array(64).fill(0)), 'BF');
        assert.equal(e(new Array(65).fill(0)), 'BF 80');
        assert.equal(e(new Array(100).fill(0)), 'BF A3');
        assert.equal(e(new Array(256).fill(0)), 'BF BF BF BF');

        // bytes
        assert.equal(e([1]), '00 01');
        assert.equal(e([1, 2, 3, 127, -128, -1, -2]), '06 01 02 03 7F 80 FF FE');
        assert.equal(e(new Array(64).fill(127)),
                     '3F ' + (new Array(64).fill('7F')).join(' '));
        assert.equal(e(new Array(65).fill(127)),
                     '3F ' + (new Array(64).fill('7F')).join(' ') + ' 00 7F');

        // words
        assert.equal(e([0x6666]), '40 66 66');
        assert.equal(e([0x6666, 32767, -1, -32768]), '43 66 66 7F FF FF FF 80 00');
        assert.equal(e(new Array(64).fill(0x1122)),
                     '7F ' + (new Array(64).fill('11 22')).join(' '));
        assert.equal(e(new Array(65).fill(0x1122)),
                     '7F ' + (new Array(64).fill('11 22')).join(' ') + ' 40 11 22');

        // bytes, zeroes
        assert.equal(e([1, 0]), '01 01 00');
        assert.equal(e([1, 0, 0]), '00 01 81');

        // bytes, zeroes, bytes:
        // a single zero is more compact when encoded within the bytes run
        assert.equal(e([127, 127, 0, 127, 127]), '04 7F 7F 00 7F 7F');
        // multiple zeroes are more compact when encoded into their own run
        assert.equal(e([127, 127, 0, 0, 127, 127]), '01 7F 7F 81 01 7F 7F');
        assert.equal(e([127, 127, 0, 0, 0, 127, 127]), '01 7F 7F 82 01 7F 7F');
        assert.equal(e([127, 127, 0, 0, 0, 0, 127, 127]), '01 7F 7F 83 01 7F 7F');

        // words, zeroes
        assert.equal(e([0x6789, 0]), '40 67 89 80');
        assert.equal(e([0x6666, 0, 0]), '40 66 66 81');

        // words, zeroes, bytes
        assert.equal(e([0x6666, 0, 1, 2, 3]), '40 66 66 80 02 01 02 03');
        assert.equal(e([0x6666, 0, 0, 1, 2, 3]), '40 66 66 81 02 01 02 03');
        assert.equal(e([0x6666, 0, 0, 0, 1, 2, 3]), '40 66 66 82 02 01 02 03');

        // words, zeroes, words
        assert.equal(e([0x6666, 0, 0x7777]), '40 66 66 80 40 77 77');
        assert.equal(e([0x6666, 0, 0, 0x7777]), '40 66 66 81 40 77 77');
        assert.equal(e([0x6666, 0, 0, 0, 0x7777]), '40 66 66 82 40 77 77');

        // words, bytes, words:
        // a single byte-encodable word is more compact when encoded within the words run
        assert.equal(e([0x6666, 2, 0x7777]), '42 66 66 00 02 77 77');
        // multiple byte-encodable words are more compacted when forming their own run
        assert.equal(e([0x6666, 2, 2, 0x7777]), '40 66 66 01 02 02 40 77 77');
    });
});
