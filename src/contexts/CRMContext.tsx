
import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { CRMArtist, CRMStage, AIPersona, CRMInteraction, CRMOrder, InstagramAccount, TaskAssignment, AccountBehavior, AccountLanguage, AccountSpeedProfile, ShopContact, AutomationPipelineConfig, PipelineStageConfig, PipelineStageKey } from '../types/crm';
import { toast } from 'sonner';
import { processArtistBatchAI, setMockMode as setGeminiMockMode } from '../lib/gemini';
import { db, auth, signInWithGoogle, logoutUser } from '../lib/firebase';
import localforage from 'localforage';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  setDoc, 
  writeBatch, 
  getDocs,
  deleteDoc,
  Timestamp
} from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { safeJsonParse } from '../lib/gemini';

// Helper to sanitize data for Firestore
const sanitizeForFirestore = (obj: any): any => {
  if (obj === null || obj === undefined) return null;
  if (typeof obj === 'function') return null;
  if (Array.isArray(obj)) return obj.map(sanitizeForFirestore);
  if (obj instanceof Date) return obj.toISOString();
  if (typeof obj === 'object') {
    const sanitized: any = {};
    Object.keys(obj).forEach(key => {
      const value = obj[key];
      if (value !== undefined && typeof value !== 'function') {
        sanitized[key] = sanitizeForFirestore(value);
      }
    });
    return sanitized;
  }
  return obj;
};

// Configure localforage for Local-First fallback
localforage.config({
  name: 'InkFlowAI',
  storeName: 'crm_cache'
});

interface ConversionDNA {
  topStyles: string[];
  topLocations: string[];
  avgFollowers: number;
  topActivityLevels: string[];
}

interface DeepScanTaskStatus {
  id: string;
  status: 'running' | 'paused' | 'completed';
  total: number;
  completed: number;
  failed: number;
  pending: number;
  leased: number;
  updatedAt: string;
  failedIdsSample: string[];
  failedReasonStats: Record<string, number>;
  failedItemsSample: Array<{ id: string; reason: string }>;
}

interface CRMContextType {
  artists: CRMArtist[];
  interactions: CRMInteraction[];
  orders: CRMOrder[];
  pagination: { total: number; page: number; totalPages: number };
  loadData: () => Promise<any>;
  persona: AIPersona;
  setPersona: (persona: AIPersona) => void;
  conversionDNA: ConversionDNA | null;
  moveArtist: (artistId: string, toStage: CRMStage) => void;
  updateArtist: (artistId: string, updates: Partial<CRMArtist>) => void;
  addInteraction: (artistId: string, type: CRMInteraction['type'] | 'story-view' | 'follow-back' | 'dm_reply', content?: string) => Promise<void>;
  addOrder: (artistId: string, productName: string, amount: number) => Promise<void>;
  markAsConverted: (artistId: string) => void;
  importCSV: (data: any[], defaultLocation?: string, accountTag?: string, options?: { rawRows?: number; missingNameRows?: number }) => Promise<void>;
  syncShopifySales: (data: any[]) => Promise<void>;
  bulkEnrichArtists: () => Promise<void>;
  clearAllData: () => void;
  markAsIdealTarget: (artistId: string) => void;
  submitFeedback: (artistId: string, type: 'success' | 'failure') => void;
  refreshHarvestList: () => void;
  deleteArtist: (artistId: string) => Promise<void>;
  analyzeArtistVisualDNA: (artistId: string, imageUrl: string) => Promise<void>;
  findSimilarArtists: (artistId: string) => { artist: CRMArtist; reason: string }[];
  isScanning: boolean;
  scanProgress: { current: number, total: number };
  pinnedCount: number;
  mockMode: boolean;
  setMockMode: (mode: boolean) => void;
  debugMode: boolean;
  setDebugMode: (mode: boolean) => void;
  simulateInteraction: (artistId: string, points: number) => Promise<void>;
  seedTestData: () => Promise<void>;
  globalWeights: Record<string, number>;
  harvestList: CRMArtist[];
  user: User | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  isAuthReady: boolean;
  globalStats: any;
  importMetrics: {
    rawRows: number;
    validRows: number;
    dedupedRows: number;
    deepScanTargets: number;
    enrichSuccess: number;
    enrichFailed: number;
    skipReasons: {
      missingName: number;
      identical: number;
      alreadyEnriched: number;
      mappingError: number;
    };
  };
  deepScanTask: DeepScanTaskStatus | null;
  refreshDeepScanTask: (taskId?: string) => Promise<DeepScanTaskStatus | null>;
  pauseDeepScanTask: (taskId?: string) => Promise<DeepScanTaskStatus | null>;
  resumeDeepScanTask: (taskId?: string) => Promise<DeepScanTaskStatus | null>;
  retryFailedDeepScanTask: (taskId?: string, reason?: string) => Promise<DeepScanTaskStatus | null>;
  pipelineConfig: AutomationPipelineConfig;
  updatePipelineConfig: (updates: Partial<AutomationPipelineConfig>) => Promise<void>;
  updatePipelineStage: (stageKey: PipelineStageKey, updates: Partial<PipelineStageConfig>) => Promise<void>;
  accounts: InstagramAccount[];
  assignments: TaskAssignment[];
  assignTaskToAccount: (artistId: string) => Promise<string | null>;
  startAutomationSequence: (artistId: string, accountId: string) => Promise<void>;
}

const CRMContext = createContext<CRMContextType | undefined>(undefined);
type InteractionInputType = CRMInteraction['type'] | 'story-view' | 'follow-back' | 'dm_reply';

const SPEED_PROFILES: Record<AccountSpeedProfile, {
  jitterRange: [number, number];
  likesRange: [number, number];
  commentProbability: number;
  followProbability: number;
  breakProbability: number;
}> = {
  safe: {
    jitterRange: [120, 360],
    likesRange: [1, 2],
    commentProbability: 0.35,
    followProbability: 0.2,
    breakProbability: 0.22
  },
  balanced: {
    jitterRange: [70, 260],
    likesRange: [1, 3],
    commentProbability: 0.5,
    followProbability: 0.3,
    breakProbability: 0.15
  },
  aggressive: {
    jitterRange: [45, 180],
    likesRange: [2, 4],
    commentProbability: 0.65,
    followProbability: 0.45,
    breakProbability: 0.1
  }
};

const COUNTRY_LANGUAGE_HINT: Record<string, AccountLanguage> = {
  US: 'en',
  UK: 'en',
  AU: 'en',
  CA: 'en',
  MX: 'es',
  ES: 'es',
  AR: 'es',
  BR: 'pt',
  FR: 'fr',
  DE: 'de',
  IT: 'it',
  CN: 'zh',
  JP: 'ja',
  KR: 'ko'
};

const US_STATE_CODES = new Set([
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC'
]);

const US_STATE_NAME_TO_CODE: Record<string, string> = {
  alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR', california: 'CA', colorado: 'CO',
  connecticut: 'CT', delaware: 'DE', florida: 'FL', georgia: 'GA', hawaii: 'HI', idaho: 'ID',
  illinois: 'IL', indiana: 'IN', iowa: 'IA', kansas: 'KS', kentucky: 'KY', louisiana: 'LA',
  maine: 'ME', maryland: 'MD', massachusetts: 'MA', michigan: 'MI', minnesota: 'MN', mississippi: 'MS',
  missouri: 'MO', montana: 'MT', nebraska: 'NE', nevada: 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ',
  'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND', ohio: 'OH',
  oklahoma: 'OK', oregon: 'OR', pennsylvania: 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
  'south dakota': 'SD', tennessee: 'TN', texas: 'TX', utah: 'UT', vermont: 'VT', virginia: 'VA',
  washington: 'WA', 'west virginia': 'WV', wisconsin: 'WI', wyoming: 'WY', 'district of columbia': 'DC'
};

const inferStateCodeFromAddress = (address?: string): string | null => {
  if (!address || typeof address !== 'string') return null;
  const normalized = address.trim();
  if (!normalized) return null;

  const stateZipMatch = normalized.match(/,\s*([A-Za-z]{2})\s+\d{5}(?:-\d{4})?\b/);
  if (stateZipMatch) {
    const code = stateZipMatch[1].toUpperCase();
    if (US_STATE_CODES.has(code)) return code;
  }

  const tokens = normalized.split(',').map((x) => x.trim()).filter(Boolean);
  for (let i = tokens.length - 1; i >= 0; i--) {
    const token = tokens[i];
    const words = token.split(/\s+/).filter(Boolean);
    for (const word of words) {
      const up = word.toUpperCase();
      if (US_STATE_CODES.has(up)) return up;
    }
    const lowerToken = token.toLowerCase();
    if (US_STATE_NAME_TO_CODE[lowerToken]) return US_STATE_NAME_TO_CODE[lowerToken];
  }

  return null;
};

const normalizeLocationValue = (rawLocation?: any, address?: string, country?: string): string => {
  const raw = String(rawLocation ?? '').trim();
  const countryCode = String(country || '').trim().toUpperCase();
  const inferredState = inferStateCodeFromAddress(address);

  const rawUpper = raw.toUpperCase();
  const rawLower = raw.toLowerCase();
  const isMissing =
    !raw ||
    rawLower === 'unknown' ||
    rawLower === 'n/a' ||
    rawLower === 'na' ||
    /^\d+$/.test(rawLower);

  if (!isMissing) {
    if (US_STATE_CODES.has(rawUpper)) return rawUpper;
    if (US_STATE_NAME_TO_CODE[rawLower]) return US_STATE_NAME_TO_CODE[rawLower];
    if (rawUpper.length <= 3 && /^[A-Z]+$/.test(rawUpper)) return rawUpper;
    if (inferredState) return inferredState;
    return raw;
  }

  if (inferredState) return inferredState;
  if (countryCode && countryCode !== 'US') return countryCode;
  return 'Unknown';
};

const DEFAULT_PIPELINE_CONFIG: AutomationPipelineConfig = {
  globalPause: false,
  hourlyTaskCap: 30,
  dailyTaskCap: 180,
  minActionIntervalSeconds: 90,
  quietHoursStart: 23,
  quietHoursEnd: 7,
  requireManualReview: true,
  stages: [
    { key: 'data_import', label: 'Data Import', enabled: true, targetMinutes: 5, cooldownSeconds: 10 },
    { key: 'deep_scan', label: 'Deep Scan', enabled: true, targetMinutes: 30, cooldownSeconds: 20 },
    { key: 'quality_scoring', label: 'Quality Scoring', enabled: true, targetMinutes: 5, cooldownSeconds: 5 },
    { key: 'review_queue', label: 'Manual Review Queue', enabled: true, targetMinutes: 20, cooldownSeconds: 0 },
    { key: 'outreach_execution', label: 'Outreach Execution', enabled: true, targetMinutes: 120, cooldownSeconds: 90 },
    { key: 'result_writeback', label: 'Result Writeback', enabled: true, targetMinutes: 10, cooldownSeconds: 5 },
    { key: 'daily_recap', label: 'Daily Recap', enabled: true, targetMinutes: 15, cooldownSeconds: 0 }
  ],
  updatedAt: new Date().toISOString()
};

// Generate some mock data
const generateMockArtists = (count: number): CRMArtist[] => {
  return []; // Disabled to prevent polluting real data
};

export const CRMProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [rawArtists, setRawArtists] = useState<CRMArtist[]>([]);
  const [interactions, setInteractions] = useState<CRMInteraction[]>([]);
  const [orders, setOrders] = useState<CRMOrder[]>([]);
  const [accounts, setAccounts] = useState<InstagramAccount[]>([]);
  const [assignments, setAssignments] = useState<TaskAssignment[]>([]);
  const rawArtistsRef = useRef<CRMArtist[]>([]);

  useEffect(() => {
    rawArtistsRef.current = rawArtists;
  }, [rawArtists]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [persona, setPersona] = useState<AIPersona>('professional');
  const [isScanning, setIsScanning] = useState(false);
  const isScanningRef = useRef(false);
  const lastLocalUpdateRef = useRef<number>(0);
  useEffect(() => {
    isScanningRef.current = isScanning;
  }, [isScanning]);
  const [scanProgress, setScanProgress] = useState({ current: 0, total: 0 });
  const [pinnedCount, setPinnedCount] = useState(0);
  const [mockMode, setMockModeState] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [globalWeights, setGlobalWeights] = useState<Record<string, number>>({
    'Realism': 1.0,
    'Traditional': 1.0,
    'Black & Grey': 1.0,
    'Fine Line': 1.0,
    'Neo-Traditional': 1.0,
    'London': 1.0,
    'New York': 1.0,
    'Berlin': 1.0,
    'Tokyo': 1.0,
    'Paris': 1.0,
    'Seoul': 1.0,
    'high': 1.0,
    'medium': 1.0,
    'low': 1.0
  });

  const setMockMode = useCallback((mode: boolean) => {
    setMockModeState(mode);
    setGeminiMockMode(mode);
    if (mode) {
      toast.info('Mock Mode Enabled', {
        description: 'API calls will be simulated with a 2s delay.'
      });
    } else {
      toast.info('Mock Mode Disabled', {
        description: 'Real API calls will be made.'
      });
    }
  }, []);

  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });
  const [globalStats, setGlobalStats] = useState<any[]>([]);
  const [importMetrics, setImportMetrics] = useState({
    rawRows: 0,
    validRows: 0,
    dedupedRows: 0,
    deepScanTargets: 0,
    enrichSuccess: 0,
    enrichFailed: 0,
    skipReasons: {
      missingName: 0,
      identical: 0,
      alreadyEnriched: 0,
      mappingError: 0
    }
  });
  const [pipelineConfig, setPipelineConfig] = useState<AutomationPipelineConfig>(DEFAULT_PIPELINE_CONFIG);
  const [deepScanTask, setDeepScanTask] = useState<DeepScanTaskStatus | null>(null);

  const toDeepScanTaskStatus = useCallback((payload: any): DeepScanTaskStatus | null => {
    if (!payload || !payload.id) return null;
    const failedIdsSample = Array.isArray(payload.failedIdsSample)
      ? payload.failedIdsSample.map((id: any) => String(id)).filter(Boolean)
      : [];
    const failedReasonStats = (payload?.failedReasonStats && typeof payload.failedReasonStats === 'object')
      ? Object.entries(payload.failedReasonStats).reduce((acc: Record<string, number>, [key, value]) => {
          acc[String(key)] = Number(value) || 0;
          return acc;
        }, {})
      : {};
    const failedItemsSample = Array.isArray(payload.failedItemsSample)
      ? payload.failedItemsSample
          .map((item: any) => ({ id: String(item?.id || ''), reason: String(item?.reason || 'unknown') }))
          .filter((item: { id: string; reason: string }) => Boolean(item.id))
      : [];
    const status = String(payload.status || 'running') as DeepScanTaskStatus['status'];
    return {
      id: String(payload.id),
      status: status === 'paused' || status === 'completed' ? status : 'running',
      total: Number(payload.total) || 0,
      completed: Number(payload.completed) || 0,
      failed: Number(payload.failed) || 0,
      pending: Number(payload.pending) || 0,
      leased: Number(payload.leased) || 0,
      updatedAt: String(payload.updatedAt || ''),
      failedIdsSample,
      failedReasonStats,
      failedItemsSample
    };
  }, []);

  const getHourInTimezone = (timezone?: string): number => {
    if (!timezone) return new Date().getHours();
    try {
      const parts = new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        hour12: false,
        timeZone: timezone
      }).formatToParts(new Date());
      const hourPart = parts.find((p) => p.type === 'hour')?.value;
      const hour = parseInt(hourPart || '', 10);
      return Number.isFinite(hour) ? hour : new Date().getHours();
    } catch {
      return new Date().getHours();
    }
  };

  const isHourWithinWindow = (hour: number, startHour: number, endHour: number): boolean => {
    if (startHour === endHour) return true;
    if (startHour < endHour) return hour >= startHour && hour < endHour;
    return hour >= startHour || hour < endHour;
  };

  const inferArtistLanguage = (artist?: CRMArtist): AccountLanguage => {
    const country = (artist?.country || '').toUpperCase();
    return COUNTRY_LANGUAGE_HINT[country] || 'en';
  };

  const getAccountDailyCapTotal = (account: InstagramAccount): number => {
    if (!account.dailyCaps) return 50;
    const { likes = 0, comments = 0, follows = 0, dms = 0 } = account.dailyCaps;
    return likes + comments + follows + dms;
  };

  const buildDefaultContacts = (artist: CRMArtist): ShopContact[] => {
    const contacts: ShopContact[] = [];
    const baseId = artist.id || crypto.randomUUID();
    if (artist.ig_handle || artist.username) {
      contacts.push({
        id: `${baseId}_owner_ig`,
        displayName: artist.fullName || artist.shopName || artist.username,
        role: 'owner',
        priority: 100,
        state: 'new',
        attemptCount: 0,
        channels: { instagram: artist.ig_handle || artist.username },
        source: 'import',
        confidence: 0.8
      });
    }
    if (artist.email) {
      contacts.push({
        id: `${baseId}_owner_email`,
        displayName: artist.fullName || artist.shopName || artist.username,
        role: 'owner',
        priority: 80,
        state: 'new',
        attemptCount: 0,
        channels: { email: artist.email },
        source: 'import',
        confidence: 0.78
      });
    }
    return contacts;
  };

  const mergeContacts = (existing: ShopContact[] = [], incoming: ShopContact[] = []): ShopContact[] => {
    const merged = [...existing];
    const keyOf = (c: ShopContact) => `${c.channels.instagram || ''}|${c.channels.email || ''}|${c.channels.whatsapp || ''}`.toLowerCase();
    const index = new Map<string, number>();
    merged.forEach((c, i) => index.set(keyOf(c), i));

    incoming.forEach((c) => {
      const k = keyOf(c);
      const idx = index.get(k);
      if (idx === undefined) {
        merged.push(c);
        index.set(k, merged.length - 1);
      } else {
        const prev = merged[idx];
        merged[idx] = {
          ...prev,
          ...c,
          channels: { ...prev.channels, ...c.channels },
          priority: Math.max(prev.priority || 0, c.priority || 0),
          confidence: Math.max(prev.confidence || 0, c.confidence || 0)
        };
      }
    });
    return merged;
  };

  const chooseNextContact = (artist: CRMArtist, nowIso: string = new Date().toISOString()): ShopContact | null => {
    const fallbackPool = artist.contacts && artist.contacts.length > 0 ? artist.contacts : buildDefaultContacts(artist);
    const now = new Date(nowIso).getTime();
    const cooldownMs = 48 * 60 * 60 * 1000;
    const eligible = fallbackPool
      .filter((c) => c.state !== 'do_not_contact' && c.state !== 'converted')
      .filter((c) => {
        if (!c.lastContactedAt) return true;
        const last = new Date(c.lastContactedAt).getTime();
        return Number.isFinite(last) ? (now - last >= cooldownMs) : true;
      })
      .sort((a, b) => {
        const aScore = (a.priority || 0) - (a.attemptCount || 0) * 8;
        const bScore = (b.priority || 0) - (b.attemptCount || 0) * 8;
        return bScore - aScore;
      });
    return eligible[0] || null;
  };

  const getArtistActiveHours = (artist?: CRMArtist): number[] => {
    const fromSignals = artist?.socialSignals?.postingHours;
    const fromMetadata = artist?.metadata?.postingHours;
    const candidate = Array.isArray(fromSignals) && fromSignals.length > 0
      ? fromSignals
      : (Array.isArray(fromMetadata) ? fromMetadata : []);

    const normalized = candidate
      .map((h: any) => Number(h))
      .filter((h: number) => Number.isFinite(h) && h >= 0 && h <= 23)
      .map((h: number) => Math.floor(h));

    if (normalized.length > 0) return Array.from(new Set(normalized));
    // Fallback: common IG active windows for shops/artists
    return [11, 12, 13, 19, 20, 21];
  };

  const circularHourDistance = (a: number, b: number): number => {
    const raw = Math.abs(a - b);
    return Math.min(raw, 24 - raw);
  };

  const isNearAnyActiveHour = (currentHour: number, activeHours: number[], tolerance: number = 1): boolean => {
    return activeHours.some((h) => circularHourDistance(currentHour, h) <= tolerance);
  };

  const getWindowOverlapScore = (account: InstagramAccount, activeHours: number[]): number => {
    if (!account.activeWindow) return 0;
    const { startHour, endHour } = account.activeWindow;
    const overlapCount = activeHours.filter((h) => isHourWithinWindow(h, startHour, endHour)).length;
    return overlapCount;
  };

  const normalizeInteractionType = (type: InteractionInputType): CRMInteraction['type'] => {
    if (type === 'story-view') return 'story_view';
    if (type === 'follow-back') return 'follow_back';
    if (type === 'dm_reply') return 'reply';
    return type;
  };

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAuthReady(true);
      if (u) {
        console.log("User authenticated:", u.email);
      }
    });
    return () => unsubscribe();
  }, []);

  const login = async () => {
    try {
      await signInWithGoogle();
    } catch (e) {
      toast.error("Login failed");
    }
  };

  const logout = async () => {
    try {
      if (user?.uid) {
        await localforage.removeItem(`deep_scan_task_${user.uid}`);
      }
      await logoutUser();
      setRawArtists([]);
      setInteractions([]);
      setOrders([]);
      setAccounts([]);
      setAssignments([]);
      setDeepScanTask(null);
      toast.success("Logged out successfully");
    } catch (e) {
      toast.error("Logout failed");
    }
  };

  // Keep pagination total in sync with artists length
  useEffect(() => {
    setPagination(prev => ({
      ...prev,
      total: rawArtists.length,
      totalPages: Math.ceil(rawArtists.length / 50) || 1
    }));
  }, [rawArtists.length]);

  // Initial load from Local and Firestore
  const loadData = useCallback(async () => {
    if (!user) return;

    try {
      // 1. Load from Local Storage first (Instant)
      const cached = await localforage.getItem<CRMArtist[]>(`artists_${user.uid}`);
      if (cached && cached.length > 0) {
        setRawArtists(cached);
        setIsInitialLoad(false);
      }

      // 2. Sync Artists from Firestore
      const qArtists = query(collection(db, 'artists'), where('uid', '==', user.uid));
      const unsubArtists = onSnapshot(qArtists, (snapshot) => {
        const cloudData = snapshot.docs.map(doc => doc.data() as CRMArtist);
        
        setRawArtists(prev => {
          const mergedMap = new Map<string, CRMArtist>();
          
          // 1. Start with existing local state
          prev.forEach(a => mergedMap.set(a.id, a));
          
          // 2. Overwrite with cloud data (Cloud is source of truth for synced items)
          cloudData.forEach(a => mergedMap.set(a.id, a));
          
          const merged = Array.from(mergedMap.values());
          localforage.setItem(`artists_${user.uid}`, merged);
          return merged;
        });
        
        setIsInitialLoad(false);
      });

      // 3. Sync Interactions from Firestore
      const qInteractions = query(collection(db, 'interactions'), where('uid', '==', user.uid));
      const unsubInteractions = onSnapshot(qInteractions, (snapshot) => {
        const cloudData = snapshot.docs.map(doc => {
          const raw = doc.data() as CRMInteraction & { type?: string };
          const normalizedType = normalizeInteractionType((raw.type || 'like') as InteractionInputType);
          return { ...raw, type: normalizedType } as CRMInteraction;
        });
        setInteractions(prev => {
          const mergedMap = new Map<string, CRMInteraction>();
          prev.forEach(i => mergedMap.set(i.id, i));
          cloudData.forEach(i => mergedMap.set(i.id, i));
          return Array.from(mergedMap.values());
        });
      });

      // 4. Sync Orders from Firestore
      const qOrders = query(collection(db, 'orders'), where('uid', '==', user.uid));
      const unsubOrders = onSnapshot(qOrders, (snapshot) => {
        const cloudData = snapshot.docs.map(doc => doc.data() as CRMOrder);
        setOrders(prev => {
          const mergedMap = new Map<string, CRMOrder>();
          prev.forEach(o => mergedMap.set(o.id, o));
          cloudData.forEach(o => mergedMap.set(o.id, o));
          return Array.from(mergedMap.values());
        });
      });

      // 5. Sync Accounts from Firestore
      const qAccounts = query(collection(db, 'accounts'), where('uid', '==', user.uid));
      const unsubAccounts = onSnapshot(qAccounts, (snapshot) => {
        const cloudData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InstagramAccount));
        setAccounts(cloudData);
        
        if (cloudData.length === 0) {
          const mockAccounts: InstagramAccount[] = [
            {
              id: 'acc_1',
              username: 'inkflow_bot_1',
              behaviorProfile: 'observer',
              status: 'idle',
              language: 'en',
              timezone: 'America/New_York',
              speedProfile: 'safe',
              activeWindow: { startHour: 9, endHour: 20 },
              sleepWindow: { startHour: 23, endHour: 7 },
              dailyCaps: { likes: 30, comments: 12, follows: 8, dms: 6 },
              jitterMultiplier: 1.2,
              regionTags: ['US', 'CA', 'NY'],
              dailyActionCount: 0
            },
            {
              id: 'acc_2',
              username: 'inkflow_bot_2',
              behaviorProfile: 'active',
              status: 'idle',
              language: 'es',
              timezone: 'America/Los_Angeles',
              speedProfile: 'balanced',
              activeWindow: { startHour: 10, endHour: 22 },
              sleepWindow: { startHour: 0, endHour: 8 },
              dailyCaps: { likes: 45, comments: 18, follows: 12, dms: 8 },
              jitterMultiplier: 1.0,
              regionTags: ['US', 'MX', 'CA'],
              dailyActionCount: 0
            }
          ];
          mockAccounts.forEach(acc => {
            setDoc(doc(db, 'accounts', acc.id), { ...acc, uid: user.uid });
          });
        }
      });

      // 6. Sync Assignments from Firestore
      const qAssignments = query(collection(db, 'assignments'), where('uid', '==', user.uid));
      const unsubAssignments = onSnapshot(qAssignments, (snapshot) => {
        const cloudData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TaskAssignment));
        setAssignments(cloudData);
      });

      // Return cleanup function
      return () => {
        unsubArtists();
        unsubInteractions();
        unsubOrders();
        unsubAccounts();
        unsubAssignments();
      };
    } catch (error) {
      console.error("Error loading data:", error);
      setIsInitialLoad(false);
      return () => {};
    }
  }, [user]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    if (user) {
      loadData().then(unsub => {
        cleanup = unsub;
      });
    }
    return () => {
      if (cleanup) cleanup();
    };
  }, [user, loadData]);

  const refreshDeepScanTask = useCallback(async (taskId?: string): Promise<DeepScanTaskStatus | null> => {
    if (!user) return null;
    const taskKey = `deep_scan_task_${user.uid}`;
    let resolvedTaskId = taskId || deepScanTask?.id || await localforage.getItem<string>(taskKey);
    if (!resolvedTaskId) {
      const latestResp = await fetch('/api/deep-scan/latest');
      if (latestResp.ok) {
        const latestPayload = await latestResp.json();
        const latestNormalized = toDeepScanTaskStatus(latestPayload);
        if (latestNormalized?.id) {
          await localforage.setItem(taskKey, latestNormalized.id);
          setDeepScanTask(latestNormalized);
          return latestNormalized;
        }
      }
      setDeepScanTask(null);
      return null;
    }
    const resp = await fetch(`/api/deep-scan/status/${resolvedTaskId}`);
    if (!resp.ok) {
      if (resp.status === 404) {
        await localforage.removeItem(taskKey);
        setDeepScanTask(null);
        return null;
      }
      throw new Error('Failed to fetch deep scan task status');
    }
    const payload = await resp.json();
    const normalized = toDeepScanTaskStatus(payload);
    setDeepScanTask(normalized);
    if (normalized) {
      await localforage.setItem(taskKey, normalized.id);
      if (normalized.status === 'completed') {
        await localforage.removeItem(taskKey);
      }
    }
    return normalized;
  }, [user, deepScanTask?.id, toDeepScanTaskStatus]);

  const pauseDeepScanTask = useCallback(async (taskId?: string): Promise<DeepScanTaskStatus | null> => {
    if (!user) return null;
    const taskKey = `deep_scan_task_${user.uid}`;
    const resolvedTaskId = taskId || deepScanTask?.id || await localforage.getItem<string>(taskKey);
    if (!resolvedTaskId) return null;
    const resp = await fetch(`/api/deep-scan/pause/${resolvedTaskId}`, { method: 'POST' });
    if (!resp.ok) throw new Error('Failed to pause deep scan task');
    const normalized = toDeepScanTaskStatus(await resp.json());
    setDeepScanTask(normalized);
    if (normalized) await localforage.setItem(taskKey, normalized.id);
    setIsScanning(false);
    return normalized;
  }, [user, deepScanTask?.id, toDeepScanTaskStatus]);

  const resumeDeepScanTask = useCallback(async (taskId?: string): Promise<DeepScanTaskStatus | null> => {
    if (!user) return null;
    const taskKey = `deep_scan_task_${user.uid}`;
    const resolvedTaskId = taskId || deepScanTask?.id || await localforage.getItem<string>(taskKey);
    if (!resolvedTaskId) return null;
    const resp = await fetch(`/api/deep-scan/resume/${resolvedTaskId}`, { method: 'POST' });
    if (!resp.ok) throw new Error('Failed to resume deep scan task');
    const normalized = toDeepScanTaskStatus(await resp.json());
    setDeepScanTask(normalized);
    if (normalized) await localforage.setItem(taskKey, normalized.id);
    return normalized;
  }, [user, deepScanTask?.id, toDeepScanTaskStatus]);

  const retryFailedDeepScanTask = useCallback(async (taskId?: string, reason?: string): Promise<DeepScanTaskStatus | null> => {
    if (!user) return null;
    const taskKey = `deep_scan_task_${user.uid}`;
    const resolvedTaskId = taskId || deepScanTask?.id || await localforage.getItem<string>(taskKey);
    if (!resolvedTaskId) return null;
    const resp = await fetch(`/api/deep-scan/retry-failed/${resolvedTaskId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reason ? { reason } : {})
    });
    if (!resp.ok) throw new Error('Failed to retry failed deep scan items');
    const normalized = toDeepScanTaskStatus(await resp.json());
    setDeepScanTask(normalized);
    if (normalized) await localforage.setItem(taskKey, normalized.id);
    return normalized;
  }, [user, deepScanTask?.id, toDeepScanTaskStatus]);

  const updatePipelineConfig = useCallback(async (updates: Partial<AutomationPipelineConfig>) => {
    if (!user) return;
    const nextConfig: AutomationPipelineConfig = {
      ...pipelineConfig,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    setPipelineConfig(nextConfig);
    await localforage.setItem(`pipeline_config_${user.uid}`, nextConfig);
    try {
      await setDoc(
        doc(db, 'settings', `${user.uid}_pipeline_config`),
        sanitizeForFirestore({ ...nextConfig, uid: user.uid }),
        { merge: true }
      );
    } catch (e) {
      console.warn('Failed to sync pipeline config to cloud, kept locally.', e);
    }
  }, [user, pipelineConfig]);

  const updatePipelineStage = useCallback(async (stageKey: PipelineStageKey, updates: Partial<PipelineStageConfig>) => {
    if (!user) return;
    const nextStages = pipelineConfig.stages.map((stage) =>
      stage.key === stageKey ? { ...stage, ...updates } : stage
    );
    await updatePipelineConfig({ stages: nextStages });
  }, [user, pipelineConfig.stages, updatePipelineConfig]);

  useEffect(() => {
    if (!user) {
      setDeepScanTask(null);
      return;
    }
    refreshDeepScanTask().catch(() => {
      setDeepScanTask(null);
    });
  }, [user, refreshDeepScanTask]);

  useEffect(() => {
    const loadPipelineConfig = async () => {
      if (!user) {
        setPipelineConfig(DEFAULT_PIPELINE_CONFIG);
        return;
      }
      const cached = await localforage.getItem<AutomationPipelineConfig>(`pipeline_config_${user.uid}`);
      if (cached?.stages?.length) {
        setPipelineConfig(cached);
      } else {
        setPipelineConfig(DEFAULT_PIPELINE_CONFIG);
      }
    };
    loadPipelineConfig();
  }, [user]);

  // Calculate Conversion DNA from Customers
  const conversionDNA = useMemo(() => {
    const customers = rawArtists.filter(a => a.stage === 'customers' && a.orderCount > 0);
    if (customers.length < 3) return null; // Need a baseline

    const styles: Record<string, number> = {};
    const locations: Record<string, number> = {};
    const activity: Record<string, number> = {};
    let totalFollowers = 0;

    customers.forEach(c => {
      if (c.style) styles[c.style] = (styles[c.style] || 0) + 1;
      if (c.location) locations[c.location] = (locations[c.location] || 0) + 1;
      if (c.activityLevel) activity[c.activityLevel] = (activity[c.activityLevel] || 0) + 1;
      totalFollowers += c.followers || 0;
    });

    const getTop = (record: Record<string, number>) => 
      Object.entries(record).sort((a, b) => b[1] - a[1]).slice(0, 2).map(e => e[0]);

    return {
      topStyles: getTop(styles),
      topLocations: getTop(locations),
      avgFollowers: totalFollowers / customers.length,
      topActivityLevels: getTop(activity)
    };
  }, [rawArtists]);

  // Derive artists with similarity scores and weighted ranking
  const artists = useMemo(() => {
    return rawArtists
      .filter(a => a && typeof a === 'object')
      .map(a => {
        let baseScore = 0;
        let currentStage = a.stage;

      // 0. Check for Dormancy (90 days) and Restock Alerts (45-60 days)
      if (a.stage === 'customers' && a.lastOrderDate) {
        const lastOrder = new Date(a.lastOrderDate);
        const daysSinceOrder = (Date.now() - lastOrder.getTime()) / (1000 * 60 * 60 * 24);
        
        if (daysSinceOrder > 90) {
          currentStage = 'dormant';
        }
      }
      
      // 1. Base Similarity from Conversion DNA (if exists)
      if (conversionDNA) {
        if (a.style && conversionDNA.topStyles.includes(a.style)) baseScore += 40;
        if (a.location && conversionDNA.topLocations.includes(a.location)) baseScore += 30;
        if (a.activityLevel && conversionDNA.topActivityLevels.includes(a.activityLevel)) baseScore += 20;
        if (a.followers && Math.abs(a.followers - conversionDNA.avgFollowers) < conversionDNA.avgFollowers * 0.5) {
          baseScore += 10;
        }
      } else {
        // Fallback base score if no DNA yet
        baseScore = 50; 
      }

      // 2. Apply Learned Global Weights (The "Smart Discovery" part)
      let weightedScore = baseScore;
      const tags = [a.style, a.location, a.activityLevel].filter(Boolean) as string[];
      
      tags.forEach(tag => {
        if (globalWeights[tag]) {
          weightedScore *= globalWeights[tag];
        }
      });

      return { 
        ...a, 
        stage: currentStage,
        similarityScore: Math.min(100, Math.round(weightedScore)) 
      };
    });
  }, [rawArtists, conversionDNA, globalWeights]);

  const harvestList = useMemo(() => {
    return artists
      .filter(a => a.stage === 'outreach' || a.stage === 'dormant')
      .sort((a, b) => {
        // 1. Calculate Priority Score
        // Base: Heat Score + Similarity Score
        let aPriority = (a.heatScore || 0) + (a.similarityScore || 0);
        let bPriority = (b.heatScore || 0) + (b.similarityScore || 0);

        // 2. Massive Boost for "Just Followed Back" (The "Harvest" trigger)
        if (a.hasFollowedBack && a.stage === 'outreach') aPriority += 100;
        if (b.hasFollowedBack && b.stage === 'outreach') bPriority += 100;

        // 3. Boost for Dormant Re-activation
        if (a.stage === 'dormant') aPriority += 50;
        if (b.stage === 'dormant') bPriority += 50;

        // 4. Recency Boost (Interaction within last 24h)
        const dayInMs = 24 * 60 * 60 * 1000;
        if (a.lastInteractionDate && (Date.now() - new Date(a.lastInteractionDate).getTime() < dayInMs)) aPriority += 20;
        if (b.lastInteractionDate && (Date.now() - new Date(b.lastInteractionDate).getTime() < dayInMs)) bPriority += 20;

        return bPriority - aPriority;
      })
      .slice(0, 50);
  }, [artists]);

  const refreshHarvestList = useCallback(() => {
    setIsScanning(true);
    toast.info('Re-calculating Daily Harvest List based on updated feature weights...');
    setTimeout(() => {
      setIsScanning(false);
      toast.success('Daily Harvest List Refreshed', {
        description: 'Targeting accuracy improved based on recent feedback.'
      });
    }, 1500);
  }, []);

  const calculateHeatScore = (artist: CRMArtist): { score: number, isHighIntent: boolean } => {
    // view_count * 1 + like_count * 5 + comment_count * 20 + follow_back * 40
    const interactionScore = (artist.storyViews24h || 0) * 1 + 
                            (artist.likeCount || 0) * 5 + 
                            (artist.replyCount || 0) * 20 + 
                            (artist.hasFollowedBack ? 40 : 0);
    
    // Use the higher of the current score or the calculated interaction score
    // This prevents manually seeded high scores from being reset by the first interaction
    const currentScore = artist.heatScore || 0;
    const finalScore = Math.max(currentScore, interactionScore);
    
    const isHighIntent = finalScore >= 80;
    return { score: Math.min(100, finalScore), isHighIntent };
  };

  const moveArtist = useCallback(async (artistId: string, toStage: CRMStage) => {
    if (!user) return;
    
    // 1. Update Local State & Cache immediately
    setRawArtists(prev => {
      const updated = prev.map(a => a.id === artistId ? { ...a, stage: toStage } : a);
      localforage.setItem(`artists_${user.uid}`, updated);
      return updated;
    });
    toast.success(`Artist moved to ${toStage}`);

    // 2. Try Cloud Sync
    try {
      const docRef = doc(db, 'artists', artistId);
      await setDoc(docRef, sanitizeForFirestore({ stage: toStage }), { merge: true });
    } catch (e: any) {
      console.error("Failed to sync move to cloud", e);
      if (e.message.includes("resource-exhausted")) {
        console.warn("Cloud quota hit. Move saved locally.");
      }
    }
  }, [user]);

  const updateArtist = useCallback(async (artistId: string, updates: Partial<CRMArtist>) => {
    if (!user) return;
    
    // 1. Calculate and Update Local State & Cache immediately
    setRawArtists(prev => {
      const artist = prev.find(a => a.id === artistId);
      if (!artist) return prev;
      
      const updatedItem = { ...artist, ...updates };
      const { score, isHighIntent } = calculateHeatScore(updatedItem);
      const finalItem = { ...updatedItem, heatScore: score, isHighIntent };
      
      const updatedList = prev.map(a => a.id === artistId ? finalItem : a);
      localforage.setItem(`artists_${user.uid}`, updatedList);
      return updatedList;
    });

    // 2. Try Cloud Sync
    try {
      const artist = rawArtistsRef.current.find(a => a.id === artistId);
      if (!artist) return;
      
      const updated = { ...artist, ...updates };
      const { score, isHighIntent } = calculateHeatScore(updated);
      const finalUpdates = { ...updates, heatScore: score, isHighIntent };
      
      const docRef = doc(db, 'artists', artistId);
      await setDoc(docRef, sanitizeForFirestore(finalUpdates), { merge: true });
    } catch (e: any) {
      console.error("Failed to sync update to cloud", e);
    }
  }, [user]);

  const addInteraction = useCallback(async (artistId: string, type: InteractionInputType, content?: string) => {
    if (!user) return;
    const normalizedType = normalizeInteractionType(type);
    
    const weights: Record<CRMInteraction['type'], number> = {
      'like': 5,
      'comment': 20,
      'follow': 25,
      'story_view': 1,
      'reply': 40,
      'follow_back': 40
    };

    const interactionId = `int_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newInteraction: CRMInteraction = {
      id: interactionId,
      artistId,
      type: normalizedType,
      weight: weights[normalizedType],
      timestamp: new Date().toISOString(),
      content
    };

    try {
      await setDoc(doc(db, 'interactions', interactionId), { ...newInteraction, uid: user.uid });
      
      // Update artist heat score
      const artist = rawArtists.find(a => a.id === artistId);
      if (artist) {
        const updates: Partial<CRMArtist> = {
          lastInteractionDate: newInteraction.timestamp
        };

        if (normalizedType === 'like') updates.likeCount = (artist.likeCount || 0) + 1;
        if (normalizedType === 'comment') updates.replyCount = (artist.replyCount || 0) + 1;
        if (normalizedType === 'story_view') updates.storyViews24h = (artist.storyViews24h || 0) + 1;
        if (normalizedType === 'follow_back') updates.hasFollowedBack = true;
        if (normalizedType === 'reply') {
          updates.stage = 'engaged';
        }

        const updatedArtist = { ...artist, ...updates };
        const { score, isHighIntent } = calculateHeatScore(updatedArtist);
        
        updates.heatScore = score;
        updates.isHighIntent = isHighIntent;

        // Threshold Trigger: If heat_score >= 80, set status to 'engaged' and trigger a UI alert
        if (score >= 80 && artist.stage === 'outreach') {
          updates.stage = 'engaged';
          toast.success('🔥 High-Value Connection Detected!', {
            description: `@${artist.username} has reached a high heat score. Moving to Engaged stage.`,
            duration: 5000
          });
        }

        await updateArtist(artistId, updates);
      }
    } catch (error) {
      console.error("Error adding interaction:", error);
    }
  }, [user, rawArtists, updateArtist, calculateHeatScore]);

  const getCustomerTier = (orderCount: number, totalSpent: number = 0): 'new' | 'loyal' | 'vip' => {
    if (orderCount >= 5 || totalSpent > 1000) return 'vip';
    if (orderCount >= 2) return 'loyal';
    return 'new';
  };

  const addOrder = useCallback(async (artistId: string, productName: string, amount: number) => {
    if (!user) return;

    const orderId = `ord_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newOrder: CRMOrder = {
      id: orderId,
      artistId,
      productName,
      amount,
      orderDate: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'orders', orderId), { ...newOrder, uid: user.uid });
      
      const artist = rawArtists.find(a => a.id === artistId);
      if (artist) {
        const newOrderCount = (artist.orderCount || 0) + 1;
        const newTotalSpent = (artist.totalSpent || 0) + amount;
        const newTier = getCustomerTier(newOrderCount, newTotalSpent);
        
        await updateArtist(artistId, {
          orderCount: newOrderCount,
          totalSpent: newTotalSpent,
          lastOrderDate: newOrder.orderDate,
          stage: 'customers',
          customerTier: newTier
        });

        toast.success(`Order recorded! ${artist.username} is now a ${newTier} customer.`);
      }
    } catch (error) {
      console.error("Error adding order:", error);
    }
  }, [user, rawArtists, updateArtist]);

  const deleteArtist = useCallback(async (artistId: string) => {
    if (!user) return;
    
    try {
      // 1. Update Local State & Cache
      setRawArtists(prev => {
        const updatedList = prev.filter(a => a.id !== artistId);
        localforage.setItem(`artists_${user.uid}`, updatedList);
        return updatedList;
      });

      // 2. Delete from Firestore
      const docRef = doc(db, 'artists', artistId);
      await deleteDoc(docRef);
      
      toast.success("Lead permanently deleted", {
        description: "The artist has been removed from your CRM and cloud storage."
      });
    } catch (e) {
      console.error("Failed to delete artist", e);
      toast.error("Failed to remove artist from cloud");
    }
  }, [user]);

  const analyzeArtistVisualDNA = useCallback(async (artistId: string, imageUrl: string) => {
    if (!user) return;
    
    try {
      const response = await fetch('/api/analyze-visual-dna', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl })
      });
      
      if (!response.ok) throw new Error('Failed to analyze visual DNA');
      
      const result = await response.json();
      await updateArtist(artistId, { visualDNA: result });
      toast.success('Visual DNA Analysis Complete', {
        description: `Style identified: ${result.style}`
      });
    } catch (e) {
      console.error("Visual DNA Analysis failed", e);
      toast.error("AI Analysis failed. Please check the image URL or try again.");
    }
  }, [user, updateArtist]);

  const findSimilarArtists = useCallback((artistId: string) => {
    const sourceArtist = rawArtists.find(a => a.id === artistId);
    if (!sourceArtist || !sourceArtist.visualDNA) return [];

    return rawArtists
      .filter(a => a.id !== artistId)
      .map(target => {
        let score = 0;
        let reasons: string[] = [];

        if (target.visualDNA?.style === sourceArtist.visualDNA?.style) {
          score += 50;
          reasons.push(`Same Style: ${sourceArtist.visualDNA?.style}`);
        }

        if (target.location_tag === sourceArtist.location_tag && sourceArtist.location_tag) {
          score += 30;
          reasons.push(`Same Location: ${sourceArtist.location_tag}`);
        }

        const commonTags = target.dnaTags.filter(tag => sourceArtist.dnaTags.includes(tag));
        if (commonTags.length > 0) {
          score += commonTags.length * 5;
          reasons.push(`${commonTags.length} common DNA tags`);
        }

        return { 
          artist: target, 
          score, 
          reason: reasons.join(', ') || 'General similarity' 
        };
      })
      .filter(m => m.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(({ artist, reason }) => ({ artist, reason }));
  }, [rawArtists]);

  const markAsConverted = useCallback(async (artistId: string) => {
    if (!user) return;
    const a = rawArtists.find(artist => artist.id === artistId);
    if (!a) return;

    const newOrderCount = (a.orderCount || 0) + 1;
    const newTier = newOrderCount >= 2 ? 'loyal' : 'new';
    
    toast.success(`Artist ${a.username} marked as Customer!`, {
      description: newOrderCount >= 2 ? "Tier upgraded to Loyal Customer!" : "New Customer added."
    });

    await updateArtist(artistId, { 
      stage: 'customers', 
      status: 'ordered',
      orderCount: newOrderCount,
      customerTier: newTier,
      lastOrderDate: new Date().toISOString()
    });
  }, [user, rawArtists, updateArtist]);

  const submitFeedback = useCallback((artistId: string, type: 'success' | 'failure') => {
    const artist = rawArtists.find(a => a.id === artistId);
    if (!artist) return;

    const tags = [artist.style, artist.location, artist.activityLevel].filter(Boolean) as string[];
    const multiplier = type === 'success' ? 1.05 : 0.95;

    setGlobalWeights(prev => {
      const next = { ...prev };
      tags.forEach(tag => {
        next[tag] = (next[tag] || 1.0) * multiplier;
      });
      return next;
    });

    if (type === 'success') {
      markAsConverted(artistId);
      toast.success('Success Feedback Captured!', {
        description: `Weights for ${tags.join(', ')} increased by 5%. System evolving...`
      });
    } else {
      updateArtist(artistId, { stage: 'dormant', status: 'dormant' });
      toast.error('Failure Feedback Captured', {
        description: `Weights for ${tags.join(', ')} decreased by 5%. Targeting refined.`
      });
    }
  }, [rawArtists, markAsConverted, updateArtist]);

  const importCSV = useCallback(async (
    data: any[],
    defaultLocation?: string,
    accountTag: string = 'default',
    options?: { rawRows?: number; missingNameRows?: number }
  ) => {
    if (!user) return;
    try {
      const rawRows = options?.rawRows ?? data.length;
      const missingNameRows = options?.missingNameRows ?? Math.max(0, rawRows - data.length);
      setImportMetrics(prev => ({
        ...prev,
        rawRows,
        validRows: data.length,
        dedupedRows: 0,
        deepScanTargets: 0,
        enrichSuccess: 0,
        enrichFailed: 0,
        skipReasons: {
          ...prev.skipReasons,
          missingName: missingNameRows,
          identical: 0,
          mappingError: 0
        }
      }));

      setIsScanning(true);
      setScanProgress({ current: 0, total: data.length });
      toast.info(`Importing ${data.length} leads. Initializing database...`, { id: 'import-progress' });
      
      const clean = (val: any) => {
        if (typeof val !== 'string') return val;
        return val.replace(/\uFFFD/g, '').trim();
      };

      // 1. Fast ID Lookup Map - Use Ref to avoid dependency on rawArtists
      const artistMap = new Map<string, CRMArtist>();
      const phoneMap = new Map<string, CRMArtist>();
      const nameMap = new Map<string, CRMArtist>();
      
      console.log(`Starting import of ${data.length} leads...`);
      rawArtistsRef.current.forEach(a => {
        if (a.id) artistMap.set(a.id, a);
        if (a.phone) phoneMap.set(a.phone.replace(/\D/g, ''), a);
        // Avoid matching on generic names like "Unknown Shop"
        if (a.shopName && a.shopName.toLowerCase().trim() !== 'unknown shop') {
          nameMap.set(a.shopName.toLowerCase().trim(), a);
        }
      });
      const allArtistsToSave: CRMArtist[] = [];
      const artistsToEnrich: CRMArtist[] = [];
      let identicalSkipCount = 0;
      let mappingErrorCount = 0;

      // 2. Fast Mapping (O(M))
      console.log("Mapping rows...");
      data.forEach((row, index) => {
        try {
          const shopName = clean(row.name || row.title || row.shopName || 'Unknown Shop');
          const mapsRating = parseFloat(row.rating || row.mapsRating || row.avg_rating) || 0;
          const phone = clean((row.phone || row.phone_number || '').toString().replace(/\D/g, ''));
          const email = clean(row.email || row.contact_email || '');
          
          let username = clean(row.ig_handle || row.igLink || row.instagram || row.instagram_url || row.ig_url || `user_${index}_${Date.now()}`);
          if (typeof username === 'string') {
            if (username.startsWith('@')) username = username.substring(1);
            if (username.includes('instagram.com/')) {
              username = username.split('instagram.com/')[1].split('/')[0].split('?')[0];
            }
            // Final cleanup for username
            username = username.replace(/[^\w@.]/g, '');
          } else {
            username = `user_${index}_${Date.now()}`;
          }

          const locationRaw = clean(row.location || row.location_tag || row.city || row.state || defaultLocation || 'Unknown');
          const country = clean(row.country || row.nation || 'USA');
          const followers = parseInt(row.followers || row.follower_count || row.followers_count) || 0;
          const address = row.address || row.full_address || row.formatted_address || '';
          const location = normalizeLocationValue(locationRaw, address, country);
          
          // Try to find a stable ID from common scraper fields
          const placeId = row.place_id || row.cid || (row.metadata && (row.metadata.place_id || row.metadata.cid));
          const safeShopName = shopName.toLowerCase().replace(/[^a-z0-9]+/g, '_');
          const safeLoc = (address || location).toLowerCase().replace(/[^a-z0-9]+/g, '_');
          
          // Make stableId more unique if placeId is missing
          let stableId = placeId;
          if (!stableId) {
            const uniqueSuffix = phone || email || `idx_${index}`;
            stableId = `shop_${safeShopName}_${safeLoc}_${uniqueSuffix}`;
          }

          // Check if already exists (by ID, Phone, or Name)
          // Only match by name if it's not a generic "Unknown Shop"
          const existingByName = (shopName.toLowerCase().trim() !== 'unknown shop') ? nameMap.get(shopName.toLowerCase().trim()) : null;
          const existing = artistMap.get(stableId) || (phone ? phoneMap.get(phone) : null) || existingByName;
          
          // Smart Skip: If data is identical to existing, don't write to save quota
          if (existing) {
            const isIdentical = 
              existing.shopName === shopName &&
              existing.phone === phone &&
              existing.email === (email || existing.email) &&
              existing.address === (address || existing.address) &&
              existing.mapsRating === mapsRating;
            
            if (isIdentical && !row.forceUpdate) {
              identicalSkipCount++;
              return; // Skip writing to save quota
            }
          }

          const artist: CRMArtist = {
            id: existing?.id || stableId,
            username: username || existing?.username,
            fullName: shopName || existing?.fullName,
            profilePic: existing?.profilePic || `https://picsum.photos/seed/shop${index}/100/100`,
            stage: existing?.stage || 'outreach',
            heatScore: existing?.heatScore || 0,
            similarityScore: existing?.similarityScore || 0,
            dnaTags: existing?.dnaTags || ['#TattooArtist', '#Professional'],
            lastInteractionDate: existing?.lastInteractionDate || new Date().toISOString(),
            orderCount: existing?.orderCount || 0,
            totalSpent: existing?.totalSpent || 0,
            totalItems: existing?.totalItems || 0,
            lastOrderDate: existing?.lastOrderDate,
            styleMatch: existing?.styleMatch || false,
            storyViews24h: existing?.storyViews24h || 0,
            isHighIntent: existing?.isHighIntent || false,
            hasFollowedBack: existing?.hasFollowedBack || false,
            replyCount: existing?.replyCount || 0,
            likeCount: existing?.likeCount || 0,
            ig_handle: username.startsWith('user_') ? null : username,
            followers: followers || existing?.followers || 0,
            style: existing?.style || 'Various',
            country: country || existing?.country || 'USA',
            shopName,
            mapsRating,
            address: address || existing?.address,
            location,
            baseScore: Math.floor(mapsRating * 20),
            similarityWeight: 0,
            facebookId: row.facebook_id || row.facebook || existing?.facebookId || null,
            phone: phone || existing?.phone || null,
            website: row.website || row.site || existing?.website || null,
            email: row.email || existing?.email || null,
            rating: mapsRating,
            metadata: { ...(existing?.metadata || {}), ...(row.metadata || {}), ...(row.place_id ? { place_id: row.place_id } : {}) },
            account_tag: accountTag || existing?.account_tag || 'default',
            uid: user.uid,
            contacts: mergeContacts(
              existing?.contacts || [],
              buildDefaultContacts({
                ...(existing || {}),
                id: existing?.id || stableId,
                ig_handle: username.startsWith('user_') ? null : username,
                username: username || existing?.username || '',
                fullName: shopName || existing?.fullName || '',
                shopName,
                email: (row.email || existing?.email || null) as any
              } as CRMArtist)
            )
          };

          allArtistsToSave.push(artist);
          if (!artist.followers || artist.style === 'Various') {
            artistsToEnrich.push(artist);
          }
        } catch (err) {
          console.error("Error mapping row:", row, err);
          mappingErrorCount++;
        }
      });

      console.log(`Mapped ${allArtistsToSave.length} unique artists from ${data.length} rows. Saving to Local Storage...`);

      if (allArtistsToSave.length === 0) {
        setImportMetrics(prev => ({
          ...prev,
          dedupedRows: data.length,
          deepScanTargets: 0,
          skipReasons: {
            ...prev.skipReasons,
            identical: identicalSkipCount,
            mappingError: mappingErrorCount
          }
        }));
        toast.success("All leads are already up-to-date. No changes needed.", { id: 'import-progress' });
        setIsScanning(false);
        setScanProgress({ current: 0, total: 0 });
        return;
      }

      setImportMetrics(prev => ({
        ...prev,
        dedupedRows: Math.max(0, data.length - allArtistsToSave.length),
        deepScanTargets: artistsToEnrich.length,
        skipReasons: {
          ...prev.skipReasons,
          identical: identicalSkipCount,
          mappingError: mappingErrorCount
        }
      }));
      
      // 3. Save to Local Storage IMMEDIATELY (Fast & Free)
      setScanProgress({ current: 0, total: allArtistsToSave.length });
      toast.info(`Saving ${allArtistsToSave.length} leads to local database...`, { id: 'import-progress' });

      const updatedArtists = [...rawArtistsRef.current];
      const newIds = new Set(allArtistsToSave.map(a => a.id));
      
      allArtistsToSave.forEach((newItem) => {
        const existingIdx = updatedArtists.findIndex(a => a.id === newItem.id);
        if (existingIdx >= 0) {
          updatedArtists[existingIdx] = { ...updatedArtists[existingIdx], ...newItem };
        } else {
          updatedArtists.push(newItem);
        }
      });
      
      // CRITICAL: Update state and cache BEFORE cloud sync
      lastLocalUpdateRef.current = Date.now();
      await localforage.setItem(`artists_${user.uid}`, updatedArtists);
      setRawArtists(updatedArtists);
      
      toast.success(`Locally saved ${allArtistsToSave.length} leads!`, { 
        id: 'import-progress',
        description: "Data is safe in your browser. Syncing with cloud..."
      });

      // 4. Bulk Sync to Firestore (Batches of 500)
      setScanProgress({ current: 0, total: allArtistsToSave.length });
      
      const FIRESTORE_BATCH_LIMIT = 500;
      let quotaHit = false;

      for (let i = 0; i < allArtistsToSave.length; i += FIRESTORE_BATCH_LIMIT) {
        if (quotaHit) break;

        const chunk = allArtistsToSave.slice(i, i + FIRESTORE_BATCH_LIMIT);
        const batch = writeBatch(db);
        
        chunk.forEach(artist => {
          if (artist.id) {
            batch.set(doc(db, 'artists', artist.id), sanitizeForFirestore({ ...artist, uid: user.uid }), { merge: true });
          }
        });
        
        try {
          console.log(`Committing cloud batch ${i / FIRESTORE_BATCH_LIMIT + 1}...`);
          // Use a longer timeout for large imports
          const commitPromise = batch.commit();
          const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("TIMEOUT")), 30000));
          
          await Promise.race([commitPromise, timeoutPromise]);
          
          setScanProgress({ current: i + chunk.length, total: allArtistsToSave.length });
        } catch (commitErr: any) {
          console.error("Batch commit failed:", commitErr);
          const message = commitErr?.message || String(commitErr);
          
          if (message.includes("resource-exhausted") || message.includes("Quota exceeded") || message === "TIMEOUT") {
            quotaHit = true;
            toast.warning(message === "TIMEOUT" ? "Cloud Sync is slow" : "Cloud Quota Hit", {
              description: "Data is safe LOCALLY. Cloud backup will continue in background.",
              duration: 8000
            });
            break;
          }
        }
        
        // Small delay between batches to avoid overwhelming the connection
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      if (!quotaHit) {
        toast.success(`Cloud sync complete!`, { id: 'import-progress' });
      }

      // 5. Background AI Enrichment (Non-blocking)
      if (artistsToEnrich.length > 0) {
        // We don't await this, it runs in the background
        setTimeout(() => {
          processBackgroundAIEnrichment(artistsToEnrich, user.uid);
        }, 1000);
      }
    } catch (err: any) {
      console.error("Import CSV Failed:", err);
      if (err?.message === "QUOTA_EXCEEDED") {
        // Already handled with a specific toast
      } else {
        toast.error("Import failed. Check console for details.", { id: 'import-progress' });
      }
    } finally {
      setIsScanning(false);
      setScanProgress({ current: 0, total: 0 });
    }
  }, [user]);

  const processBackgroundAIEnrichment = async (artists: CRMArtist[], uid: string) => {
    console.log(`Starting background AI enrichment for ${artists.length} artists...`);
    const BATCH_SIZE = 50;
    const CONCURRENT_BATCHES = 2;

    for (let i = 0; i < artists.length; i += BATCH_SIZE * CONCURRENT_BATCHES) {
      const promises = [];
      for (let j = 0; j < CONCURRENT_BATCHES; j++) {
        const start = i + (j * BATCH_SIZE);
        if (start >= artists.length) break;
        
        const chunk = artists.slice(start, start + BATCH_SIZE);
        promises.push((async () => {
          try {
            const aiData = await processArtistBatchAI(
              chunk.map(a => ({ 
                id: a.id, 
                username: a.username, 
                shopName: a.shopName,
                bio: `Professional tattoo artist at ${a.shopName}.`
              })),
              true
            );

            if (Object.keys(aiData).length > 0) {
              const batch = writeBatch(db);
              const localUpdates: CRMArtist[] = [];

              chunk.forEach(a => {
                const enriched = aiData[a.id];
                if (enriched) {
                  const postingHours = Array.isArray(enriched.postingHours)
                    ? enriched.postingHours.map((h: any) => Number(h)).filter((h: number) => Number.isFinite(h) && h >= 0 && h <= 23)
                    : (a.socialSignals?.postingHours || []);
                  const updateData = {
                    followers: enriched.followers,
                    activityLevel: enriched.activityLevel,
                    style: enriched.style,
                    dnaTags: enriched.dnaTags || a.dnaTags,
                    username: enriched.realUsername || a.username,
                    fullName: enriched.realFullName || a.fullName,
                    socialSignals: {
                      ...(a.socialSignals || {}),
                      postingHours: postingHours.length > 0 ? postingHours : (a.socialSignals?.postingHours || []),
                      postsPerWeek: Number.isFinite(enriched.postsPerWeek) ? enriched.postsPerWeek : (a.socialSignals?.postsPerWeek || 0),
                      avgLikesPerPost: Number.isFinite(enriched.avgLikes) ? enriched.avgLikes : (a.socialSignals?.avgLikesPerPost || 0),
                      avgCommentsPerPost: Number.isFinite(enriched.avgComments) ? enriched.avgComments : (a.socialSignals?.avgCommentsPerPost || 0),
                      engagementRate: Number.isFinite(enriched.engagementRate) ? enriched.engagementRate : (a.socialSignals?.engagementRate || 0),
                      followerFollowingRatio: Number.isFinite(enriched.followerFollowingRatio) ? enriched.followerFollowingRatio : (a.socialSignals?.followerFollowingRatio || 0),
                      tattooLikelihood: Number.isFinite(enriched.tattooLikelihood) ? enriched.tattooLikelihood : (a.socialSignals?.tattooLikelihood || 0),
                      styleVector: {
                        ...(a.socialSignals?.styleVector || {}),
                        ...((enriched.styleVector && typeof enriched.styleVector === 'object') ? enriched.styleVector : {})
                      }
                    },
                    uid: user.uid // Ensure UID is present to satisfy security rules
                  };
                  // Use set with merge: true to handle documents that might be missing UID
                  batch.set(doc(db, 'artists', a.id), sanitizeForFirestore(updateData), { merge: true });
                  localUpdates.push({ ...a, ...updateData });
                }
              });
              await batch.commit();

              // Update local state for immediate feedback
              setRawArtists(prev => {
                const next = [...prev];
                localUpdates.forEach(update => {
                  const idx = next.findIndex(a => a.id === update.id);
                  if (idx >= 0) next[idx] = update;
                });
                return next;
              });
            }
          } catch (e) {
            console.error("Background AI Enrichment batch failed:", e);
          }
        })());
      }
      await Promise.all(promises);
      console.log(`Background AI Progress: ${Math.min(i + BATCH_SIZE * CONCURRENT_BATCHES, artists.length)} / ${artists.length}`);
    }
    console.log("Background AI enrichment complete.");
  };

  const syncShopifySales = useCallback(async (data: any[], accountTag?: string) => {
    if (!user) {
      toast.error("Please log in to sync Shopify data.");
      return;
    }

    setIsScanning(true);
    const totalRecords = data.length;
    setScanProgress({ current: 0, total: totalRecords });
    toast.info(`Processing ${totalRecords} Shopify records...`, { id: 'shopify-sync' });

    let matchCount = 0;
    let newCount = 0;
    const artistsToSave: CRMArtist[] = [];
    
    // Create lookup maps for O(1) matching from current state
    const emailMap = new Map<string, CRMArtist>();
    const phoneMap = new Map<string, CRMArtist>();
    const nameMap = new Map<string, CRMArtist>();

    rawArtistsRef.current.forEach(a => {
      if (accountTag && a.account_tag !== accountTag) return;
      if (a.email) emailMap.set(a.email.toLowerCase().trim(), a);
      if (a.phone) phoneMap.set(a.phone.replace(/\D/g, ''), a);
      if (a.shopName) nameMap.set(a.shopName.toLowerCase().trim(), a);
    });

    data.forEach(order => {
      const getVal = (keys: string[]) => {
        const foundKey = Object.keys(order).find(k => keys.some(target => k.toLowerCase().trim() === target.toLowerCase()));
        return foundKey ? (order[foundKey] || '').toString().trim() : '';
      };

      const email = getVal(['Email']).toLowerCase();
      const phone = getVal(['Phone', 'Default Address Phone']).replace(/\D/g, '');
      const firstName = getVal(['First Name']);
      const lastName = getVal(['Last Name']);
      const company = getVal(['Default Address Company', 'Company']);
      const fullName = company || `${firstName} ${lastName}`.trim() || 'Shopify Customer';
      const totalOrders = parseInt(getVal(['Total Orders'])) || 1;
      const totalSpent = parseFloat(getVal(['Total Spent'])) || 0;
      const totalItems = parseInt(getVal(['Total Items', 'Lineitem quantity'])) || 0;

      const province = getVal(['Default Address Province Code', 'Province Code']);
      const country = getVal(['Default Address Country Code', 'Country Code']);
      const location = (country && country !== 'US') ? country : (province || 'Unknown');

      // Try to find existing artist
      let artist = emailMap.get(email) || phoneMap.get(phone) || nameMap.get(fullName.toLowerCase());

      if (artist) {
        // Update existing
        const updatedArtist = {
          ...artist,
          stage: 'customers',
          orderCount: (artist.orderCount || 0) + totalOrders,
          totalSpent: (artist.totalSpent || 0) + totalSpent,
          totalItems: (artist.totalItems || 0) + totalItems,
          lastOrderDate: new Date().toISOString(),
          customerTier: ((artist.orderCount || 0) + totalOrders) >= 2 ? 'loyal' : 'new',
          dnaTags: [...new Set([...(artist.dnaTags || []), '#ShopifyCustomer', '#Purchased'])]
        } as CRMArtist;
        
        artistsToSave.push(updatedArtist);
        matchCount++;
      } else {
        // Create new
        const newArtist: CRMArtist = {
          id: `shopify_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          username: email.split('@')[0] || `user_${Math.random().toString(36).substr(2, 5)}`,
          fullName: fullName,
          profilePic: `https://picsum.photos/seed/${email || fullName}/100/100`,
          shopName: company || fullName,
          email: email,
          phone: phone,
          location: location,
          address: `${getVal(['Default Address Address1', 'Address1'])} ${getVal(['Default Address City', 'City'])}, ${province || ''} ${country || ''}`.trim(),
          stage: 'customers',
          heatScore: 50,
          similarityScore: 0,
          dnaTags: ['#ShopifyCustomer'],
          lastInteractionDate: new Date().toISOString(),
          orderCount: totalOrders,
          totalSpent: totalSpent,
          totalItems: totalItems,
          lastOrderDate: new Date().toISOString(),
          styleMatch: false,
          storyViews24h: 0,
          isHighIntent: false,
          hasFollowedBack: false,
          replyCount: 0,
          likeCount: 0,
          customerTier: totalOrders >= 2 ? 'loyal' : 'new',
          account_tag: accountTag || 'default'
        };
        artistsToSave.push(newArtist);
        newCount++;
      }
    });

    if (artistsToSave.length > 0) {
      // 1. Save Locally First
      toast.info(`Saving ${artistsToSave.length} Shopify matches to local database...`, { id: 'shopify-sync' });
      
      const updatedArtists = [...rawArtistsRef.current];
      artistsToSave.forEach(newItem => {
        const existingIdx = updatedArtists.findIndex(a => a.id === newItem.id);
        if (existingIdx >= 0) {
          updatedArtists[existingIdx] = { ...updatedArtists[existingIdx], ...newItem };
        } else {
          updatedArtists.push(newItem);
        }
      });

      await localforage.setItem(`artists_${user.uid}`, updatedArtists);
      setRawArtists(updatedArtists);
      
      toast.success(`Locally synced ${artistsToSave.length} Shopify records!`, { 
        id: 'shopify-sync',
        description: `Matched: ${matchCount} | New: ${newCount}. Cloud sync in progress...`
      });

      // 2. Background Cloud Sync
      setScanProgress({ current: 0, total: artistsToSave.length });
      const FIRESTORE_BATCH_LIMIT = 500;
      let quotaHit = false;

      for (let i = 0; i < artistsToSave.length; i += FIRESTORE_BATCH_LIMIT) {
        if (quotaHit) break;
        
        const batch = writeBatch(db);
        const chunk = artistsToSave.slice(i, i + FIRESTORE_BATCH_LIMIT);
        chunk.forEach(artist => {
          batch.set(doc(db, 'artists', artist.id), sanitizeForFirestore({ ...artist, uid: user.uid }), { merge: true });
        });

        try {
          console.log(`Committing Shopify cloud batch ${i / FIRESTORE_BATCH_LIMIT + 1}...`);
          // Use a timeout for large imports
          const commitPromise = batch.commit();
          const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("TIMEOUT")), 30000));
          
          await Promise.race([commitPromise, timeoutPromise]);
          
          setScanProgress({ current: Math.min(i + FIRESTORE_BATCH_LIMIT, artistsToSave.length), total: artistsToSave.length });
        } catch (err: any) {
          console.error("Shopify Batch commit failed:", err);
          const message = err?.message || String(err);

          if (message.includes("resource-exhausted") || message.includes("Quota exceeded") || message === "TIMEOUT") {
            quotaHit = true;
            toast.warning(message === "TIMEOUT" ? "Cloud Sync is slow" : "Cloud Quota Hit", {
              description: "Data is saved LOCALLY. Cloud backup will resume automatically.",
              duration: 8000
            });
            break;
          }
        }
      }

      if (!quotaHit) {
        toast.success("Shopify Cloud Sync Complete!", { id: 'shopify-sync' });
      }

      const firstMatch = artistsToSave.find(a => a.stage === 'customers');
      if (firstMatch) {
        markAsConverted(firstMatch.id);
      }
    } else {
      toast.error("No valid data found in Shopify CSV.", { id: 'shopify-sync' });
    }

    setIsScanning(false);
  }, [user, markAsConverted]);

  const bulkEnrichArtists = useCallback(async () => {
    if (!user) {
      toast.error("Please log in first.");
      return;
    }
    try {
      const healthResp = await fetch('/api/health');
      if (!healthResp.ok) {
        toast.error("Backend is offline. Please run `npm run dev` and retry Deep Scan.");
        return;
      }
    } catch {
      toast.error("Backend is offline. Please run `npm run dev` and retry Deep Scan.");
      return;
    }

    const outreachArtists = rawArtists.filter(a => a.stage === 'outreach');
    const targets = outreachArtists.filter(a =>
      !a.followers ||
      !a.style ||
      !a.socialSignals?.postingHours?.length ||
      !a.socialSignals?.engagementRate ||
      !a.socialSignals?.postsPerWeek ||
      !a.ig_handle ||
      !a.facebookId
    );
    const skipped = outreachArtists.length - targets.length;
    const BATCH_SIZE = 20;
    const taskKey = `deep_scan_task_${user.uid}`;
    const targetById = new Map(targets.map((a) => [a.id, a]));

    setImportMetrics(prev => ({
      ...prev,
      deepScanTargets: targets.length,
      enrichSuccess: 0,
      enrichFailed: 0,
      skipReasons: {
        ...prev.skipReasons,
        alreadyEnriched: skipped
      }
    }));

    if (targets.length === 0) {
      toast.success("All outreach leads already have enriched data!");
      return;
    }

    if (skipped > 0) {
      toast.info(`Deep Scanning ${targets.length} leads. Skipping ${skipped} already enriched.`, { id: 'enrich-progress' });
    } else {
      toast.info(`Deep Scanning ${targets.length} artists for Instagram data...`, { id: 'enrich-progress' });
    }

    setIsScanning(true);
    setScanProgress({ current: 0, total: targets.length });

    let taskId = await localforage.getItem<string>(taskKey);
    let status: DeepScanTaskStatus | null = null;
    let pausedByUser = false;

    try {
      if (taskId) {
        const existingStatus = await refreshDeepScanTask(taskId);
        if (existingStatus?.status === 'completed') {
          await localforage.removeItem(taskKey);
          taskId = null;
        } else if (existingStatus) {
          status = existingStatus;
          setDeepScanTask(existingStatus);
          setScanProgress({ current: existingStatus.completed + existingStatus.failed, total: existingStatus.total || targets.length });
          toast.info(`Resuming Deep Scan task ${taskId}...`, { id: 'enrich-progress' });
        } else {
          await localforage.removeItem(taskKey);
          taskId = null;
        }
      }

      if (!taskId) {
        const startResp = await fetch('/api/deep-scan/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ artistIds: targets.map((t) => t.id), batchSize: BATCH_SIZE })
        });
        if (!startResp.ok) throw new Error('Failed to start deep scan task');
        const started = toDeepScanTaskStatus(await startResp.json());
        if (!started) throw new Error('Invalid deep scan task response');
        taskId = started.id;
        status = started;
        setDeepScanTask(started);
        setScanProgress({ current: started.completed + started.failed, total: started.total });
        await localforage.setItem(taskKey, taskId);
      }

      while (taskId) {
        const nextResp = await fetch(`/api/deep-scan/next/${taskId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ limit: BATCH_SIZE })
        });
        if (!nextResp.ok) throw new Error('Failed to fetch deep scan batch');
        const nextPayload = await nextResp.json();
        const nextStatus = toDeepScanTaskStatus(nextPayload);
        if (nextStatus) {
          status = nextStatus;
          setDeepScanTask(nextStatus);
        }
        const batchIds: string[] = Array.isArray(nextPayload.artistIds) ? nextPayload.artistIds : [];

        if (batchIds.length === 0) {
          const refreshed = await refreshDeepScanTask(taskId);
          if (!refreshed) break;
          status = refreshed;
          setScanProgress({ current: refreshed.completed + refreshed.failed, total: refreshed.total });
          setImportMetrics(prev => ({
            ...prev,
            enrichSuccess: refreshed.completed,
            enrichFailed: refreshed.failed
          }));
          if (refreshed.status === 'completed') break;
          if (refreshed.status === 'paused') {
            pausedByUser = true;
            break;
          }
          await new Promise(resolve => setTimeout(resolve, 700));
          continue;
        }

        const missingTargetIds = batchIds.filter((id) => !targetById.has(id));
        const batchToEnrich = batchIds.map((id) => targetById.get(id)).filter(Boolean) as CRMArtist[];
        const successIds: string[] = [];
        const failedItems: Array<{ id: string; reason: string }> = missingTargetIds.map((id) => ({ id, reason: 'unknown' }));

        try {
          const socialLookupCandidates = batchToEnrich
            .filter(a => !a.ig_handle || !a.facebookId || !a.metadata?.tiktok)
            .map(a => ({
              id: a.id,
              shopName: a.shopName || a.fullName,
              website: a.website,
              address: a.address || `${a.location || ''} ${a.country || ''}`.trim(),
              phone: a.phone
            }));

          let socialLookupMap: Record<string, any> = {};
          let socialLookupErrored = false;
          if (socialLookupCandidates.length > 0) {
            const socialResp = await fetch('/api/enrich/social-links', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ shops: socialLookupCandidates })
            });
            if (socialResp.ok) {
              const payload = await socialResp.json();
              const rows = Array.isArray(payload?.results) ? payload.results : [];
              socialLookupMap = rows.reduce((acc: Record<string, any>, item: any) => {
                if (item?.id) acc[item.id] = item;
                return acc;
              }, {});
            } else {
              socialLookupErrored = true;
            }
          }

          let aiData: Record<string, any> = {};
          let aiErrored = false;
          try {
            aiData = await processArtistBatchAI(
              batchToEnrich.map(a => ({ id: a.id, username: a.username, shopName: a.shopName })),
              true
            );
          } catch (e) {
            aiErrored = true;
          }

          const updateBatch = writeBatch(db);
          const localUpdates: CRMArtist[] = [];

          batchToEnrich.forEach(a => {
            const enriched = aiData[a.id];
            const social = socialLookupMap[a.id];
            if (!enriched && !social) {
              let reason = 'unknown';
              if (aiErrored) reason = 'ai_error';
              else if (socialLookupErrored) reason = 'social_lookup_error';
              else reason = 'ai_empty';
              failedItems.push({ id: a.id, reason });
              return;
            }

            const extractedHandle = (url?: string | null) => {
              if (!url || typeof url !== 'string') return null;
              const cleaned = url.trim().replace(/^@/, '');
              if (cleaned.includes('instagram.com/')) {
                return cleaned.split('instagram.com/')[1].split('/')[0].split('?')[0] || null;
              }
              return cleaned;
            };

            const updates = {
              contacts: mergeContacts(
                a.contacts || [],
                [
                  ...(social?.instagram ? [{
                    id: `${a.id}_owner_ig_enriched`,
                    displayName: a.fullName || a.shopName || a.username,
                    role: 'owner' as const,
                    priority: 100,
                    state: 'new' as const,
                    attemptCount: 0,
                    channels: { instagram: extractedHandle(social.instagram) || social.instagram },
                    source: 'search' as const,
                    confidence: social?.confidence?.instagram || 0.65
                  }] : []),
                  ...(social?.facebook ? [{
                    id: `${a.id}_owner_fb_enriched`,
                    displayName: a.fullName || a.shopName || a.username,
                    role: 'owner' as const,
                    priority: 65,
                    state: 'new' as const,
                    attemptCount: 0,
                    channels: { facebook: social.facebook },
                    source: 'search' as const,
                    confidence: social?.confidence?.facebook || 0.62
                  }] : []),
                  ...(social?.emails?.[0] ? [{
                    id: `${a.id}_owner_email_enriched`,
                    displayName: a.fullName || a.shopName || a.username,
                    role: 'owner' as const,
                    priority: 80,
                    state: 'new' as const,
                    attemptCount: 0,
                    channels: { email: social.emails[0] },
                    source: 'website' as const,
                    confidence: 0.75
                  }] : []),
                  ...(social?.whatsapp?.[0] ? [{
                    id: `${a.id}_owner_wa_enriched`,
                    displayName: a.fullName || a.shopName || a.username,
                    role: 'owner' as const,
                    priority: 78,
                    state: 'new' as const,
                    attemptCount: 0,
                    channels: { whatsapp: social.whatsapp[0] },
                    source: 'website' as const,
                    confidence: 0.72
                  }] : [])
                ] as ShopContact[]
              ),
              username: enriched?.realUsername || a.username,
              fullName: enriched?.realFullName || a.fullName,
              followers: enriched?.followers ?? a.followers,
              activityLevel: enriched?.activityLevel ?? a.activityLevel,
              style: enriched?.style ?? a.style,
              dnaTags: [...new Set([...(a.dnaTags || []), ...((enriched?.dnaTags as string[]) || [])])],
              ig_handle: a.ig_handle || extractedHandle(social?.instagram) || null,
              facebookId: a.facebookId || social?.facebook || null,
              location: normalizeLocationValue(a.location, a.address, a.country),
              metadata: {
                ...(a.metadata || {}),
                ...(social?.tiktok ? { tiktok: social.tiktok } : {}),
                ...(social?.emails?.length ? { email_candidates: social.emails } : {}),
                ...(social?.whatsapp?.length ? { whatsapp_candidates: social.whatsapp } : {}),
                ...(social?.confidence ? { social_confidence: social.confidence } : {})
              },
              socialSignals: {
                ...(a.socialSignals || {}),
                postingHours: Array.isArray(enriched?.postingHours)
                  ? enriched.postingHours.map((h: any) => Number(h)).filter((h: number) => Number.isFinite(h) && h >= 0 && h <= 23)
                  : (a.socialSignals?.postingHours || []),
                postsPerWeek: Number.isFinite(enriched?.postsPerWeek) ? enriched.postsPerWeek : (a.socialSignals?.postsPerWeek || 0),
                avgLikesPerPost: Number.isFinite(enriched?.avgLikes) ? enriched.avgLikes : (a.socialSignals?.avgLikesPerPost || 0),
                avgCommentsPerPost: Number.isFinite(enriched?.avgComments) ? enriched.avgComments : (a.socialSignals?.avgCommentsPerPost || 0),
                engagementRate: Number.isFinite(enriched?.engagementRate) ? enriched.engagementRate : (a.socialSignals?.engagementRate || 0),
                followerFollowingRatio: Number.isFinite(enriched?.followerFollowingRatio)
                  ? enriched.followerFollowingRatio
                  : (a.socialSignals?.followerFollowingRatio || 0),
                tattooLikelihood: Number.isFinite(enriched?.tattooLikelihood)
                  ? enriched.tattooLikelihood
                  : (a.socialSignals?.tattooLikelihood || 0),
                styleVector: {
                  ...(a.socialSignals?.styleVector || {}),
                  ...((enriched?.styleVector && typeof enriched.styleVector === 'object') ? enriched.styleVector : {})
                },
                platformPresence: {
                  ...(a.socialSignals?.platformPresence || {}),
                  ...(social?.instagram ? { instagram: social.instagram } : {}),
                  ...(social?.facebook ? { facebook: social.facebook } : {}),
                  ...(social?.tiktok ? { tiktok: social.tiktok } : {}),
                  ...(a.website ? { website: a.website } : {}),
                  ...(social?.emails?.[0] ? { email: social.emails[0] } : {}),
                  ...(social?.whatsapp?.[0] ? { phone: social.whatsapp[0] } : {})
                }
              },
              uid: user.uid
            };
            updateBatch.set(doc(db, 'artists', a.id), sanitizeForFirestore(updates), { merge: true });
            localUpdates.push({ ...a, ...updates });
            successIds.push(a.id);
          });

          try {
            await updateBatch.commit();
          } catch (e) {
            batchToEnrich.forEach((a) => {
              if (!successIds.includes(a.id)) {
                failedItems.push({ id: a.id, reason: 'firestore_write' });
              }
            });
            throw e;
          }
          setRawArtists(prev => {
            const next = [...prev];
            localUpdates.forEach(update => {
              const idx = next.findIndex(a => a.id === update.id);
              if (idx >= 0) next[idx] = update;
            });
            return next;
          });
        } catch (e) {
          console.error("Enrichment batch failed", e);
          batchToEnrich.forEach((a) => {
            if (!failedItems.some((item) => item.id === a.id)) {
              failedItems.push({ id: a.id, reason: 'network' });
            }
          });
        }

        const reportResp = await fetch(`/api/deep-scan/report/${taskId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ successIds, failedItems })
        });
        if (!reportResp.ok) throw new Error('Failed to report deep scan batch');

        const reported = toDeepScanTaskStatus(await reportResp.json());
        if (reported) {
          status = reported;
          setDeepScanTask(reported);
          setScanProgress({ current: reported.completed + reported.failed, total: reported.total });
          setImportMetrics(prev => ({
            ...prev,
            enrichSuccess: reported.completed,
            enrichFailed: reported.failed
          }));
          toast.info(`Enrichment Progress: ${reported.completed + reported.failed} / ${reported.total}...`, { id: 'enrich-progress' });
          if (reported.status === 'paused') {
            pausedByUser = true;
            break;
          }
          if (reported.status === 'completed') {
            break;
          }
        }
      }

      if (status?.status === 'completed') {
        await localforage.removeItem(taskKey);
        toast.success(`Deep Scan complete: ${status.completed} enriched, ${status.failed} failed.`, { id: 'enrich-progress' });
      } else if (pausedByUser || status?.status === 'paused') {
        toast.info(`Deep Scan paused on task ${taskId}. You can resume anytime.`, { id: 'enrich-progress' });
      }
    } catch (e) {
      console.error("Deep scan failed", e);
      const message = String((e as any)?.message || '');
      if (message.toLowerCase().includes('fetch')) {
        toast.error("Deep Scan stopped: backend disconnected. Restart `npm run dev`, then click Continue Processing.", { id: 'enrich-progress' });
      } else {
        toast.error("Deep Scan failed. Please retry.", { id: 'enrich-progress' });
      }
    } finally {
      setIsScanning(false);
      setScanProgress({ current: 0, total: 0 });
    }
  }, [user, rawArtists, refreshDeepScanTask, toDeepScanTaskStatus]);

  // Automation Orchestration Logic
  const assignTaskToAccount = useCallback(async (artistId: string): Promise<string | null> => {
    if (!user) return null;

    // 1. Check if artist is already assigned in the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const existingAssignment = assignments.find(a => 
      a.artistId === artistId && 
      new Date(a.assignedAt) > sevenDaysAgo
    );

    if (existingAssignment) {
      toast.error('Artist already assigned to an account within the last 7 days.');
      return existingAssignment.accountId;
    }

    // 2. Find an available account by capacity + geo/language fit
    const artist = rawArtists.find(a => a.id === artistId);
    const targetLanguage = inferArtistLanguage(artist);
    const targetRegion = (artist?.country || artist?.location || '').toUpperCase();
    const artistActiveHours = getArtistActiveHours(artist);

    const availableAccount = accounts
      .filter(acc => acc.status === 'idle' && acc.dailyActionCount < getAccountDailyCapTotal(acc))
      .sort((a, b) => {
        const aRegionMatch = a.regionTags?.some(tag => targetRegion.includes(tag.toUpperCase())) ? 1 : 0;
        const bRegionMatch = b.regionTags?.some(tag => targetRegion.includes(tag.toUpperCase())) ? 1 : 0;
        const aLangMatch = a.language === targetLanguage ? 1 : 0;
        const bLangMatch = b.language === targetLanguage ? 1 : 0;
        const aCapacity = getAccountDailyCapTotal(a) - a.dailyActionCount;
        const bCapacity = getAccountDailyCapTotal(b) - b.dailyActionCount;
        const aOverlap = getWindowOverlapScore(a, artistActiveHours);
        const bOverlap = getWindowOverlapScore(b, artistActiveHours);
        const aLocalHour = getHourInTimezone(a.timezone);
        const bLocalHour = getHourInTimezone(b.timezone);
        const aPrimeNow = isNearAnyActiveHour(aLocalHour, artistActiveHours, 1) ? 1 : 0;
        const bPrimeNow = isNearAnyActiveHour(bLocalHour, artistActiveHours, 1) ? 1 : 0;

        const aScore = (aRegionMatch * 25) + (aLangMatch * 20) + (aOverlap * 6) + (aPrimeNow * 18) + aCapacity;
        const bScore = (bRegionMatch * 25) + (bLangMatch * 20) + (bOverlap * 6) + (bPrimeNow * 18) + bCapacity;
        return bScore - aScore;
      })[0];

    if (!availableAccount) {
      toast.error('No available Instagram accounts found.');
      return null;
    }

    // 3. Create assignment
    const newAssignment: TaskAssignment = {
      id: crypto.randomUUID(),
      artistId,
      accountId: availableAccount.id,
      assignedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'pending'
    };

    try {
      const assignmentRef = doc(db, 'assignments', newAssignment.id);
      await setDoc(assignmentRef, sanitizeForFirestore({ ...newAssignment, uid: user.uid }));
      toast.success(`Task assigned to @${availableAccount.username}`);
      return availableAccount.id;
    } catch (error) {
      console.error('Assignment failed:', error);
      toast.error('Failed to assign task');
      return null;
    }
  }, [user, assignments, accounts, rawArtists]);

  const startAutomationSequence = useCallback(async (artistId: string, accountId: string) => {
    if (!user) return;

    const artist = rawArtists.find(a => a.id === artistId);
    const account = accounts.find(a => a.id === accountId);

    if (!artist || !account) return;
    if (pipelineConfig.globalPause) {
      toast.warning('Automation is globally paused in Pipeline Control.');
      return;
    }
    const now = Date.now();
    const minIntervalMs = Math.max(0, (pipelineConfig.minActionIntervalSeconds || 0) * 1000);
    const lastActionAt = account.lastActionAt ? new Date(account.lastActionAt).getTime() : 0;
    if (lastActionAt && minIntervalMs > 0 && now - lastActionAt < minIntervalMs) {
      const waitSec = Math.ceil((minIntervalMs - (now - lastActionAt)) / 1000);
      toast.info(`Rate guard active for @${account.username}. Wait ${waitSec}s.`);
      return;
    }

    const accountTodayCount = assignments.filter(a => a.accountId === accountId).length;
    if (pipelineConfig.dailyTaskCap > 0 && accountTodayCount >= pipelineConfig.dailyTaskCap) {
      toast.warning(`Daily task cap reached for @${account.username}.`);
      return;
    }

    if (pipelineConfig.requireManualReview) {
      const hasPendingAssignment = assignments.some(a => a.artistId === artistId && a.accountId === accountId && a.status === 'pending');
      if (!hasPendingAssignment) {
        toast.warning('Manual review is required before execution. Assign this shop first.');
        return;
      }
    }

    const selectedContact = chooseNextContact(artist);
    const targetHandle = selectedContact?.channels.instagram || artist.username;
    if (!targetHandle) {
      toast.error('No reachable contact found for this shop.');
      return;
    }

    const speedProfile: AccountSpeedProfile = account.speedProfile || 'balanced';
    const profile = SPEED_PROFILES[speedProfile];
    const activeWindow = account.activeWindow || { startHour: 9, endHour: 21 };
    const sleepWindow = account.sleepWindow || { startHour: 23, endHour: 7 };
    const dailyCaps = account.dailyCaps || { likes: 40, comments: 15, follows: 10, dms: 8 };
    const timezone = account.timezone || 'UTC';
    const language = account.language || inferArtistLanguage(artist);
    const localHour = getHourInTimezone(timezone);
    const artistActiveHours = getArtistActiveHours(artist);
    const isPrimeTouchWindow = isNearAnyActiveHour(localHour, artistActiveHours, 1);

    const remainingLikes = Math.max(0, dailyCaps.likes - account.dailyActionCount);
    const likeMin = Math.min(profile.likesRange[0], Math.max(1, remainingLikes || 1));
    const likeMax = Math.max(likeMin, Math.min(profile.likesRange[1], Math.max(1, remainingLikes || 1)));
    const baseLikes = likeMin + Math.floor(Math.random() * (likeMax - likeMin + 1));
    const sessionLikes = Math.min(dailyCaps.likes, isPrimeTouchWindow ? baseLikes + 1 : baseLikes);
    const commentProbability = Math.min(0.95, profile.commentProbability + (isPrimeTouchWindow ? 0.15 : 0));
    const followProbability = Math.min(0.9, profile.followProbability + (isPrimeTouchWindow ? 0.1 : 0));
    const sessionComments = dailyCaps.comments > 0 && Math.random() < commentProbability ? 1 : 0;
    const sessionFollows = dailyCaps.follows > 0 && Math.random() < followProbability ? 1 : 0;
    const jitterMultiplier = account.jitterMultiplier || 1;
    const jitterRange: [number, number] = [
      Math.round(profile.jitterRange[0] * jitterMultiplier),
      Math.round(profile.jitterRange[1] * jitterMultiplier)
    ];

    if (!isHourWithinWindow(localHour, activeWindow.startHour, activeWindow.endHour)) {
      toast.warning(`@${account.username} is outside local active window (${activeWindow.startHour}:00-${activeWindow.endHour}:00, ${timezone}).`);
    }
    if (!isPrimeTouchWindow) {
      toast.info(`@${artist.username} is likely more active at ${artistActiveHours.slice(0, 3).join(', ')}:00. Current local hour: ${localHour}:00.`);
    }

    toast.info(`Starting ${speedProfile} automation for @${targetHandle} via @${account.username} (${language.toUpperCase()}, ${timezone})...`);

    try {
      const response = await fetch('/api/automation/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artistId,
          accountId,
          behaviorProfile: account.behaviorProfile,
          artistHandle: targetHandle,
          accountHandle: account.username,
          contactId: selectedContact?.id || null,
          language,
          accountProfile: {
            timezone,
            speedProfile,
            breakProbability: profile.breakProbability,
            activeWindow,
            sleepWindow,
            dailyCaps,
            targetActivityHours: artistActiveHours,
            primeTouchWindow: isPrimeTouchWindow
          },
          humanization: {
            startHour: activeWindow.startHour,
            endHour: activeWindow.endHour,
            sessionLikes,
            sessionComments,
            sessionFollows,
            jitterRange,
            localHour
          }
        })
      });

      if (response.status === 403) {
        const text = await response.text();
        const data = safeJsonParse(text, {});
        toast.error(`Night Mode: @${account.username} is sleeping.`, {
          description: data.message || 'Account is in mandatory night-time sleep cycle.'
        });
        return;
      }

      if (response.status === 429) {
        const text = await response.text();
        const data = safeJsonParse(text, {});
        toast.warning(`Coffee Break: @${account.username} is resting.`, {
          description: data.message || 'Account is taking a natural break.'
        });
        return;
      }

      if (response.status === 425) {
        const text = await response.text();
        const data = safeJsonParse(text, {});
        toast.warning(`Outside active window for @${account.username}.`, {
          description: data.message || 'Account is currently paused by schedule policy.'
        });
        return;
      }

      if (!response.ok) throw new Error('Failed to start automation');
      
      toast.success('Humanized automation sequence initiated.');

      if (selectedContact) {
        const nowIso = new Date().toISOString();
        const existingContacts = artist.contacts || buildDefaultContacts(artist);
        const hasContact = existingContacts.some((c) => c.id === selectedContact.id);
        const nextContacts = hasContact
          ? existingContacts.map((c) => {
              if (c.id !== selectedContact.id) return c;
              return {
                ...c,
                state: 'attempted',
                attemptCount: (c.attemptCount || 0) + 1,
                lastContactedAt: nowIso
              };
            })
          : mergeContacts(existingContacts, [{
              ...selectedContact,
              state: 'attempted',
              attemptCount: (selectedContact.attemptCount || 0) + 1,
              lastContactedAt: nowIso
            }]);
        await updateArtist(artistId, {
          contacts: nextContacts
        });
      }
    } catch (error) {
      console.error('Automation error:', error);
      toast.error('Failed to start automation sequence.');
    }
  }, [user, rawArtists, accounts, assignments, pipelineConfig, chooseNextContact, inferArtistLanguage, getHourInTimezone, isHourWithinWindow, getArtistActiveHours, isNearAnyActiveHour, updateArtist]);

  const clearAllData = useCallback(async () => {
    if (!user) return;
    try {
      const q = query(collection(db, 'artists'), where('uid', '==', user.uid));
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      
      // Clear interactions too
      const qInt = query(collection(db, 'interactions'), where('uid', '==', user.uid));
      const snapInt = await getDocs(qInt);
      const batchInt = writeBatch(db);
      snapInt.docs.forEach((doc) => {
        batchInt.delete(doc.ref);
      });
      await batchInt.commit();

      setRawArtists([]);
      setInteractions([]);
      await localforage.removeItem(`artists_${user.uid}`);
      toast.success("All data cleared successfully.");
    } catch (e) {
      console.error("Failed to clear data", e);
      toast.error("Failed to clear cloud data");
    }
  }, [user]);

  const markAsIdealTarget = useCallback(async (artistId: string) => {
    if (!user) return;
    const target = rawArtists.find(a => a.id === artistId);
    if (!target) return;

    setIsScanning(true);
    setScanProgress({ current: 0, total: rawArtists.length });
    toast.info(`Performing weighted global scan based on @${target.username}'s feature vector...`);

    const updatedArtists = rawArtists.map(a => {
      if (a.stage !== 'outreach') return a;
      
      let weightedMatch = 0;
      let totalPossibleWeight = 0;
      
      target.dnaTags.forEach(tag => {
        const weight = globalWeights[tag] || 1.0;
        totalPossibleWeight += weight;
        if (a.dnaTags.includes(tag)) {
          weightedMatch += weight;
        }
      });
      
      const similarityWeight = (weightedMatch / Math.max(0.1, totalPossibleWeight)) * 100;
      const isRecommended = similarityWeight >= 60;
      const similarityScore = Math.min(100, (a.similarityScore || 0) + (similarityWeight * 0.2));

      return { 
        ...a, 
        similarityWeight, 
        isRecommended,
        similarityScore
      };
    });

    try {
      const FIRESTORE_BATCH_SIZE = 500;
      for (let i = 0; i < updatedArtists.length; i += FIRESTORE_BATCH_SIZE) {
        const batch = writeBatch(db);
        const chunk = updatedArtists.slice(i, i + FIRESTORE_BATCH_SIZE);
        chunk.forEach(artist => {
          const docRef = doc(db, 'artists', artist.id);
          batch.set(docRef, sanitizeForFirestore({ ...artist, uid: user.uid }));
        });
        await batch.commit();
        setScanProgress({ current: Math.min(i + FIRESTORE_BATCH_SIZE, updatedArtists.length), total: updatedArtists.length });
      }

      const recommended = updatedArtists.filter(a => a.stage === 'outreach' && a.isRecommended).length;
      setPinnedCount(recommended);
      
      toast.success('Weighted scan complete', {
        description: `Prioritized "Winners" based on learned feature weights.`
      });
    } catch (e) {
      console.error("Failed to save scan results", e);
      toast.error("Failed to persist scan results to cloud");
    } finally {
      setIsScanning(false);
    }
  }, [user, rawArtists, globalWeights]);

  const simulateInteraction = useCallback(async (artistId: string, points: number) => {
    if (!user) return;
    
    setRawArtists(prev => {
      const artist = prev.find(a => a.id === artistId);
      if (!artist) return prev;
      
      const oldScore = artist.heatScore || 0;
      const newScore = Math.min(100, oldScore + points);
      const isHighIntent = newScore >= 80;
      
      let newStage = artist.stage;
      if (newScore >= 80 && oldScore < 80) {
        newStage = 'engaged';
        toast.success("🔥 High-Value Lead Detected!", {
          description: `@${artist.username} has reached high-intent threshold. Moving to Engaged stage.`,
          duration: 5000,
        });
      }
      
      const updatedItem = { ...artist, heatScore: newScore, isHighIntent, stage: newStage };
      const updatedList = prev.map(a => a.id === artistId ? updatedItem : a);
      localforage.setItem(`artists_${user.uid}`, updatedList);
      
      // Sync to cloud
      const docRef = doc(db, 'artists', artistId);
      setDoc(docRef, sanitizeForFirestore({ heatScore: newScore, isHighIntent, stage: newStage }), { merge: true });
      
      return updatedList;
    });
  }, [user]);

  const seedTestData = useCallback(async () => {
    if (!user) return;
    
    const testArtists: CRMArtist[] = [
      {
        id: `test_1`,
        username: 'ink_master_test',
        fullName: 'Test Artist 1',
        profilePic: 'https://picsum.photos/seed/test1/100/100',
        stage: 'outreach',
        heatScore: 10,
        likeCount: 2,
        similarityScore: 85,
        dnaTags: ['Realism', 'Black & Grey'],
        lastInteractionDate: new Date().toISOString(),
        orderCount: 0,
        uid: user.uid
      },
      {
        id: `test_2`,
        username: 'color_king',
        fullName: 'Test Artist 2',
        profilePic: 'https://picsum.photos/seed/test2/100/100',
        stage: 'outreach',
        heatScore: 85,
        likeCount: 5,
        replyCount: 3,
        hasFollowedBack: true,
        similarityScore: 40,
        dnaTags: ['Traditional', 'Neo-Traditional'],
        lastInteractionDate: new Date().toISOString(),
        orderCount: 0,
        uid: user.uid
      },
      {
        id: `test_3`,
        username: 'linework_pro',
        fullName: 'Test Artist 3',
        profilePic: 'https://picsum.photos/seed/test3/100/100',
        stage: 'outreach',
        heatScore: 5,
        likeCount: 1,
        similarityScore: 95,
        dnaTags: ['Fine Line', 'Minimalist'],
        lastInteractionDate: new Date().toISOString(),
        orderCount: 0,
        uid: user.uid
      },
      {
        id: `test_4`,
        username: 'dark_art_tattoo',
        fullName: 'Test Artist 4',
        profilePic: 'https://picsum.photos/seed/test4/100/100',
        stage: 'outreach',
        heatScore: 90,
        similarityScore: 20,
        dnaTags: ['Blackwork', 'Dark Art'],
        lastInteractionDate: new Date().toISOString(),
        orderCount: 0,
        uid: user.uid
      },
      {
        id: `test_5`,
        username: 'geometric_ink',
        fullName: 'Test Artist 5',
        profilePic: 'https://picsum.photos/seed/test5/100/100',
        stage: 'outreach',
        heatScore: 45,
        similarityScore: 65,
        dnaTags: ['Geometric', 'Dotwork'],
        lastInteractionDate: new Date().toISOString(),
        orderCount: 0,
        uid: user.uid
      }
    ];
    
    setRawArtists(prev => {
      const mergedMap = new Map<string, CRMArtist>();
      // Build a map of existing artists by username for lookup
      const existingByUsername = new Map<string, CRMArtist>();
      prev.forEach(a => {
        mergedMap.set(a.id, a);
        if (a.username) existingByUsername.set(a.username.toLowerCase(), a);
      });

      const finalTestArtists = testArtists.map(ta => {
        const existing = existingByUsername.get(ta.username.toLowerCase());
        if (existing) {
          return { ...existing, ...ta, id: existing.id }; // Reuse existing ID
        }
        return ta;
      });

      finalTestArtists.forEach(a => mergedMap.set(a.id, a));
      
      const newList = Array.from(mergedMap.values());
      localforage.setItem(`artists_${user.uid}`, newList);
      
      // Sync to cloud
      finalTestArtists.forEach(a => {
        const docRef = doc(db, 'artists', a.id);
        setDoc(docRef, sanitizeForFirestore({ ...a, uid: user.uid }), { merge: true });
      });
      
      return newList;
    });
    
    toast.success("Test data seeded successfully", {
      description: "Added/Updated 5 dummy artists in your outreach list."
    });
  }, [user]);

  // Dormant logic is handled via useMemo in the artists derivation

  return (
    <CRMContext.Provider value={{ 
      artists, 
      interactions,
      orders,
      pagination,
      globalStats,
      importMetrics,
      deepScanTask,
      refreshDeepScanTask,
      pauseDeepScanTask,
      resumeDeepScanTask,
      retryFailedDeepScanTask,
      pipelineConfig,
      updatePipelineConfig,
      updatePipelineStage,
      accounts,
      assignments,
      assignTaskToAccount,
      startAutomationSequence,
      loadData,
      persona, 
      setPersona, 
      conversionDNA, 
      moveArtist, 
      updateArtist, 
      addInteraction, 
      addOrder,
      markAsConverted,
      analyzeArtistVisualDNA,
      findSimilarArtists,
      importCSV,
      syncShopifySales,
      bulkEnrichArtists,
      clearAllData,
      deleteArtist,
      markAsIdealTarget,
      submitFeedback,
      refreshHarvestList,
      isScanning,
      scanProgress,
      pinnedCount,
      mockMode,
      setMockMode,
      debugMode,
      setDebugMode,
      simulateInteraction,
      seedTestData,
      globalWeights,
      harvestList,
      user,
      login,
      logout,
      isAuthReady
    }}>
      {children}
    </CRMContext.Provider>
  );
};

export const useCRM = () => {
  const context = useContext(CRMContext);
  if (!context) throw new Error('useCRM must be used within a CRMProvider');
  return context;
};
