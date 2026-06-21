"""
Peach Tattoo Products — Pillow-based Image Processor
方案C：实拍产品图 → 抠图 → 加专业背景 → 加文字 → IG 1080x1080

用法：
    python image_processor.py process --source "G:/PMU/Peach Pictures" --series CON --count 5
    python image_processor.py process --source "G:/PMU/Peach Pictures/COG" --series COG --count 5
    python image_processor.py process --source "G:/PMU/AES白底图" --series AES --count 5
    python image_processor.py preview --source "G:/PMU/Peach Pictures/微信图片_20260528154352_449_619.jpg" --series CON

输出目录：F:/inkflow app/InkFlow_Project/peach_photos/output/
"""

import os
import sys
import traceback
import json
import argparse
import random
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance, ImageChops
from datetime import datetime

# =========================
# 路径配置
# =========================
ROOT = Path(__file__).parent
OUTPUT_DIR = ROOT / "output"
TEMPLATE_DIR = ROOT / "templates"
OUTPUT_DIR.mkdir(exist_ok=True)

# =========================
# 品牌配色方案
# =========================
BRAND_STYLES = {
    "CON": {  # 粉+绿 主线
        "brand_name": "PEACH",
        "sub_name": "CON SERIES",
        "primary": "#FF6B9D",      # 粉
        "secondary": "#7EC8A0",    # 绿
        "accent": "#FFB347",       # 暖橙点缀
        "bg_type": "dark_gradient",
        "bg_colors": ["#0D0D0D", "#1A0A12", "#0A1210"],
        "light_color": "#FF6B9D",
        "light_color2": "#7EC8A0",
        "glow_color": "#FF6B9D44",
        "slogan": "CONSISTENCY IS NOT OPTIONAL",
        "style": "vivid_bold",
        "font_size_title": 42,
        "font_size_slogan": 20,
    },
    "COG": {  # 白+灰 高精度
        "brand_name": "PEACH",
        "sub_name": "COG SERIES",
        "primary": "#808080",      # 灰
        "secondary": "#F0F0F0",    # 白
        "accent": "#C0C0C0",       # 银
        "bg_type": "silver_gradient",
        "bg_colors": ["#1A1A1A", "#2A2A2A", "#1A1A1A"],
        "light_color": "#C0C0C0",
        "light_color2": "#E0E0E0",
        "glow_color": "#C0C0C033",
        "slogan": "PRECISION IN EVERY STROKE",
        "style": "clean_professional",
        "font_size_title": 40,
        "font_size_slogan": 18,
    },
    "AES": {  # 粉+透明 PMU
        "brand_name": "PEACH",
        "sub_name": "AES PMU SERIES",
        "primary": "#FF9EC3",      # 浅粉
        "secondary": "#FFFFFF",    # 透明感白
        "accent": "#FFB6C1",       # 柔粉
        "bg_type": "pink_glow",
        "bg_colors": ["#1A0A10", "#0D0D0D", "#1A0A10"],
        "light_color": "#FF9EC3",
        "light_color2": "#FFB6C1",
        "glow_color": "#FF9EC355",
        "slogan": "PERFECTION IN THE FINEST DETAIL",
        "style": "elegant_feminine",
        "font_size_title": 38,
        "font_size_slogan": 17,
    },
}

# =========================
# 文案模板
# =========================
COPY_TEMPLATES = {
    "CON": [
        {"headline": "BUILT FOR", "sub": "CONSISTENT PERFORMANCE", "tagline": "PEACH CON SERIES"},
        {"headline": "EVERY SESSION", "sub": "EVERY PATIENT", "tagline": "PEACH CON SERIES"},
        {"headline": "INK FLOW", "sub": "MAXIMUM CONTROL", "tagline": "PEACH CON SERIES"},
        {"headline": "PRECISION", "sub": "WITHOUT COMPROMISE", "tagline": "PEACH CON SERIES"},
        {"headline": "RELIABLE.", "sub": "REPEATABLE. PROFESSIONAL.", "tagline": "PEACH CON SERIES"},
    ],
    "COG": [
        {"headline": "HIGH DEFINITION", "sub": "FINE LINE SPECIALIST", "tagline": "PEACH COG SERIES"},
        {"headline": "CLEAN LINES", "sub": "SHARP SHADOWS", "tagline": "PEACH COG SERIES"},
        {"headline": "DETAIL ORIENTED", "sub": "PERFORMANCE DRIVEN", "tagline": "PEACH COG SERIES"},
        {"headline": "CRAFTED FOR", "sub": "FINESSE", "tagline": "PEACH COG SERIES"},
        {"headline": "EXACTLY WHAT", "sub": "YOUR NEEDLE NEEDS", "tagline": "PEACH COG SERIES"},
    ],
    "AES": [
        {"headline": "PMU PERFECT", "sub": "FINEST DETAIL WORK", "tagline": "PEACH AES PMU"},
        {"headline": "GENTLE TOUCH", "sub": "LASTING RESULT", "tagline": "PEACH AES PMU"},
        {"headline": "BROW TO LIP", "sub": "TRUST THE DETAIL", "tagline": "PEACH AES PMU"},
        {"headline": "ELEGANCE IN", "sub": "EVERY NEEDLE", "tagline": "PEACH AES PMU"},
        {"headline": "DELICATE BY DESIGN", "sub": "PROFESSIONAL PMU", "tagline": "PEACH AES PMU"},
    ],
}

# =========================
# 背景生成器
# =========================

def create_dark_gradient_bg(brand):
    """深色渐变背景 + 彩色光晕 — 适用于所有系列"""
    style = BRAND_STYLES[brand]
    bg = Image.new("RGB", (1080, 1080), style["bg_colors"][0])
    draw = ImageDraw.Draw(bg)
    
    # 多层渐变
    for y in range(1080):
        ratio = y / 1080
        r = int(int(style["bg_colors"][0][1:3], 16) * (1-ratio) + int(style["bg_colors"][1][1:3], 16) * ratio)
        g = int(int(style["bg_colors"][0][3:5], 16) * (1-ratio) + int(style["bg_colors"][1][3:5], 16) * ratio)
        b = int(int(style["bg_colors"][0][5:7], 16) * (1-ratio) + int(style["bg_colors"][1][5:7], 16) * ratio)
        draw.line([(0, y), (1080, y)], fill=(r, g, b))
    
    # 底部光晕
    cx, cy = 540, 700
    color = tuple(int(style["light_color"][i:i+2], 16) for i in (1, 3, 5))
    
    # 光晕叠加 — 用椭圆渐变替代像素循环（快得多）
    glow_img = Image.new("RGBA", (1080, 1080), (0, 0, 0, 0))
    draw_g = ImageDraw.Draw(glow_img)
    for r in range(400, 0, -4):
        intensity = int(60 * (1 - r/400))
        draw_g.ellipse([cx-r, cy-r, cx+r, cy+r], outline=(*color, intensity), width=4)
    
    bg_alpha = bg.convert("RGBA")
    bg_alpha = ImageChops.add(bg_alpha, glow_img)
    return bg_alpha.convert("RGB")


def create_silver_bg(brand):
    """银灰渐变背景 — COG 专用"""
    style = BRAND_STYLES[brand]
    bg = Image.new("RGB", (1080, 1080), "#222222")
    draw = ImageDraw.Draw(bg)
    
    # 金属质感渐变
    for y in range(1080):
        ratio = y / 1080
        val = int(26 + 20 * (1 - abs(ratio - 0.5) * 2))
        draw.line([(0, y), (1080, y)], fill=(val, val, val + 2))
    
    # 银色光晕
    cx, cy = 540, 540
    glow_img = Image.new("RGBA", (1080, 1080), (0, 0, 0, 0))
    draw_g = ImageDraw.Draw(glow_img)
    for r in range(350, 0, -2):
        alpha = int(30 * (350-r)/350)
        draw_g.ellipse([cx-r, cy-r, cx+r, cy+r], outline=(192, 192, 192, alpha), width=3)
    
    bg_rgba = bg.convert("RGBA")
    bg_rgba = ImageChops.add(bg_rgba, glow_img)
    return bg_rgba.convert("RGB")


def create_pink_glow_bg(brand):
    """粉色柔光背景 — AES PMU 专用"""
    style = BRAND_STYLES[brand]
    bg = Image.new("RGB", (1080, 1080), "#1A0A10")
    draw = ImageDraw.Draw(bg)
    
    for y in range(1080):
        ratio = y / 1080
        r = int(26 * (1-ratio) + 20 * ratio)
        g = int(10 * (1-ratio) + 15 * ratio)
        b = int(16 * (1-ratio) + 24 * ratio)
        draw.line([(0, y), (1080, y)], fill=(r, g, b))
    
    # 粉色光晕
    cx, cy = 540, 500
    glow_img = Image.new("RGBA", (1080, 1080), (0, 0, 0, 0))
    for y in range(1080):
        for x in range(1080):
            dist = ((x-cx)**2 + (y-cy)**2)**0.5
            if dist < 450:
                intensity = int(50 * (1 - dist/450))
                glow_img.putpixel((x, y), (255, 158, 195, intensity))
    
    bg_rgba = bg.convert("RGBA")
    bg_rgba = ImageChops.add(bg_rgba, glow_img)
    return bg_rgba.convert("RGB")


def create_background(brand):
    """根据品牌选择背景"""
    if brand == "COG":
        return create_silver_bg(brand)
    elif brand == "AES":
        return create_pink_glow_bg(brand)
    else:
        return create_dark_gradient_bg(brand)


# =========================
# 产品放置
# =========================

def add_product_to_image(bg_img, product_img, brand):
    """将产品放在背景中央，调整大小和效果"""
    # 目标尺寸
    target_size = (500, 500)
    
    # 产品缩放到目标尺寸
    product = product_img.copy()
    product.thumbnail(target_size, Image.LANCZOS)
    
    # 添加柔和阴影
    shadow = Image.new("RGBA", product.size, (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    sw, sh = product.size
    for offset in range(0, 15):
        alpha = int(40 * (1 - offset/15))
        shadow_draw.ellipse(
            [offset+2, offset+2, offset+sw-2, offset+sh-2],
            fill=(0, 0, 0, alpha)
        )
    
    # 合并背景 + 阴影 + 产品
    result = bg_img.copy()
    result_rgba = result.convert("RGBA")
    
    # 产品居中
    paste_x = (1080 - sw) // 2
    paste_y = (1080 - sh) // 2
    
    # 先贴阴影
    shadow_resized = shadow.resize(product.size, Image.LANCZOS)
    result_rgba.paste(shadow_resized, (paste_x + 8, paste_y + 8), shadow_resized)
    
    # 产品加轻微发光效果
    product_rgba = product.convert("RGBA")
    product_enhanced = ImageEnhance.Brightness(product_rgba)
    product_enhanced = product_enhanced.enhance(1.1)
    product_enhanced = ImageEnhance.Contrast(product_enhanced)
    product_enhanced = product_enhanced.enhance(1.05)
    
    result_rgba.paste(product_enhanced, (paste_x, paste_y), product_rgba)
    result = result_rgba.convert("RGB")
    
    return result


# =========================
# 文字排版
# =========================

def add_text_layer(result_img, brand, template):
    """添加文字层 — 大字标题 + 品牌标语"""
    style = BRAND_STYLES[brand]
    draw = ImageDraw.Draw(result_img)
    
    # 尝试加载字体
    try:
        title_font = ImageFont.truetype("arial.ttf", style["font_size_title"])
        slogan_font = ImageFont.truetype("arial.ttf", style["font_size_slogan"])
        brand_font = ImageFont.truetype("arial.ttf", 16)
    except:
        try:
            title_font = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", style["font_size_title"])
            slogan_font = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", style["font_size_slogan"])
            brand_font = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 16)
        except:
            title_font = ImageFont.load_default()
            slogan_font = ImageFont.load_default()
            brand_font = ImageFont.load_default()
    
    primary_rgb = tuple(int(style["primary"][i:i+2], 16) for i in (1, 3, 5))
    
    # 1) 大字标题 (顶部居中)
    head_lines = [template["headline"], template["sub"]]
    y_pos = 60
    
    for line in head_lines:
        bbox = draw.textbbox((0, 0), line, font=title_font)
        text_w = bbox[2] - bbox[0]
        x_pos = (1080 - text_w) // 2
        draw.text((x_pos, y_pos), line, font=title_font, fill=primary_rgb)
        y_pos += style["font_size_title"] + 10
    
    # 2) 品牌名 (标题下方，较小)
    brand_text = template.get("tagline", style["brand_name"])
    bbox = draw.textbbox((0, 0), brand_text, font=brand_font)
    text_w = bbox[2] - bbox[0]
    x_pos = (1080 - text_w) // 2
    draw.text((x_pos, y_pos), brand_text, font=brand_font, fill=(200, 200, 200))
    y_pos += 30
    
    # 3) 分割线
    line_w = 80
    line_x = (1080 - line_w) // 2
    draw.line([(line_x, y_pos), (line_x + line_w, y_pos)], fill=primary_rgb, width=2)
    y_pos += 20
    
    # 4) 标语 (底部)
    slogan = style["slogan"]
    bbox = draw.textbbox((0, 0), slogan, font=slogan_font)
    text_w = bbox[2] - bbox[0]
    x_pos = (1080 - text_w) // 2
    draw.text((x_pos, y_pos), slogan, font=slogan_font, fill=(160, 160, 160))
    
    # 5) 品牌角标 (右下角)
    corner = "PEACH"
    bbox = draw.textbbox((0, 0), corner, font=brand_font)
    text_w = bbox[2] - bbox[0]
    draw.text((1080 - text_w - 20, 1040), corner, font=brand_font, fill=(100, 100, 100))
    
    return result_img


# =========================
# 光影装饰
# =========================

def add_lighting_decor(result_img, brand):
    """添加光影装饰线条"""
    style = BRAND_STYLES[brand]
    rgb = tuple(int(style["primary"][i:i+2], 16) for i in (1, 3, 5))
    
    draw = ImageDraw.Draw(result_img)
    
    # 顶部装饰线
    draw.line([(40, 30), (100, 30)], fill=rgb, width=3)
    
    # 底部装饰线
    draw.line([(980, 1050), (1040, 1050)], fill=rgb, width=3)
    
    return result_img


# =========================
# 主处理流程
# =========================

def process_single_product(product_path, brand, output_name=None):
    """处理单张产品图"""
    if output_name is None:
        output_name = f"{brand}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    
    try:
        product = Image.open(product_path).convert("RGBA")
    except Exception as e:
        raise ValueError(f"无法打开图片: {e}")
    
    # 如果产品有白底，尝试自动抠白底
    product = auto_remove_white_bg(product)
    
    # 创建背景
    bg = create_background(brand)
    
    # 放置产品
    result = add_product_to_image(bg, product, brand)
    
    # 添加文字
    templates = COPY_TEMPLATES[brand]
    template = random.choice(templates)
    result = add_text_layer(result, brand, template)
    
    # 光影装饰
    result = add_lighting_decor(result, brand)
    
    # 保存
    output_path = OUTPUT_DIR / f"{output_name}.png"
    result.save(output_path, "PNG", quality=95)
    print(f"  ✓ 已保存: {output_path}")
    
    return output_path


def auto_remove_white_bg(product_rgba, threshold=240):
    """自动移除白色/浅色背景"""
    # 分离通道
    r, g, b, a = product_rgba.split()
    
    # 计算与白色的差异
    white = Image.new("L", product_rgba.size, 255)
    diff = ImageChops.difference(r, white)
    diff_g = ImageChops.difference(g, white)
    diff_b = ImageChops.difference(b, white)
    
    # 合并差异
    combined = ImageChops.add(diff, diff_g)
    combined = ImageChops.add(combined, diff_b)
    
    # 阈值处理
    combined = combined.point(lambda x: 255 if x > 3 * threshold else 0)
    
    # 柔化边缘
    combined = combined.filter(ImageFilter.GaussianBlur(int(2)))
    combined = combined.point(lambda x: 255 if x > 50 else 0)
    
    # 应用到 alpha 通道
    product_rgba.putalpha(combined)
    return product_rgba


def process_directory(source_dir, brand, count=5, pattern=None):
    """批量处理目录下所有图片"""
    source = Path(source_dir)
    if not source.exists():
        print(f"✗ 路径不存在: {source}")
        return
    
    # 收集图片
    if pattern:
        images = list(source.glob(pattern))
    else:
        images = list(source.glob("*"))
    
    images = [p for p in images if p.suffix.lower() in ('.png', '.jpg', '.jpeg', '.webp')]
    
    if not images:
        print(f"✗ 没有找到图片: {source}")
        return
    
    print(f"\n找到 {len(images)} 张图片，处理 {min(count, len(images))} 张")
    print(f"品牌: {brand}")
    print(f"输出: {OUTPUT_DIR}\n")
    
    selected = random.sample(images, min(count, len(images))) if len(images) > count else images
    
    results = []
    for i, img_path in enumerate(selected, 1):
        out_name = f"{brand}_{i:03d}_{img_path.stem}"
        try:
            path = process_single_product(img_path, brand, out_name)
            results.append(path)
        except Exception as e:
            print(f"  ✗ 处理失败 {img_path.name}: {e}")
            with open(OUTPUT_DIR / "error.log", "a", encoding="utf-8") as f:
                f.write(f"=== {img_path.name} ===\n")
                traceback.print_exc(file=f)
                f.write("\n")
    
    print(f"\n完成! 生成了 {len(results)} 张图片")
    print(f"保存在: {OUTPUT_DIR}")
    return results


# =========================
# CLI
# =========================

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Peach Tattoo Products Image Processor")
    subparsers = parser.add_subparsers(dest="command")
    
    # process 命令
    process_parser = subparsers.add_parser("process", help="批量处理产品图")
    process_parser.add_argument("--source", required=True, help="输入目录或单个图片路径")
    process_parser.add_argument("--series", required=True, choices=["CON", "COG", "AES"], help="产品系列")
    process_parser.add_argument("--count", type=int, default=5, help="处理数量")
    process_parser.add_argument("--pattern", default=None, help="glob 模式，如 *.jpg")
    
    # preview 命令
    preview_parser = subparsers.add_parser("preview", help="预览单张图的处理效果")
    preview_parser.add_argument("--source", required=True, help="图片路径")
    preview_parser.add_argument("--series", required=True, choices=["CON", "COG", "AES"], help="产品系列")
    preview_parser.add_argument("--variant", type=int, default=3, help="生成变体数量")
    
    args = parser.parse_args()
    
    if args.command == "process":
        results = process_directory(args.source, args.series, args.count, args.pattern)
    elif args.command == "preview":
        print(f"预览: {args.source}")
        print(f"系列: {args.series}")
        print(f"变体: {args.variant}\n")
        
        for i in range(args.variant):
            out_name = f"preview_{args.series}_variant{i+1}"
            process_single_product(args.source, args.series, out_name)
    else:
        parser.print_help()
