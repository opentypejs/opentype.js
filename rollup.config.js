var buble = require('rollup-plugin-buble');
var resolve = require('rollup-plugin-node-resolve');
var commonjs = require('rollup-plugin-commonjs');
var uglify = require('rollup-plugin-uglify');

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
    ]
};
