# product_ontology.py

PRODUCTS = {
    "peach_cartridge": {
        "name": "Peach Tattoo Cartridge",
        "category": "tattoo cartridge system",
        "function": "ink delivery module for tattoo machine",

        # =========================
        # VISUAL ANCHOR（视觉锚点）
        # =========================
        "visual_anchor": [
            "cylindrical cartridge body",
            "metal needle tip",
            "transparent ink chamber",
            "mounted tattoo machine component",
            "pink and green plastic housing"
        ],

        # =========================
        # HARD IDENTITY LOCK（核心）
        # =========================
        "identity_lock": [
            "THIS IS A TATTOO CARTRIDGE SYSTEM",
            "ABSOLUTE RULE: DO NOT CHANGE PRODUCT CATEGORY",
            "ABSOLUTE RULE: DO NOT TRANSFORM INTO OTHER PRODUCT TYPES",
            "DO NOT REINTERPRET AS ANY OTHER OBJECT"
        ],

        # =========================
        # FORBIDDEN DOMAINS（关键新增）
        # =========================
        "forbidden_domains": [
            "electronic device",
            "consumer electronics",
            "gadget",
            "wearable device",
            "audio device",
            "smart device",
            "mobile device",
            "remote control",
            "battery powered gadget"
        ],

        # =========================
        # GEOMETRY LOCK
        # =========================
        "geometry": {
            "body_shape": "cylindrical cartridge module",
            "needle_direction": "up",
            "structure": "needle + ink chamber + housing integrated system"
        },

        # =========================
        # POSITIONS
        # =========================
        "poses": {
            "handheld": "held in human hand at 45 degree angle",
            "flat": "lying flat on surface",
            "floating": "centered floating studio shot"
        }
    }
}


def get_product(product_id: str):
    return PRODUCTS.get(product_id, None)