import React, { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Mail,
  MessageSquare,
  Phone,
  RefreshCw,
  Send,
  Sparkles,
  Users,
  Wallet
} from 'lucide-react';
import { useCRM } from '../contexts/CRMContext';
import { AIRecommendation, CRMArtist, CommunicationRecord, LifecycleStage } from '../types/crm';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

const LIFECYCLE_ORDER: LifecycleStage[] = [
  'new_lead',
  'contacted',
  'interested',
  'sample_sent',
  'first_order',
  'repeat_buyer',
  'at_risk',
  'dormant'
];

const LIFECYCLE_LABEL: Record<LifecycleStage, string> = {
  new_lead: 'New Lead',
  contacted: 'Contacted',
  interested: 'Interested',
  sample_sent: 'Sample Sent',
  first_order: 'First Order',
  repeat_buyer: 'Repeat Buyer',
  at_risk: 'At Risk',
  dormant: 'Dormant'
};

const LIFECYCLE_ACCENT: Record<LifecycleStage, string> = {
  new_lead: 'text-cyan-400 border-cyan-500/30',
  contacted: 'text-indigo-400 border-indigo-500/30',
  interested: 'text-amber-400 border-amber-500/30',
  sample_sent: 'text-teal-400 border-teal-500/30',
  first_order: 'text-green-400 border-green-500/30',
  repeat_buyer: 'text-emerald-400 border-emerald-500/30',
  at_risk: 'text-orange-400 border-orange-500/30',
  dormant: 'text-rose-400 border-rose-500/30'
};

type CRMSection = 'overview' | 'pipeline' | 'contacts' | 'activities' | 'segments' | 'automations';

const safeDate = (value?: string) => {
  if (!value) return '-';
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return '-';
  return dt.toLocaleString();
};

const daysSince = (value?: string): number | null => {
  if (!value) return null;
  const ts = +new Date(value);
  if (Number.isNaN(ts)) return null;
  return Math.max(0, Math.floor((Date.now() - ts) / 86400000));
};

const deriveLifecycle = (artist: CRMArtist): LifecycleStage => {
  if (artist.lifecycleStage) return artist.lifecycleStage;
  if (artist.stage === 'dormant') return 'dormant';

  const orderCount = Number(artist.orderCount || 0);
  const lastOrderGap = daysSince(artist.lastOrderDate);
  if (orderCount >= 2) return typeof lastOrderGap === 'number' && lastOrderGap > 60 ? 'at_risk' : 'repeat_buyer';
  if (orderCount === 1) return typeof lastOrderGap === 'number' && lastOrderGap > 60 ? 'at_risk' : 'first_order';
  if (artist.metadata?.sampleStatus === 'sent' || artist.metadata?.distributorLifecycle === 'sample_sent') return 'sample_sent';
  if ((artist.replyCount || 0) > 0 || artist.stage === 'engaged') return 'interested';
  if ((artist.likeCount || 0) > 0 || (artist.storyViews24h || 0) > 0 || artist.hasFollowedBack) return 'contacted';
  return 'new_lead';
};

const recommendationTone = (rec?: AIRecommendation) => {
  if (!rec) return 'bg-zinc-900 border-zinc-700';
  if (rec.confidence === 'high') return 'bg-emerald-500/10 border-emerald-500/30';
  if (rec.confidence === 'low') return 'bg-amber-500/10 border-amber-500/30';
  return 'bg-sky-500/10 border-sky-500/30';
};

export default function CRMLifecycleCenter() {
  const {
    artists,
    interactions,
    orders,
    communicationRecords,
    refreshAIRecommendation,
    getAIRecommendationForArtist,
    addCommunicationRecord
  } = useCRM();

  const [section, setSection] = useState<CRMSection>('overview');
  const [activeLifecycle, setActiveLifecycle] = useState<LifecycleStage | 'all'>('all');
  const [selectedArtistId, setSelectedArtistId] = useState<string>('');
  const [followupNote, setFollowupNote] = useState('');
  const [followupAt, setFollowupAt] = useState('');
  const [messageOverride, setMessageOverride] = useState('');

  const artistsWithLifecycle = useMemo(() => {
    return artists.map((a) => ({ artist: a, lifecycle: deriveLifecycle(a) }));
  }, [artists]);

  const byLifecycle = useMemo(() => {
    const acc: Record<LifecycleStage, CRMArtist[]> = {
      new_lead: [],
      contacted: [],
      interested: [],
      sample_sent: [],
      first_order: [],
      repeat_buyer: [],
      at_risk: [],
      dormant: []
    };
    artistsWithLifecycle.forEach(({ artist, lifecycle }) => acc[lifecycle].push(artist));
    return acc;
  }, [artistsWithLifecycle]);

  const selectedArtist = useMemo(() => {
    const fromSelection = artists.find((a) => a.id === selectedArtistId);
    if (fromSelection) return fromSelection;
    const first = artistsWithLifecycle.find(({ lifecycle }) => activeLifecycle === 'all' || lifecycle === activeLifecycle);
    return first?.artist || artists[0] || null;
  }, [artists, artistsWithLifecycle, selectedArtistId, activeLifecycle]);

  const selectedLifecycle = selectedArtist ? deriveLifecycle(selectedArtist) : null;
  const selectedRecommendation = selectedArtist ? getAIRecommendationForArtist(selectedArtist.id) : undefined;
  const activeMessage = messageOverride || selectedRecommendation?.message || '';

  const selectedTimeline = useMemo(() => {
    if (!selectedArtist) return [] as Array<{ ts: string; type: string; detail: string }>;

    const comm = communicationRecords
      .filter((c) => c.artistId === selectedArtist.id)
      .map((c) => ({
        ts: c.timestamp,
        type: `Comm • ${c.channel}`,
        detail: c.summary || c.content || c.status
      }));

    const inter = interactions
      .filter((i) => i.artistId === selectedArtist.id)
      .map((i) => ({
        ts: i.timestamp,
        type: `Interaction • ${i.type}`,
        detail: i.content || `weight ${i.weight}`
      }));

    const ord = orders
      .filter((o) => o.artistId === selectedArtist.id)
      .map((o) => ({
        ts: o.orderDate,
        type: 'Order',
        detail: `${o.productName} • $${o.amount}`
      }));

    return [...comm, ...inter, ...ord].sort((a, b) => +new Date(b.ts) - +new Date(a.ts));
  }, [selectedArtist, communicationRecords, interactions, orders]);

  const summaryStats = useMemo(() => {
    const total = artists.length;
    const active = byLifecycle.interested.length + byLifecycle.sample_sent.length + byLifecycle.first_order.length + byLifecycle.repeat_buyer.length;
    const dormant = byLifecycle.dormant.length + byLifecycle.at_risk.length;
    const newToday = artists.filter((a) => daysSince(a.lastInteractionDate) === 0).length;
    const repeatRate = total > 0 ? Math.round((byLifecycle.repeat_buyer.length / total) * 100) : 0;
    return { total, active, dormant, newToday, repeatRate };
  }, [artists, byLifecycle]);

  const lifecyclePool = useMemo(() => {
    const pool = artistsWithLifecycle
      .filter(({ lifecycle }) => activeLifecycle === 'all' || lifecycle === activeLifecycle)
      .map(({ artist, lifecycle }) => ({ artist, lifecycle }));
    return pool.sort((a, b) => (b.artist.heatScore || 0) - (a.artist.heatScore || 0));
  }, [artistsWithLifecycle, activeLifecycle]);

  const sectionButton = (id: CRMSection, label: string) => (
    <button
      key={id}
      onClick={() => setSection(id)}
      className={cn(
        'px-3 py-2 rounded-lg border text-xs font-bold tracking-wide transition-colors',
        section === id ? 'bg-rose-500/15 border-rose-500/30 text-rose-300' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
      )}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-2xl font-black text-white">CRM Lifecycle Center</h3>
          <p className="text-sm text-zinc-500">Overview / Lifecycle Pipeline / Contacts / Activities / Segments / Automations</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {sectionButton('overview', 'Overview')}
          {sectionButton('pipeline', 'Lifecycle Pipeline')}
          {sectionButton('contacts', 'Contacts')}
          {sectionButton('activities', 'Activities')}
          {sectionButton('segments', 'Segments')}
          {sectionButton('automations', 'Automations')}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <div className="text-zinc-500 text-xs">Total Customers</div>
          <div className="text-white text-2xl font-black">{summaryStats.total}</div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <div className="text-zinc-500 text-xs">Active Lifecycle</div>
          <div className="text-emerald-300 text-2xl font-black">{summaryStats.active}</div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <div className="text-zinc-500 text-xs">At Risk + Dormant</div>
          <div className="text-orange-300 text-2xl font-black">{summaryStats.dormant}</div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <div className="text-zinc-500 text-xs">Recent Interaction (Today)</div>
          <div className="text-sky-300 text-2xl font-black">{summaryStats.newToday}</div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <div className="text-zinc-500 text-xs">Repeat Buyer Rate</div>
          <div className="text-teal-300 text-2xl font-black">{summaryStats.repeatRate}%</div>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-[#111] p-4">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <button
            onClick={() => setActiveLifecycle('all')}
            className={cn(
              'px-3 py-1.5 rounded-lg border text-xs font-bold',
              activeLifecycle === 'all' ? 'border-rose-500/40 text-rose-300 bg-rose-500/10' : 'border-zinc-800 text-zinc-400'
            )}
          >
            All
          </button>
          {LIFECYCLE_ORDER.map((stage) => (
            <button
              key={stage}
              onClick={() => setActiveLifecycle(stage)}
              className={cn(
                'px-3 py-1.5 rounded-lg border text-xs font-bold',
                activeLifecycle === stage ? `${LIFECYCLE_ACCENT[stage]} bg-zinc-900` : 'border-zinc-800 text-zinc-400'
              )}
            >
              {LIFECYCLE_LABEL[stage]}: {byLifecycle[stage].length}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
          <div className="xl:col-span-4 rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 max-h-[520px] overflow-auto">
            <div className="text-xs font-bold text-zinc-500 mb-2">Contacts / Accounts</div>
            <div className="space-y-2">
              {lifecyclePool.slice(0, 120).map(({ artist, lifecycle }) => (
                <button
                  key={artist.id}
                  onClick={() => setSelectedArtistId(artist.id)}
                  className={cn(
                    'w-full text-left p-3 rounded-lg border transition-colors',
                    selectedArtist?.id === artist.id ? 'border-rose-500/30 bg-rose-500/10' : 'border-zinc-800 hover:border-zinc-700'
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-bold text-white truncate">{artist.shopName || artist.fullName || artist.username}</div>
                    <div className="text-[10px] text-zinc-400">H{artist.heatScore || 0}</div>
                  </div>
                  <div className="text-xs text-zinc-500 truncate">@{artist.ig_handle || artist.username || 'N/A'}</div>
                  <div className={cn('text-[10px] mt-1 font-semibold', LIFECYCLE_ACCENT[lifecycle].split(' ')[0])}>{LIFECYCLE_LABEL[lifecycle]}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="xl:col-span-5 rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 max-h-[520px] overflow-auto">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-zinc-500">Customer Communication Detail</div>
              <button
                onClick={async () => {
                  if (!selectedArtist) return;
                  await addCommunicationRecord({
                    artistId: selectedArtist.id,
                    channel: selectedArtist.email ? 'email' : 'instagram_dm',
                    direction: 'outbound',
                    status: 'sent',
                    summary: 'Manual follow-up scheduled',
                    needsFollowup: true,
                    followupAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                    lifecycleStageAtTime: deriveLifecycle(selectedArtist)
                  });
                  toast.success('Communication log added.');
                }}
                className="px-2 py-1 text-[11px] rounded border border-zinc-700 text-zinc-300 hover:text-white"
              >
                Log Follow-up
              </button>
            </div>

            {!selectedArtist ? (
              <div className="text-zinc-500 text-sm mt-4">Select a customer to view details.</div>
            ) : (
              <div className="space-y-3 mt-3">
                <div className="rounded-lg border border-zinc-800 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-white font-black">{selectedArtist.shopName || selectedArtist.fullName || selectedArtist.username}</div>
                      <div className="text-xs text-zinc-500">{selectedArtist.email || 'No email'} • {selectedArtist.phone || 'No phone'}</div>
                    </div>
                    <div className={cn('text-[11px] px-2 py-1 rounded border', selectedLifecycle ? LIFECYCLE_ACCENT[selectedLifecycle] : 'text-zinc-400 border-zinc-700')}>
                      {selectedLifecycle ? LIFECYCLE_LABEL[selectedLifecycle] : 'Unknown'}
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-zinc-400 flex flex-wrap gap-3">
                    <span className="inline-flex items-center gap-1"><Wallet className="w-3 h-3" /> Total spent: ${selectedArtist.totalSpent || 0}</span>
                    <span className="inline-flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Orders: {selectedArtist.orderCount || 0}</span>
                    <span className="inline-flex items-center gap-1"><Clock3 className="w-3 h-3" /> Last interaction: {safeDate(selectedArtist.lastInteractionDate)}</span>
                  </div>
                </div>

                <div className="rounded-lg border border-zinc-800 p-3">
                  <div className="text-xs font-bold text-zinc-500 mb-2">Timeline</div>
                  <div className="space-y-2">
                    {selectedTimeline.slice(0, 20).map((item, idx) => (
                      <div key={`${item.ts}_${idx}`} className="p-2 rounded bg-zinc-900 border border-zinc-800">
                        <div className="text-[11px] text-zinc-500">{safeDate(item.ts)} • {item.type}</div>
                        <div className="text-sm text-zinc-200">{item.detail}</div>
                      </div>
                    ))}
                    {selectedTimeline.length === 0 && (
                      <div className="text-xs text-zinc-500">No timeline records yet.</div>
                    )}
                  </div>
                </div>

                <div className="rounded-lg border border-zinc-800 p-3">
                  <div className="text-xs font-bold text-zinc-500 mb-2">Next Follow-up Task</div>
                  <div className="space-y-2">
                    <textarea
                      value={followupNote}
                      onChange={(e) => setFollowupNote(e.target.value)}
                      placeholder="What to do next? (e.g., ask sample feedback + confirm commonly used SKU)"
                      className="w-full min-h-[76px] rounded-lg border border-zinc-800 bg-zinc-900 p-2 text-sm text-zinc-100 outline-none focus:border-zinc-700"
                    />
                    <input
                      type="datetime-local"
                      value={followupAt}
                      onChange={(e) => setFollowupAt(e.target.value)}
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-900 p-2 text-sm text-zinc-100 outline-none focus:border-zinc-700"
                    />
                    <button
                      onClick={async () => {
                        if (!selectedArtist) return;
                        await addCommunicationRecord({
                          artistId: selectedArtist.id,
                          channel: 'system',
                          direction: 'outbound',
                          status: 'completed',
                          summary: 'Follow-up task saved',
                          content: followupNote || 'No note',
                          needsFollowup: true,
                          followupAt: followupAt ? new Date(followupAt).toISOString() : undefined,
                          lifecycleStageAtTime: deriveLifecycle(selectedArtist)
                        });
                        setFollowupNote('');
                        toast.success('Follow-up task saved.');
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-rose-500/30 bg-rose-500/10 text-sm text-rose-200"
                    >
                      Save Task
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="xl:col-span-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-zinc-500">AI Recommended Next Message</div>
              <button
                onClick={async () => {
                  if (!selectedArtist) return;
                  const next = await refreshAIRecommendation(selectedArtist.id);
                  if (next) {
                    setMessageOverride('');
                    toast.success('AI recommendation refreshed.');
                  }
                }}
                className="p-1.5 rounded border border-zinc-700 text-zinc-400 hover:text-white"
                title="Regenerate"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {selectedArtist ? (
              <div className={cn('rounded-lg border p-3 space-y-2', recommendationTone(selectedRecommendation))}>
                {!selectedRecommendation ? (
                  <div className="text-xs text-zinc-400">No recommendation yet. Click refresh.</div>
                ) : (
                  <>
                    <div className="text-[11px] text-zinc-400">Reason</div>
                    <div className="text-sm text-zinc-100">{selectedRecommendation.reason}</div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded border border-zinc-700 p-2">
                        <div className="text-zinc-500">Channel</div>
                        <div className="text-zinc-100 font-semibold">{selectedRecommendation.channel}</div>
                      </div>
                      <div className="rounded border border-zinc-700 p-2">
                        <div className="text-zinc-500">Goal</div>
                        <div className="text-zinc-100 font-semibold">{selectedRecommendation.goal}</div>
                      </div>
                      <div className="rounded border border-zinc-700 p-2">
                        <div className="text-zinc-500">Timing</div>
                        <div className="text-zinc-100 font-semibold">{selectedRecommendation.timing}</div>
                      </div>
                      <div className="rounded border border-zinc-700 p-2">
                        <div className="text-zinc-500">Confidence</div>
                        <div className="text-zinc-100 font-semibold">{selectedRecommendation.confidence}</div>
                      </div>
                    </div>
                    <div className="text-[11px] text-zinc-400">Draft message</div>
                    <div className="text-sm text-zinc-100 leading-relaxed">{activeMessage}</div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        className="px-2 py-1.5 rounded border border-zinc-700 text-xs text-zinc-200 hover:text-white"
                        onClick={() => {
                          if (!selectedRecommendation) return;
                          const shortVersion = selectedRecommendation.message.length > 180
                            ? `${selectedRecommendation.message.slice(0, 177)}...`
                            : selectedRecommendation.message;
                          setMessageOverride(shortVersion);
                        }}
                      >
                        Make shorter
                      </button>
                      <button
                        className="px-2 py-1.5 rounded border border-zinc-700 text-xs text-zinc-200 hover:text-white"
                        onClick={() => {
                          if (!selectedRecommendation) return;
                          setMessageOverride(`Hi ${selectedArtist?.fullName || selectedArtist?.username}, ${selectedRecommendation.message}`);
                        }}
                      >
                        Make warmer
                      </button>
                      <button
                        className="px-2 py-1.5 rounded border border-zinc-700 text-xs text-zinc-200 hover:text-white"
                        onClick={() => {
                          if (!selectedRecommendation) return;
                          setMessageOverride(`Hello ${selectedArtist?.fullName || selectedArtist?.username},\n\n${selectedRecommendation.message}\n\nBest regards,\nInkFlow Team`);
                        }}
                      >
                        More professional
                      </button>
                      <button
                        className="px-2 py-1.5 rounded border border-zinc-700 text-xs text-zinc-200 hover:text-white"
                        onClick={() => {
                          if (!selectedRecommendation) return;
                          setMessageOverride(`[ES draft placeholder]\n${selectedRecommendation.message}`);
                        }}
                      >
                        Translate draft
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <button
                        className="flex-1 px-2 py-1.5 rounded border border-zinc-700 text-xs text-zinc-200 hover:text-white"
                        onClick={() => {
                          navigator.clipboard.writeText(activeMessage);
                          toast.success('Message copied.');
                        }}
                      >
                        Copy
                      </button>
                      <button
                        className="flex-1 px-2 py-1.5 rounded border border-rose-500/30 bg-rose-500/10 text-xs text-rose-200"
                        onClick={async () => {
                          await addCommunicationRecord({
                            artistId: selectedArtist.id,
                            channel: selectedRecommendation.channel,
                            direction: 'outbound',
                            status: 'sent',
                            summary: `AI draft used (${selectedRecommendation.goal})`,
                            content: activeMessage,
                            lifecycleStageAtTime: selectedRecommendation.lifecycleStage
                          });
                          toast.success('Send action logged.');
                        }}
                      >
                        Log Send
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="text-xs text-zinc-500">Select a customer to see recommendation.</div>
            )}

            <div className="rounded-lg border border-zinc-800 p-3">
              <div className="text-xs font-bold text-zinc-500 mb-2">Why this matters</div>
              <ul className="text-xs text-zinc-400 space-y-1">
                <li className="flex gap-1"><Sparkles className="w-3.5 h-3.5 mt-0.5" /> AI Training defines tone/rules.</li>
                <li className="flex gap-1"><Activity className="w-3.5 h-3.5 mt-0.5" /> CRM decides who/when/goal.</li>
                <li className="flex gap-1"><Send className="w-3.5 h-3.5 mt-0.5" /> Message logs feed lifecycle automation.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
