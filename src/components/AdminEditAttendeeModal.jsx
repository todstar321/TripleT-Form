import React, { useState, useMemo, useEffect } from "react";
import {
  X,
  User,
  CreditCard,
  FileImage,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Phone,
  Save,
  Upload,
  RefreshCw,
  Sparkles,
  ArrowRight,
  Shirt,
  Mail,
  Building2,
  Tag
} from "lucide-react";
import { uploadToCloudinary } from "../utils/cloudinary";
import { upsertRegistrationToCloud, addAuditLogToCloud, formatThaiDisplayDateTime } from "../utils/supabaseClient";
import confetti from "canvas-confetti";

export default function AdminEditAttendeeModal({
  isOpen,
  onClose,
  attendee,
  initialTab = "financial",
  eventConfig = {},
  onSaveSuccess
}) {
  if (!isOpen || !attendee) return null;

  // Active Tab: 'financial' | 'personal'
  const [activeTab, setActiveTab] = useState(initialTab);

  // 1. Personal & Registration Form State
  const [name, setName] = useState(attendee.name || "");
  const [nickname, setNickname] = useState(attendee.nickname || "");
  const [phone, setPhone] = useState(attendee.phone || "");
  const [email, setEmail] = useState(attendee.email || "");
  const [club, setClub] = useState(attendee.club || "สงสพัท");
  const [regType, setRegType] = useState(attendee.regType || "member");
  const [hasShirt, setHasShirt] = useState(Boolean(attendee.hasShirt));
  const [shirtGender, setShirtGender] = useState(attendee.shirtGender || "ชาย");
  const [shirtSize, setShirtSize] = useState(attendee.shirtSize || "L");

  // 2. Financial & Slip Form State
  const [amount, setAmount] = useState(Number(attendee.amount) || 500);
  const [paidAmount, setPaidAmount] = useState(
    Number(attendee.paidAmount !== undefined && attendee.paidAmount !== null ? attendee.paidAmount : attendee.amount) || 500
  );
  const [paymentStatus, setPaymentStatus] = useState(attendee.paymentStatus || "paid");
  const [slipUrl, setSlipUrl] = useState(attendee.slipUrl || attendee.paymentSlip || "");
  const [isUploadingSlip, setIsUploadingSlip] = useState(false);

  // 3. Admin Verification State
  const [selectedAdminId, setSelectedAdminId] = useState("");
  const [adminPhone, setAdminPhone] = useState("");
  const [editReason, setEditReason] = useState("");
  const [saveError, setSaveError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync state if attendee or initialTab changes
  useEffect(() => {
    if (attendee) {
      setName(attendee.name || "");
      setNickname(attendee.nickname || "");
      setPhone(attendee.phone || "");
      setEmail(attendee.email || "");
      setClub(attendee.club || "สงสพัท");
      setRegType(attendee.regType || "member");
      setHasShirt(Boolean(attendee.hasShirt));
      setShirtGender(attendee.shirtGender || "ชาย");
      setShirtSize(attendee.shirtSize || "L");

      setAmount(Number(attendee.amount) || 500);
      setPaidAmount(
        Number(attendee.paidAmount !== undefined && attendee.paidAmount !== null ? attendee.paidAmount : attendee.amount) || 500
      );
      setPaymentStatus(attendee.paymentStatus || "paid");
      setSlipUrl(attendee.slipUrl || attendee.paymentSlip || "");

      setActiveTab(initialTab);
      setSaveError("");
      setEditReason("");
      setAdminPhone("");
    }
  }, [attendee, initialTab]);

  // Build List of Authorized Admins (adminUsers + members)
  const authorizedAdmins = useMemo(() => {
    const list = [];
    const seen = new Set();

    // 1. System Admins
    (eventConfig?.adminUsers || []).forEach((u) => {
      if (u.name && u.phone) {
        const clean = u.phone.replace(/\D/g, "");
        seen.add(clean);
        list.push({
          id: u.id || `admin_${clean}`,
          name: u.name,
          phone: u.phone,
          cleanPhone: clean,
          role: u.role || "admin",
          label: `${u.name} (${u.role === "owner" ? "👑 เจ้าของระบบ" : u.role === "manager" ? "⭐ ผู้จัดการ" : "🛡️ แอดมิน"})`
        });
      }
    });

    // 2. Club Committee & Members
    (eventConfig?.members || []).forEach((m) => {
      if (m.name && m.phone) {
        const clean = m.phone.replace(/\D/g, "");
        if (!seen.has(clean)) {
          seen.add(clean);
          list.push({
            id: m.id || `member_${clean}`,
            name: m.nickname ? `${m.name} (${m.nickname})` : m.name,
            phone: m.phone,
            cleanPhone: clean,
            role: "member",
            label: `${m.name}${m.nickname ? ` (${m.nickname})` : ""} • สมาชิก${m.club || "สงสพัท"}`
          });
        }
      }
    });

    return list;
  }, [eventConfig]);

  // Set default admin if available
  useEffect(() => {
    if (!selectedAdminId && authorizedAdmins.length > 0) {
      setSelectedAdminId(authorizedAdmins[0].id);
    }
  }, [authorizedAdmins, selectedAdminId]);

  // Find currently selected admin
  const currentSelectedAdmin = useMemo(() => {
    return authorizedAdmins.find((a) => a.id === selectedAdminId) || null;
  }, [authorizedAdmins, selectedAdminId]);

  // Phone validation check
  const isPhoneVerified = useMemo(() => {
    if (!currentSelectedAdmin) return false;
    const cleanEntered = adminPhone.replace(/\D/g, "");
    const cleanExpected = currentSelectedAdmin.cleanPhone || "";
    return cleanEntered.length >= 9 && cleanEntered === cleanExpected;
  }, [currentSelectedAdmin, adminPhone]);

  // Calculate Field Differences (Diffs)
  const detectedDiffs = useMemo(() => {
    const diffs = [];
    if (name.trim() !== (attendee.name || "").trim()) {
      diffs.push({ field: "ชื่อ - นามสกุล", from: attendee.name || "-", to: name.trim() });
    }
    if (nickname.trim() !== (attendee.nickname || "").trim()) {
      diffs.push({ field: "ชื่อเล่น", from: attendee.nickname || "-", to: nickname.trim() || "-" });
    }
    if (phone.trim() !== (attendee.phone || "").trim()) {
      diffs.push({ field: "เบอร์โทรศัพท์", from: attendee.phone || "-", to: phone.trim() });
    }
    if (email.trim() !== (attendee.email || "").trim()) {
      diffs.push({ field: "อีเมล", from: attendee.email || "-", to: email.trim() || "-" });
    }
    if (club !== attendee.club) {
      diffs.push({ field: "สังกัด", from: attendee.club || "-", to: club });
    }
    if (regType !== attendee.regType) {
      diffs.push({ field: "ประเภท", from: attendee.regType === "guest" ? "แขก" : "สมาชิก", to: regType === "guest" ? "แขก" : "สมาชิก" });
    }
    if (hasShirt !== Boolean(attendee.hasShirt)) {
      diffs.push({ field: "สิทธิ์รับเสื้อ", from: attendee.hasShirt ? "ได้รับ" : "ไม่ได้รับ", to: hasShirt ? "ได้รับ" : "ไม่ได้รับ" });
    }
    if (shirtSize !== attendee.shirtSize || shirtGender !== attendee.shirtGender) {
      diffs.push({
        field: "ไซซ์เสื้อ",
        from: `${attendee.shirtGender || "ทั่วไป"} ${attendee.shirtSize || "L"}`,
        to: `${shirtGender} ${shirtSize}`
      });
    }

    const origPaid = Number(attendee.paidAmount !== undefined && attendee.paidAmount !== null ? attendee.paidAmount : attendee.amount) || 500;
    if (Number(paidAmount) !== origPaid) {
      diffs.push({ field: "ยอดเงินที่โอนจริง", from: `฿${origPaid.toLocaleString()}`, to: `฿${Number(paidAmount).toLocaleString()}` });
    }
    if (Number(amount) !== Number(attendee.amount || 500)) {
      diffs.push({ field: "ยอดที่ต้องชำระตามเกณฑ์", from: `฿${Number(attendee.amount || 500).toLocaleString()}`, to: `฿${Number(amount).toLocaleString()}` });
    }
    if (paymentStatus !== (attendee.paymentStatus || "paid")) {
      diffs.push({ field: "สถานะการชำระเงิน", from: attendee.paymentStatus || "paid", to: paymentStatus });
    }
    if (slipUrl !== (attendee.slipUrl || attendee.paymentSlip || "")) {
      diffs.push({ field: "รูปสลิปโอนเงิน", from: "สลิปเดิม", to: "อัปเดตสลิปใหม่" });
    }

    return diffs;
  }, [attendee, name, nickname, phone, email, club, regType, hasShirt, shirtGender, shirtSize, amount, paidAmount, paymentStatus, slipUrl]);

  // Handle Slip Upload
  const handleSlipFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingSlip(true);
    try {
      const uploadedUrl = await uploadToCloudinary(file, eventConfig?.cloudinaryConfig || {}, "admin_slips");
      if (uploadedUrl) {
        setSlipUrl(uploadedUrl);
      }
    } catch (err) {
      console.error("Slip upload error:", err);
      alert("เกิดข้อผิดพลาดในการอัปโหลดรูปสลิป กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsUploadingSlip(false);
    }
  };

  // Handle Save
  const handleSave = async () => {
    setSaveError("");

    if (!currentSelectedAdmin) {
      setSaveError("กรุณาเลือกชื่อแอดมินผู้ดำเนินการ");
      return;
    }

    if (!isPhoneVerified) {
      setSaveError(`เบอร์โทรศัพท์ยืนยันไม่ถูกต้อง กรุณาระบุเบอร์โทรศัพท์ที่ลงทะเบียนไว้กับ "${currentSelectedAdmin.name}"`);
      return;
    }

    if (!editReason.trim() || editReason.trim().length < 4) {
      setSaveError("กรุณาระบุหมายเหตุหรือเหตุผลในการแก้ไขข้อมูล เพื่อบันทึกเป็นประวัติความโปร่งใส");
      return;
    }

    if (detectedDiffs.length === 0) {
      setSaveError("ไม่พบการเปลี่ยนแปลงข้อมูล หากไม่ต้องการแก้ไขสามารถกดปุ่มยกเลิกได้ครับ");
      return;
    }

    setIsSubmitting(true);

    try {
      const numPaid = Number(paidAmount) || 0;
      const numFee = Number(amount) || 500;
      const shortage = numFee > numPaid ? numFee - numPaid : 0;
      const contribution = numPaid > numFee ? numPaid - numFee : 0;

      const updatedAttendee = {
        ...attendee,
        name: name.trim(),
        nickname: nickname.trim(),
        phone: phone.trim(),
        email: email.trim(),
        club: club,
        regType: regType,
        hasShirt: hasShirt,
        shirtGender: shirtGender,
        shirtSize: shirtSize,
        amount: numFee,
        paidAmount: numPaid,
        shortage: shortage,
        contributionAmount: contribution,
        paymentStatus: paymentStatus,
        paymentSlip: slipUrl || null,
        slipUrl: slipUrl || null,
        updatedAt: new Date().toISOString()
      };

      // 1. Upsert updated attendee to Supabase Cloud
      await upsertRegistrationToCloud(updatedAttendee);

      // 2. Create Audit Log Item
      const auditLogEntry = {
        id: `audit_${Date.now()}`,
        timestamp: new Date().toISOString(),
        formattedTime: formatThaiDisplayDateTime(new Date()),
        adminName: currentSelectedAdmin.name,
        adminPhone: currentSelectedAdmin.phone,
        reason: editReason.trim(),
        changes: detectedDiffs
      };

      // 3. Save Audit Log to Supabase Cloud
      await addAuditLogToCloud(attendee.ticketNo, auditLogEntry);

      // 4. Attach to local attendee object
      updatedAttendee.editLogs = [auditLogEntry, ...(attendee.editLogs || [])];

      // Confetti feedback
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 }
        });
      } catch (e) {}

      if (onSaveSuccess) {
        onSaveSuccess(updatedAttendee, auditLogEntry);
      }

      onClose();
    } catch (err) {
      console.error("Save error:", err);
      setSaveError("เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-5 bg-black/90 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div
        className="relative bg-slate-900 rounded-3xl border border-amber-500/50 shadow-2xl w-full max-w-3xl max-h-[94vh] flex flex-col overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ========================================================= */}
        {/* MODAL HEADER                                              */}
        {/* ========================================================= */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 px-5 sm:px-7 py-4 border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-300">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-mono font-bold text-xs">
                  {attendee.ticketNo}
                </span>
                <h3 className="text-base sm:text-lg font-black text-white">
                  แก้ไขข้อมูลผู้ลงทะเบียน (แอดมิน)
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                แก้ไขข้อมูลส่วนตัว ยอดเงิน หรือสลิป พร้อมยืนยันตัวตนเพื่อบันทึกประวัติ
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

        {/* ========================================================= */}
        {/* TABS SELECTOR (Financial vs Personal)                     */}
        {/* ========================================================= */}
        <div className="grid grid-cols-2 bg-slate-950/70 p-1.5 border-b border-white/10 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("financial")}
            className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer ${
              activeTab === "financial"
                ? "bg-amber-500 text-slate-950 shadow-md font-extrabold"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>💳 ยอดเงิน & สลิปโอนเงิน</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("personal")}
            className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer ${
              activeTab === "personal"
                ? "bg-amber-500 text-slate-950 shadow-md font-extrabold"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <User className="w-4 h-4" />
            <span>👤 ข้อมูลส่วนตัว & เสื้อ</span>
          </button>
        </div>

        {/* ========================================================= */}
        {/* MODAL BODY (SCROLLABLE)                                   */}
        {/* ========================================================= */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 text-xs sm:text-sm">

          {/* TAB 1: FINANCIAL & SLIP */}
          {activeTab === "financial" && (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center space-x-2.5">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  หากสลิปกับยอดที่บันทึกไว้ไม่ตรงกัน (เช่น สลิป 500 แต่บันทึก 581) สามารถปรับแก้ตัวเลขให้ตรงตามสลิปจริงได้ที่นี่
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. ยอดเงินที่โอนจริง */}
                <div className="space-y-1.5 p-3 rounded-2xl bg-slate-950/60 border border-white/10">
                  <label className="text-xs font-bold text-amber-300 block">
                    ยอดเงินที่โอนจริง (บาท) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-white/15 focus:border-amber-400 rounded-xl px-3 py-2 text-white font-mono font-bold text-base focus:outline-none"
                      placeholder="500"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-slate-400">บาท</span>
                  </div>
                  <div className="flex items-center gap-1.5 pt-1">
                    <span className="text-[10px] text-slate-400">ปุ่มลัด:</span>
                    {[500, 1000, 1500, 2000].map((quick) => (
                      <button
                        key={quick}
                        type="button"
                        onClick={() => setPaidAmount(quick)}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold transition-colors ${
                          paidAmount === quick ? "bg-amber-400 text-slate-950" : "bg-white/10 text-slate-300 hover:bg-white/20"
                        }`}
                      >
                        {quick}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. ยอดที่ต้องชำระตามเกณฑ์ */}
                <div className="space-y-1.5 p-3 rounded-2xl bg-slate-950/60 border border-white/10">
                  <label className="text-xs font-bold text-slate-300 block">
                    ยอดที่ต้องชำระตามเกณฑ์ (บาท) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={amount}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-white/15 focus:border-amber-400 rounded-xl px-3 py-2 text-white font-mono font-bold text-base focus:outline-none"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-slate-400">บาท</span>
                  </div>
                  <p className="text-[10px] text-slate-400 pt-1">
                    เกณฑ์ปกติคือ 500 บาท (สำหรับสมาชิกและแขก)
                  </p>
                </div>
              </div>

              {/* 3. สถานะการชำระเงิน */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 block">
                  สถานะการชำระเงิน
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "paid", label: "ชำระแล้ว", color: "emerald" },
                    { id: "pending", label: "รอตรวจสอบ", color: "amber" },
                    { id: "exempt", label: "ยกเว้นค่าลงทะเบียน", color: "slate" }
                  ].map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setPaymentStatus(st.id)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                        paymentStatus === st.id
                          ? "bg-amber-500/20 border-amber-400 text-amber-300 shadow-sm"
                          : "bg-slate-950/40 border-white/10 text-slate-400 hover:text-white"
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. สลิปธนาคาร (Slip Image & Upload) */}
              <div className="space-y-2 p-3.5 rounded-2xl bg-slate-950/60 border border-white/10">
                <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span className="flex items-center space-x-1.5">
                    <FileImage className="w-4 h-4 text-amber-400" />
                    <span>รูปสลิปธนาคาร</span>
                  </span>
                  {slipUrl && (
                    <span className="text-[10px] text-emerald-400 font-mono">
                      ✓ มีรูปสลิปในระบบ
                    </span>
                  )}
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                  {/* Current Slip Preview */}
                  <div className="rounded-xl overflow-hidden border border-white/15 bg-black h-36 flex items-center justify-center relative">
                    {slipUrl ? (
                      <img
                        src={slipUrl}
                        alt="Slip"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <span className="text-xs text-slate-500">ไม่มีรูปสลิป</span>
                    )}
                  </div>

                  {/* Upload / Replace Controls */}
                  <div className="space-y-2">
                    <label className="block">
                      <span className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-bold flex items-center justify-center space-x-2 cursor-pointer transition-colors">
                        {isUploadingSlip ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                            <span>กำลังอัปโหลด...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4 text-amber-400" />
                            <span>อัปโหลด / เปลี่ยนรูปสลิปใหม่</span>
                          </>
                        )}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleSlipFileChange}
                        disabled={isUploadingSlip}
                        className="hidden"
                      />
                    </label>

                    {slipUrl && (
                      <button
                        type="button"
                        onClick={() => setSlipUrl("")}
                        className="w-full py-1.5 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-medium border border-rose-500/20 transition-colors"
                      >
                        นำสลิปออก (ลบรูปสลิป)
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PERSONAL & SHIRT */}
          {activeTab === "personal" && (
            <div className="space-y-4 animate-fadeIn">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. ชื่อ - นามสกุล */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300 block">
                    ชื่อ - นามสกุล *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-950 border border-white/15 focus:border-amber-400 rounded-xl px-3 py-2 text-white text-xs sm:text-sm focus:outline-none"
                    placeholder="ชื่อ - นามสกุล"
                  />
                </div>

                {/* 2. ชื่อเล่น */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300 block">
                    ชื่อเล่น
                  </label>
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    className="w-full bg-slate-950 border border-white/15 focus:border-amber-400 rounded-xl px-3 py-2 text-white text-xs sm:text-sm focus:outline-none"
                    placeholder="เช่น นุ๊ก, ฟุก, โต๊ด"
                  />
                </div>

                {/* 3. เบอร์โทรศัพท์ */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300 block">
                    เบอร์โทรศัพท์ *
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-white/15 focus:border-amber-400 rounded-xl px-3 py-2 text-white font-mono text-xs sm:text-sm focus:outline-none"
                    placeholder="081-xxx-xxxx"
                  />
                </div>

                {/* 4. อีเมล */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300 block">
                    อีเมล
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-white/15 focus:border-amber-400 rounded-xl px-3 py-2 text-white text-xs sm:text-sm focus:outline-none"
                    placeholder="example@gmail.com"
                  />
                </div>

                {/* 5. สังกัด */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300 block">
                    สังกัด / สโมสร
                  </label>
                  <select
                    value={club}
                    onChange={(e) => setClub(e.target.value)}
                    className="w-full bg-slate-950 border border-white/15 focus:border-amber-400 rounded-xl px-3 py-2 text-white text-xs sm:text-sm focus:outline-none"
                  >
                    <option value="สงสพัท">สงสพัท</option>
                    <option value="โรตารี่">โรตารี่</option>
                    <option value="ทั่วไป">ทั่วไป</option>
                  </select>
                </div>

                {/* 6. ประเภทผู้เข้าร่วม */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300 block">
                    ประเภทผู้ลงทะเบียน
                  </label>
                  <select
                    value={regType}
                    onChange={(e) => setRegType(e.target.value)}
                    className="w-full bg-slate-950 border border-white/15 focus:border-amber-400 rounded-xl px-3 py-2 text-white text-xs sm:text-sm focus:outline-none"
                  >
                    <option value="member">สมาชิก SME FAN</option>
                    <option value="guest">แขกผู้มีเกียรติ (Guest)</option>
                  </select>
                </div>
              </div>

              {/* Shirt Quota & Sizing */}
              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
                    <Shirt className="w-4 h-4 text-amber-400" />
                    <span>เสื้อที่ระลึก VIP</span>
                  </span>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasShirt}
                      onChange={(e) => setHasShirt(e.target.checked)}
                      className="w-4 h-4 accent-amber-400 rounded"
                    />
                    <span className="text-xs font-semibold text-amber-300">ได้รับสิทธิ์เสื้อ</span>
                  </label>
                </div>

                {hasShirt && (
                  <div className="grid grid-cols-2 gap-3 pt-1 border-t border-white/5 animate-fadeIn">
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">ทรงเสื้อ</label>
                      <select
                        value={shirtGender}
                        onChange={(e) => setShirtGender(e.target.value)}
                        className="w-full bg-slate-900 border border-white/15 rounded-xl px-3 py-1.5 text-white text-xs focus:outline-none"
                      >
                        <option value="ชาย">ทรงตรง (ชาย)</option>
                        <option value="หญิง">ทรงเข้ารูป (หญิง)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">ขนาดไซซ์</label>
                      <select
                        value={shirtSize}
                        onChange={(e) => setShirtSize(e.target.value)}
                        className="w-full bg-slate-900 border border-white/15 rounded-xl px-3 py-1.5 text-white text-xs focus:outline-none font-bold text-amber-400"
                      >
                        {["S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"].map((sz) => (
                          <option key={sz} value={sz}>{sz}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* SECTION: DETECTED CHANGES DIFF PREVIEW                    */}
          {/* ========================================================= */}
          {detectedDiffs.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-amber-500/30 space-y-2">
              <span className="text-xs font-bold text-amber-300 flex items-center space-x-1.5">
                <Tag className="w-3.5 h-3.5 text-amber-400" />
                <span>รายการที่มีการเปลี่ยนแปลง ({detectedDiffs.length} รายการ):</span>
              </span>
              <div className="space-y-1">
                {detectedDiffs.map((d, i) => (
                  <div key={i} className="text-xs flex items-center space-x-2 text-slate-300 flex-wrap">
                    <span className="font-semibold text-slate-400">• {d.field}:</span>
                    <span className="text-rose-400 line-through font-mono">{d.from}</span>
                    <ArrowRight className="w-3 h-3 text-slate-500 shrink-0" />
                    <span className="text-emerald-400 font-bold font-mono">{d.to}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* SECTION: MANDATORY ADMIN SECURITY VERIFICATION           */}
          {/* ========================================================= */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-slate-950 to-slate-950 border-2 border-amber-500/40 space-y-3.5 shadow-xl">
            <div className="flex items-center space-x-2 text-amber-300 font-bold text-xs sm:text-sm">
              <Lock className="w-4 h-4 text-amber-400" />
              <span>ยืนยันตัวตนแอดมินผู้ดำเนินการ (Admin Security Verification) *</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* 1. เลือกชื่อตัวเองในระบบ */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300 block">
                  1) เลือกชื่อของท่านในระบบ *
                </label>
                <select
                  value={selectedAdminId}
                  onChange={(e) => {
                    setSelectedAdminId(e.target.value);
                    setAdminPhone("");
                    setSaveError("");
                  }}
                  className="w-full bg-slate-900 border border-white/20 focus:border-amber-400 rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
                >
                  {authorizedAdmins.map((adm) => (
                    <option key={adm.id} value={adm.id}>
                      {adm.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. กรอกเบอร์โทรศัพท์ยืนยัน */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300 block flex items-center justify-between">
                  <span>2) กรอกเบอร์โทรศัพท์ของท่านเพื่อยืนยัน *</span>
                  {isPhoneVerified && (
                    <span className="text-[10px] text-emerald-400 font-bold flex items-center space-x-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>ยืนยันสำเร็จ</span>
                    </span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    value={adminPhone}
                    onChange={(e) => {
                      setAdminPhone(e.target.value);
                      setSaveError("");
                    }}
                    placeholder="เช่น 093-792-5665"
                    className={`w-full bg-slate-900 border rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none ${
                      isPhoneVerified
                        ? "border-emerald-500/70 focus:border-emerald-400"
                        : adminPhone
                        ? "border-rose-500/70 focus:border-rose-400"
                        : "border-white/20 focus:border-amber-400"
                    }`}
                  />
                  <Phone className="w-3.5 h-3.5 absolute right-3 top-2.5 text-slate-500" />
                </div>
                {!isPhoneVerified && adminPhone && (
                  <p className="text-[10px] text-rose-400">
                    ❌ เบอร์โทรศัพท์ไม่ตรงกับข้อมูลในระบบ
                  </p>
                )}
              </div>
            </div>

            {/* 3. ระบุหมายเหตุ/เหตุผลที่แก้ไข */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-300 block">
                3) ระบุหมายเหตุ / เหตุผลในการแก้ไข (จำเป็นต้องระบุเพื่อบันทึกประวัติ) *
              </label>
              <textarea
                value={editReason}
                onChange={(e) => {
                  setEditReason(e.target.value);
                  setSaveError("");
                }}
                rows={2}
                placeholder="เช่น สลิปจริงโอน 500 บาท แต่ OCR อ่านเพี้ยนเป็น 581 บาท จึงปรับยอดให้ตรงกับสลิป, สมาชิกแจ้งเปลี่ยนเบอร์โทรศัพท์"
                className="w-full bg-slate-900 border border-white/20 focus:border-amber-400 rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
              />
            </div>

            {/* Error Banner */}
            {saveError && (
              <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-500/50 text-rose-300 text-xs flex items-center space-x-2 animate-fadeIn">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{saveError}</span>
              </div>
            )}
          </div>

        </div>

        {/* ========================================================= */}
        {/* MODAL FOOTER ACTIONS                                      */}
        {/* ========================================================= */}
        <div className="bg-slate-950 px-5 sm:px-7 py-3.5 border-t border-white/10 flex items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            ยกเลิก
          </button>

          <button
            type="button"
            disabled={isSubmitting || !isPhoneVerified || !editReason.trim() || detectedDiffs.length === 0}
            onClick={handleSave}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-2 transition-all shadow-lg ${
              isSubmitting || !isPhoneVerified || !editReason.trim() || detectedDiffs.length === 0
                ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5"
                : "bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 hover:scale-105 active:scale-95 shadow-amber-500/20 cursor-pointer"
            }`}
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                <span>กำลังบันทึกประวัติ...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>บันทึกการแก้ไขและบันทึกประวัติ</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
