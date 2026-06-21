# product_visual_library.py

PRODUCT_VISUAL_LIBRARY = {
    "peach_cartridge": {
        # =========================
        # 基础身份（绝对锁定）
        # =========================
        "name": "Peach Tattoo Cartridge",
        "category": "tattoo_machine_cartridge",
        "description": "professional tattoo machine ink cartridge module",

        # =========================
        # 视觉结构锚点（最重要）
        # =========================
        "visual_anchor": [
            "elongated cylindrical cartridge body",
            "needle tip at front end",
            "transparent ink chamber section",
            "plastic housing with ergonomic grip",
            "metal connector interface at rear",
            "industrial precision tool design"
        ],

        # =========================
        # 结构强约束（防跑偏核心）
        # =========================
        "structure_lock": [
            "must remain tattoo cartridge form factor",
            "cannot become bottle, container, cosmetic packaging",
            "cannot become electronic device or gadget",
            "cannot become pen, marker, or syringe",
            "maintain elongated industrial tool geometry"
        ],

        # =========================
        # 视觉比例
        # =========================
        "proportion": {
            "type": "elongated",
            "length_ratio": "5:1 to 8:1",
            "thickness": "thin cylindrical body"
        },

        # =========================
        # 材质定义（帮助模型稳定）
        # =========================
        "materials": [
            "medical grade plastic",
            "transparent polymer",
            "brushed metal connector",
            "semi-gloss housing"
        ],

        # =========================
        # 禁止类别（兜底）
        # =========================
        "forbidden_domains": [
            "cosmetic product",
            "makeup packaging",
            "skincare bottle",
            "perfume container",
            "electronics",
            "consumer gadget",
            "usb device",
            "pen or marker",
            "medical syringe",
            "dropper bottle"
        ],

        # =========================
        # 使用提示（给 prompt builder）
        # =========================
        "prompt_hint": [
            "ultra realistic product photography",
            "studio lighting",
            "commercial advertising",
            "macro detail focus",
            "sharp industrial design"
        ]
    }
}


def get_product(product_id: str):
    """
    Return product definition safely
    """
    return PRODUCT_VISUAL_LIBRARY.get(product_id, None)


def list_products():
    return list(PRODUCT_VISUAL_LIBRARY.keys())