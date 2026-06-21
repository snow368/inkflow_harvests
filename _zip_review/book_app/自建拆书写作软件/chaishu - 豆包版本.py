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
from datetime import datetime
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

# ==================== 增强版 LLM 适配器 ====================
class SimpleLLM:
    def __init__(self, api_key, base_url, model, temperature, max_tokens):
        self.api_key = api_key
        self.base_url = base_url.rstrip('/')
        self.model = model
        self.temperature = temperature
        self.max_tokens = max_tokens
        self.session = self._create_retry_session()

    def _create_retry_session(self, retries=2, backoff_factor=1):
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
        print(f"[LLM] 请求URL: {url}")
        print(f"[LLM] 模型: {self.model}, 输入长度: {len(prompt)} 字符")
        last_exception = None
        for attempt in range(1, 3):
            try:
                resp = self.session.post(url, headers=headers, json=data, timeout=(10, 180))
                print(f"[LLM] 响应状态码: {resp.status_code}")
                if resp.status_code == 200:
                    content = resp.json()["choices"][0]["message"]["content"]
                    print(f"[LLM] 成功获取内容，长度: {len(content)}")
                    return content
                else:
                    error_msg = f"HTTP {resp.status_code}: {resp.text[:300]}"
                    print(f"[LLM] 错误: {error_msg}")
                    last_exception = Exception(error_msg)
                    if attempt == 2:
                        return f"错误：{error_msg}"
                    time.sleep(1 * attempt)
            except requests.exceptions.Timeout:
                print(f"[LLM] 超时 (尝试 {attempt})")
                last_exception = Exception("请求超时")
                if attempt == 2:
                    return f"请求异常：超时"
                time.sleep(1 * attempt)
            except requests.exceptions.ConnectionError as e:
                print(f"[LLM] 连接错误: {e}")
                last_exception = e
                if attempt == 2:
                    return f"请求异常：连接错误 - {str(e)}"
                time.sleep(1 * attempt)
            except Exception as e:
                print(f"[LLM] 未知异常: {e}")
                last_exception = e
                if attempt == 2:
                    return f"请求异常：{str(e)}"
                time.sleep(1 * attempt)
        return f"请求异常：{str(last_exception)}"


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


# ==================== 主应用 ====================
class SimpleWorkbench:
    MODEL_PRESETS = {
        "deepseek": ("DeepSeek", "https://api.deepseek.com/v1", "deepseek-chat"),
        "doubao-lite": ("豆包-Seed-2.0-lite", "https://ark.cn-beijing.volces.com/api/v3", "doubao-seed-2-0-lite-260215"),
        "doubao-pro": ("豆包-Seed-2.0-pro", "https://ark.cn-beijing.volces.com/api/v3", "doubao-seed-2-0-pro-260215"),
        "siliconflow": ("SiliconFlow", "https://api.siliconflow.cn/v1", "deepseek-ai/DeepSeek-V2.5"),
        "openai": ("OpenAI", "https://api.openai.com/v1", "gpt-4o-mini"),
    }

    def __init__(self):
        self.root = tk.Tk()
        self.root.title("知识库 & 系统设置")
        self.root.geometry("1200x700")
        self.root.configure(bg='#f0f2f5')

        # LLM 配置变量
        self.api_key = tk.StringVar()
        self.base_url = tk.StringVar(value="https://api.deepseek.com/v1")
        self.model_name = tk.StringVar(value="deepseek-chat")
        self.temp = tk.DoubleVar(value=0.7)
        self.current_model = tk.StringVar(value="deepseek")

        # 知识库
        self.kb_manager = KnowledgeBaseManager()

        # 写书页面相关变量
        self.new_book_title = tk.StringVar()
        self.new_book_synopsis = tk.StringVar()
        self.save_path = tk.StringVar(value="./小说输出")
        self.chapter_num = tk.IntVar(value=5)
        self.words_per_chapter = tk.IntVar(value=3000)
        self.genre = tk.StringVar(value="")
        self.architecture = ""
        self.chapter_blueprints = {}
        self.chapter_drafts = {}
        self.current_chapter = 1

        # 加载配置
        self.load_llm_config()
        self.setup_ui()
        self.load_global_state()
        self.root.protocol("WM_DELETE_WINDOW", self.on_closing)

    # ---------- 全局状态持久化 ----------
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
            if hasattr(self, 'new_book_prompt_text') and 'new_book_prompt' in state:
                self.new_book_prompt_text.insert(tk.END, state['new_book_prompt'])
            self.new_book_title.set(state.get('new_book_title', ''))
            self.new_book_synopsis.set(state.get('new_book_synopsis', ''))
            self.save_path.set(state.get('save_path', './小说输出'))
            self.chapter_num.set(state.get('chapter_num', 5))
            self.words_per_chapter.set(state.get('words_per_chapter', 3000))
            self.genre.set(state.get('genre', ''))
            self.architecture = state.get('architecture', '')
            self.chapter_blueprints = {int(k): v for k, v in state.get('chapter_blueprints', {}).items()}
            self.chapter_drafts = {int(k): v for k, v in state.get('chapter_drafts', {}).items()}
            self.root.after(100, lambda: self.restore_write_page_texts(state))
            if hasattr(self, 'kb_search_var') and 'kb_search' in state:
                self.kb_search_var.set(state['kb_search'])
                self.refresh_kb_list()
        except Exception as e:
            print(f"加载全局状态失败：{e}")

    def restore_write_page_texts(self, state):
        if hasattr(self, 'text_arch') and 'arch_text' in state:
            self.text_arch.insert(tk.END, state['arch_text'])
        if hasattr(self, 'text_blueprint') and 'blueprint_text' in state:
            self.text_blueprint.insert(tk.END, state['blueprint_text'])
        if hasattr(self, 'text_draft') and 'draft_text' in state:
            self.text_draft.insert(tk.END, state['draft_text'])

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

    def on_closing(self):
        self.save_global_state()
        self.save_llm_config()
        self.root.destroy()

    # ---------- UI 搭建 ----------
    def setup_ui(self):
        left_nav = tk.Frame(self.root, bg='#2c3e50', width=200)
        left_nav.pack(side=tk.LEFT, fill=tk.Y)
        left_nav.pack_propagate(False)

        btn_style = {'font': ('微软雅黑', 11), 'bg': '#2c3e50', 'fg': 'white',
                     'activebackground': '#34495e', 'activeforeground': 'white',
                     'bd': 0, 'anchor': 'w', 'padx': 20, 'pady': 12, 'width': 18}

        title_label = tk.Label(left_nav, text="工作台", font=('微软雅黑', 16, 'bold'),
                               bg='#2c3e50', fg='#ecf0f1')
        title_label.pack(pady=(30, 20))

        home_btn = tk.Button(left_nav, text="🏠 首页", command=self.show_home, **btn_style)
        home_btn.pack(fill=tk.X, pady=2)
        kb_btn = tk.Button(left_nav, text="📚 知识库", command=self.show_knowledge, **btn_style)
        kb_btn.pack(fill=tk.X, pady=2)
        book_btn = tk.Button(left_nav, text="📖 拆书", command=self.show_book_analysis, **btn_style)
        book_btn.pack(fill=tk.X, pady=2)
        write_btn = tk.Button(left_nav, text="✍️ 写书", command=self.show_write_book, **btn_style)
        write_btn.pack(fill=tk.X, pady=2)

        spacer = tk.Frame(left_nav, bg='#2c3e50')
        spacer.pack(expand=True, fill=tk.BOTH)

        settings_btn = tk.Button(left_nav, text="⚙️ 系统设置", command=self.show_system_settings, **btn_style)
        settings_btn.pack(side=tk.BOTTOM, fill=tk.X, pady=2)

        self.right_area = tk.Frame(self.root, bg='#f0f2f5')
        self.right_area.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        self.page_home = self.create_home_page()
        self.page_knowledge = self.create_knowledge_page()
        self.page_system = self.create_system_settings_page()
        self.page_book_analysis = self.create_book_analysis_page()
        self.page_write_book = self.create_write_book_page()

        self.show_home()

    # ---------- 首页 ----------
    def create_home_page(self):
        page = tk.Frame(self.right_area, bg='#f0f2f5')
        center_frame = tk.Frame(page, bg='#f0f2f5')
        center_frame.pack(expand=True)
        colors = ['#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF', '#4B0082', '#9400D3']
        text = "欢迎使用本软件"
        for i, char in enumerate(text):
            label = tk.Label(center_frame, text=char, font=('微软雅黑', 48, 'bold'),
                             fg=colors[i % len(colors)], bg='#f0f2f5')
            label.pack(side=tk.LEFT)
        sub_label = tk.Label(center_frame, text="\n高效知识管理 · 智能API配置 · 深度拆书分析 · 辅助写书", font=('微软雅黑', 14),
                             fg='#7f8c8d', bg='#f0f2f5')
        sub_label.pack(side=tk.BOTTOM, pady=20)
        return page

    # ---------- 知识库页面 ----------
    def create_knowledge_page(self):
        page = tk.Frame(self.right_area, bg='#f0f2f5')
        upload_frame = ttk.LabelFrame(page, text="上传文档", padding=10)
        upload_frame.pack(fill=tk.X, padx=20, pady=10)
        self.kb_file_path = tk.StringVar()
        ttk.Label(upload_frame, text="选择文件:").grid(row=0, column=0, sticky='w', padx=5, pady=5)
        ttk.Entry(upload_frame, textvariable=self.kb_file_path, width=50).grid(row=0, column=1, padx=5, pady=5)
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
                self.kb_tree.column(col, width=300)
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
            self.refresh_book_doc_list()

    def show_kb_context_menu(self, event):
        item = self.kb_tree.identify_row(event.y)
        if item:
            self.kb_tree.selection_set(item)
            self.kb_menu.post(event.x_root, event.y_root)

    # ---------- 拆书页面 ----------
    def create_book_analysis_page(self):
        page = tk.Frame(self.right_area, bg='#f0f2f5')
        title_label = tk.Label(page, text="拆书分析", font=('微软雅黑', 18, 'bold'),
                               bg='#f0f2f5', fg='#2c3e50')
        title_label.pack(anchor='w', padx=20, pady=10)

        main_frame = tk.Frame(page, bg='#f0f2f5')
        main_frame.pack(fill=tk.BOTH, expand=True, padx=20, pady=10)

        left_frame = ttk.LabelFrame(main_frame, text="文档选择", padding=10)
        left_frame.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=(0,10))
        select_frame = tk.Frame(left_frame)
        select_frame.pack(fill=tk.X, pady=5)
        ttk.Label(select_frame, text="选择文档:").pack(side=tk.LEFT, padx=5)
        self.book_combobox = ttk.Combobox(select_frame, width=30, state="readonly")
        self.book_combobox.pack(side=tk.LEFT, padx=5)
        btn_frame = tk.Frame(left_frame)
        btn_frame.pack(fill=tk.X, pady=5)
        self.create_btn = ttk.Button(btn_frame, text="拆书分析并生成新书提示词", command=self.create_book_analysis)
        self.create_btn.pack(side=tk.LEFT, padx=5)
        self.analysis_hint = tk.Label(left_frame, text="请从下拉框选择文档，然后点击按钮",
                                      font=('微软雅黑', 10), fg='gray', bg='#f0f2f5')
        self.analysis_hint.pack(pady=5)

        right_frame = tk.Frame(main_frame)
        right_frame.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True)

        top_frame = ttk.LabelFrame(right_frame, text="拆书分析结果（含复用模板）", padding=10)
        top_frame.pack(side=tk.TOP, fill=tk.BOTH, expand=True, pady=(0,2))
        self.analysis_result_text = scrolledtext.ScrolledText(top_frame, wrap=tk.WORD, font=('微软雅黑', 10))
        self.analysis_result_text.pack(fill=tk.BOTH, expand=True)

        bottom_frame = ttk.LabelFrame(right_frame, text="生成的新书提示词（可复用模板填充）", padding=10)
        bottom_frame.pack(side=tk.BOTTOM, fill=tk.BOTH, expand=True, pady=(2,0))
        self.new_book_prompt_text = scrolledtext.ScrolledText(bottom_frame, wrap=tk.WORD, font=('微软雅黑', 10))
        self.new_book_prompt_text.pack(fill=tk.BOTH, expand=True)

        self.refresh_book_doc_list()
        return page

    def refresh_book_doc_list(self):
        docs = self.kb_manager.get_all_documents()
        titles = [doc['title'] for doc in docs]
        self.book_combobox['values'] = titles
        if titles:
            self.book_combobox.set(titles[0])
        else:
            self.book_combobox.set('')

    def create_book_analysis(self):
        selected_title = self.book_combobox.get().strip()
        if not selected_title:
            messagebox.showwarning("提示", "请从下拉框选择一个文档")
            return
        if not self.api_key.get().strip():
            messagebox.showwarning("提示", "请先在「系统设置」中配置API Key并测试")
            return
        content = self.kb_manager.get_document_content(selected_title)
        if not content:
            messagebox.showerror("错误", f"无法读取文档「{selected_title}」的内容")
            return

        self.analysis_result_text.delete(1.0, tk.END)
        self.new_book_prompt_text.delete(1.0, tk.END)
        self.analysis_result_text.insert(tk.END, "正在分析中，请稍候...\n")
        self.create_btn.config(state=tk.DISABLED)

        def analysis_task():
            llm = SimpleLLM(
                api_key=self.api_key.get().strip(),
                base_url=self.base_url.get().strip(),
                model=self.model_name.get().strip(),
                temperature=self.temp.get(),
                max_tokens=4096
            )
            prompt_analysis = f"""你是专业小说编辑。对以下内容进行拆解分析，输出结构化报告。**重点：最后输出“### 七、提炼模板”部分，包含可直接复用的写作模板。**

小说内容：
{content[:3000]}

请按以下格式输出：

### 一、开篇设计（前三章如何抓人）
- 开场手法、主角出场印象、核心冲突抛出时机、读者疑问、信息密度控制

### 二、钩子设计（翻页技巧）
- 章尾悬念、钩子类型

### 三、情绪走向
- 情绪曲线、调动手法

### 四、起承转合
- 故事结构、节奏

### 五、爽点设计
- 爽点元素、频率强度

### 六、金手指设计
- 核心外挂、合理性

### 七、提炼模板（★重点：可直接复用）
#### 7.1 开篇模板
- 开场句式示例、主角出场、冲突节点、信息密度建议
#### 7.2 章节节奏模板
- 建议字数、内部结构、节奏表
#### 7.3 爽点安排模板
- 频率、类型及位置
#### 7.4 金手指设计模板
- 类型、限制、成长路线
#### 7.5 完整故事大纲模板（可填空）

### 八、综合评分与改进建议
- 各维度打分1-10分，2-3条改进建议

请分析具体、有例证，模板详实可操作。"""
            result_analysis = llm.chat(prompt_analysis)

            if "错误：" in result_analysis or "请求异常" in result_analysis:
                self.root.after(0, lambda: self.show_analysis_error("拆书分析失败", result_analysis))
                self.root.after(0, lambda: self.create_btn.config(state=tk.NORMAL))
                return

            fenxi_dir = "./fenxi"
            os.makedirs(fenxi_dir, exist_ok=True)
            base_name = f"{selected_title}-拆书分析"
            suffix = ".txt"
            candidate = os.path.join(fenxi_dir, base_name + suffix)
            counter = 1
            while os.path.exists(candidate):
                ans = messagebox.askyesno("文件已存在", f"文件「{os.path.basename(candidate)}」已存在，是否覆盖？\n点击「是」覆盖，点击「否」自动添加序号。")
                if ans:
                    break
                else:
                    candidate = os.path.join(fenxi_dir, f"{base_name}{counter}{suffix}")
                    counter += 1
            try:
                with open(candidate, 'w', encoding='utf-8') as f:
                    f.write(result_analysis)
                save_msg = f"\n\n[分析结果已保存至：{candidate}]"
            except Exception as e:
                save_msg = f"\n\n[保存文件失败：{e}]"

            self.root.after(0, lambda: self.display_analysis_result(result_analysis + save_msg))

            template_match = re.search(r'### 七、提炼模板(.*?)(?=###|$)', result_analysis, re.DOTALL)
            if not template_match:
                self.root.after(0, lambda: self.new_book_prompt_text.insert(tk.END, "未能从分析结果中提取到模板，无法生成新书提示词。"))
                self.root.after(0, lambda: self.create_btn.config(state=tk.NORMAL))
                return
            template_text = template_match.group(1).strip()

            prompt_new_book = f"""你是资深小说大纲设计师。基于以下可复用模板，生成一个全新的、原创的小说写作提示词。**不要使用原作品的任何具体剧情、人物、设定**。

**要求：**
1. 书名格式：「场景/身份 + 冲突/动作 + 结果/爽点」，例如《开局签到一个亿》。
2. 简介三段式：主角处境→抛出冲突→悬念收尾。

模板：
{template_text}

输出格式（直接输出）：
【新书写作提示词】
**书名：** 
**简介：** 
一、开篇设计建议
二、章节节奏建议
三、爽点安排建议
四、金手指设计建议
五、完整故事大纲框架

确保原创、可操作。"""
            result_new_prompt = llm.chat(prompt_new_book)
            if "错误：" in result_new_prompt or "请求异常" in result_new_prompt:
                self.root.after(0, lambda: self.new_book_prompt_text.insert(tk.END, f"生成新书提示词失败：{result_new_prompt}"))
            else:
                self.root.after(0, lambda: self.new_book_prompt_text.delete(1.0, tk.END))
                self.root.after(0, lambda: self.new_book_prompt_text.insert(tk.END, result_new_prompt))
                self.extract_and_sync_book_info(result_new_prompt)

            self.root.after(0, lambda: self.create_btn.config(state=tk.NORMAL))

        threading.Thread(target=analysis_task, daemon=True).start()

    def extract_and_sync_book_info(self, prompt_text):
        title_match = re.search(r'\*\*书名：\*\*\s*(.+?)(?:\n|$)', prompt_text)
        if title_match:
            new_title = title_match.group(1).strip().strip('《》').strip()
            self.new_book_title.set(new_title)
        intro_match = re.search(r'\*\*简介：\*\*\s*(.+?)(?=\n\*\*|$)', prompt_text, re.DOTALL)
        if intro_match:
            new_intro = intro_match.group(1).strip()
            self.new_book_synopsis.set(new_intro)

    def display_analysis_result(self, result):
        self.analysis_result_text.delete(1.0, tk.END)
        self.analysis_result_text.insert(tk.END, result)
        self.analysis_hint.config(text="分析完成")

    def show_analysis_error(self, title, msg):
        messagebox.showerror(title, msg)
        self.analysis_result_text.delete(1.0, tk.END)
        self.analysis_result_text.insert(tk.END, f"错误：{msg}")

    # ---------- 写书页面 ----------
    def create_write_book_page(self):
        page = tk.Frame(self.right_area, bg='#f0f2f5')
        top_frame = tk.Frame(page, bg='#f0f2f5')
        top_frame.pack(fill=tk.X, padx=20, pady=(20,10))
        name_frame = tk.Frame(top_frame, bg='#f0f2f5')
        name_frame.pack(side=tk.LEFT)
        tk.Label(name_frame, text="新书名：", font=('微软雅黑', 12, 'bold'), bg='#f0f2f5').pack(side=tk.LEFT)
        self.book_title_entry = tk.Entry(name_frame, textvariable=self.new_book_title, font=('微软雅黑', 11), width=25)
        self.book_title_entry.pack(side=tk.LEFT, padx=5)

        settings_frame = tk.Frame(top_frame, bg='#f0f2f5', relief=tk.GROOVE, bd=1)
        settings_frame.pack(side=tk.RIGHT, padx=10)
        tk.Label(settings_frame, text="设置", font=('微软雅黑', 10, 'bold'), bg='#f0f2f5').pack(anchor='w', padx=5, pady=2)
        row1 = tk.Frame(settings_frame, bg='#f0f2f5')
        row1.pack(fill=tk.X, pady=2)
        tk.Label(row1, text="题材:", font=('微软雅黑', 9), bg='#f0f2f5', width=6, anchor='e').pack(side=tk.LEFT)
        self.genre_entry = tk.Entry(row1, textvariable=self.genre, font=('微软雅黑', 9), width=12)
        self.genre_entry.pack(side=tk.LEFT, padx=2)
        row2 = tk.Frame(settings_frame, bg='#f0f2f5')
        row2.pack(fill=tk.X, pady=2)
        tk.Label(row2, text="章节数:", font=('微软雅黑', 9), bg='#f0f2f5', width=6, anchor='e').pack(side=tk.LEFT)
        self.chapter_num_spin = tk.Spinbox(row2, from_=1, to=200, textvariable=self.chapter_num, width=6)
        self.chapter_num_spin.pack(side=tk.LEFT, padx=2)
        row3 = tk.Frame(settings_frame, bg='#f0f2f5')
        row3.pack(fill=tk.X, pady=2)
        tk.Label(row3, text="每章字数:", font=('微软雅黑', 9), bg='#f0f2f5', width=6, anchor='e').pack(side=tk.LEFT)
        self.words_spin = tk.Spinbox(row3, from_=500, to=20000, increment=500, textvariable=self.words_per_chapter, width=8)
        self.words_spin.pack(side=tk.LEFT, padx=2)
        row4 = tk.Frame(settings_frame, bg='#f0f2f5')
        row4.pack(fill=tk.X, pady=2)
        tk.Label(row4, text="保存路径:", font=('微软雅黑', 9), bg='#f0f2f5', width=6, anchor='e').pack(side=tk.LEFT)
        self.save_path_entry = tk.Entry(row4, textvariable=self.save_path, font=('微软雅黑', 9), width=15)
        self.save_path_entry.pack(side=tk.LEFT, padx=2)
        tk.Button(row4, text="浏览", command=self.browse_save_path, font=('微软雅黑', 8)).pack(side=tk.LEFT)

        intro_frame = tk.Frame(page, bg='#f0f2f5')
        intro_frame.pack(fill=tk.X, padx=20, pady=5)
        tk.Label(intro_frame, text="新书内容简介：", font=('微软雅黑', 11, 'bold'), bg='#f0f2f5', anchor='w').pack(anchor='w')
        self.book_synopsis_text = scrolledtext.ScrolledText(intro_frame, wrap=tk.WORD, height=3, width=40, font=('微软雅黑', 10))
        self.book_synopsis_text.pack(fill=tk.X, pady=5, padx=5)
        def sync_synopsis(*args):
            self.book_synopsis_text.delete(1.0, tk.END)
            self.book_synopsis_text.insert(tk.END, self.new_book_synopsis.get())
        self.new_book_synopsis.trace('w', sync_synopsis)
        def on_synopsis_change(event=None):
            self.new_book_synopsis.set(self.book_synopsis_text.get(1.0, tk.END).strip())
        self.book_synopsis_text.bind('<KeyRelease>', on_synopsis_change)

        step_frame = ttk.LabelFrame(page, text="生成步骤", padding=10)
        step_frame.pack(fill=tk.X, padx=20, pady=5)
        btn_frame = tk.Frame(step_frame)
        btn_frame.pack()
        ttk.Button(btn_frame, text="Step1: 生成整体架构", command=self.gen_architecture).pack(side=tk.LEFT, padx=5, pady=5)
        ttk.Button(btn_frame, text="Step2: 生成章节蓝图", command=self.gen_blueprints).pack(side=tk.LEFT, padx=5, pady=5)
        ttk.Button(btn_frame, text="Step3: 生成全部草稿", command=self.gen_all_drafts).pack(side=tk.LEFT, padx=5, pady=5)
        ttk.Button(btn_frame, text="生成部分草稿", command=self.gen_partial_drafts).pack(side=tk.LEFT, padx=5, pady=5)

        notebook = ttk.Notebook(page)
        notebook.pack(fill=tk.BOTH, expand=True, padx=20, pady=10)
        self.text_arch = scrolledtext.ScrolledText(notebook, wrap=tk.WORD, font=('微软雅黑', 10))
        notebook.add(self.text_arch, text="小说架构")
        self.text_blueprint = scrolledtext.ScrolledText(notebook, wrap=tk.WORD, font=('微软雅黑', 10))
        notebook.add(self.text_blueprint, text="章节蓝图")
        self.text_draft = scrolledtext.ScrolledText(notebook, wrap=tk.WORD, font=('微软雅黑', 10))
        notebook.add(self.text_draft, text="草稿内容")
        return page

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
            max_tokens=8192
        )

    def gen_architecture(self):
        if not self.new_book_title.get().strip():
            messagebox.showwarning("提示", "请先填写新书名")
            return
        if not self.api_key.get().strip():
            messagebox.showwarning("提示", "请先在系统设置中配置API Key")
            return
        self.log_to_write("开始生成整体架构...")
        self.text_arch.delete(1.0, tk.END)
        self.text_arch.insert(tk.END, "生成中，请稍候...\n")
        def task():
            llm = self.get_llm()
            template = ""
            if hasattr(self, 'new_book_prompt_text'):
                template = self.new_book_prompt_text.get(1.0, tk.END).strip()
            prompt = f"""你是专业小说策划师。根据以下信息生成小说整体架构。
新书名：{self.new_book_title.get()}
简介：{self.new_book_synopsis.get()}
题材：{self.genre.get()}
章节数：{self.chapter_num.get()}
每章字数：{self.words_per_chapter.get()}

参考模板（不要抄袭原剧情）：{template[:2000]}

输出：
1. 小说简介（200-400字，三段式）
2. 主要人物设定（主角+2配角）
3. 世界观（100字）
4. 主线剧情概要（300字）"""
            result = llm.chat(prompt)
            self.root.after(0, lambda: self.text_arch.delete(1.0, tk.END))
            self.root.after(0, lambda: self.text_arch.insert(tk.END, result))
            self.architecture = result
            self.root.after(0, lambda: self.log_to_write("架构生成完成"))
        threading.Thread(target=task, daemon=True).start()

    def gen_blueprints(self):
        if not self.architecture:
            messagebox.showwarning("提示", "请先执行Step1生成架构")
            return
        total = self.chapter_num.get()
        self.log_to_write(f"开始生成{total}个章节蓝图（每章6-8字章节名）...")
        self.text_blueprint.delete(1.0, tk.END)
        self.chapter_blueprints.clear()
        def task():
            llm = self.get_llm()
            for ch in range(1, total+1):
                self.log_to_write(f"正在生成第{ch}章蓝图...")
                prompt = f"""根据以下整体架构，为第{ch}章（共{total}章）生成详细大纲。
架构：{self.architecture[:1500]}
新书名：{self.new_book_title.get()}
题材：{self.genre.get()}
要求：生成6-8字章节名。

输出：
- 章节名（6-8字）
- 本章核心冲突
- 主要场景（3-5个）
- 本章结尾悬念
- 预计字数：{self.words_per_chapter.get()}字"""
                bp = llm.chat(prompt)
                self.chapter_blueprints[ch] = bp
                self.root.after(0, lambda c=ch, b=bp: self.text_blueprint.insert(tk.END, f"\n========== 第{c}章 {self.extract_chapter_title(b)} ==========\n{b}\n\n"))
                self.root.after(0, lambda: self.text_blueprint.see(tk.END))
            self.root.after(0, lambda: self.log_to_write("所有章节蓝图生成完成"))
        threading.Thread(target=task, daemon=True).start()

    def extract_chapter_title(self, blueprint):
        match = re.search(r'章节名[：:]\s*(.{6,8})', blueprint)
        if match:
            return match.group(1)
        return "未命名"

    # ---------- 优化后的生成全部草稿（续写逻辑） ----------
    def gen_all_drafts(self):
        if not self.chapter_blueprints:
            messagebox.showwarning("提示", "请先执行Step2生成蓝图")
            return
        total = self.chapter_num.get()
        save_dir = self.save_path.get()
        os.makedirs(save_dir, exist_ok=True)

        # 扫描已存在的章节文件
        existing_chapters = set()
        if os.path.exists(save_dir):
            for filename in os.listdir(save_dir):
                match = re.match(r'第(\d+)章_.*\.txt', filename)
                if match:
                    ch_num = int(match.group(1))
                    existing_chapters.add(ch_num)

        # 计算缺失的章节
        missing_chapters = [ch for ch in range(1, total+1) if ch not in existing_chapters]

        if not missing_chapters:
            messagebox.showinfo("提示", f"所有章节文件均已存在，无需生成。\n如需重新生成，请先删除已存在的章节文件。")
            # 仍然合并完整文档
            self.merge_all_chapters_to_full_document()
            return

        self.log_to_write(f"检测到已存在章节: {sorted(existing_chapters)}，需要生成缺失章节: {missing_chapters}")
        # 生成缺失的章节
        self.generate_chapters_by_list(missing_chapters)

    def generate_chapters_by_list(self, chapter_list):
        """根据给定的章节号列表生成草稿（不重复检测）"""
        if not chapter_list:
            return
        self.log_to_write(f"开始生成章节: {chapter_list}")

        deai_prompt = """
**写作要求（去AI味，贴近人类风格）：**
- 细节描绘：细致描写环境和情感，增强真实感。
- 增强代入感：让读者感同身受。
- 分段解构：复杂内容分解成小段。
- 分发好奇心：通过悬念激发求知欲。
- 增添幽默：适当加入幽默元素。
- 平衡叙述节奏：长短句交替。
- 情感共鸣：描写情感变化。
- 多感官描述：调动视觉、听觉等。
- 精确用词：避免模棱两可。
- 制造矛盾冲突：引入矛盾使情节紧张。
- 运用反问句：引发读者思考。
- 排比句式：增强节奏感。
- 使用直接引语：使对话生动。
- 通过细节刻画人物：让人物立体。
- 增加环境描写：增强现场感。
- 使用比喻：使抽象概念形象化。
- 通过悬念吸引：开头设置悬念。
- 使用具体例子：说明抽象问题。

请务必遵循以上要求，使文章读起来像真人作家所写，避免机械、生硬、模板化。"""

        def task():
            llm = self.get_llm()
            for ch in chapter_list:
                bp = self.chapter_blueprints.get(ch, "")
                if not bp:
                    self.log_to_write(f"第{ch}章蓝图缺失，跳过")
                    continue
                ch_title = self.extract_chapter_title(bp)
                self.log_to_write(f"正在撰写第{ch}章「{ch_title}」草稿...")
                prompt = f"""根据以下蓝图扩写成完整章节（约{self.words_per_chapter.get()}字）。
蓝图：
{bp}
{deai_prompt}
章节开头格式：“第{ch}章 {ch_title}”"""
                draft = llm.chat(prompt)
                self.chapter_drafts[ch] = draft
                self.root.after(0, lambda c=ch, t=ch_title, d=draft: self.text_draft.insert(tk.END, f"\n========== 第{c}章 {t} ==========\n{d}\n\n"))
                self.root.after(0, lambda: self.text_draft.see(tk.END))
                save_dir = self.save_path.get()
                os.makedirs(save_dir, exist_ok=True)
                filename = f"第{ch}章_{ch_title}.txt"
                filepath = os.path.join(save_dir, filename)
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(f"第{ch}章 {ch_title}\n\n{draft}")
                self.log_to_write(f"第{ch}章已保存至：{filepath}")
            # 全部生成完毕后，合并完整文档
            self.root.after(0, self.merge_all_chapters_to_full_document)
            self.log_to_write("缺失章节生成完成，已合并完整文档")
        threading.Thread(target=task, daemon=True).start()

    def merge_all_chapters_to_full_document(self):
        """将所有章节按顺序合并成一个完整文档，保存为“新书名.txt”"""
        save_dir = self.save_path.get()
        book_title = self.new_book_title.get().strip()
        if not book_title:
            book_title = "未命名小说"
        full_filename = f"{book_title}.txt"
        full_filepath = os.path.join(save_dir, full_filename)

        chapters_content = []
        total = self.chapter_num.get()
        for ch in range(1, total+1):
            found = False
            # 优先从文件读取（确保最新内容）
            if os.path.exists(save_dir):
                for filename in os.listdir(save_dir):
                    if filename.startswith(f"第{ch}章_"):
                        filepath = os.path.join(save_dir, filename)
                        with open(filepath, 'r', encoding='utf-8') as f:
                            content = f.read()
                        chapters_content.append(content)
                        found = True
                        break
            if not found and ch in self.chapter_drafts:
                # 内存中有但文件可能没保存（刚生成的），直接使用内存内容
                chapters_content.append(self.chapter_drafts[ch])
            else:
                self.log_to_write(f"警告：第{ch}章内容未找到，可能生成失败")
                chapters_content.append(f"【第{ch}章内容缺失】")

        full_text = "\n\n".join(chapters_content)
        with open(full_filepath, 'w', encoding='utf-8') as f:
            f.write(full_text)
        self.log_to_write(f"完整文档已保存至：{full_filepath}")
        messagebox.showinfo("完成", f"全部章节已生成完毕，完整文档保存为：{full_filepath}")

    def gen_partial_drafts(self):
        """生成部分草稿（带续写检测：只生成指定范围内尚未存在的章节）"""
        if not self.chapter_blueprints:
            messagebox.showwarning("提示", "请先执行Step2生成蓝图")
            return
        total = self.chapter_num.get()
        start_str = simpledialog.askstring("生成部分草稿", f"请输入起始章节号 (1-{total}):", initialvalue="1")
        if not start_str:
            return
        try:
            start = int(start_str)
        except:
            messagebox.showerror("错误", "起始章节号必须是数字")
            return
        end_str = simpledialog.askstring("生成部分草稿", f"请输入结束章节号 (1-{total}):", initialvalue=str(total))
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

        save_dir = self.save_path.get()
        os.makedirs(save_dir, exist_ok=True)
        # 扫描已存在的章节
        existing_chapters = set()
        if os.path.exists(save_dir):
            for filename in os.listdir(save_dir):
                match = re.match(r'第(\d+)章_.*\.txt', filename)
                if match:
                    existing_chapters.add(int(match.group(1)))

        # 计算指定范围内缺失的章节
        needed = [ch for ch in range(start, end+1) if ch not in existing_chapters]
        if not needed:
            messagebox.showinfo("提示", f"章节 {start}-{end} 范围内所有文件均已存在，无需生成。")
            return

        self.log_to_write(f"指定范围 {start}-{end}，已存在 {existing_chapters & set(range(start, end+1))}，需要生成 {needed}")
        self.generate_chapters_by_list(needed)

    # 原有的 gen_drafts_range 已不再直接使用，但保留以防其他地方调用（实际未使用）
    def gen_drafts_range(self, start, end):
        # 此方法保留但不再被按钮调用，可删除或保留
        pass

    def log_to_write(self, msg):
        print(msg)

    # ---------- 系统设置页面 ----------
    def on_model_select(self):
        model_id = self.current_model.get()
        if model_id in self.MODEL_PRESETS:
            display_name, default_base_url, default_model = self.MODEL_PRESETS[model_id]
            self.base_url.set(default_base_url)
            self.model_name.set(default_model)
            self.log_to_system(f"已切换到 {display_name} 模型")

    def create_system_settings_page(self):
        page = tk.Frame(self.right_area, bg='#f0f2f5')
        tk.Label(page, text="系统设置", font=('微软雅黑', 18, 'bold'),
                 bg='#f0f2f5', fg='#2c3e50').pack(anchor='w', padx=20, pady=20)
        model_frame = ttk.LabelFrame(page, text="模型选择", padding=10)
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
        config_frame = ttk.LabelFrame(page, text="API 配置", padding=10)
        config_frame.pack(fill=tk.X, padx=20, pady=10)
        row = 0
        ttk.Label(config_frame, text="API Key:").grid(row=row, column=0, sticky='w', padx=5, pady=5)
        ttk.Entry(config_frame, textvariable=self.api_key, width=50, show="*").grid(row=row, column=1, padx=5, pady=5, sticky='w')
        row += 1
        ttk.Label(config_frame, text="Base URL:").grid(row=row, column=0, sticky='w', padx=5, pady=5)
        ttk.Entry(config_frame, textvariable=self.base_url, width=50).grid(row=row, column=1, padx=5, pady=5, sticky='w')
        row += 1
        ttk.Label(config_frame, text="模型名称:").grid(row=row, column=0, sticky='w', padx=5, pady=5)
        ttk.Entry(config_frame, textvariable=self.model_name, width=30).grid(row=row, column=1, padx=5, pady=5, sticky='w')
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
        proxy_frame = ttk.LabelFrame(page, text="代理设置", padding=10)
        proxy_frame.pack(fill=tk.X, padx=20, pady=10)
        ttk.Label(proxy_frame, text="暂未实现").pack()
        log_frame = ttk.LabelFrame(page, text="测试日志", padding=10)
        log_frame.pack(fill=tk.BOTH, expand=True, padx=20, pady=10)
        self.test_log_text = scrolledtext.ScrolledText(log_frame, wrap=tk.WORD, height=8, font=('微软雅黑', 9))
        self.test_log_text.pack(fill=tk.BOTH, expand=True)
        ttk.Button(log_frame, text="清空日志", command=lambda: self.test_log_text.delete(1.0, tk.END)).pack(pady=5)
        return page

    def test_api(self):
        if not self.api_key.get().strip():
            messagebox.showwarning("提示", "请填写API Key")
            return
        self.log_to_system("开始测试API连接...")
        def test():
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
                    msg = f"[{datetime.now().strftime('%H:%M:%S')}] " + ("✅ API测试成功！" if ok else f"❌ API返回异常: {result}")
                else:
                    msg = f"[{datetime.now().strftime('%H:%M:%S')}] ❌ API测试失败，状态码: {resp.status_code}\n响应内容: {resp.text}"
            except Exception as e:
                msg = f"[{datetime.now().strftime('%H:%M:%S')}] ❌ 请求异常: {str(e)}"
            self.log_to_system(msg)
        threading.Thread(target=test, daemon=True).start()

    def log_to_system(self, msg):
        if hasattr(self, 'test_log_text'):
            self.test_log_text.insert(tk.END, msg + "\n")
            self.test_log_text.see(tk.END)

    # ---------- 页面切换 ----------
    def show_home(self):
        for child in self.right_area.winfo_children():
            child.pack_forget()
        self.page_home.pack(fill=tk.BOTH, expand=True)

    def show_knowledge(self):
        for child in self.right_area.winfo_children():
            child.pack_forget()
        self.page_knowledge.pack(fill=tk.BOTH, expand=True)

    def show_book_analysis(self):
        for child in self.right_area.winfo_children():
            child.pack_forget()
        self.refresh_book_doc_list()
        self.page_book_analysis.pack(fill=tk.BOTH, expand=True)

    def show_write_book(self):
        for child in self.right_area.winfo_children():
            child.pack_forget()
        self.page_write_book.pack(fill=tk.BOTH, expand=True)

    def show_system_settings(self):
        for child in self.right_area.winfo_children():
            child.pack_forget()
        self.page_system.pack(fill=tk.BOTH, expand=True)

    def run(self):
        self.root.mainloop()


if __name__ == "__main__":
    app = SimpleWorkbench()
    app.run()