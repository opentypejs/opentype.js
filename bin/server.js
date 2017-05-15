#!/usr/bin/env node

var fs = require('fs');
var http = require('http');
var path = require('path');
var rollup = require('rollup');
var watch = require('rollup-watch');
var rollupConfig = require('../rollup.config');

var CONTENT_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.png': 'image/png',
    '.js': 'text/javascript',
    '.ttf': 'font/otf',
    '.otf': 'font/otf',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
};

http.createServer(function(req, res) {
    var rewrite = '';
    var url = req.url.substring(1);
    if (url.length === 0) {
        url = 'index.html';
        rewrite = ' -> ' + url;
    }

    console.log('HTTP', req.url, rewrite);
    var filePath = './' + url;
    fs.readFile(filePath, function(err, data) {
        if (err) {
            res.writeHead(404, {'Content-Type': 'text/plain'});
            res.end('Error: ' + err);
        } else {
            var contentType = CONTENT_TYPES[path.extname(filePath)] || 'text/plain';
            res.writeHead(200, {
                'Content-Type': contentType,
                'Cache-Control': 'max-age=0'
            });
            res.end(data);
        }
    });
}).listen(8080);
console.log('Server running at http://localhost:8080/');

var watcher = watch(rollup, rollupConfig);
watcher.on('event', function(e) {
    if (e.code === 'BUILD_START') {
        console.log('Bundling...');
    } else if (e.code === 'BUILD_END') {
        console.log('Bundled in ' + e.duration + 'ms.');
    } else if (e.code === 'ERROR') {
        console.error(e.error);
    } else {
        console.error('Unknown watch event', e);
    }
});
