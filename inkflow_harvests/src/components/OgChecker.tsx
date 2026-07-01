import React, { useState } from 'react';
import { cn } from '../lib/utils';
import { Globe, CheckCircle2, XCircle, AlertTriangle, Copy } from 'lucide-react';

interface OgTag {
  property: string;
  content: string;
  valid: boolean;
  message: string;
}

interface OgResult {
  title: string;
  description: string;
  image: string;
  url: string;
  type: string;
  siteName: string;
  twitterCard: string;
  tags: OgTag[];
  score: number;
  maxScore: number;
}

const REQUIRED_OG = ['og:title', 'og:description', 'og:image', 'og:url'];
const RECOMMENDED_OG = ['og:type', 'og:site_name', 'twitter:card'];

export default function OgChecker() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<OgResult | null>(null);
  const [demoMode, setDemoMode] = useState(false);

  const parseTags = () => {
    const text = input.trim();
    if (!text) return;

    // Parse meta tags from pasted HTML or direct key=value pairs
    const tagMap = new Map<string, string>();
    const lines = text.split('\n');

    // Try HTML meta tag pattern first
    const metaRegex = /<meta[^>]+(?:property|name)=["']([^"']+)["'][^>]*content=["']([^"']*)["'][^>]*\/?>/gi;
    const metaRegex2 = /<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']([^"']+)["'][^>]*\/?>/gi;
    let found = false;

    for (const line of lines) {
      // Try property="..." content="..." pattern
      let m = /(?:property|name)=["']([^"']+)["']\s+content=["']([^"']*)["']/.exec(line);
      if (!m) m = /content=["']([^"']*)["']\s+(?:property|name)=["']([^"']+)["']/.exec(line);
      if (m) {
        tagMap.set((m[1] || m[2]).toLowerCase(), (m[1] ? m[2] : m[1]));
        found = true;
      }
    }

    if (!found) {
      // Fallback: treat as key=value pairs
      for (const line of lines) {
        const eqIdx = line.indexOf('=');
        if (eqIdx > 0) {
          const key = line.slice(0, eqIdx).trim().toLowerCase();
          const val = line.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
          if (key && val) tagMap.set(key, val);
        }
      }
    }

    const tags: OgTag[] = [];
    let score = 0;
    const maxScore = REQUIRED_OG.length + RECOMMENDED_OG.length;

    const check = (prop: string, content: string | undefined, required: boolean) => {
      const key = prop.toLowerCase();
      const val = content || '';
      const hasValue = val.length > 0;
      let valid = false;
      let message = '';

      if (key === 'og:title') {
        valid = hasValue && val.length <= 70;
        message = hasValue
          ? val.length > 70 ? `⚠ ${val.length} chars (max 70 recommended)` : `✅ ${val.length} chars`
          : '❌ Missing';
      } else if (key === 'og:description') {
        valid = hasValue && val.length >= 50 && val.length <= 200;
        message = hasValue
          ? val.length < 50 ? `⚠ Too short (${val.length}, min 50)` :
            val.length > 200 ? `⚠ Too long (${val.length}, max 200)` : `✅ ${val.length} chars`
          : '❌ Missing';
      } else if (key === 'og:image') {
        valid = hasValue && (val.startsWith('http://') || val.startsWith('https://'));
        message = hasValue
          ? valid ? '✅ HTTPS URL' : '⚠ Must be absolute HTTPS URL'
          : '❌ Missing';
      } else if (key === 'og:url') {
        valid = hasValue && val.startsWith('http');
        message = hasValue ? (val.startsWith('https') ? '✅ HTTPS' : '⚠ Should use HTTPS') : '❌ Missing';
      } else if (key === 'twitter:card') {
        valid = hasValue;
        message = hasValue ? `✅ ${val}` : '⚠ Recommended';
      } else if (key === 'og:type') {
        valid = hasValue;
        message = hasValue ? `✅ ${val}` : '⚠ Recommended';
      } else if (key === 'og:site_name') {
        valid = hasValue;
        message = hasValue ? `✅ "${val}"` : '⚠ Recommended';
      } else {
        valid = hasValue;
        message = hasValue ? `✅ ${val.substring(0, 50)}${val.length > 50 ? '...' : ''}` : '⚠ Empty';
      }

      if (required && !hasValue) score -= 1;
      if (hasValue) score += 1;

      tags.push({ property: prop, content: val, valid, message });
    };

    for (const req of REQUIRED_OG) check(req, tagMap.get(req), true);
    for (const rec of RECOMMENDED_OG) check(rec, tagMap.get(rec), false);
    // Collect any extra OG tags
    for (const [key, val] of tagMap) {
      if (!REQUIRED_OG.includes(key) && !RECOMMENDED_OG.includes(key) && key.startsWith('og:')) {
        check(key, val, false);
      }
    }

    const title = tagMap.get('og:title') || tagMap.get('twitter:title') || '';
    const description = tagMap.get('og:description') || tagMap.get('twitter:description') || '';
    const image = tagMap.get('og:image') || tagMap.get('twitter:image') || '';
    const url = tagMap.get('og:url') || '';
    const type = tagMap.get('og:type') || 'website';
    const siteName = tagMap.get('og:site_name') || '';
    const twitterCard = tagMap.get('twitter:card') || 'summary';

    setResult({
      title, description, image, url, type, siteName, twitterCard,
      tags, score: Math.max(0, score), maxScore,
    });
  };

  const copyDemoTags = () => {
    setInput(`<meta property="og:title" content="My Awesome SEO Tool - Boost Your Rankings in 2026" />
<meta property="og:description" content="Discover the ultimate SEO analysis platform that helps you research keywords, track rankings, and outperform competitors. Start your free trial today." />
<meta property="og:image" content="https://example.com/images/og-banner-1200x630.png" />
<meta property="og:url" content="https://example.com/seo-tool" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="MySEO" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="My Awesome SEO Tool - Boost Rankings" />
<meta name="twitter:description" content="Free SEO analysis platform. Keywords, rankings, competitor tracking." />
<meta name="twitter:image" content="https://example.com/images/twitter-og.png" />`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-100">🔍 OG 标签检查器</h2>
          <p className="text-xs text-slate-400 mt-0.5">Validate Open Graph & Twitter Card meta tags — paste your page's &lt;head&gt; section</p>
        </div>
      </div>

      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs text-slate-500 font-medium">Paste meta tags or &lt;head&gt; HTML</label>
          <button onClick={copyDemoTags} className="text-[10px] text-slate-500 hover:text-slate-300 flex items-center gap-1">
            <Copy size={10} /> Load Demo
          </button>
        </div>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={`Paste your page's meta tags here:

<meta property="og:title" content="Page Title" />
<meta property="og:description" content="Page description here..." />
<meta property="og:image" content="https://..." />
<meta property="og:url" content="https://..." />`}
          className="w-full h-36 bg-slate-900 text-slate-100 text-xs font-mono rounded-lg p-3 border border-slate-700 resize-y focus:outline-none focus:border-rose-500/50 placeholder:text-slate-700"
        />
        <button onClick={parseTags} disabled={!input.trim()}
          className="mt-3 px-5 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white text-sm font-semibold rounded-lg flex items-center gap-2 transition-colors">
          <Globe size={14} /> Check Tags
        </button>
      </div>

      {result && (
        <>
          {/* Score card */}
          <div className={cn('rounded-xl border p-4 flex items-center gap-4',
            result.score >= result.maxScore ? 'bg-emerald-900/20 border-emerald-700/30' :
            result.score >= result.maxScore * 0.6 ? 'bg-amber-900/20 border-amber-700/30' :
            'bg-red-900/20 border-red-700/30')}>
            <div className={cn('w-14 h-14 rounded-full flex items-center justify-center text-lg font-black',
              result.score >= result.maxScore ? 'bg-emerald-600 text-white' :
              result.score >= result.maxScore * 0.6 ? 'bg-amber-600 text-white' :
              'bg-red-600 text-white')}>
              {Math.round((result.score / result.maxScore) * 100)}
            </div>
            <div>
              <div className="text-sm font-bold text-slate-100">
                {result.score >= result.maxScore ? 'Perfect OG Configuration' :
                 result.score >= result.maxScore * 0.6 ? 'Needs Improvement' :
                 'Critical Issues Found'}
              </div>
              <div className="text-xs text-slate-400">{result.score}/{result.maxScore} tags valid</div>
            </div>
          </div>

          {/* Preview card */}
          <div className="bg-white rounded-xl overflow-hidden border border-slate-700/50">
            {result.image && (
              <div className="h-32 bg-slate-200 flex items-center justify-center overflow-hidden">
                {result.image.startsWith('http') ? (
                  <img src={result.image} alt="OG preview" className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLElement).innerHTML = '⚠ Image failed to load'; }} />
                ) : (
                  <span className="text-slate-400 text-xs">Invalid image URL</span>
                )}
              </div>
            )}
            <div className="p-3 space-y-1">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">{result.siteName || result.url || 'example.com'}</p>
              <p className="text-sm font-bold text-slate-800 line-clamp-2">{result.title || '(missing title)'}</p>
              <p className="text-xs text-slate-600 line-clamp-2">{result.description || '(missing description)'}</p>
            </div>
          </div>

          {/* Tag list */}
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Tag Analysis</h3>
            <div className="space-y-2">
              {result.tags.map((tag, i) => (
                <div key={i} className={cn('flex items-start gap-2 p-2 rounded-lg text-xs',
                  tag.valid ? 'bg-slate-800/30' : 'bg-red-900/10')}>
                  {tag.valid
                    ? <CheckCircle2 size={12} className="text-emerald-500 mt-0.5 shrink-0" />
                    : tag.property.startsWith('og:') && REQUIRED_OG.includes(tag.property)
                      ? <XCircle size={12} className="text-red-500 mt-0.5 shrink-0" />
                      : <AlertTriangle size={12} className="text-amber-500 mt-0.5 shrink-0" />
                  }
                  <div className="flex-1 min-w-0">
                    <code className="text-[10px] font-mono text-slate-400">{tag.property}</code>
                    <div className={cn('mt-0.5', tag.valid ? 'text-slate-300' : 'text-red-400')}>{tag.message}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tips */}
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">📖 Best Practices</h3>
            <ul className="text-xs text-slate-400 space-y-1.5">
              <li>• <strong>og:title</strong> — 50-60 chars, include primary keyword</li>
              <li>• <strong>og:description</strong> — 150-200 chars, compelling summary</li>
              <li>• <strong>og:image</strong> — 1200×630px, ≤1MB, HTTPS absolute URL</li>
              <li>• <strong>og:url</strong> — Canonical URL, always HTTPS</li>
              <li>• <strong>twitter:card</strong> — Use "summary_large_image" for rich previews</li>
              <li>• Each page should have <strong>unique OG tags</strong> — never share across pages</li>
              <li>• Verify with <strong>Facebook Sharing Debugger</strong> after deploying</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
