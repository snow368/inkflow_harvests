"""
Quality Scorer V1 — aesthetic + brand + commercial evaluation
"""

import json
import re


def _score_range():
    return 50  # baseline


def score_image_analysis(analysis: dict, prompt: str):
    """
    V1 rule-based scoring system (no ML yet)
    """

    issues = []
    strengths = []

    # -------------------------
    # defaults
    # -------------------------
    aesthetic = _score_range()
    brand = _score_range()
    commercial = _score_range()
    ins = _score_range()

    text_blob = json.dumps(analysis).lower()
    prompt_blob = prompt.lower()

    # -------------------------
    # AESTHETIC SCORE
    # -------------------------
    if "lighting" in text_blob:
        if "soft" in text_blob or "diffused" in text_blob:
            aesthetic += 15
            strengths.append("good lighting softness")
        if "shadow" in text_blob:
            aesthetic += 10
            strengths.append("shadow depth present")

    if "composition" in text_blob:
        if "center" in text_blob or "diagonal" in text_blob:
            aesthetic += 10

    if "background" in text_blob:
        if "clean" in text_blob or "white" in text_blob or "black" in text_blob:
            aesthetic += 10
            strengths.append("clean background")

    # penalty
    if "clutter" in text_blob or "messy" in text_blob:
        aesthetic -= 15
        issues.append("cluttered background")

    # -------------------------
    # BRAND CONSISTENCY
    # -------------------------
    if "syringe" in text_blob or "needle" in text_blob:
        if "peach" in prompt_blob:
            brand -= 30
            issues.append("possible structure confusion")

    if "geometry" in text_blob:
        brand += 10

    if "product_pose" in analysis:
        brand += 10

    # -------------------------
    # COMMERCIAL SCORE
    # -------------------------
    if "studio" in text_blob:
        commercial += 15

    if "catalog" in text_blob or "ecommerce" in text_blob:
        commercial += 15

    if "lighting" in text_blob and "even" in text_blob:
        commercial += 10

    # penalty for low-end look
    if "blurry" in text_blob:
        commercial -= 40
        issues.append("blurry image")

    # -------------------------
    # INS READINESS
    # -------------------------
    ins = (aesthetic + brand + commercial) / 3

    if ins > 80:
        strengths.append("ready for instagram post")
    elif ins < 60:
        issues.append("needs refinement before posting")

    # clamp
    def clamp(x):
        return max(0, min(100, x))

    return {
        "aesthetic_score": clamp(aesthetic),
        "brand_consistency": clamp(brand),
        "commercial_score": clamp(commercial),
        "ins_readiness": clamp(ins),
        "issues": issues,
        "strengths": strengths
    }