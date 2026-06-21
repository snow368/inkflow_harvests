import json
import os

ENGINE_DIR = os.path.dirname(__file__)
ROOT = os.path.dirname(ENGINE_DIR)

ANCHOR_PATH = os.path.join(
    ROOT,
    "product_anchor_library.json"
)

def load_product_anchor(product_id):

    if not os.path.exists(ANCHOR_PATH):
        return None

    with open(
        ANCHOR_PATH,
        "r",
        encoding="utf-8"
    ) as f:

        data = json.load(f)

    return data.get(product_id)