import React, { useState } from 'react';
import { 
  Trash2, X, AlertTriangle, ShieldCheck, Download, 
  CheckCircle2, HardDrive, Image as ImageIcon, Camera, FileText 
} from 'lucide-react';
import { purgePhotosInCloud, isSupabaseConfigured } from '../utils/supabaseClient';

export default function StoragePurgeModal({
  isOpen,
  onClose,
  registrations = [],
  onPurgeComplete
}) {
  const [purgeType, setPurgeType] = useState('all'); // 'all' | 'attendees' | 'slips'
  const [confirmText, setConfirmText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [resultSummary, setResultSummary] = useState(null);

  if (!isOpen) return null;

  // Calculate statistics
  const attendeePhotosCount = registrations.filter(r => r.photoUrl || r.costumePhoto).length;
  const slipsCount = registrations.filter(r => r.paymentSlip).length;
  const totalPhotosCount = attendeePhotosCount + slipsCount;

  // Estimate size: avg 250KB per photo/slip
  const estMb = ((totalPhotosCount * 0.25)).toFixed(1);

  // Download all images backup before purge
  const handleDownloadBackup = () => {
    let downloadCount = 0;
    registrations.forEach(r => {
      // 1. Download attendee photo if exists
      if (r.photoUrl) {
        downloadCount++;
        const a = document.createElement('a');
        a.href = r.photoUrl;
        a.download = `photo_${r.ticketNo}_${r.name}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
      // 2. Download payment slip if exists
      if (r.paymentSlip) {
        downloadCount++;
        const a = document.createElement('a');
        a.href = r.paymentSlip;
        a.download = `slip_${r.ticketNo}_${r.name}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    });

    if (downloadCount === 0) {
      alert('ไม่มีรูปภาพในระบบสำหรับดาวน์โหลดครับ');
    } else {
      alert(`กำลังเริ่มดาวน์โหลดรูปภาพและสลิปทั้งหมดจำนวน ${downloadCount} ไฟล์ลงเครื่องของท่านครับ`);
    }
  };

  // Execute Purge
  const handleExecutePurge = async () => {
    if (confirmText.trim() !== 'CONFIRM') {
      alert('กรุณาพิมพ์คำว่า CONFIRM ในช่องยืนยันเพื่อความปลอดภัยครับ');
      return;
    }

    setIsProcessing(true);

    try {
      // 1. Local state & localStorage cleanup
      let clearedPhotos = 0;
      let clearedSlips = 0;

      const updatedRegistrations = registrations.map(r => {
        const item = { ...r };
        if (purgeType === 'attendees' || purgeType === 'all') {
          if (item.photoUrl || item.costumePhoto) clearedPhotos++;
          item.photoUrl = null;
          item.costumePhoto = null;
        }
        if (purgeType === 'slips' || purgeType === 'all') {
          if (item.paymentSlip) clearedSlips++;
          item.paymentSlip = null;
        }
        return item;
      });

      // 2. Cloud Supabase purge if configured
      let cloudResult = null;
      if (isSupabaseConfigured()) {
        cloudResult = await purgePhotosInCloud(purgeType);
      }

      // 3. Notify parent component to update state & localStorage
      if (onPurgeComplete) {
        onPurgeComplete(updatedRegistrations);
      }

      setResultSummary({
        clearedPhotos,
        clearedSlips,
        cloudMessage: cloudResult ? cloudResult.message : 'ล้างแคชในเครื่องเรียบร้อยแล้ว'
      });
      setIsDone(true);
    } catch (err) {
      console.error('Purge error:', err);
      alert('เกิดข้อผิดพลาดในการล้างรูปภาพ: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-lg bg-slate-900 border border-rose-500/30 rounded-3xl p-5 sm:p-6 text-slate-100 shadow-2xl space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center space-x-2.5">
            <span className="p-2.5 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <Trash2 className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-extrabold text-white text-base sm:text-lg">
                ลบรูปภาพทั้งหมดหลังจบงาน (ประหยัดพื้นที่)
              </h3>
              <p className="text-xs text-rose-300/80">
                Storage & Photo Purge Manager • ลบเฉพาะรูปภาพ ข้อมูลรายชื่อและคะแนนยังอยู่ครบ
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Done State */}
        {isDone ? (
          <div className="py-6 text-center space-y-4 animate-scaleUp">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500/40 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-white">
                ล้างรูปภาพเพื่อประหยัดพื้นที่สำเร็จเรียบร้อย!
              </h4>
              <p className="text-xs text-slate-300 mt-1 max-w-sm mx-auto">
                ระบบได้ลบรูปภาพออกจากหน่วยความจำเรียบร้อยแล้ว รายชื่อผู้ร่วมงาน ยอดเงิน และผลการตัดสินทั้งหมดยังคงบันทึกไว้อย่างปลอดภัยครับ
              </p>
            </div>

            <div className="p-3 bg-slate-950 rounded-2xl border border-white/10 text-xs font-mono text-emerald-300 space-y-1">
              <div>📸 เคลียร์รูปถ่ายบุคคล: {resultSummary?.clearedPhotos || 0} รูป</div>
              <div>🧾 เคลียร์สลิปโอนเงิน: {resultSummary?.clearedSlips || 0} รูป</div>
              {resultSummary?.cloudMessage && (
                <div className="text-[11px] text-slate-400 pt-1 border-t border-white/10">
                  ☁️ {resultSummary.cloudMessage}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/25 transition-all"
            >
              เสร็จสิ้น (ปิดหน้าต่าง)
            </button>
          </div>
        ) : (
          <>
            {/* Storage Statistics Card */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-white/10 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center space-x-1.5 font-bold text-slate-200">
                  <HardDrive className="w-4 h-4 text-amber-400" />
                  <span>สรุปรูปภาพที่ถูกจัดเก็บในระบบปัจจุบัน:</span>
                </span>
                <span className="font-mono text-amber-300">ประมาณ ~{estMb} MB</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="p-2.5 rounded-xl bg-slate-900 border border-white/5 space-y-1">
                  <div className="text-[11px] text-slate-400 flex items-center justify-center space-x-1">
                    <Camera className="w-3 h-3 text-cyan-400" />
                    <span>รูปถ่ายบุคคล 1:1</span>
                  </div>
                  <div className="text-lg font-black text-cyan-300 font-mono">
                    {attendeePhotosCount} <span className="text-xs font-normal text-slate-500">รูป</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900 border border-white/5 space-y-1">
                  <div className="text-[11px] text-slate-400 flex items-center justify-center space-x-1">
                    <FileText className="w-3 h-3 text-emerald-400" />
                    <span>สลิปการโอนเงิน</span>
                  </div>
                  <div className="text-lg font-black text-emerald-300 font-mono">
                    {slipsCount} <span className="text-xs font-normal text-slate-500">สลิป</span>
                  </div>
                </div>
              </div>

              {/* Pre-purge backup download button */}
              <button
                type="button"
                onClick={handleDownloadBackup}
                className="w-full py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all flex items-center justify-center space-x-2"
              >
                <Download className="w-3.5 h-3.5" />
                <span>ดาวน์โหลดสำรองรูปภาพทั้งหมดลงเครื่องก่อนกดลบ</span>
              </button>
            </div>

            {/* Purge Scope Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-200 block">
                เลือกขอบเขตการลบรูปภาพเพื่อประหยัดพื้นที่:
              </label>

              <div className="space-y-1.5 text-xs">
                <label className={`flex items-start space-x-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                  purgeType === 'all' 
                    ? 'bg-rose-500/15 border-rose-500/50 text-white' 
                    : 'bg-slate-950/60 border-white/10 text-slate-400 hover:border-white/20'
                }`}>
                  <input
                    type="radio"
                    name="purgeType"
                    checked={purgeType === 'all'}
                    onChange={() => setPurgeType('all')}
                    className="mt-0.5 text-rose-500"
                  />
                  <div>
                    <div className="font-bold text-rose-300">
                      ลบรูปภาพทั้งหมดในระบบ (ทั้งรูปถ่ายบุคคลและสลิป) — แนะนำหลังจบงาน
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      คืนพื้นที่จัดเก็บสูงสุด 100% โดยยังคงรายชื่อ ยอดเงิน และผลคะแนนไว้ครบ
                    </div>
                  </div>
                </label>

                <label className={`flex items-start space-x-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                  purgeType === 'attendees' 
                    ? 'bg-rose-500/15 border-rose-500/50 text-white' 
                    : 'bg-slate-950/60 border-white/10 text-slate-400 hover:border-white/20'
                }`}>
                  <input
                    type="radio"
                    name="purgeType"
                    checked={purgeType === 'attendees'}
                    onChange={() => setPurgeType('attendees')}
                    className="mt-0.5 text-rose-500"
                  />
                  <div>
                    <div className="font-bold text-slate-200">
                      ลบเฉพาะรูปถ่ายบุคคล (รูปเข้างาน / รูปรับเสื้อ)
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      ลบเฉพาะไฟล์ภาพถ่าย 1:1 แต่คงสลิปโอนเงินไว้ตรวจสอบ
                    </div>
                  </div>
                </label>

                <label className={`flex items-start space-x-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                  purgeType === 'slips' 
                    ? 'bg-rose-500/15 border-rose-500/50 text-white' 
                    : 'bg-slate-950/60 border-white/10 text-slate-400 hover:border-white/20'
                }`}>
                  <input
                    type="radio"
                    name="purgeType"
                    checked={purgeType === 'slips'}
                    onChange={() => setPurgeType('slips')}
                    className="mt-0.5 text-rose-500"
                  />
                  <div>
                    <div className="font-bold text-slate-200">
                      ลบเฉพาะสลิปการโอนเงิน (สลิป 500 บาท)
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      ลบภาพสลิปออกเพื่อประหยัดพื้นที่ คงรูปถ่ายและผลงานอื่นๆ ไว้
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Confirmation Input Box */}
            <div className="p-3.5 rounded-2xl bg-rose-950/30 border border-rose-500/30 space-y-2">
              <div className="flex items-center space-x-2 text-rose-300 text-xs font-bold">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>ยืนยันการลบรูปภาพเพื่อความปลอดภัย:</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                การลบรูปภาพจะไม่สามารถกู้คืนได้ กรุณาพิมพ์คำว่า <strong className="text-rose-400 font-mono">CONFIRM</strong> ในช่องด้านล่างเพื่อยืนยัน:
              </p>
              <input
                type="text"
                placeholder="พิมพ์ CONFIRM เพื่อยืนยัน"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="w-full bg-slate-950 border border-rose-500/50 rounded-xl px-3 py-2 text-xs text-white font-mono font-bold tracking-wider placeholder-slate-600 focus:outline-none focus:border-rose-400"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={confirmText.trim() !== 'CONFIRM' || isProcessing}
                onClick={handleExecutePurge}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all ${
                  confirmText.trim() === 'CONFIRM' && !isProcessing
                    ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 cursor-pointer'
                    : 'bg-slate-800 text-slate-600 border border-white/5 cursor-not-allowed'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isProcessing ? 'กำลังล้างข้อมูล...' : 'ยืนยันลบรูปภาพทันที'}</span>
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
