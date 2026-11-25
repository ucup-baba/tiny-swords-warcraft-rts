import { createReadStream, existsSync, statSync } from 'node:fs'
import type { ServerResponse } from 'node:http'
import { extname, join, normalize, resolve, sep } from 'node:path'

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ttf': 'font/ttf',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
}

/**
 * Memetakan URL ke berkas di dalam `akar`, dengan penjagaan path traversal.
 * Mengembalikan null kalau di luar akar atau tidak ada.
 */
export function berkasAman(akar: string, urlPath: string): string | null {
  let mentah: string
  try {
    mentah = decodeURIComponent(new URL(urlPath, 'http://x').pathname)
  } catch {
    return null
  }
  if (mentah === '/') mentah = '/index.html'

  const akarAbs = resolve(akar)
  const penuh = resolve(join(akarAbs, normalize(mentah)))
  // Harus benar-benar di dalam akar; '/etc' tidak boleh lolos karena awalan sama.
  if (penuh !== akarAbs && !penuh.startsWith(akarAbs + sep)) return null
  if (!existsSync(penuh)) return null
  if (statSync(penuh).isDirectory()) {
    const idx = join(penuh, 'index.html')
    return existsSync(idx) ? idx : null
  }
  return penuh
}

export function kirimBerkas(res: ServerResponse, berkas: string, headTambahan: Record<string, string> = {}): void {
  res.writeHead(200, {
    'Content-Type': MIME[extname(berkas).toLowerCase()] ?? 'application/octet-stream',
    'Cache-Control': 'no-cache',
    ...headTambahan,
  })
  createReadStream(berkas).pipe(res)
}
