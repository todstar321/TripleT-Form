import React, { useState, useEffect } from 'react';
import { 
  X, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  User, 
  Phone, 
  Mail, 
  Shirt, 
  Gift, 
  FileImage, 
  CreditCard, 
  ExternalLink, 
  Download, 
  Check, 
  AlertCircle, 
  Sparkles, 
  Eye, 
  Copy, 
  Maximize2,
  Tag,
  Users,
  Edit3,
  History,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';
import AdminEditAttendeeModal from './AdminEditAttendeeModal';
import { formatThaiDisplayDateTime, fetchAuditLogsFromCloud } from '../utils/supabaseClient';

export default function AttendeeInspectionModal({
  isOpen,
  onClose,
  attendee,
  onCheckIn,
  onShirtReceive,
  onViewTicket,
  onUpdateAttendee,
  eventConfig = {}
}) {
  const [currentAttendee, setCurrentAttendee] = useState(attendee);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [isSlipFullView, setIsSlipFullView] = useState(false);

  // Admin Edit Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editModalInitialTab, setEditModalInitialTab] = useState('financial');

  // Audit Trail State
  const [auditLogs, setAuditLogs] = useState([]);
  const [isLoadingAuditLogs, setIsLoadingAuditLogs] = useState(false);

  // Sync with prop when changed
  useEffect(() => {
    setCurrentAttendee(attendee);
  }, [attendee]);

  // Load audit logs from Cloud when opened
  useEffect(() => {
    if (isOpen && currentAttendee?.ticketNo) {
      setIsLoadingAuditLogs(true);
      fetchAuditLogsFromCloud(currentAttendee.ticketNo)
        .then((logs) => {
          if (Array.isArray(logs)) {
            setAuditLogs(logs);
          }
        })
        .catch((err) => console.error('Error fetching audit logs:', err))
        .finally(() => setIsLoadingAuditLogs(false));
    }
  }, [isOpen, currentAttendee?.ticketNo]);

  if (!isOpen || !currentAttendee) return null;

  const isCheckedIn = !!currentAttendee.checkedIn;
  const isShirtReceived = !!currentAttendee.shirtReceived;
  const slipImage = currentAttendee.slipUrl || currentAttendee.paymentSlip;
  const slipData = currentAttendee.slipDetails || {};
  const regDateTime = formatThaiDisplayDateTime(currentAttendee.createdAt || currentAttendee.timestamp || currentAttendee.slipUploadedAt);

  const handleCopyPhone = () => {
    if (currentAttendee.phone) {
      navigator.clipboard.writeText(currentAttendee.phone.replace(/-/g, ''));
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div 
        className="relative bg-slate-900 rounded-3xl border border-amber-500/40 shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ============================================================== */}
        {/* MODAL HEADER                                                   */}
        {/* ============================================================== */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 px-5 sm:px-7 py-4 border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-400/50 shadow-inner">
              <span className="font-mono font-black text-amber-300 text-sm sm:text-base tracking-wider">
                {currentAttendee.ticketNo || 'SME-001'}
              </span>
            </div>
            <div>
              <div className="flex items-center space-x-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-white leading-tight">
                  {currentAttendee.name}
                </h3>
                {currentAttendee.nickname && (
                  <span className="text-amber-400 text-xs sm:text-sm font-semibold">
                    ({currentAttendee.nickname})
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-1.5 text-xs text-slate-400 font-mono mt-0.5">
                <Calendar className="w-3.5 h-3.5 text-amber-400/80 shrink-0" />
                <span>ลงทะเบียนเมื่อ: <strong className="text-slate-200">{regDateTime}</strong></span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ============================================================== */}
        {/* MODAL BODY (SCROLLABLE)                                        */}
        {/* ============================================================== */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-xs sm:text-sm">
          
          {/* Top Status Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            {/* 1. สังกัด */}
            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between space-y-1">
              <span className="text-[11px] text-slate-400 flex items-center space-x-1">
                <Users className="w-3 h-3 text-indigo-400" />
                <span>ประเภท & สังกัด</span>
              </span>
              <div className="font-bold text-white text-xs sm:text-sm truncate">
                {currentAttendee.regType === 'member' ? (
                  (currentAttendee.club || '').includes('โรตารี่') ? (
                    <span className="text-red-400 font-extrabold">สมาชิก {currentAttendee.club}</span>
                  ) : (
                    <span className="text-indigo-300">สมาชิก {currentAttendee.club || 'สงสพัท'}</span>
                  )
                ) : (
                  <span className="text-emerald-300">แขกผู้มีเกียรติ ({currentAttendee.club || 'สงสพัท'})</span>
                )}
              </div>
              {currentAttendee.memberCode && (
                <span className="text-[10px] text-amber-400 font-mono">
                  รหัส: {currentAttendee.memberCode}
                </span>
              )}
            </div>

            {/* 2. สถานะเข้างาน */}
            <div className={`p-3 rounded-2xl border flex flex-col justify-between space-y-1 ${
              isCheckedIn 
                ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300' 
                : 'bg-slate-950/40 border-white/10 text-slate-300'
            }`}>
              <span className="text-[11px] text-slate-400 flex items-center space-x-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>สถานะเข้างาน</span>
              </span>
              <div className="font-bold text-xs sm:text-sm">
                {isCheckedIn ? (
                  <span className="text-emerald-300 flex items-center space-x-1">
                    <span>✓ เข้างานแล้ว</span>
                  </span>
                ) : (
                  <span className="text-slate-400">⏳ ยังไม่เข้างาน</span>
                )}
              </div>
              {isCheckedIn && currentAttendee.checkedInAt && (
                <span className="text-[10px] text-emerald-400 font-mono">
                  เวลา: {currentAttendee.checkedInAt}
                </span>
              )}
            </div>

            {/* 3. เสื้อที่ระลึก */}
            <div className={`p-3 rounded-2xl border flex flex-col justify-between space-y-1 ${
              isShirtReceived 
                ? 'bg-teal-950/30 border-teal-500/40 text-teal-300' 
                : 'bg-slate-950/40 border-white/10 text-slate-300'
            }`}>
              <span className="text-[11px] text-slate-400 flex items-center space-x-1">
                <Shirt className="w-3 h-3 text-amber-400" />
                <span>เสื้อที่ระลึก</span>
              </span>
              <div className="font-bold text-xs sm:text-sm">
                {currentAttendee.hasShirt ? (
                  <span>ไซส์ {currentAttendee.shirtSize} ({currentAttendee.shirtGender || 'ทั่วไป'})</span>
                ) : (
                  <span className="text-slate-500">ไม่ได้รับสิทธิ์</span>
                )}
              </div>
              {currentAttendee.hasShirt && (
                <span className={`text-[10px] font-semibold ${isShirtReceived ? 'text-teal-300' : 'text-amber-400'}`}>
                  {isShirtReceived ? `✓ รับแล้ว (${currentAttendee.shirtReceivedAt || ''})` : '📦 ยังไม่ได้รับ'}
                </span>
              )}
            </div>

            {/* 4. ของขวัญปีใหม่ */}
            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between space-y-1">
              <span className="text-[11px] text-slate-400 flex items-center space-x-1">
                <Gift className="w-3 h-3 text-amber-400" />
                <span>ของขวัญปีใหม่</span>
              </span>
              <div className="font-bold text-xs sm:text-sm">
                {currentAttendee.giftNumber ? (
                  <span className="text-amber-300 font-mono">🎁 #{currentAttendee.giftNumber}</span>
                ) : (
                  <span className="text-slate-500">-</span>
                )}
              </div>
              {currentAttendee.giftRegisteredAt && (
                <span className="text-[10px] text-amber-400/80 font-mono">
                  ลงทะเบียน: {currentAttendee.giftRegisteredAt}
                </span>
              )}
            </div>
          </div>

          {/* Main 2-Column Split: Details & Bank Slip */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            
            {/* LEFT COLUMN: Attendee Info (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-white/5 rounded-2xl p-4 sm:p-5 border border-white/10 space-y-3.5">
                <div className="flex items-center justify-between pb-2 border-b border-white/10 flex-wrap gap-2">
                  <h4 className="font-bold text-white text-xs sm:text-sm flex items-center space-x-2">
                    <User className="w-4 h-4 text-amber-400" />
                    <span>ข้อมูลส่วนตัวและการลงทะเบียน</span>
                  </h4>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditModalInitialTab('personal');
                        setIsEditModalOpen(true);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold text-[11px] flex items-center space-x-1 transition-all hover:scale-105 cursor-pointer shadow-sm"
                      title="แก้ไขชื่อ เบอร์โทร สังกัด ไซซ์เสื้อ"
                    >
                      <Edit3 className="w-3 h-3 text-amber-400" />
                      <span>แก้ไขข้อมูล</span>
                    </button>
                    <span className="text-[10px] text-slate-400 font-mono">
                      ID: {currentAttendee.ticketNo}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-300">
                  {/* Photos: Check-in Photo & Shirt Photo */}
                  {(currentAttendee.photoUrl || currentAttendee.shirtPhoto) && (
                    <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {/* Check-in photo */}
                      {currentAttendee.photoUrl && (
                        <div className="flex items-center space-x-3 p-2.5 rounded-xl bg-slate-950/40 border border-amber-500/30">
                          <img 
                            src={currentAttendee.photoUrl} 
                            alt={currentAttendee.name}
                            className="w-14 h-14 rounded-xl object-cover border-2 border-amber-400/70 shadow-md shrink-0" 
                          />
                          <div className="space-y-0.5 min-w-0">
                            <span className="text-[11px] font-bold text-amber-300 block truncate">📸 รูปถ่ายเข้างาน</span>
                            <span className="text-[10px] text-slate-400 block truncate">ประกวดแต่งกาย / ยืนยันตัวตน</span>
                            <a 
                              href={currentAttendee.photoUrl} 
                              target="_blank" 
                              rel="noreferrer"
                              className="text-[10px] text-amber-400 hover:underline inline-flex items-center space-x-1"
                            >
                              <Eye className="w-3 h-3" />
                              <span>ดูรูปเต็ม</span>
                            </a>
                          </div>
                        </div>
                      )}

                      {/* Shirt photo */}
                      {currentAttendee.shirtPhoto && (
                        <div className="flex items-center space-x-3 p-2.5 rounded-xl bg-slate-950/40 border border-teal-500/30">
                          <img 
                            src={currentAttendee.shirtPhoto} 
                            alt={currentAttendee.name}
                            className="w-14 h-14 rounded-xl object-cover border-2 border-teal-400/70 shadow-md shrink-0" 
                          />
                          <div className="space-y-0.5 min-w-0">
                            <span className="text-[11px] font-bold text-teal-300 block truncate">👕 รูปถ่ายรับเสื้อ VIP</span>
                            <span className="text-[10px] text-slate-400 block truncate">ทำเนียบผู้ได้รับเสื้อ 15 คน</span>
                            <a 
                              href={currentAttendee.shirtPhoto} 
                              target="_blank" 
                              rel="noreferrer"
                              className="text-[10px] text-teal-400 hover:underline inline-flex items-center space-x-1"
                            >
                              <Eye className="w-3 h-3" />
                              <span>ดูรูปเต็ม</span>
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Full Name */}
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">ชื่อ - นามสกุล</span>
                    <span className="font-bold text-white text-xs sm:text-sm block">
                      {currentAttendee.name}
                    </span>
                  </div>

                  {/* Nickname */}
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">ชื่อเล่น</span>
                    <span className="font-semibold text-amber-300 text-xs sm:text-sm block">
                      {currentAttendee.nickname || '-'}
                    </span>
                  </div>

                  {/* Phone */}
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">เบอร์โทรศัพท์</span>
                    <div className="flex items-center space-x-2 mt-0.5">
                      <span className="font-mono font-bold text-white">
                        {currentAttendee.phone || '-'}
                      </span>
                      {currentAttendee.phone && (
                        <div className="flex items-center space-x-1">
                          <a
                            href={`tel:${currentAttendee.phone.replace(/[^0-9]/g, '')}`}
                            className="p-1 rounded-md bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-colors"
                            title="โทรออก"
                          >
                            <Phone className="w-3 h-3" />
                          </a>
                          <button
                            type="button"
                            onClick={handleCopyPhone}
                            className="p-1 rounded-md bg-white/10 text-slate-300 hover:text-white hover:bg-white/20 transition-colors cursor-pointer"
                            title="คัดลอกเบอร์โทร"
                          >
                            {copiedPhone ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">อีเมล</span>
                    <span className="font-medium text-slate-300 truncate block">
                      {currentAttendee.email || '-'}
                    </span>
                  </div>

                  {/* Recommender (for guests) */}
                  {currentAttendee.regType === 'guest' && (
                    <div className="sm:col-span-2 p-2.5 rounded-xl bg-slate-950/40 border border-white/5">
                      <span className="text-[10px] text-slate-400 block">ผู้แนะนำ / ผู้เชิญ (Recommender):</span>
                      <span className="font-bold text-amber-300 text-xs sm:text-sm">
                        {currentAttendee.recommenderName || currentAttendee.recommender || '-'}
                      </span>
                    </div>
                  )}

                  {/* Download Tracking */}
                  <div className="sm:col-span-2 pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
                    <span>ประวัติการดาวน์โหลดบัตร:</span>
                    <span className="font-mono text-slate-200">
                      {currentAttendee.downloadCount > 0 ? (
                        <span className="text-emerald-400 font-bold">✓ โหลดแล้ว {currentAttendee.downloadCount} ครั้ง (ล่าสุด: {currentAttendee.lastDownloadedAt || '-'})</span>
                      ) : (
                        <span className="text-slate-500">⏳ ยังไม่ดาวน์โหลดบัตร</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Financial Summary Card */}
              <div className="bg-gradient-to-br from-amber-500/10 via-slate-900 to-slate-900 rounded-2xl p-4 sm:p-5 border border-amber-500/30 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-white/10 flex-wrap gap-2">
                  <h4 className="font-bold text-amber-300 text-xs sm:text-sm flex items-center space-x-2">
                    <CreditCard className="w-4 h-4 text-amber-400" />
                    <span>สรุปการชำระเงินค่าลงทะเบียน</span>
                  </h4>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditModalInitialTab('financial');
                        setIsEditModalOpen(true);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold text-[11px] flex items-center space-x-1 transition-all hover:scale-105 cursor-pointer shadow-sm"
                      title="แก้ไขยอดเงินที่โอนจริง หรือสลิป"
                    >
                      <Edit3 className="w-3 h-3 text-amber-400" />
                      <span>แก้ไขยอดเงิน / สลิป</span>
                    </button>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      currentAttendee.paymentStatus === 'paid' 
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}>
                      {currentAttendee.paymentStatus === 'paid' ? 'ชำระแล้ว' : 'รอตรวจสอบ'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-2.5 rounded-xl bg-slate-950/50 border border-white/5">
                    <span className="text-[10px] text-slate-400 block">ยอดที่ต้องชำระตามเกณฑ์:</span>
                    <span className="text-sm sm:text-base font-extrabold text-white font-mono">
                      ฿{currentAttendee.amount?.toLocaleString() || 500}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-950/50 border border-white/5">
                    <span className="text-[10px] text-slate-400 block">ยอดเงินที่โอนจริง:</span>
                    <span className="text-sm sm:text-base font-extrabold text-amber-400 font-mono">
                      ฿{(currentAttendee.paidAmount || currentAttendee.amount)?.toLocaleString()}
                    </span>
                  </div>
                </div>

                {currentAttendee.contributionAmount > 0 && (
                  <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-center space-x-2 text-emerald-300">
                    <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="text-[11px] font-bold">
                      ขอบพระคุณสำหรับเงินสมทบกิจกรรมเพิ่มเติม: +฿{currentAttendee.contributionAmount.toLocaleString()} บาท
                    </span>
                  </div>
                )}

                {currentAttendee.shortage > 0 && (
                  <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-500/30 flex items-center space-x-2 text-rose-300">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span className="text-[11px] font-bold">
                      ยอดเงินโอนขาดอีก: ฿{currentAttendee.shortage.toLocaleString()} บาท
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: Bank Slip Verification (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-white/5 rounded-2xl p-4 sm:p-5 border border-white/10 space-y-3.5 h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-white/10">
                    <h4 className="font-bold text-white text-xs sm:text-sm flex items-center space-x-2">
                      <FileImage className="w-4 h-4 text-amber-400" />
                      <span>สลิปธนาคารที่แนบมา</span>
                    </h4>
                    {slipImage && (
                      <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                        ✓ แนบสลิปแล้ว
                      </span>
                    )}
                  </div>

                  {slipImage ? (
                    <div className="mt-3 space-y-3">
                      {/* Slip Image Thumbnail with Fullscreen Click */}
                      <div 
                        onClick={() => setIsSlipFullView(true)}
                        className="relative rounded-2xl overflow-hidden border-2 border-amber-400/40 shadow-xl bg-black cursor-pointer group max-h-[260px] flex items-center justify-center"
                        title="คลิกเพื่อขยายดูสลิปขนาดเต็ม"
                      >
                        <img 
                          src={slipImage} 
                          alt="Slip Preview" 
                          className="w-full h-auto max-h-[260px] object-contain group-hover:scale-105 transition-transform" 
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2 text-white font-bold text-xs">
                          <Maximize2 className="w-4 h-4 text-amber-400" />
                          <span>แตะเพื่อขยายเต็มจอ</span>
                        </div>
                      </div>

                      {/* Action buttons for slip */}
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setIsSlipFullView(true)}
                          className="py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-amber-400" />
                          <span>ดูรูปสลิปเต็มจอ</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditModalInitialTab('financial');
                            setIsEditModalOpen(true);
                          }}
                          className="py-2 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 font-semibold text-xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer text-center"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>เปลี่ยนสลิป / แก้ไข</span>
                        </button>
                      </div>

                      {/* Slip OCR Extracted Details (if available) */}
                      <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5 space-y-2 text-[11px]">
                        <span className="font-bold text-slate-300 block pb-1 border-b border-white/5">
                          🔍 ข้อมูลจากการตรวจสอบสลิป (AI OCR):
                        </span>
                        
                        <div className="space-y-1 text-slate-400">
                          {slipData.senderName && (
                            <div className="flex justify-between">
                              <span>ชื่อผู้โอน:</span>
                              <strong className="text-slate-200">{slipData.senderName}</strong>
                            </div>
                          )}
                          {slipData.receiverAccount && (
                            <div className="flex justify-between">
                              <span>บัญชีปลายทาง:</span>
                              <strong className="text-slate-200">{slipData.receiverAccount}</strong>
                            </div>
                          )}
                          {(slipData.transferDate || slipData.transferTime) && (
                            <div className="flex justify-between">
                              <span>เวลาโอนในสลิป:</span>
                              <strong className="text-slate-200">{slipData.transferDate} {slipData.transferTime}</strong>
                            </div>
                          )}
                          {slipData.refNo && (
                            <div className="flex justify-between">
                              <span>รหัสอ้างอิง (Ref):</span>
                              <strong className="text-slate-200 font-mono">{slipData.refNo}</strong>
                            </div>
                          )}
                          <div className="flex justify-between pt-1 border-t border-white/5">
                            <span>เวลาอัปโหลดเข้าระบบ:</span>
                            <strong className="text-amber-400 font-mono">
                              {formatThaiDisplayDateTime(currentAttendee.slipUploadedAt || currentAttendee.createdAt || currentAttendee.timestamp)}
                            </strong>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-10 px-4 text-center space-y-3 rounded-xl bg-slate-950/40 border border-white/5 mt-3">
                      <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                        <FileImage className="w-6 h-6 opacity-40" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-bold text-slate-300">ไม่มีการแนบสลิปโอนเงิน</p>
                        <p className="text-[11px] text-slate-500">
                          (ได้รับการยกเว้นค่าลงทะเบียน หรือลงทะเบียนพิเศษโดยแอดมิน)
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setEditModalInitialTab('financial');
                          setIsEditModalOpen(true);
                        }}
                        className="py-1.5 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-bold inline-flex items-center space-x-1"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>แนบสลิปใหม่</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* ============================================================== */}
          {/* ADMIN AUDIT TRAIL / EDIT HISTORY SECTION                       */}
          {/* ============================================================== */}
          <div className="bg-slate-950/70 rounded-2xl p-4 sm:p-5 border border-white/10 space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-white/10 flex-wrap gap-2">
              <h4 className="font-bold text-white text-xs sm:text-sm flex items-center space-x-2">
                <History className="w-4 h-4 text-amber-400" />
                <span>ประวัติการแก้ไขข้อมูลโดยแอดมิน (Admin Audit Trail)</span>
              </h4>
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-white/10 text-slate-300 font-mono">
                {isLoadingAuditLogs ? 'กำลังโหลด...' : auditLogs.length > 0 ? `บันทึกแล้ว ${auditLogs.length} ครั้ง` : 'ไม่มีประวัติการแก้ไข'}
              </span>
            </div>

            {auditLogs.length > 0 ? (
              <div className="space-y-3">
                {auditLogs.map((log, index) => (
                  <div
                    key={log.id || index}
                    className="p-3.5 rounded-xl bg-slate-900 border border-amber-500/20 space-y-2 text-xs"
                  >
                    {/* Log Header: Time & Admin Name */}
                    <div className="flex items-center justify-between flex-wrap gap-2 pb-1.5 border-b border-white/5">
                      <div className="flex items-center space-x-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-bold font-mono text-[10px]">
                          🕒 {log.formattedTime || formatThaiDisplayDateTime(log.timestamp)}
                        </span>
                        <span className="font-bold text-white">
                          👤 ผู้แก้ไข: <span className="text-amber-200">{log.adminName}</span>
                        </span>
                      </div>
                      {log.adminPhone && (
                        <span className="text-[11px] text-slate-400 font-mono">
                          📞 {log.adminPhone}
                        </span>
                      )}
                    </div>

                    {/* Log Reason */}
                    {log.reason && (
                      <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs">
                        <strong className="text-amber-300">💬 หมายเหตุที่แก้ไข:</strong> {log.reason}
                      </div>
                    )}

                    {/* Changes Diff List */}
                    {Array.isArray(log.changes) && log.changes.length > 0 && (
                      <div className="space-y-1 pt-1">
                        <span className="text-[10px] text-slate-400 font-semibold block">รายละเอียดสิ่งที่แก้ไข:</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {log.changes.map((ch, ci) => (
                            <div
                              key={ci}
                              className="px-2.5 py-1 rounded-lg bg-slate-950/60 border border-white/5 text-[11px] flex items-center space-x-1.5 flex-wrap"
                            >
                              <span className="text-slate-400 font-medium">• {ch.field}:</span>
                              <span className="text-rose-400 line-through font-mono">{ch.from}</span>
                              <ArrowRight className="w-2.5 h-2.5 text-slate-500 shrink-0" />
                              <span className="text-emerald-400 font-bold font-mono">{ch.to}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-4 px-3 text-center rounded-xl bg-slate-900/40 border border-white/5 text-slate-400 text-xs flex items-center justify-center space-x-2">
                <span>ℹ️ ยังไม่มีประวัติการแก้ไขข้อมูล (เป็นข้อมูลดั้งเดิมตั้งแต่ผู้เข้าร่วมลงทะเบียน)</span>
              </div>
            )}
          </div>

        </div>

        {/* ============================================================== */}
        {/* MODAL FOOTER ACTIONS                                           */}
        {/* ============================================================== */}
        <div className="bg-slate-950 px-5 sm:px-7 py-3.5 border-t border-white/10 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          
          <div className="flex items-center space-x-2 flex-wrap">
            {/* Quick Check-In / Cancel Check-In */}
            {onCheckIn && (
              <button
                type="button"
                onClick={() => onCheckIn(currentAttendee.ticketNo, !isCheckedIn)}
                className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer ${
                  isCheckedIn
                    ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isCheckedIn ? 'ยกเลิกการเข้างาน' : '⚡ เช็คอินเข้างานทันที'}</span>
              </button>
            )}

            {/* Quick Shirt Receive / Cancel Shirt */}
            {onShirtReceive && currentAttendee.hasShirt && (
              <button
                type="button"
                onClick={() => onShirtReceive(currentAttendee.ticketNo, !isShirtReceived)}
                className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer ${
                  isShirtReceived
                    ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40'
                    : 'bg-teal-600 hover:bg-teal-500 text-white shadow-teal-500/20'
                }`}
              >
                <Shirt className="w-4 h-4" />
                <span>{isShirtReceived ? 'ยกเลิกรับเสื้อ' : '👕 บันทึกรับเสื้อ'}</span>
              </button>
            )}

            {/* View E-Ticket */}
            {onViewTicket && (
              <button
                type="button"
                onClick={() => onViewTicket(currentAttendee)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 font-bold text-xs flex items-center space-x-1.5 transition-colors cursor-pointer"
              >
                <Tag className="w-4 h-4 text-amber-400" />
                <span>ดูบัตรเข้างาน (E-Ticket)</span>
              </button>
            )}

            {/* Admin Edit Button */}
            <button
              type="button"
              onClick={() => {
                setEditModalInitialTab('financial');
                setIsEditModalOpen(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center space-x-1.5 shadow-sm transition-all hover:scale-105 cursor-pointer"
            >
              <Edit3 className="w-4 h-4" />
              <span>✏️ แก้ไขข้อมูล / ยอดเงิน</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>

      </div>

      {/* FULL-SCREEN SLIP VIEWER OVERLAY */}
      {isSlipFullView && slipImage && (
        <div 
          className="fixed inset-0 z-60 bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-4 animate-fadeIn"
          onClick={() => setIsSlipFullView(false)}
        >
          <div className="absolute top-4 right-4 flex items-center space-x-2">
            <a
              href={slipImage}
              download={`สลิป_${currentAttendee.ticketNo}_${currentAttendee.name}.jpg`}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-2.5 rounded-full bg-slate-800 text-white hover:bg-slate-700 transition-colors shadow-lg"
              title="ดาวน์โหลดภาพสลิป"
            >
              <Download className="w-5 h-5 text-amber-400" />
            </a>
            <button
              type="button"
              onClick={() => setIsSlipFullView(false)}
              className="p-2.5 rounded-full bg-slate-800 text-white hover:bg-slate-700 transition-colors shadow-lg"
              title="ปิดมุมมองเต็มจอ"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="max-w-xl max-h-[85vh] p-2" onClick={(e) => e.stopPropagation()}>
            <img 
              src={slipImage} 
              alt="Slip Full" 
              className="w-full h-auto max-h-[85vh] object-contain rounded-2xl border-2 border-amber-400/60 shadow-2xl" 
            />
            <div className="text-center mt-3 text-slate-300 text-xs">
              สลิปการโอนเงินของ: <strong className="text-white">{currentAttendee.name} ({currentAttendee.ticketNo})</strong>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* ADMIN EDIT ATTENDEE MODAL                                      */}
      {/* ============================================================== */}
      <AdminEditAttendeeModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        attendee={currentAttendee}
        initialTab={editModalInitialTab}
        eventConfig={eventConfig}
        onSaveSuccess={(updatedAttendee, newLog) => {
          setCurrentAttendee(updatedAttendee);
          setAuditLogs((prev) => [newLog, ...(prev || [])]);
          if (onUpdateAttendee) {
            onUpdateAttendee(updatedAttendee);
          }
        }}
      />

    </div>
  );
}
