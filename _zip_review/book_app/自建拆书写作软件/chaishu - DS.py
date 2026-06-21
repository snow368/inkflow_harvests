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
        last_exception = None
        for attempt in range(1, 4):
            try:
                resp = self.session.post(url, headers=headers, json=data, timeout=(10, 120))
                if resp.status_code == 200:
                    return resp.json()["choices"][0]["message"]["content"]
                else:
                    error_msg = f"HTTP {resp.status_code}: {resp.text[:200]}"
                    last_exception = Exception(error_msg)
                    if attempt == 3:
                        return f"错误：{error_msg}"
                    time.sleep(1 * attempt)
            except requests.exceptions.Timeout:
                last_exception = Exception("请求超时")
                if attempt == 3:
                    return f"请求异常：超时"
                time.sleep(1 * attempt)
            except requests.exceptions.ConnectionError as e:
                last_exception = e
                if attempt == 3:
                    return f"请求异常：连接错误 - {str(e)}"
                time.sleep(1 * attempt)
            except Exception as e:
                last_exception = e
                if attempt == 3:
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
        self.new_book_title = tk.StringVar()      # 新书名
        self.new_book_synopsis = tk.StringVar()   # 新书简介
        self.save_path = tk.StringVar(value="./小说输出")  # 保存地址
        self.chapter_num = tk.IntVar(value=5)     # 章节数
        self.words_per_chapter = tk.IntVar(value=3000)  # 每章字数
        self.genre = tk.StringVar(value="")       # 题材
        self.architecture = ""                    # 生成的架构
        self.chapter_blueprints = {}               # 章节蓝图 {章号: 内容}
        self.chapter_drafts = {}                   # 章节草稿 {章号: 内容}
        self.current_chapter = 1                   # 当前章节号

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

    # ---------- 拆书页面（两个文本框大小一致） ----------
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

        # 上下两个文本框大小一致：均使用 expand=True, fill=tk.BOTH，各占一半空间
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
            prompt_analysis = f"""你是一位顶尖的小说编辑与写作教练。请对以下小说内容进行深度拆解分析，严格按照下列维度输出结构化报告。**重点：最后必须输出一个清晰、可直接复用的写作模板（放在“### 七、提炼模板”部分）。**

小说内容：
{content[:8000]}

请按以下格式输出：

### 一、开篇设计（前三章是怎么抓人的）
- 第一段/第一句话是怎么开场的？用了什么手法吸引读者？
- 主角在第几段出场？出场时读者对他的第一印象是什么？
- 前三章里，核心冲突是什么时候抛出来的？
- 读者看完前三章，会产生什么疑问想继续看下去？
- 前三章的信息密度如何？是一上来就大量设定，还是边走边交代？

### 二、钩子设计（让人想翻下一页的技巧）
- 每一章结尾是否留有悬念或期待？
- 使用了哪些具体的钩子类型（对话钩、情节钩、情绪钩等）？

### 三、情绪走向（阅读体验的核心）
- 整体情绪曲线如何变化？
- 作者如何调动读者情绪？

### 四、起承转合（故事结构）
- 故事的“起”、“承”、“转”、“合”分别在哪里？
- 节奏是否张弛有度？

### 五、爽点设计（读者为什么追读）
- 列出了哪些让读者产生快感的元素？
- 爽点的频率和强度如何？

### 六、金手指设计（核心外挂逻辑）
- 主角拥有什么特殊能力、资源或信息优势？
- 金手指的设定是否合理、有新鲜感？

### 七、提炼模板（★重点：可复用的创作框架，直接用于写小说★）
请将以上分析结果，总结成一个可以直接套用的写作模板。模板应包含以下子部分（每个子部分都要有具体内容，不能为空）：

#### 7.1 开篇模板（如何写前三章）
- 开场句式示例：____________
- 主角出场时机与形象：____________
- 核心冲突抛出节点：____________
- 信息密度控制建议：____________

#### 7.2 章节节奏模板
- 建议每章字数：____________
- 章节内部结构：开头钩子→发展→小高潮→结尾悬念
- 具体节奏表：____________

#### 7.3 爽点安排模板
- 爽点频率：____________
- 常见爽点类型及插入位置：____________

#### 7.4 金手指设计模板
- 金手指类型建议：____________
- 限制条件（避免无敌）：____________
- 成长/解锁路线：____________

#### 7.5 完整故事大纲模板（可直接填空使用）
提供一个通用的大纲框架，用户只需填入自己的人物和设定即可。

### 八、综合评分与改进建议
- 对开篇吸引力、钩子密度、情绪感染力、结构清晰度、爽点设计分别打分（1-10分）。
- 给出2-3条具体的改进建议。

请确保分析具体、有例证，模板部分要详实、可操作。"""
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

            prompt_new_book = f"""你是一位资深小说大纲设计师。下面是一个从某部作品中提炼出的“可复用写作模板”。请严格基于这个模板的结构和思路，**但不要使用原作品的任何具体剧情、人物、设定、冲突**，生成一个全新的、原创的小说写作提示词。

**特别要求：**
1. **新书名必须严格遵循以下公式：`场景/身份 + 冲突/动作 + 结果/爽点`**
   - 示例1（身份+动作+对象）：《退伍兵王横扫豪门》
   - 示例2（时间+金手指+数值）：《开局签到一个亿》
   - 示例3（身份+状态+结果）：《被逐出宗门后我无敌了》
   - 示例4（背景+能力+悬念）：《全球觉醒：我能看到隐藏属性》
   - 请根据你生成的故事类型，创作一个符合该公式的原创书名。

2. **新书简介必须遵循广告三段式：**
   - 第一句：主角是谁，处于什么处境？（建立代入感）
   - 第二句：抛出冲突——什么矛盾、不公或机遇打破了平静？（制造紧张感）
   - 第三句：悬念收尾——不给答案，让读者产生好奇自己去找答案。
   - 简介整体要像广告一样吸引人，不能写成大纲。

模板内容如下：
{template_text}

请输出一个完整的新书写作提示词，格式如下（直接输出，不要加额外解释）：

【新书写作提示词】

**书名：** （必须符合上述公式）

**简介：** （三段式广告，每段一句，总字数100-200字）

一、开篇设计建议
（根据模板填充具体内容，原创，包括如何写出前三章）

二、章节节奏建议
（原创节奏表，每章字数建议）

三、爽点安排建议
（原创爽点类型和频率，以及具体在哪些章节出现）

四、金手指设计建议
（原创金手指逻辑，包括限制和成长路线）

五、完整故事大纲框架
（提供一个可填空的大纲，用户可自行填入具体设定，包含至少10个章节的概要）

请确保提示词具体、可操作，并且完全原创。书名和简介必须严格按照上述要求创作。"""
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

        # 顶部区域：左侧新书名，右侧设置面板
        top_frame = tk.Frame(page, bg='#f0f2f5')
        top_frame.pack(fill=tk.X, padx=20, pady=(20,10))

        # 左侧：新书名
        name_frame = tk.Frame(top_frame, bg='#f0f2f5')
        name_frame.pack(side=tk.LEFT)
        tk.Label(name_frame, text="新书名：", font=('微软雅黑', 12, 'bold'), bg='#f0f2f5').pack(side=tk.LEFT)
        self.book_title_entry = tk.Entry(name_frame, textvariable=self.new_book_title, font=('微软雅黑', 11), width=25)
        self.book_title_entry.pack(side=tk.LEFT, padx=5)

        # 右侧：设置面板（题材、章节数、每章字数、保存路径）
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

        # 新书内容简介（缩小尺寸）
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

        # 生成步骤按钮（增加“生成部分草稿”按钮）
        step_frame = ttk.LabelFrame(page, text="生成步骤", padding=10)
        step_frame.pack(fill=tk.X, padx=20, pady=5)
        btn_frame = tk.Frame(step_frame)
        btn_frame.pack()
        ttk.Button(btn_frame, text="Step1: 生成整体架构", command=self.gen_architecture).pack(side=tk.LEFT, padx=5, pady=5)
        ttk.Button(btn_frame, text="Step2: 生成章节蓝图", command=self.gen_blueprints).pack(side=tk.LEFT, padx=5, pady=5)
        ttk.Button(btn_frame, text="Step3: 生成全部草稿", command=self.gen_all_drafts).pack(side=tk.LEFT, padx=5, pady=5)
        # 新增“生成部分草稿”按钮
        ttk.Button(btn_frame, text="生成部分草稿", command=self.gen_partial_drafts).pack(side=tk.LEFT, padx=5, pady=5)

        # 三个主要文本框（占据剩余全部空间）
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
            prompt = f"""你是一位专业的小说策划师。请根据以下信息生成小说整体架构。

新书名：{self.new_book_title.get()}
新书简介：{self.new_book_synopsis.get()}
题材：{self.genre.get()}
章节数：{self.chapter_num.get()}
每章字数：{self.words_per_chapter.get()}

以下是从拆书分析中得到的可复用写作模板，请严格参考其结构来设计架构（但不要抄袭原剧情）：
{template[:2000]}

请输出：
1. 小说简介（200-400字，广告三段式：主角处境→抛出冲突→悬念收尾）
2. 主要人物设定（主角+2配角，每人50字）
3. 世界观（100字）
4. 主线剧情概要（300字）

用清晰标题分隔。"""
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
        self.log_to_write(f"开始为{total}个章节生成蓝图（每章6-8字章节名）...")
        self.text_blueprint.delete(1.0, tk.END)
        self.chapter_blueprints.clear()

        def task():
            llm = self.get_llm()
            for ch in range(1, total+1):
                self.log_to_write(f"正在生成第{ch}章蓝图...")
                prompt = f"""你是小说家。根据以下整体架构，为第{ch}章（共{total}章）生成详细大纲。
整体架构摘要：{self.architecture[:1500]}
新书名：{self.new_book_title.get()}
题材：{self.genre.get()}
**要求：必须为本章生成一个6-8个字的章节名（例如“武当山上放牛”、“深夜密谈惊变”），章节名要概括本章核心事件。**

请输出：
- 章节名（6-8个字）
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

    # ========== 新增：续写相关方法 ==========
    def get_existing_chapters(self, save_dir):
        """扫描保存目录，返回已存在的章节号集合（基于文件名“第X章_*.txt”）"""
        existing = set()
        if not os.path.exists(save_dir):
            return existing
        for filename in os.listdir(save_dir):
            match = re.match(r'第(\d+)章_.*\.txt', filename)
            if match:
                existing.add(int(match.group(1)))
        return existing

    def generate_chapters_by_list(self, chapter_list):
        """根据给定的章节号列表生成草稿（不重复检测，调用前应确保列表中的章节尚未生成）"""
        if not chapter_list:
            return
        self.log_to_write(f"开始生成章节: {chapter_list}")

        # 去AI味详细指令
        deai_prompt = """
**写作要求（去AI味，贴近人类风格）：**
- 细节描绘：通过对环境和情感细致入微的描写，增强文章的真实感。
- 增强代入感：让读者感同身受，增强他们与内容的情感连接。
- 分段解构：将复杂的内容分解成小段，便于读者逐步理解。
- 分发好奇心：通过提出问题或悬念，激发读者的求知欲望。
- 增添幽默：适当地加入幽默元素，提升文章的趣味性。
- 平衡叙述节奏：通过交替使用长句和短句，使文章的节奏更具吸引力。
- 情感共鸣：通过描写情感变化，促使读者产生共鸣。
- 提供背景信息：适时插入相关背景知识，让读者更好理解文章内容。
- 简洁明了：去除冗余信息，使文章结构更加简洁有力。
- 多视角叙述：从不同角度描述事件，丰富文章的层次感。
- 突出关键点：使用重点词汇或短语，强化文章的主旨。
- 打造紧张氛围：通过描写紧张的情境，增加文章的悬念感。
- 使用对比：通过对比手法突出主题，使文章层次分明。
- 层层递进：逐步深入剖析问题，使读者更容易理解复杂概念。
- 情节反转：设计出人意料的情节反转，增加文章的戏剧性。
- 明确结论：在文章结尾处提供明确的总结或结论，增强说服力。
- 运用拟人手法：将非人类的事物赋予人的特征，使描写更生动。
- 多元化表达：通过多种修辞手法，使文章语言更加丰富。
- 呼应开篇：结尾处呼应开篇的内容，使文章结构更加严谨。
- 使用类比：通过类比的方式解释复杂概念，使其更易理解。
- 增强情感深度：通过细致描写内心活动，增加情感的层次感。
- 减少术语使用：避免使用过多专业术语，使文章通俗易懂。
- 多感官描述：调动视觉、听觉等多种感官，丰富文章的描写。
- 精确用词：选择最恰当的词汇表达意思，避免模棱两可的表述。
- 制造矛盾冲突：通过引入矛盾，使情节更加紧张和引人入胜。
- 提供解决方案：在提出问题后，及时给出解决办法，增强实用性。
- 层次分明：通过分段和分层次描述，使文章逻辑清晰。
- 预设读者反应：预测读者可能的反应并提前回应，增强互动感。
- 插入实例：通过具体实例说明抽象概念，使内容更有说服力。
- 运用反问句：使用反问句强化观点，引发读者思考。
- 适度夸张：通过适当夸张，增强描述的生动性和感染力。
- 细化场景描写：对场景进行精细描述，增强画面感。
- 建立悬念：在叙述中埋下伏笔，吸引读者继续阅读。
- 巧用反义词：通过反义词对比，强化文章的对比效果。
- 使用隐喻：运用隐喻使文章更具深度和艺术性。
- 营造紧迫感：通过描写紧急情况，增强文章的紧张感。
- 引导情绪波动：通过逐步升级情绪，使读者情感得到释放。
- 引用流行语：适时使用流行语，使文章更接地气。
- 强化视觉效果：使用生动的视觉描述，增强读者的画面感。
- 嵌入故事情节：通过嵌入小故事，丰富文章的情感层次。
- 利用数字数据：引用具体数据，增强文章的可信度。
- 排比句式：使用排比句式，增强文章的节奏感和力量感。
- 对比论证：通过对比不同观点，增强论证的说服力。
- 简单化复杂内容：将复杂概念简单化，使其易于理解。
- 使用直接引语：通过直接引语，使人物对话更加生动。
- 运用反复手法：通过反复强调某一观点，强化文章的主旨。
- 引导读者思考：通过提出问题，引导读者进行深入思考。
- 丰富背景描写：通过增加背景描写，使情节更具立体感。
- 融入情感记忆：借助情感记忆，增强文章的共鸣感。
- 呼应读者经验：通过呼应读者的生活经验，增加文章的亲切感。
- 强调行动力：通过描写行动场景，增强文章的动感。
- 构建人物形象：通过细节描写，塑造生动的人物形象。
- 营造对比冲突：通过制造对比冲突，增强情节的张力。
- 运用倒叙手法：使用倒叙手法，使故事结构更加多样化。
- 嵌入哲理思考：在叙述中融入哲理思考，增加文章的深度。
- 使用重复句式：通过重复句式，增强文章的力量感。
- 引入视觉细节：通过增加视觉细节，使场景更加生动。
- 制造反差：通过制造强烈的反差，增加文章的戏剧效果。
- 使用简短句式：通过简短句式，增强文章的冲击力。
- 通过细节刻画人物：细腻的细节描写，使人物更加立体生动。
- 使用情感铺垫：通过情感铺垫，为后续情节发展做准备。
- 逐层递进：从浅到深逐步展开，增强文章的层次感。
- 运用时间顺序：通过时间顺序，使叙事更加清晰流畅。
- 加入自然描写：通过描写自然景物，增强文章的画面感。
- 使用隐含对比：通过隐含对比，增加文章的深度和趣味。
- 增加环境描写：丰富环境描写，增强文章的现场感。
- 适度幽默：通过适度幽默，增加文章的轻松感。
- 强调现实基础：通过引用现实案例，增强文章的可信度。
- 设计悬疑结尾：通过悬疑结尾，引发读者的好奇心。
- 运用象征手法：通过象征手法，增加文章的象征意义。
- 增强互动性：通过问题或呼吁，增强读者的参与感。
- 利用故事开头：通过讲述故事开头，引发读者兴趣。
- 制造紧张气氛：通过紧张的情节设置，增强文章的紧迫感。
- 增强表达层次：通过多层次的表达，丰富文章的内容。
- 合理使用比喻：通过比喻手法，使抽象概念形象化。
- 增加文化元素：融入文化元素，增强文章的深度和背景感。
- 制造轻松氛围：通过轻松的语言和情境，缓解读者的阅读压力。
- 使用直接对话：通过直接对话，使人物交流更加真实。
- 通过悬念吸引：在开头设置悬念，吸引读者的注意力。
- 合理引入矛盾：通过矛盾冲突，增加文章的戏剧性。
- 使用具体例子：通过具体例子说明抽象问题，增强文章的实用性。
- 通过情境塑造：通过具体情境的塑造，使情节更有代入感。

请务必遵循以上所有要求，使文章读起来像真人作家所写，避免任何机械、生硬、模板化的表达。"""

        def task():
            llm = self.get_llm()
            for ch in chapter_list:
                bp = self.chapter_blueprints.get(ch, "")
                if not bp:
                    self.log_to_write(f"第{ch}章蓝图缺失，跳过")
                    continue
                ch_title = self.extract_chapter_title(bp)
                self.log_to_write(f"正在撰写第{ch}章「{ch_title}」草稿...")
                prompt = f"""你是一位小说家，请根据以下蓝图扩写成完整的章节内容（约{self.words_per_chapter.get()}字）。
蓝图：
{bp}
{deai_prompt}
要求：语言流畅，描写生动，直接输出章节正文。章节开头格式为“第{ch}章 {ch_title}”"""
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
            self.root.after(0, lambda: self.log_to_write(f"指定章节生成完成"))
        threading.Thread(target=task, daemon=True).start()

    def merge_all_chapters_to_full_document(self):
        """将所有章节按顺序合并成一个完整文档，保存为“小说书名.txt”"""
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
                chapters_content.append(self.chapter_drafts[ch])
            else:
                self.log_to_write(f"警告：第{ch}章内容未找到，可能生成失败")
                chapters_content.append(f"【第{ch}章内容缺失】")

        full_text = "\n\n".join(chapters_content)
        with open(full_filepath, 'w', encoding='utf-8') as f:
            f.write(full_text)
        self.log_to_write(f"完整文档已保存至：{full_filepath}")
        messagebox.showinfo("完成", f"全部章节已生成完毕，完整文档保存为：{full_filepath}")

    # 重写“生成全部草稿”按钮的逻辑
    def gen_all_drafts(self):
        if not self.chapter_blueprints:
            messagebox.showwarning("提示", "请先执行Step2生成蓝图")
            return
        total = self.chapter_num.get()
        save_dir = self.save_path.get()
        os.makedirs(save_dir, exist_ok=True)

        existing = self.get_existing_chapters(save_dir)
        missing = [ch for ch in range(1, total+1) if ch not in existing]

        if not missing:
            messagebox.showinfo("提示", f"所有章节文件均已存在，无需生成。\n将直接合并完整文档。")
            # 仍然合并完整文档
            self.merge_all_chapters_to_full_document()
            return

        self.log_to_write(f"检测到已存在章节: {sorted(existing)}，需要生成缺失章节: {missing}")
        # 生成缺失章节
        self.generate_chapters_by_list(missing)
        # 等待生成完成后合并（因为generate_chapters_by_list是异步的，需要延迟合并）
        # 最简单的方法：在generate_chapters_by_list的最后调用合并，但那里是线程内，需使用after
        # 我们修改generate_chapters_by_list，在任务完成后调用合并。但为了不影响其他调用，在gen_all_drafts中单独启动一个轮询检查
        # 这里采用简单方式：在generate_chapters_by_list内部，生成完所有章节后调用合并。
        # 但generate_chapters_by_list是通用的，可能被部分草稿调用，只有全部草稿才需要合并。
        # 我们增加一个参数来控制是否合并。为了保持代码清晰，我们在gen_all_drafts中启动一个线程来等待生成完成然后合并。
        def wait_and_merge():
            # 等待所有缺失章节生成完成（简单轮询检查文件是否存在）
            while True:
                time.sleep(2)
                current_existing = self.get_existing_chapters(save_dir)
                if all(ch in current_existing for ch in missing):
                    break
            self.root.after(0, self.merge_all_chapters_to_full_document)
        threading.Thread(target=wait_and_merge, daemon=True).start()

    # 新增“生成部分草稿”按钮逻辑
    def gen_partial_drafts(self):
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
        existing = self.get_existing_chapters(save_dir)
        needed = [ch for ch in range(start, end+1) if ch not in existing]

        if not needed:
            messagebox.showinfo("提示", f"章节 {start}-{end} 范围内所有文件均已存在，无需生成。")
            return

        self.log_to_write(f"指定范围 {start}-{end}，已存在 {existing & set(range(start, end+1))}，需要生成 {needed}")
        self.generate_chapters_by_list(needed)
        # 如果用户生成的范围包含最后一章（即end == total），则合并完整文档
        if end == total:
            # 需要等待生成完成后再合并
            def wait_and_merge():
                while True:
                    time.sleep(2)
                    current_existing = self.get_existing_chapters(save_dir)
                    if all(ch in current_existing for ch in needed):
                        break
                self.root.after(0, self.merge_all_chapters_to_full_document)
            threading.Thread(target=wait_and_merge, daemon=True).start()

    # 保留原有的 gen_drafts_range 方法（以防其他地方调用，但不再使用）
    def gen_drafts_range(self, start, end):
        # 此方法已弃用，但保留避免错误
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