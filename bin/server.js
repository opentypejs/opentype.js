#!/usr/bin/env node

'use strict';

var fs = require('fs');
var http = require('http');
var path = require('path');
var spawn = require('child_process').spawn;

var watchify = spawn('./node_modules/.bin/watchify', ['src/opentype.js', '--standalone', 'opentype', '--debug', '-o', 'build/opentype.js', '-v']);

watchify.stdout.on('data', function(d) {
    console.log('WATCH', d.toString());
});

watchify.stderr.on('data', function(d) {
    console.log('WATCH', d.toString());
});

var CONTENT_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.png': 'image/png',
    '.js': 'text/javascript',
    '.ttf': 'font/otf',
    '.otf': 'font/otf'
};

http.createServer(function(req, res) {
    var rewrite = '';
    var url = req.url.substring(1);
    if (url.length === 0) {
        url = 'index.html';
        rewrite = ' -> ' + url;
    } else if (url === 'dist/opentype.js') {
        url = 'build/opentype.js';
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
            res.writeHead(200, {'Content-Type': contentType});
            res.end(data);
        }
    });
}).listen(8080);

console.log('Server running on port 8080.');
