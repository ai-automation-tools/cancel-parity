import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import type { AddressInfo } from "node:net";

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};

/** Serves a folder (the fixtures by default) on 127.0.0.1 at a free port. Any method gets the file, so forms can POST. */
export async function serve(root = import.meta.dirname): Promise<{ url: string; close: () => Promise<void> }> {
  const server = createServer(async (req, res) => {
    req.resume();
    const path = new URL(req.url ?? "/", "http://x").pathname.slice(1);
    const file = join(root, path.endsWith("/") || path === "" ? join(path, "index.html") : path);
    try {
      const body = await readFile(file);
      res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" }).end(body);
    } catch {
      res.writeHead(404).end("not found");
    }
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}/`,
    close: () => new Promise((r) => server.close(() => r())),
  };
}
