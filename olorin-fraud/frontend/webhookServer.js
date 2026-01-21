const http = require('http');

const PORT = process.env.WEBHOOK_PORT || 4000;

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/progress') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        console.log('Progress event:', payload);
      } catch (err) {
        console.error('Invalid JSON payload', err);
      }
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('ok');
    });
  } else {
    res.statusCode = 404;
    res.end();
  }
});

server.listen(PORT, () => {
  console.log('Webhook server listening on port', PORT);
});
