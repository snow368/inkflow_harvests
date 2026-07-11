import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api-auth';

interface User {
  user_id: string;
  email: string;
  display_name: string;
  role: string;
  quota_daily_scrape: number;
  quota_total_scrape: number;
  scrape_used_today: number;
  scrape_used_total: number;
  total_tasks: number;
  completed_tasks: number;
  last_active_at: number;
  created_at: number;
}

interface Stats {
  totalUsers: number;
  totalTasks: number;
  pendingTasks: number;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editQuota, setEditQuota] = useState(10);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [uR, sR] = await Promise.all([
        apiFetch('/api/admin/users'),
        apiFetch('/api/admin/stats'),
      ]);
      const uD = await uR.json();
      const sD = await sR.json();
      if (uD.ok) setUsers(uD.users || []);
      if (sD.ok) setStats(sD.stats);
    } catch {}
    setLoading(false);
  };

  const updateQuota = async (uid: string) => {
    await apiFetch(`/api/admin/users/${uid}/quota`, {
      method: 'POST',
      body: JSON.stringify({ quota_daily_scrape: editQuota }),
    });
    setEditing(null);
    fetchData();
  };

  useEffect(() => { fetchData(); }, []);

  const card: React.CSSProperties = {
    background: '#1e293b', borderRadius: 8, padding: 16,
    border: '1px solid #334155', marginBottom: 16,
  };

  return (
    <div style={{ padding: 20, color: '#e2e8f0', maxWidth: 1000, margin: '0 auto' }}>
      <h2 style={{ margin: '0 0 8px', fontSize: 20 }}>👥 User Management</h2>
      <p style={{ margin: '0 0 20px', color: '#94a3b8', fontSize: 14 }}>
        Manage user quotas and view system stats
      </p>

      {/* Stats cards */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
          <div style={card}>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#3b82f6' }}>{stats.totalUsers}</div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>总用户</div>
          </div>
          <div style={card}>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#22c55e' }}>{stats.totalTasks}</div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>总抓取任务</div>
          </div>
          <div style={card}>
            <div style={{ fontSize: 28, fontWeight: 700, color: stats.pendingTasks > 0 ? '#fbbf24' : '#22c55e' }}>{stats.pendingTasks}</div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>等待处理</div>
          </div>
        </div>
      )}

      {/* User table */}
      <div style={card}>
        <h3 style={{ margin: '0 0 12px', fontSize: 15 }}>用户列表</h3>
        {loading && <p style={{ color: '#64748b' }}>加载中...</p>}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#334155', textAlign: 'left' }}>
              <th style={{ padding: '8px 10px' }}>Email</th>
              <th style={{ padding: '8px 10px' }}>Role</th>
              <th style={{ padding: '8px 10px' }}>日配额</th>
              <th style={{ padding: '8px 10px' }}>总任务</th>
              <th style={{ padding: '8px 10px' }}>已完成</th>
              <th style={{ padding: '8px 10px' }}>最近活跃</th>
              <th style={{ padding: '8px 10px' }}></th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.user_id} style={{ borderBottom: '1px solid #334155' }}>
                <td style={{ padding: '8px 10px' }}>{u.email || u.user_id.slice(0, 12)}</td>
                <td style={{ padding: '8px 10px' }}>
                  <span style={{
                    padding: '2px 6px', borderRadius: 4, fontSize: 11,
                    background: u.role === 'admin' ? '#1e3a5f' : '#1e293b',
                    color: u.role === 'admin' ? '#60a5fa' : '#94a3b8',
                  }}>
                    {u.role}
                  </span>
                </td>
                <td style={{ padding: '8px 10px' }}>
                  {editing === u.user_id ? (
                    <div style={{ display: 'flex', gap: 4 }}>
                      <input type="number" value={editQuota} onChange={e => setEditQuota(Number(e.target.value))}
                        style={{ width: 60, padding: '2px 6px', borderRadius: 4, border: '1px solid #475569', background: '#0f172a', color: '#e2e8f0' }} />
                      <button onClick={() => updateQuota(u.user_id)}
                        style={{ padding: '2px 8px', borderRadius: 4, border: 'none', background: '#2563eb', color: '#fff', cursor: 'pointer' }}>
                        ✓
                      </button>
                    </div>
                  ) : (
                    <span>{u.quota_daily_scrape}/天
                      <button onClick={() => { setEditing(u.user_id); setEditQuota(u.quota_daily_scrape); }}
                        style={{ marginLeft: 6, background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 11 }}>
                        ✏️
                      </button>
                    </span>
                  )}
                </td>
                <td style={{ padding: '8px 10px' }}>{u.total_tasks}</td>
                <td style={{ padding: '8px 10px' }}>{u.completed_tasks}</td>
                <td style={{ padding: '8px 10px', color: '#64748b' }}>
                  {u.last_active_at ? new Date(u.last_active_at).toLocaleDateString() : '-'}
                </td>
                <td style={{ padding: '8px 10px' }}>
                  {u.role !== 'admin' && (
                    <button onClick={() => apiFetch(`/api/admin/users/${u.user_id}/quota`, {
                      method: 'POST', body: JSON.stringify({ role: 'admin' }),
                    }).then(fetchData)}
                      style={{ background: 'none', border: '1px solid #475569', color: '#94a3b8', cursor: 'pointer', fontSize: 11, padding: '2px 6px', borderRadius: 4 }}>
                      Set Admin
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {users.length === 0 && !loading && (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>暂无用户</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pending Access Requests */}
      <PendingUsers />
    </div>
  );
}

function PendingUsers() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const load = async () => {
    setLoading(true);
    try {
      const r = await apiFetch('/api/auth/pending-users');
      if (r.ok) { const d = await r.json(); setRequests(d.users || []); }
    } catch {}
    setLoading(false);
  };
  useEffect(() => { load(); }, []);
  const approve = async (id: string, action: string) => {
    try {
      await apiFetch('/api/auth/approve', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action })
      });
      load();
    } catch {}
  };
  const s: any = { background: '#1e293b', borderRadius: 8, padding: 16, border: '1px solid #334155', marginTop: 16 };
  return (
    <div style={s}>
      <h3 style={{ margin: '0 0 12px', fontSize: 16, color: '#fbbf24', fontWeight: 700 }}>Pending Access Requests</h3>
      {loading ? <p style={{ color: '#64748b' }}>Loading...</p> : requests.length === 0 ? <p style={{ color: '#64748b' }}>No pending requests</p> : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead><tr style={{ background: '#334155', textAlign: 'left' }}>
            <th style={{ padding: '8px 10px' }}>Email</th><th style={{ padding: '8px 10px' }}>Name</th>
            <th style={{ padding: '8px 10px' }}>Reason</th><th style={{ padding: '8px 10px' }}>Status</th>
            <th style={{ padding: '8px 10px' }}>Date</th><th style={{ padding: '8px 10px' }}></th>
          </tr></thead>
          <tbody>{requests.map((r: any) => (
            <tr key={r.id} style={{ borderBottom: '1px solid #334155' }}>
              <td style={{ padding: '8px 10px' }}>{r.email}</td>
              <td style={{ padding: '8px 10px' }}>{r.name || '-'}</td>
              <td style={{ padding: '8px 10px' }}>{r.reason || '-'}</td>
              <td style={{ padding: '8px 10px' }}>
                <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: 11,
                  background: r.status === 'approved' ? '#14532d' : r.status === 'pending' ? '#713f12' : '#7f1d1d',
                  color: r.status === 'approved' ? '#4ade80' : r.status === 'pending' ? '#fbbf24' : '#f87171',
                }}>{r.status}</span>
              </td>
              <td style={{ padding: '8px 10px', color: '#64748b' }}>{r.created_at ? new Date(r.created_at).toLocaleDateString() : '-'}</td>
              <td style={{ padding: '8px 10px' }}>
                {r.status === 'pending' && <>
                  <button onClick={() => approve(r.id, 'approve')} style={{ padding: '4px 10px', borderRadius: 4, border: 'none', background: '#22c55e', color: 'white', cursor: 'pointer', fontSize: 11, marginRight: 4 }}>Approve</button>
                  <button onClick={() => approve(r.id, 'reject')} style={{ padding: '4px 10px', borderRadius: 4, border: 'none', background: '#ef4444', color: 'white', cursor: 'pointer', fontSize: 11 }}>Reject</button>
                </>}
              </td>
            </tr>
          ))}</tbody>
        </table>
      )}
    </div>
  );
}
