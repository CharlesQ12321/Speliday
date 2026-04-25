#!/usr/bin/env node
// 启动本地HTTP服务器用于测试
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8888;
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
  '.woff': 'application/font-woff',
  '.ttf': 'application/font-ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'application/font-otf',
  '.wasm': 'application/wasm'
};

const server = http.createServer((req, res) => {
  let filePath = req.url === '/' ? '/index.html' : req.url;
  filePath = path.join(__dirname, filePath);
  
  const extname = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[extname] || 'application/octet-stream';
  
  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404);
        res.end('文件未找到: ' + filePath);
      } else {
        res.writeHead(500);
        res.end('服务器错误: ' + err.code);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`\n🚀 服务器已启动!`);
  console.log(`\n📍 访问地址:`);
  console.log(`   主应用:     http://localhost:${PORT}/index.html`);
  console.log(`   作弊码测试: http://localhost:${PORT}/test-cheat-comprehensive.html`);
  console.log(`   简单测试:   http://localhost:${PORT}/test-cheat-code.html\n`);
  console.log(`按 Ctrl+C 停止服务器`);
});
