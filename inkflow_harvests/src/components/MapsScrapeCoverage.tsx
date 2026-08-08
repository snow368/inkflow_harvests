import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../lib/api-auth';

interface JobRow {
  id: number;
  country: string;
  state: string;
  cities: string | null;
  status: string;
  cities_total: number;
  cities_done: number;
  artists_found: number;
  error_text: string | null;
  created_by: string | null;
  created_at: number;
  updated_at: number;
}

interface CoverageState {
  ab: string;
  name: string;
  job: JobRow | null;
}

interface CoverageResp {
  ok: boolean;
  country: string;
  states: CoverageState[];
  notRun: string[];
  summary: {
    total: number; ran: number; running: number; failed: number;
    pending: number; notRun: number; artistsFound: number;
  };
}

interface CountryOpt { code: string; name: string; flag: string }
interface RegionOpt { ab: string; name: string }

const FALLBACK_COUNTRIES: CountryOpt[] = [
  { code: 'US', name: '美国', flag: '🇺🇸' },
  { code: 'CA', name: '加拿大', flag: '🇨🇦' },
  { code: 'GB', name: '英国', flag: '🇬🇧' },
  { code: 'AU', name: '澳大利亚', flag: '🇦🇺' },
  { code: 'DE', name: '德国', flag: '🇩🇪' },
  { code: 'FR', name: '法国', flag: '🇫🇷' },
  { code: 'JP', name: '日本', flag: '🇯🇵' },
];

function statusBadge(status: string | null) {
  if (status === 'completed')
    return { text: '✅ 已完成', bg: '#0f3b2e', color: '#4ade80' };
  if (status === 'running')
    return { text: '🔄 运行中', bg: '#3b2e0f', color: '#fbbf24' };
  if (status === 'failed')
    return { text: '❌ 失败', bg: '#3b0f0f', color: '#f87171' };
  if (status === 'pending')
    return { text: '⏳ 排队中', bg: '#0f1e3b', color: '#60a5fa' };
  return { text: '○ 未跑', bg: '#1e293b', color: '#64748b' };
}

function fmtDate(ts?: number) {
  if (!ts) return '—';
  try { return new Date(ts).toLocaleString(); } catch { return '—'; }
}

export default function MapsScrapeCoverage() {
  const [countries, setCountries] = useState<CountryOpt[]>(FALLBACK_COUNTRIES);
  const [country, setCountry] = useState('US');
  const [coverage, setCoverage] = useState<CoverageResp | null>(null);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(false);

  // add-run form
  const [regions, setRegions] = useState<RegionOpt[]>([]);
  const [regionsLoading, setRegionsLoading] = useState(false);
  const [stateInput, setStateInput] = useState('');
  const [cities, setCities] = useState<string[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [citySearch, setCitySearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const gridStates = useMemo(() => coverage?.states || [], [coverage]);

  const loadCountries = async () => {
    try {
      const r = await apiFetch('/api/maps-scrape/countries');
      const d = await r.json();
      if (d.ok && Array.isArray(d.countries) && d.countries.length) setCountries(d.countries);
    } catch { /* keep fallback */ }
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      const [cRes, jRes] = await Promise.all([
        apiFetch(`/api/maps-scrape/coverage?country=${country}`),
        apiFetch('/api/maps-scrape/jobs'),
      ]);
      const cData = await cRes.json();
      const jData = await jRes.json();
      if (cData.ok) setCoverage(cData);
      if (jData.ok) setJobs(jData.items || []);
    } catch {
      setMessage('❌ 加载失败');
    }
    setLoading(false);
  };

  const loadRegions = async () => {
    setRegionsLoading(true);
    try {
      const r = await apiFetch(`/api/maps-scrape/regions?country=${country}`);
      const d = await r.json();
      setRegions(d.ok ? (d.regions || []) : []);
    } catch {
      setRegions([]);
    }
    setRegionsLoading(false);
  };

  const loadCities = async (ab: string) => {
    if (!ab) { setCities([]); setSelectedCities([]); return; }
    setCitiesLoading(true);
    setCities([]);
    setSelectedCities([]);
    setCitySearch('');
    try {
      const hit = regions.find(r => r.ab === ab);
      const q = `/api/maps-scrape/cities?country=${country}&state=${encodeURIComponent(ab)}` +
        (hit ? `&name=${encodeURIComponent(hit.name)}` : '');
      const r = await apiFetch(q);
      const d = await r.json();
      setCities(d.ok ? (d.cities || []) : []);
    } catch {
      setCities([]);
    }
    setCitiesLoading(false);
  };

  useEffect(() => { loadCountries(); }, []);
  useEffect(() => {
    setStateInput('');
    setCities([]);
    setSelectedCities([]);
    loadAll();
    loadRegions();
  }, [country]);
  useEffect(() => { loadCities(stateInput); /* eslint-disable-next-line */ }, [stateInput]);

  const filteredCities = useMemo(() => {
    const q = citySearch.trim().toLowerCase();
    if (!q) return cities;
    return cities.filter(c => c.toLowerCase().includes(q));
  }, [cities, citySearch]);

  const toggleCity = (name: string) => {
    setSelectedCities(prev => prev.includes(name) ? prev.filter(x => x !== name) : [...prev, name]);
  };

  const addJob = async () => {
    const st = stateInput.trim().toUpperCase();
    if (!st) { setMessage('❌ 请选择州/地区'); return; }
    setSubmitting(true);
    setMessage('');
    try {
      // 未勾选 = 全州（后端/调度器会自动取该州全部城市）
      const payloadCities = selectedCities.length ? selectedCities : cities;
      const r = await apiFetch('/api/maps-scrape/jobs', {
        method: 'POST',
        body: JSON.stringify({ country, state: st, cities: payloadCities }),
      });
      const d = await r.json();
      if (d.ok) {
        setMessage(`✅ 已加入队列：${st} (${country}) · ${payloadCities.length} 个城市`);
        setStateInput('');
        setCities([]);
        setSelectedCities([]);
        loadAll();
      } else {
        setMessage(`❌ ${d.error || '添加失败'}`);
      }
    } catch {
      setMessage('❌ 添加失败');
    }
    setSubmitting(false);
  };

  const deleteJob = async (id: number) => {
    try {
      await apiFetch(`/api/maps-scrape/jobs/${id}`, { method: 'DELETE' });
      loadAll();
    } catch {}
  };

  // 断点续：「继续」只把状态翻回 pending（保留 cities_done），调度器会从进度日志续跑，
  // 不会像「加入队列」那样把 cities_done 清零重抓整州。
  const resumeJob = async (id: number) => {
    try {
      const r = await apiFetch(`/api/maps-scrape/jobs/${id}/status`, {
        method: 'POST',
        body: JSON.stringify({ status: 'pending' }),
      });
      const d = await r.json();
      if (d.ok) { setMessage('✅ 已让系统从断点继续'); loadAll(); }
      else setMessage('❌ 继续失败');
    } catch {
      setMessage('❌ 继续失败');
    }
  };

  // 卡住判定：running 但超过 20 分钟无更新 = 疑似卡死（可点「继续」让调度器重新接管续跑）
  const isStuck = (j: JobRow) =>
    j.status === 'running' && (Date.now() - (j.updated_at || 0)) > 20 * 60 * 1000;

  const card: React.CSSProperties = {
    background: '#1e293b', borderRadius: 8, padding: 16,
    border: '1px solid #334155', marginBottom: 16,
  };
  const input: React.CSSProperties = {
    padding: '8px 12px', borderRadius: 6, border: '1px solid #475569',
    background: '#0f172a', color: '#e2e8f0', fontSize: 14, width: '100%',
    boxSizing: 'border-box',
  };
  const btn: React.CSSProperties = {
    padding: '8px 16px', borderRadius: 6, border: 'none',
    background: '#2563eb', color: '#fff', cursor: 'pointer', fontWeight: 500,
  };
  const miniBtn: React.CSSProperties = {
    padding: '4px 10px', borderRadius: 6, border: '1px solid #475569',
    background: '#0f172a', color: '#cbd5e1', cursor: 'pointer', fontSize: 12,
  };

  const summary = coverage?.summary;
  const currentCountry = countries.find(c => c.code === country);
  const currentRegionName = regions.find(r => r.ab === stateInput)?.name || '';

  return (
    <div style={{ padding: 20, color: '#e2e8f0', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 10 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>🗺️ Maps 抓取覆盖</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select value={country} onChange={e => setCountry(e.target.value)} style={{ ...input, width: 'auto' }}>
            {countries.map(c => <option key={c.code} value={c.code}>{c.flag} {c.name}</option>)}
          </select>
          <button onClick={loadAll} disabled={loading} style={{ ...btn, background: '#475569', opacity: loading ? 0.6 : 1 }}>
            {loading ? '刷新中...' : '🔄 刷新'}
          </button>
        </div>
      </div>
      <p style={{ margin: '0 0 16px', color: '#94a3b8', fontSize: 14 }}>
        查看 Google Maps 纹身店抓取器已跑过哪些州/地区、哪些还没跑，并把新区域推给 VPS 抓取器。
      </p>

      {summary && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
          {[
            { l: '已完成', v: summary.ran, c: '#4ade80' },
            { l: '运行中', v: summary.running, c: '#fbbf24' },
            { l: '排队中', v: summary.pending, c: '#60a5fa' },
            { l: '失败', v: summary.failed, c: '#f87171' },
            { l: '未跑', v: summary.notRun, c: '#64748b' },
            { l: '累计商家', v: summary.artistsFound, c: '#a78bfa' },
          ].map(s => (
            <div key={s.l} style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: '10px 14px', minWidth: 90 }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: s.c }}>{s.v}</div>
              <div style={{ fontSize: 12, color: '#94a3b8' }}>{s.l}</div>
            </div>
          ))}
        </div>
      )}

      {/* Coverage grid */}
      <div style={card}>
        <h3 style={{ margin: '0 0 12px', fontSize: 15 }}>
          {currentCountry?.flag} {currentCountry?.name} 各州/地区覆盖 ({gridStates.filter(s => s.job).length}/{gridStates.length} 已跑)
        </h3>
        {loading && <p style={{ color: '#64748b' }}>加载中...</p>}
        {!loading && gridStates.length === 0 && (
          <p style={{ color: '#64748b', textAlign: 'center', padding: 16 }}>该国家暂无地区数据</p>
        )}
        {!loading && gridStates.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
            {gridStates.map(s => {
              const b = statusBadge(s.job?.status || null);
              const active = stateInput === s.ab;
              return (
                <div key={`${s.ab}-${s.name}`} title={`${s.name} — 点击选中`}
                  onClick={() => setStateInput(s.ab)}
                  style={{
                    border: `1px solid ${active ? '#2563eb' : '#334155'}`, borderRadius: 6,
                    padding: '8px 10px', background: active ? '#132241' : '#0f172a', cursor: 'pointer',
                  }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{s.ab}</span>
                    <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 8, background: b.bg, color: b.color, whiteSpace: 'nowrap' }}>{b.text}</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
                  {s.job && (
                    <div style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>
                      {s.job.artists_found || 0} 商家 · {s.job.cities_done || 0}/{s.job.cities_total || 0} 城市
                      <br />{fmtDate(s.job.updated_at)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add run form */}
      <div style={card}>
        <h3 style={{ margin: '0 0 12px', fontSize: 15 }}>➕ 加入抓取队列</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10, marginBottom: 12 }}>
          <div>
            <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}>国家</label>
            <select value={country} onChange={e => setCountry(e.target.value)} style={{ ...input, padding: '7px 12px' }}>
              {countries.map(c => <option key={c.code} value={c.code}>{c.flag} {c.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}>
              州 / 地区 {regionsLoading ? '(加载中...)' : `(${regions.length})`}
            </label>
            <select value={stateInput} onChange={e => setStateInput(e.target.value)} style={{ ...input, padding: '7px 12px' }}>
              <option value="">— 请选择 —</option>
              {regions.map(r => (
                <option key={`${r.ab}-${r.name}`} value={r.ab}>{r.ab} — {r.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* City picker */}
        <div style={{ border: '1px solid #334155', borderRadius: 8, padding: 12, background: '#0f172a', marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
            <div style={{ fontSize: 13, color: '#cbd5e1' }}>
              城市清单
              {stateInput && <span style={{ color: '#64748b', marginLeft: 6 }}>{currentRegionName || stateInput}</span>}
              {!!cities.length && (
                <span style={{ color: '#94a3b8', marginLeft: 8 }}>
                  共 {cities.length} 个 · 已选 <strong style={{ color: '#4ade80' }}>{selectedCities.length || cities.length}</strong>
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <input placeholder="搜索城市" value={citySearch} onChange={e => setCitySearch(e.target.value)}
                style={{ ...input, width: 150, padding: '4px 10px', fontSize: 12 }} />
              <button style={miniBtn} onClick={() => setSelectedCities(filteredCities)}>全选</button>
              <button style={miniBtn} onClick={() => setSelectedCities(cities.slice(0, 30))}>前 30</button>
              <button style={miniBtn} onClick={() => setSelectedCities([])}>清空</button>
            </div>
          </div>

          {!stateInput && <p style={{ color: '#64748b', fontSize: 13, margin: '8px 0' }}>选择州/地区后自动列出该地区全部城市。</p>}
          {stateInput && citiesLoading && <p style={{ color: '#64748b', fontSize: 13, margin: '8px 0' }}>正在加载城市...</p>}
          {stateInput && !citiesLoading && cities.length === 0 && (
            <p style={{ color: '#f59e0b', fontSize: 13, margin: '8px 0' }}>
              没取到该地区的城市清单，仍可直接加入队列（VPS 抓取器会自行补全城市）。
            </p>
          )}
          {!citiesLoading && cities.length > 0 && (
            <div style={{
              maxHeight: 240, overflowY: 'auto', display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 4,
            }}>
              {filteredCities.map(cn => {
                const on = selectedCities.includes(cn);
                return (
                  <label key={cn} style={{
                    display: 'flex', alignItems: 'center', gap: 6, fontSize: 12,
                    padding: '4px 6px', borderRadius: 4, cursor: 'pointer',
                    background: on ? '#132241' : 'transparent', color: on ? '#e2e8f0' : '#94a3b8',
                  }}>
                    <input type="checkbox" checked={on} onChange={() => toggleCity(cn)} style={{ cursor: 'pointer' }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cn}</span>
                  </label>
                );
              })}
            </div>
          )}
          {cities.length > 0 && selectedCities.length === 0 && (
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 8 }}>未勾选 = 默认整州全跑（{cities.length} 城）</div>
          )}
        </div>

        <button onClick={addJob} disabled={submitting || !stateInput.trim()} style={{
          ...btn, opacity: (submitting || !stateInput.trim()) ? 0.6 : 1,
        }}>
          {submitting ? '提交中...' : '加入队列'}
        </button>
        {message && (
          <div style={{ marginTop: 8, fontSize: 13, color: message.startsWith('✅') ? '#4ade80' : '#f87171' }}>{message}</div>
        )}
      </div>

      {/* Queue */}
      <div style={card}>
        <h3 style={{ margin: '0 0 12px', fontSize: 15 }}>队列 / 历史 ({jobs.length})</h3>
        {jobs.length === 0 && <p style={{ color: '#64748b', textAlign: 'center', padding: 16 }}>暂无任务</p>}
        {jobs.map(j => {
          const b = statusBadge(j.status);
          const stuck = isStuck(j);
          return (
            <div key={j.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderBottom: '1px solid #334155', fontSize: 14 }}>
              <div>
                <strong>{j.state}</strong>
                <span style={{ color: '#94a3b8', marginLeft: 8 }}>{j.country}</span>
                <span style={{ color: '#64748b', marginLeft: 8, fontSize: 12 }}>
                  {j.artists_found || 0} 商家 · {j.cities_done || 0}/{j.cities_total || 0} 城市
                </span>
                {stuck && (
                  <span style={{ fontSize: 11, color: '#fbbf24', marginLeft: 8, padding: '1px 6px', borderRadius: 8, background: '#3b2e0f' }}>
                    ⚠️ 可能卡住
                  </span>
                )}
                {j.error_text && <div style={{ fontSize: 11, color: '#f87171' }}>错误: {j.error_text}</div>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: b.bg, color: b.color }}>{b.text}</span>
                <span style={{ fontSize: 11, color: '#64748b' }}>{fmtDate(j.updated_at)}</span>
                {(j.status === 'running' || j.status === 'failed') && (
                  <button onClick={() => resumeJob(j.id)}
                    title="从断点继续（保留已抓进度，不重抓整州）"
                    style={{ ...miniBtn, color: '#4ade80', borderColor: '#166534' }}>继续</button>
                )}
                <button onClick={() => deleteJob(j.id)}
                  style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 14, padding: 4 }}>✕</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
