import { createServer } from 'node:http'
import { resolve } from 'node:path'
import { alamatKlien, alamatLan } from './alamat-lan.js'
import { pasangPapan } from './papan-ws.js'
import { berkasAman, kirimBerkas } from './statis.js'

const PORT = Number(process.env['PORT'] ?? 8080)
/** Akar repo: server/dist/.. -> packages/server -> packages -> repo */
const AKAR = resolve(process.cwd())

const server = createServer((req, res) => {
  const jalur = (req.url ?? '/').split('?')[0] ?? '/'
  const cors = { 'Access-Control-Allow-Origin': '*' }

  if (jalur === '/healthz') {
    res.writeHead(200, { ...cors, 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('ok')
    return
  }

  if (jalur === '/alamat') {
    const ips = alamatLan()
    res.writeHead(200, { ...cors, 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({ ips, port: PORT, url: alamatKlien(ips, PORT) ?? `http://localhost:${PORT}` }))
    return
  }

  if (req.method === 'GET' || req.method === 'HEAD') {
    const berkas = berkasAman(AKAR, req.url ?? '/')
    if (berkas) {
      if (req.method === 'HEAD') {
        res.writeHead(200, cors)
        res.end()
      } else {
        kirimBerkas(res, berkas, cors)
      }
      return
    }
  }

  res.writeHead(404, { ...cors, 'Content-Type': 'text/plain; charset=utf-8' })
  res.end('Not Found')
})

pasangPapan(server)

server.listen(PORT, '0.0.0.0', () => {
  const lan = alamatKlien(alamatLan(), PORT) ?? `http://localhost:${PORT}`
  console.log(`Tiny Swords RTS siap di http://0.0.0.0:${PORT}  (LAN: ${lan})`)
})
