import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  X,
  Printer,
  Download,
  Share2,
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
  ExternalLink,
  Layers,
  ArrowDown
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

// 26 rows per page allows compact slim rows so 21 attendees fit on 1 single A4 page
const ROWS_PER_PAGE = 26;

export default function EventA4PrintModal({
  isOpen,
  onClose,
  registrations = [],
  sponsors = [],
  eventConfig = {}
}) {
  if (!isOpen) return null;

  const [isProcessing, setIsProcessing] = useState(false);
  const [progressText, setProgressText] = useState("");
  const [copiedText, setCopiedText] = useState(false);
  const [printTimestamp, setPrintTimestamp] = useState(() => getThaiA4ExtractionTime());
  const [zoomMode, setZoomMode] = useState("fit"); // 'fit' | 'actual'

  // Ref for scroll container to calculate mobile scale
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 800
  );

  // Refresh timestamp when opened & measure container width
  useEffect(() => {
    if (!isOpen) return;
    setPrintTimestamp(getThaiA4ExtractionTime());

    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      } else {
        setContainerWidth(window.innerWidth);
      }
    };

    updateWidth();
    const rafId = requestAnimationFrame(updateWidth);
    window.addEventListener("resize", updateWidth);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", updateWidth);
    };
  }, [isOpen]);

  // Responsive scale factor: snug fit to screen on mobile, 1.0 on large screens
  const scale = useMemo(() => {
    if (zoomMode === "actual") return 1;
    const isMobile = typeof window !== "undefined" && window.innerWidth < 640;
    const margin = isMobile ? 8 : 32;
    const available = Math.max(280, containerWidth - margin);
    return Math.min(1, available / 794);
  }, [containerWidth, zoomMode]);

  // Sort registrations by ticket number
  const sortedRegistrations = useMemo(() => {
    return [...registrations].sort((a, b) => {
      const numA = parseInt((a.ticketNo || "").replace(/\D/g, ""), 10) || 0;
      const numB = parseInt((b.ticketNo || "").replace(/\D/g, ""), 10) || 0;
      return numA - numB;
    });
  }, [registrations]);

  // 1. Group Data into 4 Categories
  const cat1Items = sortedRegistrations;
  const cat2Items = useMemo(() => {
    return sortedRegistrations.filter((r) => (r.club || "สงสพัท").includes("สงสพัท"));
  }, [sortedRegistrations]);
  const cat3Items = useMemo(() => {
    return sortedRegistrations.filter((r) => (r.club || "").includes("โรตารี่"));
  }, [sortedRegistrations]);
  const cat4Items = sponsors;

  // 2. Build Multi-Page A4 Array with Chunking (26 items per page)
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
      `━━━━━━━━━━\n` +
      `📋 สรุปยอดล่าสุด:\n` +
      `• ผู้ลงทะเบียนรวม ${sortedRegistrations.length} ท่าน\n` +
      `  - สโมสรสงสพัท ${cat2Items.length} ท่าน\n` +
      `  - สโมสรโรตารี่ ${cat3Items.length} ท่าน\n` +
      `• ผู้สนับสนุนกิจกรรม: ${sponsors.length} ราย\n` +
      `  - ยอดเงินสดสนับสนุน ${cashSponsorsTotal.toLocaleString()} บาท\n` +
      `  - ของสนับสนุน/ของขวัญ: ${itemSponsorsCount} รายการ\n` +
      `━━━━━━━━━━\n` +
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

  // Convert A4 element to Canvas (Offscreen Clone at exact 794x1123 for maximum 2x Retina crispness)
  const renderA4PageCanvas = async (pageElement) => {
    const offscreenContainer = document.createElement("div");
    offscreenContainer.style.position = "fixed";
    offscreenContainer.style.left = "-9999px";
    offscreenContainer.style.top = "0";
    offscreenContainer.style.width = "794px";
    offscreenContainer.style.height = "1123px";
    offscreenContainer.style.zIndex = "-9999";

    const clone = pageElement.cloneNode(true);
    clone.style.transform = "none";
    clone.style.position = "static";
    clone.style.top = "auto";
    clone.style.left = "auto";
    clone.style.width = "794px";
    clone.style.minHeight = "1123px";
    clone.style.height = "1123px";
    clone.style.margin = "0";

    offscreenContainer.appendChild(clone);
    document.body.appendChild(offscreenContainer);

    try {
      return await html2canvas(clone, {
        scale: 2, // 2x Retina high resolution
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        width: 794,
        height: 1123,
        windowWidth: 794,
        windowHeight: 1123
      });
    } finally {
      if (offscreenContainer.parentNode) {
        offscreenContainer.parentNode.removeChild(offscreenContainer);
      }
    }
  };

  // 1. Share ALL Pages to LINE at once
  const handleShareAllToLine = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      const files = [];

      for (let i = 0; i < a4Pages.length; i++) {
        const page = a4Pages[i];
        setProgressText(`กำลังเตรียมรูป A4 แผ่นที่ ${i + 1}/${a4Pages.length}...`);
        const el = document.getElementById(`a4-page-render-${page.pageNumber}`);
        if (el) {
          const canvas = await renderA4PageCanvas(el);
          const blob = await new Promise((res) => canvas.toBlob(res, "image/png"));
          const cleanTitle = page.categoryTitle.replace(/[\s/\\:]+/g, "_");
          const file = new File([blob], `A4_แผ่นที่_${page.pageNumber}_${cleanTitle}.png`, { type: "image/png" });
          files.push(file);
        }
      }

      // Check if navigator.canShare supports files
      if (navigator.canShare && navigator.canShare({ files })) {
        setProgressText("กำลังเปิดหน้าต่างแชร์เข้า LINE...");
        await navigator.share({
          title: "สรุปการลงทะเบียนเข้าร่วมกิจกรรมปีใหม่ SME FAN 2026",
          text: lineShareSummaryText,
          files: files
        });
      } else {
        // Fallback: download all files and open LINE Share intent
        setProgressText("กำลังดาวน์โหลดรูปภาพทั้งหมดลงเครื่อง...");
        for (const file of files) {
          const link = document.createElement("a");
          link.href = URL.createObjectURL(file);
          link.download = file.name;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          await new Promise((r) => setTimeout(r, 400));
        }
        window.open(`https://line.me/R/msg/text/?${encodeURIComponent(lineShareSummaryText)}`, "_blank");
      }
    } catch (err) {
      console.log("Share all error/cancelled:", err);
    } finally {
      setIsProcessing(false);
      setProgressText("");
    }
  };

  // 2. Download ALL Pages Images at once
  const handleDownloadAllPagesImages = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      for (let i = 0; i < a4Pages.length; i++) {
        const page = a4Pages[i];
        setProgressText(`กำลังบันทึกรูปภาพแผ่นที่ ${i + 1}/${a4Pages.length}...`);

        const el = document.getElementById(`a4-page-render-${page.pageNumber}`);
        if (el) {
          const canvas = await renderA4PageCanvas(el);
          const dataUrl = canvas.toDataURL("image/png");
          const cleanTitle = page.categoryTitle.replace(/[\s/\\:]+/g, "_");
          const filename = `A4_แผ่นที่_${page.pageNumber}_${cleanTitle}_${page.pageLabel.replace(/[\s/]+/g, "_")}.png`;

          const link = document.createElement("a");
          link.href = dataUrl;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          // Delay between downloads
          await new Promise((r) => setTimeout(r, 500));
        }
      }
      setProgressText("บันทึกรูปภาพครบทั้งหมดแล้ว!");
      await new Promise((r) => setTimeout(r, 1200));
    } catch (err) {
      console.error("Export all images error:", err);
      alert("เกิดข้อผิดพลาดในการดาวน์โหลดรูปภาพ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsProcessing(false);
      setProgressText("");
    }
  };

  // 3. Trigger Native Print Mode
  const handleTriggerPrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-1 sm:p-4 bg-slate-950/95 backdrop-blur-xl animate-fadeIn overflow-y-auto">
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
            padding: 10mm 10mm !important;
            box-shadow: none !important;
            border: none !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      <div
        className="relative bg-slate-900 rounded-2xl sm:rounded-3xl border border-white/15 shadow-2xl w-full max-w-5xl max-h-[96vh] flex flex-col overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ========================================================= */}
        {/* STICKY TOP CONTROLS BAR (Mobile & Desktop Optimized)      */}
        {/* ========================================================= */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 px-3 sm:px-6 py-3 border-b border-white/10 flex flex-wrap items-center justify-between gap-2.5 shrink-0 z-20">
          <div className="flex items-center space-x-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-pink-500/20 border border-pink-400/40 flex items-center justify-center text-pink-400 shrink-0">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5 flex-wrap">
                <h3 className="text-xs sm:text-base font-black text-white truncate">
                  เอกสารตาราง A4 ({a4Pages.length} แผ่นต่อเนื่อง)
                </h3>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-pink-500/20 text-pink-300 border border-pink-500/30 font-mono">
                  4 หมวดหมู่
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 font-mono truncate">
                {printTimestamp.fullStr}
              </p>
            </div>
          </div>

          {/* Action Buttons: Share ALL, Save ALL, Zoom Toggle, Print, Close */}
          <div className="flex items-center flex-wrap gap-1.5 sm:gap-2 shrink-0">
            {/* Zoom Mode Toggle: Fit to Screen vs 100% */}
            <button
              type="button"
              onClick={() => setZoomMode(zoomMode === "fit" ? "actual" : "fit")}
              className={`py-1.5 px-2 sm:px-2.5 rounded-xl border text-xs font-bold flex items-center space-x-1 transition-all cursor-pointer ${
                zoomMode === "fit"
                  ? "bg-slate-800 hover:bg-slate-700 text-slate-200 border-white/20"
                  : "bg-indigo-600/30 text-indigo-300 border-indigo-500/50"
              }`}
              title={zoomMode === "fit" ? "คลิกเพื่อขยายเป็นขนาดจริง 100%" : "คลิกเพื่อย่อให้พอดีขอบหน้าจอ"}
            >
              <span className="text-amber-400">🔍</span>
              <span className="text-[11px]">{zoomMode === "fit" ? "พอดีจอ" : "100%"}</span>
            </button>

            {/* Share ALL to LINE */}
            <button
              type="button"
              onClick={handleShareAllToLine}
              disabled={isProcessing}
              className="py-1.5 px-2.5 sm:px-3 rounded-xl bg-[#06C755] hover:bg-[#05b34c] text-white font-bold text-xs flex items-center space-x-1 sm:space-x-1.5 shadow-md shadow-emerald-950 transition-all hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50"
              title="กดแชร์ครั้งเดียว เอกสารรูปภาพ A4 ไปทั้งหมดทุกหน้า"
            >
              {isProcessing ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Share2 className="w-3.5 h-3.5" />
              )}
              <span>แชร์เข้า LINE ({a4Pages.length} รูป)</span>
            </button>

            {/* Save ALL Pages Image */}
            <button
              type="button"
              onClick={handleDownloadAllPagesImages}
              disabled={isProcessing}
              className="py-1.5 px-2.5 sm:px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 font-bold text-xs flex items-center space-x-1 sm:space-x-1.5 transition-all hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50"
              title="กดเซฟครั้งเดียว ดาวน์โหลดเอกสาร A4 ครบทุกรูป"
            >
              {isProcessing ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>บันทึกรูปทั้งหมด</span>
            </button>

            {/* Print Real Document */}
            <button
              type="button"
              onClick={handleTriggerPrint}
              disabled={isProcessing}
              className="py-1.5 px-2 sm:px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-white/15 font-bold text-xs flex items-center space-x-1 transition-all hover:scale-105 cursor-pointer"
              title="สั่งพิมพ์หรือ Save เป็น PDF"
            >
              <Printer className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">พิมพ์ (PDF)</span>
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

        {/* Processing Banner (if active) */}
        {isProcessing && (
          <div className="bg-amber-500 text-slate-950 px-4 py-2 text-xs font-bold flex items-center justify-center space-x-2 animate-pulse shrink-0">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>{progressText || "กำลังประมวลผลเอกสาร A4..."}</span>
          </div>
        )}

        {/* ========================================================= */}
        {/* CONTINUOUS VERTICAL SCROLL: All A4 Pages in a Row         */}
        {/* ========================================================= */}
        <div
          ref={containerRef}
          className="flex-1 overflow-y-auto px-1 sm:px-6 py-3 sm:py-6 bg-slate-950/70 flex flex-col items-center space-y-4 sm:space-y-8"
        >
          {a4Pages.map((page, idx) => {
            const isPink = page.headerColorType === "pink";
            const isBlue = page.headerColorType === "blue";
            const isRed = page.headerColorType === "red";

            const headerBgColor = isBlue
              ? "#1d4ed8"
              : isRed
              ? "#dc2626"
              : "#db2777";

            return (
              <div key={idx} className="w-full flex flex-col items-center">
                {/* Section Separator Pill */}
                <div
                  className="mb-2 px-3.5 py-1 rounded-full text-xs font-bold border flex items-center space-x-2 shadow-sm"
                  style={{
                    backgroundColor: "rgba(15, 23, 42, 0.8)",
                    borderColor: headerBgColor,
                    color: "#ffffff"
                  }}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: headerBgColor }}
                  />
                  <span>
                    แผ่นที่ {page.pageNumber}: {page.categoryTitle} ({page.pageLabel})
                  </span>
                </div>

                {/* Scaled A4 Sheet Container (Snug fit to screen width on mobile) */}
                <div className="w-full flex justify-center pb-4 overflow-x-auto">
                  <div
                    style={{
                      width: `${794 * scale}px`,
                      height: `${1123 * scale}px`,
                      position: "relative",
                      overflow: "hidden",
                      boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)",
                      borderRadius: "6px"
                    }}
                    className="shrink-0"
                  >
                    <div
                      id={`a4-page-render-${page.pageNumber}`}
                      className="bg-white text-slate-900 p-6 sm:p-8 flex flex-col justify-between"
                      style={{
                        width: "794px",
                        height: "1123px",
                        minHeight: "1123px",
                        transform: `scale(${scale})`,
                        transformOrigin: "top left",
                        position: "absolute",
                        top: 0,
                        left: 0,
                        boxSizing: "border-box"
                      }}
                    >
                      {/* Top Sheet Header (Clean without duplicate top-left badge) */}
                      <div>
                        <div className="flex items-start justify-between pb-2.5 border-b-2 border-slate-900">
                          <div className="space-y-0.5">
                            <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                              งานสังสรรค์ปีใหม่ SME FAN 2026
                            </h1>
                            <h2 className="text-xs sm:text-sm font-extrabold text-slate-800">
                              {page.categoryTitle}
                            </h2>
                            <p className="text-[10px] text-slate-500 font-medium">
                              {page.categorySubtitle}
                            </p>
                          </div>

                        <div className="text-right space-y-0.5 shrink-0">
                          <div className="px-2 py-0.5 rounded bg-slate-100 border border-slate-300 font-mono text-[11px] font-bold text-slate-800">
                            {page.pageLabel}
                          </div>
                          <div className="text-[10px] font-mono text-slate-600 leading-tight">
                            <div>{printTimestamp.dateStr}</div>
                            <div className="font-bold text-slate-800">{printTimestamp.timeStr}</div>
                          </div>
                        </div>
                      </div>

                      {/* Status bar */}
                      <div className="py-1.5 px-0.5 flex items-center justify-between text-[11px] text-slate-600 border-b border-slate-200 mb-2">
                        <span>
                          หมวดหมู่: <strong className="text-slate-900">{page.categoryTitle}</strong> (ทั้งหมด {page.totalItemsCount} รายการ)
                        </span>
                        <span className="font-mono text-[10px]">
                          แสดงรายการที่ {page.startIndex} - {page.startIndex + page.items.length - 1}
                        </span>
                      </div>

                      {/* ======================================================= */}
                      {/* TABLE: REGISTRATION DATA (หมวด 1, 2, 3) - SLIM & COMPACT */}
                      {/* ======================================================= */}
                      {page.dataType === "registration" && (
                        <table className="w-full text-[10.5px] border-collapse">
                          <thead>
                            <tr
                              className="text-white text-left font-bold"
                              style={{ backgroundColor: headerBgColor }}
                            >
                              <th className="py-1.5 px-1.5 text-center w-10 border border-slate-300">ลำดับ</th>
                              <th className="py-1.5 px-1.5 text-center w-16 border border-slate-300">เลขที่บัตร</th>
                              <th className="py-1.5 px-2.5 border border-slate-300">ชื่อ - นามสกุล (ชื่อเล่น)</th>
                              <th className="py-1.5 px-1.5 text-center w-24 border border-slate-300">เบอร์โทรศัพท์</th>
                              <th className="py-1.5 px-1.5 text-center w-20 border border-slate-300">ประเภท / สังกัด</th>
                              <th className="py-1.5 px-1.5 text-center w-28 border border-slate-300 whitespace-nowrap">สถานะ</th>
                            </tr>
                          </thead>
                          <tbody>
                            {page.items.map((row, rIdx) => {
                              const rowNum = page.startIndex + rIdx;
                              const isRotary = (row.club || "").includes("โรตารี่");

                              return (
                                <tr
                                  key={row.ticketNo || rIdx}
                                  className={`border-b border-slate-300 ${
                                    rIdx % 2 === 0 ? "bg-white" : "bg-slate-50"
                                  } hover:bg-amber-50/40`}
                                >
                                  <td className="py-1 px-1.5 text-center font-bold text-slate-500 font-mono border-r border-slate-200">
                                    {rowNum}
                                  </td>
                                  <td className="py-1 px-1.5 text-center font-bold font-mono text-slate-800 border-r border-slate-200">
                                    {row.ticketNo}
                                  </td>
                                  <td className="py-1 px-2.5 border-r border-slate-200">
                                    <span className="font-bold text-slate-900 block leading-tight">
                                      {row.name}
                                      {row.nickname && (
                                        <span className="font-semibold text-slate-600 ml-1">
                                          ({row.nickname})
                                        </span>
                                      )}
                                    </span>
                                    {row.email && (
                                      <span className="text-[9.5px] text-slate-500 block truncate leading-tight">
                                        {row.email}
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-1 px-1.5 text-center font-mono text-slate-700 font-medium border-r border-slate-200 whitespace-nowrap">
                                    {row.phone || "-"}
                                  </td>
                                  <td className="py-1 px-1.5 text-center border-r border-slate-200 whitespace-nowrap">
                                    <span
                                      className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold ${
                                        isRotary
                                          ? "bg-red-100 text-red-700 border border-red-300"
                                          : "bg-blue-100 text-blue-700 border border-blue-300"
                                      }`}
                                    >
                                      {isRotary ? "โรตารี่" : "สงสพัท"}
                                    </span>
                                  </td>
                                  <td className="py-1 px-1.5 text-center whitespace-nowrap">
                                    <span className="text-[9.5px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 whitespace-nowrap inline-block">
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
                      {/* TABLE: SPONSORS DATA (หมวด 4) - SLIM & COMPACT          */}
                      {/* ======================================================= */}
                      {page.dataType === "sponsor" && (
                        <table className="w-full text-[10.5px] border-collapse">
                          <thead>
                            <tr className="bg-pink-600 text-white text-left font-bold">
                              <th className="py-1.5 px-1.5 text-center w-10 border border-slate-300">ลำดับ</th>
                              <th className="py-1.5 px-2.5 border border-slate-300">ชื่อผู้สนับสนุน / หน่วยงาน</th>
                              <th className="py-1.5 px-1.5 text-center w-20 border border-slate-300">สังกัด</th>
                              <th className="py-1.5 px-1.5 text-center w-22 border border-slate-300">ประเภท</th>
                              <th className="py-1.5 px-2.5 border border-slate-300">รายละเอียดการสนับสนุน</th>
                              <th className="py-1.5 px-1.5 text-center w-26 border border-slate-300">แหล่งที่มา</th>
                            </tr>
                          </thead>
                          <tbody>
                            {page.items.map((row, rIdx) => {
                              const rowNum = page.startIndex + rIdx;
                              const isCash = row.sponsorType === "cash";

                              return (
                                <tr
                                  key={row.id || rIdx}
                                  className={`border-b border-slate-300 ${
                                    rIdx % 2 === 0 ? "bg-white" : "bg-slate-50"
                                  } hover:bg-pink-50/40`}
                                >
                                  <td className="py-1.5 px-1.5 text-center font-bold text-slate-500 font-mono border-r border-slate-200">
                                    {rowNum}
                                  </td>
                                  <td className="py-1.5 px-2.5 border-r border-slate-200">
                                    <span className="font-bold text-slate-900 block leading-tight">
                                      {row.name}
                                      {row.nickname && (
                                        <span className="font-semibold text-slate-600 ml-1">
                                          ({row.nickname})
                                        </span>
                                      )}
                                    </span>
                                    {row.organization && (
                                      <span className="text-[9.5px] text-slate-500 block leading-tight">
                                        {row.organization}
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-1.5 px-1.5 text-center border-r border-slate-200 whitespace-nowrap">
                                    <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
                                      {row.club || "ทั่วไป"}
                                    </span>
                                  </td>
                                  <td className="py-1.5 px-1.5 text-center border-r border-slate-200 whitespace-nowrap">
                                    <span
                                      className={`px-1.5 py-0.5 rounded-full text-[9.5px] font-bold whitespace-nowrap ${
                                        isCash
                                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                          : "bg-purple-100 text-purple-800 border border-purple-300"
                                      }`}
                                    >
                                      {isCash ? "💵 เงินสด" : "🎁 ของสนับสนุน"}
                                    </span>
                                  </td>
                                  <td className="py-1.5 px-2.5 border-r border-slate-200">
                                    {isCash ? (
                                      <span className="font-bold text-emerald-700 font-mono text-xs">
                                        ฿{Number(row.amount || 0).toLocaleString()} บาท
                                      </span>
                                    ) : (
                                      <div>
                                        <span className="font-bold text-purple-900 block leading-tight">
                                          {row.itemName}
                                        </span>
                                        {row.itemQuantity && (
                                          <span className="text-[9.5px] text-slate-600 block leading-tight">
                                            จำนวน: {row.itemQuantity}
                                          </span>
                                        )}
                                        {row.itemNote && (
                                          <span className="text-[9.5px] text-slate-500 italic block leading-tight">
                                            {row.itemNote}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </td>
                                  <td className="py-1.5 px-1.5 text-center text-[9.5px] font-medium text-slate-600 whitespace-nowrap">
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
                    <div className="pt-3 mt-4 border-t border-slate-300 flex items-center justify-between text-[11px] text-slate-500">
                      <div className="space-y-0.5">
                        <span className="font-semibold text-slate-700 block">
                          สรุปแผ่นที่ {page.pageNumber}: {page.categoryTitle} ({page.pageLabel})
                        </span>
                        <span className="text-[9.5px] text-slate-500 block">
                          ระบบลงทะเบียนออนไลน์ Triple T Form • จัดการข้อมูลอัตโนมัติ
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="font-mono text-xs font-bold text-slate-800">
                          แผ่นที่ {page.pageNumber} จาก {a4Pages.length}
                        </span>
                        <span className="text-[9.5px] text-slate-400 block font-mono">
                          {printTimestamp.timeStr}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

        {/* ========================================================= */}
        {/* BOTTOM SUMMARY & LINE SHARE INTENT BAR                    */}
        {/* ========================================================= */}
        <div className="bg-slate-950 px-3 sm:px-6 py-2.5 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300 shrink-0">
          <div className="flex items-center space-x-1.5 truncate max-w-sm sm:max-w-md">
            <span className="font-bold text-amber-300">💡 สรุปข้อมูล:</span>
            <span className="text-slate-400 truncate">
              {printTimestamp.dateStr} {printTimestamp.timeStr}
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
              className="py-1 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors cursor-pointer"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* HIDDEN PRINT CONTAINER (Render all pages for Print to PDF) */}
        {/* ========================================================= */}
        <div id="print-a4-all-pages" className="hidden">
          {a4Pages.map((pg, pageIdx) => {
            const isBlue = pg.headerColorType === "blue";
            const isRed = pg.headerColorType === "red";
            const headerBgColor = isBlue ? "#1d4ed8" : isRed ? "#dc2626" : "#db2777";

            return (
              <div
                key={pageIdx}
                className="a4-print-sheet bg-white text-slate-900"
                style={{
                  width: "210mm",
                  minHeight: "297mm",
                  padding: "10mm 10mm",
                  margin: "0 auto",
                  boxSizing: "border-box"
                }}
              >
                <div className="flex items-start justify-between pb-2.5 border-b-2 border-slate-900">
                  <div className="space-y-0.5">
                    <h1 className="text-lg font-black text-slate-900 tracking-tight">
                      งานสังสรรค์ปีใหม่ SME FAN 2026
                    </h1>
                    <h2 className="text-sm font-extrabold text-slate-800">
                      {pg.categoryTitle}
                    </h2>
                    <p className="text-[10px] text-slate-500 font-medium">
                      {pg.categorySubtitle}
                    </p>
                  </div>

                  <div className="text-right space-y-0.5">
                    <div className="px-2 py-0.5 rounded bg-slate-100 border border-slate-300 font-mono text-[11px] font-bold text-slate-800">
                      {pg.pageLabel}
                    </div>
                    <div className="text-[10px] font-mono text-slate-600 leading-tight">
                      <div>{printTimestamp.dateStr}</div>
                      <div className="font-bold text-slate-800">{printTimestamp.timeStr}</div>
                    </div>
                  </div>
                </div>

                <div className="py-1.5 px-0.5 flex items-center justify-between text-[11px] text-slate-600 border-b border-slate-200 mb-2">
                  <span>
                    หมวดหมู่: <strong className="text-slate-900">{pg.categoryTitle}</strong> (ทั้งหมด {pg.totalItemsCount} รายการ)
                  </span>
                  <span className="font-mono text-[10px]">
                    แสดงรายการที่ {pg.startIndex} - {pg.startIndex + pg.items.length - 1}
                  </span>
                </div>

                {/* Print Registration Table */}
                {pg.dataType === "registration" && (
                  <table className="w-full text-[10.5px] border-collapse">
                    <thead>
                      <tr
                        className="text-white text-left font-bold"
                        style={{ backgroundColor: headerBgColor }}
                      >
                        <th className="py-1.5 px-1.5 text-center w-10 border border-slate-300">ลำดับ</th>
                        <th className="py-1.5 px-1.5 text-center w-16 border border-slate-300">เลขที่บัตร</th>
                        <th className="py-1.5 px-2.5 border border-slate-300">ชื่อ - นามสกุล (ชื่อเล่น)</th>
                        <th className="py-1.5 px-1.5 text-center w-24 border border-slate-300">เบอร์โทรศัพท์</th>
                        <th className="py-1.5 px-1.5 text-center w-20 border border-slate-300">ประเภท / สังกัด</th>
                        <th className="py-1.5 px-1.5 text-center w-28 border border-slate-300 whitespace-nowrap">สถานะ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pg.items.map((row, rIdx) => {
                        const rowNum = pg.startIndex + rIdx;
                        const isRotary = (row.club || "").includes("โรตารี่");

                        return (
                          <tr
                            key={row.ticketNo || rIdx}
                            className={`border-b border-slate-300 ${
                              rIdx % 2 === 0 ? "bg-white" : "bg-slate-50"
                            }`}
                          >
                            <td className="py-1 px-1.5 text-center font-bold text-slate-500 font-mono border-r border-slate-200">
                              {rowNum}
                            </td>
                            <td className="py-1 px-1.5 text-center font-bold font-mono text-slate-800 border-r border-slate-200">
                              {row.ticketNo}
                            </td>
                            <td className="py-1 px-2.5 border-r border-slate-200">
                              <span className="font-bold text-slate-900 block leading-tight">
                                {row.name}
                                {row.nickname && (
                                  <span className="font-semibold text-slate-600 ml-1">
                                    ({row.nickname})
                                  </span>
                                )}
                              </span>
                              {row.email && (
                                <span className="text-[9.5px] text-slate-500 block truncate leading-tight">
                                  {row.email}
                                </span>
                              )}
                            </td>
                            <td className="py-1 px-1.5 text-center font-mono text-slate-700 font-medium border-r border-slate-200 whitespace-nowrap">
                              {row.phone || "-"}
                            </td>
                            <td className="py-1 px-1.5 text-center border-r border-slate-200 whitespace-nowrap">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold ${
                                  isRotary
                                    ? "bg-red-100 text-red-700 border border-red-300"
                                    : "bg-blue-100 text-blue-700 border border-blue-300"
                                }`}
                              >
                                {isRotary ? "โรตารี่" : "สงสพัท"}
                              </span>
                            </td>
                            <td className="py-1 px-1.5 text-center whitespace-nowrap">
                              <span className="text-[9.5px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 whitespace-nowrap inline-block">
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
                  <table className="w-full text-[10.5px] border-collapse">
                    <thead>
                      <tr className="bg-pink-600 text-white text-left font-bold">
                        <th className="py-1.5 px-1.5 text-center w-10 border border-slate-300">ลำดับ</th>
                        <th className="py-1.5 px-2.5 border border-slate-300">ชื่อผู้สนับสนุน / หน่วยงาน</th>
                        <th className="py-1.5 px-1.5 text-center w-20 border border-slate-300">สังกัด</th>
                        <th className="py-1.5 px-1.5 text-center w-22 border border-slate-300">ประเภท</th>
                        <th className="py-1.5 px-2.5 border border-slate-300">รายละเอียดการสนับสนุน</th>
                        <th className="py-1.5 px-1.5 text-center w-26 border border-slate-300">แหล่งที่มา</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pg.items.map((row, rIdx) => {
                        const rowNum = pg.startIndex + rIdx;
                        const isCash = row.sponsorType === "cash";

                        return (
                          <tr
                            key={row.id || rIdx}
                            className={`border-b border-slate-300 ${
                              rIdx % 2 === 0 ? "bg-white" : "bg-slate-50"
                            }`}
                          >
                            <td className="py-1.5 px-1.5 text-center font-bold text-slate-500 font-mono border-r border-slate-200">
                              {rowNum}
                            </td>
                            <td className="py-1.5 px-2.5 border-r border-slate-200">
                              <span className="font-bold text-slate-900 block leading-tight">
                                {row.name}
                                {row.nickname && (
                                  <span className="font-semibold text-slate-600 ml-1">
                                    ({row.nickname})
                                  </span>
                                )}
                              </span>
                              {row.organization && (
                                <span className="text-[9.5px] text-slate-500 block leading-tight">
                                  {row.organization}
                                </span>
                              )}
                            </td>
                            <td className="py-1.5 px-1.5 text-center border-r border-slate-200 whitespace-nowrap">
                              <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
                                {row.club || "ทั่วไป"}
                              </span>
                            </td>
                            <td className="py-1.5 px-1.5 text-center border-r border-slate-200 whitespace-nowrap">
                              <span
                                className={`px-1.5 py-0.5 rounded-full text-[9.5px] font-bold whitespace-nowrap ${
                                  isCash
                                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                    : "bg-purple-100 text-purple-800 border border-purple-300"
                                }`}
                              >
                                {isCash ? "💵 เงินสด" : "🎁 ของสนับสนุน"}
                              </span>
                            </td>
                            <td className="py-1.5 px-2.5 border-r border-slate-200">
                              {isCash ? (
                                <span className="font-bold text-emerald-700 font-mono text-xs">
                                  ฿{Number(row.amount || 0).toLocaleString()} บาท
                                </span>
                              ) : (
                                <div>
                                  <span className="font-bold text-purple-900 block leading-tight">
                                    {row.itemName}
                                  </span>
                                  {row.itemQuantity && (
                                    <span className="text-[9.5px] text-slate-600 block leading-tight">
                                      จำนวน: {row.itemQuantity}
                                    </span>
                                  )}
                                  {row.itemNote && (
                                    <span className="text-[9.5px] text-slate-500 italic block leading-tight">
                                      {row.itemNote}
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="py-1.5 px-1.5 text-center text-[9.5px] font-medium text-slate-600 whitespace-nowrap">
                              {row.source || "สนับสนุนกิจกรรม"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}

                {/* Print Sheet Footer */}
                <div className="pt-3 mt-4 border-t border-slate-300 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="font-semibold text-slate-700">
                    แผ่นที่ {pg.pageNumber}: {pg.categoryTitle} ({pg.pageLabel}) • งานสังสรรค์ปีใหม่ SME FAN 2026
                  </span>
                  <span className="font-mono text-xs font-bold text-slate-800">
                    แผ่นที่ {pg.pageNumber} จาก {a4Pages.length} ({printTimestamp.timeStr})
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
