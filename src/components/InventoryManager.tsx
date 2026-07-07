import { useEffect, useState, Fragment } from 'react';
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
  const [scanPackSource, setScanPackSource] = useState<'20pack' | '10pack'>('20pack');
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

  useEffect(() => { loadAll(); }, []);

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
            {scanMode === 'outbound' && scanCustomer && scanCustomer !== 'B2C' && (
              <div>
                <label style={{ fontSize: 11, color: '#71717a', display: 'block', marginBottom: 2 }}>包装来源</label>
                <select value={scanPackSource} onChange={e => setScanPackSource(e.target.value as '20pack' | '10pack')}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #27272a', background: '#0c0c0e', color: '#fafafa', fontSize: 12, outline: 'none', boxSizing: 'border-box' }}>
                  <option value="20pack">20只装（拆箱）</option>
                  <option value="10pack">10只装（专用包装）</option>
                </select>
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
                pack_source: scanCustomer && scanCustomer !== 'B2C' ? scanPackSource : '20pack',
              });
            }
            setMessage(`${scanMode === 'inbound' ? 'Inbound' : 'Outbound'} recorded: ${scanSku} x${scanQty}`);
            setTimeout(() => setMessage(''), 3000);
            setScanBarcode(''); setScanSku(''); setScanQty(1); setScanCustomer(''); setScanNote(''); setScanPackSource('20pack'); setScanSterilized(true); setScanLargeCase(0); setScanSmallBox(0);
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

      {tab === 'stock' && <StockTab products={products} onRefresh={loadAll} />}
      {tab === 'inbound' && <InboundTab inbounds={inbounds} summary={inboundSummary} products={products} onRefresh={loadAll} />}
      {tab === 'outbound' && <OutboundTab outbounds={outbounds} summary={outboundSummary} products={products} customers={customers} onRefresh={loadAll} />}
      {tab === 'customers' && <CustomersTab customers={customers} onRefresh={loadAll} />}
    </div>
  );
}

// ── Stock Tab ──
function StockTab({ products, onRefresh }: { products: Product[]; onRefresh: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ sku: '', name: '', barcode: '', category: 'General', vendor: '', unit: 'Box', unit_price: 0, reorder_point: 50, reorder_qty: 1000 });
  const [search, setSearch] = useState('');
  const [outSku, setOutSku] = useState('');
  const [outQty, setOutQty] = useState(1);
  const [outSaving, setOutSaving] = useState(false);
  const [editingField, setEditingField] = useState<{ sku: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');

  const startEdit = (sku: string, field: string, currentVal: any) => {
    setEditingField({ sku, field });
    setEditValue(String(currentVal ?? 0));
  };
  const saveEdit = async () => {
    if (!editingField) return;
    const { sku, field } = editingField;
    const numVal = field === 'name' ? editValue : Number(editValue);
    await api.updateProductField(sku, field, numVal);
    setEditingField(null);
    onRefresh();
  };
  const cancelEdit = () => { setEditingField(null); };
  const isEditing = (sku: string, field: string) => editingField?.sku === sku && editingField?.field === field;

  const InlineEditCell = ({ sku, field, value, style: cellStyle }: { sku: string; field: string; value: any; style?: React.CSSProperties }) => {
    if (isEditing(sku, field)) {
      return (
        <td style={{ padding: '8px 12px' }}>
          <input
            type={field === 'name' ? 'text' : 'number'}
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            onBlur={saveEdit}
            onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }}
            autoFocus
            style={{ width: field === 'name' ? 140 : 70, padding: '4px 6px', borderRadius: 4, border: '1px solid #06b6d4', background: '#0c0c0e', color: '#fafafa', fontSize: 12, fontWeight: 700, outline: 'none' }}
          />
        </td>
      );
    }
    return (
      <td
        style={{ padding: '8px 12px', cursor: 'pointer', ...cellStyle }}
        onDoubleClick={() => startEdit(sku, field, value)}
        title="双击编辑"
      >
        {value ?? 0}
      </td>
    );
  };

  const filtered = search ? products.filter(p =>
    p.sku.toLowerCase().includes(search.toLowerCase()) || p.name.toLowerCase().includes(search.toLowerCase())
  ) : products;

  const statusColor = (s: string) => s === 'out_of_stock' ? '#ef4444' : s === 'low_stock' ? '#f59e0b' : '#22c55e';
  const statusLabel = (s: string) => s === 'out_of_stock' ? 'Out' : s === 'low_stock' ? 'Low' : 'OK';

  const doOutbound = async () => {
    if (!outSku || outQty < 1) return;
    setOutSaving(true);
    await api.recordOutbound({ product_sku: outSku, quantity: outQty, channel: 'B2C', customer_name: '日销', shopify_order_id: '', outbound_date: new Date().toISOString().slice(0, 10), note: '日销出库' });
    setOutSaving(false);
    setOutSku(''); setOutQty(1);
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

          <button onClick={doOutbound} disabled={!outSku || outSaving}
            style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: !outSku ? '#27272a' : '#f59e0b', color: 'white', fontSize: 12, fontWeight: 700, cursor: !outSku ? 'not-allowed' : 'pointer' }}>
            {outSaving ? '保存中...' : '出库'}
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
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #27272a' }}>
                {['SKU', '名称', '系列', '当前库存', '总入库', '总出库', '状态'].map(h => (
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
                      <td colSpan={7} style={{ padding: '8px 12px', fontWeight: 700, fontSize: 13, color: sc }}>
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
                    }).map(p => (
                      <tr key={p.sku} style={{ borderBottom: '1px solid #18181b' }}>
                        <td style={{ padding: '8px 12px' }}><code style={{ color: '#60a5fa' }}>{p.sku}</code></td>
                        <InlineEditCell sku={p.sku} field="name" value={p.name} style={{ fontWeight: 500 }} />
                        <td style={{ padding: '8px 12px', color: sc }}>{p.category}</td>
                        <InlineEditCell sku={p.sku} field="current_stock" value={p.current_stock ?? 0} style={{ fontWeight: 700 }} />
                        <td style={{ padding: '8px 12px', color: '#22c55e' }}>{p.total_inbound ?? 0}</td>
                        <td style={{ padding: '8px 12px', color: '#f59e0b' }}>{p.total_outbound ?? 0}</td>
                        <td style={{ padding: '8px 12px' }}>
                          <span style={{ background: statusColor(p.status), color: 'white', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600 }}>{statusLabel(p.status)}</span>
                        </td>
                      </tr>
                    ))}
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
        )}
      </div>

      {/* Reorder suggestions */}
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
function OutboundTab({ outbounds, summary, products, customers, onRefresh }: { outbounds: OutboundRecord[]; summary: OutboundSummary[]; products: Product[]; customers: Customer[]; onRefresh: () => void }) {
  const [sku, setSku] = useState(''); const [qty, setQty] = useState(0);
  const [channel, setChannel] = useState<'B2C'|'B2B'|'sample_b2b'|'sample_b2c'>('B2C');
  const [customerName, setCustomerName] = useState(''); const [date, setDate] = useState(new Date().toISOString().slice(0, 10)); const [note, setNote] = useState('');
  const [packSource, setPackSource] = useState<'20pack' | '10pack'>('20pack');
  const [selectedCustomer, setSelectedCustomer] = useState<string|null>(null);
  const [customerOrders, setCustomerOrders] = useState<any[]>([]);
  const [customerDetails, setCustomerDetails] = useState<any[]>([]);

  const record = async () => {
    if (!sku || !qty) return;
    await api.recordOutbound({ product_sku: sku, quantity: qty, channel, customer_name: customerName, shopify_order_id: '', outbound_date: date, note, pack_source: needsCustomer ? packSource : '20pack' });
    setSku(''); setQty(0); setNote(''); setPackSource('20pack');
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

  const totalOutQty = outbounds.reduce((s, r) => s + r.quantity, 0);
  const needsCustomer = channel === 'B2B' || channel === 'sample_b2b';

  return (
    <div>
      {/* 实时总出库 */}
      <div style={{ background: 'linear-gradient(135deg, #3b1f0e, #0c0c0e)', borderRadius: 12, padding: 16, marginBottom: 12, border: '1px solid #f59e0b30' }}>
        <div style={{ fontSize: 11, color: '#fbbf24', fontWeight: 600, marginBottom: 4 }}>📤 实时总出库</div>
        <div style={{ fontSize: 28, fontWeight: 900, color: '#f59e0b' }}>{totalOutQty.toLocaleString()}<span style={{ fontSize: 14, color: '#fbbf24', fontWeight: 400, marginLeft: 8 }}>盒</span></div>
      </div>

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
          {needsCustomer && (
            <div>
              <label style={{ fontSize: 11, color: '#71717a', display: 'block', marginBottom: 2 }}>包装来源</label>
              <select value={packSource} onChange={e => setPackSource(e.target.value as '20pack' | '10pack')}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #27272a', background: '#0c0c0e', color: '#fafafa', fontSize: 12, outline: 'none', boxSizing: 'border-box' }}>
                <option value="20pack">20只装（拆箱）</option>
                <option value="10pack">10只装（专用）</option>
              </select>
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
      {summary.length > 0 && (
        <div style={{ background: '#0c0c0e', borderRadius: 12, border: '1px solid #27272a', overflow: 'hidden', marginBottom: 12 }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, padding: 12, margin: 0, borderBottom: '1px solid #18181b' }}>📊 客户订单汇总</h4>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #27272a' }}>
                {['客户', '渠道', '总盒数', '订单数', '最近日期'].map(h => (
                  <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: '#71717a', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {summary.map((s, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #18181b', cursor: 'pointer' }} onClick={() => loadCustomerOrders(s.customer_name)}>
                  <td style={{ padding: '8px 10px', fontWeight: 500, color: '#60a5fa' }}>{s.customer_name}</td>
                  <td style={{ padding: '8px 10px' }}>
                    <span style={{ background: `${channelColor[s.channel] || '#71717a'}20`, color: channelColor[s.channel] || '#71717a', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600 }}>
                      {channelLabel[s.channel] || s.channel}
                    </span>
                  </td>
                  <td style={{ padding: '8px 10px', fontWeight: 700, color: '#facc15' }}>{s.total_qty}</td>
                  <td style={{ padding: '8px 10px', color: '#71717a' }}>{s.total_orders}</td>
                  <td style={{ padding: '8px 10px', color: '#71717a' }}>{s.last_date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 选中客户的各型号明细 */}
      {selectedCustomer && (
        <div style={{ background: '#18181b', borderRadius: 12, border: '1px solid #27272a', overflow: 'hidden', marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderBottom: '1px solid #27272a' }}>
            <h4 style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>🔍 {selectedCustomer} — 各型号订单</h4>
            <button onClick={() => setSelectedCustomer(null)} style={{ background: 'none', border: 'none', color: '#71717a', cursor: 'pointer', fontSize: 14 }}>✕</button>
          </div>
          {customerOrders.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #27272a' }}>
                  {['型号', '名称', '总盒数', '订单次数', '首次', '最近'].map(h => (
                    <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: '#71717a', fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {customerOrders.map((item, i) => (
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
          ) : <p style={{ padding: 20, color: '#71717a', fontSize: 11 }}>暂无数据</p>}
        </div>
      )}

      {/* 出库明细 */}
      <div style={{ background: '#0c0c0e', borderRadius: 12, border: '1px solid #27272a', overflow: 'hidden' }}>
        <h4 style={{ fontSize: 13, fontWeight: 600, padding: 12, margin: 0, borderBottom: '1px solid #18181b' }}>📋 出库明细</h4>
        {outbounds.length === 0 ? <p style={{ textAlign: 'center', padding: 20, color: '#71717a', fontSize: 11 }}>暂无出库记录</p> : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #27272a' }}>
                {['日期', '型号', '名称', '数量', '渠道', '客户', '备注'].map(h => (
                  <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: '#71717a', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {outbounds.slice().reverse().slice(0, 50).map(r => (
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
