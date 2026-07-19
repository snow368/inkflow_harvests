import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * Top-level error boundary.
 *
 * Without this, ANY thrown error during render/effect in the React tree
 * unmounts the whole app and leaves a blank white page (the "白板" bug).
 * Here we render the real error + stack on screen so the failure is visible
 * instead of silent, and the user can copy it back to us for diagnosis.
 */
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Surface the error in the console too (already logged by React, but keep a group).
    console.group('🚨 React render error caught by ErrorBoundary');
    console.error('Error:', error);
    console.error('Component stack:', errorInfo.componentStack);
    console.groupEnd();
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleCopy = () => {
    const text = `${this.state.error?.stack || this.state.error?.message || 'Unknown error'}\n\n--- component stack ---\n${this.state.errorInfo?.componentStack || ''}`;
    try {
      navigator.clipboard.writeText(text);
      alert('错误已复制到剪贴板，请发给我们');
    } catch {
      /* clipboard may be blocked; user can select the text manually */
    }
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 flex items-center justify-center p-6 font-sans">
        <div className="w-full max-w-2xl bg-[#111] border border-rose-500/30 rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-rose-600/20 rounded-xl flex items-center justify-center border border-rose-500/30">
              <span className="text-rose-500 text-xl font-black">!</span>
            </div>
            <div>
              <h1 className="text-lg font-black text-white">页面出错了</h1>
              <p className="text-xs text-zinc-500">App crashed — 以下是真实报错（不再是白板）</p>
            </div>
          </div>

          <div className="bg-black/50 border border-zinc-800 rounded-xl p-4 mb-4 max-h-72 overflow-auto">
            <p className="text-sm font-bold text-rose-400 mb-2 break-words">
              {this.state.error?.message || 'Unknown error'}
            </p>
            <pre className="text-[11px] text-zinc-400 whitespace-pre-wrap break-words leading-relaxed">
              {this.state.error?.stack}
              {'\n\n'}
              {this.state.errorInfo?.componentStack}
            </pre>
          </div>

          <div className="flex gap-3">
            <button
              onClick={this.handleReload}
              className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-xl text-sm transition-all"
            >
              重新加载
            </button>
            <button
              onClick={this.handleCopy}
              className="px-4 py-3 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 font-black rounded-xl text-sm transition-all"
            >
              复制错误
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
