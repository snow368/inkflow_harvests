import time
from dataclasses import dataclass
from typing import Dict, Any
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry


@dataclass
class LLMRequest:
    api_key: str
    base_url: str
    model: str
    temperature: float = 0.7
    max_tokens: int = 4096


class OpenAICompatibleClient:
    def __init__(self, retries: int = 3, backoff_factor: float = 1.0):
        self.session = requests.Session()
        retry = Retry(
            total=retries,
            read=retries,
            connect=retries,
            backoff_factor=backoff_factor,
            status_forcelist=[429, 500, 502, 503, 504],
            allowed_methods=['POST']
        )
        adapter = HTTPAdapter(max_retries=retry)
        self.session.mount('http://', adapter)
        self.session.mount('https://', adapter)

    def chat(self, req: LLMRequest, prompt: str, retry_count: int = 3) -> str:
        url = f"{req.base_url.rstrip('/')}/chat/completions"
        headers = {
            'Authorization': f'Bearer {req.api_key.strip()}',
            'Content-Type': 'application/json'
        }
        payload: Dict[str, Any] = {
            'model': req.model,
            'messages': [{'role': 'user', 'content': prompt}],
            'temperature': req.temperature,
            'max_tokens': req.max_tokens
        }

        for attempt in range(1, retry_count + 1):
            try:
                resp = self.session.post(url, headers=headers, json=payload, timeout=(10, 120))
                if resp.status_code == 200:
                    data = resp.json()
                    return data.get('choices', [{}])[0].get('message', {}).get('content', '')

                if attempt == retry_count:
                    return f"错误：HTTP {resp.status_code}: {resp.text[:220]}"
                time.sleep(attempt)
            except requests.exceptions.Timeout:
                if attempt == retry_count:
                    return '请求异常：超时'
                time.sleep(attempt)
            except requests.exceptions.ConnectionError as e:
                if attempt == retry_count:
                    return f'请求异常：连接错误 - {e}'
                time.sleep(attempt)
            except Exception as e:
                if attempt == retry_count:
                    return f'请求异常：{e}'
                time.sleep(attempt)

        return '请求失败：未知错误'
