/**
 * Seating Plan & Table Booking Data Helpers
 * Shared between EventCheckInHub, TableSeatingHub, and Lucky Draw
 */

export const SEATING_STORAGE_KEY = "sme_fan_seating_plan_v1";

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
    paletteTypes: DEFAULT_PALETTE_TYPES,
    assignments: {}
  };
}

export function createEmptySeatingPlan(
  gridCols = 10,
  gridRows = 10,
  roomTitle = "ห้องจัดเลี้ยง โรงแรมบุรีศรีภู",
  paletteTypes = DEFAULT_PALETTE_TYPES
) {
  return {
    gridCols,
    gridRows,
    roomTitle,
    updatedAt: new Date().toISOString(),
    paletteTypes: Array.isArray(paletteTypes) && paletteTypes.length > 0 ? paletteTypes : DEFAULT_PALETTE_TYPES,
    items: [],
    assignments: {}
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
 * Returns a Map<ticketNo, { tableId, tableLabel, tableCode, seatNo, seatCode, assignedAt, assignedBy }>
 */
export function buildAttendeeSeatMap(seatingPlan) {
  const map = new Map();
  if (!seatingPlan || !seatingPlan.assignments) return map;
  const tableById = new Map();
  (seatingPlan.items || []).forEach((it) => {
    if (it.type === "table") tableById.set(it.id, it);
  });

  Object.entries(seatingPlan.assignments).forEach(([key, val]) => {
    if (!val || !val.ticketNo) return;
    const [tableId, seatNoStr] = key.split(":");
    const seatNo = parseInt(seatNoStr, 10);
    const table = tableById.get(tableId);
    if (!table || isNaN(seatNo) || seatNo < 1 || seatNo > (table.capacity || 8)) return;
    map.set(val.ticketNo, {
      key,
      tableId,
      tableLabel: table.label || `โต๊ะ ${table.code || ""}`,
      tableCode: table.code || "",
      seatNo,
      seatCode: getSeatCode(table, seatNo),
      assignedAt: val.assignedAt || null,
      assignedBy: val.assignedBy || ""
    });
  });

  return map;
}

/**
 * Returns all occupied seats for a given tableId as Map<seatNo, { ticketNo, attendee, assignedAt, assignedBy }>
 */
export function getTableOccupancyMap(seatingPlan, tableId, registrationsByTicket) {
  const seatMap = new Map();
  if (!seatingPlan?.assignments) return seatMap;
  const prefix = `${tableId}:`;
  Object.entries(seatingPlan.assignments).forEach(([key, val]) => {
    if (!key.startsWith(prefix) || !val?.ticketNo) return;
    const seatNo = parseInt(key.slice(prefix.length), 10);
    if (isNaN(seatNo)) return;
    const attendee = registrationsByTicket ? registrationsByTicket.get(val.ticketNo) : null;
    if (registrationsByTicket && !attendee) return; // Ignore orphaned ticket if wiped
    seatMap.set(seatNo, {
      seatNo,
      ticketNo: val.ticketNo,
      attendee,
      assignedAt: val.assignedAt,
      assignedBy: val.assignedBy
    });
  });
  return seatMap;
}

/**
 * Compute overall seating summary stats
 */
export function getSeatingStats(seatingPlan, registrations = []) {
  const regMap = new Map(registrations.map((r) => [r.ticketNo, r]));
  const tables = (seatingPlan?.items || []).filter((it) => it.type === "table");
  const openTables = tables.filter((t) => t.isOpen !== false);
  let totalCapacity = 0;
  let openCapacity = 0;
  let bookedCount = 0;

  tables.forEach((t) => {
    const cap = Number(t.capacity) || 8;
    totalCapacity += cap;
    if (t.isOpen !== false) openCapacity += cap;
    const occ = getTableOccupancyMap(seatingPlan, t.id, regMap);
    bookedCount += occ.size;
  });

  return {
    totalTables: tables.length,
    openTables: openTables.length,
    closedTables: tables.length - openTables.length,
    totalCapacity,
    openCapacity,
    bookedCount,
    availableSeats: Math.max(0, openCapacity - bookedCount)
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
