#!/usr/bin/env node
/**
 * Tiny Swords: Warcraft RTS — Static HTTP + LAN Multiplayer WebSocket Server
 * Modeled after /home/server/project/math-strike-kerja24c (alamat-lan.ts & papan-ws.ts).
 * Zero external npm dependencies; implements full RFC 6455 WebSocket frames (<126, 16-bit, 64-bit).
 */

import { createHash, randomBytes, randomInt } from 'node:crypto';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { networkInterfaces } from 'node:os';
import { extname, join, normalize, resolve } from 'node:path';

const PORT = Number(process.env.PORT ?? 8080);
const ROOT = resolve(process.cwd());
const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const ROOM_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.mjs':  'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.md':   'text/markdown; charset=utf-8',
};

/** Filter out Docker/VPN/bridge virtual adapters identically to math-strike alamat-lan.ts */
const VIRTUAL_IFACE = /^(docker|br-|veth|virbr|vmnet|tun|tap)/i;

export function getLanAddresses(ifaces = networkInterfaces()) {
  return Object.entries(ifaces)
    .filter(([name]) => !VIRTUAL_IFACE.test(name))
    .flatMap(([, list]) => list ?? [])
    .filter((a) => a.family === 'IPv4' && !a.internal)
    .map((a) => a.address);
}

// ---------------------------------------------------------------------------
// Minimal RFC 6455 WebSocket Frame Encoder / Decoder (supports large payloads)
// ---------------------------------------------------------------------------

function encodeWsFrame(opcode, payloadBuf) {
  const len = payloadBuf.length;
  let header;
  if (len < 126) {
    header = Buffer.allocUnsafe(2);
    header[0] = 0x80 | opcode;
    header[1] = len;
  } else if (len < 65536) {
    header = Buffer.allocUnsafe(4);
    header[0] = 0x80 | opcode;
    header[1] = 126;
    header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.allocUnsafe(10);
    header[0] = 0x80 | opcode;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(len), 2);
  }
  return Buffer.concat([header, payloadBuf]);
}

function attachWs(socket, onMessage, onClose) {
  let buf = Buffer.alloc(0);
  let fragOp = 0;
  let fragChunks = [];
  let closed = false;

  function sendJson(obj) {
    if (closed || socket.destroyed || !socket.writable) return;
    const data = Buffer.from(JSON.stringify(obj), 'utf8');
    socket.write(encodeWsFrame(0x1, data));
  }

  function closeSocket() {
    if (closed) return;
    closed = true;
    try {
      socket.write(encodeWsFrame(0x8, Buffer.alloc(0)));
    } catch {}
    socket.destroy();
    onClose();
  }

  socket.on('data', (chunk) => {
    buf = Buffer.concat([buf, chunk]);
    while (buf.length >= 2) {
      const b0 = buf[0];
      const b1 = buf[1];
      const fin = (b0 & 0x80) !== 0;
      const opcode = b0 & 0x0f;
      const masked = (b1 & 0x80) !== 0;
      let payloadLen = b1 & 0x7f;
      let offset = 2;

      if (payloadLen === 126) {
        if (buf.length < 4) return;
        payloadLen = buf.readUInt16BE(2);
        offset = 4;
      } else if (payloadLen === 127) {
        if (buf.length < 10) return;
        const big = buf.readBigUInt64BE(2);
        if (big > 8_000_000n) { closeSocket(); return; }
        payloadLen = Number(big);
        offset = 10;
      }

      const maskLen = masked ? 4 : 0;
      if (buf.length < offset + maskLen + payloadLen) return;

      let payload = buf.subarray(offset + maskLen, offset + maskLen + payloadLen);
      if (masked) {
        const maskKey = buf.subarray(offset, offset + 4);
        const unmasked = Buffer.allocUnsafe(payloadLen);
        for (let i = 0; i < payloadLen; i++) {
          unmasked[i] = payload[i] ^ maskKey[i & 3];
        }
        payload = unmasked;
      }
      buf = buf.subarray(offset + maskLen + payloadLen);

      if (opcode === 0x8) {
        closeSocket();
        return;
      }
      if (opcode === 0x9) {
        if (!closed && socket.writable) socket.write(encodeWsFrame(0xA, payload));
        continue;
      }
      if (opcode === 0xA) continue; // pong

      if (opcode === 0x0) {
        fragChunks.push(payload);
        if (fin && fragOp === 0x1) {
          const full = Buffer.concat(fragChunks).toString('utf8');
          fragChunks = [];
          fragOp = 0;
          try { onMessage(JSON.parse(full)); } catch {}
        }
      } else if (opcode === 0x1) {
        if (fin) {
          try { onMessage(JSON.parse(payload.toString('utf8'))); } catch {}
        } else {
          fragOp = 0x1;
          fragChunks = [payload];
        }
      }
    }
  });

  socket.on('error', closeSocket);
  socket.on('end', closeSocket);
  socket.on('close', closeSocket);

  return { sendJson, close: closeSocket };
}

// ---------------------------------------------------------------------------
// LAN Matchmaking Room Board & Relay (2 Players: Host=Blue, Guest=Red)
// ---------------------------------------------------------------------------

const clients = new Map(); // clientId -> { id, name, roomCode, team, ws }
const rooms = new Map();   // code -> { code, hostId, guestId, started, createdAt }

function genRoomCode() {
  for (let i = 0; i < 64; i++) {
    let code = '';
    for (let k = 0; k < 4; k++) code += ROOM_CHARS[randomInt(ROOM_CHARS.length)];
    if (!rooms.has(code)) return code;
  }
  return randomBytes(2).toString('hex').toUpperCase();
}

function getRoomSnapshot(room) {
  const host = clients.get(room.hostId);
  const guest = room.guestId ? clients.get(room.guestId) : null;
  return {
    code: room.code,
    started: room.started,
    hostName: host ? host.name : 'Host',
    guestName: guest ? guest.name : null,
    count: guest ? 2 : 1,
  };
}

function broadcastRooms() {
  const list = [];
  for (const r of rooms.values()) {
    if (!r.started) list.push(getRoomSnapshot(r));
  }
  for (const cl of clients.values()) {
    if (!cl.roomCode) {
      cl.ws.sendJson({ type: 'rooms_update', rooms: list });
    }
  }
}

function leaveCurrentRoom(client) {
  if (!client.roomCode) return;
  const room = rooms.get(client.roomCode);
  client.roomCode = null;
  client.team = null;
  if (!room) return;

  if (room.hostId === client.id) {
    const guest = room.guestId ? clients.get(room.guestId) : null;
    if (guest) {
      guest.roomCode = null;
      guest.team = null;
      guest.ws.sendJson({ type: 'opponent_left', reason: 'Host menutup room.' });
    }
    rooms.delete(room.code);
  } else if (room.guestId === client.id) {
    room.guestId = null;
    room.started = false;
    const host = clients.get(room.hostId);
    if (host) {
      host.ws.sendJson({
        type: 'opponent_left',
        reason: 'Pemain 2 keluar dari room.',
        room: getRoomSnapshot(room),
      });
    }
  }
  broadcastRooms();
}

function handleClientMsg(client, msg) {
  if (!msg || typeof msg !== 'object') return;
  const type = msg.type;

  if (type === 'ping') {
    client.ws.sendJson({ type: 'pong', ts: msg.ts ?? Date.now() });
    return;
  }

  if (type === 'list_rooms') {
    const list = [];
    for (const r of rooms.values()) {
      if (!r.started) list.push(getRoomSnapshot(r));
    }
    client.ws.sendJson({ type: 'rooms_update', rooms: list });
    return;
  }

  if (type === 'create_room') {
    leaveCurrentRoom(client);
    client.name = String(msg.playerName || 'Pemain 1').slice(0, 18);
    const code = genRoomCode();
    const room = { code, hostId: client.id, guestId: null, started: false, createdAt: Date.now() };
    rooms.set(code, room);
    client.roomCode = code;
    client.team = 'blue';
    client.ws.sendJson({
      type: 'room_joined',
      code,
      role: 'host',
      team: 'blue',
      room: getRoomSnapshot(room),
    });
    broadcastRooms();
    return;
  }

  if (type === 'join_room') {
    const code = String(msg.code || '').trim().toUpperCase();
    const room = rooms.get(code);
    if (!room) {
      client.ws.sendJson({ type: 'error_msg', message: `Room "${code}" tidak ditemukan!` });
      return;
    }
    if (room.guestId || room.started) {
      client.ws.sendJson({ type: 'error_msg', message: `Room "${code}" sudah penuh atau sedang bermain!` });
      return;
    }
    leaveCurrentRoom(client);
    client.name = String(msg.playerName || 'Pemain 2').slice(0, 18);
    room.guestId = client.id;
    client.roomCode = code;
    client.team = 'red';

    const snap = getRoomSnapshot(room);
    client.ws.sendJson({ type: 'room_joined', code, role: 'guest', team: 'red', room: snap });
    const host = clients.get(room.hostId);
    if (host) {
      host.ws.sendJson({ type: 'room_ready', code, room: snap });
    }
    broadcastRooms();
    return;
  }

  if (type === 'leave_room') {
    leaveCurrentRoom(client);
    return;
  }

  if (type === 'start_game') {
    const room = client.roomCode ? rooms.get(client.roomCode) : null;
    if (!room || room.hostId !== client.id) return;
    if (!room.guestId) {
      client.ws.sendJson({ type: 'error_msg', message: 'Menunggu Pemain 2 bergabung ke room!' });
      return;
    }
    room.started = true;
    const snap = getRoomSnapshot(room);
    const seed = randomInt(1_000_000);
    const host = clients.get(room.hostId);
    const guest = clients.get(room.guestId);
    host?.ws.sendJson({ type: 'game_start', seed, team: 'blue', room: snap });
    guest?.ws.sendJson({ type: 'game_start', seed, team: 'red', room: snap });
    broadcastRooms();
    return;
  }

  if (type === 'state_sync') {
    const room = client.roomCode ? rooms.get(client.roomCode) : null;
    if (!room || room.hostId !== client.id || !room.guestId) return;
    const guest = clients.get(room.guestId);
    guest?.ws.sendJson({ type: 'state_sync', state: msg.state });
    return;
  }

  if (type === 'player_cmd') {
    const room = client.roomCode ? rooms.get(client.roomCode) : null;
    if (!room || room.guestId !== client.id) return;
    const host = clients.get(room.hostId);
    host?.ws.sendJson({ type: 'player_cmd', team: 'red', cmd: msg.cmd });
    return;
  }

  if (type === 'chat') {
    const room = client.roomCode ? rooms.get(client.roomCode) : null;
    if (!room) return;
    const peerId = room.hostId === client.id ? room.guestId : room.hostId;
    const peer = peerId ? clients.get(peerId) : null;
    peer?.ws.sendJson({ type: 'chat', from: client.name, text: String(msg.text || '').slice(0, 120) });
  }
}

// ---------------------------------------------------------------------------
// HTTP Static & LAN API Server
// ---------------------------------------------------------------------------

function resolveSafeFile(reqUrl) {
  let rawPath = '/';
  try {
    rawPath = decodeURIComponent(new URL(reqUrl, 'http://localhost').pathname);
  } catch {
    return null;
  }
  if (rawPath === '/') rawPath = '/index.html';
  const rel = normalize(rawPath).replace(/^(\.\.[/\\])+/, '');
  const full = resolve(join(ROOT, rel));
  if (!full.startsWith(ROOT)) return null;
  if (!existsSync(full)) return null;
  const st = statSync(full);
  if (st.isDirectory()) {
    const idx = join(full, 'index.html');
    return existsSync(idx) ? idx : null;
  }
  return full;
}

const server = createServer((req, res) => {
  const urlPath = (req.url || '/').split('?')[0];
  const cors = { 'Access-Control-Allow-Origin': '*' };

  if (req.method === 'GET' && urlPath === '/healthz') {
    res.writeHead(200, { ...cors, 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('ok');
    return;
  }

  if (req.method === 'GET' && urlPath === '/alamat') {
    const ips = getLanAddresses();
    const ip = ips[0] ?? '127.0.0.1';
    res.writeHead(200, { ...cors, 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      ip,
      ips,
      port: PORT,
      url: ips.length > 0 ? `http://${ips[0]}:${PORT}` : `http://localhost:${PORT}`,
    }));
    return;
  }

  if (req.method === 'GET' || req.method === 'HEAD') {
    const file = resolveSafeFile(req.url || '/');
    if (file) {
      const ext = extname(file).toLowerCase();
      res.writeHead(200, {
        ...cors,
        'Content-Type': MIME[ext] || 'application/octet-stream',
        'Cache-Control': 'no-cache',
      });
      if (req.method === 'HEAD') {
        res.end();
      } else {
        createReadStream(file).pipe(res);
      }
      return;
    }
  }

  res.writeHead(404, { ...cors, 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Not Found');
});

server.on('upgrade', (req, socket) => {
  const pathname = (req.url || '/').split('?')[0];
  if (pathname !== '/ws') {
    socket.destroy();
    return;
  }
  const key = req.headers['sec-websocket-key'];
  if (!key || typeof key !== 'string') {
    socket.destroy();
    return;
  }
  const accept = createHash('sha1').update(key + WS_GUID).digest('base64');
  socket.write(
    'HTTP/1.1 101 Switching Protocols\r\n' +
    'Upgrade: websocket\r\n' +
    'Connection: Upgrade\r\n' +
    `Sec-WebSocket-Accept: ${accept}\r\n\r\n`
  );

  const clientId = randomBytes(6).toString('base64url');
  const client = { id: clientId, name: 'Pemain', roomCode: null, team: null, ws: null };
  client.ws = attachWs(
    socket,
    (msg) => handleClientMsg(client, msg),
    () => {
      leaveCurrentRoom(client);
      clients.delete(clientId);
    }
  );
  clients.set(clientId, client);

  // Immediately send active LAN rooms list upon connect
  const list = [];
  for (const r of rooms.values()) {
    if (!r.started) list.push(getRoomSnapshot(r));
  }
  client.ws.sendJson({ type: 'welcome', id: clientId, rooms: list });
});

server.listen(PORT, '0.0.0.0', () => {
  const ips = getLanAddresses();
  const lanUrl = ips.length ? `http://${ips[0]}:${PORT}` : `http://localhost:${PORT}`;
  console.log(`Tiny Swords Warcraft RTS LAN Server listening on http://0.0.0.0:${PORT} (LAN: ${lanUrl})`);
});
