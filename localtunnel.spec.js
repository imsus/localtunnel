const http = require('http');
const net = require('net');
const url = require('url');
const assert = require('assert');

const localtunnel = require('./localtunnel');
const { createServer } = require('./server');

let fakePort;
let tunnelServer;
const TUNNEL_PORT = 8888;

before(async () => {
  const server = http.createServer();
  await new Promise((resolve, reject) => {
    server.on('request', (req, res) => {
      res.write(req.headers.host);
      res.end();
    });
    server.listen(0, () => {
      fakePort = server.address().port;
      resolve();
    });
    server.on('error', reject);
  });

  process.env.LOCALTUNNEL_HOST = `http://127.0.0.1:${TUNNEL_PORT}`;

  tunnelServer = createServer(TUNNEL_PORT);
  await new Promise((resolve) => {
    tunnelServer.on('listening', resolve);
  });
});

after(() => {
  delete process.env.LOCALTUNNEL_HOST;
  if (tunnelServer) {
    tunnelServer.close();
  }
});

function sendRawRequest(tunnelPort, hostHeader) {
  return new Promise((resolve, reject) => {
    const socket = net.connect(tunnelPort, '127.0.0.1', () => {
      const request = `GET / HTTP/1.1\r\nHost: ${hostHeader}\r\nConnection: close\r\n\r\n`;
      socket.write(request);
    });

    let data = '';
    socket.on('data', (chunk) => {
      data += chunk;
    });

    socket.on('end', () => {
      resolve(data);
    });

    socket.on('error', reject);
  });
}

it('request subdomain', async () => {
  const subdomain = Math.random().toString(36).substring(2, 6);
  const tunnel = await localtunnel({ port: fakePort, subdomain });

  assert.ok(tunnel.url, 'Expected tunnel URL to exist');
  assert.ok(tunnel.url.includes('127.0.0.1'), `Expected url to contain 127.0.0.1: ${tunnel.url}`);

  tunnel.close();
});

it('connect to local server via raw TCP tunnel', async () => {
  const tunnel = await localtunnel({ port: fakePort });

  assert.ok(tunnel.url.startsWith('http://'), `Expected url to start with http://: ${tunnel.url}`);

  const parsed = url.parse(tunnel.url);
  const subdomain = parsed.hostname.split('.')[0];
  const hostHeader = parsed.host;

  const response = await sendRawRequest(parsed.port, hostHeader);

  assert.ok(response.includes('HTTP/'), `Expected HTTP response: ${response}`);
  assert.ok(response.includes(hostHeader) || response.includes('localhost') || response.includes('127.0.0.1'), 
    `Expected host header in response: ${response}`);

  tunnel.close();
});
