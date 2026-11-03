import React, { useState } from 'react';
import { 
  AlertTriangle, 
  Trash2, 
  CheckCircle2, 
  X, 
  ShieldCheck, 
  RotateCcw
} from 'lucide-react';

export default function ResetRegistrationsModal({
  isOpen,
  onClose,
  onConfirmReset,
  totalRegistrations = 0
}) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmStep, setConfirmStep] = useState(false);

  if (!isOpen) return null;

  const handleExecuteReset = async () => {
    setIsProcessing(true);
    try {
      await onConfirmReset();
      setIsProcessing(false);
      setConfirmStep(false);
      onClose();
    } catch (err) {
      setIsProcessing(false);
      alert('เกิดข้อผิดพลาดในการล้างข้อมูล: ' + (err?.message || err));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-slate-900 border border-rose-500/30 rounded-3xl shadow-2xl overflow-hidden text-slate-100 flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10 bg-gradient-to-r from-rose-950/40 to-slate-900">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <RotateCcw className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <span>ล้างข้อมูลการลงทะเบียนทั้งหมด</span>
              </h2>
              <p className="text-xs text-rose-300">
                รีเซ็ตข้อมูลรอบทดสอบเพื่อเตรียมเปิดรับลงทะเบียนใหม่
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">

          {/* Current Status Badge */}
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between">
            <span className="text-xs text-rose-200 font-medium">รายการผู้ลงทะเบียนปัจจุบันในระบบ:</span>
            <span className="text-sm font-bold text-rose-400 font-mono">{totalRegistrations} รายการ</span>
          </div>

          {/* What WILL be deleted */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/5 space-y-2.5">
            <h3 className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center space-x-1.5">
              <Trash2 className="w-3.5 h-3.5" />
              <span>ข้อมูลที่จะถูกล้างเป็น 0 (ลบออกจากระบบและ Cloud):</span>
            </h3>
            <ul className="text-xs text-slate-300 space-y-1.5 pl-1">
              <li className="flex items-center space-x-2">
                <span className="text-rose-400">❌</span>
                <span>รายชื่อผู้ลงทะเบียนทั้งหมด (Supabase Cloud + ทุกเครื่อง)</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="text-rose-400">❌</span>
                <span>ประวัติการเช็คอินเข้างาน (รีเซ็ตเป็น 0)</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="text-rose-400">❌</span>
                <span>ประวัติการลงทะเบียนรับเสื้อ (รีเซ็ตเป็น 0)</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="text-rose-400">❌</span>
                <span>ประวัติการลงทะเบียนจับของขวัญ (รีเซ็ตเป็น 0)</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="text-rose-400">❌</span>
                <span>คะแนนกรรมการและการจัดกลุ่มประกวดการแข่งขันทั้งหมด (รีเซ็ตเป็น 0)</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="text-rose-400">❌</span>
                <span>คิวสุ่มของขวัญ Lucky Draw</span>
              </li>
            </ul>
          </div>

          {/* What IS PROTECTED (100% Safe) */}
          <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/20 space-y-2.5">
            <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center space-x-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>ข้อมูลที่ได้รับการปกป้อง (ไม่ถูกลบ 100%):</span>
            </h3>
            <ul className="text-xs text-emerald-200/90 space-y-1.5 pl-1">
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span><strong>สังกัดสนาม 2 สังกัด</strong> (สงสพัท, โรตารี่)</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span><strong>รายชื่อสมาชิกสนามทั้ง 95 ท่าน</strong> ปลอดภัยครบถ้วน</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span><strong>รูปภาพทั้งหมด:</strong> ภาพหน้าปก, รูปหัวฟอร์ม, รูปพื้นหลัง, รูปลายเสื้อ</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span><strong>การตั้งค่า:</strong> บัญชีธนาคาร, วันที่จัดงาน, สถานที่, สิทธิ์แอดมิน</span>
              </li>
            </ul>
          </div>

          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300">
            💡 เมื่อล้างข้อมูลเสร็จ ผู้ที่ลงทะเบียนใหม่คนแรกจะได้รับบัตรเริ่มต้นที่ <strong>SME-001</strong> เรียงตามลำดับครับ
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-white/10 bg-slate-950/60 flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition-all"
          >
            ยกเลิก
          </button>

          {!confirmStep ? (
            <button
              type="button"
              onClick={() => setConfirmStep(true)}
              className="flex items-center space-x-1.5 px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 transition-all hover:scale-105"
            >
              <Trash2 className="w-4 h-4" />
              <span>ล้างข้อมูลการลงทะเบียน</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleExecuteReset}
              disabled={isProcessing}
              className="flex items-center space-x-1.5 px-6 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/40 transition-all animate-pulse"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>{isProcessing ? 'กำลังล้างข้อมูลในระบบและ Cloud...' : '⚠️ ยืนยันล้างข้อมูลทันที'}</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
