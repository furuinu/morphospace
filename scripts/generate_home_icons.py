#!/usr/bin/env python3
"""Generate MORPHOSPACE home-screen PNG icons and matching SVG favicon."""
from __future__ import annotations
import math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

OUT = Path(__file__).resolve().parent.parent / "icons"
TAU = math.tau

def helix(y, side, extent):
    t = (y - 72) / 368
    theta = TAU * (2.10 * t - 0.075) + side * math.pi
    return 256 + 85 * extent * math.cos(theta), math.sin(theta)

def build(size, maskable=False):
    pixel_scale = 2 if size >= 512 else 3
    S = size * pixel_scale
    ratio = S / 512
    def xy(p):
        return tuple(round(v * ratio) for v in p)
    def sw(v):
        return max(1, round(v * ratio))
    def circ(draw, x, y, radius, fill):
        draw.ellipse((round((x-radius)*ratio), round((y-radius)*ratio),
                      round((x+radius)*ratio), round((y+radius)*ratio)), fill=fill)
    back = Image.new('RGB', (S, S))
    pix = back.load()
    for y in range(S):
        dy = (y + .5) / S - .48
        for x in range(S):
            dx = (x + .5) / S - .5
            glow = math.exp(-((dx / .47) ** 2 + (dy / .54) ** 2) * 1.8)
            blue = math.exp(-(((dx - .22) / .35) ** 2 + ((dy + .15) / .43) ** 2) * 2)
            pix[x, y] = (int(3 + 13 * glow + 4 * blue),
                         int(10 + 29 * glow + 5 * blue),
                         int(20 + 40 * glow + 16 * blue))
    bg = back.convert('RGBA')
    extent = .75 if maskable else 1.0
    top_y = 110 if maskable else 78
    bottom_y = 402 if maskable else 434
    def pos(y, side):
        source_y = 72 + (y - top_y) / (bottom_y - top_y) * 368
        return helix(source_y, side, extent)

    # Continuous paths avoid serrated, segmented contours at iPhone icon sizes.
    strands = []
    for side in (0, 1):
        samples = []
        for i in range(401):
            y = top_y + (bottom_y - top_y) * i / 400
            x, z = pos(y, side)
            samples.append((x, y, z))
        strands.append(samples)
    shine = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    bloom = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(shine, 'RGBA')
    g = ImageDraw.Draw(bloom, 'RGBA')
    def path_pts(segment, shift=0):
        return [xy((x + shift, y)) for x, y, z in segment]
    for side, curve in enumerate(strands):
        g.line(path_pts(curve), fill=(80, 220, 210, 65) if side == 0 else (146, 166, 255, 65),
               width=sw(25), joint='curve')
    # Nucleobase ladder, alternating blue/teal halves.
    for i in range(17):
        y = top_y + (bottom_y - top_y) * (i + 1) / 18
        xa, za = pos(y, 0)
        xb, zb = pos(y, 1)
        A, B, M = xy((xa, y)), xy((xb, y)), xy(((xa + xb) / 2, y))
        d.line((A, B), fill=(15, 53, 72, 255), width=sw(10))
        d.line((A, M), fill=(111, 228, 211, 255), width=sw(5))
        d.line((M, B), fill=(159, 180, 255, 255), width=sw(5))
        circ(d, xa, y, 3, (214, 254, 246, 255))
        circ(d, xb, y, 3, (214, 225, 255, 255))
    for side, curve in enumerate(strands):
        d.line(path_pts(curve), fill=(7, 57, 62, 255) if side == 0 else (30, 37, 75, 255),
               width=sw(20), joint='curve')
        d.line(path_pts(curve), fill=(37, 144, 135, 255) if side == 0 else (83, 96, 173, 255),
               width=sw(14), joint='curve')
    for side, curve in enumerate(strands):
        runs, run = [], []
        for pt in curve:
            if pt[2] >= -.02:
                run.append(pt)
            else:
                if len(run) > 1:
                    runs.append(run)
                run = []
        if len(run) > 1:
            runs.append(run)
        for segment in runs:
            d.line(path_pts(segment), fill=(93, 238, 197, 255) if side == 0 else (151, 173, 247, 255),
                   width=sw(17), joint='curve')
            d.line(path_pts(segment, -3), fill=(197, 255, 230, 200) if side == 0 else (232, 236, 255, 205),
                   width=sw(3), joint='curve')
    bg = Image.alpha_composite(bg, bloom.filter(ImageFilter.GaussianBlur(sw(13))))
    bg = Image.alpha_composite(bg, shine)
    return bg.convert('RGB').resize((size, size), Image.Resampling.LANCZOS)

def svg_icon():
    # A true vector favicon sharing the PNG's coordinate system and spatial occlusion.
    def curve(side, front=False):
        parts, run = [], []
        for i in range(401):
            y = 78 + 356 * i / 400
            x, z = helix(72 + (y - 78) / 356 * 368, side, 1)
            if not front or z >= -.02:
                run.append((x, y))
            else:
                if len(run) > 1:
                    parts.append(run)
                run = []
        if len(run) > 1:
            parts.append(run)
        return parts
    def paths(side, front, color, width, xoff=0):
        return ''.join(
            '<path d="' + ' '.join(('M' if j == 0 else 'L') + f'{x+xoff:.2f},{y:.2f}'
                                   for j, (x, y) in enumerate(run)) +
            f'" fill="none" stroke="{color}" stroke-width="{width}" stroke-linecap="round" stroke-linejoin="round"/>'
            for run in curve(side, front)
        )
    lines = [
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">',
        '<defs><radialGradient id="ocean"><stop stop-color="#163247"/><stop offset="1" stop-color="#030916"/></radialGradient></defs>',
        '<rect width="512" height="512" fill="url(#ocean)"/>'
    ]
    for i in range(17):
        y = 78 + 356 * (i + 1) / 18
        xa, _ = helix(72 + (y - 78) / 356 * 368, 0, 1)
        xb, _ = helix(72 + (y - 78) / 356 * 368, 1, 1)
        lines.append(f'<path d="M{xa:.2f},{y:.2f}H{xb:.2f}" stroke="#a3e8dc" stroke-width="5" stroke-linecap="round"/>')
    for side, dark, color, front, highlight in [
        (0, '#073b40', '#259087', '#5deec5', '#c5ffe6'),
        (1, '#1e254b', '#5360ad', '#97adf7', '#e8ecff')
    ]:
        lines.append(paths(side, False, dark, 20))
        lines.append(paths(side, False, color, 14))
        lines.append(paths(side, True, front, 17))
        lines.append(paths(side, True, highlight, 3, -3))
    lines.append('</svg>')
    return '\n'.join(lines) + '\n'

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for filename, size, maskable in (
        ('apple-touch-icon.png', 180, False),
        ('icon-192.png', 192, False),
        ('icon-512.png', 512, False),
        ('icon-maskable-512.png', 512, True),
    ):
        build(size, maskable).save(OUT / filename, format='PNG', optimize=True)
        print(f'{filename}: {size}x{size}')
    (OUT / 'favicon.svg').write_text(svg_icon(), encoding='utf-8')
    print('favicon.svg: 512x512 vector')

if __name__ == '__main__':
    main()
