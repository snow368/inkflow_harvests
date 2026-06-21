import React, { useState, useEffect } from 'react';
import { FiSend, FiLoader, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';

interface Bot {
  id: string;
  username: string;
}

const TaskGenerator: React.FC = () => {
  const [bots, setBots] = useState<Bot[]>([]);
  const [botId, setBotId] = useState('');
  const [action, setAction] = useState<'like' | 'comment' | 'follow'>('like');
  const [limit, setLimit] = useState(20);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ generated?: number; total_candidates?: number; error?: string } | null>(null);

  useEffect(() => {
    fetch('/api/bots')
      .then(res => res.json())
      .then(data => setBots(data))
      .catch(err => console.error('获取bots失败', err));
  }, []);

  const handleGenerate = async () => {
    if (!botId) {
      toast.error('请选择 Bot');
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/tasks/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botId, action, limit })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '生成失败');
      setResult(data);
      toast.success(`已生成 ${data.generated} 条任务`);
    } catch (err: any) {
      setResult({ error: err.message });
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
          <FiSend className="w-5 h-5 text-emerald-500" />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white">任务生成器</h1>
          <p className="text-sm text-zinc-500">基于AI趋势分析，为指定Bot生成互动任务</p>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">选择 Bot</label>
          <select
            value={botId}
            onChange={(e) => setBotId(e.target.value)}
            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">-- 请选择 --</option>
            {bots.map(b => (
              <option key={b.id} value={b.id}>{b.username || b.id}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">动作类型</label>
          <div className="flex gap-3">
            {(['like', 'comment', 'follow'] as const).map(act => (
              <button
                key={act}
                onClick={() => setAction(act)}
                className={`px-5 py-2 rounded-xl font-medium transition-all ${
                  action === act
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                {act === 'like' && '点赞'}
                {act === 'comment' && '评论'}
                {act === 'follow' && '关注'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">生成数量</label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              value={limit}
              onChange={(e) => setLimit(Math.min(100, Math.max(1, Number(e.target.value))))}
              min="1"
              max="100"
              className="w-32 px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white"
            />
            <span className="text-zinc-500 text-sm">（上限 100 条）</span>
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading || !botId}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-xl font-black transition-all flex items-center justify-center gap-2"
        >
          {loading ? <FiLoader className="w-5 h-5 animate-spin" /> : <FiSend className="w-5 h-5" />}
          {loading ? '生成中...' : '生成任务'}
        </button>

        {result && (
          <div className={`p-4 rounded-xl border ${
            result.error ? 'bg-rose-500/10 border-rose-500/20' : 'bg-emerald-500/10 border-emerald-500/20'
          }`}>
            <div className="flex items-start gap-3">
              {result.error ? (
                <FiXCircle className="w-5 h-5 text-rose-500 mt-0.5" />
              ) : (
                <FiCheckCircle className="w-5 h-5 text-emerald-500 mt-0.5" />
              )}
              <div className="text-sm">
                {result.error ? (
                  <span className="text-rose-400">{result.error}</span>
                ) : (
                  <span className="text-emerald-400">
                    成功生成 {result.generated} 条{action === 'like' ? '点赞' : action === 'comment' ? '评论' : '关注'}任务
                    {result.generated < (result.total_candidates || 0) && `（候选不足，仅生成 ${result.generated} / ${result.total_candidates}）`}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskGenerator;