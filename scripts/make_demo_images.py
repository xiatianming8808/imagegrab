# -*- coding: utf-8 -*-
"""生成演示用商品图（供 test/demo-shop.html）。"""
import os
from PIL import Image, ImageDraw

BASE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "test", "demo")
os.makedirs(BASE, exist_ok=True)

PALETTE = [
    ("main-1", 800, 800, (222, 233, 255), (37, 82, 210), "主图 01"),
    ("main-2", 800, 800, (255, 232, 214), (176, 87, 20), "主图 02"),
    ("main-3", 800, 800, (214, 245, 231), (12, 122, 78), "主图 03"),
    ("sku-1", 400, 400, (240, 235, 255), (85, 52, 180), "SKU 01"),
    ("sku-2", 400, 400, (255, 238, 240), (168, 40, 66), "SKU 02"),
    ("detail-1", 1200, 800, (232, 240, 250), (32, 64, 112), "细节图 1200×800"),
    ("detail-2", 1200, 800, (250, 240, 230), (120, 72, 24), "细节图 1200×800"),
    ("detail-3", 1600, 900, (230, 246, 240), (24, 96, 72), "长图 1600×900"),
]

for name, w, h, bg, fg, label in PALETTE:
    im = Image.new("RGB", (w, h), bg)
    d = ImageDraw.Draw(im)
    # 简单的“产品”剪影
    m = int(min(w, h) * 0.16)
    d.rounded_rectangle([m, m, w - m, h - m], radius=int(min(w, h) * 0.08), outline=fg, width=max(3, min(w, h) // 120))
    d.ellipse([w // 2 - m // 2, h // 2 - m // 2, w // 2 + m // 2, h // 2 + m // 2], outline=fg, width=max(3, min(w, h) // 140))
    d.text((m + 8, m + 8), label, fill=fg)
    im.save(os.path.join(BASE, name + ".png"))
    print("saved", name, f"{w}x{h}")
