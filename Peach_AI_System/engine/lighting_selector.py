"""
Lighting Selector — picks lighting setup from lighting_library.md
"""
import os, re, random, json

ENGINE_DIR = os.path.dirname(__file__)
ROOT = os.path.dirname(ENGINE_DIR)
LIGHTING_PATH = os.path.join(ROOT, "lighting_library.md")
DICT_DIR = os.path.join(ROOT, "dictionaries")

_cache = None


def _load_lighting():
    global _cache
    if _cache is not None:
        return _cache

    if not os.path.exists(LIGHTING_PATH):
        _cache = {}
        return _cache

    with open(LIGHTING_PATH, encoding="utf-8") as f:
        text = f.read()

    sections = {}
    blocks = re.split(r"^##\s+", text, flags=re.MULTILINE)

    for block in blocks[1:]:
        title = block.split("\n")[0].strip()
        body = "\n".join(block.split("\n")[1:]).strip()
        sections[title] = body

    _cache = sections
    return sections


def list_lighting():
    return list(_load_lighting().keys())


def get_lighting(title):
    return _load_lighting().get(title, "")


def match_lighting(keywords=None, scene_body="", lighting_id=None):
    lighting = _load_lighting()
    if not lighting:
        return "Soft Diffused", "soft studio lighting"

    candidates = list(lighting.keys())

    # 1. ID match
    if lighting_id:
        for l in candidates:
            if lighting_id.upper() in l:
                body = lighting[l]
                body = re.sub(r"(surgery|medical|hospital|clinic)", "", body, flags=re.IGNORECASE)
                return l, body

    # 2. scene hint match
    if scene_body:
        hints = scene_body.lower()
        scored = []
        for l in candidates:
            body = lighting[l].lower()
            score = sum(2 for w in hints.split() if w in body)
            scored.append((score, l))

        scored.sort(reverse=True)

        if scored and scored[0][0] > 0:
            best = scored[0][1]
            body = lighting[best]
            body = re.sub(r"(surgery|medical|hospital|clinic)", "", body, flags=re.IGNORECASE)
            return best, body

    # 3. fallback
    sel = random.choice(candidates)
    body = lighting[sel]
    body = re.sub(r"(surgery|medical|hospital|clinic)", "", body, flags=re.IGNORECASE)
    return sel, body