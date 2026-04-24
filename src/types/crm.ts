
export type CRMStage = 'outreach' | 'engaged' | 'customers' | 'dormant';
export type AIPersona = 'professional' | 'friendly';
export type ContactRole = 'owner' | 'artist' | 'manager' | 'unknown';
export type ContactState = 'new' | 'attempted' | 'no_reply' | 'replied' | 'do_not_contact' | 'converted';
export type LifecycleStage =
  | 'new_lead'
  | 'contacted'
  | 'interested'
  | 'sample_sent'
  | 'first_order'
  | 'repeat_buyer'
  | 'at_risk'
  | 'dormant';
export type CommunicationChannel = 'email' | 'instagram_dm' | 'whatsapp' | 'sms' | 'call' | 'meeting' | 'system';
export type CommunicationDirection = 'outbound' | 'inbound';
export type CommunicationStatus = 'sent' | 'delivered' | 'opened' | 'replied' | 'failed' | 'completed';
export type ObjectionTag =
  | 'price'
  | 'quality'
  | 'shipping'
  | 'moq'
  | 'existing_supplier'
  | 'no_need'
  | 'timing'
  | 'other';
export type RecommendationConfidence = 'high' | 'medium' | 'low';

export interface ShopContact {
  id: string;
  displayName?: string;
  role: ContactRole;
  priority: number;
  state: ContactState;
  lastContactedAt?: string;
  attemptCount: number;
  channels: {
    instagram?: string;
    facebook?: string;
    tiktok?: string;
    email?: string;
    whatsapp?: string;
  };
  source?: 'import' | 'website' | 'search' | 'manual';
  confidence?: number;
}

export interface CRMArtist {
  id: string;
  uid?: string; // Firebase User ID
  username: string;
  fullName: string;
  profilePic: string;
  stage: CRMStage;
  heatScore: number; // 0-100
  baseScore?: number; // Base score from maps/followers
  similarityScore: number; // 0-100
  similarityWeight?: number; // Weight for sorting
  dnaTags: string[];
  visualDNA?: {
    style: string;
    technical_details: string[];
    match_score: number;
    proportions?: Record<string, number>;
  };
  lastInteractionDate: string;
  orderCount: number;
  totalSpent?: number;
  totalItems?: number;
  lastOrderDate?: string;
  location_tag?: string;
  location?: string;
  city?: string;
  state?: string;
  address?: string;
  shopName?: string;
  phone?: string;
  email?: string;
  website?: string;
  ig_handle?: string;
  followers?: number;
  country?: string;
  activityLevel?: 'high' | 'medium' | 'low';
  style?: string;
  styleMatch?: boolean;
  storyViews24h?: number;
  isHighIntent?: boolean;
  hasFollowedBack?: boolean;
  replyCount?: number;
  likeCount?: number;
  mapsRating?: number;
  rating?: number;
  facebookId?: string;
  account_id?: string; // For multi-account tracking
  account_tag?: string;
  customerTier?: 'new' | 'loyal' | 'vip';
  metadata?: Record<string, any>;
  contacts?: ShopContact[];
  lifecycleStage?: LifecycleStage;
  lifecycleUpdatedAt?: string;
  nextFollowupAt?: string;
  preferredChannel?: CommunicationChannel;
  objectionTags?: ObjectionTag[];
  avgReorderCycleDays?: number;
  contactTruthScore?: {
    email?: number;
    whatsapp?: number;
    facebook?: number;
    tiktok?: number;
    instagram?: number;
  };
  riskSignals?: {
    accountRisk?: number;
    outreachSensitivity?: number;
    notes?: string;
  };
  socialSignals?: {
    platformPresence?: {
      instagram?: string;
      facebook?: string;
      tiktok?: string;
      website?: string;
      email?: string;
      phone?: string;
    };
    engagementRate?: number;
    avgLikesPerPost?: number;
    avgCommentsPerPost?: number;
    postsPerWeek?: number;
    postingHours?: number[];
    followerFollowingRatio?: number;
    tattooLikelihood?: number;
    styleVector?: Record<string, number>;
  };
}

export interface CommunicationRecord {
  id: string;
  artistId: string;
  channel: CommunicationChannel;
  direction: CommunicationDirection;
  status: CommunicationStatus;
  timestamp: string;
  ownerId?: string;
  ownerName?: string;
  summary?: string;
  content?: string;
  customerFeedback?: string;
  needsFollowup?: boolean;
  followupAt?: string;
  lifecycleStageAtTime?: LifecycleStage;
  metadata?: Record<string, any>;
}

export interface AIRecommendation {
  id: string;
  artistId: string;
  generatedAt: string;
  reason: string;
  channel: CommunicationChannel;
  timing: 'now' | 'today' | 'tomorrow' | 'in_3_days' | 'next_week' | 'manual';
  goal: 'get_reply' | 'confirm_need' | 'sample_followup' | 'first_order' | 'reorder' | 'win_back' | 'relationship';
  message: string;
  confidence: RecommendationConfidence;
  lifecycleStage: LifecycleStage;
  signalSummary?: string[];
  metadata?: Record<string, any>;
}

export interface CRMInteraction {
  id: string;
  artistId: string;
  type: 'like' | 'comment' | 'follow' | 'story_view' | 'follow_back' | 'reply';
  weight: number;
  timestamp: string;
  content?: string;
}

export interface CRMOrder {
  id: string;
  artistId: string;
  productName: string;
  amount: number;
  orderDate: string;
}

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category?: string;
  stock: number;
  threshold: number;
  price?: number;
  currency?: string;
  vendor?: string;
  source?: 'manual' | 'csv' | 'shopify';
  updatedAt: string;
}

export interface InventorySnapshotItem {
  sku: string;
  stock: number;
  threshold?: number;
}

export interface InventorySnapshot {
  id: string;
  capturedAt: string;
  source: 'manual' | 'csv' | 'shopify' | 'system';
  items: InventorySnapshotItem[];
}

export interface InventoryForecast {
  sku: string;
  name: string;
  currentStock: number;
  threshold: number;
  dailyConsumption: number;
  daysLeft: number | null;
  recommendQty7d: number;
  recommendQty15d: number;
  recommendedCycleDays: 7 | 15 | null;
}

export interface ShopifyInventorySyncConfig {
  enabled: boolean;
  autoSyncMinutes: number;
  storeDomain: string;
  accessToken: string;
  locationId?: string;
  autoImportEnabled?: boolean;
  autoImportMode?: 'file' | 'url';
  autoImportValue?: string;
  autoImportDailyHour?: number;
  autoImportMinDays?: number;
  autoImportMinSnapshots?: number;
  lastAutoImportAt?: string;
  lastSyncAt?: string;
  lastSyncStatus?: 'idle' | 'ok' | 'error';
  lastSyncMessage?: string;
}

export type AccountBehavior = 'observer' | 'active' | 'warmup';
export type AccountSpeedProfile = 'safe' | 'balanced' | 'aggressive';
export type AccountLanguage = 'en' | 'es' | 'pt' | 'fr' | 'de' | 'it' | 'zh' | 'ja' | 'ko';

export interface AccountWindow {
  startHour: number;
  endHour: number;
}

export interface AccountDailyCaps {
  likes: number;
  comments: number;
  follows: number;
  dms: number;
}

export interface InstagramAccount {
  id: string;
  username: string;
  proxyIp?: string;
  timezone?: string;
  language?: AccountLanguage;
  speedProfile?: AccountSpeedProfile;
  activeWindow?: AccountWindow;
  sleepWindow?: AccountWindow;
  dailyCaps?: AccountDailyCaps;
  jitterMultiplier?: number;
  regionTags?: string[];
  behaviorProfile: AccountBehavior;
  status: 'idle' | 'running' | 'cooldown' | 'banned';
  lastActionAt?: string;
  dailyActionCount: number;
}

export interface TaskAssignment {
  id: string;
  artistId: string;
  accountId: string;
  assignedAt: string;
  expiresAt: string;
  status: 'pending' | 'completed' | 'failed';
}

export type PipelineStageKey =
  | 'data_import'
  | 'deep_scan'
  | 'quality_scoring'
  | 'review_queue'
  | 'outreach_execution'
  | 'result_writeback'
  | 'daily_recap';

export interface PipelineStageConfig {
  key: PipelineStageKey;
  label: string;
  enabled: boolean;
  targetMinutes: number;
  cooldownSeconds: number;
}

export interface AutomationPipelineConfig {
  globalPause: boolean;
  hourlyTaskCap: number;
  dailyTaskCap: number;
  minActionIntervalSeconds: number;
  quietHoursStart: number;
  quietHoursEnd: number;
  requireManualReview: boolean;
  stages: PipelineStageConfig[];
  updatedAt: string;
}

export interface CRMState {
  artists: CRMArtist[];
  interactions: CRMInteraction[];
  orders: CRMOrder[];
  communicationRecords?: CommunicationRecord[];
  aiRecommendations?: AIRecommendation[];
  accounts: InstagramAccount[];
  assignments: TaskAssignment[];
  inventoryItems?: InventoryItem[];
  persona: AIPersona;
  globalWeights: Record<string, number>;
}
