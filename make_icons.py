from PIL import Image, ImageDraw, ImageFont
import os

INK = (23, 21, 15, 255)       # near-black ink well
VERD = (107, 143, 123, 255)   # verdigris
BONE = (237, 231, 216, 255)   # bone paper

def make_icon(size, path, maskable=False):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    pad = int(size * 0.06) if maskable else 0
    d.rounded_rectangle([pad, pad, size - pad, size - pad],
                         radius=int(size * (0.22 if maskable else 0.20)),
                         fill=INK)

    # A single asymmetric ink stroke, like a scribe's flourish under a "P"
    cx, cy = size / 2, size / 2
    font_size = int(size * 0.52)
    font = None
    for candidate in [
        "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf",
    ]:
        if os.path.exists(candidate):
            font = ImageFont.truetype(candidate, font_size)
            break
    if font is None:
        font = ImageFont.load_default()

    letter = "P"
    bbox = d.textbbox((0, 0), letter, font=font)
    w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
    d.text((cx - w / 2 - bbox[0], cy - h / 2 - bbox[1] - size * 0.03), letter,
           font=font, fill=BONE)

    # underline flourish in verdigris — the "revision mark"
    line_y = cy + size * 0.20
    d.line([(cx - size * 0.16, line_y), (cx + size * 0.20, line_y - size * 0.015)],
           fill=VERD, width=max(2, int(size * 0.035)))

    img.save(path)

os.makedirs("/home/claude/palimpsest/icons", exist_ok=True)
make_icon(192, "/home/claude/palimpsest/icons/icon-192.png")
make_icon(512, "/home/claude/palimpsest/icons/icon-512.png")
make_icon(512, "/home/claude/palimpsest/icons/icon-maskable-512.png", maskable=True)
print("done")
