"""
Peach 管体透明修复 - 正确 API 格式
qwen-image-edit-max 通过 multimodal-generation API 调用
"""
import base64, json, os, sys, time, requests

API_KEY = "sk-3bc1604a4d1b41c0b5ab0a6ea6dfe664"
INPUT_IMG = os.path.join(os.path.dirname(__file__), "data", "generated_samples", "peach_composite_simple2.png")
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "data", "generated_samples")

def try_edit(name, prompt, model="qwen-image-edit-max"):
    print(f"\n{'='*60}")
    print(f"[{name}]")
    print(f"Model: {model}")
    print(f"Prompt: {prompt[:80]}...")
    print('='*60)

    # Encode image
    with open(INPUT_IMG, "rb") as f:
        img_b64 = base64.b64encode(f.read()).decode("utf-8")
    data_uri = f"data:image/png;base64,{img_b64}"

    # Try multimodal-generation format
    url = "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation"
    body = {
        "model": model,
        "input": {
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {"image": data_uri},
                        {"text": prompt}
                    ]
                }
            ]
        }
    }
    headers = {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}

    # Wait before calling to avoid rate limit
    time.sleep(3)

    print("Calling API...")
    resp = requests.post(url, headers=headers, json=body, timeout=120)
    data = resp.json()
    print(f"Status: {resp.status_code}")

    if resp.status_code == 429:
        print(f"[RATE LIMIT] Waiting longer...")
        time.sleep(10)
        resp = requests.post(url, headers=headers, json=body, timeout=120)
        data = resp.json()
        print(f"Retry status: {resp.status_code}")

    # Check response
    if resp.status_code == 200:
        # Check for image in response
        print(json.dumps(data, ensure_ascii=False)[:500])

        # Try to extract image URL
        if "output" in data:
            output = data["output"]
            if "choices" in output:
                for choice in output["choices"]:
                    msg = choice.get("message", {})
                    content = msg.get("content", [])
                    if isinstance(content, list):
                        for item in content:
                            if isinstance(item, dict) and "image" in item:
                                img_url = item["image"]
                                print(f"Image URL: {img_url}")
                                img_resp = requests.get(img_url, timeout=30)
                                out_path = os.path.join(OUTPUT_DIR, f"peach_composite_{name}.png")
                                with open(out_path, "wb") as f:
                                    f.write(img_resp.content)
                                print(f"[OK] Saved: {out_path} ({len(img_resp.content)} bytes)")
                                return out_path
        # Maybe direct image in result
        elif "results" in data.get("output", {}):
            results = data["output"]["results"]
            if results and "url" in results[0]:
                img_url = results[0]["url"]
                print(f"Image URL: {img_url}")
                img_resp = requests.get(img_url, timeout=30)
                out_path = os.path.join(OUTPUT_DIR, f"peach_composite_{name}.png")
                with open(out_path, "wb") as f:
                    f.write(img_resp.content)
                print(f"[OK] Saved: {out_path}")
                return out_path
        print(f"[UNEXPECTED RESPONSE] {json.dumps(data, ensure_ascii=False)[:500]}")
    else:
        print(f"[FAIL] {data.get('code', '')}: {data.get('message', json.dumps(data, ensure_ascii=False)[:300])}")
    return None

if __name__ == "__main__":
    if sys.platform == "win32":
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')

    # 把银色管体改透明
    try_edit("fix_v1_multimodal",
        "将纹身针管体部位的银色改为透明材质。"
        "管体应该是完全透明的无色塑料管，透过管体能看到内部结构。"
        "针尖、彩色握柄、任何彩色环、金属部件保持原样不变。"
        "只改管体颜色，其他所有部分完全不变。"
    )

    print("\n=== Done ===")
