"""
Peach 管体透明修复 - 用 dashscope SDK 自动上传本地文件
关键: base_image_url 传本地路径，SDK 自动上传 OSS
"""
import json, os, sys, time
from dashscope import ImageSynthesis

API_KEY = "sk-3bc1604a4d1b41c0b5ab0a6ea6dfe664"

INPUT_IMG = os.path.join(os.path.dirname(__file__), "data", "generated_samples", "peach_composite_simple2.png")
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "data", "generated_samples")

def try_edit(name, prompt):
    print(f"\n{'='*60}")
    print(f"尝试: {name}")
    print(f"Prompt: {prompt[:100]}...")
    print(f"输入图: {INPUT_IMG}")
    print('='*60)

    try:
        rsp = ImageSynthesis.call(
            model="qwen-image-edit-max",
            prompt=prompt,
            base_image_url=INPUT_IMG,  # 传本地路径，SDK 自动上传
            n=1,
            size="928x1152",           # 保持原图尺寸
            api_key=API_KEY
        )
        print(f"Status: {rsp.status_code}")
        if rsp.status_code == 200:
            # 同步返回的直接看 output
            if rsp.output and "results" in rsp.output:
                img_url = rsp.output["results"][0]["url"]
                print(f"Result URL: {img_url}")

                # 下载图片
                import requests
                img_resp = requests.get(img_url, timeout=30)
                out_path = os.path.join(OUTPUT_DIR, f"peach_composite_{name}.png")
                with open(out_path, "wb") as f:
                    f.write(img_resp.content)
                print(f"[OK] 已保存: {out_path} ({len(img_resp.content)} bytes)")
                return out_path
        else:
            print(f"[FAIL] Code: {rsp.code}, Message: {rsp.message}")
            if hasattr(rsp, 'output') and rsp.output:
                print(json.dumps(rsp.output, ensure_ascii=False)[:500])
            return None
    except Exception as e:
        print(f"[EXCEPTION] {e}")
        import traceback
        traceback.print_exc()
        return None

if __name__ == "__main__":
    if sys.platform == "win32":
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')

    # 核心 Prompt：把银色管体改成透明
    try_edit("fix_v1_transparent",
        "将纹身针管体部位的银色改为透明材质。"
        "管体应该是完全透明的无色塑料管，透过管体能看到内部结构。"
        "针尖、彩色握柄、任何彩色环、金属部件保持原样不变。"
        "只改管体颜色，其他所有部分完全不变。"
    )

    print("\n=== 完成 ===")
