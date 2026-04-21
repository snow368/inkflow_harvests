
export type CRMStage = 'outreach' | 'engaged' | 'customers' | 'dormant';
export type AIPersona = 'professional' | 'friendly';
export type ContactRole = 'owner' | 'artist' | 'manager' | 'unknown';
export type ContactState = 'new' | 'attempted' | 'no_reply' | 'replied' | 'do_not_contact' | 'converted';

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
  accounts: InstagramAccount[];
  assignments: TaskAssignment[];
  persona: AIPersona;
  globalWeights: Record<string, number>;
}
