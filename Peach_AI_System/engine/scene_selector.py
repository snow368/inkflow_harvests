"""
Scene Selector — picks scene from knowledge base, integrates with dictionaries.
"""
import os, re, random, json

ENGINE_DIR = os.path.dirname(__file__)
ROOT = os.path.dirname(ENGINE_DIR)
SCENE_PATH = os.path.join(ROOT, "scene_library.md")
DICT_DIR = os.path.join(ROOT, "dictionaries")

_cache = None


def _load_scenes():
    global _cache
    if _cache is not None:
        return _cache

    if not os.path.exists(SCENE_PATH):
        _cache = {}
        return _cache

    with open(SCENE_PATH, encoding="utf-8") as f:
        text = f.read()

    sections = {}
    blocks = re.split(r"^##\s+", text, flags=re.MULTILINE)

    for block in blocks[1:]:
        title = block.split("\n")[0].strip()
        body = "\n".join(block.split("\n")[1:]).strip()
        sections[title] = body

    _cache = sections
    return sections


def list_scenes():
    return list(_load_scenes().keys())


def get_scene(title):
    return _load_scenes().get(title, "")


def _parse_keywords(scene_body):
    keywords = []
    for line in scene_body.split("\n"):
        line = line.strip()
        if "：" in line:
            val = line.split("：", 1)[-1].split("—")[0].split("（")[0].strip()
            if val and len(val) > 2:
                keywords.append(val.lower())
    return keywords


def match_scene(keywords=None, analysis=None, scene_id=None):
    scenes = _load_scenes()
    if not scenes:
        return "Floating Product", "product floating centered"

    candidates = list(scenes.keys())

    # 1. scene_id
    if scene_id:
        for s in candidates:
            if scene_id.upper() in s:
                return s, scenes[s]

    # 2. keyword scoring
    if keywords:
        scored = []
        for s in candidates:
            body = scenes[s].lower()

            score = sum(3 for k in keywords if k.lower() in s.lower())
            score += sum(2 for k in keywords if k.lower() in body)

            scene_kw = _parse_keywords(scenes[s])
            score += sum(1 for k in keywords for sk in scene_kw if k.lower() in sk)

            scored.append((score, s))

        scored.sort(reverse=True)

        if scored and scored[0][0] > 0:
            best = scored[0][1]
            body = scenes[best]

            # ❗ HARD CLEAN: remove product-structure contamination
            body = re.sub(
                r"(needle|cartridge|tattoo|device|product).*",
                "",
                body,
                flags=re.IGNORECASE
            )

            return best, body

    # 3. analysis match
    if analysis:
        for key in ["scene_type", "composition", "background"]:
            val = analysis.get(key, "")
            if val:
                val_lower = val.lower()
                for s in candidates:
                    body = scenes[s].lower()
                    words = val_lower.split()
                    if any(w in body for w in words if len(w) > 3):
                        return s, scenes[s]

    return random.choice(candidates), scenes[random.choice(candidates)]