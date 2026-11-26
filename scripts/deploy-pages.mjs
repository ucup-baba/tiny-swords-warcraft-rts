#!/usr/bin/env node
/**
 * Mempublikasikan isi `dist-pages/` sebagai commit bersih ke branch `gh-pages`.
 * Tidak menyentuh branch `master` dan tidak membutuhkan OAuth scope `workflow`.
 */
import { execFileSync } from 'node:child_process'
import { rmSync } from 'node:fs'
import { join, resolve } from 'node:path'

const AKAR = resolve(process.cwd())
const TUJUAN = join(AKAR, 'dist-pages')

execFileSync('node', ['scripts/bangun-pages.mjs'], { cwd: AKAR, stdio: 'inherit' })

const remoteUrl = execFileSync('git', ['remote', 'get-url', 'origin'], { cwd: AKAR, encoding: 'utf8' }).trim()
if (!remoteUrl) throw new Error('Remote origin belum dikonfigurasi!')

const nama = execFileSync('git', ['config', 'user.name'], { cwd: AKAR, encoding: 'utf8' }).trim() || 'Deploy Bot'
const email = execFileSync('git', ['config', 'user.email'], { cwd: AKAR, encoding: 'utf8' }).trim() || 'deploy@localhost'
const sha = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: AKAR, encoding: 'utf8' }).trim()

const jalankan = (cmd, args) => execFileSync(cmd, args, { cwd: TUJUAN, stdio: 'inherit' })

jalankan('git', ['init', '-b', 'gh-pages'])
jalankan('git', ['config', 'user.name', nama])
jalankan('git', ['config', 'user.email', email])
jalankan('git', ['add', '-A'])
jalankan('git', ['commit', '-m', `deploy: GitHub Pages dari ${sha}`])
jalankan('git', ['push', '-f', remoteUrl, 'gh-pages:gh-pages'])

rmSync(join(TUJUAN, '.git'), { recursive: true, force: true })
console.log(`✔ Branch gh-pages berhasil di-push ke ${remoteUrl}`)
