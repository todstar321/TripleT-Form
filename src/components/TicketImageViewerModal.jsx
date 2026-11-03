import React, { useState } from 'react';
import { X, Download, Share2, Check, Sparkles, Printer, Smartphone, ExternalLink, Image as ImageIcon, ZoomIn, ZoomOut } from 'lucide-react';

// Helper to convert base64 data URL to Blob reliably across mobile browsers
function dataUrlToBlob(dataUrl) {
  try {
    const parts = dataUrl.split(';base64,');
    const contentType = (parts[0].split(':')[1]) || 'image/png';
    const raw = window.atob(parts[1]);
    const rawLength = raw.length;
    const uInt8Array = new Uint8Array(rawLength);
    for (let i = 0; i < rawLength; ++i) {
      uInt8Array[i] = raw.charCodeAt(i);
    }
    return new Blob([uInt8Array], { type: contentType });
  } catch (e) {
    console.error('dataUrlToBlob conversion failed:', e);
    return null;
  }
}

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
  const [isSharing, setIsSharing] = useState(false);

  if (!isOpen || !imageDataUrl) return null;

  const safeFileName = fileName || `บัตรเข้างาน_${ticketData?.ticketNo || 'SME'}.png`;
  const resolvedBlob = imageBlob || dataUrlToBlob(imageDataUrl);

  // Trigger download count in system
  const triggerRecordDownload = () => {
    if (onRecordDownload && ticketData?.ticketNo) {
      onRecordDownload(ticketData.ticketNo);
    }
  };

  // Primary Action: Save to Photos on iOS/Android via Web Share, or Download on Desktop
  const handleSaveToDevice = async () => {
    triggerRecordDownload();
    setIsSharing(true);

    // 1. Try Mobile Web Share API with File (Supported on iOS 15+ Safari & Android Chrome)
    // This allows saving DIRECTLY to Apple Photos / Android Gallery with "Save Image" option!
    if (navigator.share && resolvedBlob) {
      try {
        const file = new File([resolvedBlob], safeFileName, { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `บัตรเข้างาน SME FAN 2026 - ${ticketData?.name || ''}`,
            text: `บัตรเข้างานดิจิทัล SME FAN 2026 เลขที่ ${ticketData?.ticketNo || ''} ของ ${ticketData?.name || ''}`,
            files: [file]
          });
          setDownloadSuccess(true);
          setTimeout(() => setDownloadSuccess(false), 4000);
          setIsSharing(false);
          return;
        }
      } catch (err) {
        if (err.name === 'AbortError') {
          // User closed share dialog, cancel smoothly
          setIsSharing(false);
          return;
        }
        console.warn('Native share failed, falling back to Blob download:', err);
      }
    }

    // 2. Direct Blob URL Download (Standard PC & Fallback for Mobile)
    try {
      if (resolvedBlob) {
        const blobUrl = URL.createObjectURL(resolvedBlob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = safeFileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 15000);
      } else {
        const link = document.createElement('a');
        link.href = imageDataUrl;
        link.download = safeFileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (e) {
      console.error('Download error:', e);
      // In worst-case fallback, open in new window
      handleOpenInNewWindow();
    } finally {
      setIsSharing(false);
    }
  };

  // Secondary Direct File Download (.PNG)
  const handleDirectDownload = () => {
    triggerRecordDownload();
    try {
      if (resolvedBlob) {
        const blobUrl = URL.createObjectURL(resolvedBlob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = safeFileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 15000);
      } else {
        const link = document.createElement('a');
        link.href = imageDataUrl;
        link.download = safeFileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3500);
    } catch (e) {
      console.error('Direct download error:', e);
    }
  };

  // Open Full-Resolution Image in New Tab/Window (Guarantees touch-and-hold saving on all mobile browsers)
  const handleOpenInNewWindow = () => {
    triggerRecordDownload();
    try {
      if (resolvedBlob) {
        const blobUrl = URL.createObjectURL(resolvedBlob);
        window.open(blobUrl, '_blank');
      } else {
        window.open(imageDataUrl, '_blank');
      }
    } catch (e) {
      window.open(imageDataUrl, '_blank');
    }
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
      <div className="relative w-full max-w-md bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-amber-500/40 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.85)] p-3.5 sm:p-5 my-auto text-slate-100 flex flex-col space-y-3">
        
        {/* Top Header */}
        <div className="flex items-center justify-between pb-2.5 border-b border-white/10">
          <div className="flex items-center space-x-2.5">
            <span className="p-2 rounded-xl bg-gradient-to-br from-amber-400/25 to-yellow-600/35 text-amber-300 border border-amber-500/35 shadow-inner">
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

          <div className="flex items-center space-x-1">
            <button
              type="button"
              onClick={() => setIsZoomed(!isZoomed)}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all"
              title={isZoomed ? "ย่อขนาดรูป" : "ขยายดูรูป"}
            >
              {isZoomed ? <ZoomOut className="w-4 h-4 text-amber-400" /> : <ZoomIn className="w-4 h-4 text-slate-300" />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all"
              title="ปิดหน้าต่าง"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mobile Instructions Card (iPhone & Android friendly) */}
        <div className="px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-yellow-500/15 to-amber-500/20 border border-amber-500/40 text-xs text-amber-200 space-y-1 shadow-sm">
          <div className="flex items-center space-x-2 font-bold text-amber-300">
            <Smartphone className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
            <span>วิธีบันทึกภาพลงมือถือ (iPhone & Android):</span>
          </div>
          <ol className="list-decimal list-inside text-[11px] text-slate-200 space-y-0.5 pl-1 leading-relaxed">
            <li>กดปุ่มสีทอง <strong className="text-amber-300 font-bold">"📲 บันทึกภาพลงมือถือ / คลังภาพ"</strong> ด้านล่าง แล้วเลือก <strong>"บันทึกภาพ (Save Image)"</strong> หรือแชร์เข้า LINE</li>
            <li>หรือ <strong className="text-amber-300 font-bold">แตะค้างที่รูปภาพ (Long-press)</strong> แล้วเลือก <strong>"บันทึกรูปภาพ"</strong> เข้าอัลบั้มได้ทันที</li>
          </ol>
        </div>

        {/* High-Resolution VIP Ticket Image Display */}
        {/* Enabled native WebkitTouchCallout & userSelect so long-press save works on iPhone & Android */}
        <div 
          className={`relative rounded-2xl overflow-hidden bg-slate-950/90 border-2 border-amber-500/40 shadow-[0_8px_30px_rgba(245,158,11,0.25)] flex items-center justify-center p-1.5 transition-all ${
            isZoomed ? 'max-h-[80vh] overflow-y-auto' : 'max-h-[58vh]'
          }`}
        >
          <img
            src={imageDataUrl}
            alt={`บัตรเข้างาน ${ticketData?.ticketNo} - ${ticketData?.name}`}
            style={{
              WebkitTouchCallout: 'default',
              userSelect: 'auto',
              pointerEvents: 'auto',
              maxHeight: isZoomed ? 'none' : '56vh'
            }}
            className={`w-full h-auto object-contain rounded-xl transition-transform duration-200 ${
              isZoomed ? 'scale-105' : 'scale-100'
            }`}
          />
        </div>

        {/* Action Buttons Section */}
        <div className="space-y-2 pt-0.5">
          {/* Main Primary Action Button: Smart Save to Photos / Share */}
          <button
            type="button"
            onClick={handleSaveToDevice}
            disabled={isSharing}
            className="w-full flex items-center justify-center space-x-2 py-3.5 px-4 rounded-2xl font-extrabold text-sm sm:text-base bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 shadow-xl shadow-amber-500/30 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-75"
          >
            {downloadSuccess ? (
              <>
                <Check className="w-5 h-5 text-emerald-950" />
                <span>บันทึกภาพสำเร็จเรียบร้อย! ✅</span>
              </>
            ) : isSharing ? (
              <>
                <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                <span>กำลังเตรียมบันทึกรูปภาพ...</span>
              </>
            ) : (
              <>
                <Download className="w-5 h-5 text-slate-950" />
                <span>📲 บันทึกภาพลงมือถือ / คลังภาพ (Save to Photos)</span>
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
          <div className="grid grid-cols-3 gap-2">
            {/* 1. Direct File Download */}
            <button
              type="button"
              onClick={handleDirectDownload}
              className="flex items-center justify-center space-x-1 py-2 px-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-slate-200 border border-white/10 transition-all cursor-pointer active:scale-95"
              title="ดาวน์โหลดไฟล์ .PNG ลงอุปกรณ์"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span className="truncate">โหลดไฟล์</span>
            </button>

            {/* 2. Open Full Image */}
            <button
              type="button"
              onClick={handleOpenInNewWindow}
              className="flex items-center justify-center space-x-1 py-2 px-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-slate-200 border border-white/10 transition-all cursor-pointer active:scale-95"
              title="เปิดรูปขนาดใหญ่ในแท็บใหม่เพื่อแตะค้างบันทึก"
            >
              <ExternalLink className="w-3.5 h-3.5 text-sky-400" />
              <span className="truncate">เปิดรูปเต็มจอ</span>
            </button>

            {/* 3. Print */}
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center justify-center space-x-1 py-2 px-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-slate-200 border border-white/10 transition-all cursor-pointer active:scale-95"
              title="พิมพ์เอกสารลงกระดาษ"
            >
              <Printer className="w-3.5 h-3.5 text-emerald-400" />
              <span className="truncate">พิมพ์บัตร</span>
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
