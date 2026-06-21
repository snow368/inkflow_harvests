import json
import os
from typing import Dict, Tuple

DEFAULT_PRESETS = {
    'deepseek': ('DeepSeek', 'https://api.deepseek.com/v1', 'deepseek-chat'),
    'doubao-lite': ('Doubao Seed Lite', 'https://ark.cn-beijing.volces.com/api/v3', 'doubao-seed-2-0-lite-250821'),
    'doubao-pro': ('Doubao Seed Pro', 'https://ark.cn-beijing.volces.com/api/v3', 'doubao-seed-2-0-pro-250821'),
    'siliconflow': ('SiliconFlow', 'https://api.siliconflow.cn/v1', 'deepseek-ai/DeepSeek-V2.5'),
    'openai': ('OpenAI Compatible', 'https://api.openai.com/v1', 'gpt-4o-mini'),
    'moonshot': ('Moonshot/Kimi', 'https://api.moonshot.cn/v1', 'moonshot-v1-8k'),
    'zhipu': ('Zhipu GLM', 'https://open.bigmodel.cn/api/paas/v4', 'glm-4-flash')
}


def load_provider_presets(config_path: str) -> Dict[str, Tuple[str, str, str]]:
    if not os.path.exists(config_path):
        return DEFAULT_PRESETS.copy()

    try:
        with open(config_path, 'r', encoding='utf-8') as f:
            payload = json.load(f)
    except Exception:
        return DEFAULT_PRESETS.copy()

    presets = payload.get('providers', payload)
    if not isinstance(presets, dict):
        return DEFAULT_PRESETS.copy()

    normalized: Dict[str, Tuple[str, str, str]] = {}
    for provider_id, v in presets.items():
        if not isinstance(v, dict):
            continue
        display = str(v.get('display_name') or provider_id).strip()
        base_url = str(v.get('base_url') or '').strip()
        model = str(v.get('model') or '').strip()
        if not base_url or not model:
            continue
        normalized[str(provider_id)] = (display, base_url, model)

    if not normalized:
        return DEFAULT_PRESETS.copy()
    return normalized


def ensure_provider_config(config_path: str) -> None:
    if os.path.exists(config_path):
        return

    payload = {
        'providers': {
            k: {
                'display_name': v[0],
                'base_url': v[1],
                'model': v[2]
            }
            for k, v in DEFAULT_PRESETS.items()
        }
    }
    with open(config_path, 'w', encoding='utf-8') as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
