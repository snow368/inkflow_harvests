// Thin client for the Harvests AI Core API, routed through the Pages Function
// reverse-proxy at /harvests/* (same-origin on harvests.pages.dev, so no CORS).
// In local `vite dev` the same /harvests path is proxied to the worker (see
// vite.config.ts). Auth is the dev bearer token — this is an internal tool.

const AI_CORE_PREFIX = "/harvests";

export interface MemoryItemDTO {
  id: string;
  tenant_id: string;
  type: string;
  title: string;
  content: string;
  metadata: Record<string, unknown>;
  entity_id?: string;
  source?: string;
  created_at: string;
  updated_at: string;
}

export interface MemoryListResponse {
  items: MemoryItemDTO[];
  total: number;
  limit: number;
  offset: number;
  tenant: string;
  type: string;
}

export interface ImportSummary {
  imported?: number;
  memory_ids?: string[];
  skipped?: number;
  errors?: string[];
  total?: number;
  [key: string]: unknown;
}

async function aicoreFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: "Bearer dev",
    ...(options.headers as Record<string, string> | undefined),
  };
  return fetch(`${AI_CORE_PREFIX}${path}`, { ...options, headers });
}

/** Safe JSON parse — returns fallback data when response is non-JSON (e.g. Worker HTML page). */
async function fetchJson<T = any>(url: string, options: RequestInit = {}, fallback: T): Promise<T> {
  try {
    const res = await fetch(url, options);
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('application/json')) {
      console.warn(`[aicore] non-JSON from ${url}: ${(await res.text()).slice(0, 80)}`);
      return fallback;
    }
    return res.ok ? res.json() : fallback;
  } catch {
    return fallback;
  }
}

export async function listProducts(opts: {
  tenant?: string;
  all?: boolean;
  q?: string;
  limit?: number;
  offset?: number;
  type?: string;
  brand?: string;
  category?: string;
} = {}): Promise<MemoryListResponse> {
  const params = new URLSearchParams();
  if (opts.all) params.set("all", "1");
  if (opts.q) params.set("q", opts.q);
  if (opts.limit != null) params.set("limit", String(opts.limit));
  if (opts.offset != null) params.set("offset", String(opts.offset));
  if (opts.type) params.set("type", opts.type);
  if (opts.brand) params.set("brand", opts.brand);
  if (opts.category) params.set("category", opts.category);
  const tenant = opts.tenant || (opts.all ? "_all" : "harvests");
  const qs = params.toString();
  const res = await aicoreFetch(`/${tenant}/memory${qs ? `?${qs}` : ""}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || `AI Core ${res.status}`);
  }
  return res.json();
}

// Read the full competitor posts (caption + images + comments + engagement)
// captured by the competitor_ig bot. Powers the "竞品内容库" panel and feeds
// the content pipeline as raw material for social image/video generation.
export async function listCompetitorPosts(
  tenant = "competitors:tattoo",
  opts: { brand?: string; limit?: number; offset?: number } = {}
): Promise<MemoryListResponse> {
  return listProducts({ tenant, type: "competitor_post", ...opts });
}

export async function normalizeMemory(opts: {
  tenant: string;
  id: string;
}): Promise<{ ok: boolean; specs: Record<string, string>; item?: MemoryItemDTO; error?: string }> {
  const res = await aicoreFetch(`/${opts.tenant}/memory/${opts.id}/normalize`, {
    method: "POST",
    body: "{}",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return { ok: false, specs: {}, error: (err as { error?: string }).error || `AI Core ${res.status}` };
  }
  const data = await res.json();
  return { ok: true, specs: (data.specs ?? {}) as Record<string, string>, item: data.item as MemoryItemDTO | undefined };
}

export async function pullHarvests(opts: {
  tenant?: string;
  vendor?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<ImportSummary> {
  const params = new URLSearchParams();
  if (opts.vendor) params.set("vendor", opts.vendor);
  if (opts.limit != null) params.set("limit", String(opts.limit));
  if (opts.offset != null) params.set("offset", String(opts.offset));
  const qs = params.toString();
  const tenant = opts.tenant || "harvests";
  const res = await aicoreFetch(`/${tenant}/import/pull-harvests${qs ? `?${qs}` : ""}`, {
    method: "POST",
    body: "{}",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || `AI Core ${res.status}`);
  }
  return res.json();
}

export interface ShopifyImportResult {
  ok: boolean;
  mode: "verify" | "enrich";
  tenant_id: string;
  brand: string;
  site: string;
  pageFrom: number;
  pageTo: number;
  total_existing: number;
  total_shopify: number;
  matched: number;
  to_insert: number;
  unmatched_existing: string[];
  sample_shopify_skus: string[];
  updated: number;
  error?: string;
}

// Pull a competitor's live Shopify catalog into a tenant.
// dryRun=true → only report counts (no writes).
// pageFrom/pageTo batch a large store across multiple short requests.
// tenant/brand/site default to the first tattoo-industry competitor (Peach).
export async function pullShopify(opts: {
  tenant?: string;
  brand?: string;
  site?: string;
  dryRun: boolean;
  pageFrom?: number;
  pageTo?: number;
}): Promise<ShopifyImportResult> {
  const params = new URLSearchParams();
  if (opts.brand) params.set("brand", opts.brand);
  if (opts.site) params.set("site", opts.site);
  params.set("dryRun", opts.dryRun ? "1" : "0");
  if (opts.pageFrom) params.set("pageFrom", String(opts.pageFrom));
  if (opts.pageTo) params.set("pageTo", String(opts.pageTo));
  const tenant = opts.tenant || "competitors:tattoo";
  const qs = params.toString();
  const res = await aicoreFetch(`/${tenant}/import/from-shopify${qs ? `?${qs}` : ""}`, {
    method: "POST",
    body: "{}",
  });
  const data = (await res.json().catch(() => ({}))) as ShopifyImportResult;
  if (!res.ok || !data.ok) {
    throw new Error(data.error || `AI Core ${res.status}`);
  }
  return data;
}

// Create / upsert a single memory. Powers the "我方选品" candidate pool and
// ad-hoc product entries. Upserts on (tenant, entity_id); stamps first_seen.
// Returns the new record id so callers can immediately normalize specs.
export async function createMemory(
  tenant: string,
  payload: {
    type?: string;
    entity_id: string;
    title: string;
    content?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<{ ok: boolean; id?: string; item?: MemoryItemDTO; created?: number; error?: string }> {
  const res = await aicoreFetch(`/${tenant}/memory`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
    item?: MemoryItemDTO;
    created?: number;
  };
  if (!res.ok || !data.ok) {
    throw new Error(data.error || `AI Core ${res.status}`);
  }
  return { ok: true, id: data.item?.id, item: data.item, created: data.created };
}

// C channel — paste a product-page URL; AI Core fetches + extracts + writes a
// product memory. Returns the created memory id(s) so the UI can immediately
// run on-demand normalization for AI-quality specs.
export interface UrlImportResult {
  ok: boolean;
  tenant_id: string;
  url: string;
  imported: number;
  memory_ids: string[];
  extracted?: {
    title?: string;
    brand?: string;
    category?: string;
    unit_price?: number | null;
    image_url?: string | null;
  };
  error?: string;
}

export async function importFromUrl(
  tenant: string,
  payload: { url: string; brand?: string }
): Promise<UrlImportResult> {
  const res = await aicoreFetch(`/${tenant}/import/from-url`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const data = (await res.json().catch(() => ({}))) as UrlImportResult & { error?: string };
  if (!res.ok || !data.ok) {
    throw new Error(data.error || `AI Core ${res.status}`);
  }
  return data;
}

// Delete a single memory by (tenant, entity_id). Used to remove candidates
// from the selection pool.
export async function deleteMemory(tenant: string, entity_id: string): Promise<void> {
  const res = await aicoreFetch(`/${tenant}/memory?entity_id=${encodeURIComponent(entity_id)}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error || `AI Core ${res.status}`);
  }
}

export interface IntelEventDTO {
  id: number;
  tenant_id: string;
  entity_id: string;
  brand: string | null;
  category: string | null;
  title: string | null;
  type: string;
  price_from: number | null;
  price_to: number | null;
  captured_at: number;
}

export interface IntelEventsResponse {
  items: IntelEventDTO[];
  total: number;
  tenant: string;
}

// Capture a competitive snapshot for a tenant and diff it against the last one.
// First call establishes a baseline (no events); later calls emit change events.
export async function captureSnapshot(tenant: string): Promise<{
  ok: boolean;
  baseline?: boolean;
  captured?: number;
  events?: number;
  error?: string;
}> {
  const res = await aicoreFetch(`/${tenant}/intel/snapshot`, { method: "POST", body: "{}" });
  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    baseline?: boolean;
    captured?: number;
    events?: number;
    error?: string;
  };
  if (!res.ok || !data.ok) throw new Error(data.error || `AI Core ${res.status}`);
  return data;
}

// Read the change-event feed (new / removed / price moves) for a tenant.
export async function listIntelEvents(
  tenant: string,
  opts: { days?: number; type?: string; brand?: string; limit?: number; offset?: number } = {}
): Promise<IntelEventsResponse> {
  const params = new URLSearchParams();
  if (opts.days != null) params.set("days", String(opts.days));
  if (opts.type) params.set("type", opts.type);
  if (opts.brand) params.set("brand", opts.brand);
  if (opts.limit != null) params.set("limit", String(opts.limit));
  if (opts.offset != null) params.set("offset", String(opts.offset));
  const qs = params.toString();
  const res = await aicoreFetch(`/${tenant}/intel/events${qs ? `?${qs}` : ""}`);
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error || `AI Core ${res.status}`);
  }
  return res.json();
}

// ── Voice-of-Customer (review / UGC) intelligence ───────────────────────────

export type ReviewSentiment = "positive" | "negative" | "neutral";
export type ReviewSignal =
  | "wish"
  | "problem"
  | "praise"
  | "restock_request"
  | "diy";

export interface ReviewRecordDTO {
  platform: string;
  external_id?: string;
  author?: string;
  body: string;
  rating?: number;
  created_at?: string;
  product_ref?: string;
  source_url?: string;
  channel_type?: "passive" | "direct";
  consented?: boolean;
  campaign_id?: string;
  contact_handle?: string;
}

export interface ReviewDTO {
  id: string;
  tenant_id: string;
  platform: string;
  external_id: string;
  author: string | null;
  body: string;
  rating: number | null;
  lang: string | null;
  created_at: string | null;
  sentiment: ReviewSentiment;
  signals: ReviewSignal[];
  topics: string[];
  product_ref: string | null;
  source_url: string | null;
  ingested_at: string;
  channel_type: "passive" | "direct";
  consented: number;
  campaign_id: string | null;
  contact_handle: string | null;
}

export interface ReviewStats {
  total: number;
  bySentiment: Record<ReviewSentiment, number>;
  bySignal: Record<string, number>;
  byPlatform: Record<string, number>;
  byChannel: Record<"passive" | "direct", number>;
  topWishes: { body: string; platform: string; source_url: string | null }[];
}

export interface ReviewsResponse {
  items: ReviewDTO[];
  total: number;
  stats: ReviewStats;
  tenant: string;
}

// Bulk-ingest reviews from any platform. `reviews` is a plain array of
// { platform, body, author?, rating?, ... }. Idempotent on (platform, external_id).
export async function ingestReviews(
  tenant: string,
  reviews: ReviewRecordDTO[]
): Promise<{ ok: boolean; ingested?: number; skipped?: number; error?: string }> {
  const res = await aicoreFetch(`/${tenant}/reviews/ingest`, {
    method: "POST",
    body: JSON.stringify({ reviews }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    ingested?: number;
    skipped?: number;
    error?: string;
  };
  if (!res.ok || !data.ok) throw new Error(data.error || `AI Core ${res.status}`);
  return data;
}

// Read the voice-of-customer feed + demand-signal stats for a tenant.
export async function listReviews(
  tenant: string,
  opts: { platform?: string; signal?: string; sentiment?: string; channel_type?: string; campaign_id?: string; q?: string; limit?: number; offset?: number } = {}
): Promise<ReviewsResponse> {
  const params = new URLSearchParams();
  if (opts.platform) params.set("platform", opts.platform);
  if (opts.signal) params.set("signal", opts.signal);
  if (opts.sentiment) params.set("sentiment", opts.sentiment);
  if (opts.channel_type) params.set("channel_type", opts.channel_type);
  if (opts.campaign_id) params.set("campaign_id", opts.campaign_id);
  if (opts.q) params.set("q", opts.q);
  if (opts.limit != null) params.set("limit", String(opts.limit));
  if (opts.offset != null) params.set("offset", String(opts.offset));
  const qs = params.toString();
  const res = await aicoreFetch(`/${tenant}/reviews${qs ? `?${qs}` : ""}`);
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error || `AI Core ${res.status}`);
  }
  return res.json();
}

// Live-pull a platform. Reddit adapter works today; other platforms return a
// clear "use ingest" message (Amazon/Quora/Instagram/TikTok/YouTube need a
// crawler or pasted export due to anti-bot / auth walls).
export async function harvestReviews(tenant: string, opts: {
  platform?: string;
  subreddit?: string;
  query?: string;
  limit?: number;
  includeComments?: boolean;
  maxResults?: number;
}): Promise<{ ok: boolean; harvested?: number; ingested?: number; skipped?: number; error?: string }> {
  const res = await aicoreFetch(`/${tenant}/reviews/harvest`, {
    method: "POST",
    body: JSON.stringify(opts),
  });
  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    harvested?: number;
    ingested?: number;
    skipped?: number;
    error?: string;
  };
  if (!res.ok || !data.ok) throw new Error(data.error || `AI Core ${res.status}`);
  return data;
}

// ── Reddit watch subscriptions (automated VoC radar) ───────────────────────

export interface RedditWatchDTO {
  subreddit: string;
  query?: string;
  sort?: "new" | "top" | "relevance";
  limit?: number;
  includeComments?: boolean;
  cron_enabled?: boolean;
}

export interface StoredRedditWatchDTO {
  id: string;
  tenant_id: string;
  subreddit: string;
  query: string | null;
  sort: string;
  limit: number;
  include_comments: number; // 0/1
  cron_enabled: number; // 0/1
  last_run_at: string | null;
  last_count: number;
  created_at: string;
}

export interface WatchRunResultDTO {
  subId: string;
  subreddit: string;
  query: string | null;
  harvested: number;
  ingested: number;
  skipped: number;
  error?: string;
}

// Create / upsert a subscription (idempotent on tenant+subreddit+query).
export async function createWatch(tenant: string, sub: RedditWatchDTO): Promise<StoredRedditWatchDTO> {
  const res = await aicoreFetch(`/${tenant}/reddit-watch`, {
    method: "POST",
    body: JSON.stringify(sub),
  });
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; watch?: StoredRedditWatchDTO; error?: string };
  if (!res.ok || !data.ok || !data.watch) throw new Error(data.error || `AI Core ${res.status}`);
  return data.watch;
}

// List this tenant's subscriptions.
export async function listWatch(tenant: string): Promise<StoredRedditWatchDTO[]> {
  const res = await aicoreFetch(`/${tenant}/reddit-watch`);
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; subs?: StoredRedditWatchDTO[]; error?: string };
  if (!res.ok || !data.ok) throw new Error(data.error || `AI Core ${res.status}`);
  return data.subs ?? [];
}

// Remove a subscription.
export async function deleteWatch(tenant: string, id: string): Promise<void> {
  const res = await aicoreFetch(`/${tenant}/reddit-watch?id=${encodeURIComponent(id)}`, { method: "DELETE" });
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
  if (!res.ok || !data.ok) throw new Error(data.error || `AI Core ${res.status}`);
}

// Run this tenant's subscriptions now (manual trigger).
export async function runWatch(tenant: string): Promise<{ ok: boolean; results?: WatchRunResultDTO[]; totalIngested?: number; error?: string }> {
  const res = await aicoreFetch(`/${tenant}/reddit-watch/run`, { method: "POST" });
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; results?: WatchRunResultDTO[]; totalIngested?: number; error?: string };
  if (!res.ok || !data.ok) throw new Error(data.error || `AI Core ${res.status}`);
  return data;
}

// ── Audience pool (consenting customers for direct outreach) ───────────────

export interface AudienceRecordDTO {
  handle: string;
  platform: string;
  display_name?: string;
  tags?: string[];
  opted_in?: boolean;
  notes?: string;
}
export interface StoredAudienceDTO {
  id: string;
  tenant_id: string;
  handle: string;
  platform: string;
  display_name: string | null;
  tags: string; // JSON array
  opted_in: number;
  notes: string | null;
  created_at: string;
  last_contacted_at: string | null;
}
export interface AudienceResponse {
  items: StoredAudienceDTO[];
  total: number;
  tenant: string;
}

export async function upsertAudience(
  tenant: string,
  audience: AudienceRecordDTO[]
): Promise<{ ok: boolean; upserted?: number; skipped?: number; error?: string }> {
  const res = await aicoreFetch(`/${tenant}/audience`, {
    method: "POST",
    body: JSON.stringify({ audience }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    upserted?: number;
    skipped?: number;
    error?: string;
  };
  if (!res.ok || !data.ok) throw new Error(data.error || `AI Core ${res.status}`);
  return data;
}

export async function listAudience(
  tenant: string,
  opts: { platform?: string; tag?: string; optedIn?: boolean; q?: string; limit?: number; offset?: number } = {}
): Promise<AudienceResponse> {
  const params = new URLSearchParams();
  if (opts.platform) params.set("platform", opts.platform);
  if (opts.tag) params.set("tag", opts.tag);
  if (opts.optedIn != null) params.set("optedIn", opts.optedIn ? "1" : "0");
  if (opts.q) params.set("q", opts.q);
  if (opts.limit != null) params.set("limit", String(opts.limit));
  if (opts.offset != null) params.set("offset", String(opts.offset));
  const qs = params.toString();
  const res = await aicoreFetch(`/${tenant}/audience${qs ? `?${qs}` : ""}`);
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error || `AI Core ${res.status}`);
  }
  return res.json();
}

// ── Outreach campaigns (direct research surveys) ───────────────────────────

export interface CampaignRecordDTO {
  title: string;
  question: string;
  target_brand?: string;
  channels: string[];
  audience_filter?: { platforms?: string[]; tags?: string[]; limit?: number };
  prompt_template?: string;
}
export interface CampaignDTO {
  id: string;
  tenant_id: string;
  title: string;
  question: string;
  target_brand?: string;
  channels: string[];
  audience_filter: { platforms?: string[]; tags?: string[]; limit?: number };
  prompt_template?: string;
  status: "draft" | "active" | "done";
  created_at: string;
  dispatched_at: string | null;
  recipients: number;
}
export interface DispatchResult {
  campaign_id: string;
  recipients: { handle: string; platform: string; script: string }[];
  scripts_by_channel: Record<string, string>;
  total: number;
  dispatched_at: string;
}

export async function createCampaign(
  tenant: string,
  rec: CampaignRecordDTO
): Promise<{ ok: boolean; campaign?: CampaignDTO; error?: string }> {
  const res = await aicoreFetch(`/${tenant}/campaigns`, {
    method: "POST",
    body: JSON.stringify(rec),
  });
  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    campaign?: CampaignDTO;
    error?: string;
  };
  if (!res.ok || !data.ok) throw new Error(data.error || `AI Core ${res.status}`);
  return data;
}

export async function listCampaigns(tenant: string): Promise<{ campaigns: CampaignDTO[]; tenant: string }> {
  const res = await aicoreFetch(`/${tenant}/campaigns`);
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error || `AI Core ${res.status}`);
  }
  return res.json();
}

export async function dispatchCampaign(
  tenant: string,
  campaignId: string
): Promise<{
  ok: boolean;
  recipients?: { handle: string; platform: string; script: string }[];
  scripts_by_channel?: Record<string, string>;
  total?: number;
  dispatched_at?: string;
  error?: string;
}> {
  const res = await aicoreFetch(`/${tenant}/campaigns/${campaignId}/dispatch`, {
    method: "POST",
    body: "{}",
  });
  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    recipients?: { handle: string; platform: string; script: string }[];
    scripts_by_channel?: Record<string, string>;
    total?: number;
    dispatched_at?: string;
    error?: string;
  };
  if (!res.ok || !data.ok) throw new Error(data.error || `AI Core ${res.status}`);
  return data;
}

// ── Sales-chat (聊单) intelligence ───────────────────────────────────────────

export type CustomerType = "wholesaler" | "artist" | "unknown";
export type DealStage = "inquiry" | "compare" | "hesitate" | "ready" | "won" | "lost";
export type ChatRole = "customer" | "agent";
export type ChatSentiment = "positive" | "negative" | "neutral";
export type ChatSignal =
  | "objection"
  | "price_sensitive"
  | "purchase_intent"
  | "hesitation"
  | "ready_to_buy"
  | "wholesale_interest"
  | "product_question"
  | "trust_concern"
  | "competitor_mention";

export interface ContactInput {
  whatsapp?: string;
  website?: string;
  instagram?: string;
  facebook?: string;
  websiteText?: string; // 网站联系地址/关于页文本，用于识别国家
  bio?: string; // IG/FB 简介或任意自由文本（含城市即可识别）
}
export interface ChatInputDTO {
  customer_handle: string;
  customer_type?: CustomerType;
  platform?: string;
  locale?: string;
  deal_stage?: DealStage;
  summary?: string;
  contact?: ContactInput;
  country?: string | null;
}
export interface ChatDTO {
  id: string;
  tenant_id: string;
  customer_handle: string;
  customer_type: CustomerType;
  platform: string;
  locale: string;
  country: string | null;
  whatsapp: string | null;
  website: string | null;
  instagram: string | null;
  facebook: string | null;
  deal_stage: DealStage;
  summary: string | null;
  created_at: string;
  updated_at: string;
  last_message_at: string | null;
}
export interface CountryDetectionDTO {
  countryCode: string | null;
  confidence: "high" | "medium" | "low" | "none";
  source: "whatsapp" | "website" | "instagram" | "facebook" | "manual" | "none";
  normalizedWhatsapp?: string;
  note?: string;
}
export interface CountryStrategyDTO {
  code: string;
  name: string;
  flag: string;
  locales: string[];
  tone: string;
  relationshipStyle: string;
  greeting: string;
  openerTips: string[];
  paymentNorms: string;
  moqExpectation: string;
  shippingNotes: string;
  scripts: {
    opener: string;
    followUp: string;
    objectionPrice: string;
    closing: string;
  };
  localExpressions: { phrase: string; meaning: string }[];
}
export interface ChatMessageDTO {
  id: string;
  tenant_id: string;
  chat_id: string;
  role: ChatRole;
  body: string;
  sentiment: ChatSentiment;
  signals: ChatSignal[];
  created_at: string;
}
export interface ChatStats {
  total: number;
  byStage: Record<DealStage, number>;
  byType: Record<CustomerType, number>;
  byLocale: Record<string, number>;
  byCountry: Record<string, number>;
  signalCounts: Record<string, number>;
}
export interface ChatListResponse {
  chats: ChatDTO[];
  stats: ChatStats;
}
export interface ChatThreadResponse {
  ok: boolean;
  chat: ChatDTO;
  messages: ChatMessageDTO[];
}

export async function upsertChat(tenant: string, input: ChatInputDTO): Promise<{ ok: boolean; chat?: ChatDTO; error?: string }> {
  const res = await aicoreFetch(`/${tenant}/chats`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; chat?: ChatDTO; error?: string };
  if (!res.ok || !data.ok) throw new Error(data.error || `AI Core ${res.status}`);
  return data;
}

// Live country detection from a WhatsApp number / website / IG / FB handle.
export async function detectCountry(tenant: string, input: ContactInput): Promise<{
  ok: boolean;
  detection: CountryDetectionDTO;
  country: CountryStrategyDTO | null;
}> {
  const res = await aicoreFetch(`/${tenant}/chats/detect-country`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    detection?: CountryDetectionDTO;
    country?: CountryStrategyDTO | null;
  };
  if (!res.ok || !data.ok || !data.detection) throw new Error(`AI Core ${res.status}`);
  return { ok: true, detection: data.detection, country: data.country ?? null };
}

export async function listChats(
  tenant: string,
  opts: { customer_type?: string; deal_stage?: string; platform?: string; locale?: string; country?: string; q?: string; limit?: number; offset?: number } = {}
): Promise<ChatListResponse> {
  const params = new URLSearchParams();
  if (opts.customer_type) params.set("customer_type", opts.customer_type);
  if (opts.deal_stage) params.set("deal_stage", opts.deal_stage);
  if (opts.platform) params.set("platform", opts.platform);
  if (opts.locale) params.set("locale", opts.locale);
  if (opts.country) params.set("country", opts.country);
  if (opts.q) params.set("q", opts.q);
  if (opts.limit != null) params.set("limit", String(opts.limit));
  if (opts.offset != null) params.set("offset", String(opts.offset));
  const qs = params.toString();
  const res = await aicoreFetch(`/${tenant}/chats${qs ? `?${qs}` : ""}`);
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error || `AI Core ${res.status}`);
  }
  return res.json();
}

export async function getChat(tenant: string, chatId: string): Promise<ChatThreadResponse> {
  const res = await aicoreFetch(`/${tenant}/chats/${encodeURIComponent(chatId)}`);
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error || `AI Core ${res.status}`);
  }
  return res.json();
}

export async function updateChat(
  tenant: string,
  chatId: string,
  patch: { deal_stage?: DealStage; customer_type?: CustomerType; summary?: string; locale?: string; platform?: string; country?: string | null }
): Promise<{ ok: boolean; chat?: ChatDTO; error?: string }> {
  const res = await aicoreFetch(`/${tenant}/chats/${encodeURIComponent(chatId)}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; chat?: ChatDTO; error?: string };
  if (!res.ok || !data.ok) throw new Error(data.error || `AI Core ${res.status}`);
  return data;
}

export async function addChatMessages(
  tenant: string,
  chatId: string,
  messages: { role: ChatRole; body: string; created_at?: string }[]
): Promise<{ ok: boolean; inserted?: number; chat?: ChatDTO; error?: string }> {
  const res = await aicoreFetch(`/${tenant}/chats/${encodeURIComponent(chatId)}/messages`, {
    method: "POST",
    body: JSON.stringify({ messages }),
  });
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; inserted?: number; chat?: ChatDTO; error?: string };
  if (!res.ok || !data.ok) throw new Error(data.error || `AI Core ${res.status}`);
  return data;
}

// ── Native local-term mining (聊单策略辅助) ─────────────────────────────────
export interface MinedTerm {
  term: string;
  count: number;
  specificity: number; // 0..1 — how local (vs other countries) the phrase is
  example: string;
}
export interface AdoptedTerm {
  term: string;
  example: string | null;
  adopted_at: string;
}
export interface LocalTermsResponse {
  country: string;
  live: MinedTerm[];
  adopted: AdoptedTerm[];
}

// Mine live native terms for a country (recomputed on demand) + list adopted.
export async function getLocalTerms(tenant: string, country: string): Promise<LocalTermsResponse> {
  const res = await aicoreFetch(`/${tenant}/local-terms?country=${encodeURIComponent(country.toUpperCase())}`);
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string } & LocalTermsResponse;
  if (!res.ok || !data.ok) throw new Error(data.error || `AI Core ${res.status}`);
  return data;
}

// Pin a mined term into this tenant+country's persisted local-term layer.
export async function adoptLocalTerm(
  tenant: string,
  country: string,
  term: string,
  example?: string | null
): Promise<void> {
  const res = await aicoreFetch(`/${tenant}/local-terms`, {
    method: "POST",
    body: JSON.stringify({ country: country.toUpperCase(), term, example }),
  });
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
  if (!res.ok || !data.ok) throw new Error(data.error || `AI Core ${res.status}`);
}

// Remove a previously adopted term.
export async function removeLocalTerm(tenant: string, country: string, term: string): Promise<void> {
  const res = await aicoreFetch(
    `/${tenant}/local-terms?country=${encodeURIComponent(country.toUpperCase())}&term=${encodeURIComponent(term)}`,
    { method: "DELETE" }
  );
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
  if (!res.ok || !data.ok) throw new Error(data.error || `AI Core ${res.status}`);
}

// ── Triangulation (三角共振 / 选品线索) ─────────────────────────────────────
export type LeadSource = "chat" | "review" | "intel";
export type LeadRecommendation = "auto" | "review" | "watch";

export interface LeadEvidence {
  source: LeadSource;
  excerpt: string;
  link?: string | null;
  meta?: Record<string, unknown>;
}

export interface TriangulatedLead {
  theme: string;
  themeLabel: string;
  score: number; // 0–100, resonance-weighted
  resonance: number; // 1–3 distinct sources hit
  recommendation: LeadRecommendation;
  components: {
    demandStrength: number;
    whitespace: number;
    trendSlope: number;
    supplyFeasibility: number;
  };
  sources: { chat: number; review: number; intel: number };
  evidence: LeadEvidence[];
  pushedToSelection: boolean;
}

export interface TriangulateResult {
  leads: TriangulatedLead[];
  pushed: { theme: string; entity_id: string }[];
  generatedAt: string;
  windowDays: number;
  sourceCounts: {
    chatDemandMessages: number;
    reviewGapReviews: number;
    intelEvents: number;
  };
}

// Preview the triangulated leads (GET) or auto-push 3-source leads into the
// selection pool (POST) by passing { autoPush: true }.
export async function getTriangulatedLeads(
  tenant: string,
  opts: { days?: number; minScore?: number; autoPush?: boolean } = {}
): Promise<TriangulateResult> {
  const qs = new URLSearchParams();
  if (opts.days) qs.set("days", String(opts.days));
  if (opts.minScore) qs.set("minScore", String(opts.minScore));
  const query = qs.toString();
  const res = await aicoreFetch(`/${tenant}/leads/triangulate${query ? `?${query}` : ""}`, {
    method: opts.autoPush ? "POST" : "GET",
  });
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string } & TriangulateResult;
  if (!res.ok || !data.ok) throw new Error(data.error || `AI Core ${res.status}`);
  return data;
}

// ── LLM-grounded reply suggestion (聊单辅助) ────────────────────────────────
export interface SuggestReplyResult {
  reply: string;
  engine: "llm" | "rule";
  locale: string;
  country: string | null;
  countryName?: string;
  notes?: string;
}

// Suggest a native-language reply for a chat thread. NEVER sends — the rep
// copies & edits. Uses the worker's AI binding when present, else vetted
// country scripts.
export async function suggestReply(
  tenant: string,
  chatId: string,
  payload: { lastMessage?: string; product?: string; price?: string } = {}
): Promise<SuggestReplyResult> {
  const res = await aicoreFetch(`/${tenant}/chats/${encodeURIComponent(chatId)}/suggest-reply`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string } & SuggestReplyResult;
  if (!res.ok || !data.ok) throw new Error(data.error || `AI Core ${res.status}`);
  return data;
}

// ── 技术借鉴 (cross-category technology matrix) ─────────────────────────────
// Global knowledge base (not per-industry-tenant). Metrics are a flexible
// key→value map until the user defines the exact dimensions (profit margin,
// tech difficulty, competition level, …).
export interface TechSource {
  product: string;
  category: string;
  source_url: string;
}

export interface Technology {
  id: string;
  key: string;
  name: string;
  description: string;
  status: "suggested" | "confirmed";
  applicable_categories: string[];
  metrics: Record<string, number | string>;
  sources: TechSource[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TechListResponse {
  items: Technology[];
  total: number;
}

export async function listTechnologies(opts: { status?: string; category?: string } = {}): Promise<TechListResponse> {
  const params = new URLSearchParams();
  if (opts.status) params.set("status", opts.status);
  if (opts.category) params.set("category", opts.category);
  const qs = params.toString();
  const url = `${AI_CORE_PREFIX}/tech${qs ? `?${qs}` : ""}`;
  const headers: Record<string, string> = { "Content-Type": "application/json", Authorization: "Bearer dev" };
  return fetchJson<TechListResponse>(url, { headers }, { items: [], total: 0 });
}

export async function createTechnology(payload: Partial<Technology>): Promise<Technology> {
  const res = await aicoreFetch(`/tech`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; technology?: Technology };
  if (!res.ok || !data.ok) throw new Error(data.error || `AI Core ${res.status}`);
  return data.technology as Technology;
}

export async function updateTechnology(id: string, payload: Partial<Technology>): Promise<Technology> {
  const res = await aicoreFetch(`/tech/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; technology?: Technology };
  if (!res.ok || !data.ok) throw new Error(data.error || `AI Core ${res.status}`);
  return data.technology as Technology;
}

// AI suggests technologies from product pages. Returns suggested tech names.
export async function extractTech(payload: { urls: string[]; category?: string; industry?: string }): Promise<{
  ok: boolean;
  suggested: string[];
  count: number;
  errors: string[];
}> {
  const res = await aicoreFetch(`/tech/extract`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    suggested?: string[];
    count?: number;
    errors?: string[];
    error?: string;
  };
  if (!res.ok || !data.ok) throw new Error(data.error || `AI Core ${res.status}`);
  return { ok: true, suggested: data.suggested || [], count: data.count || 0, errors: data.errors || [] };
}

// ── 机会雷达 (Niche Opportunity Radar) ──────────────────────────────────────
// Global cross-tenant discovery of ultra-narrow niches (1-2 players, high
// margin, slow churn). AI brainstorms candidates (status 'suggested'); the user
// confirms + tweaks scores. Opportunity score is a weighted blend of 4 dims.
export interface NicheOpportunity {
  id: string;
  key: string;
  name: string;
  seed: string;
  description: string;
  players: string[];
  competition_score: number; // 0-100, higher = fewer players
  margin_score: number; // 0-100, higher = fatter margins
  refresh_score: number; // 0-100, higher = slower churn
  demand_score: number; // 0-100, higher = steadier demand
  opportunity_score: number; // weighted blend
  status: "suggested" | "confirmed";
  metrics: Record<string, number | string>;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface NicheListResponse {
  items: NicheOpportunity[];
  total: number;
}

export async function listNiches(
  opts: { status?: string; seed?: string; minScore?: number } = {}
): Promise<NicheListResponse> {
  const params = new URLSearchParams();
  if (opts.status) params.set("status", opts.status);
  if (opts.seed) params.set("seed", opts.seed);
  if (opts.minScore) params.set("minScore", String(opts.minScore));
  const qs = params.toString();
  const url = `${AI_CORE_PREFIX}/niche${qs ? `?${qs}` : ""}`;
  const headers: Record<string, string> = { "Content-Type": "application/json", Authorization: "Bearer dev" };
  return fetchJson<NicheListResponse>(url, { headers }, { items: [], total: 0 });
}

export async function createNiche(payload: Partial<NicheOpportunity>): Promise<NicheOpportunity> {
  const res = await aicoreFetch(`/niche`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; niche?: NicheOpportunity };
  if (!res.ok || !data.ok) throw new Error(data.error || `AI Core ${res.status}`);
  return data.niche as NicheOpportunity;
}

export async function updateNiche(id: string, payload: Partial<NicheOpportunity>): Promise<NicheOpportunity> {
  const res = await aicoreFetch(`/niche/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; niche?: NicheOpportunity };
  if (!res.ok || !data.ok) throw new Error(data.error || `AI Core ${res.status}`);
  return data.niche as NicheOpportunity;
}

export async function deleteNiche(id: string): Promise<void> {
  const res = await aicoreFetch(`/niche/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || `AI Core ${res.status}`);
  }
}

// AI brainstorms ultra-narrow niches from a seed direction (+ optional URLs).
export async function scanNiches(payload: { seed?: string; count?: number; urls?: string[] }): Promise<{
  ok: boolean;
  seed: string;
  suggested: string[];
  count: number;
  errors: string[];
}> {
  const res = await aicoreFetch(`/niche/scan`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    seed?: string;
    suggested?: string[];
    count?: number;
    errors?: string[];
    error?: string;
  };
  if (!res.ok || !data.ok) throw new Error(data.error || `AI Core ${res.status}`);
  return { ok: true, seed: data.seed || "", suggested: data.suggested || [], count: data.count || 0, errors: data.errors || [] };
}

