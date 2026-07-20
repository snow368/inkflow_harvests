import React, { useState } from 'react';
import { Database } from 'lucide-react';
import { cn } from '../lib/utils';
import SeoSkillLibrary from './SeoSkillLibrary';
import KnowledgeIntake from './KnowledgeIntake';

// ============ 融合组件：现有 SEO 技能内容 + D1 知识库(采集) ============
// 入口：InkFlow 获客 → SEO 工具 → 📚 技能知识库
// 内嵌两视图：
//   ① 技能图谱 —— 现有 SEO 内容（AI Core seo_playbooks，对 inkflow-outreach 用户可见）
//   ② 知识库(采集) —— D1 中 541 条 SEO/社媒知识 + 链接抓取/投递入库（仅 dev 可见）

export default function SeoKnowledgeFused({ isDev = false }: { isDev?: boolean }) {
  const [view, setView] = useState<'skills' | 'kb'>('skills');

  return (
    <div className="space-y-4">
      {/* 内嵌视图切换 */}
      <div className="flex gap-1 bg-slate-800/30 rounded-lg p-0.5 border border-slate-700/30 w-fit flex-wrap">
        <button
          onClick={() => setView('skills')}
          className={cn(
            'px-3 py-1 text-[10px] font-semibold rounded-md transition-colors',
            view === 'skills' ? 'bg-rose-600/30 text-rose-400' : 'text-slate-500 hover:text-slate-300'
          )}
        >
          📚 技能图谱
        </button>
        {isDev && (
          <button
            onClick={() => setView('kb')}
            className={cn(
              'px-3 py-1 text-[10px] font-semibold rounded-md transition-colors flex items-center gap-1',
              view === 'kb' ? 'bg-emerald-600/30 text-emerald-400' : 'text-slate-500 hover:text-slate-300'
            )}
          >
            <Database size={12} /> 📥 知识库(采集)
          </button>
        )}
      </div>

      {view === 'skills' ? <SeoSkillLibrary /> : <KnowledgeIntake />}
    </div>
  );
}
