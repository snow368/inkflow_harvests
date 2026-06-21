# style/style_extractor.py

import numpy as np

def extract_style_tags(analysis: dict):
    """
    从VLM analysis提取风格标签（你现在已有analysis）
    """

    tags = []

    text = str(analysis).lower()

    if "white background" in text:
        tags.append("white background")

    if "soft" in text:
        tags.append("soft shadow")

    if "high contrast" in text:
        tags.append("high contrast")

    if "center" in text:
        tags.append("centered composition")

    if "dark" in text:
        tags.append("dark background")

    if "studio" in text:
        tags.append("studio lighting")

    return tags