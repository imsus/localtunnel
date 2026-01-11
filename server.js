const http = require("http");
const net = require("net");

const debug = require("debug")("localtunnel:server");

const clients = new Map();
const tunnelServers = new Map();
const waitList = new Map();

const CHARS = "abcdefghijklmnopqrstuvwxyz";

function generateId() {
  let id = "";
  for (let i = 0; i < 4; i++) {
    id += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return id;
}

function getWaitList(clientId) {
  if (!waitList.has(clientId)) {
    waitList.set(clientId, []);
  }
  return waitList.get(clientId);
}

class TunnelConnection {
  constructor(socket, clientId) {
    this.socket = socket;
    this.clientId = clientId;
    this.queue = null;

    socket.on("data", (data) => this.handleData(data));
    socket.on("end", () => this.handleEnd());
    socket.on("close", () => this.handleClose());
    socket.on("error", (err) => debug("socket error: %s", err.message));
  }

  handleData(data) {
    const client = clients.get(this.clientId);
    if (!client) return;

    if (client.current && client.current !== this.socket) {
      debug("pausing request for: %s", this.clientId);
      this.socket.pause();
      this.queue = Buffer.from(data);
      getWaitList(this.clientId).push(this);
      return;
    }

    client.current = this.socket;
    client.write(data);
  }

  handleEnd() {
    const client = clients.get(this.clientId);
    if (client && client.current === this.socket) {
      client.current = null;
    }
    this.socket.destroy();
  }

  handleClose() {
    if (clients.get(this.clientId) === this.socket) {
      clients.delete(this.clientId);
    }
    const list = waitList.get(this.clientId);
    if (list) {
      const idx = list.indexOf(this);
      if (idx !== -1) list.splice(idx, 1);
    }
  }
}

function handleNewTunnelRequest(req, res, requestedClientId = null) {
  const clientId = requestedClientId || generateId();
  debug("creating new tunnel for client: %s", clientId);

  const tunnelServer = net.createServer();

  tunnelServer.listen(0, () => {
    const port = tunnelServer.address().port;
    const origin = req.headers.host || "localhost";
    tunnelServers.set(clientId, tunnelServer);

    debug("tunnel server listening on port: %d", port);

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ url: `http://${clientId}.${origin}`, port, id: clientId }));
  });

  const connTimeout = setTimeout(() => {
    debug("client %s failed to connect", clientId);
    tunnelServers.delete(clientId);
    tunnelServer.close();
  }, 5000);

  tunnelServer.on("connection", (socket) => {
    clearTimeout(connTimeout);

    socket.clientId = clientId;
    clients.set(clientId, socket);
    waitList.set(clientId, []);

    new TunnelConnection(socket, clientId);

    socket.on("end", () => {
      clients.delete(clientId);
    });
  });

  tunnelServer.on("error", (err) => {
    debug("tunnel server error: %s", err.message);
    res.writeHead(500);
    res.end("Internal Server Error");
  });
}

function handleProxyRequest(req, res, hostname) {
  const match = hostname.match(/^([a-z]{4})[.]/);

  if (!match) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found");
    return;
  }

  const clientId = match[1];
  const client = clients.get(clientId);

  if (!client) {
    debug("client not found for id: %s", clientId);
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Tunnel not found");
    return;
  }

  debug("proxying request to client: %s, socket destroyed: %s", clientId, client.destroyed);

  client.on("error", (err) => {
    debug("client socket error: %s", err.message);
  });

  client.on("close", () => {
    debug("client socket closed");
  });

  client.on("end", () => {
    debug("client socket ended");
  });

  let body = Buffer.alloc(0);

  req.on("data", (chunk) => {
    body = Buffer.concat([body, chunk]);
  });

  req.on("end", () => {
    const requestData = `${req.method} ${req.url} HTTP/1.1\r\n${Object.entries(req.headers)
      .map(([k, v]) => `${k}: ${v}`)
      .join("\r\n")}\r\n\r\n${body.toString()}`;

    if (client.destroyed || client.readyState === "closed") {
      res.writeHead(502, { "Content-Type": "text/plain" });
      res.end("Tunnel connection closed");
      return;
    }

    if (client.activeRequest) {
      debug("client busy, queuing request");
      const waiting = { req, res };
      getWaitList(clientId).push(waiting);
      return;
    }

    client.activeRequest = { req, res };

    const onClientData = (data) => {
      res.write(data);
    };

    const onClientEnd = () => {
      res.end();
      cleanup();
    };

    const onClientError = (err) => {
      debug("client error during proxy: %s", err.message);
      res.writeHead(502);
      res.end("Bad Gateway");
      cleanup();
    };

    const cleanup = () => {
      client.removeListener("data", onClientData);
      client.removeListener("end", onClientEnd);
      client.removeListener("error", onClientError);
      client.activeRequest = null;

      const next = waitList.get(clientId).shift();
      if (next) {
        handleProxyRequest(next.req, next.req, hostname);
      }
    };

    client.on("data", onClientData);
    client.once("end", onClientEnd);
    client.on("error", onClientError);

    client.once("close", () => {
      debug("client socket closed during proxy");
      cleanup();
    });

    debug("writing request to client, length: %d", requestData.length);
    const wrote = client.write(requestData);
    debug("write result: %s", wrote);
  });
}

function handleRequest(req, res) {
  const hostname = req.headers.host || "";
  const subdomainMatch = hostname.match(/^([a-z0-9]+)[.]([^:]+)(?::(\d+))?$/);
  const clientId = subdomainMatch ? subdomainMatch[1] : null;

  const pathSubdomainMatch = req.url.match(/^\/([a-z0-9]+)(\/|$)/);
  const pathClientId = pathSubdomainMatch ? pathSubdomainMatch[1] : null;

  debug(
    "Received request: %s %s, host: %s, pathClientId: %s",
    req.method,
    req.url,
    hostname,
    pathClientId,
  );

  if (req.url === "/" || req.url.toLowerCase().startsWith("/?new") || req.url.includes("?new")) {
    debug("New tunnel request (root path)");
    handleNewTunnelRequest(req, res);
    return;
  }

  if (clientId && clients.has(clientId)) {
    debug("Proxy request for existing client: %s", clientId);
    handleProxyRequest(req, res, hostname);
    return;
  }

  if (pathClientId) {
    debug("New tunnel request for subdomain in path: %s", pathClientId);
    handleNewTunnelRequest(req, res, pathClientId);
    return;
  }

  if (clientId) {
    debug("New tunnel request for subdomain in host: %s", clientId);
    handleNewTunnelRequest(req, res, clientId);
    return;
  }

  debug("Not found");
  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not Found");
}

function createServer(port = 8000) {
  const server = http.createServer(handleRequest);
  server.listen(port, () => {
    debug("localtunnel server listening on port %d", port);
  });
  server.on("error", (err) => {
    debug("server error: %s", err.message);
  });
  return server;
}

const PORT = process.env.PORT || 8000;

if (require.main === module) {
  createServer(PORT);
}

module.exports = { createServer, clients, tunnelServers, waitList };
