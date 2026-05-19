const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 5500;
const ROOT_DIR = __dirname;
const ASSETS_DIR = path.join(ROOT_DIR, "assets", "projects");
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"]);

const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

const toSafeRelativePath = (requestPath) => {
  const decodedPath = decodeURIComponent(requestPath.split("?")[0]);
  const normalized = path.normalize(decodedPath).replace(/^(\.\.[\/\\])+/, "");
  const safePath = normalized === path.sep ? "index.html" : normalized.replace(/^[/\\]/, "");
  return safePath === "" ? "index.html" : safePath;
};

const sendJson = (response, statusCode, payload) => {
  response.writeHead(statusCode, { "Content-Type": CONTENT_TYPES[".json"] });
  response.end(JSON.stringify(payload));
};

const fileNameToAlt = (fileName) => {
  const withoutExtension = fileName.replace(/\.[^/.]+$/, "");
  return withoutExtension.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
};

const getProjectImages = async () => {
  const entries = await fs.promises.readdir(ASSETS_DIR, { withFileTypes: true });
  const images = entries
    .filter((entry) => entry.isFile() && IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase()))
    .map((entry) => {
      const encodedName = encodeURIComponent(entry.name).replace(/%2F/gi, "/");
      return {
        src: `assets/projects/${encodedName}`,
        alt: fileNameToAlt(entry.name)
      };
    })
    .sort((a, b) => a.src.localeCompare(b.src));

  return images;
};

const serveStaticFile = async (requestPath, response) => {
  const relativePath = toSafeRelativePath(requestPath);
  const absolutePath = path.resolve(ROOT_DIR, relativePath);

  if (!absolutePath.startsWith(ROOT_DIR)) {
    sendJson(response, 403, { error: "Forbidden" });
    return;
  }

  let filePath = absolutePath;
  try {
    const stats = await fs.promises.stat(filePath);
    if (stats.isDirectory()) {
      filePath = path.join(filePath, "index.html");
    }
  } catch (error) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not Found");
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = CONTENT_TYPES[ext] || "application/octet-stream";

  try {
    const fileBuffer = await fs.promises.readFile(filePath);
    response.writeHead(200, { "Content-Type": contentType });
    response.end(fileBuffer);
  } catch (error) {
    response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Internal Server Error");
  }
};

const server = http.createServer(async (request, response) => {
  if (!request.url) {
    response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Bad Request");
    return;
  }

  if (request.url.startsWith("/api/project-images")) {
    try {
      const images = await getProjectImages();
      sendJson(response, 200, { images });
    } catch (error) {
      sendJson(response, 500, { images: [], error: "Could not read assets folder" });
    }
    return;
  }

  await serveStaticFile(request.url, response);
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
