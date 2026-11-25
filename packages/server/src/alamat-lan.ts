import { networkInterfaces } from 'node:os'

type Antarmuka = ReturnType<typeof networkInterfaces>

/** Antarmuka virtual (Docker, bridge, VPN) yang tidak bisa dijangkau pemain lain. */
const VIRTUAL = /^(docker|br-|veth|virbr|vmnet|tun|tap)/

/** Alamat IPv4 non-internal laptop ini, untuk dibagikan ke pemain lain di Wi-Fi yang sama. */
export function alamatLan(antarmuka: Antarmuka = networkInterfaces()): string[] {
  return Object.entries(antarmuka)
    .filter(([nama]) => !VIRTUAL.test(nama))
    .flatMap(([, daftar]) => daftar ?? [])
    .filter((a) => a.family === 'IPv4' && !a.internal)
    .map((a) => a.address)
}

/** URL siap salin untuk pemain lain; null kalau laptop tidak punya alamat LAN. */
export function alamatKlien(alamat: readonly string[], port: number): string | null {
  return alamat.length > 0 ? `http://${alamat[0]}:${port}` : null
}
