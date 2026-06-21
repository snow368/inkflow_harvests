import os
import sys
import json
import argparse

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from prompt_builder import build_prompt
from generation_client import generate_and_save


# =========================
# ANALYSIS (fallback safe)
# =========================
try:
    from analysis import analyze_image
except:
    def analyze_image(x):
        print("⚠️ fallback analysis")
        return {
            "composition": "clean centered product shot",
            "lighting": "soft studio lighting",
            "background": "white background",
            "color_tone": "brand consistent tone"
        }


# =========================
# PIPELINE
# =========================
def run_pipeline(image_path, product, pose):

    analysis = analyze_image(image_path)

    final_prompt = build_prompt(
        analysis=analysis,
        product=product,
        pose=pose
    )

    return {
        "analysis": analysis,
        "final_prompt": final_prompt
    }


# =========================
# GENERATION
# =========================
def run_with_generation(image_path, product, pose, model="gpt"):

    print("\n=== PIPELINE START ===")
    print("API KEY:", os.getenv("OPENAI_API_KEY"))

    result = run_pipeline(image_path, product, pose)

    gen = generate_and_save(
        model=model,
        prompt=result["final_prompt"],
        negative_prompt="blurry, wrong product, cartoon, toy, low quality"
    )

    result["generation"] = gen

    print("\n=== DONE ===")
    return result


# =========================
# CLI
# =========================
if __name__ == "__main__":

    parser = argparse.ArgumentParser()

    parser.add_argument("image")
    parser.add_argument("--product", required=True)
    parser.add_argument("--pose", required=True)
    parser.add_argument("--generate", default="gpt")

    args = parser.parse_args()

    result = run_with_generation(
        args.image,
        args.product,
        args.pose,
        model=args.generate
    )

    print(json.dumps(result, indent=2, ensure_ascii=False))