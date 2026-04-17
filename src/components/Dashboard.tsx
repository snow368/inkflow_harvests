import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  Users, 
  MessageSquare, 
  Instagram,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Brain,
  ChevronRight,
  Zap,
  Package,
  ShoppingCart,
  AlertTriangle,
  Flame,
  Sparkles,
  CheckCircle2,
  Loader2,
  Settings,
  MapPin
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { useCRM } from '../contexts/CRMContext';
import { generatePersonaDMScript } from '../lib/gemini';
import { toast } from 'sonner';

const data = [
  { name: 'Mon', engagement: 400, conversions: 24 },
  { name: 'Tue', engagement: 300, conversions: 13 },
  { name: 'Wed', engagement: 200, conversions: 98 },
  { name: 'Thu', engagement: 278, conversions: 39 },
  { name: 'Fri', engagement: 189, conversions: 48 },
  { name: 'Sat', engagement: 239, conversions: 38 },
  { name: 'Sun', engagement: 349, conversions: 43 },
];

const StatCard = ({ title, value, change, icon: Icon, trend }: any) => (
  <div className="bg-[#111] border border-zinc-800/50 p-6 rounded-2xl">
    <div className="flex items-center justify-between mb-4">
      <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center border border-zinc-800/50">
        <Icon className="w-5 h-5 text-rose-500" />
      </div>
      <div className={`flex items-center gap-1 text-xs font-medium ${trend === 'up' ? 'text-green-500' : 'text-rose-500'}`}>
        {trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
        {change}
      </div>
    </div>
    <p className="text-zinc-500 text-sm font-medium mb-1">{title}</p>
    <h3 className="text-2xl font-bold tracking-tight">{value}</h3>
  </div>
);

const inventoryAlerts = [
  { item: 'Dynamic Black Ink (8oz)', sku: 'DB-8OZ', stock: 0, requestedBy: 'Alex Rivera' },
  { item: 'Bishop Wand Power Supply', sku: 'BW-PS-01', stock: 2, requestedBy: 'Sarah Chen' },
];

export default function Dashboard() {
  const { artists, persona, conversionDNA, harvestList, refreshHarvestList, isScanning, scanProgress, pinnedCount } = useCRM();
  const [generatingFor, setGeneratingFor] = React.useState<string | null>(null);
  const [generatedScript, setGeneratedScript] = React.useState<{ id: string, text: string } | null>(null);

  const stats = useMemo(() => {
    const totalLeads = artists.length;
    const customers = artists.filter(a => a.stage === 'customers').length;
    const dormant = artists.filter(a => a.stage === 'dormant').length;
    const conversionRate = totalLeads > 0 ? ((customers / totalLeads) * 100).toFixed(1) : '0.0';
    const highIntent = artists.filter(a => a.isHighIntent).length;
    const activeCampaigns = artists.filter(a => a.stage === 'active' || a.stage === 'engaged').length;

    return [
      { label: 'Total Leads', value: totalLeads.toLocaleString(), change: '+12%', trend: 'up', icon: Users, color: 'text-blue-500' },
      { label: 'Conversion Rate', value: `${conversionRate}%`, change: '+0.8%', trend: 'up', icon: TrendingUp, color: 'text-green-500' },
      { label: 'Dormant Leads', value: dormant.toString(), change: '+3', trend: 'down', icon: Clock, color: 'text-zinc-500' },
      { label: 'High Intent', value: highIntent.toString(), change: '+5', trend: 'up', icon: Flame, color: 'text-rose-500' },
    ];
  }, [artists]);

  const handleGenerateScript = async (artist: any) => {
    setGeneratingFor(artist.id);
    try {
      const script = await generatePersonaDMScript(artist.fullName, artist.dnaTags, persona);
      setGeneratedScript({ id: artist.id, text: script });
      toast.success(`AI Script generated for @${artist.username}`);
    } catch (error) {
      toast.error('Failed to generate script');
    } finally {
      setGeneratingFor(null);
    }
  };

  return (
    <div className="space-y-8">
      {isScanning && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-rose-600/10 border border-rose-500/30 p-4 rounded-2xl flex flex-col gap-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-rose-500 animate-spin" />
              <p className="text-sm font-black text-rose-100">
                {scanProgress.total > 0 
                  ? `Processing: ${scanProgress.current} / ${scanProgress.total} leads...`
                  : `Scanning 52,000 artists based on conversion model... ${pinnedCount} high-match targets pinned for you.`
                }
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-rose-600 text-[10px] font-black rounded-lg uppercase tracking-widest">
                {scanProgress.total > 0 ? 'Importing' : 'Scanning'}
              </span>
            </div>
          </div>
          {scanProgress.total > 0 && (
            <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-rose-500"
                initial={{ width: 0 }}
                animate={{ width: `${(scanProgress.current / scanProgress.total) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          )}
        </motion.div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-[#111] border border-zinc-800/50 p-6 rounded-3xl hover:border-rose-500/30 transition-all group"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={cn("p-3 rounded-2xl bg-zinc-900 border border-zinc-800 group-hover:scale-110 transition-transform", stat.color)}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className={cn(
                  "flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg",
                  stat.trend === 'up' ? "bg-green-500/10 text-green-500" : "bg-rose-500/10 text-rose-500"
                )}>
                  {stat.trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {stat.change}
                </div>
              </div>
              <h3 className="text-zinc-500 text-sm font-medium mb-1">{stat.label}</h3>
              <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Conversion DNA Section */}
      {conversionDNA && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-rose-600/20 to-amber-600/20 border border-rose-500/30 p-8 rounded-[2.5rem] relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/10 blur-[80px] -mr-32 -mt-32 rounded-full" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-rose-600 rounded-2xl flex items-center justify-center shadow-lg shadow-rose-600/20">
                <Brain className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white flex items-center gap-3">
                  Conversion DNA Extracted
                  <span className="px-2 py-1 bg-rose-600 text-[10px] font-black rounded-full animate-pulse">LIVE EVOLUTION</span>
                </h3>
                <p className="text-rose-200/60 text-sm font-medium">System has analyzed your top customers to refine outreach targeting.</p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-4">
              <div className="px-4 py-2 bg-black/40 border border-white/10 rounded-xl">
                <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1">Top Styles</p>
                <p className="text-sm font-bold text-white">{conversionDNA.topStyles.join(', ')}</p>
              </div>
              <div className="px-4 py-2 bg-black/40 border border-white/10 rounded-xl">
                <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1">Hot Regions</p>
                <p className="text-sm font-bold text-white">{conversionDNA.topLocations.join(', ')}</p>
              </div>
              <div className="px-4 py-2 bg-black/40 border border-white/10 rounded-xl">
                <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1">Avg. Followers</p>
                <p className="text-sm font-bold text-white">{Math.round(conversionDNA.avgFollowers).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Today's Harvest List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#111] border border-zinc-800/50 rounded-[2.5rem] overflow-hidden">
            <div className="p-8 border-b border-zinc-800/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-amber-600/10 rounded-2xl flex items-center justify-center border border-amber-500/20">
                  <Flame className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                  <h4 className="font-black text-xl text-white">Today's Harvest List</h4>
                  <p className="text-zinc-500 text-xs font-medium">Top 50 leads ranked by heat and weighted conversion similarity.</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={refreshHarvestList}
                  disabled={isScanning}
                  className="px-4 py-2 bg-zinc-900 border border-zinc-800 hover:border-rose-500/50 text-zinc-400 hover:text-rose-500 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
                >
                  {isScanning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Clock className="w-3 h-3" />}
                  Refresh Weights
                </button>
                <div className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl">
                  <Users className="w-4 h-4 text-zinc-500" />
                  <span className="text-xs font-black text-zinc-300">{harvestList.length} Leads</span>
                </div>
              </div>
            </div>
            
            <div className="divide-y divide-zinc-800/50 max-h-[600px] overflow-y-auto scrollbar-hide">
              {harvestList.map((artist, i) => (
                <motion.div 
                  key={artist.id} 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="p-6 hover:bg-zinc-900/30 transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <img 
                          src={artist.profilePic} 
                          alt={artist.username} 
                          className="w-14 h-14 rounded-2xl border border-zinc-800 object-cover"
                          referrerPolicy="no-referrer"
                        />
                        {artist.isHighIntent && (
                          <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 rounded-full flex items-center justify-center border-2 border-[#111] animate-bounce">
                            <Flame className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h5 className="font-black text-white">
                            @{(!artist.username || artist.username.startsWith('user_')) ? (artist.fullName || 'artist').toLowerCase().replace(/\s+/g, '_') : artist.username}
                          </h5>
                          {artist.stage === 'dormant' && (
                            <span className="px-2 py-0.5 bg-rose-500/10 text-[8px] font-black rounded-full text-rose-500 uppercase tracking-widest border border-rose-500/20">
                              Dormant
                            </span>
                          )}
                          {artist.hasFollowedBack && artist.stage === 'outreach' && (
                            <span className="px-2 py-0.5 bg-green-500/10 text-[8px] font-black rounded-full text-green-500 uppercase tracking-widest border border-green-500/20 animate-pulse">
                              Just Followed Back
                            </span>
                          )}
                          {artist.customerTier && (
                            <span className={cn(
                              "px-2 py-0.5 text-[8px] font-black rounded-full uppercase tracking-widest border",
                              artist.customerTier === 'vip' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                              artist.customerTier === 'loyal' ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                              "bg-zinc-800 text-zinc-400 border-zinc-700"
                            )}>
                              {artist.customerTier}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-col gap-0.5 mt-1">
                          <p className="text-[10px] text-zinc-400 font-bold">{artist.fullName || 'Unknown Shop'}</p>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] text-zinc-500 font-bold flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-zinc-600" />
                              {artist.location || 'No Location'}{artist.country ? `, ${artist.country}` : ''}
                            </span>
                            <span className="text-[10px] text-rose-500/80 font-black flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {artist.followers ? artist.followers.toLocaleString() : '0'}
                            </span>
                            <span className="text-[10px] text-blue-400 font-bold flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-blue-500" />
                              {artist.style || 'Various'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 mt-2">
                          <div className="flex items-center gap-1">
                            <Zap className="w-3 h-3 text-rose-500" />
                            <span className="text-[10px] font-black text-zinc-400">Heat: {artist.heatScore}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Brain className="w-3 h-3 text-blue-500" />
                            <span className="text-[10px] font-black text-zinc-400">Similarity: {artist.similarityScore}%</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-3">
                      <button 
                        onClick={() => handleGenerateScript(artist)}
                        disabled={generatingFor === artist.id}
                        className={cn(
                          "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                          generatedScript?.id === artist.id 
                            ? "bg-green-600/10 text-green-500 border border-green-500/20"
                            : "bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/20"
                        )}
                      >
                        {generatingFor === artist.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : generatedScript?.id === artist.id ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : (
                          <Sparkles className="w-3 h-3" />
                        )}
                        {generatedScript?.id === artist.id ? 'Script Ready' : 'Generate AI Script'}
                      </button>
                      
                      <AnimatePresence>
                        {generatedScript?.id === artist.id && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="w-80 p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-[10px] text-zinc-400 leading-relaxed relative"
                          >
                            <p className="italic">"{generatedScript.text}"</p>
                            <button 
                              onClick={() => {
                                navigator.clipboard.writeText(generatedScript.text);
                                toast.success('Copied to clipboard');
                              }}
                              className="absolute top-2 right-2 text-rose-500 hover:text-rose-400"
                            >
                              Copy
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Inventory Alerts & Quick Actions */}
        <div className="lg:col-span-1 space-y-6">
          {/* AI Persona Card */}
          <div className="bg-[#111] border border-zinc-800/50 p-8 rounded-[2.5rem] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-600/5 blur-[40px] -mr-16 -mt-16 rounded-full" />
            <h4 className="font-black text-sm text-zinc-500 uppercase tracking-[0.2em] mb-6">Current AI Persona</h4>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-rose-600/10 rounded-2xl flex items-center justify-center border border-rose-500/20">
                <Brain className="w-8 h-8 text-rose-500" />
              </div>
              <div>
                <p className="text-xl font-black text-white capitalize">{persona}</p>
                <p className="text-xs text-zinc-500 font-medium">
                  {persona === 'professional' ? 'Expert & Authoritative' : 'Friendly & Peer-like'}
                </p>
              </div>
            </div>
            <button className="w-full py-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-black rounded-2xl transition-all flex items-center justify-center gap-2">
              <Settings className="w-4 h-4" />
              Change Persona in Settings
            </button>
          </div>

          {/* Inventory Alerts */}
          <div className="bg-[#111] border border-zinc-800/50 p-6 rounded-3xl">
            <div className="flex items-center gap-3 mb-6">
              <Package className="w-5 h-5 text-amber-500" />
              <h4 className="font-bold">Inventory Alerts</h4>
            </div>
            <div className="space-y-4">
              {inventoryAlerts.map((alert, i) => (
                <div key={i} className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-300">{alert.item}</span>
                    <span className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full",
                      alert.stock === 0 ? "bg-rose-500/10 text-rose-500" : "bg-amber-500/10 text-amber-500"
                    )}>
                      {alert.stock === 0 ? 'Out of Stock' : `${alert.stock} Left`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                    <AlertTriangle className="w-3 h-3 text-amber-500" />
                    <span>Requested by {alert.requestedBy}</span>
                  </div>
                  <button className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-bold rounded-xl transition-all">
                    Suggest Alternative
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
