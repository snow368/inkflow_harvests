import { useEffect, useMemo, useState } from "react";
import {
  MessageSquare,
  Plus,
  Loader2,
  Search,
  Send,
  User,
  Store,
  HelpCircle,
  TrendingUp,
  AlertTriangle,
  Sparkles,
  Wallet,
  ShieldCheck,
  GitCompare,
  ThumbsUp,
  CircleDashed,
  Globe,
  Copy,
  Check,
  Phone,
  Link2,
  AtSign,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  upsertChat,
  listChats,
  getChat,
  updateChat,
  addChatMessages,
  detectCountry,
  type ChatDTO,
  type ChatMessageDTO,
  type CustomerType,
  type DealStage,
  type ChatSignal,
  type ChatListResponse,
  type ChatThreadResponse,
  type CountryStrategyDTO,
  type CountryDetectionDTO,
  type ContactInput,
  getLocalTerms,
  adoptLocalTerm,
  removeLocalTerm,
  type LocalTermsResponse,
  suggestReply,
  type SuggestReplyResult,
} from "@/lib/aicore";

// Sales conversations are OUR deals (not competitor intel), so they live in a
// dedicated tenant. Dev (snow368) can access any tenant.
const SALES_TENANT = "sales";

const STAGE_LABEL: Record<DealStage, string> = {
  inquiry: "咨询",
  compare: "比价",
  hesitate: "犹豫",
  ready: "准备下单",
  won: "已成交",
  lost: "流失",
};
const STAGE_COLOR: Record<DealStage, string> = {
  inquiry: "bg-zinc-700 text-zinc-200",
  compare: "bg-amber-600/20 text-amber-300 border border-amber-600/30",
  hesitate: "bg-orange-600/20 text-orange-300 border border-orange-600/30",
  ready: "bg-emerald-600/20 text-emerald-300 border border-emerald-600/30",
  won: "bg-rose-600/20 text-rose-300 border border-rose-600/30",
  lost: "bg-zinc-800 text-zinc-500 border border-zinc-700",
};
const TYPE_LABEL: Record<CustomerType, string> = {
  wholesaler: "批发商",
  artist: "纹身师",
  unknown: "未知",
};
const SIGNAL_LABEL: Record<ChatSignal, { label: string; icon: React.ReactNode; cls: string }> = {
  objection: { label: "顾虑", icon: <AlertTriangle className="w-3 h-3" />, cls: "bg-red-500/15 text-red-300 border border-red-500/25" },
  price_sensitive: { label: "价格敏感", icon: <Wallet className="w-3 h-3" />, cls: "bg-amber-500/15 text-amber-300 border border-amber-500/25" },
  purchase_intent: { label: "购买意向", icon: <TrendingUp className="w-3 h-3" />, cls: "bg-sky-500/15 text-sky-300 border border-sky-500/25" },
  hesitation: { label: "犹豫", icon: <CircleDashed className="w-3 h-3" />, cls: "bg-orange-500/15 text-orange-300 border border-orange-500/25" },
  ready_to_buy: { label: "准备下单", icon: <ThumbsUp className="w-3 h-3" />, cls: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/25" },
  wholesale_interest: { label: "批发意向", icon: <Store className="w-3 h-3" />, cls: "bg-indigo-500/15 text-indigo-300 border border-indigo-500/25" },
  product_question: { label: "产品咨询", icon: <HelpCircle className="w-3 h-3" />, cls: "bg-blue-500/15 text-blue-300 border border-blue-500/25" },
  trust_concern: { label: "信任顾虑", icon: <ShieldCheck className="w-3 h-3" />, cls: "bg-purple-500/15 text-purple-300 border border-purple-500/25" },
  competitor_mention: { label: "竞品比价", icon: <GitCompare className="w-3 h-3" />, cls: "bg-pink-500/15 text-pink-300 border border-pink-500/25" },
};
const SENTIMENT_COLOR = {
  positive: "text-emerald-400",
  negative: "text-red-400",
  neutral: "text-zinc-400",
};

const PLATFORMS = ["whatsapp", "instagram", "facebook", "telegram", "wechat", "other"];
const LOCALES = ["it", "en", "zh", "es", "fr", "de", "other"];

export default function SalesChat() {
  const [data, setData] = useState<ChatListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [thread, setThread] = useState<ChatThreadResponse | null>(null);
  const [threadLoading, setThreadLoading] = useState(false);

  const [filters, setFilters] = useState({ customer_type: "all", deal_stage: "all", platform: "all", locale: "all", country: "all", q: "" });
  const [showNew, setShowNew] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await listChats(SALES_TENANT, filters);
      setData(r);
      if (!selectedId && r.chats.length > 0) setSelectedId(r.chats[0].id);
    } catch (e) {
      toast.error("加载会话失败", { description: (e as Error).message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.customer_type, filters.deal_stage, filters.platform, filters.locale, filters.country]);

  const openThread = async (id: string) => {
    setSelectedId(id);
    setThreadLoading(true);
    try {
      const t = await getChat(SALES_TENANT, id);
      setThread(t);
    } catch (e) {
      toast.error("加载会话详情失败", { description: (e as Error).message });
    } finally {
      setThreadLoading(false);
    }
  };

  useEffect(() => {
    if (selectedId) openThread(selectedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const stats = data?.stats;
  const typeBreakdown = stats
    ? (["wholesaler", "artist", "unknown"] as CustomerType[]).map((t) => ({ t, n: stats.byType[t] ?? 0 }))
    : [];
  const stageBreakdown = stats
    ? (["inquiry", "compare", "hesitate", "ready", "won", "lost"] as DealStage[]).map((s) => ({ s, n: stats.byStage[s] ?? 0 }))
    : [];
  const countryBreakdown = stats
    ? Object.entries(stats.byCountry).map(([c, n]) => ({ c, n })).sort((a, b) => b.n - a.n)
    : [];
  const topSignals = useMemo(() => {
    if (!stats) return [];
    return Object.entries(stats.signalCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6) as [ChatSignal, number][];
  }, [stats]);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3">
        {stageBreakdown.map(({ s, n }) => (
          <button
            key={s}
            onClick={() => setFilters((f) => ({ ...f, deal_stage: f.deal_stage === s ? "all" : s }))}
            className={cn(
              "rounded-xl border px-3 py-3 text-left transition-all",
              filters.deal_stage === s ? "border-rose-500/40 bg-rose-500/10" : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700"
            )}
          >
            <div className="text-[10px] uppercase tracking-wider text-zinc-500">{STAGE_LABEL[s]}</div>
            <div className="text-2xl font-bold text-white mt-1">{n}</div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: list + filters */}
        <div className="lg:col-span-1 space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                value={filters.q}
                onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && load()}
                placeholder="搜客户 handle..."
                className="w-full pl-9 pr-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-100 outline-none focus:border-rose-500/50"
              />
            </div>
            <button
              onClick={() => setShowNew((v) => !v)}
              className="px-3 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-sm font-semibold flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> 新建
            </button>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <select value={filters.customer_type} onChange={(e) => setFilters((f) => ({ ...f, customer_type: e.target.value }))}
              className="bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-zinc-300 outline-none">
              <option value="all">身份: 全部</option>
              <option value="wholesaler">批发商</option>
              <option value="artist">纹身师</option>
              <option value="unknown">未知</option>
            </select>
            <select value={filters.platform} onChange={(e) => setFilters((f) => ({ ...f, platform: e.target.value }))}
              className="bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-zinc-300 outline-none">
              <option value="all">渠道: 全部</option>
              {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <select value={filters.locale} onChange={(e) => setFilters((f) => ({ ...f, locale: e.target.value }))}
              className="bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-zinc-300 outline-none">
              <option value="all">语言: 全部</option>
              {LOCALES.map((l) => <option key={l} value={l}>{l.toUpperCase()}</option>)}
            </select>
            <select value={filters.country} onChange={(e) => setFilters((f) => ({ ...f, country: e.target.value }))}
              className="bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-zinc-300 outline-none">
              <option value="all">国家: 全部</option>
              {Object.keys(COUNTRY_FLAG).map((c) => <option key={c} value={c}>{COUNTRY_FLAG[c]} {COUNTRY_NAME[c]}</option>)}
            </select>
          </div>

          {showNew && <NewChatForm tenant={SALES_TENANT} onCreated={(id) => { setShowNew(false); load().then(() => openThread(id)); }} />}

          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
            {loading && <div className="flex items-center gap-2 text-zinc-500 text-sm p-4"><Loader2 className="w-4 h-4 animate-spin" /> 加载中…</div>}
            {!loading && data?.chats.length === 0 && (
              <div className="text-zinc-500 text-sm p-4 text-center border border-dashed border-zinc-800 rounded-xl">
                还没有会话。点「新建」录入第一笔意大利客户聊天。
              </div>
            )}
            {data?.chats.map((c) => (
              <button key={c.id} onClick={() => openThread(c.id)}
                className={cn(
                  "w-full text-left rounded-xl border px-3 py-3 transition-all",
                  selectedId === c.id ? "border-rose-500/40 bg-rose-500/10" : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700"
                )}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-zinc-100 truncate">{c.customer_handle}</span>
                  <span className={cn("text-[10px] px-1.5 py-0.5 rounded", STAGE_COLOR[c.deal_stage])}>{STAGE_LABEL[c.deal_stage]}</span>
                </div>
                <div className="flex items-center gap-2 mt-1 text-[11px] text-zinc-500">
                  <span className={cn("px-1.5 py-0.5 rounded", c.customer_type === "wholesaler" ? "bg-indigo-500/15 text-indigo-300" : c.customer_type === "artist" ? "bg-blue-500/15 text-blue-300" : "bg-zinc-700 text-zinc-300")}>
                    {TYPE_LABEL[c.customer_type]}
                  </span>
                  <span>{c.platform}</span>
                  <span>· {c.locale.toUpperCase()}</span>
                  {c.last_message_at && <span>· {new Date(c.last_message_at).toLocaleDateString()}</span>}
                </div>
              </button>
            ))}
          </div>

          {/* Type / signal breakdown */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 space-y-3">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1.5">身份分布</div>
              <div className="flex gap-2">
                {typeBreakdown.map(({ t, n }) => (
                  <div key={t} className="flex-1 text-center rounded-lg bg-zinc-900 border border-zinc-800 py-2">
                    <div className="text-lg font-bold text-white">{n}</div>
                    <div className="text-[10px] text-zinc-500">{TYPE_LABEL[t]}</div>
                  </div>
                ))}
              </div>
            </div>
            {countryBreakdown.length > 0 && (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1.5">国家分布</div>
                <div className="flex flex-wrap gap-1.5">
                  {countryBreakdown.map(({ c, n }) => (
                    <button key={c} onClick={() => setFilters((f) => ({ ...f, country: f.country === c ? "all" : c }))}
                      className={cn("inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded border",
                        filters.country === c ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" : "border-zinc-800 bg-zinc-900 text-zinc-300")}>
                      {COUNTRY_FLAG[c] ?? "🌐"} {COUNTRY_NAME[c] ?? c} <b>{n}</b>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {topSignals.length > 0 && (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1.5">高频信号</div>
                <div className="flex flex-wrap gap-1.5">
                  {topSignals.map(([sig, n]) => (
                    <span key={sig} className={cn("inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded", SIGNAL_LABEL[sig].cls)}>
                      {SIGNAL_LABEL[sig].icon} {SIGNAL_LABEL[sig].label} <b>{n}</b>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: thread detail */}
        <div className="lg:col-span-2">
          {!selectedId && <div className="rounded-xl border border-dashed border-zinc-800 p-10 text-center text-zinc-500">选择左侧会话查看详情</div>}
          {selectedId && threadLoading && <div className="flex items-center gap-2 text-zinc-500 p-10"><Loader2 className="w-5 h-5 animate-spin" /> 加载会话…</div>}
          {selectedId && !threadLoading && thread && (
            <ThreadDetail tenant={SALES_TENANT} thread={thread} onChanged={() => { load(); openThread(selectedId); }} />
          )}
        </div>
      </div>
    </div>
  );
}

const COUNTRY_FLAG: Record<string, string> = {
  IT: "🇮🇹", US: "🇺🇸", GB: "🇬🇧", DE: "🇩🇪", FR: "🇫🇷", ES: "🇪🇸",
  BR: "🇧🇷", MX: "🇲🇽", JP: "🇯🇵", AU: "🇦🇺", NL: "🇳🇱",
};
const COUNTRY_NAME: Record<string, string> = {
  IT: "意大利", US: "美国", GB: "英国", DE: "德国", FR: "法国", ES: "西班牙",
  BR: "巴西", MX: "墨西哥", JP: "日本", AU: "澳大利亚", NL: "荷兰",
};
const CONF_LABEL: Record<CountryDetectionDTO["confidence"], string> = {
  high: "高", medium: "中", low: "低", none: "未识别",
};

function NewChatForm({ tenant, onCreated }: { tenant: string; onCreated: (id: string) => void }) {
  const [handle, setHandle] = useState("");
  const [type, setType] = useState<CustomerType>("unknown");
  const [platform, setPlatform] = useState("whatsapp");
  const [locale, setLocale] = useState("it");
  const [contact, setContact] = useState<ContactInput>({});
  const [detecting, setDetecting] = useState(false);
  const [detected, setDetected] = useState<{ detection: CountryDetectionDTO; country: CountryStrategyDTO | null } | null>(null);
  const [saving, setSaving] = useState(false);

  // Live country detection — highest-confidence signal wins (WhatsApp > website).
  const runDetect = async () => {
    if (!contact.whatsapp && !contact.website && !contact.instagram && !contact.facebook) return;
    setDetecting(true);
    try {
      const r = await detectCountry(tenant, contact);
      setDetected({ detection: r.detection, country: r.country });
      if (r.country?.locales?.[0]) setLocale(r.country.locales[0]); // auto-pick locale
    } catch {
      /* silent */
    } finally {
      setDetecting(false);
    }
  };

  const submit = async () => {
    if (!handle.trim()) return;
    setSaving(true);
    try {
      const r = await upsertChat(tenant, {
        customer_handle: handle.trim(),
        customer_type: type,
        platform,
        locale,
        contact,
        country: detected?.country?.code ?? null,
      });
      if (r.chat) {
        toast.success("会话已创建");
        onCreated(r.chat.id);
      } else throw new Error(r.error || "创建失败");
    } catch (e) {
      toast.error("创建失败", { description: (e as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const setField = (k: keyof ContactInput, v: string) => setContact((c) => ({ ...c, [k]: v }));

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 space-y-2">
      <div className="text-xs font-semibold text-zinc-300">新建会话（自动识别国家）</div>
      <input value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="客户 handle / 姓名"
        className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-100 outline-none focus:border-rose-500/50" />

      {/* Contact signals → country detection */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-[11px] text-zinc-500">
          <Globe className="w-3.5 h-3.5" /> 联系方式（自动识别国家 · WhatsApp/网站优先）
          {detecting && <Loader2 className="w-3 h-3 animate-spin" />}
        </div>
        <div className="flex items-center gap-1.5">
          <Phone className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
          <input value={contact.whatsapp ?? ""} onChange={(e) => setField("whatsapp", e.target.value)} onBlur={runDetect}
            placeholder="+39 333 1234567" className="flex-1 px-2 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-100 outline-none focus:border-rose-500/50" />
        </div>
        <div className="flex items-center gap-1.5">
          <Link2 className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
          <input value={contact.website ?? ""} onChange={(e) => setField("website", e.target.value)} onBlur={runDetect}
            placeholder="shop-tattoo.it" className="flex-1 px-2 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-100 outline-none focus:border-rose-500/50" />
        </div>
        <div className="flex items-center gap-1.5">
          <AtSign className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
          <input value={contact.instagram ?? ""} onChange={(e) => setField("instagram", e.target.value)} onBlur={runDetect}
            placeholder="@instagram" className="flex-1 px-2 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-100 outline-none focus:border-rose-500/50" />
        </div>
        <textarea value={contact.bio ?? ""} onChange={(e) => setField("bio", e.target.value)} onBlur={runDetect}
          placeholder="粘贴 IG/FB 简介或网站联系地址（含城市/国家即可识别，例：Based in Berlin · Deutschland）"
          rows={2} className="w-full px-2 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-100 outline-none focus:border-rose-500/50 resize-none" />
      </div>

      {/* Detected country badge */}
      {detected && (
        <div className={cn("rounded-lg px-2.5 py-1.5 text-xs flex items-center gap-2",
          detected.country ? "bg-emerald-500/10 border border-emerald-500/25 text-emerald-300"
            : "bg-zinc-800 border border-zinc-700 text-zinc-400")}>
          {detected.country ? (
            <>
              <span className="text-base">{detected.country.flag}</span>
              <span className="font-semibold">{detected.country.name}</span>
              <span className="text-[10px] opacity-70">置信度 {CONF_LABEL[detected.detection.confidence]}（{detected.detection.source}）</span>
              <span className="ml-auto text-[10px] text-zinc-400">语言→ {detected.country.locales[0].toUpperCase()}</span>
            </>
          ) : (
            <span>{detected.detection.note ?? "未能识别国家，已默认英语分析"}</span>
          )}
        </div>
      )}

      <div className="flex gap-2 text-xs">
        <select value={type} onChange={(e) => setType(e.target.value as CustomerType)} className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-zinc-300 outline-none">
          <option value="unknown">身份: 未知</option>
          <option value="wholesaler">批发商</option>
          <option value="artist">纹身师</option>
        </select>
        <select value={platform} onChange={(e) => setPlatform(e.target.value)} className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-zinc-300 outline-none">
          {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={locale} onChange={(e) => setLocale(e.target.value)} className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-zinc-300 outline-none">
          {LOCALES.map((l) => <option key={l} value={l}>{l.toUpperCase()}</option>)}
        </select>
      </div>
      <button onClick={submit} disabled={saving || !handle.trim()}
        className="w-full px-3 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-1">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} 创建并录入
      </button>
    </div>
  );
}

function CountryStrategyPanel({ tenant, chat }: { tenant: string; chat: ChatDTO }) {
  const [strategy, setStrategy] = useState<CountryStrategyDTO | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [terms, setTerms] = useState<LocalTermsResponse | null>(null);
  const [mining, setMining] = useState(false);
  const [adopting, setAdopting] = useState<string | null>(null);
  const [copiedTerm, setCopiedTerm] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setTerms(null);
    // Prefer the already-stored country code (covers bio/address-only detections).
    if (chat.country) {
      detectCountry(tenant, { country: chat.country })
        .then((r) => { if (active) setStrategy(r.country); })
        .catch(() => {});
      return () => { active = false; };
    }
    const contact: ContactInput = {
      whatsapp: chat.whatsapp ?? undefined,
      website: chat.website ?? undefined,
      instagram: chat.instagram ?? undefined,
      facebook: chat.facebook ?? undefined,
    };
    if (contact.whatsapp || contact.website || contact.instagram || contact.facebook) {
      detectCountry(tenant, contact)
        .then((r) => { if (active) setStrategy(r.country); })
        .catch(() => {});
    } else {
      setStrategy(null);
    }
    return () => { active = false; };
  }, [tenant, chat.id, chat.country, chat.whatsapp, chat.website, chat.instagram, chat.facebook]);

  if (!strategy) return null;
  const countryCode = chat.country ?? strategy.code;

  const mine = async () => {
    setMining(true);
    try {
      const r = await getLocalTerms(tenant, countryCode);
      setTerms(r);
    } catch (e) {
      toast.error("挖掘本土用语失败", { description: (e as Error).message });
    } finally {
      setMining(false);
    }
  };

  const copyTerm = (term: string) => {
    navigator.clipboard?.writeText(term);
    setCopiedTerm(term);
    setTimeout(() => setCopiedTerm(null), 1500);
  };

  const adopt = async (term: string, example: string) => {
    setAdopting(term);
    try {
      await adoptLocalTerm(tenant, countryCode, term, example);
      toast.success("已采纳到本行业词库");
      await mine(); // refresh both lists
    } catch (e) {
      toast.error("采纳失败", { description: (e as Error).message });
    } finally {
      setAdopting(null);
    }
  };

  const remove = async (term: string) => {
    try {
      await removeLocalTerm(tenant, countryCode, term);
      toast.success("已移除");
      await mine();
    } catch (e) {
      toast.error("移除失败", { description: (e as Error).message });
    }
  };

  const fill = (t: string) =>
    t.replace(/\{handle\}/g, chat.customer_handle).replace(/\{product\}/g, "无线纹身机").replace(/\{price\}/g, "");
  const copy = (key: string, text: string) => {
    navigator.clipboard?.writeText(fill(text));
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  const scripts: { key: string; label: string; text: string }[] = [
    { key: "opener", label: "开场白", text: strategy.scripts.opener },
    { key: "followUp", label: "跟进", text: strategy.scripts.followUp },
    { key: "objectionPrice", label: "价格异议", text: strategy.scripts.objectionPrice },
    { key: "closing", label: "逼单", text: strategy.scripts.closing },
  ];

  return (
    <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Globe className="w-4 h-4 text-emerald-400" />
        <span className="text-sm font-semibold text-emerald-300">{strategy.flag} {strategy.name} · 聊单策略</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg bg-zinc-900/60 border border-zinc-800 p-2">
          <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">语气定调</div>
          <p className="text-zinc-300">{strategy.tone}</p>
        </div>
        <div className="rounded-lg bg-zinc-900/60 border border-zinc-800 p-2">
          <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">关系建立</div>
          <p className="text-zinc-300">{strategy.relationshipStyle}</p>
        </div>
        <div className="rounded-lg bg-zinc-900/60 border border-zinc-800 p-2">
          <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">付款习惯</div>
          <p className="text-zinc-300">{strategy.paymentNorms}</p>
        </div>
        <div className="rounded-lg bg-zinc-900/60 border border-zinc-800 p-2">
          <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">MOQ 预期</div>
          <p className="text-zinc-300">{strategy.moqExpectation}</p>
        </div>
      </div>
      <div className="rounded-lg bg-zinc-900/60 border border-zinc-800 p-2 text-xs">
        <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">物流注意</div>
        <p className="text-zinc-300">{strategy.shippingNotes}</p>
      </div>

      <div>
        <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1.5">本土用语（手写策略库，可直接用）</div>
        <div className="flex flex-wrap gap-1.5">
          {strategy.localExpressions.map((e) => (
            <span key={e.phrase} title={e.meaning} className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-200">
              {e.phrase} <span className="text-zinc-500">· {e.meaning}</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── Native-term mining ── */}
      <div className="rounded-lg border border-rose-500/25 bg-rose-500/5 p-2 space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-[10px] uppercase tracking-wider text-rose-300/80">本土用语挖掘（从本行业真实聊天/评论挖）</div>
          <button onClick={mine} disabled={mining}
            className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white">
            {mining ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} 挖本土用语
          </button>
        </div>

        {terms && terms.live.length === 0 && terms.adopted.length === 0 && (
          <div className="text-[11px] text-zinc-500">该国家暂无足够语料可挖。先多录入一些该国聊天 / 评论。</div>
        )}

        {terms && terms.live.length > 0 && (
          <div className="space-y-1">
            <div className="text-[10px] text-zinc-500">实时挖掘 Top {terms.live.length}（频次 · 本土性 · 脱敏例句）</div>
            {terms.live.map((t) => (
              <div key={t.term} className="flex items-center gap-2 rounded-md bg-zinc-900/60 border border-zinc-800 px-2 py-1">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-zinc-100">{t.term}</span>
                    <span className="text-[10px] text-zinc-500">×{t.count}</span>
                    <span className="text-[10px] text-emerald-400/80">本土 {Math.round(t.specificity * 100)}%</span>
                  </div>
                  {t.example && <p className="text-[10px] text-zinc-500 truncate">“{t.example}”</p>}
                </div>
                <button onClick={() => copyTerm(t.term)} title="复制"
                  className="shrink-0 p-1 rounded hover:bg-zinc-700 text-zinc-400">
                  {copiedTerm === t.term ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <button onClick={() => adopt(t.term, t.example)} disabled={adopting === t.term} title="采纳进本行业词库"
                  className="shrink-0 px-1.5 py-0.5 rounded text-[10px] bg-emerald-600/80 hover:bg-emerald-500 disabled:opacity-40 text-white">
                  {adopting === t.term ? "…" : "采纳"}
                </button>
              </div>
            ))}
          </div>
        )}

        {terms && terms.adopted.length > 0 && (
          <div className="space-y-1">
            <div className="text-[10px] text-zinc-500">已采纳（本行业持久化 · {terms.adopted.length}）</div>
            <div className="flex flex-wrap gap-1.5">
              {terms.adopted.map((a) => (
                <span key={a.term} className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-200">
                  {a.term}
                  <button onClick={() => remove(a.term)} title="移除" className="text-emerald-400/70 hover:text-rose-300">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div>
        <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1.5">话术模板（点击复制，自动填入客户名）</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {scripts.map((s) => (
            <button key={s.key} onClick={() => copy(s.key, s.text)}
              className="text-left rounded-lg bg-zinc-900/60 border border-zinc-800 hover:border-emerald-500/40 p-2 transition-all">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-semibold text-emerald-300">{s.label}</span>
                {copied === s.key ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-500" />}
              </div>
              <p className="text-[11px] text-zinc-400 line-clamp-2">{fill(s.text)}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ThreadDetail({ tenant, thread, onChanged }: { tenant: string; thread: ChatThreadResponse; onChanged: () => void }) {
  const { chat, messages } = thread;
  const [stage, setStage] = useState<DealStage>(chat.deal_stage);
  const [body, setBody] = useState("");
  const [role, setRole] = useState<"customer" | "agent">("customer");
  const [saving, setSaving] = useState(false);
  const [reply, setReply] = useState<SuggestReplyResult | null>(null);
  const [replying, setReplying] = useState(false);
  const [replyCopied, setReplyCopied] = useState(false);

  const changeStage = async (s: DealStage) => {
    setStage(s);
    try {
      await updateChat(tenant, chat.id, { deal_stage: s });
      toast.success("阶段已更新");
      onChanged();
    } catch (e) {
      toast.error("更新失败", { description: (e as Error).message });
    }
  };

  const addMsg = async () => {
    if (!body.trim()) return;
    setSaving(true);
    try {
      await addChatMessages(tenant, chat.id, [{ role, body: body.trim() }]);
      setBody("");
      toast.success("消息已分析入库");
      onChanged();
    } catch (e) {
      toast.error("添加失败", { description: (e as Error).message });
    } finally {
      setSaving(false);
    }
  };

  // LLM-grounded, native-language reply suggestion. NEVER sends — the rep
  // copies & edits before sending. Uses the worker AI binding when present.
  const genReply = async () => {
    setReplying(true);
    setReplyCopied(false);
    try {
      const r = await suggestReply(tenant, chat.id, {});
      setReply(r);
    } catch (e) {
      toast.error("生成失败", { description: (e as Error).message });
    } finally {
      setReplying(false);
    }
  };

  const copyReply = async () => {
    if (!reply) return;
    try {
      await navigator.clipboard.writeText(reply.reply);
      setReplyCopied(true);
      toast.success("已复制回复建议");
      setTimeout(() => setReplyCopied(false), 1500);
    } catch {
      toast.error("复制失败");
    }
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-rose-400" />
            <span className="text-lg font-bold text-white">{chat.customer_handle}</span>
            <span className={cn("text-[11px] px-1.5 py-0.5 rounded", chat.customer_type === "wholesaler" ? "bg-indigo-500/15 text-indigo-300" : chat.customer_type === "artist" ? "bg-blue-500/15 text-blue-300" : "bg-zinc-700 text-zinc-300")}>
              {TYPE_LABEL[chat.customer_type]}
            </span>
            <span className="text-[11px] text-zinc-500">{chat.platform} · {chat.locale.toUpperCase()}</span>
            {chat.country && COUNTRY_FLAG[chat.country] && (
              <span title={COUNTRY_NAME[chat.country]} className="text-base">{COUNTRY_FLAG[chat.country]}</span>
            )}
          </div>
          {chat.summary && <p className="text-xs text-zinc-400 mt-1">{chat.summary}</p>}
        </div>
        <select value={stage} onChange={(e) => changeStage(e.target.value as DealStage)}
          className={cn("text-xs font-semibold rounded-lg px-2 py-1.5 bg-zinc-900 border outline-none", STAGE_COLOR[stage])}>
          {(["inquiry", "compare", "hesitate", "ready", "won", "lost"] as DealStage[]).map((s) => (
            <option key={s} value={s} className="bg-zinc-900 text-zinc-100">{STAGE_LABEL[s]}</option>
          ))}
        </select>
      </div>

      {/* messages */}
      <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
        {messages.length === 0 && <div className="text-zinc-500 text-sm text-center py-6">暂无消息，在下方录入聊天内容</div>}
        {messages.map((m) => (
          <div key={m.id} className={cn("flex", m.role === "agent" ? "justify-end" : "justify-start")}>
            <div className={cn("max-w-[80%] rounded-2xl px-3 py-2 border", m.role === "agent" ? "bg-rose-600/10 border-rose-500/20" : "bg-zinc-800/60 border-zinc-700")}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] uppercase text-zinc-500">{m.role === "agent" ? "我方" : "客户"}</span>
                <span className={cn("text-[10px]", SENTIMENT_COLOR[m.sentiment])}>{m.sentiment}</span>
              </div>
              <p className="text-sm text-zinc-100 whitespace-pre-wrap">{m.body}</p>
              {m.signals.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {m.signals.map((s) => (
                    <span key={s} className={cn("inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded", SIGNAL_LABEL[s].cls)}>
                      {SIGNAL_LABEL[s].icon} {SIGNAL_LABEL[s].label}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* add message */}
      <div className="border-t border-zinc-800 pt-3 space-y-2">
        <div className="flex gap-2 text-xs">
          <select value={role} onChange={(e) => setRole(e.target.value as "customer" | "agent")}
            className="bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-zinc-300 outline-none">
            <option value="customer">客户说</option>
            <option value="agent">我方说</option>
          </select>
          <span className="text-zinc-500 self-center">意大利语/本土表达会被自动分析情感与信号</span>
        </div>
        <div className="flex gap-2">
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={2} placeholder="粘贴或输入一条聊天内容…"
            className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-100 outline-none focus:border-rose-500/50 resize-none" />
          <button onClick={addMsg} disabled={saving || !body.trim()}
            className="px-4 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white rounded-lg text-sm font-semibold flex items-center gap-1">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} 分析入库
          </button>
        </div>
      </div>

      {/* AI 回复建议（仅建议，不自动发送） */}
      <div className="border-t border-zinc-800 pt-3 space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <button
            onClick={genReply}
            disabled={replying}
            className="px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-1.5 bg-gradient-to-r from-violet-600 to-rose-600 hover:opacity-90 disabled:opacity-40 text-white"
          >
            {replying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            生成回复建议（{chat.locale.toUpperCase()}）
          </button>
          <span className="text-[11px] text-zinc-500">仅建议，不自动发送 · 复制后人工编辑再发</span>
        </div>
        {reply && (
          <div className="rounded-lg border border-violet-500/30 bg-violet-500/5 p-3 space-y-2">
            <div className="flex items-center gap-2 text-[11px] flex-wrap">
              <span className={cn("px-1.5 py-0.5 rounded", reply.engine === "llm" ? "bg-violet-500/20 text-violet-200" : "bg-amber-500/20 text-amber-200")}>
                {reply.engine === "llm" ? "AI 生成" : "话术模板"}
              </span>
              {reply.countryName && <span className="text-zinc-400">{reply.countryName}</span>}
              <span className="text-zinc-500">· {reply.locale.toUpperCase()}</span>
              {reply.notes && <span className="text-zinc-500">· {reply.notes}</span>}
            </div>
            <p className="text-sm text-zinc-100 whitespace-pre-wrap">{reply.reply}</p>
            <button onClick={copyReply} className="text-xs self-start flex items-center gap-1 text-violet-300 hover:text-violet-200">
              {replyCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {replyCopied ? "已复制" : "复制回复"}
            </button>
          </div>
        )}
      </div>

      <CountryStrategyPanel tenant={tenant} chat={chat} />
    </div>
  );
}
