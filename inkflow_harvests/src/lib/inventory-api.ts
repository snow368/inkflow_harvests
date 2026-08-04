// Inventory API service — calls cloud-api Worker
const API = 'https://harvests-cloud-api.inkflowapp.workers.dev/api';

// 自动重试：Worker冷启动时可能EOF，重试3次
async function apiFetch(url: string, options?: RequestInit, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options);
      return res;
    } catch (err) {
      if (i === retries - 1) throw err;
      // 指数退避：0.5s, 1s, 2s
      await new Promise(r => setTimeout(r, 500 * Math.pow(2, i)));
    }
  }
  throw new Error('fetch failed');
}

export interface Product {
  sku: string;
  name: string;
  category: string;
  vendor: string;
  unit: string;
  unit_price: number;
  reorder_point: number;
  reorder_qty: number;
  lead_time_days: number;
  moq: number;
  carton_qty: number;
  source: string;
  barcode?: string;
  image_url?: string;
  current_stock: number;
  total_inbound: number;
  total_outbound: number;
  status: string;
}

export interface InboundRecord {
  id: number;
  product_sku: string;
  product_name?: string;
  quantity: number;
  large_case_qty: number;
  small_box_qty: number;
  po_number: string;
  inbound_date: string;
  sterilized: number;
  note: string;
  created_at: number;
}

export interface InboundSummary {
  inbound_date: string;
  product_sku: string;
  product_name: string;
  sterilized: number;
  total_qty: number;
  total_cases: number;
  total_boxes: number;
  batch_count: number;
}

export interface OutboundRecord {
  id: number;
  product_sku: string;
  product_name?: string;
  quantity: number;
  channel: 'B2C' | 'B2B' | 'sample_b2b' | 'sample_b2c';
  customer_name: string;
  shopify_order_id: string;
  outbound_date: string;
  note: string;
  created_at: number;
}

export interface OutboundSummary {
  customer_name: string;
  channel: string;
  total_orders: number;
  total_qty: number;
  total_order_qty: number;
  last_date: string;
  out_of_stock_cnt: number;
}

export interface Customer {
  id: number;
  name: string;
  email: string;
  instagram: string;
  country: string;
  customer_type: string;
  total_orders: number;
  total_spent: number;
  last_order_date: string;
  first_order_date: string;
  avg_order_days: number;
  status: string;
  notes: string;
  b2b_order_count?: number;
  b2b_total_units?: number;
}

export interface StockAlert {
  sku: string;
  name: string;
  category: string;
  current_stock: number;
  reorder_point: number;
  avg_daily_usage: number;
  suggested_reorder_qty: number;
  days_until_empty: number;
  days_until_stockout_urgent: string;
}

export async function getStock(): Promise<Product[]> {
  const res = await fetch(`${API}/inventory/stock`);
  const data = await res.json();
  return data.items || [];
}

export async function getProductAlerts(): Promise<StockAlert[]> {
  const res = await fetch(`${API}/inventory/alerts`);
  const data = await res.json();
  return data.alerts || [];
}

// 待人工审核的赠品队列（备注写了型号但解析不出安全 SKU，如订单无针+裸型号分不清系列）
export async function getGiftReviews(status = 'pending'): Promise<any[]> {
  const res = await fetch(`${API}/inventory/gift-reviews?status=${encodeURIComponent(status)}`);
  const data = await res.json();
  return data.reviews || [];
}

export async function resolveGiftReview(id: number, resolution = 'manual'): Promise<{ ok: boolean }> {
  try {
    const res = await fetch(`${API}/inventory/gift-review/${id}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resolution }),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: !!data?.ok };
  } catch (e: any) {
    return { ok: false };
  }
}

export async function resetStock(): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await fetch(`${API}/inventory/stock/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: 'RESET-ALL-STOCK' }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, message: `HTTP ${res.status}: ${res.statusText}` };
    }
    return { ok: true, message: data?.message || '库存已清零' };
  } catch (e: any) {
    return { ok: false, message: e?.message || '网络错误' };
  }
}

export async function getTrends() {
  const res = await fetch(`${API}/inventory/trends`);
  return res.json();
}

export async function createProduct(product: Partial<Product>) {
  const res = await fetch(`${API}/inventory/product`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(product),
  });
  return res.json();
}

export async function updateProductField(sku: string, field: string, value: any) {
  const res = await fetch(`${API}/inventory/product/${sku}/field`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ field, value }),
  });
  return res.json();
}

export async function deleteProduct(sku: string) {
  const res = await fetch(`${API}/inventory/product/${sku}`, { method: 'DELETE' });
  return res.json();
}

export async function recordInbound(data: { product_sku: string; quantity?: number; large_case_qty?: number; small_box_qty?: number; po_number: string; inbound_date: string; note: string; sterilized?: boolean }) {
  const res = await fetch(`${API}/inventory/inbound`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteInbound(id: number) {
  const res = await fetch(`${API}/inventory/inbound/${id}`, {
    method: 'DELETE',
  });
  return res.json();
}

export async function updateInbound(id: number, data: { quantity?: number; large_case_qty?: number; small_box_qty?: number; po_number?: string; inbound_date?: string; note?: string; sterilized?: boolean }) {
  const res = await fetch(`${API}/inventory/inbound/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function recordOutbound(data: { product_sku: string; quantity: number; channel: string; customer_name: string; shopify_order_id: string; outbound_date: string; note: string; pack_source?: string }) {
  const res = await fetch(`${API}/inventory/outbound`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteOutbound(id: number) {
  const res = await fetch(`${API}/inventory/outbound/${id}`, { method: 'DELETE' });
  return res.json();
}

export async function updateOutbound(id: number, data: { quantity?: number; channel?: string; customer_name?: string; outbound_date?: string; note?: string; product_sku?: string; shopify_order_id?: string; pack_source?: string }) {
  const res = await fetch(`${API}/inventory/outbound/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteOutboundsByCustomer(customer_name: string) {
  const res = await fetch(`${API}/inventory/outbounds/${encodeURIComponent(customer_name)}`, { method: 'DELETE' });
  return res.json();
}

export async function getInbounds(): Promise<InboundRecord[]> {
  const res = await fetch(`${API}/inventory/inbounds`);
  const data = await res.json();
  return data.items || [];
}

export async function getOutboundSummary(): Promise<OutboundSummary[]> {
  const res = await fetch(`${API}/inventory/outbound-summary`);
  const data = await res.json();
  return data.items || [];
}

export async function getInboundSummary(): Promise<InboundSummary[]> {
  const res = await fetch(`${API}/inventory/inbound-summary`);
  const data = await res.json();
  return data.items || [];
}

export async function getOutbounds(channel?: string, sku?: string): Promise<OutboundRecord[]> {
  let url = `${API}/inventory/outbounds`;
  const params = new URLSearchParams();
  if (channel) params.set('channel', channel);
  if (sku) params.set('sku', sku);
  if (params.toString()) url += `?${params.toString()}`;
  const res = await fetch(url);
  const data = await res.json();
  return data.items || [];
}

export interface DistributorCandidate {
  id: string; shop_name: string; full_name: string; username: string;
  bio: string; ig_handle: string; website: string; city: string; metadata: any;
}

export async function getDistributorCandidates(): Promise<DistributorCandidate[]> {
  const res = await fetch(`${API}/inventory/distributor-candidates`);
  const data = await res.json();
  return data.items || [];
}

export async function importDistributor(artistId: string) {
  const res = await fetch(`${API}/inventory/import-distributor`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ artistId }),
  });
  return res.json();
}

export async function getCustomerOrders(name: string): Promise<{items: any[]; details: any[]}> {
  const res = await fetch(`${API}/inventory/customer-orders/${encodeURIComponent(name)}`);
  const data = await res.json();
  return { items: data.items || [], details: data.details || [] };
}

export async function deletePending(id: number) {
  const res = await fetch(`${API}/inventory/pending/${id}`, { method: 'DELETE' });
  return res.json();
}

export async function updatePending(id: number, data: { product_sku?: string; quantity?: number }) {
  const res = await fetch(`${API}/inventory/pending/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function getCustomers(): Promise<Customer[]> {
  const res = await fetch(`${API}/inventory/customers`);
  const data = await res.json();
  return data.items || [];
}

export async function saveCustomer(customer: Partial<Customer>) {
  const res = await fetch(`${API}/inventory/customer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(customer),
  });
  return res.json();
}

export async function createPO(data: { items: { sku: string; quantity: number; unit_cost: number }[]; supplier: string; expected_date: string; notes: string }) {
  const res = await fetch(`${API}/inventory/po/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function getPOs() {
  const res = await fetch(`${API}/inventory/po`);
  const data = await res.json();
  return data.items || [];
}

export async function batchSetTracking(ids: number[], courier_name: string, tracking_number: string, received_date: string) {
  const res = await fetch(`${API}/inventory/inbound/batch-tracking`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids, courier_name, tracking_number, received_date }),
  });
  return res.json();
}

export async function getPOItems(id: number) {
  const res = await fetch(`${API}/inventory/po/${id}/items`);
  const data = await res.json();
  return data.items || [];
}

// ── Stocktake ──
export interface StocktakeRecord {
  id: number;
  location: string;
  sku: string;
  product_name?: string;
  expected_qty: number;
  actual_qty: number;
  difference: number;
  notes: string;
  created_at: number;
}

export async function saveStocktake(data: { location: string; sku: string; expected_qty: number; actual_qty: number; notes?: string; clear?: boolean }) {
  const res = await fetch(`${API}/inventory/stocktake`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
  });
  return res.json();
}
export async function saveStocktakeBatch(records: { location: string; sku: string; expected_qty: number; actual_qty: number; notes?: string }[]) {
  const res = await fetch(`${API}/inventory/stocktake/batch`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ records }),
  });
  return res.json();
}
export async function getStocktakes(location?: string): Promise<StocktakeRecord[]> {
  const url = location ? `${API}/inventory/stocktake?location=${encodeURIComponent(location)}` : `${API}/inventory/stocktake`;
  const res = await fetch(url);
  const data = await res.json();
  return data.items || [];
}
export async function clearStocktakes() {
  const res = await fetch(`${API}/inventory/stocktake`, { method: 'DELETE' });
  return res.json();
}
export async function deleteStocktake(id: number) {
  const res = await fetch(`${API}/inventory/stocktake/${id}`, { method: 'DELETE' });
  return res.json();
}
