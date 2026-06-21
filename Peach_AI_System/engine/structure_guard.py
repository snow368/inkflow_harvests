# structure_guard.py

from product_ontology import get_product


def build_structure_lock(product_id, pose=None):
    product = get_product(product_id)

    if not product:
        return {
            "identity_lock": [
                "[STRUCTURE_LOCK: UNKNOWN PRODUCT]"
            ],
            "geometry": {},
            "poses": {}
        }

    lock = {
        "identity_lock": [
            "[STRUCTURE_LOCK: DO NOT CHANGE PRODUCT IDENTITY]",
            f"PRODUCT CATEGORY: {product['category']}",
            "ABSOLUTE RULE: DO NOT TRANSFORM INTO OTHER OBJECT TYPES"
        ] + product["identity_lock"],

        "geometry": product.get("geometry", {}),

        "poses": {
            "handheld": "held in hand at 45 degree angle",
            "flat": "lying flat on surface",
            "floating": "floating centered in frame"
        }
    }

    # pose override
    if pose:
        lock["poses"]["selected"] = lock["poses"].get(pose, "")

    return lock