import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  CheckCircle2, 
  Printer, 
  Sparkles, 
  Shirt, 
  Calendar, 
  MapPin, 
  Phone, 
  Mail, 
  User, 
  ShieldCheck, 
  Camera, 
  Download, 
  Smartphone,
  Check
} from 'lucide-react';
import QRCode from 'qrcode';
import TicketImageViewerModal from './TicketImageViewerModal';
import TicketScannerModal from './TicketScannerModal';
import { generateTicketCardImage } from '../utils/ticketCardGenerator';

export default function TicketModal({ 
  isOpen, 
  onClose, 
  ticketData, 
  eventConfig,
  autoOpenDownloadImage = false,
  onRecordDownload
}) {
  const printRef = useRef(null);

  const [qrDataUrl, setQrDataUrl] = useState('');
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [ticketImageInfo, setTicketImageInfo] = useState(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Auto-open download image popup when requested from registration success popup
  useEffect(() => {
    if (isOpen && autoOpenDownloadImage && ticketData && !isImageViewerOpen) {
      handleOpenTicketImage();
    }
  }, [isOpen, autoOpenDownloadImage, ticketData?.ticketNo]);

  const [scannedTextPreview, setScannedTextPreview] = useState('');

  // Generate QR Code with Attendee's Full Scanned Content
  useEffect(() => {
    if (ticketData) {
      const attendeeName = (ticketData.name || '').trim();
      const attendeeNick = ticketData.nickname ? `(${ticketData.nickname.trim()})` : '';
      const attendeeFullLabel = attendeeNick ? `${attendeeName} ${attendeeNick}` : attendeeName;

      let roleClubStr = '';
      const club = ticketData.club ? ticketData.club.trim() : '';

      if (ticketData.regType === 'member') {
        const cleanClub = club.startsWith('สมาชิก') ? club.replace(/^สมาชิก\s*/, '') : (club || 'สงสพัท');
        roleClubStr = `สมาชิก${cleanClub}`;
      } else {
        roleClubStr = club && club !== 'ทั่วไป' && club !== '-' ? `แขกผู้มีเกียรติ (${club})` : 'แขกผู้มีเกียรติ';
      }

      const ticketNoStr = ticketData.ticketNo || 'SME-001';
      // Format: ทีป์ชลิต ทองจันทร์ (ทีป์) [เลขที่บัตร SME-003] - สมาชิกสงสพัท
      const textToScan = `${attendeeFullLabel} [เลขที่บัตร ${ticketNoStr}] - ${roleClubStr}`;
      setScannedTextPreview(textToScan);

      QRCode.toDataURL(
        textToScan,
        {
          width: 220,
          margin: 1,
          color: {
            dark: '#0f172a',
            light: '#ffffff'
          },
          errorCorrectionLevel: 'H'
        },
        (err, url) => {
          if (!err && url) {
            setQrDataUrl(url);
          }
        }
      );
    }
  }, [ticketData]);

  if (!isOpen || !ticketData) return null;

  // Print document
  const handlePrint = () => {
    window.print();
  };

  // Open "บัตรเข้างาน" Image Card Modal
  const handleOpenTicketImage = async () => {
    setIsGeneratingImage(true);
    try {
      const result = await generateTicketCardImage(ticketData, eventConfig);
      setTicketImageInfo(result);
      setIsImageViewerOpen(true);
    } catch (err) {
      console.error('Failed to generate ticket image:', err);
      alert('เกิดข้อผิดพลาดในการสร้างภาพบัตร กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const attendeeNameWithNick = `${ticketData.name || ''}${ticketData.nickname ? ` (${ticketData.nickname})` : ''}`;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto">
        <div className="relative w-full max-w-lg bg-slate-900 border border-white/10 rounded-3xl shadow-2xl p-5 sm:p-8 my-6 text-slate-100 flex flex-col">
          
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all no-print"
            title="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Printable Ticket Area */}
          <div ref={printRef} className="space-y-5 printable-ticket">
            
            {/* Cover Banner Image at Top */}
            {eventConfig?.bannerImage && (
              <div className="relative w-full h-36 sm:h-44 rounded-2xl overflow-hidden border border-white/10 shadow-lg mb-3">
                <img 
                  src={eventConfig.bannerImage} 
                  alt="Event Cover" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent" />
                <div className="absolute bottom-3 left-4">
                  <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-500/90 text-slate-950 shadow-sm">
                    ✨ VIP GUEST PASS
                  </span>
                </div>
              </div>
            )}

            {/* Header Card */}
            <div className="text-center space-y-2 border-b border-white/10 pb-4">
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                <Sparkles className="w-3.5 h-3.5" />
                <span>บัตรลงทะเบียนเข้างาน & ใบเสร็จดิจิทัล (E-Ticket)</span>
              </div>
              
              <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight pt-1">
                {eventConfig?.eventTitle || "งานสังสรรค์ปีใหม่ SME FAN 2026"}
              </h2>

              {/* Ticket No Badge */}
              <div className="pt-1">
                <span className="font-mono text-sm font-bold px-3 py-1 rounded-lg bg-slate-950 border border-white/10 text-amber-400 shadow-inner">
                  เลขที่ลงทะเบียน: {ticketData.ticketNo || "SME-001"}
                </span>
              </div>
            </div>

            {/* Attendee Details Card */}
            <div className="bg-slate-950/70 rounded-2xl p-4 sm:p-5 border border-white/10 space-y-3 text-xs sm:text-sm">
              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <span className="text-slate-400 flex items-center space-x-1.5">
                  <User className="w-4 h-4 text-amber-400" />
                  <span>ชื่อ - นามสกุล:</span>
                </span>
                <span className="font-bold text-white text-right">
                  {attendeeNameWithNick}
                </span>
              </div>

              {ticketData.memberCode && (
                <div className="flex items-center justify-between pb-2 border-b border-white/5">
                  <span className="text-slate-400">รหัสสมาชิก:</span>
                  <span className="font-mono font-bold text-amber-300 text-right">{ticketData.memberCode}</span>
                </div>
              )}

              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <span className="text-slate-400">ประเภทผู้เข้าร่วม:</span>
                <span className="font-semibold text-right">
                  {ticketData.regType === 'member' ? (
                    <span className="text-indigo-300 font-bold">
                      👑 สมาชิก{ticketData.club ? (ticketData.club.startsWith('สมาชิก') ? ticketData.club.replace(/^สมาชิก\s*/, '') : ticketData.club) : 'สงสพัท'}
                    </span>
                  ) : (
                    <span className="text-emerald-300 font-bold">
                      🌟 แขกผู้มีเกียรติ {ticketData.club && ticketData.club !== 'ทั่วไป' && ticketData.club !== '-' ? `(${ticketData.club})` : ''}
                    </span>
                  )}
                </span>
              </div>

              {ticketData.recommender && (
                <div className="flex items-center justify-between pb-2 border-b border-white/5">
                  <span className="text-slate-400">ผู้แนะนำ / ผู้ชักชวน:</span>
                  <span className="font-medium text-amber-300 text-right">{ticketData.recommender}</span>
                </div>
              )}

              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <span className="text-slate-400 flex items-center space-x-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                  <span>เบอร์โทรศัพท์:</span>
                </span>
                <span className="font-mono text-white text-right">{ticketData.phone || "-"}</span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <span className="text-slate-400 flex items-center space-x-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-500" />
                  <span>อีเมล (Email):</span>
                </span>
                <span className="text-indigo-200 text-right font-medium truncate max-w-[220px]">{ticketData.email || "-"}</span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <span className="text-slate-400">ยอดชำระเงิน:</span>
                <div className="text-right">
                  <span className="font-bold text-amber-400">
                    {ticketData.paidAmount ? `${ticketData.paidAmount.toLocaleString()} บาท` : (ticketData.amount > 0 ? `${ticketData.amount.toLocaleString()} บาท` : "เข้างานฟรี (0 บาท)")}
                  </span>
                  {ticketData.contributionAmount > 0 && (
                    <div className="text-[10px] text-emerald-400 font-medium">
                      (ค่าบัตร {ticketData.amount?.toLocaleString()} + เงินสมทบ {ticketData.contributionAmount?.toLocaleString()} บาท)
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">สถานะการชำระเงิน:</span>
                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-xs border border-emerald-500/30">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>แนบสลิปชำระเงินแล้ว</span>
                </span>
              </div>

              {ticketData.slipDetails && (
                <div className="pt-2.5 mt-2.5 border-t border-white/10 space-y-1.5 text-xs">
                  <div className="text-[11px] text-amber-400 font-bold flex items-center space-x-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>ข้อมูลตรวจสอบสลิปโอนเงิน (Slip Verification):</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-300 bg-slate-900/60 p-2.5 rounded-xl border border-white/5">
                    <div>โอนเมื่อ: <span className="text-white font-medium">{ticketData.slipDetails.transferDate} {ticketData.slipDetails.transferTime}</span></div>
                    <div>ผู้โอน: <span className="text-white font-medium">{ticketData.slipDetails.senderName}</span></div>
                    <div className="col-span-2 truncate">เข้าบัญชี: <span className="text-slate-200">{ticketData.slipDetails.receiverAccount}</span></div>
                    <div className="col-span-2">รหัสอ้างอิง: <span className="font-mono text-amber-300 font-bold">{ticketData.slipDetails.refNo}</span></div>
                  </div>
                </div>
              )}
            </div>

            {/* T-Shirt Badge (if eligible) - Centered Horizontally */}
            {ticketData.hasShirt ? (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-amber-600/10 to-yellow-500/20 border border-amber-500/40 text-amber-200 space-y-1.5 text-center">
                <div className="flex items-center justify-center space-x-2 font-bold text-sm text-amber-300">
                  <Shirt className="w-5 h-5 text-amber-400" />
                  <span>🎉 สิทธิพิเศษ: ได้รับเสื้อที่ระลึก 1 ตัว ฟรี!</span>
                </div>
                <div className="text-xs text-slate-200">
                  ขนาด: <strong className="text-white text-sm font-bold">{ticketData.shirtSize} ({ticketData.shirtGender || 'ทั่วไป'})</strong>
                </div>
                <div className="text-[11px] text-amber-400/90 font-medium">
                  * กรุณาแสดงหน้านี้เพื่อรับเสื้อที่ระลึก ณ จุดลงทะเบียนหน้างาน
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-slate-400 text-xs text-center">
                บัตรเข้างานทั่วไป (ขอขอบคุณที่มาร่วมงานสังสรรค์ปีใหม่ SME FAN)
              </div>
            )}

            {/* Event Venue & Date */}
            <div className="space-y-1.5 text-xs text-slate-400 bg-slate-950/40 p-3.5 rounded-xl border border-white/5">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{eventConfig?.eventDate}</span>
              </div>
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{eventConfig?.eventVenue}</span>
              </div>
            </div>

            {/* ----------------------------------------------------------------- */}
            {/* SCANNABLE QR CODE - 2 COLUMNS (Left: QR 35%, Right: Text 65%)      */}
            {/* ----------------------------------------------------------------- */}
            <div className="pt-2 border-t border-white/10 space-y-3">
              <div className="bg-slate-950/80 p-4 sm:p-5 rounded-2xl border border-white/10 shadow-inner">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                  
                  {/* Left Column (35%): QR Code Centered */}
                  <div className="sm:col-span-5 flex flex-col items-center justify-center">
                    {qrDataUrl && (
                      <div className="p-2.5 bg-white rounded-2xl shadow-xl border border-amber-500/30">
                        <img
                          src={qrDataUrl}
                          alt="QR Code"
                          className="w-36 h-36 sm:w-40 sm:h-40 object-contain"
                        />
                      </div>
                    )}
                  </div>

                  {/* Right Column (65%): Instructions & Info */}
                  <div className="sm:col-span-7 space-y-2 text-left">
                    <div>
                      <div className="text-xs sm:text-sm font-bold text-amber-400 flex items-center space-x-1.5">
                        <Camera className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>📱 แสดง QR Code หน้างานให้เจ้าหน้าที่</span>
                      </div>
                      <p className="text-[11px] text-slate-400 pl-5">
                        เจ้าหน้าที่แอดมินจะใช้ระบบสแกนเพื่อลงทะเบียนเข้างาน
                      </p>
                    </div>

                    {/* Attendee Info Card */}
                    <div className="p-3 rounded-xl bg-slate-900/90 border border-white/10 space-y-1.5 text-xs">
                      <div className="font-bold text-white text-sm">
                        👤 {attendeeNameWithNick}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-[11px]">
                        <span className="font-mono text-amber-300 font-bold bg-slate-950 px-2 py-0.5 rounded border border-white/10">
                          เลขที่: {ticketData.ticketNo || "SME-001"}
                        </span>
                        <span className="text-indigo-300 font-medium">
                          {ticketData.regType === 'member' ? `สมาชิก${ticketData.club || 'สงสพัท'}` : 'แขกผู้มีเกียรติ'}
                        </span>
                      </div>
                      <div className="pt-1 border-t border-white/5">
                        <div className="text-[10px] text-emerald-400 font-semibold">✓ ข้อมูลเมื่อแอดมินสแกน:</div>
                        <div className="text-[11px] text-slate-200 bg-emerald-500/10 p-1.5 rounded border border-emerald-500/20 font-medium break-words">
                          {scannedTextPreview || attendeeNameWithNick}
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* Interactive Camera Scanner Button for Testing */}
              <div className="text-center no-print">
                <button
                  type="button"
                  onClick={() => setIsScannerOpen(true)}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 transition-all shadow-sm"
                >
                  <Camera className="w-3.5 h-3.5 text-emerald-400" />
                  <span>📷 ทดสอบเปิดกล้องสแกนบัตรจริง (Admin Scanner)</span>
                </button>
              </div>

              {/* Accreditation Footer */}
              <div className="text-center pt-2 text-slate-500 text-[11px] space-y-0.5 border-t border-white/5">
                <div>© 2026 งานสังสรรค์ปีใหม่ SME FAN 2026</div>
                <div className="text-slate-400 font-medium">นักพัฒนาซอฟต์แวร์ คุณทีป์ชลิต ทองจันทร์ (ผอ.โต๊ด)</div>
              </div>
            </div>

          </div>

          {/* ------------------------------------------------------------- */}
          {/* ACTION BUTTONS (Updated from "พิมพ์/ดาวน์โหลด" to "บัตรเข้างาน") */}
          {/* ------------------------------------------------------------- */}
          <div className="mt-6 pt-4 border-t border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 no-print">
            
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-all order-3 sm:order-1 text-center"
            >
              ปิดหน้าต่าง
            </button>

            <div className="flex items-center space-x-2 order-1 sm:order-2">
              {/* Secondary Print Document Button */}
              <button
                type="button"
                onClick={handlePrint}
                className="px-3.5 py-3 rounded-2xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-slate-300 hover:text-white transition-all flex items-center justify-center space-x-1.5 shrink-0"
                title="พิมพ์เอกสารลงกระดาษ"
              >
                <Printer className="w-4 h-4 text-slate-400" />
                <span className="hidden sm:inline">พิมพ์บัตร</span>
              </button>

              {/* Main Button: "บัตรเข้างาน" (Opens image popup to save to phone) */}
              <button
                type="button"
                onClick={handleOpenTicketImage}
                disabled={isGeneratingImage}
                className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-6 py-3 rounded-2xl text-xs sm:text-sm font-extrabold bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 shadow-xl shadow-amber-500/25 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {isGeneratingImage ? (
                  <>
                    <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>กำลังสร้างภาพบัตร...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-slate-950" />
                    <span>🎫 บัตรเข้างาน (บันทึกรูปภาพ)</span>
                  </>
                )}
              </button>
            </div>

          </div>

        </div>
      </div>

      {/* Mobile Image Viewer Modal */}
      {isImageViewerOpen && ticketImageInfo && (
        <TicketImageViewerModal
          isOpen={isImageViewerOpen}
          onClose={() => setIsImageViewerOpen(false)}
          imageDataUrl={ticketImageInfo.dataUrl}
          imageBlob={ticketImageInfo.blob}
          fileName={ticketImageInfo.fileName}
          ticketData={ticketData}
          onRecordDownload={onRecordDownload}
        />
      )}

      {/* Ticket Scanner Test Modal */}
      {isScannerOpen && (
        <TicketScannerModal
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          registrations={[ticketData]}
        />
      )}
    </>
  );
}
