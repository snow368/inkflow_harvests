import { useEffect, useState } from 'react';
import { getUserBotPrefs, setUserBotPrefs, BotActionPrefs } from '../lib/botPrefs';

// 每用户「动作偏好」面板：决定该用户派发的任务里，bot 每会话执行的点赞/评论/关注次数
export default function BotActionPrefs({ uid, username }: { uid?: string; username?: string }) {
  const [prefs, setPrefs] = useState<BotActionPrefs>({ likesPerSession: 2, commentsPerSession: 1, followsPerSession: 0, botId: 'bot_ig_01', igHandle: '' });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (uid) setPrefs(getUserBotPrefs(uid));
  }, [uid]);

  const update = (k: keyof BotActionPrefs, v: number) => {
    setPrefs((p) => ({ ...p, [k]: Math.max(0, Math.min(10, v || 0)) }));
    setSaved(false);
  };

  const updateText = (k: 'botId' | 'igHandle', v: string) => {
    setPrefs((p) => ({ ...p, [k]: v }));
    setSaved(false);
  };

  const save = () => {
    if (uid) {
      setUserBotPrefs(uid, prefs);
      setSaved(true);
    }
  };

  const Field = ({ label, k }: { label: string; k: keyof BotActionPrefs }) => (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[11px] font-bold text-zinc-400">{label}</span>
      <input
        type="number"
        min={0}
        max={10}
        value={prefs[k]}
        onChange={(e) => update(k, parseInt(e.target.value, 10))}
        className="w-16 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded-lg text-center text-sm font-black text-white focus:outline-none focus:border-rose-500"
      />
    </div>
  );

  return (
    <div className="p-4 bg-zinc-900/80 border border-zinc-800 rounded-2xl">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="text-[11px] font-black text-zinc-300 uppercase tracking-widest">我的动作偏好</h4>
          <p className="text-[10px] text-zinc-600 mt-0.5">
            {username ? `@${username}` : '未登录'} · 每会话 bot 执行次数
          </p>
        </div>
        {saved && <span className="text-[10px] font-bold text-emerald-500">已保存</span>}
      </div>
      <div className="space-y-2">
        <Field label="点赞 / 次" k="likesPerSession" />
        <Field label="评论 / 次" k="commentsPerSession" />
        <Field label="关注 / 次" k="followsPerSession" />
      </div>

      <div className="mt-3 pt-3 border-t border-zinc-800 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] font-bold text-zinc-400">我的 Bot ID</span>
          <input
            type="text"
            value={prefs.botId}
            onChange={(e) => updateText('botId', e.target.value)}
            placeholder="bot_ig_01"
            className="w-36 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded-lg text-right text-xs font-bold text-white focus:outline-none focus:border-rose-500"
          />
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] font-bold text-zinc-400">IG 账号名</span>
          <input
            type="text"
            value={prefs.igHandle}
            onChange={(e) => updateText('igHandle', e.target.value)}
            placeholder="raiha8833"
            className="w-36 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded-lg text-right text-xs font-bold text-white focus:outline-none focus:border-rose-500"
          />
        </div>
        <p className="text-[10px] text-zinc-600 leading-relaxed">
          Bot ID 必须与你 VPS 上运行的 bot 实例一致，任务只会派发给这个 ID。IG 账号名仅作标识。
        </p>
      </div>
      <button
        onClick={save}
        disabled={!uid}
        className="w-full mt-3 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
      >
        保存我的偏好
      </button>
    </div>
  );
}
