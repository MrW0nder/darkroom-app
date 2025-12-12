const http = require('http');

const urls = [
  'http://127.0.0.1:5173/',
  'http://localhost:5173/',
  'http://[::1]:5173/'
];

function probe(url) {
  const req = http.get(url, { timeout: 3000 }, (res) => {
    console.log(`${url} -> ${res.statusCode}`);
    res.resume();
  });

  req.on('error', (err) => {
    console.log(`${url} -> ERROR: ${err.message}`);
  });

  req.on('timeout', () => {
    console.log(`${url} -> TIMEOUT`);
    req.destroy();
  });
}

urls.forEach(probe);