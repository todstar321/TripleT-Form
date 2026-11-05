import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  X,
  Printer,
  Download,
  Share2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  FileSpreadsheet,
  Building2,
  Users,
  HeartHandshake,
  Calendar,
  Clock,
  Sparkles,
  RefreshCw,
  ExternalLink
} from "lucide-react";
import html2canvas from "html2canvas";

const THAI_MONTHS_FULL = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
];

function getThaiA4ExtractionTime(d = new Date()) {
  const day = d.getDate();
  const month = THAI_MONTHS_FULL[d.getMonth()];
  const rawYear = d.getFullYear();
  const year = rawYear > 2500 ? rawYear : rawYear + 543;
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const seconds = String(d.getSeconds()).padStart(2, "0");

  return {
    dateStr: `ข้อมูล ณ วันที่ ${day} ${month} ${year}`,
    timeStr: `ดึงข้อมูลเวลา ${hours}.${minutes}.${seconds} น.`,
    fullStr: `ข้อมูล ณ วันที่ ${day} ${month} ${year} ดึงข้อมูลเวลา ${hours}.${minutes}.${seconds} น.`
  };
}

const ROWS_PER_PAGE = 18;

export default function EventA4PrintModal({
  isOpen,
  onClose,
  registrations = [],
  sponsors = [],
  eventConfig = {}
}) {
  if (!isOpen) return null;

  const [activePageIndex, setActivePageIndex] = useState(0);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [printTimestamp, setPrintTimestamp] = useState(() => getThaiA4ExtractionTime());
  const printContainerRef = useRef(null);

  // Refresh timestamp when opened
  useEffect(() => {
    setPrintTimestamp(getThaiA4ExtractionTime());
  }, [isOpen]);

  // Sort registrations by ticket number
  const sortedRegistrations = useMemo(() => {
    return [...registrations].sort((a, b) => {
      const numA = parseInt((a.ticketNo || "").replace(/\D/g, ""), 10) || 0;
      const numB = parseInt((b.ticketNo || "").replace(/\D/g, ""), 10) || 0;
      return numA - numB;
    });
  }, [registrations]);

  // 1. Group Data into 4 Categories
  // หมวด 1: ตารางรายชื่อลงทะเบียน (ทุกสังกัด) - หัวตารางสีชมพู
  const cat1Items = sortedRegistrations;

  // หมวด 2: ตารางรายชื่อลงทะเบียน สงสพัท - หัวตารางสีน้ำเงิน
  const cat2Items = useMemo(() => {
    return sortedRegistrations.filter((r) => (r.club || "สงสพัท").includes("สงสพัท"));
  }, [sortedRegistrations]);

  // หมวด 3: ตารางรายชื่อลงทะเบียน โรตารี่ - หัวตารางสีแดง
  const cat3Items = useMemo(() => {
    return sortedRegistrations.filter((r) => (r.club || "").includes("โรตารี่"));
  }, [sortedRegistrations]);

  // หมวด 4: ตารางผู้สนับสนุนกิจกรรม (ทุกสังกัด) - หัวตารางสีชมพู
  const cat4Items = sponsors;

  // 2. Build Multi-Page A4 Array with Chunking (18 items per page)
  const a4Pages = useMemo(() => {
    const pages = [];

    const addSectionPages = ({
      categoryId,
      categoryTitle,
      categorySubtitle,
      headerColorType, // 'pink' | 'blue' | 'red'
      dataType, // 'registration' | 'sponsor'
      items
    }) => {
      const totalPagesForSection = Math.ceil(items.length / ROWS_PER_PAGE) || 1;

      for (let p = 0; p < totalPagesForSection; p++) {
        const pageItems = items.slice(p * ROWS_PER_PAGE, (p + 1) * ROWS_PER_PAGE);
        pages.push({
          pageNumber: pages.length + 1,
          categoryId,
          categoryTitle,
          categorySubtitle,
          headerColorType,
          dataType,
          sectionPageIndex: p + 1,
          sectionTotalPages: totalPagesForSection,
          pageLabel: totalPagesForSection > 1 ? `หน้า ${p + 1}/${totalPagesForSection}` : "หน้า 1/1",
          items: pageItems,
          totalItemsCount: items.length,
          startIndex: p * ROWS_PER_PAGE + 1
        });
      }
    };

    // หมวด 1: ตารางรายชื่อลงทะเบียน (ทุกสังกัด) - สีชมพู
    addSectionPages({
      categoryId: 1,
      categoryTitle: "ตารางรายชื่อลงทะเบียน (ทุกสังกัด)",
      categorySubtitle: "รายชื่อผู้ลงทะเบียนเข้าร่วมกิจกรรมงานสังสรรค์ปีใหม่ (รวมทุกสังกัด)",
      headerColorType: "pink",
      dataType: "registration",
      items: cat1Items
    });

    // หมวด 2: ตารางรายชื่อลงทะเบียน สงสพัท - สีน้ำเงิน
    addSectionPages({
      categoryId: 2,
      categoryTitle: "ตารางรายชื่อลงทะเบียน สโมสรสงสพัท",
      categorySubtitle: "รายชื่อสมาชิกและแขกผู้มีเกียรติ สโมสรสงสพัท",
      headerColorType: "blue",
      dataType: "registration",
      items: cat2Items
    });

    // หมวด 3: ตารางรายชื่อลงทะเบียน โรตารี่ - สีแดง
    addSectionPages({
      categoryId: 3,
      categoryTitle: "ตารางรายชื่อลงทะเบียน สโมสรโรตารี่",
      categorySubtitle: "รายชื่อสมาชิกและแขกผู้มีเกียรติ สโมสรโรตารี่",
      headerColorType: "red",
      dataType: "registration",
      items: cat3Items
    });

    // หมวด 4: ตารางผู้สนับสนุนกิจกรรม (ทุกสังกัด) - สีชมพู
    addSectionPages({
      categoryId: 4,
      categoryTitle: "ตารางผู้สนับสนุนกิจกรรม (ทุกสังกัด)",
      categorySubtitle: "รายนามผู้มีจิตศรัทธาร่วมสนับสนุนกิจกรรม ทั้งเงินสดและสิ่งของ",
      headerColorType: "pink",
      dataType: "sponsor",
      items: cat4Items
    });

    return pages;
  }, [cat1Items, cat2Items, cat3Items, cat4Items]);

  const currentPage = a4Pages[activePageIndex] || a4Pages[0];

  // LINE Share Summary Text
  const lineShareSummaryText = useMemo(() => {
    const cashSponsorsTotal = sponsors
      .filter((s) => s.sponsorType === "cash")
      .reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
    const itemSponsorsCount = sponsors.filter((s) => s.sponsorType === "item").length;

    return (
      `สรุปการลงทะเบียนเข้าร่วมกิจกรรมปีใหม่\n` +
      `${printTimestamp.dateStr}\n` +
      `${printTimestamp.timeStr}\n` +
      `━━━━━━━━━━━━━━━━━━━\n` +
      `📋 สรุปยอดล่าสุด:\n` +
      `• ผู้ลงทะเบียนรวม: ${sortedRegistrations.length} ท่าน\n` +
      `  - สโมสรสงสพัท: ${cat2Items.length} ท่าน\n` +
      `  - สโมสรโรตารี่: ${cat3Items.length} ท่าน\n` +
      `• ผู้สนับสนุนกิจกรรม: ${sponsors.length} ราย\n` +
      `  - ยอดเงินสดสนับสนุน: ฿${cashSponsorsTotal.toLocaleString()} บาท\n` +
      `  - ของสนับสนุน/ของขวัญ: ${itemSponsorsCount} รายการ\n` +
      `━━━━━━━━━━━━━━━━━━━\n` +
      `🔗 ตรวจสอบข้อมูลแบบ Real-time:\n` +
      `https://triple-t-form.vercel.app`
    );
  }, [printTimestamp, sortedRegistrations, cat2Items, cat3Items, sponsors]);

  // Handle Copy Summary Text
  const handleCopyText = () => {
    navigator.clipboard.writeText(lineShareSummaryText);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  // Convert A4 element to Canvas
  const renderA4PageCanvas = async (pageElement) => {
    return await html2canvas(pageElement, {
      scale: 2, // 2x Retina high resolution
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
      windowWidth: 794,
      windowHeight: 1123
    });
  };

  // 1. Download Current Page as A4 Image (.PNG)
  const handleDownloadCurrentPageImage = async () => {
    if (isGeneratingImage) return;
    setIsGeneratingImage(true);

    try {
      const pageEl = document.getElementById(`a4-page-render-${currentPage.pageNumber}`);
      if (!pageEl) throw new Error("Page element not found");

      const canvas = await renderA4PageCanvas(pageEl);
      const dataUrl = canvas.toDataURL("image/png");

      const cleanTitle = currentPage.categoryTitle.replace(/[\s/\\:]+/g, "_");
      const filename = `${cleanTitle}_${currentPage.pageLabel.replace(/[\s/]+/g, "_")}.png`;

      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Export image error:", err);
      alert("เกิดข้อผิดพลาดในการสร้างรูปภาพ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // 2. Download All Pages Sequentially
  const handleDownloadAllPagesImages = async () => {
    if (isGeneratingImage) return;
    setIsGeneratingImage(true);

    try {
      for (const page of a4Pages) {
        const pageEl = document.getElementById(`a4-page-render-${page.pageNumber}`);
        if (pageEl) {
          const canvas = await renderA4PageCanvas(pageEl);
          const dataUrl = canvas.toDataURL("image/png");
          const cleanTitle = page.categoryTitle.replace(/[\s/\\:]+/g, "_");
          const filename = `หน้า_${page.pageNumber}_${cleanTitle}_${page.pageLabel.replace(/[\s/]+/g, "_")}.png`;

          const link = document.createElement("a");
          link.href = dataUrl;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          // Small delay between downloads to prevent browser throttling
          await new Promise((r) => setTimeout(r, 600));
        }
      }
    } catch (err) {
      console.error("Export all images error:", err);
      alert("เกิดข้อผิดพลาดในการดาวน์โหลดรูปภาพทั้งหมด กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // 3. Share to LINE (Web Share API with image fallback to LINE URL)
  const handleShareToLine = async () => {
    if (isGeneratingImage) return;
    setIsGeneratingImage(true);

    try {
      const pageEl = document.getElementById(`a4-page-render-${currentPage.pageNumber}`);
      if (pageEl && navigator.canShare) {
        const canvas = await renderA4PageCanvas(pageEl);
        const blob = await new Promise((res) => canvas.toBlob(res, "image/png"));

        const cleanTitle = currentPage.categoryTitle.replace(/[\s/\\:]+/g, "_");
        const file = new File([blob], `${cleanTitle}.png`, { type: "image/png" });

        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `สรุปงานสังสรรค์ปีใหม่ SME FAN 2026 - ${currentPage.categoryTitle}`,
            text: lineShareSummaryText,
            files: [file]
          });
          setIsGeneratingImage(false);
          return;
        }
      }
    } catch (shareErr) {
      console.log("Web share with file error/cancelled:", shareErr);
    }

    setIsGeneratingImage(false);

    // Fallback: Open LINE Share intent with message
    const lineUrl = `https://line.me/R/msg/text/?${encodeURIComponent(lineShareSummaryText)}`;
    window.open(lineUrl, "_blank");
  };

  // 4. Trigger Native Print Mode
  const handleTriggerPrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-2 sm:p-4 bg-slate-950/95 backdrop-blur-xl animate-fadeIn overflow-y-auto">
      {/* ========================================================= */}
      {/* PRINT CSS STYLING: Exact A4 Page-break                    */}
      {/* ========================================================= */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-a4-all-pages, #print-a4-all-pages * {
            visibility: visible;
          }
          #print-a4-all-pages {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 0;
            background: white !important;
          }
          .a4-print-sheet {
            page-break-after: always !important;
            break-after: page !important;
            width: 100% !important;
            max-width: 210mm !important;
            min-height: 297mm !important;
            margin: 0 auto !important;
            padding: 14mm 12mm !important;
            box-shadow: none !important;
            border: none !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      <div
        className="relative bg-slate-900 rounded-3xl border border-white/15 shadow-2xl w-full max-w-5xl max-h-[96vh] flex flex-col overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ========================================================= */}
        {/* TOP CONTROLS BAR                                          */}
        {/* ========================================================= */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 px-4 sm:px-6 py-3.5 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-pink-500/20 border border-pink-400/40 flex items-center justify-center text-pink-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm sm:text-base font-black text-white">
                  ตัวจัดการพิมพ์และส่งออกเอกสาร A4
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-pink-500/20 text-pink-300 border border-pink-500/30 font-mono">
                  4 หมวดหมู่ ({a4Pages.length} หน้า)
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                {printTimestamp.fullStr}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2 flex-wrap">
            {/* Share to LINE */}
            <button
              type="button"
              onClick={handleShareToLine}
              disabled={isGeneratingImage}
              className="py-1.5 px-3 rounded-xl bg-[#06C755] hover:bg-[#05b34c] text-white font-bold text-xs flex items-center space-x-1.5 shadow-md shadow-emerald-950 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              title="แชร์รูปภาพและข้อความสรุปเข้าแอป LINE"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>แชร์เข้า LINE</span>
            </button>

            {/* Save Current Page Image */}
            <button
              type="button"
              onClick={handleDownloadCurrentPageImage}
              disabled={isGeneratingImage}
              className="py-1.5 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 font-bold text-xs flex items-center space-x-1.5 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              title="บันทึกหน้าปัจจุบันเป็นรูปภาพ A4 (.png)"
            >
              {isGeneratingImage ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>รูป A4 หน้านี้</span>
            </button>

            {/* Download All Pages */}
            <button
              type="button"
              onClick={handleDownloadAllPagesImages}
              disabled={isGeneratingImage}
              className="py-1.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 border border-white/15 font-bold text-xs flex items-center space-x-1.5 transition-all hover:scale-105 cursor-pointer hidden sm:flex"
              title="ดาวน์โหลดรูปภาพ A4 ทุกหน้ารวดเดียว"
            >
              <Download className="w-3.5 h-3.5 text-pink-400" />
              <span>ดาวน์โหลดทุกหน้า ({a4Pages.length})</span>
            </button>

            {/* Print Real Document */}
            <button
              type="button"
              onClick={handleTriggerPrint}
              className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-white/15 font-bold text-xs flex items-center space-x-1.5 transition-all hover:scale-105 cursor-pointer"
              title="สั่งพิมพ์ออกเครื่องพิมพ์ หรือ Save เป็น PDF"
            >
              <Printer className="w-3.5 h-3.5 text-amber-400" />
              <span>พิมพ์ (PDF)</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="ปิดหน้าต่าง"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* PAGE NAVIGATION THUMBNAILS CAROUSEL                       */}
        {/* ========================================================= */}
        <div className="bg-slate-950/80 px-4 py-2 border-b border-white/10 flex items-center justify-between gap-2 overflow-x-auto shrink-0">
          <div className="flex items-center space-x-1.5 overflow-x-auto py-1">
            {a4Pages.map((pg, idx) => {
              const isActive = idx === activePageIndex;
              const badgeBg =
                pg.headerColorType === "blue"
                  ? "border-blue-500 text-blue-400 bg-blue-500/10"
                  : pg.headerColorType === "red"
                  ? "border-red-500 text-red-400 bg-red-500/10"
                  : "border-pink-500 text-pink-400 bg-pink-500/10";

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActivePageIndex(idx)}
                  className={`py-1.5 px-3 rounded-xl text-xs font-bold whitespace-nowrap transition-all border flex items-center space-x-1.5 cursor-pointer ${
                    isActive
                      ? "bg-white text-slate-950 border-white shadow-md font-extrabold scale-105"
                      : `${badgeBg} hover:bg-white/10`
                  }`}
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{
                    backgroundColor:
                      pg.headerColorType === "blue"
                        ? "#2563eb"
                        : pg.headerColorType === "red"
                        ? "#dc2626"
                        : "#ec4899"
                  }} />
                  <span>
                    หน้า {pg.pageNumber}: {pg.categoryTitle.replace("ตาราง", "").trim()} ({pg.pageLabel})
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center space-x-1 shrink-0">
            <button
              type="button"
              disabled={activePageIndex === 0}
              onClick={() => setActivePageIndex((p) => Math.max(0, p - 1))}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono font-bold text-slate-300 px-2">
              {activePageIndex + 1} / {a4Pages.length}
            </span>
            <button
              type="button"
              disabled={activePageIndex === a4Pages.length - 1}
              onClick={() => setActivePageIndex((p) => Math.min(a4Pages.length - 1, p + 1))}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* PREVIEW CONTAINER: Interactive A4 Viewport                */}
        {/* ========================================================= */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950/60 flex flex-col items-center justify-start">
          
          {/* Active A4 Page Display (White Paper) */}
          <div
            id={`a4-page-render-${currentPage.pageNumber}`}
            className="bg-white text-slate-900 rounded-lg shadow-2xl p-8 sm:p-10 border border-slate-300 flex flex-col justify-between"
            style={{
              width: "100%",
              maxWidth: "794px",
              minHeight: "1123px",
              boxSizing: "border-box"
            }}
          >
            {/* Top Sheet Header */}
            <div>
              <div className="flex items-start justify-between pb-3 border-b-2 border-slate-900">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded text-[11px] font-black uppercase tracking-wider text-white"
                      style={{
                        backgroundColor:
                          currentPage.headerColorType === "blue"
                            ? "#1d4ed8"
                            : currentPage.headerColorType === "red"
                            ? "#dc2626"
                            : "#db2777"
                      }}
                    >
                      หน้าที่ {currentPage.pageNumber} จาก {a4Pages.length}
                    </span>
                    <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                      งานสังสรรค์ปีใหม่ SME FAN 2026
                    </h1>
                  </div>

                  <h2 className="text-sm sm:text-base font-extrabold text-slate-800">
                    {currentPage.categoryTitle}
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    {currentPage.categorySubtitle}
                  </p>
                </div>

                <div className="text-right space-y-1 shrink-0">
                  <div className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-300 font-mono text-xs font-bold text-slate-800">
                    {currentPage.pageLabel}
                  </div>
                  <div className="text-[11px] font-mono text-slate-600 leading-tight">
                    <div>{printTimestamp.dateStr}</div>
                    <div className="font-bold text-slate-800">{printTimestamp.timeStr}</div>
                  </div>
                </div>
              </div>

              {/* Status bar */}
              <div className="py-2 px-1 flex items-center justify-between text-xs text-slate-600 border-b border-slate-200 mb-3">
                <span>
                  หมวดหมู่: <strong className="text-slate-900">{currentPage.categoryTitle}</strong> (ทั้งหมด {currentPage.totalItemsCount} รายการ)
                </span>
                <span className="font-mono text-[11px]">
                  แสดงรายการที่ {currentPage.startIndex} - {currentPage.startIndex + currentPage.items.length - 1}
                </span>
              </div>

              {/* ======================================================= */}
              {/* TABLE: REGISTRATION DATA (หมวด 1, 2, 3)                  */}
              {/* ======================================================= */}
              {currentPage.dataType === "registration" && (
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr
                      className="text-white text-left font-bold"
                      style={{
                        backgroundColor:
                          currentPage.headerColorType === "blue"
                            ? "#1d4ed8"
                            : currentPage.headerColorType === "red"
                            ? "#dc2626"
                            : "#db2777"
                      }}
                    >
                      <th className="py-2 px-2 text-center w-12 border border-slate-300">ลำดับ</th>
                      <th className="py-2 px-2 text-center w-20 border border-slate-300">เลขที่บัตร</th>
                      <th className="py-2 px-3 border border-slate-300">ชื่อ - นามสกุล (ชื่อเล่น)</th>
                      <th className="py-2 px-2 text-center w-28 border border-slate-300">เบอร์โทรศัพท์</th>
                      <th className="py-2 px-2 text-center w-24 border border-slate-300">ประเภท / สังกัด</th>
                      <th className="py-2 px-2 text-center w-24 border border-slate-300">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentPage.items.map((row, idx) => {
                      const rowNum = currentPage.startIndex + idx;
                      const isRotary = (row.club || "").includes("โรตารี่");

                      return (
                        <tr
                          key={row.ticketNo || idx}
                          className={`border-b border-slate-300 ${
                            idx % 2 === 0 ? "bg-white" : "bg-slate-50"
                          } hover:bg-amber-50/50`}
                        >
                          <td className="py-2 px-2 text-center font-bold text-slate-500 font-mono border-r border-slate-200">
                            {rowNum}
                          </td>
                          <td className="py-2 px-2 text-center font-bold font-mono text-slate-800 border-r border-slate-200">
                            {row.ticketNo}
                          </td>
                          <td className="py-2 px-3 border-r border-slate-200">
                            <span className="font-bold text-slate-900 block">
                              {row.name}
                              {row.nickname && (
                                <span className="font-semibold text-slate-600 ml-1.5">
                                  ({row.nickname})
                                </span>
                              )}
                            </span>
                            {row.email && (
                              <span className="text-[10px] text-slate-500 block truncate">
                                {row.email}
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-2 text-center font-mono text-slate-700 font-medium border-r border-slate-200">
                            {row.phone || "-"}
                          </td>
                          <td className="py-2 px-2 text-center border-r border-slate-200">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                isRotary
                                  ? "bg-red-100 text-red-700 border border-red-300"
                                  : "bg-blue-100 text-blue-700 border border-blue-300"
                              }`}
                            >
                              {isRotary ? "โรตารี่" : "สงสพัท"}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-center">
                            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              ✓ ลงทะเบียนแล้ว
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

              {/* ======================================================= */}
              {/* TABLE: SPONSORS DATA (หมวด 4)                           */}
              {/* ======================================================= */}
              {currentPage.dataType === "sponsor" && (
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-pink-600 text-white text-left font-bold">
                      <th className="py-2 px-2 text-center w-12 border border-slate-300">ลำดับ</th>
                      <th className="py-2 px-3 border border-slate-300">ชื่อผู้สนับสนุน / หน่วยงาน</th>
                      <th className="py-2 px-2 text-center w-24 border border-slate-300">สังกัด</th>
                      <th className="py-2 px-2 text-center w-24 border border-slate-300">ประเภท</th>
                      <th className="py-2 px-3 border border-slate-300">รายละเอียดการสนับสนุน</th>
                      <th className="py-2 px-2 text-center w-28 border border-slate-300">แหล่งที่มา</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentPage.items.map((row, idx) => {
                      const rowNum = currentPage.startIndex + idx;
                      const isCash = row.sponsorType === "cash";

                      return (
                        <tr
                          key={row.id || idx}
                          className={`border-b border-slate-300 ${
                            idx % 2 === 0 ? "bg-white" : "bg-slate-50"
                          } hover:bg-pink-50/40`}
                        >
                          <td className="py-2.5 px-2 text-center font-bold text-slate-500 font-mono border-r border-slate-200">
                            {rowNum}
                          </td>
                          <td className="py-2.5 px-3 border-r border-slate-200">
                            <span className="font-bold text-slate-900 block">
                              {row.name}
                              {row.nickname && (
                                <span className="font-semibold text-slate-600 ml-1.5">
                                  ({row.nickname})
                                </span>
                              )}
                            </span>
                            {row.organization && (
                              <span className="text-[10px] text-slate-500 block">
                                {row.organization}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-2 text-center border-r border-slate-200">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
                              {row.club || "ทั่วไป"}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 text-center border-r border-slate-200">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isCash
                                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                  : "bg-purple-100 text-purple-800 border border-purple-300"
                              }`}
                            >
                              {isCash ? "💵 เงินสด" : "🎁 ของสนับสนุน"}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 border-r border-slate-200">
                            {isCash ? (
                              <span className="font-bold text-emerald-700 font-mono text-sm">
                                ฿{Number(row.amount || 0).toLocaleString()} บาท
                              </span>
                            ) : (
                              <div>
                                <span className="font-bold text-purple-900 block">
                                  {row.itemName}
                                </span>
                                {row.itemQuantity && (
                                  <span className="text-[10px] text-slate-600 block">
                                    จำนวน: {row.itemQuantity}
                                  </span>
                                )}
                                {row.itemNote && (
                                  <span className="text-[10px] text-slate-500 italic block">
                                    {row.itemNote}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-2 text-center text-[10px] font-medium text-slate-600">
                            {row.source || "สนับสนุนกิจกรรม"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Bottom Sheet Footer */}
            <div className="pt-4 mt-6 border-t border-slate-300 flex items-center justify-between text-xs text-slate-500">
              <div className="space-y-0.5">
                <span className="font-semibold text-slate-700 block">
                  สรุปหน้า: {currentPage.categoryTitle} ({currentPage.pageLabel})
                </span>
                <span className="text-[10px] text-slate-500 block">
                  ระบบลงทะเบียนออนไลน์ Triple T Form • จัดการข้อมูลอัตโนมัติ
                </span>
              </div>

              <div className="text-right">
                <span className="font-mono text-xs font-bold text-slate-800">
                  หน้า {currentPage.pageNumber} จาก {a4Pages.length}
                </span>
                <span className="text-[10px] text-slate-400 block font-mono">
                  {printTimestamp.timeStr}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* BOTTOM SUMMARY & LINE SHARE INTENT BAR                    */}
        {/* ========================================================= */}
        <div className="bg-slate-950 px-4 sm:px-6 py-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2.5 text-xs text-slate-300 shrink-0">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-amber-300">💡 ข้อความสำหรับแชร์ LINE:</span>
            <span className="text-slate-400 truncate max-w-xs sm:max-w-md">
              "{printTimestamp.dateStr} {printTimestamp.timeStr}"
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleCopyText}
              className="py-1 px-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold text-xs flex items-center space-x-1 transition-colors cursor-pointer"
            >
              {copiedText ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">คัดลอกแล้ว</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>คัดลอกข้อความสรุป</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="py-1.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors cursor-pointer"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* HIDDEN PRINT CONTAINER (Render all pages for Print to PDF) */}
        {/* ========================================================= */}
        <div id="print-a4-all-pages" className="hidden">
          {a4Pages.map((pg, pageIdx) => (
            <div
              key={pageIdx}
              className="a4-print-sheet bg-white text-slate-900"
              style={{
                width: "210mm",
                minHeight: "297mm",
                padding: "12mm 10mm",
                margin: "0 auto",
                boxSizing: "border-box"
              }}
            >
              <div className="flex items-start justify-between pb-3 border-b-2 border-slate-900">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span
                      className="px-2 py-0.5 rounded text-[11px] font-black uppercase tracking-wider text-white"
                      style={{
                        backgroundColor:
                          pg.headerColorType === "blue"
                            ? "#1d4ed8"
                            : pg.headerColorType === "red"
                            ? "#dc2626"
                            : "#db2777"
                      }}
                    >
                      หน้าที่ {pg.pageNumber} จาก {a4Pages.length}
                    </span>
                    <h1 className="text-xl font-black text-slate-900 tracking-tight">
                      งานสังสรรค์ปีใหม่ SME FAN 2026
                    </h1>
                  </div>

                  <h2 className="text-base font-extrabold text-slate-800">
                    {pg.categoryTitle}
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    {pg.categorySubtitle}
                  </p>
                </div>

                <div className="text-right space-y-1">
                  <div className="px-2.5 py-1 rounded bg-slate-100 border border-slate-300 font-mono text-xs font-bold text-slate-800">
                    {pg.pageLabel}
                  </div>
                  <div className="text-[11px] font-mono text-slate-600 leading-tight">
                    <div>{printTimestamp.dateStr}</div>
                    <div className="font-bold text-slate-800">{printTimestamp.timeStr}</div>
                  </div>
                </div>
              </div>

              <div className="py-2 px-1 flex items-center justify-between text-xs text-slate-600 border-b border-slate-200 mb-3">
                <span>
                  หมวดหมู่: <strong className="text-slate-900">{pg.categoryTitle}</strong> (ทั้งหมด {pg.totalItemsCount} รายการ)
                </span>
                <span className="font-mono text-[11px]">
                  แสดงรายการที่ {pg.startIndex} - {pg.startIndex + pg.items.length - 1}
                </span>
              </div>

              {/* Print Registration Table */}
              {pg.dataType === "registration" && (
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr
                      className="text-white text-left font-bold"
                      style={{
                        backgroundColor:
                          pg.headerColorType === "blue"
                            ? "#1d4ed8"
                            : pg.headerColorType === "red"
                            ? "#dc2626"
                            : "#db2777"
                      }}
                    >
                      <th className="py-2 px-2 text-center w-12 border border-slate-300">ลำดับ</th>
                      <th className="py-2 px-2 text-center w-20 border border-slate-300">เลขที่บัตร</th>
                      <th className="py-2 px-3 border border-slate-300">ชื่อ - นามสกุล (ชื่อเล่น)</th>
                      <th className="py-2 px-2 text-center w-28 border border-slate-300">เบอร์โทรศัพท์</th>
                      <th className="py-2 px-2 text-center w-24 border border-slate-300">ประเภท / สังกัด</th>
                      <th className="py-2 px-2 text-center w-24 border border-slate-300">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pg.items.map((row, idx) => {
                      const rowNum = pg.startIndex + idx;
                      const isRotary = (row.club || "").includes("โรตารี่");

                      return (
                        <tr
                          key={row.ticketNo || idx}
                          className={`border-b border-slate-300 ${
                            idx % 2 === 0 ? "bg-white" : "bg-slate-50"
                          }`}
                        >
                          <td className="py-2 px-2 text-center font-bold text-slate-500 font-mono border-r border-slate-200">
                            {rowNum}
                          </td>
                          <td className="py-2 px-2 text-center font-bold font-mono text-slate-800 border-r border-slate-200">
                            {row.ticketNo}
                          </td>
                          <td className="py-2 px-3 border-r border-slate-200">
                            <span className="font-bold text-slate-900 block">
                              {row.name}
                              {row.nickname && (
                                <span className="font-semibold text-slate-600 ml-1.5">
                                  ({row.nickname})
                                </span>
                              )}
                            </span>
                            {row.email && (
                              <span className="text-[10px] text-slate-500 block truncate">
                                {row.email}
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-2 text-center font-mono text-slate-700 font-medium border-r border-slate-200">
                            {row.phone || "-"}
                          </td>
                          <td className="py-2 px-2 text-center border-r border-slate-200">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                isRotary
                                  ? "bg-red-100 text-red-700 border border-red-300"
                                  : "bg-blue-100 text-blue-700 border border-blue-300"
                              }`}
                            >
                              {isRotary ? "โรตารี่" : "สงสพัท"}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-center">
                            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              ✓ ลงทะเบียนแล้ว
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

              {/* Print Sponsor Table */}
              {pg.dataType === "sponsor" && (
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-pink-600 text-white text-left font-bold">
                      <th className="py-2 px-2 text-center w-12 border border-slate-300">ลำดับ</th>
                      <th className="py-2 px-3 border border-slate-300">ชื่อผู้สนับสนุน / หน่วยงาน</th>
                      <th className="py-2 px-2 text-center w-24 border border-slate-300">สังกัด</th>
                      <th className="py-2 px-2 text-center w-24 border border-slate-300">ประเภท</th>
                      <th className="py-2 px-3 border border-slate-300">รายละเอียดการสนับสนุน</th>
                      <th className="py-2 px-2 text-center w-28 border border-slate-300">แหล่งที่มา</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pg.items.map((row, idx) => {
                      const rowNum = pg.startIndex + idx;
                      const isCash = row.sponsorType === "cash";

                      return (
                        <tr
                          key={row.id || idx}
                          className={`border-b border-slate-300 ${
                            idx % 2 === 0 ? "bg-white" : "bg-slate-50"
                          }`}
                        >
                          <td className="py-2.5 px-2 text-center font-bold text-slate-500 font-mono border-r border-slate-200">
                            {rowNum}
                          </td>
                          <td className="py-2.5 px-3 border-r border-slate-200">
                            <span className="font-bold text-slate-900 block">
                              {row.name}
                              {row.nickname && (
                                <span className="font-semibold text-slate-600 ml-1.5">
                                  ({row.nickname})
                                </span>
                              )}
                            </span>
                            {row.organization && (
                              <span className="text-[10px] text-slate-500 block">
                                {row.organization}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-2 text-center border-r border-slate-200">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
                              {row.club || "ทั่วไป"}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 text-center border-r border-slate-200">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isCash
                                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                  : "bg-purple-100 text-purple-800 border border-purple-300"
                              }`}
                            >
                              {isCash ? "💵 เงินสด" : "🎁 ของสนับสนุน"}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 border-r border-slate-200">
                            {isCash ? (
                              <span className="font-bold text-emerald-700 font-mono text-sm">
                                ฿{Number(row.amount || 0).toLocaleString()} บาท
                              </span>
                            ) : (
                              <div>
                                <span className="font-bold text-purple-900 block">
                                  {row.itemName}
                                </span>
                                {row.itemQuantity && (
                                  <span className="text-[10px] text-slate-600 block">
                                    จำนวน: {row.itemQuantity}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-2 text-center text-[10px] font-medium text-slate-600">
                            {row.source || "สนับสนุนกิจกรรม"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

              {/* Print Sheet Footer */}
              <div className="pt-4 mt-6 border-t border-slate-300 flex items-center justify-between text-xs text-slate-500">
                <span className="font-semibold text-slate-700">
                  {pg.categoryTitle} ({pg.pageLabel}) • งานสังสรรค์ปีใหม่ SME FAN 2026
                </span>
                <span className="font-mono text-xs font-bold text-slate-800">
                  หน้า {pg.pageNumber} จาก {a4Pages.length} ({printTimestamp.timeStr})
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
