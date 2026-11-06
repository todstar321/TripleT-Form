import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  ShieldAlert, 
  User, 
  Phone, 
  FileText, 
  Trash2, 
  RotateCcw, 
  History, 
  X, 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  Clock, 
  ShieldCheck,
  AlertOctagon
} from 'lucide-react';

const AUDIT_LOGS_STORAGE_KEY = 'sme_fan_clear_audit_logs_v1';

/**
 * Helper to fetch stored audit logs
 */
export function getClearAuditLogs() {
  try {
    const raw = localStorage.getItem(AUDIT_LOGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn("Failed to load audit logs:", e);
  }
  return [];
}

/**
 * Helper to append a new audit log entry
 */
export function recordClearAuditLog(entry) {
  try {
    const existing = getClearAuditLogs();
    const updated = [
      {
        id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        timestamp: new Date().toISOString(),
        formattedTime: new Date().toLocaleString('th-TH', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }),
        ...entry
      },
      ...existing
    ];
    // Keep last 100 entries
    const trimmed = updated.slice(0, 100);
    localStorage.setItem(AUDIT_LOGS_STORAGE_KEY, JSON.stringify(trimmed));
    return trimmed;
  } catch (e) {
    console.error("Failed to save audit log:", e);
    return [];
  }
}

/**
 * ClearSecurityModal Component
 * Multi-step high-security verification modal for dangerous data-clearing actions:
 * 1. Warning Confirmation ("คุณต้องการเคลียร์ข้อมูลหรือไม่" - Red alert, Grey Accept, Red Cancel)
 * 2. Admin Identification (Name + Phone)
 * 3. Clear Reason Specification
 * 4. Action Selector (ลบรูปหลังจบงาน / ล้างข้อมูลลงทะเบียน)
 * 5. Audit Log History Viewer
 */
export default function ClearSecurityModal({
  isOpen,
  onClose,
  currentUser,
  onSelectPurgePhotos,
  onSelectResetRegistrations,
  totalRegistrations = 0
}) {
  // Current Step: 'warning' | 'admin_info' | 'reason' | 'action_select' | 'audit_logs'
  const [step, setStep] = useState('warning');
  const [adminName, setAdminName] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [reason, setReason] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [auditLogs, setAuditLogs] = useState([]);

  // Auto-fill from current user when modal opens or user changes
  useEffect(() => {
    if (isOpen) {
      setStep('warning');
      setErrorMsg('');
      setReason('');
      setAdminName(currentUser?.name || '');
      setAdminPhone(currentUser?.phone || '');
      setAuditLogs(getClearAuditLogs());
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  // Preset quick reasons
  const quickReasons = [
    "ล้างรูปภาพและสลิปหลังจบงานเพื่อคืนพื้นที่",
    "ทดสอบระบบก่อนเปิดใช้งานจริง",
    "รีเซ็ตข้อมูลการลงทะเบียนทั้งหมดก่อนวันงาน",
    "ล้างข้อมูลจำลองเพื่อเตรียมต้อนรับผู้เข้าร่วมงาน",
    "แก้ไขข้อผิดพลาดระบบและเริ่มบันทึกใหม่"
  ];

  // Handlers for step progression
  const handleProceedFromWarning = () => {
    setErrorMsg('');
    setStep('admin_info');
  };

  const handleProceedFromAdminInfo = () => {
    if (!adminName.trim()) {
      setErrorMsg('กรุณากรอกชื่อแอดมินผู้ดำเนินการ');
      return;
    }
    if (!adminPhone.trim()) {
      setErrorMsg('กรุณากรอกเบอร์โทรศัพท์ของแอดมิน');
      return;
    }
    setErrorMsg('');
    setStep('reason');
  };

  const handleProceedFromReason = () => {
    if (!reason.trim()) {
      setErrorMsg('กรุณาระบุเหตุผลที่จะทำการเคลียร์ข้อมูล');
      return;
    }
    setErrorMsg('');
    setStep('action_select');
  };

  // Execution: Purge Photos
  const handleExecutePurge = () => {
    recordClearAuditLog({
      adminName: adminName.trim(),
      adminPhone: adminPhone.trim(),
      reason: reason.trim(),
      actionType: 'purge_photos',
      actionLabel: 'ลบรูปหลังจบงาน (คืนพื้นที่จัดเก็บ)',
      details: `ล้างรูปภาพสลิป/รูปโปรไฟล์เพื่อประหยัดพื้นที่จัดเก็บ`
    });
    onClose();
    if (onSelectPurgePhotos) onSelectPurgePhotos();
  };

  // Execution: Reset Registrations
  const handleExecuteReset = () => {
    recordClearAuditLog({
      adminName: adminName.trim(),
      adminPhone: adminPhone.trim(),
      reason: reason.trim(),
      actionType: 'reset_registrations',
      actionLabel: 'ล้างข้อมูลลงทะเบียน (รีเซ็ตระบบ)',
      details: `ล้างข้อมูลผู้ลงทะเบียนทั้งหมด (${totalRegistrations} รายการ) และคะแนนการประกวด`
    });
    onClose();
    if (onSelectResetRegistrations) onSelectResetRegistrations();
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-lg rounded-3xl bg-slate-900 border-2 border-rose-500/50 shadow-2xl shadow-rose-950/60 overflow-hidden relative text-white">
        
        {/* Glow ambient danger backlight */}
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-rose-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-rose-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-rose-500/20 bg-rose-950/40 flex items-center justify-between relative z-10">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
              <AlertOctagon className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-rose-200 tracking-wide flex items-center space-x-2">
                <span>ระบบรักษาความปลอดภัย: ⛔ เคลียร์ข้อมูล</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                {step === 'warning' && "ขั้นตอนที่ 1/4: ยืนยันการเข้าถึงฟังก์ชันอันตราย"}
                {step === 'admin_info' && "ขั้นตอนที่ 2/4: ยืนยันตัวตนผู้ดูแลระบบ"}
                {step === 'reason' && "ขั้นตอนที่ 3/4: ระบุเหตุผลการดำเนินการ"}
                {step === 'action_select' && "ขั้นตอนที่ 4/4: เลือกคำสั่งการเคลียร์ข้อมูล"}
                {step === 'audit_logs' && "ประวัติการใช้งานการเคลียร์ข้อมูลย้อนหลัง"}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            {step !== 'audit_logs' && (
              <button
                type="button"
                onClick={() => {
                  setAuditLogs(getClearAuditLogs());
                  setStep('audit_logs');
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-amber-300 flex items-center space-x-1 transition-all"
                title="ดูประวัติการกดเคลียร์ข้อมูลย้อนหลัง"
              >
                <History className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">ประวัติ</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 relative z-10 space-y-4">

          {/* Error Message Notice */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/50 text-rose-200 text-xs font-semibold flex items-center space-x-2 animate-shake">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 1: WARNING CONFIRMATION (ป๊อปอัพสีแดงแจ้งเตือนอันตราย)                 */}
          {/* ========================================================================= */}
          {step === 'warning' && (
            <div className="space-y-5 text-center py-2 animate-fadeIn">
              
              {/* Big Red Warning Badge */}
              <div className="w-20 h-20 rounded-3xl bg-rose-950/70 border-2 border-rose-500/60 shadow-xl shadow-rose-950 flex items-center justify-center mx-auto relative group">
                <ShieldAlert className="w-10 h-10 text-rose-400 animate-bounce" />
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 animate-ping" />
              </div>

              {/* Main Heading */}
              <div className="space-y-2">
                <h4 className="text-lg sm:text-xl font-black text-rose-100 tracking-wide">
                  คุณต้องการเคลียร์ข้อมูลหรือไม่
                </h4>
                <p className="text-xs sm:text-sm text-slate-300 max-w-sm mx-auto leading-relaxed">
                  นี่คือส่วนจัดการข้อมูลระดับสูง การดำเนินการอาจส่งผลต่อรูปภาพสลิป หรือรายการลงทะเบียนทั้งหมดของระบบ
                </p>
              </div>

              {/* Alert Card Box */}
              <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-left space-y-2 text-xs text-rose-200/90">
                <div className="flex items-center space-x-2 font-bold text-rose-300">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>มาตรการรักษาความปลอดภัยของระบบ:</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px] pl-1">
                  <li>ระบบจะบันทึก <span className="text-white font-bold">ชื่อและเบอร์โทรศัพท์</span> ของแอดมินทุกครั้ง</li>
                  <li>ต้องระบุ <span className="text-white font-bold">เหตุผลความจำเป็น</span> ก่อนดำเนินการ</li>
                  <li>ข้อมูลการกดจะถูกจัดเก็บใน <span className="text-amber-300 font-bold">ประวัติการใช้งาน (Audit Log)</span> เพื่อความโปร่งใส</li>
                </ul>
              </div>

              {/* Action Buttons: กดยอมรับ (สีเทา) และ ยกเลิก (สีแดง) ตามคำขอ */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                {/* Accept Button (สีเทา) */}
                <button
                  type="button"
                  onClick={handleProceedFromWarning}
                  className="w-full py-3 px-4 rounded-2xl bg-slate-700 hover:bg-slate-600 border border-slate-500/50 text-white font-bold text-xs sm:text-sm transition-all hover:scale-[1.02] active:scale-95 shadow-md flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>ยอมรับ</span>
                </button>

                {/* Cancel Button (สีแดง) */}
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-3 px-4 rounded-2xl bg-rose-600 hover:bg-rose-500 border border-rose-400 text-white font-bold text-xs sm:text-sm transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-rose-600/30 flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                  <span>ยกเลิก</span>
                </button>
              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 2: ADMIN IDENTITY (ระบุชื่อและเบอร์โทรของแอดมิน)                       */}
          {/* ========================================================================= */}
          {step === 'admin_info' && (
            <div className="space-y-4 py-1 animate-fadeIn">
              <div className="space-y-1 text-center sm:text-left">
                <h4 className="text-base font-extrabold text-white flex items-center justify-center sm:justify-start space-x-2">
                  <User className="w-4 h-4 text-amber-400" />
                  <span>ระบุข้อมูลผู้ดูแลระบบ (Admin)</span>
                </h4>
                <p className="text-xs text-slate-400">
                  กรุณาระบุชื่อและเบอร์โทรศัพท์เพื่อบันทึกในประวัติความปลอดภัยของระบบ
                </p>
              </div>

              <div className="space-y-3 pt-1">
                {/* Admin Name */}
                <div className="space-y-1 text-left">
                  <label className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
                    <User className="w-3.5 h-3.5 text-amber-400" />
                    <span>ชื่อ-นามสกุล ของแอดมินผู้ดำเนินการ <span className="text-rose-400">*</span></span>
                  </label>
                  <input
                    type="text"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    placeholder="เช่น คุณทีป์ชลิต ทองจันทร์ (ผอ.โต๊ด)"
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40"
                    autoFocus
                  />
                </div>

                {/* Admin Phone */}
                <div className="space-y-1 text-left">
                  <label className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    <span>เบอร์โทรศัพท์ที่ติดต่อได้ <span className="text-rose-400">*</span></span>
                  </label>
                  <input
                    type="tel"
                    value={adminPhone}
                    onChange={(e) => setAdminPhone(e.target.value)}
                    placeholder="เช่น 093-792-5665"
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40"
                  />
                </div>
              </div>

              {/* Navigation Buttons */}
              <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setStep('warning')}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center space-x-1.5 transition-all"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>ย้อนกลับ</span>
                </button>

                <button
                  type="button"
                  onClick={handleProceedFromAdminInfo}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold flex items-center space-x-1.5 shadow-md shadow-amber-500/20 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
                >
                  <span>ขั้นตอนถัดไป</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 3: REASON (ระบุเหตุผลการเคลียร์ข้อมูล)                                   */}
          {/* ========================================================================= */}
          {step === 'reason' && (
            <div className="space-y-4 py-1 animate-fadeIn">
              <div className="space-y-1 text-center sm:text-left">
                <h4 className="text-base font-extrabold text-white flex items-center justify-center sm:justify-start space-x-2">
                  <FileText className="w-4 h-4 text-cyan-400" />
                  <span>ระบุเหตุผลที่จะทำการเคลียร์ข้อมูล</span>
                </h4>
                <p className="text-xs text-slate-400">
                  ระบบจะบันทึกเหตุผลนี้ไว้ในประวัติเพื่อใช้อ้างอิงการตรวจสอบ
                </p>
              </div>

              {/* Textarea Reason */}
              <div className="space-y-1.5 text-left">
                <label className="text-xs font-bold text-slate-300 block">
                  เหตุผลความจำเป็น <span className="text-rose-400">*</span>:
                </label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="เช่น ล้างข้อมูลรูปภาพหลังเสร็จสิ้นกิจกรรมปีใหม่เพื่อประหยัดพื้นที่จัดเก็บ..."
                  className="w-full text-xs sm:text-sm p-3 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/40 resize-none leading-relaxed"
                  autoFocus
                />
              </div>

              {/* Quick Chips Preset */}
              <div className="space-y-1.5 text-left">
                <span className="text-[11px] font-bold text-slate-400">เลือกเหตุผลด่วน:</span>
                <div className="flex flex-wrap gap-1.5">
                  {quickReasons.map((qr, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setReason(qr)}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all text-left ${
                        reason === qr
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-bold'
                          : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700 text-slate-300'
                      }`}
                    >
                      {qr}
                    </button>
                  ))}
                </div>
              </div>

              {/* Navigation Buttons */}
              <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setStep('admin_info')}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center space-x-1.5 transition-all"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>ย้อนกลับ</span>
                </button>

                <button
                  type="button"
                  onClick={handleProceedFromReason}
                  className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-extrabold flex items-center space-x-1.5 shadow-md shadow-cyan-500/20 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
                >
                  <span>ตกลงและเลือกคำสั่ง</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 4: ACTION SELECTION (เลือกคำสั่ง 2 ปุ่ม ลบรูป / ล้างข้อมูล)              */}
          {/* ========================================================================= */}
          {step === 'action_select' && (
            <div className="space-y-4 py-1 animate-fadeIn">
              
              {/* Summary of Verifier */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
                <div className="flex items-center justify-between text-slate-400 text-[11px]">
                  <span>👤 แอดมิน: <strong className="text-white">{adminName}</strong></span>
                  <span>📞 <strong className="text-slate-300 font-mono">{adminPhone}</strong></span>
                </div>
                <div className="text-[11px] text-slate-400 truncate">
                  📝 เหตุผล: <span className="text-cyan-300 font-medium">{reason}</span>
                </div>
              </div>

              <div className="space-y-1 text-center sm:text-left">
                <h4 className="text-sm sm:text-base font-extrabold text-white">
                  เลือกการดำเนินการเคลียร์ข้อมูล:
                </h4>
                <p className="text-xs text-slate-400">
                  กรุณาเลือกรายการที่ต้องการดำเนินการ (ระบบจะบันทึก Log ทันทีที่กด):
                </p>
              </div>

              {/* 2 Distinct Action Cards */}
              <div className="grid grid-cols-1 gap-3 pt-1">
                
                {/* Action 1: ลบรูปหลังจบงาน */}
                <div
                  onClick={handleExecutePurge}
                  className="p-4 rounded-2xl bg-gradient-to-r from-rose-950/60 to-slate-900 border-2 border-rose-500/40 hover:border-rose-400 cursor-pointer transition-all hover:scale-[1.01] active:scale-98 shadow-md group"
                >
                  <div className="flex items-center space-x-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                      <Trash2 className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center justify-between">
                        <h5 className="text-sm font-extrabold text-rose-200 group-hover:text-white transition-colors">
                          🗑️ ลบรูปหลังจบงาน
                        </h5>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          ประหยัดพื้นที่ Cloud
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        ล้างเฉพาะไฟล์รูปสลิปและรูปถ่ายบัตรที่สำรองไว้ (ข้อมูลรายชื่อและยอดเงินยังคงอยู่ 100%)
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action 2: ล้างข้อมูลลงทะเบียน */}
                <div
                  onClick={handleExecuteReset}
                  className="p-4 rounded-2xl bg-gradient-to-r from-rose-900/40 to-slate-900 border-2 border-rose-600/50 hover:border-rose-400 cursor-pointer transition-all hover:scale-[1.01] active:scale-98 shadow-md group"
                >
                  <div className="flex items-center space-x-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-rose-600/20 border border-rose-600/40 text-rose-300 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                      <RotateCcw className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center justify-between">
                        <h5 className="text-sm font-extrabold text-rose-200 group-hover:text-white transition-colors">
                          🔄 ล้างข้อมูลลงทะเบียน
                        </h5>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-600/30 text-rose-200 border border-rose-500/40 font-mono">
                          {totalRegistrations} รายการ
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        ล้างข้อมูลผู้ลงทะเบียนและคะแนนประกวดทั้งหมด (รายชื่อ 95 สมาชิกหลักปลอดภัย 100%)
                      </p>
                    </div>
                  </div>
                </div>

              </div>

              {/* Navigation Back */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setStep('reason')}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center space-x-1.5 transition-all"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>ย้อนกลับ</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs font-bold transition-all"
                >
                  ยกเลิกและปิด
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 5: AUDIT LOGS HISTORY (ประวัติการใช้งานย้อนหลัง)                         */}
          {/* ========================================================================= */}
          {step === 'audit_logs' && (
            <div className="space-y-4 py-1 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div className="text-left">
                  <h4 className="text-sm sm:text-base font-extrabold text-amber-300 flex items-center space-x-2">
                    <History className="w-4 h-4" />
                    <span>ประวัติการกดเคลียร์ข้อมูล (Audit Log)</span>
                  </h4>
                  <p className="text-xs text-slate-400">
                    บันทึกประวัติการกระทำเพื่อความปลอดภัยและความโปร่งใส ({auditLogs.length} รายการ)
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setStep('warning')}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center space-x-1 transition-all"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>กลับ</span>
                </button>
              </div>

              {/* Logs List Container */}
              <div className="max-h-[320px] overflow-y-auto space-y-2.5 pr-1 divide-y divide-slate-800">
                {auditLogs.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-xs space-y-2">
                    <ShieldCheck className="w-8 h-8 text-slate-600 mx-auto" />
                    <p>ยังไม่มีประวัติการกดเคลียร์ข้อมูลในระบบ</p>
                  </div>
                ) : (
                  auditLogs.map((log) => (
                    <div key={log.id} className="pt-2.5 first:pt-0 space-y-1 text-left text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white flex items-center space-x-1.5">
                          <User className="w-3.5 h-3.5 text-amber-400" />
                          <span>{log.adminName}</span>
                          <span className="text-slate-400 font-mono text-[11px]">({log.adminPhone})</span>
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono flex items-center space-x-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>{log.formattedTime}</span>
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.actionType === 'reset_registrations'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}>
                          {log.actionLabel}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-300 bg-slate-950/80 p-2 rounded-lg border border-white/5">
                        <span className="text-slate-500 font-bold">เหตุผล: </span>
                        <span>{log.reason}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-between items-center text-[11px] text-slate-500">
                <span>🔒 บันทึกความปลอดภัยของระบบ Triple T Form</span>
                <button
                  type="button"
                  onClick={() => setStep('warning')}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
                >
                  ปิดหน้าประวัติ
                </button>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
