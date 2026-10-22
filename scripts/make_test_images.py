# -*- coding: utf-8 -*-
"""生成测试用图片，供 test/test-page.html 使用。"""
import os
from PIL import Image, ImageDraw

BASE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "test", "img")
os.makedirs(BASE, exist_ok=True)

SPECS = [
    ("main-600x400.png", 600, 400, (219, 231, 255), (47, 107, 255)),
    ("detail-800x600.png", 800, 600, (255, 231, 209), (214, 122, 44)),
    ("detail-1600x1200.png", 1600, 1200, (216, 245, 230), (18, 138, 92)),
    ("pixel-1x1.png", 1, 1, (255, 255, 255), (255, 255, 255)),
    ("logo-32.png", 32, 32, (238, 242, 251), (47, 107, 255)),
]

for name, w, h, bg, fg in SPECS:
    im = Image.new("RGB", (w, h), bg)
    d = ImageDraw.Draw(im)
    if w >= 64:
        d.rectangle([4, 4, w - 5, h - 5], outline=fg, width=max(2, w // 200))
        d.text((w // 2 - len(name) * 3, h // 2 - 6), name, fill=fg)
    im.save(os.path.join(BASE, name))
    print("saved", name, f"{w}x{h}")
