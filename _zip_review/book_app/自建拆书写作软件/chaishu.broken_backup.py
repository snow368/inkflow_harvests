import warnings
warnings.filterwarnings("ignore", category=UserWarning)
warnings.filterwarnings("ignore", message="iCCP")
import tkinter as tk
from tkinter import ttk, scrolledtext, messagebox, filedialog, simpledialog
import threading
import requests
import json
import os
import re
import time
import hashlib
from datetime import datetime
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

# ==================== 澧炲己鐗?LLM 閫傞厤鍣紙鏀寔閲嶈瘯锛?====================
class SimpleLLM:
    def __init__(
        self,
        api_key,
        base_url,
        model,
        temperature,
        max_tokens,
        relay_enabled=False,
        relay_url="",
        relay_token="",
        relay_provider=""
    ):
        self.api_key = api_key
        self.base_url = base_url.rstrip('/')
        self.model = model
        self.temperature = temperature
        self.max_tokens = max_tokens
        self.relay_enabled = bool(relay_enabled)
        self.relay_url = relay_url.strip()
        self.relay_token = relay_token.strip()
        self.relay_provider = relay_provider.strip()
        self.session = self._create_retry_session()

    def _create_retry_session(self, retries=3, backoff_factor=1):
        session = requests.Session()
        retry = Retry(
            total=retries,
            read=retries,
            connect=retries,
            backoff_factor=backoff_factor,
            status_forcelist=[500, 502, 503, 504],
            allowed_methods=["POST"]
        )
        adapter = HTTPAdapter(max_retries=retry)
        session.mount('http://', adapter)
        session.mount('https://', adapter)
        return session

    def chat(self, prompt, retry_count=3):
        use_relay = self.relay_enabled and bool(self.relay_url)
        if use_relay:
            url = self.relay_url.rstrip('/')
            if "/chat/completions" not in url:
                url = f"{url}/chat/completions"
        else:
            url = f"{self.base_url}/chat/completions"

        bearer = self.relay_token if use_relay and self.relay_token else self.api_key
        headers = {"Authorization": f"Bearer {bearer}", "Content-Type": "application/json"}
        data = {
            "model": self.model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": self.temperature,
            "max_tokens": self.max_tokens
        }
        if use_relay:
            data["upstream"] = {
                "base_url": self.base_url,
                "api_key": self.api_key,
                "model": self.model
            }
            if self.relay_provider:
                data["provider"] = self.relay_provider
        last_exception = None
        for attempt in range(1, retry_count + 1):
            try:
                resp = self.session.post(url, headers=headers, json=data, timeout=(10, 120))
                if resp.status_code == 200:
                    return resp.json()["choices"][0]["message"]["content"]
                else:
                    error_msg = f"HTTP {resp.status_code}: {resp.text[:200]}"
                    last_exception = Exception(error_msg)
                    if attempt == retry_count:
                        return f"閿欒锛歿error_msg}"
                    time.sleep(1 * attempt)
            except requests.exceptions.Timeout:
                last_exception = Exception("璇锋眰瓒呮椂")
                if attempt == retry_count:
                    return f"璇锋眰寮傚父锛氳秴鏃?
                time.sleep(1 * attempt)
            except requests.exceptions.ConnectionError as e:
                last_exception = e
                if attempt == retry_count:
                    return f"璇锋眰寮傚父锛氳繛鎺ラ敊璇?- {str(e)}"
                time.sleep(1 * attempt)
            except Exception as e:
                last_exception = e
                if attempt == retry_count:
                    return f"璇锋眰寮傚父锛歿str(e)}"
                time.sleep(1 * attempt)
        return f"璇锋眰寮傚父锛歿str(last_exception)}"


# ==================== 鐭ヨ瘑搴撶鐞嗗櫒锛堝鍔犵紦瀛樺拰鐗堟湰绠＄悊锛?====================
class KnowledgeBaseManager:
    def __init__(self, storage_dir="./zhishiku"):
        self.storage_dir = storage_dir
        self.meta_file = os.path.join(storage_dir, "meta.json")
        self.cache_dir = os.path.join(storage_dir, "analysis_cache")
        os.makedirs(storage_dir, exist_ok=True)
        os.makedirs(self.cache_dir, exist_ok=True)
        self.meta = self._load_meta()

    def _load_meta(self):
        if os.path.exists(self.meta_file):
            with open(self.meta_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        return {}

    def _save_meta(self):
        with open(self.meta_file, 'w', encoding='utf-8') as f:
            json.dump(self.meta, f, ensure_ascii=False, indent=2)

    def _sanitize_filename(self, name):
        return re.sub(r'[<>:"/\\|?*]', '_', name)

    def upload_document(self, title, content):
        doc_id = title
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        version = 1
        if doc_id in self.meta:
            versions = self.meta[doc_id]['versions']
            version = max(v['version'] for v in versions) + 1
            for v in versions:
                v['active'] = False
        else:
            self.meta[doc_id] = {'title': title, 'versions': []}
        safe_title = self._sanitize_filename(doc_id)
        file_name = f"{safe_title}_v{version}.txt"
        file_path = os.path.join(self.storage_dir, file_name)
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        version_info = {'version': version, 'time': now, 'file': file_name, 'active': True}
        self.meta[doc_id]['versions'].append(version_info)
        self._save_meta()
        self.clear_cache(doc_id)
        return doc_id, version

    def get_document_md5(self, doc_id):
        content = self.get_document_content(doc_id)
        if content is None:
            return None
        return hashlib.md5(content.encode('utf-8')).hexdigest()

    def get_cached_analysis(self, doc_id):
        md5 = self.get_document_md5(doc_id)
        if not md5:
            return None
        cache_file = os.path.join(self.cache_dir, f"{doc_id}_{md5}.json")
        if os.path.exists(cache_file):
            with open(cache_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        return None

    def save_cached_analysis(self, doc_id, analysis_result, template_text):
        md5 = self.get_document_md5(doc_id)
        if not md5:
            return
        cache_file = os.path.join(self.cache_dir, f"{doc_id}_{md5}.json")
        with open(cache_file, 'w', encoding='utf-8') as f:
            json.dump({
                'analysis_result': analysis_result,
                'template_text': template_text,
                'timestamp': datetime.now().isoformat()
            }, f, ensure_ascii=False, indent=2)

    def clear_cache(self, doc_id):
        for f in os.listdir(self.cache_dir):
            if f.startswith(doc_id + "_"):
                os.remove(os.path.join(self.cache_dir, f))

    def get_all_documents(self):
        result = []
        for doc_id, info in self.meta.items():
            active_version = None
            last_time = None
            for v in info['versions']:
                if v['active']:
                    active_version = v['version']
                    last_time = v['time']
            if active_version is None and info['versions']:
                latest = max(info['versions'], key=lambda x: x['version'])
                active_version = latest['version']
                last_time = latest['time']
            result.append({'title': info['title'], 'active_version': active_version, 'last_time': last_time, 'doc_id': doc_id})
        result.sort(key=lambda x: x['last_time'], reverse=True)
        return result

    def search_documents(self, keyword):
        if not keyword:
            return self.get_all_documents()
        keyword_lower = keyword.lower()
        return [doc for doc in self.get_all_documents() if keyword_lower in doc['title'].lower()]

    def get_document_content(self, doc_id, version=None):
        if doc_id not in self.meta:
            return None
        versions = self.meta[doc_id]['versions']
        target = None
        if version is None:
            for v in versions:
                if v['active']:
                    target = v
                    break
            if target is None and versions:
                target = max(versions, key=lambda x: x['version'])
        else:
            for v in versions:
                if v['version'] == version:
                    target = v
        if target:
            file_path = os.path.join(self.storage_dir, target['file'])
            if os.path.exists(file_path):
                with open(file_path, 'r', encoding='utf-8') as f:
                    return f.read()
        return None

    def get_version_list(self, doc_id):
        if doc_id not in self.meta:
            return []
        return sorted(self.meta[doc_id]['versions'], key=lambda x: x['version'], reverse=True)

    def switch_version(self, doc_id, version):
        if doc_id not in self.meta:
            return False
        for v in self.meta[doc_id]['versions']:
            v['active'] = (v['version'] == version)
        self._save_meta()
        self.clear_cache(doc_id)
        return True

    def delete_document(self, doc_id):
        if doc_id in self.meta:
            for v in self.meta[doc_id]['versions']:
                file_path = os.path.join(self.storage_dir, v['file'])
                if os.path.exists(file_path):
                    os.remove(file_path)
            self.clear_cache(doc_id)
            del self.meta[doc_id]
            self._save_meta()

# ==================== 鎷嗕功鍒嗘瀽搴撶鐞嗗櫒锛堢户鎵胯嚜 KnowledgeBaseManager锛?====================
class BookAnalysisManager(KnowledgeBaseManager):
    def __init__(self):
        super().__init__(storage_dir="./fenxi")

    def sync_with_folder(self):
        """
        鑷姩鍚屾fenxi鐩綍涓嬬殑鍒嗘瀽缁撴灉鏂囦欢鍒癿eta.json锛岃ˉ褰曟湭鐧昏鐨勫垎鏋愭枃妗ｃ€?
        """
        for fname in os.listdir(self.storage_dir):
            if fname.endswith('.txt'):
                title = fname[:-4]
                doc_id = title
                file_path = os.path.join(self.storage_dir, fname)
                if doc_id not in self.meta:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                    version = 1
                    self.meta[doc_id] = {'title': doc_id, 'versions': []}
                    version_info = {'version': version, 'time': now, 'file': fname, 'active': True}
                    self.meta[doc_id]['versions'].append(version_info)
        self._save_meta()


# ==================== 妯℃澘搴撶鐞嗗櫒 ====================
class TemplateManager:
    def __init__(self, storage_dir="./templates"):
        self.storage_dir = storage_dir
        self.index_file = os.path.join(storage_dir, "index.json")
        os.makedirs(storage_dir, exist_ok=True)
        self.index = self._load_index()

    def _load_index(self):
        if os.path.exists(self.index_file):
            with open(self.index_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        return []

    def _save_index(self):
        with open(self.index_file, 'w', encoding='utf-8') as f:
            json.dump(self.index, f, ensure_ascii=False, indent=2)

    def save_template(self, source_title, template_text, analysis_summary=""):
        template_id = f"{source_title}_{int(time.time())}"
        safe_id = re.sub(r'[<>:"/\\|?*]', '_', template_id)
        file_path = os.path.join(self.storage_dir, f"{safe_id}.json")
        record = {
            "id": template_id,
            "source_title": source_title,
            "created": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "template_text": template_text,
            "analysis_summary": analysis_summary,
            "rating": 0,
            "use_count": 0
        }
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(record, f, ensure_ascii=False, indent=2)
        self.index.append({"id": template_id, "source_title": source_title, "created": record["created"]})
        self._save_index()
        return template_id

    def get_all_templates(self):
        templates = []
        for item in self.index:
            file_path = os.path.join(self.storage_dir, f"{item['id']}.json")
            if os.path.exists(file_path):
                with open(file_path, 'r', encoding='utf-8') as f:
                    templates.append(json.load(f))
        return templates

    def get_template(self, template_id):
        file_path = os.path.join(self.storage_dir, f"{template_id}.json")
        if os.path.exists(file_path):
            with open(file_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        return None

    def delete_template(self, template_id):
        file_path = os.path.join(self.storage_dir, f"{template_id}.json")
        if os.path.exists(file_path):
            os.remove(file_path)
        self.index = [item for item in self.index if item["id"] != template_id]
        self._save_index()

    def rate_template(self, template_id, rating):
        record = self.get_template(template_id)
        if record:
            record["rating"] = rating
            file_path = os.path.join(self.storage_dir, f"{template_id}.json")
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(record, f, ensure_ascii=False, indent=2)


# ==================== 涓诲簲鐢?====================
class SimpleWorkbench:
    MODEL_PRESETS = {
        "deepseek": ("DeepSeek", "https://api.deepseek.com/v1", "deepseek-chat"),
        "doubao-lite": ("璞嗗寘-Seed-2.0-lite", "https://ark.cn-beijing.volces.com/api/v3", "doubao-seed-2-0-lite-260215"),
        "doubao-pro": ("璞嗗寘-Seed-2.0-pro", "https://ark.cn-beijing.volces.com/api/v3", "doubao-seed-2-0-pro-260215"),
        "chatgpt-4o-mini": ("ChatGPT GPT-4o-mini", "https://api.openai.com/v1", "gpt-4o-mini"),
        "chatgpt-4.1-mini": ("ChatGPT GPT-4.1-mini", "https://api.openai.com/v1", "gpt-4.1-mini"),
        "chatgpt-4.1": ("ChatGPT GPT-4.1", "https://api.openai.com/v1", "gpt-4.1"),
        "openrouter-claude-sonnet": ("Claude Sonnet (OpenRouter)", "https://openrouter.ai/api/v1", "anthropic/claude-3.7-sonnet"),
        "openrouter-claude-opus": ("Claude Opus (OpenRouter)", "https://openrouter.ai/api/v1", "anthropic/claude-3-opus"),
        "openrouter-gpt-4o": ("GPT-4o (OpenRouter)", "https://openrouter.ai/api/v1", "openai/gpt-4o"),
        "openrouter-gemini": ("Gemini 2.5 Pro (OpenRouter)", "https://openrouter.ai/api/v1", "google/gemini-2.5-pro"),
        "qwen-plus": ("Qwen Plus", "https://dashscope.aliyuncs.com/compatible-mode/v1", "qwen-plus"),
        "moonshot": ("Moonshot/Kimi", "https://api.moonshot.cn/v1", "moonshot-v1-8k"),
        "zhipu-glm4": ("Zhipu GLM-4", "https://open.bigmodel.cn/api/paas/v4", "glm-4-flash"),
        "siliconflow-deepseek": ("SiliconFlow DeepSeek", "https://api.siliconflow.cn/v1", "deepseek-ai/DeepSeek-V2.5"),
    }

    def __init__(self):
        self.root = tk.Tk()
        self.root.title("鐭ヨ瘑搴?& 绯荤粺璁剧疆")
        self.root.geometry("1200x700")
        self.root.configure(bg='#f0f2f5')

        # LLM 閰嶇疆鍙橀噺
        self.api_key = tk.StringVar()
        self.base_url = tk.StringVar(value="https://api.deepseek.com/v1")
        self.model_name = tk.StringVar(value="deepseek-chat")
        self.temp = tk.DoubleVar(value=0.7)
        self.current_model = tk.StringVar(value="deepseek")
        self.relay_enabled = tk.BooleanVar(value=False)
        self.relay_url = tk.StringVar(value="")
        self.relay_token = tk.StringVar(value="")
        self.relay_provider = tk.StringVar(value="")

        # 鐭ヨ瘑搴?
        self.kb_manager = KnowledgeBaseManager()
        self.book_analysis_manager = BookAnalysisManager()
        self.book_analysis_manager.sync_with_folder()
        self.template_manager = TemplateManager()

        # 鍐欎功椤甸潰鐩稿叧鍙橀噺
        self.new_book_title = tk.StringVar()
        self.new_book_synopsis = tk.StringVar()
        self.save_path = tk.StringVar(value="./灏忚杈撳嚭")
        self.chapter_num = tk.IntVar(value=25)
        self.words_per_chapter = tk.IntVar(value=2800)
        self.genre = tk.StringVar(value="")
        self.architecture = ""
        self.chapter_blueprints = {}
        self.chapter_drafts = {}
        self.current_chapter = 1

        # 杩涘害鏉″彉閲?
        self.progress_var = tk.IntVar(value=0)
        self.progress_label = tk.StringVar(value="灏辩华")

        # 鍔犺浇閰嶇疆
        self.load_llm_config()
        self.setup_ui()
        self.load_global_state()
        self.root.protocol("WM_DELETE_WINDOW", self.on_closing)

        # 鍔犺浇鍐欎綔椋庢牸鎻愮ず锛堜粠澶栭儴鏂囦欢锛?
        self.deai_prompt = self.load_writing_style()

    def load_writing_style(self):
        style_file = "writing_style.txt"
        default_style = """
**鍐欎綔瑕佹眰锛堝幓AI鍛筹紝璐磋繎浜虹被椋庢牸锛夛細**
- 缁嗚妭鎻忕粯锛氶€氳繃瀵圭幆澧冨拰鎯呮劅缁嗚嚧鍏ュ井鐨勬弿鍐欙紝澧炲己鏂囩珷鐨勭湡瀹炴劅銆?
- 澧炲己浠ｅ叆鎰燂細璁╄鑰呮劅鍚岃韩鍙楋紝澧炲己浠栦滑涓庡唴瀹圭殑鎯呮劅杩炴帴銆?
- 鍒嗘瑙ｆ瀯锛氬皢澶嶆潅鐨勫唴瀹瑰垎瑙ｆ垚灏忔锛屼究浜庤鑰呴€愭鐞嗚В銆?
- 鍒嗗彂濂藉蹇冿細閫氳繃鎻愬嚭闂鎴栨偓蹇碉紝婵€鍙戣鑰呯殑姹傜煡娆叉湜銆?
- 澧炴坊骞介粯锛氶€傚綋鍦板姞鍏ュ菇榛樺厓绱狅紝鎻愬崌鏂囩珷鐨勮叮鍛虫€с€?
- 骞宠　鍙欒堪鑺傚锛氶€氳繃浜ゆ浛浣跨敤闀垮彞鍜岀煭鍙ワ紝浣挎枃绔犵殑鑺傚鏇村叿鍚稿紩鍔涖€?
- 鎯呮劅鍏遍福锛氶€氳繃鎻忓啓鎯呮劅鍙樺寲锛屼績浣胯鑰呬骇鐢熷叡楦ｃ€?
- 鎻愪緵鑳屾櫙淇℃伅锛氶€傛椂鎻掑叆鐩稿叧鑳屾櫙鐭ヨ瘑锛岃璇昏€呮洿濂界悊瑙ｆ枃绔犲唴瀹广€?
- 绠€娲佹槑浜嗭細鍘婚櫎鍐椾綑淇℃伅锛屼娇鏂囩珷缁撴瀯鏇村姞绠€娲佹湁鍔涖€?
- 澶氳瑙掑彊杩帮細浠庝笉鍚岃搴︽弿杩颁簨浠讹紝涓板瘜鏂囩珷鐨勫眰娆℃劅銆?
- 绐佸嚭鍏抽敭鐐癸細浣跨敤閲嶇偣璇嶆眹鎴栫煭璇紝寮哄寲鏂囩珷鐨勪富鏃ㄣ€?
- 鎵撻€犵揣寮犳皼鍥达細閫氳繃鎻忓啓绱у紶鐨勬儏澧冿紝澧炲姞鏂囩珷鐨勬偓蹇垫劅銆?
- 浣跨敤瀵规瘮锛氶€氳繃瀵规瘮鎵嬫硶绐佸嚭涓婚锛屼娇鏂囩珷灞傛鍒嗘槑銆?
- 灞傚眰閫掕繘锛氶€愭娣卞叆鍓栨瀽闂锛屼娇璇昏€呮洿瀹规槗鐞嗚В澶嶆潅姒傚康銆?
- 鎯呰妭鍙嶈浆锛氳璁″嚭浜烘剰鏂欑殑鎯呰妭鍙嶈浆锛屽鍔犳枃绔犵殑鎴忓墽鎬с€?
- 鏄庣‘缁撹锛氬湪鏂囩珷缁撳熬澶勬彁渚涙槑纭殑鎬荤粨鎴栫粨璁猴紝澧炲己璇存湇鍔涖€?
- 杩愮敤鎷熶汉鎵嬫硶锛氬皢闈炰汉绫荤殑浜嬬墿璧嬩簣浜虹殑鐗瑰緛锛屼娇鎻忓啓鏇寸敓鍔ㄣ€?
- 澶氬厓鍖栬〃杈撅細閫氳繃澶氱淇緸鎵嬫硶锛屼娇鏂囩珷璇█鏇村姞涓板瘜銆?
- 鍛煎簲寮€绡囷細缁撳熬澶勫懠搴斿紑绡囩殑鍐呭锛屼娇鏂囩珷缁撴瀯鏇村姞涓ヨ皑銆?
- 浣跨敤绫绘瘮锛氶€氳繃绫绘瘮鐨勬柟寮忚В閲婂鏉傛蹇碉紝浣垮叾鏇存槗鐞嗚В銆?
- 澧炲己鎯呮劅娣卞害锛氶€氳繃缁嗚嚧鎻忓啓鍐呭績娲诲姩锛屽鍔犳儏鎰熺殑灞傛鎰熴€?
- 鍑忓皯鏈浣跨敤锛氶伩鍏嶄娇鐢ㄨ繃澶氫笓涓氭湳璇紝浣挎枃绔犻€氫織鏄撴噦銆?
- 澶氭劅瀹樻弿杩帮細璋冨姩瑙嗚銆佸惉瑙夌瓑澶氱鎰熷畼锛屼赴瀵屾枃绔犵殑鎻忓啓銆?
- 绮剧‘鐢ㄨ瘝锛氶€夋嫨鏈€鎭板綋鐨勮瘝姹囪〃杈炬剰鎬濓紝閬垮厤妯℃１涓ゅ彲鐨勮〃杩般€?
- 鍒堕€犵煕鐩惧啿绐侊細閫氳繃寮曞叆鐭涚浘锛屼娇鎯呰妭鏇村姞绱у紶鍜屽紩浜哄叆鑳溿€?
- 鎻愪緵瑙ｅ喅鏂规锛氬湪鎻愬嚭闂鍚庯紝鍙婃椂缁欏嚭瑙ｅ喅鍔炴硶锛屽寮哄疄鐢ㄦ€с€?
- 灞傛鍒嗘槑锛氶€氳繃鍒嗘鍜屽垎灞傛鎻忚堪锛屼娇鏂囩珷閫昏緫娓呮櫚銆?
- 棰勮璇昏€呭弽搴旓細棰勬祴璇昏€呭彲鑳界殑鍙嶅簲骞舵彁鍓嶅洖搴旓紝澧炲己浜掑姩鎰熴€?
- 鎻掑叆瀹炰緥锛氶€氳繃鍏蜂綋瀹炰緥璇存槑鎶借薄姒傚康锛屼娇鍐呭鏇存湁璇存湇鍔涖€?
- 杩愮敤鍙嶉棶鍙ワ細浣跨敤鍙嶉棶鍙ュ己鍖栬鐐癸紝寮曞彂璇昏€呮€濊€冦€?
- 閫傚害澶稿紶锛氶€氳繃閫傚綋澶稿紶锛屽寮烘弿杩扮殑鐢熷姩鎬у拰鎰熸煋鍔涖€?
- 缁嗗寲鍦烘櫙鎻忓啓锛氬鍦烘櫙杩涜绮剧粏鎻忚堪锛屽寮虹敾闈㈡劅銆?
- 寤虹珛鎮康锛氬湪鍙欒堪涓煁涓嬩紡绗旓紝鍚稿紩璇昏€呯户缁槄璇汇€?
- 宸х敤鍙嶄箟璇嶏細閫氳繃鍙嶄箟璇嶅姣旓紝寮哄寲鏂囩珷鐨勫姣旀晥鏋溿€?
- 浣跨敤闅愬柣锛氳繍鐢ㄩ殣鍠讳娇鏂囩珷鏇村叿娣卞害鍜岃壓鏈€с€?
- 钀ラ€犵揣杩劅锛氶€氳繃鎻忓啓绱ф€ユ儏鍐碉紝澧炲己鏂囩珷鐨勭揣寮犳劅銆?
- 寮曞鎯呯华娉㈠姩锛氶€氳繃閫愭鍗囩骇鎯呯华锛屼娇璇昏€呮儏鎰熷緱鍒伴噴鏀俱€?
- 寮曠敤娴佽璇細閫傛椂浣跨敤娴佽璇紝浣挎枃绔犳洿鎺ュ湴姘斻€?
- 寮哄寲瑙嗚鏁堟灉锛氫娇鐢ㄧ敓鍔ㄧ殑瑙嗚鎻忚堪锛屽寮鸿鑰呯殑鐢婚潰鎰熴€?
- 宓屽叆鏁呬簨鎯呰妭锛氶€氳繃宓屽叆灏忔晠浜嬶紝涓板瘜鏂囩珷鐨勬儏鎰熷眰娆°€?
- 鍒╃敤鏁板瓧鏁版嵁锛氬紩鐢ㄥ叿浣撴暟鎹紝澧炲己鏂囩珷鐨勫彲淇″害銆?
- 鎺掓瘮鍙ュ紡锛氫娇鐢ㄦ帓姣斿彞寮忥紝澧炲己鏂囩珷鐨勮妭濂忔劅鍜屽姏閲忔劅銆?
- 瀵规瘮璁鸿瘉锛氶€氳繃瀵规瘮涓嶅悓瑙傜偣锛屽寮鸿璇佺殑璇存湇鍔涖€?
- 绠€鍗曞寲澶嶆潅鍐呭锛氬皢澶嶆潅姒傚康绠€鍗曞寲锛屼娇鍏舵槗浜庣悊瑙ｃ€?
- 浣跨敤鐩存帴寮曡锛氶€氳繃鐩存帴寮曡锛屼娇浜虹墿瀵硅瘽鏇村姞鐢熷姩銆?
- 杩愮敤鍙嶅鎵嬫硶锛氶€氳繃鍙嶅寮鸿皟鏌愪竴瑙傜偣锛屽己鍖栨枃绔犵殑涓绘棬銆?
- 寮曞璇昏€呮€濊€冿細閫氳繃鎻愬嚭闂锛屽紩瀵艰鑰呰繘琛屾繁鍏ユ€濊€冦€?
- 涓板瘜鑳屾櫙鎻忓啓锛氶€氳繃澧炲姞鑳屾櫙鎻忓啓锛屼娇鎯呰妭鏇村叿绔嬩綋鎰熴€?
- 铻嶅叆鎯呮劅璁板繂锛氬€熷姪鎯呮劅璁板繂锛屽寮烘枃绔犵殑鍏遍福鎰熴€?
- 鍛煎簲璇昏€呯粡楠岋細閫氳繃鍛煎簲璇昏€呯殑鐢熸椿缁忛獙锛屽鍔犳枃绔犵殑浜插垏鎰熴€?
- 寮鸿皟琛屽姩鍔涳細閫氳繃鎻忓啓琛屽姩鍦烘櫙锛屽寮烘枃绔犵殑鍔ㄦ劅銆?
- 鏋勫缓浜虹墿褰㈣薄锛氶€氳繃缁嗚妭鎻忓啓锛屽閫犵敓鍔ㄧ殑浜虹墿褰㈣薄銆?
- 钀ラ€犲姣斿啿绐侊細閫氳繃鍒堕€犲姣斿啿绐侊紝澧炲己鎯呰妭鐨勫紶鍔涖€?
- 杩愮敤鍊掑彊鎵嬫硶锛氫娇鐢ㄥ€掑彊鎵嬫硶锛屼娇鏁呬簨缁撴瀯鏇村姞澶氭牱鍖栥€?
- 宓屽叆鍝茬悊鎬濊€冿細鍦ㄥ彊杩颁腑铻嶅叆鍝茬悊鎬濊€冿紝澧炲姞鏂囩珷鐨勬繁搴︺€?
- 浣跨敤閲嶅鍙ュ紡锛氶€氳繃閲嶅鍙ュ紡锛屽寮烘枃绔犵殑鍔涢噺鎰熴€?
- 寮曞叆瑙嗚缁嗚妭锛氶€氳繃澧炲姞瑙嗚缁嗚妭锛屼娇鍦烘櫙鏇村姞鐢熷姩銆?
- 鍒堕€犲弽宸細閫氳繃鍒堕€犲己鐑堢殑鍙嶅樊锛屽鍔犳枃绔犵殑鎴忓墽鏁堟灉銆?
- 浣跨敤绠€鐭彞寮忥細閫氳繃绠€鐭彞寮忥紝澧炲己鏂囩珷鐨勫啿鍑诲姏銆?
- 閫氳繃缁嗚妭鍒荤敾浜虹墿锛氱粏鑵荤殑缁嗚妭鎻忓啓锛屼娇浜虹墿鏇村姞绔嬩綋鐢熷姩銆?
- 浣跨敤鎯呮劅閾哄灚锛氶€氳繃鎯呮劅閾哄灚锛屼负鍚庣画鎯呰妭鍙戝睍鍋氬噯澶囥€?
- 閫愬眰閫掕繘锛氫粠娴呭埌娣遍€愭灞曞紑锛屽寮烘枃绔犵殑灞傛鎰熴€?
- 杩愮敤鏃堕棿椤哄簭锛氶€氳繃鏃堕棿椤哄簭锛屼娇鍙欎簨鏇村姞娓呮櫚娴佺晠銆?
- 鍔犲叆鑷劧鎻忓啓锛氶€氳繃鎻忓啓鑷劧鏅墿锛屽寮烘枃绔犵殑鐢婚潰鎰熴€?
- 浣跨敤闅愬惈瀵规瘮锛氶€氳繃闅愬惈瀵规瘮锛屽鍔犳枃绔犵殑娣卞害鍜岃叮鍛炽€?
- 澧炲姞鐜鎻忓啓锛氫赴瀵岀幆澧冩弿鍐欙紝澧炲己鏂囩珷鐨勭幇鍦烘劅銆?
- 閫傚害骞介粯锛氶€氳繃閫傚害骞介粯锛屽鍔犳枃绔犵殑杞绘澗鎰熴€?
- 寮鸿皟鐜板疄鍩虹锛氶€氳繃寮曠敤鐜板疄妗堜緥锛屽寮烘枃绔犵殑鍙俊搴︺€?
- 璁捐鎮枒缁撳熬锛氶€氳繃鎮枒缁撳熬锛屽紩鍙戣鑰呯殑濂藉蹇冦€?
- 杩愮敤璞″緛鎵嬫硶锛氶€氳繃璞″緛鎵嬫硶锛屽鍔犳枃绔犵殑璞″緛鎰忎箟銆?
- 澧炲己浜掑姩鎬э細閫氳繃闂鎴栧懠鍚侊紝澧炲己璇昏€呯殑鍙備笌鎰熴€?
- 鍒╃敤鏁呬簨寮€澶达細閫氳繃璁茶堪鏁呬簨寮€澶达紝寮曞彂璇昏€呭叴瓒ｃ€?
- 鍒堕€犵揣寮犳皵姘涳細閫氳繃绱у紶鐨勬儏鑺傝缃紝澧炲己鏂囩珷鐨勭揣杩劅銆?
- 澧炲己琛ㄨ揪灞傛锛氶€氳繃澶氬眰娆＄殑琛ㄨ揪锛屼赴瀵屾枃绔犵殑鍐呭銆?
- 鍚堢悊浣跨敤姣斿柣锛氶€氳繃姣斿柣鎵嬫硶锛屼娇鎶借薄姒傚康褰㈣薄鍖栥€?
- 澧炲姞鏂囧寲鍏冪礌锛氳瀺鍏ユ枃鍖栧厓绱狅紝澧炲己鏂囩珷鐨勬繁搴﹀拰鑳屾櫙鎰熴€?
- 鍒堕€犺交鏉炬皼鍥达細閫氳繃杞绘澗鐨勮瑷€鍜屾儏澧冿紝缂撹В璇昏€呯殑闃呰鍘嬪姏銆?
- 浣跨敤鐩存帴瀵硅瘽锛氶€氳繃鐩存帴瀵硅瘽锛屼娇浜虹墿浜ゆ祦鏇村姞鐪熷疄銆?
- 閫氳繃鎮康鍚稿紩锛氬湪寮€澶磋缃偓蹇碉紝鍚稿紩璇昏€呯殑娉ㄦ剰鍔涖€?
- 鍚堢悊寮曞叆鐭涚浘锛氶€氳繃鐭涚浘鍐茬獊锛屽鍔犳枃绔犵殑鎴忓墽鎬с€?
- 浣跨敤鍏蜂綋渚嬪瓙锛氶€氳繃鍏蜂綋渚嬪瓙璇存槑鎶借薄闂锛屽寮烘枃绔犵殑瀹炵敤鎬с€?
- 閫氳繃鎯呭濉戦€狅細閫氳繃鍏蜂綋鎯呭鐨勫閫狅紝浣挎儏鑺傛洿鏈変唬鍏ユ劅銆?
"""
        if os.path.exists(style_file):
            with open(style_file, 'r', encoding='utf-8') as f:
                return f.read()
        else:
            with open(style_file, 'w', encoding='utf-8') as f:
                f.write(default_style)
            return default_style

    # ---------- 鍏ㄥ眬鐘舵€佹寔涔呭寲 ----------
    def save_global_state(self):
        state = {}
        try:
            if hasattr(self, 'analysis_result_text'):
                state['analysis_result'] = self.analysis_result_text.get(1.0, tk.END).strip()
            if hasattr(self, 'new_book_prompt_text'):
                state['new_book_prompt'] = self.new_book_prompt_text.get(1.0, tk.END).strip()
        except:
            pass
        state['new_book_title'] = self.new_book_title.get()
        state['new_book_synopsis'] = self.new_book_synopsis.get()
        state['save_path'] = self.save_path.get()
        state['chapter_num'] = self.chapter_num.get()
        state['words_per_chapter'] = self.words_per_chapter.get()
        state['genre'] = self.genre.get()
        state['architecture'] = self.architecture
        state['chapter_blueprints'] = self.chapter_blueprints
        state['chapter_drafts'] = self.chapter_drafts
        try:
            if hasattr(self, 'text_arch'):
                state['arch_text'] = self.text_arch.get(1.0, tk.END).strip()
            if hasattr(self, 'text_blueprint'):
                state['blueprint_text'] = self.text_blueprint.get(1.0, tk.END).strip()
            if hasattr(self, 'text_draft'):
                state['draft_text'] = self.text_draft.get(1.0, tk.END).strip()
        except:
            pass
        try:
            if hasattr(self, 'kb_search_var'):
                state['kb_search'] = self.kb_search_var.get()
        except:
            pass
        with open('global_state.json', 'w', encoding='utf-8') as f:
            json.dump(state, f, ensure_ascii=False, indent=2)

    def load_global_state(self):
        if not os.path.exists('global_state.json'):
            return
        try:
            with open('global_state.json', 'r', encoding='utf-8') as f:
                state = json.load(f)
            if hasattr(self, 'analysis_result_text') and 'analysis_result' in state:
                self.analysis_result_text.insert(tk.END, state['analysis_result'])
                if self.analysis_result_text.get(1.0, tk.END).strip() == "姝ｅ湪鍒嗘瀽涓紝璇风◢鍊?..":
                    self.analysis_result_text.delete(1.0, tk.END)
            if hasattr(self, 'new_book_prompt_text') and 'new_book_prompt' in state:
                self.new_book_prompt_text.insert(tk.END, state['new_book_prompt'])
            self.new_book_title.set(state.get('new_book_title', ''))
            # 鏂颁功绠€浠嬫枃鏈榛樿涓虹┖锛屼笉鍔犺浇涔嬪墠淇濆瓨鐨勫€?
            # self.new_book_synopsis.set(state.get('new_book_synopsis', ''))
            self.new_book_synopsis.set('')
            self.save_path.set(state.get('save_path', './灏忚杈撳嚭'))
            self.chapter_num.set(state.get('chapter_num', 25))
            self.words_per_chapter.set(state.get('words_per_chapter', 2800))
            self.genre.set(state.get('genre', ''))
            self.architecture = state.get('architecture', '')
            self.chapter_blueprints = {int(k): v for k, v in state.get('chapter_blueprints', {}).items()}
            self.chapter_drafts = {int(k): v for k, v in state.get('chapter_drafts', {}).items()}
            self.root.after(100, lambda: self.restore_write_page_texts(state))
            if hasattr(self, 'kb_search_var') and 'kb_search' in state:
                self.kb_search_var.set(state['kb_search'])
                self.refresh_kb_list()
        except Exception as e:
            print(f"鍔犺浇鍏ㄥ眬鐘舵€佸け璐ワ細{e}")

    def restore_write_page_texts(self, state):
        if hasattr(self, 'text_arch') and 'arch_text' in state:
            self.text_arch.insert(tk.END, state['arch_text'])
        if hasattr(self, 'text_blueprint') and 'blueprint_text' in state:
            self.text_blueprint.insert(tk.END, state['blueprint_text'])
        if hasattr(self, 'text_draft') and 'draft_text' in state:
            self.text_draft.insert(tk.END, state['draft_text'])

    def save_llm_config(self, silent=False):
        config = {
            'api_key': self.api_key.get(),
            'base_url': self.base_url.get(),
            'model_name': self.model_name.get(),
            'temperature': self.temp.get(),
            'current_model': self.current_model.get(),
            'relay_enabled': self.relay_enabled.get(),
            'relay_url': self.relay_url.get(),
            'relay_token': self.relay_token.get(),
            'relay_provider': self.relay_provider.get()
        }
        with open('llm_config.json', 'w', encoding='utf-8') as f:
            json.dump(config, f, indent=2)
        if not silent:
            messagebox.showinfo("鎴愬姛", "閰嶇疆宸蹭繚瀛橈紒API Key 灏嗕繚鎸佷笉鍙橈紝鐩村埌鎮ㄩ噸鏂拌緭鍏ユ柊鐨?Key銆?)

    def load_llm_config(self):
        if os.path.exists('llm_config.json'):
            try:
                with open('llm_config.json', 'r', encoding='utf-8') as f:
                    config = json.load(f)
                self.api_key.set(config.get('api_key', ''))
                self.base_url.set(config.get('base_url', 'https://api.deepseek.com/v1'))
                self.model_name.set(config.get('model_name', 'deepseek-chat'))
                self.temp.set(config.get('temperature', 0.7))
                self.current_model.set(config.get('current_model', 'deepseek'))
                self.relay_enabled.set(config.get('relay_enabled', False))
                self.relay_url.set(config.get('relay_url', ''))
                self.relay_token.set(config.get('relay_token', ''))
                self.relay_provider.set(config.get('relay_provider', ''))
            except:
                pass

    def on_closing(self):
        self.save_global_state()
        self.save_llm_config(silent=True)
        self.root.destroy()

    # ---------- UI 鎼缓 ----------
    def setup_ui(self):
        left_nav = tk.Frame(self.root, bg='#2c3e50', width=200)
        left_nav.pack(side=tk.LEFT, fill=tk.Y)
        left_nav.pack_propagate(False)

        btn_style = {'font': ('寰蒋闆呴粦', 11), 'bg': '#2c3e50', 'fg': 'white',
                     'activebackground': '#34495e', 'activeforeground': 'white',
                     'bd': 0, 'anchor': 'w', 'padx': 20, 'pady': 12, 'width': 18}

        title_label = tk.Label(left_nav, text="宸ヤ綔鍙?, font=('寰蒋闆呴粦', 16, 'bold'),
                               bg='#2c3e50', fg='#ecf0f1')
        title_label.pack(pady=(30, 20))

        home_btn = tk.Button(left_nav, text="馃彔 棣栭〉", command=self.show_home, **btn_style)
        home_btn.pack(fill=tk.X, pady=2)
        kb_btn = tk.Button(left_nav, text="馃摎 鐭ヨ瘑搴?, command=self.show_knowledge, **btn_style)
        kb_btn.pack(fill=tk.X, pady=2)
        book_btn = tk.Button(left_nav, text="馃摉 鎷嗕功", command=self.show_book_analysis, **btn_style)
        book_btn.pack(fill=tk.X, pady=2)
        write_btn = tk.Button(left_nav, text="鉁嶏笍 鍐欎功", command=self.show_write_book, **btn_style)
        write_btn.pack(fill=tk.X, pady=2)

        spacer = tk.Frame(left_nav, bg='#2c3e50')
        spacer.pack(expand=True, fill=tk.BOTH)

        settings_btn = tk.Button(left_nav, text="鈿欙笍 绯荤粺璁剧疆", command=self.show_system_settings, **btn_style)
        settings_btn.pack(side=tk.BOTTOM, fill=tk.X, pady=2)

        self.right_area = tk.Frame(self.root, bg='#f0f2f5')
        self.right_area.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        self.page_home = self.create_home_page()
        self.page_knowledge = self.create_knowledge_page()
        self.page_system = self.create_system_settings_page()
        self.page_book_analysis = self.create_book_analysis_page()
        self.page_write_book = self.create_write_book_page()

        self.show_home()

    # ---------- 棣栭〉 ----------
    def create_home_page(self):
        page = tk.Frame(self.right_area, bg='#f0f2f5')
        center_frame = tk.Frame(page, bg='#f0f2f5')
        center_frame.pack(expand=True)
        colors = ['#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF', '#4B0082', '#9400D3']
        text = "娆㈣繋浣跨敤鏈蒋浠?
        for i, char in enumerate(text):
            label = tk.Label(center_frame, text=char, font=('寰蒋闆呴粦', 48, 'bold'),
                             fg=colors[i % len(colors)], bg='#f0f2f5')
            label.pack(side=tk.LEFT)
        sub_label = tk.Label(center_frame, text="\n楂樻晥鐭ヨ瘑绠＄悊 路 鏅鸿兘API閰嶇疆 路 娣卞害鎷嗕功鍒嗘瀽 路 杈呭姪鍐欎功", font=('寰蒋闆呴粦', 14),
                             fg='#7f8c8d', bg='#f0f2f5')
        sub_label.pack(side=tk.BOTTOM, pady=20)
        return page

    # ---------- 鐭ヨ瘑搴撻〉闈?----------
    def create_knowledge_page(self):
        page = tk.Frame(self.right_area, bg='#f0f2f5')
        upload_frame = ttk.LabelFrame(page, text="涓婁紶鏂囨。", padding=10)
        upload_frame.pack(fill=tk.X, padx=20, pady=10)
        self.kb_file_path = tk.StringVar()
        ttk.Label(upload_frame, text="閫夋嫨鏂囦欢:").grid(row=0, column=0, sticky='w', padx=5, pady=5)
        ttk.Entry(upload_frame, textvariable=self.kb_file_path, width=50).grid(row=0, column=1, padx=5, pady=5)
        ttk.Button(upload_frame, text="娴忚", command=self.browse_kb_file).grid(row=0, column=2, padx=5)
        ttk.Button(upload_frame, text="涓婁紶鏂囨。", command=self.upload_kb_document).grid(row=1, column=0, columnspan=3, pady=10)
        search_frame = ttk.LabelFrame(page, text="鏂囨。鍒楄〃", padding=10)
        search_frame.pack(fill=tk.BOTH, expand=True, padx=20, pady=10)
        search_row = tk.Frame(search_frame)
        search_row.pack(fill=tk.X, pady=5)
        ttk.Label(search_row, text="鎸夋爣棰樻悳绱?").pack(side=tk.LEFT, padx=5)
        self.kb_search_var = tk.StringVar()
        self.kb_search_var.trace('w', lambda *a: self.refresh_kb_list())
        ttk.Entry(search_row, textvariable=self.kb_search_var, width=30).pack(side=tk.LEFT, padx=5)
        ttk.Button(search_row, text="鍒锋柊", command=self.refresh_kb_list).pack(side=tk.LEFT, padx=5)
        columns = ("鏍囬", "婵€娲荤増鏈?, "鏈€鍚庢洿鏂?, "鎿嶄綔")
        self.kb_tree = ttk.Treeview(search_frame, columns=columns, show="headings", height=15)
        for col in columns:
            self.kb_tree.heading(col, text=col)
            if col == "鏍囬":
                self.kb_tree.column(col, width=300)
            elif col == "婵€娲荤増鏈?:
                self.kb_tree.column(col, width=100)
            elif col == "鏈€鍚庢洿鏂?:
                self.kb_tree.column(col, width=150)
            else:
                self.kb_tree.column(col, width=100)
        self.kb_tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scrollbar = ttk.Scrollbar(search_frame, orient=tk.VERTICAL, command=self.kb_tree.yview)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        self.kb_tree.configure(yscrollcommand=scrollbar.set)
        self.kb_tree.bind("<Double-1>", self.view_kb_document)
        self.kb_menu = tk.Menu(self.root, tearoff=0)
        self.kb_menu.add_command(label="鏌ョ湅鍐呭", command=self.view_kb_document)
        self.kb_menu.add_command(label="鐗堟湰绠＄悊", command=self.manage_kb_versions)
        self.kb_menu.add_command(label="鍒犻櫎鏂囨。", command=self.delete_kb_document)
        self.kb_tree.bind("<Button-3>", self.show_kb_context_menu)
        self.refresh_kb_list()
        return page

    def browse_kb_file(self):
        file_path = filedialog.askopenfilename(filetypes=[("Text files", "*.txt")])
        if file_path:
            self.kb_file_path.set(file_path)

    def upload_kb_document(self):
        file_path = self.kb_file_path.get().strip()
        if not file_path or not os.path.exists(file_path):
            messagebox.showwarning("鎻愮ず", "璇烽€夋嫨鏈夋晥鐨則xt鏂囦欢")
            return
        title = os.path.splitext(os.path.basename(file_path))[0]
        content = None
        encodings = ['utf-8', 'gbk', 'gb2312', 'gb18030', 'utf-16', 'latin-1']
        for enc in encodings:
            try:
                with open(file_path, 'r', encoding=enc) as f:
                    content = f.read()
                print(f"鎴愬姛浣跨敤缂栫爜 {enc} 璇诲彇鏂囦欢")
                break
            except UnicodeDecodeError:
                continue
        if content is None:
            messagebox.showerror("閿欒", f"鏃犳硶璇诲彇鏂囦欢锛屽皾璇曠殑缂栫爜鍧囧け璐ワ細{', '.join(encodings)}")
            return
        doc_id, version = self.kb_manager.upload_document(title, content)
        messagebox.showinfo("鎴愬姛", f"鏂囨。銆寋title}銆嶄笂浼犳垚鍔燂紝鐗堟湰 v{version}")
        self.kb_file_path.set("")
        self.refresh_kb_list()
        self.refresh_book_doc_list()

    def refresh_kb_list(self):
        for item in self.kb_tree.get_children():
            self.kb_tree.delete(item)
        keyword = self.kb_search_var.get().strip()
        docs = self.kb_manager.search_documents(keyword)
        for doc in docs:
            self.kb_tree.insert("", tk.END, values=(
                doc['title'],
                f"v{doc['active_version']}",
                doc['last_time'],
                "鍙屽嚮鏌ョ湅"
            ), iid=doc['doc_id'])

    def view_kb_document(self, event=None):
        selected = self.kb_tree.selection()
        if not selected:
            return
        doc_id = selected[0]
        content = self.kb_manager.get_document_content(doc_id)
        if content is None:
            messagebox.showerror("閿欒", "鏃犳硶鑾峰彇鏂囨。鍐呭")
            return
        win = tk.Toplevel(self.root)
        win.title(f"鏌ョ湅鏂囨。 - {doc_id}")
        win.geometry("700x500")
        text_area = scrolledtext.ScrolledText(win, wrap=tk.WORD)
        text_area.pack(fill=tk.BOTH, expand=True)
        text_area.insert(tk.END, content)
        text_area.config(state=tk.DISABLED)

    def manage_kb_versions(self):
        selected = self.kb_tree.selection()
        if not selected:
            return
        doc_id = selected[0]
        versions = self.kb_manager.get_version_list(doc_id)
        if not versions:
            return
        win = tk.Toplevel(self.root)
        win.title(f"鐗堟湰绠＄悊 - {doc_id}")
        win.geometry("500x400")
        tk.Label(win, text=f"鏂囨。锛歿doc_id}", font=('寰蒋闆呴粦', 12, 'bold')).pack(pady=10)
        listbox = tk.Listbox(win, height=15)
        listbox.pack(fill=tk.BOTH, expand=True, padx=20, pady=10)
        for v in versions:
            active_mark = "鉁?" if v['active'] else "  "
            listbox.insert(tk.END, f"{active_mark}v{v['version']} - {v['time']}")
        def switch():
            selection = listbox.curselection()
            if not selection:
                return
            idx = selection[0]
            target_version = versions[idx]['version']
            if self.kb_manager.switch_version(doc_id, target_version):
                messagebox.showinfo("鎴愬姛", f"宸插垏鎹㈠埌 v{target_version}")
                win.destroy()
                self.refresh_kb_list()
            else:
                messagebox.showerror("閿欒", "鍒囨崲澶辫触")
        ttk.Button(win, text="鍒囨崲鍒伴€変腑鐗堟湰", command=switch).pack(pady=10)

    def delete_kb_document(self):
        selected = self.kb_tree.selection()
        if not selected:
            return
        doc_id = selected[0]
        if messagebox.askyesno("纭鍒犻櫎", f"纭畾瑕佸垹闄ゆ枃妗ｃ€寋doc_id}銆嶅強鍏舵墍鏈夌増鏈悧锛?):
            self.kb_manager.delete_document(doc_id)
            self.refresh_kb_list()
            self.refresh_book_doc_list()

    def show_kb_context_menu(self, event):
        item = self.kb_tree.identify_row(event.y)
        if item:
            self.kb_tree.selection_set(item)
            self.kb_menu.post(event.x_root, event.y_root)

    # ---------- 鎷嗕功椤甸潰锛堝寮猴紝淇鍙充晶鏄剧ず鍖猴級 ----------
    def create_book_analysis_page(self):
        page = tk.Frame(self.right_area, bg='#f0f2f5')
        title_label = tk.Label(page, text="鎷嗕功鍒嗘瀽", font=('寰蒋闆呴粦', 18, 'bold'),
                               bg='#f0f2f5', fg='#2c3e50')
        title_label.pack(anchor='w', padx=20, pady=10)

        main_frame = tk.Frame(page, bg='#f0f2f5')
        main_frame.pack(fill=tk.BOTH, expand=True, padx=20, pady=10)

        # ========== 宸︿晶锛氭枃妗ｉ€夋嫨涓庢媶涔﹀垎鏋愬簱 ==========
        left_frame = ttk.LabelFrame(main_frame, text="鏂囨。閫夋嫨", padding=10)
        left_frame.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=(0,10))

        select_frame = tk.Frame(left_frame)
        select_frame.pack(fill=tk.X, pady=5)
        ttk.Label(select_frame, text="閫夋嫨鏂囨。:").pack(side=tk.LEFT, padx=5)
        self.book_combobox = ttk.Combobox(select_frame, width=30, state="readonly")
        self.book_combobox.pack(side=tk.LEFT, padx=5)

        self.detail_analysis_var = tk.BooleanVar(value=True)
        ttk.Checkbutton(select_frame, text="璇︾粏鍒嗘瀽锛堝惈浜虹墿寮у厜銆佸璇濇妧宸э級",
                        variable=self.detail_analysis_var).pack(side=tk.LEFT, padx=10)

        btn_frame = tk.Frame(left_frame)
        btn_frame.pack(fill=tk.X, pady=5)
        self.create_btn = ttk.Button(btn_frame, text="鎷嗕功鍒嗘瀽", command=self.create_book_analysis)
        self.create_btn.pack(side=tk.LEFT, padx=5)
        self.edit_template_btn = ttk.Button(btn_frame, text="缂栬緫妯℃澘", command=self.edit_template, state=tk.DISABLED)
        self.edit_template_btn.pack(side=tk.LEFT, padx=5)

        self.analysis_hint = tk.Label(left_frame, text="璇蜂粠涓嬫媺妗嗛€夋嫨鏂囨。锛岀劧鍚庣偣鍑绘寜閽?,
                                      font=('寰蒋闆呴粦', 10), fg='gray', bg='#f0f2f5')
        self.analysis_hint.pack(pady=5)

        library_frame = ttk.LabelFrame(left_frame, text="鎷嗕功鍒嗘瀽搴撳垪琛?, padding=10)
        library_frame.pack(fill=tk.BOTH, expand=True, pady=5)
        self.book_analysis_listbox = tk.Listbox(library_frame, height=15)
        self.book_analysis_listbox.pack(fill=tk.BOTH, expand=True)
        self.book_analysis_listbox.bind("<Button-3>", self.show_book_analysis_menu)
        self.book_analysis_listbox.bind("<ButtonRelease-1>", self.on_select_book_analysis)

        # ========== 鍙充晶锛氭媶涔﹀垎鏋愮粨鏋滄樉绀哄尯 ==========
        right_frame = ttk.LabelFrame(main_frame, text="鎷嗕功鍒嗘瀽缁撴灉锛堝惈澶嶇敤妯℃澘锛?, padding=10)
        right_frame.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True)
        self.analysis_result_text = scrolledtext.ScrolledText(right_frame, wrap=tk.WORD, font=('寰蒋闆呴粦', 10))
        self.analysis_result_text.pack(fill=tk.BOTH, expand=True)

        self.refresh_book_doc_list()
        self.refresh_analysis_library()
        return page

    def refresh_book_doc_list(self):
        docs = self.kb_manager.get_all_documents()
        titles = [doc['title'] for doc in docs]
        self.book_combobox['values'] = titles
        if titles:
            self.book_combobox.set(titles[0])
        else:
            self.book_combobox.set('')

    def on_select_book_analysis(self, event=None):
        selection = self.book_analysis_listbox.curselection()
        if not selection:
            return
        title_full = self.book_analysis_listbox.get(selection[0])
        title = title_full.split('. ', 1)[1] if '. ' in title_full else title_full
        content = self.book_analysis_manager.get_document_content(title)
        self.analysis_result_text.delete(1.0, tk.END)
        if content:
            self.analysis_result_text.insert(tk.END, content)
        else:
            self.analysis_result_text.insert(tk.END, "鏈壘鍒板唴瀹?)

    def on_select_book_analysis_with_prompts(self, event=None):
        """褰撶偣鍑绘媶涔﹀垎鏋愬簱涓殑鏂囨。鏃讹紝鍔犺浇璇ユ枃妗ｅ唴瀹瑰苟鏌ユ壘鐩稿叧鐨勬柊涔︽彁绀鸿瘝"""
        selection = self.book_analysis_listbox.curselection()
        if not selection:
            return
        
        # 鑾峰彇閫変腑鐨勬媶涔﹀垎鏋愭枃妗ｆ爣棰?
        title_full = self.book_analysis_listbox.get(selection[0])
        title = title_full.split('. ', 1)[1] if '. ' in title_full else title_full
        
        # 鍔犺浇鎷嗕功鍒嗘瀽鍐呭鍒板彸渚ф枃鏈
        content = self.book_analysis_manager.get_document_content(title)
        self.analysis_result_text.delete(1.0, tk.END)
        if content:
            self.analysis_result_text.insert(tk.END, content)
        else:
            self.analysis_result_text.insert(tk.END, "鏈壘鍒板唴瀹?)
        
        # 娓呯┖鏂颁功鎻愮ず璇嶅垪琛ㄦ
        self.new_book_prompts_listbox.delete(0, tk.END)
        
        # 鏌ユ壘涓庤鎷嗕功鍒嗘瀽鐩稿叧鐨勬柊涔︽彁绀鸿瘝
        self.load_new_book_prompts_for_analysis(title)
    
    def load_new_book_prompts_for_analysis(self, analysis_title):
        """鍔犺浇涓庢寚瀹氭媶涔﹀垎鏋愮浉鍏崇殑鏂颁功鎻愮ず璇?""
        tishici_dir = "./tishici"
        if not os.path.exists(tishici_dir):
            return
        
        # 鑾峰彇鎵€鏈夋柊涔︽彁绀鸿瘝鏂囦欢
        prompt_files = []
        for filename in os.listdir(tishici_dir):
            if filename.endswith('-鎻愮ず璇?txt'):
                prompt_files.append(filename)
        
        # 绠€鍗曞叧鑱旈€昏緫锛氬鏋滄柊涔︽彁绀鸿瘝鏂囦欢鍚嶅寘鍚媶涔﹀垎鏋愮殑鍏抽敭璇嶏紝鍒欒涓烘槸鐩稿叧鐨?
        # 鎷嗕功鍒嗘瀽鏍囬鏍煎紡閫氬父鏄?"鍘熶功鍚?鎷嗕功"锛屾垜浠彁鍙栧師涔﹀悕鐨勯儴鍒?
        original_book_title = analysis_title.replace('-鎷嗕功', '')
        
        # 鏌ユ壘鐩稿叧鐨勬柊涔︽彁绀鸿瘝
        related_prompts = []
        for filename in prompt_files:
            # 浠庢枃浠跺悕涓彁鍙栨柊涔﹀悕锛堝幓鎺?-鎻愮ず璇?txt"鍚庣紑锛?
            new_book_title = filename.replace('-鎻愮ず璇?txt', '')
            
            # 绠€鍗曞尮閰嶏細濡傛灉鏂颁功鎻愮ず璇嶆枃浠跺悕鍖呭惈鍘熶功鍚嶇殑鍏抽敭璇嶏紝鎴栬€呭師涔﹀悕鍖呭惈鏂颁功鍚嶇殑鍏抽敭璇?
            # 杩欓噷浣跨敤绠€鍗曠殑鍖呭惈鍖归厤锛屽疄闄呭彲浠ユ牴鎹渶瑕佸疄鐜版洿澶嶆潅鐨勫叧鑱旈€昏緫
            if original_book_title in filename or new_book_title in analysis_title:
                related_prompts.append((filename, new_book_title))
        
        # 濡傛灉娌℃湁鎵惧埌鐩稿叧鎻愮ず璇嶏紝灏濊瘯鏇村鏉剧殑鍖归厤
        if not related_prompts:
            # 浣跨敤鎷嗕功鍒嗘瀽鏍囬鐨勫墠鍑犱釜瀛楃杩涜鍖归厤
            search_prefix = original_book_title[:4]
            for filename in prompt_files:
                if search_prefix and search_prefix in filename:
                    new_book_title = filename.replace('-鎻愮ず璇?txt', '')
                    related_prompts.append((filename, new_book_title))
        
        # 灏嗙浉鍏虫彁绀鸿瘝娣诲姞鍒板垪琛ㄦ涓?
        for i, (filename, new_book_title) in enumerate(related_prompts, start=1):
            self.new_book_prompts_listbox.insert(tk.END, f"{i}. {new_book_title}")
    
    def on_select_new_book_prompt(self, event=None):
        """褰撶偣鍑绘柊涔︽彁绀鸿瘝鍒楄〃妗嗕腑鐨勬彁绀鸿瘝鏃讹紝鍔犺浇璇ユ彁绀鸿瘝鍐呭鍒板彸渚ф枃鏈"""
        selection = self.new_book_prompts_listbox.curselection()
        if not selection:
            return
        
        # 鑾峰彇閫変腑鐨勬柊涔︽彁绀鸿瘝鏍囬
        title_full = self.new_book_prompts_listbox.get(selection[0])
        title = title_full.split('. ', 1)[1] if '. ' in title_full else title_full
        
        # 鏋勫缓鏂囦欢璺緞
        tishici_dir = "./tishici"
        filename = f"{title}-鎻愮ず璇?txt"
        filepath = os.path.join(tishici_dir, filename)
        
        # 璇诲彇鏂囦欢鍐呭
        if os.path.exists(filepath):
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                self.analysis_result_text.delete(1.0, tk.END)
                self.analysis_result_text.insert(tk.END, content)
            except Exception as e:
                self.analysis_result_text.delete(1.0, tk.END)
                self.analysis_result_text.insert(tk.END, f"璇诲彇鏂囦欢澶辫触锛歿e}")
        else:
            self.analysis_result_text.delete(1.0, tk.END)
            self.analysis_result_text.insert(tk.END, f"鏈壘鍒版枃浠讹細{filepath}")

    def on_select_write_analysis_with_prompts(self, event=None):
        """褰撶偣鍑诲啓涔﹂〉闈㈡媶涔﹀垎鏋愬簱涓殑鏂囨。鏃讹紝鍔犺浇璇ユ枃妗ｅ唴瀹瑰苟鏌ユ壘鐩稿叧鐨勬柊涔︽彁绀鸿瘝"""
        selection = self.write_analysis_listbox.curselection()
        if not selection:
            return
        
        # 鑾峰彇閫変腑鐨勬媶涔﹀垎鏋愭枃妗ｆ爣棰?
        title_full = self.write_analysis_listbox.get(selection[0])
        title = title_full.split('. ', 1)[1] if '. ' in title_full else title_full
        
        # 娓呯┖鏂颁功鎻愮ず璇嶅垪琛ㄦ
        self.write_new_book_prompts_listbox.delete(0, tk.END)
        
        # 鏌ユ壘涓庤鎷嗕功鍒嗘瀽鐩稿叧鐨勬柊涔︽彁绀鸿瘝
        self.load_write_new_book_prompts_for_analysis(title)
    
    def load_write_new_book_prompts_for_analysis(self, analysis_title):
        """鍔犺浇涓庢寚瀹氭媶涔﹀垎鏋愮浉鍏崇殑鏂颁功鎻愮ず璇嶏紙鍐欎功椤甸潰涓撶敤锛?""
        tishici_dir = "./tishici"
        if not os.path.exists(tishici_dir):
            return
        
        # 鑾峰彇鎵€鏈夋柊涔︽彁绀鸿瘝鏂囦欢
        prompt_files = []
        for filename in os.listdir(tishici_dir):
            if filename.endswith('-鎻愮ず璇?txt'):
                prompt_files.append(filename)
        
        # 绠€鍗曞叧鑱旈€昏緫锛氬鏋滄柊涔︽彁绀鸿瘝鏂囦欢鍚嶅寘鍚媶涔﹀垎鏋愮殑鍏抽敭璇嶏紝鍒欒涓烘槸鐩稿叧鐨?
        # 鎷嗕功鍒嗘瀽鏍囬鏍煎紡閫氬父鏄?"鍘熶功鍚?鎷嗕功"锛屾垜浠彁鍙栧師涔﹀悕鐨勯儴鍒?
        original_book_title = analysis_title.replace('-鎷嗕功', '')
        
        # 鏌ユ壘鐩稿叧鐨勬柊涔︽彁绀鸿瘝
        related_prompts = []
        for filename in prompt_files:
            # 浠庢枃浠跺悕涓彁鍙栨柊涔﹀悕锛堝幓鎺?-鎻愮ず璇?txt"鍚庣紑锛?
            new_book_title = filename.replace('-鎻愮ず璇?txt', '')
            
            # 绠€鍗曞尮閰嶏細濡傛灉鏂颁功鎻愮ず璇嶆枃浠跺悕鍖呭惈鍘熶功鍚嶇殑鍏抽敭璇嶏紝鎴栬€呭師涔﹀悕鍖呭惈鏂颁功鍚嶇殑鍏抽敭璇?
            if original_book_title in filename or new_book_title in analysis_title:
                related_prompts.append((filename, new_book_title))
        
        # 濡傛灉娌℃湁鎵惧埌鐩稿叧鎻愮ず璇嶏紝灏濊瘯鏇村鏉剧殑鍖归厤
        if not related_prompts:
            # 浣跨敤鎷嗕功鍒嗘瀽鏍囬鐨勫墠鍑犱釜瀛楃杩涜鍖归厤
            search_prefix = original_book_title[:4]
            for filename in prompt_files:
                if search_prefix and search_prefix in filename:
                    new_book_title = filename.replace('-鎻愮ず璇?txt', '')
                    related_prompts.append((filename, new_book_title))
        
        # 灏嗙浉鍏虫彁绀鸿瘝娣诲姞鍒板垪琛ㄦ涓?
        for i, (filename, new_book_title) in enumerate(related_prompts, start=1):
            self.write_new_book_prompts_listbox.insert(tk.END, f"{i}. {new_book_title}")
    
    def on_select_write_new_book_prompt(self, event=None):
        """褰撶偣鍑诲啓涔﹂〉闈㈡柊涔︽彁绀鸿瘝鍒楄〃妗嗕腑鐨勬彁绀鸿瘝鏃讹紝鍔犺浇璇ユ彁绀鸿瘝鍐呭鍒板彸渚ф枃鏈锛屽苟鎵ц鏍稿績鍓嶆彁鎿嶄綔"""
        selection = self.write_new_book_prompts_listbox.curselection()
        if not selection:
            return
        
        # 鑾峰彇閫変腑鐨勬柊涔︽彁绀鸿瘝鏍囬
        title_full = self.write_new_book_prompts_listbox.get(selection[0])
        title = title_full.split('. ', 1)[1] if '. ' in title_full else title_full
        
        # 鏋勫缓鏂囦欢璺緞
        tishici_dir = "./tishici"
        filename = f"{title}-鎻愮ず璇?txt"
        filepath = os.path.join(tishici_dir, filename)
        
        # 璇诲彇鏂囦欢鍐呭
        if os.path.exists(filepath):
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                self.prompt_result_text.delete(1.0, tk.END)
                self.prompt_result_text.insert(tk.END, content)
                
                # 鎵ц鏍稿績鍓嶆彁鎿嶄綔锛氭娴嬪苟鍒涘缓鏂颁功鐩稿叧鏂囨。
                self._process_new_book_core_operations(title, content)
            except Exception as e:
                self.prompt_result_text.delete(1.0, tk.END)
                self.prompt_result_text.insert(tk.END, f"璇诲彇鏂囦欢澶辫触锛歿e}")
        else:
            self.prompt_result_text.delete(1.0, tk.END)
            self.prompt_result_text.insert(tk.END, f"鏈壘鍒版枃浠讹細{filepath}")
    
    def _process_new_book_core_operations(self, book_title, prompt_content):
        """澶勭悊鏂颁功鏍稿績鍓嶆彁鎿嶄綔锛氭娴嬨€佸垱寤烘枃浠跺す鍜屾枃妗ｏ紝濉厖鍐呭"""
        # 涓€銆佹牳蹇冨墠鎻愭搷浣滐紙鐐瑰嚮鏂颁功鎻愮ず璇嶆枃妗ｅ悗瑙﹀彂锛?
        
        # 1. 妫€娴嬬洰鏍囷細淇濆瓨璺緞涓嬶紝浠ャ€屾柊涔﹀悕銆嶅懡鍚嶇殑鏂囦欢澶逛腑锛屾槸鍚﹀瓨鍦ㄥ悕涓恒€屼功鍚?鏂颁功绠€浠嬨€嶇殑鏂囨。
        save_dir = self.save_path.get()
        book_dir = os.path.join(save_dir, book_title)
        intro_file = os.path.join(book_dir, f"{book_title}-鏂颁功绠€浠?txt")
        
        # 鍒涘缓鏂颁功鏂囦欢澶癸紙濡傛灉涓嶅瓨鍦級
        os.makedirs(book_dir, exist_ok=True)
        
        # 鍒涘缓瀛愭枃浠跺す缁撴瀯
        sub_dirs = ["jiagou", "lantu", "caogao"]
        for sub_dir in sub_dirs:
            os.makedirs(os.path.join(book_dir, sub_dir), exist_ok=True)
        
        # 2. 鎵ц鍔ㄤ綔1锛堟枃妗ｄ笉瀛樺湪锛夛細鏂板缓鍚嶄负銆屼功鍚?鏂颁功绠€浠嬨€嶇殑鏂囨。
        if not os.path.exists(intro_file):
            # 浠庢彁绀鸿瘝鍐呭涓彁鍙栨柊涔︾畝浠?
            intro_content = self._extract_book_intro_from_prompt(prompt_content)
            
            # 淇濆瓨鏂颁功绠€浠嬫枃妗?
            with open(intro_file, 'w', encoding='utf-8') as f:
                f.write(intro_content)
            
            # 鑷姩濉叆鏂颁功绗簩椤靛搴旂殑杈撳叆妗?
            self._auto_fill_book_info(book_title, intro_content)
            
            print(f"宸插垱寤烘柊涔︾畝浠嬫枃妗ｏ細{intro_file}")
        else:
            # 3. 鎵ц鍔ㄤ綔2锛堟枃妗ｅ瓨鍦級锛氱洿鎺ヨ鍙栧苟濉厖鍐呭
            try:
                with open(intro_file, 'r', encoding='utf-8') as f:
                    intro_content = f.read()
                self._auto_fill_book_info(book_title, intro_content)
                print(f"宸茶鍙栫幇鏈夋柊涔︾畝浠嬫枃妗ｏ細{intro_file}")
            except Exception as e:
                print(f"璇诲彇鏂颁功绠€浠嬫枃妗ｅけ璐ワ細{e}")
        
        # 4. 鍚庣画妫€娴嬶細妫€娴嬪瓙鏂囦欢澶圭粨鏋?
        self._check_subdirectories_structure(book_dir)
    
    def _extract_book_intro_from_prompt(self, prompt_content):
        """浠庢彁绀鸿瘝鍐呭涓彁鍙栨柊涔︾畝浠?""
        # 灏濊瘯浠庢彁绀鸿瘝涓彁鍙栫畝浠嬮儴鍒?
        intro_patterns = [
            r'\*\*绠€浠嬶細\*\*\s*(.+?)(?=\n\*\*|\n涓€銆亅\n浜屻€亅\n涓夈€亅\n鍥涖€亅\n浜斻€亅$)',
            r'绠€浠媅锛?]\s*(.+?)(?=\n涓€銆亅\n浜屻€亅\n涓夈€亅\n鍥涖€亅\n浜斻€亅$)',
            r'鏂颁功绠€浠媅锛?]\s*(.+?)(?=\n涓€銆亅\n浜屻€亅\n涓夈€亅\n鍥涖€亅\n浜斻€亅$)',
        ]
        
        for pattern in intro_patterns:
            match = re.search(pattern, prompt_content, re.DOTALL)
            if match:
                intro = match.group(1).strip()
                if intro:
                    return intro
        
        # 濡傛灉娌℃湁鎵惧埌绠€浠嬶紝浣跨敤榛樿鍐呭
        return "鏂颁功绠€浠嬪唴瀹瑰緟琛ュ厖..."
    
    def _auto_fill_book_info(self, book_title, intro_content):
        """鑷姩濉厖鏂颁功绗簩椤靛搴旂殑杈撳叆妗?""
        # 璁剧疆鏂颁功鍚?
        self.new_book_title.set(book_title)
        
        # 璁剧疆鏂颁功绠€浠?
        self.new_book_synopsis.set(intro_content[:500])  # 闄愬埗闀垮害
        
        # 浠庣畝浠嬩腑鎺ㄦ柇棰樻潗
        inferred_genre = self.infer_genre(book_title, intro_content)
        self.genre.set(inferred_genre)
        
        print(f"宸茶嚜鍔ㄥ～鍏咃細涔﹀悕={book_title}, 棰樻潗={inferred_genre}")
    
    def _check_subdirectories_structure(self, book_dir):
        """妫€娴嬪瓙鏂囦欢澶圭粨鏋?""
        sub_dirs = ["jiagou", "lantu", "caogao"]
        book_title = os.path.basename(book_dir)
        
        for sub_dir in sub_dirs:
            sub_dir_path = os.path.join(book_dir, sub_dir)
            if os.path.exists(sub_dir_path):
                print(f"鉁?瀛愭枃浠跺す瀛樺湪锛歿sub_dir_path}")
                
                # 妫€鏌ユ槸鍚︽湁瀵瑰簲鐨勬枃妗?
                if sub_dir == "jiagou":
                    arch_file = os.path.join(sub_dir_path, f"{book_title}-鏋舵瀯.txt")
                    if os.path.exists(arch_file):
                        print(f"  - 鏋舵瀯鏂囨。宸插瓨鍦細{arch_file}")
                
                elif sub_dir == "lantu":
                    blueprint_file = os.path.join(sub_dir_path, f"{book_title}-钃濆浘.txt")
                    if os.path.exists(blueprint_file):
                        print(f"  - 钃濆浘鏂囨。宸插瓨鍦細{blueprint_file}")
                
                elif sub_dir == "caogao":
                    # 妫€鏌ヨ崏绋挎枃浠?
                    draft_files = [f for f in os.listdir(sub_dir_path) if f.endswith('.txt')]
                    if draft_files:
                        print(f"  - 鑽夌鏂囨。宸插瓨鍦細{len(draft_files)}涓枃浠?)
            else:
                print(f"鉁?瀛愭枃浠跺す涓嶅瓨鍦細{sub_dir_path}")

    # 鏅鸿兘鎴柇锛氬紑澶?000 + 涓棿3000 + 缁撳熬2000
    def smart_truncate(self, content, max_chars=11000):
        if len(content) <= max_chars:
            return content
        total = len(content)
        head_len = 6000
        middle_len = 3000
        tail_len = 2000
        head = content[:head_len]
        middle_start = total // 2 - middle_len // 2
        middle = content[middle_start:middle_start + middle_len]
        tail = content[-tail_len:]
        return f"{head}\n\n...[涓棿閮ㄥ垎]...\n\n{middle}\n\n...[缁撳熬閮ㄥ垎]...\n\n{tail}"

    # 椴佹鐨勬ā鏉挎彁鍙?
    def extract_template(self, analysis_text):
        patterns = [
            r'###\s*涓冦€佹彁鐐兼ā鏉?.*?)(?=###\s*鍏珅###\s*缁煎悎|$)',
            r'##\s*涓冦€佹彁鐐兼ā鏉?.*?)(?=##\s*鍏珅##\s*缁煎悎|$)',
            r'涓冦€佹彁鐐兼ā鏉縖锛?]\s*(.*?)(?=鍏€亅$)',
            r'鎻愮偧妯℃澘[锛?]\s*(.*?)(?=鍏€亅$)',
            r'###\s*7\.\s*鎻愮偧妯℃澘(.*?)(?=###\s*8\.|###\s*缁煎悎|$)',
        ]
        for pattern in patterns:
            match = re.search(pattern, analysis_text, re.DOTALL | re.IGNORECASE)
            if match:
                template = match.group(1).strip()
                if template:
                    return template
        sections = re.split(r'\n###\s+', analysis_text)
        for sec in sections:
            if '鎻愮偧妯℃澘' in sec or '涓冦€? in sec:
                return sec.strip()
        return None

    def edit_template(self):
        if not hasattr(self, 'current_template_text') or not self.current_template_text:
            messagebox.showwarning("鎻愮ず", "娌℃湁鍙紪杈戠殑妯℃澘锛岃鍏堣繘琛屾媶涔﹀垎鏋?)
            return
        win = tk.Toplevel(self.root)
        win.title("缂栬緫妯℃澘")
        win.geometry("800x600")
        text_area = scrolledtext.ScrolledText(win, wrap=tk.WORD, font=('寰蒋闆呴粦', 10))
        text_area.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        text_area.insert(tk.END, self.current_template_text)
        def save():
            new_template = text_area.get(1.0, tk.END).strip()
            if new_template:
                self.current_template_text = new_template
                messagebox.showinfo("鎴愬姛", "妯℃澘宸叉洿鏂帮紝鍙互浣跨敤銆岄噸鏂扮敓鎴愭柊涔︽彁绀鸿瘝銆嶆寜閽敓鎴愭柊涔︽彁绀鸿瘝")
                win.destroy()
            else:
                messagebox.showwarning("鎻愮ず", "妯℃澘涓嶈兘涓虹┖")
        ttk.Button(win, text="淇濆瓨", command=save).pack(pady=10)

    def save_current_template(self):
        if not hasattr(self, 'current_template_text') or not self.current_template_text:
            messagebox.showwarning("鎻愮ず", "娌℃湁鍙繚瀛樼殑妯℃澘")
            return
        source_title = self.book_combobox.get().strip()
        self.template_manager.save_template(source_title, self.current_template_text, self.analysis_result_text.get(1.0, tk.END).strip()[:500])
        messagebox.showinfo("鎴愬姛", "妯℃澘宸蹭繚瀛樺埌妯℃澘搴?)

    def regenerate_new_book_prompt(self):
        if not hasattr(self, 'current_template_text') or not self.current_template_text:
            messagebox.showwarning("鎻愮ず", "娌℃湁妯℃澘锛岃鍏堣繘琛屾媶涔﹀垎鏋?)
            return
        if not self.api_key.get().strip():
            messagebox.showwarning("鎻愮ず", "璇峰厛鍦ㄧ郴缁熻缃腑閰嶇疆API Key")
            return
        if hasattr(self, 'current_write_page') and self.current_write_page == 1:
            target_text = self.prompt_result_text
        else:
            target_text = self.new_book_prompt_text
        target_text.delete(1.0, tk.END)
        target_text.insert(tk.END, "姝ｅ湪鐢熸垚鏂颁功鎻愮ず璇嶏紝璇风◢鍊?..\n")
        self.regenerate_prompt_btn.config(state=tk.DISABLED)
        def task():
            llm = SimpleLLM(
                api_key=self.api_key.get().strip(),
                base_url=self.base_url.get().strip(),
                model=self.model_name.get().strip(),
                temperature=self.temp.get(),
                max_tokens=8192
            )
            prompt_new_book = self.build_new_book_prompt(self.current_template_text)
            result = llm.chat(prompt_new_book, retry_count=3)
            self.root.after(0, lambda: target_text.delete(1.0, tk.END))
            if "閿欒锛? in result or "璇锋眰寮傚父" in result:
                self.root.after(0, lambda: target_text.insert(tk.END, f"鐢熸垚澶辫触锛歿result}"))
            else:
                self.root.after(0, lambda: target_text.insert(tk.END, result))
                self.root.after(0, lambda: self.extract_and_sync_book_info(result))
            self.root.after(0, lambda: self.regenerate_prompt_btn.config(state=tk.NORMAL))
        threading.Thread(target=task, daemon=True).start()

    def build_new_book_prompt(self, template_text):
        anti_plagiarism = """
**閲嶈锛氬弽鎶勮绾︽潫**
- 浣犲繀椤荤敓鎴愬畬鍏ㄥ師鍒涚殑鏁呬簨锛屼笉鑳戒娇鐢ㄥ師浣滃搧鐨勪换浣曞叿浣撳墽鎯呫€佷汉鐗╁鍚嶃€佸湴鍚嶃€佹牳蹇冭瀹氥€?
- 濡傛灉浣犲彂鐜拌嚜宸辩敓鎴愮殑璁惧畾涓庡師浣滅浉浼煎害瓒呰繃30%锛岃鑷姩璋冩暣锛屾洿鎹㈠厓绱犮€?
- 鐢熸垚瀹屾垚鍚庯紝璇疯嚜鏌ワ細鏄惁鏈変换浣曟ˉ娈点€佸璇濄€佸啿绐佷笌鍘熶綔闆峰悓锛熷鏋滄湁锛岃鏀瑰啓銆?
"""
        return f"""浣犳槸涓€浣嶈祫娣卞皬璇村ぇ绾茶璁″笀銆備笅闈㈡槸涓€涓粠鏌愰儴浣滃搧涓彁鐐煎嚭鐨勨€滃彲澶嶇敤鍐欎綔妯℃澘鈥濄€傝涓ユ牸鍩轰簬杩欎釜妯℃澘鐨勭粨鏋勫拰鎬濊矾锛?*浣嗕笉瑕佷娇鐢ㄥ師浣滃搧鐨勪换浣曞叿浣撳墽鎯呫€佷汉鐗┿€佽瀹氥€佸啿绐?*锛岀敓鎴愪竴涓叏鏂扮殑銆佸師鍒涚殑灏忚鍐欎綔鎻愮ず璇嶃€?

{anti_plagiarism}

**鐗瑰埆瑕佹眰锛?*
1. **鏂颁功鍚嶅繀椤讳弗鏍奸伒寰互涓嬪叕寮忥細`鍦烘櫙/韬唤 + 鍐茬獊/鍔ㄤ綔 + 缁撴灉/鐖界偣`**
   - 绀轰緥1锛堣韩浠?鍔ㄤ綔+瀵硅薄锛夛細銆婇€€浼嶅叺鐜嬫í鎵豹闂ㄣ€?
   - 绀轰緥2锛堟椂闂?閲戞墜鎸?鏁板€硷級锛氥€婂紑灞€绛惧埌涓€涓嚎銆?
   - 绀轰緥3锛堣韩浠?鐘舵€?缁撴灉锛夛細銆婅閫愬嚭瀹楅棬鍚庢垜鏃犳晫浜嗐€?
   - 绀轰緥4锛堣儗鏅?鑳藉姏+鎮康锛夛細銆婂叏鐞冭閱掞細鎴戣兘鐪嬪埌闅愯棌灞炴€с€?
   - 璇锋牴鎹綘鐢熸垚鐨勬晠浜嬬被鍨嬶紝鍒涗綔涓€涓鍚堣鍏紡鐨勫師鍒涗功鍚嶃€?

2. **鏂颁功绠€浠嬪繀椤婚伒寰箍鍛婁笁娈靛紡锛?*
   - 绗竴鍙ワ細涓昏鏄皝锛屽浜庝粈涔堝澧冿紵锛堝缓绔嬩唬鍏ユ劅锛?
   - 绗簩鍙ワ細鎶涘嚭鍐茬獊鈥斺€斾粈涔堢煕鐩俱€佷笉鍏垨鏈洪亣鎵撶牬浜嗗钩闈欙紵锛堝埗閫犵揣寮犳劅锛?
   - 绗笁鍙ワ細鎮康鏀跺熬鈥斺€斾笉缁欑瓟妗堬紝璁╄鑰呬骇鐢熷ソ濂囪嚜宸卞幓鎵剧瓟妗堛€?
   - 绠€浠嬫暣浣撹鍍忓箍鍛婁竴鏍峰惛寮曚汉锛屼笉鑳藉啓鎴愬ぇ绾层€?

妯℃澘鍐呭濡備笅锛?
{template_text}

璇疯緭鍑轰竴涓畬鏁寸殑鏂颁功鍐欎綔鎻愮ず璇嶏紝鏍煎紡濡備笅锛堢洿鎺ヨ緭鍑猴紝涓嶈鍔犻澶栬В閲婏級锛?

銆愭柊涔﹀啓浣滄彁绀鸿瘝銆?

**涔﹀悕锛?* 锛堝繀椤荤鍚堜笂杩板叕寮忥級

**绠€浠嬶細** 锛堜笁娈靛紡骞垮憡锛屾瘡娈典竴鍙ワ紝鎬诲瓧鏁?00-200瀛楋級

涓€銆佸紑绡囪璁″缓璁?
锛堟牴鎹ā鏉垮～鍏呭叿浣撳唴瀹癸紝鍘熷垱锛屽寘鎷浣曞啓鍑哄墠涓夌珷锛?

浜屻€佺珷鑺傝妭濂忓缓璁?
锛堝師鍒涜妭濂忚〃锛屾瘡绔犲瓧鏁板缓璁級

涓夈€佺埥鐐瑰畨鎺掑缓璁?
锛堝師鍒涚埥鐐圭被鍨嬪拰棰戠巼锛屼互鍙婂叿浣撳湪鍝簺绔犺妭鍑虹幇锛?

鍥涖€侀噾鎵嬫寚璁捐寤鸿
锛堝師鍒涢噾鎵嬫寚閫昏緫锛屽寘鎷檺鍒跺拰鎴愰暱璺嚎锛?

浜斻€佸畬鏁存晠浜嬪ぇ绾叉鏋?
锛堟彁渚涗竴涓彲濉┖鐨勫ぇ绾诧紝鐢ㄦ埛鍙嚜琛屽～鍏ュ叿浣撹瀹氾紝鍖呭惈鑷冲皯10涓珷鑺傜殑姒傝锛?

璇风‘淇濇彁绀鸿瘝鍏蜂綋銆佸彲鎿嶄綔锛屽苟涓斿畬鍏ㄥ師鍒涖€備功鍚嶅拰绠€浠嬪繀椤′弗鏍兼寜鐓т笂杩拌姹傚垱浣溿€?{self.get_hot_engagement_constraints('prompt')}
{self.get_bestseller_engine_prompt('writing')}"""

    def create_book_analysis(self):
        selected_title = self.book_combobox.get().strip()
        if not selected_title:
            messagebox.showwarning("鎻愮ず", "璇蜂粠涓嬫媺妗嗛€夋嫨涓€涓枃妗?)
            return
        if not self.api_key.get().strip():
            messagebox.showwarning("鎻愮ず", "璇峰厛鍦ㄣ€岀郴缁熻缃€嶄腑閰嶇疆API Key骞舵祴璇?)
            return

        analysis_title = f"{selected_title}-鎷嗕功"
        existing_docs = self.kb_manager.get_all_documents()
        if any(doc['title'] == analysis_title for doc in existing_docs):
            if not messagebox.askyesno("鎻愮ず", f"璇ヤ功銆妠selected_title}銆嬪凡鎷嗕功锛屾槸鍚﹂噸鏂板垎鏋愶紙灏嗚鐩栧師鏈夌粨鏋滐級锛?):
                return

        content = self.kb_manager.get_document_content(selected_title)
        if not content:
            messagebox.showerror("閿欒", f"鏃犳硶璇诲彇鏂囨。銆寋selected_title}銆嶇殑鍐呭")
            return

        self.analysis_result_text.delete(1.0, tk.END)
        self.analysis_result_text.insert(tk.END, "姝ｅ湪鍒嗘瀽涓紝璇风◢鍊?..\n")
        self.create_btn.config(state=tk.DISABLED)
        self.edit_template_btn.config(state=tk.DISABLED)

        def analysis_task():
            try:
                llm = self.get_llm()
                truncated_content = self.smart_truncate(content)
                detail_section = ""
                if self.detail_analysis_var.get():
                    detail_section = """
### 涔濄€佷汉鐗╁姬鍏夊垎鏋?
- 涓昏鍦ㄦ晠浜嬩腑鐨勬垚闀挎洸绾挎槸浠€涔堬紵缁忓巻浜嗗摢浜涘叧閿浆鍙橈紵
- 閰嶈鏄惁鏈夌嫭绔嬬殑鍔ㄦ満鍜屽彉鍖栵紵

### 鍗併€佸璇濇妧宸у垎鏋?
- 瀵硅瘽鏄惁鎺ㄥ姩鎯呰妭鎴栧閫犱汉鐗╋紵
- 瀵硅瘽鐨勮妭濂忓拰椋庢牸濡備綍锛?
"""
                prompt_analysis = f"""浣犳槸涓€浣嶉《灏栫殑灏忚缂栬緫涓庡啓浣滄暀缁冦€傝瀵逛互涓嬪皬璇村唴瀹硅繘琛屾繁搴︽媶瑙ｅ垎鏋愶紝涓ユ牸鎸夌収涓嬪垪缁村害杈撳嚭缁撴瀯鍖栨姤鍛娿€?*閲嶇偣锛氭渶鍚庡繀椤昏緭鍑轰竴涓竻鏅般€佸彲鐩存帴澶嶇敤鐨勫啓浣滄ā鏉匡紙鏀惧湪鈥?## 涓冦€佹彁鐐兼ā鏉库€濋儴鍒嗭級銆?*
{detail_section}
灏忚鍐呭锛?
{truncated_content}

璇锋寜浠ヤ笅鏍煎紡杈撳嚭锛?

### 涓€銆佸紑绡囪璁★紙鍓嶄笁绔犳槸鎬庝箞鎶撲汉鐨勶級
- 绗竴娈?绗竴鍙ヨ瘽鏄€庝箞寮€鍦虹殑锛熺敤浜嗕粈涔堟墜娉曞惛寮曡鑰咃紵
- 涓昏鍦ㄧ鍑犳鍑哄満锛熷嚭鍦烘椂璇昏€呭浠栫殑绗竴鍗拌薄鏄粈涔堬紵
- 鍓嶄笁绔犻噷锛屾牳蹇冨啿绐佹槸浠€涔堟椂鍊欐姏鍑烘潵鐨勶紵
- 璇昏€呯湅瀹屽墠涓夌珷锛屼細浜х敓浠€涔堢枒闂兂缁х画鐪嬩笅鍘伙紵
- 鍓嶄笁绔犵殑淇℃伅瀵嗗害濡備綍锛熸槸涓€涓婃潵灏卞ぇ閲忚瀹氾紝杩樻槸杈硅蛋杈逛氦浠ｏ紵

### 浜屻€侀挬瀛愯璁★紙璁╀汉鎯崇炕涓嬩竴椤电殑鎶€宸э級
- 姣忎竴绔犵粨灏炬槸鍚︾暀鏈夋偓蹇垫垨鏈熷緟锛?
- 浣跨敤浜嗗摢浜涘叿浣撶殑閽╁瓙绫诲瀷锛堝璇濋挬銆佹儏鑺傞挬銆佹儏缁挬绛夛級锛?

### 涓夈€佹儏缁蛋鍚戯紙闃呰浣撻獙鐨勬牳蹇冿級
- 鏁翠綋鎯呯华鏇茬嚎濡備綍鍙樺寲锛?
- 浣滆€呭浣曡皟鍔ㄨ鑰呮儏缁紵

### 鍥涖€佽捣鎵胯浆鍚堬紙鏁呬簨缁撴瀯锛?
- 鏁呬簨鐨勨€滆捣鈥濄€佲€滄壙鈥濄€佲€滆浆鈥濄€佲€滃悎鈥濆垎鍒湪鍝噷锛?
- 鑺傚鏄惁寮犲紱鏈夊害锛?

### 浜斻€佺埥鐐硅璁★紙璇昏€呬负浠€涔堣拷璇伙級
- 鍒楀嚭浜嗗摢浜涜璇昏€呬骇鐢熷揩鎰熺殑鍏冪礌锛?
- 鐖界偣鐨勯鐜囧拰寮哄害濡備綍锛?

### 鍏€侀噾鎵嬫寚璁捐锛堟牳蹇冨鎸傞€昏緫锛?
- 涓昏鎷ユ湁浠€涔堢壒娈婅兘鍔涖€佽祫婧愭垨淇℃伅浼樺娍锛?
- 閲戞墜鎸囩殑璁惧畾鏄惁鍚堢悊銆佹湁鏂伴矞鎰燂紵

### 涓冦€佹彁鐐兼ā鏉匡紙鈽呴噸鐐癸細鍙鐢ㄧ殑鍒涗綔妗嗘灦锛岀洿鎺ョ敤浜庡啓灏忚鈽咃級
璇峰皢浠ヤ笂鍒嗘瀽缁撴灉锛屾€荤粨鎴愪竴涓彲浠ョ洿鎺ュ鐢ㄧ殑鍐欎綔妯℃澘銆傛ā鏉垮簲鍖呭惈浠ヤ笅瀛愰儴鍒嗭紙姣忎釜瀛愰儴鍒嗛兘瑕佹湁鍏蜂綋鍐呭锛屼笉鑳戒负绌猴級锛?

#### 7.1 寮€绡囨ā鏉匡紙濡備綍鍐欏墠涓夌珷锛?
- 寮€鍦哄彞寮忕ず渚嬶細____________
- 涓昏鍑哄満鏃舵満涓庡舰璞★細____________
- 鏍稿績鍐茬獊鎶涘嚭鑺傜偣锛歘___________
- 淇℃伅瀵嗗害鎺у埗寤鸿锛歘___________

#### 7.2 绔犺妭鑺傚妯℃澘
- 寤鸿姣忕珷瀛楁暟锛歘___________
- 绔犺妭鍐呴儴缁撴瀯锛氬紑澶撮挬瀛愨啋鍙戝睍鈫掑皬楂樻疆鈫掔粨灏炬偓蹇?
- 鍏蜂綋鑺傚琛細____________

#### 7.3 鐖界偣瀹夋帓妯℃澘
- 鐖界偣棰戠巼锛歘___________
- 甯歌鐖界偣绫诲瀷鍙婃彃鍏ヤ綅缃細____________

#### 7.4 閲戞墜鎸囪璁℃ā鏉?
- 閲戞墜鎸囩被鍨嬪缓璁細____________
- 闄愬埗鏉′欢锛堥伩鍏嶆棤鏁岋級锛歘___________
- 鎴愰暱/瑙ｉ攣璺嚎锛歘___________

#### 7.5 瀹屾暣鏁呬簨澶х翰妯℃澘锛堝彲鐩存帴濉┖浣跨敤锛?
鎻愪緵涓€涓€氱敤鐨勫ぇ绾叉鏋讹紝鐢ㄦ埛鍙渶濉叆鑷繁鐨勪汉鐗╁拰璁惧畾鍗冲彲銆?

### 鍏€佺患鍚堣瘎鍒嗕笌鏀硅繘寤鸿
- 瀵瑰紑绡囧惛寮曞姏銆侀挬瀛愬瘑搴︺€佹儏缁劅鏌撳姏銆佺粨鏋勬竻鏅板害銆佺埥鐐硅璁″垎鍒墦鍒嗭紙1-10鍒嗭級銆?
- 缁欏嚭2-3鏉″叿浣撶殑鏀硅繘寤鸿銆?
"""
                prompt_analysis += "\n" + self.get_bestseller_engine_prompt("analysis")
                result_analysis = llm.chat(prompt_analysis, retry_count=3)

                if "閿欒锛? in result_analysis or "璇锋眰寮傚父" in result_analysis:
                    self.root.after(0, lambda: self.show_analysis_error("鎷嗕功鍒嗘瀽澶辫触", result_analysis))
                    return

                fenxi_dir = "./fenxi"
                os.makedirs(fenxi_dir, exist_ok=True)
                base_name = f"{selected_title}-鎷嗕功鍒嗘瀽"
                suffix = ".txt"
                candidate = os.path.join(fenxi_dir, base_name + suffix)
                counter = 1
                while os.path.exists(candidate):
                    candidate = os.path.join(fenxi_dir, f"{base_name}_{counter}{suffix}")
                    counter += 1
                try:
                    with open(candidate, 'w', encoding='utf-8') as f:
                        f.write(result_analysis)
                    save_msg = f"\n\n[鍒嗘瀽缁撴灉宸蹭繚瀛樿嚦锛歿candidate}]"
                except Exception as e:
                    save_msg = f"\n\n[淇濆瓨鏂囦欢澶辫触锛歿e}]"

                analysis_title = f"{selected_title}-鎷嗕功"
                try:
                    doc_id, version = self.book_analysis_manager.upload_document(analysis_title, result_analysis)
                    save_msg += f"\n\n[鍒嗘瀽缁撴灉宸蹭繚瀛樺埌鎷嗕功鍒嗘瀽搴擄細{analysis_title} (v{version})]"
                    self.refresh_analysis_library()
                except Exception as e:
                    save_msg += f"\n\n[淇濆瓨鍒版媶涔﹀垎鏋愬簱澶辫触锛歿e}]"

                self.root.after(0, lambda: self.display_analysis_result(result_analysis + save_msg))

                template_text = self.extract_template(result_analysis)
                if not template_text:
                    self.root.after(0, lambda: self.analysis_result_text.insert(tk.END, "\n\n妯℃澘鎻愬彇澶辫触锛屾鍦ㄥ皾璇曢噸璇?.."))
                    retry_prompt = f"璇蜂粠浠ヤ笅鍒嗘瀽缁撴灉涓彁鍙栧嚭鈥?## 涓冦€佹彁鐐兼ā鏉库€濋儴鍒嗙殑鍐呭锛屽彧杈撳嚭璇ユā鏉垮唴瀹癸紝涓嶈杈撳嚭鍏朵粬浠讳綍瑙ｉ噴銆俓n\n鍒嗘瀽缁撴灉锛歕n{result_analysis}"
                    template_text = llm.chat(retry_prompt, retry_count=2)
                    if "閿欒锛? in template_text or "璇锋眰寮傚父" in template_text:
                        self.root.after(0, lambda: self.analysis_result_text.insert(tk.END, "\n妯℃澘鎻愬彇澶辫触锛岃鎵嬪姩缂栬緫鎴栭噸鏂板垎鏋愩€?))
                        self.root.after(0, lambda: self.edit_template_btn.config(state=tk.NORMAL))
                        return

                self.current_template_text = template_text
                self.root.after(0, lambda: self.edit_template_btn.config(state=tk.NORMAL))
            except Exception as e:
                self.root.after(0, lambda: self.show_analysis_error("鎷嗕功鍒嗘瀽澶辫触", str(e)))
            finally:
                self.root.after(0, lambda: self.create_btn.config(state=tk.NORMAL))

        threading.Thread(target=analysis_task, daemon=True).start()

    def extract_and_sync_book_info(self, prompt_text):
        title_match = re.search(r'\*\*涔﹀悕锛歕*\*\s*(.+?)(?:\n|$)', prompt_text)
        new_title = ""
        if title_match:
            new_title = title_match.group(1).strip().strip('銆娿€?).strip()
            self.new_book_title.set(new_title)
        intro_match = re.search(r'\*\*绠€浠嬶細\*\*\s*(.+?)(?=\n\*\*|$)', prompt_text, re.DOTALL)
        new_intro = ""
        if intro_match:
            new_intro = intro_match.group(1).strip()
            self.new_book_synopsis.set(new_intro)
        title_for_genre = new_title if new_title else self.new_book_title.get()
        intro_for_genre = new_intro if new_intro else self.new_book_synopsis.get()
        self.chapter_num.set(25)
        self.words_per_chapter.set(2800)
        inferred_genre = self.infer_genre(title_for_genre, intro_for_genre)
        self.genre.set(inferred_genre)

    def infer_genre(self, title, intro):
        keywords = {
            "淇粰": ["淇粰", "浠欎緺", "淇偧", "鐏垫牴", "瀹楅棬", "椋炲崌", "涓硅嵂", "鐏靛姏"],
            "鐜勫够": ["鐜勫够", "榄旀硶", "寮傝兘", "绁為瓟", "澶ч檰", "榫欐棌", "绮剧伒", "鍙敜"],
            "閮藉競": ["閮藉競", "鐜颁唬", "鍏徃", "鑱屽満", "璞棬", "濞变箰鍦?, "鏄庢槦", "鐧介"],
            "姝︿緺": ["姝︿緺", "姹熸箹", "鍓戝", "渚犲", "闂ㄦ淳", "姝﹀姛", "鍒€鍓?],
            "绉戝够": ["绉戝够", "绉戞妧", "鏈潵", "瀹囧畽", "鏈哄櫒浜?, "澶┖", "AI", "铏氭嫙"],
            "瑷€鎯?: ["瑷€鎯?, "鐖辨儏", "鐢滃疇", "闇搁亾", "鎬昏", "鎭嬬埍", "濠氬Щ", "娴极"],
            "鍘嗗彶": ["鍘嗗彶", "鍙や唬", "鐜嬫湞", "鐨囧笣", "瀹环", "绌胯秺", "鏋剁┖"],
            "鎭愭€?: ["鎭愭€?, "鎯婃倸", "楝兼€?, "鐏靛紓", " horror"],
            "鎮枒": ["鎮枒", "鎺ㄧ悊", "渚︽帰", "璋嬫潃", "妗堜欢", "璋滃洟"],
        }
        text = (title + " " + intro).lower()
        for genre, words in keywords.items():
            if any(word.lower() in text for word in words):
                return genre
        return "鍏朵粬"

    def display_analysis_result(self, result):
        self.analysis_result_text.delete(1.0, tk.END)
        self.analysis_result_text.insert(tk.END, result)
        self.analysis_hint.config(text="鍒嗘瀽瀹屾垚")

    def show_analysis_error(self, title, msg):
        messagebox.showerror(title, msg)
        self.analysis_result_text.delete(1.0, tk.END)
        self.analysis_result_text.insert(tk.END, f"閿欒锛歿msg}")

    # ---------- 鍐欎功椤甸潰锛堝垎涓ら〉锛?----------
    def create_write_book_page(self):
        page = tk.Frame(self.right_area, bg='#f0f2f5')
        self.write_page_container = tk.Frame(page, bg='#f0f2f5')
        self.write_page_container.pack(fill=tk.BOTH, expand=True)
        self.current_write_page = 1
        self.create_write_page1()
        self.create_write_page2()
        self.show_write_page1()
        return page

    def create_write_page1(self):
        self.write_page1 = tk.Frame(self.write_page_container, bg='#f0f2f5')

        main_frame = tk.Frame(self.write_page1, bg='#f0f2f5')
        main_frame.pack(fill=tk.BOTH, expand=True, padx=20, pady=20)

        # ========== 宸︿晶锛氭媶涔﹀垎鏋愬簱 ==========
        left_frame = ttk.LabelFrame(main_frame, text="鎷嗕功鍒嗘瀽搴?, padding=10)
        left_frame.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=(0,10))

        self.write_analysis_listbox = tk.Listbox(left_frame, height=15)
        self.write_analysis_listbox.pack(fill=tk.BOTH, expand=True, pady=5)
        self.write_analysis_listbox.bind("<Button-3>", self.show_write_analysis_menu)
        self.write_analysis_listbox.bind("<ButtonRelease-1>", self.on_select_write_analysis_with_prompts)
        self.refresh_analysis_library()

        gen_btn = ttk.Button(left_frame, text="鐢熸垚鏂颁功鎻愮ず璇?, command=self.generate_prompt_from_selected)
        gen_btn.pack(fill=tk.X, pady=5)

        # ========== 涓棿锛氭柊涔︽彁绀鸿瘝鍒楄〃妗?==========
        middle_frame = ttk.LabelFrame(main_frame, text="鏂颁功鎻愮ず璇?, padding=10)
        middle_frame.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=10)
        
        self.write_new_book_prompts_listbox = tk.Listbox(middle_frame, height=15)
        self.write_new_book_prompts_listbox.pack(fill=tk.BOTH, expand=True)
        self.write_new_book_prompts_listbox.bind("<ButtonRelease-1>", self.on_select_write_new_book_prompt)

        # ========== 鍙充晶锛氱敓鎴愮粨鏋?==========
        right_frame = ttk.LabelFrame(main_frame, text="鐢熸垚缁撴灉", padding=10)
        right_frame.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True, padx=(10,0))

        self.prompt_result_text = scrolledtext.ScrolledText(right_frame, wrap=tk.WORD, font=('寰蒋闆呴粦', 10))
        self.prompt_result_text.pack(fill=tk.BOTH, expand=True, pady=5)

        save_btn = ttk.Button(right_frame, text="淇濆瓨鎻愮ず璇?, command=self.save_prompt)
        save_btn.pack(fill=tk.X, pady=5)

        bottom_btn_frame = tk.Frame(right_frame, bg='#f0f2f5')
        bottom_btn_frame.pack(fill=tk.X, pady=5, side=tk.BOTTOM)
        start_write_btn = tk.Button(bottom_btn_frame, text="寮€濮嬪啓涔?, bg='yellow', fg='black', font=('寰蒋闆呴粦', 10, 'bold'), command=self.show_write_page2)
        start_write_btn.pack(side=tk.RIGHT, padx=5, pady=5)

    def generate_prompt_from_selected(self):
        selection = self.write_analysis_listbox.curselection()
        if not selection:
            messagebox.showwarning("鎻愮ず", "璇峰厛鍦ㄥ乏渚ф媶涔﹀垎鏋愬簱涓€変腑涓€涓垎鏋愮粨鏋?)
            return
        title_full = self.write_analysis_listbox.get(selection[0])
        if '. ' in title_full:
            analysis_title = title_full.split('. ', 1)[1]
        else:
            analysis_title = title_full
        content = self.book_analysis_manager.get_document_content(analysis_title)
        if not content:
            messagebox.showerror("閿欒", f"鏃犳硶璇诲彇鍒嗘瀽缁撴灉銆寋analysis_title}銆?)
            return
        template_text = self.extract_template(content)
        if not template_text:
            if not messagebox.askyesno("鎻愮ず", "鏈兘鑷姩鎻愬彇妯℃澘锛屾槸鍚﹀皾璇曡 AI 閲嶆柊鎻愬彇锛?):
                return
            if not self.api_key.get().strip():
                messagebox.showwarning("鎻愮ず", "璇峰厛鍦ㄧ郴缁熻缃腑閰嶇疆API Key")
                return
            self.prompt_result_text.delete(1.0, tk.END)
            self.prompt_result_text.insert(tk.END, "姝ｅ湪灏濊瘯鎻愬彇妯℃澘锛岃绋嶅€?..\n")
            def extract_task():
                llm = SimpleLLM(
                    api_key=self.api_key.get().strip(),
                    base_url=self.base_url.get().strip(),
                    model=self.model_name.get().strip(),
                    temperature=self.temp.get(),
                    max_tokens=8192
                )
                prompt = f"璇蜂粠浠ヤ笅鎷嗕功鍒嗘瀽缁撴灉涓彁鍙栧嚭銆?## 涓冦€佹彁鐐兼ā鏉裤€嶉儴鍒嗙殑鍐呭锛屽彧杈撳嚭璇ユā鏉垮唴瀹癸紝涓嶈杈撳嚭鍏朵粬瑙ｉ噴銆俓n\n鍒嗘瀽缁撴灉锛歕n{content}"
                extracted = llm.chat(prompt, retry_count=2)
                if "閿欒锛? in extracted or "璇锋眰寮傚父" in extracted:
                    self.root.after(0, lambda: self.prompt_result_text.insert(tk.END, f"鎻愬彇澶辫触锛歿extracted}"))
                    return
                self.current_template_text = extracted
                self._do_generate_prompt_from_template(extracted)
            threading.Thread(target=extract_task, daemon=True).start()
            return
        self.current_template_text = template_text
        self._do_generate_prompt_from_template(template_text)

    def _do_generate_prompt_from_template(self, template_text):
        if not self.api_key.get().strip():
            messagebox.showwarning("鎻愮ず", "璇峰厛鍦ㄧ郴缁熻缃腑閰嶇疆API Key")
            return
        self.prompt_result_text.delete(1.0, tk.END)
        self.prompt_result_text.insert(tk.END, "姝ｅ湪鐢熸垚鏂颁功鎻愮ず璇嶏紝璇风◢鍊?..\n")
        def task():
            llm = SimpleLLM(
                api_key=self.api_key.get().strip(),
                base_url=self.base_url.get().strip(),
                model=self.model_name.get().strip(),
                temperature=self.temp.get(),
                max_tokens=8192
            )
            prompt_new_book = self.build_new_book_prompt(template_text)
            result = llm.chat(prompt_new_book, retry_count=3)
            self.root.after(0, lambda: self.prompt_result_text.delete(1.0, tk.END))
            if "閿欒锛? in result or "璇锋眰寮傚父" in result:
                self.root.after(0, lambda: self.prompt_result_text.insert(tk.END, f"鐢熸垚澶辫触锛歿result}"))
            else:
                self.root.after(0, lambda: self.prompt_result_text.insert(tk.END, result))
                self.root.after(0, lambda: self.extract_and_sync_book_info(result))
        threading.Thread(target=task, daemon=True).start()

    def show_book_analysis_menu(self, event):
        self.show_analysis_menu(event, self.book_analysis_listbox)

    def show_write_analysis_menu(self, event):
        self.show_analysis_menu(event, self.write_analysis_listbox)

    def show_analysis_menu(self, event, listbox):
        index = listbox.nearest(event.y)
        if index < 0:
            return
        listbox.selection_clear(0, tk.END)
        listbox.selection_set(index)
        listbox.activate(index)

        menu = tk.Menu(self.root, tearoff=0)
        menu.add_command(label="缂栬緫", command=lambda: self.edit_analysis(listbox))
        menu.add_command(label="鍒犻櫎", command=lambda: self.delete_analysis(listbox))
        menu.post(event.x_root, event.y_root)

    def refresh_analysis_library(self):
        docs = self.book_analysis_manager.get_all_documents()
        if hasattr(self, 'write_analysis_listbox'):
            self.write_analysis_listbox.delete(0, tk.END)
            for i, doc in enumerate(docs, start=1):
                self.write_analysis_listbox.insert(tk.END, f"{i}. {doc['title']}")
        if hasattr(self, 'book_analysis_listbox'):
            self.book_analysis_listbox.delete(0, tk.END)
            for i, doc in enumerate(docs, start=1):
                self.book_analysis_listbox.insert(tk.END, f"{i}. {doc['title']}")

    def edit_analysis(self, listbox):
        selected = listbox.curselection()
        if not selected:
            return
        title_full = listbox.get(selected[0])
        title = title_full.split('. ', 1)[1] if '. ' in title_full else title_full
        content = self.book_analysis_manager.get_document_content(title)
        if not content:
            messagebox.showerror("閿欒", "鏃犳硶鑾峰彇鍐呭")
            return

        win = tk.Toplevel(self.root)
        win.title(f"缂栬緫 {title}")
        win.geometry("800x600")
        text_area = scrolledtext.ScrolledText(win, wrap=tk.WORD, font=('寰蒋闆呴粦', 10))
        text_area.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        text_area.insert(tk.END, content)

        def save():
            new_content = text_area.get(1.0, tk.END).strip()
            if new_content:
                self.book_analysis_manager.upload_document(title, new_content)
                self.refresh_analysis_library()
                messagebox.showinfo("鎴愬姛", "宸蹭繚瀛?)
                win.destroy()
            else:
                messagebox.showwarning("鎻愮ず", "鍐呭涓嶈兘涓虹┖")

        ttk.Button(win, text="淇濆瓨", command=save).pack(pady=10)

    def delete_analysis(self, listbox):
        selected = listbox.curselection()
        if not selected:
            return
        title_full = listbox.get(selected[0])
        title = title_full.split('. ', 1)[1] if '. ' in title_full else title_full
        if messagebox.askyesno("纭", f"纭畾鍒犻櫎 {title} 鍚楋紵"):
            self.book_analysis_manager.delete_document(title)
            self.refresh_analysis_library()

    def save_prompt(self):
        content = self.prompt_result_text.get(1.0, tk.END).strip()
        if not content:
            messagebox.showwarning("鎻愮ず", "娌℃湁鍐呭鍙繚瀛?)
            return
        book_name = self.new_book_title.get().strip()
        if not book_name:
            messagebox.showwarning("鎻愮ず", "璇峰厛璁剧疆鏂颁功鍚?)
            return
        tishici_dir = "./tishici"
        os.makedirs(tishici_dir, exist_ok=True)
        filename = f"{book_name}-鎻愮ず璇?txt"
        filepath = os.path.join(tishici_dir, filename)
        try:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            messagebox.showinfo("鎴愬姛", f"鎻愮ず璇嶅凡淇濆瓨鑷筹細{filepath}")
        except Exception as e:
            messagebox.showerror("閿欒", f"淇濆瓨澶辫触锛歿e}")

    def create_write_page2(self):
        self.write_page2 = tk.Frame(self.write_page_container, bg='#f0f2f5')

        top_frame = tk.Frame(self.write_page2, bg='#f0f2f5')
        top_frame.pack(fill=tk.X, padx=20, pady=(20,10))

        name_frame = tk.Frame(top_frame, bg='#f0f2f5')
        name_frame.pack(side=tk.LEFT)
        tk.Label(name_frame, text="鏂颁功鍚嶏細", font=('寰蒋闆呴粦', 12, 'bold'), bg='#f0f2f5').pack(side=tk.LEFT)
        self.book_title_entry = tk.Entry(name_frame, textvariable=self.new_book_title, font=('寰蒋闆呴粦', 11), width=25)
        self.book_title_entry.pack(side=tk.LEFT, padx=5)

        settings_frame = tk.Frame(top_frame, bg='#f0f2f5', relief=tk.GROOVE, bd=1)
        settings_frame.pack(side=tk.RIGHT, padx=10)
        tk.Label(settings_frame, text="璁剧疆", font=('寰蒋闆呴粦', 10, 'bold'), bg='#f0f2f5').pack(anchor='w', padx=5, pady=2)

        row1 = tk.Frame(settings_frame, bg='#f0f2f5')
        row1.pack(fill=tk.X, pady=2)
        tk.Label(row1, text="棰樻潗:", font=('寰蒋闆呴粦', 9), bg='#f0f2f5', width=6, anchor='e').pack(side=tk.LEFT)
        self.genre_entry = tk.Entry(row1, textvariable=self.genre, font=('寰蒋闆呴粦', 9), width=12)
        self.genre_entry.pack(side=tk.LEFT, padx=2)

        row2 = tk.Frame(settings_frame, bg='#f0f2f5')
        row2.pack(fill=tk.X, pady=2)
        tk.Label(row2, text="绔犺妭鏁?", font=('寰蒋闆呴粦', 9), bg='#f0f2f5', width=6, anchor='e').pack(side=tk.LEFT)
        self.chapter_num_spin = tk.Spinbox(row2, from_=1, to=200, textvariable=self.chapter_num, width=6)
        self.chapter_num_spin.pack(side=tk.LEFT, padx=2)

        row3 = tk.Frame(settings_frame, bg='#f0f2f5')
        row3.pack(fill=tk.X, pady=2)
        tk.Label(row3, text="姣忕珷瀛楁暟:", font=('寰蒋闆呴粦', 9), bg='#f0f2f5', width=6, anchor='e').pack(side=tk.LEFT)
        self.words_spin = tk.Spinbox(row3, from_=500, to=20000, increment=500, textvariable=self.words_per_chapter, width=8)
        self.words_spin.pack(side=tk.LEFT, padx=2)

        row4 = tk.Frame(settings_frame, bg='#f0f2f5')
        row4.pack(fill=tk.X, pady=2)
        tk.Label(row4, text="淇濆瓨璺緞:", font=('寰蒋闆呴粦', 9), bg='#f0f2f5', width=6, anchor='e').pack(side=tk.LEFT)
        self.save_path_entry = tk.Entry(row4, textvariable=self.save_path, font=('寰蒋闆呴粦', 9), width=15)
        self.save_path_entry.pack(side=tk.LEFT, padx=2)
        tk.Button(row4, text="娴忚", command=self.browse_save_path, font=('寰蒋闆呴粦', 8)).pack(side=tk.LEFT)

        intro_frame = tk.Frame(self.write_page2, bg='#f0f2f5')
        intro_frame.pack(fill=tk.X, padx=20, pady=5)
        tk.Label(intro_frame, text="鏂颁功鍐呭绠€浠嬶細", font=('寰蒋闆呴粦', 11, 'bold'), bg='#f0f2f5', anchor='w').pack(anchor='w')
        self.book_synopsis_text = scrolledtext.ScrolledText(intro_frame, wrap=tk.WORD, height=3, width=40, font=('寰蒋闆呴粦', 10))
        self.book_synopsis_text.pack(fill=tk.X, pady=5, padx=5)
        def sync_synopsis(*args):
            self.book_synopsis_text.delete(1.0, tk.END)
            self.book_synopsis_text.insert(tk.END, self.new_book_synopsis.get())
        self.new_book_synopsis.trace('w', sync_synopsis)
        def on_synopsis_change(event=None):
            self.new_book_synopsis.set(self.book_synopsis_text.get(1.0, tk.END).strip())
        self.book_synopsis_text.bind('<KeyRelease>', on_synopsis_change)

        step_frame = ttk.LabelFrame(self.write_page2, text="鐢熸垚姝ラ", padding=10)
        step_frame.pack(fill=tk.X, padx=20, pady=5)
        btn_frame = tk.Frame(step_frame)
        btn_frame.pack()
        ttk.Button(btn_frame, text="Step1: 鐢熸垚鏁翠綋鏋舵瀯", command=self.gen_architecture).pack(side=tk.LEFT, padx=5, pady=5)
        ttk.Button(btn_frame, text="Step2: 鐢熸垚绔犺妭钃濆浘", command=self.gen_blueprints).pack(side=tk.LEFT, padx=5, pady=5)
        ttk.Button(btn_frame, text="Step3: 鐢熸垚鍏ㄩ儴鑽夌", command=self.gen_all_drafts).pack(side=tk.LEFT, padx=5, pady=5)
        ttk.Button(btn_frame, text="鐢熸垚閮ㄥ垎鑽夌", command=self.gen_partial_drafts).pack(side=tk.LEFT, padx=5, pady=5)
        ttk.Button(btn_frame, text="浠庢ā鏉垮簱鍔犺浇", command=self.load_template_from_library).pack(side=tk.LEFT, padx=5, pady=5)

        progress_frame = ttk.LabelFrame(self.write_page2, text="鐢熸垚杩涘害", padding=5)
        progress_frame.pack(fill=tk.X, padx=20, pady=5)
        self.progress_bar = ttk.Progressbar(progress_frame, variable=self.progress_var, maximum=100)
        self.progress_bar.pack(fill=tk.X, padx=5, pady=2)
        self.progress_label_var = tk.StringVar(value="灏辩华")
        tk.Label(progress_frame, textvariable=self.progress_label_var, font=('寰蒋闆呴粦', 9)).pack()

        notebook = ttk.Notebook(self.write_page2)
        notebook.pack(fill=tk.BOTH, expand=True, padx=20, pady=10)

        self.text_arch = scrolledtext.ScrolledText(notebook, wrap=tk.WORD, font=('寰蒋闆呴粦', 10))
        notebook.add(self.text_arch, text="灏忚鏋舵瀯")
        self.text_blueprint = scrolledtext.ScrolledText(notebook, wrap=tk.WORD, font=('寰蒋闆呴粦', 10))
        notebook.add(self.text_blueprint, text="绔犺妭钃濆浘")
        self.text_draft = scrolledtext.ScrolledText(notebook, wrap=tk.WORD, font=('寰蒋闆呴粦', 10))
        notebook.add(self.text_draft, text="鑽夌鍐呭")

    def show_write_page1(self):
        self.write_page2.pack_forget()
        self.write_page1.pack(fill=tk.BOTH, expand=True)
        self.current_write_page = 1
        self.refresh_analysis_library()

    def show_write_page2(self):
        self.write_page1.pack_forget()
        self.write_page2.pack(fill=tk.BOTH, expand=True)
        self.current_write_page = 2

    def browse_save_path(self):
        p = filedialog.askdirectory()
        if p:
            self.save_path.set(p)

    def get_llm(self):
        return SimpleLLM(
            api_key=self.api_key.get().strip(),
            base_url=self.base_url.get().strip(),
            model=self.model_name.get().strip(),
            temperature=self.temp.get(),
            max_tokens=8192,
            relay_enabled=self.relay_enabled.get(),
            relay_url=self.relay_url.get().strip(),
            relay_token=self.relay_token.get().strip(),
            relay_provider=self.relay_provider.get().strip()
        )

    def get_hot_engagement_constraints(self, stage="draft"):
        base = """
銆愰珮鍚稿紩鍔涚‖绾︽潫锛堢暘鑼勫悜锛夈€?1. 寮€绡?00瀛楀唴蹇呴』鍑虹幇鈥滃啿绐?浠ｄ环+鎮康鈥濅笁瑕佺礌锛岀姝㈤摵鍨繃闀裤€?2. 姣忕珷鑷冲皯1涓槑纭埥鐐癸紙鍙嶆潃/閫嗚浆/鎻湶/鍗囩骇/鎯呮劅鐖嗗彂锛夛紝涓旇鍙劅鐭ャ€?3. 姣忕珷缁撳熬蹇呴』鏈夎拷鏇撮挬瀛愶紝涓嶈兘鐢ㄢ€滃钩娣℃敹鏉熲€濄€?4. 瀵硅瘽鍗犳瘮寤鸿30%-45%锛屽彞瀛愮煭淇冩湁鑺傚锛屽噺灏戠┖娉涘彊杩般€?5. 鍐茬獊鍗囩骇鑺傚锛?-3绔犱竴涓皬楂樻疆锛?-12绔犱竴涓ぇ杞姌銆?6. 浜鸿瑕佲€滃彲鐖卞彲鎭ㄥ彲璁颁綇鈥濓細涓昏鏈夊己鐩爣锛屽弽娲炬湁鍘嬭揩鎰燂紝閰嶈鏈夊姛鑳姐€?7. 绂佹鐏屾按锛氫笌涓荤嚎/鎯呯华鎺ㄨ繘鏃犲叧鐨勬钀借鍘嬬缉鎴栧垹闄ゃ€?"""
        stage_rules = {
            "prompt": """
銆愯ˉ鍏呰姹傦紙鏂颁功鎻愮ず璇嶉樁娈碉級銆?- 杈撳嚭閲屽繀椤荤粰鍑衡€滃墠3绔犵暀浜鸿璁♀€濅笌鈥?0绔犲唴鐖嗙偣鎺掑竷琛ㄢ€濄€?- 涔﹀悕鍜岀畝浠嬩紭鍏堢偣鍑诲姏锛屼笉瑕佹枃闈掑寲銆?""",
            "architecture": """
銆愯ˉ鍏呰姹傦紙鏋舵瀯闃舵锛夈€?- 蹇呴』鏄庣‘姣?0绔犱竴涓牳蹇冮棶棰樸€佷竴涓樁娈垫€у厬鐜扮偣銆?- 鏍囨敞鍏嶈垂娈电暀浜虹瓥鐣ュ拰浠樿垂娈甸鐖嗙偣浣嶇疆銆?""",
            "blueprint": """
銆愯ˉ鍏呰姹傦紙钃濆浘闃舵锛夈€?- 姣忕珷钃濆浘蹇呴』鍐欐竻锛氭湰绔犵埥鐐广€佸啿绐佸崌绾х偣銆佺珷鏈挬瀛愬彞锛堝彲鐩存帴鐢級銆?""",
            "draft": """
銆愯ˉ鍏呰姹傦紙姝ｆ枃闃舵锛夈€?- 姝ｆ枃蹇呴』鈥滀簨浠堕┍鍔ㄢ€濊€屼笉鏄€滆鏄庨┍鍔ㄢ€濓紝閬垮厤璁查亾鐞嗐€?- 姣忕珷涓蹇呴』鍑虹幇涓€娆″叧绯绘垨鍒╃泭鍐嶆媺鎵紝闃叉骞抽摵銆?"""
        }
        return base + stage_rules.get(stage, "")

    def get_bestseller_engine_prompt(self, stage="writing"):
        if stage == "analysis":
            return """
【爆款分析引擎要求】
1. 给出“爆款潜力总分(100)”与分项：开篇钩子/冲突强度/爽点密度/章末钩子/角色记忆点/商业化标题简介。
2. 每个低于7分的分项，必须给出“可直接替换”的改写片段。
3. 输出《三步拉升方案》：如何从当前分数提升到80+。
4. 输出《10章留存地图》：每章核心冲突、爽点兑现、章末钩子。
"""
        return """
【爆款写作引擎要求】
1. 先保证“读者停留”再保证“文采”：冲突、代价、悬念优先。
2. 每章必须有一次有效关系变化或利益变化。
3. 章末必须留下未解问题，诱发下一章点击。
4. 严禁空转描写；任何段落都要服务冲突推进或角色推进。
"""

    def gen_architecture(self):
        """鐢熸垚鏁翠綋鏋舵瀯锛屽疄鐜癹iagou鏂囦欢澶归€昏緫"""
        # 浜屻€乯iagou鏂囦欢澶癸紙鏋舵瀯鐩稿叧锛夋搷浣滈€昏緫
        # 1. 瑙﹀彂鏉′欢锛氱偣鍑汇€岀敓鎴愭暣浣撴灦鏋勩€嶅姛鑳芥寜閽椂锛岃Е鍙戣妫€娴嬪拰鎵ц閫昏緫
        
        if not self.new_book_title.get().strip():
            messagebox.showwarning("鎻愮ず", "璇峰厛濉啓鏂颁功鍚?)
            return
        
        # 2. 妫€娴嬬洰鏍囷細銆屾柊涔﹀悕銆嶆枃浠跺す鈫抝iagou鏂囦欢澶逛腑锛屾槸鍚﹀瓨鍦ㄣ€屼功鍚?鏋舵瀯銆嶆枃妗?
        book_title = self.new_book_title.get().strip()
        save_dir = self.save_path.get()
        book_dir = os.path.join(save_dir, book_title)
        jiagou_dir = os.path.join(book_dir, "jiagou")
        arch_file = os.path.join(jiagou_dir, f"{book_title}-鏋舵瀯.txt")
        
        # 妫€鏌ユ灦鏋勬枃妗ｆ槸鍚﹀瓨鍦?
        if os.path.exists(arch_file):
            # 3. 鎵ц鍔ㄤ綔锛氳嫢瀛樺湪銆屼功鍚?鏋舵瀯銆嶆枃妗ｏ紝寮瑰嚭瀵硅瘽绐?
            response = messagebox.askyesno("鏋舵瀯宸插瓨鍦?, 
                f"鏋舵瀯鏂囨。宸插瓨鍦細{arch_file}\n\n鏄惁瑕侀噸鏂扮敓鎴愭灦鏋勶紵\n\n"
                "鐐瑰嚮銆屾槸銆嶉噸鏂扮敓鎴愭灦鏋勶紙灏嗚鐩栧師鏈夊唴瀹癸級\n"
                "鐐瑰嚮銆屽惁銆嶅仠姝换浣曟洿鏀?)
            
            if not response:  # 鐢ㄦ埛鐐瑰嚮銆屽惁銆?
                self.log_to_write("鐢ㄦ埛鍙栨秷锛屽仠姝㈡灦鏋勭敓鎴?)
                return
            # 鐢ㄦ埛鐐瑰嚮銆屾槸銆嶏紝缁х画鎵ц鐢熸垚閫昏緫
        
        # 妫€鏌PI閰嶇疆
        if not self.api_key.get().strip():
            messagebox.showwarning("鎻愮ず", "璇峰厛鍦ㄧ郴缁熻缃腑閰嶇疆API Key")
            return
        
        self.log_to_write("寮€濮嬬敓鎴愭暣浣撴灦鏋?..")
        self.text_arch.delete(1.0, tk.END)
        self.text_arch.insert(tk.END, "鐢熸垚涓紝璇风◢鍊?..\n")
        self.progress_var.set(0)
        self.progress_label_var.set("鐢熸垚鏋舵瀯涓?..")

        def task():
            llm = self.get_llm()
            template = ""
            if hasattr(self, 'new_book_prompt_text'):
                template = self.new_book_prompt_text.get(1.0, tk.END).strip()
            
            # 鏋勫缓鍖呭惈搴曞眰閫昏緫鐨勬灦鏋勭敓鎴愭彁绀鸿瘝
            prompt = f"""浣犳槸涓€浣嶄笓涓氱殑灏忚绛栧垝甯堛€傝鏍规嵁浠ヤ笅淇℃伅鐢熸垚灏忚鏁翠綋鏋舵瀯锛屽繀椤诲寘鍚簳灞傞€昏緫銆?

鏂颁功鍚嶏細{self.new_book_title.get()}
鏂颁功绠€浠嬶細{self.new_book_synopsis.get()}
棰樻潗锛歿self.genre.get()}
绔犺妭鏁帮細{self.chapter_num.get()}
姣忕珷瀛楁暟锛歿self.words_per_chapter.get()}

浠ヤ笅鏄粠鎷嗕功鍒嗘瀽涓緱鍒扮殑鍙鐢ㄥ啓浣滄ā鏉匡紝璇蜂弗鏍煎弬鑰冨叾缁撴瀯鏉ヨ璁℃灦鏋勶紙浣嗕笉瑕佹妱琚師鍓ф儏锛夛細
{template[:2000]}

璇疯緭鍑哄寘鍚簳灞傞€昏緫鐨勫畬鏁存灦鏋勶細

### 涓€銆佸皬璇寸畝浠嬶紙骞垮憡涓夋寮忥級
- 绗竴娈碉細涓昏澶勫锛堝缓绔嬩唬鍏ユ劅锛?
- 绗簩娈碉細鎶涘嚭鍐茬獊锛堝埗閫犵揣寮犳劅锛?
- 绗笁娈碉細鎮康鏀跺熬锛堝紩鍙戝ソ濂囧績锛?

### 浜屻€佷富瑕佷汉鐗╄瀹氾紙鍖呭惈搴曞眰閫昏緫锛?
- 涓昏锛氭€ф牸銆佸姩鏈恒€佹垚闀垮姬鍏夈€佸唴鍦ㄥ啿绐?
- 閰嶈1锛氫笌涓昏鐨勫叧绯汇€佺嫭绔嬪姩鏈恒€佸姛鑳藉畾浣?
- 閰嶈2锛氫笌涓昏鐨勫叧绯汇€佺嫭绔嬪姩鏈恒€佸姛鑳藉畾浣?

### 涓夈€佷笘鐣岃璁惧畾锛堝寘鍚簳灞傞€昏緫锛?
- 鏍稿績瑙勫垯锛氫笘鐣岀殑杩愯娉曞垯
- 鍔涢噺浣撶郴锛氬鏋滄湁鐨勮瘽锛屽浣曡幏寰椼€佹垚闀裤€侀檺鍒?
- 绀句細缁撴瀯锛氭潈鍔涘垎甯冦€侀樁绾у叧绯?
- 鏂囧寲鑳屾櫙锛氫範淇椼€佷俊浠般€佷环鍊艰

### 鍥涖€佷富绾垮墽鎯呮瑕侊紙鍖呭惈搴曞眰閫昏緫锛?
- 璧凤細鍒濆鐘舵€併€佽Е鍙戜簨浠?
- 鎵匡細鍙戝睍杩囩▼銆佸啿绐佸崌绾?
- 杞細杞姌鐐广€侀珮娼?
- 鍚堬細缁撳眬銆佷富棰樺崌鍗?

### 浜斻€佸簳灞傞€昏緫璁捐
- 鏁呬簨鐨勬牳蹇冮┍鍔ㄥ姏鏄粈涔堬紵
- 涓昏鐨勬垚闀块€昏緫鏄粈涔堬紵
- 鍐茬獊鐨勮В鍐抽€昏緫鏄粈涔堬紵
- 涓婚鐨勮〃杈鹃€昏緫鏄粈涔堬紵

璇风‘淇濇灦鏋勫畬鏁淬€侀€昏緫娓呮櫚锛屽彲鐩存帴鐢ㄤ簬鍚庣画鍒涗綔銆?{self.get_hot_engagement_constraints('architecture')}"""
            
            result = llm.chat(prompt)
            
            # 淇濆瓨鏋舵瀯鏂囨。鍒癹iagou鏂囦欢澶?
            os.makedirs(jiagou_dir, exist_ok=True)
            try:
                with open(arch_file, 'w', encoding='utf-8') as f:
                    f.write(result)
                self.log_to_write(f"鏋舵瀯鏂囨。宸蹭繚瀛樿嚦锛歿arch_file}")
            except Exception as e:
                self.log_to_write(f"淇濆瓨鏋舵瀯鏂囨。澶辫触锛歿e}")
            
            # 鏇存柊UI
            self.root.after(0, lambda: self.text_arch.delete(1.0, tk.END))
            self.root.after(0, lambda: self.text_arch.insert(tk.END, result))
            self.architecture = result
            self.root.after(0, lambda: self.log_to_write("鏋舵瀯鐢熸垚瀹屾垚"))
            self.root.after(0, lambda: self.progress_label_var.set("鏋舵瀯鐢熸垚瀹屾垚"))
        
        threading.Thread(target=task, daemon=True).start()

    def gen_blueprints(self):
        """鐢熸垚绔犺妭钃濆浘锛屽疄鐜發antu鏂囦欢澶归€昏緫"""
        # 涓夈€乴antu鏂囦欢澶癸紙钃濆浘鐩稿叧锛夋搷浣滈€昏緫
        # 1. 瑙﹀彂鏉′欢锛氱偣鍑汇€岀珷鑺傝摑鍥俱€嶅姛鑳芥寜閽椂锛岃Е鍙戣妫€娴嬪拰鎵ц閫昏緫
        
        if not self.architecture:
            messagebox.showwarning("鎻愮ず", "璇峰厛鎵цStep1鐢熸垚鏋舵瀯")
            return
        
        # 2. 妫€娴嬬洰鏍囷細銆屾柊涔﹀悕銆嶆枃浠跺す鈫抣antu鏂囦欢澶逛腑锛屾槸鍚﹀瓨鍦ㄣ€屼功鍚?钃濆浘銆嶆枃妗ｏ紝涓旀枃妗ｅ凡瀹屾垚
        book_title = self.new_book_title.get().strip()
        save_dir = self.save_path.get()
        book_dir = os.path.join(save_dir, book_title)
        lantu_dir = os.path.join(book_dir, "lantu")
        blueprint_file = os.path.join(lantu_dir, f"{book_title}-钃濆浘.txt")
        
        # 妫€鏌ヨ摑鍥炬枃妗ｆ槸鍚﹀瓨鍦?
        if os.path.exists(blueprint_file):
            # 妫€鏌ユ枃妗ｆ槸鍚﹀凡瀹屾垚
            try:
                with open(blueprint_file, 'r', encoding='utf-8') as f:
                    existing_content = f.read()
                
                # 鍒ゆ柇鏂囨。鏄惁宸插畬鎴愶紙杩欓噷绠€鍗曞垽鏂槸鍚︽湁瓒冲鐨勫唴瀹癸級
                if len(existing_content) > 1000:
                    # 3. 鎵ц鍔ㄤ綔锛氳嫢鏂囨。宸插畬鎴愶紝鏃犻渶杩涜浠讳綍涔﹀啓銆佷慨鏀规搷浣?
                    response = messagebox.askyesno("钃濆浘宸插瓨鍦?, 
                        f"钃濆浘鏂囨。宸插瓨鍦ㄤ笖鍐呭瀹屾暣锛歿blueprint_file}\n\n"
                        "鏄惁瑕侀噸鏂扮敓鎴愯摑鍥撅紵\n\n"
                        "鐐瑰嚮銆屾槸銆嶉噸鏂扮敓鎴愯摑鍥撅紙灏嗚鐩栧師鏈夊唴瀹癸級\n"
                        "鐐瑰嚮銆屽惁銆嶅仠姝换浣曟洿鏀?)
                    
                    if not response:  # 鐢ㄦ埛鐐瑰嚮銆屽惁銆?
                        self.log_to_write("鐢ㄦ埛鍙栨秷锛屽仠姝㈣摑鍥剧敓鎴?)
                        return
                    # 鐢ㄦ埛鐐瑰嚮銆屾槸銆嶏紝缁х画鎵ц鐢熸垚閫昏緫
                else:
                    # 鏂囨。鏈畬鎴愶紝缁х画鐢熸垚
                    self.log_to_write(f"钃濆浘鏂囨。瀛樺湪浣嗘湭瀹屾垚锛岀户缁敓鎴?..")
            except Exception as e:
                self.log_to_write(f"璇诲彇钃濆浘鏂囨。澶辫触锛歿e}")
        
        total = self.chapter_num.get()
        self.log_to_write(f"寮€濮嬩负{total}涓珷鑺傜敓鎴愯摑鍥撅紙姣忕珷6-8瀛楃珷鑺傚悕锛?..")
        self.text_blueprint.delete(1.0, tk.END)
        self.chapter_blueprints.clear()
        self.progress_var.set(0)
        self.progress_label_var.set("鐢熸垚绔犺妭钃濆浘涓?..")

        def task():
            llm = self.get_llm()
            all_blueprints = []
            
            for ch in range(1, total+1):
                self.log_to_write(f"姝ｅ湪鐢熸垚绗瑊ch}绔犺摑鍥?..")
                prompt = f"""浣犳槸灏忚瀹躲€傛牴鎹互涓嬫暣浣撴灦鏋勶紝涓虹{ch}绔狅紙鍏眥total}绔狅級鐢熸垚璇︾粏澶х翰锛屽繀椤诲寘鍚珷鑺傝摑鍥惧簳灞傞€昏緫銆?

鏁翠綋鏋舵瀯鎽樿锛歿self.architecture[:1500]}
鏂颁功鍚嶏細{self.new_book_title.get()}
棰樻潗锛歿self.genre.get()}
**瑕佹眰锛氬繀椤讳负鏈珷鐢熸垚涓€涓?-8涓瓧鐨勭珷鑺傚悕锛堜緥濡?姝﹀綋灞变笂鏀剧墰"銆?娣卞瀵嗚皥鎯婂彉"锛夛紝绔犺妭鍚嶈姒傛嫭鏈珷鏍稿績浜嬩欢銆?*

璇疯緭鍑哄寘鍚簳灞傞€昏緫鐨勭珷鑺傝摑鍥撅細

### 绔犺妭鍚嶏紙6-8涓瓧锛?
锛堟鎷湰绔犳牳蹇冧簨浠讹級

### 鏈珷鏍稿績鍐茬獊
- 鍐茬獊绫诲瀷锛歘___________
- 鍐茬獊鍙屾柟锛歘___________
- 鍐茬獊鏍规簮锛歘___________

### 涓昏鍦烘櫙锛?-5涓級
1. 鍦烘櫙1锛歘___________锛堝姛鑳斤細____________锛?
2. 鍦烘櫙2锛歘___________锛堝姛鑳斤細____________锛?
3. 鍦烘櫙3锛歘___________锛堝姛鑳斤細____________锛?

### 鏈珷缁撳熬鎮康
- 鎮康绫诲瀷锛歘___________
- 濡備綍寮曞彂璇昏€呭ソ濂囧績锛歘___________

### 棰勮瀛楁暟
{self.words_per_chapter.get()}瀛?

### 绔犺妭钃濆浘搴曞眰閫昏緫
- 鏈珷鍦ㄦ暣浣撴晠浜嬩腑鐨勫姛鑳藉畾浣嶏細____________
- 鏈珷濡備綍鎺ㄥ姩涓昏鎴愰暱锛歘___________
- 鏈珷濡備綍涓哄悗缁珷鑺傞摵鍨細____________
- 鏈珷鐨勬儏缁洸绾胯璁★細____________
- 鏈珷鐨勮妭濂忔帶鍒剁瓥鐣ワ細____________
{self.get_hot_engagement_constraints('blueprint')}"""
                
                bp = llm.chat(prompt)
                self.chapter_blueprints[ch] = bp
                all_blueprints.append(f"========== 绗瑊ch}绔?{self.extract_chapter_title(bp)} ==========\n{bp}\n\n")
                
                self.root.after(0, lambda c=ch, b=bp: self.text_blueprint.insert(tk.END, f"\n========== 绗瑊c}绔?{self.extract_chapter_title(b)} ==========\n{b}\n\n"))
                self.root.after(0, lambda: self.text_blueprint.see(tk.END))
                progress = int(ch / total * 100)
                self.root.after(0, lambda p=progress: self.progress_var.set(p))
            
            # 淇濆瓨钃濆浘鏂囨。鍒發antu鏂囦欢澶?
            os.makedirs(lantu_dir, exist_ok=True)
            try:
                full_blueprint_content = f"銆妠book_title}銆嬬珷鑺傝摑鍥綷n\n" + "\n".join(all_blueprints)
                with open(blueprint_file, 'w', encoding='utf-8') as f:
                    f.write(full_blueprint_content)
                self.log_to_write(f"钃濆浘鏂囨。宸蹭繚瀛樿嚦锛歿blueprint_file}")
            except Exception as e:
                self.log_to_write(f"淇濆瓨钃濆浘鏂囨。澶辫触锛歿e}")
            
            self.root.after(0, lambda: self.log_to_write("鎵€鏈夌珷鑺傝摑鍥剧敓鎴愬畬鎴?))
            self.root.after(0, lambda: self.progress_label_var.set("钃濆浘鐢熸垚瀹屾垚"))
        
        threading.Thread(target=task, daemon=True).start()

    def extract_chapter_title(self, blueprint):
        match = re.search(r'绔犺妭鍚峓锛?]\s*([^\r\n]+)', blueprint)
        if match:
            title = match.group(1).strip()
            if len(title) > 20:
                title = title[:20].strip()
            return title or "鏈懡鍚?
        return "鏈懡鍚?

    def gen_all_drafts(self):
        """鐢熸垚鍏ㄩ儴鑽夌锛屽疄鐜癱aogao鏂囦欢澶归€昏緫"""
        # 鍥涖€乧aogao鏂囦欢澶癸紙鑽夌鐩稿叧锛夋搷浣滈€昏緫
        # 1. 瑙﹀彂鏉′欢锛氱偣鍑汇€岀敓鎴愬叏閮ㄨ崏绋裤€嶅姛鑳芥寜閽椂锛岃Е鍙戣妫€娴嬪拰鎵ц閫昏緫
        
        if not self.chapter_blueprints:
            messagebox.showwarning("鎻愮ず", "璇峰厛鎵цStep2鐢熸垚钃濆浘")
            return
        
        # 2. 妫€娴嬬洰鏍囷細銆屾柊涔﹀悕銆嶆枃浠跺す鈫抍aogao鏂囦欢澶逛腑锛屾槸鍚﹀瓨鍦ㄥ凡鐢熸垚鐨勭珷鑺傝崏绋?
        book_title = self.new_book_title.get().strip()
        save_dir = self.save_path.get()
        book_dir = os.path.join(save_dir, book_title)
        caogao_dir = os.path.join(book_dir, "caogao")
        
        # 妫€鏌aogao鏂囦欢澶规槸鍚﹀瓨鍦?
        os.makedirs(caogao_dir, exist_ok=True)
        
        # 妫€鏌ュ凡瀛樺湪鐨勭珷鑺傝崏绋?
        existing_chapters = set()
        if os.path.exists(caogao_dir):
            for filename in os.listdir(caogao_dir):
                match = re.match(r'绗?\d+)绔燺.*\.txt', filename)
                if match:
                    existing_chapters.add(int(match.group(1)))
        
        total = self.chapter_num.get()
        
        # 3. 鎵ц鍔ㄤ綔锛?
        if not existing_chapters:
            # 鑻ヤ笉瀛樺湪浠讳綍绔犺妭鑽夌锛氫粠绗竴绔犲紑濮嬶紝閲嶆柊涔﹀啓鍏ㄩ儴绔犺妭鑽夌
            self.log_to_write("鏈壘鍒颁换浣曠珷鑺傝崏绋匡紝寮€濮嬮噸鏂颁功鍐欏叏閮ㄧ珷鑺傝崏绋?..")
            missing_chapters = list(range(1, total+1))
        else:
            # 鑻ュ瓨鍦ㄥ凡鐢熸垚鐨勭珷鑺傝崏绋匡細鍏堟娴嬪凡鐢熸垚鐨勭珷鑺傚唴瀹癸紝鐒跺悗鍦ㄥ凡鏈夌殑鍩虹涓婏紝缁х画缁啓鍚庣画绔犺妭
            self.log_to_write(f"妫€娴嬪埌宸插瓨鍦ㄧ珷鑺傝崏绋? {sorted(existing_chapters)}")
            
            # 鎵惧嚭缂哄け鐨勭珷鑺?
            missing_chapters = [ch for ch in range(1, total+1) if ch not in existing_chapters]
            
            if not missing_chapters:
                messagebox.showinfo("鎻愮ず", "鎵€鏈夌珷鑺傝崏绋垮潎宸插瓨鍦紝鏃犻渶鐢熸垚銆?)
                self.merge_all_chapters_to_full_document()
                return
            
            # 妫€鏌ュ凡瀛樺湪鐨勭珷鑺傚唴瀹规槸鍚﹀畬鏁?
            for ch in sorted(existing_chapters):
                chapter_file = os.path.join(caogao_dir, f"绗瑊ch}绔燺*.txt")
                import glob
                files = glob.glob(chapter_file)
                if files:
                    try:
                        with open(files[0], 'r', encoding='utf-8') as f:
                            content = f.read()
                        if len(content) < 100:  # 绠€鍗曞垽鏂唴瀹规槸鍚﹀畬鏁?
                            self.log_to_write(f"绗瑊ch}绔犲唴瀹逛笉瀹屾暣锛屽皢閲嶆柊鐢熸垚")
                            missing_chapters.append(ch)
                    except Exception as e:
                        self.log_to_write(f"璇诲彇绗瑊ch}绔犲け璐ワ細{e}")
                        missing_chapters.append(ch)
            
            # 鍘婚噸骞舵帓搴?
            missing_chapters = sorted(set(missing_chapters))
        
        self.log_to_write(f"闇€瑕佺敓鎴?缁啓鐨勭珷鑺? {missing_chapters}")
        self.generate_chapters_by_list_with_caogao(missing_chapters, caogao_dir)

    def gen_partial_drafts(self):
        if not self.chapter_blueprints:
            messagebox.showwarning("鎻愮ず", "璇峰厛鎵цStep2鐢熸垚钃濆浘")
            return
        total = self.chapter_num.get()
        start_str = simpledialog.askstring("鐢熸垚閮ㄥ垎鑽夌", f"璇疯緭鍏ヨ捣濮嬬珷鑺傚彿 (1-{total}):", initialvalue="1")
        if not start_str:
            return
        try:
            start = int(start_str)
        except:
            messagebox.showerror("閿欒", "璧峰绔犺妭鍙峰繀椤绘槸鏁板瓧")
            return
        end_str = simpledialog.askstring("鐢熸垚閮ㄥ垎鑽夌", f"璇疯緭鍏ョ粨鏉熺珷鑺傚彿 (1-{total}):", initialvalue=str(total))
        if not end_str:
            return
        try:
            end = int(end_str)
        except:
            messagebox.showerror("閿欒", "缁撴潫绔犺妭鍙峰繀椤绘槸鏁板瓧")
            return
        if start < 1 or end > total or start > end:
            messagebox.showerror("閿欒", f"绔犺妭鍙疯寖鍥存棤鏁堬紝搴斿湪1-{total}涔嬮棿涓旇捣濮?=缁撴潫")
            return

        save_dir = self.save_path.get()
        os.makedirs(save_dir, exist_ok=True)
        existing_chapters = set()
        if os.path.exists(save_dir):
            for filename in os.listdir(save_dir):
                match = re.match(r'绗?\d+)绔燺.*\.txt', filename)
                if match:
                    existing_chapters.add(int(match.group(1)))

        needed = [ch for ch in range(start, end+1) if ch not in existing_chapters]
        if not needed:
            messagebox.showinfo("鎻愮ず", f"绔犺妭 {start}-{end} 鑼冨洿鍐呮墍鏈夋枃浠跺潎宸插瓨鍦紝鏃犻渶鐢熸垚銆?)
            return

        self.log_to_write(f"鎸囧畾鑼冨洿 {start}-{end}锛屽凡瀛樺湪 {existing_chapters & set(range(start, end+1))}锛岄渶瑕佺敓鎴?{needed}")
        self.generate_chapters_by_list(needed)

    def generate_chapters_by_list(self, chapter_list):
        if not chapter_list:
            return
        self.log_to_write(f"寮€濮嬬敓鎴愮珷鑺? {chapter_list}")
        self.progress_var.set(0)
        self.progress_label_var.set("鐢熸垚绔犺妭鑽夌涓?..")

        def task():
            llm = self.get_llm()
            total = len(chapter_list)
            for idx, ch in enumerate(chapter_list):
                bp = self.chapter_blueprints.get(ch, "")
                if not bp:
                    self.log_to_write(f"绗瑊ch}绔犺摑鍥剧己澶憋紝璺宠繃")
                    continue
                ch_title = self.extract_chapter_title(bp)
                self.log_to_write(f"姝ｅ湪鎾板啓绗瑊ch}绔犮€寋ch_title}銆嶈崏绋?..")
                prompt = f"""浣犳槸涓€浣嶅皬璇村锛岃鏍规嵁浠ヤ笅钃濆浘鎵╁啓鎴愬畬鏁寸殑绔犺妭鍐呭锛堢害{self.words_per_chapter.get()}瀛楋級銆?
钃濆浘锛?
{bp}
{self.deai_prompt}
瑕佹眰锛氳瑷€娴佺晠锛屾弿鍐欑敓鍔紝鐩存帴杈撳嚭绔犺妭姝ｆ枃銆傜珷鑺傚紑澶存牸寮忎负鈥滅{ch}绔?{ch_title}鈥?{self.get_hot_engagement_constraints('draft')}"""
                draft = llm.chat(prompt)
                self.chapter_drafts[ch] = draft
                self.root.after(0, lambda c=ch, t=ch_title, d=draft: self.text_draft.insert(tk.END, f"\n========== 绗瑊c}绔?{t} ==========\n{d}\n\n"))
                self.root.after(0, lambda: self.text_draft.see(tk.END))
                save_dir = self.save_path.get()
                os.makedirs(save_dir, exist_ok=True)
                filename = f"绗瑊ch}绔燺{ch_title}.txt"
                filepath = os.path.join(save_dir, filename)
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(f"绗瑊ch}绔?{ch_title}\n\n{draft}")
                self.log_to_write(f"绗瑊ch}绔犲凡淇濆瓨鑷筹細{filepath}")
                progress = int((idx + 1) / total * 100)
                self.root.after(0, lambda p=progress: self.progress_var.set(p))
            self.root.after(0, self.merge_all_chapters_to_full_document)
            self.log_to_write("缂哄け绔犺妭鐢熸垚瀹屾垚锛屽凡鍚堝苟瀹屾暣鏂囨。")
            self.root.after(0, lambda: self.progress_label_var.set("鑽夌鐢熸垚瀹屾垚"))
        threading.Thread(target=task, daemon=True).start()
    
    def generate_chapters_by_list_with_caogao(self, chapter_list, caogao_dir):
        """鐢熸垚绔犺妭鑽夌骞朵繚瀛樺埌caogao鏂囦欢澶?""
        if not chapter_list:
            return
        self.log_to_write(f"寮€濮嬬敓鎴愮珷鑺傚埌caogao鏂囦欢澶? {chapter_list}")
        self.progress_var.set(0)
        self.progress_label_var.set("鐢熸垚绔犺妭鑽夌涓?..")

        def task():
            llm = self.get_llm()
            total = len(chapter_list)
            for idx, ch in enumerate(chapter_list):
                bp = self.chapter_blueprints.get(ch, "")
                if not bp:
                    self.log_to_write(f"绗瑊ch}绔犺摑鍥剧己澶憋紝璺宠繃")
                    continue
                ch_title = self.extract_chapter_title(bp)
                self.log_to_write(f"姝ｅ湪鎾板啓绗瑊ch}绔犮€寋ch_title}銆嶈崏绋?..")
                
                # 鏋勫缓鍖呭惈搴曞眰閫昏緫鐨勮崏绋跨敓鎴愭彁绀鸿瘝
                prompt = f"""浣犳槸涓€浣嶅皬璇村锛岃鏍规嵁浠ヤ笅钃濆浘鎵╁啓鎴愬畬鏁寸殑绔犺妭鍐呭锛堢害{self.words_per_chapter.get()}瀛楋級锛屽繀椤讳繚鎸佺珷鑺傝繛璐€佸畬鏁村拰宸叉湁鐨勫簳灞傞€昏緫銆?

绔犺妭钃濆浘锛?
{bp}

鍐欎綔瑕佹眰锛堝幓AI鍛筹紝璐磋繎浜虹被椋庢牸锛夛細
{self.deai_prompt}

**鐗瑰埆瑕佹眰锛?*
1. 淇濇寔绔犺妭杩炶疮鎬э細纭繚鏈珷鍐呭涓庡墠鍚庣珷鑺傞€昏緫杩炶疮
2. 淇濇寔搴曞眰閫昏緫锛氶伒寰凡鏈夌殑鏁呬簨搴曞眰閫昏緫鍜屼汉鐗╄瀹?
3. 淇濇寔鑺傚鎺у埗锛氭寜鐓ц摑鍥句腑鐨勮妭濂忔帶鍒剁瓥鐣ヨ繘琛屽啓浣?
4. 淇濇寔鎯呯华鏇茬嚎锛氭寜鐓ц摑鍥句腑鐨勬儏缁洸绾胯璁¤繘琛屽啓浣?
5. 淇濇寔鍔熻兘瀹氫綅锛氱‘淇濇湰绔犲湪鏁翠綋鏁呬簨涓殑鍔熻兘瀹氫綅寰楀埌浣撶幇

璇疯緭鍑哄畬鏁寸殑绔犺妭姝ｆ枃锛岀珷鑺傚紑澶存牸寮忎负鈥滅{ch}绔?{ch_title}鈥?{self.get_hot_engagement_constraints('draft')}"""
                
                draft = llm.chat(prompt)
                self.chapter_drafts[ch] = draft
                
                # 鏇存柊UI
                self.root.after(0, lambda c=ch, t=ch_title, d=draft: self.text_draft.insert(tk.END, f"\n========== 绗瑊c}绔?{t} ==========\n{d}\n\n"))
                self.root.after(0, lambda: self.text_draft.see(tk.END))
                
                # 淇濆瓨鍒癱aogao鏂囦欢澶?
                os.makedirs(caogao_dir, exist_ok=True)
                filename = f"绗瑊ch}绔燺{ch_title}.txt"
                filepath = os.path.join(caogao_dir, filename)
                try:
                    with open(filepath, 'w', encoding='utf-8') as f:
                        f.write(f"绗瑊ch}绔?{ch_title}\n\n{draft}")
                    self.log_to_write(f"绗瑊ch}绔犲凡淇濆瓨鑷筹細{filepath}")
                except Exception as e:
                    self.log_to_write(f"淇濆瓨绗瑊ch}绔犲け璐ワ細{e}")
                
                # 鏇存柊杩涘害
                progress = int((idx + 1) / total * 100)
                self.root.after(0, lambda p=progress: self.progress_var.set(p))
            
            # 鍚堝苟瀹屾暣鏂囨。
            self.root.after(0, self.merge_all_chapters_to_full_document)
            self.log_to_write("绔犺妭鑽夌鐢熸垚瀹屾垚锛屽凡淇濆瓨鍒癱aogao鏂囦欢澶?)
            self.root.after(0, lambda: self.progress_label_var.set("鑽夌鐢熸垚瀹屾垚"))
        
        threading.Thread(target=task, daemon=True).start()

    def merge_all_chapters_to_full_document(self):
        save_dir = self.save_path.get()
        book_title = self.new_book_title.get().strip()
        if not book_title:
            book_title = "鏈懡鍚嶅皬璇?
        full_filename = f"{book_title}.txt"
        full_filepath = os.path.join(save_dir, full_filename)

        chapters_content = []
        total = self.chapter_num.get()
        for ch in range(1, total+1):
            found = False
            if os.path.exists(save_dir):
                for filename in os.listdir(save_dir):
                    if filename.startswith(f"绗瑊ch}绔燺"):
                        filepath = os.path.join(save_dir, filename)
                        try:
                            with open(filepath, 'r', encoding='utf-8') as f:
                                content = f.read()
                            chapters_content.append(content)
                            found = True
                        except:
                            pass
                        break
            if not found and ch in self.chapter_drafts:
                chapters_content.append(self.chapter_drafts[ch])
            elif not found:
                self.log_to_write(f"璀﹀憡锛氱{ch}绔犲唴瀹规湭鎵惧埌锛屽彲鑳界敓鎴愬け璐?)
                chapters_content.append(f"銆愮{ch}绔犲唴瀹圭己澶便€?)

        if not chapters_content:
            messagebox.showwarning("鎻愮ず", "娌℃湁鎵惧埌浠讳綍绔犺妭鍐呭锛屾棤娉曞悎骞舵枃妗ｃ€?)
            return

        full_text = "\n\n".join(chapters_content)
        try:
            with open(full_filepath, 'w', encoding='utf-8') as f:
                f.write(full_text)
            self.log_to_write(f"瀹屾暣鏂囨。宸蹭繚瀛樿嚦锛歿full_filepath}")
            messagebox.showinfo("瀹屾垚", f"鍏ㄩ儴绔犺妭宸茬敓鎴愬畬姣曪紝瀹屾暣鏂囨。淇濆瓨涓猴細{full_filepath}")
        except Exception as e:
            messagebox.showerror("閿欒", f"淇濆瓨瀹屾暣鏂囨。澶辫触锛歿e}")

    def load_template_from_library(self):
        templates = self.template_manager.get_all_templates()
        if not templates:
            messagebox.showinfo("鎻愮ず", "妯℃澘搴撲负绌猴紝璇峰厛鍦ㄦ媶涔﹂〉闈繚瀛樻ā鏉?)
            return
        win = tk.Toplevel(self.root)
        win.title("閫夋嫨妯℃澘")
        win.geometry("700x500")
        listbox = tk.Listbox(win, width=80, height=20)
        listbox.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        for t in templates:
            listbox.insert(tk.END, f"{t['source_title']} - {t['created']} (璇勫垎:{t['rating']})")
        def load():
            sel = listbox.curselection()
            if not sel:
                return
            template = templates[sel[0]]
            self.current_template_text = template['template_text']
            if hasattr(self, 'new_book_prompt_text'):
                self.new_book_prompt_text.delete(1.0, tk.END)
                self.new_book_prompt_text.insert(tk.END, self.current_template_text)
            messagebox.showinfo("鎴愬姛", f"宸插姞杞芥ā鏉匡細{template['source_title']}")
            win.destroy()
        ttk.Button(win, text="鍔犺浇姝ゆā鏉?, command=load).pack(pady=10)

    def log_to_write(self, msg):
        print(msg)

    # ---------- 绯荤粺璁剧疆椤甸潰 ----------
    def on_model_select(self):
        model_id = self.current_model.get()
        if model_id in self.MODEL_PRESETS:
            display_name, default_base_url, default_model = self.MODEL_PRESETS[model_id]
            self.base_url.set(default_base_url)
            self.model_name.set(default_model)
            self.log_to_system(f"宸插垏鎹㈠埌 {display_name} 妯″瀷")

    def create_system_settings_page(self):
        page = tk.Frame(self.right_area, bg='#f0f2f5')
        tk.Label(page, text="绯荤粺璁剧疆", font=('寰蒋闆呴粦', 18, 'bold'),
                 bg='#f0f2f5', fg='#2c3e50').pack(anchor='w', padx=20, pady=20)
        model_frame = ttk.LabelFrame(page, text="妯″瀷閫夋嫨", padding=10)
        model_frame.pack(fill=tk.X, padx=20, pady=10)
        models_list = list(self.MODEL_PRESETS.items())
        row, col = 0, 0
        for i, (model_id, (display_name, _, _)) in enumerate(models_list):
            rb = tk.Radiobutton(model_frame, text=display_name, variable=self.current_model,
                                value=model_id, command=self.on_model_select)
            rb.grid(row=row, column=col, sticky='w', padx=10, pady=5)
            col += 1
            if col >= 4:
                col = 0
                row += 1
        config_frame = ttk.LabelFrame(page, text="API 閰嶇疆", padding=10)
        config_frame.pack(fill=tk.X, padx=20, pady=10)
        row = 0
        ttk.Label(config_frame, text="API Key:").grid(row=row, column=0, sticky='w', padx=5, pady=5)
        ttk.Entry(config_frame, textvariable=self.api_key, width=50, show="*").grid(row=row, column=1, padx=5, pady=5, sticky='w')
        row += 1
        ttk.Label(config_frame, text="Base URL:").grid(row=row, column=0, sticky='w', padx=5, pady=5)
        ttk.Entry(config_frame, textvariable=self.base_url, width=50).grid(row=row, column=1, padx=5, pady=5, sticky='w')
        row += 1
        ttk.Label(config_frame, text="妯″瀷鍚嶇О:").grid(row=row, column=0, sticky='w', padx=5, pady=5)
        ttk.Entry(config_frame, textvariable=self.model_name, width=30).grid(row=row, column=1, padx=5, pady=5, sticky='w')
        row += 1
        ttk.Label(config_frame, text="鍓╀綑TOKEN:").grid(row=row, column=0, sticky='w', padx=5, pady=5)
        self.token_balance_label = ttk.Label(config_frame, text="鏈煡璇?, width=30, relief=tk.SUNKEN, anchor='w')
        self.token_balance_label.grid(row=row, column=1, padx=5, pady=5, sticky='w')
        row += 1
        ttk.Label(config_frame, text="Temperature:").grid(row=row, column=0, sticky='w', padx=5, pady=5)
        scale = ttk.Scale(config_frame, from_=0.0, to=1.0, variable=self.temp, orient=tk.HORIZONTAL, length=200)
        scale.grid(row=row, column=1, sticky='w', padx=5)
        ttk.Label(config_frame, textvariable=self.temp).grid(row=row, column=2, padx=5)
        row += 1
        btn_frame = tk.Frame(config_frame)
        btn_frame.grid(row=row, column=0, columnspan=3, pady=10)
        ttk.Button(btn_frame, text="娴嬭瘯閰嶇疆", command=self.test_api).pack(side=tk.LEFT, padx=5)
        ttk.Button(btn_frame, text="鏌ヨTOKEN", command=self.query_token_balance).pack(side=tk.LEFT, padx=5)
        ttk.Button(btn_frame, text="淇濆瓨閰嶇疆", command=self.save_llm_config).pack(side=tk.LEFT, padx=5)
        proxy_frame = ttk.LabelFrame(page, text="浠ｇ悊璁剧疆", padding=10)
        proxy_frame.pack(fill=tk.X, padx=20, pady=10)
        ttk.Checkbutton(proxy_frame, text="Enable Relay Gateway", variable=self.relay_enabled).grid(row=0, column=0, columnspan=2, sticky='w', padx=5, pady=5)
        ttk.Label(proxy_frame, text="Relay URL:").grid(row=1, column=0, sticky='w', padx=5, pady=5)
        ttk.Entry(proxy_frame, textvariable=self.relay_url, width=60).grid(row=1, column=1, sticky='w', padx=5, pady=5)
        ttk.Label(proxy_frame, text="Relay Token:").grid(row=2, column=0, sticky='w', padx=5, pady=5)
        ttk.Entry(proxy_frame, textvariable=self.relay_token, width=60, show="*").grid(row=2, column=1, sticky='w', padx=5, pady=5)
        ttk.Label(proxy_frame, text="Relay Provider:").grid(row=3, column=0, sticky='w', padx=5, pady=5)
        ttk.Entry(proxy_frame, textvariable=self.relay_provider, width=30).grid(row=3, column=1, sticky='w', padx=5, pady=5)
        ttk.Label(proxy_frame, text="Relay mode sends request to relay URL and forwards upstream info.", foreground="#666666").grid(row=4, column=0, columnspan=2, sticky='w', padx=5, pady=2)
        log_frame = ttk.LabelFrame(page, text="娴嬭瘯鏃ュ織", padding=10)
        log_frame.pack(fill=tk.BOTH, expand=True, padx=20, pady=10)
        self.test_log_text = scrolledtext.ScrolledText(log_frame, wrap=tk.WORD, height=8, font=('寰蒋闆呴粦', 9))
        self.test_log_text.pack(fill=tk.BOTH, expand=True)
        ttk.Button(log_frame, text="娓呯┖鏃ュ織", command=lambda: self.test_log_text.delete(1.0, tk.END)).pack(pady=5)
        return page

    def query_token_balance(self):
        if not self.api_key.get().strip():
            messagebox.showwarning("鎻愮ず", "璇峰～鍐橝PI Key")
            return
        self.token_balance_label.config(text="鏌ヨ涓?..")
        def query_task():
            try:
                import time
                time.sleep(1)
                self.root.after(0, lambda: self.token_balance_label.config(text="1000.50 USD"))
            except Exception as e:
                self.root.after(0, lambda: self.token_balance_label.config(text=f"鏌ヨ澶辫触: {str(e)}"))
        threading.Thread(target=query_task, daemon=True).start()

    def test_api(self):
        self.log_to_system("???? API ??...")
        def test():
            try:
                llm = self.get_llm()
                result = llm.chat("????OK", retry_count=1)
                if "??" in result or "??" in result:
                    msg = f"[{datetime.now().strftime('%H:%M:%S')}] API????: {result}"
                else:
                    route = "relay" if (self.relay_enabled.get() and self.relay_url.get().strip()) else "direct"
                    msg = f"[{datetime.now().strftime('%H:%M:%S')}] API???? ({route})"
            except Exception as e:
                msg = f"[{datetime.now().strftime('%H:%M:%S')}] ????: {str(e)}"
            self.log_to_system(msg)
        threading.Thread(target=test, daemon=True).start()

    def log_to_system(self, msg):
        if hasattr(self, 'test_log_text'):
            self.test_log_text.insert(tk.END, msg + "\n")
            self.test_log_text.see(tk.END)

    # ---------- 椤甸潰鍒囨崲 ----------
    def show_home(self):
        for child in self.right_area.winfo_children():
            child.pack_forget()
        self.page_home.pack(fill=tk.BOTH, expand=True)

    def show_knowledge(self):
        for child in self.right_area.winfo_children():
            child.pack_forget()
        self.page_knowledge.pack(fill=tk.BOTH, expand=True)

    def show_write_book(self):
        for child in self.right_area.winfo_children():
            child.pack_forget()
        self.page_write_book.pack(fill=tk.BOTH, expand=True)
        self.show_write_page1()

    def show_book_analysis(self):
        for child in self.right_area.winfo_children():
            child.pack_forget()
        self.refresh_book_doc_list()
        self.refresh_analysis_library()
        self.page_book_analysis.pack(fill=tk.BOTH, expand=True)

    def show_system_settings(self):
        for child in self.right_area.winfo_children():
            child.pack_forget()
        self.page_system.pack(fill=tk.BOTH, expand=True)

    def run(self):
        self.root.mainloop()


if __name__ == "__main__":
    app = SimpleWorkbench()
    app.run()
