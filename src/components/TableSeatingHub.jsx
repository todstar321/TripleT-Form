import React, { useState, useMemo, useEffect } from "react";
import {
  Armchair,
  UtensilsCrossed,
  Gift,
  Mic2,
  DoorOpen,
  Grid3x3,
  Lock,
  Unlock,
  Edit3,
  Check,
  X,
  Search,
  Users,
  Plus,
  Minus,
  Trash2,
  Copy,
  Maximize2,
  Minimize2,
  Printer,
  Dices,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Sparkles,
  RotateCcw,
  Move,
  Circle,
  Square,
  CheckCircle2,
  Clock,
  UserPlus,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  ListChecks,
  Compass,
  QrCode,
  Upload,
  KeyRound,
  Crown,
  Banknote,
  AlertTriangle
} from "lucide-react";
import confetti from "canvas-confetti";
import { uploadToCloudinaryWithMeta, deleteCloudinaryByToken } from "../utils/cloudinary";
import {
  ITEM_TYPES,
  CUSTOM_COLOR_THEMES,
  CUSTOM_EMOJIS,
  CUSTOM_ITEM_PRESETS,
  DEFAULT_PALETTE_TYPES,
  HOLD_DURATION_OPTIONS,
  HOLD_TIER_OPTIONS,
  getHoldTierOption,
  isValidOwnerPin,
  getPaletteTypes,
  getHoldDurationMinutes,
  isAssignmentExpired,
  hasAnyHolds,
  formatCountdownMmSs,
  createDefaultSeatingPlan,
  createEmptySeatingPlan,
  getNextTableCode,
  getSeatCode,
  canPlaceItem,
  buildAttendeeSeatMap,
  getTableOccupancyMap,
  getSeatingStats,
  getInitials,
  getAvatarTextSizeClass
} from "../utils/seatingPlanHelper";

// Helper to compute chronological sort timestamp (checked-in time first, then registration time)
function getAttendeeSortInfo(reg) {
  const checkedIn = Boolean(reg.checkedIn);
  const checkInMs = reg.checkedInAtIso ? new Date(reg.checkedInAtIso).getTime() : NaN;
  const createdMs = reg.createdAt ? new Date(reg.createdAt).getTime() : NaN;
  const ticketMatch = String(reg.ticketNo || "").match(/\d+/);
  const ticketNum = ticketMatch ? parseInt(ticketMatch[0], 10) : 999999;

  return {
    checkedIn,
    checkInMs: !isNaN(checkInMs) ? checkInMs : Number.MAX_SAFE_INTEGER,
    createdMs: !isNaN(createdMs) ? createdMs : Number.MAX_SAFE_INTEGER,
    ticketNum
  };
}

// Compute seat positions around a round or rectangular table (percentages 0..100)
function getSeatPositions(capacity, shape = "round") {
  const n = Math.max(2, Math.min(20, Number(capacity) || 8));
  const positions = [];

  if (shape === "rect") {
    // Distribute along top & bottom edges (and sides if needed)
    const sideCount = n >= 8 ? 1 : 0; // 1 on left, 1 on right when >= 8
    const remaining = n - sideCount * 2;
    const topCount = Math.ceil(remaining / 2);
    const bottomCount = remaining - topCount;

    // Top row (left to right)
    for (let i = 0; i < topCount; i++) {
      const pctX = topCount === 1 ? 50 : 20 + (60 * i) / (topCount - 1);
      positions.push({ seatNo: positions.length + 1, x: pctX, y: 13 });
    }
    // Right side
    if (sideCount === 1) {
      positions.push({ seatNo: positions.length + 1, x: 90, y: 50 });
    }
    // Bottom row (right to left for natural clockwise order)
    for (let i = bottomCount - 1; i >= 0; i--) {
      const pctX = bottomCount === 1 ? 50 : 20 + (60 * i) / (bottomCount - 1);
      positions.push({ seatNo: positions.length + 1, x: pctX, y: 87 });
    }
    // Left side
    if (sideCount === 1) {
      positions.push({ seatNo: positions.length + 1, x: 10, y: 50 });
    }
    return positions;
  }

  // Round table: evenly distributed clockwise starting from 12 o'clock
  const radius = n > 10 ? 41 : 39;
  for (let i = 0; i < n; i++) {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / n;
    const x = 50 + radius * Math.cos(angle);
    const y = 50 + radius * Math.sin(angle);
    positions.push({ seatNo: i + 1, x, y });
  }
  return positions;
}

// Consistent subtle color for avatar fallback based on ticket number
const AVATAR_BG_CLASSES = [
  "bg-emerald-600",
  "bg-indigo-600",
  "bg-amber-600",
  "bg-rose-600",
  "bg-teal-600",
  "bg-violet-600",
  "bg-sky-600",
  "bg-orange-600"
];
function getAvatarColor(ticketNo = "") {
  let hash = 0;
  for (let i = 0; i < ticketNo.length; i++) {
    hash = ticketNo.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_BG_CLASSES[Math.abs(hash) % AVATAR_BG_CLASSES.length];
}

export default function TableSeatingHub({
  seatingPlan,
  onUpdateSeatingPlan,
  registrations = [],
  currentUser,
  eventConfig = null,
  onPlayEffect,
  onGoToTableLuckyDraw,
  initialSelectedTicketNo = null,
  onConsumeInitialSelectedTicket
}) {
  const isOwner = currentUser?.role === "owner";
  const holdDurationMinutes = getHoldDurationMinutes(seatingPlan);

  // Live 1-second clock ticker ONLY when active temporary holds exist
  const [nowMs, setNowMs] = useState(() => Date.now());
  const planHasHolds = useMemo(() => hasAnyHolds(seatingPlan), [seatingPlan]);
  useEffect(() => {
    setNowMs(Date.now());
    if (!planHasHolds) return;
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, [planHasHolds]);

  // Owner Layout Editor mode (non-owners are ALWAYS false)
  const [isEditMode, setIsEditMode] = useState(false);
  const [activeTool, setActiveTool] = useState("select"); // "select" | paletteType.id
  const [newTableSeats, setNewTableSeats] = useState(8);
  const [newTableShape, setNewTableShape] = useState("round");
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [draggingItemId, setDraggingItemId] = useState(null);
  const [hoverCell, setHoverCell] = useState(null); // { x, y }
  const [tapMoveItemId, setTapMoveItemId] = useState(null); // Touch-friendly move mode
  const [gridZoom, setGridZoom] = useState(1); // 0.8 .. 1.3 for exact 1:1 square cells

  // Custom Palette Type Creator Modal State (Owner)
  const [isAddTypeModalOpen, setIsAddTypeModalOpen] = useState(false);
  const [newTypeLabel, setNewTypeLabel] = useState("");
  const [newTypeEmoji, setNewTypeEmoji] = useState("🛍️");
  const [newTypeColor, setNewTypeColor] = useState("violet");
  const [newTypeIsBookable, setNewTypeIsBookable] = useState(false);
  const [newTypeW, setNewTypeW] = useState(2);
  const [newTypeH, setNewTypeH] = useState(1);
  const [newTypeCapacity, setNewTypeCapacity] = useState(8);

  // Booking & Attendee Queue states
  const [rightTab, setRightTab] = useState("unassigned"); // "unassigned" | "assigned"
  const [queueFilterMode, setQueueFilterMode] = useState("checked_in"); // "checked_in" (default focus) | "not_checked_in" (special case)
  const [queueSearch, setQueueSearch] = useState("");
  const [selectedAttendeeTicketNo, setSelectedAttendeeTicketNo] = useState(null);
  const [highlightedTableId, setHighlightedTableId] = useState(null);

  // Modals & Overlays
  const [activeTableModalId, setActiveTableModalId] = useState(null);
  const [pickingSeatNoForInlineAssign, setPickingSeatNoForInlineAssign] = useState(null);
  const [inlineAssignSearch, setInlineAssignSearch] = useState("");
  const [isKioskMode, setIsKioskMode] = useState(false);
  const [kioskSuccessBanner, setKioskSuccessBanner] = useState(null); // { attendee, tableLabel, seatCode }
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);

  // Advance Hold Booking Modal (Step 1: Booker -> Step 2: Seat Owner -> Step 3: Tier 15/30/60/120 VIP)
  const [advanceHoldTarget, setAdvanceHoldTarget] = useState(null); // { table, seatNo }
  const [holdBookerTicketNo, setHoldBookerTicketNo] = useState("");
  const [holdBookerSearch, setHoldBookerSearch] = useState("");
  const [holdOwnerTicketNo, setHoldOwnerTicketNo] = useState("");
  const [holdOwnerSearch, setHoldOwnerSearch] = useState("");
  const [holdTierMinutes, setHoldTierMinutes] = useState(15);
  const [vipPinInput, setVipPinInput] = useState("");
  const [vipPinError, setVipPinError] = useState("");

  // Owner Fine QR Code Upload & Fine History Ledger
  const [isUploadingFineQr, setIsUploadingFineQr] = useState(false);
  const [isFineLedgerOpen, setIsFineLedgerOpen] = useState(false);
  const [viewingProofUrl, setViewingProofUrl] = useState(null);

  // Force exit edit mode if user loses owner privilege
  useEffect(() => {
    if (!isOwner && isEditMode) {
      setIsEditMode(false);
    }
  }, [isOwner, isEditMode]);

  // Pre-select an attendee when navigated here from Check-in Hold Change Flow (Owner)
  useEffect(() => {
    if (initialSelectedTicketNo) {
      setIsEditMode(false);
      setSelectedAttendeeTicketNo(initialSelectedTicketNo);
      if (onConsumeInitialSelectedTicket) onConsumeInitialSelectedTicket();
    }
  }, [initialSelectedTicketNo]);

  const showToast = (text, tone = "emerald") => {
    setToastMsg({ text, tone, id: Date.now() });
  };

  useEffect(() => {
    if (!toastMsg) return;
    const t = setTimeout(() => setToastMsg(null), 4000);
    return () => clearTimeout(t);
  }, [toastMsg]);

  // Registrations lookup map
  const regMap = useMemo(() => {
    const m = new Map();
    registrations.forEach((r) => m.set(r.ticketNo, r));
    return m;
  }, [registrations]);

  // Attendee -> Seat lookup map (live expiration aware!)
  const attendeeSeatMap = useMemo(() => buildAttendeeSeatMap(seatingPlan, nowMs), [seatingPlan, nowMs]);

  // Overall seating statistics (live expiration aware!)
  const stats = useMemo(() => getSeatingStats(seatingPlan, registrations, nowMs), [seatingPlan, registrations, nowMs]);

  // Pending Seat Change Requests (only Owner can approve/reject!)
  const pendingChangeRequestsList = useMemo(() => {
    const reqs = seatingPlan?.seatChangeRequests || {};
    return Object.values(reqs)
      .filter((req) => req && req.ticketNo && regMap.has(req.ticketNo))
      .map((req) => ({
        ...req,
        attendee: regMap.get(req.ticketNo),
        liveSeat: attendeeSeatMap.get(req.ticketNo) || null
      }))
      .sort((a, b) => new Date(a.requestedAt || 0).getTime() - new Date(b.requestedAt || 0).getTime());
  }, [seatingPlan?.seatChangeRequests, regMap, attendeeSeatMap]);

  // Selected attendee object
  const selectedAttendee = useMemo(() => {
    if (!selectedAttendeeTicketNo) return null;
    return regMap.get(selectedAttendeeTicketNo) || null;
  }, [selectedAttendeeTicketNo, regMap]);

  // Sorted attendees (checked-in first by checkIn time asc, then registered by createdAt asc)
  const sortedRegistrations = useMemo(() => {
    return [...registrations].sort((a, b) => {
      const ia = getAttendeeSortInfo(a);
      const ib = getAttendeeSortInfo(b);
      if (ia.checkedIn !== ib.checkedIn) return ia.checkedIn ? -1 : 1;
      if (ia.checkedIn && ib.checkedIn && ia.checkInMs !== ib.checkInMs) {
        return ia.checkInMs - ib.checkInMs;
      }
      if (ia.createdMs !== ib.createdMs) return ia.createdMs - ib.createdMs;
      return ia.ticketNum - ib.ticketNum;
    });
  }, [registrations]);

  // Split into unassigned & assigned
  const { unassignedList, assignedList } = useMemo(() => {
    const unassigned = [];
    const assigned = [];
    sortedRegistrations.forEach((r) => {
      const seatInfo = attendeeSeatMap.get(r.ticketNo);
      if (seatInfo) {
        assigned.push({ ...r, seatInfo });
      } else {
        unassigned.push(r);
      }
    });
    return { unassignedList: unassigned, assignedList: assigned };
  }, [sortedRegistrations, attendeeSeatMap]);

  // Counts for right-panel checked-in vs not-checked-in filter buttons
  const rightTabCounts = useMemo(() => {
    const base = rightTab === "unassigned" ? unassignedList : assignedList;
    let checkedIn = 0;
    let notCheckedIn = 0;
    base.forEach((r) => {
      if (r.checkedIn) checkedIn++;
      else notCheckedIn++;
    });
    return { checkedIn, notCheckedIn };
  }, [rightTab, unassignedList, assignedList]);

  // Filtered list for right panel
  const filteredRightList = useMemo(() => {
    const base = rightTab === "unassigned" ? unassignedList : assignedList;
    const q = queueSearch.trim().toLowerCase();
    return base.filter((r) => {
      if (queueFilterMode === "checked_in" && !r.checkedIn) return false;
      if (queueFilterMode === "not_checked_in" && r.checkedIn) return false;
      if (!q) return true;
      return (
        r.name?.toLowerCase().includes(q) ||
        r.nickname?.toLowerCase().includes(q) ||
        r.ticketNo?.toLowerCase().includes(q) ||
        r.phone?.includes(q) ||
        r.club?.toLowerCase().includes(q) ||
        r.seatInfo?.tableLabel?.toLowerCase().includes(q) ||
        r.seatInfo?.seatCode?.toLowerCase().includes(q)
      );
    });
  }, [rightTab, unassignedList, assignedList, queueFilterMode, queueSearch]);

  // Dynamic Palette Types (Built-in + Owner Custom Types)
  const paletteTypes = useMemo(() => getPaletteTypes(seatingPlan), [seatingPlan]);
  const activePaletteType = useMemo(() => {
    if (activeTool === "select") return null;
    return paletteTypes.find((p) => p.id === activeTool) || null;
  }, [activeTool, paletteTypes]);

  const hasMissingDefaultPalette = useMemo(() => {
    const ids = new Set(paletteTypes.map((p) => p.id));
    return DEFAULT_PALETTE_TYPES.some((d) => !ids.has(d.id));
  }, [paletteTypes]);

  // Tables list sorted by code/label
  const allTables = useMemo(() => {
    return (seatingPlan.items || [])
      .filter((it) => it.type === "table")
      .sort((a, b) => String(a.code || a.label).localeCompare(String(b.code || b.label), "th", { numeric: true }));
  }, [seatingPlan.items]);

  const selectedEditorItem = useMemo(() => {
    if (!selectedItemId) return null;
    return (seatingPlan.items || []).find((it) => it.id === selectedItemId) || null;
  }, [selectedItemId, seatingPlan.items]);

  const activeTableModalItem = useMemo(() => {
    if (!activeTableModalId) return null;
    return (seatingPlan.items || []).find((it) => it.id === activeTableModalId && it.type === "table") || null;
  }, [activeTableModalId, seatingPlan.items]);

  // Helper to commit plan update
  const commitPlan = (updater) => {
    onUpdateSeatingPlan((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      return {
        ...next,
        updatedAt: new Date().toISOString()
      };
    });
  };

  // =====================================================================
  // OWNER LAYOUT EDITOR HANDLERS
  // =====================================================================

  const handleGridResize = (nextCols, nextRows) => {
    if (!isOwner) return;
    const cols = Math.max(8, Math.min(20, nextCols));
    const rows = Math.max(6, Math.min(16, nextRows));

    // Check if any placed item would fall outside the new grid bounds
    const overflow = (seatingPlan.items || []).find((it) => it.x + it.w > cols || it.y + it.h > rows);
    if (overflow) {
      showToast(`ไม่สามารถย่อขนาดได้ เพราะ "${overflow.label}" อยู่นอกขอบเขต (${cols}×${rows}) กรุณาย้ายหรือลบออกก่อน`, "rose");
      return;
    }

    commitPlan((prev) => ({ ...prev, gridCols: cols, gridRows: rows }));
  };

  const handlePlaceNewItem = (cellX, cellY, toolId) => {
    if (!isOwner) return;
    const paletteDef = paletteTypes.find((p) => p.id === toolId);
    if (!paletteDef) return;

    let w = Number(paletteDef.defaultW) || 2;
    let h = Number(paletteDef.defaultH) || 1;

    // Auto-adapt to 1x1 if default size doesn't fit at clicked cell
    if (!canPlaceItem(seatingPlan.items, seatingPlan.gridCols, seatingPlan.gridRows, cellX, cellY, w, h)) {
      if (canPlaceItem(seatingPlan.items, seatingPlan.gridCols, seatingPlan.gridRows, cellX, cellY, 1, 1)) {
        w = 1;
        h = 1;
      } else {
        showToast("ช่องนี้มีวัตถุวางอยู่แล้ว กรุณาเลือกช่องว่างอื่น", "amber");
        return;
      }
    }

    const isBookable = Boolean(paletteDef.isBookable || paletteDef.baseType === "table");
    const resolvedType = isBookable ? "table" : (paletteDef.baseType || "custom");
    const id = `${resolvedType}_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;

    let newItem = {
      id,
      type: resolvedType,
      paletteId: paletteDef.id,
      label: paletteDef.label,
      emoji: paletteDef.emoji || "🛍️",
      colorTheme: paletteDef.colorTheme || "violet",
      x: cellX,
      y: cellY,
      w,
      h
    };

    if (isBookable) {
      const code = getNextTableCode(seatingPlan.items);
      const isStandardTable = paletteDef.id === "table";
      newItem = {
        ...newItem,
        code,
        label: isStandardTable ? `โต๊ะ ${code}` : `${paletteDef.label} ${code}`,
        capacity: isStandardTable ? newTableSeats : (Number(paletteDef.defaultCapacity) || newTableSeats),
        shape: isStandardTable ? newTableShape : (paletteDef.defaultShape || newTableShape),
        isOpen: true
      };
    }

    commitPlan((prev) => ({
      ...prev,
      items: [...(prev.items || []), newItem]
    }));
    setSelectedItemId(id);
    onPlayEffect?.("tick");
    showToast(`วาง "${newItem.label}" ลงผังเรียบร้อย`);
  };

  // Add a custom palette item type (e.g. "โต๊ะโชว์สินค้า", "ซุ้มถ่ายรูป", "โต๊ะ VIP")
  const handleAddPaletteType = (e) => {
    if (e) e.preventDefault();
    if (!isOwner) return;
    const cleanLabel = newTypeLabel.trim();
    if (!cleanLabel) {
      showToast("กรุณาระบุชื่อรูปแบบโต๊ะหรือโซนที่ต้องการเพิ่ม", "amber");
      return;
    }

    const newDef = {
      id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      baseType: newTypeIsBookable ? "table" : "custom",
      label: cleanLabel,
      emoji: newTypeEmoji || "🛍️",
      colorTheme: newTypeColor || "violet",
      isBookable: newTypeIsBookable,
      defaultW: Math.max(1, Math.min(6, Number(newTypeW) || 2)),
      defaultH: Math.max(1, Math.min(6, Number(newTypeH) || 1)),
      ...(newTypeIsBookable ? { defaultCapacity: Math.max(2, Math.min(20, Number(newTypeCapacity) || 8)), defaultShape: "round" } : {})
    };

    commitPlan((prev) => ({
      ...prev,
      paletteTypes: [...getPaletteTypes(prev), newDef]
    }));
    setActiveTool(newDef.id);
    setIsAddTypeModalOpen(false);
    setNewTypeLabel("");
    onPlayEffect?.("tick");
    showToast(`เพิ่มรูปแบบ "${cleanLabel}" เรียบร้อย — คลิกวางลงช่องสเกลได้เลย!`);
  };

  // Remove a palette item type from the toolbar
  const handleRemovePaletteType = (typeId, label) => {
    if (!isOwner) return;
    const target = paletteTypes.find((p) => p.id === typeId);
    if (!target || target.isCore) return;
    if (!window.confirm(`ต้องการลบรูปแบบ "${label}" ออกจากแถบเครื่องมือใช่หรือไม่? (วัตถุที่วางไว้บนผังแล้วจะยังคงอยู่)`)) {
      return;
    }
    commitPlan((prev) => ({
      ...prev,
      paletteTypes: getPaletteTypes(prev).filter((p) => p.id !== typeId)
    }));
    if (activeTool === typeId) setActiveTool("select");
    showToast(`ลบรูปแบบ "${label}" ออกจากแถบเครื่องมือแล้ว`, "amber");
  };

  // Restore any removed default palette items while keeping custom ones
  const handleRestoreDefaultPalette = () => {
    if (!isOwner) return;
    commitPlan((prev) => {
      const current = getPaletteTypes(prev);
      const currentIds = new Set(current.map((p) => p.id));
      const missingDefaults = DEFAULT_PALETTE_TYPES.filter((d) => !currentIds.has(d.id));
      return {
        ...prev,
        paletteTypes: [...current, ...missingDefaults]
      };
    });
    showToast("คืนค่ารูปแบบโต๊ะมาตรฐานเรียบร้อย");
  };

  const handleMoveItemTo = (itemId, targetX, targetY) => {
    if (!isOwner) return;
    const item = (seatingPlan.items || []).find((it) => it.id === itemId);
    if (!item) return;

    // Clamp target within grid
    const clampedX = Math.max(0, Math.min(seatingPlan.gridCols - item.w, targetX));
    const clampedY = Math.max(0, Math.min(seatingPlan.gridRows - item.h, targetY));

    if (!canPlaceItem(seatingPlan.items, seatingPlan.gridCols, seatingPlan.gridRows, clampedX, clampedY, item.w, item.h, item.id)) {
      showToast("ตำแหน่งปลายทางทับซ้อนกับวัตถุอื่น", "amber");
      return;
    }

    commitPlan((prev) => ({
      ...prev,
      items: prev.items.map((it) => (it.id === itemId ? { ...it, x: clampedX, y: clampedY } : it))
    }));
    setTapMoveItemId(null);
    onPlayEffect?.("tick");
  };

  const handleUpdateSelectedItem = (patch) => {
    if (!isOwner || !selectedEditorItem) return;
    const nextItem = { ...selectedEditorItem, ...patch };

    // Validate bounds/collisions if x, y, w, h changed
    if (
      patch.x !== undefined ||
      patch.y !== undefined ||
      patch.w !== undefined ||
      patch.h !== undefined
    ) {
      if (
        !canPlaceItem(
          seatingPlan.items,
          seatingPlan.gridCols,
          seatingPlan.gridRows,
          nextItem.x,
          nextItem.y,
          nextItem.w,
          nextItem.h,
          nextItem.id
        )
      ) {
        showToast("ไม่สามารถปรับขนาด/ตำแหน่งได้ เนื่องจากชนขอบห้องหรือทับวัตถุอื่น", "amber");
        return;
      }
    }

    // Validate table capacity doesn't cut off an occupied seat
    if (nextItem.type === "table" && patch.capacity !== undefined) {
      const occ = getTableOccupancyMap(seatingPlan, nextItem.id, regMap);
      let maxOccupiedSeat = 0;
      occ.forEach((_, seatNo) => {
        if (seatNo > maxOccupiedSeat) maxOccupiedSeat = seatNo;
      });
      if (nextItem.capacity < maxOccupiedSeat) {
        showToast(`ไม่สามารถลดจำนวนที่นั่งต่ำกว่า ${maxOccupiedSeat} ได้ เพราะมีผู้จองเก้าอี้หมายเลข ${maxOccupiedSeat} อยู่`, "rose");
        return;
      }
    }

    commitPlan((prev) => ({
      ...prev,
      items: prev.items.map((it) => (it.id === nextItem.id ? nextItem : it))
    }));
  };

  const handleDuplicateSelectedItem = () => {
    if (!isOwner || !selectedEditorItem) return;
    // Find first open cell that fits w x h
    let found = null;
    for (let y = 0; y <= seatingPlan.gridRows - selectedEditorItem.h && !found; y++) {
      for (let x = 0; x <= seatingPlan.gridCols - selectedEditorItem.w && !found; x++) {
        if (canPlaceItem(seatingPlan.items, seatingPlan.gridCols, seatingPlan.gridRows, x, y, selectedEditorItem.w, selectedEditorItem.h)) {
          found = { x, y };
        }
      }
    }
    if (!found) {
      showToast("ไม่มีพื้นที่ว่างเพียงพอสำหรับคัดลอก กรุณาขยายขนาดห้องก่อน", "amber");
      return;
    }

    const id = `${selectedEditorItem.type}_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
    const copy = {
      ...selectedEditorItem,
      id,
      x: found.x,
      y: found.y
    };
    if (copy.type === "table") {
      const nextCode = getNextTableCode(seatingPlan.items);
      copy.code = nextCode;
      copy.label = `โต๊ะ ${nextCode}`;
    }

    commitPlan((prev) => ({
      ...prev,
      items: [...prev.items, copy]
    }));
    setSelectedItemId(id);
    showToast(`คัดลอกเป็น "${copy.label}" เรียบร้อย`);
  };

  const handleDeleteItemById = (targetItem) => {
    if (!isOwner || !targetItem) return;
    const occ = targetItem.type === "table" ? getTableOccupancyMap(seatingPlan, targetItem.id, regMap) : null;
    if (occ && occ.size > 0) {
      if (!window.confirm(`"${targetItem.label}" มีผู้จองที่นั่งอยู่แล้ว ${occ.size} ท่าน ยืนยันลบโต๊ะนี้และยกเลิกการจองของโต๊ะนี้ใช่หรือไม่?`)) {
        return;
      }
    }

    commitPlan((prev) => {
      const nextAssignments = { ...(prev.assignments || {}) };
      if (targetItem.type === "table") {
        Object.keys(nextAssignments).forEach((k) => {
          if (k.startsWith(`${targetItem.id}:`)) {
            delete nextAssignments[k];
          }
        });
      }
      return {
        ...prev,
        items: prev.items.filter((it) => it.id !== targetItem.id),
        assignments: nextAssignments
      };
    });
    if (selectedItemId === targetItem.id) setSelectedItemId(null);
    if (tapMoveItemId === targetItem.id) setTapMoveItemId(null);
    showToast(`ลบ "${targetItem.label}" ออกจากผังแล้ว`, "amber");
  };

  const handleDeleteSelectedItem = () => {
    handleDeleteItemById(selectedEditorItem);
  };

  const handleResetToTemplate = () => {
    if (!isOwner) return;
    const hasBooked = Object.keys(seatingPlan.assignments || {}).length > 0;
    const msg = hasBooked
      ? "ต้องการสร้างผังห้องตัวอย่างใหม่ใช่หรือไม่? (การจองที่นั่งเดิมทั้งหมดจะถูกล้างด้วย)"
      : "ต้องการจัดผังห้องตัวอย่างมาตรฐาน (เวที + บุฟเฟ่ต์ + ของขวัญ + โต๊ะ A–H) ใช่หรือไม่?";
    if (!window.confirm(msg)) return;
    const def = createDefaultSeatingPlan();
    commitPlan({
      ...def,
      holdDurationMinutes: getHoldDurationMinutes(seatingPlan),
      paletteTypes: getPaletteTypes(seatingPlan),
      fineQrCodeUrl: seatingPlan.fineQrCodeUrl || null,
      fineQrDeleteToken: seatingPlan.fineQrDeleteToken || null
    });
    setSelectedItemId(null);
    showToast("สร้างผังห้องตัวอย่างเรียบร้อยแล้ว!");
  };

  const handleClearToEmptyRoom = () => {
    if (!isOwner) return;
    if (!window.confirm("ต้องการล้างวัตถุทั้งหมดให้เป็นพื้นที่ห้องว่างเปล่าใช่หรือไม่?")) return;
    const emptyPlan = createEmptySeatingPlan(
      seatingPlan.gridCols,
      seatingPlan.gridRows,
      seatingPlan.roomTitle,
      getPaletteTypes(seatingPlan),
      getHoldDurationMinutes(seatingPlan)
    );
    commitPlan({
      ...emptyPlan,
      fineQrCodeUrl: seatingPlan.fineQrCodeUrl || null,
      fineQrDeleteToken: seatingPlan.fineQrDeleteToken || null
    });
    setSelectedItemId(null);
    showToast("ล้างผังเป็นห้องว่างเปล่าเรียบร้อย พร้อมจัดวางใหม่!");
  };

  // Owner-only: update default temporary hold duration (minutes)
  const handleUpdateHoldDuration = (minutes) => {
    if (!isOwner) return;
    const mins = Math.max(1, Math.min(180, Number(minutes) || 15));
    commitPlan((prev) => ({
      ...prev,
      holdDurationMinutes: mins
    }));
    showToast(`ตั้งเวลาจองล่วงหน้าเริ่มต้นเป็น ${mins} นาทีแล้ว`);
  };

  // Owner-only: Upload or replace Fine Payment QR Code (deletes previous Cloudinary image to save storage!)
  const handleUploadFineQrCode = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !isOwner) return;
    setIsUploadingFineQr(true);
    try {
      // Resize/compress QR cleanly to max 720px JPEG/PNG
      const compressedDataUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const img = new Image();
          img.onload = () => {
            const maxDim = 720;
            let { width, height } = img;
            if (width > maxDim || height > maxDim) {
              if (width >= height) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              } else {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
            }
            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL("image/jpeg", 0.88));
          };
          img.onerror = () => resolve(ev.target.result);
          img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
      });

      // Delete old QR image on Cloudinary if delete_token exists (saves cloud storage!)
      const oldDeleteToken = seatingPlan?.fineQrDeleteToken;
      if (oldDeleteToken) {
        deleteCloudinaryByToken(oldDeleteToken).catch(() => {});
      }

      const uploaded = await uploadToCloudinaryWithMeta(compressedDataUrl, {}, "fine_qr");
      commitPlan((prev) => ({
        ...prev,
        fineQrCodeUrl: uploaded.url,
        fineQrDeleteToken: uploaded.deleteToken || null
      }));
      showToast("อัปโหลดรูป QR Code รับค่าปรับเรียบร้อย (ลบรูปเดิมแล้ว)");
    } catch (err) {
      showToast("เกิดข้อผิดพลาดในการอัปโหลด QR Code", "rose");
    } finally {
      setIsUploadingFineQr(false);
      e.target.value = "";
    }
  };

  const handleDeleteFineQrCode = () => {
    if (!isOwner) return;
    if (!window.confirm("ต้องการลบรูป QR Code รับค่าปรับออกใช่หรือไม่?")) return;
    if (seatingPlan?.fineQrDeleteToken) {
      deleteCloudinaryByToken(seatingPlan.fineQrDeleteToken).catch(() => {});
    }
    commitPlan((prev) => ({
      ...prev,
      fineQrCodeUrl: null,
      fineQrDeleteToken: null
    }));
    showToast("ลบรูป QR Code รับค่าปรับเรียบร้อย", "amber");
  };

  // Open Advance Hold Booking Modal (Step 1: Booker -> Step 2: Seat Owner -> Step 3: Duration)
  const openAdvanceHoldModal = (table, seatNo, preselectedOwner = null) => {
    setAdvanceHoldTarget({ table, seatNo });
    setHoldBookerTicketNo("");
    setHoldBookerSearch("");
    setHoldOwnerTicketNo(preselectedOwner ? preselectedOwner.ticketNo : "");
    setHoldOwnerSearch("");
    setHoldTierMinutes(getHoldDurationMinutes(seatingPlan));
    setVipPinInput("");
    setVipPinError("");
    setPickingSeatNoForInlineAssign(null);
  };

  // =====================================================================
  // SEAT BOOKING & APPROVAL HANDLERS
  // =====================================================================

  const handleAssignSeat = (table, seatNo, attendee, advanceHoldMeta = null) => {
    if (!table || !attendee) return;
    if (table.isOpen === false) {
      showToast(`${table.label} ถูกปิดรับจองโดยเจ้าของแอป`, "rose");
      return;
    }

    // Strict Rule: Non-owners CANNOT directly change/move an attendee who already has a seat!
    const existingAttendeeSeat = attendeeSeatMap.get(attendee.ticketNo);
    if (existingAttendeeSeat && !isOwner) {
      showToast(
        `${attendee.nickname || attendee.name} มีที่นั่งอยู่แล้ว (${existingAttendeeSeat.seatCode}) — เฉพาะเจ้าของแอปเท่านั้นที่อนุมัติเปลี่ยนที่นั่งได้`,
        "rose"
      );
      return;
    }

    const seatKey = `${table.id}:${seatNo}`;
    const existingHolder = seatingPlan.assignments?.[seatKey];
    if (
      existingHolder &&
      !isAssignmentExpired(existingHolder, Date.now()) &&
      existingHolder.ticketNo !== attendee.ticketNo &&
      regMap.has(existingHolder.ticketNo)
    ) {
      showToast(`เก้าอี้ ${getSeatCode(table, seatNo)} มีผู้จองแล้ว`, "rose");
      return;
    }

    // If attendee is NOT checked in yet and no advanceHoldMeta supplied -> open 3-step Advance Hold Modal!
    const isCheckedIn = Boolean(attendee.checkedIn);
    if (!isCheckedIn && !advanceHoldMeta) {
      openAdvanceHoldModal(table, seatNo, attendee);
      return;
    }

    const holdMins = advanceHoldMeta?.minutes || getHoldDurationMinutes(seatingPlan);
    const tierDef = getHoldTierOption(holdMins);
    const bookingStatus = isCheckedIn ? "confirmed" : "hold";
    const holdExpiresAt = isCheckedIn
      ? null
      : new Date(Date.now() + holdMins * 60 * 1000).toISOString();

    commitPlan((prev) => {
      const nextAssignments = { ...(prev.assignments || {}) };
      // Remove attendee from any previous seat (1 attendee = 1 seat)
      Object.keys(nextAssignments).forEach((k) => {
        if (nextAssignments[k]?.ticketNo === attendee.ticketNo) {
          delete nextAssignments[k];
        }
      });
      nextAssignments[seatKey] = {
        ticketNo: attendee.ticketNo,
        status: bookingStatus,
        holdExpiresAt,
        ...(bookingStatus === "hold"
          ? {
              holdDurationMinutes: holdMins,
              fineAmount: advanceHoldMeta?.fineAmount ?? tierDef.fineAmount,
              isVipGuest: Boolean(advanceHoldMeta?.isVipGuest ?? tierDef.isVip),
              bookedByTicketNo: advanceHoldMeta?.booker?.ticketNo || "",
              bookedByName: advanceHoldMeta?.booker?.name || currentUser?.name || "",
              bookedByNickname: advanceHoldMeta?.booker?.nickname || ""
            }
          : {}),
        assignedAt: new Date().toISOString(),
        assignedBy: currentUser?.name || "Admin"
      };
      // Clear any pending seat change request for this attendee (Owner approved & moved)
      const nextRequests = { ...(prev.seatChangeRequests || {}) };
      delete nextRequests[attendee.ticketNo];

      return {
        ...prev,
        assignments: nextAssignments,
        seatChangeRequests: nextRequests
      };
    });

    const seatCode = getSeatCode(table, seatNo);
    onPlayEffect?.("fanfare");

    if (isKioskMode) {
      try {
        confetti({ particleCount: 70, spread: 65, origin: { y: 0.6 } });
      } catch (e) {}
      setKioskSuccessBanner({
        attendee,
        tableLabel: table.label,
        seatCode,
        isHold: !isCheckedIn,
        holdMins
      });
      setActiveTableModalId(null);
      setPickingSeatNoForInlineAssign(null);
      setAdvanceHoldTarget(null);
      setTimeout(() => {
        setKioskSuccessBanner(null);
        setSelectedAttendeeTicketNo(null);
        setIsKioskMode(false);
        setQueueFilterMode("checked_in");
      }, 2800);
    } else {
      if (isCheckedIn) {
        showToast(`✅ ยืนยันที่นั่ง ${table.label} • เก้าอี้ ${seatCode} ให้คุณ ${attendee.nickname || attendee.name} สำเร็จ!`);
      } else {
        const fineNote =
          tierDef.fineAmount > 0 ? ` (หากมาไม่ทัน ปรับ ${tierDef.fineAmount} บาท)` : tierDef.isVip ? " (แขกผู้ใหญ่)" : " (ฟรี)";
        showToast(
          `⏳ จองล่วงหน้า ${table.label} • ${seatCode} ให้คุณ ${attendee.nickname || attendee.name} ${holdMins} นาที${fineNote}`,
          "amber"
        );
      }
      setPickingSeatNoForInlineAssign(null);
      setInlineAssignSearch("");
      setAdvanceHoldTarget(null);
      if (selectedAttendeeTicketNo === attendee.ticketNo) {
        setSelectedAttendeeTicketNo(null);
      }
      // Always return focus to checked-in attendees after each booking
      setQueueFilterMode("checked_in");
    }
  };

  // Submit Advance Hold Booking Modal
  const handleSubmitAdvanceHold = (e) => {
    if (e) e.preventDefault();
    if (!advanceHoldTarget) return;
    const booker = regMap.get(holdBookerTicketNo);
    const ownerGuest = regMap.get(holdOwnerTicketNo);
    if (!booker) {
      showToast("กรุณาเลือก 'ผู้จอง' ในขั้นตอนที่ 1 ก่อนครับ", "amber");
      return;
    }
    if (!ownerGuest) {
      showToast("กรุณาเลือก 'เจ้าของเก้าอี้' ในขั้นตอนที่ 2 ครับ", "amber");
      return;
    }
    const tier = getHoldTierOption(holdTierMinutes);
    if (tier.requiresOwnerPin) {
      if (!isValidOwnerPin(vipPinInput, eventConfig)) {
        setVipPinError("รหัสเจ้าของแอปไม่ถูกต้อง (กรุณากรอกเบอร์โทรศัพท์เจ้าของแอป 0937925665)");
        return;
      }
    }
    setVipPinError("");
    handleAssignSeat(advanceHoldTarget.table, advanceHoldTarget.seatNo, ownerGuest, {
      booker,
      minutes: tier.minutes,
      fineAmount: tier.fineAmount,
      isVipGuest: tier.isVip
    });
  };

  // Owner-only: remove / cancel a seat directly
  const handleUnassignSeat = (tableId, seatNo, attendeeName = "") => {
    if (!isOwner) {
      showToast("เฉพาะเจ้าของแอปเท่านั้นที่สามารถยกเลิกหรือเปลี่ยนที่นั่งได้", "rose");
      return;
    }
    const seatKey = `${tableId}:${seatNo}`;
    const targetTicket = seatingPlan.assignments?.[seatKey]?.ticketNo;
    commitPlan((prev) => {
      const nextAssignments = { ...(prev.assignments || {}) };
      delete nextAssignments[seatKey];
      const nextRequests = { ...(prev.seatChangeRequests || {}) };
      if (targetTicket) delete nextRequests[targetTicket];
      return {
        ...prev,
        assignments: nextAssignments,
        seatChangeRequests: nextRequests
      };
    });
    onPlayEffect?.("tick");
    showToast(`ยกเลิกที่นั่ง${attendeeName ? ` ของ ${attendeeName}` : ""} เรียบร้อย`, "amber");
  };

  // Admin / Manager: Submit Seat Change Request for Owner Approval
  const handleRequestSeatChange = (attendee, seatInfo, note = "") => {
    if (!attendee || !seatInfo) return;
    commitPlan((prev) => ({
      ...prev,
      seatChangeRequests: {
        ...(prev.seatChangeRequests || {}),
        [attendee.ticketNo]: {
          ticketNo: attendee.ticketNo,
          currentTableId: seatInfo.tableId,
          currentTableLabel: seatInfo.tableLabel,
          currentSeatNo: seatInfo.seatNo,
          currentSeatCode: seatInfo.seatCode,
          requestedBy: currentUser?.name || "Admin",
          requestedAt: new Date().toISOString(),
          note: note || "แอดมินส่งคำขอเปลี่ยนที่นั่ง"
        }
      }
    }));
    onPlayEffect?.("tick");
    showToast(
      `ส่งคำขอเปลี่ยนที่นั่งของ "${attendee.nickname || attendee.name}" ถึงเจ้าของแอปแล้ว (รอเจ้าของอนุมัติ)`,
      "indigo"
    );
  };

  // Owner: Approve Seat Change Request -> select attendee to pick new seat
  const handleApproveSeatChange = (req) => {
    if (!isOwner || !req) return;
    setIsEditMode(false);
    setSelectedAttendeeTicketNo(req.ticketNo);
    setActiveTableModalId(null);
    showToast(
      `อนุมัติเปลี่ยนที่นั่งให้ "${req.attendee?.nickname || req.attendee?.name}" — กรุณาคลิกเลือกโต๊ะและเก้าอี้ใหม่บนผังได้เลย!`,
      "emerald"
    );
  };

  // Owner: Reject / Dismiss Seat Change Request
  const handleRejectSeatChange = (ticketNo, attendeeName = "") => {
    if (!isOwner || !ticketNo) return;
    commitPlan((prev) => {
      const nextRequests = { ...(prev.seatChangeRequests || {}) };
      delete nextRequests[ticketNo];
      return {
        ...prev,
        seatChangeRequests: nextRequests
      };
    });
    showToast(`ปฏิเสธคำขอเปลี่ยนที่นั่ง${attendeeName ? ` ของ ${attendeeName}` : ""} (คงที่นั่งเดิมไว้)`, "amber");
  };

  // Click handler on grid cell
  const handleGridCellClick = (x, y) => {
    if (!isEditMode || !isOwner) return;
    if (tapMoveItemId) {
      handleMoveItemTo(tapMoveItemId, x, y);
      return;
    }
    if (activeTool !== "select") {
      handlePlaceNewItem(x, y, activeTool);
    } else {
      setSelectedItemId(null);
    }
  };

  // Click handler on placed item
  const handleItemClick = (item, e) => {
    e.stopPropagation();
    if (isEditMode && isOwner) {
      if (tapMoveItemId && tapMoveItemId !== item.id) {
        setTapMoveItemId(null);
      }
      setSelectedItemId(item.id);
      return;
    }

    // Booking Mode: clicking a table opens Seat Selector Modal
    if (item.type === "table") {
      if (item.isOpen === false) {
        showToast(`${item.label} ถูกปิดใช้งานชั่วคราวโดยเจ้าของแอป`, "amber");
        return;
      }
      setActiveTableModalId(item.id);
      setPickingSeatNoForInlineAssign(null);
      setInlineAssignSearch("");
    }
  };

  // Print Table Summary List
  const handlePrintTableDirectory = () => {
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) {
      window.print();
      return;
    }
    const htmlTables = allTables
      .map((t) => {
        const occ = getTableOccupancyMap(seatingPlan, t.id, regMap);
        const cap = Number(t.capacity) || 8;
        const rows = [];
        for (let s = 1; s <= cap; s++) {
          const entry = occ.get(s);
          const seatCode = getSeatCode(t, s);
          rows.push(`
            <tr>
              <td style="padding:6px 10px;border:1px solid #cbd5e1;font-weight:bold;width:70px;text-align:center;">${seatCode}</td>
              <td style="padding:6px 10px;border:1px solid #cbd5e1;">${entry?.attendee ? `${entry.attendee.name}${entry.attendee.nickname ? ` (${entry.attendee.nickname})` : ""}` : '<span style="color:#94a3b8;">- ว่าง -</span>'}</td>
              <td style="padding:6px 10px;border:1px solid #cbd5e1;width:110px;text-align:center;">${entry?.attendee?.ticketNo || "-"}</td>
              <td style="padding:6px 10px;border:1px solid #cbd5e1;width:110px;text-align:center;">${entry?.attendee?.club || "-"}</td>
            </tr>
          `);
        }
        return `
          <div style="page-break-inside:avoid;margin-bottom:20px;">
            <h3 style="margin:0 0 8px 0;font-size:16px;color:#0f172a;">${t.label} (${occ.size}/${cap} ท่าน) ${t.isOpen === false ? "[ปิดโต๊ะ]" : ""}</h3>
            <table style="width:100%;border-collapse:collapse;font-size:13px;">
              <thead>
                <tr style="background:#f1f5f9;">
                  <th style="padding:6px 10px;border:1px solid #cbd5e1;">เก้าอี้</th>
                  <th style="padding:6px 10px;border:1px solid #cbd5e1;text-align:left;">ชื่อ - นามสกุล (ชื่อเล่น)</th>
                  <th style="padding:6px 10px;border:1px solid #cbd5e1;">เลขบัตร</th>
                  <th style="padding:6px 10px;border:1px solid #cbd5e1;">สังกัด</th>
                </tr>
              </thead>
              <tbody>${rows.join("")}</tbody>
            </table>
          </div>
        `;
      })
      .join("");

    win.document.write(`
      <!doctype html>
      <html lang="th">
      <head>
        <meta charset="utf-8" />
        <title>รายชื่อผู้เข้าร่วมงานแยกตามโต๊ะ - ${seatingPlan.roomTitle || "SME FAN 2026"}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Sarabun", sans-serif; padding: 24px; color: #0f172a; }
          @media print { .no-print { display: none; } }
        </style>
      </head>
      <body>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;border-bottom:2px solid #0f172a;padding-bottom:12px;">
          <div>
            <h1 style="margin:0;font-size:20px;">ผังรายชื่อที่นั่งแยกตามโต๊ะ</h1>
            <p style="margin:4px 0 0 0;color:#475569;font-size:13px;">${seatingPlan.roomTitle || "งานสังสรรค์ปีใหม่ SME FAN 2026"} • จองแล้ว ${stats.bookedCount}/${stats.openCapacity} ที่นั่ง</p>
          </div>
          <button class="no-print" onclick="window.print()" style="padding:8px 16px;background:#0f172a;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:bold;">พิมพ์เอกสาร</button>
        </div>
        ${htmlTables}
      </body>
      </html>
    `);
    win.document.close();
  };

  // =====================================================================
  // RENDER FLOOR PLAN GRID (Reusable in Normal + Kiosk Fullscreen Mode)
  // =====================================================================
  const renderFloorPlanCanvas = (kioskView = false) => {
    const cols = seatingPlan.gridCols || 10;
    const rows = seatingPlan.gridRows || 10;
    const baseCellPx = kioskView
      ? cols <= 10 ? 74 : cols <= 12 ? 64 : cols <= 16 ? 54 : 46
      : cols <= 10 ? 64 : cols <= 12 ? 56 : cols <= 16 ? 48 : 42;
    const cellSize = Math.round(baseCellPx * gridZoom);
    const gridGap = 4;

    const renderQuickDeleteBtn = (item) => {
      if (!isEditMode || !isOwner || selectedItemId !== item.id) return null;
      return (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleDeleteItemById(item);
          }}
          title={`ลบ "${item.label}" ออกจากผัง`}
          className="absolute -top-1.5 -right-1.5 z-30 w-5 h-5 rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-md border border-white flex items-center justify-center cursor-pointer transition-transform hover:scale-110"
        >
          <X className="w-3 h-3 stroke-[3]" />
        </button>
      );
    };

    return (
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col">
        {/* Room Header Bar */}
        <div className="px-4 py-3 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold tracking-tight leading-tight">
                {seatingPlan.roomTitle || "ผังห้องจัดเลี้ยง"}
              </h3>
              <p className="text-[11px] text-slate-300">
                สเกลสี่เหลี่ยมจัตุรัส {cols} × {rows} ช่อง •{" "}
                {isEditMode
                  ? activeTool === "select"
                    ? "โหมดจัดผัง: ลากวางเพื่อย้าย หรือคลิกวัตถุเพื่อแก้ไข/กด × เพื่อลบ"
                    : `คลิกลงช่องว่างเพื่อวาง "${activePaletteType?.label || ""}"`
                  : "คลิกที่โต๊ะเพื่อดูรูปผู้จองและเลือกเก้าอี้รายตัว (เช่น A1, A2, A3...)"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Square Grid Zoom Controls */}
            <div className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-white/10 border border-white/15 text-[10px] font-bold text-slate-200 mr-1">
              <button
                type="button"
                onClick={() => setGridZoom((z) => Math.max(0.75, Number((z - 0.1).toFixed(2))))}
                className="p-0.5 hover:text-amber-300 cursor-pointer"
                title="ย่อสเกลช่องตาราง"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="font-mono min-w-[34px] text-center">{Math.round(gridZoom * 100)}%</span>
              <button
                type="button"
                onClick={() => setGridZoom((z) => Math.min(1.3, Number((z + 0.1).toFixed(2))))}
                className="p-0.5 hover:text-amber-300 cursor-pointer"
                title="ขยายสเกลช่องตาราง"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>

            {/* Compact Legend */}
            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-[10px] font-bold text-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>ว่าง</span>
            </span>
            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/30 text-[10px] font-bold text-amber-200">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>มีคนจอง</span>
            </span>
            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-400/30 text-[10px] font-bold text-rose-200">
              <span className="w-2 h-2 rounded-full bg-rose-400" />
              <span>เต็ม</span>
            </span>
            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-slate-600/40 border border-slate-400/30 text-[10px] font-bold text-slate-300">
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              <span>ปิดโต๊ะ</span>
            </span>
          </div>
        </div>

        {/* Active Selected Attendee Banner */}
        {!isEditMode && selectedAttendee && (
          <div className="px-4 py-2.5 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border-b border-emerald-200 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center space-x-3">
              {selectedAttendee.photoUrl ? (
                <img
                  src={selectedAttendee.photoUrl}
                  alt={selectedAttendee.name}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-emerald-500 shadow-sm shrink-0"
                />
              ) : (
                <div
                  className={`w-10 h-10 rounded-full ${getAvatarColor(selectedAttendee.ticketNo)} text-white font-black flex items-center justify-center text-center px-0.5 break-words ring-2 ring-emerald-400 shadow-sm shrink-0 ${getAvatarTextSizeClass(
                    getInitials(selectedAttendee.name, selectedAttendee.nickname),
                    "md"
                  )}`}
                >
                  {getInitials(selectedAttendee.name, selectedAttendee.nickname)}
                </div>
              )}
              <div>
                <div className="text-[11px] font-bold text-emerald-700 flex items-center space-x-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>กำลังเลือกที่นั่งให้ผู้เข้าร่วมงาน:</span>
                </div>
                <div className="text-sm font-black text-slate-900">
                  {selectedAttendee.name}
                  {selectedAttendee.nickname && (
                    <span className="text-emerald-700 ml-1.5">({selectedAttendee.nickname})</span>
                  )}
                  <span className="ml-2 text-xs font-mono px-2 py-0.5 rounded-md bg-white border border-emerald-200 text-slate-700">
                    {selectedAttendee.ticketNo}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {!kioskView && (
                <button
                  type="button"
                  onClick={() => setIsKioskMode(true)}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>ให้แขกจิ้มเลือกเอง (เต็มจอ)</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedAttendeeTicketNo(null)}
                className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 text-xs font-bold flex items-center space-x-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>ยกเลิก</span>
              </button>
            </div>
          </div>
        )}

        {/* Tap-to-move helper banner (for Owner on iPad/touch) */}
        {isEditMode && isOwner && tapMoveItemId && (
          <div className="px-4 py-2 bg-amber-50 border-b border-amber-200 flex items-center justify-between text-xs text-amber-900 font-bold">
            <span className="flex items-center space-x-1.5">
              <Move className="w-4 h-4 text-amber-600" />
              <span>กำลังย้ายตำแหน่ง: กรุณาคลิกลงช่องว่างที่ต้องการวาง</span>
            </span>
            <button
              type="button"
              onClick={() => setTapMoveItemId(null)}
              className="px-2 py-1 rounded-lg bg-white border border-amber-300 text-amber-800 hover:bg-amber-100 cursor-pointer"
            >
              ยกเลิกย้าย
            </button>
          </div>
        )}

        {/* Room Blueprint Grid Container */}
        <div className="p-3 sm:p-4 bg-slate-50/80 overflow-x-auto">
          {/* Front of Room Direction Indicator */}
          <div className="mb-2 flex items-center justify-center">
            <span className="px-3 py-0.5 rounded-full bg-slate-200/80 text-slate-600 text-[10px] font-extrabold tracking-widest uppercase">
              ▲ ด้านหน้าห้อง / หน้าเวที (FRONT) ▲
            </span>
          </div>

          <div className="mx-auto w-fit">
            {/* Column Number Ruler (1..cols) aligned 1:1 with square cells */}
            <div className="flex items-center mb-1 pl-9">
              <div
                className="grid"
                style={{
                  gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
                  gap: `${gridGap}px`
                }}
              >
                {Array.from({ length: cols }, (_, cIdx) => (
                  <div
                    key={cIdx}
                    className="text-center text-[10px] font-mono font-bold text-slate-400 select-none"
                  >
                    {cIdx + 1}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-stretch">
              {/* Row Number Ruler (1..rows) aligned 1:1 with square cells */}
              <div
                className="w-7 pr-1.5 grid shrink-0 py-1.5"
                style={{
                  gridTemplateRows: `repeat(${rows}, ${cellSize}px)`,
                  gap: `${gridGap}px`
                }}
              >
                {Array.from({ length: rows }, (_, rIdx) => (
                  <div
                    key={rIdx}
                    className="flex items-center justify-end text-[10px] font-mono font-bold text-slate-400 select-none"
                  >
                    {rIdx + 1}
                  </div>
                ))}
              </div>

              {/* Main Rectangular Room Grid (Exact 1:1 Square Cells!) */}
              <div
                className="relative bg-white rounded-2xl border-2 border-slate-300 shadow-inner p-1.5"
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
                  gridTemplateRows: `repeat(${rows}, ${cellSize}px)`,
                  gap: `${gridGap}px`
                }}
              >
                {/* Background Scale Cells */}
                {Array.from({ length: rows * cols }, (_, idx) => {
                  const x = idx % cols;
                  const y = Math.floor(idx / cols);
                  const isHovered = hoverCell && hoverCell.x === x && hoverCell.y === y;
                  const canDropHere =
                    isEditMode &&
                    isOwner &&
                    ((activeTool !== "select" &&
                      canPlaceItem(seatingPlan.items, cols, rows, x, y, 1, 1)) ||
                      (tapMoveItemId &&
                        (() => {
                          const mv = seatingPlan.items.find((i) => i.id === tapMoveItemId);
                          return mv && canPlaceItem(seatingPlan.items, cols, rows, x, y, mv.w, mv.h, mv.id);
                        })()));

                  return (
                    <div
                      key={`cell_${x}_${y}`}
                      style={{ gridColumn: `${x + 1} / span 1`, gridRow: `${y + 1} / span 1` }}
                      onClick={() => handleGridCellClick(x, y)}
                      onMouseEnter={() => isEditMode && setHoverCell({ x, y })}
                      onMouseLeave={() => isEditMode && setHoverCell(null)}
                      onDragOver={(e) => {
                        if (isEditMode && isOwner && draggingItemId) {
                          e.preventDefault();
                          setHoverCell({ x, y });
                        }
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (isEditMode && isOwner && draggingItemId) {
                          handleMoveItemTo(draggingItemId, x, y);
                          setDraggingItemId(null);
                          setHoverCell(null);
                        }
                      }}
                      className={`rounded-lg border transition-colors select-none flex items-center justify-center ${
                        isEditMode && isOwner
                          ? isHovered && canDropHere
                            ? "border-emerald-400 bg-emerald-50 cursor-crosshair"
                            : isHovered && draggingItemId
                            ? "border-indigo-400 bg-indigo-50"
                            : "border-dashed border-slate-200 bg-slate-50/50 hover:bg-emerald-50/40 hover:border-emerald-300 cursor-pointer"
                          : "border-slate-100/90 bg-slate-50/30"
                      }`}
                    >
                      {isEditMode && isOwner && isHovered && activeTool !== "select" && (
                        <Plus className="w-3.5 h-3.5 text-emerald-500 opacity-70" />
                      )}
                    </div>
                  );
                })}

                {/* Placed Room Items Overlay */}
                {(seatingPlan.items || []).map((item) => {
                  const isSelectedEditor = isEditMode && selectedItemId === item.id;
                  const isSpotlight = highlightedTableId === item.id;
                  const isCompact = item.w === 1 && item.h === 1;

                  const commonStyle = {
                    gridColumn: `${item.x + 1} / span ${item.w}`,
                    gridRow: `${item.y + 1} / span ${item.h}`,
                    zIndex: isSelectedEditor ? 20 : 10
                  };

                  const dragProps =
                    isEditMode && isOwner
                      ? {
                          draggable: true,
                          onDragStart: (e) => {
                            setDraggingItemId(item.id);
                            setSelectedItemId(item.id);
                            e.dataTransfer.effectAllowed = "move";
                          },
                          onDragEnd: () => {
                            setDraggingItemId(null);
                            setHoverCell(null);
                          }
                        }
                      : {};

                  // 1. STAGE
                  if (item.type === "stage") {
                    return (
                      <div
                        key={item.id}
                        style={commonStyle}
                        {...dragProps}
                        onClick={(e) => handleItemClick(item, e)}
                        className={`relative min-w-0 min-h-0 rounded-xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-2 text-white shadow-md flex flex-col items-center justify-center p-1.5 text-center transition-all select-none ${
                          isSelectedEditor
                            ? "border-amber-400 ring-4 ring-amber-400/30 cursor-grab"
                            : isEditMode
                            ? "border-indigo-400/50 hover:border-amber-300 cursor-grab"
                            : "border-indigo-500/40"
                        }`}
                      >
                        {renderQuickDeleteBtn(item)}
                        <div className="flex items-center space-x-1.5 max-w-full overflow-hidden">
                          <Mic2 className="w-4 h-4 text-amber-400 shrink-0" />
                          <span className="font-black text-xs sm:text-sm tracking-wide truncate">
                            {item.label}
                          </span>
                        </div>
                        {!isCompact && item.h >= 2 && (
                          <span className="text-[10px] text-indigo-300 font-semibold mt-0.5">
                            STAGE AREA
                          </span>
                        )}
                      </div>
                    );
                  }

                  // 2. BUFFET / FOOD ZONE
                  if (item.type === "buffet") {
                    const isVertical = item.h > item.w && item.w === 1;
                    return (
                      <div
                        key={item.id}
                        style={commonStyle}
                        {...dragProps}
                        onClick={(e) => handleItemClick(item, e)}
                        className={`relative min-w-0 min-h-0 rounded-xl bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100 border-2 text-orange-900 shadow-sm flex flex-col items-center justify-center p-1.5 text-center transition-all select-none ${
                          isSelectedEditor
                            ? "border-orange-500 ring-4 ring-orange-400/30 cursor-grab"
                            : isEditMode
                            ? "border-orange-300 hover:border-orange-500 cursor-grab"
                            : "border-orange-300/80"
                        }`}
                        title={item.label}
                      >
                        {renderQuickDeleteBtn(item)}
                        <UtensilsCrossed className="w-4 h-4 text-orange-600 shrink-0 mb-0.5" />
                        <span
                          className={`font-extrabold text-orange-900 leading-tight max-w-full overflow-hidden ${
                            isVertical ? "text-[10px] break-words" : "text-[11px] truncate"
                          }`}
                        >
                          {item.label}
                        </span>
                      </div>
                    );
                  }

                  // 3. GIFT TABLE
                  if (item.type === "gift") {
                    return (
                      <div
                        key={item.id}
                        style={commonStyle}
                        {...dragProps}
                        onClick={(e) => handleItemClick(item, e)}
                        className={`relative min-w-0 min-h-0 rounded-xl bg-gradient-to-br from-pink-50 via-rose-50 to-amber-50 border-2 text-rose-900 shadow-sm flex flex-col items-center justify-center p-1.5 text-center transition-all select-none ${
                          isSelectedEditor
                            ? "border-rose-500 ring-4 ring-rose-400/30 cursor-grab"
                            : isEditMode
                            ? "border-rose-300 hover:border-rose-500 cursor-grab"
                            : "border-rose-300/80"
                        }`}
                        title={item.label}
                      >
                        {renderQuickDeleteBtn(item)}
                        <div className="flex items-center space-x-1 max-w-full overflow-hidden">
                          <Gift className="w-4 h-4 text-rose-500 shrink-0" />
                          <span className="font-extrabold text-[11px] truncate">{item.label}</span>
                        </div>
                      </div>
                    );
                  }

                  // 4. ENTRANCE / REGISTRATION
                  if (item.type === "entrance") {
                    return (
                      <div
                        key={item.id}
                        style={commonStyle}
                        {...dragProps}
                        onClick={(e) => handleItemClick(item, e)}
                        className={`relative min-w-0 min-h-0 rounded-xl bg-gradient-to-br from-slate-100 to-teal-50 border-2 text-slate-700 shadow-sm flex flex-col items-center justify-center p-1.5 text-center transition-all select-none ${
                          isSelectedEditor
                            ? "border-teal-500 ring-4 ring-teal-400/30 cursor-grab"
                            : isEditMode
                            ? "border-teal-300 hover:border-teal-500 cursor-grab"
                            : "border-slate-300"
                        }`}
                        title={item.label}
                      >
                        {renderQuickDeleteBtn(item)}
                        <div className="flex items-center space-x-1 max-w-full overflow-hidden">
                          <DoorOpen className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                          <span className="font-bold text-[10px] sm:text-[11px] truncate">{item.label}</span>
                        </div>
                      </div>
                    );
                  }

                  // 4.5 CUSTOM NON-BOOKABLE ITEM (e.g. โต๊ะโชว์สินค้า, บูธสปอนเซอร์, ซุ้มถ่ายรูป)
                  if (item.type !== "table") {
                    const theme = CUSTOM_COLOR_THEMES[item.colorTheme] || CUSTOM_COLOR_THEMES.violet;
                    const isVertical = item.h > item.w && item.w === 1;
                    return (
                      <div
                        key={item.id}
                        style={commonStyle}
                        {...dragProps}
                        onClick={(e) => handleItemClick(item, e)}
                        className={`relative min-w-0 min-h-0 rounded-xl ${theme.tileBg} border-2 ${theme.text} shadow-sm flex flex-col items-center justify-center p-1.5 text-center transition-all select-none ${
                          isSelectedEditor
                            ? `${theme.tileSelected} cursor-grab`
                            : isEditMode
                            ? `${theme.tileBorder} ${theme.tileHover} cursor-grab`
                            : theme.tileBorder
                        }`}
                        title={item.label}
                      >
                        {renderQuickDeleteBtn(item)}
                        <div
                          className={`flex items-center justify-center max-w-full overflow-hidden ${
                            isVertical || isCompact ? "flex-col space-y-0.5" : "space-x-1"
                          }`}
                        >
                          <span className="text-sm sm:text-base leading-none shrink-0">
                            {item.emoji || "🛍️"}
                          </span>
                          <span
                            className={`font-extrabold leading-tight max-w-full overflow-hidden ${
                              isVertical ? "text-[10px] break-words" : "text-[10px] sm:text-[11px] truncate"
                            }`}
                          >
                            {item.label}
                          </span>
                        </div>
                      </div>
                    );
                  }

                  // 5. DINING TABLE (with real attendee photos & seat occupancy!)
                  const cap = Number(item.capacity) || 8;
                  const occMap = getTableOccupancyMap(seatingPlan, item.id, regMap, nowMs);
                  const occList = Array.from(occMap.values()).sort((a, b) => a.seatNo - b.seatNo);
                  const occCount = occList.length;
                  const holdCountOnTable = occList.filter((o) => o.status === "hold").length;
                  const isClosed = item.isOpen === false;
                  const isFull = occCount >= cap;
                  const isInviting = !isEditMode && selectedAttendee && !isClosed && !isFull;

                  const borderTone = isSelectedEditor
                    ? "border-indigo-500 ring-4 ring-indigo-400/30 bg-indigo-50/40"
                    : isSpotlight
                    ? "border-amber-500 ring-4 ring-amber-400/40 bg-amber-50/60"
                    : isClosed
                    ? "border-slate-300 bg-slate-100/90 opacity-75"
                    : isFull
                    ? "border-rose-300 bg-rose-50/60 hover:border-rose-400"
                    : isInviting
                    ? "border-emerald-500 ring-2 ring-emerald-400/50 bg-emerald-50/40 hover:bg-emerald-50 hover:scale-[1.02]"
                    : occCount > 0
                    ? "border-amber-300 bg-amber-50/30 hover:border-amber-400 hover:shadow-md"
                    : "border-emerald-300 bg-emerald-50/20 hover:border-emerald-500 hover:shadow-md";

                  const badgeTone = isClosed
                    ? "bg-slate-200 text-slate-600"
                    : isFull
                    ? "bg-rose-500 text-white"
                    : occCount > 0
                    ? "bg-amber-500 text-slate-950"
                    : "bg-emerald-500 text-white";

                  const tooltipNames = occList
                    .map((o) => {
                      const holdTag = o.status === "hold" ? ` [จองชั่วคราว ${formatCountdownMmSs(o.remainingMs)}]` : "";
                      return `${getSeatCode(item, o.seatNo)}: ${o.attendee?.nickname || o.attendee?.name}${holdTag}`;
                    })
                    .join(" | ");

                  const maxAvatarsToShow = isCompact ? 3 : Math.min(cap, 8);

                  return (
                    <div
                      key={item.id}
                      style={commonStyle}
                      {...dragProps}
                      onClick={(e) => handleItemClick(item, e)}
                      title={
                        isClosed
                          ? `${item.label} (ปิดใช้งาน)`
                          : `${item.label} (${occCount}/${cap} ท่าน)${tooltipNames ? ` — ${tooltipNames}` : " — ว่างทั้งหมด"}`
                      }
                      className={`min-w-0 min-h-0 rounded-2xl border-2 p-1.5 flex flex-col justify-between transition-all select-none relative ${borderTone} ${
                        isEditMode ? "cursor-grab" : isClosed ? "cursor-not-allowed" : "cursor-pointer"
                      }`}
                    >
                      {renderQuickDeleteBtn(item)}
                      {/* Table Header: Label + Occupancy Pill */}
                      <div className="flex items-center justify-between gap-1 w-full">
                        <span className="font-black text-slate-900 text-[11px] sm:text-xs truncate leading-none">
                          {item.emoji && item.paletteId && item.paletteId !== "table" ? `${item.emoji} ` : ""}
                          {item.label}
                        </span>
                        <span
                          className={`text-[9px] font-black px-1.5 py-0.5 rounded-full shrink-0 leading-none ${badgeTone}`}
                        >
                          {isClosed ? "ปิด" : `${occCount}/${cap}`}
                        </span>
                      </div>

                      {/* Center Visual: Seated Photos / Empty Seat Dots */}
                      {!isCompact ? (
                        <div className="flex-1 min-h-0 flex flex-col items-center justify-center my-0.5 overflow-hidden">
                          <div
                            className={`w-full flex flex-wrap items-center justify-center gap-0.5 p-1 ${
                              item.shape === "round" ? "rounded-2xl" : "rounded-lg"
                            } bg-white/80 border border-slate-200/80 shadow-inner`}
                          >
                            {Array.from({ length: maxAvatarsToShow }, (_, idx) => {
                              const seatNo = idx + 1;
                              const occEntry = occMap.get(seatNo);
                              if (occEntry?.attendee) {
                                const isHoldSeat = occEntry.status === "hold";
                                const showCheckInPhoto = Boolean(
                                  occEntry.attendee.checkedIn && !isHoldSeat && occEntry.attendee.photoUrl
                                );
                                const nickLabel = getInitials(occEntry.attendee.name, occEntry.attendee.nickname);
                                const seatTitle = `${getSeatCode(item, seatNo)}: ${occEntry.attendee.name}${
                                  occEntry.attendee.nickname ? ` (${occEntry.attendee.nickname})` : ""
                                }${isHoldSeat ? ` (จองล่วงหน้า เหลือ ${formatCountdownMmSs(occEntry.remainingMs)})` : ""}`;
                                return (
                                  <div key={seatNo} className="relative" title={seatTitle}>
                                    {showCheckInPhoto ? (
                                      <img
                                        src={occEntry.attendee.photoUrl}
                                        alt={occEntry.attendee.name}
                                        className="w-6 h-6 sm:w-7 sm:h-7 rounded-full object-cover shadow-sm ring-2 ring-emerald-400"
                                      />
                                    ) : (
                                      <div
                                        className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full ${getAvatarColor(
                                          occEntry.attendee.ticketNo
                                        )} text-white font-black flex items-center justify-center text-center px-0.5 break-words shadow-sm ${getAvatarTextSizeClass(
                                          nickLabel,
                                          "xs"
                                        )} ${
                                          isHoldSeat
                                            ? "ring-2 ring-amber-400 opacity-95"
                                            : "ring-1 ring-white"
                                        }`}
                                      >
                                        {nickLabel}
                                      </div>
                                    )}
                                    {isHoldSeat && (
                                      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-amber-500 border border-white flex items-center justify-center text-[6px] text-white font-black">
                                        ⏳
                                      </span>
                                    )}
                                  </div>
                                );
                              }
                              return (
                                <div
                                  key={seatNo}
                                  title={`${getSeatCode(item, seatNo)}: ว่าง`}
                                  className="w-6 h-6 sm:w-7 sm:h-7 rounded-full border border-dashed border-slate-300 bg-slate-50 text-[7px] font-mono font-bold text-slate-400 flex items-center justify-center"
                                >
                                  {getSeatCode(item, seatNo)}
                                </div>
                              );
                            })}
                            {cap > maxAvatarsToShow && (
                              <span className="text-[8px] font-bold text-slate-500 px-0.5">
                                +{cap - maxAvatarsToShow}
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center -space-x-1.5 my-0.5">
                          {occList.slice(0, 3).map((o) => {
                            const showPhoto = Boolean(o.attendee?.checkedIn && o.status !== "hold" && o.attendee?.photoUrl);
                            const nickLabel = getInitials(o.attendee?.name, o.attendee?.nickname);
                            return showPhoto ? (
                              <img
                                key={o.seatNo}
                                src={o.attendee.photoUrl}
                                alt={o.attendee.name}
                                className="w-5 h-5 rounded-full object-cover ring-1 ring-emerald-400"
                              />
                            ) : (
                              <div
                                key={o.seatNo}
                                className={`w-5 h-5 rounded-full ${getAvatarColor(o.ticketNo)} text-white font-bold flex items-center justify-center text-center px-0.5 ring-1 ring-white ${getAvatarTextSizeClass(
                                  nickLabel,
                                  "xs"
                                )}`}
                              >
                                {nickLabel}
                              </div>
                            );
                          })}
                          {occCount === 0 && (
                            <span className="text-[9px] text-emerald-600 font-bold">ว่าง</span>
                          )}
                        </div>
                      )}

                      {/* Footer Status Line */}
                      {!isCompact && (
                        <div className="flex items-center justify-between text-[9px] font-bold text-slate-500">
                          <span>
                            {holdCountOnTable > 0 ? `⏳ จองชั่วคราว ${holdCountOnTable}` : item.shape === "round" ? "โต๊ะกลม" : "โต๊ะเหลี่ยม"}
                          </span>
                          <span className={isClosed ? "text-slate-400" : isFull ? "text-rose-600" : "text-emerald-600"}>
                            {isClosed ? "ปิดรับจอง" : isFull ? "เต็มแล้ว" : `ว่าง ${cap - occCount} ที่`}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Empty Room Callout */}
          {(seatingPlan.items || []).length === 0 && (
            <div className="mt-3 text-center py-4 px-3 rounded-xl bg-white border border-dashed border-slate-300 text-xs text-slate-500">
              {isOwner
                ? "พื้นที่ห้องยังว่างอยู่ — กดเข้า 'โหมดจัดผังห้อง' เพื่อวางเวที โต๊ะอาหาร โซนบุฟเฟ่ต์ หรือกด 'จัดผังตัวอย่างอัตโนมัติ'"
                : "เจ้าของแอปยังไม่ได้จัดวางโต๊ะลงในผังห้อง กรุณารอเจ้าของแอปตั้งค่าผังห้องก่อน"}
            </div>
          )}
        </div>
      </div>
    );
  };

  // =====================================================================
  // RENDER SEAT PICKER MODAL (A1, A2, ..., A8 + Visual Table Diagram)
  // =====================================================================
  const renderSeatPickerModal = () => {
    if (!activeTableModalItem) return null;

    const table = activeTableModalItem;
    const cap = Number(table.capacity) || 8;
    const occMap = getTableOccupancyMap(seatingPlan, table.id, regMap, nowMs);
    const positions = getSeatPositions(cap, table.shape || "round");

    // Previous / Next open table navigation
    const openTables = allTables.filter((t) => t.isOpen !== false);
    const currentIdx = openTables.findIndex((t) => t.id === table.id);
    const prevTable = currentIdx > 0 ? openTables[currentIdx - 1] : null;
    const nextTable = currentIdx >= 0 && currentIdx < openTables.length - 1 ? openTables[currentIdx + 1] : null;

    // Filter unassigned guests for inline quick-assign dropdown
    const inlineAssignCandidates = unassignedList.filter((r) => {
      if (!inlineAssignSearch.trim()) return true;
      const q = inlineAssignSearch.toLowerCase();
      return (
        r.name?.toLowerCase().includes(q) ||
        r.nickname?.toLowerCase().includes(q) ||
        r.ticketNo?.toLowerCase().includes(q) ||
        r.club?.toLowerCase().includes(q)
      );
    });

    return (
      <div
        className="fixed inset-0 z-[70] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
        onClick={() => {
          setActiveTableModalId(null);
          setPickingSeatNoForInlineAssign(null);
        }}
      >
        <div
          className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-5xl overflow-hidden my-auto max-h-[92vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center space-x-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 font-black text-lg">
                {table.code || "T"}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-lg font-black">{table.label}</h3>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/10 text-emerald-300 font-bold">
                    จองแล้ว {occMap.size} / {cap} ที่นั่ง
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  เลือกเก้าอี้ที่ต้องการได้เลย ({getSeatCode(table, 1)} – {getSeatCode(table, cap)}) • สามารถเลือกเก้าอี้หมายเลขใดก็ได้ที่ยังว่างอยู่
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-1.5">
              {prevTable && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveTableModalId(prevTable.id);
                    setPickingSeatNoForInlineAssign(null);
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold flex items-center space-x-1 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>{prevTable.label}</span>
                </button>
              )}
              {nextTable && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveTableModalId(nextTable.id);
                    setPickingSeatNoForInlineAssign(null);
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold flex items-center space-x-1 cursor-pointer"
                >
                  <span>{nextTable.label}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setActiveTableModalId(null);
                  setPickingSeatNoForInlineAssign(null);
                }}
                className="p-2 rounded-xl bg-white/10 hover:bg-rose-500/80 text-white transition-colors cursor-pointer ml-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Selected Guest Banner inside Modal */}
          {selectedAttendee && (
            <div
              className={`px-5 py-3 border-b flex flex-wrap items-center justify-between gap-2 shrink-0 ${
                selectedAttendee.checkedIn
                  ? "bg-emerald-50 border-emerald-200"
                  : "bg-amber-50 border-amber-200"
              }`}
            >
              <div className="flex items-center space-x-3">
                {selectedAttendee.photoUrl ? (
                  <img
                    src={selectedAttendee.photoUrl}
                    alt={selectedAttendee.name}
                    className={`w-10 h-10 rounded-full object-cover ring-2 ${
                      selectedAttendee.checkedIn ? "ring-emerald-500" : "ring-amber-500"
                    }`}
                  />
                ) : (
                  <div
                    className={`w-10 h-10 rounded-full ${getAvatarColor(selectedAttendee.ticketNo)} text-white font-black flex items-center justify-center text-center px-0.5 break-words ring-2 ${
                      selectedAttendee.checkedIn ? "ring-emerald-400" : "ring-amber-400"
                    } ${getAvatarTextSizeClass(getInitials(selectedAttendee.name, selectedAttendee.nickname), "md")}`}
                  >
                    {getInitials(selectedAttendee.name, selectedAttendee.nickname)}
                  </div>
                )}
                <div>
                  <span
                    className={`text-[11px] font-bold ${
                      selectedAttendee.checkedIn ? "text-emerald-700" : "text-amber-800"
                    }`}
                  >
                    {selectedAttendee.checkedIn
                      ? "✅ เข้างานแล้ว — คลิกเก้าอี้ว่างเพื่อยืนยันที่นั่งถาวรให้:"
                      : `⏳ ยังไม่เข้างาน — จองล่วงหน้าให้เพื่อนได้ ${holdDurationMinutes} นาที (หากไม่มาเช็กอินจะหลุดอัตโนมัติ):`}
                  </span>
                  <div className="text-sm font-black text-slate-900">
                    {selectedAttendee.name} {selectedAttendee.nickname ? `(${selectedAttendee.nickname})` : ""}{" "}
                    <span className="font-mono text-xs text-slate-500">• {selectedAttendee.ticketNo}</span>
                  </div>
                </div>
              </div>
              {attendeeSeatMap.get(selectedAttendee.ticketNo) && (
                <span className="text-xs px-2.5 py-1 rounded-xl bg-amber-100 text-amber-800 font-bold border border-amber-300">
                  ที่นั่งปัจจุบัน: {attendeeSeatMap.get(selectedAttendee.ticketNo).tableLabel} • {attendeeSeatMap.get(selectedAttendee.ticketNo).seatCode} (Owner กำลังย้ายที่นั่ง)
                </span>
              )}
            </div>
          )}

          {/* Modal Body: Left Visual Table Diagram + Right Detailed Seat Slots */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT: Interactive Visual Table & Chair Ring (5 cols) */}
            <div className="lg:col-span-5 flex flex-col items-center">
              <div className="text-[11px] font-extrabold text-slate-400 tracking-wider uppercase mb-2">
                ▲ หันหน้าไปทางเวที (STAGE) ▲
              </div>

              <div className="relative w-full max-w-[340px] aspect-square bg-slate-50 rounded-3xl border border-slate-200 shadow-inner">
                {/* Center Tabletop */}
                <div
                  className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center text-center shadow-lg border-4 border-amber-200 bg-gradient-to-br from-amber-50 via-white to-amber-100 ${
                    table.shape === "rect"
                      ? "w-[54%] h-[42%] rounded-2xl"
                      : "w-[46%] h-[46%] rounded-full"
                  }`}
                >
                  <span className="text-lg sm:text-xl font-black text-slate-900 leading-tight">
                    {table.label}
                  </span>
                  <span className="text-xs font-bold text-amber-700 mt-0.5">
                    {occMap.size}/{cap} ท่าน
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold">
                    ว่าง {cap - occMap.size} ที่
                  </span>
                </div>

                {/* Chair Nodes Around Table */}
                {positions.map((pos) => {
                  const occ = occMap.get(pos.seatNo);
                  const seatCode = getSeatCode(table, pos.seatNo);
                  const isEmpty = !occ?.attendee;
                  const isPickingThis = pickingSeatNoForInlineAssign === pos.seatNo;

                  return (
                    <button
                      key={pos.seatNo}
                      type="button"
                      onClick={() => {
                        if (isEmpty) {
                          if (selectedAttendee) {
                            handleAssignSeat(table, pos.seatNo, selectedAttendee);
                          } else {
                            setPickingSeatNoForInlineAssign(isPickingThis ? null : pos.seatNo);
                            setInlineAssignSearch("");
                          }
                        }
                      }}
                      style={{
                        left: `${pos.x}%`,
                        top: `${pos.y}%`,
                        transform: "translate(-50%, -50%)"
                      }}
                      title={
                        isEmpty
                          ? `เก้าอี้ ${seatCode} (ว่าง) — คลิกเพื่อจอง`
                          : `เก้าอี้ ${seatCode}: ${occ.attendee.name}${occ.attendee.nickname ? ` (${occ.attendee.nickname})` : ""}`
                      }
                      className={`absolute flex flex-col items-center group transition-all ${
                        isEmpty ? "cursor-pointer hover:scale-110 z-20" : "z-10"
                      }`}
                    >
                      {isEmpty ? (
                        <div
                          className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl border-2 flex flex-col items-center justify-center shadow-sm transition-all ${
                            isPickingThis
                              ? "bg-indigo-600 border-indigo-700 text-white scale-110 ring-4 ring-indigo-300"
                              : selectedAttendee
                              ? "bg-emerald-500 border-emerald-600 text-white hover:bg-emerald-400 shadow-emerald-500/30 shadow-md"
                              : "bg-white border-emerald-400 text-emerald-700 hover:bg-emerald-50"
                          }`}
                        >
                          <span className="text-xs font-black leading-none">{seatCode}</span>
                          <span className="text-[9px] font-bold mt-0.5 opacity-90">ว่าง</span>
                        </div>
                      ) : (() => {
                        const isHoldSeat = occ.status === "hold";
                        const showCheckInPhoto = Boolean(occ.attendee.checkedIn && !isHoldSeat && occ.attendee.photoUrl);
                        const nickLabel = getInitials(occ.attendee.name, occ.attendee.nickname);
                        return (
                          <div className="flex flex-col items-center">
                            <div className="relative">
                              {showCheckInPhoto ? (
                                <img
                                  src={occ.attendee.photoUrl}
                                  alt={occ.attendee.name}
                                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover ring-2 ring-emerald-400 shadow-md bg-white"
                                />
                              ) : (
                                <div
                                  className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full ${getAvatarColor(
                                    occ.attendee.ticketNo
                                  )} text-white font-black flex items-center justify-center text-center px-1 break-words shadow-md ${getAvatarTextSizeClass(
                                    nickLabel,
                                    "lg"
                                  )} ${isHoldSeat ? "ring-2 ring-amber-400" : "ring-2 ring-emerald-400"}`}
                                >
                                  {nickLabel}
                                </div>
                              )}
                              <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full bg-slate-900 text-amber-300 text-[9px] font-black leading-none shadow">
                                {seatCode}
                              </span>
                              {isHoldSeat && (
                                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[8px] font-mono font-black leading-none shadow whitespace-nowrap">
                                  ⏳{formatCountdownMmSs(occ.remainingMs)}
                                </span>
                              )}
                            </div>
                            <span className="mt-1 px-1.5 py-0.5 rounded-md bg-white/95 border border-slate-200 text-[9px] font-extrabold text-slate-800 max-w-[80px] truncate shadow-sm">
                              {nickLabel}
                            </span>
                          </div>
                        );
                      })()}
                    </button>
                  );
                })}
              </div>

              <p className="mt-3 text-[11px] text-slate-500 text-center">
                แตะที่ปุ่มเก้าอี้สีเขียวบนแผนภาพ หรือเลือกจากรายการช่องที่นั่งด้านขวาได้เลย
              </p>
            </div>

            {/* RIGHT: Detailed Seat Slots List (A1 .. A8) (7 cols) */}
            <div className="lg:col-span-7 space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-black text-slate-800 flex items-center space-x-1.5">
                  <Armchair className="w-4 h-4 text-emerald-600" />
                  <span>รายการเก้าอี้ทั้งหมด ({cap} ที่นั่ง)</span>
                </h4>
                <span className="text-xs text-slate-500 font-semibold">
                  ว่าง {cap - occMap.size} ช่อง
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {Array.from({ length: cap }, (_, idx) => {
                  const seatNo = idx + 1;
                  const seatCode = getSeatCode(table, seatNo);
                  const occ = occMap.get(seatNo);
                  const isEmpty = !occ?.attendee;
                  const isPickingThis = pickingSeatNoForInlineAssign === seatNo;

                  return (
                    <div
                      key={seatNo}
                      className={`rounded-2xl border p-3 transition-all ${
                        isEmpty
                          ? isPickingThis
                            ? "border-indigo-500 bg-indigo-50/50 ring-2 ring-indigo-300"
                            : "border-dashed border-emerald-300 bg-emerald-50/20 hover:bg-emerald-50/50"
                          : "border-slate-200 bg-white shadow-sm"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center space-x-2.5 min-w-0">
                          {/* Seat Code Pill */}
                          <div
                            className={`w-9 h-9 rounded-xl font-black text-xs flex items-center justify-center shrink-0 ${
                              isEmpty
                                ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                                : "bg-slate-900 text-amber-300"
                            }`}
                          >
                            {seatCode}
                          </div>

                          {/* Occupant or Empty */}
                          {isEmpty ? (
                            <div className="min-w-0">
                              <div className="text-xs font-extrabold text-emerald-700">เก้าอี้ว่าง</div>
                              <div className="text-[10px] text-slate-400">พร้อมให้เลือกนั่ง</div>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2 min-w-0">
                              {occ.attendee.checkedIn && occ.status !== "hold" && occ.attendee.photoUrl ? (
                                <img
                                  src={occ.attendee.photoUrl}
                                  alt={occ.attendee.name}
                                  className="w-9 h-9 rounded-full object-cover ring-2 ring-emerald-400 shrink-0"
                                />
                              ) : (() => {
                                const nickLabel = getInitials(occ.attendee.name, occ.attendee.nickname);
                                return (
                                  <div
                                    className={`w-9 h-9 rounded-full ${getAvatarColor(
                                      occ.attendee.ticketNo
                                    )} text-white font-black flex items-center justify-center text-center px-0.5 break-words shrink-0 ${getAvatarTextSizeClass(
                                      nickLabel,
                                      "md"
                                    )} ${occ.status === "hold" ? "ring-2 ring-amber-400" : ""}`}
                                  >
                                    {nickLabel}
                                  </div>
                                );
                              })()}
                              <div className="min-w-0">
                                <div className="text-xs font-black text-slate-900 truncate">
                                  {occ.attendee.name}
                                </div>
                                <div className="text-[10px] text-slate-500 flex items-center flex-wrap gap-1">
                                  {occ.attendee.nickname && (
                                    <span className="font-bold text-indigo-600">({occ.attendee.nickname})</span>
                                  )}
                                  <span className="font-mono">{occ.attendee.ticketNo}</span>
                                  {occ.status === "hold" ? (
                                    <>
                                      <span className="px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-300 font-mono font-black text-[9px]">
                                        ⏳ เหลือ {formatCountdownMmSs(occ.remainingMs)}
                                      </span>
                                      {occ.isVipGuest && (
                                        <span className="px-1.5 py-0.5 rounded-md bg-violet-100 text-violet-800 border border-violet-300 font-bold text-[9px]">
                                          👑 แขกผู้ใหญ่
                                        </span>
                                      )}
                                      {occ.fineAmount > 0 && (
                                        <span className="px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-700 font-bold text-[9px]">
                                          ปรับ {occ.fineAmount}฿
                                        </span>
                                      )}
                                    </>
                                  ) : (
                                    <span className="px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-700 font-bold text-[9px]">
                                      ✓ ยืนยันแล้ว
                                    </span>
                                  )}
                                </div>
                                {occ.status === "hold" && occ.bookedByName && (
                                  <div className="text-[9px] text-indigo-600 font-bold truncate mt-0.5">
                                    ผู้จอง: {occ.bookedByNickname || occ.bookedByName}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        {isEmpty ? (
                          selectedAttendee ? (
                            <button
                              type="button"
                              onClick={() => handleAssignSeat(table, seatNo, selectedAttendee)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold shadow-sm shrink-0 cursor-pointer transition-all active:scale-95 ${
                                selectedAttendee.checkedIn
                                  ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                                  : "bg-amber-500 hover:bg-amber-400 text-slate-950"
                              }`}
                            >
                              {selectedAttendee.checkedIn ? `เลือก ${seatCode}` : `จองชั่วคราว ${seatCode}`}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setPickingSeatNoForInlineAssign(isPickingThis ? null : seatNo);
                                setInlineAssignSearch("");
                              }}
                              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold shrink-0 cursor-pointer transition-all ${
                                isPickingThis
                                  ? "bg-slate-200 text-slate-700"
                                  : "bg-white hover:bg-emerald-600 hover:text-white border border-emerald-300 text-emerald-700"
                              }`}
                            >
                              {isPickingThis ? "ปิด" : "+ เลือกแขก"}
                            </button>
                          )
                        ) : (
                          !isKioskMode && (
                            isOwner ? (
                              <div className="flex items-center space-x-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedAttendeeTicketNo(occ.attendee.ticketNo);
                                    showToast(`เลือก "${occ.attendee.nickname || occ.attendee.name}" เพื่อย้ายไปเก้าอี้หรือโต๊ะอื่น (สิทธิ์เจ้าของแอป)`, "indigo");
                                  }}
                                  title="ย้ายเก้าอี้ / ย้ายโต๊ะ (เฉพาะเจ้าของแอป)"
                                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-indigo-100 text-slate-600 hover:text-indigo-700 cursor-pointer"
                                >
                                  <Move className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (window.confirm(`ต้องการยกเลิกที่นั่ง ${seatCode} ของ ${occ.attendee.name} ใช่หรือไม่?`)) {
                                      handleUnassignSeat(table.id, seatNo, occ.attendee.nickname || occ.attendee.name);
                                    }
                                  }}
                                  title="ยกเลิกการจองเก้าอี้นี้ (เฉพาะเจ้าของแอป)"
                                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 cursor-pointer"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="shrink-0">
                                {seatingPlan?.seatChangeRequests?.[occ.attendee.ticketNo] ? (
                                  <span className="px-2 py-1 rounded-lg bg-amber-100 text-amber-800 border border-amber-300 text-[9px] font-extrabold">
                                    ⏳ รอเจ้าของอนุมัติ
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (window.confirm(`ส่งคำขอเปลี่ยนที่นั่งของ "${occ.attendee.name}" (${seatCode}) ให้เจ้าของแอปอนุมัติใช่หรือไม่?`)) {
                                        handleRequestSeatChange(occ.attendee, {
                                          tableId: table.id,
                                          tableLabel: table.label,
                                          seatNo,
                                          seatCode
                                        });
                                      }
                                    }}
                                    className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-amber-100 border border-slate-200 text-slate-600 hover:text-amber-800 text-[10px] font-bold cursor-pointer"
                                    title="เฉพาะเจ้าของแอปเท่านั้นที่อนุมัติเปลี่ยนที่นั่งได้"
                                  >
                                    ขอเปลี่ยนที่
                                  </button>
                                )}
                              </div>
                            )
                          )
                        )}
                      </div>

                      {/* Inline Quick-Pick Unassigned Attendee Dropdown */}
                      {isEmpty && isPickingThis && !selectedAttendee && (
                        <div className="mt-2.5 pt-2.5 border-t border-indigo-200 space-y-2">
                          {/* Quick CTA for Advance Hold Booking (Booker -> Seat Owner -> 15/30/60/120 VIP) */}
                          <button
                            type="button"
                            onClick={() => openAdvanceHoldModal(table, seatNo, null)}
                            className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-300 hover:to-orange-300 text-slate-950 text-[11px] font-black flex items-center justify-center space-x-1.5 shadow-xs cursor-pointer"
                          >
                            <Clock className="w-3.5 h-3.5" />
                            <span>⏳ จองล่วงหน้าให้เพื่อนที่ยังไม่เข้างาน (เลือกผู้จองก่อน)</span>
                          </button>

                          <div className="relative">
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              autoFocus
                              value={inlineAssignSearch}
                              onChange={(e) => setInlineAssignSearch(e.target.value)}
                              placeholder={`ค้นหาแขกเพื่อลงเก้าอี้ ${seatCode}...`}
                              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white border border-indigo-200 text-xs focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                          <div className="max-h-40 overflow-y-auto space-y-1 pr-0.5">
                            {inlineAssignCandidates.length === 0 ? (
                              <div className="text-[11px] text-slate-400 text-center py-2">
                                ไม่พบผู้ลงทะเบียนที่ยังไม่เลือกโต๊ะ
                              </div>
                            ) : (
                              inlineAssignCandidates.slice(0, 20).map((cand) => (
                                <button
                                  key={cand.ticketNo}
                                  type="button"
                                  onClick={() => handleAssignSeat(table, seatNo, cand)}
                                  className="w-full flex items-center justify-between p-1.5 rounded-lg bg-white hover:bg-emerald-50 border border-slate-100 hover:border-emerald-300 text-left transition-colors cursor-pointer"
                                >
                                  <div className="flex items-center space-x-2 min-w-0">
                                    {cand.photoUrl ? (
                                      <img
                                        src={cand.photoUrl}
                                        alt={cand.name}
                                        className="w-6 h-6 rounded-full object-cover shrink-0"
                                      />
                                    ) : (
                                      <div
                                        className={`w-6 h-6 rounded-full ${getAvatarColor(cand.ticketNo)} text-white font-bold flex items-center justify-center text-center px-0.5 break-words shrink-0 ${getAvatarTextSizeClass(
                                          getInitials(cand.name, cand.nickname),
                                          "xs"
                                        )}`}
                                      >
                                        {getInitials(cand.name, cand.nickname)}
                                      </div>
                                    )}
                                    <div className="min-w-0">
                                      <div className="text-[11px] font-bold text-slate-800 truncate">
                                        {cand.name} {cand.nickname ? `(${cand.nickname})` : ""}
                                      </div>
                                      <div className="text-[9px] text-slate-400 font-mono">
                                        {cand.ticketNo} {cand.checkedIn ? "• เข้างานแล้ว" : ""}
                                      </div>
                                    </div>
                                  </div>
                                  <span className="text-[10px] font-bold text-emerald-600 shrink-0 ml-2">
                                    เลือก →
                                  </span>
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // =====================================================================
  // MAIN COMPONENT RENDER
  // =====================================================================
  return (
    <main className="max-w-7xl w-full mx-auto p-3 sm:p-6 space-y-4">
      {/* Floating Toast Notification */}
      {toastMsg && (
        <div
          className={`fixed bottom-5 right-5 z-[90] px-4 py-3 rounded-2xl shadow-2xl border text-xs sm:text-sm font-bold flex items-center space-x-2 animate-bounce ${
            toastMsg.tone === "rose"
              ? "bg-rose-600 border-rose-400 text-white"
              : toastMsg.tone === "amber"
              ? "bg-amber-500 border-amber-300 text-slate-950"
              : toastMsg.tone === "indigo"
              ? "bg-indigo-600 border-indigo-400 text-white"
              : "bg-emerald-600 border-emerald-400 text-white"
          }`}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* ================================================================= */}
      {/* TOP TOOLBAR: Stats + Owner/Admin Role Mode Switch + Quick Actions */}
      {/* ================================================================= */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Left: Title & Summary Stats */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center space-x-2 mr-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-sm">
                <Armchair className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-black text-slate-900 leading-tight">
                  ระบบผังห้อง & จองโต๊ะ/ที่นั่ง
                </h2>
                <p className="text-[11px] text-slate-500">
                  เลือกโต๊ะและเก้าอี้รายตัว (เช่น A1–A8) ซิงค์เรียลไทม์ทุกเครื่อง
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="px-2.5 py-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700">
                โต๊ะเปิด: <strong className="text-slate-950 font-mono">{stats.openTables}/{stats.totalTables}</strong>
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800">
                จองแล้ว: <strong className="font-mono">{stats.bookedCount}/{stats.openCapacity}</strong> ที่นั่ง
              </span>
              {stats.holdCount > 0 && (
                <span className="px-2.5 py-1 rounded-xl bg-amber-100 border border-amber-300 text-xs font-extrabold text-amber-900">
                  ⏳ จองชั่วคราว: <strong className="font-mono">{stats.holdCount}</strong>
                </span>
              )}
              <span className="px-2.5 py-1 rounded-xl bg-sky-50 border border-sky-200 text-xs font-bold text-sky-800">
                ว่าง: <strong className="font-mono">{stats.availableSeats}</strong> ที่นั่ง
              </span>
            </div>
          </div>

          {/* Right: Mode Controls & Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {isOwner ? (
              <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditMode(false);
                    setSelectedItemId(null);
                    setTapMoveItemId(null);
                    setQueueFilterMode("checked_in");
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center space-x-1.5 transition-all cursor-pointer ${
                    !isEditMode
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Armchair className="w-3.5 h-3.5" />
                  <span>โหมดจองโต๊ะ</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditMode(true);
                    setSelectedAttendeeTicketNo(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center space-x-1.5 transition-all cursor-pointer ${
                    isEditMode
                      ? "bg-amber-500 text-slate-950 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>จัดผังห้อง (Owner)</span>
                </button>
              </div>
            ) : (
              <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-600">
                <Lock className="w-3.5 h-3.5 text-amber-600" />
                <span>ผังห้องถูกล็อกโดยเจ้าของแอป (เลือกจองที่นั่งได้)</span>
              </div>
            )}

            {!isEditMode && (
              <button
                type="button"
                onClick={() => setIsKioskMode(true)}
                className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer"
                title="ขยายผังห้องเต็มจอสำหรับหันหน้าจอให้ผู้เข้าร่วมงานเลือกโต๊ะเอง"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>จอให้แขกเลือกเอง</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsSummaryModalOpen(true)}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer"
            >
              <ListChecks className="w-3.5 h-3.5 text-slate-600" />
              <span>สรุปรายชื่อตามโต๊ะ</span>
            </button>

            {Object.keys(seatingPlan?.expiredHoldFines || {}).length > 0 && (
              <button
                type="button"
                onClick={() => setIsFineLedgerOpen(true)}
                className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-extrabold flex items-center space-x-1.5 transition-all cursor-pointer"
              >
                <Banknote className="w-3.5 h-3.5" />
                <span>ประวัติค่าปรับ ({Object.keys(seatingPlan?.expiredHoldFines || {}).length})</span>
              </button>
            )}

            {onGoToTableLuckyDraw && (
              <button
                type="button"
                onClick={onGoToTableLuckyDraw}
                className="px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs font-extrabold flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Dices className="w-3.5 h-3.5" />
                <span>สุ่มรางวัลโต๊ะ/เก้าอี้</span>
              </button>
            )}
          </div>
        </div>

        {/* =============================================================== */}
        {/* HOLD POLICY BAR (Clean Summary Only — Settings inside Owner Editor) */}
        {/* =============================================================== */}
        <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center space-x-2 text-slate-600 flex-wrap gap-y-1">
            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>เข้างานแล้ว: จองถาวร</span>
            </span>
            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 font-bold text-[11px]">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>ยังไม่เข้างาน (กรณีพิเศษ): เก็บที่นั่งชั่วคราว {holdDurationMinutes} นาที</span>
            </span>
            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 font-bold text-[11px]">
              <Lock className="w-3 h-3 text-slate-500" />
              <span>เปลี่ยนที่นั่ง: เฉพาะเจ้าของแอปอนุมัติ</span>
            </span>
          </div>
        </div>

        {/* =============================================================== */}
        {/* PENDING SEAT CHANGE REQUESTS BANNER (Owner Approve / Reject)    */}
        {/* =============================================================== */}
        {pendingChangeRequestsList.length > 0 && (
          <div className="p-3 rounded-2xl bg-gradient-to-r from-indigo-50 via-violet-50 to-amber-50 border-2 border-indigo-300 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs sm:text-sm font-black text-indigo-950">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-ping" />
                <span>
                  🔔 คำขอเปลี่ยนที่นั่งรออนุมัติ ({pendingChangeRequestsList.length} รายการ)
                </span>
              </div>
              {!isOwner && (
                <span className="text-[11px] font-bold text-indigo-700">
                  รอเจ้าของแอปพิจารณาอนุมัติ
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {pendingChangeRequestsList.map((req) => (
                <div
                  key={req.ticketNo}
                  className="p-2.5 rounded-xl bg-white border border-indigo-200 flex flex-wrap items-center justify-between gap-2 shadow-xs"
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    {req.attendee?.photoUrl ? (
                      <img
                        src={req.attendee.photoUrl}
                        alt={req.attendee.name}
                        className="w-9 h-9 rounded-full object-cover ring-2 ring-indigo-300 shrink-0"
                      />
                    ) : (
                      <div
                        className={`w-9 h-9 rounded-full ${getAvatarColor(req.ticketNo)} text-white font-black flex items-center justify-center text-center px-0.5 break-words shrink-0 ${getAvatarTextSizeClass(
                          getInitials(req.attendee?.name, req.attendee?.nickname),
                          "md"
                        )}`}
                      >
                        {getInitials(req.attendee?.name, req.attendee?.nickname)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="text-xs font-black text-slate-900 truncate">
                        {req.attendee?.name} {req.attendee?.nickname ? `(${req.attendee.nickname})` : ""}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        ที่นั่งเดิม:{" "}
                        <strong className="text-indigo-700">
                          {req.liveSeat ? `${req.liveSeat.tableLabel} • ${req.liveSeat.seatCode}` : `${req.currentTableLabel} • ${req.currentSeatCode}`}
                        </strong>{" "}
                        • ผู้ส่งคำขอ: {req.requestedBy}
                      </div>
                    </div>
                  </div>

                  {isOwner ? (
                    <div className="flex items-center space-x-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleApproveSeatChange(req)}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-extrabold cursor-pointer shadow-xs"
                      >
                        ✓ อนุมัติ & ย้ายที่นั่ง
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRejectSeatChange(req.ticketNo, req.attendee?.nickname || req.attendee?.name)}
                        className="px-2 py-1.5 rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-700 text-[11px] font-bold cursor-pointer"
                      >
                        ปฏิเสธ
                      </button>
                    </div>
                  ) : (
                    <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 text-[10px] font-extrabold">
                      ⏳ รอเจ้าของอนุมัติ
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =============================================================== */}
        {/* OWNER-ONLY LAYOUT EDITOR PALETTE (Hidden for Admin & Manager)    */}
        {/* =============================================================== */}
        {isOwner && isEditMode && (
          <div className="pt-3 border-t border-slate-200 space-y-3">
            {/* Row 1: Grid Scale + Room Name + Quick Templates */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 bg-amber-50/70 border border-amber-200/80 rounded-xl p-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-black text-amber-900 flex items-center space-x-1">
                  <Grid3x3 className="w-4 h-4 text-amber-600" />
                  <span>สเกลห้อง:</span>
                </span>
                {[
                  { label: "10×10", c: 10, r: 10 },
                  { label: "12×10", c: 12, r: 10 },
                  { label: "16×10", c: 16, r: 10 },
                  { label: "20×12", c: 20, r: 12 }
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => handleGridResize(preset.c, preset.r)}
                    className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                      seatingPlan.gridCols === preset.c && seatingPlan.gridRows === preset.r
                        ? "bg-amber-500 border-amber-600 text-slate-950 shadow-sm"
                        : "bg-white border-amber-200 text-amber-900 hover:bg-amber-100"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}

                {/* Custom Cols / Rows Stepper */}
                <div className="flex items-center space-x-1 bg-white rounded-lg border border-amber-200 px-2 py-0.5 text-[11px] font-bold text-slate-700">
                  <span>กว้าง</span>
                  <button
                    type="button"
                    onClick={() => handleGridResize((seatingPlan.gridCols || 10) - 1, seatingPlan.gridRows || 10)}
                    className="p-0.5 hover:bg-slate-100 rounded cursor-pointer"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="font-mono w-5 text-center">{seatingPlan.gridCols || 10}</span>
                  <button
                    type="button"
                    onClick={() => handleGridResize((seatingPlan.gridCols || 10) + 1, seatingPlan.gridRows || 10)}
                    className="p-0.5 hover:bg-slate-100 rounded cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                  <span className="mx-1 text-slate-300">|</span>
                  <span>ลึก</span>
                  <button
                    type="button"
                    onClick={() => handleGridResize(seatingPlan.gridCols || 10, (seatingPlan.gridRows || 10) - 1)}
                    className="p-0.5 hover:bg-slate-100 rounded cursor-pointer"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="font-mono w-5 text-center">{seatingPlan.gridRows || 10}</span>
                  <button
                    type="button"
                    onClick={() => handleGridResize(seatingPlan.gridCols || 10, (seatingPlan.gridRows || 10) + 1)}
                    className="p-0.5 hover:bg-slate-100 rounded cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                {/* Room Title Input */}
                <input
                  type="text"
                  value={seatingPlan.roomTitle || ""}
                  onChange={(e) => commitPlan((prev) => ({ ...prev, roomTitle: e.target.value }))}
                  placeholder="ชื่อห้องจัดเลี้ยง..."
                  className="px-2.5 py-1 rounded-lg bg-white border border-amber-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-amber-500 w-48 sm:w-56"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleResetToTemplate}
                  className="px-2.5 py-1 rounded-lg bg-white hover:bg-emerald-50 border border-emerald-300 text-emerald-700 text-[11px] font-bold flex items-center space-x-1 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>ผังตัวอย่าง</span>
                </button>
                <button
                  type="button"
                  onClick={handleClearToEmptyRoom}
                  className="px-2.5 py-1 rounded-lg bg-white hover:bg-rose-50 border border-rose-300 text-rose-700 text-[11px] font-bold flex items-center space-x-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>ล้างเป็นห้องว่าง</span>
                </button>
              </div>
            </div>

            {/* Row 1.5: Owner Fine QR Code Uploader (Auto-Deletes Old Image) + Default Hold Duration */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5">
              {/* Left: Fine Payment QR Code Upload (Owner) */}
              <div className="lg:col-span-6 flex items-center justify-between gap-3 bg-indigo-50/70 border border-indigo-200 rounded-xl px-3 py-2">
                <div className="flex items-center space-x-3 min-w-0">
                  {seatingPlan?.fineQrCodeUrl ? (
                    <img
                      src={seatingPlan.fineQrCodeUrl}
                      alt="QR รับค่าปรับ"
                      className="w-12 h-12 rounded-xl object-contain bg-white border border-indigo-200 p-0.5 shrink-0 shadow-xs"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-white border border-dashed border-indigo-300 flex items-center justify-center text-indigo-400 shrink-0">
                      <QrCode className="w-6 h-6" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="text-xs font-black text-indigo-950">
                      QR Code รับชำระค่าปรับมาสาย (50฿ / 100฿)
                    </div>
                    <div className="text-[10px] text-indigo-700 leading-tight">
                      {seatingPlan?.fineQrCodeUrl
                        ? "พร้อมแสดงตอนลงทะเบียนเข้างาน (เปลี่ยนรูปใหม่จะลบรูปเดิมอัตโนมัติ)"
                        : "อัปโหลดรูป QR พร้อมเพย์สำหรับแสดงเมื่อแขกมาสายกว่าเวลาจองล่วงหน้า"}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5 shrink-0">
                  <label className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-extrabold flex items-center space-x-1 cursor-pointer shadow-xs">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isUploadingFineQr ? "กำลังอัป..." : seatingPlan?.fineQrCodeUrl ? "เปลี่ยนรูป QR" : "อัปโหลด QR"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleUploadFineQrCode}
                      disabled={isUploadingFineQr}
                      className="hidden"
                    />
                  </label>
                  {seatingPlan?.fineQrCodeUrl && (
                    <button
                      type="button"
                      onClick={handleDeleteFineQrCode}
                      title="ลบรูป QR Code"
                      className="p-1.5 rounded-lg bg-white hover:bg-rose-50 border border-rose-200 text-rose-600 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Right: Default Hold Duration Reference (15, 30, 60, 120) */}
              <div className="lg:col-span-6 flex flex-wrap items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-black text-slate-800 flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>ค่าเริ่มต้นจองล่วงหน้า:</span>
                  </span>
                  {HOLD_DURATION_OPTIONS.map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => handleUpdateHoldDuration(mins)}
                      className={`px-2 py-1 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer border ${
                        holdDurationMinutes === mins
                          ? "bg-amber-500 border-amber-600 text-slate-950 shadow-sm"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-amber-50 hover:border-amber-300"
                      }`}
                    >
                      {mins === 120 ? "แขกผู้ใหญ่" : `${mins}น.`}
                    </button>
                  ))}
                </div>
                <span className="text-[10px] text-slate-500">
                  15น.=ฟรี • 30น.=50฿ • 60น.=100฿ • 120น.=แขกผู้ใหญ่
                </span>
              </div>
            </div>

            {/* Row 2: Dynamic Tool Palette for Placing Items (+ Add / Remove Types) */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-extrabold text-slate-600">เลือกเครื่องมือแล้วคลิกวางบนตาราง:</span>

              {/* Select / Drag-Move Tool */}
              <button
                type="button"
                onClick={() => {
                  setActiveTool("select");
                  setTapMoveItemId(null);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 border transition-all cursor-pointer ${
                  activeTool === "select"
                    ? "bg-slate-900 text-white border-transparent shadow-sm scale-[1.02]"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                <Move className="w-3.5 h-3.5" />
                <span>เลือก / ลากย้าย</span>
              </button>

              {/* Dynamic Placeable Palette Chips */}
              {paletteTypes.map((pt) => {
                const isActive = activeTool === pt.id;
                const theme = CUSTOM_COLOR_THEMES[pt.colorTheme] || CUSTOM_COLOR_THEMES.violet;
                const displayLabel =
                  pt.id === "table"
                    ? `${pt.label} (${newTableSeats} คน)`
                    : pt.isBookable
                    ? `${pt.label} (${pt.defaultCapacity || newTableSeats} คน)`
                    : pt.label;

                return (
                  <div
                    key={pt.id}
                    className={`inline-flex items-center rounded-xl border transition-all overflow-hidden ${
                      isActive
                        ? `${theme.btnActive} border-transparent shadow-sm scale-[1.02]`
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTool(pt.id);
                        setTapMoveItemId(null);
                      }}
                      className="px-2.5 py-1.5 text-xs font-bold flex items-center space-x-1.5 cursor-pointer"
                    >
                      <span className="text-sm leading-none">{pt.emoji || "🪑"}</span>
                      <span>วาง{displayLabel}</span>
                    </button>
                    {!pt.isCore && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemovePaletteType(pt.id, pt.label);
                        }}
                        title={`ลบรูปแบบ "${pt.label}" ออกจากแถบเครื่องมือ`}
                        className={`pr-2 pl-1 py-1.5 text-xs cursor-pointer transition-colors ${
                          isActive
                            ? "text-white/75 hover:text-white"
                            : "text-slate-400 hover:text-rose-600"
                        }`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}

              {/* Add Custom Table/Item Type Button */}
              <button
                type="button"
                onClick={() => setIsAddTypeModalOpen(true)}
                className="px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center space-x-1 border-2 border-dashed border-violet-300 bg-violet-50/70 hover:bg-violet-100 text-violet-700 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>เพิ่มรูปแบบใหม่</span>
              </button>

              {hasMissingDefaultPalette && (
                <button
                  type="button"
                  onClick={handleRestoreDefaultPalette}
                  className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold flex items-center space-x-1 border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 cursor-pointer"
                  title="คืนค่ารูปแบบมาตรฐานที่เคยลบออก"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>คืนค่าเริ่มต้น</span>
                </button>
              )}

              {/* Quick default seats chooser when placing standard tables */}
              {activeTool === "table" && (
                <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-xs">
                  <span className="font-bold text-emerald-800">ที่นั่งเริ่มต้น:</span>
                  {[4, 6, 8, 10, 12].map((cap) => (
                    <button
                      key={cap}
                      type="button"
                      onClick={() => setNewTableSeats(cap)}
                      className={`w-6 h-6 rounded-lg font-mono font-bold text-[11px] cursor-pointer ${
                        newTableSeats === cap
                          ? "bg-emerald-600 text-white"
                          : "bg-white text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
                      }`}
                    >
                      {cap}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setNewTableShape((s) => (s === "round" ? "rect" : "round"))}
                    className="ml-1 px-2 py-0.5 rounded-lg bg-white border border-emerald-200 text-emerald-800 font-bold text-[11px] flex items-center space-x-1 cursor-pointer"
                  >
                    {newTableShape === "round" ? <Circle className="w-3 h-3" /> : <Square className="w-3 h-3" />}
                    <span>{newTableShape === "round" ? "กลม" : "เหลี่ยม"}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ================================================================= */}
      {/* MAIN SPLIT VIEW: LEFT (FLOOR PLAN) + RIGHT (ATTENDEE QUEUE / INSPECTOR) */}
      {/* ================================================================= */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        {/* LEFT COLUMN (8/12): ROOM FLOOR PLAN */}
        <div className="xl:col-span-8">
          {renderFloorPlanCanvas(false)}
        </div>

        {/* RIGHT COLUMN (4/12): OWNER ITEM INSPECTOR (when editing) OR ATTENDEE QUEUE */}
        <div className="xl:col-span-4 space-y-4">
          {isOwner && isEditMode ? (
            /* OWNER ITEM PROPERTIES INSPECTOR */
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-black text-slate-900 flex items-center space-x-1.5">
                  <LayoutGrid className="w-4 h-4 text-amber-500" />
                  <span>ตั้งค่าวัตถุบนผังห้อง</span>
                </h3>
                <span className="text-[11px] font-bold text-slate-400">
                  ทั้งหมด {(seatingPlan.items || []).length} ชิ้น
                </span>
              </div>

              {selectedEditorItem ? (
                <div className="space-y-3.5">
                  {/* Label */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">ชื่อ / ป้ายแสดงบนผัง</label>
                    <input
                      type="text"
                      value={selectedEditorItem.label || ""}
                      onChange={(e) => handleUpdateSelectedItem({ label: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  {/* Custom Item Appearance (Emoji & Color) */}
                  {selectedEditorItem.type === "custom" && (
                    <div className="space-y-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">สัญลักษณ์</label>
                        <div className="flex flex-wrap gap-1">
                          {CUSTOM_EMOJIS.map((em) => (
                            <button
                              key={em}
                              type="button"
                              onClick={() => handleUpdateSelectedItem({ emoji: em })}
                              className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center cursor-pointer border ${
                                (selectedEditorItem.emoji || "🛍️") === em
                                  ? "bg-violet-100 border-violet-500 scale-110"
                                  : "bg-white border-slate-200 hover:bg-slate-100"
                              }`}
                            >
                              {em}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">โทนสี</label>
                        <div className="flex flex-wrap gap-1.5">
                          {Object.values(CUSTOM_COLOR_THEMES).map((th) => (
                            <button
                              key={th.id}
                              type="button"
                              onClick={() => handleUpdateSelectedItem({ colorTheme: th.id })}
                              title={th.name}
                              className={`w-6 h-6 rounded-full ${th.swatch} cursor-pointer transition-transform ${
                                (selectedEditorItem.colorTheme || "violet") === th.id
                                  ? "ring-2 ring-offset-2 ring-slate-900 scale-110"
                                  : "opacity-80 hover:opacity-100"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Table-specific Settings */}
                  {selectedEditorItem.type === "table" && (
                    <>
                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 mb-1">
                            รหัสโต๊ะ (เช่น A, B, VIP1)
                          </label>
                          <input
                            type="text"
                            value={selectedEditorItem.code || ""}
                            onChange={(e) => {
                              const code = e.target.value.toUpperCase().slice(0, 6);
                              handleUpdateSelectedItem({
                                code,
                                label: code ? `โต๊ะ ${code}` : selectedEditorItem.label
                              });
                            }}
                            className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono font-black text-slate-900 focus:bg-white focus:outline-none focus:border-amber-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 mb-1">รูปทรงโต๊ะ</label>
                          <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl">
                            <button
                              type="button"
                              onClick={() => handleUpdateSelectedItem({ shape: "round" })}
                              className={`py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center space-x-1 cursor-pointer ${
                                (selectedEditorItem.shape || "round") === "round"
                                  ? "bg-white text-slate-900 shadow-sm"
                                  : "text-slate-500"
                              }`}
                            >
                              <Circle className="w-3 h-3" />
                              <span>กลม</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateSelectedItem({ shape: "rect" })}
                              className={`py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center space-x-1 cursor-pointer ${
                                selectedEditorItem.shape === "rect"
                                  ? "bg-white text-slate-900 shadow-sm"
                                  : "text-slate-500"
                              }`}
                            >
                              <Square className="w-3 h-3" />
                              <span>เหลี่ยม</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Capacity */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 mb-1">
                          จำนวนที่นั่งของโต๊ะนี้ (เก้าอี้ {getSeatCode(selectedEditorItem, 1)} – {getSeatCode(selectedEditorItem, selectedEditorItem.capacity || 8)})
                        </label>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center space-x-1">
                            {[4, 6, 8, 10, 12].map((cap) => (
                              <button
                                key={cap}
                                type="button"
                                onClick={() => handleUpdateSelectedItem({ capacity: cap })}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold border cursor-pointer ${
                                  (selectedEditorItem.capacity || 8) === cap
                                    ? "bg-emerald-600 border-emerald-600 text-white"
                                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                                }`}
                              >
                                {cap}
                              </button>
                            ))}
                          </div>
                          <div className="flex items-center space-x-1 bg-slate-100 rounded-xl p-1">
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateSelectedItem({
                                  capacity: Math.max(2, (selectedEditorItem.capacity || 8) - 1)
                                })
                              }
                              className="p-1 rounded-lg bg-white hover:bg-slate-200 cursor-pointer"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="font-mono font-black text-xs w-6 text-center">
                              {selectedEditorItem.capacity || 8}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateSelectedItem({
                                  capacity: Math.min(20, (selectedEditorItem.capacity || 8) + 1)
                                })
                              }
                              className="p-1 rounded-lg bg-white hover:bg-slate-200 cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Open / Close Table Toggle */}
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-extrabold text-slate-800">สถานะการเปิดโต๊ะ</div>
                          <div className="text-[10px] text-slate-500">
                            {selectedEditorItem.isOpen !== false
                              ? "เปิดอยู่ — แอดมินสามารถจองที่นั่งโต๊ะนี้ได้"
                              : "ปิดอยู่ — ซ่อนสิทธิ์ไม่ให้แอดมินจองโต๊ะนี้"}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateSelectedItem({ isOpen: selectedEditorItem.isOpen === false })
                          }
                          className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center space-x-1.5 cursor-pointer transition-all ${
                            selectedEditorItem.isOpen !== false
                              ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                              : "bg-slate-600 hover:bg-slate-500 text-white"
                          }`}
                        >
                          {selectedEditorItem.isOpen !== false ? (
                            <>
                              <Eye className="w-3.5 h-3.5" />
                              <span>เปิดโต๊ะ</span>
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-3.5 h-3.5" />
                              <span>ปิดโต๊ะ</span>
                            </>
                          )}
                        </button>
                      </div>
                    </>
                  )}

                  {/* Size W x H & Position Nudge */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="text-[10px] font-bold text-slate-500 mb-1.5">ขนาด (ช่องตาราง)</div>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-600">กว้าง (W)</span>
                          <div className="flex items-center space-x-1">
                            <button
                              type="button"
                              onClick={() => handleUpdateSelectedItem({ w: Math.max(1, selectedEditorItem.w - 1) })}
                              className="p-1 rounded bg-white border border-slate-200 hover:bg-slate-100 cursor-pointer"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="font-mono font-bold w-5 text-center">{selectedEditorItem.w}</span>
                            <button
                              type="button"
                              onClick={() => handleUpdateSelectedItem({ w: selectedEditorItem.w + 1 })}
                              className="p-1 rounded bg-white border border-slate-200 hover:bg-slate-100 cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-600">ลึก (H)</span>
                          <div className="flex items-center space-x-1">
                            <button
                              type="button"
                              onClick={() => handleUpdateSelectedItem({ h: Math.max(1, selectedEditorItem.h - 1) })}
                              className="p-1 rounded bg-white border border-slate-200 hover:bg-slate-100 cursor-pointer"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="font-mono font-bold w-5 text-center">{selectedEditorItem.h}</span>
                            <button
                              type="button"
                              onClick={() => handleUpdateSelectedItem({ h: selectedEditorItem.h + 1 })}
                              className="p-1 rounded bg-white border border-slate-200 hover:bg-slate-100 cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center">
                      <div className="text-[10px] font-bold text-slate-500 mb-1">ขยับตำแหน่ง</div>
                      <button
                        type="button"
                        onClick={() => handleUpdateSelectedItem({ y: selectedEditorItem.y - 1 })}
                        className="p-1 rounded-lg bg-white border border-slate-200 hover:bg-amber-100 cursor-pointer"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <div className="flex items-center space-x-2 my-0.5">
                        <button
                          type="button"
                          onClick={() => handleUpdateSelectedItem({ x: selectedEditorItem.x - 1 })}
                          className="p-1 rounded-lg bg-white border border-slate-200 hover:bg-amber-100 cursor-pointer"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setTapMoveItemId(tapMoveItemId === selectedEditorItem.id ? null : selectedEditorItem.id)
                          }
                          title="แตะช่องบนผังเพื่อย้ายไปวาง"
                          className={`p-1 rounded-lg border text-[10px] font-bold cursor-pointer ${
                            tapMoveItemId === selectedEditorItem.id
                              ? "bg-amber-500 border-amber-600 text-slate-950"
                              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          <Move className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateSelectedItem({ x: selectedEditorItem.x + 1 })}
                          className="p-1 rounded-lg bg-white border border-slate-200 hover:bg-amber-100 cursor-pointer"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleUpdateSelectedItem({ y: selectedEditorItem.y + 1 })}
                        className="p-1 rounded-lg bg-white border border-slate-200 hover:bg-amber-100 cursor-pointer"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Duplicate & Delete Actions */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleDuplicateSelectedItem}
                      className="py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center space-x-1.5 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>คัดลอกเพิ่ม</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteSelectedItem}
                      className="py-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 text-xs font-bold flex items-center justify-center space-x-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>ลบชิ้นนี้</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 px-4 space-y-2 text-slate-500">
                  <Edit3 className="w-8 h-8 text-amber-400 mx-auto" />
                  <p className="text-xs font-bold text-slate-700">คลิกที่วัตถุบนผังเพื่อแก้ไขคุณสมบัติ</p>
                  <p className="text-[11px] leading-relaxed">
                    หรือเลือกเครื่องมือด้านบน (โต๊ะ, เวที, บุฟเฟ่ต์, โต๊ะของขวัญ) แล้วคลิกลงในช่องว่างบนผังห้องได้เลย สามารถลากย้ายตำแหน่งได้อย่างอิสระ
                  </p>
                </div>
              )}

              {/* Quick Table Open/Close List for Owner */}
              {allTables.length > 0 && (
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <div className="text-[11px] font-extrabold text-slate-500">
                    จัดการเปิด/ปิดโต๊ะทั้งหมด ({allTables.length} โต๊ะ)
                  </div>
                  <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
                    {allTables.map((t) => {
                      const occ = getTableOccupancyMap(seatingPlan, t.id, regMap);
                      return (
                        <div
                          key={t.id}
                          onClick={() => setSelectedItemId(t.id)}
                          className={`flex items-center justify-between p-2 rounded-xl border text-xs cursor-pointer transition-colors ${
                            selectedItemId === t.id
                              ? "border-amber-400 bg-amber-50/70"
                              : "border-slate-100 bg-slate-50/60 hover:bg-slate-100"
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            <span className="font-black text-slate-800">{t.label}</span>
                            <span className="text-[10px] font-mono text-slate-500">
                              ({occ.size}/{t.capacity || 8})
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              commitPlan((prev) => ({
                                ...prev,
                                items: prev.items.map((it) =>
                                  it.id === t.id ? { ...it, isOpen: it.isOpen === false } : it
                                )
                              }));
                            }}
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold cursor-pointer ${
                              t.isOpen !== false
                                ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                                : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                            }`}
                          >
                            {t.isOpen !== false ? "เปิดอยู่" : "ปิดโต๊ะ"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* RIGHT PANEL: ATTENDEE QUEUE (ยังไม่เลือกโต๊ะ / เลือกโต๊ะแล้ว) */
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col max-h-[760px]">
              {/* Top 2 Tabs: ยังไม่เลือกโต๊ะ vs เลือกโต๊ะแล้ว */}
              <div className="p-2.5 bg-slate-900 grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setRightTab("unassigned");
                    setQueueFilterMode("checked_in");
                  }}
                  className={`py-2 px-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                    rightTab === "unassigned"
                      ? "bg-emerald-500 text-slate-950 shadow-sm"
                      : "text-slate-300 hover:bg-white/10"
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>ยังไม่เลือกโต๊ะ</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-black ${
                      rightTab === "unassigned" ? "bg-slate-950/20 text-slate-950" : "bg-white/10 text-white"
                    }`}
                  >
                    {unassignedList.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRightTab("assigned");
                    setQueueFilterMode("checked_in");
                  }}
                  className={`py-2 px-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                    rightTab === "assigned"
                      ? "bg-amber-500 text-slate-950 shadow-sm"
                      : "text-slate-300 hover:bg-white/10"
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>เลือกโต๊ะแล้ว</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-black ${
                      rightTab === "assigned" ? "bg-slate-950/20 text-slate-950" : "bg-white/10 text-white"
                    }`}
                  >
                    {assignedList.length}
                  </span>
                </button>
              </div>

              {/* Search & Check-in Filter */}
              <div className="p-3 border-b border-slate-100 space-y-2 bg-slate-50/70">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={queueSearch}
                    onChange={(e) => setQueueSearch(e.target.value)}
                    placeholder={
                      rightTab === "unassigned"
                        ? "ค้นหาชื่อ, ชื่อเล่น, เลขบัตร..."
                        : "ค้นหาชื่อ, โต๊ะ A, เก้าอี้ A1..."
                    }
                    className="w-full pl-8 pr-8 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                  />
                  {queueSearch && (
                    <button
                      type="button"
                      onClick={() => setQueueSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Primary Focus: เข้างานแล้ว | Secondary Small Pill: ยังไม่เข้างาน (กรณีพิเศษ) */}
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setQueueFilterMode("checked_in")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center space-x-1.5 transition-all cursor-pointer ${
                      queueFilterMode === "checked_in"
                        ? "bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-500/30"
                        : "bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>เข้างานแล้ว</span>
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-black ${
                        queueFilterMode === "checked_in"
                          ? "bg-white/20 text-white"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {rightTabCounts.checkedIn}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setQueueFilterMode("not_checked_in")}
                    title="กรณีพิเศษ: จองที่นั่งล่วงหน้าชั่วคราวให้เพื่อนที่กำลังมาถึง"
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center space-x-1 transition-all cursor-pointer ${
                      queueFilterMode === "not_checked_in"
                        ? "bg-amber-500 text-slate-950 shadow-xs"
                        : "bg-slate-100 border border-slate-200 text-slate-500 hover:text-amber-800 hover:bg-amber-50 hover:border-amber-200"
                    }`}
                  >
                    <Clock className="w-3 h-3" />
                    <span>ยังไม่เข้างาน ({rightTabCounts.notCheckedIn})</span>
                  </button>
                </div>
              </div>

              {/* Attendee List */}
              <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
                {filteredRightList.length === 0 ? (
                  <div className="text-center py-10 px-4 text-xs text-slate-400 space-y-1.5">
                    <Users className="w-7 h-7 mx-auto text-slate-300" />
                    <p className="font-bold text-slate-500">
                      {rightTab === "unassigned"
                        ? queueFilterMode === "checked_in"
                          ? "ยังไม่มีผู้ที่เข้างานแล้วรอเลือกโต๊ะ"
                          : "ไม่มีรายชื่อที่ยังไม่เข้างานในรายการนี้"
                        : queueFilterMode === "checked_in"
                        ? "ยังไม่มีผู้ที่เข้างานแล้วเลือกโต๊ะในรายการนี้"
                        : "ยังไม่มีผู้ที่จองล่วงหน้าก่อนเข้างาน"}
                    </p>
                    {queueFilterMode === "checked_in" && rightTabCounts.notCheckedIn > 0 && (
                      <p className="text-[10px] text-slate-400">
                        หากต้องการจองล่วงหน้ากรณีพิเศษ กดปุ่ม &ldquo;ยังไม่เข้างาน&rdquo; ด้านบน
                      </p>
                    )}
                  </div>
                ) : (
                  filteredRightList.map((att, idx) => {
                    const isSelected = selectedAttendeeTicketNo === att.ticketNo;
                    const seatInfo = att.seatInfo || attendeeSeatMap.get(att.ticketNo);

                    return (
                      <div
                        key={att.ticketNo}
                        onClick={() => {
                          if (rightTab === "unassigned") {
                            setSelectedAttendeeTicketNo(isSelected ? null : att.ticketNo);
                          } else if (seatInfo) {
                            setHighlightedTableId(seatInfo.tableId);
                            setActiveTableModalId(seatInfo.tableId);
                            setTimeout(() => setHighlightedTableId(null), 2500);
                          }
                        }}
                        className={`p-2.5 rounded-2xl border transition-all cursor-pointer ${
                          isSelected
                            ? "border-emerald-500 bg-emerald-50/80 ring-2 ring-emerald-400/40 shadow-sm"
                            : "border-slate-200/80 bg-white hover:border-emerald-300 hover:bg-slate-50/80"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center space-x-2.5 min-w-0">
                            {/* Order Queue Number */}
                            <span
                              className={`text-[10px] font-mono font-black w-6 text-center shrink-0 ${
                                isSelected ? "text-emerald-700" : "text-slate-400"
                              }`}
                            >
                              #{idx + 1}
                            </span>

                            {/* Photo or Initials */}
                            {att.photoUrl ? (
                              <img
                                src={att.photoUrl}
                                alt={att.name}
                                className="w-9 h-9 rounded-full object-cover ring-2 ring-slate-100 shrink-0"
                              />
                            ) : (
                              <div
                                className={`w-9 h-9 rounded-full ${getAvatarColor(
                                  att.ticketNo
                                )} text-white font-black flex items-center justify-center text-center px-0.5 break-words shrink-0 ${getAvatarTextSizeClass(
                                  getInitials(att.name, att.nickname),
                                  "md"
                                )}`}
                              >
                                {getInitials(att.name, att.nickname)}
                              </div>
                            )}

                            {/* Name & Meta */}
                            <div className="min-w-0">
                              <div className="text-xs font-extrabold text-slate-900 truncate">
                                {att.name}
                                {att.nickname && (
                                  <span className="text-indigo-600 ml-1 font-bold">({att.nickname})</span>
                                )}
                              </div>
                              <div className="flex items-center flex-wrap gap-1 mt-0.5 text-[10px] text-slate-500">
                                <span className="font-mono font-bold text-slate-600">{att.ticketNo}</span>
                                <span>•</span>
                                <span className="truncate">{att.club || "สงสพัท"}</span>
                                {att.checkedIn ? (
                                  <span className="inline-flex items-center space-x-0.5 px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold">
                                    <Clock className="w-2.5 h-2.5" />
                                    <span>{att.checkedInAt || "เข้างานแล้ว"}</span>
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 font-bold">
                                    ⏳ ยังไม่เข้างาน (จองล่วงหน้าได้)
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Right Action / Seat Pill */}
                          {rightTab === "unassigned" ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedAttendeeTicketNo(isSelected ? null : att.ticketNo);
                              }}
                              className={`px-2.5 py-1.5 rounded-xl text-[11px] font-extrabold shrink-0 transition-all cursor-pointer ${
                                isSelected
                                  ? att.checkedIn
                                    ? "bg-emerald-600 text-white shadow-sm"
                                    : "bg-amber-500 text-slate-950 shadow-sm"
                                  : att.checkedIn
                                  ? "bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-700"
                                  : "bg-amber-50 hover:bg-amber-500 hover:text-slate-950 text-amber-800 border border-amber-200"
                              }`}
                            >
                              {isSelected ? "กำลังเลือก..." : att.checkedIn ? "เลือกโต๊ะ" : "จองชั่วคราว"}
                            </button>
                          ) : (
                            seatInfo && (
                              <div className="flex flex-col items-end gap-1 shrink-0">
                                <span
                                  className={`px-2 py-1 rounded-lg border font-black text-[11px] ${
                                    seatInfo.status === "hold"
                                      ? seatInfo.isVipGuest
                                        ? "bg-violet-100 border-violet-400 text-violet-900"
                                        : "bg-amber-100 border-amber-400 text-amber-900"
                                      : "bg-sky-100 border-sky-300 text-sky-900"
                                  }`}
                                >
                                  {seatInfo.status === "hold" ? (seatInfo.isVipGuest ? "👑 " : "⏳ ") : "🪑 "}
                                  {seatInfo.tableLabel} • {seatInfo.seatCode}
                                </span>
                                {seatInfo.status === "hold" && (
                                  <div className="flex flex-col items-end gap-0.5">
                                    <span className="text-[10px] font-mono font-extrabold text-amber-700">
                                      เหลือ {formatCountdownMmSs(seatInfo.remainingMs)} น.
                                    </span>
                                    {seatInfo.bookedByName && (
                                      <span className="text-[9px] font-bold text-slate-500 max-w-[130px] truncate">
                                        ผู้จอง: {seatInfo.bookedByNickname || seatInfo.bookedByName}
                                      </span>
                                    )}
                                    {seatInfo.isVipGuest ? (
                                      <span className="text-[9px] font-black text-violet-700 bg-violet-50 border border-violet-200 px-1.5 py-0.5 rounded">
                                        👑 แขกผู้ใหญ่
                                      </span>
                                    ) : seatInfo.fineAmount > 0 ? (
                                      <span className="text-[9px] font-black text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
                                        สายปรับ {seatInfo.fineAmount}฿
                                      </span>
                                    ) : null}
                                  </div>
                                )}
                                {isOwner ? (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedAttendeeTicketNo(att.ticketNo);
                                      showToast(`เลือก "${att.nickname || att.name}" เพื่อย้ายโต๊ะ (สิทธิ์เจ้าของแอป) — คลิกโต๊ะใหม่บนผังได้เลย`, "indigo");
                                    }}
                                    className="text-[10px] font-bold text-indigo-600 hover:underline cursor-pointer"
                                  >
                                    ย้ายที่นั่ง
                                  </button>
                                ) : seatingPlan?.seatChangeRequests?.[att.ticketNo] ? (
                                  <span className="text-[9px] font-extrabold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                    ⏳ รอเจ้าของอนุมัติเปลี่ยน
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (window.confirm(`ส่งคำขอเปลี่ยนที่นั่งของ "${att.name}" (${seatInfo.seatCode}) ให้เจ้าของแอปอนุมัติใช่หรือไม่?`)) {
                                        handleRequestSeatChange(att, seatInfo);
                                      }
                                    }}
                                    className="text-[10px] font-bold text-slate-500 hover:text-amber-700 hover:underline cursor-pointer"
                                  >
                                    ขอเปลี่ยนที่นั่ง
                                  </button>
                                )}
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ================================================================= */}
      {/* KIOSK / FULLSCREEN GUEST SELF-SELECTION MODE                      */}
      {/* ================================================================= */}
      {isKioskMode && (
        <div className="fixed inset-0 z-[60] bg-slate-100 flex flex-col overflow-hidden">
          {/* Kiosk Top Bar */}
          <div className="bg-slate-950 text-white px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 shadow-lg shrink-0">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
                <Armchair className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black">
                  {selectedAttendee
                    ? `ยินดีต้อนรับคุณ ${selectedAttendee.name}${selectedAttendee.nickname ? ` (${selectedAttendee.nickname})` : ""}`
                    : "แผนผังโต๊ะที่นั่งภายในงาน (เลือกโต๊ะที่ต้องการ)"}
                </h2>
                <p className="text-xs text-slate-300">
                  {selectedAttendee
                    ? "กรุณาแตะเลือกโต๊ะและหมายเลขเก้าอี้ที่ต้องการบนแผนผังด้านล่างได้เลยครับ"
                    : "แตะที่โต๊ะใดก็ได้เพื่อดูรายชื่อเพื่อนร่วมโต๊ะและเลือกเก้าอี้ว่าง"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsKioskMode(false)}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs sm:text-sm font-bold flex items-center space-x-1.5 cursor-pointer"
            >
              <Minimize2 className="w-4 h-4" />
              <span>กลับสู่หน้าแอดมิน</span>
            </button>
          </div>

          {/* Kiosk Success Celebration Overlay */}
          {kioskSuccessBanner && (
            <div className="fixed inset-0 z-[80] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
              <div
                className={`bg-white rounded-3xl p-8 max-w-md w-full text-center space-y-4 shadow-2xl border-4 ${
                  kioskSuccessBanner.isHold ? "border-amber-400" : "border-emerald-400"
                }`}
              >
                <div
                  className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${
                    kioskSuccessBanner.isHold
                      ? "bg-amber-100 text-amber-600"
                      : "bg-emerald-100 text-emerald-600"
                  }`}
                >
                  {kioskSuccessBanner.isHold ? <Clock className="w-10 h-10" /> : <CheckCircle2 className="w-10 h-10" />}
                </div>
                <div className="space-y-1">
                  <p
                    className={`text-xs font-extrabold uppercase tracking-wider ${
                      kioskSuccessBanner.isHold ? "text-amber-600" : "text-emerald-600"
                    }`}
                  >
                    {kioskSuccessBanner.isHold
                      ? `จองล่วงหน้าชั่วคราว ${kioskSuccessBanner.holdMins} นาที`
                      : "จองที่นั่งสำเร็จเรียบร้อย!"}
                  </p>
                  <h3 className="text-2xl font-black text-slate-900">
                    {kioskSuccessBanner.attendee.name}
                  </h3>
                  {kioskSuccessBanner.attendee.nickname && (
                    <p className="text-base font-bold text-indigo-600">
                      ({kioskSuccessBanner.attendee.nickname})
                    </p>
                  )}
                </div>
                <div
                  className={`py-4 px-6 rounded-2xl text-white shadow-lg ${
                    kioskSuccessBanner.isHold
                      ? "bg-gradient-to-r from-amber-500 to-orange-500"
                      : "bg-gradient-to-r from-emerald-500 to-teal-600"
                  }`}
                >
                  <div className="text-xs opacity-90 font-bold">ตำแหน่งที่นั่งของคุณ</div>
                  <div className="text-3xl font-black mt-1">
                    {kioskSuccessBanner.tableLabel} • เก้าอี้ {kioskSuccessBanner.seatCode}
                  </div>
                </div>
                {kioskSuccessBanner.isHold && (
                  <p className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-2.5">
                    ⏳ กรุณามาลงทะเบียนเข้างานภายใน {kioskSuccessBanner.holdMins} นาที มิฉะนั้นเก้าอี้จะหลุดเป็นว่างอัตโนมัติ
                  </p>
                )}
                <p className="text-xs text-slate-400">กำลังกลับสู่หน้าลงทะเบียนอัตโนมัติ...</p>
              </div>
            </div>
          )}

          {/* Kiosk Full-Width Floor Plan */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-6">
            <div className="max-w-7xl mx-auto">
              {renderFloorPlanCanvas(true)}
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* SEAT PICKER MODAL (A1..A8)                                        */}
      {/* ================================================================= */}
      {renderSeatPickerModal()}

      {/* ================================================================= */}
      {/* TABLE SUMMARY & PRINT DIRECTORY MODAL                             */}
      {/* ================================================================= */}
      {isSummaryModalOpen && (
        <div
          className="fixed inset-0 z-[70] bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6"
          onClick={() => setIsSummaryModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-5xl max-h-[88vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base sm:text-lg font-black flex items-center space-x-2">
                  <ListChecks className="w-5 h-5 text-emerald-400" />
                  <span>สรุปรายชื่อผู้เข้าร่วมงานแยกตามโต๊ะ</span>
                </h3>
                <p className="text-xs text-slate-300">
                  จองแล้วทั้งหมด {stats.bookedCount} / {stats.openCapacity} ที่นั่ง ({stats.openTables} โต๊ะที่เปิด)
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handlePrintTableDirectory}
                  className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold flex items-center space-x-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>พิมพ์รายชื่อทุกโต๊ะ</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsSummaryModalOpen(false)}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50">
              {allTables.length === 0 ? (
                <div className="col-span-full text-center py-12 text-slate-400 text-sm">
                  ยังไม่มีโต๊ะในผังห้อง
                </div>
              ) : (
                allTables.map((t) => {
                  const cap = Number(t.capacity) || 8;
                  const occMap = getTableOccupancyMap(seatingPlan, t.id, regMap, nowMs);
                  return (
                    <div
                      key={t.id}
                      className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
                    >
                      <div className="px-4 py-2.5 bg-slate-900 text-white flex items-center justify-between">
                        <span className="font-black text-sm">{t.label}</span>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/15">
                          {t.isOpen === false ? "ปิดโต๊ะ" : `${occMap.size}/${cap} ท่าน`}
                        </span>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {Array.from({ length: cap }, (_, i) => {
                          const seatNo = i + 1;
                          const occ = occMap.get(seatNo);
                          const seatCode = getSeatCode(t, seatNo);
                          return (
                            <div
                              key={seatNo}
                              className="px-3.5 py-2 flex items-center justify-between text-xs"
                            >
                              <div className="flex items-center space-x-2.5 min-w-0">
                                <span className="font-mono font-black text-[11px] w-8 text-slate-500">
                                  {seatCode}
                                </span>
                                {occ?.attendee ? (
                                  <div className="flex items-center space-x-2 min-w-0">
                                    {occ.attendee.photoUrl ? (
                                      <img
                                        src={occ.attendee.photoUrl}
                                        alt={occ.attendee.name}
                                        className="w-6 h-6 rounded-full object-cover shrink-0"
                                      />
                                    ) : (
                                      <div
                                        className={`w-6 h-6 rounded-full ${getAvatarColor(occ.attendee.ticketNo)} text-white font-bold flex items-center justify-center text-center px-0.5 break-words shrink-0 ${getAvatarTextSizeClass(
                                          getInitials(occ.attendee.name, occ.attendee.nickname),
                                          "xs"
                                        )}`}
                                      >
                                        {getInitials(occ.attendee.name, occ.attendee.nickname)}
                                      </div>
                                    )}
                                    <span className="font-bold text-slate-900 truncate">
                                      {occ.attendee.name}
                                      {occ.attendee.nickname ? ` (${occ.attendee.nickname})` : ""}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-slate-400 italic">- ว่าง -</span>
                                )}
                              </div>
                              {occ?.attendee && (
                                <span className="font-mono text-[10px] text-slate-400 shrink-0 ml-2">
                                  {occ.attendee.ticketNo}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* OWNER: ADD NEW CUSTOM TABLE / ZONE TYPE MODAL                     */}
      {/* ================================================================= */}
      {isOwner && isAddTypeModalOpen && (
        <div
          className="fixed inset-0 z-[75] bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
          onClick={() => setIsAddTypeModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 bg-gradient-to-r from-violet-900 via-indigo-900 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center text-lg">
                  {newTypeEmoji}
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black">เพิ่มรูปแบบโต๊ะ / โซนใหม่</h3>
                  <p className="text-[11px] text-violet-200">
                    เช่น โต๊ะโชว์สินค้า, บูธสปอนเซอร์, ซุ้มถ่ายรูป หรือโต๊ะ VIP
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddTypeModalOpen(false)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddPaletteType} className="p-5 space-y-4">
              {/* Quick Presets */}
              <div>
                <div className="text-[11px] font-extrabold text-slate-500 mb-1.5">
                  เลือกจากตัวอย่างยอดนิยม (กดเติมอัตโนมัติ):
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {CUSTOM_ITEM_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setNewTypeLabel(preset.label);
                        setNewTypeEmoji(preset.emoji);
                        setNewTypeColor(preset.colorTheme);
                        setNewTypeIsBookable(Boolean(preset.isBookable));
                        setNewTypeW(preset.defaultW);
                        setNewTypeH(preset.defaultH);
                        if (preset.defaultCapacity) setNewTypeCapacity(preset.defaultCapacity);
                      }}
                      className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-violet-100 border border-slate-200 hover:border-violet-300 text-xs font-bold text-slate-700 hover:text-violet-900 flex items-center space-x-1 cursor-pointer transition-colors"
                    >
                      <span>{preset.emoji}</span>
                      <span>{preset.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Name Input */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  ชื่อรูปแบบที่ต้องการเพิ่ม *
                </label>
                <input
                  type="text"
                  required
                  value={newTypeLabel}
                  onChange={(e) => setNewTypeLabel(e.target.value)}
                  placeholder="เช่น โต๊ะโชว์สินค้า, โต๊ะลงทะเบียน VIP, ซุ้มถ่ายรูป..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-violet-500"
                />
              </div>

              {/* Type Mode: Display/Zone vs Bookable Seating Table */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                  ลักษณะการใช้งาน
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNewTypeIsBookable(false);
                      setNewTypeW(2);
                      setNewTypeH(1);
                    }}
                    className={`p-2.5 rounded-xl border-2 text-left transition-all cursor-pointer ${
                      !newTypeIsBookable
                        ? "border-violet-500 bg-violet-50 text-violet-950"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <div className="text-xs font-black">🛍️ โต๊ะวางของ / โซนตกแต่ง</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      วางบอกตำแหน่ง เช่น โต๊ะโชว์สินค้า บูธ ซุ้มถ่ายรูป
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNewTypeIsBookable(true);
                      setNewTypeW(2);
                      setNewTypeH(2);
                    }}
                    className={`p-2.5 rounded-xl border-2 text-left transition-all cursor-pointer ${
                      newTypeIsBookable
                        ? "border-emerald-500 bg-emerald-50 text-emerald-950"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <div className="text-xs font-black">🪑 โต๊ะนั่งแขก (จองเก้าอี้ได้)</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      กดเข้าไปเลือกเก้าอี้รายตัวได้ เช่น โต๊ะ VIP
                    </div>
                  </button>
                </div>
              </div>

              {/* Emoji & Color Pickers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">สัญลักษณ์</label>
                  <div className="flex flex-wrap gap-1 p-2 rounded-xl bg-slate-50 border border-slate-200">
                    {CUSTOM_EMOJIS.map((em) => (
                      <button
                        key={em}
                        type="button"
                        onClick={() => setNewTypeEmoji(em)}
                        className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center cursor-pointer border ${
                          newTypeEmoji === em
                            ? "bg-violet-100 border-violet-500 scale-110"
                            : "bg-white border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">โทนสีบนผัง</label>
                    <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-slate-50 border border-slate-200">
                      {Object.values(CUSTOM_COLOR_THEMES).map((th) => (
                        <button
                          key={th.id}
                          type="button"
                          onClick={() => setNewTypeColor(th.id)}
                          title={th.name}
                          className={`w-6 h-6 rounded-full ${th.swatch} cursor-pointer transition-transform ${
                            newTypeColor === th.id
                              ? "ring-2 ring-offset-2 ring-slate-900 scale-110"
                              : "opacity-80 hover:opacity-100"
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Size W x H & Optional Seats */}
                  <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                    <span className="font-bold text-slate-600">ขนาดเริ่มต้น:</span>
                    <div className="flex items-center space-x-1">
                      <select
                        value={newTypeW}
                        onChange={(e) => setNewTypeW(Number(e.target.value))}
                        className="px-1.5 py-1 rounded-lg bg-white border border-slate-200 font-mono font-bold text-xs"
                      >
                        {[1, 2, 3, 4, 5, 6].map((n) => (
                          <option key={n} value={n}>กว้าง {n}</option>
                        ))}
                      </select>
                      <span className="text-slate-400">×</span>
                      <select
                        value={newTypeH}
                        onChange={(e) => setNewTypeH(Number(e.target.value))}
                        className="px-1.5 py-1 rounded-lg bg-white border border-slate-200 font-mono font-bold text-xs"
                      >
                        {[1, 2, 3, 4, 5, 6].map((n) => (
                          <option key={n} value={n}>ลึก {n}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {newTypeIsBookable && (
                    <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-xs">
                      <span className="font-bold text-emerald-800">จำนวนที่นั่งเริ่มต้น:</span>
                      <select
                        value={newTypeCapacity}
                        onChange={(e) => setNewTypeCapacity(Number(e.target.value))}
                        className="px-2 py-1 rounded-lg bg-white border border-emerald-200 font-mono font-bold text-xs"
                      >
                        {[4, 6, 8, 10, 12, 16].map((n) => (
                          <option key={n} value={n}>{n} คน</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Actions */}
              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddTypeModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-extrabold shadow-md flex items-center space-x-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>เพิ่มรูปแบบนี้ลงแถบเครื่องมือ</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* ADVANCE HOLD BOOKING MODAL (Step 1: Booker -> Step 2: Owner -> Step 3: Tier) */}
      {/* ================================================================= */}
      {advanceHoldTarget && (() => {
        const targetSeatCode = getSeatCode(advanceHoldTarget.table, advanceHoldTarget.seatNo);
        const selectedBooker = holdBookerTicketNo ? regMap.get(holdBookerTicketNo) : null;
        const selectedOwnerGuest = holdOwnerTicketNo ? regMap.get(holdOwnerTicketNo) : null;
        const selectedTier = getHoldTierOption(holdTierMinutes);

        const bookerQ = holdBookerSearch.trim().toLowerCase();
        const bookerCandidates = sortedRegistrations
          .filter((r) => {
            if (!bookerQ) return true;
            return (
              r.name?.toLowerCase().includes(bookerQ) ||
              r.nickname?.toLowerCase().includes(bookerQ) ||
              r.ticketNo?.toLowerCase().includes(bookerQ) ||
              r.phone?.includes(bookerQ) ||
              r.club?.toLowerCase().includes(bookerQ)
            );
          })
          .slice(0, 30);

        const ownerQ = holdOwnerSearch.trim().toLowerCase();
        const ownerCandidates = unassignedList
          .filter((r) => !r.checkedIn)
          .filter((r) => {
            if (!ownerQ) return true;
            return (
              r.name?.toLowerCase().includes(ownerQ) ||
              r.nickname?.toLowerCase().includes(ownerQ) ||
              r.ticketNo?.toLowerCase().includes(ownerQ) ||
              r.phone?.includes(ownerQ) ||
              r.club?.toLowerCase().includes(ownerQ)
            );
          })
          .slice(0, 30);

        const canSubmitHold =
          Boolean(selectedBooker) &&
          Boolean(selectedOwnerGuest) &&
          (!selectedTier.requiresOwnerPin || vipPinInput.trim().length > 0);

        return (
          <div
            className="fixed inset-0 z-[85] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-4"
            onClick={() => setAdvanceHoldTarget(null)}
          >
            <div
              className="bg-white rounded-3xl border border-amber-200 shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="px-5 py-4 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white flex items-center justify-between shrink-0">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black leading-tight">
                      จองเก้าอี้ล่วงหน้าให้เพื่อนที่ยังไม่เข้างาน
                    </h3>
                    <p className="text-xs text-amber-100 font-bold mt-0.5">
                      ตำแหน่งที่นั่ง: {advanceHoldTarget.table.label} • เก้าอี้ {targetSeatCode}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAdvanceHoldTarget(null)}
                  className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleSubmitAdvanceHold} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                {/* STEP 1: SELECT BOOKER (MANDATORY FIRST) */}
                <div
                  className={`rounded-2xl border-2 p-3.5 space-y-2.5 transition-all ${
                    selectedBooker
                      ? "border-emerald-300 bg-emerald-50/40"
                      : "border-amber-400 bg-amber-50/50 ring-2 ring-amber-300/40"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`w-6 h-6 rounded-full text-xs font-black flex items-center justify-center ${
                          selectedBooker ? "bg-emerald-600 text-white" : "bg-amber-500 text-slate-950"
                        }`}
                      >
                        1
                      </span>
                      <div>
                        <div className="text-xs sm:text-sm font-black text-slate-900">
                          เลือก &ldquo;ผู้จอง&rdquo; ก่อน (จำเป็น)
                        </div>
                        <div className="text-[10px] text-slate-500">
                          เลือกได้ทั้งคนที่เข้างานแล้ว หรือยังไม่เข้างานก็ได้ (บันทึกไว้แจ้งเตือนตอนมาสาย)
                        </div>
                      </div>
                    </div>
                    {selectedBooker && (
                      <button
                        type="button"
                        onClick={() => {
                          setHoldBookerTicketNo("");
                          setHoldBookerSearch("");
                        }}
                        className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-[11px] font-bold text-slate-600 cursor-pointer shrink-0"
                      >
                        เปลี่ยนผู้จอง
                      </button>
                    )}
                  </div>

                  {selectedBooker ? (
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-emerald-200">
                      <div className="flex items-center space-x-2.5 min-w-0">
                        {selectedBooker.photoUrl ? (
                          <img
                            src={selectedBooker.photoUrl}
                            alt={selectedBooker.name}
                            className="w-9 h-9 rounded-full object-cover ring-2 ring-emerald-200 shrink-0"
                          />
                        ) : (
                          <div
                            className={`w-9 h-9 rounded-full ${getAvatarColor(selectedBooker.ticketNo)} text-white font-black flex items-center justify-center text-center px-0.5 break-words shrink-0 ${getAvatarTextSizeClass(
                              getInitials(selectedBooker.name, selectedBooker.nickname),
                              "md"
                            )}`}
                          >
                            {getInitials(selectedBooker.name, selectedBooker.nickname)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="text-xs font-black text-slate-900 truncate">
                            {selectedBooker.name}
                            {selectedBooker.nickname && (
                              <span className="text-indigo-600 ml-1">({selectedBooker.nickname})</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-0.5">
                            <span className="font-mono font-bold">{selectedBooker.ticketNo}</span>
                            <span
                              className={`px-1.5 py-0.5 rounded-full font-bold ${
                                selectedBooker.checkedIn
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {selectedBooker.checkedIn ? "✓ เข้างานแล้ว" : "ยังไม่เข้างาน"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={holdBookerSearch}
                          onChange={(e) => setHoldBookerSearch(e.target.value)}
                          placeholder="ค้นหาชื่อ, ชื่อเล่น, เลขบัตร หรือเบอร์โทร ผู้จอง..."
                          className="w-full pl-8 pr-3 py-2 rounded-xl bg-white border border-amber-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <div className="max-h-36 overflow-y-auto space-y-1 bg-white rounded-xl border border-slate-200 p-1.5">
                        {bookerCandidates.length === 0 ? (
                          <div className="text-center py-4 text-[11px] text-slate-400">
                            ไม่พบรายชื่อผู้จองที่ค้นหา
                          </div>
                        ) : (
                          bookerCandidates.map((r) => (
                            <button
                              key={r.ticketNo}
                              type="button"
                              onClick={() => setHoldBookerTicketNo(r.ticketNo)}
                              className="w-full px-2.5 py-2 rounded-lg hover:bg-amber-50 flex items-center justify-between text-left transition-colors cursor-pointer"
                            >
                              <div className="min-w-0 pr-2">
                                <div className="text-xs font-extrabold text-slate-900 truncate">
                                  {r.name}
                                  {r.nickname ? ` (${r.nickname})` : ""}
                                </div>
                                <div className="text-[10px] text-slate-500 font-mono">
                                  {r.ticketNo} • {r.club || "สงสพัท"}
                                </div>
                              </div>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                                  r.checkedIn
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                {r.checkedIn ? "เข้างานแล้ว" : "ยังไม่เข้างาน"}
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* STEP 2: SELECT SEAT OWNER (UNLOCKS AFTER BOOKER IS CHOSEN) */}
                <div
                  className={`rounded-2xl border-2 p-3.5 space-y-2.5 transition-all ${
                    !selectedBooker
                      ? "border-slate-200 bg-slate-50/70 opacity-60 pointer-events-none"
                      : selectedOwnerGuest
                      ? "border-emerald-300 bg-emerald-50/40"
                      : "border-amber-400 bg-amber-50/50 ring-2 ring-amber-300/40"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`w-6 h-6 rounded-full text-xs font-black flex items-center justify-center ${
                          !selectedBooker
                            ? "bg-slate-300 text-slate-600"
                            : selectedOwnerGuest
                            ? "bg-emerald-600 text-white"
                            : "bg-amber-500 text-slate-950"
                        }`}
                      >
                        2
                      </span>
                      <div>
                        <div className="text-xs sm:text-sm font-black text-slate-900">
                          เลือก &ldquo;เจ้าของเก้าอี้&rdquo; (ผู้ที่ยังไม่เข้างาน)
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {!selectedBooker
                            ? "กรุณาเลือกผู้จองในขั้นตอนที่ 1 ก่อน จึงจะเลือกเจ้าของเก้าอี้ได้"
                            : "เลือกชื่อเพื่อนที่ยังไม่ลงทะเบียนเข้างานและยังไม่มีโต๊ะ"}
                        </div>
                      </div>
                    </div>
                    {selectedBooker && selectedOwnerGuest && (
                      <button
                        type="button"
                        onClick={() => {
                          setHoldOwnerTicketNo("");
                          setHoldOwnerSearch("");
                        }}
                        className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-[11px] font-bold text-slate-600 cursor-pointer shrink-0"
                      >
                        เปลี่ยนเจ้าของเก้าอี้
                      </button>
                    )}
                  </div>

                  {selectedOwnerGuest ? (
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-emerald-200">
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-full ${getAvatarColor(selectedOwnerGuest.ticketNo)} text-white font-black flex items-center justify-center text-center px-0.5 break-words shrink-0 ${getAvatarTextSizeClass(
                            getInitials(selectedOwnerGuest.name, selectedOwnerGuest.nickname),
                            "md"
                          )}`}
                        >
                          {getInitials(selectedOwnerGuest.name, selectedOwnerGuest.nickname)}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-black text-slate-900 truncate">
                            {selectedOwnerGuest.name}
                            {selectedOwnerGuest.nickname && (
                              <span className="text-indigo-600 ml-1">({selectedOwnerGuest.nickname})</span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            {selectedOwnerGuest.ticketNo} • ยังไม่ลงทะเบียนเข้างาน
                          </div>
                        </div>
                      </div>
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          disabled={!selectedBooker}
                          value={holdOwnerSearch}
                          onChange={(e) => setHoldOwnerSearch(e.target.value)}
                          placeholder="ค้นหาชื่อเพื่อนที่ยังไม่เข้างาน..."
                          className="w-full pl-8 pr-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <div className="max-h-36 overflow-y-auto space-y-1 bg-white rounded-xl border border-slate-200 p-1.5">
                        {ownerCandidates.length === 0 ? (
                          <div className="text-center py-4 text-[11px] text-slate-400">
                            ไม่มีรายชื่อที่ยังไม่เข้างานและยังว่างอยู่
                          </div>
                        ) : (
                          ownerCandidates.map((r) => (
                            <button
                              key={r.ticketNo}
                              type="button"
                              onClick={() => setHoldOwnerTicketNo(r.ticketNo)}
                              className="w-full px-2.5 py-2 rounded-lg hover:bg-amber-50 flex items-center justify-between text-left transition-colors cursor-pointer"
                            >
                              <div className="min-w-0 pr-2">
                                <div className="text-xs font-extrabold text-slate-900 truncate">
                                  {r.name}
                                  {r.nickname ? ` (${r.nickname})` : ""}
                                </div>
                                <div className="text-[10px] text-slate-500 font-mono">
                                  {r.ticketNo} • {r.club || "สงสพัท"}
                                </div>
                              </div>
                              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold shrink-0">
                                เลือกคนนี้
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* STEP 3: CHOOSE EXPECTED ARRIVAL DURATION & FINE POLICY */}
                <div
                  className={`rounded-2xl border-2 p-3.5 space-y-3 transition-all ${
                    !selectedBooker || !selectedOwnerGuest
                      ? "border-slate-200 bg-slate-50/70 opacity-60 pointer-events-none"
                      : "border-indigo-200 bg-indigo-50/30"
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span
                      className={`w-6 h-6 rounded-full text-xs font-black flex items-center justify-center ${
                        !selectedBooker || !selectedOwnerGuest
                          ? "bg-slate-300 text-slate-600"
                          : "bg-indigo-600 text-white"
                      }`}
                    >
                      3
                    </span>
                    <div>
                      <div className="text-xs sm:text-sm font-black text-slate-900">
                        ระบุเวลาที่จะมาถึง (และเงื่อนไขค่าปรับหากมาไม่ทัน)
                      </div>
                      <div className="text-[10px] text-slate-500">
                        หากเลยเวลาที่จอง เก้าอี้จะหลุดเป็นว่างอัตโนมัติ และแจ้งเตือนค่าปรับตอนลงทะเบียนเข้างาน
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {HOLD_TIER_OPTIONS.map((tier) => {
                      const active = holdTierMinutes === tier.minutes;
                      return (
                        <button
                          key={tier.minutes}
                          type="button"
                          onClick={() => {
                            setHoldTierMinutes(tier.minutes);
                            setVipPinError("");
                          }}
                          className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                            active
                              ? tier.isVip
                                ? "border-violet-500 bg-violet-50 ring-2 ring-violet-300/50 shadow-sm"
                                : tier.fineAmount > 0
                                ? "border-rose-500 bg-rose-50 ring-2 ring-rose-300/50 shadow-sm"
                                : "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-300/50 shadow-sm"
                              : "border-slate-200 bg-white hover:border-slate-300"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs sm:text-sm font-black text-slate-900 flex items-center space-x-1">
                              {tier.isVip && <Crown className="w-3.5 h-3.5 text-violet-600 shrink-0" />}
                              <span>{tier.label}</span>
                            </span>
                            {active && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                          </div>
                          <div
                            className={`text-[11px] font-extrabold mt-1 ${
                              tier.isVip
                                ? "text-violet-700"
                                : tier.fineAmount > 0
                                ? "text-rose-600"
                                : "text-emerald-700"
                            }`}
                          >
                            {tier.isVip
                              ? "ฟรี • ต้องใช้รหัสเจ้าของแอป"
                              : tier.fineAmount > 0
                              ? `มาไม่ทัน ปรับ ${tier.fineAmount} บาท`
                              : "ฟรี (ไม่มีค่าปรับ)"}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Owner PIN Input for VIP 120-min tier */}
                  {selectedTier.requiresOwnerPin && (
                    <div className="p-3 rounded-2xl bg-violet-50 border border-violet-200 space-y-2">
                      <label className="flex items-center space-x-1.5 text-xs font-black text-violet-900">
                        <KeyRound className="w-4 h-4 text-violet-600" />
                        <span>กรอกรหัสเจ้าของแอปเพื่อยืนยันสิทธิ์ &ldquo;แขกผู้ใหญ่&rdquo; *</span>
                      </label>
                      <input
                        type="password"
                        inputMode="numeric"
                        value={vipPinInput}
                        onChange={(e) => {
                          setVipPinInput(e.target.value);
                          setVipPinError("");
                        }}
                        placeholder="กรอกเบอร์โทรศัพท์เจ้าของแอป..."
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-violet-300 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-violet-600"
                      />
                      {vipPinError && (
                        <div className="text-[11px] font-bold text-rose-600 flex items-center space-x-1">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>{vipPinError}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setAdvanceHoldTarget(null)}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={!canSubmitHold}
                    className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black shadow-md flex items-center space-x-1.5 transition-all ${
                      canSubmitHold
                        ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 cursor-pointer"
                        : "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>ยืนยันจองเก้าอี้ล่วงหน้า ({selectedTier.minutes} นาที)</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* ================================================================= */}
      {/* FINE HISTORY & PROOF LEDGER MODAL                                 */}
      {/* ================================================================= */}
      {isFineLedgerOpen && (() => {
        const fines = Object.values(seatingPlan?.expiredHoldFines || {}).sort(
          (a, b) => new Date(b.expiredAt || 0).getTime() - new Date(a.expiredAt || 0).getTime()
        );
        const paidFines = fines.filter((f) => f.status === "paid");
        const unpaidFines = fines.filter((f) => f.status !== "paid");
        const totalCollected = paidFines.reduce((sum, f) => sum + (Number(f.fineAmount) || 0), 0);
        const totalPending = unpaidFines.reduce((sum, f) => sum + (Number(f.fineAmount) || 0), 0);

        return (
          <div
            className="fixed inset-0 z-[85] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6"
            onClick={() => setIsFineLedgerOpen(false)}
          >
            <div
              className="bg-white rounded-3xl border border-rose-200 shadow-2xl w-full max-w-3xl max-h-[88vh] flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-5 py-4 bg-gradient-to-r from-rose-700 to-red-700 text-white flex items-center justify-between">
                <div>
                  <h3 className="text-base sm:text-lg font-black flex items-center space-x-2">
                    <Banknote className="w-5 h-5 text-amber-300" />
                    <span>รายการค่าปรับจองล่วงหน้ามาสาย ({fines.length} รายการ)</span>
                  </h3>
                  <p className="text-xs text-rose-100 mt-0.5">
                    ชำระแล้ว {paidFines.length} รายการ (รวม {totalCollected.toLocaleString()} บาท) • ค้างชำระ {unpaidFines.length} รายการ ({totalPending.toLocaleString()} บาท)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsFineLedgerOpen(false)}
                  className="p-2 rounded-xl bg-white/15 hover:bg-white/25 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2.5 bg-slate-50">
                {fines.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-sm">
                    ยังไม่มีรายการค่าปรับมาสาย
                  </div>
                ) : (
                  fines.map((fine) => {
                    const guest = regMap.get(fine.ticketNo);
                    const isPaid = fine.status === "paid";
                    return (
                      <div
                        key={fine.ticketNo}
                        className={`p-3.5 rounded-2xl border bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          isPaid ? "border-emerald-200" : "border-rose-200"
                        }`}
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center flex-wrap gap-2">
                            <span className="text-sm font-black text-slate-900">
                              {guest ? `${guest.name}${guest.nickname ? ` (${guest.nickname})` : ""}` : fine.ticketNo}
                            </span>
                            <span className="text-[11px] font-mono text-slate-500">{fine.ticketNo}</span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                isPaid
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-rose-100 text-rose-700"
                              }`}
                            >
                              {isPaid
                                ? `✅ ชำระแล้ว (${fine.paymentMethod === "cash" ? "เงินสด" : "สลิป QR"})`
                                : "⏳ ค้างชำระตอนเข้างาน"}
                            </span>
                          </div>
                          <div className="text-xs text-slate-600 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            <span>
                              เก้าอี้เดิม: <strong>{fine.tableLabel} • {fine.seatCode}</strong>
                            </span>
                            <span>•</span>
                            <span>
                              จองล่วงหน้า <strong>{fine.holdDurationMinutes} นาที</strong>
                            </span>
                            <span>•</span>
                            <span className="text-rose-700 font-black">
                              ปรับ {fine.fineAmount} บาท
                            </span>
                          </div>
                          {fine.bookedByName && (
                            <div className="text-[11px] text-amber-800 font-bold">
                              ผู้จองให้: {fine.bookedByName}
                              {fine.bookedByNickname ? ` (${fine.bookedByNickname})` : ""}
                            </div>
                          )}
                        </div>

                        {fine.proofPhotoUrl && (
                          <button
                            type="button"
                            onClick={() => setViewingProofUrl(fine.proofPhotoUrl)}
                            className="flex items-center space-x-2 p-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 shrink-0 cursor-pointer"
                          >
                            <img
                              src={fine.proofPhotoUrl}
                              alt="หลักฐานชำระค่าปรับ"
                              className="w-12 h-12 rounded-lg object-cover border border-emerald-200"
                            />
                            <span className="text-[11px] font-extrabold text-emerald-800 pr-1.5">
                              ดูรูปหลักฐาน
                            </span>
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Proof Photo Lightbox */}
      {viewingProofUrl && (
        <div
          className="fixed inset-0 z-[95] bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setViewingProofUrl(null)}
        >
          <div className="relative max-w-2xl w-full flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setViewingProofUrl(null)}
              className="self-end mb-2 px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold flex items-center space-x-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span>ปิดรูป</span>
            </button>
            <img
              src={viewingProofUrl}
              alt="หลักฐานการชำระค่าปรับ"
              className="max-h-[80vh] max-w-full rounded-2xl shadow-2xl border-2 border-white/20 object-contain"
            />
          </div>
        </div>
      )}
    </main>
  );
}
