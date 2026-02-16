// Minimal cloud-save HTTP server (Node.js)
// Stores snapshots in-memory for demo purposes; replace with actual Scylla/S3 integrations in production.

const http = require('http');

const PORT = process.env.PORT || 8082;
const snapshots = new Map();

function handleRequest(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const segments = url.pathname.split('/').filter(Boolean); // ["cloud-save", playerId, gameType]

  if (!segments.length || segments[0] !== 'cloud-save') {
    res.statusCode = 404;
    return res.end('Not Found');
  }

  if (req.method === 'POST' && segments.length === 1) {
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', () => {
      try {
        const snapshot = JSON.parse(body);
        const key = `${snapshot.playerId}:${snapshot.gameType}`;
        snapshots.set(key, snapshot);
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ status: 'ok', key }));
      } catch (error) {
        res.statusCode = 400;
        res.end('Invalid payload');
      }
    });
    return;
  }

  if (segments.length === 3) {
    const [, playerId, gameType] = segments;
    const key = `${playerId}:${gameType}`;

    if (req.method === 'GET') {
      const snapshot = snapshots.get(key);
      if (!snapshot) {
        res.statusCode = 404;
        return res.end('Not found');
      }
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify(snapshot));
    }

    if (req.method === 'DELETE') {
      snapshots.delete(key);
      res.statusCode = 204;
      return res.end();
    }
  }

  res.statusCode = 405;
  res.end('Method not allowed');
}

http.createServer(handleRequest).listen(PORT, () => {
  console.log(`Cloud-save service listening on :${PORT}`);
});
