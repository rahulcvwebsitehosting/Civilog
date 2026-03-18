import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[CRITICAL] Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-drafting-paper grid-bg p-6 text-center">
          <div className="w-20 h-20 bg-red-100 text-red-600 rounded-[2rem] flex items-center justify-center mb-8 shadow-2xl animate-bounce">
            <AlertTriangle size={40} />
          </div>
          
          <h1 className="text-3xl font-black text-slate-900 uppercase italic mb-4 tracking-tighter">Something went wrong</h1>
          <p className="max-w-md text-pencil-gray font-bold text-sm leading-relaxed mb-8">
            The system encountered an unexpected error. Don't worry, your data is safe. 
            Try refreshing the page or returning to the dashboard.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
            <button
              onClick={() => window.location.reload()}
              className="flex-1 flex items-center justify-center gap-2 py-4 bg-blueprint-blue text-white font-black uppercase text-xs rounded-2xl shadow-xl shadow-amber-500/20 hover:scale-105 transition-all"
            >
              <RefreshCcw size={16} />
              Reload System
            </button>
            <button
              onClick={() => window.location.href = '/'}
              className="flex-1 flex items-center justify-center gap-2 py-4 bg-white border-2 border-slate-100 text-slate-600 font-black uppercase text-xs rounded-2xl shadow-lg hover:bg-slate-50 transition-all"
            >
              <Home size={16} />
              Return Home
            </button>
          </div>

          {process.env.NODE_ENV === 'development' && this.state.error && (
            <div className="mt-12 p-6 bg-red-50 rounded-3xl border border-red-100 text-left max-w-2xl overflow-auto">
              <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-2">Debug Info:</p>
              <pre className="text-[10px] font-mono text-red-700 whitespace-pre-wrap">
                {this.state.error.stack}
              </pre>
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
