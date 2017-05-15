var buble = require('rollup-plugin-buble');
var resolve = require('rollup-plugin-node-resolve');
var commonjs = require('rollup-plugin-commonjs');
var uglify = require('rollup-plugin-uglify');
var license = require('rollup-plugin-license');

var minify = process.env.MINIFY !== undefined;

module.exports =  {
    entry: 'src/opentype.js',
    dest: minify ? 'dist/opentype.min.js' : 'dist/opentype.js',
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
        minify ? uglify() : {},
        license({
            banner: 'https://opentype.js.org v<%= pkg.version %> | (c) Frederik De Bleser and other contributors | MIT License | Uses tiny-inflate by Devon Govett'
        }),
    ]
};
