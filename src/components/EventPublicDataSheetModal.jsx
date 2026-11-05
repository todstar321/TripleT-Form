import React, { useState, useMemo, useEffect } from "react";
import { 
  X, 
  Search, 
  Printer, 
  FileSpreadsheet, 
  Users, 
  HeartHandshake, 
  DollarSign, 
  Gift, 
  Sparkles,
  CheckCircle2,
  Building2,
  Calendar,
  Layers
} from "lucide-react";
import { fetchSponsorsFromCloud } from "../utils/supabaseClient";
import EventA4PrintModal from "./EventA4PrintModal";

export default function EventPublicDataSheetModal({
  isOpen,
  onClose,
  registrations = [],
  sponsors = [],
  eventConfig = {}
}) {
  if (!isOpen) return null;

  // Main Club Tab: 'all' | 'สงสพัท' | 'โรตารี่'
  const [activeClubTab, setActiveClubTab] = useState("all");

  // Sub Tab: 'attendees' | 'sponsors'
  const [activeSubTab, setActiveSubTab] = useState("attendees");

  // Search filter inside table
  const [searchQuery, setSearchQuery] = useState("");

  // Live sponsors state synced with cloud
  const [liveSponsors, setLiveSponsors] = useState(sponsors);

  // A4 Print & Export Modal State
  const [isA4PrintModalOpen, setIsA4PrintModalOpen] = useState(false);

  useEffect(() => {
    setLiveSponsors(sponsors);
  }, [sponsors]);

  useEffect(() => {
    if (isOpen) {
      fetchSponsorsFromCloud()
        .then((data) => {
          if (Array.isArray(data) && data.length > 0) {
            setLiveSponsors(data);
          }
        })
        .catch((err) => console.error("Cloud sponsor refresh error:", err));
    }
  }, [isOpen]);

  // Print Mode trigger: opens dedicated A4 multi-page document hub
  const handlePrint = () => {
    setIsA4PrintModalOpen(true);
  };

  // 1. Combine All Sponsors (Auto-sync excess payments + direct sponsors)
  const consolidatedSponsors = useMemo(() => {
    const list = [];
    const seenExcessKeys = new Set();

    // 1.1 Ingest excess payments from registrations
    registrations.forEach(r => {
      const paid = Number(r.paidAmount || r.amount || 0);
      const fee = Number(r.amount || 500);
      if (paid > fee) {
        const excess = paid - fee;
        seenExcessKeys.add(`${r.name}_${excess}`);
        list.push({
          id: `reg_excess_${r.ticketNo}`,
          name: r.name,
          nickname: r.nickname || "",
          phone: r.phone || "",
          club: r.club || "สงสพัท",
          organization: r.regType === 'member' ? `สมาชิก${r.club || 'สงสพัท'}` : (r.club || "แขกผู้มีเกียรติ"),
          sponsorType: "cash",
          amount: excess,
          itemName: "",
          itemQuantity: "",
          itemNote: "",
          source: "เงินสนับสนุนพร้อมลงทะเบียน",
          createdAt: r.createdAt || r.timestamp || new Date().toISOString()
        });
      }
    });

    // 1.2 Ingest direct sponsors
    liveSponsors.forEach(s => {
      list.push({
        id: s.id,
        name: s.name,
        nickname: s.nickname || "",
        phone: s.phone || "",
        club: s.club || "สงสพัท",
        organization: s.organization || (s.memberType === 'member' ? `สมาชิก${s.club || 'สงสพัท'}` : "ผู้สนับสนุนภายนอก"),
        sponsorType: s.sponsorType || "cash",
        amount: Number(s.amount || 0),
        itemName: s.itemName || "",
        itemQuantity: s.itemQuantity || "",
        itemNote: s.itemNote || "",
        source: s.source === "registration_excess" ? "เงินสนับสนุนพร้อมลงทะเบียน" : "สนับสนุนกิจกรรม",
        createdAt: s.createdAt || new Date().toISOString()
      });
    });

    return list;
  }, [registrations, liveSponsors]);

  // 2. Filter Attendees by Selected Main Club Tab and Search Query
  const filteredAttendees = useMemo(() => {
    return registrations.filter(r => {
      // Club filter
      if (activeClubTab !== "all") {
        const attendeeClub = r.club || "สงสพัท";
        if (!attendeeClub.includes(activeClubTab)) return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = r.name?.toLowerCase().includes(q);
        const matchNick = r.nickname?.toLowerCase().includes(q);
        const matchTicket = r.ticketNo?.toLowerCase().includes(q);
        const matchPhone = r.phone?.includes(q);
        const matchClub = r.club?.toLowerCase().includes(q);
        if (!matchName && !matchNick && !matchTicket && !matchPhone && !matchClub) return false;
      }
      return true;
    }).sort((a, b) => {
      const numA = parseInt((a.ticketNo || "").replace(/\D/g, "")) || 0;
      const numB = parseInt((b.ticketNo || "").replace(/\D/g, "")) || 0;
      return numA - numB;
    });
  }, [registrations, activeClubTab, searchQuery]);

  // 3. Filter Sponsors by Selected Main Club Tab and Search Query
  const filteredSponsors = useMemo(() => {
    return consolidatedSponsors.filter(s => {
      // Club filter
      if (activeClubTab !== "all") {
        const sponsorClub = s.club || "สงสพัท";
        if (!sponsorClub.includes(activeClubTab)) return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = s.name?.toLowerCase().includes(q);
        const matchNick = s.nickname?.toLowerCase().includes(q);
        const matchOrg = s.organization?.toLowerCase().includes(q);
        const matchItem = s.itemName?.toLowerCase().includes(q);
        if (!matchName && !matchNick && !matchOrg && !matchItem) return false;
      }
      return true;
    });
  }, [consolidatedSponsors, activeClubTab, searchQuery]);

  // 4. Statistics Summary for currently active club tab
  const clubStats = useMemo(() => {
    const attendeesInClub = registrations.filter(r => {
      if (activeClubTab === "all") return true;
      return (r.club || "สงสพัท").includes(activeClubTab);
    });

    const sponsorsInClub = consolidatedSponsors.filter(s => {
      if (activeClubTab === "all") return true;
      return (s.club || "สงสพัท").includes(activeClubTab);
    });

    const totalCash = sponsorsInClub
      .filter(s => s.sponsorType === "cash")
      .reduce((sum, s) => sum + (Number(s.amount) || 0), 0);

    const totalItems = sponsorsInClub
      .filter(s => s.sponsorType === "item").length;

    return {
      attendeesCount: attendeesInClub.length,
      sponsorsCount: sponsorsInClub.length,
      totalCash,
      totalItems
    };
  }, [registrations, consolidatedSponsors, activeClubTab]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn overflow-y-auto print:p-0 print:bg-white print:fixed print:inset-0">
      <div 
        className="relative w-full max-w-5xl bg-slate-900 border border-white/15 rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh] print:max-h-none print:border-none print:shadow-none print:bg-white print:rounded-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Glow */}
        <div className="h-1.5 bg-gradient-to-r from-amber-500 via-emerald-500 to-indigo-500 shrink-0 print:hidden" />

        {/* Modal Window Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-950/60 print:bg-white print:border-b-2 print:border-gray-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-slate-950 flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0 print:hidden">
              <FileSpreadsheet className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-extrabold text-white print:text-gray-900">
                  ตารางสรุปข้อมูลงานสังสรรค์ปีใหม่ SME FAN 2026
                </h2>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 print:border-gray-400 print:text-gray-800">
                  A4 / Excel View
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 print:text-gray-600">
                รายชื่อผู้ลงทะเบียนออนไลน์ และรายชื่อผู้สนับสนุนกิจกรรม (Read-Only)
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 self-end sm:self-auto print:hidden">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 hover:text-white text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer"
              title="พิมพ์เอกสารออกทางเครื่องพิมพ์"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>พิมพ์ (A4)</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* แถบหลัก (MAIN TABS): แบ่ง 3 ส่วนเท่ากัน สไตล์ตัวคั่นสมุดเว้า */}
        {/* ======================================================== */}
        <div className="px-3 sm:px-6 pt-3 bg-slate-950/90 border-b border-white/10 print:hidden">
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
            {/* แท็บที่ 1: รวมทุกสังกัด */}
            <button
              type="button"
              onClick={() => setActiveClubTab("all")}
              className={`relative py-2.5 sm:py-3 px-2 text-center rounded-t-2xl font-black text-xs sm:text-sm transition-all cursor-pointer border-t border-x ${
                activeClubTab === "all"
                  ? "bg-slate-900 text-white border-white/20 shadow-xl z-10"
                  : "bg-slate-950 text-slate-400 hover:text-slate-200 border-white/5 hover:bg-slate-900/40"
              }`}
            >
              <div className="flex items-center justify-center space-x-1.5">
                <span>📑</span>
                <span className="truncate">รวมทุกสังกัด</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  activeClubTab === "all" ? "bg-white/20 text-white" : "bg-white/5 text-slate-500"
                }`}>
                  {registrations.length}
                </span>
              </div>
              {/* Bottom Connector Notch when active */}
              {activeClubTab === "all" && (
                <div className="absolute -bottom-px left-0 right-0 h-1 bg-slate-900" />
              )}
            </button>

            {/* แท็บที่ 2: สงสพัท */}
            <button
              type="button"
              onClick={() => setActiveClubTab("สงสพัท")}
              className={`relative py-2.5 sm:py-3 px-2 text-center rounded-t-2xl font-black text-xs sm:text-sm transition-all cursor-pointer border-t border-x ${
                activeClubTab === "สงสพัท"
                  ? "bg-slate-900 text-indigo-300 border-indigo-500/40 shadow-xl z-10"
                  : "bg-slate-950 text-slate-400 hover:text-indigo-300 border-white/5 hover:bg-slate-900/40"
              }`}
            >
              <div className="flex items-center justify-center space-x-1.5">
                <span>⛳</span>
                <span className="truncate">สงสพัท</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  activeClubTab === "สงสพัท" ? "bg-indigo-500/30 text-indigo-200" : "bg-white/5 text-slate-500"
                }`}>
                  {registrations.filter(r => (r.club || "สงสพัท").includes("สงสพัท")).length}
                </span>
              </div>
              {activeClubTab === "สงสพัท" && (
                <div className="absolute -bottom-px left-0 right-0 h-1 bg-slate-900" />
              )}
            </button>

            {/* แท็บที่ 3: โรตารี่ */}
            <button
              type="button"
              onClick={() => setActiveClubTab("โรตารี่")}
              className={`relative py-2.5 sm:py-3 px-2 text-center rounded-t-2xl font-black text-xs sm:text-sm transition-all cursor-pointer border-t border-x ${
                activeClubTab === "โรตารี่"
                  ? "bg-slate-900 text-red-400 border-red-500/50 shadow-xl z-10"
                  : "bg-slate-950 text-slate-400 hover:text-red-400 border-white/5 hover:bg-slate-900/40"
              }`}
            >
              <div className="flex items-center justify-center space-x-1.5">
                <span>🏛️</span>
                <span className="truncate">โรตารี่</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  activeClubTab === "โรตารี่" ? "bg-red-500/30 text-red-200" : "bg-white/5 text-slate-500"
                }`}>
                  {registrations.filter(r => (r.club || "").includes("โรตารี่")).length}
                </span>
              </div>
              {activeClubTab === "โรตารี่" && (
                <div className="absolute -bottom-px left-0 right-0 h-1 bg-slate-900" />
              )}
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* แถบย่อย (SUB TABS): แบ่ง 2 ส่วนเท่ากัน 50% : 50%       */}
        {/* ======================================================== */}
        <div className="px-3 sm:px-6 py-2.5 bg-slate-900 border-b border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 print:hidden">
          <div className="grid grid-cols-2 gap-2 flex-1 max-w-lg p-1 rounded-2xl bg-slate-950/80 border border-white/10 shadow-inner">
            {/* แถบย่อยที่ 1: รายชื่อลงทะเบียน */}
            <button
              type="button"
              onClick={() => setActiveSubTab("attendees")}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                activeSubTab === "attendees"
                  ? "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black shadow-md shadow-amber-500/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>1. รายชื่อลงทะเบียน</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                activeSubTab === "attendees" ? "bg-slate-950/30 text-slate-950 font-extrabold" : "bg-white/5 text-slate-400"
              }`}>
                {filteredAttendees.length}
              </span>
            </button>

            {/* แถบย่อยที่ 2: ผู้สนับสนุนกิจกรรม */}
            <button
              type="button"
              onClick={() => setActiveSubTab("sponsors")}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                activeSubTab === "sponsors"
                  ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-black shadow-md shadow-emerald-500/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <HeartHandshake className="w-3.5 h-3.5" />
              <span>2. ผู้สนับสนุนกิจกรรม</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                activeSubTab === "sponsors" ? "bg-slate-950/30 text-slate-950 font-extrabold" : "bg-white/5 text-slate-400"
              }`}>
                {filteredSponsors.length}
              </span>
            </button>
          </div>

          {/* Quick Search inside modal */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาชื่อ, สังกัด, เลขบัตร..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950/90 border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-sans"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* ======================================================== */}
        {/* เนื้อหาตาราง EXCEL SHEET (READ-ONLY)                     */}
        {/* ======================================================== */}
        <div className="p-3 sm:p-6 overflow-y-auto flex-1 print:p-0 print:overflow-visible">
          <div className="bg-slate-950/70 border border-white/10 rounded-2xl shadow-xl overflow-hidden print:bg-white print:border-gray-800">
            
            {/* Sheet Banner Info */}
            <div className="bg-slate-900/90 px-4 py-2 border-b border-white/10 flex items-center justify-between text-xs text-slate-300 print:bg-gray-100 print:text-gray-800 print:border-b-2">
              <div className="font-mono flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="font-bold">
                  {activeSubTab === "attendees" ? "📋 รายชื่อผู้ลงทะเบียนออนไลน์" : "🤝 รายชื่อผู้สนับสนุนกิจกรรม"}
                </span>
                <span className="text-slate-400">
                  (สังกัด: {activeClubTab === "all" ? "รวมทุกสังกัด" : activeClubTab})
                </span>
              </div>
              <div className="text-[11px] font-mono text-slate-400 print:text-gray-600">
                แสดง {activeSubTab === "attendees" ? filteredAttendees.length : filteredSponsors.length} รายการ
              </div>
            </div>

            {/* TAB 1 CONTENT: ATTENDEES TABLE */}
            {activeSubTab === "attendees" && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-900/90 text-slate-400 font-semibold border-b border-white/10 sticky top-0 print:bg-gray-100 print:text-gray-900">
                    <tr>
                      <th className="py-2.5 px-3 w-14 text-center border-r border-white/5 print:border-gray-300">ลำดับ</th>
                      <th className="py-2.5 px-3.5 w-24 border-r border-white/5 print:border-gray-300">เลขที่บัตร</th>
                      <th className="py-2.5 px-4 min-w-[200px] border-r border-white/5 print:border-gray-300">ชื่อ - นามสกุล (ชื่อเล่น)</th>
                      <th className="py-2.5 px-3.5 min-w-[130px] border-r border-white/5 print:border-gray-300">ประเภท / สังกัด</th>
                      <th className="py-2.5 px-3.5 text-center min-w-[100px] print:border-gray-300">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 print:divide-gray-300">
                    {filteredAttendees.length > 0 ? (
                      filteredAttendees.map((r, idx) => (
                        <tr 
                          key={r.ticketNo || idx}
                          className="hover:bg-white/5 transition-colors print:hover:bg-transparent"
                        >
                          {/* ลำดับ */}
                          <td className="py-2.5 px-3 text-center font-mono text-slate-400 border-r border-white/5 print:border-gray-300 print:text-gray-700">
                            {idx + 1}
                          </td>

                          {/* เลขที่บัตร */}
                          <td className="py-2.5 px-3.5 font-mono font-bold text-amber-400 border-r border-white/5 print:border-gray-300 print:text-gray-900 whitespace-nowrap">
                            {r.ticketNo || `SME-${String(idx + 1).padStart(3, '0')}`}
                          </td>

                          {/* ชื่อ - นามสกุล */}
                          <td className="py-2.5 px-4 font-semibold text-white border-r border-white/5 print:border-gray-300 print:text-gray-900">
                            <div className="flex items-center space-x-1.5">
                              <span>{r.name}</span>
                              {r.nickname && (
                                <span className="text-amber-300 font-normal text-[11px] print:text-gray-700">
                                  ({r.nickname})
                                </span>
                              )}
                            </div>
                            {r.email && (
                              <div className="text-[10px] text-slate-400 font-normal truncate max-w-[200px] print:hidden">
                                {r.email}
                              </div>
                            )}
                          </td>

                          {/* ประเภท / สังกัด */}
                          <td className="py-2.5 px-3.5 border-r border-white/5 print:border-gray-300 whitespace-nowrap">
                            {r.regType === "member" ? (
                              (r.club || '').includes('โรตารี่') ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-red-500/20 text-red-300 border border-red-500/40 print:bg-red-100 print:text-red-900 print:border-red-300">
                                  สมาชิก{r.club}
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 print:bg-indigo-100 print:text-indigo-900 print:border-indigo-300">
                                  สมาชิก{r.club || "สงสพัท"}
                                </span>
                              )
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 print:bg-emerald-100 print:text-emerald-900 print:border-emerald-300">
                                แขกผู้มีเกียรติ {r.club && `(${r.club})`}
                              </span>
                            )}
                          </td>

                          {/* สถานะ */}
                          <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 print:bg-green-100 print:text-green-800">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>ลงทะเบียนแล้ว</span>
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                          ไม่พบข้อมูลผู้ลงทะเบียนในหมวดนี้ครับ
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB 2 CONTENT: SPONSORS TABLE */}
            {activeSubTab === "sponsors" && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-900/90 text-slate-400 font-semibold border-b border-white/10 sticky top-0 print:bg-gray-100 print:text-gray-900">
                    <tr>
                      <th className="py-2.5 px-3 w-14 text-center border-r border-white/5 print:border-gray-300">ลำดับ</th>
                      <th className="py-2.5 px-4 min-w-[180px] border-r border-white/5 print:border-gray-300">ชื่อ - นามสกุล (ชื่อเล่น)</th>
                      <th className="py-2.5 px-3.5 min-w-[130px] border-r border-white/5 print:border-gray-300">สังกัด / องค์กร</th>
                      <th className="py-2.5 px-3.5 min-w-[120px] border-r border-white/5 print:border-gray-300">ประเภทการสนับสนุน</th>
                      <th className="py-2.5 px-4 min-w-[180px] border-r border-white/5 print:border-gray-300">รายละเอียดการสนับสนุน</th>
                      <th className="py-2.5 px-3.5 text-center min-w-[130px] print:border-gray-300">ที่มา</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 print:divide-gray-300">
                    {filteredSponsors.length > 0 ? (
                      filteredSponsors.map((s, idx) => (
                        <tr 
                          key={s.id || idx}
                          className="hover:bg-white/5 transition-colors print:hover:bg-transparent"
                        >
                          {/* ลำดับ */}
                          <td className="py-2.5 px-3 text-center font-mono text-slate-400 border-r border-white/5 print:border-gray-300 print:text-gray-700">
                            {idx + 1}
                          </td>

                          {/* ชื่อ - นามสกุล */}
                          <td className="py-2.5 px-4 font-semibold text-white border-r border-white/5 print:border-gray-300 print:text-gray-900">
                            <div className="flex items-center space-x-1.5">
                              <span>{s.name}</span>
                              {s.nickname && (
                                <span className="text-amber-300 font-normal text-[11px] print:text-gray-700">
                                  ({s.nickname})
                                </span>
                              )}
                            </div>
                            {s.phone && (
                              <div className="text-[10px] text-slate-400 font-mono print:hidden">
                                {s.phone}
                              </div>
                            )}
                          </td>

                          {/* สังกัด / องค์กร */}
                          <td className="py-2.5 px-3.5 border-r border-white/5 print:border-gray-300 whitespace-nowrap">
                            {(s.club || '').includes('โรตารี่') ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-red-500/20 text-red-300 border border-red-500/40 print:bg-red-100 print:text-red-900 print:border-red-300">
                                {s.organization || `สมาชิก${s.club}`}
                              </span>
                            ) : (s.club || '').includes('สงสพัท') ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 print:bg-indigo-100 print:text-indigo-900 print:border-indigo-300">
                                {s.organization || `สมาชิก${s.club}`}
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 print:bg-emerald-100 print:text-emerald-900 print:border-emerald-300">
                                {s.organization || 'ผู้สนับสนุนภายนอก'}
                              </span>
                            )}
                          </td>

                          {/* ประเภทการสนับสนุน */}
                          <td className="py-2.5 px-3.5 border-r border-white/5 print:border-gray-300 whitespace-nowrap">
                            {s.sponsorType === "cash" ? (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-amber-500/15 text-amber-300 border border-amber-500/30 print:bg-yellow-100 print:text-yellow-900">
                                <DollarSign className="w-3 h-3 text-amber-400" />
                                <span>เงินสด</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-teal-500/15 text-teal-300 border border-teal-500/30 print:bg-teal-100 print:text-teal-900">
                                <Gift className="w-3 h-3 text-teal-400" />
                                <span>สิ่งของ / รางวัล</span>
                              </span>
                            )}
                          </td>

                          {/* รายละเอียดการสนับสนุน */}
                          <td className="py-2.5 px-4 font-mono font-bold text-white border-r border-white/5 print:border-gray-300 print:text-gray-900">
                            {s.sponsorType === "cash" ? (
                              <span className="text-amber-300 print:text-amber-900">
                                {Number(s.amount).toLocaleString()} บาท
                              </span>
                            ) : (
                              <div className="space-y-0.5 font-sans">
                                <div className="text-teal-300 font-bold print:text-teal-900">
                                  {s.itemName} {s.itemQuantity && `(${s.itemQuantity})`}
                                </div>
                                {s.itemNote && (
                                  <div className="text-[10px] text-slate-400 font-normal">
                                    หมายเหตุ: {s.itemNote}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>

                          {/* ที่มา */}
                          <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                            <span className="text-[10px] text-slate-400 print:text-gray-600">
                              {s.source}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                          ยังไม่มีรายการผู้สนับสนุนในหมวดนี้ครับ
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

          </div>
        </div>

        {/* ======================================================== */}
        {/* SUMMARY FOOTER BAR                                       */}
        {/* ======================================================== */}
        <div className="p-3 sm:p-4 px-6 bg-slate-950/80 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300 print:bg-gray-100 print:border-t-2 print:border-gray-800 print:text-gray-900">
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <div className="flex items-center space-x-1.5 font-bold">
              <Users className="w-4 h-4 text-amber-400" />
              <span>ผู้ลงทะเบียนในหมวดนี้:</span>
              <span className="font-mono text-amber-300 text-sm font-extrabold">{clubStats.attendeesCount}</span>
              <span>ท่าน</span>
            </div>

            <div className="flex items-center space-x-1.5 font-bold">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span>ยอดเงินสนับสนุนรวม:</span>
              <span className="font-mono text-emerald-400 text-sm font-extrabold">{clubStats.totalCash.toLocaleString()}</span>
              <span>บาท</span>
            </div>

            {clubStats.totalItems > 0 && (
              <div className="flex items-center space-x-1.5 font-bold">
                <Gift className="w-4 h-4 text-teal-400" />
                <span>ของสนับสนุน:</span>
                <span className="font-mono text-teal-300 text-sm font-extrabold">{clubStats.totalItems}</span>
                <span>รายการ</span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-all ml-auto cursor-pointer print:hidden"
          >
            ปิดหน้าต่าง
          </button>
        </div>

      </div>

      {/* ======================================================= */}
      {/* A4 MULTI-PAGE PRINT & IMAGE EXPORT MODAL                */}
      {/* ======================================================= */}
      <EventA4PrintModal
        isOpen={isA4PrintModalOpen}
        onClose={() => setIsA4PrintModalOpen(false)}
        registrations={registrations}
        sponsors={consolidatedSponsors}
        eventConfig={eventConfig}
      />

    </div>
  );
}
