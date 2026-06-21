import os
import requests
from PIL import Image
from io import BytesIO

# =========================
# ENV
# =========================
API_KEY = os.getenv("OPENAI_API_KEY")
BASE_URL = "https://api.cayapi.top/v1/images/generations"


# =========================
# MODEL ROUTER
# =========================
MODEL_MAP = {
    "chatgpt5.5": {
        "model": "gpt-image-1",
        "base_url": "https://api.cayapi.top/v1/images/generations"
    },
    "gpt": {
        "model": "gpt-image-1"
    },
    "openai": {
        "model": "gpt-image-1",
        "base_url": "https://api.openai.com/v1/images/generations"
    },
    "qwen": {
        "model": "Qwen/Qwen-Image"
    }
}


# =========================
# CORE GENERATION
# =========================
def generate(model_key, prompt, negative_prompt=None, ref_image_path=None, **kwargs):

    if not API_KEY:
        raise ValueError("OPENAI_API_KEY is empty")

    config = MODEL_MAP.get(model_key, MODEL_MAP["gpt"])

    url = config.get("base_url", BASE_URL)

    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": config["model"],
        "prompt": prompt,
        "size": "1024x1024"
    }

    r = requests.post(url, json=payload, headers=headers)

    print("\n🔵 RAW RESPONSE:\n", r.text)

    data = r.json()

    # =========================
    # SAFE PARSE (兼容所有API)
    # =========================
    try:
        item = data["data"][0]

        if "b64_json" in item:
            import base64
            img = Image.open(BytesIO(base64.b64decode(item["b64_json"])))
        else:
            img_url = item["url"]
            img = Image.open(BytesIO(requests.get(img_url).content))

    except Exception as e:
        raise ValueError(f"Bad API response: {data}") from e

    return save_image(img)


# =========================
# SAVE
# =========================
def save_image(img):
    os.makedirs("outputs", exist_ok=True)

    path = f"outputs/gen_{os.getpid()}.png"
    img.save(path)

    print("\n✅ SAVED:", path)
    return path


# =========================
# PUBLIC WRAPPER
# =========================
def generate_and_save(model, prompt, negative_prompt="", ref_image_path=None, **kwargs):

    path = generate(model, prompt, negative_prompt, ref_image_path, **kwargs)

    return {
        "path": path
    }