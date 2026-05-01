import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { 
  MapPin, 
  Search, 
  Filter, 
  Mail, 
  Phone, 
  ExternalLink, 
  ChevronRight,
  TrendingUp,
  ShoppingBag,
  Clock,
  CheckCircle2,
  AlertCircle,
  Users,
  Plus,
  Zap,
  X,
  Copy,
  Terminal,
  Instagram,
  Flame,
  Brain,
  Sparkles,
  Loader2,
  Upload,
  FileText,
  Database,
  Monitor,
  Trash2,
  RefreshCw,
  Pause,
  Play,
  RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { suggestOutreachStrategy } from '../lib/gemini';
import { toast } from 'sonner';
import { useCRM } from '../contexts/CRMContext';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';

const states = [
  'All Places', 
  'AZ', 'CA', 'FL', 'NY', 'TX', 'NV', 'WA', 'IL', 'GA', 'PA', // US States
  'UK', 'AU', 'CA_INTL', 'DE', 'FR', 'IT', 'ES', 'JP', 'KR', 'BR' // Countries
];

const COOP_PRODUCT_OPTIONS = [
  'cartridges',
  'inks',
  'machines',
  'power_supplies',
  'needles',
  'grips',
  'tips',
  'stencil',
  'aftercare',
  'furniture',
  'accessories'
];

const normText = (v: any) => String(v || '').toLowerCase().replace(/[^a-z0-9]+/g, '');

const isPlaceholderHandle = (h?: string): boolean => {
  const x = String(h || '').toLowerCase().trim();
  if (!x) return true;
  return x.startsWith('user_') || x.includes('shopify') || x.includes('unknown');
};

const normalizeInstagramUrl = (raw: string): string | null => {
  const x = String(raw || '').trim();
  if (!x) return null;
  if (x.toLowerCase().includes('instagram.com/')) {
    return x.startsWith('http') ? x : `https://${x}`;
  }
  if (!x.includes('http') && !x.includes('/')) {
    return `https://instagram.com/${x.replace(/^@/, '')}`;
  }
  return null;
};

const getInstagramInfo = (artist: any): { url: string; source: 'explicit' | 'handle' } | null => {
  const importedProvided = artist?.metadata?.importedInstagramProvided === true;
  const manualProvided = artist?.metadata?.manualInstagramProvided === true;
  if (!importedProvided && !manualProvided) return null;

  const explicitCandidates = [
    artist?.metadata?.manualInstagramUrl,
    artist?.metadata?.importedInstagramUrl,
    artist?.metadata?.instagram_url,
    artist?.metadata?.instagram
  ]
    .map((x: any) => String(x || '').trim())
    .filter(Boolean);

  let bestUrl: string | null = null;
  for (const c of explicitCandidates) {
    const normalized = normalizeInstagramUrl(c);
    if (normalized) {
      bestUrl = normalized;
      break;
    }
  }

  if (!bestUrl) {
    const handle = String(artist?.ig_handle || '').replace(/^@/, '').trim();
    if (handle && !isPlaceholderHandle(handle)) {
      bestUrl = `https://instagram.com/${handle}`;
      return { url: bestUrl, source: 'handle' };
    }
  }

  if (bestUrl) return { url: bestUrl, source: 'explicit' };
  return null;
};

const resolveInstagramUrl = (artist: any): string | null => getInstagramInfo(artist)?.url || null;

const isActiveDistributor = (artist: any): boolean => {
  if (!artist) return false;
  if (artist.metadata?.distributorExcluded === true) return false;
  return artist.metadata?.isDistributor === true || String(artist.metadata?.distributorStatus || '') === 'qualified';
};

export default function ShopOutreach({ onNavigate }: { onNavigate?: (tab: any) => void }) {
  const { 
    artists, 
    pagination,
    globalStats,
    importMetrics,
    deepScanTask,
    refreshDeepScanTask,
    pauseDeepScanTask,
    resumeDeepScanTask,
    retryFailedDeepScanTask,
    loadData,
    importCSV, 
    syncShopifySales, 
    bulkEnrichArtists, 
    clearAllData, 
    isScanning, 
    setIsScanning,
    scanProgress,
    pinnedCount,
    persona, 
    mockMode,
    assignTaskToAccount,
    assignments,
    startAutomationSequence,
    updateArtist,
    deleteArtist,
    moveArtist
  } = useCRM();
  const [selectedState, setSelectedState] = useState('All Places');
  const [search, setSearch] = useState('');
  const [activeStage, setActiveStage] = useState('all');
  const [accountTagFilter, setAccountTagFilter] = useState('all');
  const [sortMode, setSortMode] = useState<'priority' | 'engagement' | 'active_now' | 'tattoo_likelihood'>('priority');
  const [accountTag, setAccountTag] = useState('default');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showScrape, setShowScrape] = useState(false);
  const [scrapeStateCode, setScrapeStateCode] = useState('');
  const [scrapeHeadless, setScrapeHeadless] = useState(true);
  const [scrapeKeyword, setScrapeKeyword] = useState('Tattoo Shops');
  const [scrapeTaskId, setScrapeTaskId] = useState<string | null>(null);
  const [scrapeProgress, setScrapeProgress] = useState({ completed: 0, total: 0 });
  const [scrapeStatus, setScrapeStatus] = useState('');
  const [scrapeLogs, setScrapeLogs] = useState<string[]>([]);
  const [scrapeCountry, setScrapeCountry] = useState('US');
  const [scrapeStates, setScrapeStates] = useState<string[]>([]);  // 存储当前国家的州/省列表
  const [scrapeCustomCountry, setScrapeCustomCountry] = useState(''); 
  const [availableCountries, setAvailableCountries] = useState<{code: string, name: string}[]>([]);

  // Load available countries
  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const res = await fetch('/api/geo/countries');
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data)) {
          setAvailableCountries(data);
        }
      } catch (err) {
        console.error("Failed to fetch countries:", err);
      }
    };
    fetchCountries();
  }, []);

  // Fetch states when country changes
  useEffect(() => {
    const fetchStates = async () => {
      const code = scrapeCountry === 'CUSTOM' ? scrapeCustomCountry : scrapeCountry;
      if (!code || code.length < 2) {
        setScrapeStates([]);
        return;
      }
      
      try {
        const res = await fetch(`/api/geo/states/${code}`);
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data)) {
          setScrapeStates(data);
          if (data.length > 0 && !data.includes(scrapeStateCode)) {
            setScrapeStateCode(''); 
          }
        }
      } catch (err) {
        console.error("Failed to fetch states:", err);
        setScrapeStates([]);
      }
    };
    fetchStates();
  }, [scrapeCountry, scrapeCustomCountry]);

  const startScrape = async () => {
    if (!scrapeStateCode) return;
    setScrapeStatus('running');
    setScrapeProgress({ completed: 0, total: 0 });
    try {
      const res = await fetch('/api/scrape/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          state: scrapeStateCode, 
          headless: scrapeHeadless, 
          keyword: scrapeKeyword,
          country: scrapeCountry === 'CUSTOM' ? scrapeCustomCountry : scrapeCountry 
        }),
      });
      if (!res.ok) throw new Error('Start failed');
      const data = await res.json();
      if (data && data.taskId) {
        setScrapeTaskId(data.taskId);
        startPolling(data.taskId);
      }
    } catch (err) {
      toast.error('Scrape start failed');
      setScrapeStatus('failed');
    }
  };

  const startPolling = (taskId: string) => {
    const interval = setInterval(async () => {
      try {
        const statusRes = await fetch(`/api/scrape/status/${taskId}`);
        if (!statusRes.ok) return;
        const statusData = await statusRes.json();
        if (!statusData) return;
        
        setScrapeProgress({ completed: statusData.completed || 0, total: statusData.total || 0 });
        setScrapeStatus(statusData.status || 'running');
        
        if (statusData.logs && Array.isArray(statusData.logs)) {
          setScrapeLogs(statusData.logs);
        }
        
        if (statusData.status === 'completed' || statusData.status === 'failed' || statusData.status === 'cancelled') {
          clearInterval(interval);
          if (statusData.status === 'completed') toast.success('抓取完成！');
          if (statusData.status === 'failed') toast.error('抓取失败');
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 2000);
  };

  const itemsPerPage = 50;

  const [isGeneratingStrategy, setIsGeneratingStrategy] = useState(false);
  const [strategy, setStrategy] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [importTab, setImportTab] = useState<'magic' | 'csv' | 'shopify'>('magic');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [retryReason, setRetryReason] = useState<string>('all');
  const lastAutoResumeAtRef = useRef<number>(0);

  const cleanDisplay = (text: any) => {
    if (typeof text !== 'string') return String(text || '');
    return text.replace(/\uFFFD/g, '');
  };

  const isPlaceholderGeo = (v: any) => {
    const x = String(v || '').trim().toLowerCase();
    if (!x) return true;
    return x === 'unknown' || x === 'n/a' || x === 'na' || x === 'null' || x === 'undefined';
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    setUploadError(null);

    // Column Mapping Dictionary
    const headerMap: Record<string, string> = {
      'Shop Name': 'name', 'Business Name': 'name', 'Name': 'name', 'shopName': 'name', 'shop_name': 'name', 'Default Address Company': 'name', 'Title': 'name', 'title': 'name', 'Place Name': 'name',
      '店名': 'name', '名称': 'name', '商家名称': 'name', '标题': 'name',
      'Instagram': 'ig_handle', 'IG': 'ig_handle', 'IG_Handle': 'ig_handle', 'igLink': 'ig_handle', 'ig_link': 'ig_handle', 'Instagram Handle': 'ig_handle', 'Instagram URL': 'ig_handle', 'instagram': 'ig_handle', 'Instagram_Handle': 'ig_handle',
      'Facebook': 'facebook_id', 'FB': 'facebook_id', 'Facebook URL': 'facebook_id', 'facebook': 'facebook_id',
      'Address': 'address', 'Street': 'address', 'Location_Address': 'address', 'Default Address Address1': 'address', 'Full Address': 'address', 'Formatted Address': 'address', 'address': 'address', 'Full_Address': 'address',
      '地址': 'address', '街道': 'address', '详细地址': 'address',
      'City': 'city', 'City_Name': 'city', 'Default Address City': 'city', 'city': 'city',
      'State': 'state', 'state': 'state', 'Province': 'state', 'Province Code': 'state', 'Default Address Province Code': 'state',
      '城市': 'city', '省份': 'state', '州': 'state',
      'Phone': 'phone', 'Phone_Number': 'phone', 'Contact_Phone': 'phone', 'Default Address Phone': 'phone', 'phone': 'phone', 'Phone Number': 'phone',
      '电话': 'phone', '手机': 'phone', '联系电话': 'phone',
      'Website': 'website', 'Web_URL': 'website', 'Site': 'website', 'website': 'website', 'link': 'website', 'URL': 'website',
      '网站': 'website', '网址': 'website',
      'Email': 'email', 'Contact_Email': 'email', 'email': 'email', 'E-mail': 'email',
      '邮箱': 'email', '电子邮件': 'email',
      'Reviews': 'rating', 'Rating': 'rating', 'mapsRating': 'rating', 'Avg Rating': 'rating', 'rating': 'rating', 'Rating_Value': 'rating',
      '评分': 'rating', '星级': 'rating',
      'Followers': 'followers', 'Follower Count': 'followers', 'followers': 'followers', 'followers_count': 'followers',
      '粉丝': 'followers', '粉丝数': 'followers',
      'Country': 'country', 'Nation': 'country', 'country': 'country', 'Default Address Country': 'country',
      '国家': 'country', '地区': 'country',
      'Place ID': 'place_id', 'place_id': 'place_id', 'CID': 'cid', 'cid': 'cid'
    };

    if (mockMode) {
      toast.info('Mock Mode: Simulating CSV processing...');
      setTimeout(() => {
        const mockData = [
          { name: "Ink Masters", rating: "4.8", ig_handle: "@inkmasters", address: "123 Tattoo St, Phoenix, AZ" },
          { name: "Vivid Skin", rating: "4.5", ig_handle: "@vividskin", address: "456 Art Ave, Miami, FL" },
          { name: "Eternal Ink", rating: "4.9", ig_handle: "@eternalink", address: "789 Needle Rd, Austin, TX" },
          { name: "Black Rose", rating: "4.7", ig_handle: "@blackrose", address: "101 Thorn Ln, Los Angeles, CA" },
          { name: "Urban Canvas", rating: "4.6", ig_handle: "@urbancanvas", address: "202 City Blvd, New York, NY" },
          { name: "Desert Soul", rating: "4.4", ig_handle: "@desertsoul", address: "303 Sand Dr, Las Vegas, NV" },
          { name: "Iron & Ink", rating: "4.8", ig_handle: "@ironink", address: "404 Metal St, Phoenix, AZ" },
          { name: "Sacred Geometry", rating: "5.0", ig_handle: "@sacredgeo", address: "505 Pattern Rd, Miami, FL" },
          { name: "Old School", rating: "4.3", ig_handle: "@oldschool", address: "606 Retro Way, Austin, TX" },
          { name: "Neon Dream", rating: "4.9", ig_handle: "@neondream", address: "707 Glow Ave, Los Angeles, CA" }
        ];
        importCSV(mockData, selectedState, accountTag);
        setShowImport(false);
      }, 2000);
      return;
    }

    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result as string;
      
      if (text.includes('\uFFFD')) {
        console.warn("UTF-8 decoding failed. Retrying with Windows-1252...");
        const reader2 = new FileReader();
        reader2.onload = (e2) => {
          parseCSV(e2.target.result as string);
        };
        reader2.readAsText(file, 'windows-1252');
      } else {
        parseCSV(text);
      }
    };

    const parseCSV = (csvText: string) => {
      if (importTab === 'shopify') {
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            syncShopifySales(results.data, accountTag);
            setShowImport(false);
          },
          error: (err) => {
            setUploadError(`Failed to parse Shopify CSV: ${err.message}`);
          }
        });
        return;
      }

      Papa.parse(csvText, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: 'greedy',
        transformHeader: (h) => h.trim(),
        complete: (results) => {
          const rawData = results.data as any[];
          const mappedData = rawData.map(row => {
            const normalized: any = { metadata: {} };
            
            Object.keys(row).forEach(key => {
              const trimmedKey = key.trim();
              let value = row[key];
              
              if (typeof value === 'string') {
                value = value.trim().replace(/\uFFFD/g, '');
              }
              
              const mappedField = headerMap[trimmedKey];

              if (mappedField) {
                normalized[mappedField] = value;
              } else {
                normalized.metadata[trimmedKey] = value;
              }
            });

            if (!normalized.name) {
              const firstName = row['First Name'] || row['first_name'] || '';
              const lastName = row['Last Name'] || row['last_name'] || '';
              if (firstName || lastName) {
                normalized.name = `${firstName} ${lastName}`.trim();
              } else if (row['Default Address Company']) {
                normalized.name = row['Default Address Company'];
              }
            }

            if (normalized.ig_handle) {
              if (normalized.ig_handle.includes('instagram.com/')) {
                normalized.ig_handle = normalized.ig_handle.split('instagram.com/').pop()?.split('/')[0] || normalized.ig_handle;
              }
              if (!normalized.ig_handle.startsWith('@')) {
                normalized.ig_handle = `@${normalized.ig_handle}`;
              }
              normalized.ig_handle = normalized.ig_handle.replace(/[^\w@.]/g, '');
            }

            return normalized;
          });

          const validData = mappedData.filter(d => d.name);
          
          if (validData.length > 0) {
            importCSV(
              validData,
              selectedState === 'All Places' ? undefined : selectedState,
              accountTag,
              { rawRows: mappedData.length, missingNameRows: Math.max(0, mappedData.length - validData.length) }
            );
            setShowImport(false);
            if (validData.length < mappedData.length) {
              toast.warning(`Imported ${validData.length} leads. Some rows were skipped.`);
            }
          } else {
            const errMsg = "Error: Could not find 'Name' in your CSV.";
            setUploadError(errMsg);
            toast.error(errMsg);
          }
        },
        error: (error) => {
          const errMsg = `Error parsing CSV: ${error.message}`;
          setUploadError(errMsg);
          toast.error(errMsg);
        }
      });
    };

    reader.readAsText(file, 'UTF-8');
  }, [importCSV, selectedState, mockMode, accountTag, importTab]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv']
    },
    multiple: false
  } as any);

  const filteredShops = useMemo(() => {
    const currentHour = new Date().getHours();
    const hourDistance = (a: number, b: number) => {
      const raw = Math.abs(a - b);
      return Math.min(raw, 24 - raw);
    };
    const isActiveNow = (hours?: number[]) => {
      if (!hours || hours.length === 0) return false;
      return hours.some((h) => Number.isFinite(h) && hourDistance(currentHour, Number(h)) <= 1);
    };

    return artists
      .filter(artist => {
        if (isActiveDistributor(artist)) return false;
        const matchesStage = activeStage === 'all' ? true : artist.stage === activeStage;
        const matchesLocation = selectedState === 'All Places' || 
                               artist.location === selectedState ||
                               artist.state === selectedState ||
                               artist.country === selectedState ||
                               (typeof artist.address === 'string' && artist.address.includes(selectedState));
        const matchesSearch = (artist.username?.toLowerCase() || '').includes(search.toLowerCase()) || 
                             (artist.fullName?.toLowerCase() || '').includes(search.toLowerCase()) ||
                             (artist.shopName?.toLowerCase() || '').includes(search.toLowerCase());
        const matchesAccountTag = accountTagFilter === 'all' || artist.account_tag === accountTagFilter;
        
        return matchesStage && matchesLocation && matchesSearch && matchesAccountTag;
      })
      .sort((a, b) => {
        if (sortMode === 'engagement') {
          return (b.socialSignals?.engagementRate || 0) - (a.socialSignals?.engagementRate || 0);
        }
        if (sortMode === 'active_now') {
          const aNow = isActiveNow(a.socialSignals?.postingHours) ? 1 : 0;
          const bNow = isActiveNow(b.socialSignals?.postingHours) ? 1 : 0;
          if (bNow !== aNow) return bNow - aNow;
          return (b.socialSignals?.postsPerWeek || 0) - (a.socialSignals?.postsPerWeek || 0);
        }
        if (sortMode === 'tattoo_likelihood') {
          return (b.socialSignals?.tattooLikelihood || 0) - (a.socialSignals?.tattooLikelihood || 0);
        }

        let aScore = (a.heatScore || 0) + (a.similarityScore || 0);
        let bScore = (b.heatScore || 0) + (b.similarityScore || 0);
        
        if (a.hasFollowedBack) aScore += 100;
        if (b.hasFollowedBack) bScore += 100;
        
        return bScore - aScore;
      });
  }, [artists, selectedState, search, accountTagFilter, sortMode, activeStage]);

  const paginatedShops = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredShops.slice(start, start + itemsPerPage);
  }, [filteredShops, currentPage]);

  const totalPages = Math.ceil(filteredShops.length / itemsPerPage);

  const directSalesCandidates = useMemo(() => {
    const currentHour = new Date().getHours();
    return artists
      .filter((artist) => {
        if (isActiveDistributor(artist)) return false;
        const haystack = `${artist.shopName || ''} ${artist.fullName || ''} ${artist.username || ''}`.toLowerCase();
        const matchesLocation = selectedState === 'All Places' ||
          artist.location === selectedState ||
          artist.state === selectedState ||
          artist.country === selectedState ||
          (typeof artist.address === 'string' && artist.address.includes(selectedState));
        const matchesSearch = haystack.includes(search.toLowerCase());
        const matchesAccountTag = accountTagFilter === 'all' || artist.account_tag === accountTagFilter;
        return matchesLocation && matchesSearch && matchesAccountTag;
      })
      .map((artist) => {
        const contactCount = [artist.ig_handle, artist.email, artist.phone].filter(Boolean).length;
        const score = 20 + contactCount * 5;
        return { artist, directScore: Math.round(score), activeNow: false, contactCount };
      })
      .filter(x => x.directScore > 0)
      .sort((a,b) => b.directScore - a.directScore);
  }, [artists, selectedState, search, accountTagFilter]);

  const distributorCandidates = useMemo(() => {
    return artists.filter(a => isActiveDistributor(a)).map(a => ({
      artist: a,
      sourceCount: 0,
      followers: a.followers || 0,
      brandPartners: 0,
      connectors: [],
      reasonTags: [],
      status: 'qualified',
      tier: 'B' as const,
      priority: 'P2',
      distributorScore: 50
    }));
  }, [artists]);

  const handleGenerateStrategy = async () => {
    setIsGeneratingStrategy(true);
    setStrategy(null);
    try {
      const result = await suggestOutreachStrategy(selectedState, filteredShops);
      setStrategy(result);
    } catch (error) {
      console.error('Strategy generation failed:', error);
    } finally {
      setIsGeneratingStrategy(false);
    }
  };

  const handleMagicPaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) {
        toast.error("Clipboard is empty!");
        return;
      }
      const lines = text.split('\n').filter(l => l.includes('|'));
      if (lines.length === 0) {
        toast.error("No valid shop data found in clipboard.");
        return;
      }
      const newShops = lines.map(line => {
        const [name, ratingPart, address, website] = line.split('|').map(s => s.trim());
        const rating = ratingPart?.replace('Rating:', '').trim() || 'N/A';
        return {
          shopName: name,
          mapsRating: rating,
          address: address || `${selectedState}, USA`,
          location: selectedState,
          igLink: website || `https://instagram.com/${name.toLowerCase().replace(/\s+/g, '_')}`
        };
      });
      await importCSV(newShops, selectedState);
      setShowImport(false);
    } catch (err) {
      toast.error("Clipboard access failed.");
    }
  };

  const handleRefreshDeepScan = async () => {
    await refreshDeepScanTask();
  };

  const handlePauseDeepScan = async () => {
    await pauseDeepScanTask();
  };

  const handleResumeDeepScan = async () => {
    await resumeDeepScanTask();
    if (!isScanning) await bulkEnrichArtists();
  };

  const handleRetryFailedDeepScan = async () => {
    await retryFailedDeepScanTask(undefined, retryReason === 'all' ? undefined : retryReason);
    if (!isScanning) await bulkEnrichArtists();
  };

  const handleContinueDeepScan = async () => {
    await bulkEnrichArtists();
  };

  const handleExportFailedCsv = async () => {
    if (!deepScanTask?.id) return;
    const resp = await fetch(`/api/deep-scan/failed/${deepScanTask.id}`);
    const payload = await resp.json();
    const csv = Papa.unparse(payload?.items || []);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `failed_${deepScanTask.id}.csv`;
    link.click();
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {[
          { label: 'Raw Rows', value: importMetrics.rawRows },
          { label: 'Valid Rows', value: importMetrics.validRows },
          { label: 'Deduped', value: importMetrics.dedupedRows },
          { label: 'DeepScan', value: importMetrics.deepScanTargets },
          { label: 'Enrich OK', value: importMetrics.enrichSuccess },
          { label: 'Enrich Fail', value: importMetrics.enrichFailed },
          { label: 'No Name', value: importMetrics.skipReasons.missingName },
          { label: 'Identical', value: importMetrics.skipReasons.identical }
        ].map((item) => (
          <div key={item.label} className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-3">
            <p className="text-[9px] font-black uppercase tracking-widest opacity-80">{item.label}</p>
            <p className="text-sm font-black mt-1">{item.value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      {deepScanTask && (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Deep Scan Task: {deepScanTask.id}</p>
            <p className="text-[11px] text-zinc-400">
              {deepScanTask.status} | completed {deepScanTask.completed}/{deepScanTask.total} | failed {deepScanTask.failed}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={handlePauseDeepScan} className="px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-[10px] font-black uppercase"><Pause className="w-3 h-3" /></button>
            <button onClick={handleResumeDeepScan} className="px-3 py-1.5 bg-blue-600/20 border border-blue-500/40 rounded-lg text-[10px] font-black uppercase"><Play className="w-3 h-3" /></button>
            <button onClick={handleRetryFailedDeepScan} className="px-3 py-1.5 bg-amber-600/20 border border-amber-500/40 rounded-lg text-[10px] font-black uppercase"><RotateCcw className="w-3 h-3" /></button>
            <button onClick={handleRefreshDeepScan} className="px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-[10px] font-black uppercase"><RefreshCw className="w-3 h-3" /></button>
            <button onClick={handleContinueDeepScan} className="px-3 py-1.5 bg-emerald-600/20 border border-emerald-500/40 rounded-lg text-[10px] font-black uppercase">Continue</button>
          </div>
        </div>
      )}

      {isScanning && (
        <div className="bg-rose-600/10 border border-rose-500/30 p-4 rounded-2xl flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-rose-500 animate-spin" />
            <p className="text-sm font-black text-rose-100">
              {scanProgress.total > 0 ? `Processing: ${scanProgress.current}/${scanProgress.total}` : 'Scanning targets...'}
            </p>
            <button 
              onClick={() => setIsScanning(false)}
              className="px-2 py-0.5 bg-rose-600/20 border border-rose-500/30 rounded text-[9px] font-black text-rose-400"
            >
              Stop Scan
            </button>
          </div>
        </div>
      )}

      <div className="bg-[#111] border border-zinc-800/50 p-8 rounded-[2.5rem] flex flex-col md:flex-row gap-6 items-center justify-between">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-rose-600 rounded-2xl flex items-center justify-center shadow-lg shadow-rose-600/20">
            <MapPin className="w-8 h-8 text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-black tracking-tight text-white">Outreach Manager</h3>
            <p className="text-zinc-500 text-sm font-medium">Manage and approach tattoo shops by state.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowImport(true)} className="px-8 py-4 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl text-sm font-black flex items-center gap-3 transition-all">
            <Plus className="w-5 h-5" /> Import Leads
          </button>
          <button onClick={() => setShowScrape(true)} className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-sm font-black flex items-center gap-3 transition-all">
            <Zap className="w-5 h-5" /> Scrape Maps
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex bg-zinc-900/50 p-1.5 rounded-2xl border border-zinc-800/50 overflow-x-auto no-scrollbar">
          {states.map(state => (
            <button
              key={state}
              onClick={() => setSelectedState(state)}
              className={cn(
                "px-8 py-3 rounded-xl text-xs font-black transition-all whitespace-nowrap uppercase tracking-widest",
                selectedState === state ? "bg-rose-600 text-white" : "text-zinc-500"
              )}
            >
              {state}
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
          <input 
            type="text" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search leads..."
            className="w-full pl-14 pr-6 py-4 bg-zinc-900/50 border border-zinc-800 focus:border-rose-500 rounded-2xl outline-none transition-all text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-[#111] border border-zinc-800/50 rounded-[2.5rem] overflow-hidden">
          <div className="p-8 border-b border-zinc-800/50 flex items-center justify-between bg-zinc-900/20">
            <h4 className="font-black text-xl text-white">Leads ({filteredShops.length})</h4>
            <div className="flex items-center gap-3">
              <button onClick={bulkEnrichArtists} className="px-4 py-2 bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">Enrich All</button>
              <button 
                onClick={() => {
                  const csv = Papa.unparse(artists);
                  const blob = new Blob([csv], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'export.csv';
                  a.click();
                }}
                className="px-4 py-2 bg-zinc-900 border border-zinc-800 text-[10px] font-black text-zinc-500 uppercase tracking-widest"
              >
                Export
              </button>
              <button onClick={clearAllData} className="px-4 py-2 bg-rose-600/10 text-rose-500 border border-rose-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest">Clear</button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-zinc-800/50 bg-zinc-900/20 font-black text-[9px] text-zinc-500 uppercase">
                  <th className="p-4">Name</th>
                  <th className="p-4">Location</th>
                  <th className="p-4">Style</th>
                  <th className="p-4">Heat</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/30">
                {paginatedShops.map(shop => (
                  <tr key={shop.id} className="hover:bg-zinc-900/30">
                    <td className="p-4">
                      <p className="font-black text-white text-[11px]">{shop.fullName || shop.name || shop.shopName}</p>
                      <p className="text-[9px] text-rose-500 font-bold">@{shop.username || shop.ig_handle || 'unknown'}</p>
                    </td>
                    <td className="p-4 text-[10px] text-zinc-400 font-bold">{shop.location || shop.city || 'N/A'}</td>
                    <td className="p-4"><span className="px-2 py-0.5 bg-zinc-800 text-[8px] font-black uppercase tracking-widest text-zinc-400 border border-zinc-700/30">{shop.style || 'Tattoo'}</span></td>
                    <td className="p-4"><span className="text-[10px] font-black text-rose-500">{shop.heatScore}%</span></td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => deleteArtist(shop.id)} className="p-1.5 text-zinc-600 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                        <button onClick={() => moveArtist(shop.id, 'engaged')} className="p-1.5 bg-rose-600 text-white rounded"><ChevronRight className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-[#111] border border-zinc-800/50 p-8 rounded-[2.5rem]">
            <h4 className="font-black text-xl text-white mb-6">AI Strategy</h4>
            {strategy ? (
              <div className="space-y-4">
                <div className="p-6 bg-rose-600/5 border border-rose-500/20 rounded-3xl text-sm italic text-zinc-300">"{strategy}"</div>
                <button onClick={handleGenerateStrategy} className="w-full py-4 text-[10px] font-black uppercase bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-2xl">Regenerate</button>
              </div>
            ) : (
              <button 
                onClick={handleGenerateStrategy} 
                disabled={isGeneratingStrategy}
                className="w-full py-5 bg-rose-600 text-white rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-lg shadow-rose-600/20"
              >
                {isGeneratingStrategy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                Generate Strategy
              </button>
            )}
          </div>
          
          <div className="bg-[#111] border border-zinc-800/50 p-8 rounded-[2.5rem]">
            <h4 className="font-black text-lg text-white mb-4">Direct Sales</h4>
            <div className="space-y-3">
              {directSalesCandidates.slice(0, 10).map(({ artist, directScore }) => (
                <div key={artist.id} className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-xl flex justify-between items-center">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate">{artist.fullName || artist.name}</p>
                    <p className="text-[10px] text-zinc-500">Score: {directScore}</p>
                  </div>
                  <button onClick={() => moveArtist(artist.id, 'engaged')} className="p-2 bg-rose-600/20 text-rose-400 rounded"><ChevronRight className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showImport && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="bg-[#111] border border-zinc-800 p-8 rounded-[2.5rem] w-full max-w-2xl"
            >
              <div className="flex justify-between mb-8">
                <h3 className="text-2xl font-black text-white">Import Leads</h3>
                <button onClick={() => setShowImport(false)}><X className="w-6 h-6 text-zinc-500" /></button>
              </div>
              <div className="flex bg-zinc-900/50 p-1 rounded-xl border border-zinc-800/50 mb-8">
                {['magic', 'csv', 'shopify'].map(t => (
                  <button key={t} onClick={() => setImportTab(t as any)} className={cn("flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all", importTab === t ? "bg-rose-600 text-white" : "text-zinc-500")}>
                    {t.toUpperCase()}
                  </button>
                ))}
              </div>
              {importTab === 'magic' && (
                <div className="space-y-6">
                  <div className="p-6 bg-black border border-zinc-800 rounded-3xl font-mono text-[10px] text-zinc-400 overflow-auto h-40">
                    {`// Scraper Protocol...\ncopy(results);`}
                  </div>
                  <button onClick={handleMagicPaste} className="w-full py-5 bg-rose-600 text-white rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3">
                    <Zap className="w-5 h-5" /> Magic Paste
                  </button>
                </div>
              )}
              {importTab !== 'magic' && (
                <div {...getRootProps()} className="border-2 border-dashed border-zinc-800 rounded-[2rem] p-16 flex flex-col items-center cursor-pointer hover:bg-zinc-900/40">
                  <input {...getInputProps()} />
                  <Upload className="w-12 h-12 text-rose-500 mb-4" />
                  <p className="text-white font-black">Drop CSV file here</p>
                </div>
              )}
            </motion.div>
          </div>
        )}

        {showScrape && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
              className="bg-[#111] border border-zinc-800 p-8 rounded-[2.5rem] w-full max-w-md"
            >
              <h3 className="text-2xl font-black text-white mb-6">Maps Scraper</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-2">Country</label>
                  <select 
                    value={scrapeCountry} 
                    onChange={(e) => setScrapeCountry(e.target.value)}
                    className="w-full px-4 py-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-white outline-none focus:border-emerald-500 transition-all font-bold"
                  >
                    {availableCountries.map(c => (
                      <option key={c.code} value={c.code}>{c.name} ({c.code})</option>
                    ))}
                    <option value="CUSTOM">Custom Country...</option>
                  </select>
                </div>

                {scrapeCountry === 'CUSTOM' && (
                  <div>
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-2">ISO Code</label>
                    <input 
                      type="text" 
                      value={scrapeCustomCountry} 
                      onChange={(e) => setScrapeCustomCountry(e.target.value.toUpperCase())}
                      placeholder="e.g. TH, BR"
                      className="w-full px-4 py-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-white font-bold"
                    />
                  </div>
                )}

                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-2">State / Province</label>
                  <select 
                    value={scrapeStateCode} 
                    onChange={(e) => setScrapeStateCode(e.target.value)}
                    className="w-full px-4 py-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-white font-bold"
                  >
                    <option value="">Select Region</option>
                    {scrapeStates.length > 0 ? (
                      scrapeStates.map(s => <option key={s} value={s}>{s}</option>)
                    ) : (
                      <option value="ALL">All Regions (Auto-load)</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-2">Keyword</label>
                  <input 
                    type="text" 
                    value={scrapeKeyword} 
                    onChange={(e) => setScrapeKeyword(e.target.value)} 
                    placeholder="e.g. Tattoo Shops"
                    className="w-full px-4 py-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-white font-bold"
                  />
                </div>

                <div className="flex items-center gap-3 p-4 bg-zinc-900/50 rounded-2xl border border-zinc-800">
                  <input 
                    type="checkbox" 
                    checked={scrapeHeadless} 
                    onChange={(e) => setScrapeHeadless(e.target.checked)}
                    id="headless"
                  />
                  <label htmlFor="headless" className="text-xs font-bold text-zinc-400 cursor-pointer">Background Stealth Scrape</label>
                </div>

                {scrapeTaskId && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-black text-zinc-500 uppercase">
                      <span>Progress: {scrapeProgress.completed}/{scrapeProgress.total}</span>
                      <span className="text-emerald-500">{scrapeStatus}</span>
                    </div>
                    <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500" style={{ width: `${scrapeProgress.total ? (scrapeProgress.completed / scrapeProgress.total) * 100 : 0}%` }} />
                    </div>
                  </div>
                )}

                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={startScrape} 
                    disabled={!scrapeStateCode || scrapeStatus === 'running'}
                    className="flex-1 py-4 bg-emerald-600 disabled:bg-zinc-800 text-white font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-emerald-500/20"
                  >
                    Start Protocol
                  </button>
                  <button onClick={() => setShowScrape(false)} className="px-8 py-4 bg-zinc-900 border border-zinc-800 text-zinc-500 font-bold rounded-2xl">Cancel</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
