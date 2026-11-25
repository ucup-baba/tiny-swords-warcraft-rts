import { randomBytes, randomInt } from 'node:crypto'
import type { IncomingMessage, Server as ServerHttp } from 'node:http'
import type { Duplex } from 'node:stream'
import { WebSocketServer } from 'ws'
import { PapanInti } from './papan.js'
import { PAPAN, pesanSah } from './protokol.js'

export const JALUR_PAPAN = '/ws'

/**
 * Alamat perangkat. Di belakang proxy dipakai alamat pertama X-Forwarded-For,
 * tapi HANYA kalau alamat socketnya sendiri lokal — supaya header palsu dari
 * internet tidak bisa menyamar sebagai jaringan lain (PRD §15.3 poin 2).
 */
export function alamatPerangkat(req: IncomingMessage): string {
  const socket = req.socket.remoteAddress ?? ''
  const diteruskan = req.headers['x-forwarded-for']
  const pertama = (Array.isArray(diteruskan) ? diteruskan[0] : diteruskan)?.split(',')[0]?.trim()
  const lokal = /^(::1$|::ffff:127\.|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(socket)
  return pertama && lokal ? pertama : socket
}

export function pasangPapan(http: ServerHttp): PapanInti {
  const papan = new PapanInti({ acak: (n) => randomInt(n), sekarang: () => Date.now() })

  const wss = new WebSocketServer({
    noServer: true,
    // Batas ukuran pesan (PRD §15.3 poin 4). Snapshot game lewat jalur yang
    // sama, jadi batasnya lebih longgar dari batas pesan lobi.
    maxPayload: 1_000_000,
    perMessageDeflate: false,
  })

  wss.on('connection', (ws, req) => {
    const id = randomBytes(6).toString('base64url')
    let hidup = true

    // Ping aplikasi + liveness timeout (PRD §15.3 poin 6). Tanpa ini socket
    // yang mati diam-diam (HP masuk sleep, Wi-Fi drop) menggantung selamanya.
    ws.on('pong', () => (hidup = true))
    const ping = setInterval(() => {
      if (!hidup) {
        ws.terminate()
        return
      }
      hidup = false
      ws.ping()
    }, PAPAN.pingMs)

    ws.on('message', (data, biner) => {
      if (biner) return
      let isi: unknown = null
      try {
        isi = JSON.parse(data.toString())
      } catch {
        return
      }
      if (!papan.pesan(id, pesanSah(isi))) ws.close(1008, 'Terlalu banyak pesan')
    })

    ws.on('close', () => {
      clearInterval(ping)
      papan.putus(id)
    })
    ws.on('error', () => ws.terminate())

    papan.sambung(id, alamatPerangkat(req), (p) => {
      if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(p))
    })
  })

  const detak = setInterval(() => papan.detak(), 1000)

  http.on('upgrade', (req: IncomingMessage, socket: Duplex, head: Buffer) => {
    if (new URL(req.url ?? '/', 'http://x').pathname !== JALUR_PAPAN) {
      socket.destroy()
      return
    }
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req))
  })
  http.on('close', () => {
    clearInterval(detak)
    wss.close()
  })
  return papan
}
