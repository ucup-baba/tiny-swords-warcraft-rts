#!/usr/bin/env python3
"""
Menggambar Altar of Heroes dalam gaya Tiny Swords.

Dibuat langsung di Pillow, bukan dari gambar AI: output model gambar berupa JPG
tanpa alpha, tepi anti-aliased, dan palet bebas - tidak bisa dipakai sebagai
sprite. Lihat docs/AUDIT_TAHAP_1.md §16.3.1.

Palet diambil dari sprite bangunan resmi Update 010, bukan dikira-kira.
Siluetnya sengaja dibuat RENDAH dan TERBUKA supaya langsung terbaca sebagai
altar - kelemahan altar lama adalah terbaca sebagai castle mini.
"""
import sys
from PIL import Image, ImageDraw

W, H = 192, 256

# Palet resmi Tiny Swords (diekstrak dari Castle/Tower/House Update 010).
GARIS      = (22, 28, 46)
BATU_GELAP = (67, 91, 125)
BATU       = (68, 142, 159)
BATU_TERANG= (90, 185, 187)
KAYU_GELAP = (134, 99, 83)
KAYU       = (180, 131, 85)
KAYU_TERANG= (218, 181, 112)
EMAS       = (245, 239, 169)
HIJAU_SIHIR= (143, 226, 185)
KAIN = {
    'Blue': ((67, 91, 125), (90, 185, 187)),
    'Red':  ((182, 85, 85), (197, 131, 110)),
}


def kotak(d, x1, y1, x2, y2, isi, garis=GARIS, tebal=2):
    """Kotak berisi dengan outline gelap tebal, khas Pixel Frog."""
    d.rectangle([x1, y1, x2, y2], fill=garis)
    d.rectangle([x1 + tebal, y1 + tebal, x2 - tebal, y2 - tebal], fill=isi)


def sorot(d, x1, y1, x2, y2, warna, tinggi=4):
    """Garis sorot di tepi atas sebuah blok, memberi kesan volume."""
    d.rectangle([x1, y1, x2, y1 + tinggi], fill=warna)


def bata(d, x1, y1, x2, y2, warna, tinggi=11, lebar=22):
    """
    Guratan bata pada permukaan batu.

    Tanpa ini blok batunya terbaca sebagai bidang datar; bangunan resmi Tiny
    Swords semuanya punya tekstur bata/serat kayu di dalam outline-nya.
    """
    baris = 0
    y = y1 + tinggi
    while y < y2 - 2:
        d.rectangle([x1, y, x2, y + 1], fill=warna)
        geser = 0 if baris % 2 == 0 else lebar // 2
        x = x1 + geser
        while x < x2:
            if x > x1:
                d.rectangle([x, y - tinggi + 1, x + 1, y], fill=warna)
            x += lebar
        baris += 1
        y += tinggi


def muka_atas(d, x1, y1, x2, y2, warna):
    """Bidang atas tipis, memberi kesan pandangan tiga-perempat dari atas."""
    d.rectangle([x1, y1, x2, y2], fill=warna)


def buat(tim: str) -> Image.Image:
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    kain_gelap, kain_terang = KAIN[tim]

    # --- Tiga undak batu, makin ke atas makin sempit (siluet piramida rendah)
    undak = [
        (14, 206, 178, 240),   # dasar paling lebar
        (28, 184, 164, 212),
        (42, 164, 150, 190),
    ]
    for i, (x1, y1, x2, y2) in enumerate(undak):
        isi = BATU if i % 2 == 0 else BATU_GELAP
        kotak(d, x1, y1, x2, y2, isi)
        # Bidang atas lebih terang: pandangan tiga-perempat seperti bangunan resmi.
        muka_atas(d, x1 + 2, y1 + 2, x2 - 2, y1 + 9, BATU_TERANG)
        d.rectangle([x1 + 2, y1 + 9, x2 - 2, y1 + 10], fill=GARIS)
        bata(d, x1 + 3, y1 + 11, x2 - 3, y2 - 2, BATU_GELAP if isi is BATU else GARIS)

    # --- Anak tangga di tengah-depan: menandakan "tempat naik", bukan pintu
    for i, (ty, tx1, tx2) in enumerate([(236, 76, 116), (224, 82, 110), (212, 88, 104)]):
        kotak(d, tx1, ty - 10, tx2, ty, KAYU if i % 2 == 0 else KAYU_GELAP, tebal=2)
        sorot(d, tx1 + 3, ty - 8, tx2 - 3, ty - 8, KAYU_TERANG, 3)
        d.rectangle([tx1 + 3, ty - 4, tx2 - 3, ty - 3], fill=KAYU_GELAP)

    # --- Dua pilar pendek, dibiarkan TERBUKA di tengah (tanpa dinding/atap)
    for px in (46, 122):
        kotak(d, px, 104, px + 24, 168, BATU)
        bata(d, px + 3, 112, px + 21, 166, BATU_GELAP, tinggi=13, lebar=18)
        # sisi kiri pilar lebih gelap: arah cahaya dari kanan-atas
        d.rectangle([px + 2, 106, px + 6, 166], fill=BATU_GELAP)
        # kepala pilar sedikit melebar
        kotak(d, px - 6, 92, px + 30, 110, BATU_GELAP)
        muka_atas(d, px - 3, 95, px + 27, 100, BATU_TERANG)
        d.rectangle([px - 3, 100, px + 27, 101], fill=GARIS)

    # --- Kain panji tergantung di pilar kiri: penanda faksi
    kotak(d, 52, 112, 76, 162, kain_gelap)
    sorot(d, 55, 115, 73, 115, kain_terang, 6)
    # lipatan kain
    d.rectangle([60, 120, 61, 158], fill=kain_terang)
    d.rectangle([68, 124, 69, 156], fill=kain_terang)
    # ujung kain bergerigi
    d.rectangle([54, 156, 62, 166], fill=kain_gelap)
    d.rectangle([66, 156, 74, 166], fill=kain_gelap)
    d.rectangle([52, 162, 76, 164], fill=GARIS)

    # --- Batu rune melayang: pusat perhatian, yang membuatnya terbaca "altar"
    cx = W // 2
    # halo
    for r, a in ((30, 42), (22, 70), (15, 110)):
        d.ellipse([cx - r, 66 - r, cx + r, 66 + r], fill=(*HIJAU_SIHIR, a))
    # kristal: belah ketupat memanjang
    kristal = [(cx, 28), (cx + 18, 62), (cx, 100), (cx - 18, 62)]
    d.polygon(kristal, fill=GARIS)
    d.polygon([(cx, 34), (cx + 13, 62), (cx, 94), (cx - 13, 62)], fill=EMAS)
    d.polygon([(cx, 40), (cx + 6, 62), (cx, 86), (cx - 6, 62)], fill=(255, 255, 230))
    # guratan rune
    d.rectangle([cx - 3, 54, cx + 3, 58], fill=GARIS)
    d.rectangle([cx - 5, 64, cx + 5, 67], fill=GARIS)
    d.rectangle([cx - 3, 73, cx + 3, 77], fill=GARIS)

    # --- Alas kristal di atas undak teratas
    kotak(d, cx - 20, 150, cx + 20, 172, BATU_GELAP)
    muka_atas(d, cx - 17, 153, cx + 17, 158, BATU_TERANG)
    d.rectangle([cx - 17, 158, cx + 17, 159], fill=GARIS)
    bata(d, cx - 17, 160, cx + 17, 170, GARIS, tinggi=9, lebar=16)
    d.rectangle([cx - 10, 144, cx + 10, 152], fill=GARIS)
    d.rectangle([cx - 8, 146, cx + 8, 152], fill=HIJAU_SIHIR)

    return im


def konstruksi() -> Image.Image:
    """Fase konstruksi: kerangka kayu, belum ada batu dan kristal."""
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    kotak(d, 14, 206, 178, 240, KAYU_GELAP)
    sorot(d, 18, 209, 174, 209, KAYU, 5)
    for px in (46, 122):
        kotak(d, px, 150, px + 20, 212, KAYU)
        sorot(d, px + 3, 153, px + 17, 153, KAYU_TERANG, 4)
    # palang silang
    d.line([(56, 160), (142, 206)], fill=GARIS, width=7)
    d.line([(58, 162), (140, 204)], fill=KAYU_TERANG, width=3)
    d.line([(142, 160), (56, 206)], fill=GARIS, width=7)
    d.line([(140, 162), (58, 204)], fill=KAYU_TERANG, width=3)
    return im


def hancur() -> Image.Image:
    """Fase hancur: undak runtuh, pilar patah, kristal pecah."""
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    kotak(d, 18, 214, 174, 240, BATU_GELAP)
    # pecahan undak
    for x1, y1, x2, y2 in [(30, 198, 72, 220), (96, 204, 134, 222), (140, 210, 166, 226)]:
        kotak(d, x1, y1, x2, y2, BATU)
    # tunggul pilar patah
    kotak(d, 46, 182, 70, 216, BATU)
    kotak(d, 122, 192, 146, 218, BATU_GELAP)
    # serpihan kristal padam
    for x, y, s in [(84, 186, 10), (104, 194, 8), (94, 176, 6)]:
        d.polygon([(x, y - s), (x + s, y), (x, y + s), (x - s, y)], fill=GARIS)
        d.polygon([(x, y - s + 3), (x + s - 3, y), (x, y + s - 3), (x - s + 3, y)], fill=KAYU_GELAP)
    return im


if __name__ == '__main__':
    keluar = sys.argv[1] if len(sys.argv) > 1 else 'custom_assets/Buildings'
    for tim in ('Blue', 'Red'):
        buat(tim).save(f'{keluar}/Altar_{tim}.png')
        print(f'{keluar}/Altar_{tim}.png')
    konstruksi().save(f'{keluar}/Altar_Construction.png')
    hancur().save(f'{keluar}/Altar_Destroyed.png')
    print(f'{keluar}/Altar_Construction.png')
    print(f'{keluar}/Altar_Destroyed.png')
