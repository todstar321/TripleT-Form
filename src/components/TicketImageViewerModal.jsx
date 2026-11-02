import React, { useState } from 'react';
import { X, Download, Share2, Check, Sparkles, Printer, Smartphone, ZoomIn, ZoomOut } from 'lucide-react';

export default function TicketImageViewerModal({
  isOpen,
  onClose,
  imageDataUrl,
  imageBlob,
  fileName,
  ticketData,
  onRecordDownload
}) {
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);

  if (!isOpen || !imageDataUrl) return null;

  // Handle direct file download
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = imageDataUrl;
    link.download = fileName || `บัตรเข้างาน_${ticketData?.ticketNo || 'SME'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Track download in system
    if (onRecordDownload && ticketData?.ticketNo) {
      onRecordDownload(ticketData.ticketNo);
    }

    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3500);
  };

  // Handle mobile native share (Web Share API)
  const handleShare = async () => {
    if (onRecordDownload && ticketData?.ticketNo) {
      onRecordDownload(ticketData.ticketNo);
    }
    if (navigator.share && imageBlob) {
      try {
        const file = new File([imageBlob], fileName || `บัตรเข้างาน_${ticketData?.ticketNo || 'SME'}.png`, {
          type: 'image/png'
        });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `บัตรเข้างาน SME FAN 2026 - ${ticketData?.name || ''}`,
            text: `บัตรเข้างานงานสังสรรค์ปีใหม่ SME FAN 2026 ของ ${ticketData?.name || ''} (${ticketData?.ticketNo || ''})`,
            files: [file]
          });
          return;
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.warn('Share error, fallback to download:', err);
        }
      }
    }
    // Fallback if share is not available or rejected
    handleDownload();
  };

  // Handle print
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>บัตรเข้างาน ${ticketData?.ticketNo || ''} - ${ticketData?.name || ''}</title>
            <style>
              body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #000; }
              img { max-width: 100%; max-height: 98vh; object-fit: contain; }
              @media print {
                body { background: transparent; }
                img { width: 100%; max-height: none; }
              }
            </style>
          </head>
          <body>
            <img src="${imageDataUrl}" onload="window.print();" />
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const attendeeNameWithNick = `${ticketData?.name || ''}${ticketData?.nickname ? ` (${ticketData.nickname})` : ''}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-5 bg-black/90 backdrop-blur-xl overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-md bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-amber-500/30 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.8)] p-3.5 sm:p-5 my-auto text-slate-100 flex flex-col space-y-3">
        
        {/* Top Header - Compact & Elegant */}
        <div className="flex items-center justify-between pb-2.5 border-b border-white/10">
          <div className="flex items-center space-x-2.5">
            <span className="p-2 rounded-xl bg-gradient-to-br from-amber-400/20 to-yellow-600/30 text-amber-300 border border-amber-500/30 shadow-inner">
              <Sparkles className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-extrabold text-white text-sm sm:text-base tracking-tight flex items-center space-x-1.5">
                <span>บัตรเข้างานดิจิทัล (E-Ticket)</span>
              </h3>
              <p className="text-[11px] text-slate-300 truncate max-w-[210px] sm:max-w-xs">
                เลขที่: <span className="font-mono text-amber-300 font-bold">{ticketData?.ticketNo}</span> • <span className="font-medium text-white">{attendeeNameWithNick}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all"
            title="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Compact Mobile Tip Pill (Saves vertical space so ticket is large & readable) */}
        <div className="px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-amber-500/15 border border-amber-500/30 text-[11px] sm:text-xs text-amber-200 flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-2">
            <Smartphone className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-pulse" />
            <span>แตะค้างที่รูปเพื่อ <strong className="text-amber-300 font-bold">"บันทึกรูปภาพ"</strong> หรือกดปุ่มบันทึกด้านล่าง</span>
          </div>
          <button
            type="button"
            onClick={() => setIsZoomed(!isZoomed)}
            className="hidden sm:flex items-center space-x-1 text-[11px] text-amber-300 hover:text-white font-medium ml-2 px-2 py-0.5 rounded-md bg-white/5 border border-amber-500/20"
            title="ขยายดูภาพ"
          >
            {isZoomed ? <ZoomOut className="w-3 h-3" /> : <ZoomIn className="w-3 h-3" />}
            <span>{isZoomed ? 'ย่อ' : 'ขยาย'}</span>
          </button>
        </div>

        {/* High-Resolution VIP Ticket Image Display */}
        <div 
          onClick={() => setIsZoomed(!isZoomed)}
          className={`relative rounded-2xl overflow-hidden bg-slate-950/80 border border-amber-500/30 shadow-[0_8px_30px_rgba(245,158,11,0.2)] flex items-center justify-center p-1 cursor-pointer transition-all ${
            isZoomed ? 'max-h-[82vh] overflow-y-auto' : 'max-h-[63vh]'
          }`}
          title="แตะเพื่อขยาย / ย่อรูปภาพ"
        >
          <img
            src={imageDataUrl}
            alt={`บัตรเข้างาน ${ticketData?.ticketNo} - ${ticketData?.name}`}
            className={`w-full h-auto object-contain rounded-xl select-none transition-transform duration-200 ${
              isZoomed ? 'scale-105' : 'scale-100'
            }`}
          />
        </div>

        {/* Action Buttons Section */}
        <div className="space-y-2 pt-0.5">
          {/* Main Download Button (Full Width, Luxury Gold Gradient) */}
          <button
            type="button"
            onClick={handleDownload}
            className="w-full flex items-center justify-center space-x-2 py-3.5 px-4 rounded-2xl font-extrabold text-sm sm:text-base bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 shadow-xl shadow-amber-500/25 active:scale-[0.98] transition-all cursor-pointer"
          >
            {downloadSuccess ? (
              <>
                <Check className="w-5 h-5 text-emerald-950" />
                <span>ดาวน์โหลดสำเร็จแล้ว! (ครั้งที่ {(ticketData?.downloadCount || 0) + 1}) ✅</span>
              </>
            ) : (
              <>
                <Download className="w-5 h-5 text-slate-950" />
                <span>💾 ดาวน์โหลดบัตรเข้างาน (บันทึกรูปภาพ)</span>
              </>
            )}
          </button>

          {/* Download Count Indicator */}
          {ticketData?.downloadCount > 0 && (
            <div className="text-center text-[11px] text-amber-300/90 font-medium">
              📥 บัตรนี้บันทึกแล้ว {ticketData.downloadCount} ครั้ง
              {ticketData.lastDownloadedAt && (
                <span className="text-slate-400 ml-1.5">(ล่าสุด: {ticketData.lastDownloadedAt})</span>
              )}
            </div>
          )}

          {/* Secondary Actions Row */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleShare}
              className="flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/15 text-slate-200 border border-white/10 transition-all cursor-pointer active:scale-95"
            >
              <Share2 className="w-4 h-4 text-emerald-400" />
              <span>แชร์ / ส่งรูปภาพ</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-slate-200 border border-white/10 transition-all cursor-pointer active:scale-95"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>พิมพ์เอกสาร</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-1 text-center text-xs text-slate-400 hover:text-white transition-colors"
          >
            ปิดหน้าต่าง
          </button>
        </div>

      </div>
    </div>
  );
}
