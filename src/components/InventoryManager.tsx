import React, { useMemo, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import {
  Package,
  Upload,
  AlertTriangle,
  CheckCircle2,
  Search,
  RefreshCw,
  Plus,
  Trash2,
  Link2
} from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { useCRM } from '../contexts/CRMContext';

export default function InventoryManager() {
  const {
    inventoryItems,
    inventoryForecasts,
    inventoryImportTemplateHeaders,
    inventorySyncConfig,
    upsertInventoryItem,
    deleteInventoryItem,
    importInventoryCSV,
    syncShopifyInventory,
    updateInventorySyncConfig
  } = useCRM();

  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'low' | 'out'>('all');
  const [draft, setDraft] = useState({
    sku: '',
    name: '',
    category: 'General',
    stock: '0',
    threshold: '5',
    price: ''
  });
  const [syncing, setSyncing] = useState(false);
  const [forecastFilter, setForecastFilter] = useState<'all' | 'need7' | 'need15'>('need7');

  const onDrop = async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    const text = await file.text();
    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const headers = Array.isArray((results as any)?.meta?.fields) ? (results as any).meta.fields as string[] : [];
        const imported = await importInventoryCSV(results.data as any[], headers);
        toast.success(`Inventory CSV imported: ${imported.imported} rows`);
      },
      error: (err) => toast.error(`CSV parse failed: ${err.message}`)
    });
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv']
    },
    multiple: false
  } as any);

  const filteredInventory = useMemo(() => {
    return inventoryItems.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;
      if (filter === 'low') return item.stock > 0 && item.stock <= item.threshold;
      if (filter === 'out') return item.stock === 0;
      return true;
    });
  }, [inventoryItems, searchQuery, filter]);

  const forecastBoardRows = useMemo(() => {
    const rows = [...inventoryForecasts];
    const filtered = rows.filter((f) => {
      if (forecastFilter === 'need7') return f.recommendQty7d > 0;
      if (forecastFilter === 'need15') return f.recommendQty15d > 0;
      return true;
    });
    return filtered.sort((a, b) => {
      const aScore = (a.recommendQty7d * 2) + a.recommendQty15d;
      const bScore = (b.recommendQty7d * 2) + b.recommendQty15d;
      if (bScore !== aScore) return bScore - aScore;
      return a.sku.localeCompare(b.sku);
    });
  }, [inventoryForecasts, forecastFilter]);

  const onAddOrUpdate = async () => {
    if (!draft.sku.trim() || !draft.name.trim()) {
      toast.error('SKU and Name are required');
      return;
    }
    await upsertInventoryItem({
      sku: draft.sku.trim(),
      name: draft.name.trim(),
      category: draft.category.trim() || 'General',
      stock: Number(draft.stock || 0),
      threshold: Number(draft.threshold || 5),
      price: draft.price ? Number(draft.price) : undefined,
      source: 'manual'
    });
    setDraft({ sku: '', name: '', category: 'General', stock: '0', threshold: '5', price: '' });
    toast.success('Inventory item saved');
  };

  const onSyncShopify = async () => {
    setSyncing(true);
    try {
      await syncShopifyInventory();
    } finally {
      setSyncing(false);
    }
  };

  const exportForecastCSV = () => {
    const baseHeaders = inventoryImportTemplateHeaders.length > 0
      ? inventoryImportTemplateHeaders
      : ['sku', 'name', 'stock', 'threshold'];

    const dynamicHeaders = [
      'daily_consumption',
      'days_left',
      'recommend_qty_7d',
      'recommend_qty_15d',
      'recommended_cycle_days'
    ];
    const headers = [...baseHeaders, ...dynamicHeaders];

    const headerSet = new Set(baseHeaders.map((h) => h.toLowerCase().trim()));
    const rows = inventoryForecasts.map((f) => {
      const row: Record<string, string | number> = {};
      const stockHeader = baseHeaders.find((h) => ['stock', 'available', 'quantity', 'inventory'].includes(h.toLowerCase().trim())) || 'stock';
      const thresholdHeader = baseHeaders.find((h) => ['threshold', 'low stock threshold', 'reorder point'].includes(h.toLowerCase().trim())) || 'threshold';
      const skuHeader = baseHeaders.find((h) => ['sku', 'variant sku', 'product sku'].includes(h.toLowerCase().trim())) || 'sku';
      const nameHeader = baseHeaders.find((h) => ['name', 'product name', 'title', 'variant title'].includes(h.toLowerCase().trim())) || 'name';

      row[skuHeader] = f.sku;
      row[nameHeader] = f.name;
      row[stockHeader] = f.currentStock;
      row[thresholdHeader] = f.threshold;

      if (!headerSet.has('sku')) row['sku'] = f.sku;
      if (!headerSet.has('name')) row['name'] = f.name;
      if (!headerSet.has('stock')) row['stock'] = f.currentStock;
      if (!headerSet.has('threshold')) row['threshold'] = f.threshold;

      row['daily_consumption'] = f.dailyConsumption;
      row['days_left'] = f.daysLeft ?? '';
      row['recommend_qty_7d'] = f.recommendQty7d;
      row['recommend_qty_15d'] = f.recommendQty15d;
      row['recommended_cycle_days'] = f.recommendedCycleDays ?? '';
      return row;
    });

    const csv = Papa.unparse({ fields: headers, data: rows });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory_forecast_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Forecast CSV downloaded.');
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight mb-1">Inventory Command Center</h2>
            <p className="text-zinc-500 text-sm">Local-first inventory with optional Shopify auto sync.</p>
          </div>
            <div className="flex items-center gap-2">
              <button
                onClick={exportForecastCSV}
                className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800 text-xs font-semibold"
              >
                Download Forecast CSV
              </button>
              <button
                onClick={onSyncShopify}
                disabled={syncing}
                className="p-2 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800 transition-all disabled:opacity-60"
              >
                <RefreshCw className={cn('w-5 h-5 text-zinc-400', syncing && 'animate-spin')} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <input
              value={draft.sku}
              onChange={(e) => setDraft(prev => ({ ...prev, sku: e.target.value }))}
              className="md:col-span-1 bg-[#111] border border-zinc-800 rounded-xl px-3 py-2 text-sm"
              placeholder="SKU"
            />
            <input
              value={draft.name}
              onChange={(e) => setDraft(prev => ({ ...prev, name: e.target.value }))}
              className="md:col-span-2 bg-[#111] border border-zinc-800 rounded-xl px-3 py-2 text-sm"
              placeholder="Product Name"
            />
            <input
              value={draft.stock}
              onChange={(e) => setDraft(prev => ({ ...prev, stock: e.target.value }))}
              className="bg-[#111] border border-zinc-800 rounded-xl px-3 py-2 text-sm"
              placeholder="Stock"
            />
            <input
              value={draft.threshold}
              onChange={(e) => setDraft(prev => ({ ...prev, threshold: e.target.value }))}
              className="bg-[#111] border border-zinc-800 rounded-xl px-3 py-2 text-sm"
              placeholder="Threshold"
            />
            <button
              onClick={onAddOrUpdate}
              className="flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl px-3 py-2 text-sm font-semibold"
            >
              <Plus className="w-4 h-4" /> Save
            </button>
          </div>

          <div className="flex flex-wrap gap-4">
            <div className="flex-1 relative min-w-[240px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Search by name or SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#111] border border-zinc-800 rounded-2xl py-3 pl-11 pr-4 text-sm"
              />
            </div>
            <div className="flex bg-zinc-900 p-1 rounded-2xl border border-zinc-800">
              {(['all', 'low', 'out'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    'px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all',
                    filter === f ? 'bg-rose-600 text-white' : 'text-zinc-500 hover:text-zinc-300'
                  )}
                >
                  {f === 'all' ? 'All' : f === 'low' ? 'Low' : 'Out'}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-[#111] border border-zinc-800/50 rounded-3xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800/50 bg-zinc-900/30">
                  <th className="p-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Product</th>
                  <th className="p-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">SKU</th>
                  <th className="p-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Stock</th>
                  <th className="p-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Status</th>
                  <th className="p-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {filteredInventory.map((item) => (
                  <tr key={item.id} className="hover:bg-zinc-900/30 transition-colors group">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center border border-zinc-700">
                          <Package className="w-5 h-5 text-zinc-500" />
                        </div>
                        <div>
                          <p className="text-sm font-bold">{item.name}</p>
                          <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{item.category || 'General'} | {item.source || 'manual'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <code className="text-[10px] bg-zinc-900 px-2 py-1 rounded border border-zinc-800 text-zinc-400">{item.sku}</code>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">{item.stock}</span>
                        <span className="text-[10px] text-zinc-500">/ {item.threshold}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      {item.stock === 0 ? (
                        <div className="flex items-center gap-2 text-rose-500">
                          <AlertTriangle className="w-4 h-4" />
                          <span className="text-[10px] font-bold uppercase tracking-widest">Out</span>
                        </div>
                      ) : item.stock <= item.threshold ? (
                        <div className="flex items-center gap-2 text-amber-500">
                          <AlertTriangle className="w-4 h-4" />
                          <span className="text-[10px] font-bold uppercase tracking-widest">Low</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-green-500">
                          <CheckCircle2 className="w-4 h-4" />
                          <span className="text-[10px] font-bold uppercase tracking-widest">Healthy</span>
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => deleteInventoryItem(item.id)}
                        className="p-2 rounded-lg border border-zinc-800 text-zinc-400 hover:text-rose-400 hover:border-rose-500/40"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredInventory.length === 0 && (
                  <tr>
                    <td className="p-6 text-sm text-zinc-500" colSpan={5}>No inventory items.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-[#111] border border-zinc-800/50 rounded-3xl overflow-hidden">
            <div className="p-4 border-b border-zinc-800/50 bg-zinc-900/30">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-bold">Reorder Action Board</h4>
                  <p className="text-[11px] text-zinc-500">
                    Prioritized reorder list from forecast data.
                  </p>
                </div>
                <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800">
                  {([
                    { key: 'need7', label: 'Need 7d', count: inventoryForecasts.filter((f) => f.recommendQty7d > 0).length },
                    { key: 'need15', label: 'Need 15d', count: inventoryForecasts.filter((f) => f.recommendQty15d > 0).length },
                    { key: 'all', label: 'All', count: inventoryForecasts.length }
                  ] as const).map((item) => (
                    <button
                      key={item.key}
                      onClick={() => setForecastFilter(item.key)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all',
                        forecastFilter === item.key ? 'bg-rose-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
                      )}
                    >
                      {item.label} ({item.count})
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800/50 bg-zinc-900/20">
                  <th className="p-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">SKU</th>
                  <th className="p-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Stock</th>
                  <th className="p-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Daily Use</th>
                  <th className="p-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Days Left</th>
                  <th className="p-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Reorder 7d</th>
                  <th className="p-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Reorder 15d</th>
                  <th className="p-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Cycle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {forecastBoardRows.slice(0, 30).map((f) => (
                  <tr key={`fc_${f.sku}`}>
                    <td className="p-3 text-xs">{f.sku}</td>
                    <td className="p-3 text-xs">{f.currentStock}</td>
                    <td className="p-3 text-xs">{f.dailyConsumption > 0 ? f.dailyConsumption.toFixed(2) : '-'}</td>
                    <td className="p-3 text-xs">{f.daysLeft === null ? '-' : f.daysLeft}</td>
                    <td className="p-3 text-xs font-semibold">{f.recommendQty7d}</td>
                    <td className="p-3 text-xs font-semibold">{f.recommendQty15d}</td>
                    <td className="p-3 text-xs">{f.recommendedCycleDays ? `${f.recommendedCycleDays}d` : '-'}</td>
                  </tr>
                ))}
                {forecastBoardRows.length === 0 && (
                  <tr>
                    <td className="p-4 text-xs text-zinc-500" colSpan={7}>No forecast rows for current filter.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-[#111] border border-zinc-800/50 p-6 rounded-3xl space-y-4">
            <h4 className="font-bold mb-1 flex items-center gap-2">
              <Link2 className="w-4 h-4 text-rose-500" /> Shopify Auto Sync
            </h4>
            <input
              value={inventorySyncConfig.storeDomain}
              onChange={(e) => updateInventorySyncConfig({ storeDomain: e.target.value })}
              placeholder="your-store.myshopify.com"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm"
            />
            <input
              value={inventorySyncConfig.accessToken}
              onChange={(e) => updateInventorySyncConfig({ accessToken: e.target.value })}
              placeholder="Admin API Access Token"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm"
            />
            <input
              value={inventorySyncConfig.locationId || ''}
              onChange={(e) => updateInventorySyncConfig({ locationId: e.target.value })}
              placeholder="Location ID (optional)"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm"
            />
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs text-zinc-400 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={inventorySyncConfig.enabled}
                  onChange={(e) => updateInventorySyncConfig({ enabled: e.target.checked })}
                />
                Auto Sync
              </label>
              <input
                value={String(inventorySyncConfig.autoSyncMinutes || 60)}
                onChange={(e) => updateInventorySyncConfig({ autoSyncMinutes: Math.max(5, Number(e.target.value || 60)) })}
                className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm"
                placeholder="Minutes"
              />
            </div>
            <div className="pt-2 border-t border-zinc-800/70 space-y-2">
              <label className="text-xs text-zinc-400 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={Boolean(inventorySyncConfig.autoImportEnabled)}
                  onChange={(e) => updateInventorySyncConfig({ autoImportEnabled: e.target.checked })}
                />
                Auto Import Daily
              </label>
              <select
                value={inventorySyncConfig.autoImportMode || 'file'}
                onChange={(e) => updateInventorySyncConfig({ autoImportMode: e.target.value as 'file' | 'url' })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm"
              >
                <option value="file">Local File Path (server machine)</option>
                <option value="url">CSV URL (Google Sheet publish link)</option>
              </select>
              <input
                value={inventorySyncConfig.autoImportValue || ''}
                onChange={(e) => updateInventorySyncConfig({ autoImportValue: e.target.value })}
                placeholder={inventorySyncConfig.autoImportMode === 'url' ? 'https://...csv' : 'D:\\inventory\\daily.csv'}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm"
              />
              <div className="grid grid-cols-3 gap-2">
                <input
                  value={String(inventorySyncConfig.autoImportDailyHour ?? 9)}
                  onChange={(e) => updateInventorySyncConfig({ autoImportDailyHour: Math.max(0, Math.min(23, Number(e.target.value || 9))) })}
                  placeholder="Hour"
                  className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm"
                />
                <input
                  value={String(inventorySyncConfig.autoImportMinDays ?? 7)}
                  onChange={(e) => updateInventorySyncConfig({ autoImportMinDays: Math.max(1, Number(e.target.value || 7)) })}
                  placeholder="Min Days"
                  className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm"
                />
                <input
                  value={String(inventorySyncConfig.autoImportMinSnapshots ?? 3)}
                  onChange={(e) => updateInventorySyncConfig({ autoImportMinSnapshots: Math.max(2, Number(e.target.value || 3)) })}
                  placeholder="Min Snapshots"
                  className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm"
                />
              </div>
              <p className="text-[10px] text-zinc-500">
                Last auto import: {inventorySyncConfig.lastAutoImportAt || 'Never'}
              </p>
            </div>
            <button
              onClick={onSyncShopify}
              disabled={syncing}
              className="w-full bg-rose-600 hover:bg-rose-500 disabled:opacity-60 text-white rounded-xl py-2 text-sm font-semibold"
            >
              {syncing ? 'Syncing...' : 'Sync Now'}
            </button>
            <p className="text-xs text-zinc-500">
              Last: {inventorySyncConfig.lastSyncAt || 'Never'} | {inventorySyncConfig.lastSyncStatus || 'idle'}
            </p>
          </div>

          <div className="bg-[#111] border border-zinc-800/50 p-6 rounded-3xl">
            <h4 className="font-bold mb-4 flex items-center gap-2">
              <Upload className="w-4 h-4 text-rose-500" /> Import CSV
            </h4>
            <div
              {...getRootProps()}
              className={cn(
                'border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer',
                isDragActive ? 'border-rose-500 bg-rose-500/5' : 'border-zinc-800 hover:border-rose-500/50 hover:bg-zinc-900/50'
              )}
            >
              <input {...getInputProps()} />
              <p className="text-xs font-bold text-zinc-300 mb-1">Drop inventory CSV</p>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Columns: sku, name, stock, threshold</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
