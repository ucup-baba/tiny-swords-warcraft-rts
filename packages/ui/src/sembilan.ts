import { url, type Aset } from '@hftf/aset'

/**
 * CSS border-image dari aset 9-slice resmi Tiny Swords.
 *
 * Aset Update 010 berukuran 192x192 = 3x3 sel 64 piksel, jadi slice-nya 64.
 * `repeat` dipakai, bukan `stretch`: meregangkan pixel art membuat sudutnya
 * buram dan merusak seluruh kesan pixel.
 */
export function sembilanIris(
  a: Aset,
  lebarTepi = 20,
  basis = '',
  lebarLayout = lebarTepi,
): string {
  const u = basis + url(a).split('/').map(encodeURIComponent).join('/')
  return [
    `border-style: solid`,
    `border-width: ${lebarLayout}px`,
    `border-image-source: url("${u}")`,
    `border-image-slice: ${a.fh} fill`,
    `border-image-repeat: repeat`,
    `border-image-width: ${lebarTepi}px`,
  ].join('; ')
}

/** Aset 3-slice (192x64) untuk pita/ribbon: hanya melebar ke samping. */
export function tigaIris(a: Aset, lebarTepi = 18, basis = ''): string {
  const u = basis + url(a).split('/').map(encodeURIComponent).join('/')
  return [
    `border-style: solid`,
    `border-width: 0 ${lebarTepi}px`,
    `border-image-source: url("${u}")`,
    `border-image-slice: 0 ${a.fw} fill`,
    `border-image-repeat: repeat`,
    `border-image-width: 0 ${lebarTepi}px`,
  ].join('; ')
}

export const urlAset = (a: Aset, basis = ''): string =>
  basis + url(a).split('/').map(encodeURIComponent).join('/')
