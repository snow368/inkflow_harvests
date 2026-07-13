import { useEffect, useState, Fragment, useRef } from 'react';
import * as api from '../lib/inventory-api';
import type { Product, InboundRecord, InboundSummary, OutboundRecord, OutboundSummary, Customer, StockAlert, DistributorCandidate } from '../lib/inventory-api';

type Tab = 'stock' | 'inbound' | 'outbound' | 'customers';

export default function InventoryManager() {
  const [tab, setTab] = useState<Tab>('stock');
  const [products, setProducts] = useState<Product[]>([]);
  const [inbounds, setInbounds] = useState<InboundRecord[]>([]);
  const [outbounds, setOutbounds] = useState<OutboundRecord[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [inboundSummary, setInboundSummary] = useState<InboundSummary[]>([]);
  const [outboundSummary, setOutboundSummary] = useState<OutboundSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [voiceListening, setVoiceListening] = useState(false);
  const [voiceText, setVoiceText] = useState('');
  const [voiceResult, setVoiceResult] = useState<'listening' | 'done' | 'error'>('listening');
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const [message, setMessage] = useState('');
  const [scanMode, setScanMode] = useState<'inbound' | 'outbound' | null>(null);
  const [scanSku, setScanSku] = useState('');
  const [scanQty, setScanQty] = useState(1);
  const [scanCustomer, setScanCustomer] = useState('');
  const [scanNote, setScanNote] = useState('');
  const [scanBarcode, setScanBarcode] = useState('');
  const [scanSterilized, setScanSterilized] = useState(true);
  const [scanLargeCase, setScanLargeCase] = useState(0);
  const [scanSmallBox, setScanSmallBox] = useState(0);

  const handleVoice = () => {
    if (!SpeechRecognition) { alert('语音识别不支持，请使用Chrome'); return; }
    const sr = new SpeechRecognition();
    sr.lang = 'zh-CN'; sr.continuous = false; sr.interimResults = false;
    sr.onresult = async (e: any) => {
      const text = e.results[0][0].transcript || '';
      setVoiceText(text);
      setVoiceResult('done');
      setTimeout(() => setVoiceListening(false), 2000);
      const upper = text.toUpperCase().replace(/[^A-Z0-9]/g, '');
      const numMatch = text.match(/([0-9]+)/);
      const qty = numMatch ? parseInt(numMatch[1]) : 1;
      const isInbound = /入库|入|进|进货|采购/.test(text);
      const isOutbound = /出库|出|出货|发货/.test(text);
      // Find matching product
      const match = products.find(p => {
        const plain = p.sku.replace(/-/g, '');
        return upper.includes(plain) || plain.includes(upper);
      });
      if (!match) {
        // Try partial match on number part only
        const numPart = upper.replace(/[A-Z]/g, '');
        const byNum = products.find(p => p.sku.replace(/[^0-9]/g, '') === numPart);
        if (byNum) {
          await doVoiceAction(isInbound ? 'inbound' : 'outbound', byNum.sku, qty, text);
        } else {
          alert('未识别到型号: ' + text);
        }
      } else {
        await doVoiceAction(isInbound ? 'inbound' : 'outbound', match.sku, qty, text);
      }
    };
    sr.onerror = () => { setVoiceResult('error'); setVoiceText('识别失败，请重试'); setTimeout(() => setVoiceListening(false), 1500); };
    sr.onend = () => setVoiceListening(false);
    setVoiceListening(true);
    setVoiceText('');
    setVoiceResult('listening');
    sr.start();
  };
  const doVoiceAction = async (action: string, sku: string, qty: number, transcript: string) => {
    try {
      if (action === 'inbound') {
        await api.recordInbound({ product_sku: sku, quantity: qty, po_number: 'VOICE', inbound_date: new Date().toISOString().slice(0,10), note: '语音入库', sterilized: false });
      } else {
        await api.recordOutbound({ product_sku: sku, quantity: qty, channel: 'B2C', customer_name: '语音出库', shopify_order_id: '', outbound_date: new Date().toISOString().slice(0,10), note: '语音出库' });
      }
      await fetch('https://harvests-cloud-api.inkflowapp.workers.dev/api/voice/log', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ transcript, parsed_sku: sku, parsed_qty: qty, matched_product: sku, success: 1 })
      }).catch(() => {});
      loadAll();
      setMessage(action === 'inbound' ? '✅ 语音入库 ' + sku + ' x' + qty : '✅ 语音出库 ' + sku + ' x' + qty);
    } catch (e: any) {
      setMessage('❌ 语音操作失败: ' + e.message);
    }
  };

  const loadAll = async () => {
    setLoading(true);
    // Timeout safety for slow connections (mobile)
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 10000);
    try {
      const [p, ib, ob, c, a, s, os] = await Promise.all([
        api.getStock().catch(() => [] as any), api.getInbounds().catch(() => [] as any), api.getOutbounds().catch(() => [] as any),
        api.getCustomers().catch(() => [] as any), api.getProductAlerts().catch(() => [] as any), api.getInboundSummary().catch(() => [] as any),
        api.getOutboundSummary().catch(() => [] as any),
      ]);
      setProducts(p); setInbounds(ib); setOutbounds(ob);
      setCustomers(c); setAlerts(a); setInboundSummary(s); setOutboundSummary(os);
    } catch (e: any) { setMessage('Load failed: ' + e.message); }
    setLoading(false);
  };

  useEffect(() => { loadAll(); const i = setInterval(loadAll, 60000); return () => clearInterval(i); }, []);

  const TABS: { key: Tab; label: string; color: string }[] = [
    { key: 'stock', label: `Stock (${products.length})`, color: '#2563eb' },
    { key: 'inbound', label: 'Inbound', color: '#22c55e' },
    { key: 'outbound', label: 'Outbound', color: '#f59e0b' },
    { key: 'customers', label: `Customers (${customers.length})`, color: '#a855f7' },
  ];

  const lowStock = products.filter(p => p.status === 'low_stock' || p.status === 'out_of_stock');
  const totalStock = products.reduce((s, p) => s + (p.current_stock || 0), 0);

  return (
    <div style={{ padding: 16, color: '#fafafa', maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Inventory</h2>
          <p style={{ fontSize: 12, color: '#71717a', marginTop: 2 }}>
            {products.length} products · {totalStock} units · {lowStock.length} low stock
          </p>
        </div>
        <button onClick={handleVoice} style={{ padding: '8px 12px', borderRadius: 8, border: voiceListening ? '2px solid #ef4444' : '1px solid #27272a', background: voiceListening ? '#7f1d1d' : '#18181b', color: voiceListening ? '#fca5a5' : '#fafafa', fontSize: 14, cursor: 'pointer' }} title="语音输入 - 说出型号和数量">
          {voiceListening ? '🔴' : '🎤'}
        </button>
        <button onClick={loadAll} disabled={loading}
          style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #27272a', background: '#18181b', color: '#a1a1aa', fontSize: 12, cursor: 'pointer' }}>
          {loading ? 'Loading...' : '⟳ Refresh'}
        </button>
      </div>

      {message && (
        <div style={{ background: message.includes('failed') ? '#7f1d1d' : '#14532d', padding: '8px 12px', borderRadius: 8, marginBottom: 12, fontSize: 13, color: message.includes('failed') ? '#fca5a5' : '#86efac' }}>
          {message}
          <button onClick={() => setMessage('')} style={{ marginLeft: 12, background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>X</button>
        </div>
      )}

      {/* Quick Scan */}
      {!scanMode && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button onClick={() => { setScanMode('inbound'); setScanSku(''); setScanQty(1); setScanCustomer(''); setScanNote(''); setScanSterilized(true); setScanLargeCase(0); setScanSmallBox(0); }}
            style={{ flex: 1, padding: '14px 0', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            📥 Scan Inbound
          </button>
          <button onClick={() => { setScanMode('outbound'); setScanSku(''); setScanQty(1); setScanCustomer(''); setScanNote(''); }}
            style={{ flex: 1, padding: '14px 0', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            📤 Scan Outbound
          </button>
        </div>
      )}

      {/* Scan Panel */}
      {scanMode && (
        <div style={{ background: '#18181b', borderRadius: 12, padding: 16, marginBottom: 12, border: '1px solid #27272a' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h4 style={{ fontSize: 14, fontWeight: 600, margin: 0, color: scanMode === 'inbound' ? '#22c55e' : '#f59e0b' }}>
              {scanMode === 'inbound' ? '📥 Scan Inbound' : '📤 Scan Outbound'}
            </h4>
            <button onClick={() => setScanMode(null)} style={{ background: 'none', border: 'none', color: '#71717a', cursor: 'pointer', fontSize: 14 }}>X</button>
          </div>

          {/* Barcode / SKU input — also catches physical scanner input */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: '#71717a', display: 'block', marginBottom: 2 }}>SCAN BARCODE or TYPE SKU</label>
              <input value={scanBarcode || scanSku} onChange={e => {
                const val = e.target.value;
                setScanBarcode(val);
                // Auto-match product by barcode or SKU
                const match = products.find(p => p.sku === val || (p as any).barcode === val);
                if (match) setScanSku(match.sku);
                else setScanSku(val); // fallback: treat as SKU
              }} placeholder="Scan barcode or type SKU..."
                style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '2px solid #22c55e', background: '#0c0c0e', color: '#fafafa', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#71717a', display: 'block', marginBottom: 2 }}>SKU (matched)</label>
              <input list="scan-sku-list" value={scanSku} onChange={e => setScanSku(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #27272a', background: '#0c0c0e', color: '#fafafa', fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
              <datalist id="scan-sku-list">{products.map(p => <option key={p.sku} value={p.sku} label={`${p.name} (stock: ${p.current_stock})`} />)}</datalist>
            </div>
            {scanMode === 'inbound' ? (
              <>
                <div>
                  <label style={{ fontSize: 11, color: '#71717a', display: 'block', marginBottom: 2 }}>大箱 (×100盒)</label>
                  <input type="number" value={scanLargeCase || ''} onChange={e => setScanLargeCase(Math.max(0, Number(e.target.value)))}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #22c55e', background: '#0c0c0e', color: '#22c55e', fontSize: 14, fontWeight: 700, outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: '#71717a', display: 'block', marginBottom: 2 }}>小箱 (×50盒)</label>
                  <input type="number" value={scanSmallBox || ''} onChange={e => setScanSmallBox(Math.max(0, Number(e.target.value)))}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #22c55e', background: '#0c0c0e', color: '#22c55e', fontSize: 14, fontWeight: 700, outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: '#71717a', display: 'block', marginBottom: 2 }}>零散 (盒)</label>
                  <input type="number" value={scanQty || ''} onChange={e => setScanQty(Math.max(0, Number(e.target.value)))}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #f59e0b', background: '#0c0c0e', color: '#f59e0b', fontSize: 14, fontWeight: 700, outline: 'none', boxSizing: 'border-box' }} />
                </div>
              </>
            ) : (
              <div>
                <label style={{ fontSize: 11, color: '#71717a', display: 'block', marginBottom: 2 }}>QUANTITY</label>
                <input type="number" value={scanQty || ''} onChange={e => setScanQty(Math.max(1, Number(e.target.value)))}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #27272a', background: '#0c0c0e', color: '#fafafa', fontSize: 14, fontWeight: 700, outline: 'none', boxSizing: 'border-box' }} />
              </div>
            )}
            {scanMode === 'outbound' && (
              <div>
                <label style={{ fontSize: 11, color: '#71717a', display: 'block', marginBottom: 2 }}>CUSTOMER (B2B) or B2C</label>
                <input list="scan-cust-list" value={scanCustomer} onChange={e => setScanCustomer(e.target.value)} placeholder="B2C or customer name"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #27272a', background: '#0c0c0e', color: '#fafafa', fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
                <datalist id="scan-cust-list">
                  <option value="B2C" />
                  {customers.map(c => <option key={c.id} value={c.name} />)}
                </datalist>
              </div>
            )}
            {scanMode === 'inbound' && (
              <div>
                <label style={{ fontSize: 11, color: '#71717a', display: 'block', marginBottom: 2 }}>消毒</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, cursor: 'pointer' }}>
                  <input type="checkbox" checked={scanSterilized} onChange={e => setScanSterilized(e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: '#22c55e' }} />
                  <span style={{ fontSize: 12, color: scanSterilized ? '#22c55e' : '#71717a' }}>已消毒</span>
                </label>
              </div>
            )}
            <div style={{ gridColumn: scanMode === 'inbound' ? 'span 1' : 'span 2' }}>
              <label style={{ fontSize: 11, color: '#71717a', display: 'block', marginBottom: 2 }}>NOTE (optional)</label>
              <input value={scanNote} onChange={e => setScanNote(e.target.value)} placeholder="Any note..."
                style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #27272a', background: '#0c0c0e', color: '#fafafa', fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
            </div>
          </div>

          {/* Scanned product info */}
          {(() => {
            const matched = products.find(p => p.sku === scanSku);
            return matched ? (
              <div style={{ background: '#0c0c0e', borderRadius: 8, padding: 10, marginBottom: 12, border: '1px solid #27272a', display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{matched.name}</div>
                  <div style={{ fontSize: 11, color: '#71717a' }}>{matched.sku} · {matched.category} · Stock: {matched.current_stock}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: scanMode === 'inbound' ? '#22c55e' : '#f59e0b' }}>
                    {scanMode === 'inbound' ? `+${scanQty}` : `-${scanQty}`}
                  </div>
                </div>
              </div>
            ) : scanSku ? (
              <div style={{ background: '#1e1e1e', borderRadius: 8, padding: 10, marginBottom: 12, color: '#f87171', fontSize: 12 }}>
                ⚠ Product not found: {scanSku}. Add it in Products tab first.
              </div>
            ) : null;
          })()}

          <button onClick={async () => {
            if (!scanSku || !scanQty) return;
            const now = new Date().toISOString().slice(0, 10);
            if (scanMode === 'inbound') {
              await api.recordInbound({ product_sku: scanSku, quantity: scanQty, large_case_qty: scanLargeCase, small_box_qty: scanSmallBox, po_number: '', inbound_date: now, note: scanNote, sterilized: scanSterilized });
            } else {
              await api.recordOutbound({
                product_sku: scanSku, quantity: scanQty, channel: scanCustomer && scanCustomer !== 'B2C' ? 'B2B' : 'B2C',
                customer_name: scanCustomer === 'B2C' ? '' : scanCustomer, shopify_order_id: '', outbound_date: now, note: scanNote,
              });
            }
            setMessage(`${scanMode === 'inbound' ? 'Inbound' : 'Outbound'} recorded: ${scanSku} x${scanQty}`);
            setTimeout(() => setMessage(''), 3000);
            setScanBarcode(''); setScanSku(''); setScanQty(1); setScanCustomer(''); setScanNote(''); setScanSterilized(true); setScanLargeCase(0); setScanSmallBox(0);
            loadAll();
          }} disabled={!scanSku || !scanQty}
            style={{ width: '100%', padding: 12, borderRadius: 8, border: 'none', background: !scanSku || !scanQty ? '#27272a' : scanMode === 'inbound' ? '#22c55e' : '#f59e0b', color: 'white', fontSize: 14, fontWeight: 700, cursor: !scanSku || !scanQty ? 'not-allowed' : 'pointer' }}>
            {scanMode === 'inbound' ? '✅ Confirm Inbound' : '✅ Confirm Outbound'}
          </button>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{
              padding: '8px 16px', borderRadius: 8, border: 'none',
              background: tab === t.key ? t.color : '#18181b',
              color: tab === t.key ? 'white' : '#a1a1aa',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'stock' && <StockTab products={products} onRefresh={loadAll} setMessage={setMessage} />}
      {tab === 'inbound' && <InboundTab inbounds={inbounds} summary={inboundSummary} products={products} onRefresh={loadAll} />}
      {tab === 'outbound' && <OutboundTab outbounds={outbounds} summary={outboundSummary} products={products} customers={customers} onRefresh={loadAll} setMessage={setMessage} />}
      {tab === 'customers' && <CustomersTab customers={customers} onRefresh={loadAll} />}
    </div>
  );
}

// ── Stock Tab ──
function StockTab({ products, onRefresh, setMessage }: { products: Product[]; onRefresh: () => void; setMessage?: (msg: string) => void }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ sku: '', name: '', barcode: '', category: 'General', vendor: '', unit: 'Box', unit_price: 0, reorder_point: 50, reorder_qty: 1000 });
  const [search, setSearch] = useState('');
  const [outSku, setOutSku] = useState('');
  const [outQty, setOutQty] = useState(1);
  const [outOrderNo, setOutOrderNo] = useState('');
  const [outSaving, setOutSaving] = useState(false);
  const outSavingRef = useRef(false);
  const [editSku, setEditSku] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, any>>({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [batchEdit, setBatchEdit] = useState(false);
  const [batchData, setBatchData] = useState<Record<string, number>>({});
  const [scanInVisible, setScanInVisible] = useState(false);
  const [scanInText, setScanInText] = useState('');

  const startEdit = (p: Product) => {
    setEditSku(p.sku);
    setEditForm({
      sku: p.sku, name: p.name, category: p.category, vendor: p.vendor, unit: p.unit,
      unit_price: p.unit_price, reorder_point: p.reorder_point, reorder_qty: p.reorder_qty,
      barcode: p.barcode, current_stock: p.current_stock,
    });
  };

  const saveEdit = async () => {
    if (!editSku) return;
    setSavingEdit(true);
    const sku = editSku;
    try {
      const updates: Promise<any>[] = [];
      if (editForm.name !== undefined) updates.push(api.updateProductField(sku, 'name', editForm.name));
      if (editForm.category !== undefined) updates.push(api.updateProductField(sku, 'category', editForm.category));
      if (editForm.vendor !== undefined) updates.push(api.updateProductField(sku, 'vendor', editForm.vendor));
      if (editForm.unit !== undefined) updates.push(api.updateProductField(sku, 'unit', editForm.unit));
      if (editForm.unit_price !== undefined) updates.push(api.updateProductField(sku, 'unit_price', editForm.unit_price));
      if (editForm.reorder_point !== undefined) updates.push(api.updateProductField(sku, 'reorder_point', editForm.reorder_point));
      if (editForm.reorder_qty !== undefined) updates.push(api.updateProductField(sku, 'reorder_qty', editForm.reorder_qty));
      if (editForm.barcode !== undefined) updates.push(api.updateProductField(sku, 'barcode', editForm.barcode));
      if (editForm.current_stock !== undefined) updates.push(api.updateProductField(sku, 'current_stock', Number(editForm.current_stock)));
      await Promise.all(updates);
      setEditSku(null);
      setEditForm({});
      onRefresh();
    } catch (e: any) {
      setMessage('❌ 保存失败: ' + e.message);
    }
    setSavingEdit(false);
  };



  const filtered = search ? products.filter(p =>
    p.sku.toLowerCase().includes(search.toLowerCase()) || p.name.toLowerCase().includes(search.toLowerCase())
  ) : products;

  const statusColor = (s: string) => s === 'out_of_stock' ? '#ef4444' : s === 'low_stock' ? '#f59e0b' : '#22c55e';
  const statusLabel = (s: string) => s === 'out_of_stock' ? 'Out' : s === 'low_stock' ? 'Low' : 'OK';

  const doOutbound = async () => {
    if (!outSku || outQty < 1 || outSavingRef.current) return;
    outSavingRef.current = true;
    setOutSaving(true);
    const sku = outSku; const qty = outQty; const orderNo = outOrderNo;
    try {
      await api.recordOutbound({ product_sku: sku, quantity: qty, channel: 'B2C', customer_name: '日销', shopify_order_id: orderNo, outbound_date: new Date().toISOString().slice(0, 10), note: orderNo || '日销出库' });
      setMessage('✅ 出库 ' + sku + ' x' + qty);
    } catch {}
    outSavingRef.current = false;
    setOutSaving(false);
    setOutSku(''); setOutQty(1); setOutOrderNo('');
    onRefresh();
  };

  
// Group by series
  const seriesOrder = ['CON', 'COG', 'AES'];
  const filteredGrouped = new Map<string, typeof products>();
  for (const s of seriesOrder) {
    const items = products.filter(p => (p.category || 'OTHER') === s);
    const f = search ? items.filter(p => p.sku.toLowerCase().includes(search.toLowerCase()) || p.name.toLowerCase().includes(search.toLowerCase())) : items;
    if (f.length) filteredGrouped.set(s, f);
  }

  const grandTotalStock = filtered.reduce((s, p) => s + (p.current_stock || 0), 0);

  return (
    <div>
      {batchEdit && (
        <div style={{ background: "#18181b", borderRadius: 12, padding: 12, marginBottom: 12, border: "1px solid #27272a" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#facc15", marginBottom: 8 }}>📝 批量编辑库存</div>
          <div style={{ maxHeight: 300, overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead><tr style={{ borderBottom: "1px solid #27272a", position: "sticky", top: 0, background: "#0c0c0e" }}>
                <th style={{ padding: "6px 10px", textAlign: "left", color: "#71717a", fontWeight: 600 }}>SKU</th>
                <th style={{ padding: "6px 10px", textAlign: "left", color: "#71717a", fontWeight: 600 }}>名称</th>
                <th style={{ padding: "6px 10px", textAlign: "left", color: "#71717a", fontWeight: 600 }}>库存</th>
              </tr></thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.sku} style={{ borderBottom: "1px solid #18181b" }}>
                    <td style={{ padding: "6px 10px" }}><code style={{ color: "#60a5fa", fontSize: 10 }}>{p.sku}</code></td>
                    <td style={{ padding: "6px 10px", color: "#e4e4e7", fontSize: 10 }}>{p.name || "---"}</td>
                    <td style={{ padding: "6px 10px" }}>
                      <input type="number" value={batchData[p.sku] ?? p.current_stock ?? 0} onChange={e => setBatchData({...batchData, [p.sku]: Number(e.target.value)})}
                        style={{ width: 70, padding: "4px 8px", borderRadius: 4, border: "1px solid #27272a", background: "#0c0c0e", color: "#22c55e", fontSize: 12, fontWeight: 700, outline: "none" }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button onClick={async () => {
            let ok = 0; let fail = 0;
            for (const [sku, qty] of Object.entries(batchData)) {
              const p = products.find(x => x.sku === sku);
              if (!p || qty === p.current_stock) { ok++; continue; }
              try { await api.updateProductField(sku, "current_stock", qty); ok++; }
              catch { fail++; }
            }
            setMessage("✅ " + ok + " ok" + (fail ? " \u274c " + fail + " fail" : ""));
            setTimeout(() => setMessage(""), 3000);
            onRefresh();
          }} style={{ marginTop: 8, padding: "8px 20px", borderRadius: 6, border: "none", background: "#22c55e", color: "white", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            ✅ 保存全部
          </button>
        </div>
      )}
      {scanInVisible && (
        <div style={{ background: "#18181b", borderRadius: 12, padding: 12, marginBottom: 12, border: "1px solid #27272a" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#f59e0b", marginBottom: 8 }}>📷 扫码入库</div>
          <textarea value={scanInText} onChange={e => setScanInText(e.target.value)} rows={4} placeholder="粘贴扫码数据，一行一个型号..."
            style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #27272a", background: "#0c0c0e", color: "#fafafa", fontSize: 12, outline: "none", boxSizing: "border-box", resize: "vertical" }} />
          <button onClick={async () => {
            const skus = scanInText.trim().split(/[\s,;\n]+/).filter(Boolean);
            let ok = 0; let fail = 0;
            for (const s of skus) {
              const sku = s.toUpperCase().replace(/[^A-Z0-9-]/g, "");
              if (!sku) { fail++; continue; }
              try {
                await api.recordInbound({ product_sku: sku, quantity: 1, large_case_qty: 0, small_box_qty: 0, po_number: "", inbound_date: new Date().toISOString().slice(0, 10), note: "扫码入库", sterilized: true });
                ok++;
              } catch { fail++; }
            }
            setMessage("✅ " + ok + " ok" + (fail ? " \u274c " + fail + " fail" : ""));
            setTimeout(() => setMessage(""), 3000);
            setScanInText("");
            onRefresh();
          }} style={{ marginTop: 8, padding: "8px 20px", borderRadius: 6, border: "none", background: "#f59e0b", color: "white", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            ✅ 提交入库
          </button>
        </div>
      )}
      {/* Quick Outbound */}
      <div style={{ background: '#18181b', borderRadius: 12, padding: 14, marginBottom: 12, border: '1px solid #f59e0b' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b', marginBottom: 8 }}>{'📤'} 每日出库</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select value={outSku} onChange={e => setOutSku(e.target.value)}
            style={{ flex: 1, padding: '10px 12px', borderRadius: 8, border: '1px solid #27272a', background: '#0c0c0e', color: '#fafafa', fontSize: 12, outline: 'none' }}>
            <option value="">选择型号</option>
            {products.sort((a, b) => a.sku.localeCompare(b.sku)).map(p => (
              <option key={p.sku} value={p.sku}>{p.sku} ({p.category}) — 库存 {p.current_stock}</option>
            ))}
          </select>
          <input type="number" value={outQty || ''} onChange={e => setOutQty(Math.max(1, Number(e.target.value)))}
            placeholder="数量" style={{ width: 80, padding: '10px 12px', borderRadius: 8, border: '1px solid #27272a', background: '#0c0c0e', color: '#fafafa', fontSize: 14, fontWeight: 700, outline: 'none', textAlign: 'center' }} />
          <input value={outOrderNo} onChange={e => setOutOrderNo(e.target.value)}
            placeholder="订单号" style={{ width: 120, padding: '10px 12px', borderRadius: 8, border: '1px solid #27272a', background: '#0c0c0e', color: '#fafafa', fontSize: 12, outline: 'none' }} />

          <button onClick={doOutbound} disabled={!outSku || outSaving}
            style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: outSaving ? '#6366f1' : (!outSku ? '#27272a' : '#f59e0b'), color: 'white', fontSize: 12, fontWeight: 700, cursor: (!outSku || outSaving) ? 'not-allowed' : 'pointer' }}>
            {outSaving ? '⏳ 出库中...' : '出库'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by SKU or name..."
          style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: '1px solid #27272a', background: '#0c0c0e', color: '#fafafa', fontSize: 13, outline: 'none' }} />
        <button onClick={() => setShowForm(true)}
          style={{ padding: '10px 18px', borderRadius: 8, border: 'none', background: '#2563eb', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
          + Product
        </button>
        <button onClick={() => { setBatchEdit(!batchEdit); if (!batchEdit) { const dd: Record<string, number> = {}; for (const p of products) dd[p.sku] = p.current_stock || 0; setBatchData(dd); } }}
          style={{ padding: "10px 18px", borderRadius: 8, border: "none", background: batchEdit ? "#ef4444" : "#22c55e", color: "white", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace:"nowrap" }}>
          {batchEdit ? "Done" : "📝 Batch"}
        </button>
        <button onClick={() => setScanInVisible(!scanInVisible)}
          style={{ padding: "10px 18px", borderRadius: 8, border: "none", background: scanInVisible ? "#ef4444" : "#f59e0b", color: "white", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace:"nowrap" }}>
          {scanInVisible ? "Close" : "📷 Scan"}
        </button>
      </div>

      {showForm && (
        <div style={{ background: '#18181b', borderRadius: 12, padding: 16, marginBottom: 12, border: '1px solid #27272a' }}>
          <h4 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px' }}>New Product</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
            {['sku', 'name', 'barcode', 'category', 'vendor', 'unit'].map(f => (
              <div key={f}>
                <label style={{ fontSize: 11, color: '#71717a', display: 'block', marginBottom: 2 }}>{f.toUpperCase()}</label>
                <input value={(form as any)[f] || ''} onChange={e => setForm({ ...form, [f]: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #27272a', background: '#0c0c0e', color: '#fafafa', fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
              </div>
            ))}
            {['unit_price', 'reorder_point', 'reorder_qty'].map(f => (
              <div key={f}>
                <label style={{ fontSize: 11, color: '#71717a', display: 'block', marginBottom: 2 }}>{f.toUpperCase()}</label>
                <input type="number" value={(form as any)[f] || ''} onChange={e => setForm({ ...form, [f]: Number(e.target.value) })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #27272a', background: '#0c0c0e', color: '#fafafa', fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={async () => {
              await api.createProduct(form);
              setShowForm(false);
              setForm({ sku: '', name: '', category: 'General', vendor: '', unit: 'Box', unit_price: 0, reorder_point: 50, reorder_qty: 1000 });
              onRefresh();
            }} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#2563eb', color: 'white', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              Save
            </button>
            <button onClick={() => setShowForm(false)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #27272a', background: 'transparent', color: '#a1a1aa', fontSize: 12, cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div style={{ background: '#0c0c0e', borderRadius: 12, border: '1px solid #27272a', overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <p style={{ textAlign: 'center', padding: 40, color: '#71717a', fontSize: 13 }}>No products yet. Add your first product.</p>
        ) : (
          <>
          <div style={{ display: 'flex', gap: 12, padding: '10px 14px', borderBottom: '1px solid #27272a', background: '#06b6d410', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 800, fontSize: 14, color: '#06b6d4' }}>
              {'📊'} 总计 {filtered.length} 种 / <span style={{ color: '#fafafa' }}>{grandTotalStock}</span> 盒
            </span>
            {seriesOrder.map(s => {
              const items = (search ? filtered : products).filter(p => (p.category || 'OTHER') === s);
              const stock = items.reduce((a, p) => a + (p.current_stock || 0), 0);
              if (!items.length) return null;
              const c = s === 'CON' ? '#3b82f6' : s === 'COG' ? '#a1a1aa' : '#a855f7';
              return (
                <span key={s} style={{ fontSize: 12, color: c, fontWeight: 600 }}>
                  {s === 'CON' ? '🔵' : s === 'COG' ? '⚪' : '🟣'} {s}: <span style={{ color: '#fafafa' }}>{stock}</span>
                </span>
              );
            })}
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #27272a' }}>
                {['SKU', '名称', '系列', '当前库存', '总入库', '总出库', '状态', ''].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: '#71717a', fontWeight: 600, fontSize: 10, textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...filteredGrouped.entries()].map(([series, items]) => {
                const sStock = items.reduce((s, p) => s + (p.current_stock || 0), 0);
                const sIn = items.reduce((s, p) => s + (p.total_inbound || 0), 0);
                const sOut = items.reduce((s, p) => s + (p.total_outbound || 0), 0);
                const sc = series === 'CON' ? '#3b82f6' : series === 'COG' ? '#a1a1aa' : '#a855f7';
                return (
                  <>
                    <tr style={{ background: sc + '15', borderBottom: '1px solid ' + sc + '30' }}>
                      <td colSpan={8} style={{ padding: '8px 12px', fontWeight: 700, fontSize: 13, color: sc }}>
                        {series === 'CON' ? '🔵 CON' : series === 'COG' ? '⚪ COG' : '🟣 AES'} — {items.length} 种型号
                        <span style={{ float: 'right', fontWeight: 800, fontSize: 14 }}>
                          库存: <strong style={{ color: '#fafafa' }}>{sStock}</strong>
                          {' | '}入库: <strong style={{ color: '#22c55e' }}>{sIn}</strong>
                          {' | '}出库: <strong style={{ color: '#f59e0b' }}>{sOut}</strong>
                        </span>
                      </td>
                    </tr>
                    {items.sort((a, b) => {
                      const suffixOrder = ['RL', 'RS', 'MG', 'SEM', 'RM'];
                      const sa = suffixOrder.findIndex(s => a.sku.endsWith(s));
                      const sb = suffixOrder.findIndex(s => b.sku.endsWith(s));
                      const oa = sa >= 0 ? sa : 99;
                      const ob = sb >= 0 ? sb : 99;
                      if (oa !== ob) return oa - ob;
                      // Same suffix, sort by number
                      const na = parseInt(a.sku.replace(/[^0-9]/g, '')) || 0;
                      const nb = parseInt(b.sku.replace(/[^0-9]/g, '')) || 0;
                      return na - nb;
                    }).map(p => {
                      const isEditing = editSku === p.sku;
                      return (
                      <tr key={p.sku} style={{ borderBottom: '1px solid #18181b' }}>
                        <td style={{ padding: '8px 12px' }}><code style={{ color: '#60a5fa' }}>{p.sku}</code></td>
                        <td style={{ padding: '8px 12px', fontWeight: 500 }}>
                          {isEditing ? (
                            <input value={editForm.name || ''} onChange={e => setEditForm({...editForm, name: e.target.value})}
                              style={{ width: '100%', padding: '4px 6px', borderRadius: 4, border: '1px solid #6366f1', background: '#0c0c0e', color: '#fafafa', fontSize: 12, outline: 'none' }} />
                          ) : p.name}
                        </td>
                        <td style={{ padding: '8px 12px', color: sc }}>
                          {isEditing ? (
                            <select value={editForm.category || ''} onChange={e => setEditForm({...editForm, category: e.target.value})}
                              style={{ padding: '4px 6px', borderRadius: 4, border: '1px solid #6366f1', background: '#0c0c0e', color: '#fafafa', fontSize: 12, outline: 'none' }}>
                              {['CON','COG','AES'].map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          ) : p.category}
                        </td>
                        <td style={{ padding: '8px 12px', fontWeight: 700 }}>
                          {isEditing ? (
                            <input type="number" value={editForm.current_stock ?? 0} onChange={e => setEditForm({...editForm, current_stock: Number(e.target.value)})}
                              style={{ width: 80, padding: '4px 6px', borderRadius: 4, border: '1px solid #6366f1', background: '#0c0c0e', color: '#fafafa', fontSize: 12, outline: 'none', textAlign: 'center' }} />
                          ) : p.current_stock ?? 0}
                        </td>
                        <td style={{ padding: '8px 12px', color: '#22c55e' }}>{p.total_inbound ?? 0}</td>
                        <td style={{ padding: '8px 12px', color: '#f59e0b' }}>{p.total_outbound ?? 0}</td>
                        <td style={{ padding: '8px 12px' }}>
                          <span style={{ background: statusColor(p.status), color: 'white', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600 }}>{statusLabel(p.status)}</span>
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          {isEditing ? (
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button onClick={saveEdit} disabled={savingEdit}
                                style={{ padding: '4px 8px', borderRadius: 4, border: 'none', background: '#22c55e', color: 'white', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>
                                {savingEdit ? '...' : '保存'}
                              </button>
                              <button onClick={() => { setEditSku(null); setEditForm({}); }}
                                style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid #27272a', background: 'transparent', color: '#a1a1aa', fontSize: 10, cursor: 'pointer' }}>
                                取消
                              </button>
                            </div>
                          ) : (
                            <>
                            <button onClick={() => startEdit(p)}
                              style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid #27272a', background: 'transparent', color: '#71717a', fontSize: 11, cursor: 'pointer' }}>
                              ✏️
                            </button>
                            <button onClick={async () => {
                              if (!confirm('删除 '+p.sku+'?')) return;
                              try { await api.deleteProduct(p.sku); onRefresh(); }
                              catch (e: any) { setMessage('❌ ' + (e.message || e)); }
                            }} style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid #ef4444', background: 'transparent', color: '#ef4444', fontSize: 11, cursor: 'pointer' }}>
                              🗑
                            </button>
                            </>
                          )}
                        </td>
                      </tr>
                      );})}
                  </>
                );
              })}
              <tr style={{ borderTop: '2px solid #06b6d4', background: '#06b6d410' }}>
                <td colSpan={3} style={{ padding: '10px 12px', fontWeight: 800, fontSize: 13, color: '#06b6d4' }}>
                  {'📊'} 总计 {filtered.length} 种型号
                </td>
                <td style={{ padding: '10px 12px', fontWeight: 800, fontSize: 15, color: '#fafafa' }}>{grandTotalStock}</td>
                <td style={{ padding: '10px 12px', fontWeight: 800, fontSize: 13, color: '#22c55e' }}>{products.reduce((s, p) => s + (p.total_inbound || 0), 0)}</td>
                <td style={{ padding: '10px 12px', fontWeight: 800, fontSize: 13, color: '#f59e0b' }}>{products.reduce((s, p) => s + (p.total_outbound || 0), 0)}</td>
                <td />
              </tr>
            </tbody>
          </table>
          </>
        )}
      </div>
      <div style={{ marginTop: 20, background: '#18181b', borderRadius: 12, border: '1px solid #f59e0b', overflow: 'hidden' }}>
        <div style={{ padding: "12px 14px", borderBottom: "1px solid #27272a", fontWeight: 700, fontSize: 14, color: "#f59e0b" }}>
          {"📦"} 补货建议 <span style={{ fontWeight: 400, fontSize: 11, color: "#71717a" }}>供应商交期 2 个月</span>
        </div>
        {(() => {
          const reorder = products.filter(p => (p.total_outbound || 0) > 0).map(p => {
            const stock = p.current_stock || 0;
            const mo = p.total_outbound || 0;
            const ml = mo > 0 ? stock / mo : 99;
            const sug = mo > 0 ? Math.max(0, Math.ceil(mo * 2.5 - stock)) : 0;
            return { ...p, mo, ml: Math.round(ml * 10) / 10, sug };
          }).filter(p => p.sug > 0 || p.ml < 3).sort((a, b) => b.mo - a.mo);
          if (reorder.length === 0) {
            return <p style={{ textAlign: "center", padding: 24, color: "#71717a", fontSize: 13 }}>暂无出库数据。每日出库后将自动计算补货建议。</p>;
          }
          return (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead><tr style={{ borderBottom: "1px solid #27272a" }}>
                {["SKU","系列","库存","已出库","月均","可维持(月)","建议补货"].map(h => (
                  <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: "#71717a", fontWeight: 600, fontSize: 10 }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {reorder.map(p => (
                  <tr key={p.sku} style={{ borderBottom: "1px solid #18181b" }}>
                    <td style={{ padding: "8px 12px" }}><code style={{ color: "#60a5fa" }}>{p.sku}</code></td>
                    <td style={{ padding: "8px 12px", color: p.category === "CON" ? "#3b82f6" : p.category === "COG" ? "#a1a1aa" : "#a855f7" }}>{p.category}</td>
                    <td style={{ padding: "8px 12px", fontWeight: 700 }}>{p.current_stock || 0}</td>
                    <td style={{ padding: "8px 12px", color: "#f59e0b" }}>{p.total_outbound || 0}</td>
                    <td style={{ padding: "8px 12px" }}>{p.mo}</td>
                    <td style={{ padding: "8px 12px", color: p.ml < 2 ? "#ef4444" : p.ml < 4 ? "#f59e0b" : "#22c55e", fontWeight: 600 }}>{p.ml >= 99 ? "—" : p.ml + " 月"}</td>
                    <td style={{ padding: "8px 12px", fontWeight: 700, color: "#f59e0b" }}>{p.sug > 0 ? p.sug : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          );
        })()}
      </div>
    </div>
  );
}


// ── Inbound Tab ──
function InboundTab({ inbounds, summary, products, onRefresh }: { inbounds: InboundRecord[]; summary: InboundSummary[]; products: Product[]; onRefresh: () => void }) {
  const [sku, setSku] = useState(''); const [qty, setQty] = useState(0);
  const [largeCase, setLargeCase] = useState(0); const [smallBox, setSmallBox] = useState(0);
  const [po, setPo] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10)); const [note, setNote] = useState('');
  const [sterilized, setSterilized] = useState(true);
  const autoQty = largeCase * 100 + smallBox * 50;

  const record = async () => {
    if (!sku) return;
    await api.recordInbound({ product_sku: sku, quantity: qty, large_case_qty: largeCase, small_box_qty: smallBox, po_number: po, inbound_date: date, note, sterilized });
    setSku(''); setQty(0); setLargeCase(0); setSmallBox(0); setPo(''); setNote('');
    onRefresh();
  };

  const totalStock = products.reduce((s, p) => s + (p.current_stock || 0), 0);

  return (
    <div>
      {/* 实时总库存 */}
      <div style={{ background: 'linear-gradient(135deg, #0f3b1e, #0c0c0e)', borderRadius: 12, padding: 16, marginBottom: 12, border: '1px solid #22c55e30' }}>
        <div style={{ fontSize: 11, color: '#86efac', fontWeight: 600, marginBottom: 4 }}>📦 实时总库存</div>
        <div style={{ fontSize: 28, fontWeight: 900, color: '#22c55e' }}>{totalStock.toLocaleString()}<span style={{ fontSize: 14, color: '#86efac', fontWeight: 400, marginLeft: 8 }}>件</span></div>
      </div>

      {/* 入库登记 */}
      <div style={{ background: '#18181b', borderRadius: 12, padding: 16, marginBottom: 12, border: '1px solid #27272a' }}>
        <h4 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px' }}>📥 入库登记</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ fontSize: 11, color: '#71717a', display: 'block', marginBottom: 2 }}>型号 (SKU)</label>
            <input list="sku-list" value={sku} onChange={e => setSku(e.target.value)} placeholder="Select or type SKU"
              style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #27272a', background: '#0c0c0e', color: '#fafafa', fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
            <datalist id="sku-list">{products.map(p => <option key={p.sku} value={p.sku} label={p.name} />)}</datalist>
          </div>
          <div>
            <label style={{ fontSize: 11, color: '#71717a', display: 'block', marginBottom: 2 }}>大箱 (×100盒)</label>
            <input type="number" value={largeCase || ''} onChange={e => setLargeCase(Math.max(0, Number(e.target.value)))}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #22c55e', background: '#0c0c0e', color: '#22c55e', fontSize: 12, fontWeight: 700, outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: '#71717a', display: 'block', marginBottom: 2 }}>小箱 (×50盒)</label>
            <input type="number" value={smallBox || ''} onChange={e => setSmallBox(Math.max(0, Number(e.target.value)))}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #22c55e', background: '#0c0c0e', color: '#22c55e', fontSize: 12, fontWeight: 700, outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: '#71717a', display: 'block', marginBottom: 2 }}>零散 (盒)</label>
            <input type="number" value={qty || ''} onChange={e => setQty(Math.max(0, Number(e.target.value)))}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #f59e0b', background: '#0c0c0e', color: '#f59e0b', fontSize: 12, fontWeight: 700, outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: '#71717a', display: 'block', marginBottom: 2 }}>日期</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #27272a', background: '#0c0c0e', color: '#fafafa', fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: '#71717a', display: 'block', marginBottom: 2 }}>PO#</label>
            <input value={po} onChange={e => setPo(e.target.value)} placeholder="PO-2026-001"
              style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #27272a', background: '#0c0c0e', color: '#fafafa', fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: '#71717a', display: 'block', marginBottom: 2 }}>消毒</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={sterilized} onChange={e => setSterilized(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: '#22c55e' }} />
              <span style={{ fontSize: 12, color: sterilized ? '#22c55e' : '#71717a' }}>{sterilized ? '已消毒 ✓' : '未消毒'}</span>
            </label>
          </div>
          <div style={{ gridColumn: 'span 3' }}>
            <label style={{ fontSize: 11, color: '#71717a', display: 'block', marginBottom: 2 }}>备注</label>
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="Optional note"
              style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #27272a', background: '#0c0c0e', color: '#fafafa', fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {autoQty > 0 && <span style={{ fontSize: 16, fontWeight: 900, color: '#22c55e' }}>合计: {autoQty.toLocaleString()} 盒</span>}
          <button onClick={record} disabled={!sku || autoQty <= 0}
            style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: !sku || autoQty <= 0 ? '#27272a' : '#22c55e', color: 'white', fontSize: 12, fontWeight: 600, cursor: !sku || autoQty <= 0 ? 'not-allowed' : 'pointer' }}>
            ✅ 确认入库
          </button>
        </div>
      </div>

      {/* 入库汇总表 */}
      {summary.length > 0 && (
        <div style={{ background: '#0c0c0e', borderRadius: 12, border: '1px solid #27272a', overflow: 'hidden', marginBottom: 12 }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, padding: 12, margin: 0, borderBottom: '1px solid #18181b' }}>📊 入库汇总（按日期 + 型号 + 消毒）</h4>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #27272a' }}>
                {['入库日期', '型号', '名称', '大箱', '小箱', '合计(盒)', '批次数', '消毒'].map(h => (
                  <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: '#71717a', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {summary.map((s, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #18181b' }}>
                  <td style={{ padding: '8px 10px', fontWeight: 500 }}>{s.inbound_date}</td>
                  <td style={{ padding: '8px 10px' }}><code style={{ color: '#60a5fa' }}>{s.product_sku}</code></td>
                  <td style={{ padding: '8px 10px', color: '#e4e4e7' }}>{s.product_name || '—'}</td>
                  <td style={{ padding: '8px 10px', color: '#22c55e', fontWeight: 600 }}>{s.total_cases > 0 ? `${s.total_cases} 箱` : '—'}</td>
                  <td style={{ padding: '8px 10px', color: '#22c55e', fontWeight: 600 }}>{s.total_boxes > 0 ? `${s.total_boxes} 箱` : '—'}</td>
                  <td style={{ padding: '8px 10px', fontWeight: 700, color: '#facc15' }}>{s.total_qty}</td>
                  <td style={{ padding: '8px 10px', color: '#71717a' }}>{s.batch_count} 次</td>
                  <td style={{ padding: '8px 10px' }}>
                    <span style={{ background: s.sterilized ? '#22c55e20' : '#27272a', color: s.sterilized ? '#22c55e' : '#71717a', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600 }}>
                      {s.sterilized ? '已消毒' : '未消毒'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 入库明细 */}
      <div style={{ background: '#0c0c0e', borderRadius: 12, border: '1px solid #27272a', overflow: 'hidden' }}>
        <h4 style={{ fontSize: 13, fontWeight: 600, padding: 12, margin: 0, borderBottom: '1px solid #18181b' }}>📋 入库明细</h4>
        {inbounds.length === 0 ? (
          <p style={{ textAlign: 'center', padding: 30, color: '#71717a', fontSize: 12 }}>暂无入库记录</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #27272a' }}>
                {['日期', '型号', '名称', '大箱', '小箱', '零散', '合计', '消毒', 'PO#', '备注'].map(h => (
                  <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: '#71717a', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {inbounds.slice().reverse().map(r => (
                <tr key={r.id} style={{ borderBottom: '1px solid #18181b' }}>
                  <td style={{ padding: '8px 10px' }}>{r.inbound_date}</td>
                  <td style={{ padding: '8px 10px' }}><code style={{ color: '#60a5fa' }}>{r.product_sku}</code></td>
                  <td style={{ padding: '8px 10px', color: '#e4e4e7' }}>{(r as any).product_name || '—'}</td>
                  <td style={{ padding: '8px 10px', color: '#22c55e', fontWeight: 600 }}>{(r as any).large_case_qty > 0 ? `${(r as any).large_case_qty}` : '—'}</td>
                  <td style={{ padding: '8px 10px', color: '#22c55e', fontWeight: 600 }}>{(r as any).small_box_qty > 0 ? `${(r as any).small_box_qty}` : '—'}</td>
                  <td style={{ padding: '8px 10px', color: '#f59e0b', fontWeight: 600 }}>{(r.quantity - ((r as any).large_case_qty||0)*100 - ((r as any).small_box_qty||0)*50) > 0 ? (r.quantity - ((r as any).large_case_qty||0)*100 - ((r as any).small_box_qty||0)*50) : '—'}</td>
                  <td style={{ padding: '8px 10px', fontWeight: 700, color: '#facc15' }}>{r.quantity}</td>
                  <td style={{ padding: '8px 10px' }}>
                    <span style={{ color: (r as any).sterilized ? '#22c55e' : '#71717a', fontWeight: 600 }}>
                      {(r as any).sterilized ? '✓' : '✗'}
                    </span>
                  </td>
                  <td style={{ padding: '8px 10px', color: '#71717a' }}>{r.po_number || '—'}</td>
                  <td style={{ padding: '8px 10px', color: '#71717a' }}>{r.note || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Outbound Tab ──
function OutboundTab({ outbounds, summary, products, customers, onRefresh, setMessage }: { outbounds: OutboundRecord[]; summary: OutboundSummary[]; products: Product[]; customers: Customer[]; onRefresh: () => void; setMessage?: (msg: string) => void }) {
  const [sku, setSku] = useState(''); const [qty, setQty] = useState(0);
  const [channel, setChannel] = useState<'B2C'|'B2B'|'sample_b2b'|'sample_b2c'>('B2C');
  const [viewFilter, setViewFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'all'|'week'|'month'|'custom'>('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [customerName, setCustomerName] = useState(''); const [date, setDate] = useState(new Date().toISOString().slice(0, 10)); const [note, setNote] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<string|null>(null);
  const [customerOrders, setCustomerOrders] = useState<any[]>([]);
  const [customerDetails, setCustomerDetails] = useState<any[]>([]);
  const [pickSku, setPickSku] = useState<string|null>(null);
  const [pickQty, setPickQty] = useState(0);
  const [pickPack, setPickPack] = useState('20pcs');
  const [pickSubSku, setPickSubSku] = useState('');
  const [pickedSkus, setPickedSkus] = useState<string[]>([]);
  const [b2bScan20, setB2bScan20] = useState('');
  const [b2bScan10, setB2bScan10] = useState('');
  const [b2bItems, setB2bItems] = useState<{sku:string;q20:number;q10:number}[]>([]);
  const [b2bCustomer, setB2bCustomer] = useState('');
  const [b2bSaving, setB2bSaving] = useState(false);
  const [convert10to20, setConvert10to20] = useState(true);
  const [b2bOrders, setB2bOrders] = useState<any[]>([]);
  const [addOosSku, setAddOosSku] = useState('');
  const [addOosName, setAddOosName] = useState('');
  const [addOosPack, setAddOosPack] = useState('');
  const [addOosQty, setAddOosQty] = useState(0);
  const [addOosStock, setAddOosStock] = useState(0);
  const [showAddOos, setShowAddOos] = useState(false);
  const [editSku, setEditSku] = useState<string|null>(null);
  const [editSkuVal, setEditSkuVal] = useState('');
  const [editStockQty, setEditStockQty] = useState(0);
  const [editShipQty, setEditShipQty] = useState(0);
  const [editStatus, setEditStatus] = useState('');
  const [editPack, setEditPack] = useState('');
  const [pickFilter, setPickFilter] = useState<'all'|'oos'|'unpicked'>('unpicked');
  const [editRowId, setEditRowId] = useState<number|null>(null);
  const [editRowData, setEditRowData] = useState<any>({});
  const apiBase = 'https://harvests-cloud-api.inkflowapp.workers.dev';

  const record = async () => {
    if (!sku || !qty) return;
    await api.recordOutbound({ product_sku: sku, quantity: qty, channel, customer_name: customerName, shopify_order_id: '', outbound_date: date, note });
    setSku(''); setQty(0); setNote('');
    onRefresh();
  };

  const channelLabel: Record<string, string> = {
    B2C: 'C端客户', B2B: 'B端客户',
    sample_b2b: '样品(B端)', sample_b2c: '样品(C端)',
  };
  const channelColor: Record<string, string> = {
    B2C: '#3b82f6', B2B: '#f59e0b',
    sample_b2b: '#a855f7', sample_b2c: '#ec4899',
  };

  // Filter outbounds by channel
  const groups = {B2C: outbounds.filter(o=>o.channel==='B2C'), B2B: outbounds.filter(o=>o.channel==='B2B'),
    sample_b2b: outbounds.filter(o=>o.channel==='sample_b2b'), sample_b2c: outbounds.filter(o=>o.channel==='sample_b2c')};

  const loadCustomerOrders = async (name: string) => {
    setSelectedCustomer(name);
    const data = await api.getCustomerOrders(name);
    setCustomerOrders(data.items);
    setCustomerDetails(data.details);
  };

  const handlePick = async () => {
    const s = pickSubSku || pickSku;
    if (!s) return;
    try {
      await api.recordOutbound({ product_sku: s, quantity: pickQty, pack_source: pickPack, channel: 'B2B', customer_name: selectedCustomer, shopify_order_id: '', outbound_date: new Date().toISOString().slice(0,10), note: (pickSubSku ? 'sub:' + pickSku + '->' : '') + (pickPack === '20pcs' ? '20pcs' : '10pcs') });
      setPickedSkus(prev => [...prev, s]);
      setPickSku(null); setPickSubSku('');
      setMessage('Done'); setTimeout(() => setMessage(''), 3000);
    } catch (ex: any) { setMessage('Err: ' + (ex.message || ex)); }
  };

  const parseB2bScan = (text: string, packSize: 20|10) => {
    const tokens = text.trim().split(/[\s,;\n]+/).filter(Boolean);
    const counts: Record<string, number> = {};
    for (const t of tokens) {
      let sku = t.toUpperCase().replace(/[^A-Z0-9-]/g, '');
      if (!sku || sku.length < 3) continue;
      if (/^\d{3,4}[A-Z]*$/.test(sku)) {
        for (const pre of ['CON-','COG-','AES-','CAN-','PG-','PIC-']) { const c = pre + sku; if (products.find((p:any) => p.sku === c)) { sku = c; break; } }
      }
      const prefixes = ['CON-','COG-','AES-','CAN-','PG-','PIC-'];
      for (const pre of prefixes) { if (sku.startsWith(pre)) { counts[sku] = (counts[sku] || 0) + 1; break; } }
    }
    setB2bItems(prev => {
      const merged = [...prev];
      for (const [sku, cnt] of Object.entries(counts)) {
        const ex = merged.find(i => i.sku === sku);
        if (ex) { if (packSize === 20) ex.q20 += cnt; else ex.q10 += cnt; }
        else merged.push({ sku, q20: packSize === 20 ? cnt : 0, q10: packSize === 10 ? cnt : 0 });
      }
      return merged;
    });
  };

  const submitB2bOrder = async () => {
    if (!b2bCustomer || !b2bItems.length) { setMessage('Error'); setTimeout(() => setMessage(''), 2000); return; }
    setB2bSaving(true);
    let ok = 0; let fail = 0;
    try {
      const oid = 'B2B-' + b2bCustomer.replace(/[^a-zA-Z0-9]/g, '') + '-' + new Date().toISOString().slice(0,10);
      for (const item of b2bItems) {
        if (item.q20 > 0) {
          try {
            const ac = new AbortController(); const t = setTimeout(() => ac.abort(), 15000);
            const r = await fetch(apiBase+'/api/inventory/outbound', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({product_sku:item.sku, quantity:item.q20*20, pack_source:'20pcs', channel:'B2B', customer_name:b2bCustomer, shopify_order_id:oid, outbound_date:new Date().toISOString().slice(0,10), note:'20pcs' }), signal:ac.signal });
            clearTimeout(t); const d = await r.json(); if (d.ok) ok++; else fail++;
          } catch { fail++; }
        }
        if (item.q10 > 0) {
          const qty10 = convert10to20 ? Math.ceil(item.q10 * 10 / 20) : item.q10;
          const src10 = convert10to20 ? '20pcs' : '10pcs';
          try {
            const ac = new AbortController(); const t = setTimeout(() => ac.abort(), 15000);
            const r = await fetch(apiBase+'/api/inventory/outbound', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({product_sku:item.sku, quantity: qty10, pack_source: src10, channel:'B2B', customer_name:b2bCustomer, shopify_order_id:oid, outbound_date:new Date().toISOString().slice(0,10), note: convert10to20 ? '10to20' : '10pcs_orig' }), signal:ac.signal });
            clearTimeout(t); const d = await r.json(); if (d.ok) ok++; else fail++;
          } catch { fail++; }
        }
      }
      setMessage(fail === 0 ? 'Done: ' + ok : 'Partial: ' + ok + ' ok ' + fail);
      setB2bScan20(''); setB2bScan10(''); setB2bItems([]); setB2bCustomer('');
    } catch (ex: any) { setMessage('Error: ' + (ex.message || ex)); }
    setB2bSaving(false);
    setTimeout(() => setMessage(''), 4000);
  };

  // Date filter logic
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const getWeekStart = () => { const d = new Date(now); d.setDate(d.getDate() - d.getDay()); return d.toISOString().slice(0,10); };
  const getMonthStart = () => new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0,10);
  const getDateFilter = () => {
    if (dateRange === 'week') return { start: getWeekStart(), end: todayStr };
    if (dateRange === 'month') return { start: getMonthStart(), end: todayStr };
    if (dateRange === 'custom' && customStart && customEnd) return { start: customStart, end: customEnd };
    return null; // all
  };
  const dateFilter = getDateFilter();
  const filteredByDate = dateFilter
    ? outbounds.filter(r => r.outbound_date >= dateFilter.start && r.outbound_date <= dateFilter.end)
    : outbounds;
  const totalOutQty = filteredByDate.reduce((s, r) => s + r.quantity, 0);
  const needsCustomer = channel === 'B2B' || channel === 'sample_b2b';

  return (
    <div>
      {/* 出库统计 */}
      <div style={{ background: 'linear-gradient(135deg, #3b1f0e, #0c0c0e)', borderRadius: 12, padding: 16, marginBottom: 12, border: '1px solid #f59e0b30' }}>
        <div style={{ fontSize: 11, color: '#fbbf24', fontWeight: 600, marginBottom: 4 }}>📤 出库统计</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 6 }}>
          <span style={{ fontSize: 28, fontWeight: 900, color: '#f59e0b' }}>{totalOutQty.toLocaleString()}<span style={{ fontSize: 14, color: '#fbbf24', fontWeight: 400, marginLeft: 8 }}>盒</span></span>
          <div style={{ display: 'flex', gap: 8, fontSize: 12 }}>
            {['CON','COG','AES'].map(s => {
              const qty = filteredByDate.filter(r => r.product_sku?.startsWith(s)).reduce((a, r) => a + r.quantity, 0);
              if (!qty) return null;
              const c = s === 'CON' ? '#3b82f6' : s === 'COG' ? '#a1a1aa' : '#a855f7';
              return <span key={s} style={{ color: c, fontWeight: 600 }}>{s === 'CON' ? '🔵' : s === 'COG' ? '⚪' : '🟣'} {s}: {qty}</span>;
            })}
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {[
              { key: 'all', label: '全部' },
              { key: 'week', label: '本周' },
              { key: 'month', label: '本月' },
              { key: 'custom', label: '自定义' },
            ].map(b => (
              <button key={b.key} onClick={() => setDateRange(b.key as typeof dateRange)}
                style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: dateRange === b.key ? '#f59e0b' : '#27272a', color: 'white', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>
                {b.label}
              </button>
            ))}
          </div>
          {dateRange === 'custom' && (
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
                style={{ padding: '3px 6px', borderRadius: 4, border: '1px solid #27272a', background: '#0c0c0e', color: '#fafafa', fontSize: 11, outline: 'none' }} />
              <span style={{ color: '#71717a', fontSize: 11 }}>~</span>
              <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
                style={{ padding: '3px 6px', borderRadius: 4, border: '1px solid #27272a', background: '#0c0c0e', color: '#fafafa', fontSize: 11, outline: 'none' }} />
            </div>
          )}
        </div>
      </div>

      {/* 出库型号汇总（按时间筛选） */}
      {dateFilter && filteredByDate.length > 0 && (() => {
        const skuTotals = new Map<string, { name: string; qty: number; category: string }>();
        for (const r of filteredByDate) {
          const prev = skuTotals.get(r.product_sku) || { name: (r as any).product_name || '', qty: 0, category: '' };
          prev.qty += r.quantity;
          skuTotals.set(r.product_sku, prev);
        }
        const sorted = [...skuTotals.entries()].sort((a, b) => b[1].qty - a[1].qty);
        return (
        <div style={{ background: '#0c0c0e', borderRadius: 12, border: '1px solid #27272a', overflow: 'hidden', marginBottom: 12 }}>
          <div style={{ padding: '8px 12px', fontSize: 12, fontWeight: 600, borderBottom: '1px solid #18181b', color: '#f59e0b' }}>
            📊 出货明细（{dateFilter.start} ~ {dateFilter.end}）— {sorted.length} 种型号 / {totalOutQty} 盒
          </div>
          <div style={{ maxHeight: 300, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead><tr style={{ borderBottom: '1px solid #27272a', position: 'sticky', top: 0, background: '#0c0c0e' }}>
                {['型号', '名称', '总出库'].map(h => <th key={h} style={{ padding: '6px 10px', textAlign: 'left', color: '#71717a', fontWeight: 600 }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {sorted.map(([sku, info]) => (
                  <tr key={sku} style={{ borderBottom: '1px solid #18181b' }}>
                    <td style={{ padding: '6px 10px' }}><code style={{ color: '#60a5fa', fontSize: 11 }}>{sku}</code></td>
                    <td style={{ padding: '6px 10px', color: '#e4e4e7' }}>{info.name || '—'}</td>
                    <td style={{ padding: '6px 10px', fontWeight: 700, color: '#f59e0b' }}>{info.qty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>);
      })()}

      {/* 出库登记 */}
      <div style={{ background: '#18181b', borderRadius: 12, padding: 16, marginBottom: 12, border: '1px solid #27272a' }}>
        <h4 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px' }}>📤 出库登记</h4>
        <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
          {Object.entries(channelLabel).map(([key, label]) => (
            <button key={key} onClick={() => { setChannel(key as typeof channel); setCustomerName(''); }}
              style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: channel === key ? channelColor[key] : '#27272a', color: 'white', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
              {label}
            </button>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
          <div>
            <label style={{ fontSize: 11, color: '#71717a', display: 'block', marginBottom: 2 }}>型号 (SKU)</label>
            <input list="out-sku-list" value={sku} onChange={e => setSku(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #27272a', background: '#0c0c0e', color: '#fafafa', fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
            <datalist id="out-sku-list">{products.map(p => <option key={p.sku} value={p.sku} label={p.name} />)}</datalist>
          </div>
          <div>
            <label style={{ fontSize: 11, color: '#71717a', display: 'block', marginBottom: 2 }}>数量 (盒)</label>
            <input type="number" value={qty || ''} onChange={e => setQty(Math.max(1, Number(e.target.value)))}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #27272a', background: '#0c0c0e', color: '#fafafa', fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: '#71717a', display: 'block', marginBottom: 2 }}>出库日期</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #27272a', background: '#0c0c0e', color: '#fafafa', fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
          </div>
          {needsCustomer && (
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: 11, color: '#71717a', display: 'block', marginBottom: 2 }}>客户名称</label>
              <input list="cust-list" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="选择或输入客户"
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #27272a', background: '#0c0c0e', color: '#fafafa', fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
              <datalist id="cust-list">{customers.map(c => <option key={c.id} value={c.name} />)}</datalist>
            </div>
          )}
          <div style={{ gridColumn: needsCustomer ? 'span 1' : 'span 3' }}>
            <label style={{ fontSize: 11, color: '#71717a', display: 'block', marginBottom: 2 }}>备注</label>
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="Optional note"
              style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #27272a', background: '#0c0c0e', color: '#fafafa', fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
          </div>
        </div>
        <button onClick={record} disabled={!sku || !qty || (needsCustomer && !customerName)}
          style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: !sku || !qty || (needsCustomer && !customerName) ? '#27272a' : '#f59e0b', color: 'white', fontSize: 12, fontWeight: 600, cursor: !sku || !qty ? 'not-allowed' : 'pointer' }}>
          ✅ 确认出库
        </button>
      </div>

      {/* 客户订单汇总 */}
      {(() => {
        if (!summary.length) return null;
        // 按客户名去重合并
        const merged: Record<string, any> = {};
        for (const s of summary) {
          const name = s.customer_name || '未知';
          if (!merged[name]) merged[name] = { customer_name: name, channel: s.channel || '', total_qty: 0, total_order_qty: 0, last_date: '' };
          merged[name].total_qty += s.total_qty || 0;
          merged[name].total_order_qty = Math.max(merged[name].total_order_qty, (s as any).total_order_qty || 0);
          if ((s.last_date || '') > merged[name].last_date) merged[name].last_date = s.last_date || '';
        }
        const allItems = Object.values(merged).sort((a, b) => (b.last_date || '').localeCompare(a.last_date || ''));
        // Filter by selected channel
        const showB = channel === 'B2B' || channel === 'sample_b2b';
        const showC = channel === 'B2C' || channel === 'sample_b2c' || (!showB);
        const filteredAll = allItems.filter(s => (showB && (s.channel === 'B2B' || s.channel === 'sample_b2b')) || (showC && (s.channel === 'B2C' || s.channel === 'sample_b2c')));
        const cItems = showC ? filteredAll.filter(s => s.channel === 'B2C' || s.channel === 'sample_b2c') : [];
        const bItems = showB ? filteredAll.filter(s => s.channel === 'B2B' || s.channel === 'sample_b2b') : [];
        const today = new Date();
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const groupByMonth = (items: any[]) => {
          const groups: { label: string; items: any[] }[] = [];
          const thisMonth: any[] = []; const lastMonth: any[] = []; const older: any[] = [];
          for (const item of items) {
            const d = new Date(item.last_date);
            if (d >= monthStart) thisMonth.push(item);
            else if (d >= new Date(today.getFullYear(), today.getMonth()-1, 1)) lastMonth.push(item);
            else older.push(item);
          }
          if (thisMonth.length) groups.push({ label: '📅 本月', items: thisMonth });
          if (lastMonth.length) groups.push({ label: '📅 上月', items: lastMonth });
          if (older.length) groups.push({ label: '📅 更早', items: older });
          return groups;
        };
        const cGroups = groupByMonth(cItems);
        const bGroups = groupByMonth(bItems);
        const renderRow = (s: any) => (
          <tr key={s.customer_name} style={{ borderBottom: '1px solid #18181b', cursor: 'pointer' }} onClick={() => loadCustomerOrders(s.customer_name)}>
            <td style={{ padding: '8px 10px', fontWeight: 500, color: '#60a5fa' }}>{s.customer_name}</td>
            <td style={{ padding: '8px 10px' }}>
              <span style={{ background: `${channelColor[s.channel] || '#71717a'}20`, color: channelColor[s.channel] || '#71717a', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600 }}>{channelLabel[s.channel] || s.channel}</span>
            </td>
            <td style={{ padding: '8px 10px', fontWeight: 700, color: '#facc15' }}>{s.total_qty}</td>
            <td style={{ padding: '8px 10px', color: '#a855f7', fontWeight: 600 }}>{(s as any).total_order_qty > 0 ? (s as any).total_order_qty : '—'}</td>
            <td style={{ padding: '8px 10px', color: '#71717a' }}>{s.last_date}</td>
          </tr>
        );
        return (
        <div style={{ background: '#0c0c0e', borderRadius: 12, border: '1px solid #27272a', overflow: 'hidden', marginBottom: 12 }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, padding: 12, margin: 0, borderBottom: '1px solid #18181b' }}>📊 客户订单汇总</h4>
          {(channel === 'B2B' || channel === 'sample_b2b') && (
          <div style={{ background:'#f59e0b10', borderRadius:12, padding:14, marginBottom:12, border:'1px solid #f59e0b30' }}>
            <h5 style={{ fontSize:12, fontWeight:700, color:'#f59e0b', margin:'0 0 8px' }}>B2B Scan</h5>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:8 }}>
              <div>
                <label style={{ fontSize:10, color:'#22c55e', display:'block', marginBottom:4, fontWeight:600 }}>20PCS</label>
                <textarea value={b2bScan20} onChange={e=>setB2bScan20(e.target.value)} rows={3} placeholder="paste 20pcs barcodes..." style={{ width:'100%', padding:'6px 8px', borderRadius:6, border:'2px solid #22c55e', background:'#0c0c0e', color:'#22c55e', fontSize:11, outline:'none', boxSizing:'border-box', resize:'vertical' }} />
                <button onClick={()=>{setB2bItems([]);const v=b2bScan20;parseB2bScan(v,20);setB2bScan20('')}} style={{ marginTop:4, padding:'3px 10px', borderRadius:4, border:'none', background:'#22c55e', color:'white', fontSize:10, fontWeight:600, cursor:'pointer' }}>Parse 20pcs</button>
              </div>
              <div>
                <label style={{ fontSize:10, color:'#f59e0b', display:'block', marginBottom:4, fontWeight:600 }}>10PCS</label>
                <textarea value={b2bScan10} onChange={e=>setB2bScan10(e.target.value)} rows={3} placeholder="paste 10pcs barcodes..." style={{ width:'100%', padding:'6px 8px', borderRadius:6, border:'2px solid #f59e0b', background:'#0c0c0e', color:'#f59e0b', fontSize:11, outline:'none', boxSizing:'border-box', resize:'vertical' }} />
                <button onClick={()=>{setB2bItems([]);const v=b2bScan10;parseB2bScan(v,10);setB2bScan10('')}} style={{ marginTop:4, padding:'3px 10px', borderRadius:4, border:'none', background:'#f59e0b', color:'white', fontSize:10, fontWeight:600, cursor:'pointer' }}>Parse 10pcs</button>
              </div>
            </div>
            {b2bItems.length > 0 && (
              <div>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:10 }}>
                  <thead><tr style={{ borderBottom:'1px solid #27272a' }}>
                    <th style={{ padding:'4px 8px', textAlign:'left', color:'#71717a', fontWeight:600 }}>SKU</th>
                    <th style={{ padding:'4px 8px', textAlign:'left', color:'#22c55e', fontWeight:600 }}>20</th>
                    <th style={{ padding:'4px 8px', textAlign:'left', color:'#f59e0b', fontWeight:600 }}>10</th>
                    <th style={{ padding:'4px 8px', textAlign:'left', color:'#facc15', fontWeight:600 }}>Total</th>
                    <th></th>
                  </tr></thead>
                  <tbody>{b2bItems.map((item,i)=>(
                    <tr key={i} style={{ borderBottom:'1px solid #18181b' }}>
                      <td style={{ padding:'4px 8px' }}><code style={{ color:'#60a5fa', fontSize:10 }}>{item.sku}</code></td>
                      <td style={{ padding:'4px 8px' }}><input type="number" value={item.q20} onChange={e=>{{const nv=[...b2bItems];nv[i].q20=Math.max(0,Number(e.target.value));setB2bItems(nv)}}} style={{ width:50, padding:'2px 4px', borderRadius:4, border:'1px solid #22c55e', background:'#0c0c0e', color:'#22c55e', fontSize:10, outline:'none' }} /></td>
                      <td style={{ padding:'4px 8px' }}><input type="number" value={convert10to20?Math.ceil(item.q10*10/20):item.q10} onChange={e=>{{const nv=[...b2bItems];nv[i].q10=Math.max(0,Number(e.target.value));setB2bItems(nv)}}} style={{ width:50, padding:'2px 4px', borderRadius:4, border:'1px solid #f59e0b', background:'#0c0c0e', color:'#f59e0b', fontSize:10, outline:'none' }} /></td>
                      <td style={{ padding:'4px 8px', fontWeight:700, color:'#facc15' }}>{item.q20*20+(convert10to20?Math.ceil(item.q10*10/20)*20:item.q10*10)}</td>
                      <td style={{ padding:'4px 8px' }}><button onClick={()=>setB2bItems(p=>p.filter((_,j)=>j!==i))} style={{ padding:'2px 6px', borderRadius:4, border:'none', background:'#ef4444', color:'white', fontSize:9, cursor:'pointer' }}>X</button></td>
                    </tr>
                  ))}</tbody>
                </table>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:8, flexWrap:'wrap' }}>
                  <button onClick={()=>setConvert10to20(!convert10to20)} style={{ padding:'3px 10px', borderRadius:4, border:'none', background:convert10to20?'#f59e0b':'#27272a', color:'white', fontSize:10, fontWeight:600, cursor:'pointer' }}>{convert10to20?'10-20pcs':'10pcs orig'}</button>
                  <input list="b2b-cust-list" value={b2bCustomer} onChange={e=>setB2bCustomer(e.target.value)} placeholder="Customer" style={{ padding:'6px 10px', borderRadius:6, border:'1px solid #27272a', background:'#0c0c0e', color:'#fafafa', fontSize:12, outline:'none' }} />
                  <datalist id="b2b-cust-list">{customers.filter((c:any)=>c.customer_type?.includes('B')||c.name?.includes('B')).map((c:any)=><option key={c.id} value={c.name} />)}</datalist>
                  <button onClick={submitB2bOrder} disabled={b2bSaving||!b2bCustomer||!b2bItems.length} style={{ padding:'6px 20px', borderRadius:6, border:'none', background:b2bSaving||!b2bCustomer||!b2bItems.length?'#27272a':'#f59e0b', color:'white', fontSize:11, fontWeight:700, cursor:'pointer' }}>{b2bSaving?'...':'Submit'}</button>
                </div>
              </div>
            )}
          </div>
          )}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #27272a' }}>
                {['客户', '渠道', '总盒数', '订单总盒数', '最近日期'].map(h => <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: '#71717a', fontWeight: 600 }}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {cGroups.length > 0 && <tr style={{ background: '#3b82f620', borderBottom: '1px solid #3b82f640' }}><td colSpan={5} style={{ padding: '8px 12px', fontWeight: 800, fontSize: 13, color: '#3b82f6' }}>👤 C端客户</td></tr>}
              {cGroups.flatMap(g => [
                <tr key={'cg-'+g.label} style={{ background: '#22c55e15', borderBottom: '1px solid #22c55e30' }}><td colSpan={5} style={{ padding: '4px 12px', fontWeight: 700, fontSize: 11, color: '#22c55e' }}>{g.label}</td></tr>,
                ...g.items.map(renderRow)
              ])}
              {bGroups.length > 0 && <tr style={{ background: '#f59e0b20', borderBottom: '1px solid #f59e0b40' }}><td colSpan={5} style={{ padding: '8px 12px', fontWeight: 800, fontSize: 13, color: '#f59e0b' }}>🏢 B端客户</td></tr>}
              {bGroups.flatMap(g => [
                <tr key={'bg-'+g.label} style={{ background: '#22c55e15', borderBottom: '1px solid #22c55e30' }}><td colSpan={5} style={{ padding: '4px 12px', fontWeight: 700, fontSize: 11, color: '#22c55e' }}>{g.label}</td></tr>,
                ...g.items.map(renderRow)
              ])}
            </tbody>
          </table>
        </div>
        );
      })()}

      {/* 选中客户的各型号明细 - 3 panel */}
      {selectedCustomer && (
        <div style={{ position:'fixed', top:0, left:0, right:0, bottom:0, zIndex:1000, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }} onClick={() => setSelectedCustomer(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#1a1a1a', borderRadius: 20, border: '1px solid #27272a', maxWidth: 950, width: '100%', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid #27272a' }}>
            <h4 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>🔍 {selectedCustomer}</h4>
            <button onClick={() => setSelectedCustomer(null)} style={{ background: 'none', border: 'none', color: '#71717a', cursor: 'pointer', fontSize: 18 }}>✕</button>
          </div>
          <div style={{ overflowY:'auto', flex:1, padding:8 }}>
          <div style={{ display:'flex', gap:8, height:'100%' }}>
            {/* 左侧：拣货清单 + 已拣货 */}
            <div style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column', gap:8 }}>
              {/* 拣货清单 */}
              {(() => {
                const custOuts = outbounds.filter((o:any) => o.customer_name === selectedCustomer);
                const b2bSkus = b2bOrders.map((r:any) => r.product_sku);
                const outSkus = custOuts.map((r:any) => r.product_sku);
                const allSkus = [...new Set([...b2bSkus, ...outSkus])].sort();
                const picked = pickedSkus;
                const displaySkus = allSkus.filter((sku:any) => {
                  const shipped = custOuts.filter((r:any) => r.product_sku === sku).reduce((s:number,r:any) => s + r.quantity, 0);
                  const orderQty = b2bOrders.filter((r:any) => r.product_sku === sku).reduce((s:number,r:any) => s + (r.quantity || 0), 0);
                        const displayQty = orderQty || shipped;
                  const hasB2b = b2bOrders.some((r:any) => r.product_sku === sku);
                  if (pickFilter === 'oos') { const p = products.find((x:any) => x.sku === sku); return p && (p.status === 'out_of_stock' || p.status === 'low_stock') && (!hasB2b || shipped < orderQty); }
                  if (pickFilter === 'unpicked') return !hasB2b || shipped < orderQty;
                  return true;
                });
                return (
                <div style={{ border:'1px solid #27272a', borderRadius:10, overflow:'hidden' }}>
                  <div style={{ padding:'6px 10px', fontSize:11, fontWeight:700, color:'#fafafa', background:'#27272a', display:'flex', alignItems:'center', gap:6 }}>
                    <span>📋 拣货清单 ({displaySkus.length})</span>
                    <div style={{ display:'flex', gap:3, marginLeft:'auto' }}>
                      <button onClick={()=>setPickFilter('all')} style={{ padding:'2px 6px', borderRadius:4, border:'none', background:pickFilter==='all'?'#6366f1':'#27272a', color:'white', fontSize:10, cursor:'pointer', fontWeight:pickFilter==='all'?700:400 }}>全部</button>
                      <button onClick={()=>setPickFilter('oos')} style={{ padding:'2px 6px', borderRadius:4, border:'none', background:pickFilter==='oos'?'#ef4444':'#27272a', color:'white', fontSize:10, cursor:'pointer', fontWeight:pickFilter==='oos'?700:400 }}>缺货</button>
                      <button onClick={()=>setPickFilter('unpicked')} style={{ padding:'2px 6px', borderRadius:4, border:'none', background:pickFilter==='unpicked'?'#22c55e':'#27272a', color:'white', fontSize:10, cursor:'pointer', fontWeight:pickFilter==='unpicked'?700:400 }}>待拣</button>
                    </div>
                  </div>
                  <div style={{ maxHeight:300, overflowY:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
                    <thead><tr style={{ borderBottom:'1px solid #27272a', position:'sticky', top:0, background:'#0c0c0e' }}>
                      {['型号','订单量','包装','已发','库存','状态','操作'].map(h=><th key={h} style={{ padding:'4px 8px', textAlign:'left', color:'#71717a', fontWeight:600, fontSize:10 }}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {displaySkus.map((sku:any) => {
                        const p = products.find((x:any) => x.sku === sku);
                        const shipped = custOuts.filter((r:any) => r.product_sku === sku).reduce((s:number,r:any) => s + r.quantity, 0);
                        const orderQty = b2bOrders.filter((r:any) => r.product_sku === sku).reduce((s:number,r:any) => s + (r.quantity || 0), 0) || shipped;
                        const stock = p?.current_stock || 0;
                        const status = p?.status || '';
                        const isOos = status === 'out_of_stock' || status === 'low_stock';
                        const isPicked = picked.includes(sku);
                        const packs = [...new Set(custOuts.filter((r:any) => r.product_sku === sku).map((r:any) => (r as any).pack_source).filter(Boolean))] as string[];
                        const packsStr = packs.map((p:string) => p === '20pcs' ? '20装' : p === '10pcs' ? '10装' : p).join('/');
                        return (
                        <tr key={sku} style={{ borderBottom:'1px solid #18181b', background: isPicked ? '#22c55e10' : isOos ? '#ef444408' : 'transparent' }}>
                          <td style={{ padding:'3px 6px'}}>
                            {editSku === sku ? <input value={editSkuVal} onChange={e=>setEditSkuVal(e.target.value.toUpperCase())} style={{ width:70, padding:'1px 3px', borderRadius:3, border:'1px solid #6366f1', background:'#0c0c0e', color:'#60a5fa', fontSize:10, outline:'none' }} /> : <code style={{ color:'#60a5fa', fontSize:11 }}>{sku}</code>}
                          </td>
                          <td style={{ padding:'3px 6px', color:'#a855f7', fontWeight:600, fontSize:11 }}>{orderQty}</td>
                          <td style={{ padding:'3px 6px', fontSize:10, fontWeight:600, color: packsStr.includes('20装')?'#22c55e':'#f59e0b' }}>{packsStr || '—'}</td>
                          <td style={{ padding:'4px 8px', color:'#a855f7', fontWeight:600, fontSize:11 }}>
                            {editSku === sku ? <input type="number" value={editShipQty} onChange={e=>setEditShipQty(Math.max(0,Number(e.target.value)))} style={{ width:40, padding:'1px 3px', borderRadius:3, border:'1px solid #6366f1', background:'#0c0c0e', color:'#f59e0b', fontSize:11, outline:'none' }} /> : (isPicked ? <span style={{ color:'#22c55e', fontWeight:700 }}>{shipped}</span> : <span style={{ color:'#71717a' }}>—</span>)}
                          </td>
                          <td style={{ padding:'4px 8px', fontSize:11 }}>
                            {editSku === sku ? <input type="number" value={editStockQty} onChange={e=>setEditStockQty(Number(e.target.value))} style={{ width:40, padding:'1px 3px', borderRadius:3, border:'1px solid #6366f1', background:'#0c0c0e', color: stock > 0 ? '#22c55e' : '#ef4444', fontSize:11, outline:'none' }} /> : <span style={{ color: stock > 0 ? '#22c55e' : '#ef4444', fontSize:11 }}>{stock}</span>}
                          </td>
                          <td style={{ padding:'4px 8px', fontSize:11 }}>
                            {editSku === sku ? (
                              <select value={editStatus} onChange={e=>setEditStatus(e.target.value)} style={{ padding:'1px 3px', borderRadius:3, border:'1px solid #6366f1', background:'#0c0c0e', color:'#fafafa', fontSize:11, outline:'none' }}>
                                <option value="in_stock">正常</option><option value="low_stock">LOW</option><option value="out_of_stock">OOS</option>
                              </select>
                            ) : isPicked ? <span style={{ color:'#22c55e', fontWeight:600 }}>✓</span> : isOos ? <span style={{ color:'#ef4444', fontWeight:600, fontSize:11 }}>{status === 'out_of_stock' ? 'OOS' : 'LOW'}</span> : <span style={{ color:'#22c55e' }}>正常</span>}
                          </td>
                          <td style={{ padding:'4px 8px', fontSize:11, whiteSpace:'nowrap' }}>
                            {editSku === sku ? (
                              <>
                              <button onClick={async()=>{try{await api.updateProductField(sku,'current_stock',editStockQty);if(editStatus!==status)await api.updateProductField(sku,'status',editStatus);const recs = outbounds.filter((o:any)=>o.customer_name===selectedCustomer&&o.product_sku===sku);if(recs.length>0)await api.updateOutbound(recs[0].id,{quantity:editShipQty,pack_source:editPack||''});setEditSku(null);loadCustomerOrders(selectedCustomer);}catch(ex:any){setMessage('Err:'+(ex.message||ex))}}} style={{ padding:'2px 5px', borderRadius:3, border:'none', background:'#22c55e', color:'white', fontSize:7, fontWeight:700, cursor:'pointer' }}>保存</button>
                              <button onClick={()=>setEditSku(null)} style={{ padding:'2px 5px', borderRadius:3, border:'1px solid #27272a', background:'transparent', color:'#a1a1aa', fontSize:7, cursor:'pointer' }}>取消</button>
                              </>
                            ) : !isPicked ? (
                              <>
                              <button onClick={()=>{setEditSku(sku);setEditStockQty(stock);setEditShipQty(shipped);setEditStatus(status);setEditPack(packs[0]||'')}} style={{ padding:'2px 4px', borderRadius:3, border:'1px solid #6366f1', background:'transparent', color:'#818cf8', fontSize:7, cursor:'pointer' }}>✏️</button>
                              <button onClick={async()=>{if(!confirm('删除 '+sku+'?')) return;const recs = outbounds.filter((o:any)=>o.customer_name===selectedCustomer&&o.product_sku===sku);if(recs.length>0){for(const r of recs) try{await api.deleteOutbound(r.id)}catch{}} else {const orderRecs=b2bOrders.filter((b:any)=>b.product_sku===sku);for(const r of orderRecs) try{await fetch(apiBase+'/api/inventory/b2b-order/'+r.id,{method:'DELETE'})}catch{}}loadCustomerOrders(selectedCustomer);}} style={{ padding:'2px 4px', borderRadius:3, border:'1px solid #ef4444', background:'transparent', color:'#ef4444', fontSize:7, cursor:'pointer' }}>🗑</button>
                              {isOos ? <span style={{ color:'#ef4444', fontSize:10, fontWeight:600 }}>⛔</span> : <button onClick={()=>{setPickSku(sku);setPickQty(orderQty||shipped||1);setPickPack(packs[0]||'20pcs')}} style={{ padding:'2px 5px', borderRadius:3, border:'1px solid #22c55e', background:'transparent', color:'#22c55e', fontSize:7, cursor:'pointer', fontWeight:600 }}>拣货</button>}
                              </>
                            ) : null}
                          </td>
                        </tr>);})}
                    </tbody>
                  </table>
                  </div>
                </div>
                );
              })()}
              {/* 添加产品 */}
              {showAddOos ? (
                <div style={{ padding:'6px 10px', display:'flex', gap:6, flexWrap:'wrap', alignItems:'center', background:'#6366f110', borderRadius:8, border:'1px solid #6366f130' }}>
                  <input value={addOosSku} onChange={e=>setAddOosSku(e.target.value.toUpperCase())} placeholder="型号" style={{ width:80, padding:'3px 6px', borderRadius:4, border:'1px solid #6366f1', background:'#0c0c0e', color:'#60a5fa', fontSize:10, outline:'none' }} />
                  <select value={addOosPack} onChange={e=>setAddOosPack(e.target.value)} style={{ padding:'3px 6px', borderRadius:4, border:'1px solid #6366f1', background:'#0c0c0e', color:'#fafafa', fontSize:10, outline:'none' }}><option value="">包装</option><option value="20pcs">20装</option><option value="10pcs">10装</option></select>
                  <input type="number" value={addOosQty||''} onChange={e=>setAddOosQty(Math.max(1,Number(e.target.value)))} placeholder="数量" style={{ width:50, padding:'3px 6px', borderRadius:4, border:'1px solid #6366f1', background:'#0c0c0e', color:'#f59e0b', fontSize:10, outline:'none' }} />
                  <button onClick={async()=>{if(!addOosSku||!addOosQty){setMessage('Error');return}try{await api.recordOutbound({product_sku:addOosSku,quantity:addOosQty,pack_source:addOosPack||undefined,channel:'B2B',customer_name:selectedCustomer,shopify_order_id:'',outbound_date:new Date().toISOString().slice(0,10),note:'manual add'});setShowAddOos(false);setAddOosSku('');setAddOosPack('');setAddOosQty(0);setMessage('Done');setTimeout(()=>setMessage(''),3000);const nm=selectedCustomer;setSelectedCustomer(null);setTimeout(()=>{setSelectedCustomer(nm);onRefresh()},100)}catch(ex:any){setMessage('Err:'+(ex.message||ex))}}} style={{ padding:'3px 8px', borderRadius:4, border:'none', background:'#22c55e', color:'white', fontSize:9, fontWeight:700, cursor:'pointer' }}>保存</button>
                  <button onClick={()=>{setShowAddOos(false);setAddOosSku('');setAddOosPack('');setAddOosQty(0)}} style={{ padding:'3px 8px', borderRadius:4, border:'1px solid #27272a', background:'transparent', color:'#a1a1aa', fontSize:9, cursor:'pointer' }}>取消</button>
                </div>
              ) : (
                <button onClick={()=>setShowAddOos(true)} style={{ padding:'3px 10px', borderRadius:4, border:'1px dashed #6366f1', background:'transparent', color:'#818cf8', fontSize:10, cursor:'pointer', marginBottom:4 }}>➕ 添加产品</button>
              )}
              {/* 已拣货 */}
              {(() => {
                const custOutSku = [...new Set(outbounds.filter((o:any)=>o.customer_name===selectedCustomer).map((o:any)=>o.product_sku))];
                const displayPicked = [...new Set([...pickedSkus, ...custOutSku])];
                if (!displayPicked.length) return null;
                return (
                <div style={{ border:'1px solid #22c55e30', borderRadius:10, overflow:'hidden' }}>
                  <div style={{ padding:'6px 10px', fontSize:11, fontWeight:700, color:'#22c55e', background:'#14532d20' }}>📦 已拣货 ({displayPicked.length})</div>
                  <div style={{ maxHeight:150, overflowY:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
                    <thead><tr style={{ borderBottom:'1px solid #27272a', position:'sticky', top:0, background:'#0c0c0e' }}>
                      {['型号','盒数','操作'].map(h=><th key={h} style={{ padding:'4px 8px', textAlign:'left', color:'#71717a', fontWeight:600, fontSize:10 }}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {displayPicked.map((sku:string) => {
                        const shipped = outbounds.filter((o:any)=>o.customer_name===selectedCustomer&&o.product_sku===sku).reduce((s:number,r:any)=>s+r.quantity,0);
                        return (
                        <tr key={sku} style={{ borderBottom:'1px solid #18181b', background:'#22c55e08' }}>
                          <td style={{ padding:'3px 6px'}}><code style={{ color:'#60a5fa', fontSize:11 }}>{sku}</code> <span style={{ color:'#22c55e', fontWeight:700, fontSize:10 }}>✓</span></td>
                          <td style={{ padding:'3px 6px', color:'#22c55e', fontWeight:600, fontSize:11 }}>{shipped}</td>
                          <td style={{ padding:'3px 6px' }}>
                            <button onClick={async()=>{
                              if(!confirm('取消拣货 '+sku+'?')) return;
                              const recs = outbounds.filter((o:any)=>o.customer_name===selectedCustomer&&o.product_sku===sku);
                              for(const r of recs) try{await api.deleteOutbound(r.id)}catch{}
                              setPickedSkus((prev:string[]) => prev.filter(s => s !== sku));
                              loadCustomerOrders(selectedCustomer);
                            }} style={{ padding:'2px 4px', borderRadius:3, border:'1px solid #ef4444', background:'transparent', color:'#ef4444', fontSize:7, cursor:'pointer' }}>🗑</button>
                          </td>
                        </tr>);})}
                    </tbody>
                  </table>
                  </div>
                </div>
              )})()}
            </div>
            {/* 右侧：实际订单 */}
            <div style={{ width:300, minWidth:260, border:'1px solid #6366f130', borderRadius:10, overflow:'hidden', display:'flex', flexDirection:'column' }}>
              <div style={{ padding:'6px 10px', fontSize:11, fontWeight:700, color:'#818cf8', background:'#6366f120' }}>📋 实际订单</div>
              <div style={{ overflowY:'auto', flex:1 }}>
                {(() => {
                  const custOuts = outbounds.filter((o:any) => o.customer_name === selectedCustomer);
                  const orderItems: {sku:string;total:number;pack:string}[] = [];
                  const seen = new Set<string>();
                  for (const r of custOuts) {
                    const key = r.product_sku + '|' + ((r as any).pack_source||'');
                    if (seen.has(key)) continue;
                    seen.add(key);
                    const total = custOuts.filter((x:any) => x.product_sku === r.product_sku && (x as any).pack_source === (r as any).pack_source).reduce((s:number,x:any) => s + x.quantity, 0);
                    const packLabel = (r as any).pack_source === '20pcs' ? '20装' : (r as any).pack_source === '10pcs' ? '10装' : '—';
                    orderItems.push({ sku: r.product_sku, total, pack: packLabel });
                  }
                  orderItems.sort((a,b) => a.sku.localeCompare(b.sku));
                  return orderItems.length > 0 ? (
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
                    <thead><tr style={{ borderBottom:'1px solid #27272a', position:'sticky', top:0, background:'#0c0c0e' }}>
                      {['型号','包装','盒数','操作'].map(h=><th key={h} style={{ padding:'3px 6px', textAlign:'left', color:'#71717a', fontWeight:600, fontSize:10 }}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {orderItems.map((item,i)=>(
                        <tr key={i} style={{ borderBottom:'1px solid #18181b' }}>
                          <td style={{ padding:'3px 6px' }}><code style={{ color:'#60a5fa', fontSize:11 }}>{item.sku}</code></td>
                          <td style={{ padding:'3px 6px', fontWeight:600, fontSize:10, color: item.pack==='20装'?'#22c55e':item.pack==='10装'?'#f59e0b':'#71717a' }}>{item.pack}</td>
                          <td style={{ padding:'3px 6px', fontWeight:700, color:'#facc15', fontSize:11 }}>{item.total}</td>
                          <td style={{ padding:'3px 6px' }}>
                            <button onClick={async()=>{if(!confirm('删除 '+item.sku+'?')) return;const recs = outbounds.filter((o:any)=>o.customer_name===selectedCustomer&&o.product_sku===item.sku);for(const r of recs) try{await api.deleteOutbound(r.id)}catch{};loadCustomerOrders(selectedCustomer);}} style={{ padding:'2px 4px', borderRadius:3, border:'1px solid #ef4444', background:'transparent', color:'#ef4444', fontSize:9, cursor:'pointer' }}>🗑</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  ) : <p style={{ padding:12, color:'#71717a', fontSize:10 }}>暂无出库记录</p>;
                })()}
              </div>
            </div>
          </div>
          </div>
          </div>
        </div>
      )}      {/* 拣货弹窗 */}
      {pickSku && (
        <div style={{ position:'fixed', top:0, left:0, right:0, bottom:0, zIndex:1100, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center' }} onClick={()=>{setPickSku(null);setPickSubSku('')}}>
        <div style={{ background:'#18181b', borderRadius:16, padding:'20px 24px', border:'2px solid #22c55e', boxShadow:'0 20px 60px rgba(0,0,0,0.6)', minWidth:320, maxWidth:'90vw' }} onClick={e=>e.stopPropagation()}>
          <div style={{ textAlign:'center', marginBottom:12 }}>
            <span style={{ fontSize:14, color:'#22c55e', fontWeight:700 }}>📦 拣货</span>
            <code style={{ display:'block', color:'#60a5fa', fontSize:16, fontWeight:700, marginTop:4 }}>{pickSku}</code>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <span style={{ fontSize:11, color:'#71717a', minWidth:60 }}>替代型号</span>
              <input value={pickSubSku} onChange={e=>setPickSubSku(e.target.value.toUpperCase())} placeholder="(可选)" style={{ flex:1, padding:'8px 10px', borderRadius:8, border:'1px solid #f59e0b', background:'#0c0c0e', color:'#f59e0b', fontSize:14, outline:'none' }} />
            </div>
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <span style={{ fontSize:11, color:'#71717a', minWidth:60 }}>数量</span>
              <input type="number" value={pickQty||''} onChange={e=>setPickQty(Math.max(1,Number(e.target.value)))} style={{ flex:1, padding:'8px 10px', borderRadius:8, border:'1px solid #22c55e', background:'#0c0c0e', color:'#22c55e', fontSize:16, fontWeight:700, outline:'none' }} />
            </div>
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <span style={{ fontSize:11, color:'#71717a', minWidth:60 }}>包装</span>
              <select value={pickPack} onChange={e=>setPickPack(e.target.value)} style={{ flex:1, padding:'8px 10px', borderRadius:8, border:'1px solid #22c55e', background:'#0c0c0e', color:'#fafafa', fontSize:14, outline:'none' }}>
                <option value="20pcs">20装</option>
                <option value="10pcs">10装</option>
              </select>
            </div>
          </div>
          <div style={{ display:'flex', gap:8, marginTop:16, justifyContent:'center' }}>
            <button style={{ padding:'10px 28px', borderRadius:10, border:'none', background:'#22c55e', color:'white', fontSize:14, fontWeight:700, cursor:'pointer' }} onClick={handlePick}>确认拣货</button>
            <button style={{ padding:'10px 28px', borderRadius:10, border:'1px solid #27272a', background:'transparent', color:'#a1a1aa', fontSize:14, cursor:'pointer' }} onClick={()=>{setPickSku(null);setPickSubSku('')}}>取消</button>
          </div>
        </div>
        </div>
      )}
      {/* 已拣货 */}
      {pickedSkus.length > 0 && (
        <div style={{ border:'1px solid #22c55e30', borderRadius:10, overflow:'hidden', marginBottom:12 }}>
          <div style={{ padding:'6px 10px', fontSize:11, fontWeight:700, color:'#22c55e', background:'#14532d20' }}>📦 已拣货 ({pickedSkus.length})</div>
          <div style={{ maxHeight:180, overflowY:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:10 }}>
            <thead><tr style={{ borderBottom:'1px solid #27272a', position:'sticky', top:0, background:'#0c0c0e' }}>
              {['型号','盒数','操作'].map(h=><th key={h} style={{ padding:'4px 8px', textAlign:'left', color:'#71717a', fontWeight:600, fontSize:9 }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {pickedSkus.map(sku => {
                const shipped = outbounds.filter((o:any)=>o.customer_name===selectedCustomer&&o.product_sku===sku).reduce((s:number,r:any)=>s+r.quantity,0);
                return (
                <tr key={sku} style={{ borderBottom:'1px solid #18181b', background:'#22c55e08' }}>
                  <td style={{ padding:'4px 8px'}}><code style={{ color:'#60a5fa', fontSize:10 }}>{sku}</code> <span style={{ color:'#22c55e', fontWeight:700, fontSize:9 }}>✓</span></td>
                  <td style={{ padding:'4px 8px', color:'#22c55e', fontWeight:600 }}>{shipped}</td>
                  <td style={{ padding:'4px 8px' }}>
                    <button onClick={async()=>{
                      if(!confirm('取消拣货 '+sku+'?')) return;
                      const recs = outbounds.filter((o:any)=>o.customer_name===selectedCustomer&&o.product_sku===sku);
                      for(const r of recs) try{await api.deleteOutbound(r.id)}catch{}
                      setPickedSkus(prev => prev.filter(s => s !== sku));
                      loadCustomerOrders(selectedCustomer);
                    }} style={{ padding:'2px 5px', borderRadius:3, border:'1px solid #ef4444', background:'transparent', color:'#ef4444', fontSize:8, cursor:'pointer' }}>🗑</button>
                  </td>
                </tr>);})}
            </tbody>
          </table>
          </div>
        </div>
      )}
      {/* 出库明细 */}
      <div style={{ background: '#0c0c0e', borderRadius: 12, border: '1px solid #27272a', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 12px', borderBottom: '1px solid #18181b', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, fontWeight: 600, marginRight: 4 }}>📋 出库明细</span>
          <button onClick={() => setViewFilter('all')}
            style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: viewFilter === 'all' ? '#3b82f6' : '#27272a', color: 'white', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>
            全部
          </button>
          {Object.entries(channelLabel).map(([key, label]) => (
            <button key={key} onClick={() => setViewFilter(key)}
              style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: viewFilter === key ? channelColor[key] : '#27272a', color: 'white', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>
              {label}
            </button>
          ))}
        </div>
        {(() => {
          let filtered = viewFilter === 'all' ? outbounds : outbounds.filter(o => o.channel === viewFilter);
          if (dateFilter) filtered = filtered.filter(r => r.outbound_date >= dateFilter.start && r.outbound_date <= dateFilter.end);
          if (filtered.length === 0) return <p style={{ textAlign: 'center', padding: 20, color: '#71717a', fontSize: 11 }}>暂无出库记录</p>;
          return (<>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #27272a' }}>
                {['日期', '型号', '名称', '数量', '渠道', '客户', '备注'].map(h => (
                  <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: '#71717a', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(() => {
                // Group outbounds by order number, B2C by order# desc
                const recent = filtered.slice().reverse().slice(0, 200);
                const groups = new Map<string, typeof recent>();
                const standalone: typeof recent = [];
                for (const r of recent) {
                  // Use # order number from note if shopify_order_id is a numeric internal ID
                  let key = r.shopify_order_id || '';
                  // If the ID is purely numeric (internal Shopify ID), try to get # from note
                  if (key && /^\d+$/.test(key)) {
                    const noteMatch = (r.note || '').match(/#\d+/);
                    key = noteMatch ? noteMatch[0] : key;
                  } else if (!key) {
                    const noteMatch = (r.note || '').match(/#\d+/);
                    key = noteMatch ? noteMatch[0] : r.note || '';
                  }
                  if (key) {
                    if (!groups.has(key)) groups.set(key, []);
                    groups.get(key)!.push(r);
                  } else {
                    standalone.push(r);
                  }
                }
                // Sort groups: larger order number first
                const sortedEntries = [...groups.entries()].sort((a: [string, any[]], b: [string, any[]]) => {
                  const aNum = parseInt(a[0].replace(/[^0-9]/g, ''));
                  const bNum = parseInt(b[0].replace(/[^0-9]/g, ''));
                  if (!isNaN(aNum) && !isNaN(bNum)) return bNum - aNum;
                  return (b[0] || '').localeCompare(a[0] || '');
                });
                const rows: any[] = [];
                for (const [orderNo, items] of sortedEntries) {
                  const totalQty = items.reduce((s, i) => s + i.quantity, 0);
                  const firstDate = items[0].outbound_date;
                  rows.push(
                    <tr key={'g_' + orderNo} style={{ background: '#27272a40', borderBottom: '1px solid #27272a' }}>
                      <td colSpan={7} style={{ padding: '6px 10px', fontWeight: 700, fontSize: 12, color: '#f59e0b' }}>
                        {'📦'} 订单 {orderNo} — {items.length} 项 / {totalQty} 盒 / {firstDate}
                      </td>
                    </tr>
                  );
                  for (const r of items) {
                    rows.push(
                      <tr key={r.id} style={{ borderBottom: '1px solid #18181b' }}>
                        <td style={{ padding: '6px 10px', paddingLeft: 28, fontSize: 11 }}>{r.outbound_date}</td>
                        <td style={{ padding: '6px 10px' }}><code style={{ color: '#60a5fa', fontSize: 11 }}>{r.product_sku}</code></td>
                        <td style={{ padding: '6px 10px', color: '#e4e4e7', fontSize: 11 }}>{(r as any).product_name || '—'}</td>
                        <td style={{ padding: '6px 10px', fontWeight: 700, color: '#f59e0b', fontSize: 11 }}>-{r.quantity}</td>
                        <td style={{ padding: '6px 10px' }}>
                          <span style={{ background: `${channelColor[r.channel] || '#71717a'}20`, color: channelColor[r.channel] || '#71717a', padding: '2px 6px', borderRadius: 4, fontSize: 9, fontWeight: 600 }}>
                            {channelLabel[r.channel] || r.channel}
                          </span>
                        </td>
                        <td style={{ padding: '6px 10px', color: '#60a5fa', fontSize: 11 }}>{r.customer_name || '—'}</td>
                        <td style={{ padding: '6px 10px', color: '#71717a', fontSize: 11 }}>
                          {r.note?.includes('赠送品') ? <><span style={{ background: '#ec489920', color: '#ec4899', padding: '1px 6px', borderRadius: 4, fontSize: 9, fontWeight: 700, marginRight: 4 }}>🎁赠送</span>{r.note}</> : r.note || ''}
                        </td>
                      </tr>
                    );
                  }
                }
                for (const r of standalone) {
                  rows.push(
                    <tr key={r.id} style={{ borderBottom: '1px solid #18181b' }}>
                      <td style={{ padding: '8px 10px' }}>{r.outbound_date}</td>
                      <td style={{ padding: '8px 10px' }}><code style={{ color: '#60a5fa' }}>{r.product_sku}</code></td>
                      <td style={{ padding: '8px 10px', color: '#e4e4e7' }}>{(r as any).product_name || '—'}</td>
                      <td style={{ padding: '8px 10px', fontWeight: 700, color: '#f59e0b' }}>-{r.quantity}</td>
                      <td style={{ padding: '8px 10px' }}>
                        <span style={{ background: `${channelColor[r.channel] || '#71717a'}20`, color: channelColor[r.channel] || '#71717a', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600 }}>
                          {channelLabel[r.channel] || r.channel}
                        </span>
                      </td>
                      <td style={{ padding: '8px 10px', color: '#60a5fa' }}>{r.customer_name || '—'}</td>
                      <td style={{ padding: '8px 10px', color: '#71717a' }}>
                        {r.note?.includes('赠送品') ? <><span style={{ background: '#ec489920', color: '#ec4899', padding: '1px 6px', borderRadius: 4, fontSize: 9, fontWeight: 700, marginRight: 4 }}>🎁赠送</span>{r.note}</> : r.note || ''}
                      </td>
                    </tr>
                  );
                }
                return rows;
              })()}
            </tbody>
          </table>
          </>);
        })()}
      </div>
    </div>
  );
}

// ── Customers Tab ──
function CustomersTab({ customers, onRefresh }: { customers: Customer[]; onRefresh: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [ig, setIg] = useState(''); const [country, setCountry] = useState(''); const [type, setType] = useState('Studio');
  const [candidates, setCandidates] = useState<DistributorCandidate[]>([]);
  const [showCandidates, setShowCandidates] = useState(false);
  const [importing, setImporting] = useState<string | null>(null);

  // 客户订单查询
  const [queryName, setQueryName] = useState('');
  const [queryResult, setQueryResult] = useState<{items: any[]; details: any[]} | null>(null);
  const [querying, setQuerying] = useState(false);

  const searchCustomerOrders = async () => {
    if (!queryName.trim()) return;
    setQuerying(true);
    const data = await api.getCustomerOrders(queryName.trim());
    setQueryResult(data);
    setQuerying(false);
  };

  const save = async () => {
    if (!name) return;
    await api.saveCustomer({ name, email, instagram: ig, country, customer_type: type });
    setName(''); setEmail(''); setIg(''); setCountry(''); setType('Studio');
    setShowForm(false);
    onRefresh();
  };

  const loadCandidates = async () => {
    const c = await api.getDistributorCandidates();
    setCandidates(c);
    setShowCandidates(true);
  };

  return (
    <div>
      {/* 🔍 客户订单查询 */}
      <div style={{ background: 'linear-gradient(135deg, #1e0f3b, #0c0c0e)', borderRadius: 12, padding: 16, marginBottom: 12, border: '1px solid #a855f730' }}>
        <h4 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px', color: '#c084fc' }}>🔍 查询客户订单</h4>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input list="query-cust-list" value={queryName} onChange={e => setQueryName(e.target.value)}
            placeholder="输入客户名称查询..."
            style={{ flex: 1, padding: '10px 12px', borderRadius: 6, border: '1px solid #a855f7', background: '#0c0c0e', color: '#fafafa', fontSize: 12, outline: 'none' }} />
          <datalist id="query-cust-list">{customers.map(c => <option key={c.id} value={c.name} />)}</datalist>
          <button onClick={searchCustomerOrders} disabled={querying || !queryName.trim()}
            style={{ padding: '10px 20px', borderRadius: 6, border: 'none', background: querying || !queryName.trim() ? '#27272a' : '#a855f7', color: 'white', fontSize: 12, fontWeight: 600, cursor: querying ? 'wait' : 'pointer', whiteSpace: 'nowrap' }}>
            {querying ? '查询中...' : '查询'}
          </button>
        </div>

        {queryResult && (
          <div style={{ background: '#18181b', borderRadius: 8, border: '1px solid #27272a', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderBottom: '1px solid #27272a' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#c084fc' }}>{queryName} 的订单</span>
              <button onClick={() => setQueryResult(null)} style={{ background: 'none', border: 'none', color: '#71717a', cursor: 'pointer', fontSize: 14 }}>✕</button>
            </div>
            {queryResult.items.length === 0 ? (
              <p style={{ padding: 20, color: '#71717a', fontSize: 11, textAlign: 'center' }}>该客户暂无订单记录</p>
            ) : (
              <>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #27272a' }}>
                      {['型号', '名称', '总盒数', '订单次数', '首次下单', '最近下单'].map(h => (
                        <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: '#71717a', fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {queryResult.items.map((item, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #18181b' }}>
                        <td style={{ padding: '8px 10px' }}><code style={{ color: '#60a5fa' }}>{item.product_sku}</code></td>
                        <td style={{ padding: '8px 10px', color: '#e4e4e7' }}>{item.product_name || '—'}</td>
                        <td style={{ padding: '8px 10px', fontWeight: 700, color: '#facc15' }}>{item.total_qty}</td>
                        <td style={{ padding: '8px 10px', color: '#71717a' }}>{item.order_count}</td>
                        <td style={{ padding: '8px 10px', color: '#71717a' }}>{item.first_date}</td>
                        <td style={{ padding: '8px 10px', color: '#71717a' }}>{item.last_date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {/* 订单明细 */}
                {queryResult.details.length > 0 && (
                  <details style={{ fontSize: 11 }}>
                    <summary style={{ padding: '8px 12px', cursor: 'pointer', color: '#71717a', borderTop: '1px solid #27272a' }}>查看每笔明细 ({queryResult.details.length} 条)</summary>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
                      <thead><tr style={{ borderBottom: '1px solid #27272a' }}>
                        {['日期', '型号', '数量', '渠道', '备注'].map(h => (
                          <th key={h} style={{ padding: '6px 8px', textAlign: 'left', color: '#71717a', fontWeight: 600 }}>{h}</th>
                        ))}
                      </tr></thead>
                      <tbody>
                        {queryResult.details.map((d, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid #18181b' }}>
                            <td style={{ padding: '6px 8px' }}>{d.outbound_date}</td>
                            <td style={{ padding: '6px 8px' }}><code style={{ color: '#60a5fa' }}>{d.product_sku}</code></td>
                            <td style={{ padding: '6px 8px', fontWeight: 600, color: '#f59e0b' }}>{d.quantity}</td>
                            <td style={{ padding: '6px 8px' }}>
                              <span style={{ color: d.channel === 'B2B' ? '#f59e0b' : d.channel === 'B2C' ? '#3b82f6' : '#a855f7', fontWeight: 600 }}>
                                {d.channel === 'B2B' ? 'B端' : d.channel === 'B2C' ? 'C端' : d.channel === 'sample_b2b' ? '样品B' : '样品C'}
                              </span>
                            </td>
                            <td style={{ padding: '6px 8px', color: '#71717a' }}>{d.note || ''}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </details>
                )}
              </>
            )}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 6 }}>
        <span style={{ fontSize: 13, color: '#71717a' }}>{customers.length} customers</span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={loadCandidates} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #27272a', background: 'transparent', color: '#a1a1aa', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            📥 Import from Distributor Board
          </button>
          <button onClick={() => setShowForm(true)} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#a855f7', color: 'white', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>+ Customer</button>
        </div>
      </div>

      {showForm && (
        <div style={{ background: '#18181b', borderRadius: 12, padding: 16, marginBottom: 12, border: '1px solid #27272a' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
            {[{ f: name, s: setName, l: 'Name' }, { f: email, s: setEmail, l: 'Email' }, { f: ig, s: setIg, l: 'Instagram' }, { f: country, s: setCountry, l: 'Country' }].map(({ f, s, l }) => (
              <div key={l}>
                <label style={{ fontSize: 11, color: '#71717a', display: 'block', marginBottom: 2 }}>{l.toUpperCase()}</label>
                <input value={f} onChange={e => s(e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #27272a', background: '#0c0c0e', color: '#fafafa', fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={save} disabled={!name} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: !name ? '#27272a' : '#a855f7', color: 'white', fontSize: 12, fontWeight: 600, cursor: !name ? 'not-allowed' : 'pointer' }}>Save</button>
            <button onClick={() => setShowForm(false)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #27272a', background: 'transparent', color: '#a1a1aa', fontSize: 12, cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Distributor candidates */}
      {showCandidates && (
        <div style={{ background: '#18181b', borderRadius: 12, marginBottom: 12, border: '1px solid #27272a', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid #27272a' }}>
            <h4 style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>Distributor Candidates ({candidates.length})</h4>
            <button onClick={() => setShowCandidates(false)} style={{ background: 'none', border: 'none', color: '#71717a', cursor: 'pointer', fontSize: 14 }}>X</button>
          </div>
          {candidates.length === 0 ? (
            <p style={{ padding: 20, color: '#71717a', fontSize: 12, textAlign: 'center' }}>No candidates found</p>
          ) : (
            <div style={{ maxHeight: 300, overflowY: 'auto' }}>
              {candidates.map(c => {
                const name = c.shop_name || c.full_name || c.username || 'Unknown';
                return (
                  <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 14px', borderBottom: '1px solid #18181b' }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 500 }}>{name}</div>
                      <div style={{ fontSize: 10, color: '#71717a' }}>
                        {c.ig_handle && <span>@{c.ig_handle} · </span>}
                        {c.city && <span>{c.city}</span>}
                      </div>
                    </div>
                    <button onClick={async () => {
                      setImporting(c.id);
                      await api.importDistributor(c.id);
                      setImporting(null);
                      onRefresh();
                    }} disabled={importing === c.id}
                      style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: importing === c.id ? '#27272a' : '#a855f7', color: 'white', fontSize: 10, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      {importing === c.id ? '...' : 'Import'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div style={{ background: '#0c0c0e', borderRadius: 12, border: '1px solid #27272a', overflow: 'hidden' }}>
        {customers.length === 0 ? (
          <p style={{ textAlign: 'center', padding: 40, color: '#71717a', fontSize: 13 }}>No customers yet.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead><tr style={{ borderBottom: '1px solid #27272a' }}>
              {['Name', 'Email', 'Instagram', 'Country', 'Type', 'Orders', 'Status'].map(h => (
                <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: '#71717a', fontWeight: 600, fontSize: 10, textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>{customers.map(c => (
              <tr key={c.id} style={{ borderBottom: '1px solid #18181b' }}>
                <td style={{ padding: '10px 12px', fontWeight: 500 }}>{c.name}</td>
                <td style={{ padding: '10px 12px', color: '#71717a' }}>{c.email || '—'}</td>
                <td style={{ padding: '10px 12px', color: '#60a5fa' }}>{c.instagram || '—'}</td>
                <td style={{ padding: '10px 12px', color: '#71717a' }}>{c.country || '—'}</td>
                <td style={{ padding: '10px 12px' }}>{c.customer_type}</td>
                <td style={{ padding: '10px 12px' }}>{c.total_orders}</td>
                <td style={{ padding: '10px 12px' }}><span style={{ background: c.status === 'Active' ? '#22c55e' : '#71717a', color: 'white', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600 }}>{c.status}</span></td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Alerts Tab ──
function AlertsTab({ alerts, products }: { alerts: StockAlert[]; products: Product[] }) {
  const urgent = alerts.filter(a => a.days_until_stockout_urgent === 'urgent');
  const warning = alerts.filter(a => a.days_until_stockout_urgent === 'warning');

  return (
    <div>
      {alerts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <p style={{ fontSize: 16, color: '#22c55e', fontWeight: 600 }}>✓ All stock levels are healthy</p>
          <p style={{ fontSize: 13, color: '#71717a', marginTop: 4 }}>No reorder alerts at this time.</p>
        </div>
      ) : (
        <>
          {urgent.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <h4 style={{ fontSize: 13, fontWeight: 600, color: '#ef4444', margin: '0 0 8px' }}>⚠ Urgent — Order Now ({urgent.length})</h4>
              {urgent.map(a => <AlertCard alert={a} />)}
            </div>
          )}
          {warning.length > 0 && (
            <div>
              <h4 style={{ fontSize: 13, fontWeight: 600, color: '#f59e0b', margin: '0 0 8px' }}>Warning — Reorder Soon ({warning.length})</h4>
              {warning.map(a => <AlertCard alert={a} />)}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function AlertCard({ alert }: { alert: StockAlert }) {
  const stockLeft = alert.current_stock;
  const dailyUse = alert.avg_daily_usage || 1;
  const daysLeft = dailyUse > 0 ? Math.round(stockLeft / dailyUse) : 999;
  return (
    <div style={{ background: '#18181b', borderRadius: 10, padding: 12, marginBottom: 8, border: '1px solid #27272a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <div style={{ fontWeight: 600, fontSize: 13 }}>{alert.name}</div>
        <div style={{ fontSize: 11, color: '#71717a' }}>{alert.sku} · {alert.category}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: stockLeft <= alert.reorder_point ? '#ef4444' : '#f59e0b' }}>{stockLeft}</div>
        <div style={{ fontSize: 10, color: '#71717a' }}>stock / reorder at {alert.reorder_point}</div>
        <div style={{ fontSize: 10, color: '#71717a' }}>≈ {daysLeft} days left · suggest +{alert.suggested_reorder_qty}</div>
      </div>
    </div>
  );
}
