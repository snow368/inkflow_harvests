import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api-auth';

interface ScrapeConfig {
  id: number;
  keyword: string;
  city: string;
  country: string;
  status: string;
  created_at: number;
}

export default function ScrapeConfig() {
  const [configs, setConfigs] = useState<ScrapeConfig[]>([]);
  const [keyword, setKeyword] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('US');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const r = await apiFetch('/api/scrape/configs');
      const d = await r.json();
      if (d.ok) setConfigs(d.items || []);
      else setMessage('Failed to load');
    } catch { setMessage('Failed to fetch'); }
    setLoading(false);
  };

  const submitConfig = async () => {
    if (!keyword.trim() || !city.trim()) return;
    setSubmitting(true);
    setMessage('');
    try {
      const r = await apiFetch('/api/scrape/configs', {
        method: 'POST',
        body: JSON.stringify({ keyword: keyword.trim(), city: city.trim(), country }),
      });
      const d = await r.json();
      if (d.ok) {
        setMessage('✅ 提交成功！');
        setKeyword('');
        setCity('');
        fetchConfigs();
      } else {
        setMessage(`❌ ${d.error}`);
      }
    } catch { setMessage('❌ Submit failed'); }
    setSubmitting(false);
  };

  const deleteConfig = async (id: number) => {
    try {
      await apiFetch(`/api/scrape/configs/${id}`, { method: 'DELETE' });
      fetchConfigs();
    } catch {}
  };

  useEffect(() => { fetchConfigs(); }, []);

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

  return (
    <div style={{ padding: 20, color: '#e2e8f0', maxWidth: 800, margin: '0 auto' }}>
      <h2 style={{ margin: '0 0 8px', fontSize: 20 }}>🔍 抓取配置</h2>
      <p style={{ margin: '0 0 20px', color: '#94a3b8', fontSize: 14 }}>
        输入关键词、城市和国家，提交后系统会抓取相关商家数据
      </p>

      <div style={card}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px', gap: 10, marginBottom: 12 }}>
          <div>
            <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}>关键词</label>
            <input placeholder="e.g. tattoo shop" value={keyword} onChange={e => setKeyword(e.target.value)} style={input} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}>城市</label>
            <input placeholder="e.g. Portland" value={city} onChange={e => setCity(e.target.value)} style={input} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}>国家</label>
            <select value={country} onChange={e => setCountry(e.target.value)}
              style={{ ...input, padding: '7px 12px' }}>
              <option value="US">🇺🇸 美国</option>
              <option value="UK">🇬🇧 英国</option>
              <option value="AU">🇦🇺 澳洲</option>
              <option value="CA">🇨🇦 加拿大</option>
              <option value="DE">🇩🇪 德国</option>
              <option value="FR">🇫🇷 法国</option>
              <option value="JP">🇯🇵 日本</option>
            </select>
          </div>
        </div>
        <button onClick={submitConfig} disabled={submitting || !keyword || !city} style={{
          ...btn, opacity: (submitting || !keyword || !city) ? 0.6 : 1, marginTop: 4,
        }}>
          {submitting ? '提交中...' : '➕ 添加抓取任务'}
        </button>
        {message && (
          <div style={{ marginTop: 8, fontSize: 13, color: message.startsWith('✅') ? '#4ade80' : '#f87171' }}>
            {message}
          </div>
        )}
      </div>

      <div style={card}>
        <h3 style={{ margin: '0 0 12px', fontSize: 15 }}>
          我的任务 ({configs.length})
        </h3>
        {loading && <p style={{ color: '#64748b' }}>加载中...</p>}
        {!loading && configs.length === 0 && (
          <p style={{ color: '#64748b', textAlign: 'center', padding: 20 }}>
            还没有抓取任务，在上面添加一个
          </p>
        )}
        {configs.map(c => (
          <div key={c.id} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '10px 12px', borderBottom: '1px solid #334155', fontSize: 14,
          }}>
            <div>
              <strong>{c.keyword}</strong>
              <span style={{ color: '#94a3b8', marginLeft: 8 }}>
                📍 {c.city}, {c.country}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{
                fontSize: 12, padding: '2px 8px', borderRadius: 10,
                background: c.status === 'completed' ? '#0f3b2e' : c.status === 'running' ? '#3b2e0f' : '#1e293b',
                color: c.status === 'completed' ? '#4ade80' : c.status === 'running' ? '#fbbf24' : '#94a3b8',
              }}>
                {c.status === 'completed' ? '✅ 完成' : c.status === 'running' ? '🔄 运行中' : '⏳ 等待中'}
              </span>
              <button onClick={() => deleteConfig(c.id)}
                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 14, padding: 4 }}>
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
