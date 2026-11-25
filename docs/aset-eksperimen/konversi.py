from PIL import Image
from collections import Counter
import sys

SRC = sys.argv[1]; OUT = sys.argv[2]
REF = [
 "Tiny Swords/Tiny Swords (Update 010)/Factions/Knights/Buildings/Castle/Castle_Blue.png",
 "Tiny Swords/Tiny Swords (Update 010)/Factions/Knights/Buildings/House/House_Blue.png",
 "Tiny Swords/Tiny Swords (Update 010)/Factions/Knights/Buildings/Tower/Tower_Blue.png",
]

# 1. Palet resmi Tiny Swords dari sprite bangunan asli
pal = Counter()
for r in REF:
    im = Image.open(r).convert("RGBA")
    for px in im.getdata():
        if px[3] > 200:
            pal[px[:3]] += 1
palette = [c for c, _ in pal.most_common(48)]
print(f"palet resmi: {len(palette)} warna dari {len(REF)} sprite bangunan")

# 2. Muat concept, buang background magenta SEBELUM resize (hindari tepi tercampur)
im = Image.open(SRC).convert("RGB")
w, h = im.size
px = im.load()
mask = Image.new("L", (w, h), 0)
mk = mask.load()
for y in range(h):
    for x in range(w):
        r, g, b = px[x, y]
        # magenta: merah & biru tinggi, hijau rendah
        is_bg = r > 170 and b > 170 and g < 110
        mk[x, y] = 0 if is_bg else 255

# 3. Crop ke bounding box subjek, lalu resize ke 192x256 (3:4)
bbox = mask.getbbox()
im = im.crop(bbox); mask = mask.crop(bbox)
TW, TH = 192, 256
cw, ch = im.size
sc = min(TW / cw, TH / ch)
nw, nh = max(1, int(cw * sc)), max(1, int(ch * sc))
im = im.resize((nw, nh), Image.BOX)          # BOX = rata-rata, bersihkan artefak JPEG
mask = mask.resize((nw, nh), Image.BOX)

# 4. Quantize tiap piksel ke warna palet resmi terdekat
ip = im.load(); mp = mask.load()
out = Image.new("RGBA", (TW, TH), (0, 0, 0, 0))
op = out.load()
ox, oy = (TW - nw) // 2, TH - nh          # anchor tengah-bawah
cache = {}
for y in range(nh):
    for x in range(nw):
        if mp[x, y] < 128:                 # alpha keras, tanpa tepi semi-transparan
            continue
        c = ip[x, y]
        if c not in cache:
            cache[c] = min(palette, key=lambda p: (p[0]-c[0])**2*2 + (p[1]-c[1])**2*4 + (p[2]-c[2])**2)
        q = cache[c]
        op[ox + x, oy + y] = (q[0], q[1], q[2], 255)

out.save(OUT)
print(f"ditulis {OUT} — {out.size} RGBA, {len(cache)} warna unik dipetakan ke palet resmi")
