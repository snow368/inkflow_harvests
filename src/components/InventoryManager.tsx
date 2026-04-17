import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  Package, 
  Upload, 
  AlertTriangle, 
  CheckCircle2, 
  Search,
  Filter,
  ArrowDown,
  ArrowUp,
  FileText,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  stock: number;
  threshold: number;
  price: string;
}

export default function InventoryManager() {
  const [inventory, setInventory] = useState<InventoryItem[]>([
    { id: '1', name: 'Dynamic Black Ink (8oz)', sku: 'DB-8OZ', category: 'Ink', stock: 5, threshold: 10, price: '$24.99' },
    { id: '2', name: 'Bishop Wand Power Supply', sku: 'BW-PS-01', category: 'Hardware', stock: 2, threshold: 5, price: '$299.00' },
    { id: '3', name: '1203RL Needle Cartridges', sku: 'NC-1203RL', category: 'Needles', stock: 45, threshold: 20, price: '$35.00' },
    { id: '4', name: '1005RS Needle Cartridges', sku: 'NC-1005RS', category: 'Needles', stock: 8, threshold: 15, price: '$35.00' },
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'low' | 'out'>('all');

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      toast.success(`Importing ${file.name}...`);
      // In a real app, we'd parse the CSV/Excel here
      setTimeout(() => {
        toast.success("Inventory updated successfully!");
      }, 1500);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    multiple: false
  } as any);

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         item.sku.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (filter === 'low') return matchesSearch && item.stock > 0 && item.stock <= item.threshold;
    if (filter === 'out') return matchesSearch && item.stock === 0;
    return matchesSearch;
  });

  return (
    <div className="space-y-8">
      {/* Header & Upload */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight mb-1">Inventory Command Center</h2>
              <p className="text-zinc-500 text-sm">Manage your master stock list and set AI alerts.</p>
            </div>
            <button className="p-2 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800 transition-all">
              <RefreshCw className="w-5 h-5 text-zinc-400" />
            </button>
          </div>

          {/* Search & Filter */}
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 relative min-w-[240px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input 
                type="text"
                placeholder="Search by name or SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#111] border border-zinc-800 rounded-2xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 transition-all"
              />
            </div>
            <div className="flex bg-zinc-900 p-1 rounded-2xl border border-zinc-800">
              {(['all', 'low', 'out'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all",
                    filter === f ? "bg-rose-600 text-white" : "text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  {f === 'all' ? 'All Items' : f === 'low' ? 'Low Stock' : 'Out of Stock'}
                </button>
              ))}
            </div>
          </div>

          {/* Inventory Table */}
          <div className="bg-[#111] border border-zinc-800/50 rounded-3xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800/50 bg-zinc-900/30">
                  <th className="p-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Product</th>
                  <th className="p-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">SKU</th>
                  <th className="p-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Stock</th>
                  <th className="p-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Status</th>
                  <th className="p-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {filteredInventory.map((item) => (
                  <tr key={item.id} className="hover:bg-zinc-900/30 transition-colors group">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center border border-zinc-700 group-hover:border-rose-500/30 transition-all">
                          <Package className="w-5 h-5 text-zinc-500 group-hover:text-rose-500 transition-all" />
                        </div>
                        <div>
                          <p className="text-sm font-bold">{item.name}</p>
                          <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{item.category}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <code className="text-[10px] bg-zinc-900 px-2 py-1 rounded border border-zinc-800 text-zinc-400">
                        {item.sku}
                      </code>
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
                          <span className="text-[10px] font-bold uppercase tracking-widest">Out of Stock</span>
                        </div>
                      ) : item.stock <= item.threshold ? (
                        <div className="flex items-center gap-2 text-amber-500">
                          <AlertTriangle className="w-4 h-4" />
                          <span className="text-[10px] font-bold uppercase tracking-widest">Low Stock</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-green-500">
                          <CheckCircle2 className="w-4 h-4" />
                          <span className="text-[10px] font-bold uppercase tracking-widest">Healthy</span>
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <span className="text-sm font-bold text-zinc-300">{item.price}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Import Sidebar */}
        <div className="space-y-6">
          <div className="bg-[#111] border border-zinc-800/50 p-6 rounded-3xl">
            <h4 className="font-bold mb-4 flex items-center gap-2">
              <Upload className="w-4 h-4 text-rose-500" />
              Import Master List
            </h4>
            <p className="text-xs text-zinc-500 leading-relaxed mb-6">
              Upload your inventory CSV or Excel sheet to sync with the AI.
            </p>
            
            <div 
              {...getRootProps()} 
              className={cn(
                "border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer group",
                isDragActive ? "border-rose-500 bg-rose-500/5" : "border-zinc-800 hover:border-rose-500/50 hover:bg-zinc-900/50"
              )}
            >
              <input {...getInputProps()} />
              <div className="w-12 h-12 bg-zinc-900 rounded-2xl flex items-center justify-center border border-zinc-800 mx-auto mb-4 group-hover:scale-110 transition-transform">
                <FileText className="w-6 h-6 text-zinc-500 group-hover:text-rose-500 transition-all" />
              </div>
              <p className="text-xs font-bold text-zinc-300 mb-1">Drop Master Sheet</p>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest">CSV or XLSX only</p>
            </div>

            <div className="mt-6 p-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
              <h5 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Required Columns</h5>
              <div className="space-y-2">
                {['Product Name', 'SKU', 'Stock Level', 'Low Stock Threshold'].map((col) => (
                  <div key={col} className="flex items-center gap-2 text-[10px] text-zinc-400">
                    <div className="w-1 h-1 rounded-full bg-rose-500" />
                    {col}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-amber-500 to-amber-700 p-8 rounded-3xl text-white relative overflow-hidden group">
            <div className="relative z-10">
              <h4 className="text-xl font-bold mb-2">AI Insight</h4>
              <p className="text-amber-100 text-sm leading-relaxed opacity-90">
                4 items are currently below their threshold. The AI has prioritized these in the **Shop Outreach** strategy.
              </p>
            </div>
            <AlertTriangle className="absolute -right-4 -bottom-4 w-32 h-32 text-white/10 -rotate-12 group-hover:scale-110 transition-transform" />
          </div>
        </div>
      </div>
    </div>
  );
}
