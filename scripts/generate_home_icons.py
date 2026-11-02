#!/usr/bin/env python3
"""Create matching Font Awesome Free DNA home-screen icons for MORPHOSPACE."""
from pathlib import Path
from io import BytesIO
from urllib.request import urlopen
from PIL import Image
import cairosvg

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "icons"
# Same Font Awesome Free 6.7.2 solid DNA glyph as the app's icon font (U+F471).
SOURCE = "https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.7.2/svgs/solid/dna.svg"

def glyph():
    with urlopen(SOURCE, timeout=25) as response:
        data = response.read().decode("utf-8")
    if "<svg" not in data or "<path" not in data:
        raise ValueError("Unexpected DNA SVG download")
    return data

def svg_icon(source):
    import re
    match = re.search(r'<svg[^>]*viewBox="([^"]+)"[^>]*>(.*?)</svg>', source, re.S)
    if not match:
        raise ValueError("DNA icon SVG has no viewBox")
    vb, body = match.groups()
    body = body.replace("currentColor", "#8ce9d0")
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<rect width="512" height="512" fill="#071721"/>
<svg x="92" y="67" width="328" height="378" viewBox="{vb}" fill="#8ce9d0">{body}</svg>
</svg>'''

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    vector = svg_icon(glyph())
    (OUT / "favicon.svg").write_text(vector, encoding="utf-8")
    for name, size in (("apple-touch-icon.png",180),("icon-192.png",192),("icon-512.png",512),("icon-maskable-512.png",512)):
        png = cairosvg.svg2png(bytestring=vector.encode(), output_width=size, output_height=size)
        image = Image.open(BytesIO(png)).convert("RGB")
        image.save(OUT / name, optimize=True)
        print(f"{name}: {size}x{size}")
    print("Font Awesome DNA icon artwork generated")

if __name__ == "__main__":
    main()
