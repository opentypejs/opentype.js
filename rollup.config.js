var buble = require('rollup-plugin-buble');
var resolve = require('rollup-plugin-node-resolve');
var commonjs = require('rollup-plugin-commonjs');
var license = require('rollup-plugin-license');

module.exports =  {
    entry: 'src/opentype.js',
    dest: 'dist/opentype.js',
    moduleName: 'opentype',
    format: 'umd',
    sourceMap: true,
    plugins: [
        resolve({
            jsnext: true,
            main: true,
            browser: true,
        }),
        commonjs(),
        buble(),
        license({
            banner: 'https://opentype.js.org v<%= pkg.version %> | (c) Frederik De Bleser and other contributors | MIT License | Uses tiny-inflate by Devon Govett'
        }),
    ]
};
