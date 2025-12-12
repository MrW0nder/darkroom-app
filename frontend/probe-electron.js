const { app } = require('electron');
const net = require('net');

const targets = [
  { name: '127.0.0.1', host: '127.0.0.1', port: 5173 },
  { name: 'localhost', host: 'localhost', port: 5173 },
  { name: '::1', host: '::1', port: 5173 },
];

function probe(target) {
  return new Promise((resolve) => {
    const sock = net.connect({ host: target.host, port: target.port }, () => {
      console.log(`${target.name} -> CONNECTED`);
      sock.end();
      resolve();
    });

    sock.on('error', (err) => {
      console.log(`${target.name} -> ERROR: ${err.code || err.message}`);
      resolve();
    });

    sock.setTimeout(3000, () => {
      console.log(`${target.name} -> TIMEOUT`);
      sock.destroy();
      resolve();
    });
  });
}

app.whenReady().then(async () => {
  console.log('Electron probe starting');
  for (const t of targets) {
    await probe(t);
  }
  console.log('Electron probe finished');
  // give logs a moment, then exit
  setTimeout(() => app.exit(0), 200);
});