/**
 * Seating Plan & Table Booking Data Helpers
 * Shared between EventCheckInHub, TableSeatingHub, and Lucky Draw
 */

export const SEATING_STORAGE_KEY = "sme_fan_seating_plan_v1";
export const DEFAULT_HOLD_DURATION_MINUTES = 15;
export const HOLD_DURATION_OPTIONS = [15, 30, 60, 120];
export const OWNER_VIP_PIN = "0937925665";

export const HOLD_TIER_OPTIONS = [
  {
    id: "tier_15",
    minutes: 15,
    label: "15 นาที",
    sublabel: "ฟรี (สิทธิ์ฟรี 1 ครั้ง/ท่าน)",
    fineAmount: 0,
    requiresOwnerPin: false,
    isVip: false,
    tone: "emerald"
  },
  {
    id: "tier_30",
    minutes: 30,
    label: "30 นาที",
    sublabel: "มาไม่ทัน ปรับ 50 บาท",
    fineAmount: 50,
    requiresOwnerPin: false,
    isVip: false,
    tone: "amber"
  },
  {
    id: "tier_60",
    minutes: 60,
    label: "60 นาที",
    sublabel: "มาไม่ทัน ปรับ 100 บาท",
    fineAmount: 100,
    requiresOwnerPin: false,
    isVip: false,
    tone: "orange"
  },
  {
    id: "tier_120_vip",
    minutes: 120,
    label: "แขกผู้ใหญ่ (120 นาที)",
    sublabel: "ใส่รหัสเจ้าของแอป",
    fineAmount: 0,
    requiresOwnerPin: true,
    isVip: true,
    tone: "violet"
  }
];

/**
 * Returns configured advance-hold tiers from seatingPlan (admin-customizable) or defaults
 */
export function getHoldTierOptions(seatingPlan = null) {
  const raw = Array.isArray(seatingPlan?.holdTiers) && seatingPlan.holdTiers.length > 0
    ? seatingPlan.holdTiers
    : HOLD_TIER_OPTIONS;

  return raw
    .filter((t) => t && Number(t.minutes) >= 1)
    .map((t, idx) => {
      const mins = Math.max(1, Math.min(720, Math.round(Number(t.minutes) || 15)));
      const fine = Math.max(0, Math.round(Number(t.fineAmount) || 0));
      const isVip = Boolean(t.isVip || t.requiresOwnerPin);
      const requiresOwnerPin = Boolean(t.requiresOwnerPin || t.isVip);
      const label = String(t.label || "").trim() || (isVip ? `แขกผู้ใหญ่ (${mins} นาที)` : `${mins} นาที`);
      return {
        id: t.id || `tier_${mins}_${fine}_${isVip ? "vip" : idx}`,
        minutes: mins,
        label,
        sublabel: isVip
          ? "ฟรี • ต้องใช้รหัสเจ้าของแอป"
          : fine > 0
          ? `มาไม่ทัน ปรับ ${fine.toLocaleString()} บาท`
          : "ฟรี (สิทธิ์ฟรี 1 ครั้ง/ท่าน)",
        fineAmount: fine,
        requiresOwnerPin,
        isVip,
        tone: isVip ? "violet" : fine === 0 ? "emerald" : fine >= 100 ? "orange" : "amber"
      };
    })
    .sort((a, b) => {
      if (a.isVip !== b.isVip) return a.isVip ? 1 : -1;
      if (a.minutes !== b.minutes) return a.minutes - b.minutes;
      return a.fineAmount - b.fineAmount;
    });
}

/**
 * True if tier is a regular free tier (subject to 1 free hold per seat owner)
 */
export function isFreeNonVipTier(tier) {
  if (!tier) return false;
  return Number(tier.fineAmount || 0) === 0 && !tier.isVip && !tier.requiresOwnerPin;
}

export function getHoldTierOption(minutesOrId, seatingPlan = null) {
  const tiers = getHoldTierOptions(seatingPlan);
  if (typeof minutesOrId === "string") {
    const byId = tiers.find((t) => t.id === minutesOrId);
    if (byId) return byId;
  }
  const m = Number(minutesOrId) || 15;
  const byMins = tiers.find((t) => t.minutes === m);
  if (byMins) return byMins;
  return {
    id: `tier_custom_${m}`,
    minutes: m,
    label: `${m} นาที`,
    sublabel: m === 30 ? "มาไม่ทัน ปรับ 50 บาท" : m === 60 ? "มาไม่ทัน ปรับ 100 บาท" : "ฟรี",
    fineAmount: m === 30 ? 50 : m === 60 ? 100 : 0,
    requiresOwnerPin: m >= 120,
    isVip: m >= 120,
    tone: "amber"
  };
}

/**
 * Check whether a seat owner (by ticketNo) has already used their 1-time free advance hold quota
 */
export function getFreeHoldUsage(seatingPlan, ticketNo) {
  if (!seatingPlan || !ticketNo) return null;
  return seatingPlan.freeHoldUsedByTicket?.[ticketNo] || null;
}

export function hasUsedFreeHold(seatingPlan, ticketNo) {
  return Boolean(getFreeHoldUsage(seatingPlan, ticketNo));
}

/**
 * Format ISO timestamp into crisp Thai clock time (e.g. "18:05:12 น." or "27 พ.ย. 18:05 น.")
 */
export function formatThaiClockTime(isoStr, includeSeconds = true) {
  if (!isoStr) return "-";
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return "-";
  const opts = includeSeconds
    ? { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }
    : { hour: "2-digit", minute: "2-digit", hour12: false };
  return `${d.toLocaleTimeString("th-TH", opts)} น.`;
}

/**
 * Format ISO timestamp with short Thai date + time for audit trails
 */
export function formatThaiDateClock(isoStr) {
  if (!isoStr) return "-";
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return "-";
  const datePart = d.toLocaleDateString("th-TH", { day: "numeric", month: "short" });
  const timePart = d.toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });
  return `${datePart} ${timePart} น.`;
}

/**
 * Normalize seatingPlan.expiredHoldFines[ticketNo] into an array (backward-compatible with legacy single object)
 */
export function getTicketFineRecords(seatingPlan, ticketNo) {
  const raw = seatingPlan?.expiredHoldFines?.[ticketNo];
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(Boolean);
  if (typeof raw === "object") return [raw];
  return [];
}

/**
 * Flatten all fine records across all tickets, sorted newest first
 */
export function getAllFineRecords(seatingPlan) {
  const map = seatingPlan?.expiredHoldFines || {};
  const list = [];
  Object.entries(map).forEach(([tNo, val]) => {
    const arr = Array.isArray(val) ? val : val && typeof val === "object" ? [val] : [];
    arr.forEach((item) => {
      if (item) list.push({ ...item, ticketNo: item.ticketNo || tNo });
    });
  });
  return list.sort(
    (a, b) =>
      new Date(b.expiredAt || b.bookedAt || 0).getTime() -
      new Date(a.expiredAt || a.bookedAt || 0).getTime()
  );
}

/**
 * Validate Owner VIP PIN (0937925665 or configured owner phone digits)
 */
export function isValidOwnerPin(input = "", eventConfig = null) {
  const digits = String(input || "").replace(/\D/g, "");
  if (!digits) return false;
  if (digits === OWNER_VIP_PIN) return true;
  const ownerUsers = (eventConfig?.adminUsers || []).filter((u) => u.role === "owner");
  return ownerUsers.some((u) => {
    const uPhone = String(u.phone || "").replace(/\D/g, "");
    return uPhone && uPhone === digits;
  });
}

export const CUSTOM_COLOR_THEMES = {
  violet: {
    id: "violet",
    name: "ม่วง",
    swatch: "bg-violet-500",
    tileBg: "bg-gradient-to-br from-violet-50 via-purple-50 to-violet-100",
    tileBorder: "border-violet-300/90",
    tileHover: "hover:border-violet-500",
    tileSelected: "border-violet-500 ring-4 ring-violet-400/30",
    text: "text-violet-900",
    btnActive: "bg-violet-600 text-white"
  },
  sky: {
    id: "sky",
    name: "ฟ้า",
    swatch: "bg-sky-500",
    tileBg: "bg-gradient-to-br from-sky-50 via-cyan-50 to-sky-100",
    tileBorder: "border-sky-300/90",
    tileHover: "hover:border-sky-500",
    tileSelected: "border-sky-500 ring-4 ring-sky-400/30",
    text: "text-sky-900",
    btnActive: "bg-sky-600 text-white"
  },
  emerald: {
    id: "emerald",
    name: "เขียว",
    swatch: "bg-emerald-500",
    tileBg: "bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-100",
    tileBorder: "border-emerald-300/90",
    tileHover: "hover:border-emerald-500",
    tileSelected: "border-emerald-500 ring-4 ring-emerald-400/30",
    text: "text-emerald-900",
    btnActive: "bg-emerald-600 text-white"
  },
  orange: {
    id: "orange",
    name: "ส้ม",
    swatch: "bg-orange-500",
    tileBg: "bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100",
    tileBorder: "border-orange-300/90",
    tileHover: "hover:border-orange-500",
    tileSelected: "border-orange-500 ring-4 ring-orange-400/30",
    text: "text-orange-900",
    btnActive: "bg-orange-500 text-white"
  },
  rose: {
    id: "rose",
    name: "ชมพู-แดง",
    swatch: "bg-rose-500",
    tileBg: "bg-gradient-to-br from-pink-50 via-rose-50 to-amber-50",
    tileBorder: "border-rose-300/90",
    tileHover: "hover:border-rose-500",
    tileSelected: "border-rose-500 ring-4 ring-rose-400/30",
    text: "text-rose-900",
    btnActive: "bg-rose-500 text-white"
  },
  amber: {
    id: "amber",
    name: "ทอง-เหลือง",
    swatch: "bg-amber-500",
    tileBg: "bg-gradient-to-br from-amber-50 via-yellow-50 to-amber-100",
    tileBorder: "border-amber-300/90",
    tileHover: "hover:border-amber-500",
    tileSelected: "border-amber-500 ring-4 ring-amber-400/30",
    text: "text-amber-900",
    btnActive: "bg-amber-500 text-slate-950"
  },
  teal: {
    id: "teal",
    name: "เขียวมิ้นต์",
    swatch: "bg-teal-500",
    tileBg: "bg-gradient-to-br from-slate-100 to-teal-50",
    tileBorder: "border-teal-300/90",
    tileHover: "hover:border-teal-500",
    tileSelected: "border-teal-500 ring-4 ring-teal-400/30",
    text: "text-teal-900",
    btnActive: "bg-teal-600 text-white"
  },
  indigo: {
    id: "indigo",
    name: "น้ำเงินเข้ม",
    swatch: "bg-indigo-700",
    tileBg: "bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900",
    tileBorder: "border-indigo-500/50",
    tileHover: "hover:border-amber-300",
    tileSelected: "border-amber-400 ring-4 ring-amber-400/30",
    text: "text-white",
    btnActive: "bg-indigo-600 text-white"
  }
};

export const CUSTOM_EMOJIS = [
  "🛍️", "🪑", "🎤", "🍛", "🎁", "🚪", "📸", "🍹",
  "⭐", "🎵", "🏆", "📺", "💐", "🪴", "☕", "📋"
];

export const CUSTOM_ITEM_PRESETS = [
  { label: "โต๊ะโชว์สินค้า", emoji: "🛍️", colorTheme: "violet", isBookable: false, defaultW: 2, defaultH: 1 },
  { label: "บูธสปอนเซอร์", emoji: "⭐", colorTheme: "amber", isBookable: false, defaultW: 2, defaultH: 1 },
  { label: "ซุ้มถ่ายรูป", emoji: "📸", colorTheme: "sky", isBookable: false, defaultW: 2, defaultH: 1 },
  { label: "บาร์เครื่องดื่ม", emoji: "🍹", colorTheme: "teal", isBookable: false, defaultW: 2, defaultH: 1 },
  { label: "จุดดนตรี / ดีเจ", emoji: "🎵", colorTheme: "indigo", isBookable: false, defaultW: 2, defaultH: 1 },
  { label: "โต๊ะ VIP", emoji: "🏆", colorTheme: "amber", isBookable: true, defaultW: 2, defaultH: 2, defaultCapacity: 8, defaultShape: "round" }
];

export const DEFAULT_PALETTE_TYPES = [
  {
    id: "table",
    baseType: "table",
    label: "โต๊ะนั่งแขก",
    emoji: "🪑",
    colorTheme: "emerald",
    isBookable: true,
    defaultW: 2,
    defaultH: 2,
    defaultCapacity: 8,
    defaultShape: "round",
    isCore: true
  },
  {
    id: "stage",
    baseType: "stage",
    label: "เวที (Stage)",
    emoji: "🎤",
    colorTheme: "indigo",
    isBookable: false,
    defaultW: 2,
    defaultH: 1
  },
  {
    id: "buffet",
    baseType: "buffet",
    label: "โซนบุฟเฟ่ต์",
    emoji: "🍛",
    colorTheme: "orange",
    isBookable: false,
    defaultW: 1,
    defaultH: 2
  },
  {
    id: "gift",
    baseType: "gift",
    label: "โต๊ะของขวัญ",
    emoji: "🎁",
    colorTheme: "rose",
    isBookable: false,
    defaultW: 2,
    defaultH: 1
  },
  {
    id: "entrance",
    baseType: "entrance",
    label: "ทางเข้า/ลงทะเบียน",
    emoji: "🚪",
    colorTheme: "teal",
    isBookable: false,
    defaultW: 2,
    defaultH: 1
  }
];

export function getPaletteTypes(seatingPlan) {
  if (seatingPlan && Array.isArray(seatingPlan.paletteTypes) && seatingPlan.paletteTypes.length > 0) {
    return seatingPlan.paletteTypes;
  }
  return DEFAULT_PALETTE_TYPES;
}

export const ITEM_TYPES = {
  table: {
    type: "table",
    label: "โต๊ะนั่งแขก",
    shortLabel: "โต๊ะ",
    defaultW: 2,
    defaultH: 2,
    defaultCapacity: 8,
    defaultShape: "round"
  },
  stage: {
    type: "stage",
    label: "เวที (Stage)",
    shortLabel: "เวที",
    defaultW: 2,
    defaultH: 1
  },
  buffet: {
    type: "buffet",
    label: "โซนบุฟเฟ่ต์ / โต๊ะอาหาร",
    shortLabel: "บุฟเฟ่ต์",
    defaultW: 1,
    defaultH: 2
  },
  gift: {
    type: "gift",
    label: "โต๊ะของขวัญ / จับรางวัล",
    shortLabel: "ของขวัญ",
    defaultW: 2,
    defaultH: 1
  },
  entrance: {
    type: "entrance",
    label: "ทางเข้า / จุดลงทะเบียน",
    shortLabel: "ทางเข้า",
    defaultW: 2,
    defaultH: 1
  }
};

export function createDefaultSeatingPlan() {
  return {
    gridCols: 10,
    gridRows: 10,
    roomTitle: "ห้องจัดเลี้ยง โรงแรมบุรีศรีภู (ผังที่นั่งงาน SME FAN 2026)",
    updatedAt: new Date().toISOString(),
    items: [
      {
        id: "entrance_1",
        type: "entrance",
        label: "ทางเข้า / จุดลงทะเบียน",
        x: 0,
        y: 0,
        w: 2,
        h: 1
      },
      {
        id: "stage_1",
        type: "stage",
        label: "เวทีหลัก (STAGE)",
        x: 2,
        y: 0,
        w: 6,
        h: 1
      },
      {
        id: "gift_1",
        type: "gift",
        label: "โต๊ะของขวัญ",
        x: 8,
        y: 0,
        w: 2,
        h: 1
      },
      {
        id: "buffet_1",
        type: "buffet",
        label: "โซนบุฟเฟ่ต์อาหาร",
        x: 0,
        y: 2,
        w: 1,
        h: 6
      },
      {
        id: "tbl_A",
        type: "table",
        code: "A",
        label: "โต๊ะ A",
        capacity: 8,
        shape: "round",
        isOpen: true,
        x: 2,
        y: 2,
        w: 2,
        h: 2
      },
      {
        id: "tbl_B",
        type: "table",
        code: "B",
        label: "โต๊ะ B",
        capacity: 8,
        shape: "round",
        isOpen: true,
        x: 5,
        y: 2,
        w: 2,
        h: 2
      },
      {
        id: "tbl_C",
        type: "table",
        code: "C",
        label: "โต๊ะ C",
        capacity: 8,
        shape: "round",
        isOpen: true,
        x: 8,
        y: 2,
        w: 2,
        h: 2
      },
      {
        id: "tbl_D",
        type: "table",
        code: "D",
        label: "โต๊ะ D",
        capacity: 8,
        shape: "round",
        isOpen: true,
        x: 2,
        y: 5,
        w: 2,
        h: 2
      },
      {
        id: "tbl_E",
        type: "table",
        code: "E",
        label: "โต๊ะ E",
        capacity: 8,
        shape: "round",
        isOpen: true,
        x: 5,
        y: 5,
        w: 2,
        h: 2
      },
      {
        id: "tbl_F",
        type: "table",
        code: "F",
        label: "โต๊ะ F",
        capacity: 8,
        shape: "round",
        isOpen: true,
        x: 8,
        y: 5,
        w: 2,
        h: 2
      },
      {
        id: "tbl_G",
        type: "table",
        code: "G",
        label: "โต๊ะ G",
        capacity: 8,
        shape: "round",
        isOpen: true,
        x: 2,
        y: 8,
        w: 2,
        h: 2
      },
      {
        id: "tbl_H",
        type: "table",
        code: "H",
        label: "โต๊ะ H",
        capacity: 8,
        shape: "round",
        isOpen: true,
        x: 5,
        y: 8,
        w: 2,
        h: 2
      }
    ],
    holdDurationMinutes: DEFAULT_HOLD_DURATION_MINUTES,
    holdTiers: HOLD_TIER_OPTIONS,
    fineQrCodeUrl: null,
    fineQrDeleteToken: null,
    paletteTypes: DEFAULT_PALETTE_TYPES,
    assignments: {},
    seatChangeRequests: {},
    expiredHoldFines: {},
    freeHoldUsedByTicket: {}
  };
}

export function createEmptySeatingPlan(
  gridCols = 10,
  gridRows = 10,
  roomTitle = "ห้องจัดเลี้ยง โรงแรมบุรีศรีภู",
  paletteTypes = DEFAULT_PALETTE_TYPES,
  holdDurationMinutes = DEFAULT_HOLD_DURATION_MINUTES,
  fineQrCodeUrl = null,
  fineQrDeleteToken = null,
  holdTiers = HOLD_TIER_OPTIONS
) {
  return {
    gridCols,
    gridRows,
    roomTitle,
    holdDurationMinutes: Number(holdDurationMinutes) || DEFAULT_HOLD_DURATION_MINUTES,
    holdTiers: Array.isArray(holdTiers) && holdTiers.length > 0 ? holdTiers : HOLD_TIER_OPTIONS,
    fineQrCodeUrl,
    fineQrDeleteToken,
    updatedAt: new Date().toISOString(),
    paletteTypes: Array.isArray(paletteTypes) && paletteTypes.length > 0 ? paletteTypes : DEFAULT_PALETTE_TYPES,
    items: [],
    assignments: {},
    seatChangeRequests: {},
    expiredHoldFines: {},
    freeHoldUsedByTicket: {}
  };
}

/**
 * Returns hold duration setting in minutes (default 15)
 */
export function getHoldDurationMinutes(seatingPlan) {
  const val = Number(seatingPlan?.holdDurationMinutes);
  return !isNaN(val) && val >= 1 ? val : DEFAULT_HOLD_DURATION_MINUTES;
}

/**
 * Check if a seat assignment is a temporary hold whose timer has expired
 */
export function isAssignmentExpired(assignment, nowMs = Date.now()) {
  if (!assignment || assignment.status !== "hold") return false;
  if (!assignment.holdExpiresAt) return false;
  const expMs = new Date(assignment.holdExpiresAt).getTime();
  if (isNaN(expMs)) return false;
  return expMs <= nowMs;
}

/**
 * Remaining milliseconds for a temporary hold (0 if expired or not a hold)
 */
export function getHoldRemainingMs(assignment, nowMs = Date.now()) {
  if (!assignment || assignment.status !== "hold" || !assignment.holdExpiresAt) return 0;
  const expMs = new Date(assignment.holdExpiresAt).getTime();
  if (isNaN(expMs)) return 0;
  return Math.max(0, expMs - nowMs);
}

/**
 * Format remaining ms into MM:SS countdown string (e.g. "14:52")
 */
export function formatCountdownMmSs(ms) {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

/**
 * Check if seatingPlan currently contains any temporary hold assignments
 */
export function hasAnyHolds(seatingPlan) {
  if (!seatingPlan?.assignments) return false;
  return Object.values(seatingPlan.assignments).some((a) => a && a.status === "hold");
}

/**
 * Remove any expired temporary hold assignments from seatingPlan (pure function).
 * If an expired hold had a fineAmount > 0 (e.g. 30 min = 50 THB, 60 min = 100 THB),
 * appends an unpaid fine record into seatingPlan.expiredHoldFines[ticketNo] (cumulative array!)
 * so multiple late holds accumulate (e.g. 50 + 100 = 150 THB) with exact bookedAt & expiredAt timestamps.
 */
export function pruneExpiredHolds(seatingPlan, nowMs = Date.now()) {
  if (!seatingPlan?.assignments) return { changed: false, plan: seatingPlan, expiredCount: 0 };
  let expiredCount = 0;
  const nextAssignments = {};
  const expiredTickets = new Set();
  const nextFines = { ...(seatingPlan.expiredHoldFines || {}) };
  const nextFreeUsed = { ...(seatingPlan.freeHoldUsedByTicket || {}) };

  const tableById = new Map();
  (seatingPlan.items || []).forEach((it) => {
    if (it.type === "table") tableById.set(it.id, it);
  });

  Object.entries(seatingPlan.assignments).forEach(([key, val]) => {
    if (isAssignmentExpired(val, nowMs)) {
      expiredCount++;
      if (val?.ticketNo) {
        expiredTickets.add(val.ticketNo);
        const holdMins = Number(val.holdDurationMinutes) || 15;
        const tierOpt = getHoldTierOption(val.holdTierId || holdMins, seatingPlan);
        const computedFine =
          val.fineAmount !== undefined && val.fineAmount !== null
            ? Number(val.fineAmount)
            : tierOpt.fineAmount;

        const [tableId, seatNoStr] = key.split(":");
        const table = tableById.get(tableId);
        const seatNo = parseInt(seatNoStr, 10);
        const seatCode = table && !isNaN(seatNo) ? getSeatCode(table, seatNo) : seatNoStr || "";

        // Ensure 1-time free hold usage is preserved even if booked on older client
        if (computedFine === 0 && !val.isVipGuest && !nextFreeUsed[val.ticketNo]) {
          nextFreeUsed[val.ticketNo] = {
            usedAt: val.assignedAt || new Date(nowMs).toISOString(),
            seatCode,
            tableLabel: table?.label || "โต๊ะ",
            holdDurationMinutes: holdMins,
            bookedByTicketNo: val.bookedByTicketNo || "",
            bookedByName: val.bookedByName || val.assignedBy || "",
            bookedByNickname: val.bookedByNickname || ""
          };
        }

        if (computedFine > 0) {
          const existingList = getTicketFineRecords({ expiredHoldFines: nextFines }, val.ticketNo);
          const bookedAt = val.assignedAt || null;
          const expiredAt = val.holdExpiresAt || new Date(nowMs).toISOString();

          // Deduplicate so concurrent clients never double-record the exact same expired booking
          const alreadyExists = existingList.some(
            (item) =>
              item.seatCode === seatCode &&
              item.expiredAt === expiredAt &&
              item.bookedAt === bookedAt
          );

          if (!alreadyExists) {
            const newRecord = {
              id: `fine_${val.ticketNo}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              ticketNo: val.ticketNo,
              tableLabel: table?.label || "โต๊ะ",
              seatCode,
              holdDurationMinutes: holdMins,
              tierLabel: val.holdTierLabel || `${holdMins} นาที`,
              fineAmount: computedFine,
              bookedByTicketNo: val.bookedByTicketNo || "",
              bookedByName: val.bookedByName || val.assignedBy || "ผู้จองล่วงหน้า",
              bookedByNickname: val.bookedByNickname || "",
              bookedAt,
              expiredAt,
              status: "unpaid",
              paidAt: null,
              paymentMethod: null,
              proofPhotoUrl: null,
              collectedBy: null
            };
            nextFines[val.ticketNo] = [...existingList, newRecord];
          }
        }
      }
    } else {
      nextAssignments[key] = val;
    }
  });

  if (expiredCount === 0) {
    return { changed: false, plan: seatingPlan, expiredCount: 0 };
  }

  // Also clear any pending seat change request for expired tickets
  const nextRequests = { ...(seatingPlan.seatChangeRequests || {}) };
  expiredTickets.forEach((tNo) => {
    delete nextRequests[tNo];
  });

  return {
    changed: true,
    expiredCount,
    plan: {
      ...seatingPlan,
      assignments: nextAssignments,
      seatChangeRequests: nextRequests,
      expiredHoldFines: nextFines,
      freeHoldUsedByTicket: nextFreeUsed,
      updatedAt: new Date().toISOString()
    }
  };
}

/**
 * Look up ALL unpaid late-hold fines for a ticket (checks both cumulative expiredHoldFines
 * AND any just-expired hold still sitting in assignments before background prune ran).
 * Returns a summary object with { items, totalFineAmount, count, seatKeysToPrune, ... } or null.
 */
export function getUnpaidFineForTicket(seatingPlan, ticketNo, nowMs = Date.now()) {
  if (!seatingPlan || !ticketNo) return null;

  const items = [];
  const seatKeysToPrune = [];

  // 1. Collect all recorded unpaid fines for this ticket
  const recorded = getTicketFineRecords(seatingPlan, ticketNo);
  recorded.forEach((rec) => {
    if (rec && rec.status !== "paid" && Number(rec.fineAmount) > 0) {
      items.push({ ...rec, ticketNo });
    }
  });

  // 2. Also inspect assignments for any just-expired unpruned hold
  const tableById = new Map();
  (seatingPlan.items || []).forEach((it) => {
    if (it.type === "table") tableById.set(it.id, it);
  });

  for (const [key, val] of Object.entries(seatingPlan.assignments || {})) {
    if (val?.ticketNo === ticketNo && isAssignmentExpired(val, nowMs)) {
      const holdMins = Number(val.holdDurationMinutes) || 15;
      const tierOpt = getHoldTierOption(val.holdTierId || holdMins, seatingPlan);
      const computedFine =
        val.fineAmount !== undefined && val.fineAmount !== null
          ? Number(val.fineAmount)
          : tierOpt.fineAmount;

      if (computedFine > 0) {
        const [tableId, seatNoStr] = key.split(":");
        const table = tableById.get(tableId);
        const seatNo = parseInt(seatNoStr, 10);
        const seatCode = table && !isNaN(seatNo) ? getSeatCode(table, seatNo) : seatNoStr || "";
        const bookedAt = val.assignedAt || null;
        const expiredAt = val.holdExpiresAt || new Date(nowMs).toISOString();

        seatKeysToPrune.push(key);

        const alreadyInList = items.some(
          (it) =>
            it.seatCode === seatCode &&
            it.expiredAt === expiredAt &&
            it.bookedAt === bookedAt
        );
        if (!alreadyInList) {
          items.push({
            id: `fine_${ticketNo}_${nowMs}_${seatCode}`,
            ticketNo,
            seatKeyToPrune: key,
            tableLabel: table?.label || "โต๊ะ",
            seatCode,
            holdDurationMinutes: holdMins,
            tierLabel: val.holdTierLabel || `${holdMins} นาที`,
            fineAmount: computedFine,
            bookedByTicketNo: val.bookedByTicketNo || "",
            bookedByName: val.bookedByName || val.assignedBy || "ผู้จองล่วงหน้า",
            bookedByNickname: val.bookedByNickname || "",
            bookedAt,
            expiredAt,
            status: "unpaid"
          });
        }
      }
    }
  }

  if (items.length === 0) return null;

  // Sort chronologically by bookedAt / expiredAt ascending (1st booking -> 2nd booking ...)
  items.sort(
    (a, b) =>
      new Date(a.bookedAt || a.expiredAt || 0).getTime() -
      new Date(b.bookedAt || b.expiredAt || 0).getTime()
  );

  const totalFineAmount = items.reduce((sum, it) => sum + (Number(it.fineAmount) || 0), 0);
  const latest = items[items.length - 1];

  return {
    ticketNo,
    items,
    count: items.length,
    totalFineAmount,
    fineAmount: totalFineAmount,
    seatKeysToPrune,
    seatKeyToPrune: seatKeysToPrune[0] || null,
    holdDurationMinutes: latest.holdDurationMinutes,
    tableLabel: latest.tableLabel,
    seatCode: latest.seatCode,
    bookedByTicketNo: latest.bookedByTicketNo,
    bookedByName: latest.bookedByName,
    bookedByNickname: latest.bookedByNickname,
    bookedAt: latest.bookedAt,
    expiredAt: latest.expiredAt
  };
}

/**
 * Generates next table letter/code (A..Z, AA..AZ, etc.) not yet used
 */
export function getNextTableCode(items = []) {
  const existingCodes = new Set(
    items
      .filter((it) => it.type === "table")
      .map((it) => String(it.code || "").trim().toUpperCase())
  );
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (let i = 0; i < alphabet.length; i++) {
    if (!existingCodes.has(alphabet[i])) return alphabet[i];
  }
  let n = 1;
  while (existingCodes.has(`T${n}`)) n++;
  return `T${n}`;
}

/**
 * Seat code label e.g. table code "A" + seatNo 3 => "A3"
 */
export function getSeatCode(table, seatNo) {
  const code = (table?.code || table?.label?.replace(/^โต๊ะ\s*/i, "") || "T").trim();
  return `${code}${seatNo}`;
}

/**
 * Check if a rectangle (x, y, w, h) fits within gridCols x gridRows without overlapping other items
 */
export function canPlaceItem(items, gridCols, gridRows, x, y, w, h, ignoreId = null) {
  if (x < 0 || y < 0 || w < 1 || h < 1) return false;
  if (x + w > gridCols || y + h > gridRows) return false;

  for (const item of items) {
    if (ignoreId && item.id === ignoreId) continue;
    const overlapX = x < item.x + item.w && x + w > item.x;
    const overlapY = y < item.y + item.h && y + h > item.y;
    if (overlapX && overlapY) return false;
  }
  return true;
}

/**
 * Returns a Map<ticketNo, { key, tableId, tableLabel, tableCode, seatNo, seatCode, status, holdExpiresAt, remainingMs, assignedAt, assignedBy }>
 * Automatically ignores expired temporary holds!
 */
export function buildAttendeeSeatMap(seatingPlan, nowMs = Date.now()) {
  const map = new Map();
  if (!seatingPlan || !seatingPlan.assignments) return map;
  const tableById = new Map();
  (seatingPlan.items || []).forEach((it) => {
    if (it.type === "table") tableById.set(it.id, it);
  });

  Object.entries(seatingPlan.assignments).forEach(([key, val]) => {
    if (!val || !val.ticketNo) return;
    if (isAssignmentExpired(val, nowMs)) return; // Auto-drop expired temporary hold
    const [tableId, seatNoStr] = key.split(":");
    const seatNo = parseInt(seatNoStr, 10);
    const table = tableById.get(tableId);
    if (!table || isNaN(seatNo) || seatNo < 1 || seatNo > (table.capacity || 8)) return;
    const status = val.status === "hold" ? "hold" : "confirmed";
    map.set(val.ticketNo, {
      key,
      tableId,
      tableLabel: table.label || `โต๊ะ ${table.code || ""}`,
      tableCode: table.code || "",
      seatNo,
      seatCode: getSeatCode(table, seatNo),
      status,
      holdExpiresAt: status === "hold" ? val.holdExpiresAt || null : null,
      remainingMs: status === "hold" ? getHoldRemainingMs(val, nowMs) : 0,
      holdDurationMinutes: val.holdDurationMinutes || null,
      fineAmount: val.fineAmount || 0,
      isVipGuest: Boolean(val.isVipGuest),
      bookedByTicketNo: val.bookedByTicketNo || "",
      bookedByName: val.bookedByName || "",
      bookedByNickname: val.bookedByNickname || "",
      assignedAt: val.assignedAt || null,
      assignedBy: val.assignedBy || ""
    });
  });

  return map;
}

/**
 * Returns all occupied seats for a given tableId as Map<seatNo, { seatNo, ticketNo, attendee, status, holdExpiresAt, remainingMs, bookedByName, fineAmount, assignedAt, assignedBy }>
 * Automatically ignores expired temporary holds!
 */
export function getTableOccupancyMap(seatingPlan, tableId, registrationsByTicket, nowMs = Date.now()) {
  const seatMap = new Map();
  if (!seatingPlan?.assignments) return seatMap;
  const prefix = `${tableId}:`;
  Object.entries(seatingPlan.assignments).forEach(([key, val]) => {
    if (!key.startsWith(prefix) || !val?.ticketNo) return;
    if (isAssignmentExpired(val, nowMs)) return; // Auto-drop expired temporary hold
    const seatNo = parseInt(key.slice(prefix.length), 10);
    if (isNaN(seatNo)) return;
    const attendee = registrationsByTicket ? registrationsByTicket.get(val.ticketNo) : null;
    if (registrationsByTicket && !attendee) return; // Ignore orphaned ticket if wiped
    const status = val.status === "hold" ? "hold" : "confirmed";
    seatMap.set(seatNo, {
      seatNo,
      ticketNo: val.ticketNo,
      attendee,
      status,
      holdExpiresAt: status === "hold" ? val.holdExpiresAt || null : null,
      remainingMs: status === "hold" ? getHoldRemainingMs(val, nowMs) : 0,
      holdDurationMinutes: val.holdDurationMinutes || null,
      fineAmount: val.fineAmount || 0,
      isVipGuest: Boolean(val.isVipGuest),
      bookedByTicketNo: val.bookedByTicketNo || "",
      bookedByName: val.bookedByName || "",
      bookedByNickname: val.bookedByNickname || "",
      assignedAt: val.assignedAt,
      assignedBy: val.assignedBy
    });
  });
  return seatMap;
}

/**
 * Compute overall seating summary stats
 */
export function getSeatingStats(seatingPlan, registrations = [], nowMs = Date.now()) {
  const regMap = new Map(registrations.map((r) => [r.ticketNo, r]));
  const tables = (seatingPlan?.items || []).filter((it) => it.type === "table");
  const openTables = tables.filter((t) => t.isOpen !== false);
  let totalCapacity = 0;
  let openCapacity = 0;
  let bookedCount = 0;
  let confirmedCount = 0;
  let holdCount = 0;

  tables.forEach((t) => {
    const cap = Number(t.capacity) || 8;
    totalCapacity += cap;
    if (t.isOpen !== false) openCapacity += cap;
    const occ = getTableOccupancyMap(seatingPlan, t.id, regMap, nowMs);
    occ.forEach((entry) => {
      bookedCount++;
      if (entry.status === "hold") holdCount++;
      else confirmedCount++;
    });
  });

  const pendingChangeRequestCount = Object.keys(seatingPlan?.seatChangeRequests || {}).filter(
    (tNo) => regMap.has(tNo)
  ).length;

  return {
    totalTables: tables.length,
    openTables: openTables.length,
    closedTables: tables.length - openTables.length,
    totalCapacity,
    openCapacity,
    bookedCount,
    confirmedCount,
    holdCount,
    availableSeats: Math.max(0, openCapacity - bookedCount),
    pendingChangeRequestCount
  };
}

/**
 * Count visible horizontal base characters (excludes zero-width Thai combining vowels & tone marks)
 */
export function getVisualCharLength(text = "") {
  return String(text || "").replace(/[\u0E31\u0E34-\u0E3A\u0E47-\u0E4E]/g, "").length;
}

/**
 * Get full display nickname for avatar circle (NEVER slices Thai nicknames like โต๊ด -> โต)
 */
export function getInitials(name = "", nickname = "") {
  const nick = String(nickname || "").trim();
  if (nick) return nick;
  const full = String(name || "").trim();
  if (!full) return "?";
  const cleaned =
    full
      .replace(/^(คุณ|นาย|นางสาว|นาง|ดร\.|ว่าที่\s*ร\.ต\.|พ\.ต\.อ\.|ร\.ต\.อ\.)\s*/i, "")
      .trim() || full;
  return cleaned.split(/\s+/)[0] || cleaned;
}

/**
 * Adaptive Tailwind font-size classes so full Thai nicknames (e.g. โต๊ด, โตสซี่) fit cleanly inside circles
 * sizeVariant: "xs" (floor plan mini 24-28px) | "md" (list/slot 36px) | "lg" (table diagram 48-56px)
 */
export function getAvatarTextSizeClass(text = "", sizeVariant = "md") {
  const len = getVisualCharLength(text);

  if (sizeVariant === "xs") {
    if (len <= 2) return "text-[9px] leading-none";
    if (len <= 3) return "text-[8px] leading-none";
    if (len <= 4) return "text-[7px] leading-none";
    if (len <= 6) return "text-[6px] leading-[1.05]";
    return "text-[5.5px] leading-[1.05]";
  }

  if (sizeVariant === "lg") {
    if (len <= 3) return "text-xs leading-tight";
    if (len <= 5) return "text-[11px] leading-tight";
    if (len <= 7) return "text-[9.5px] leading-tight";
    return "text-[8.5px] leading-tight";
  }

  // "md" (36px - 40px)
  if (len <= 3) return "text-[11px] leading-tight";
  if (len <= 5) return "text-[9.5px] leading-tight";
  if (len <= 7) return "text-[8px] leading-tight";
  return "text-[7px] leading-tight";
}
