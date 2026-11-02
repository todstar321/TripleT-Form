import React from "react";
import { 
  Camera, 
  Settings, 
  Sparkles, 
  Gift, 
  Dices, 
  Users, 
  ShieldCheck, 
  CheckCircle2, 
  ArrowRight, 
  Globe, 
  LogOut, 
  CreditCard, 
  Sliders, 
  Calendar, 
  MapPin, 
  Clock,
  Award
} from "lucide-react";

export default function OwnerPortalHub({
  eventConfig,
  currentUser,
  registrations = [],
  onSelectCheckIn,
  onSelectSettings,
  onSwitchToPublicForm,
  onLogout
}) {
  const totalRegistrations = registrations.length;
  const checkedInCount = registrations.filter(r => r.checkedIn).length;
  const giftCount = registrations.filter(r => r.giftNumber).length;
  const totalSlips = registrations.filter(r => !!r.slipUrl).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      
      {/* Background Ambient Glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 left-1/4 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-[140px]" />
        <div className="absolute top-1/3 -right-40 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[160px]" />
        <div className="absolute -bottom-40 left-1/3 w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-[140px]" />
      </div>

      {/* Top Navigation Bar */}
      <header className="relative z-10 border-b border-white/10 bg-slate-950/70 backdrop-blur-xl sticky top-0 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20">
            👑
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="font-extrabold text-white text-base sm:text-lg tracking-tight">
                ศูนย์ควบคุม Owner & ผู้จัดงาน
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                {currentUser?.role === "owner" ? "Owner Portal" : "Admin Portal"}
              </span>
            </div>
            <p className="text-xs text-slate-400 truncate max-w-[240px] sm:max-w-md">
              {eventConfig?.eventTitle || "งานสังสรรค์ปีใหม่ SME FAN 2026"}
            </p>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          <button
            type="button"
            onClick={onSwitchToPublicForm}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-300 hover:text-white transition-all shadow-sm"
            title="เปิดหน้าฟอร์มลงทะเบียนสำหรับผู้เข้าร่วม"
          >
            <Globe className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">หน้าฟอร์มลงทะเบียน</span>
          </button>

          <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-white/10 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-300 font-medium">{currentUser?.name || "ทีป์ชลิต ทองจันทร์"}</span>
          </div>

          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 hover:text-rose-200 transition-all"
              title="ออกจากระบบ"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 max-w-5xl w-full mx-auto p-3 sm:p-8 flex flex-col justify-center space-y-4 sm:space-y-8">
        
        {/* Welcome Hero */}
        <div className="text-center space-y-1.5 sm:space-y-3">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] sm:text-xs font-bold">
            <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span>ยินดีต้อนรับสู่ระบบบริหารจัดการค่ำคืนงานสังสรรค์</span>
          </div>

          <h2 className="text-xl sm:text-4xl font-extrabold text-white tracking-tight">
            เลือกระบบงานที่ต้องการจัดการ
          </h2>
          <p className="text-xs sm:text-base text-slate-400 max-w-2xl mx-auto">
            เข้าสู่ระบบลงทะเบียนหน้างานจริง หรือเข้าสู่การตั้งค่าระบบผู้ดูแลระบบอย่างครอบคลุม
          </p>
        </div>

        {/* 2 Primary Choice Cards (Side-by-side or compact responsive cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-8 pt-1 sm:pt-2">
          
          {/* ======================================================== */}
          {/* CHOICE 1: ลงทะเบียนเข้างาน (On-Site Event Hub)           */}
          {/* ======================================================== */}
          <div 
            onClick={onSelectCheckIn}
            className="group relative cursor-pointer rounded-2xl sm:rounded-3xl bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-emerald-500/30 hover:border-emerald-400/80 p-4 sm:p-8 shadow-2xl hover:shadow-emerald-500/20 transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between overflow-hidden"
          >
            {/* Top Glow Ribbon */}
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400" />
            
            <div className="space-y-3 sm:space-y-6">
              {/* Header with Icon & Badge */}
              <div className="flex items-start justify-between">
                <div className="w-11 h-11 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-inner group-hover:scale-110 transition-transform">
                  <Camera className="w-5 h-5 sm:w-8 sm:h-8" />
                </div>
                <span className="px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  ⚡ สำหรับหน้างาน & MC พิธีกร
                </span>
              </div>

              {/* Title & Subtitle */}
              <div className="space-y-1 sm:space-y-2">
                <h3 className="text-lg sm:text-2xl font-black text-white group-hover:text-emerald-300 transition-colors flex items-center space-x-2">
                  <span>ลงทะเบียนเข้างาน</span>
                  <span className="text-[11px] sm:text-xs font-mono font-normal text-emerald-400">#หน้างาน</span>
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  ระบบเช็คอินสแกนบัตร QR Code หน้างาน • ลงทะเบียนจับของขวัญ • สุ่ม Random แจกของรางวัลบนเวที
                </p>
              </div>

              {/* Feature Highlights */}
              <div className="space-y-1.5 sm:space-y-2 pt-2 border-t border-white/5 text-[11px] sm:text-xs text-slate-300">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 shrink-0" />
                  <span><strong>สแกน QR Code:</strong> เช็คอินผู้ร่วมงานผ่านกล้องมือถือ/แท็บเล็ต</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Gift className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 shrink-0" />
                  <span><strong>จับของขวัญ:</strong> รันหมายเลขของขวัญ 1..N อัตโนมัติ</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Dices className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-400 shrink-0" />
                  <span><strong>Random สุ่มรางวัล:</strong> สุ่มซ้ำได้, คัดชื่อออก, และสุ่มเฉพาะของขวัญ</span>
                </div>
              </div>

              {/* Live Activity Counters */}
              <div className="grid grid-cols-2 gap-2 sm:gap-3 pt-1 sm:pt-2">
                <div className="bg-slate-950/70 p-2 sm:p-3 rounded-xl sm:rounded-2xl border border-white/5">
                  <div className="text-[10px] sm:text-[11px] text-slate-400">เช็คอินเข้างานแล้ว</div>
                  <div className="text-base sm:text-xl font-extrabold text-emerald-400 pt-0.5">
                    {checkedInCount} <span className="text-[10px] sm:text-xs font-normal text-slate-400">/ {totalRegistrations} ท่าน</span>
                  </div>
                </div>
                <div className="bg-slate-950/70 p-2 sm:p-3 rounded-xl sm:rounded-2xl border border-white/5">
                  <div className="text-[10px] sm:text-[11px] text-slate-400">ของขวัญที่ลงทะเบียน</div>
                  <div className="text-base sm:text-xl font-extrabold text-amber-400 pt-0.5">
                    {giftCount} <span className="text-[10px] sm:text-xs font-normal text-slate-400">ชิ้น</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Button */}
            <div className="pt-3 sm:pt-6 mt-3 sm:mt-6 border-t border-white/10">
              <button
                type="button"
                className="w-full py-2.5 sm:py-3.5 px-4 sm:px-5 rounded-xl sm:rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold text-xs sm:text-sm flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/25 group-hover:from-emerald-400 group-hover:to-teal-400 transition-all"
              >
                <span>เข้าสู่ระบบลงทะเบียนเข้างาน</span>
                <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* ======================================================== */}
          {/* CHOICE 2: ตั้งค่าระบบ (System Settings & Config)          */}
          {/* ======================================================== */}
          <div 
            onClick={onSelectSettings}
            className="group relative cursor-pointer rounded-2xl sm:rounded-3xl bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-amber-500/30 hover:border-amber-400/80 p-4 sm:p-8 shadow-2xl hover:shadow-amber-500/20 transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between overflow-hidden"
          >
            {/* Top Glow Ribbon */}
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-500 via-orange-400 to-indigo-500" />

            <div className="space-y-3 sm:space-y-6">
              {/* Header with Icon & Badge */}
              <div className="flex items-start justify-between">
                <div className="w-11 h-11 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-inner group-hover:scale-110 transition-transform">
                  <Settings className="w-5 h-5 sm:w-8 sm:h-8" />
                </div>
                <span className="px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  👑 สำหรับเจ้าของระบบ (Owner)
                </span>
              </div>

              {/* Title & Subtitle */}
              <div className="space-y-1 sm:space-y-2">
                <h3 className="text-lg sm:text-2xl font-black text-white group-hover:text-amber-300 transition-colors flex items-center space-x-2">
                  <span>ตั้งค่าระบบ</span>
                  <span className="text-[11px] sm:text-xs font-mono font-normal text-amber-400">#แอดมิน</span>
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  จัดการรายชื่อสมาชิก • ตรวจสอบสลิปโอนเงิน • ปรับแต่งธีม & รูปภาพแบบฟอร์ม 1-4 • สิทธิ์ผู้ดูแลระบบ
                </p>
              </div>

              {/* Feature Highlights */}
              <div className="space-y-1.5 sm:space-y-2 pt-2 border-t border-white/5 text-xs text-slate-300">
                <div className="flex items-center space-x-2">
                  <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-400 shrink-0" />
                  <span><strong>จัดการสมาชิก:</strong> สังกัดสงสพัท, โรตารี่ (Google Sheets Style)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CreditCard className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 shrink-0" />
                  <span><strong>คลังสลิปโอนเงิน:</strong> ตรวจสอบสลิป, ลบสลิป, และล้างสลิปหมดอายุ</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Sliders className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 shrink-0" />
                  <span><strong>ศูนย์กลางแบบฟอร์ม:</strong> ปรับแต่งธีม, Google Sheets, และรูปปก</span>
                </div>
              </div>

              {/* Live Summary Counters */}
              <div className="grid grid-cols-2 gap-2 sm:gap-3 pt-1 sm:pt-2">
                <div className="bg-slate-950/70 p-2 sm:p-3 rounded-xl sm:rounded-2xl border border-white/5">
                  <div className="text-[10px] sm:text-[11px] text-slate-400">ผู้ลงทะเบียนทั้งหมด</div>
                  <div className="text-base sm:text-xl font-extrabold text-indigo-300 pt-0.5">
                    {totalRegistrations} <span className="text-[10px] sm:text-xs font-normal text-slate-400">ท่าน</span>
                  </div>
                </div>
                <div className="bg-slate-950/70 p-2 sm:p-3 rounded-xl sm:rounded-2xl border border-white/5">
                  <div className="text-[10px] sm:text-[11px] text-slate-400">สลิปในระบบ</div>
                  <div className="text-base sm:text-xl font-extrabold text-amber-400 pt-0.5">
                    {totalSlips} <span className="text-[10px] sm:text-xs font-normal text-slate-400">สลิป</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Button */}
            <div className="pt-3 sm:pt-6 mt-3 sm:mt-6 border-t border-white/10">
              <button
                type="button"
                className="w-full py-2.5 sm:py-3.5 px-4 sm:px-5 rounded-xl sm:rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold text-xs sm:text-sm flex items-center justify-center space-x-2 shadow-lg shadow-amber-500/25 group-hover:from-amber-400 group-hover:to-amber-500 transition-all"
              >
                <span>เข้าสู่หน้าตั้งค่าระบบ (แอดมิน)</span>
                <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

        </div>

        {/* Footer info pill */}
        <div className="flex flex-col sm:flex-row items-center justify-between text-[11px] sm:text-xs text-slate-500 pt-3 sm:pt-4 border-t border-white/5">
          <div className="flex flex-wrap items-center justify-center gap-1.5 sm:space-x-2">
            <span className="flex items-center space-x-1">
              <Calendar className="w-3.5 h-3.5 text-amber-400/80" />
              <span>{eventConfig?.eventDate || "วันเสาร์ที่ 23 ธันวาคม 2026 เวลา 18:00 - 22:30 น."}</span>
            </span>
            <span className="hidden sm:inline text-white/20">•</span>
            <span className="flex items-center space-x-1">
              <MapPin className="w-3.5 h-3.5 text-rose-400/80" />
              <span>{eventConfig?.eventVenue || "ห้องแมกโนเลีย โรงแรมลีการ์เดนส์พลาซ่า หาดใหญ่"}</span>
            </span>
          </div>
          <div className="pt-1.5 sm:pt-0">
            ระบบบริหารจัดการ Triple T Form • SME FAN 2026
          </div>
        </div>

      </main>

    </div>
  );
}
