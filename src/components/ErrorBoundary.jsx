import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    try {
      localStorage.setItem('sme_fan_active_tab_v3', 'sme_register');
      window.location.hash = '#register';
    } catch (e) {}
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 font-sans">
          <div className="max-w-md w-full bg-slate-900 border border-rose-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5 text-center">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto shadow-inner">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-black text-white">
                เกิดข้อผิดพลาดในการแสดงผล
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                ระบบพบข้อผิดพลาดที่ไม่คาดคิดในหน้านี้ ท่านสามารถกดรีเฟรชเพื่อลองใหม่อีกครั้ง หรือกลับสู่หน้าหลัก
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 rounded-xl bg-slate-950 border border-white/10 text-left font-mono text-[11px] text-rose-300 max-h-32 overflow-y-auto">
                {this.state.error.toString()}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-amber-500/20 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>รีเฟรชหน้านี้</span>
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white font-semibold text-xs flex items-center justify-center space-x-2 cursor-pointer"
              >
                <Home className="w-4 h-4" />
                <span>กลับสู่หน้าหลัก</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
