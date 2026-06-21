import warnings
warnings.filterwarnings("ignore", category=UserWarning)
warnings.filterwarnings("ignore", message="iCCP")
import tkinter as tk
from tkinter import ttk, scrolledtext, messagebox, filedialog, simpledialog
import threading
import requests
import json
import os
from datetime import datetime

# ==================== LLM 适配器 ====================
class SimpleLLM:
    def __init__(self, api_key, base_url, model, temperature, max_tokens):
        self.api_key = api_key
        self.base_url = base_url.rstrip('/')
        self.model = model
        self.temperature = temperature
        self.max_tokens = max_tokens

    def chat(self, prompt):
        url = f"{self.base_url}/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        data = {
            "model": self.model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": self.temperature,
            "max_tokens": self.max_tokens
        }
        try:
            resp = requests.post(url, headers=headers, json=data, timeout=120)
            if resp.status_code == 200:
                return resp.json()["choices"][0]["message"]["content"]
            else:
                # 返回详细错误信息，包含状态码和响应文本
                return f"错误：{resp.status_code}\n响应内容：{resp.text}"
        except Exception as e:
            return f"请求异常：{str(e)}"

    def test(self):
        result = self.chat("请回复：OK")
        return "OK" in result


# ==================== 题材基底库管理器 ====================
class GenreLibraryManager:
    def __init__(self, storage_file="./genre_library.json"):
        self.storage_file = storage_file
        self.genres = []
        self.load()

    def load(self):
        if os.path.exists(self.storage_file):
            try:
                with open(self.storage_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                if isinstance(data, list):
                    self.genres = self._validate_and_fix(data)
                else:
                    self.genres = self._default_library()
            except Exception as e:
                print(f"加载题材库失败：{e}，使用默认库")
                self.genres = self._default_library()
        else:
            self.genres = self._default_library()
        self._save()

    def _validate_and_fix(self, node_list):
        if not isinstance(node_list, list):
            return []
        fixed = []
        for node in node_list:
            if isinstance(node, str):
                node = {"name": node, "description": "", "children": []}
            if not isinstance(node, dict):
                continue
            if "name" not in node:
                continue
            if "description" not in node:
                node["description"] = ""
            if "children" not in node:
                node["children"] = []
            node["children"] = self._validate_and_fix(node["children"])
            fixed.append(node)
        return fixed

    def _default_library(self):
        return [
            {
                "name": "都市小说",
                "description": "以现代城市为主要舞台，强调现实冲突与人物关系。",
                "children": [
                    {"name": "都市生活小说", "description": "以现实生活、邻里关系、家庭与日常经营为主要舞台。", "children": []},
                    {"name": "都市异能小说", "description": "现代都市框架下叠加超常能力、隐秘规则或特殊职业。", "children": []},
                    {"name": "都市职场小说", "description": "围绕职业成长、组织关系与现实利益推进剧情。", "children": []}
                ]
            },
            {
                "name": "科幻小说",
                "description": "以科技变革、未来秩序、宇宙探索或末世生存为核心驱动力。",
                "children": [
                    {"name": "近未来科幻小说", "description": "基于现实延展的近未来社会、技术和日常冲突。", "children": []},
                    {"name": "末世科幻小说", "description": "灾变、资源危机和秩序重建共同驱动人物选择。", "children": []}
                ]
            }
        ]

    def _save(self):
        with open(self.storage_file, 'w', encoding='utf-8') as f:
            json.dump(self.genres, f, ensure_ascii=False, indent=2)

    def count_all_nodes(self):
        def count_nodes(node_list):
            if not isinstance(node_list, list):
                return 0
            cnt = len(node_list)
            for node in node_list:
                if isinstance(node, dict):
                    cnt += count_nodes(node.get("children", []))
            return cnt
        return count_nodes(self.genres)

    def get_all_nodes_flat(self):
        result = []
        def traverse(nodes, path_prefix=""):
            if not isinstance(nodes, list):
                return
            for node in nodes:
                if not isinstance(node, dict):
                    continue
                name = node.get("name", "未知")
                full_path = f"{path_prefix} -> {name}" if path_prefix else name
                result.append((node, full_path))
                traverse(node.get("children", []), full_path)
        traverse(self.genres)
        return result

    def find_node_by_path(self, path_list):
        if not path_list or not isinstance(path_list, list):
            return None, None
        current = self.genres
        for i, name in enumerate(path_list):
            found = None
            found_idx = -1
            if not isinstance(current, list):
                return None, None
            for idx, node in enumerate(current):
                if isinstance(node, dict) and node.get("name") == name:
                    found = node
                    found_idx = idx
                    break
            if found is None:
                return None, None
            if i == len(path_list) - 1:
                return found, (current, found_idx)
            current = found.get("children", [])
        return None, None

    def add_node(self, parent_path_list, name, description):
        if not name:
            return False, "名称不能为空"
        if parent_path_list:
            parent_node, parent_info = self.find_node_by_path(parent_path_list)
            if parent_node is None:
                return False, "父节点不存在"
            children = parent_node.get("children", [])
            for child in children:
                if isinstance(child, dict) and child.get("name") == name:
                    return False, "同级已存在同名题材"
            children.append({"name": name, "description": description, "children": []})
        else:
            for node in self.genres:
                if isinstance(node, dict) and node.get("name") == name:
                    return False, "顶级已存在同名题材"
            self.genres.append({"name": name, "description": description, "children": []})
        self._save()
        return True, "添加成功"

    def update_node(self, path_list, new_name, new_description):
        node, parent_info = self.find_node_by_path(path_list)
        if node is None:
            return False, "节点不存在"
        if new_name != node.get("name"):
            parent_container = parent_info[0] if parent_info else self.genres
            for other in parent_container:
                if isinstance(other, dict) and other.get("name") == new_name and other is not node:
                    return False, "同级已存在同名题材"
        node["name"] = new_name
        node["description"] = new_description
        self._save()
        return True, "更新成功"

    def delete_node(self, path_list):
        node, parent_info = self.find_node_by_path(path_list)
        if node is None:
            return False, "节点不存在"
        parent_container, idx = parent_info
        del parent_container[idx]
        self._save()
        return True, "删除成功"

    def get_node_description(self, path_list):
        node, _ = self.find_node_by_path(path_list)
        return node.get("description", "") if node else ""

    def get_all_genre_names_for_combo(self):
        flat = self.get_all_nodes_flat()
        return [path for _, path in flat]


# ==================== 高级剧情设定窗口 ====================
class AdvancedPlotWindow:
    def __init__(self, parent, current_data):
        self.window = tk.Toplevel(parent)
        self.window.title("高级剧情设定")
        self.window.geometry("750x700")
        self.window.transient(parent)
        self.window.grab_set()

        self.result = current_data.copy()

        notebook = ttk.Notebook(self.window)
        notebook.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)

        frame1 = ttk.Frame(notebook)
        notebook.add(frame1, text="故事梗概")
        ttk.Label(frame1, text="核心梗概（一句话或一段话，必填）:").pack(anchor='w', padx=5, pady=5)
        self.text_synopsis = scrolledtext.ScrolledText(frame1, wrap=tk.WORD, height=8)
        self.text_synopsis.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)
        self.text_synopsis.insert(tk.END, current_data.get('synopsis', ''))

        frame2 = ttk.Frame(notebook)
        notebook.add(frame2, text="详细剧情")
        ttk.Label(frame2, text="主要剧情发展、关键事件、高潮转折等（可选）:").pack(anchor='w', padx=5, pady=5)
        self.text_plot = scrolledtext.ScrolledText(frame2, wrap=tk.WORD, height=15)
        self.text_plot.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)
        self.text_plot.insert(tk.END, current_data.get('plot_detail', ''))

        frame3 = ttk.Frame(notebook)
        notebook.add(frame3, text="人物关系")
        ttk.Label(frame3, text="主要角色设定、人物关系、性格特点等（可选）:").pack(anchor='w', padx=5, pady=5)
        self.text_char = scrolledtext.ScrolledText(frame3, wrap=tk.WORD, height=15)
        self.text_char.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)
        self.text_char.insert(tk.END, current_data.get('characters', ''))

        frame4 = ttk.Frame(notebook)
        notebook.add(frame4, text="额外提示词")
        ttk.Label(frame4, text="风格、偏好、禁忌等（可选）:").pack(anchor='w', padx=5, pady=5)
        self.text_extra = scrolledtext.ScrolledText(frame4, wrap=tk.WORD, height=15)
        self.text_extra.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)
        self.text_extra.insert(tk.END, current_data.get('extra_prompt', ''))

        frame5 = ttk.Frame(notebook)
        notebook.add(frame5, text="反AI规则")
        rules = [
            "鼓励嘴硬补偿：人物吃瘪后用嘴硬、转移或找补来维持体面。",
            "鼓励现实落差：让人物预期和现实结果之间出现落差。",
            "禁止总结主题：禁止把段落写成总结中心思想或提炼人生道理。",
            "禁止直接说教：禁止作者替角色或读者做直接价值判断和说教。",
            "句式重复率过高：连续句式过于整齐，容易显得机械。",
            "段落长度过于整齐：段落长度和节奏过于平均，容易产生 AI 作文感。",
            "鼓励无意义小动作：鼓励加入真实但不推动主线的小动作增强人味。",
            "鼓励生活噪音：适当加入与主线不完全相关的生活噪音增加现场感。",
            "禁止段尾升华：禁止在段尾或收尾处用总结句升华主题。",
            "禁止解释型心理描写：禁止直接使用“他感到”“他意识到”等句式解释人物心理。",
            "对话功能推进：对话只有信息推进，没有人物语气和生活噪音。",
            "连续三段解释性叙事：连续几段只有解释没有动作，会削弱现场感。"
        ]
        canvas = tk.Canvas(frame5, borderwidth=0)
        scrollbar = ttk.Scrollbar(frame5, orient="vertical", command=canvas.yview)
        scrollable_frame = ttk.Frame(canvas)
        scrollable_frame.bind("<Configure>", lambda e: canvas.configure(scrollregion=canvas.bbox("all")))
        canvas.create_window((0, 0), window=scrollable_frame, anchor="nw")
        canvas.configure(yscrollcommand=scrollbar.set)
        canvas.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")
        self.rule_vars = []
        for rule in rules:
            var = tk.BooleanVar()
            cb = tk.Checkbutton(scrollable_frame, text=rule, variable=var, anchor='w', justify=tk.LEFT)
            cb.pack(fill='x', padx=10, pady=3)
            self.rule_vars.append((rule, var))
        btn_frame = ttk.Frame(frame5)
        btn_frame.pack(fill=tk.X, pady=10)
        ttk.Button(btn_frame, text="将选中规则添加到额外提示词", command=self.add_selected_rules).pack(pady=5)
        ttk.Label(btn_frame, text="提示：规则文本会追加到「额外提示词」文本框末尾，您可继续编辑。", foreground="gray").pack()

        btn_frame2 = ttk.Frame(self.window)
        btn_frame2.pack(fill=tk.X, pady=10)
        ttk.Button(btn_frame2, text="保存设定", command=self.save).pack(side=tk.RIGHT, padx=10)
        ttk.Button(btn_frame2, text="取消", command=self.window.destroy).pack(side=tk.RIGHT, padx=5)

    def add_selected_rules(self):
        selected = [rule for rule, var in self.rule_vars if var.get()]
        if not selected:
            messagebox.showinfo("提示", "请至少勾选一条规则")
            return
        lines = ["\n【反AI规则】"]
        for idx, rule in enumerate(selected, 1):
            lines.append(f"{idx}. {rule}")
        text_block = "\n".join(lines)
        self.text_extra.insert(tk.END, "\n" + text_block)
        messagebox.showinfo("成功", "已将选中规则添加到额外提示词")

    def save(self):
        self.result['synopsis'] = self.text_synopsis.get(1.0, tk.END).strip()
        self.result['plot_detail'] = self.text_plot.get(1.0, tk.END).strip()
        self.result['characters'] = self.text_char.get(1.0, tk.END).strip()
        self.result['extra_prompt'] = self.text_extra.get(1.0, tk.END).strip()
        self.window.destroy()

    def get_data(self):
        return self.result


# ==================== 角色库管理器 ====================
class CharacterLibrary:
    def __init__(self, storage_file="./character_library.json"):
        self.storage_file = storage_file
        self.characters = []
        self.load()

    def load(self):
        if os.path.exists(self.storage_file):
            try:
                with open(self.storage_file, 'r', encoding='utf-8') as f:
                    self.characters = json.load(f)
            except:
                self.characters = []
        else:
            self.characters = []

    def save(self):
        with open(self.storage_file, 'w', encoding='utf-8') as f:
            json.dump(self.characters, f, ensure_ascii=False, indent=2)

    def add_character(self, name, char_type, description):
        self.characters.append({'name': name, 'type': char_type, 'description': description})
        self.save()

    def delete_character(self, index):
        if 0 <= index < len(self.characters):
            del self.characters[index]
            self.save()

    def get_all(self):
        return self.characters

    def get_formatted_text(self):
        if not self.characters:
            return ""
        lines = []
        for ch in self.characters:
            lines.append(f"【{ch['type']}】{ch['name']}")
            lines.append(f"描述：{ch['description']}")
            lines.append("")
        return "\n".join(lines).strip()


# ==================== 知识库管理器 ====================
class KnowledgeBaseManager:
    def __init__(self, storage_dir="./knowledge_base"):
        self.storage_dir = storage_dir
        self.meta_file = os.path.join(storage_dir, "meta.json")
        os.makedirs(storage_dir, exist_ok=True)
        self.meta = self._load_meta()

    def _load_meta(self):
        if os.path.exists(self.meta_file):
            with open(self.meta_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        return {}

    def _save_meta(self):
        with open(self.meta_file, 'w', encoding='utf-8') as f:
            json.dump(self.meta, f, ensure_ascii=False, indent=2)

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
        file_name = f"{doc_id}_v{version}.txt"
        file_path = os.path.join(self.storage_dir, file_name)
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        version_info = {'version': version, 'time': now, 'file': file_name, 'active': True}
        self.meta[doc_id]['versions'].append(version_info)
        self._save_meta()
        return doc_id, version

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
                    break
        if not target:
            return None
        file_path = os.path.join(self.storage_dir, target['file'])
        if not os.path.exists(file_path):
            return None
        with open(file_path, 'r', encoding='utf-8') as f:
            return f.read()

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
        return True

    def delete_document(self, doc_id):
        if doc_id not in self.meta:
            return False
        for v in self.meta[doc_id]['versions']:
            file_path = os.path.join(self.storage_dir, v['file'])
            if os.path.exists(file_path):
                os.remove(file_path)
        del self.meta[doc_id]
        self._save_meta()
        return True


# ==================== 主工作台 ====================
class NovelWorkbench:
    # 模型预设配置 (标识: (显示名称, 默认Base URL, 默认模型名称))
    # 注意：豆包模型名称已修正为官方大小写（Doubao-seed-2.0-lite / Doubao-seed-2.0-pro）
    MODEL_PRESETS = {
        "deepseek": ("DeepSeek", "https://api.deepseek.com/v1", "deepseek-chat"),
        "doubao-lite": ("豆包-Seed-2.0-lite", "https://ark.cn-beijing.volces.com/api/v3", "doubao-seed-2-0-lite-260215"),
        "doubao-pro": ("豆包-Seed-2.0-pro", "https://ark.cn-beijing.volces.com/api/v3", "doubao-seed-2-0-pro-260215"),
        "siliconflow": ("SiliconFlow", "https://api.siliconflow.cn/v1", "deepseek-ai/DeepSeek-V2.5"),
        "openai": ("OpenAI", "https://api.openai.com/v1", "gpt-4o-mini"),
        "anthropic": ("Anthropic", "https://api.anthropic.com/v1", "claude-3-haiku-20240307"),
        "grok": ("Grok", "https://api.x.ai/v1", "grok-beta"),
        "kimi": ("Kimi", "https://api.moonshot.cn/v1", "moonshot-v1-8k"),
        "glm": ("GLM", "https://open.bigmodel.cn/api/paas/v4", "glm-4-flash"),
        "qwen": ("Qwen", "https://dashscope.aliyuncs.com/compatible-mode/v1", "qwen-turbo"),
        "gemini": ("Gemini", "https://generativelanguage.googleapis.com/v1beta/openai/", "gemini-1.5-flash"),
        "minimax": ("MiniMax", "https://api.minimax.chat/v1", "abab6.5s-chat")
    }

    def __init__(self):
        self.root = tk.Tk()
        self.root.title("AI小说创作工作台")
        self.root.geometry("1400x850")
        self.root.configure(bg='#f0f2f5')

        self.architecture = ""
        self.chapter_blueprints = {}
        self.chapter_drafts = {}
        self.current_chapter = 1
        self.advanced_data = {
            'synopsis': '',
            'plot_detail': '',
            'characters': '',
            'extra_prompt': ''
        }

        self.api_key = tk.StringVar()
        self.base_url = tk.StringVar(value="https://api.deepseek.com/v1")
        self.model_name = tk.StringVar(value="deepseek-chat")
        self.temp = tk.DoubleVar(value=0.7)
        self.current_model = tk.StringVar(value="deepseek")

        self.topic = tk.StringVar(value="默认主题")
        self.genre = tk.StringVar(value="")
        self.chapter_num = tk.IntVar(value=5)
        self.words_per_chapter = tk.IntVar(value=3000)
        self.save_path = tk.StringVar(value="./小说输出")

        self.kb_manager = KnowledgeBaseManager()
        self.char_library = CharacterLibrary()
        self.genre_manager = GenreLibraryManager()

        # 加载LLM配置
        self.load_llm_config()
        self.setup_ui()
        self.load_project_state()

        self.log("工作台已启动，已恢复上次状态")
        self.refresh_genre_combobox()

        self.root.protocol("WM_DELETE_WINDOW", self.on_closing)

    # ---------- 状态持久化 ----------
    def save_llm_config(self):
        config = {
            'api_key': self.api_key.get(),
            'base_url': self.base_url.get(),
            'model_name': self.model_name.get(),
            'temperature': self.temp.get(),
            'current_model': self.current_model.get()
        }
        with open('llm_config.json', 'w', encoding='utf-8') as f:
            json.dump(config, f, indent=2)

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
            except:
                pass

    def save_project_state(self):
        synopsis = ""
        arch_content = ""
        blueprint_content = ""
        draft_content = ""
        genre_desc = ""
        try:
            if hasattr(self, 'synopsis_text') and self.synopsis_text.winfo_exists():
                synopsis = self.synopsis_text.get(1.0, tk.END).strip()
        except:
            pass
        try:
            if hasattr(self, 'text_arch') and self.text_arch.winfo_exists():
                arch_content = self.text_arch.get(1.0, tk.END).strip()
        except:
            pass
        try:
            if hasattr(self, 'text_blueprint') and self.text_blueprint.winfo_exists():
                blueprint_content = self.text_blueprint.get(1.0, tk.END).strip()
        except:
            pass
        try:
            if hasattr(self, 'text_draft') and self.text_draft.winfo_exists():
                draft_content = self.text_draft.get(1.0, tk.END).strip()
        except:
            pass
        try:
            if hasattr(self, 'genre_desc_text') and self.genre_desc_text.winfo_exists():
                genre_desc = self.genre_desc_text.get(1.0, tk.END).strip()
        except:
            pass

        state = {
            'architecture': self.architecture,
            'chapter_blueprints': self.chapter_blueprints,
            'chapter_drafts': self.chapter_drafts,
            'advanced_data': self.advanced_data,
            'current_chapter': self.current_chapter,
            'genre': self.genre.get(),
            'chapter_num': self.chapter_num.get(),
            'words_per_chapter': self.words_per_chapter.get(),
            'save_path': self.save_path.get(),
            'topic': self.topic.get(),
            'synopsis_text': synopsis,
            'arch_text': arch_content,
            'blueprint_text': blueprint_content,
            'draft_text': draft_content,
            'genre_desc_text': genre_desc
        }
        try:
            with open('project_state.json', 'w', encoding='utf-8') as f:
                json.dump(state, f, ensure_ascii=False, indent=2)
        except:
            pass

    def load_project_state(self):
        if not os.path.exists('project_state.json'):
            return
        try:
            with open('project_state.json', 'r', encoding='utf-8') as f:
                state = json.load(f)
            self.architecture = state.get('architecture', '')
            self.chapter_blueprints = {int(k): v for k, v in state.get('chapter_blueprints', {}).items()}
            self.chapter_drafts = {int(k): v for k, v in state.get('chapter_drafts', {}).items()}
            self.advanced_data = state.get('advanced_data', {'synopsis': '', 'plot_detail': '', 'characters': '', 'extra_prompt': ''})
            self.current_chapter = state.get('current_chapter', 1)
            self.genre.set(state.get('genre', ''))
            self.chapter_num.set(state.get('chapter_num', 5))
            self.words_per_chapter.set(state.get('words_per_chapter', 3000))
            self.save_path.set(state.get('save_path', './小说输出'))
            self.topic.set(state.get('topic', '默认主题'))
            self.root.after(100, lambda: self.restore_text_widgets(state))
        except Exception as e:
            self.log(f"加载项目状态失败：{e}")

    def restore_text_widgets(self, state):
        if hasattr(self, 'synopsis_text'):
            self.synopsis_text.delete(1.0, tk.END)
            self.synopsis_text.insert(tk.END, state.get('synopsis_text', ''))
            self.advanced_data['synopsis'] = state.get('synopsis_text', '')
        if hasattr(self, 'text_arch'):
            self.text_arch.delete(1.0, tk.END)
            self.text_arch.insert(tk.END, state.get('arch_text', ''))
        if hasattr(self, 'text_blueprint'):
            self.text_blueprint.delete(1.0, tk.END)
            self.text_blueprint.insert(tk.END, state.get('blueprint_text', ''))
        if hasattr(self, 'text_draft'):
            self.text_draft.delete(1.0, tk.END)
            self.text_draft.insert(tk.END, state.get('draft_text', ''))
        if hasattr(self, 'genre_desc_text'):
            self.genre_desc_text.delete(1.0, tk.END)
            self.genre_desc_text.insert(tk.END, state.get('genre_desc_text', ''))

    def on_closing(self):
        self.save_project_state()
        self.save_llm_config()
        self.root.destroy()

    # ---------- UI 搭建 ----------
    def setup_ui(self):
        main_container = ttk.Frame(self.root)
        main_container.pack(fill=tk.BOTH, expand=True)

        left_nav = tk.Frame(main_container, bg='#2c3e50', width=220)
        left_nav.pack(side=tk.LEFT, fill=tk.Y)
        left_nav.pack_propagate(False)

        btn_style = {'font': ('微软雅黑', 11), 'bg': '#2c3e50', 'fg': 'white',
                     'activebackground': '#34495e', 'activeforeground': 'white',
                     'bd': 0, 'anchor': 'w', 'padx': 20, 'pady': 12, 'width': 18}

        title_label = tk.Label(left_nav, text="AI小说创作台", font=('微软雅黑', 16, 'bold'),
                               bg='#2c3e50', fg='#ecf0f1')
        title_label.pack(pady=(30, 20))

        self.nav_buttons = {}
        nav_items = [
            ("🏠 首页", self.show_home),
            ("✍️ 创作中心", self.show_creation_center),
            ("🎨 资产", self.show_assets),
            ("📖 知识库", self.show_knowledge),
            ("⚙️ 题材基地库", self.show_writing_engine),
            ("👥 基础角色库", self.show_character_library),
        ]
        for text, cmd in nav_items:
            btn = tk.Button(left_nav, text=text, command=cmd, **btn_style)
            btn.pack(fill=tk.X, pady=2)
            self.nav_buttons[text] = btn

        spacer = tk.Frame(left_nav, bg='#2c3e50')
        spacer.pack(expand=True, fill=tk.BOTH)

        settings_btn = tk.Button(left_nav, text="🔧 系统设置", command=self.show_system_settings, **btn_style)
        settings_btn.pack(side=tk.BOTTOM, fill=tk.X, pady=2)
        self.nav_buttons["🔧 系统设置"] = settings_btn

        self.right_area = tk.Frame(main_container, bg='#f0f2f5')
        self.right_area.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        self.page_home = self.create_home_page()
        self.page_creation = self.create_creation_center()
        self.page_assets = self.create_assets_page()
        self.page_knowledge = self.create_knowledge_page()
        self.page_writing_engine = self.create_writing_engine_page()
        self.page_character_library = self.create_character_library_page()
        self.page_system = self.create_system_settings_page()

        self.show_home()

    def create_home_page(self):
        page = tk.Frame(self.right_area, bg='#f0f2f5')
        tk.Label(page, text="欢迎使用 AI 小说创作工作台", font=('微软雅黑', 24, 'bold'),
                 bg='#f0f2f5', fg='#2c3e50').pack(pady=30)
        tk.Label(page, text="快速开启你的创作之旅", font=('微软雅黑', 14),
                 bg='#f0f2f5', fg='#7f8c8d').pack()
        card = tk.Frame(page, bg='white', relief=tk.RAISED, bd=1)
        card.pack(pady=30, padx=100, fill=tk.X)
        card.pack_propagate(False)
        card.config(height=120)
        tk.Label(card, text="新手推荐：低门槛开书", font=('微软雅黑', 14, 'bold'),
                 bg='white', fg='#e67e22').place(x=20, y=15)
        tk.Label(card, text="想快速开启下一本书？先交给AI自动导演。\n你只需要提供一个模糊想法，AI会先帮你生成方向方案、标题包和开书准备。",
                 bg='white', fg='#555', justify=tk.LEFT, font=('微软雅黑', 10)).place(x=20, y=45)
        btn_frame = tk.Frame(card, bg='white')
        btn_frame.place(relx=1.0, y=85, anchor='e', x=-20)
        tk.Button(btn_frame, text="AI自动导演开书", font=('微软雅黑', 10),
                  bg='#3498db', fg='white', padx=12, pady=4,
                  command=self.open_auto_director).pack(side=tk.LEFT, padx=5)
        tk.Button(btn_frame, text="手动创建小说", font=('微软雅黑', 10),
                  bg='#95a5a6', fg='white', padx=12, pady=4,
                  command=self.open_manual_create).pack(side=tk.LEFT, padx=5)
        return page

    def create_assets_page(self):
        page = tk.Frame(self.right_area, bg='#f0f2f5')
        tk.Label(page, text="资产 - 题材基底库", font=('微软雅黑', 18, 'bold'),
                 bg='#f0f2f5', fg='#2c3e50').pack(anchor='w', padx=20, pady=20)
        tk.Label(page, text="这里可以存放预设的题材、世界观、角色模板等资产。\n后续你可以根据自己的需要完善此模块。",
                 bg='#f0f2f5', fg='#555', font=('微软雅黑', 12)).pack(anchor='w', padx=20)
        return page

    def create_knowledge_page(self):
        page = tk.Frame(self.right_area, bg='#f0f2f5')
        upload_frame = ttk.LabelFrame(page, text="上传文档", padding=10)
        upload_frame.pack(fill=tk.X, padx=20, pady=10)

        self.kb_file_path = tk.StringVar()
        ttk.Label(upload_frame, text="选择文件:").grid(row=0, column=0, sticky='w', padx=5, pady=5)
        ttk.Entry(upload_frame, textvariable=self.kb_file_path, width=40).grid(row=0, column=1, padx=5, pady=5)
        ttk.Button(upload_frame, text="浏览", command=self.browse_kb_file).grid(row=0, column=2, padx=5)
        ttk.Button(upload_frame, text="上传文档", command=self.upload_kb_document).grid(row=1, column=0, columnspan=3, pady=10)

        search_frame = ttk.LabelFrame(page, text="文档列表", padding=10)
        search_frame.pack(fill=tk.BOTH, expand=True, padx=20, pady=10)

        search_row = tk.Frame(search_frame)
        search_row.pack(fill=tk.X, pady=5)
        ttk.Label(search_row, text="按标题搜索:").pack(side=tk.LEFT, padx=5)
        self.kb_search_var = tk.StringVar()
        self.kb_search_var.trace('w', lambda *a: self.refresh_kb_list())
        ttk.Entry(search_row, textvariable=self.kb_search_var, width=30).pack(side=tk.LEFT, padx=5)
        ttk.Button(search_row, text="刷新", command=self.refresh_kb_list).pack(side=tk.LEFT, padx=5)

        columns = ("标题", "激活版本", "最后更新", "操作")
        self.kb_tree = ttk.Treeview(search_frame, columns=columns, show="headings", height=15)
        for col in columns:
            self.kb_tree.heading(col, text=col)
            if col == "标题":
                self.kb_tree.column(col, width=250)
            elif col == "激活版本":
                self.kb_tree.column(col, width=100)
            elif col == "最后更新":
                self.kb_tree.column(col, width=150)
            else:
                self.kb_tree.column(col, width=100)
        self.kb_tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scrollbar = ttk.Scrollbar(search_frame, orient=tk.VERTICAL, command=self.kb_tree.yview)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        self.kb_tree.configure(yscrollcommand=scrollbar.set)

        self.kb_tree.bind("<Double-1>", self.view_kb_document)
        self.kb_menu = tk.Menu(self.root, tearoff=0)
        self.kb_menu.add_command(label="查看内容", command=self.view_kb_document)
        self.kb_menu.add_command(label="版本管理", command=self.manage_kb_versions)
        self.kb_menu.add_command(label="删除文档", command=self.delete_kb_document)
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
            messagebox.showwarning("提示", "请选择有效的txt文件")
            return
        title = os.path.splitext(os.path.basename(file_path))[0]
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except Exception as e:
            messagebox.showerror("错误", f"读取文件失败：{e}")
            return
        doc_id, version = self.kb_manager.upload_document(title, content)
        messagebox.showinfo("成功", f"文档「{title}」上传成功，版本 v{version}")
        self.kb_file_path.set("")
        self.refresh_kb_list()

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
                "双击查看"
            ), iid=doc['doc_id'])

    def view_kb_document(self, event=None):
        selected = self.kb_tree.selection()
        if not selected:
            return
        doc_id = selected[0]
        content = self.kb_manager.get_document_content(doc_id)
        if content is None:
            messagebox.showerror("错误", "无法获取文档内容")
            return
        win = tk.Toplevel(self.root)
        win.title(f"查看文档 - {doc_id}")
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
        win.title(f"版本管理 - {doc_id}")
        win.geometry("500x400")
        tk.Label(win, text=f"文档：{doc_id}", font=('微软雅黑', 12, 'bold')).pack(pady=10)
        listbox = tk.Listbox(win, height=15)
        listbox.pack(fill=tk.BOTH, expand=True, padx=20, pady=10)
        for v in versions:
            active_mark = "✓ " if v['active'] else "  "
            listbox.insert(tk.END, f"{active_mark}v{v['version']} - {v['time']}")
        def switch():
            selection = listbox.curselection()
            if not selection:
                return
            idx = selection[0]
            target_version = versions[idx]['version']
            if self.kb_manager.switch_version(doc_id, target_version):
                messagebox.showinfo("成功", f"已切换到 v{target_version}")
                win.destroy()
                self.refresh_kb_list()
            else:
                messagebox.showerror("错误", "切换失败")
        ttk.Button(win, text="切换到选中版本", command=switch).pack(pady=10)

    def delete_kb_document(self):
        selected = self.kb_tree.selection()
        if not selected:
            return
        doc_id = selected[0]
        if messagebox.askyesno("确认删除", f"确定要删除文档「{doc_id}」及其所有版本吗？"):
            self.kb_manager.delete_document(doc_id)
            self.refresh_kb_list()

    def show_kb_context_menu(self, event):
        item = self.kb_tree.identify_row(event.y)
        if item:
            self.kb_tree.selection_set(item)
            self.kb_menu.post(event.x_root, event.y_root)

    def create_character_library_page(self):
        page = tk.Frame(self.right_area, bg='#f0f2f5')
        info_frame = tk.Frame(page, bg='#f0f2f5')
        info_frame.pack(fill=tk.X, padx=20, pady=10)
        self.char_count_label = tk.Label(info_frame, text=f"已创建角色：{len(self.char_library.get_all())}",
                                         font=('微软雅黑', 12), bg='#f0f2f5', fg='#2c3e50')
        self.char_count_label.pack(side=tk.LEFT)
        tk.Button(info_frame, text="角色库发往创作中枢", font=('微软雅黑', 10),
                  bg='#3498db', fg='white', padx=10, pady=4,
                  command=self.send_characters_to_creation).pack(side=tk.RIGHT, padx=5)

        form_frame = ttk.LabelFrame(page, text="创建角色", padding=10)
        form_frame.pack(fill=tk.X, padx=20, pady=10)
        row1 = tk.Frame(form_frame)
        row1.pack(fill=tk.X, pady=5)
        tk.Label(row1, text="角色名称", font=('微软雅黑', 10), width=8).pack(side=tk.LEFT, padx=5)
        self.new_char_name = tk.Entry(row1, font=('微软雅黑', 10), width=20)
        self.new_char_name.pack(side=tk.LEFT, padx=5)
        tk.Label(row1, text="主配角", font=('微软雅黑', 10), width=8).pack(side=tk.LEFT, padx=5)
        self.new_char_type = ttk.Combobox(row1, values=["主角", "配角"], width=10)
        self.new_char_type.pack(side=tk.LEFT, padx=5)
        self.new_char_type.set("主角")
        row2 = tk.Frame(form_frame)
        row2.pack(fill=tk.BOTH, expand=True, pady=5)
        tk.Label(row2, text="角色描述", font=('微软雅黑', 10), width=8).pack(side=tk.LEFT, anchor='n', padx=5)
        self.new_char_desc = scrolledtext.ScrolledText(row2, height=5, font=('微软雅黑', 10))
        self.new_char_desc.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=5)
        btn_row = tk.Frame(form_frame)
        btn_row.pack(pady=5)
        tk.Button(btn_row, text="增加角色到角色库", font=('微软雅黑', 10),
                  bg='#2ecc71', fg='white', padx=15, pady=4,
                  command=self.add_character_from_form).pack()

        list_frame = ttk.LabelFrame(page, text="角色列表", padding=10)
        list_frame.pack(fill=tk.BOTH, expand=True, padx=20, pady=10)
        columns = ("角色名称", "主配角", "角色描述")
        self.char_tree = ttk.Treeview(list_frame, columns=columns, show="headings", height=15)
        for col in columns:
            self.char_tree.heading(col, text=col)
            if col == "角色名称":
                self.char_tree.column(col, width=120)
            elif col == "主配角":
                self.char_tree.column(col, width=80)
            else:
                self.char_tree.column(col, width=300)
        self.char_tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scrollbar = ttk.Scrollbar(list_frame, orient=tk.VERTICAL, command=self.char_tree.yview)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        self.char_tree.configure(yscrollcommand=scrollbar.set)
        self.char_menu = tk.Menu(self.root, tearoff=0)
        self.char_menu.add_command(label="删除角色", command=self.delete_selected_character)
        self.char_tree.bind("<Button-3>", self.show_char_context_menu)
        self.refresh_character_list()
        return page

    def add_character_from_form(self):
        name = self.new_char_name.get().strip()
        if not name:
            messagebox.showwarning("提示", "请输入角色名称")
            return
        char_type = self.new_char_type.get()
        desc = self.new_char_desc.get(1.0, tk.END).strip()
        if not desc:
            messagebox.showwarning("提示", "请输入角色描述")
            return
        self.char_library.add_character(name, char_type, desc)
        self.new_char_name.delete(0, tk.END)
        self.new_char_desc.delete(1.0, tk.END)
        self.new_char_type.set("主角")
        self.refresh_character_list()
        messagebox.showinfo("成功", f"角色「{name}」已添加到角色库")

    def refresh_character_list(self):
        for item in self.char_tree.get_children():
            self.char_tree.delete(item)
        characters = self.char_library.get_all()
        self.char_count_label.config(text=f"已创建角色：{len(characters)}")
        for idx, ch in enumerate(characters):
            desc = ch.get('description', '')
            desc_short = desc[:100] + "..." if len(desc) > 100 else desc
            self.char_tree.insert("", tk.END, values=(
                ch['name'],
                ch.get('type', '主角'),
                desc_short
            ), iid=str(idx))

    def delete_selected_character(self):
        selected = self.char_tree.selection()
        if not selected:
            return
        idx = int(selected[0])
        name = self.char_library.get_all()[idx]['name']
        if messagebox.askyesno("确认删除", f"确定要删除角色「{name}」吗？"):
            self.char_library.delete_character(idx)
            self.refresh_character_list()

    def show_char_context_menu(self, event):
        item = self.char_tree.identify_row(event.y)
        if item:
            self.char_tree.selection_set(item)
            self.char_menu.post(event.x_root, event.y_root)

    def send_characters_to_creation(self):
        characters = self.char_library.get_all()
        if not characters:
            messagebox.showwarning("提示", "当前没有角色，请先创建角色")
            return
        formatted = self.char_library.get_formatted_text()
        self.advanced_data['characters'] = formatted
        messagebox.showinfo("成功", f"已将 {len(characters)} 个角色信息发送到创作中枢的人物关系设定中。")

    def create_writing_engine_page(self):
        page = tk.Frame(self.right_area, bg='#f0f2f5')
        header_frame = tk.Frame(page, bg='#f0f2f5')
        header_frame.pack(fill=tk.X, padx=20, pady=10)
        self.genre_count_label = tk.Label(header_frame, text=f"当前题材基底数：{self.genre_manager.count_all_nodes()}",
                                          font=('微软雅黑', 12, 'bold'), bg='#f0f2f5', fg='#2c3e50')
        self.genre_count_label.pack(side=tk.LEFT)
        main_frame = tk.Frame(page, bg='#f0f2f5')
        main_frame.pack(fill=tk.BOTH, expand=True, padx=20, pady=10)
        left_tree_frame = ttk.LabelFrame(main_frame, text="题材树结构", padding=5)
        left_tree_frame.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=(0,10))
        self.genre_tree = ttk.Treeview(left_tree_frame, selectmode='browse')
        self.genre_tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        tree_scroll = ttk.Scrollbar(left_tree_frame, orient=tk.VERTICAL, command=self.genre_tree.yview)
        tree_scroll.pack(side=tk.RIGHT, fill=tk.Y)
        self.genre_tree.configure(yscrollcommand=tree_scroll.set)
        right_frame = ttk.LabelFrame(main_frame, text="题材说明与操作", padding=10)
        right_frame.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True, padx=(10,0))
        tk.Label(right_frame, text="题材说明：", font=('微软雅黑', 10, 'bold')).pack(anchor='w', pady=(0,5))
        self.genre_desc_text = scrolledtext.ScrolledText(right_frame, wrap=tk.WORD, height=8, font=('微软雅黑', 10))
        self.genre_desc_text.pack(fill=tk.BOTH, expand=True, pady=5)
        btn_frame = tk.Frame(right_frame)
        btn_frame.pack(fill=tk.X, pady=10)
        ttk.Button(btn_frame, text="新增子类", command=self.add_sub_genre).pack(side=tk.LEFT, padx=5)
        ttk.Button(btn_frame, text="新增根类", command=self.add_root_genre).pack(side=tk.LEFT, padx=5)
        ttk.Button(btn_frame, text="编辑", command=self.edit_genre).pack(side=tk.LEFT, padx=5)
        ttk.Button(btn_frame, text="删除", command=self.delete_genre).pack(side=tk.LEFT, padx=5)
        ttk.Button(btn_frame, text="保存说明", command=self.save_genre_description).pack(side=tk.LEFT, padx=5)
        self.genre_tree.bind("<<TreeviewSelect>>", self.on_genre_select)
        self.refresh_genre_tree()
        return page

    def refresh_genre_tree(self):
        for item in self.genre_tree.get_children():
            self.genre_tree.delete(item)
        def add_nodes(parent, node_list):
            for node in node_list:
                if isinstance(node, dict):
                    node_id = self.genre_tree.insert(parent, 'end', text=node.get('name', '未知'), values=(node.get('description', ''),))
                    add_nodes(node_id, node.get('children', []))
        add_nodes("", self.genre_manager.genres)
        self.genre_count_label.config(text=f"当前题材基底数：{self.genre_manager.count_all_nodes()}")

    def on_genre_select(self, event):
        selected = self.genre_tree.selection()
        if not selected:
            return
        path = self._get_selected_path(selected[0])
        desc = self.genre_manager.get_node_description(path)
        self.genre_desc_text.delete(1.0, tk.END)
        self.genre_desc_text.insert(tk.END, desc)

    def _get_selected_path(self, iid):
        path = []
        node = iid
        while node:
            text = self.genre_tree.item(node, 'text')
            path.insert(0, text)
            node = self.genre_tree.parent(node)
        return path

    def add_sub_genre(self):
        selected = self.genre_tree.selection()
        parent_path = self._get_selected_path(selected[0]) if selected else []
        dialog = tk.Toplevel(self.root)
        dialog.title("新增子类题材")
        dialog.geometry("400x300")
        dialog.transient(self.root)
        dialog.grab_set()
        tk.Label(dialog, text="题材名称：").pack(pady=(10,0))
        name_entry = tk.Entry(dialog, width=30)
        name_entry.pack(pady=5)
        tk.Label(dialog, text="题材说明：").pack(pady=(10,0))
        desc_text = scrolledtext.ScrolledText(dialog, height=8, width=40)
        desc_text.pack(pady=5, fill=tk.BOTH, expand=True)
        def do_add():
            name = name_entry.get().strip()
            desc = desc_text.get(1.0, tk.END).strip()
            if not name:
                messagebox.showwarning("提示", "题材名称不能为空")
                return
            success, msg = self.genre_manager.add_node(parent_path, name, desc)
            if success:
                self.refresh_genre_tree()
                self.refresh_genre_combobox()
                dialog.destroy()
                messagebox.showinfo("成功", msg)
            else:
                messagebox.showerror("错误", msg)
        tk.Button(dialog, text="确定", command=do_add).pack(pady=10)

    def add_root_genre(self):
        dialog = tk.Toplevel(self.root)
        dialog.title("新增根类题材")
        dialog.geometry("400x300")
        dialog.transient(self.root)
        dialog.grab_set()
        tk.Label(dialog, text="题材名称：").pack(pady=(10,0))
        name_entry = tk.Entry(dialog, width=30)
        name_entry.pack(pady=5)
        tk.Label(dialog, text="题材说明：").pack(pady=(10,0))
        desc_text = scrolledtext.ScrolledText(dialog, height=8, width=40)
        desc_text.pack(pady=5, fill=tk.BOTH, expand=True)
        def do_add():
            name = name_entry.get().strip()
            desc = desc_text.get(1.0, tk.END).strip()
            if not name:
                messagebox.showwarning("提示", "题材名称不能为空")
                return
            success, msg = self.genre_manager.add_node([], name, desc)
            if success:
                self.refresh_genre_tree()
                self.refresh_genre_combobox()
                dialog.destroy()
                messagebox.showinfo("成功", msg)
            else:
                messagebox.showerror("错误", msg)
        tk.Button(dialog, text="确定", command=do_add).pack(pady=10)

    def edit_genre(self):
        selected = self.genre_tree.selection()
        if not selected:
            messagebox.showwarning("提示", "请先选择一个题材")
            return
        path = self._get_selected_path(selected[0])
        node, _ = self.genre_manager.find_node_by_path(path)
        if not node:
            messagebox.showerror("错误", "节点不存在")
            return
        dialog = tk.Toplevel(self.root)
        dialog.title("编辑题材")
        dialog.geometry("400x300")
        dialog.transient(self.root)
        dialog.grab_set()
        tk.Label(dialog, text="题材名称：").pack(pady=(10,0))
        name_entry = tk.Entry(dialog, width=30)
        name_entry.insert(0, node.get('name', ''))
        name_entry.pack(pady=5)
        tk.Label(dialog, text="题材说明：").pack(pady=(10,0))
        desc_text = scrolledtext.ScrolledText(dialog, height=8, width=40)
        desc_text.insert(tk.END, node.get('description', ''))
        desc_text.pack(pady=5, fill=tk.BOTH, expand=True)
        def do_edit():
            new_name = name_entry.get().strip()
            new_desc = desc_text.get(1.0, tk.END).strip()
            if not new_name:
                messagebox.showwarning("提示", "题材名称不能为空")
                return
            success, msg = self.genre_manager.update_node(path, new_name, new_desc)
            if success:
                self.refresh_genre_tree()
                self.refresh_genre_combobox()
                dialog.destroy()
                messagebox.showinfo("成功", msg)
            else:
                messagebox.showerror("错误", msg)
        tk.Button(dialog, text="确定", command=do_edit).pack(pady=10)

    def delete_genre(self):
        selected = self.genre_tree.selection()
        if not selected:
            messagebox.showwarning("提示", "请先选择一个题材")
            return
        path = self._get_selected_path(selected[0])
        node, _ = self.genre_manager.find_node_by_path(path)
        if not node:
            return
        if messagebox.askyesno("确认删除", f"确定要删除题材「{node.get('name')}」及其所有子题材吗？"):
            success, msg = self.genre_manager.delete_node(path)
            if success:
                self.refresh_genre_tree()
                self.refresh_genre_combobox()
                self.genre_desc_text.delete(1.0, tk.END)
                messagebox.showinfo("成功", msg)
            else:
                messagebox.showerror("错误", msg)

    def save_genre_description(self):
        selected = self.genre_tree.selection()
        if not selected:
            messagebox.showwarning("提示", "请先选择一个题材")
            return
        path = self._get_selected_path(selected[0])
        node, _ = self.genre_manager.find_node_by_path(path)
        if not node:
            return
        new_desc = self.genre_desc_text.get(1.0, tk.END).strip()
        success, msg = self.genre_manager.update_node(path, node.get('name'), new_desc)
        if success:
            self.refresh_genre_tree()
            messagebox.showinfo("成功", "说明已保存")
        else:
            messagebox.showerror("错误", msg)

    # ==================== 系统设置页面（增强版，增加测试日志） ====================
    def on_model_select(self):
        model_id = self.current_model.get()
        if model_id in self.MODEL_PRESETS:
            display_name, default_base_url, default_model = self.MODEL_PRESETS[model_id]
            self.base_url.set(default_base_url)
            self.model_name.set(default_model)
            self.log(f"已切换到 {display_name} 模型，请确认 API Key 是否正确")
        else:
            self.log(f"未知模型: {model_id}")

    def create_system_settings_page(self):
        page = tk.Frame(self.right_area, bg='#f0f2f5')
        tk.Label(page, text="系统设置", font=('微软雅黑', 18, 'bold'),
                 bg='#f0f2f5', fg='#2c3e50').pack(anchor='w', padx=20, pady=20)

        # 模型选择区域
        model_frame = ttk.LabelFrame(page, text="模型选择 (单选)", padding=10)
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

        # LLM 配置区域
        config_frame = ttk.LabelFrame(page, text="API 配置", padding=10)
        config_frame.pack(fill=tk.X, padx=20, pady=10)

        row = 0
        ttk.Label(config_frame, text="API Key:").grid(row=row, column=0, sticky='w', padx=5, pady=5)
        self.api_key_entry = ttk.Entry(config_frame, textvariable=self.api_key, width=50, show="*")
        self.api_key_entry.grid(row=row, column=1, padx=5, pady=5, sticky='w')
        row += 1

        ttk.Label(config_frame, text="Base URL:").grid(row=row, column=0, sticky='w', padx=5, pady=5)
        self.base_url_entry = ttk.Entry(config_frame, textvariable=self.base_url, width=50)
        self.base_url_entry.grid(row=row, column=1, padx=5, pady=5, sticky='w')
        row += 1

        ttk.Label(config_frame, text="模型名称:").grid(row=row, column=0, sticky='w', padx=5, pady=5)
        self.model_name_entry = ttk.Entry(config_frame, textvariable=self.model_name, width=30)
        self.model_name_entry.grid(row=row, column=1, padx=5, pady=5, sticky='w')
        row += 1

        ttk.Label(config_frame, text="Temperature:").grid(row=row, column=0, sticky='w', padx=5, pady=5)
        scale = ttk.Scale(config_frame, from_=0.0, to=1.0, variable=self.temp, orient=tk.HORIZONTAL, length=200)
        scale.grid(row=row, column=1, sticky='w', padx=5)
        ttk.Label(config_frame, textvariable=self.temp).grid(row=row, column=2, padx=5)
        row += 1

        btn_frame = tk.Frame(config_frame)
        btn_frame.grid(row=row, column=0, columnspan=3, pady=10)
        ttk.Button(btn_frame, text="测试配置", command=self.test_api).pack(side=tk.LEFT, padx=5)
        ttk.Button(btn_frame, text="保存配置", command=self.save_llm_config).pack(side=tk.LEFT, padx=5)

        # 代理设置区域
        proxy_frame = ttk.LabelFrame(page, text="代理设置", padding=10)
        proxy_frame.pack(fill=tk.X, padx=20, pady=10)
        ttk.Label(proxy_frame, text="暂未实现，后续可添加HTTP代理支持").pack()

        # ========== 新增：测试日志文本框 ==========
        log_frame = ttk.LabelFrame(page, text="测试日志", padding=10)
        log_frame.pack(fill=tk.BOTH, expand=True, padx=20, pady=10)
        self.test_log_text = scrolledtext.ScrolledText(log_frame, wrap=tk.WORD, height=8, font=('微软雅黑', 9))
        self.test_log_text.pack(fill=tk.BOTH, expand=True)
        # 清空按钮
        clear_btn = ttk.Button(log_frame, text="清空日志", command=lambda: self.test_log_text.delete(1.0, tk.END))
        clear_btn.pack(pady=5)
        # =====================================

        return page

    def test_api(self):
        if not self.api_key.get().strip():
            messagebox.showwarning("提示", "请填写API Key")
            return
        self.log("正在测试API连接...")
        # 在专用日志区添加开始信息
        if hasattr(self, 'test_log_text'):
            timestamp = datetime.now().strftime('%H:%M:%S')
            self.test_log_text.insert(tk.END, f"[{timestamp}] 开始测试 API...\n")
            self.test_log_text.see(tk.END)

        def test():
            llm = self.get_llm()
            # 直接调用chat获取详细错误信息
            url = f"{self.base_url.get().rstrip('/')}/chat/completions"
            headers = {
                "Authorization": f"Bearer {self.api_key.get().strip()}",
                "Content-Type": "application/json"
            }
            data = {
                "model": self.model_name.get().strip(),
                "messages": [{"role": "user", "content": "请回复：OK"}],
                "temperature": self.temp.get(),
                "max_tokens": 10
            }
            try:
                resp = requests.post(url, headers=headers, json=data, timeout=30)
                if resp.status_code == 200:
                    result = resp.json()["choices"][0]["message"]["content"]
                    ok = "OK" in result
                    msg = f"[{datetime.now().strftime('%H:%M:%S')}] " + ("✅ API测试成功！" if ok else f"❌ API返回内容不符合预期: {result}")
                else:
                    msg = f"[{datetime.now().strftime('%H:%M:%S')}] ❌ API测试失败，状态码: {resp.status_code}\n响应内容: {resp.text}"
            except Exception as e:
                msg = f"[{datetime.now().strftime('%H:%M:%S')}] ❌ 请求异常: {str(e)}"
            self.log(msg)
            if hasattr(self, 'test_log_text'):
                self.test_log_text.insert(tk.END, msg + "\n")
                self.test_log_text.see(tk.END)
        threading.Thread(target=test, daemon=True).start()

    # =================================================

    def create_creation_center(self):
        page = tk.Frame(self.right_area, bg='#f0f2f5')
        left_frame = tk.Frame(page, bg='#f0f2f5')
        left_frame.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=10, pady=10)
        info_frame = ttk.LabelFrame(left_frame, text="小说基本信息", padding=10)
        info_frame.pack(fill=tk.X, pady=5)
        # 故事梗概
        ttk.Label(info_frame, text="故事梗概（一句话或一段话）:").grid(row=0, column=0, sticky='nw', padx=5, pady=2)
        self.synopsis_text = scrolledtext.ScrolledText(info_frame, wrap=tk.WORD, height=4, width=40)
        self.synopsis_text.grid(row=0, column=1, padx=5, pady=2, sticky='ew')
        self.synopsis_text.insert(tk.END, self.advanced_data.get('synopsis', ''))
        def on_synopsis_change(event=None):
            self.advanced_data['synopsis'] = self.synopsis_text.get(1.0, tk.END).strip()
        self.synopsis_text.bind('<KeyRelease>', on_synopsis_change)

        ttk.Label(info_frame, text="题材:").grid(row=1, column=0, sticky='w', padx=5, pady=2)
        self.genre_combo = ttk.Combobox(info_frame, textvariable=self.genre, width=27)
        self.genre_combo.grid(row=1, column=1, padx=5, pady=2)
        ttk.Label(info_frame, text="章节数:").grid(row=2, column=0, sticky='w', padx=5, pady=2)
        tk.Spinbox(info_frame, from_=1, to=200, textvariable=self.chapter_num, width=10).grid(row=2, column=1, sticky='w', padx=5)
        ttk.Label(info_frame, text="每章字数:").grid(row=3, column=0, sticky='w', padx=5, pady=2)
        tk.Spinbox(info_frame, from_=500, to=20000, increment=500, textvariable=self.words_per_chapter, width=10).grid(row=3, column=1, sticky='w', padx=5)
        ttk.Label(info_frame, text="保存路径:").grid(row=4, column=0, sticky='w', padx=5, pady=2)
        path_frame = ttk.Frame(info_frame)
        path_frame.grid(row=4, column=1, sticky='ew', padx=5)
        ttk.Entry(path_frame, textvariable=self.save_path, width=20).pack(side=tk.LEFT)
        ttk.Button(path_frame, text="浏览", command=self.browse_save_path).pack(side=tk.LEFT, padx=2)
        ttk.Button(info_frame, text="✍️ 高级剧情设定（可选）", command=self.open_advanced_plot).grid(row=5, column=0, columnspan=2, pady=10)

        step_frame = ttk.LabelFrame(left_frame, text="生成步骤", padding=10)
        step_frame.pack(fill=tk.X, pady=5)
        ttk.Button(step_frame, text="Step1: 生成整体架构", command=self.gen_architecture).pack(fill=tk.X, pady=2)
        ttk.Button(step_frame, text="Step2: 生成章节蓝图", command=self.gen_blueprints).pack(fill=tk.X, pady=2)
        ttk.Button(step_frame, text="Step3: 生成全部草稿", command=self.gen_all_drafts).pack(fill=tk.X, pady=2)
        ttk.Button(step_frame, text="📄 批量生成草稿（指定范围）", command=self.batch_gen_drafts).pack(fill=tk.X, pady=2)
        ttk.Button(step_frame, text="Step4: 定稿当前章节", command=self.finalize_chapter).pack(fill=tk.X, pady=2)

        chapter_frame = ttk.LabelFrame(left_frame, text="章节管理", padding=10)
        chapter_frame.pack(fill=tk.X, pady=5)
        ttk.Label(chapter_frame, text="当前章节号:").pack(side=tk.LEFT, padx=5)
        self.ch_spin = tk.Spinbox(chapter_frame, from_=1, to=200, width=6)
        self.ch_spin.pack(side=tk.LEFT, padx=5)
        ttk.Button(chapter_frame, text="设定", command=self.set_current_chapter).pack(side=tk.LEFT, padx=5)

        right_frame = tk.Frame(page, bg='#f0f2f5')
        right_frame.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True, padx=10, pady=10)
        notebook = ttk.Notebook(right_frame)
        notebook.pack(fill=tk.BOTH, expand=True)
        self.text_arch = scrolledtext.ScrolledText(notebook, wrap=tk.WORD, font=('微软雅黑', 10))
        notebook.add(self.text_arch, text="小说架构")
        self.text_blueprint = scrolledtext.ScrolledText(notebook, wrap=tk.WORD)
        notebook.add(self.text_blueprint, text="章节蓝图")
        self.text_draft = scrolledtext.ScrolledText(notebook, wrap=tk.WORD)
        notebook.add(self.text_draft, text="草稿内容")
        self.log_area = scrolledtext.ScrolledText(notebook, wrap=tk.WORD, state=tk.DISABLED)
        notebook.add(self.log_area, text="日志")
        return page

    def refresh_genre_combobox(self):
        values = self.genre_manager.get_all_genre_names_for_combo()
        if hasattr(self, 'genre_combo'):
            self.genre_combo['values'] = values
            if self.genre.get() not in values and values:
                self.genre.set(values[0])

    def show_home(self):
        self.raise_page(self.page_home)
    def show_creation_center(self):
        self.raise_page(self.page_creation)
        self.refresh_genre_combobox()
    def show_assets(self):
        self.raise_page(self.page_assets)
    def show_knowledge(self):
        self.raise_page(self.page_knowledge)
    def show_writing_engine(self):
        self.raise_page(self.page_writing_engine)
        self.refresh_genre_tree()
    def show_character_library(self):
        self.raise_page(self.page_character_library)
    def show_system_settings(self):
        self.raise_page(self.page_system)
    def raise_page(self, page):
        for child in self.right_area.winfo_children():
            child.pack_forget()
        page.pack(fill=tk.BOTH, expand=True)

    def open_auto_director(self):
        win = tk.Toplevel(self.root)
        win.title("AI自动导演开书")
        win.geometry("600x400")
        win.transient(self.root)
        tk.Label(win, text="AI自动导演开书功能开发中...", font=('微软雅黑', 14)).pack(expand=True)
        tk.Label(win, text="后续将实现智能引导创作流程", font=('微软雅黑', 10), fg='gray').pack()

    def open_manual_create(self):
        win = tk.Toplevel(self.root)
        win.title("手动创建小说")
        win.geometry("600x400")
        win.transient(self.root)
        tk.Label(win, text="手动创建小说功能开发中...", font=('微软雅黑', 14)).pack(expand=True)
        tk.Label(win, text="后续将提供完整的小说信息录入界面", font=('微软雅黑', 10), fg='gray').pack()

    def log(self, msg):
        if hasattr(self, 'log_area'):
            self.log_area.config(state=tk.NORMAL)
            self.log_area.insert(tk.END, msg + "\n")
            self.log_area.see(tk.END)
            self.log_area.config(state=tk.DISABLED)
            self.root.update()

    def browse_save_path(self):
        p = filedialog.askdirectory()
        if p:
            self.save_path.set(p)

    def set_current_chapter(self):
        try:
            self.current_chapter = int(self.ch_spin.get())
            self.log(f"当前章节设为 {self.current_chapter}")
        except:
            pass

    def open_advanced_plot(self):
        self.advanced_data['synopsis'] = self.synopsis_text.get(1.0, tk.END).strip()
        win = AdvancedPlotWindow(self.root, self.advanced_data)
        self.root.wait_window(win.window)
        self.advanced_data = win.get_data()
        self.synopsis_text.delete(1.0, tk.END)
        self.synopsis_text.insert(tk.END, self.advanced_data.get('synopsis', ''))
        if self.advanced_data['synopsis']:
            self.log("高级剧情设定已保存")
        else:
            self.log("高级剧情设定已清空")

    def get_llm(self):
        return SimpleLLM(
            api_key=self.api_key.get().strip(),
            base_url=self.base_url.get().strip(),
            model=self.model_name.get().strip(),
            temperature=self.temp.get(),
            max_tokens=8192
        )

    def build_advanced_prompt(self):
        parts = []
        if self.advanced_data['synopsis']:
            parts.append(f"【故事梗概】\n{self.advanced_data['synopsis']}")
        if self.advanced_data['plot_detail']:
            parts.append(f"【详细剧情】\n{self.advanced_data['plot_detail']}")
        if self.advanced_data['characters']:
            parts.append(f"【人物关系】\n{self.advanced_data['characters']}")
        if self.advanced_data['extra_prompt']:
            parts.append(f"【额外写作提示】\n{self.advanced_data['extra_prompt']}")
        if parts:
            return "以下是用户提供的额外创作指导，请务必遵循：\n" + "\n\n".join(parts) + "\n\n"
        return ""

    def gen_architecture(self):
        topic = self.topic.get().strip()
        genre = self.genre.get().strip()
        if not genre:
            messagebox.showwarning("提示", "请选择题材")
            return
        if not self.api_key.get().strip():
            messagebox.showwarning("提示", "请先在「系统设置」中配置API Key并测试")
            return
        self.log("开始生成小说整体架构...")
        self.text_arch.delete(1.0, tk.END)
        self.text_arch.insert(tk.END, "生成中，请稍候...\n")
        def task():
            llm = self.get_llm()
            advanced = self.build_advanced_prompt()
            prompt = f"""你是一位专业的小说策划师。请根据以下信息生成小说整体架构：

主题：{topic}
类型：{genre}
章节数：{self.chapter_num.get()}
每章字数：{self.words_per_chapter.get()}

{advanced}

请严格按照以下要求输出：

1. **小说简介（200-400字）** —— 要求当作广告来写，不要写成大纲提要。必须包含三层关系：
   - 第一层：建立处境 —— 主角是谁？他/她处于什么处境？（例如身份、环境、初始状态）
   - 第二层：抛出冲突 —— 什么矛盾、什么不公、什么机遇让处境开始动摇？
   - 第三层：不给答案 —— 让读者产生好奇，但不要揭示结局或解决方法。结尾留白，让读者自己去寻找答案。
   
2. **主要人物设定**（主角 + 2个配角，每人50字左右）

3. **世界观**（100字左右）

4. **主线剧情概要**（300字左右）

用清晰的标题分隔各部分。"""
            result = llm.chat(prompt)
            self.text_arch.delete(1.0, tk.END)
            self.text_arch.insert(tk.END, result)
            self.architecture = result
            self.log("架构生成完成，可以继续Step2")
        threading.Thread(target=task, daemon=True).start()

    def gen_blueprints(self):
        if not self.architecture:
            messagebox.showwarning("提示", "请先执行Step1生成架构")
            return
        total = self.chapter_num.get()
        self.log(f"开始为{total}个章节生成蓝图...")
        self.text_blueprint.delete(1.0, tk.END)
        self.chapter_blueprints.clear()
        def task():
            llm = self.get_llm()
            for ch in range(1, total+1):
                self.log(f"正在生成第{ch}章蓝图...")
                prompt = f"""你是小说家。根据以下整体架构，为第{ch}章（共{total}章）生成详细大纲。
整体架构摘要：{self.architecture[:1000]}
主题：{self.topic.get()}，类型：{self.genre.get()}
请输出：
- 本章核心冲突
- 主要场景（3-5个）
- 本章结尾悬念
- 预计字数：{self.words_per_chapter.get()}字"""
                bp = llm.chat(prompt)
                self.chapter_blueprints[ch] = bp
                self.text_blueprint.insert(tk.END, f"\n========== 第{ch}章 蓝图 ==========\n{bp}\n\n")
                self.text_blueprint.see(tk.END)
            self.log("所有章节蓝图生成完成，可以执行Step3或批量生成草稿")
        threading.Thread(target=task, daemon=True).start()

    def gen_all_drafts(self):
        if not self.chapter_blueprints:
            messagebox.showwarning("提示", "请先执行Step2生成蓝图")
            return
        self.gen_drafts_range(1, self.chapter_num.get())

    def gen_drafts_range(self, start, end):
        if not self.chapter_blueprints:
            messagebox.showwarning("提示", "请先执行Step2生成蓝图")
            return
        total = self.chapter_num.get()
        start = max(1, min(start, total))
        end = max(start, min(end, total))
        self.log(f"开始生成第{start}章到第{end}章的草稿...")
        def task():
            llm = self.get_llm()
            for ch in range(start, end+1):
                bp = self.chapter_blueprints.get(ch, "")
                if not bp:
                    self.log(f"第{ch}章蓝图缺失，跳过")
                    continue
                if ch in self.chapter_drafts:
                    self.log(f"第{ch}章草稿已存在，跳过")
                    continue
                self.log(f"正在撰写第{ch}章草稿...")
                prompt = f"""你是一位小说家，请根据以下蓝图扩写成完整的章节内容（约{self.words_per_chapter.get()}字）。
蓝图：
{bp}
要求：语言流畅，描写生动，直接输出章节正文。"""
                draft = llm.chat(prompt)
                self.chapter_drafts[ch] = draft
                self.text_draft.insert(tk.END, f"\n========== 第{ch}章 草稿 ==========\n{draft}\n\n")
                self.text_draft.see(tk.END)
            self.log(f"第{start}章到第{end}章草稿生成完成")
        threading.Thread(target=task, daemon=True).start()

    def batch_gen_drafts(self):
        if not self.chapter_blueprints:
            messagebox.showwarning("提示", "请先执行Step2生成章节蓝图")
            return
        total = self.chapter_num.get()
        start_str = simpledialog.askstring("批量生成草稿", f"请输入起始章节号 (1-{total}):", initialvalue="1")
        if not start_str:
            return
        try:
            start = int(start_str)
        except:
            messagebox.showerror("错误", "起始章节号必须是数字")
            return
        end_str = simpledialog.askstring("批量生成草稿", f"请输入结束章节号 (1-{total}):", initialvalue=str(total))
        if not end_str:
            return
        try:
            end = int(end_str)
        except:
            messagebox.showerror("错误", "结束章节号必须是数字")
            return
        if start < 1 or end > total or start > end:
            messagebox.showerror("错误", f"章节号范围无效，应在1-{total}之间且起始<=结束")
            return
        self.gen_drafts_range(start, end)

    def generate_chapter_title(self, ch, draft, target_length):
        llm = self.get_llm()
        prompt = f"""你是一位资深小说编辑。请根据以下第{ch}章的草稿内容，生成一个{target_length}字左右的章节名（标题）。

要求：
- 标题必须是本章内容的**综合总结**，高度概括本章的核心事件、矛盾冲突或转折点。
- 风格与小说题材一致（当前题材：{self.genre.get()}）
- 语言精炼，有吸引力，像传统章回体或现代网文的章节名。
- 直接输出标题，不要加任何额外说明、引号或标点符号。
- 字数控制在{target_length}字左右即可，不必完全精确。

草稿内容（摘要）：
{draft[:1500]}

请输出标题（{target_length}字左右）："""
        title = llm.chat(prompt)
        title = title.strip().strip('"').strip('“').strip('”').replace('\n', '')
        return title

    def finalize_chapter(self):
        ch = int(self.ch_spin.get()) if self.ch_spin.get().isdigit() else 1
        draft = self.chapter_drafts.get(ch)
        if not draft:
            messagebox.showwarning("提示", f"第{ch}章草稿不存在，请先生成草稿")
            return

        need_title = messagebox.askyesno("章节定稿", f"是否为第{ch}章生成章节名？\n（章节名将作为文件名的一部分）")
        title_text = ""
        if need_title:
            length = simpledialog.askinteger("章节名字数", "请输入章节名字数（2~15字）：", 
                                             initialvalue=6, minvalue=2, maxvalue=15)
            if length is None:
                return
            self.log(f"正在为第{ch}章生成{length}字左右的章节名...")
            title_text = self.generate_chapter_title(ch, draft, length)
            if not title_text:
                title_text = f"第{ch}章"

        path = self.save_path.get()
        os.makedirs(path, exist_ok=True)
        if need_title and title_text:
            safe_title = "".join(c for c in title_text if c not in r'\/:*?"<>|')
            filename = f"第{ch}章_{safe_title}.txt"
            file_content = f"第{ch}章 {safe_title}\n\n{draft}"
        else:
            filename = f"第{ch}章.txt"
            file_content = f"第{ch}章\n\n{draft}"

        filepath = os.path.join(path, filename)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(file_content)
        self.log(f"第{ch}章已保存至：{filepath}")
        messagebox.showinfo("成功", f"第{ch}章已保存\n" + (f"章节名：{safe_title}" if need_title and title_text else ""))

        if ch < self.chapter_num.get():
            self.current_chapter = ch + 1
            self.ch_spin.delete(0, tk.END)
            self.ch_spin.insert(0, str(self.current_chapter))
            self.log(f"当前章节号已自动切换到第{self.current_chapter}章")

    def run(self):
        self.root.mainloop()


if __name__ == "__main__":
    app = NovelWorkbench()
    app.run()