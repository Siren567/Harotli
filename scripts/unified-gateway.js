const http = require("http");
const path = require("path");
const fs = require("fs");
const httpProxy = require("http-proxy");

const PUBLIC_PORT = Number(process.argv[2] || 3004);
const ADMIN_PORT = Number(process.argv[3] || 4444);
const ROOT_DIR = process.argv[4] || process.cwd();

const adminProxy = httpProxy.createProxyServer({
  target: `http://127.0.0.1:${ADMIN_PORT}`,
  changeOrigin: true,
  ws: true,
});

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function isAdminPath(urlPath) {
  return (
    urlPath.startsWith("/admin") ||
    urlPath.startsWith("/_next") ||
    urlPath.startsWith("/api") ||
    urlPath === "/login" ||
    urlPath === "/favicon.ico"
  );
}

function safePathFromUrl(urlPath) {
  const rawPath = urlPath === "/" ? "/index.html" : urlPath;
  const normalized = path.normalize(rawPath).replace(/^(\.\.[/\\])+/, "");
  return path.join(ROOT_DIR, normalized);
}

function serveStatic(req, res) {
  const urlObj = new URL(req.url, `http://${req.headers.host}`);
  const filePath = safePathFromUrl(urlObj.pathname);

  if (!filePath.startsWith(ROOT_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404);
      res.end("Not Found");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME[ext] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": contentType });
    fs.createReadStream(filePath).pipe(res);
  });
}

const server = http.createServer((req, res) => {
  const urlObj = new URL(req.url, `http://${req.headers.host}`);
  if (isAdminPath(urlObj.pathname)) {
    adminProxy.web(req, res, {}, () => {
      res.writeHead(502);
      res.end("Admin server unavailable");
    });
    return;
  }

  serveStatic(req, res);
});

server.on("upgrade", (req, socket, head) => {
  const urlObj = new URL(req.url, `http://${req.headers.host}`);
  if (isAdminPath(urlObj.pathname)) {
    adminProxy.ws(req, socket, head);
  } else {
    socket.destroy();
  }
});

adminProxy.on("error", () => {});

server.listen(PUBLIC_PORT, () => {
  console.log(`Gateway ready on http://localhost:${PUBLIC_PORT}`);
  console.log(`Main site: http://localhost:${PUBLIC_PORT}`);
  console.log(`Admin: http://localhost:${PUBLIC_PORT}/admin`);
});
