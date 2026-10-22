# -*- coding: utf-8 -*-
"""生成插件图标：蓝色渐变圆角方块 + 白色相框图形。"""
import os
from PIL import Image, ImageDraw

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "icons")
os.makedirs(OUT, exist_ok=True)


def lerp(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def make(size):
    ss = 4  # 超采样，边缘更干净
    s = size * ss
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    # 渐变底
    grad = Image.new("RGB", (s, s))
    c1, c2 = (61, 120, 255), (31, 79, 216)
    px = grad.load()
    for y in range(s):
        for x in range(s):
            px[x, y] = lerp(c1, c2, (x + y) / (2.0 * s))
    mask = Image.new("L", (s, s), 0)
    d = ImageDraw.Draw(mask)
    r = int(s * 0.24)
    d.rounded_rectangle([0, 0, s - 1, s - 1], radius=r, fill=255)
    img.paste(grad, (0, 0), mask)

    d = ImageDraw.Draw(img)
    # 相框
    m = int(s * 0.24)
    w = max(ss, int(s * 0.045))
    d.rounded_rectangle([m, m * 1.05, s - m, s - m * 1.05], radius=int(s * 0.06), outline=(255, 255, 255, 255), width=w)
    # 太阳
    cr = int(s * 0.045)
    cx, cy = m + int(s * 0.14), m * 1.05 + int(s * 0.14)
    d.ellipse([cx - cr, cy - cr, cx + cr, cy + cr], fill=(255, 255, 255, 255))
    # 山
    base = s - m * 1.05
    pts = [(m + int(s * 0.04), base - int(s * 0.05)),
           (m + int(s * 0.26), base - int(s * 0.30)),
           (m + int(s * 0.42), base - int(s * 0.10)),
           (m + int(s * 0.55), base - int(s * 0.22)),
           (s - m - int(s * 0.04), base - int(s * 0.05))]
    d.line(pts, fill=(255, 255, 255, 255), width=w, joint="curve")

    return img.resize((size, size), Image.LANCZOS)


for n in (16, 32, 48, 128):
    p = os.path.join(OUT, f"icon{n}.png")
    make(n).save(p)
    print("saved", p)
