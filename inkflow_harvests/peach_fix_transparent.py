"""
Peach 管体透明修复 - 换个图床上传方案
尝试多个图床: imgbb, 0x0.st, etc.
"""
import base64, json, os, sys, time, requests

API_KEY = "sk-3bc1604a4d1b41c0b5ab0a6ea6dfe664"
DASHSCOPE_BASE = "https://dashscope.aliyuncs.com"

INPUT_IMG = os.path.join(os.path.dirname(__file__), "data", "generated_samples", "peach_composite_simple2.png")
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "data", "generated_samples")

def try_upload_0x0(file_path):
    """Upload to 0x0.st (temporary file hosting, no auth needed)."""
    with open(file_path, "rb") as f:
        resp = requests.post(
            "https://0x0.st",
            files={"file": ("peach.png", f, "image/png")},
            timeout=60
        )
    url = resp.text.strip()
    if resp.status_code == 200 and url.startswith("http"):
        print(f"[0x0] OK: {url}")
        # 0x0.st returns URL with trailing whitespace
        return url.strip()
    print(f"[0x0 FAIL] {resp.status_code}: {resp.text[:200]}")
    return None

def try_qwen_edit(image_url, prompt, suffix):
    url = f"{DASHSCOPE_BASE}/api/v1/services/aigc/image-generation/generation"
    params = {
        "model": "qwen-image-edit-max",
        "input": {
            "image_url": image_url,
            "prompt": prompt
        },
        "parameters": {
            "size": "928x1152",
            "n": 1
        }
    }
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }

    print(f"\n--- {suffix} ---")
    print(f"Prompt: {prompt[:100]}...")
    resp = requests.post(url, headers=headers, json=params, timeout=120)
    data = resp.json()

    if resp.status_code != 200 or "output" not in data:
        print(f"[FAIL] {resp.status_code}: {json.dumps(data, ensure_ascii=False)[:500]}")
        return None

    task_id = data["output"]["task_id"]
    print(f"Task: {task_id}")
    status_url = f"{DASHSCOPE_BASE}/api/v1/tasks/{task_id}"

    for i in range(30):
        time.sleep(3)
        r = requests.get(status_url, headers=headers, timeout=30)
        d = r.json()
        st = d.get("output", {}).get("task_status", "")
        print(f"  [{i+1}] {st}", end="\r" if st not in ("SUCCEEDED","FAILED") else "\n")
        if st == "SUCCEEDED":
            img_resp = requests.get(d["output"]["results"][0]["url"], timeout=30)
            return img_resp.content
        elif st in ("FAILED", "CANCELED"):
            print(f"\n  Fail: {json.dumps(d, ensure_ascii=False)[:300]}")
            return None
    print("\n  Timeout!")
    return None

def run():
    if sys.platform == "win32":
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')

    print("=== Upload image ===")
    image_url = try_upload_0x0(INPUT_IMG)
    if not image_url:
        print("[FATAL] All uploads failed")
        return

    time.sleep(1)

    result = try_qwen_edit(image_url,
        "将纹身针管体部位的银色改为透明材质。"
        "管体应该是完全透明的无色塑料管，透过管体能看到内部结构。"
        "针尖、彩色握柄、任何彩色环、金属部件保持原样不变。"
        "只改管体颜色，其他所有部分完全不变。",
        "fix_v1_transparent")

    if result:
        path = os.path.join(OUTPUT_DIR, "peach_composite_fix_v1_transparent.png")
        with open(path, "wb") as f:
            f.write(result)
        print(f"[OK] {path} ({len(result)} bytes)")

    print("\n=== Done ===")

if __name__ == "__main__":
    run()
