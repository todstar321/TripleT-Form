import React, { useState, useMemo, useRef } from "react";
import { 
  X, 
  HeartHandshake, 
  DollarSign, 
  Gift, 
  Upload, 
  Check, 
  User, 
  Users, 
  Building2, 
  Phone, 
  FileText, 
  QrCode, 
  Image as ImageIcon,
  CheckCircle2,
  Sparkles,
  Search,
  ExternalLink,
  ChevronDown
} from "lucide-react";
import confetti from "canvas-confetti";
import { uploadToCloudinary } from "../utils/cloudinary";
import { formatPhoneNumber } from "../utils/phoneFormatter";
import { addSponsorToCloud } from "../utils/supabaseClient";

export default function SponsorRegistrationModal({
  isOpen,
  onClose,
  eventConfig,
  registrations = [],
  existingSponsors = [],
  onSponsorSuccess
}) {
  if (!isOpen) return null;

  // Identity: 'member' | 'guest'
  const [sponsorRole, setSponsorRole] = useState("member");

  // Member search state
  const [memberSearch, setMemberSearch] = useState("");
  const [isMemberDropdownOpen, setIsMemberDropdownOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);

  // Form Fields
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [phone, setPhone] = useState("");
  const [organization, setOrganization] = useState("");
  const [club, setClub] = useState("สงสพัท");

  // Guest Smart Typeahead
  const [guestSearchQuery, setGuestSearchQuery] = useState("");
  const [isGuestSuggestionsOpen, setIsGuestSuggestionsOpen] = useState(false);

  // Sponsorship Type: 'cash' | 'item'
  const [sponsorType, setSponsorType] = useState("cash");

  // Cash details
  const [cashAmount, setCashAmount] = useState("");
  const [slipFile, setSlipFile] = useState(null);
  const [slipPreview, setSlipPreview] = useState("");

  // Item details
  const [itemName, setItemName] = useState("");
  const [itemQuantity, setItemQuantity] = useState("");
  const [itemNote, setItemNote] = useState("");

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const fileInputRef = useRef(null);

  // 1. Members list for SME FAN members
  const allMembers = useMemo(() => {
    return eventConfig?.members || [];
  }, [eventConfig]);

  // Filtered members for dropdown search
  const filteredMembers = useMemo(() => {
    if (!memberSearch.trim()) return allMembers.slice(0, 30);
    const q = memberSearch.toLowerCase();
    return allMembers.filter(m => 
      m.name?.toLowerCase().includes(q) ||
      m.nickname?.toLowerCase().includes(q) ||
      m.memberCode?.toLowerCase().includes(q) ||
      m.phone?.includes(q)
    );
  }, [allMembers, memberSearch]);

  // 2. Candidate names for Guest Smart Typeahead
  const guestCandidates = useMemo(() => {
    const map = new Map();
    // Add external attendees from registrations
    registrations.forEach(r => {
      if (r.regType === 'guest' && r.name) {
        const key = r.name.trim();
        if (!map.has(key)) {
          map.set(key, {
            name: r.name,
            nickname: r.nickname || "",
            phone: r.phone || "",
            organization: r.club || "แขกผู้มีเกียรติ",
            club: r.club || "สงสพัท"
          });
        }
      }
    });
    // Add existing external sponsors
    existingSponsors.forEach(s => {
      if (s.name) {
        const key = s.name.trim();
        if (!map.has(key)) {
          map.set(key, {
            name: s.name,
            nickname: s.nickname || "",
            phone: s.phone || "",
            organization: s.organization || s.club || "ผู้สนับสนุนภายนอก",
            club: s.club || "สงสพัท"
          });
        }
      }
    });
    return Array.from(map.values());
  }, [registrations, existingSponsors]);

  // Filtered guest candidates when typing
  const filteredGuestCandidates = useMemo(() => {
    if (!guestSearchQuery.trim()) return [];
    const q = guestSearchQuery.toLowerCase();
    return guestCandidates.filter(c => 
      c.name.toLowerCase().includes(q) ||
      c.nickname?.toLowerCase().includes(q) ||
      c.phone?.includes(q)
    );
  }, [guestCandidates, guestSearchQuery]);

  // 3. Existing sponsorship history for currently selected person
  const previousSponsorships = useMemo(() => {
    const currentName = name.trim().toLowerCase();
    const currentPhone = phone.replace(/\D/g, "");
    if (!currentName && !currentPhone) return [];

    const matches = [];

    // Check excess payments from registrations
    registrations.forEach(r => {
      const matchName = currentName && r.name?.trim().toLowerCase() === currentName;
      const matchPhone = currentPhone && r.phone?.replace(/\D/g, "") === currentPhone;
      if (matchName || matchPhone) {
        const paid = Number(r.paidAmount || r.amount || 0);
        const fee = Number(r.amount || 500);
        if (paid > fee) {
          matches.push({
            type: 'cash',
            amount: paid - fee,
            description: `เงินสนับสนุนพร้อมลงทะเบียน (${(paid - fee).toLocaleString()} บ.)`,
            date: r.createdAt || r.timestamp
          });
        }
      }
    });

    // Check existing sponsors list
    existingSponsors.forEach(s => {
      const matchName = currentName && s.name?.trim().toLowerCase() === currentName;
      const matchPhone = currentPhone && s.phone?.replace(/\D/g, "") === currentPhone;
      if (matchName || matchPhone) {
        matches.push({
          type: s.sponsorType || 'cash',
          amount: s.amount,
          itemName: s.itemName,
          description: s.sponsorType === 'item' ? s.itemName : `${Number(s.amount).toLocaleString()} บ.`,
          date: s.createdAt
        });
      }
    });

    return matches;
  }, [name, phone, registrations, existingSponsors]);

  // Handle member selection
  const handleSelectMember = (m) => {
    setSelectedMember(m);
    setName(m.name || "");
    setNickname(m.nickname || "");
    setPhone(formatPhoneNumber(m.phone || ""));
    setClub(m.club || "สงสพัท");
    setOrganization(`สมาชิก${m.club || "สงสพัท"}`);
    setMemberSearch(`${m.name} (${m.nickname || ""})`);
    setIsMemberDropdownOpen(false);
  };

  // Handle guest candidate selection
  const handleSelectGuestCandidate = (c) => {
    setName(c.name);
    setGuestSearchQuery(c.name);
    setNickname(c.nickname || "");
    setPhone(formatPhoneNumber(c.phone || ""));
    setOrganization(c.organization || "ผู้สนับสนุนภายนอก");
    setClub(c.club || "สงสพัท");
    setIsGuestSuggestionsOpen(false);
  };

  // File upload handler
  const handleSlipChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSlipFile(file);
      const reader = new FileReader();
      reader.onload = (event) => setSlipPreview(event.target.result);
      reader.readAsDataURL(file);
    }
  };

  // Form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (!name.trim()) {
      setErrorMessage("กรุณาระบุชื่อผู้สนับสนุนครับ");
      return;
    }

    if (sponsorType === "cash") {
      const amt = Number(cashAmount);
      if (!amt || amt <= 0) {
        setErrorMessage("กรุณาระบุจำนวนเงินสนับสนุนที่ถูกต้องครับ");
        return;
      }
    } else {
      if (!itemName.trim()) {
        setErrorMessage("กรุณาระบุรายการของที่สนับสนุนครับ");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      let uploadedSlipUrl = "";
      if (sponsorType === "cash" && slipFile) {
        uploadedSlipUrl = await uploadToCloudinary(
          slipFile,
          eventConfig?.cloudinaryConfig || {},
          "sponsors"
        );
      }

      const newSponsorRecord = {
        id: `sp_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        name: name.trim(),
        nickname: nickname.trim(),
        phone: phone.trim(),
        memberType: sponsorRole,
        memberCode: selectedMember?.memberCode || "",
        club: club || "สงสพัท",
        organization: organization.trim() || (sponsorRole === "member" ? `สมาชิก${club}` : "ผู้สนับสนุนภายนอก"),
        sponsorType: sponsorType, // 'cash' | 'item'
        amount: sponsorType === "cash" ? Number(cashAmount) : 0,
        itemName: sponsorType === "item" ? itemName.trim() : "",
        itemQuantity: sponsorType === "item" ? itemQuantity.trim() : "",
        itemNote: sponsorType === "item" ? itemNote.trim() : "",
        slipUrl: uploadedSlipUrl || slipPreview || "",
        source: "standalone",
        createdAt: new Date().toISOString()
      };

      // Save to Supabase Cloud
      const ok = await addSponsorToCloud(newSponsorRecord);
      if (!ok) {
        console.warn("Could not save to Supabase Cloud directly, fallback locally");
      }

      if (onSponsorSuccess) {
        onSponsorSuccess(newSponsorRecord);
      }

      // Trigger Confetti
      try {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#f59e0b', '#10b981', '#3b82f6', '#ec4899']
        });
      } catch (e) {}

      setIsSuccess(true);
    } catch (err) {
      console.error("Sponsor submit error:", err);
      setErrorMessage("เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้งครับ");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setName("");
    setNickname("");
    setPhone("");
    setOrganization("");
    setSelectedMember(null);
    setMemberSearch("");
    setGuestSearchQuery("");
    setCashAmount("");
    setSlipFile(null);
    setSlipPreview("");
    setItemName("");
    setItemQuantity("");
    setItemNote("");
    setIsSuccess(false);
    setErrorMessage("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div 
        className="relative w-full max-w-xl bg-slate-900 border border-white/15 rounded-3xl shadow-2xl overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Glow */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-500 via-emerald-500 to-indigo-500" />

        {/* Modal Header */}
        <div className="p-4 sm:p-6 pb-3 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/30">
              <HeartHandshake className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-white">
                บันทึกผู้สนับสนุนกิจกรรม
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-400">
                ร่วมสนับสนุนงานสังสรรค์ปีใหม่ SME FAN 2026
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 max-h-[80vh] overflow-y-auto space-y-5">
          {isSuccess ? (
            /* Success State */
            <div className="py-8 text-center space-y-4 animate-scaleUp">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400 flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/20">
                <Check className="w-8 h-8 stroke-[3]" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg sm:text-xl font-black text-white">
                  บันทึกข้อมูลผู้สนับสนุนสำเร็จ!
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 max-w-sm mx-auto leading-relaxed">
                  ขอขอบพระคุณ <span className="font-bold text-amber-300">{name}</span> สำหรับการสนับสนุนกิจกรรมในครั้งนี้ ข้อมูลได้ถูกบันทึกขึ้นระบบเรียบร้อยแล้วครับ
                </p>
              </div>

              <div className="pt-4 flex items-center justify-center space-x-3">
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-all cursor-pointer"
                >
                  + บันทึกเพิ่มอีกรายการ
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 text-xs font-black shadow-lg shadow-emerald-500/20 hover:scale-105 transition-all cursor-pointer"
                >
                  เสร็จสิ้น / ปิดหน้าต่าง
                </button>
              </div>
            </div>
          ) : (
            /* Form Input State */
            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* 1. Identity Selector: สมาชิก SME FAN vs ผู้สนับสนุนภายนอก */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 block">
                  1. ข้อมูลผู้สนับสนุน (เลือกประเภท)
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-slate-950/80 border border-white/10 shadow-inner">
                  <button
                    type="button"
                    onClick={() => {
                      setSponsorRole("member");
                      handleResetForm();
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                      sponsorRole === "member"
                        ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-500/20 border border-indigo-400/40"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>สมาชิก SME FAN</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSponsorRole("guest");
                      handleResetForm();
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                      sponsorRole === "guest"
                        ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/20 border border-emerald-400/40"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>ผู้สนับสนุนภายนอก / แขก</span>
                  </button>
                </div>
              </div>

              {/* 2. Member Search / External Autocomplete */}
              {sponsorRole === "member" ? (
                <div className="space-y-3 p-3.5 rounded-2xl bg-slate-950/60 border border-white/10 relative">
                  <div className="relative">
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                      ค้นหาชื่อสมาชิกในระบบ (สงสพัท / โรตารี่):
                    </label>
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="พิมพ์ชื่อ, ชื่อเล่น หรือรหัสสมาชิก..."
                        value={memberSearch}
                        onChange={(e) => {
                          setMemberSearch(e.target.value);
                          setIsMemberDropdownOpen(true);
                        }}
                        onFocus={() => setIsMemberDropdownOpen(true)}
                        className="w-full bg-slate-900 border border-white/10 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                      />
                      <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>

                    {/* Member Dropdown Suggestions */}
                    {isMemberDropdownOpen && filteredMembers.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1.5 z-30 max-h-52 overflow-y-auto bg-slate-900 border border-white/15 rounded-2xl shadow-2xl divide-y divide-white/5">
                        {filteredMembers.map((m) => (
                          <div
                            key={m.id || m.memberCode || m.name}
                            onClick={() => handleSelectMember(m)}
                            className="p-2.5 px-3 hover:bg-indigo-500/20 cursor-pointer flex items-center justify-between transition-colors text-xs"
                          >
                            <div>
                              <span className="font-bold text-white">{m.name}</span>
                              {m.nickname && <span className="text-amber-300 ml-1">({m.nickname})</span>}
                              {m.phone && <span className="text-[10px] text-slate-400 ml-2 font-mono">{m.phone}</span>}
                            </div>
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              (m.club || '').includes('โรตารี่')
                                ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                                : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                            }`}>
                              {m.club || 'สงสพัท'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {selectedMember && (
                    <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-between text-xs">
                      <div className="space-y-0.5">
                        <div className="text-white font-bold">
                          ✓ {selectedMember.name} ({selectedMember.nickname})
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          โทร: {selectedMember.phone || '-'} • สังกัด: {selectedMember.club}
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                        (selectedMember.club || '').includes('โรตารี่')
                          ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                          : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                      }`}>
                        สมาชิก{selectedMember.club}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                /* External / Guest Smart Autocomplete */
                <div className="space-y-3 p-3.5 rounded-2xl bg-slate-950/60 border border-white/10 relative">
                  <div className="relative">
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                      ชื่อ-นามสกุล ผู้สนับสนุนภายนอก (มีระบบช่วยจำชื่อเก่า):
                    </label>
                    <input
                      type="text"
                      placeholder="พิมพ์ชื่อผู้สนับสนุน (เช่น คุณสมชาย ใจดี)..."
                      value={guestSearchQuery || name}
                      onChange={(e) => {
                        const val = e.target.value;
                        setGuestSearchQuery(val);
                        setName(val);
                        setIsGuestSuggestionsOpen(true);
                      }}
                      onFocus={() => setIsGuestSuggestionsOpen(true)}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />

                    {/* Guest Suggestions Dropdown */}
                    {isGuestSuggestionsOpen && filteredGuestCandidates.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1.5 z-30 max-h-48 overflow-y-auto bg-slate-900 border border-white/15 rounded-2xl shadow-2xl divide-y divide-white/5">
                        <div className="px-3 py-1.5 text-[10px] text-amber-400 bg-slate-950 font-bold">
                          💡 แนะนำจากประวัติผู้ที่เคยลงทะเบียนหรือสนับสนุนแล้ว:
                        </div>
                        {filteredGuestCandidates.map((c, i) => (
                          <div
                            key={i}
                            onClick={() => handleSelectGuestCandidate(c)}
                            className="p-2.5 px-3 hover:bg-emerald-500/20 cursor-pointer flex items-center justify-between transition-colors text-xs"
                          >
                            <div>
                              <span className="font-bold text-white">{c.name}</span>
                              {c.nickname && <span className="text-amber-300 ml-1">({c.nickname})</span>}
                              {c.phone && <span className="text-[10px] text-slate-400 ml-2 font-mono">{c.phone}</span>}
                            </div>
                            <span className="text-[10px] text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10">
                              {c.organization}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">ชื่อหน่วยงาน / บริษัท / สังกัด:</label>
                      <input
                        type="text"
                        placeholder="เช่น บจก. เอสเอ็มอี ไทย หรือ ทั่วไป"
                        value={organization}
                        onChange={(e) => setOrganization(e.target.value)}
                        className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">เบอร์โทรศัพท์ติดต่อ:</label>
                      <input
                        type="tel"
                        placeholder="เช่น 081-234-5678"
                        value={phone}
                        onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
                        className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* History Notice if they previously sponsored */}
              {previousSponsorships.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 space-y-1">
                  <div className="font-bold flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>พบประวัติการร่วมสนับสนุนก่อนหน้านี้:</span>
                  </div>
                  <ul className="list-disc list-inside text-[11px] text-amber-200/90 pl-1 space-y-0.5">
                    {previousSponsorships.map((p, idx) => (
                      <li key={idx}>{p.description}</li>
                    ))}
                  </ul>
                  <div className="text-[10px] text-slate-400 pt-0.5">
                    ขอขอบพระคุณสำหรับการสนับสนุนเพิ่มเติมในครั้งนี้ครับ
                  </div>
                </div>
              )}

              {/* 3. Sponsorship Type: Cash vs Item */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 block">
                  2. ประเภทการสนับสนุน
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-slate-950/80 border border-white/10 shadow-inner">
                  <button
                    type="button"
                    onClick={() => setSponsorType("cash")}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                      sponsorType === "cash"
                        ? "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black shadow-md shadow-amber-500/20"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <DollarSign className="w-4 h-4" />
                    <span>สนับสนุนเป็นเงินสด</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSponsorType("item")}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                      sponsorType === "item"
                        ? "bg-gradient-to-r from-teal-500 to-emerald-600 text-slate-950 font-black shadow-md shadow-teal-500/20"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Gift className="w-4 h-4" />
                    <span>สนับสนุนเป็นสิ่งของ / รางวัล</span>
                  </button>
                </div>
              </div>

              {/* CASH INPUT FORM */}
              {sponsorType === "cash" && (
                <div className="space-y-3 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 animate-fadeIn">
                  <div>
                    <label className="text-xs font-bold text-white block mb-1.5">
                      จำนวนเงินสนับสนุน (บาท):
                    </label>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {[500, 1000, 2000, 5000, 10000].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setCashAmount(amt.toString())}
                          className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                            cashAmount === amt.toString()
                              ? "bg-amber-500 text-slate-950 shadow-md"
                              : "bg-white/5 text-slate-300 hover:bg-white/10"
                          }`}
                        >
                          {amt.toLocaleString()} ฿
                        </button>
                      ))}
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        placeholder="หรือพิมพ์จำนวนเงินเอง..."
                        value={cashAmount}
                        onChange={(e) => setCashAmount(e.target.value)}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-amber-300 font-mono font-bold placeholder-slate-600 focus:outline-none focus:border-amber-500"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">
                        บาท
                      </span>
                    </div>
                  </div>

                  {/* Bank info reminder */}
                  <div className="p-3 rounded-xl bg-slate-950/70 border border-white/10 flex items-center justify-between text-xs">
                    <div className="space-y-0.5">
                      <div className="font-bold text-white flex items-center space-x-1">
                        <QrCode className="w-3.5 h-3.5 text-amber-400" />
                        <span>{eventConfig?.bankInfo?.bankName || 'ธ.กสิกรไทย'}</span>
                      </div>
                      <div className="font-mono text-amber-300 text-xs font-bold">
                        {eventConfig?.bankInfo?.accountNumber || '045-8-99921-4'}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {eventConfig?.bankInfo?.accountName || 'กองทุนกิจกรรม SME FAN (ทีป์ชลิต ทองจันทร์)'}
                      </div>
                    </div>
                    {eventConfig?.bankInfo?.qrImage && (
                      <img 
                        src={eventConfig.bankInfo.qrImage} 
                        alt="QR PromptPay" 
                        className="w-12 h-12 rounded-lg bg-white p-0.5 border border-white/20"
                      />
                    )}
                  </div>

                  {/* Slip Upload */}
                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                      แนบหลักฐานสลิปโอนเงิน (สลิปโอนเงิน):
                    </label>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleSlipChange} 
                      accept="image/*" 
                      className="hidden" 
                    />
                    
                    {slipPreview ? (
                      <div className="relative p-2 rounded-xl bg-slate-950 border border-emerald-500/40 flex items-center justify-between">
                        <div className="flex items-center space-x-2 min-w-0">
                          <img src={slipPreview} alt="Slip Preview" className="w-10 h-10 rounded-lg object-cover border border-white/20 shrink-0" />
                          <div className="min-w-0">
                            <span className="text-xs text-emerald-400 font-bold block truncate">✓ แนบรูปภาพสลิปแล้ว</span>
                            <span className="text-[10px] text-slate-400 truncate block">{slipFile?.name || 'slip.jpg'}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSlipFile(null);
                            setSlipPreview("");
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full py-3 px-4 rounded-xl border border-dashed border-amber-500/40 hover:border-amber-400 bg-slate-950/60 hover:bg-slate-950 text-slate-300 hover:text-amber-300 text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer"
                      >
                        <Upload className="w-4 h-4 text-amber-400" />
                        <span>คลิกเพื่ออัปโหลดรูปภาพสลิป</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* ITEM INPUT FORM */}
              {sponsorType === "item" && (
                <div className="space-y-3 p-4 rounded-2xl bg-teal-500/5 border border-teal-500/20 animate-fadeIn">
                  <div>
                    <label className="text-xs font-bold text-white block mb-1">
                      รายการสิ่งของ / ของรางวัลที่สนับสนุน: *
                    </label>
                    <input
                      type="text"
                      placeholder="เช่น พัดลม Hatari 16 นิ้ว, ไวน์แดง 2 ลัง, คูปองส่วนลด..."
                      value={itemName}
                      onChange={(e) => setItemName(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">จำนวน / หน่วย:</label>
                      <input
                        type="text"
                        placeholder="เช่น 1 เครื่อง, 2 ลัง, 10 ใบ"
                        value={itemQuantity}
                        onChange={(e) => setItemQuantity(e.target.value)}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">หมายเหตุเพิ่มเติม:</label>
                      <input
                        type="text"
                        placeholder="เช่น มอบช่วงเปิดงาน, ส่งมอบล่วงหน้า"
                        value={itemNote}
                        onChange={(e) => setItemNote(e.target.value)}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold">
                  ⚠️ {errorMessage}
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end space-x-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-xl shadow-amber-500/25 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer flex items-center space-x-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      <span>กำลังบันทึก...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>ยืนยันบันทึกผู้สนับสนุน</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          )}
        </div>
      </div>
    </div>
  );
}
