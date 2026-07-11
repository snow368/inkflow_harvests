import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api-auth';

const ALL_TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'outreach', label: 'Shop Outreach' },
  { id: 'analyzer', label: 'Artist Analyzer' },
  { id: 'training', label: 'AI Training' },
  { id: 'crm', label: 'CRM (Lifecycle)' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'orders', label: 'Orders' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'automation', label: 'Automation' },
  { id: 'publish', label: 'Publish Calendar' },
  { id: 'botworkers', label: 'Bot Workers' },
  { id: 'scrape', label: 'Scrape' },
  { id: 'settings', label: 'Settings' },
  { id: 'inkflow-outreach', label: 'InkFlow 获客' },
  { id: 'admin', label: 'Admin' },
];

const s: React.CSSProperties = {
  background: '#1e293b', borderRadius: 8, padding: 16,
  border: '1px solid #334155', marginBottom: 16,
};

export default function UserPermissions() {
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState('');
  const [permTabs, setPermTabs] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const loadUsers = async () => {
    try {
      const res = await apiFetch('/api/admin/users');
      const data = await res.json();
      console.log('UserPermissions users:', data);
      if (Array.isArray(data.users)) { setUsers(data.users); return; }
      if (Array.isArray(data)) { setUsers(data); return; }
      console.warn('Unexpected response format:', data);
    } catch (e) {
      console.error('UserPermissions load error:', e);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const loadPerm = async (email: string) => {
    setSelected(email);
    setPermTabs(ALL_TABS.map(t => t.id)); // default: all tabs
    try {
      const res = await apiFetch(`/api/auth/permissions/${encodeURIComponent(email)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.tabs && Array.isArray(data.tabs) && data.tabs.length > 0) {
          setPermTabs(data.tabs);
        }
      }
    } catch (e) {
      console.error('loadPerm error:', e);
    }
  };

  const savePerm = async () => {
    setSaving(true); setMsg('');
    try {
      const res = await apiFetch(`/api/auth/permissions/${encodeURIComponent(selected)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tabs: permTabs }),
      });
      if (res.ok) {
        setMsg('✅ Saved');
      } else {
        const data = await res.json().catch(() => ({}));
        setMsg('❌ ' + (data.error || `HTTP ${res.status}`));
      }
    } catch (e: any) {
      setMsg('❌ ' + (e.message || 'Network error'));
    }
    setSaving(false);
  };

  const toggleTab = (id: string) => {
    setPermTabs(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  };

  const filtered = users.filter(u =>
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={s}>
      <h3 style={{ margin: '0 0 12px', fontSize: 16, color: '#06b6d4', fontWeight: 700 }}>
        🔐 User Permissions
      </h3>
      <input value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Search by email..."
        style={{
          width: '100%', padding: '8px 10px', borderRadius: 6,
          border: '1px solid #334155', background: '#0f172a',
          color: '#e2e8f0', fontSize: 12, outline: 'none',
          boxSizing: 'border-box', marginBottom: 12,
        }} />
      
      {search && (
        <div style={{ maxHeight: 200, overflowY: 'auto', marginBottom: 12 }}>
          {filtered.map(u => (
            <div key={u.email} onClick={() => loadPerm(u.email)}
              style={{
                padding: '6px 10px', cursor: 'pointer', borderRadius: 4,
                background: selected === u.email ? '#06b6d420' : 'transparent',
                color: selected === u.email ? '#06b6d4' : '#94a3b8',
                fontSize: 11, borderBottom: '1px solid #334155',
              }}>
              {u.email}
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ padding: 8, color: '#64748b', fontSize: 11, textAlign: 'center' }}>
              No users found
            </div>
          )}
        </div>
      )}

      {selected && (
        <>
          <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8 }}>
            <strong style={{ color: '#e2e8f0' }}>{selected}</strong> — select tabs:
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 12 }}>
            {ALL_TABS.map(t => (
              <label key={t.id} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '4px 8px', borderRadius: 4, cursor: 'pointer',
                background: permTabs.includes(t.id) ? '#06b6d410' : 'transparent',
                fontSize: 11, color: permTabs.includes(t.id) ? '#06b6d4' : '#64748b',
              }}>
                <input type="checkbox" checked={permTabs.includes(t.id)}
                  onChange={() => toggleTab(t.id)}
                  style={{ accentColor: '#06b6d4' }} />
                {t.label}
              </label>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={savePerm} disabled={saving}
              style={{
                padding: '6px 16px', borderRadius: 6, border: 'none',
                background: saving ? '#334155' : '#06b6d4',
                color: 'white', fontSize: 11, fontWeight: 700, cursor: 'pointer',
              }}>
              {saving ? 'Saving...' : 'Save'}
            </button>
            {msg && <span style={{ fontSize: 11 }}>{msg}</span>}
          </div>
        </>
      )}
    </div>
  );
}
