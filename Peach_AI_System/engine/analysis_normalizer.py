import json
import re

def normalize_analysis(raw):
    """
    Normalize VLM output into fixed schema
    """

    # 如果已经是 dict
    if isinstance(raw, dict):
        data = raw
    else:
        data = _extract_json(raw)

    return _standardize(data)


def _extract_json(text):
    """Try extract JSON from raw VLM output"""
    if not isinstance(text, str):
        return {}

    m = re.search(r"\{.*\}", text, re.DOTALL)
    if not m:
        return {"raw": text}

    try:
        return json.loads(m.group())
    except:
        return {"raw": text}


def _standardize(d):
    """Force stable schema"""

    if not isinstance(d, dict):
        d = {}

    return {
        "composition": _get(d, ["composition", "pose", "framing"]),
        "lighting": _get(d, ["lighting", "light", "illumination"]),
        "background": _get(d, ["background", "bg"]),
        "product_pose": _get(d, ["product_placement", "pose", "orientation"]),
        "materials": _get_list(d, ["materials_visible", "materials"]),
        "color_tone": _get(d, ["color_tone", "tone"]),
        "scene_type": _get(d, ["scene_type", "scene"]),
        "confidence": d.get("confidence", {}),
        "raw": d.get("raw", "")
    }


def _get(d, keys):
    for k in keys:
        if k in d and d[k]:
            return d[k]
    return ""


def _get_list(d, keys):
    for k in keys:
        if k in d and isinstance(d[k], list):
            return d[k]
    return []