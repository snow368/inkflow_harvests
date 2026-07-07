import { useEffect, useState } from 'react';
import * as api from '../lib/inventory-api';
import type { Product } from '../lib/inventory-api';

export default function StocktakeTab({ products, onRefresh }: { products: Product[]; onRefresh: () => void }) {
  const [scanSku, setScanSku] = useState('');
  const [scanQty, setScanQty] = useState(1);
  const [records, setRecords] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  const loadRecords = async () => {
    const items = await api.getStocktakes();
    setRecords(items);
  };
  useEffect(() => { loadRecords(); }, []);

  const handleScan = async () => {
    const sku = scanSku.trim().toUpperCase();
    const qty = Math.max(1, scanQty || 1);
    if (!sku) return;
    setScanSku('');
    setScanQty(1);
    const product = products.find(p => p.sku === sku);
    const existing = records.find(r => r.sku === sku);
    const newActual = (existing?.actual_qty || 0) + qty;
    const expected = product?.current_stock || 0;
    setSaving(true);
    await api.saveStocktake({ location: '_all_', sku, expected_qty: expected, actual_qty: newActual });
    setSaving(false);
    if (existing) {
      setRecords(prev => prev.map(r =>
        r.sku === sku
          ? { ...r, actual_qty: newActual, expected_qty: expected, difference: newActual - expected }
          : r
      ));
    } else {
      setRecords(prev => [...prev, {
        id: Date.now(), location: '_all_', sku, product_name: product?.name || '',
        expected_qty: expected, actual_qty: qty, difference: qty - expected, notes: '', created_at: Date.now()
      }]);
    }
  };

  const clearAll = async () => {
    if (!confirm('清空所有盘点记录？')) return;
    await api.clearStocktakes();
    setRecords([]);
  };

  const adjustAll = async () => {
    if (!confirm('将所有差异生成入库/出库调整？')) return;
    const diffs = records.filter(r => r.difference !== 0);
    let done = 0;
    for (const r of diffs) {
      if (r.difference > 0) {
        await api.recordInbound({ product_sku: r.sku, quantity: r.difference, po_number: 'stocktake', inbound_date: new Date().toISOString().slice(0, 10), note: '盘点调整', sterilized: false });
      } else {
        await api.recordOutbound({ product_sku: r.sku, quantity: Math.abs(r.difference), channel: 'B2C', customer_name: '盘点亏损', shopify_order_id: '', outbound_date: new Date().toISOString().slice(0, 10), note: '盘点调整' });
      }
      await api.deleteStocktake(r.id);
      done++;
    }
    setRecords([]);
    onRefresh(); loadRecords();
    alert('已处理 ' + done + ' 项差异');
  };

  const sorted = [...records].sort((a, b) => a.sku.localeCompare(b.sku));
  const stats = { skus: records.length, totalQty: records.reduce((s, r) => s + r.actual_qty, 0) };
  const diffsCount = records.filter(r => r.difference !== 0).length;

  return (
    <div>
      <div style={{ marginBottom: 12, display: 'flex', gap: 8 }}>
        <input value={scanSku} onChange={e => setScanSku(e.target.value.toUpperCase())}
          placeholder="型号 (如 CON0803RL)"
          style={{ flex: 1, padding: '12px 14px', borderRadius: 8, border: '1px solid #06b6d4', background: '#0c0c0e', color: '#06b6d4', fontSize: 16, fontWeight: 700, outline: 'none' }}
          autoFocus />
        <input type="number" value={scanQty || ''} onChange={e => setScanQty(Math.max(1, Number(e.target.value)))}
          placeholder="箱内盒数"
          style={{ width: 100, padding: '12px 14px', borderRadius: 8, border: '1px solid #06b6d4', background: '#0c0c0e', color: '#06b6d4', fontSize: 16, fontWeight: 700, outline: 'none', textAlign: 'center' }} />
        <button onClick={handleScan} disabled={!scanSku.trim()}
          style={{ padding: '12px 20px', borderRadius: 8, border: 'none', background: !scanSku.trim() ? '#27272a' : '#06b6d4', color: 'white', fontSize: 14, fontWeight: 700, cursor: !scanSku.trim() ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}>
          + 添加
        </button>
        {saving && <span style={{ fontSize: 11, color: '#06b6d4', alignSelf: 'center' }}>保存中...</span>}
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 12, fontSize: 12, color: '#71717a' }}>
        <span>{'📦'} <strong style={{ color: '#fafafa' }}>{stats.skus}</strong> 种型号</span>
        <span>{'📊'} <strong style={{ color: '#fafafa' }}>{stats.totalQty}</strong> 总盒数</span>
        {diffsCount > 0 && <span style={{ color: '#f59e0b' }}>{'⚠️'} <strong>{diffsCount}</strong> 项差异</span>}
        <span style={{ flex: 1 }} />
        <button onClick={clearAll} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #ef4444', background: 'transparent', color: '#ef4444', fontSize: 10, cursor: 'pointer' }}>{'🗑️'} 清空</button>
      </div>

      {sorted.length === 0 ? (
        <p style={{ textAlign: 'center', padding: 40, color: '#71717a', fontSize: 13 }}>暂无盘点记录。输入型号和数量开始盘点。</p>
      ) : (
        <div style={{ background: '#18181b', borderRadius: 12, border: '1px solid #27272a', overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid #27272a', fontWeight: 700, fontSize: 12, color: '#71717a', display: 'flex' }}>
            <span style={{ width: 140 }}>型号</span>
            <span style={{ flex: 1 }}>名称</span>
            <span style={{ width: 70, textAlign: 'right' }}>系统</span>
            <span style={{ width: 70, textAlign: 'right' }}>实盘</span>
            <span style={{ width: 70, textAlign: 'right' }}>差异</span>
            <span style={{ width: 30 }} />
          </div>
          {sorted.map(r => (
            <div key={r.sku} style={{ padding: '8px 14px', borderBottom: '1px solid #27272a', display: 'flex', alignItems: 'center', fontSize: 12 }}>
              <span style={{ fontWeight: 600, width: 140 }}><code style={{ color: '#60a5fa' }}>{r.sku}</code></span>
              <span style={{ color: '#71717a', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.product_name || '—'}</span>
              <span style={{ width: 70, textAlign: 'right', color: '#71717a' }}>{r.expected_qty}</span>
              <span style={{ width: 70, textAlign: 'right', color: '#06b6d4', fontWeight: 700 }}>{r.actual_qty}</span>
              <span style={{ width: 70, textAlign: 'right', color: r.difference === 0 ? '#22c55e' : r.difference > 0 ? '#f59e0b' : '#ef4444', fontWeight: 700 }}>
                {r.difference > 0 ? '+' + r.difference : r.difference}
              </span>
              <div style={{ width: 30, textAlign: 'right' }}>
                <button onClick={async () => {
                  await api.deleteStocktake(r.id);
                  setRecords(prev => prev.filter(x => x.id !== r.id));
                }} style={{ padding: '2px 6px', borderRadius: 4, border: '1px solid #27272a', background: 'transparent', color: '#ef4444', fontSize: 10, cursor: 'pointer' }}>{'✕'}</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {diffsCount > 0 && (
        <button onClick={adjustAll} style={{ marginTop: 12, padding: '12px', borderRadius: 8, border: 'none', background: '#06b6d4', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer', width: '100%' }}>
          {'🔄'} 全部调整 ({diffsCount} 项差异)
        </button>
      )}
    </div>
  );
}
