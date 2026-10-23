#!/usr/bin/env node
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(root, "public");

function parsePort() {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--port" || args[i] === "-p") {
      const val = parseInt(args[i + 1], 10);
      if (!isNaN(val)) return val;
    }
    const val = parseInt(args[i], 10);
    if (!isNaN(val) && val > 0 && val < 65536) return val;
  }
  return parseInt(process.env.PORT, 10) || 3002;
}

let port = parsePort();

const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://localhost:${port}`);
  let filePath = path.join(publicDir, parsedUrl.pathname === "/" ? "catalog.json" : parsedUrl.pathname);

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "File not found" }));
    return;
  }

  const ext = path.extname(filePath);
  const contentType = ext === ".json" ? "application/json" : ext === ".js" ? "application/javascript" : "text/plain";
  res.writeHead(200, { "Content-Type": contentType });
  fs.createReadStream(filePath).pipe(res);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.warn(`Port ${port} is in use, trying ${port + 1}...`);
    port++;
    server.listen(port);
  } else {
    console.error("Server error:", err);
    process.exit(1);
  }
});

server.listen(port, () => {
  console.log(`\x1b[32m✔ ReaderGo Plugin Catalog Server running at http://localhost:${port}/catalog.json\x1b[0m`);
  console.log(`  Available bundles: http://localhost:${port}/<plugin-name>.bundle.json`);
});
