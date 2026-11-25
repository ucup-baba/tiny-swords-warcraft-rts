import { UI } from '@hftf/aset'
import { describe, expect, it } from 'vitest'
import { sembilanIris, tigaIris, urlAset } from '../src/sembilan.js'

describe('9-slice dari aset resmi', () => {
  it('memakai border-image, bukan background biasa', () => {
    const css = sembilanIris(UI.panelUkir)
    expect(css).toContain('border-image-source')
    expect(css).toContain('border-image-slice: 64 fill')
  })

  it('memakai repeat, bukan stretch — meregangkan pixel art merusak sudutnya', () => {
    expect(sembilanIris(UI.panelUkir)).toContain('border-image-repeat: repeat')
    expect(sembilanIris(UI.panelUkir)).not.toContain('stretch')
  })

  it('3-slice hanya melebar ke samping', () => {
    const css = tigaIris(UI.pitaBlue)
    expect(css).toContain('border-image-slice: 0 64 fill')
  })

  it('spasi di path aset di-encode supaya URL-nya sah', () => {
    const u = urlAset(UI.panelUkir)
    expect(u).not.toContain(' ')
    expect(u).toContain('%20')
  })

  it('panel UI yang dipakai semuanya dari Update 010', () => {
    for (const nama of ['panelUkir', 'tombolBlue', 'tombolRed', 'pitaBlue', 'bannerH'] as const) {
      expect(UI[nama].pack).toBe('u010')
    }
  })
})
