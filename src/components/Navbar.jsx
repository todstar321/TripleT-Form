import React from 'react';
import { 
  FileSpreadsheet, 
  Palette, 
  Edit3, 
  Eye, 
  Share2, 
  RotateCcw, 
  Download, 
  Upload,
  Sparkles,
  Settings,
  Calendar,
  LogOut,
  ShieldCheck
} from 'lucide-react';

export default function Navbar({ 
  currentTab, 
  setCurrentTab, 
  onReset, 
  onExport, 
  onImport,
  eventConfig,
  openSheetsModal,
  openShareModal,
  currentUser,
  onLogout
}) {
  const isConnected = !!eventConfig.googleSheetsUrl;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-slate-950/85 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setCurrentTab('sme_register')}>
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-400 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Sparkles className="w-5 h-5 text-slate-950 font-bold" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-base sm:text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-amber-200 bg-clip-text text-transparent">
                  SME FAN 2026
                </span>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  New Year Event
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block truncate max-w-[200px]">
                {eventConfig.eventTitle || "ระบบลงทะเบียนเข้าร่วมกิจกรรม"}
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center space-x-1 sm:space-x-1.5 bg-slate-900/70 p-1 rounded-2xl border border-white/10">
            {/* Form View (Preview as Attendee without Navbar) */}
            <button
              onClick={() => setCurrentTab('sme_register')}
              title="สลับไปดูหน้าฟอร์มลงทะเบียนแบบที่ผู้ร่วมงานเห็น (ซ่อนแถบเมนูแอดมิน)"
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                currentTab === 'sme_register'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-amber-300 hover:text-white hover:bg-amber-500/10'
              }`}
            >
              <Eye className="w-4 h-4 text-amber-400" />
              <span>ดูหน้าฟอร์ม (Form View)</span>
            </button>

            {/* Admin Management */}
            <button
              onClick={() => setCurrentTab('sme_admin')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                currentTab === 'sme_admin'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>แอดมินจัดการงาน</span>
            </button>

            {/* Generic Form Builder */}
            <button
              onClick={() => setCurrentTab('builder')}
              className={`hidden md:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                currentTab === 'builder' || currentTab === 'theme'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Edit3 className="w-4 h-4" />
              <span>สร้างฟอร์มทั่วไป</span>
            </button>
          </nav>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            {/* Google Sheets Status */}
            <button
              onClick={openSheetsModal}
              title="ตั้งค่าเชื่อมต่อ Google Sheets (5 แท็บ)"
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                isConnected
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20 animate-pulse'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span className="hidden md:inline">
                {isConnected ? 'Sheets 5 แท็บเชื่อมแล้ว' : 'ต่อ Google Sheets 5 แท็บ'}
              </span>
            </button>

            {/* Share / QR Modal */}
            <button
              onClick={openShareModal}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white border border-white/10 transition-all"
            >
              <Share2 className="w-4 h-4 text-amber-400" />
              <span className="hidden md:inline">แชร์ฟอร์ม / QR</span>
            </button>

            {/* User Badge & Logout */}
            {currentUser && (
              <div className="flex items-center space-x-1.5 pl-2 border-l border-white/10">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border hidden sm:inline ${
                  currentUser.role === 'owner'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    : currentUser.role === 'manager'
                      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                }`}>
                  {currentUser.role === 'owner' ? '👑 Owner' : currentUser.role === 'manager' ? '💼 Manager' : '🛡️ Staff'}
                </span>
                {onLogout && (
                  <button
                    onClick={onLogout}
                    title={`ออกจากระบบ (${currentUser.name})`}
                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}

            {/* Reset */}
            <div className="hidden lg:flex items-center space-x-1 border-l border-white/10 pl-2">
              <button
                onClick={onReset}
                title="รีเซ็ตข้อมูลเป็นค่าเริ่มต้น"
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>
      </div>
    </header>
  );
}
