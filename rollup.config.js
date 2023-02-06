var buble = require('@rollup/plugin-buble');
var resolve = require('@rollup/plugin-node-resolve');
var commonjs = require('@rollup/plugin-commonjs');
var license = require('rollup-plugin-license');

module.exports = {
    input: 'src/index.js',
    output: [
        {
            file: 'dist/opentype.js',
            format: 'umd',
            name: 'opentype',
            exports: 'named',
            sourcemap: true
        },
        {
            file: 'dist/opentype.module.js',
            format: 'es',
            exports: 'named',
            sourcemap: true
        }
   ],
    plugins: [
        resolve({
            mainFields: ['module', 'main', 'jsnext', 'browser'],
        }),
        commonjs(),
        buble(),
        license({
            banner: 'https://opentype.js.org v<%= pkg.version %> | (c) Frederik De Bleser and other contributors | MIT License | Uses tiny-inflate by Devon Govett' +
            ' and string.prototype.codepointat polyfill by Mathias Bynens'
        })
    ],
    watch: {
        include: 'src/**'
    }
};
