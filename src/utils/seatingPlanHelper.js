/**
 * Seating Plan & Table Booking Data Helpers
 * Shared between EventCheckInHub, TableSeatingHub, and Lucky Draw
 */

export const SEATING_STORAGE_KEY = "sme_fan_seating_plan_v1";
export const DEFAULT_HOLD_DURATION_MINUTES = 15;
export const HOLD_DURATION_OPTIONS = [5, 10, 15, 20, 30, 45, 60];

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
    paletteTypes: DEFAULT_PALETTE_TYPES,
    assignments: {},
    seatChangeRequests: {}
  };
}

export function createEmptySeatingPlan(
  gridCols = 10,
  gridRows = 10,
  roomTitle = "ห้องจัดเลี้ยง โรงแรมบุรีศรีภู",
  paletteTypes = DEFAULT_PALETTE_TYPES,
  holdDurationMinutes = DEFAULT_HOLD_DURATION_MINUTES
) {
  return {
    gridCols,
    gridRows,
    roomTitle,
    holdDurationMinutes: Number(holdDurationMinutes) || DEFAULT_HOLD_DURATION_MINUTES,
    updatedAt: new Date().toISOString(),
    paletteTypes: Array.isArray(paletteTypes) && paletteTypes.length > 0 ? paletteTypes : DEFAULT_PALETTE_TYPES,
    items: [],
    assignments: {},
    seatChangeRequests: {}
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
 * Remove any expired temporary hold assignments from seatingPlan (pure function)
 */
export function pruneExpiredHolds(seatingPlan, nowMs = Date.now()) {
  if (!seatingPlan?.assignments) return { changed: false, plan: seatingPlan, expiredCount: 0 };
  let expiredCount = 0;
  const nextAssignments = {};
  const expiredTickets = new Set();

  Object.entries(seatingPlan.assignments).forEach(([key, val]) => {
    if (isAssignmentExpired(val, nowMs)) {
      expiredCount++;
      if (val?.ticketNo) expiredTickets.add(val.ticketNo);
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
      updatedAt: new Date().toISOString()
    }
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
      assignedAt: val.assignedAt || null,
      assignedBy: val.assignedBy || ""
    });
  });

  return map;
}

/**
 * Returns all occupied seats for a given tableId as Map<seatNo, { seatNo, ticketNo, attendee, status, holdExpiresAt, remainingMs, assignedAt, assignedBy }>
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
 * Get initials for avatar fallback
 */
export function getInitials(name = "", nickname = "") {
  const src = (nickname || name || "?").trim();
  if (!src) return "?";
  // Thai or Latin first 2 visible chars (skip common Thai prefixes if using full name)
  const cleaned = src.replace(/^(คุณ|นาย|นางสาว|นาง|ดร\.|ผอ\.|พ\.ต\.อ\.|ว่าที่\s*ร\.ต\.)\s*/i, "").trim() || src;
  return cleaned.slice(0, 2);
}
