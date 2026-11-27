import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  Camera, 
  Search, 
  Filter,
  CheckCircle2, 
  X, 
  Plus, 
  Gift, 
  Dices, 
  Trophy, 
  Sparkles, 
  Users, 
  Clock, 
  RefreshCw, 
  Settings, 
  Globe, 
  ArrowLeft, 
  Phone, 
  Mail, 
  ShieldCheck, 
  Volume2, 
  VolumeX, 
  Shirt, 
  AlertTriangle, 
  Check, 
  Trash2, 
  ChevronRight,
  ExternalLink,
  Award,
  Flame,
  ListOrdered,
  RotateCcw,
  Undo2,
  Printer,
  Medal,
  Crown,
  Image as ImageIcon,
  Copy,
  CheckCheck,
  UserCheck,
  Download,
  Eye,
  FileImage,
  Calendar,
  Lock,
  Unlock,
  Star,
  MessageSquare,
  Heart,
  Building2,
  UtensilsCrossed,
  PartyPopper,
  Sliders,
  ChevronUp,
  ChevronDown,
  Layers,
  Armchair
} from "lucide-react";
import confetti from "canvas-confetti";
import QRCode from "qrcode";
import TicketScannerModal from "./TicketScannerModal";
import AttendeePhotoModal from "./AttendeePhotoModal";
import ShirtPresentationModal from "./ShirtPresentationModal";
import ContestJudgeModal from "./ContestJudgeModal";
import StoragePurgeModal from "./StoragePurgeModal";
import ResetRegistrationsModal from "./ResetRegistrationsModal";
import ClearSecurityModal from "./ClearSecurityModal";
import AttendeeInspectionModal from "./AttendeeInspectionModal";
import AdminSurveyManagerModal from "./AdminSurveyManagerModal";
import SatisfactionSurveyModal from "./SatisfactionSurveyModal";
import TableSeatingHub from "./TableSeatingHub";
import LateHoldFineModal from "./LateHoldFineModal";
import { defaultSurveyConfig } from "../data/smeFanData";
import {
  formatThaiDisplayDateTime,
  isSupabaseConfigured,
  fetchSeatingPlanFromCloud,
  saveSeatingPlanToCloud,
  subscribeToSeatingPlan
} from "../utils/supabaseClient";
import {
  SEATING_STORAGE_KEY,
  createDefaultSeatingPlan,
  buildAttendeeSeatMap,
  getTableOccupancyMap,
  getSeatingStats,
  getSeatCode,
  hasAnyHolds,
  formatCountdownMmSs,
  getUnpaidFineForTicket,
  getTicketFineRecords
} from "../utils/seatingPlanHelper";
import { cleanPhoneNumber } from "../utils/phoneFormatter";
import { bgAudio } from "../utils/backgroundAudio";

// Shared singleton AudioContext to prevent lag, browser context exhaustion, and latency
let sharedAudioCtx = null;
const getSharedAudioContext = () => {
  if (typeof window === "undefined") return null;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!sharedAudioCtx || sharedAudioCtx.state === "closed") {
    sharedAudioCtx = new AudioContextClass();
  }
  if (sharedAudioCtx.state === "suspended") {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
};

const CONTEST_TEAMS_STORAGE_KEY = "sme_fan_contest_teams_v2";
const CONTEST_VOTES_STORAGE_KEY = "sme_fan_contest_all_votes_v2";

export default function EventCheckInHub({
  eventConfig,
  setEventConfig,
  currentUser,
  registrations = [],
  sponsors = [],
  onCheckIn,
  onRegisterGift,
  onRemoveGift,
  onUpdateAttendeePhoto,
  onToggleShirtReceived,
  onBackToPortal,
  onGoToSettings,
  onSwitchToPublicForm,
  onPurgeComplete,
  onForceSyncCloud,
  onResetAllRegistrations,
  onViewTicket,
  onUpdateRegistration,
  lastCloudSync,
  seatingPlan: seatingPlanProp,
  onUpdateSeatingPlan: onUpdateSeatingPlanProp
}) {
  // Main Tab: "checkin" | "seating" | "gifts" | "shirts" | "contest" | "lucky_draw" | "survey"
  const [activeMainTab, setActiveMainTab] = useState("checkin");

  // ==========================================================
  // SEATING PLAN STATE (Controlled from App.jsx with safe fallback)
  // ==========================================================
  const [fallbackSeatingPlan, setFallbackSeatingPlan] = useState(() => {
    try {
      const saved = localStorage.getItem(SEATING_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.items)) return parsed;
      }
    } catch (e) {}
    return createDefaultSeatingPlan();
  });

  const seatingPlan = seatingPlanProp || fallbackSeatingPlan;
  const handleUpdateSeatingPlan = onUpdateSeatingPlanProp || ((updater) => {
    setFallbackSeatingPlan((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      try {
        localStorage.setItem(SEATING_STORAGE_KEY, JSON.stringify(next));
      } catch (e) {}
      if (isSupabaseConfigured() && currentUser && ["owner", "manager", "admin"].includes(currentUser.role)) {
        saveSeatingPlanToCloud(next).catch(() => {});
      }
      return next;
    });
  });

  // Live 1-second ticker when active temporary seat holds exist
  const [seatingNowMs, setSeatingNowMs] = useState(() => Date.now());
  const seatingHasHolds = useMemo(() => hasAnyHolds(seatingPlan), [seatingPlan]);
  useEffect(() => {
    setSeatingNowMs(Date.now());
    if (!seatingHasHolds) return;
    const t = setInterval(() => setSeatingNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, [seatingHasHolds]);

  const attendeeSeatMap = useMemo(() => buildAttendeeSeatMap(seatingPlan, seatingNowMs), [seatingPlan, seatingNowMs]);
  const seatingStats = useMemo(() => getSeatingStats(seatingPlan, registrations, seatingNowMs), [seatingPlan, registrations, seatingNowMs]);

  // Check-in Held Seat Confirmation Modal State, Late Fine Payment Modal State & Pre-select Ticket for Owner Seat Change
  const [pendingCheckInSeatConfirm, setPendingCheckInSeatConfirm] = useState(null); // { attendee, seatInfo }
  const [pendingLateFineCheckIn, setPendingLateFineCheckIn] = useState(null); // { attendee, fine }
  const [preselectedSeatingTicketNo, setPreselectedSeatingTicketNo] = useState(null);

  // Unified Check-In Wrapper:
  // 1) If attendee has an unpaid late-hold fine -> block check-in & open LateHoldFineModal!
  // 2) Otherwise check in and if attendee has an active temporary seat hold -> prompt to confirm!
  const handleCheckInWithSeatCheck = (ticketNo, status = true) => {
    if (status === true && ticketNo) {
      const unpaidFine = getUnpaidFineForTicket(seatingPlan, ticketNo, Date.now());
      if (unpaidFine) {
        const attendee = registrations.find((r) => r.ticketNo === ticketNo);
        if (attendee) {
          setPendingLateFineCheckIn({ attendee, fine: unpaidFine });
          return false;
        }
      }
    }
    if (onCheckIn) onCheckIn(ticketNo, status);
    if (status === true && ticketNo) {
      const liveMap = buildAttendeeSeatMap(seatingPlan, Date.now());
      const seatInfo = liveMap.get(ticketNo);
      if (seatInfo && seatInfo.status === "hold") {
        const attendee = registrations.find((r) => r.ticketNo === ticketNo);
        if (attendee) {
          setPendingCheckInSeatConfirm({ attendee, seatInfo });
        }
      }
    }
    return true;
  };

  // Complete Late Hold Fine Payment (after capturing slip/cash photo proof) -> mark ALL unpaid fines for this ticket paid & complete check-in!
  const handleCompleteLateFineAndCheckIn = ({ fine, attendee, paymentMethod, proofPhotoUrl }) => {
    if (!attendee || !fine) return;
    handleUpdateSeatingPlan((prev) => {
      const nextAssignments = { ...(prev.assignments || {}) };
      const keysToPrune = Array.isArray(fine.seatKeysToPrune)
        ? fine.seatKeysToPrune
        : fine.seatKeyToPrune
        ? [fine.seatKeyToPrune]
        : [];
      keysToPrune.forEach((k) => {
        if (nextAssignments[k]?.ticketNo === attendee.ticketNo) {
          delete nextAssignments[k];
        }
      });

      const paidAt = new Date().toISOString();
      const collectedBy = currentUser?.name || "Admin";
      const existingRecords = getTicketFineRecords(prev, attendee.ticketNo);

      // Merge any unpruned items from fine.items that weren't in existingRecords yet
      const modalItems = Array.isArray(fine.items) && fine.items.length > 0 ? fine.items : [fine];
      const merged = [...existingRecords];
      modalItems.forEach((mItem) => {
        const { seatKeyToPrune: _omit, ...cleanItem } = mItem;
        const exists = merged.some(
          (ex) =>
            ex.id === cleanItem.id ||
            (ex.seatCode === cleanItem.seatCode &&
              ex.expiredAt === cleanItem.expiredAt &&
              ex.bookedAt === cleanItem.bookedAt)
        );
        if (!exists) {
          merged.push({ ...cleanItem, ticketNo: attendee.ticketNo });
        }
      });

      const updatedRecords = merged.map((rec) =>
        rec.status === "paid"
          ? rec
          : {
              ...rec,
              ticketNo: attendee.ticketNo,
              status: "paid",
              paymentMethod: paymentMethod || "qr_slip",
              proofPhotoUrl: proofPhotoUrl || "",
              paidAt,
              collectedBy
            }
      );

      const nextFines = {
        ...(prev.expiredHoldFines || {}),
        [attendee.ticketNo]: updatedRecords
      };
      return {
        ...prev,
        assignments: nextAssignments,
        expiredHoldFines: nextFines,
        updatedAt: new Date().toISOString()
      };
    });
    if (onCheckIn) onCheckIn(attendee.ticketNo, true);
    setLastCheckInAttendee(attendee);
    playAudioEffect("fanfare");
    setPendingLateFineCheckIn(null);
  };

  // Confirm held seat permanently upon check-in
  const handleConfirmHeldSeatOnCheckIn = () => {
    if (!pendingCheckInSeatConfirm) return;
    const { attendee, seatInfo } = pendingCheckInSeatConfirm;
    handleUpdateSeatingPlan((prev) => {
      const nextAssignments = { ...(prev.assignments || {}) };
      if (nextAssignments[seatInfo.key] && nextAssignments[seatInfo.key].ticketNo === attendee.ticketNo) {
        nextAssignments[seatInfo.key] = {
          ...nextAssignments[seatInfo.key],
          status: "confirmed",
          holdExpiresAt: null,
          confirmedAt: new Date().toISOString(),
          confirmedBy: currentUser?.name || "Admin"
        };
      }
      return {
        ...prev,
        assignments: nextAssignments,
        updatedAt: new Date().toISOString()
      };
    });
    playAudioEffect("fanfare");
    setPendingCheckInSeatConfirm(null);
  };

  // Request seat change upon check-in (Owner switches immediately; Admin submits change request for Owner approval)
  const handleRequestChangeHeldSeatOnCheckIn = () => {
    if (!pendingCheckInSeatConfirm) return;
    const { attendee, seatInfo } = pendingCheckInSeatConfirm;
    const isOwnerUser = currentUser?.role === "owner";

    if (isOwnerUser) {
      // Owner can immediately change seat: confirm temporarily & jump to Seating tab with attendee pre-selected
      handleUpdateSeatingPlan((prev) => {
        const nextAssignments = { ...(prev.assignments || {}) };
        if (nextAssignments[seatInfo.key] && nextAssignments[seatInfo.key].ticketNo === attendee.ticketNo) {
          nextAssignments[seatInfo.key] = {
            ...nextAssignments[seatInfo.key],
            status: "confirmed",
            holdExpiresAt: null
          };
        }
        return {
          ...prev,
          assignments: nextAssignments,
          updatedAt: new Date().toISOString()
        };
      });
      setPendingCheckInSeatConfirm(null);
      setPreselectedSeatingTicketNo(attendee.ticketNo);
      setActiveMainTab("seating");
    } else {
      // Admin / Manager: Lock their held seat safely as confirmed AND create Seat Change Request for Owner approval!
      handleUpdateSeatingPlan((prev) => {
        const nextAssignments = { ...(prev.assignments || {}) };
        if (nextAssignments[seatInfo.key] && nextAssignments[seatInfo.key].ticketNo === attendee.ticketNo) {
          nextAssignments[seatInfo.key] = {
            ...nextAssignments[seatInfo.key],
            status: "confirmed",
            holdExpiresAt: null
          };
        }
        return {
          ...prev,
          assignments: nextAssignments,
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
              note: "ขอเปลี่ยนที่นั่งขณะลงทะเบียนเข้างาน"
            }
          },
          updatedAt: new Date().toISOString()
        };
      });
      setPendingCheckInSeatConfirm(null);
      alert(
        `ส่งคำขอเปลี่ยนที่นั่งของคุณ ${attendee.name} ถึงเจ้าของแอปเรียบร้อยแล้วครับ\n\n(ระหว่างรอเจ้าของแอปอนุมัติ ระบบยังคงสงวนที่นั่งเดิม ${seatInfo.tableLabel} • เก้าอี้ ${seatInfo.seatCode} ไว้ให้ก่อน — เฉพาะเจ้าของแอปเท่านั้นที่สามารถอนุมัติการเปลี่ยนที่นั่งได้)`
      );
    }
  };

  // Survey Responses State (from LocalStorage)
  const [surveyResponses, setSurveyResponses] = useState(() => {
    try {
      const saved = localStorage.getItem("sme_fan_survey_responses_v1");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    const handleSurveyUpdated = () => {
      try {
        const saved = localStorage.getItem("sme_fan_survey_responses_v1");
        setSurveyResponses(saved ? JSON.parse(saved) : []);
      } catch (e) {}
    };
    window.addEventListener("triple_t_survey_updated", handleSurveyUpdated);
    window.addEventListener("storage", handleSurveyUpdated);
    return () => {
      window.removeEventListener("triple_t_survey_updated", handleSurveyUpdated);
      window.removeEventListener("storage", handleSurveyUpdated);
    };
  }, []);

  const currentSurveyConfig = useMemo(() => {
    return eventConfig?.surveyConfig && Array.isArray(eventConfig.surveyConfig.categories) && eventConfig.surveyConfig.categories.length > 0
      ? eventConfig.surveyConfig
      : defaultSurveyConfig;
  }, [eventConfig?.surveyConfig]);

  const [isSurveyBuilderOpen, setIsSurveyBuilderOpen] = useState(false);
  const [isSurveyPreviewOpen, setIsSurveyPreviewOpen] = useState(false);
  const [surveyFeedbackCategoryFilter, setSurveyFeedbackCategoryFilter] = useState("all");

  const surveyStats = useMemo(() => {
    const categories = currentSurveyConfig.categories || [];
    if (!surveyResponses.length) {
      return {
        total: 0,
        totalAvg: "0.00",
        totalCommentsCount: 0,
        categoryStats: categories.map(cat => ({
          ...cat,
          avg: "0.00",
          questionStats: (cat.questions || []).map(q => ({ ...q, avg: "0.00", count: 0 }))
        }))
      };
    }

    const count = surveyResponses.length;

    // Map each question: sum and count
    const qMap = {};
    categories.forEach(cat => {
      (cat.questions || []).forEach(q => {
        qMap[q.id] = { sum: 0, count: 0 };
      });
    });

    let overallSum = 0;
    let overallCount = 0;
    let commentsCount = 0;

    surveyResponses.forEach(r => {
      // Check comments
      if (r.categoryComments && typeof r.categoryComments === "object") {
        Object.values(r.categoryComments).forEach(c => {
          if (c && typeof c === "string" && c.trim()) commentsCount++;
        });
      } else if (r.comment && typeof r.comment === "string" && r.comment.trim()) {
        commentsCount++;
      }

      // Check overall score
      if (r.overallAvg && !isNaN(Number(r.overallAvg))) {
        overallSum += Number(r.overallAvg);
        overallCount++;
      }

      // Scores map
      if (r.scores && typeof r.scores === "object") {
        Object.entries(r.scores).forEach(([qId, val]) => {
          const num = Number(val);
          if (!isNaN(num) && num > 0) {
            if (!qMap[qId]) qMap[qId] = { sum: 0, count: 0 };
            qMap[qId].sum += num;
            qMap[qId].count++;
          }
        });
      }
    });

    const categoryStats = categories.map((cat, idx) => {
      let catSum = 0;
      let catCount = 0;
      const questionStats = (cat.questions || []).map(q => {
        const item = qMap[q.id];
        const avg = item && item.count > 0 ? (item.sum / item.count).toFixed(2) : "0.00";
        if (item && item.count > 0) {
          catSum += Number(avg);
          catCount++;
        }
        return {
          ...q,
          avg,
          count: item ? item.count : 0
        };
      });

      // If this category didn't match modern questions, check if r.ratings has fallback
      let fallbackAvg = null;
      if (catCount === 0) {
        let legacySum = 0;
        let legacyCount = 0;
        const legacyKey = idx === 0 ? "ratingOverall" : idx === 1 ? "ratingVenue" : idx === 2 ? "ratingFood" : idx === 3 ? "ratingActivities" : "ratingStaff";
        surveyResponses.forEach(r => {
          if (r.ratings && r.ratings[legacyKey]) {
            legacySum += Number(r.ratings[legacyKey]);
            legacyCount++;
          }
        });
        if (legacyCount > 0) {
          fallbackAvg = (legacySum / legacyCount).toFixed(2);
        }
      }

      const avg = catCount > 0 
        ? (catSum / catCount).toFixed(2) 
        : (fallbackAvg !== null ? fallbackAvg : "0.00");

      return {
        ...cat,
        avg,
        questionStats
      };
    });

    let calculatedTotalAvg = "0.00";
    if (overallCount > 0) {
      calculatedTotalAvg = (overallSum / overallCount).toFixed(2);
    } else {
      const validCategories = categoryStats.filter(c => Number(c.avg) > 0);
      if (validCategories.length > 0) {
        const sum = validCategories.reduce((acc, c) => acc + Number(c.avg), 0);
        calculatedTotalAvg = (sum / validCategories.length).toFixed(2);
      }
    }

    return {
      total: count,
      totalAvg: calculatedTotalAvg,
      totalCommentsCount: commentsCount,
      categoryStats
    };
  }, [surveyResponses, currentSurveyConfig]);

  // Speed Ranking States & Calculations (สำหรับจับเวลาเป็นวินาทีและจัดอันดับแจกของรางวัล)
  const [surveyRankingSearch, setSurveyRankingSearch] = useState("");
  const [surveyRankingFilter, setSurveyRankingFilter] = useState("all");

  const speedRankingList = useMemo(() => {
    if (!surveyResponses || surveyResponses.length === 0) return [];
    
    // เรียงตามเวลาที่กดส่งจริง (submittedAt) จากเร็วที่สุดไปช้าที่สุด
    const sorted = [...surveyResponses].sort((a, b) => {
      const timeA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
      const timeB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
      return timeA - timeB;
    });

    const pad = (n) => String(n).padStart(2, '0');

    return sorted.map((item, idx) => {
      const rank = idx + 1;
      let displayTimeWithSec = item.displayTime || "";
      if (!displayTimeWithSec && item.submittedAt) {
        const d = new Date(item.submittedAt);
        displayTimeWithSec = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())} น.`;
      }
      return {
        ...item,
        rank,
        isTop3: rank <= 3,
        isTop20: rank <= 20,
        isTop30: rank <= 30,
        displayTimeWithSec
      };
    });
  }, [surveyResponses]);

  const filteredRankingList = useMemo(() => {
    let list = speedRankingList;
    if (surveyRankingFilter === "top20") {
      list = list.filter(item => item.rank <= 20);
    } else if (surveyRankingFilter === "top30") {
      list = list.filter(item => item.rank <= 30);
    } else if (surveyRankingFilter === "top50") {
      list = list.filter(item => item.rank <= 50);
    }

    if (surveyRankingSearch.trim()) {
      const q = surveyRankingSearch.toLowerCase().trim();
      list = list.filter(item => 
        (item.name && item.name.toLowerCase().includes(q)) ||
        (item.nickname && item.nickname.toLowerCase().includes(q)) ||
        (item.ticketNo && item.ticketNo.toLowerCase().includes(q)) ||
        (item.club && item.club.toLowerCase().includes(q))
      );
    }

    return list;
  }, [speedRankingList, surveyRankingFilter, surveyRankingSearch]);

  // Sync animation state
  const [isSyncing, setIsSyncing] = useState(false);
  const handleManualSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    playAudioEffect("beep");
    if (onForceSyncCloud) {
      try {
        await onForceSyncCloud();
      } catch (e) {
        console.warn('Manual sync error:', e);
      }
    }
    setTimeout(() => setIsSyncing(false), 800);
  };

  // Inspection Modal State for individual attendee & slip details
  const [inspectingAttendee, setInspectingAttendee] = useState(null);

  // Keep inspecting attendee in sync with latest registrations updates (check-in, shirt, etc.)
  const activeInspectingAttendee = useMemo(() => {
    if (!inspectingAttendee) return null;
    return registrations.find(r => r.ticketNo === inspectingAttendee.ticketNo) || inspectingAttendee;
  }, [inspectingAttendee, registrations]);

  // High-Security Clear Modal State (Encloses purge & reset under multi-step safety flow)
  const [isClearSecurityOpen, setIsClearSecurityOpen] = useState(false);
  // Storage Purge Modal State (Delete photos/slips after event)
  const [isPurgeModalOpen, setIsPurgeModalOpen] = useState(false);
  // Dedicated Reset Registrations & Scores Modal State
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  // Camera QR Scanner Modal State
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [lastCheckInAttendee, setLastCheckInAttendee] = useState(null);

  // Photo Capture Modal State (1:1 Ratio)
  const [photoModalTarget, setPhotoModalTarget] = useState(null);
  const [photoModalType, setPhotoModalType] = useState('checkin'); // 'checkin' | 'shirt'
  const openPhotoModal = (attendee, type = 'checkin') => {
    setPhotoModalType(type);
    setPhotoModalTarget(attendee);
  };
  // High-Resolution Photo Viewer Lightbox State
  const [photoViewerTarget, setPhotoViewerTarget] = useState(null);
  const [photoViewerTab, setPhotoViewerTab] = useState('checkin'); // 'checkin' | 'shirt'

  // Shirt Presentation & Management State
  const [isShirtSlideOpen, setIsShirtSlideOpen] = useState(false);
  const [searchShirt, setSearchShirt] = useState("");
  const [filterShirtStatus, setFilterShirtStatus] = useState("all"); // "all" | "received" | "not_received"

  // Contest State
  const [isJudgeModalOpen, setIsJudgeModalOpen] = useState(false);
  const [contestSubTab, setContestSubTab] = useState("leaderboard"); // "leaderboard" | "teams" | "judge_qr"
  const [contestCategoryView, setContestCategoryView] = useState("individual"); // "individual" | "team"
  const [contestAwardView, setContestAwardView] = useState("total"); // "total" | "beauty" | "creativity"
  const [copiedLink, setCopiedLink] = useState(false);
  const [judgeQrUrl, setJudgeQrUrl] = useState("");

  // Teams in Contest (Persisted in localStorage)
  const [contestTeams, setContestTeams] = useState(() => {
    try {
      localStorage.removeItem("sme_fan_contest_teams_v1");
      const saved = localStorage.getItem(CONTEST_TEAMS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Team creation form state
  const [isCreateTeamModalOpen, setIsCreateTeamModalOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [selectedMemberTicketNos, setSelectedMemberTicketNos] = useState([]);

  // All Judge Votes (Persisted in localStorage)
  const [allJudgeVotes, setAllJudgeVotes] = useState(() => {
    try {
      localStorage.removeItem("sme_fan_contest_all_votes_v1");
      const saved = localStorage.getItem(CONTEST_VOTES_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Sync contest teams to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(CONTEST_TEAMS_STORAGE_KEY, JSON.stringify(contestTeams));
    } catch (e) {}
  }, [contestTeams]);

  // Generate Judge QR Code URL
  useEffect(() => {
    const judgeUrl = `${window.location.origin}/?judge=true`;
    QRCode.toDataURL(judgeUrl, { width: 320, margin: 2, color: { dark: '#020617', light: '#ffffff' } })
      .then(url => setJudgeQrUrl(url))
      .catch(err => console.error("QR Code Error:", err));
  }, []);

  // Poll / Reload Judge Votes from localStorage periodically so scores update live
  useEffect(() => {
    const interval = setInterval(() => {
      try {
        const saved = localStorage.getItem(CONTEST_VOTES_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (JSON.stringify(parsed) !== JSON.stringify(allJudgeVotes)) {
            setAllJudgeVotes(parsed);
          }
        }
      } catch (e) {}
    }, 2000);
    return () => clearInterval(interval);
  }, [allJudgeVotes]);

  // Auto-clear judge votes and contest teams if registrations is emptied
  useEffect(() => {
    if (registrations.length === 0 && (allJudgeVotes.length > 0 || contestTeams.length > 0)) {
      setAllJudgeVotes([]);
      setContestTeams([]);
      try {
        localStorage.removeItem(CONTEST_VOTES_STORAGE_KEY);
        localStorage.removeItem(CONTEST_TEAMS_STORAGE_KEY);
        localStorage.removeItem("sme_fan_judge_scores_v1");
      } catch (e) {}
    }
  }, [registrations.length]);

  // Listen for global reset registrations event to immediately clear local component state
  useEffect(() => {
    const handleGlobalReset = () => {
      setAllJudgeVotes([]);
      setContestTeams([]);
      setGrandPrizeWinners([]);
      setGiftQueueWinners([]);
      setTableDrawWinners([]);
      setLastCheckInAttendee(null);
      setPhotoModalTarget(null);
      setPhotoViewerTarget(null);
      // Clear seat assignments, showcase assignments, fine ledger & free-hold quota while preserving room layout, hold tiers and Owner fine QR code
      handleUpdateSeatingPlan((prev) => ({
        ...prev,
        assignments: {},
        showcaseAssignments: {},
        seatChangeRequests: {},
        expiredHoldFines: {},
        freeHoldUsedByTicket: {},
        updatedAt: new Date().toISOString()
      }));
    };
    window.addEventListener('triple_t_reset_registrations', handleGlobalReset);
    return () => window.removeEventListener('triple_t_reset_registrations', handleGlobalReset);
  }, []);

  // Tab 1: Check-in search & filter
  const [searchCheckIn, setSearchCheckIn] = useState("");
  const [filterCheckInClub, setFilterCheckInClub] = useState("all");
  const [filterCheckInStatus, setFilterCheckInStatus] = useState("all"); // "all" | "checked_in" | "not_checked_in"

  // Emergency Check-In Modal
  const [emergencyTarget, setEmergencyTarget] = useState(null);

  // Tab 2: Gifts modal & search
  const [isGiftModalOpen, setIsGiftModalOpen] = useState(false);
  const [searchGiftAttendee, setSearchGiftAttendee] = useState("");

  // Tab 3: Lucky Draw State
  const [drawSubTab, setDrawSubTab] = useState("general"); // "general" | "grand" | "gift_exclusive" | "table_seat"
  const [tableDrawMode, setTableDrawMode] = useState("seat"); // "seat" (สุ่มเก้าอี้นำโชค) | "table" (สุ่มโต๊ะนำโชคยกโต๊ะ)
  const [tableDrawWinners, setTableDrawWinners] = useState(() => {
    try {
      const saved = localStorage.getItem("sme_fan_table_draw_winners_v1");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [prizeNameInput, setPrizeNameInput] = useState("รางวัลพิเศษงานปีใหม่");
  const [isSpinning, setIsSpinning] = useState(false);
  const [currentWinner, setCurrentWinner] = useState(null);
  const [displayedCandidate, setDisplayedCandidate] = useState(null);
  
  // Grand prize winners history state: [{ id, ticketNo, name, club, prizeName, wonAt }]
  const [grandPrizeWinners, setGrandPrizeWinners] = useState(() => {
    try {
      const saved = localStorage.getItem("sme_fan_grand_winners_v1");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Gift draw queue state: [{ queueNo, ticketNo, name, giftNumber, wonAt }]
  const [giftQueueWinners, setGiftQueueWinners] = useState(() => {
    try {
      const saved = localStorage.getItem("sme_fan_gift_queue_v1");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // General draw count state: { [ticketNo]: count }
  const [generalDrawCounts, setGeneralDrawCounts] = useState(() => {
    try {
      const saved = localStorage.getItem("sme_fan_general_draw_counts_v1");
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  // Search filter for Lucky Draw candidate pool on the right side
  const [searchDrawPool, setSearchDrawPool] = useState("");

  // Sound effects & Background music state synced with bgAudio singleton
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    bgAudio.init();
    const unsubscribe = bgAudio.subscribe((playing) => {
      setIsMusicPlaying(playing);
    });
    return () => unsubscribe();
  }, []);

  const handleToggleSound = () => {
    if (isMusicPlaying) {
      bgAudio.pause();
      setSoundEnabled(false);
    } else {
      bgAudio.play();
      setSoundEnabled(true);
    }
  };

  // Save winners history to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("sme_fan_grand_winners_v1", JSON.stringify(grandPrizeWinners));
    } catch (e) {}
  }, [grandPrizeWinners]);

  useEffect(() => {
    try {
      localStorage.setItem("sme_fan_gift_queue_v1", JSON.stringify(giftQueueWinners));
    } catch (e) {}
  }, [giftQueueWinners]);

  useEffect(() => {
    try {
      localStorage.setItem("sme_fan_general_draw_counts_v1", JSON.stringify(generalDrawCounts));
    } catch (e) {}
  }, [generalDrawCounts]);

  useEffect(() => {
    try {
      localStorage.setItem("sme_fan_table_draw_winners_v1", JSON.stringify(tableDrawWinners));
    } catch (e) {}
  }, [tableDrawWinners]);

  // Audio synthesizer for sound effects
  const playAudioEffect = (type = "beep") => {
    if (!soundEnabled) return;
    try {
      const audioCtx = getSharedAudioContext();
      if (!audioCtx) return;
      if (type === "beep") {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.15);
      } else if (type === "tick") {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = "triangle";
        osc.frequency.setValueAtTime(600 + Math.random() * 200, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.005, audioCtx.currentTime + 0.05);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.05);
      } else if (type === "fanfare") {
        const now = audioCtx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C E G C
        notes.forEach((freq, idx) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, now + idx * 0.1);
          gain.gain.setValueAtTime(0.2, now + idx * 0.1);
          gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.1 + 0.4);
          osc.start(now + idx * 0.1);
          osc.stop(now + idx * 0.1 + 0.4);
        });
      }
    } catch (e) {
      console.log("Audio not supported:", e);
    }
  };

  // Trigger Confetti effect
  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0 }
        });
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 1 }
        });
      }, 250);
    } catch (e) {}
  };

  // General counts
  const totalCount = registrations.length;
  const checkedInList = useMemo(() => registrations.filter(r => r.checkedIn), [registrations]);
  const checkedInCount = checkedInList.length;
  const giftList = useMemo(
    () => registrations.filter(r => r.giftNumber).sort((a, b) => (a.giftNumber || 0) - (b.giftNumber || 0)),
    [registrations]
  );
  const giftCount = giftList.length;

  // Club counts (SongSapat vs Rotary)
  const countSongSapat = useMemo(
    () => registrations.filter(r => (r.club || "สงสพัท").includes("สงสพัท")).length,
    [registrations]
  );
  const countRotary = useMemo(
    () => registrations.filter(r => (r.club || "").includes("โรตารี่")).length,
    [registrations]
  );

  // Shirt calculations
  const shirtAttendees = useMemo(() => registrations.filter(r => r.hasShirt), [registrations]);
  const shirtTotalCount = shirtAttendees.length;
  const shirtReceivedCount = useMemo(() => shirtAttendees.filter(r => r.shirtReceived).length, [shirtAttendees]);

  // Filtered shirt attendees for Tab 3
  const filteredShirtList = useMemo(() => {
    return shirtAttendees.filter(r => {
      if (filterShirtStatus === "received" && !r.shirtReceived) return false;
      if (filterShirtStatus === "not_received" && r.shirtReceived) return false;
      if (searchShirt.trim()) {
        const q = searchShirt.toLowerCase();
        const matchName = r.name?.toLowerCase().includes(q);
        const matchNick = r.nickname?.toLowerCase().includes(q);
        const matchTicket = r.ticketNo?.toLowerCase().includes(q);
        const matchPhone = r.phone?.includes(q);
        const matchClub = r.club?.toLowerCase().includes(q);
        const matchSize = r.shirtSize?.toLowerCase().includes(q);
        if (!matchName && !matchNick && !matchTicket && !matchPhone && !matchClub && !matchSize) return false;
      }
      return true;
    });
  }, [shirtAttendees, filterShirtStatus, searchShirt]);

  // Team creation handlers for Tab 4
  const handleCreateTeam = () => {
    if (!newTeamName.trim()) {
      alert("กรุณาระบุชื่อกลุ่ม / ชื่อทีม");
      return;
    }
    if (selectedMemberTicketNos.length === 0) {
      alert("กรุณาเลือกสมาชิกในทีมอย่างน้อย 1 คน");
      return;
    }
    const members = registrations
      .filter(r => selectedMemberTicketNos.includes(r.ticketNo))
      .map(r => ({
        ticketNo: r.ticketNo,
        name: r.name,
        nickname: r.nickname || "",
        club: r.club || "",
        photoUrl: r.photoUrl || ""
      }));

    const newTeam = {
      id: "team_" + Date.now(),
      name: newTeamName.trim(),
      members,
      createdAt: new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) + " น."
    };

    setContestTeams(prev => [...prev, newTeam]);
    setNewTeamName("");
    setSelectedMemberTicketNos([]);
    setIsCreateTeamModalOpen(false);
  };

  const handleDeleteTeam = (teamId) => {
    if (window.confirm("ต้องการลบกลุ่มนี้ออกจากการประกวดใช่หรือไม่?")) {
      setContestTeams(prev => prev.filter(t => t.id !== teamId));
    }
  };

  // Contest Leaderboard Aggregation
  const individualLeaderboard = useMemo(() => {
    return registrations.map(attendee => {
      let beautyTotal = 0;
      let creativityTotal = 0;
      let judgesVotedCount = 0;

      allJudgeVotes.forEach(vote => {
        const bScore = vote.scores?.individual?.beauty?.[attendee.ticketNo] || 0;
        const cScore = vote.scores?.individual?.creativity?.[attendee.ticketNo] || 0;
        if (bScore > 0 || cScore > 0) {
          judgesVotedCount++;
        }
        beautyTotal += Number(bScore);
        creativityTotal += Number(cScore);
      });

      return {
        id: attendee.ticketNo,
        ticketNo: attendee.ticketNo,
        name: attendee.name,
        nickname: attendee.nickname,
        club: attendee.club,
        photoUrl: attendee.photoUrl || null,
        checkedIn: attendee.checkedIn,
        beautyTotal,
        creativityTotal,
        overallTotal: beautyTotal + creativityTotal,
        judgesVotedCount
      };
    }).sort((a, b) => {
      if (contestAwardView === "beauty") return b.beautyTotal - a.beautyTotal || b.overallTotal - a.overallTotal;
      if (contestAwardView === "creativity") return b.creativityTotal - a.creativityTotal || b.overallTotal - a.overallTotal;
      return b.overallTotal - a.overallTotal || b.beautyTotal - a.beautyTotal;
    });
  }, [registrations, allJudgeVotes, contestAwardView]);

  const teamLeaderboard = useMemo(() => {
    return contestTeams.map(team => {
      let beautyTotal = 0;
      let creativityTotal = 0;
      let judgesVotedCount = 0;

      allJudgeVotes.forEach(vote => {
        const bScore = vote.scores?.team?.beauty?.[team.id] || 0;
        const cScore = vote.scores?.team?.creativity?.[team.id] || 0;
        if (bScore > 0 || cScore > 0) {
          judgesVotedCount++;
        }
        beautyTotal += Number(bScore);
        creativityTotal += Number(cScore);
      });

      return {
        id: team.id,
        name: team.name,
        members: team.members || [],
        photoUrl: team.photoUrl || team.members?.[0]?.photoUrl,
        beautyTotal,
        creativityTotal,
        overallTotal: beautyTotal + creativityTotal,
        judgesVotedCount
      };
    }).sort((a, b) => {
      if (contestAwardView === "beauty") return b.beautyTotal - a.beautyTotal || b.overallTotal - a.overallTotal;
      if (contestAwardView === "creativity") return b.creativityTotal - a.creativityTotal || b.overallTotal - a.overallTotal;
      return b.overallTotal - a.overallTotal || b.beautyTotal - a.beautyTotal;
    });
  }, [contestTeams, allJudgeVotes, contestAwardView]);

  // Filtered check-in list (Sorted by ticket number or registration order 1..N)
  const sortedRegistrations = useMemo(() => {
    return [...registrations].sort((a, b) => {
      const numA = parseInt((a.ticketNo || "").replace(/\D/g, "")) || 0;
      const numB = parseInt((b.ticketNo || "").replace(/\D/g, "")) || 0;
      return numA - numB;
    });
  }, [registrations]);

  const filteredCheckInList = useMemo(() => {
    return sortedRegistrations.filter(r => {
      if (filterCheckInStatus === "checked_in" && !r.checkedIn) return false;
      if (filterCheckInStatus === "not_checked_in" && r.checkedIn) return false;
      if (filterCheckInClub !== "all") {
        const attendeeClub = r.club || "สงสพัท";
        if (!attendeeClub.includes(filterCheckInClub)) return false;
      }
      if (searchCheckIn.trim()) {
        const q = searchCheckIn.toLowerCase();
        const matchName = r.name?.toLowerCase().includes(q);
        const matchNick = r.nickname?.toLowerCase().includes(q);
        const matchTicket = r.ticketNo?.toLowerCase().includes(q);
        const matchPhone = r.phone?.includes(q);
        if (!matchName && !matchNick && !matchTicket && !matchPhone) return false;
      }
      return true;
    });
  }, [sortedRegistrations, filterCheckInStatus, filterCheckInClub, searchCheckIn]);

  // Handle Scan QR Code success
  const handleScanSuccess = (scannedAttendee) => {
    if (!scannedAttendee) return;
    if (scannedAttendee.checkedIn) {
      // Already checked in -> TicketScannerModal displays "คุณลงทะเบียนเข้างานแล้ว"
      playAudioEffect("beep");
      return;
    }
    playAudioEffect("beep");
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }
    const unpaidFine = getUnpaidFineForTicket(seatingPlan, scannedAttendee.ticketNo, Date.now());
    if (unpaidFine) {
      if (!scannedAttendee.photoUrl) {
        // Capture check-in photo first -> immediately pops up LateHoldFineModal after photo save
        openPhotoModal(scannedAttendee, 'checkin');
      } else {
        setPendingLateFineCheckIn({ attendee: scannedAttendee, fine: unpaidFine });
      }
      return;
    }
    handleCheckInWithSeatCheck(scannedAttendee.ticketNo, true);
    setLastCheckInAttendee(scannedAttendee);
  };

  // Eligible members for gift registration: Checked in AND do NOT have a gift yet
  const eligibleForGift = useMemo(
    () => registrations.filter(r => r.checkedIn && !r.giftNumber),
    [registrations]
  );
  const filteredEligibleGift = useMemo(() => {
    return eligibleForGift.filter(r => {
      if (!searchGiftAttendee.trim()) return true;
      const q = searchGiftAttendee.toLowerCase();
      return (
        r.name?.toLowerCase().includes(q) ||
        r.nickname?.toLowerCase().includes(q) ||
        r.ticketNo?.toLowerCase().includes(q) ||
        r.phone?.includes(q)
      );
    });
  }, [eligibleForGift, searchGiftAttendee]);

  // Handle Register Gift for an attendee
  const handleSelectAttendeeForGift = (ticketNo) => {
    const nextGiftNo = giftList.length > 0 
      ? Math.max(...giftList.map(g => g.giftNumber || 0)) + 1 
      : 1;
    onRegisterGift(ticketNo, nextGiftNo);
    playAudioEffect("fanfare");
    setIsGiftModalOpen(false);
    setSearchGiftAttendee("");
  };

  // Lucky Draw Logic
  const getCandidatePool = () => {
    if (drawSubTab === "general") {
      // General pool: All checked-in attendees (or all registered if 0 checked-in)
      return checkedInList.length > 0 ? checkedInList : registrations;
    } else if (drawSubTab === "grand") {
      // Grand prize: Checked-in attendees NOT already won a grand prize
      const wonTicketNos = new Set(grandPrizeWinners.map(w => w.ticketNo));
      return (checkedInList.length > 0 ? checkedInList : registrations).filter(r => !wonTicketNos.has(r.ticketNo));
    } else if (drawSubTab === "gift_exclusive") {
      // Gift exclusive: Only members who brought gifts, NOT already in queue
      const wonTicketNos = new Set(giftQueueWinners.map(w => w.ticketNo));
      return giftList.filter(r => !wonTicketNos.has(r.ticketNo));
    } else if (drawSubTab === "table_seat") {
      const regMap = new Map(registrations.map(r => [r.ticketNo, r]));
      const tables = (seatingPlan?.items || []).filter(it => it.type === "table");
      if (tableDrawMode === "table") {
        // Pool of tables with at least 1 seated attendee, excluding already won tables
        const wonTableIds = new Set(tableDrawWinners.filter(w => w.mode === "table").map(w => w.tableId));
        return tables
          .map(t => {
            const occ = getTableOccupancyMap(seatingPlan, t.id, regMap);
            const members = Array.from(occ.values())
              .sort((a, b) => a.seatNo - b.seatNo)
              .map(o => ({ ...o.attendee, seatNo: o.seatNo, seatCode: getSeatCode(t, o.seatNo) }));
            return {
              isTableCandidate: true,
              id: t.id,
              tableId: t.id,
              tableLabel: t.label,
              tableCode: t.code || "",
              name: t.label,
              ticketNo: `${members.length}/${t.capacity || 8} ท่าน`,
              club: `โต๊ะนั่งแขก`,
              members
            };
          })
          .filter(t => t.members.length > 0 && !wonTableIds.has(t.tableId));
      } else {
        // Pool of occupied seats, excluding already won seats
        const wonSeatKeys = new Set(tableDrawWinners.filter(w => w.mode === "seat").map(w => w.seatKey));
        const seats = [];
        tables.forEach(t => {
          const occ = getTableOccupancyMap(seatingPlan, t.id, regMap);
          occ.forEach((o, seatNo) => {
            const seatKey = `${t.id}:${seatNo}`;
            if (!wonSeatKeys.has(seatKey) && o.attendee) {
              seats.push({
                ...o.attendee,
                isSeatCandidate: true,
                seatKey,
                tableId: t.id,
                tableLabel: t.label,
                tableCode: t.code || "",
                seatNo,
                seatCode: getSeatCode(t, seatNo)
              });
            }
          });
        });
        return seats.sort((a, b) => String(a.seatCode).localeCompare(String(b.seatCode), "th", { numeric: true }));
      }
    }
    return [];
  };

  const handleStartDraw = () => {
    const pool = getCandidatePool();
    if (pool.length === 0) {
      alert("ไม่มีรายชื่อในโถสุ่มที่ตรงตามเงื่อนไขในขณะนี้");
      return;
    }

    setIsSpinning(true);
    setCurrentWinner(null);

    let counter = 0;
    const maxSpins = 35 + Math.floor(Math.random() * 15);
    const intervalTime = 60;

    const spinInterval = setInterval(() => {
      counter++;
      const randomIdx = Math.floor(Math.random() * pool.length);
      setDisplayedCandidate(pool[randomIdx]);
      playAudioEffect("tick");

        if (counter >= maxSpins) {
        clearInterval(spinInterval);
        const finalWinner = pool[Math.floor(Math.random() * pool.length)];
        setDisplayedCandidate(finalWinner);
        setCurrentWinner(finalWinner);
        setIsSpinning(false);
        playAudioEffect("fanfare");
        triggerConfetti();

        // Increment draw count for general mode
        if (drawSubTab === "general") {
          setGeneralDrawCounts(prev => ({
            ...prev,
            [finalWinner.ticketNo]: (prev[finalWinner.ticketNo] || 0) + 1
          }));
        }
      }
    }, intervalTime);
  };

  // Reset General Draw Counts
  const handleResetGeneralDrawCounts = () => {
    if (window.confirm("ต้องการรีเซ็ตจำนวนครั้งการสุ่มทั้งหมดเป็น 0 ใช่หรือไม่?")) {
      setGeneralDrawCounts({});
      try {
        localStorage.removeItem("sme_fan_general_draw_counts_v1");
      } catch (e) {}
    }
  };

  // Restore single winner back to Grand Prize pool
  const handleRestoreGrandPrizeWinner = (ticketNo) => {
    if (window.confirm("ต้องการดึงรายชื่อนี้กลับเข้าสู่โถสุ่มรางวัลใหญ่ใช่หรือไม่?")) {
      setGrandPrizeWinners(prev => prev.filter(w => w.ticketNo !== ticketNo));
    }
  };

  // Reset all Grand Prize Winners
  const handleResetGrandPrizeWinners = () => {
    if (window.confirm("ต้องการล้างทำเนียบผู้ได้รับรางวัลใหญ่ทั้งหมด และนำรายชื่อทุกคนกลับเข้าโถสุ่มใช่หรือไม่?")) {
      setGrandPrizeWinners([]);
      setCurrentWinner(null);
      setDisplayedCandidate(null);
    }
  };

  // Reset Gift Queue (Mode 3)
  const handleResetGiftQueue = () => {
    if (window.confirm("ต้องการรีเซ็ตลำดับคิวจับของขวัญทั้งหมด เพื่อเริ่มสุ่มใหม่ใช่หรือไม่?")) {
      setGiftQueueWinners([]);
      setCurrentWinner(null);
      setDisplayedCandidate(null);
    }
  };

  // Remove single item from Gift Queue
  const handleRemoveGiftQueueItem = (ticketNo) => {
    setGiftQueueWinners(prev => {
      const remaining = prev.filter(q => q.ticketNo !== ticketNo);
      return remaining.map((item, idx) => ({ ...item, queueNo: idx + 1 }));
    });
  };

  // Confirm Grand Prize Winner
  const handleConfirmGrandPrizeWinner = () => {
    if (!currentWinner) return;
    const newRecord = {
      id: "w_" + Date.now(),
      ticketNo: currentWinner.ticketNo,
      name: currentWinner.name,
      nickname: currentWinner.nickname || "",
      club: currentWinner.club || "",
      prizeName: prizeNameInput.trim() || "รางวัลพิเศษ",
      wonAt: new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) + " น."
    };
    setGrandPrizeWinners(prev => [newRecord, ...prev]);
    setCurrentWinner(null);
    setDisplayedCandidate(null);
  };

  // Confirm Gift Queue Winner
  const handleConfirmGiftQueueWinner = () => {
    if (!currentWinner) return;
    const nextQueueNo = giftQueueWinners.length + 1;
    const newRecord = {
      queueNo: nextQueueNo,
      ticketNo: currentWinner.ticketNo,
      name: currentWinner.name,
      nickname: currentWinner.nickname || "",
      giftNumber: currentWinner.giftNumber,
      wonAt: new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) + " น."
    };
    setGiftQueueWinners(prev => [...prev, newRecord]);
    setCurrentWinner(null);
    setDisplayedCandidate(null);
  };

  // Confirm Table / Seat Lucky Draw Winner
  const handleConfirmTableDrawWinner = () => {
    if (!currentWinner) return;
    const isTable = Boolean(currentWinner.isTableCandidate);
    const newRecord = isTable
      ? {
          id: "td_" + Date.now(),
          mode: "table",
          tableId: currentWinner.tableId,
          tableLabel: currentWinner.tableLabel,
          membersCount: currentWinner.members?.length || 0,
          members: currentWinner.members || [],
          prizeName: prizeNameInput.trim() || "รางวัลโต๊ะนำโชค",
          wonAt: new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) + " น."
        }
      : {
          id: "td_" + Date.now(),
          mode: "seat",
          seatKey: currentWinner.seatKey,
          tableId: currentWinner.tableId,
          tableLabel: currentWinner.tableLabel,
          seatCode: currentWinner.seatCode,
          ticketNo: currentWinner.ticketNo,
          name: currentWinner.name,
          nickname: currentWinner.nickname || "",
          club: currentWinner.club || "",
          photoUrl: currentWinner.photoUrl || null,
          prizeName: prizeNameInput.trim() || "รางวัลเก้าอี้นำโชค",
          wonAt: new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) + " น."
        };
    setTableDrawWinners(prev => [newRecord, ...prev]);
    setCurrentWinner(null);
    setDisplayedCandidate(null);
  };

  const handleRestoreTableDrawWinner = (winnerId) => {
    if (window.confirm("ต้องการดึงรายการนี้กลับเข้าสู่โถสุ่มโต๊ะ/เก้าอี้ใช่หรือไม่?")) {
      setTableDrawWinners(prev => prev.filter(w => w.id !== winnerId));
    }
  };

  const handleResetTableDrawWinners = () => {
    if (window.confirm("ต้องการล้างประวัติรางวัลโต๊ะ/เก้าอี้นำโชคทั้งหมดใช่หรือไม่?")) {
      setTableDrawWinners([]);
      setCurrentWinner(null);
      setDisplayedCandidate(null);
    }
  };

  // Current candidate pool for lucky draw
  const candidatePool = useMemo(() => {
    return getCandidatePool();
  }, [drawSubTab, tableDrawMode, checkedInList, registrations, grandPrizeWinners, giftQueueWinners, tableDrawWinners, giftList, seatingPlan]);

  // Search filtered pool for Right-Side Panel
  const filteredCandidatePool = useMemo(() => {
    return candidatePool.filter(r => {
      if (!searchDrawPool.trim()) return true;
      const q = searchDrawPool.toLowerCase();
      const matchName = r.name?.toLowerCase().includes(q);
      const matchNick = r.nickname?.toLowerCase().includes(q);
      const matchTicket = r.ticketNo?.toLowerCase().includes(q);
      const matchClub = r.club?.toLowerCase().includes(q);
      const matchSeat = r.seatCode?.toLowerCase().includes(q) || r.tableLabel?.toLowerCase().includes(q);
      return matchName || matchNick || matchTicket || matchClub || matchSeat;
    });
  }, [candidatePool, searchDrawPool]);

  // Filtered gift registered list for Mode 3 Right-Side Panel
  const filteredGiftList = useMemo(() => {
    return giftList.filter(g => {
      if (!searchDrawPool.trim()) return true;
      const q = searchDrawPool.toLowerCase();
      const matchName = g.name?.toLowerCase().includes(q);
      const matchNick = g.nickname?.toLowerCase().includes(q);
      const matchTicket = g.ticketNo?.toLowerCase().includes(q);
      const matchClub = g.club?.toLowerCase().includes(q);
      const matchGiftNo = String(g.giftNumber || "").includes(q);
      return matchName || matchNick || matchTicket || matchClub || matchGiftNo;
    });
  }, [giftList, searchDrawPool]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      
      {/* Background Ambient Glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-1/4 left-10 w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[140px]" />
      </div>

      {/* ========================================================== */}
      {/* STICKY TOP APP BAR (HEADER + TABS PINNED AT TOP)            */}
      {/* ========================================================== */}
      <div className="sticky top-0 z-40 bg-slate-950 shadow-xl border-b border-slate-800 text-white">
        
        {/* Top Header Bar */}
        <header className="px-3 sm:px-6 py-2.5 sm:py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2.5 border-b border-white/5 bg-slate-950">
          
          {/* Left: Branding & Back to Portal */}
          <div className="flex items-center space-x-2.5 sm:space-x-3">
            <button
              type="button"
              onClick={onBackToPortal}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all shadow-sm cursor-pointer"
              title="กลับสู่ศูนย์ควบคุม Owner"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div>
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <h1 className="font-black text-white text-sm sm:text-base tracking-tight">
                  ระบบลงทะเบียนหน้างาน
                </h1>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-extrabold border border-emerald-500/30">
                  Live On-Site
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate max-w-[260px] sm:max-w-none">
                {eventConfig?.eventTitle || "งานสังสรรค์ปีใหม่ SME FAN 2026"} • {currentUser?.name || "ทีป์ชลิต"}
              </p>
            </div>
          </div>

          {/* Right: Live Stats Chips & Essential Actions (Single Line, Horizontally Scrollable on Mobile) */}
          <div className="flex items-center space-x-1.5 sm:space-x-2 text-xs overflow-x-auto no-scrollbar scrollbar-none py-0.5 max-w-full flex-nowrap">
            {/* 1. ทั้งหมด */}
            <div className="px-2.5 py-1 rounded-xl bg-slate-900 border border-white/10 flex items-center space-x-1.5 shrink-0 text-[11px] whitespace-nowrap">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-400">ทั้งหมด:</span>
              <strong className="text-white font-mono">{totalCount}</strong>
            </div>

            {/* 2. เข้างาน */}
            <div className="px-2.5 py-1 rounded-xl bg-emerald-950/70 border border-emerald-500/30 flex items-center space-x-1.5 shrink-0 text-[11px] whitespace-nowrap">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-300">เข้างาน:</span>
              <strong className="text-emerald-300 font-mono">{checkedInCount}</strong>
              <span className="text-[10px] text-emerald-400/80">({totalCount > 0 ? Math.round((checkedInCount / totalCount) * 100) : 0}%)</span>
            </div>

            {/* 2.5 ที่นั่ง/โต๊ะ */}
            <div className="px-2.5 py-1 rounded-xl bg-sky-950/70 border border-sky-500/30 flex items-center space-x-1.5 shrink-0 text-[11px] whitespace-nowrap">
              <Armchair className="w-3.5 h-3.5 text-sky-400" />
              <span className="text-sky-300">โต๊ะ:</span>
              <strong className="text-sky-300 font-mono">{seatingStats.bookedCount}/{seatingStats.openCapacity}</strong>
            </div>

            {/* 3. ของขวัญ */}
            <div className="px-2.5 py-1 rounded-xl bg-amber-950/70 border border-amber-500/30 flex items-center space-x-1.5 shrink-0 text-[11px] whitespace-nowrap">
              <Gift className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-amber-300">ของขวัญ:</span>
              <strong className="text-amber-300 font-mono">{giftCount}</strong>
            </div>

            {/* 4. เสื้อ */}
            <div className="px-2.5 py-1 rounded-xl bg-teal-950/70 border border-teal-500/30 flex items-center space-x-1.5 shrink-0 text-[11px] whitespace-nowrap">
              <Shirt className="w-3.5 h-3.5 text-teal-400" />
              <span className="text-teal-300">เสื้อ:</span>
              <strong className="text-teal-300 font-mono">{shirtReceivedCount}/{shirtTotalCount}</strong>
            </div>

            {/* Divider */}
            <div className="h-5 w-[1px] bg-white/10 shrink-0" />

            {/* 5. ซิงค์ Cloud */}
            {onForceSyncCloud && (
              <button
                type="button"
                onClick={handleManualSync}
                className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-sm shrink-0 whitespace-nowrap cursor-pointer ${
                  isSyncing 
                    ? "bg-emerald-500/30 border-emerald-400 text-emerald-200 animate-pulse" 
                    : "bg-emerald-950/80 hover:bg-emerald-900 border-emerald-500/40 text-emerald-300 hover:text-white"
                }`}
                title={`ซิงค์ข้อมูล Cloud ล่าสุด (${lastCloudSync ? lastCloudSync.toLocaleTimeString('th-TH') : 'เรียลไทม์'})`}
              >
                <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isSyncing ? "animate-spin" : ""}`} />
                <span className="text-[11px]">ซิงค์</span>
              </button>
            )}

            {/* 6. ตั้งค่า */}
            <button
              type="button"
              onClick={onGoToSettings}
              className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-xs font-semibold text-slate-300 hover:text-white transition-all shadow-sm flex items-center space-x-1 shrink-0 whitespace-nowrap cursor-pointer"
              title="ไปยังหน้าตั้งค่าระบบ (แอดมิน)"
            >
              <Settings className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[11px]">ตั้งค่า</span>
            </button>

            {/* 7. หน้าบ้าน */}
            <button
              type="button"
              onClick={onSwitchToPublicForm}
              className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all flex items-center space-x-1 shrink-0 whitespace-nowrap cursor-pointer"
              title="ไปยังหน้าฟอร์มลงทะเบียน (หน้าบ้าน)"
            >
              <Globe className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[11px]">หน้าบ้าน</span>
            </button>

            {/* 8. เสียงเพลงบรรเลง & เอฟเฟกต์ */}
            <button
              type="button"
              onClick={handleToggleSound}
              className={`p-1.5 sm:p-2 rounded-xl border text-xs transition-all shrink-0 cursor-pointer ${
                isMusicPlaying 
                  ? "bg-amber-500/20 border-amber-500/40 text-amber-300 shadow-sm shadow-amber-500/20 hover:bg-amber-500/30" 
                  : "bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10"
              }`}
              title={isMusicPlaying ? "กดเพื่อปิดเสียงเพลงบรรเลง & เอฟเฟกต์ (กำลังเปิด)" : "กดเพื่อเปิดเสียงเพลงบรรเลง & เอฟเฟกต์ (ปิดอยู่)"}
              aria-label={isMusicPlaying ? "ปิดเสียงเพลง" : "เปิดเสียงเพลง"}
            >
              {isMusicPlaying ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>
        </header>

        {/* 6 Main Tabs Header (Pinned directly under header) */}
        <div className="bg-slate-900/95 px-3 sm:px-6">
          <div className="max-w-7xl mx-auto flex items-center space-x-1.5 sm:space-x-2.5 overflow-x-auto py-2 scrollbar-none">
            
            {/* Tab 1: ลงทะเบียนเข้างาน */}
            <button
              type="button"
              onClick={() => setActiveMainTab("checkin")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer ${
                activeMainTab === "checkin"
                  ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>ลงทะเบียนเข้างาน ({checkedInCount}/{totalCount})</span>
            </button>

            {/* Tab 2: เลือกโต๊ะ/ที่นั่ง */}
            <button
              type="button"
              onClick={() => setActiveMainTab("seating")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer ${
                activeMainTab === "seating"
                  ? "bg-sky-500 text-slate-950 shadow-md shadow-sky-500/30"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Armchair className="w-4 h-4" />
              <span>เลือกโต๊ะ/ที่นั่ง ({seatingStats.bookedCount}/{seatingStats.openCapacity})</span>
              {seatingStats.pendingChangeRequestCount > 0 && (
                <span
                  className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black leading-none animate-pulse"
                  title="มีคำขอเปลี่ยนที่นั่งรอเจ้าของแอปอนุมัติ"
                >
                  {seatingStats.pendingChangeRequestCount}
                </span>
              )}
            </button>

            {/* Tab 2: ลงทะเบียนจับของขวัญ */}
            <button
              type="button"
              onClick={() => setActiveMainTab("gifts")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer ${
                activeMainTab === "gifts"
                  ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Gift className="w-4 h-4" />
              <span>ลงทะเบียนจับของขวัญ ({giftCount})</span>
            </button>

            {/* Tab 3: ลงทะเบียนรับเสื้อ */}
            <button
              type="button"
              onClick={() => setActiveMainTab("shirts")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer ${
                activeMainTab === "shirts"
                  ? "bg-teal-500 text-slate-950 shadow-md shadow-teal-500/30"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Shirt className="w-4 h-4" />
              <span>ลงทะเบียนรับเสื้อ ({shirtReceivedCount}/{shirtTotalCount})</span>
            </button>

            {/* Tab 4: การประกวดการแข่งขัน */}
            <button
              type="button"
              onClick={() => setActiveMainTab("contest")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer ${
                activeMainTab === "contest"
                  ? "bg-rose-500 text-white shadow-md shadow-rose-500/30"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Crown className="w-4 h-4" />
              <span>การประกวดการแข่งขัน</span>
              {eventConfig?.isVotingOpen && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="ระบบโหวตกำลังเปิดอยู่"></span>
              )}
            </button>

            {/* Tab 5: Random จับของรางวัล */}
            <button
              type="button"
              onClick={() => setActiveMainTab("lucky_draw")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer ${
                activeMainTab === "lucky_draw"
                  ? "bg-indigo-500 text-white shadow-md shadow-indigo-500/30"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Dices className="w-4 h-4" />
              <span>Random จับของรางวัล</span>
            </button>

            {/* Tab 6: แบบประเมินความพึงพอใจ */}
            <button
              type="button"
              onClick={() => setActiveMainTab("survey")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer ${
                activeMainTab === "survey"
                  ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Star className="w-4 h-4" />
              <span>แบบประเมินความพึงพอใจ ({surveyStats.total})</span>
              {eventConfig?.isSurveyOpen && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="ระบบประเมินกำลังเปิดอยู่"></span>
              )}
            </button>

          </div>
        </div>
      </div>

      {/* ========================================================== */}
      {/* WORKSPACE AREA UNDER THE TABS (CLEAN & OFFICIAL WHITE THEME) */}
      {/* ========================================================== */}
      <div className="flex-1 bg-slate-100 text-slate-800 min-h-screen">

      {/* ========================================================== */}
      {/* TAB 1: แถบลงทะเบียนเข้า (CHECK-IN)                         */}
      {/* ========================================================== */}
      {activeMainTab === "checkin" && (
        <main className="max-w-7xl w-full mx-auto p-3 sm:p-6 space-y-4">
          
          {/* Top Action & Filter Toolbar (Clean White Card) */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-sm space-y-3.5">
            
            {/* Row 1: Full-Width Camera Scanner CTA */}
            <div>
              <button
                type="button"
                onClick={() => setIsScannerOpen(true)}
                className="w-full flex flex-col items-center justify-center gap-2 px-6 py-6 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black shadow-lg shadow-emerald-600/25 active:scale-[0.99] transition-all cursor-pointer"
              >
                <Camera className="w-10 h-10 sm:w-11 sm:h-11 text-white stroke-[2.2]" />
                <span className="text-lg sm:text-xl tracking-wide leading-tight">สแกนบัตรเข้างาน</span>
              </button>
            </div>

            {/* Row 2: Interactive Filter Button Bars (แถบปุ่มเลือกสถานะและสังกัด - บรรทัดเดียวไม่ตัดบรรทัด) */}
            <div className="pt-3 border-t border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
              
              {/* 1. แถบปุ่มสถานะเข้างาน (Single Line, Never Wraps) */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scrollbar-none pb-0.5 max-w-full">
                <span className="text-[11px] font-bold text-slate-500 flex items-center space-x-1 shrink-0 whitespace-nowrap">
                  <Filter className="w-3.5 h-3.5 text-emerald-600" />
                  <span>สถานะ:</span>
                </span>
                <div className="inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200/80 shadow-inner gap-1 shrink-0 flex-nowrap">
                  {/* สถานะทั้งหมด */}
                  <button
                    type="button"
                    onClick={() => setFilterCheckInStatus("all")}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1 shrink-0 whitespace-nowrap cursor-pointer ${
                      filterCheckInStatus === "all"
                        ? "bg-white text-slate-900 shadow-sm border border-slate-200 font-bold"
                        : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                    }`}
                  >
                    <span>ทั้งหมด</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      filterCheckInStatus === "all" ? "bg-slate-100 text-slate-800 font-bold" : "bg-slate-200 text-slate-600"
                    }`}>
                      {totalCount}
                    </span>
                  </button>

                  {/* เข้างานแล้ว */}
                  <button
                    type="button"
                    onClick={() => setFilterCheckInStatus("checked_in")}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1 shrink-0 whitespace-nowrap cursor-pointer ${
                      filterCheckInStatus === "checked_in"
                        ? "bg-emerald-600 text-white font-extrabold shadow-sm"
                        : "text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50"
                    }`}
                  >
                    <span>🟢 เข้างาน</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      filterCheckInStatus === "checked_in" ? "bg-emerald-700 text-white font-extrabold" : "bg-emerald-100 text-emerald-800 font-bold"
                    }`}>
                      {checkedInList.length}
                    </span>
                  </button>

                  {/* ยังไม่เข้างาน */}
                  <button
                    type="button"
                    onClick={() => setFilterCheckInStatus("not_checked_in")}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1 shrink-0 whitespace-nowrap cursor-pointer ${
                      filterCheckInStatus === "not_checked_in"
                        ? "bg-amber-500 text-slate-950 font-extrabold shadow-sm"
                        : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                    }`}
                  >
                    <span>⚪ ยังไม่เข้า</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      filterCheckInStatus === "not_checked_in" ? "bg-amber-600/30 text-slate-950 font-extrabold" : "bg-slate-200 text-slate-600"
                    }`}>
                      {Math.max(0, totalCount - checkedInList.length)}
                    </span>
                  </button>
                </div>
              </div>

              {/* 2. แถบปุ่มสังกัด (Single Line, Never Wraps) */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scrollbar-none pb-0.5 max-w-full">
                <span className="text-[11px] font-bold text-slate-500 flex items-center space-x-1 shrink-0 whitespace-nowrap">
                  <Users className="w-3.5 h-3.5 text-indigo-600" />
                  <span>สังกัด:</span>
                </span>
                <div className="inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200/80 shadow-inner gap-1 shrink-0 flex-nowrap">
                  {/* ทุกสังกัด */}
                  <button
                    type="button"
                    onClick={() => setFilterCheckInClub("all")}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1 shrink-0 whitespace-nowrap cursor-pointer ${
                      filterCheckInClub === "all"
                        ? "bg-white text-slate-900 shadow-sm border border-slate-200 font-bold"
                        : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                    }`}
                  >
                    <span>ทุกสังกัด</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      filterCheckInClub === "all" ? "bg-slate-100 text-slate-800 font-bold" : "bg-slate-200 text-slate-600"
                    }`}>
                      {totalCount}
                    </span>
                  </button>

                  {/* สมาชิกสงสพัท */}
                  <button
                    type="button"
                    onClick={() => setFilterCheckInClub("สงสพัท")}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1 shrink-0 whitespace-nowrap cursor-pointer ${
                      filterCheckInClub === "สงสพัท"
                        ? "bg-indigo-600 text-white font-extrabold shadow-sm"
                        : "text-indigo-700 hover:text-indigo-800 hover:bg-indigo-50"
                    }`}
                  >
                    <span>สงสพัท</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      filterCheckInClub === "สงสพัท" ? "bg-indigo-700 text-white font-extrabold" : "bg-indigo-100 text-indigo-800 font-bold"
                    }`}>
                      {countSongSapat}
                    </span>
                  </button>

                  {/* สมาชิกโรตารี่ */}
                  <button
                    type="button"
                    onClick={() => setFilterCheckInClub("โรตารี่")}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1 shrink-0 whitespace-nowrap cursor-pointer ${
                      filterCheckInClub === "โรตารี่"
                        ? "bg-red-600 text-white font-extrabold shadow-sm"
                        : "text-red-700 hover:text-red-800 hover:bg-red-50"
                    }`}
                  >
                    <span>โรตารี่</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      filterCheckInClub === "โรตารี่" ? "bg-red-700 text-white font-extrabold" : "bg-red-100 text-red-800 font-bold"
                    }`}>
                      {countRotary}
                    </span>
                  </button>
                </div>
              </div>

            </div>
          </div>

          {/* Last Check-in Success Notification Banner */}
          {lastCheckInAttendee && (
            <div className="bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-emerald-500/20 border border-emerald-500/40 rounded-2xl p-4 flex items-center justify-between animate-fadeIn shadow-lg">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-bold">
                  ✓
                </div>
                <div>
                  <div className="text-xs font-bold text-emerald-400">
                    เช็คอินเข้างานสำเร็จล่าสุด!
                  </div>
                  <div className="text-base font-extrabold text-white">
                    {lastCheckInAttendee.name} {lastCheckInAttendee.nickname ? `(${lastCheckInAttendee.nickname})` : ""}
                    <span className="ml-2 font-mono text-xs px-2 py-0.5 rounded-md bg-slate-950 text-amber-400 border border-white/10">
                      {lastCheckInAttendee.ticketNo}
                    </span>
                  </div>
                  {lastCheckInAttendee.hasShirt && (
                    <div className="text-xs text-amber-300 font-semibold pt-0.5 flex items-center space-x-1">
                      <Shirt className="w-3.5 h-3.5" />
                      <span>สิทธิพิเศษเสื้อ: ไซซ์ {lastCheckInAttendee.shirtSize} ({lastCheckInAttendee.shirtGender || "ทั่วไป"}) • ส่งมอบเสื้อเรียบร้อย</span>
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setLastCheckInAttendee(null)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Google Sheets Style Table (Clean White Card) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
            
            {/* Sheet Sub-header Bar with Inline Search Box in the middle space */}
            <div className="bg-slate-50/90 px-3 sm:px-4 py-2 border-b border-slate-200 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 text-[11px] sm:text-xs text-slate-500">
              <div className="flex items-center space-x-1.5 shrink-0 font-mono whitespace-nowrap">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="font-bold text-slate-700">Google Sheets View:</span>
                <span className="text-slate-600 hidden md:inline">ตารางรายชื่อผู้ลงทะเบียน (1 ถึง {totalCount})</span>
              </div>

              {/* Compact Search Input positioned right before แสดง X/Y รายการ */}
              <div className="relative flex-1 min-w-[160px] sm:max-w-xs sm:ml-auto order-3 sm:order-2 w-full sm:w-auto">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อ, ชื่อเล่น, เลขที่บัตร, เบอร์โทร..."
                  value={searchCheckIn}
                  onChange={(e) => setSearchCheckIn(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-7 py-1 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition-colors"
                />
                {searchCheckIn && (
                  <button
                    type="button"
                    onClick={() => setSearchCheckIn("")}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                    title="ล้างข้อความค้นหา"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="text-[10px] sm:text-xs text-slate-600 font-semibold font-mono shrink-0 whitespace-nowrap order-2 sm:order-3">
                แสดง {filteredCheckInList.length}/{totalCount} รายการ
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto max-h-[620px] overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 z-10 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-2 sm:py-3 sm:px-3 w-12 sm:w-14 text-center border-r border-slate-200 text-[11px] sm:text-xs">ลำดับ</th>
                    <th className="py-2.5 px-2.5 sm:py-3 sm:px-3.5 w-20 sm:w-24 border-r border-slate-200 text-[11px] sm:text-xs">เลขที่บัตร</th>
                    <th className="py-2.5 px-2.5 sm:py-3 sm:px-3.5 border-r border-slate-200 min-w-[125px] sm:min-w-[145px] text-[11px] sm:text-xs">วัน-เวลาลงทะเบียน</th>
                    <th className="py-2.5 px-1.5 sm:py-3 sm:px-2 w-14 sm:w-16 text-center border-r border-slate-200 text-[11px] sm:text-xs">รูปถ่าย</th>
                    <th className="py-2.5 px-3 sm:py-3 sm:px-4 border-r border-slate-200 min-w-[140px] sm:min-w-[180px] text-[11px] sm:text-xs">ชื่อ - นามสกุล (ชื่อเล่น)</th>
                    <th className="py-2.5 px-2.5 sm:py-3 sm:px-3.5 border-r border-slate-200 min-w-[100px] sm:min-w-[120px] text-[11px] sm:text-xs">ประเภท / สังกัด</th>
                    <th className="py-2.5 px-2.5 sm:py-3 sm:px-3.5 border-r border-slate-200 text-[11px] sm:text-xs">เบอร์โทรศัพท์</th>
                    <th className="py-2.5 px-1.5 sm:py-3 sm:px-2 w-12 sm:w-14 text-center border-r border-slate-200 text-[11px] sm:text-xs">สลิป</th>
                    <th className="py-2.5 px-2.5 sm:py-3 sm:px-3.5 border-r border-slate-200 text-[11px] sm:text-xs">เสื้อที่ระลึก</th>
                    <th className="py-2.5 px-3 sm:py-3 sm:px-4 border-r border-slate-200 min-w-[130px] sm:min-w-[150px] text-[11px] sm:text-xs">สถานะเข้างาน</th>
                    <th className="py-2.5 px-2.5 sm:py-3 sm:px-3.5 border-r border-slate-200 text-center min-w-[100px] text-[11px] sm:text-xs">โต๊ะ / ที่นั่ง</th>
                    <th className="py-2.5 px-2 sm:py-3 sm:px-3.5 border-r border-slate-200 text-center text-[11px] sm:text-xs">ของขวัญ</th>
                    <th className="py-2.5 px-2 sm:py-3 sm:px-3 text-center text-[11px] sm:text-xs">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCheckInList.map((r, idx) => {
                    const isCheckedIn = !!r.checkedIn;
                    return (
                      <tr 
                        key={r.ticketNo || idx}
                        onClick={() => setInspectingAttendee(r)}
                        className={`cursor-pointer hover:bg-amber-50/70 active:bg-amber-100/60 transition-colors group text-slate-800 ${
                          isCheckedIn ? "bg-emerald-50/40" : "bg-white"
                        }`}
                        title="แตะเพื่อดูข้อมูลการลงทะเบียนและสลิปธนาคาร"
                      >
                        {/* 1. ลำดับ */}
                        <td className="py-2 px-2 sm:py-2.5 sm:px-3 text-center font-mono text-slate-400 border-r border-slate-100 text-[11px] sm:text-xs">
                          {idx + 1}
                        </td>

                        {/* 2. เลขที่บัตร */}
                        <td className="py-2 px-2.5 sm:py-2.5 sm:px-3.5 font-mono font-bold text-amber-700 border-r border-slate-100 text-[11px] sm:text-xs whitespace-nowrap">
                          {r.ticketNo || "SME-001"}
                        </td>

                        {/* 2.2 วัน-เวลาลงทะเบียน */}
                        <td className="py-2 px-2.5 sm:py-2.5 sm:px-3.5 border-r border-slate-100 text-[10px] sm:text-[11px] text-slate-500 font-mono whitespace-nowrap">
                          <div className="flex items-center space-x-1 text-slate-500">
                            <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                            <span>{formatThaiDisplayDateTime(r.createdAt || r.timestamp || r.slipUploadedAt)}</span>
                          </div>
                        </td>

                        {/* 2.5 รูปถ่าย (1:1) */}
                        <td className="py-2 px-1.5 sm:py-2 sm:px-2 text-center border-r border-slate-100">
                          {r.photoUrl ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPhotoViewerTab('checkin');
                                setPhotoViewerTarget(r);
                              }}
                              className="relative inline-block cursor-pointer group hover:scale-110 active:scale-95 transition-all mx-auto"
                              title="คลิกเพื่อดูรูปถ่ายเข้างานขนาดใหญ่"
                            >
                              <img
                                src={r.photoUrl}
                                alt={r.name}
                                className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl object-cover border-2 border-amber-400/80 shadow-xs mx-auto group-hover:border-amber-500"
                              />
                              <span className="absolute -bottom-1 -right-1 px-1 py-0.5 rounded-full bg-slate-900 border border-amber-400 text-[9px] text-amber-300 shadow leading-none font-bold">
                                🔍
                              </span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openPhotoModal(r, 'checkin');
                              }}
                              className="p-1.5 px-2 rounded-xl bg-slate-100 hover:bg-emerald-100 text-slate-600 hover:text-emerald-700 border border-slate-200 transition-all inline-flex items-center space-x-1 cursor-pointer"
                              title="ถ่ายรูปผู้เข้าร่วมงาน (สัดส่วน 1:1)"
                            >
                              <Camera className="w-3.5 h-3.5" />
                              <span className="text-[10px] font-bold">ถ่าย</span>
                            </button>
                          )}
                        </td>

                        {/* 3. ชื่อ - นามสกุล */}
                        <td className="py-2 px-3 sm:py-2.5 sm:px-4 font-semibold text-slate-900 border-r border-slate-100 text-[11px] sm:text-xs">
                          <div className="flex items-center space-x-1.5 group-hover:text-amber-800 transition-colors">
                            <span className="underline-offset-2 group-hover:underline">{r.name}</span>
                            {r.nickname && (
                              <span className="text-amber-700 font-normal text-[10px] sm:text-[11px]">
                                ({r.nickname})
                              </span>
                            )}
                          </div>
                          {r.email && (
                            <div className="text-[9px] sm:text-[10px] text-slate-400 font-normal truncate max-w-[160px]">
                              {r.email}
                            </div>
                          )}
                        </td>

                        {/* 4. สังกัด */}
                        <td className="py-2 px-2.5 sm:py-2.5 sm:px-3.5 border-r border-slate-100 text-[11px] sm:text-xs">
                          {r.regType === "member" ? (
                            (r.club || '').includes('โรตารี่') ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200 shadow-xs whitespace-nowrap">
                                สมาชิก{r.club}
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 whitespace-nowrap">
                                สมาชิก{r.club || "สงสพัท"}
                              </span>
                            )
                          ) : (
                            <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
                              แขกผู้มีเกียรติ {r.club && `(${r.club})`}
                            </span>
                          )}
                        </td>

                        {/* 5. เบอร์โทร */}
                        <td className="py-2 px-2.5 sm:py-2.5 sm:px-3.5 font-mono text-slate-600 border-r border-slate-100 text-[11px] sm:text-xs whitespace-nowrap">
                          {r.phone || "-"}
                        </td>

                        {/* 5.5 สลิปโอนเงิน */}
                        <td className="py-2 px-1.5 sm:py-2 sm:px-2 text-center border-r border-slate-100">
                          {r.slipUrl || r.paymentSlip ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setInspectingAttendee(r);
                              }}
                              className="relative inline-block cursor-pointer group/slip hover:scale-110 active:scale-95 transition-all mx-auto"
                              title="คลิกเพื่อตรวจสลิปโอนเงิน"
                            >
                              <img
                                src={r.slipUrl || r.paymentSlip}
                                alt="Slip"
                                className="w-8 h-8 rounded-lg object-cover border border-slate-200 shadow-xs mx-auto group-hover/slip:border-amber-400"
                              />
                              <span className="absolute -bottom-1 -right-1 px-1 py-0.2 rounded-full bg-slate-900 border border-amber-400 text-[8px] text-amber-300 leading-none font-bold">
                                🧾
                              </span>
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400">-</span>
                          )}
                        </td>

                        {/* 6. เสื้อที่ระลึก */}
                        <td className="py-2 px-2.5 sm:py-2.5 sm:px-3.5 border-r border-slate-100 text-[11px] sm:text-xs whitespace-nowrap">
                          {r.hasShirt ? (
                            <span className="text-amber-800 font-semibold text-[10px] sm:text-[11px] flex items-center space-x-1">
                              <Shirt className="w-3 h-3 text-amber-600" />
                              <span>{r.shirtSize} ({r.shirtGender || "ทั่วไป"})</span>
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>

                        {/* 7. สถานะเข้างาน */}
                        <td className="py-2 px-3 sm:py-2.5 sm:px-4 border-r border-slate-100 whitespace-nowrap">
                          {isCheckedIn ? (
                            <div className="inline-flex items-center space-x-1 sm:space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] sm:text-[11px] font-bold shadow-xs">
                              <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-600" />
                              <span>เข้างานแล้ว {r.checkedInAt ? `(${r.checkedInAt})` : ""}</span>
                            </div>
                          ) : (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 text-[10px] sm:text-[11px] font-medium border border-slate-200">
                              <span>⏳ ยังไม่เข้างาน</span>
                            </span>
                          )}
                        </td>

                        {/* 7.5 โต๊ะ / ที่นั่ง */}
                        <td className="py-2 px-2 sm:py-2.5 sm:px-3 text-center border-r border-slate-100 whitespace-nowrap">
                          {(() => {
                            const sInfo = attendeeSeatMap.get(r.ticketNo);
                            const hasReq = Boolean(seatingPlan?.seatChangeRequests?.[r.ticketNo]);
                            const unpaidFine = getUnpaidFineForTicket(seatingPlan, r.ticketNo, seatingNowMs);
                            if (!sInfo && unpaidFine) {
                              return (
                                <span
                                  title={`มาไม่ทันเวลาจองล่วงหน้า ${unpaidFine.count} ครั้ง รวมปรับ ${unpaidFine.totalFineAmount} บาท`}
                                  className="inline-flex items-center px-2 py-0.5 rounded-lg bg-rose-100 text-rose-800 border border-rose-300 text-[10px] font-black"
                                >
                                  ⚠️ ค้างปรับ {Number(unpaidFine.totalFineAmount).toLocaleString()}฿
                                  {unpaidFine.count > 1 ? ` (${unpaidFine.count} ครั้ง)` : ""}
                                </span>
                              );
                            }
                            if (!sInfo) return <span className="text-slate-400 text-xs">-</span>;
                            return (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMainTab("seating");
                                }}
                                title="คลิกเพื่อดูตำแหน่งโต๊ะบนผังห้อง"
                                className={`inline-flex flex-col items-center px-2 py-0.5 rounded-lg border text-[10px] sm:text-[11px] font-black cursor-pointer transition-all hover:scale-105 ${
                                  sInfo.status === "hold"
                                    ? sInfo.isVipGuest
                                      ? "bg-violet-100 text-violet-900 border-violet-300"
                                      : "bg-amber-100 text-amber-900 border-amber-300"
                                    : "bg-sky-100 text-sky-900 border-sky-300"
                                }`}
                              >
                                <span>
                                  {sInfo.status === "hold" ? (sInfo.isVipGuest ? "👑 " : "⏳ ") : "🪑 "}
                                  {sInfo.seatCode}
                                </span>
                                {sInfo.status === "hold" && (
                                  <span className="text-[9px] font-mono text-amber-700 leading-none">
                                    {formatCountdownMmSs(sInfo.remainingMs)}
                                  </span>
                                )}
                                {hasReq && (
                                  <span className="text-[8px] text-rose-600 font-bold leading-none mt-0.5">
                                    รอเปลี่ยน
                                  </span>
                                )}
                              </button>
                            );
                          })()}
                        </td>

                        {/* 8. สถานะของขวัญ */}
                        <td className="py-2 px-2 sm:py-2.5 sm:px-3.5 text-center border-r border-slate-100 whitespace-nowrap">
                          {r.giftNumber ? (
                            <span className="font-mono font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-300 text-[10px] sm:text-xs">
                              🎁 #{r.giftNumber}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>

                        {/* 9. การจัดการ */}
                        <td className="py-2 px-2 sm:py-2.5 sm:px-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center space-x-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setInspectingAttendee(r);
                              }}
                              className="text-[9px] sm:text-[10px] px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-all font-semibold inline-flex items-center space-x-1 cursor-pointer"
                              title="เปิดดูข้อมูลที่กรอกและสลิปธนาคาร"
                            >
                              <Eye className="w-3 h-3 text-indigo-600" />
                              <span>ตรวจข้อมูล</span>
                            </button>

                            {isCheckedIn ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (window.confirm(`ต้องการยกเลิกสถานะเข้างานของคุณ ${r.name} ใช่หรือไม่?`)) {
                                    onCheckIn(r.ticketNo, false);
                                  }
                                }}
                                className="text-[9px] sm:text-[10px] px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-all cursor-pointer font-medium"
                                title="ยกเลิกการเช็คอิน"
                              >
                                ยกเลิก
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEmergencyTarget(r);
                                }}
                                className="text-[9px] sm:text-[10px] px-2 sm:px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all shadow-xs cursor-pointer"
                                title="กดเช็คอินกรณีฉุกเฉิน (ผู้ร่วมงานไม่ได้บันทึกภาพบัตรมา)"
                              >
                                ⚡ เช็คอิน
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {filteredCheckInList.length === 0 && (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <Search className="w-8 h-8 mx-auto opacity-30" />
                  <p>ไม่พบรายชื่อผู้ลงทะเบียนที่ตรงกับเงื่อนไขการค้นหา</p>
                </div>
              )}
            </div>
          </div>
        </main>
      )}

      {/* ========================================================== */}
      {/* TAB 2: เลือกโต๊ะ/ที่นั่ง (TABLE & SEAT RESERVATION HUB)      */}
      {/* ========================================================== */}
      {activeMainTab === "seating" && (
        <TableSeatingHub
          seatingPlan={seatingPlan}
          onUpdateSeatingPlan={handleUpdateSeatingPlan}
          registrations={registrations}
          sponsors={sponsors}
          currentUser={currentUser}
          eventConfig={eventConfig}
          onPlayEffect={playAudioEffect}
          initialSelectedTicketNo={preselectedSeatingTicketNo}
          onConsumeInitialSelectedTicket={() => setPreselectedSeatingTicketNo(null)}
          onGoToTableLuckyDraw={() => {
            setDrawSubTab("table_seat");
            setCurrentWinner(null);
            setDisplayedCandidate(null);
            setActiveMainTab("lucky_draw");
          }}
        />
      )}

      {/* ========================================================== */}
      {/* TAB 3: แถบลงทะเบียนจับของขวัญ (GIFT EXCHANGE)              */}
      {/* ========================================================== */}
      {activeMainTab === "gifts" && (
        <main className="max-w-7xl w-full mx-auto p-3 sm:p-6 space-y-4">
          
          {/* Header Card for Gifts (Clean White Card) */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-slate-800">
            <div className="space-y-1">
              <div className="flex items-center space-x-2 flex-wrap">
                <Gift className="w-5 h-5 text-amber-600 shrink-0" />
                <h2 className="text-base sm:text-xl font-black text-slate-900 whitespace-nowrap">
                  ตารางลงทะเบียนจับของขวัญปีใหม่
                </h2>
                <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold border border-amber-300 shrink-0">
                  ลงทะเบียนแล้ว {giftCount} ชิ้น
                </span>
              </div>
              <p className="text-xs text-slate-600">
                เมื่อผู้ร่วมงานนำของขวัญมาส่งที่จุดลงทะเบียน ให้กดปุ่มลอย <strong className="text-amber-700">(+ เพิ่มของขวัญ)</strong> ด้านล่างขวา เพื่อเลือกชื่อและรับหมายเลขของขวัญทันที
              </p>
            </div>
          </div>

          {/* Google Sheets Style Table for Gifts (Clean White Card) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
            <div className="bg-slate-50/90 px-3 sm:px-4 py-2 border-b border-slate-200 flex items-center justify-between gap-2 text-[11px] sm:text-xs text-slate-500 font-mono overflow-x-auto no-scrollbar scrollbar-none whitespace-nowrap">
              <div className="flex items-center space-x-1.5 shrink-0">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                <span className="font-bold text-slate-700">Google Sheets View:</span>
                <span className="text-slate-600 hidden sm:inline">ตารางหมายเลขของขวัญ (1 ถึง {giftCount > 0 ? giftCount : "..."})</span>
              </div>
              <div className="text-[10px] sm:text-xs text-amber-700 font-bold shrink-0">
                ทั้งหมด {giftCount} ชิ้น
              </div>
            </div>

            {giftList.length > 0 ? (
              <div className="overflow-x-auto max-h-[620px] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 z-10 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-2.5 sm:py-3 sm:px-4 w-24 sm:w-28 text-center border-r border-slate-200 text-[11px] sm:text-xs">หมายเลขของขวัญ</th>
                      <th className="py-2.5 px-2.5 sm:py-3 sm:px-3.5 w-20 sm:w-24 border-r border-slate-200 text-[11px] sm:text-xs">เลขที่บัตร</th>
                      <th className="py-2.5 px-3 sm:py-3 sm:px-4 border-r border-slate-200 min-w-[140px] sm:min-w-[180px] text-[11px] sm:text-xs">ชื่อผู้มอบของขวัญ (ชื่อเล่น)</th>
                      <th className="py-2.5 px-2.5 sm:py-3 sm:px-3.5 border-r border-slate-200 text-[11px] sm:text-xs">สังกัด</th>
                      <th className="py-2.5 px-2.5 sm:py-3 sm:px-3.5 border-r border-slate-200 text-[11px] sm:text-xs">เบอร์โทรศัพท์</th>
                      <th className="py-2.5 px-3 sm:py-3 sm:px-4 border-r border-slate-200 text-[11px] sm:text-xs">เวลาลงทะเบียน</th>
                      <th className="py-2.5 px-2 sm:py-3 sm:px-3 text-center text-[11px] sm:text-xs">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {giftList.map((g) => (
                      <tr key={g.ticketNo} className="hover:bg-amber-50/60 transition-colors text-slate-800">
                        
                        {/* 1. หมายเลขของขวัญ */}
                        <td className="py-2 px-2.5 sm:py-3 sm:px-4 text-center border-r border-slate-100 whitespace-nowrap">
                          <span className="font-mono font-black text-xs sm:text-sm px-2 sm:px-3 py-0.5 sm:py-1 rounded-xl bg-amber-100 text-amber-800 border border-amber-300 shadow-xs">
                            🎁 #{g.giftNumber}
                          </span>
                        </td>

                        {/* 2. เลขที่บัตร */}
                        <td className="py-2 px-2.5 sm:py-3 sm:px-3.5 font-mono font-bold text-amber-700 border-r border-slate-100 text-[11px] sm:text-xs whitespace-nowrap">
                          {g.ticketNo}
                        </td>

                        {/* 3. ชื่อผู้มอบ */}
                        <td className="py-2 px-3 sm:py-3 sm:px-4 font-semibold text-slate-900 border-r border-slate-100 text-[11px] sm:text-xs">
                          <div className="flex items-center space-x-1.5">
                            <span>{g.name}</span>
                            {g.nickname && (
                              <span className="text-amber-700 font-normal text-[10px] sm:text-[11px]">
                                ({g.nickname})
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 4. สังกัด */}
                        <td className="py-2 px-2.5 sm:py-3 sm:px-3.5 border-r border-slate-100 text-slate-600 text-[11px] sm:text-xs whitespace-nowrap">
                          {g.regType === "member" ? `สมาชิก${g.club || "สงสพัท"}` : `แขกผู้มีเกียรติ (${g.club || "ทั่วไป"})`}
                        </td>

                        {/* 5. เบอร์โทร */}
                        <td className="py-2 px-2.5 sm:py-3 sm:px-3.5 font-mono text-slate-600 border-r border-slate-100 text-[11px] sm:text-xs whitespace-nowrap">
                          {g.phone || "-"}
                        </td>

                        {/* 6. เวลาลงทะเบียนของขวัญ */}
                        <td className="py-2 px-3 sm:py-3 sm:px-4 font-mono text-emerald-700 font-bold border-r border-slate-100 text-[10px] sm:text-xs whitespace-nowrap">
                          {g.giftRegisteredAt || "18:00 น."}
                        </td>

                        {/* 7. ลบ / ยกเลิก */}
                        <td className="py-2 px-2 sm:py-3 sm:px-3 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`ต้องการยกเลิกของขวัญหมายเลข #${g.giftNumber} ของคุณ ${g.name} ใช่หรือไม่?`)) {
                                onRemoveGift(g.ticketNo);
                              }
                            }}
                            className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-600 hover:text-rose-800 transition-all cursor-pointer"
                            title="ยกเลิกการลงทะเบียนของขวัญ"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              /* Empty State (Clean White) */
              <div className="py-20 text-center space-y-4 px-4 bg-white">
                <div className="w-16 h-16 rounded-3xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mx-auto shadow-xs">
                  <Gift className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-slate-900">
                    ยังไม่มีผู้ลงทะเบียนจับของขวัญ
                  </h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    เมื่อผู้ร่วมงานนำของขวัญมาส่งที่โต๊ะลงทะเบียน ให้กดปุ่มเครื่องหมายบวก <strong className="text-amber-700 font-bold">(+)</strong> เพื่อเลือกชื่อผู้ร่วมงานและรับหมายเลขของขวัญเรียงลำดับจาก 1 ไปเรื่อยๆ
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsGiftModalOpen(true)}
                  className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/25 hover:scale-105 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>กดตรงนี้เพื่อเริ่มลงทะเบียนของขวัญชิ้นแรก</span>
                </button>
              </div>
            )}
          </div>

          {/* Floating Action Button (+) at Bottom Right */}
          <div className="fixed bottom-6 right-6 z-30">
            <button
              type="button"
              onClick={() => setIsGiftModalOpen(true)}
              className="flex items-center space-x-2 px-5 py-3.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-extrabold text-sm shadow-2xl shadow-amber-500/40 hover:scale-110 active:scale-95 transition-all border-2 border-white/20"
              title="เพิ่มผู้ลงทะเบียนของขวัญ (กดเพื่อรันเลข 1..N)"
            >
              <Plus className="w-5 h-5 stroke-[3]" />
              <span>เพิ่มของขวัญ</span>
            </button>
          </div>
        </main>
      )}

      {/* ========================================================== */}
      {/* TAB 3: ลงทะเบียนรับเสื้อ (SHIRT DISTRIBUTION)             */}
      {/* ========================================================== */}
      {activeMainTab === "shirts" && (
        <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-4">
          
          {/* Header Card for Shirts */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center space-x-2 flex-wrap">
                <Shirt className="w-5 h-5 text-teal-600 shrink-0" />
                <h2 className="text-base sm:text-xl font-black text-slate-900 whitespace-nowrap">
                  ตารางลงทะเบียนรับเสื้อที่ระลึก
                </h2>
                <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 font-bold border border-teal-200 shrink-0">
                  มอบแล้ว {shirtReceivedCount} / {shirtTotalCount} ตัว
                </span>
              </div>
              <p className="text-xs text-slate-600">
                สำหรับผู้เข้าร่วมงานที่ได้รับสิทธิ์เสื้อที่ระลึก ตรวจสอบไซซ์และกดส่งมอบเสื้อ หรือคลิกถ่ายรูป 1:1 เพื่อเตรียมขึ้นสไลด์นำเสนอ
              </p>
            </div>

            {/* Slide Presentation Button */}
            <div className="flex items-center space-x-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsShirtSlideOpen(true)}
                className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs sm:text-sm shadow-md shadow-amber-500/20 hover:scale-105 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
              >
                <Printer className="w-4 h-4 stroke-[2.5]" />
                <span>🖨️ นำเสนอสไลด์ (16:9)</span>
              </button>
            </div>
          </div>

          {/* Search & Status Filters */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="ค้นหาชื่อ, ชื่อเล่น, เลขที่บัตร, เบอร์, ไซซ์เสื้อ..."
                value={searchShirt}
                onChange={(e) => setSearchShirt(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <div className="overflow-x-auto no-scrollbar scrollbar-none pb-0.5 max-w-full">
              <div className="inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200 shadow-inner gap-1 shrink-0 flex-nowrap">
                <button
                  type="button"
                  onClick={() => setFilterShirtStatus("all")}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 shrink-0 whitespace-nowrap cursor-pointer ${
                    filterShirtStatus === "all"
                      ? "bg-white text-slate-900 shadow-sm border border-slate-200 font-bold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                  }`}
                >
                  <span>ทั้งหมด</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    filterShirtStatus === "all" ? "bg-slate-200 text-slate-800 font-bold" : "bg-slate-200/60 text-slate-600"
                  }`}>
                    {shirtTotalCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setFilterShirtStatus("received")}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 shrink-0 whitespace-nowrap cursor-pointer ${
                    filterShirtStatus === "received"
                      ? "bg-emerald-600 text-white font-extrabold shadow-sm"
                      : "text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50"
                  }`}
                >
                  <span>🟢 รับเสื้อแล้ว</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    filterShirtStatus === "received" ? "bg-emerald-800 text-white font-extrabold" : "bg-emerald-100 text-emerald-800 font-bold"
                  }`}>
                    {shirtReceivedCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setFilterShirtStatus("not_received")}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 shrink-0 whitespace-nowrap cursor-pointer ${
                    filterShirtStatus === "not_received"
                      ? "bg-amber-500 text-slate-950 font-extrabold shadow-sm"
                      : "text-amber-700 hover:text-amber-900 hover:bg-amber-50"
                  }`}
                >
                  <span>⏳ ยังไม่ได้รับเสื้อ</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    filterShirtStatus === "not_received" ? "bg-amber-600 text-slate-950 font-extrabold" : "bg-amber-100 text-amber-800 font-bold"
                  }`}>
                    {Math.max(0, shirtTotalCount - shirtReceivedCount)}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Google Sheets Style Table for Shirt Recipients */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-3 sm:px-4 py-2 border-b border-slate-200 flex items-center justify-between gap-2 text-[11px] sm:text-xs text-slate-600 font-mono overflow-x-auto no-scrollbar scrollbar-none whitespace-nowrap">
              <div className="flex items-center space-x-1.5 shrink-0">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-500 shrink-0" />
                <span className="font-bold text-slate-800">Google Sheets View:</span>
                <span className="hidden sm:inline">ตารางผู้ได้รับสิทธิ์เสื้อ ({filteredShirtList.length}/{shirtTotalCount})</span>
              </div>
              <div className="text-[10px] sm:text-xs text-amber-700 font-bold shrink-0">
                คงเหลือ: {shirtTotalCount - shirtReceivedCount} ตัว
              </div>
            </div>

            {filteredShirtList.length > 0 ? (
              <div className="overflow-x-auto max-h-[620px] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 z-10 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-2 sm:py-3 sm:px-3 w-12 sm:w-14 text-center border-r border-slate-200 text-[11px] sm:text-xs">ลำดับ</th>
                      <th className="py-2.5 px-2.5 sm:py-3 sm:px-3.5 w-20 sm:w-24 border-r border-slate-200 text-[11px] sm:text-xs">เลขที่บัตร</th>
                      <th className="py-2.5 px-1.5 sm:py-3 sm:px-2 w-14 sm:w-16 text-center border-r border-slate-200 text-[11px] sm:text-xs">รูปถ่าย</th>
                      <th className="py-2.5 px-3 sm:py-3 sm:px-4 border-r border-slate-200 min-w-[140px] sm:min-w-[180px] text-[11px] sm:text-xs">ชื่อ - นามสกุล (ชื่อเล่น)</th>
                      <th className="py-2.5 px-2.5 sm:py-3 sm:px-3.5 border-r border-slate-200 min-w-[100px] sm:min-w-[120px] text-[11px] sm:text-xs">ประเภท / สังกัด / ผู้เชิญ</th>
                      <th className="py-2.5 px-2.5 sm:py-3 sm:px-3.5 border-r border-slate-200 text-[11px] sm:text-xs">เบอร์โทรศัพท์</th>
                      <th className="py-2.5 px-2.5 sm:py-3 sm:px-3.5 border-r border-slate-200 text-[11px] sm:text-xs">ไซซ์เสื้อที่ระลึก</th>
                      <th className="py-2.5 px-2.5 sm:py-3 sm:px-3.5 border-r border-slate-200 text-center text-[11px] sm:text-xs">เข้างาน</th>
                      <th className="py-2.5 px-3 sm:py-3 sm:px-4 text-center text-[11px] sm:text-xs">สถานะรับเสื้อ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredShirtList.map((r, idx) => {
                      const isReceived = !!r.shirtReceived;
                      return (
                        <tr 
                          key={r.ticketNo} 
                          onClick={() => setInspectingAttendee(r)}
                          className={`cursor-pointer hover:bg-teal-50/60 active:bg-teal-100/60 transition-colors group ${isReceived ? "bg-teal-50/20" : ""}`}
                          title="แตะเพื่อดูข้อมูลการลงทะเบียนและสลิปธนาคาร"
                        >
                          
                          {/* 1. ลำดับ */}
                          <td className="py-2 px-2 sm:py-2.5 sm:px-3 text-center font-mono text-slate-500 border-r border-slate-100 text-[11px] sm:text-xs">
                            {idx + 1}
                          </td>

                          {/* 2. เลขที่บัตร */}
                          <td className="py-2 px-2.5 sm:py-2.5 sm:px-3.5 font-mono font-bold text-amber-600 border-r border-slate-100 text-[11px] sm:text-xs whitespace-nowrap">
                            {r.ticketNo}
                          </td>

                          {/* 3. รูปถ่ายรับเสื้อ 1:1 */}
                          <td className="py-2 px-1.5 sm:py-2 sm:px-2 text-center border-r border-slate-100">
                            {r.shirtPhoto ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPhotoViewerTab('shirt');
                                  setPhotoViewerTarget(r);
                                }}
                                className="relative inline-block cursor-pointer group hover:scale-110 active:scale-95 transition-all mx-auto"
                                title="คลิกเพื่อดูรูปถ่ายรับเสื้อขนาดใหญ่"
                              >
                                <img
                                  src={r.shirtPhoto}
                                  alt={r.name}
                                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl object-cover border-2 border-teal-500 shadow-sm mx-auto group-hover:border-teal-600"
                                />
                                <span className="absolute -bottom-1 -right-1 px-1 py-0.5 rounded-full bg-slate-900 border border-teal-400/60 text-[9px] text-teal-300 shadow leading-none font-bold">
                                  👕
                                </span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openPhotoModal(r, 'shirt');
                                }}
                                className="p-1 px-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 transition-all flex flex-col items-center justify-center cursor-pointer mx-auto shadow-2xs"
                                title="ถ่ายรูปผู้รับมอบเสื้อ (สัดส่วน 1:1)"
                              >
                                <Camera className="w-3.5 h-3.5 mb-0.5" />
                                <span className="text-[9px] font-bold whitespace-nowrap leading-none">รูปเสื้อ</span>
                              </button>
                            )}
                          </td>

                          {/* 4. ชื่อ - สกุล */}
                          <td className="py-2 px-3 sm:py-2.5 sm:px-4 font-semibold text-slate-800 border-r border-slate-100 text-[11px] sm:text-xs">
                            <div className="flex items-center space-x-1.5 group-hover:text-amber-600 transition-colors">
                              <span className="underline-offset-2 group-hover:underline">{r.name}</span>
                              {r.nickname && (
                                <span className="text-amber-600 font-normal text-[10px] sm:text-[11px]">
                                  ({r.nickname})
                                </span>
                              )}
                            </div>
                            {r.email && (
                              <div className="text-[9px] sm:text-[10px] text-slate-500 font-normal truncate max-w-[160px]">
                                {r.email}
                              </div>
                            )}
                          </td>

                          {/* 5. สังกัด */}
                          <td className="py-2 px-2.5 sm:py-2.5 sm:px-3.5 border-r border-slate-100 text-[11px] sm:text-xs">
                            {r.regType === "member" ? (
                              (r.club || '').includes('โรตารี่') ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-extrabold bg-red-50 text-red-700 border border-red-200 whitespace-nowrap">
                                  สมาชิก{r.club}
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 whitespace-nowrap">
                                  สมาชิก{r.club || "สงสพัท"}
                                </span>
                              )
                            ) : (
                              <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
                                แขก {r.club && `(${r.club})`}
                              </span>
                            )}
                          </td>

                          {/* 6. เบอร์โทร */}
                          <td className="py-2 px-2.5 sm:py-2.5 sm:px-3.5 font-mono text-slate-600 border-r border-slate-100 text-[11px] sm:text-xs whitespace-nowrap">
                            {r.phone || "-"}
                          </td>

                          {/* 7. ไซซ์เสื้อ */}
                          <td className="py-2 px-2.5 sm:py-2.5 sm:px-3.5 border-r border-slate-100 whitespace-nowrap">
                            <span className="inline-flex items-center space-x-1 font-mono font-bold px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-[10px] sm:text-xs">
                              <Shirt className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-amber-600" />
                              <span>ไซซ์ {r.shirtSize} ({r.shirtGender || "ทั่วไป"})</span>
                            </span>
                          </td>

                          {/* 8. สถานะเข้างาน */}
                          <td className="py-2 px-2.5 sm:py-2.5 sm:px-3.5 text-center border-r border-slate-100 whitespace-nowrap">
                            {r.checkedIn ? (
                              <span className="text-emerald-700 font-bold text-[10px] sm:text-[11px]">✓ เข้างาน</span>
                            ) : (
                              <span className="text-slate-400 text-[10px] sm:text-[11px]">ยังไม่เข้า</span>
                            )}
                          </td>

                          {/* 9. ส่งมอบเสื้อ */}
                          <td className="py-2 px-3 sm:py-2.5 sm:px-4 text-center whitespace-nowrap">
                            {isReceived ? (
                              <div className="inline-flex items-center space-x-1.5 sm:space-x-2">
                                <span className="inline-flex items-center space-x-1 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 text-[10px] sm:text-xs shadow-xs">
                                  <CheckCircle2 className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-emerald-600" />
                                  <span>รับเสื้อแล้ว ✓</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleShirtReceived(r.ticketNo, false);
                                  }}
                                  className="text-[9px] sm:text-[10px] text-slate-400 hover:text-rose-600 underline transition-colors cursor-pointer"
                                  title="คลิกเพื่อยกเลิกสถานะรับเสื้อหากกดผิด"
                                >
                                  แก้ไข
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onToggleShirtReceived(r.ticketNo, true);
                                  playAudioEffect("fanfare");
                                  openPhotoModal(r, 'shirt');
                                }}
                                className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-white font-bold text-[10px] sm:text-xs shadow-sm shadow-teal-500/20 hover:scale-105 active:scale-95 transition-all inline-flex items-center space-x-1 cursor-pointer"
                                title="ส่งมอบเสื้อและเปิดกล้องถ่ายรูปบุคคลทันที"
                              >
                                <Shirt className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
                                <span>📦 ส่งมอบเสื้อ</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-16 text-center text-slate-400 space-y-3 px-4 bg-white">
                <Shirt className="w-12 h-12 mx-auto opacity-30 text-teal-600" />
                <div className="text-base font-bold text-slate-700">
                  {shirtTotalCount === 0 ? "ไม่มีผู้ลงทะเบียนที่เลือกรับเสื้อที่ระลึก" : "ไม่พบรายชื่อที่ค้นหา"}
                </div>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  ตรวจสอบเงื่อนไขการค้นหา หรือสลับตัวกรองสถานะด้านบนครับ
                </p>
              </div>
            )}
          </div>

        </main>
      )}

      {/* ========================================================== */}
      {/* TAB 4: การประกวดการแข่งขัน (COSTUME CONTEST)               */}
      {/* ========================================================== */}
      {activeMainTab === "contest" && (
        <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-5">
          
          {/* Header Card for Contest */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                <Crown className="w-5 h-5 text-rose-500" />
                <h2 className="text-lg sm:text-xl font-black text-slate-900">
                  การประกวดแต่งกาย SME FAN 2026
                </h2>
                <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 font-bold border border-rose-200">
                  กรรมการลงคะแนนแล้ว {allJudgeVotes.length} ท่าน
                </span>

                {/* Live Voting Status Badge */}
                {eventConfig?.isVotingOpen ? (
                  <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center space-x-1 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>🟢 กำลังเปิดให้โหวตสด (LIVE)</span>
                  </span>
                ) : (
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 flex items-center space-x-1">
                    <Lock className="w-3 h-3 text-slate-500" />
                    <span>🔒 ปิดระบบโหวตอยู่ (รอเปิดระบบ)</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600">
                รองรับประกวดเดี่ยว & กลุ่ม • 2 ประเภทรางวัล (ความสวยงาม & ความคิดสร้างสรรค์) • คะแนนเฉพาะ 5, 4, 3, 2, 1 ห้ามซ้ำ พร้อมบันทึกเหตุผลหากมีการแก้ไข
              </p>
            </div>

            {/* Quick Actions (Clean 2-Col on mobile, Row on Desktop) */}
            <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
              {/* Toggle Voting Open/Close Button */}
              {setEventConfig && (
                <button
                  type="button"
                  onClick={() => {
                    const isCurrentlyOpen = Boolean(eventConfig?.isVotingOpen);
                    const promptMsg = isCurrentlyOpen
                      ? "ต้องการปิดระบบโหวตการประกวดแต่งกายใช่หรือไม่?\n(เมื่อปิดแล้ว สมาชิกทั่วไปจะไม่สามารถส่งคะแนนเพิ่มได้)"
                      : "ต้องการเปิดระบบโหวตการประกวดแต่งกายใช่หรือไม่?\n(เมื่อเปิดแล้ว สมาชิกทุกคนจะสามารถกดปุ่มเริ่มโหวตพร้อมกันได้ทันที เพื่อความยุติธรรม)";
                    if (window.confirm(promptMsg)) {
                      setEventConfig(prev => ({
                        ...prev,
                        isVotingOpen: !isCurrentlyOpen
                      }));
                      playAudioEffect(isCurrentlyOpen ? "beep" : "fanfare");
                    }
                  }}
                  className={`flex items-center justify-center space-x-1 px-3.5 py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer whitespace-nowrap ${
                    eventConfig?.isVotingOpen
                      ? "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20"
                      : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20"
                  }`}
                  title={eventConfig?.isVotingOpen ? "คลิกเพื่อปิดระบบโหวต" : "คลิกเพื่อเปิดระบบให้ทุกคนโหวตพร้อมกัน"}
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>{eventConfig?.isVotingOpen ? "ปิดระบบโหวต" : "เปิดโหวตพร้อมกัน"}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsJudgeModalOpen(true)}
                className="flex items-center justify-center space-x-1 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-400 hover:to-pink-400 text-white font-bold text-xs shadow-sm shadow-rose-500/20 hover:scale-105 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
              >
                <span>หน้าต่างให้คะแนนกรรมการ</span>
              </button>
            </div>
          </div>

          {/* Subtabs Selector (Single Horizontally Scrollable Row with Refresh Button in same line) */}
          <div className="bg-white p-2 rounded-2xl border border-slate-200/90 shadow-sm flex items-center justify-between gap-2 overflow-x-auto no-scrollbar scrollbar-none flex-nowrap">
            <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
              
              <button
                type="button"
                onClick={() => setContestSubTab("leaderboard")}
                className={`flex items-center space-x-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer whitespace-nowrap ${
                  contestSubTab === "leaderboard"
                    ? "bg-rose-500 text-white shadow-md shadow-rose-500/20"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <Trophy className="w-4 h-4" />
                <span>ลีดเดอร์บอร์ด & ผลคะแนน</span>
              </button>

              <button
                type="button"
                onClick={() => setContestSubTab("teams")}
                className={`flex items-center space-x-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer whitespace-nowrap ${
                  contestSubTab === "teams"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <Users className="w-4 h-4" />
                <span>จัดกลุ่มผู้เข้าประกวด ({contestTeams.length} ทีม)</span>
              </button>

              <button
                type="button"
                onClick={() => setContestSubTab("judge_qr")}
                className={`flex items-center space-x-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer whitespace-nowrap ${
                  contestSubTab === "judge_qr"
                    ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-extrabold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <ExternalLink className="w-4 h-4" />
                <span>QR Code กรรมการ ({allJudgeVotes.length})</span>
              </button>

            </div>

            {/* Quick Live Refresh Button in same row */}
            <button
              type="button"
              onClick={() => {
                try {
                  const saved = localStorage.getItem(CONTEST_VOTES_STORAGE_KEY);
                  setAllJudgeVotes(saved ? JSON.parse(saved) : []);
                  playAudioEffect("beep");
                } catch (e) {}
              }}
              className="p-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 text-xs flex items-center space-x-1.5 shrink-0 border border-slate-200 cursor-pointer whitespace-nowrap"
              title="ดึงคะแนนล่าสุดจากกรรมการ"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>รีเฟรชคิวคะแนน</span>
            </button>
          </div>

          {/* SUBTAB 1: LEADERBOARD */}
          {contestSubTab === "leaderboard" && (
            <div className="space-y-6">
              
              {/* Category & Award Filter Controls */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/90 shadow-sm">
                
                {/* Category Switcher: Individual vs Team */}
                <div className="flex items-center space-x-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setContestCategoryView("individual")}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      contestCategoryView === "individual"
                        ? "bg-rose-500 text-white shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <span>👤 ประกวดเดี่ยว</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200/80 text-slate-800 font-mono">
                      {registrations.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setContestCategoryView("team")}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      contestCategoryView === "team"
                        ? "bg-rose-500 text-white shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <span>👥 ประกวดกลุ่ม</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200/80 text-slate-800 font-mono">
                      {contestTeams.length}
                    </span>
                  </button>
                </div>

                {/* Award Type Switcher */}
                <div className="flex items-center space-x-1.5 overflow-x-auto text-xs">
                  <span className="text-slate-500 text-[11px] pr-1">เรียงตาม:</span>
                  <button
                    type="button"
                    onClick={() => setContestAwardView("total")}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                      contestAwardView === "total"
                        ? "bg-amber-500 text-slate-950 shadow-sm"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
                    }`}
                  >
                    🏆 คะแนนรวมสูงสุด
                  </button>
                  <button
                    type="button"
                    onClick={() => setContestAwardView("beauty")}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                      contestAwardView === "beauty"
                        ? "bg-amber-500 text-slate-950 shadow-sm"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
                    }`}
                  >
                    ✨ ความสวยงาม
                  </button>
                  <button
                    type="button"
                    onClick={() => setContestAwardView("creativity")}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                      contestAwardView === "creativity"
                        ? "bg-amber-500 text-slate-950 shadow-sm"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
                    }`}
                  >
                    🎨 ความคิดสร้างสรรค์
                  </button>
                </div>

              </div>

              {/* Top 3 Podium */}
              {(() => {
                const currentPool = contestCategoryView === "individual" ? individualLeaderboard : teamLeaderboard;
                const topScored = currentPool.filter(c => c.overallTotal > 0);
                const first = topScored[0];
                const second = topScored[1];
                const third = topScored[2];

                if (topScored.length === 0) {
                  return (
                    <div className="py-16 text-center space-y-4 bg-slate-900/40 rounded-3xl border border-white/5 p-6">
                      <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mx-auto">
                        <Crown className="w-8 h-8" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-base font-bold text-white">
                          ยังไม่มีคะแนนสำหรับ{contestCategoryView === "individual" ? "การประกวดเดี่ยว" : "การประกวดกลุ่ม"}
                        </h3>
                        <p className="text-xs text-slate-400 max-w-sm mx-auto">
                          ส่ง QR Code ให้คณะกรรมการ หรือคลิกปุ่มด้านล่างเพื่อจำลองการให้คะแนนตามกติกา 5, 4, 3, 2, 1 คะแนน
                        </p>
                      </div>
                      <div className="flex items-center justify-center space-x-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setIsJudgeModalOpen(true)}
                          className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold text-xs shadow-lg hover:scale-105 transition-all"
                        >
                          ⚖️ เปิดหน้าต่างให้คะแนนจำลอง
                        </button>
                        <button
                          type="button"
                          onClick={() => setContestSubTab("judge_qr")}
                          className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold"
                        >
                          📱 ดู QR Code สำหรับกรรมการ
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="bg-gradient-to-b from-slate-900/80 to-slate-950/80 rounded-3xl p-6 sm:p-8 border border-white/10 shadow-2xl relative overflow-hidden">
                    <div className="text-center mb-6">
                      <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        โพเดียมผู้ชนะคะแนนสูงสุด ({contestCategoryView === "individual" ? "ประเภทเดี่ยว" : "ประเภทกลุ่ม"})
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end max-w-4xl mx-auto pt-6">
                      
                      {/* Rank 2 (Silver) */}
                      {second && (
                        <div className="order-2 md:order-1 flex flex-col items-center text-center space-y-3">
                          <div className="relative">
                            {second.photoUrl ? (
                              <img
                                src={second.photoUrl}
                                alt={second.name}
                                className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 border-slate-300 shadow-xl"
                              />
                            ) : (
                              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-slate-800 border-2 border-slate-300 flex items-center justify-center text-slate-400">
                                <Users className="w-8 h-8" />
                              </div>
                            )}
                            <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-slate-300 text-slate-950 font-black flex items-center justify-center shadow-lg text-sm border-2 border-slate-900">
                              2
                            </div>
                          </div>
                          <div>
                            <div className="font-extrabold text-white text-sm sm:text-base">
                              {second.name}
                            </div>
                            <div className="text-xs text-slate-400">
                              {contestCategoryView === "individual" ? second.club : `${second.members?.length || 0} คน`}
                            </div>
                          </div>
                          <div className="w-full bg-gradient-to-t from-slate-800 to-slate-700/60 rounded-2xl p-4 border border-slate-400/30 text-center space-y-1">
                            <div className="text-2xl font-black text-slate-200">
                              {contestAwardView === "beauty" ? second.beautyTotal : contestAwardView === "creativity" ? second.creativityTotal : second.overallTotal}
                              <span className="text-xs font-normal text-slate-400 ml-1">คะแนน</span>
                            </div>
                            <div className="text-[10px] text-slate-300">
                              สวยงาม: {second.beautyTotal} • สร้างสรรค์: {second.creativityTotal}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Rank 1 (Gold) */}
                      {first && (
                        <div className="order-1 md:order-2 flex flex-col items-center text-center space-y-3 -mt-6">
                          <Crown className="w-10 h-10 text-amber-400 animate-bounce" />
                          <div className="relative">
                            {first.photoUrl ? (
                              <img
                                src={first.photoUrl}
                                alt={first.name}
                                className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl object-cover border-4 border-amber-400 shadow-2xl shadow-amber-500/30 ring-4 ring-amber-500/20"
                              />
                            ) : (
                              <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-slate-800 border-4 border-amber-400 flex items-center justify-center text-amber-400 shadow-2xl ring-4 ring-amber-500/20">
                                <Crown className="w-12 h-12" />
                              </div>
                            )}
                            <div className="absolute -top-3 -right-3 w-10 h-10 rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 font-black flex items-center justify-center shadow-xl text-base border-2 border-slate-900">
                              🥇
                            </div>
                          </div>
                          <div>
                            <div className="font-black text-white text-base sm:text-lg">
                              {first.name}
                            </div>
                            <div className="text-xs text-amber-300 font-semibold">
                              {contestCategoryView === "individual" ? first.club : `${first.members?.length || 0} คน`}
                            </div>
                          </div>
                          <div className="w-full bg-gradient-to-t from-amber-950/80 to-amber-900/50 rounded-2xl p-5 border-2 border-amber-400/50 text-center space-y-1 shadow-lg shadow-amber-500/20">
                            <div className="text-3xl font-black text-amber-300">
                              {contestAwardView === "beauty" ? first.beautyTotal : contestAwardView === "creativity" ? first.creativityTotal : first.overallTotal}
                              <span className="text-xs font-normal text-amber-400/80 ml-1">คะแนน</span>
                            </div>
                            <div className="text-[11px] text-amber-200">
                              สวยงาม: {first.beautyTotal} • สร้างสรรค์: {first.creativityTotal}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Rank 3 (Bronze) */}
                      {third && (
                        <div className="order-3 flex flex-col items-center text-center space-y-3">
                          <div className="relative">
                            {third.photoUrl ? (
                              <img
                                src={third.photoUrl}
                                alt={third.name}
                                className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 border-amber-700 shadow-xl"
                              />
                            ) : (
                              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-slate-800 border-2 border-amber-700 flex items-center justify-center text-amber-600">
                                <Users className="w-8 h-8" />
                              </div>
                            )}
                            <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-amber-700 text-white font-black flex items-center justify-center shadow-lg text-sm border-2 border-slate-900">
                              3
                            </div>
                          </div>
                          <div>
                            <div className="font-extrabold text-white text-sm sm:text-base">
                              {third.name}
                            </div>
                            <div className="text-xs text-slate-400">
                              {contestCategoryView === "individual" ? third.club : `${third.members?.length || 0} คน`}
                            </div>
                          </div>
                          <div className="w-full bg-gradient-to-t from-slate-800 to-slate-700/60 rounded-2xl p-4 border border-amber-700/40 text-center space-y-1">
                            <div className="text-2xl font-black text-amber-500">
                              {contestAwardView === "beauty" ? third.beautyTotal : contestAwardView === "creativity" ? third.creativityTotal : third.overallTotal}
                              <span className="text-xs font-normal text-slate-400 ml-1">คะแนน</span>
                            </div>
                            <div className="text-[10px] text-slate-300">
                              สวยงาม: {third.beautyTotal} • สร้างสรรค์: {third.creativityTotal}
                            </div>
                          </div>
                        </div>
                      )}

                    </div>
                  </div>
                );
              })()}

              {/* Detailed Ranking Table (Clean White Card) */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
                <div className="bg-slate-50 px-3 sm:px-4 py-2 border-b border-slate-200 flex items-center justify-between gap-2 text-[11px] sm:text-xs text-slate-600 font-mono overflow-x-auto no-scrollbar scrollbar-none whitespace-nowrap">
                  <div className="flex items-center space-x-2 shrink-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                    <span className="font-bold text-slate-800">
                      ตารางสรุปผลคะแนนรวมคณะกรรมการ ({contestCategoryView === "individual" ? "เดี่ยว" : "กลุ่ม"})
                    </span>
                  </div>
                  <div className="text-[10px] sm:text-xs text-slate-500 font-semibold shrink-0">
                    กรรมการลงคะแนน: {allJudgeVotes.length} ท่าน
                  </div>
                </div>

                <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 z-10 border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-2 sm:py-3 sm:px-3 w-12 sm:w-16 text-center border-r border-slate-200 text-[11px] sm:text-xs">อันดับ</th>
                        <th className="py-2.5 px-1.5 sm:py-3 sm:px-2 w-14 sm:w-16 text-center border-r border-slate-200 text-[11px] sm:text-xs">รูปถ่าย</th>
                        <th className="py-2.5 px-3 sm:py-3 sm:px-4 border-r border-slate-200 min-w-[140px] sm:min-w-[180px] text-[11px] sm:text-xs">ผู้เข้าประกวด</th>
                        <th className="py-2.5 px-2.5 sm:py-3 sm:px-3.5 border-r border-slate-200 min-w-[110px] sm:min-w-[130px] text-[11px] sm:text-xs">สังกัด / สมาชิก</th>
                        <th className="py-2.5 px-2 sm:py-3 sm:px-3.5 border-r border-slate-200 text-center text-[11px] sm:text-xs">ความสวยงาม</th>
                        <th className="py-2.5 px-2 sm:py-3 sm:px-3.5 border-r border-slate-200 text-center text-[11px] sm:text-xs">ความคิดสร้างสรรค์</th>
                        <th className="py-2.5 px-2.5 sm:py-3 sm:px-3.5 border-r border-slate-200 text-center font-bold text-amber-700 text-[11px] sm:text-xs">คะแนนรวม</th>
                        <th className="py-2.5 px-2 sm:py-3 sm:px-3.5 text-center text-[11px] sm:text-xs">กรรมการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {(contestCategoryView === "individual" ? individualLeaderboard : teamLeaderboard).map((item, idx) => (
                        <tr 
                          key={item.id} 
                          className={`hover:bg-amber-50/50 transition-colors ${
                            idx === 0 && item.overallTotal > 0 ? "bg-amber-50/40" : ""
                          }`}
                        >
                          <td className="py-2 px-2 sm:py-3 sm:px-3 text-center font-mono border-r border-slate-100 text-[11px] sm:text-xs">
                            {idx === 0 && item.overallTotal > 0 ? (
                              <span className="text-sm sm:text-base">🥇</span>
                            ) : idx === 1 && item.overallTotal > 0 ? (
                              <span className="text-sm sm:text-base">🥈</span>
                            ) : idx === 2 && item.overallTotal > 0 ? (
                              <span className="text-sm sm:text-base">🥉</span>
                            ) : (
                              <span className="text-slate-500 font-bold">{idx + 1}</span>
                            )}
                          </td>

                          <td className="py-2 px-1.5 sm:py-2 sm:px-2 text-center border-r border-slate-100">
                            {item.photoUrl ? (
                              <img
                                src={item.photoUrl}
                                alt={item.name}
                                className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl object-cover border border-slate-200 shadow-2xs mx-auto"
                              />
                            ) : (
                              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 mx-auto">
                                <Users className="w-4 h-4" />
                              </div>
                            )}
                          </td>

                          {/* ชื่อผู้เข้าประกวด: บรรทัดที่ 1 ชื่อจริงยาวไปเลย, บรรทัดที่ 2 รหัสบัตรเข้า + ชื่อเล่น */}
                          <td className="py-2 px-3 sm:py-2.5 sm:px-4 border-r border-slate-100">
                            <span className="font-bold text-slate-900 whitespace-nowrap block text-xs sm:text-sm">
                              {item.name}
                            </span>
                            <div className="flex items-center space-x-1.5 text-[10px] font-mono text-amber-700 font-bold whitespace-nowrap mt-0.5">
                              {item.ticketNo && <span>{item.ticketNo}</span>}
                              {item.nickname && (
                                <span className="font-sans font-normal text-slate-500">
                                  • ({item.nickname})
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-2 px-2.5 sm:py-3 sm:px-3.5 border-r border-slate-100 text-slate-700 text-[11px] sm:text-xs">
                            {contestCategoryView === "individual" ? (
                              item.club || "สงสพัท"
                            ) : (
                              <span className="text-[10px] sm:text-[11px] text-slate-500 line-clamp-1">
                                {item.members?.map(m => m.name).join(", ") || "-"}
                              </span>
                            )}
                          </td>

                          <td className="py-2 px-2 sm:py-3 sm:px-3.5 text-center border-r border-slate-100 font-mono whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-800 font-bold text-[10px] sm:text-xs">
                              {item.beautyTotal}
                            </span>
                          </td>

                          <td className="py-2 px-2 sm:py-3 sm:px-3.5 text-center border-r border-slate-100 font-mono whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-800 font-bold text-[10px] sm:text-xs">
                              {item.creativityTotal}
                            </span>
                          </td>

                          <td className="py-2 px-2.5 sm:py-3 sm:px-3.5 text-center border-r border-slate-100 font-mono whitespace-nowrap">
                            <span className="px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-xl bg-amber-100 text-amber-800 font-extrabold text-xs sm:text-sm border border-amber-200">
                              {item.overallTotal}
                            </span>
                          </td>

                          <td className="py-2 px-2 sm:py-3 sm:px-3.5 text-center text-slate-500 text-[10px] sm:text-xs whitespace-nowrap">
                            {item.judgesVotedCount} ท่าน
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* SUBTAB 2: TEAM FORMATION */}
          {contestSubTab === "teams" && (
            <div className="space-y-4">
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-2xl border border-white/5">
                <div>
                  <h3 className="font-extrabold text-white text-base">
                    จัดการกลุ่มผู้เข้าประกวด ({contestTeams.length} กลุ่ม)
                  </h3>
                  <p className="text-xs text-slate-400">
                    จัดกลุ่มสมาชิกเพื่อเข้าประกวดประเภทกลุ่ม คณะกรรมการสามารถให้คะแนนทั้งเดี่ยวและกลุ่มได้พร้อมกัน
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsCreateTeamModalOpen(true)}
                  className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-500/25 hover:scale-105 active:scale-95 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>สร้างกลุ่มผู้เข้าประกวด</span>
                </button>
              </div>

              {/* Teams Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {contestTeams.map((team, idx) => (
                  <div key={team.id} className="bg-slate-900/80 rounded-2xl p-5 border border-white/10 hover:border-indigo-500/40 shadow-xl space-y-3 transition-all">
                    
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
                            ทีมที่ #{idx + 1}
                          </span>
                          <span className="text-[10px] text-slate-500">{team.createdAt}</span>
                        </div>
                        <h4 className="text-base font-extrabold text-white mt-1">
                          {team.name}
                        </h4>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteTeam(team.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                        title="ลบกลุ่มนี้"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="pt-2 border-t border-white/5 space-y-2">
                      <div className="text-xs text-slate-400 flex items-center justify-between">
                        <span>สมาชิกในกลุ่ม:</span>
                        <strong className="text-indigo-300">{team.members?.length || 0} คน</strong>
                      </div>

                      <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                        {team.members?.map(m => (
                          <div key={m.ticketNo} className="flex items-center space-x-2 p-1.5 rounded-xl bg-slate-950/70 border border-white/5 text-xs">
                            {m.photoUrl ? (
                              <img src={m.photoUrl} alt={m.name} className="w-6 h-6 rounded-lg object-cover" />
                            ) : (
                              <div className="w-6 h-6 rounded-lg bg-slate-800 flex items-center justify-center text-[10px] text-slate-400">
                                👤
                              </div>
                            )}
                            <div className="truncate flex-1">
                              <span className="font-semibold text-white">{m.name}</span>
                              {m.nickname && <span className="text-amber-400 ml-1">({m.nickname})</span>}
                            </div>
                            <span className="font-mono text-[10px] text-slate-500">{m.ticketNo}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                ))}

                {contestTeams.length === 0 && (
                  <div className="col-span-full py-16 text-center text-slate-500 space-y-3 bg-slate-900/40 rounded-3xl border border-white/5 p-6">
                    <Users className="w-12 h-12 mx-auto opacity-30 text-indigo-400" />
                    <div className="text-base font-bold text-slate-300">
                      ยังไม่มีการสร้างกลุ่มผู้เข้าประกวด
                    </div>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      คลิกปุ่ม &quot;สร้างกลุ่มผู้เข้าประกวด&quot; ด้านบนเพื่อจับกลุ่มสมาชิกที่เช็คอินแล้วเข้าประกวดประเภทกลุ่ม
                    </p>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* SUBTAB 3: JUDGE QR CODE & LOGS */}
          {contestSubTab === "judge_qr" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* QR Code Presentation (Col 5) */}
              <div className="lg:col-span-5 bg-gradient-to-b from-slate-900 to-slate-950 rounded-3xl p-6 sm:p-8 border border-white/10 shadow-2xl flex flex-col items-center text-center space-y-4">
                
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  📱 QR Code หน้าต่างกรรมการ
                </span>

                <div className="p-4 bg-white rounded-3xl shadow-2xl border-4 border-amber-400/50 my-2">
                  {judgeQrUrl ? (
                    <img
                      src={judgeQrUrl}
                      alt="Judge QR Code"
                      className="w-56 h-56 sm:w-64 sm:h-64 object-contain"
                    />
                  ) : (
                    <div className="w-56 h-56 flex items-center justify-center text-slate-400 font-mono text-xs">
                      กำลังสร้าง QR Code...
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <h4 className="font-extrabold text-white text-base">
                    สแกนเพื่อให้คะแนนด้วยมือถือ
                  </h4>
                  <p className="text-xs text-slate-400 max-w-xs">
                    กรรมการสามารถใช้มือถือส่องสแกน QR Code นี้ เพื่อเข้าสู่หน้าต่างให้คะแนนได้ทันทีโดยไม่ต้องล็อกอินแอดมิน
                  </p>
                </div>

                {/* Direct Link & Copy */}
                <div className="w-full flex items-center space-x-2 pt-2">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}/?judge=true`}
                    className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 font-mono focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/?judge=true`);
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 2000);
                    }}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all shrink-0"
                    title="คัดลอกลิงก์"
                  >
                    {copiedLink ? <CheckCheck className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setIsJudgeModalOpen(true)}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs sm:text-sm shadow-xl shadow-amber-500/25 transition-all mt-2"
                >
                  ⚖️ เปิดหน้าต่างให้คะแนนจำลองบนเครื่องนี้
                </button>

              </div>

              {/* Judges Audit Log & Submissions (Col 7) */}
              <div className="lg:col-span-7 bg-slate-900/80 rounded-3xl p-6 border border-white/10 shadow-xl space-y-4">
                
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div className="flex items-center space-x-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                    <div>
                      <h4 className="font-extrabold text-white text-sm sm:text-base">
                        ประวัติการส่งคะแนนจากคณะกรรมการ ({allJudgeVotes.length} ท่าน)
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        พร้อมบันทึกประวัติการแก้ไขคะแนน (Audit Trail)
                      </p>
                    </div>
                  </div>

                  {allJudgeVotes.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm("ต้องการรีเซ็ตผลคะแนนจากกรรมการทั้งหมดเป็น 0 ใช่หรือไม่?")) {
                          setAllJudgeVotes([]);
                          try {
                            localStorage.removeItem(CONTEST_VOTES_STORAGE_KEY);
                          } catch (e) {}
                        }
                      }}
                      className="text-[11px] text-rose-400 hover:text-rose-300 hover:underline"
                    >
                      ล้างคะแนนทั้งหมด
                    </button>
                  )}
                </div>

                {/* Judge Vote Cards */}
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {allJudgeVotes.map((vote, idx) => (
                    <div key={idx} className="bg-slate-950/70 rounded-2xl p-4 border border-white/5 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-400" />
                          <span className="font-bold text-white text-sm">
                            {vote.judgeName || `กรรมการท่านที่ #${idx + 1}`}
                          </span>
                        </div>
                        <span className="font-mono text-xs text-slate-400">
                          {vote.submittedAt || "-"}
                        </span>
                      </div>

                      {/* Audit Trail Logs */}
                      {vote.auditTrail && vote.auditTrail.length > 0 && (
                        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-1">
                          <div className="text-[10px] font-bold text-amber-300">
                            📝 ประวัติการแก้ไขคะแนนของผู้ให้คะแนนท่านนี้:
                          </div>
                          {vote.auditTrail.map((log, lIdx) => (
                            <div key={lIdx} className="text-[11px] text-slate-300 leading-tight">
                              • {log.message || log.reason || JSON.stringify(log)}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  {allJudgeVotes.length === 0 && (
                    <div className="py-12 text-center text-slate-500 space-y-2">
                      <Award className="w-8 h-8 mx-auto opacity-30" />
                      <p>ยังไม่มีกรรมการส่งคะแนนเข้ามา</p>
                    </div>
                  )}
                </div>

              </div>

            </div>
          )}

        </main>
      )}

      {/* ========================================================== */}
      {/* TAB 5: RANDOM จับของรางวัล (LUCKY DRAW HUB)                 */}
      {/* ========================================================== */}
      {activeMainTab === "lucky_draw" && (
        <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
          
          {/* Sub-Tabs Selector */}
          <div className="bg-white p-2 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar scrollbar-none flex-nowrap pb-1 sm:pb-0">
              
              <button
                type="button"
                onClick={() => { setDrawSubTab("general"); setCurrentWinner(null); setSearchDrawPool(""); }}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer whitespace-nowrap ${
                  drawSubTab === "general"
                    ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <Dices className="w-4 h-4" />
                <span>Random ทั่วไป (สุ่มซ้ำได้)</span>
              </button>

              <button
                type="button"
                onClick={() => { setDrawSubTab("grand"); setCurrentWinner(null); setSearchDrawPool(""); }}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer whitespace-nowrap ${
                  drawSubTab === "grand"
                    ? "bg-rose-500 text-white shadow-md shadow-rose-500/20"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <Trophy className="w-4 h-4" />
                <span>Random คัดชื่อออก (รางวัลใหญ่)</span>
              </button>

              <button
                type="button"
                onClick={() => { setDrawSubTab("gift_exclusive"); setCurrentWinner(null); setDisplayedCandidate(null); setSearchDrawPool(""); }}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer whitespace-nowrap ${
                  drawSubTab === "gift_exclusive"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <Gift className="w-4 h-4" />
                <span>Random เฉพาะคนมีของขวัญ</span>
              </button>

              <button
                type="button"
                onClick={() => { setDrawSubTab("table_seat"); setCurrentWinner(null); setDisplayedCandidate(null); setSearchDrawPool(""); }}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer whitespace-nowrap ${
                  drawSubTab === "table_seat"
                    ? "bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <Armchair className="w-4 h-4" />
                <span>Random สุ่มโต๊ะ / เก้าอี้</span>
              </button>

            </div>

            {/* Candidate Pool Indicator (ชนซ้ายขวา เต็มความกว้างบนมือถือ) */}
            <div className="w-full sm:w-auto flex items-center justify-between sm:justify-start px-3.5 py-2 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-700 font-medium">
              <span>โถสุ่มปัจจุบัน:</span>
              <div className="flex items-center space-x-1 ml-2">
                <strong className="text-amber-700 font-mono text-sm font-black">{getCandidatePool().length}</strong>
                <span className="text-slate-500 text-[11px]">
                  {drawSubTab === "table_seat" ? (tableDrawMode === "table" ? "โต๊ะ" : "เก้าอี้") : "ท่าน"}
                </span>
              </div>
            </div>
          </div>

          {/* Main Stage Drawing Arena */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Center Stage (Col 7) */}
            <div className="lg:col-span-7 bg-gradient-to-b from-slate-900/90 to-slate-950/90 rounded-3xl p-6 sm:p-10 border border-white/10 shadow-2xl flex flex-col items-center justify-center text-center relative overflow-hidden min-h-[460px]">
              
              {/* Stage Gold Glow */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />

              {/* Mode description header */}
              <div className="space-y-1 mb-6">
                <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-white/5 text-amber-400 border border-amber-500/30 inline-flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>
                    {drawSubTab === "general" && "โหมดสุ่มทั่วไป (เล่นเกม / ตอบคำถาม / สุ่มซ้ำได้เรื่อยๆ)"}
                    {drawSubTab === "grand" && "โหมดสุ่มรางวัลใหญ่ (ตัดชื่อออกจากโถสุ่มถาวร)"}
                    {drawSubTab === "gift_exclusive" && "โหมดสุ่มคิวจับของขวัญ (เฉพาะผู้ที่นำของขวัญมาแลก)"}
                    {drawSubTab === "table_seat" && (tableDrawMode === "table" ? "โหมดสุ่มโต๊ะนำโชค (รับรางวัลยกโต๊ะ)" : "โหมดสุ่มเก้าอี้นำโชค (ระบุโต๊ะ + หมายเลขเก้าอี้)")}
                  </span>
                </span>

                {drawSubTab === "table_seat" && (
                  <div className="pt-2 flex flex-col items-center gap-2">
                    <div className="inline-flex rounded-xl bg-slate-950 p-1 border border-white/10">
                      <button
                        type="button"
                        onClick={() => { setTableDrawMode("seat"); setCurrentWinner(null); setDisplayedCandidate(null); }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                          tableDrawMode === "seat"
                            ? "bg-sky-500 text-slate-950 shadow-sm"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        🪑 สุ่มเก้าอี้นำโชค (รายตัว)
                      </button>
                      <button
                        type="button"
                        onClick={() => { setTableDrawMode("table"); setCurrentWinner(null); setDisplayedCandidate(null); }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                          tableDrawMode === "table"
                            ? "bg-amber-500 text-slate-950 shadow-sm"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        🍽️ สุ่มโต๊ะนำโชค (ยกโต๊ะ)
                      </button>
                    </div>
                    <input
                      type="text"
                      value={prizeNameInput}
                      onChange={(e) => setPrizeNameInput(e.target.value)}
                      placeholder="ระบุชื่อรางวัลโต๊ะ/เก้าอี้นำโชค..."
                      className="bg-slate-950 border border-sky-500/40 rounded-xl px-4 py-2 text-xs sm:text-sm text-center text-sky-300 font-bold focus:outline-none focus:border-sky-400 w-full max-w-sm"
                    />
                  </div>
                )}

                {drawSubTab === "grand" && (
                  <div className="pt-2">
                    <input
                      type="text"
                      value={prizeNameInput}
                      onChange={(e) => setPrizeNameInput(e.target.value)}
                      placeholder="ระบุชื่อรางวัลที่กำลังจับ..."
                      className="bg-slate-950 border border-rose-500/40 rounded-xl px-4 py-2 text-xs sm:text-sm text-center text-rose-300 font-bold focus:outline-none focus:border-rose-400 w-full max-w-sm"
                    />
                  </div>
                )}
              </div>

              {/* Slot Machine Display Box */}
              <div className="w-full max-w-lg bg-slate-950/90 rounded-3xl p-6 sm:p-8 border-2 border-amber-500/40 shadow-2xl my-4 relative overflow-hidden">
                <div className="text-xs text-slate-400 mb-2 font-mono">
                  {isSpinning ? "🎰 กำลังสุ่มรายชื่อผู้โชคดี..." : currentWinner ? "🎉 ผู้โชคดีได้รับรางวัลได้แก่!" : "พร้อมสำหรับการสุ่ม"}
                </div>

                {/* Candidate Display */}
                <div className="min-h-[120px] flex flex-col items-center justify-center">
                  {displayedCandidate ? (
                    displayedCandidate.isTableCandidate ? (
                      <div className="space-y-3 animate-fadeIn w-full">
                        <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-2xl bg-sky-500/20 border border-sky-400/40 text-sky-300 font-black text-sm">
                          <Armchair className="w-4 h-4" />
                          <span>รางวัลยกโต๊ะ!</span>
                        </div>
                        <div className="text-3xl sm:text-5xl font-black text-amber-400 tracking-tight">
                          {displayedCandidate.tableLabel}
                        </div>
                        <div className="text-xs text-slate-300 font-bold">
                          สมาชิกในโต๊ะทั้งหมด {displayedCandidate.members?.length || 0} ท่าน
                        </div>
                        {!isSpinning && displayedCandidate.members?.length > 0 && (
                          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                            {displayedCandidate.members.map((m) => (
                              <div
                                key={m.ticketNo}
                                className="flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-slate-900 border border-white/10 text-xs text-white"
                              >
                                {m.photoUrl && (
                                  <img
                                    src={m.photoUrl}
                                    alt={m.name}
                                    className="w-5 h-5 rounded-full object-cover"
                                  />
                                )}
                                <span className="font-mono text-[10px] text-amber-300 font-black">{m.seatCode}</span>
                                <span className="font-bold">{m.nickname || m.name.split(" ")[0]}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2 animate-fadeIn flex flex-col items-center">
                        {displayedCandidate.isSeatCandidate && (
                          <div className="inline-flex items-center space-x-1.5 px-4 py-1 rounded-2xl bg-sky-500/20 border border-sky-400/40 text-sky-300 font-black text-base sm:text-lg mb-1">
                            <Armchair className="w-4 h-4" />
                            <span>{displayedCandidate.tableLabel} • เก้าอี้ {displayedCandidate.seatCode}</span>
                          </div>
                        )}
                        {displayedCandidate.photoUrl && !isSpinning && (
                          <img
                            src={displayedCandidate.photoUrl}
                            alt={displayedCandidate.name}
                            className="w-20 h-20 rounded-full object-cover ring-4 ring-amber-400/70 shadow-xl mb-1"
                          />
                        )}
                        <div className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                          {displayedCandidate.name}
                          {displayedCandidate.nickname && (
                            <span className="text-amber-400 ml-2 font-bold text-xl sm:text-2xl">
                              ({displayedCandidate.nickname})
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                          <span className="font-mono text-xs px-2.5 py-0.5 rounded-lg bg-slate-900 border border-white/10 text-amber-300 font-bold">
                            {displayedCandidate.ticketNo}
                          </span>
                          <span className="text-xs px-2.5 py-0.5 rounded-lg bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
                            {displayedCandidate.club || "สงสพัท"}
                          </span>
                          {!displayedCandidate.isSeatCandidate && attendeeSeatMap.get(displayedCandidate.ticketNo) && (
                            <span className="text-xs px-2.5 py-0.5 rounded-lg bg-sky-500/20 text-sky-300 font-bold border border-sky-500/30">
                              🪑 {attendeeSeatMap.get(displayedCandidate.ticketNo).tableLabel} • {attendeeSeatMap.get(displayedCandidate.ticketNo).seatCode}
                            </span>
                          )}
                          {displayedCandidate.giftNumber && (
                            <span className="text-xs px-2.5 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                              🎁 ของขวัญ #{displayedCandidate.giftNumber}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  ) : (
                    <div className="text-slate-500 text-sm font-medium">
                      กดปุ่ม "เริ่มสุ่มรางวัล" ด้านล่างเพื่อเริ่มการสุ่ม
                    </div>
                  )}
                </div>

              </div>

              {/* Draw Controls */}
              <div className="space-y-3 pt-2">
                {!currentWinner ? (
                  <button
                    type="button"
                    disabled={isSpinning || getCandidatePool().length === 0}
                    onClick={handleStartDraw}
                    className="px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-black text-base shadow-xl shadow-amber-500/30 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center space-x-2"
                  >
                    <Dices className={`w-5 h-5 ${isSpinning ? "animate-spin" : ""}`} />
                    <span>{isSpinning ? "กำลังหมุนสุ่ม..." : "🎲 เริ่มสุ่มรางวัล (Random)"}</span>
                  </button>
                ) : (
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    {drawSubTab === "grand" && (
                      <button
                        type="button"
                        onClick={handleConfirmGrandPrizeWinner}
                        className="px-6 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm shadow-lg shadow-emerald-500/30 hover:scale-105 active:scale-95 transition-all flex items-center space-x-2"
                      >
                        <Check className="w-4 h-4 stroke-[3]" />
                        <span>🏆 ยืนยันรับรางวัล (ตัดชื่อออกจากโถ)</span>
                      </button>
                    )}

                    {drawSubTab === "gift_exclusive" && (
                      <button
                        type="button"
                        onClick={handleConfirmGiftQueueWinner}
                        className="px-6 py-3.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-extrabold text-sm shadow-lg shadow-indigo-500/30 hover:scale-105 active:scale-95 transition-all flex items-center space-x-2"
                      >
                        <Check className="w-4 h-4 stroke-[3]" />
                        <span>บันทึกเข้าคิวจับของขวัญ (คิวที่ {giftQueueWinners.length + 1})</span>
                      </button>
                    )}

                    {drawSubTab === "table_seat" && (
                      <button
                        type="button"
                        onClick={handleConfirmTableDrawWinner}
                        className="px-6 py-3.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-extrabold text-sm shadow-lg shadow-sky-500/30 hover:scale-105 active:scale-95 transition-all flex items-center space-x-2"
                      >
                        <Check className="w-4 h-4 stroke-[3]" />
                        <span>🪑 ยืนยันรับรางวัล (บันทึกประวัติ & ตัดออก)</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleStartDraw}
                      className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-white/10 hover:scale-105 transition-all flex items-center space-x-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>{drawSubTab === "grand" ? "สละสิทธิ์ / สุ่มใหม่" : "สุ่มคนถัดไป"}</span>
                    </button>
                  </div>
                )}
              </div>

            </div>

            {/* Right Side: Eligible Candidates Pool Panel (ฝั่งขวาของทั้ง 3 ตัวเลือก) */}
            <div className="lg:col-span-5 space-y-4">

              {/* ======================================================== */}
              {/* MODE 1: สุ่มทั่วไป - รายชื่อผู้มีสิทธิ์ & จำนวนครั้งที่เคยสุ่ม  */}
              {/* ======================================================== */}
              {drawSubTab === "general" && (
                <div className="bg-slate-900/90 rounded-3xl p-4 sm:p-5 border border-amber-500/30 shadow-2xl flex flex-col h-[520px]">
                  
                  {/* Header */}
                  <div className="border-b border-white/10 pb-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-amber-400">
                        <Users className="w-4 h-4" />
                        <h3 className="font-extrabold text-sm text-white">
                          รายชื่อผู้มีสิทธิ์ได้รับการ Random
                        </h3>
                      </div>
                      <span className="font-mono text-xs px-2.5 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                        {candidatePool.length} ท่าน
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>สุ่มซ้ำได้ตลอดค่ำคืน • ตรวจเช็ครายชื่อและสถิติ</span>
                      {Object.keys(generalDrawCounts).length > 0 && (
                        <button
                          type="button"
                          onClick={handleResetGeneralDrawCounts}
                          className="text-amber-400 hover:text-amber-300 font-medium flex items-center space-x-1"
                          title="รีเซ็ตสถิติจำนวนครั้งการสุ่มทั้งหมด"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>ล้างสถิติ</span>
                        </button>
                      )}
                    </div>

                    {/* Search inside pool */}
                    <div className="relative pt-1">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="text"
                        placeholder="ค้นหาชื่อ, ชื่อเล่น, เลขที่บัตรเพื่อตรวจเช็ค..."
                        value={searchDrawPool}
                        onChange={(e) => setSearchDrawPool(e.target.value)}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  {/* Candidate List with Draw Count Badges */}
                  <div className="flex-1 overflow-y-auto space-y-2 py-3 pr-1">
                    {filteredCandidatePool.map((r) => {
                      const count = generalDrawCounts[r.ticketNo] || 0;
                      return (
                        <div
                          key={r.ticketNo}
                          className={`p-2.5 rounded-2xl border transition-all flex items-center justify-between text-xs ${
                            count > 0 
                              ? "bg-amber-950/20 border-amber-500/30 hover:border-amber-500/50" 
                              : "bg-slate-950/70 border-white/5 hover:border-white/15"
                          }`}
                        >
                          <div className="space-y-0.5">
                            <div className="font-bold text-white flex items-center space-x-1.5">
                              <span>{r.name}</span>
                              {r.nickname && (
                                <span className="text-amber-400 font-normal text-[11px]">
                                  ({r.nickname})
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 flex items-center space-x-1.5">
                              <span className="font-mono text-amber-300/80 font-bold">{r.ticketNo}</span>
                              <span>•</span>
                              <span>{r.club || "สงสพัท"}</span>
                            </div>
                          </div>

                          {/* Draw count badge */}
                          <div className="shrink-0 pl-2">
                            {count > 0 ? (
                              <span className="px-2.5 py-1 rounded-xl bg-amber-500/25 text-amber-300 font-black text-[11px] border border-amber-500/40 flex items-center space-x-1 shadow-sm">
                                <Sparkles className="w-3 h-3 text-amber-400" />
                                <span>สุ่มแล้ว {count} ครั้ง</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-lg bg-white/5 text-slate-400 text-[10px] border border-white/5">
                                ยังไม่เคยถูกสุ่ม
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {filteredCandidatePool.length === 0 && (
                      <div className="py-12 text-center text-slate-500 text-xs">
                        {searchDrawPool ? "ไม่พบรายชื่อที่ค้นหาในโถสุ่ม" : "ไม่มีรายชื่อในโถสุ่ม"}
                      </div>
                    )}
                  </div>

                </div>
              )}

              {/* ======================================================== */}
              {/* MODE 2: รางวัลใหญ่ - รายชื่อผู้มีสิทธิ์ลุ้น (ยังอยู่ในโถสุ่ม)    */}
              {/* ======================================================== */}
              {drawSubTab === "grand" && (
                <div className="bg-slate-900/90 rounded-3xl p-4 sm:p-5 border border-rose-500/30 shadow-2xl flex flex-col h-[520px]">
                  
                  {/* Header */}
                  <div className="border-b border-white/10 pb-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-rose-400">
                        <Trophy className="w-4 h-4" />
                        <h3 className="font-extrabold text-sm text-white">
                          รายชื่อผู้มีสิทธิ์ลุ้นรางวัลใหญ่
                        </h3>
                      </div>
                      <span className="font-mono text-xs px-2.5 py-0.5 rounded-lg bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
                        อยู่ในโถ {candidatePool.length} ท่าน
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>ตัดชื่อออกเมื่อได้รางวัล • คัดออกแล้ว {grandPrizeWinners.length} ท่าน</span>
                    </div>

                    {/* Search inside pool */}
                    <div className="relative pt-1">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="text"
                        placeholder="ค้นหาชื่อในโถสุ่มรางวัลใหญ่..."
                        value={searchDrawPool}
                        onChange={(e) => setSearchDrawPool(e.target.value)}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                      />
                    </div>
                  </div>

                  {/* Eligible Candidates in Pool */}
                  <div className="flex-1 overflow-y-auto space-y-2 py-3 pr-1">
                    {filteredCandidatePool.map((r) => (
                      <div
                        key={r.ticketNo}
                        className="p-2.5 rounded-2xl bg-slate-950/70 border border-white/5 hover:border-rose-500/30 transition-all flex items-center justify-between text-xs"
                      >
                        <div className="space-y-0.5">
                          <div className="font-bold text-white flex items-center space-x-1.5">
                            <span>{r.name}</span>
                            {r.nickname && (
                              <span className="text-rose-300 font-normal text-[11px]">
                                ({r.nickname})
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 flex items-center space-x-1.5">
                            <span className="font-mono text-amber-300/80 font-bold">{r.ticketNo}</span>
                            <span>•</span>
                            <span>{r.club || "สงสพัท"}</span>
                          </div>
                        </div>

                        <div className="shrink-0 pl-2">
                          <span className="px-2.5 py-1 rounded-xl bg-emerald-500/15 text-emerald-300 font-semibold border border-emerald-500/25 text-[11px] flex items-center space-x-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>มีสิทธิ์ลุ้น</span>
                          </span>
                        </div>
                      </div>
                    ))}

                    {filteredCandidatePool.length === 0 && (
                      <div className="py-12 text-center text-slate-500 text-xs">
                        {candidatePool.length === 0 ? "ทุกคนในโถได้รับรางวัลครบแล้ว" : "ไม่พบรายชื่อที่ค้นหาในโถสุ่ม"}
                      </div>
                    )}
                  </div>

                </div>
              )}

              {/* ======================================================== */}
              {/* MODE 3: ของขวัญ - รายชื่อผู้ลงทะเบียนจับของขวัญทั้งหมด         */}
              {/* ======================================================== */}
              {drawSubTab === "gift_exclusive" && (
                <div className="bg-slate-900/90 rounded-3xl p-4 sm:p-5 border border-indigo-500/30 shadow-2xl flex flex-col h-[520px]">
                  
                  {/* Header */}
                  <div className="border-b border-white/10 pb-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-indigo-400">
                        <Gift className="w-4 h-4" />
                        <h3 className="font-extrabold text-sm text-white">
                          รายชื่อผู้ลงทะเบียนจับของขวัญ
                        </h3>
                      </div>
                      <span className="font-mono text-xs px-2.5 py-0.5 rounded-lg bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
                        {giftList.length} ท่าน
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>สุ่มคิวแล้ว {giftQueueWinners.length}/{giftList.length} ท่าน</span>
                      {giftQueueWinners.length > 0 && (
                        <button
                          type="button"
                          onClick={handleResetGiftQueue}
                          className="text-rose-400 hover:text-rose-300 font-medium flex items-center space-x-1"
                          title="รีเซ็ตคิวจับของขวัญเพื่อเริ่มสุ่มใหม่"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>รีเซ็ตคิว</span>
                        </button>
                      )}
                    </div>

                    {/* Search inside gift list */}
                    <div className="relative pt-1">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="text"
                        placeholder="ค้นหาชื่อผู้มอบ, เบอร์ของขวัญ #..."
                        value={searchDrawPool}
                        onChange={(e) => setSearchDrawPool(e.target.value)}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Gift Registered Attendees List */}
                  <div className="flex-1 overflow-y-auto space-y-2 py-3 pr-1">
                    {filteredGiftList.map((g) => {
                      const queueItem = giftQueueWinners.find(q => q.ticketNo === g.ticketNo);
                      return (
                        <div
                          key={g.ticketNo}
                          className={`p-2.5 rounded-2xl border transition-all flex items-center justify-between text-xs ${
                            queueItem 
                              ? "bg-indigo-950/25 border-indigo-500/40" 
                              : "bg-slate-950/70 border-white/5 hover:border-indigo-500/30"
                          }`}
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center space-x-2">
                              <span className="font-mono text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 shadow-sm">
                                #{g.giftNumber}
                              </span>
                              <span className="font-bold text-white">{g.name}</span>
                              {g.nickname && (
                                <span className="text-amber-300 font-normal text-[11px]">
                                  ({g.nickname})
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 flex items-center space-x-1.5 pl-0.5">
                              <span className="font-mono text-slate-400">{g.ticketNo}</span>
                              <span>•</span>
                              <span>{g.club || "สงสพัท"}</span>
                            </div>
                          </div>

                          {/* Queue Status Badge */}
                          <div className="shrink-0 pl-2">
                            {queueItem ? (
                              <span className="px-2.5 py-1 rounded-xl bg-indigo-500/30 text-indigo-200 font-black text-[11px] border border-indigo-500/40 flex items-center space-x-1 shadow-sm">
                                <ListOrdered className="w-3 h-3 text-indigo-400" />
                                <span>ได้คิวที่ #{queueItem.queueNo}</span>
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/10 text-amber-300 text-[10px] border border-amber-500/20">
                                รอสุ่มจับคิว
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {filteredGiftList.length === 0 && (
                      <div className="py-12 text-center text-slate-500 text-xs">
                        {giftList.length === 0 ? "ยังไม่มีผู้ลงทะเบียนของขวัญในแถบที่ 2" : "ไม่พบรายชื่อที่ค้นหา"}
                      </div>
                    )}
                  </div>

                </div>
              )}

              {/* ======================================================== */}
              {/* MODE 4: สุ่มโต๊ะ / เก้าอี้นำโชค - โถสุ่มฝั่งขวา              */}
              {/* ======================================================== */}
              {drawSubTab === "table_seat" && (
                <div className="bg-slate-900/90 rounded-3xl p-4 sm:p-5 border border-sky-500/30 shadow-2xl flex flex-col h-[520px]">
                  <div className="border-b border-white/10 pb-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-sky-400">
                        <Armchair className="w-4 h-4" />
                        <h3 className="font-extrabold text-sm text-white">
                          {tableDrawMode === "table" ? "รายชื่อโต๊ะที่มีสิทธิ์ลุ้นรางวัล" : "เก้าอี้ที่มีผู้จองแล้วในโถสุ่ม"}
                        </h3>
                      </div>
                      <span className="font-mono text-xs px-2.5 py-0.5 rounded-lg bg-sky-500/20 text-sky-300 font-bold border border-sky-500/30">
                        {candidatePool.length} {tableDrawMode === "table" ? "โต๊ะ" : "เก้าอี้"}
                      </span>
                    </div>

                    <div className="relative pt-1">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="text"
                        placeholder={tableDrawMode === "table" ? "ค้นหาชื่อโต๊ะ..." : "ค้นหาเก้าอี้ (เช่น A1), ชื่อ, ชื่อเล่น..."}
                        value={searchDrawPool}
                        onChange={(e) => setSearchDrawPool(e.target.value)}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-2 py-3 pr-1">
                    {filteredCandidatePool.map((item) => (
                      <div
                        key={item.isTableCandidate ? item.tableId : item.seatKey}
                        className="p-2.5 rounded-2xl bg-slate-950/70 border border-white/5 hover:border-sky-500/30 transition-all flex items-center justify-between text-xs"
                      >
                        {item.isTableCandidate ? (
                          <>
                            <div>
                              <div className="font-black text-white">{item.tableLabel}</div>
                              <div className="text-[10px] text-slate-400 truncate max-w-[200px]">
                                {item.members.map(m => m.nickname || m.name.split(" ")[0]).join(", ")}
                              </div>
                            </div>
                            <span className="px-2.5 py-1 rounded-xl bg-sky-500/20 text-sky-300 font-mono font-bold text-[11px] shrink-0">
                              {item.members.length} ท่าน
                            </span>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center space-x-2.5 min-w-0">
                              <span className="px-2 py-1 rounded-lg bg-sky-500/20 border border-sky-400/30 text-sky-300 font-mono font-black text-[11px] shrink-0">
                                {item.seatCode}
                              </span>
                              <div className="min-w-0">
                                <div className="font-bold text-white truncate">
                                  {item.name} {item.nickname && <span className="text-amber-400 font-normal">({item.nickname})</span>}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  {item.tableLabel} • {item.ticketNo}
                                </div>
                              </div>
                            </div>
                            {item.photoUrl && (
                              <img src={item.photoUrl} alt={item.name} className="w-7 h-7 rounded-full object-cover ring-1 ring-sky-400/50 shrink-0 ml-2" />
                            )}
                          </>
                        )}
                      </div>
                    ))}

                    {filteredCandidatePool.length === 0 && (
                      <div className="py-12 text-center text-slate-500 text-xs space-y-2">
                        <Armchair className="w-8 h-8 text-sky-400/30 mx-auto" />
                        <div>ยังไม่มีโต๊ะหรือเก้าอี้ที่มีผู้จองในโถสุ่ม</div>
                        <button
                          type="button"
                          onClick={() => setActiveMainTab("seating")}
                          className="px-3 py-1.5 rounded-xl bg-sky-500/20 text-sky-300 border border-sky-400/30 font-bold hover:bg-sky-500/30 cursor-pointer"
                        >
                          ไปที่หน้าเลือกโต๊ะ/ที่นั่ง →
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>

          </div>

          {/* ======================================================== */}
          {/* BOTTOM SECTION FOR MODE 2: รางวัลใหญ่ - รายชื่อที่ถูกคัดออกแล้ว */}
          {/* ======================================================== */}
          {drawSubTab === "grand" && (
            <div className="bg-slate-900/90 rounded-3xl p-5 sm:p-6 border border-rose-500/30 shadow-2xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2 text-rose-400">
                    <Trophy className="w-5 h-5" />
                    <h3 className="font-extrabold text-base text-white">
                      🏆 รายชื่อผู้ที่ถูก Random คัดออกไปแล้ว (ได้รับรางวัลใหญ่แล้ว - ไม่สุ่มซ้ำ)
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400">
                    ผู้โชคดีด้านล่างนี้ได้รับการ Random ไปแล้ว 1 ครั้ง และระบบได้ตัดชื่อออกจากโถสุ่มถาวร จะไม่ถูกหยิบขึ้นมา Random ซ้ำ
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs px-3 py-1 rounded-xl bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
                    คัดออกแล้ว {grandPrizeWinners.length} ท่าน
                  </span>
                  {grandPrizeWinners.length > 0 && (
                    <button
                      type="button"
                      onClick={handleResetGrandPrizeWinners}
                      className="px-3 py-1 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 text-xs transition-all flex items-center space-x-1"
                      title="ล้างทำเนียบผู้ได้รับรางวัลใหญ่ทั้งหมด และนำรายชื่อทุกคนกลับเข้าโถสุ่ม"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>ล้างทำเนียบ (เริ่มใหม่)</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Winners Cards Grid */}
              {grandPrizeWinners.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {grandPrizeWinners.map((w) => (
                    <div
                      key={w.id || w.ticketNo}
                      className="p-3.5 rounded-2xl bg-slate-950/80 border border-rose-500/20 hover:border-rose-500/40 transition-all space-y-2 relative group"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-black text-white text-sm flex items-center space-x-1.5">
                            <span>{w.name}</span>
                            {w.nickname && (
                              <span className="text-rose-300 text-xs font-normal">
                                ({w.nickname})
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono pt-0.5">
                            {w.ticketNo} • {w.club || "สงสพัท"}
                          </div>
                        </div>

                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          ❌ ตัดชื่อออกจากโถแล้ว
                        </span>
                      </div>

                      <div className="bg-rose-950/30 p-2 rounded-xl border border-rose-500/20 flex items-center justify-between text-xs">
                        <span className="text-rose-300 font-bold truncate">
                          🎁 {w.prizeName}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono shrink-0 ml-2">
                          {w.wonAt}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-1 text-[11px]">
                        <span className="text-slate-500 text-[10px]">
                          สุ่มได้ 1 ครั้ง (ไม่ถูกสุ่มซ้ำ)
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRestoreGrandPrizeWinner(w.ticketNo)}
                          className="text-amber-400 hover:text-amber-300 font-medium text-[10px] flex items-center space-x-1 hover:underline"
                          title="ดึงรายชื่อนี้กลับเข้าโถสุ่มรางวัลใหญ่"
                        >
                          <Undo2 className="w-3 h-3" />
                          <span>ดึงกลับเข้าโถสุ่ม</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-10 text-center text-slate-500 text-xs space-y-1">
                  <Trophy className="w-8 h-8 text-rose-400/30 mx-auto" />
                  <div className="font-semibold text-slate-400">ยังไม่มีผู้ถูก Random คัดชื่อออก</div>
                  <div className="text-[11px] text-slate-500">
                    เมื่อกดสุ่มรางวัลและกดยืนยันรับรางวัล รายชื่อจะถูกตัดออกจากโถสุ่มและมาแสดงที่นี่
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* BOTTOM SECTION FOR MODE 3: ของขวัญ - สรุปลำดับคิวจับของขวัญ */}
          {/* ======================================================== */}
          {drawSubTab === "gift_exclusive" && (
            <div className="bg-slate-900/90 rounded-3xl p-5 sm:p-6 border border-indigo-500/30 shadow-2xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2 text-indigo-400">
                    <ListOrdered className="w-5 h-5" />
                    <h3 className="font-extrabold text-base text-white">
                      📋 สรุปลำดับคิวจับของขวัญ (Gift Exchange Queue Summary)
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400">
                    ลำดับคิวในการเดินขึ้นมาจับของขวัญบนเวทีตามที่สุ่มได้ สามารถกดปุ่มรีเซ็ตเพื่อเริ่มสุ่มใหม่ได้ตลอดเวลา
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs px-3 py-1 rounded-xl bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
                    สุ่มได้คิวแล้ว {giftQueueWinners.length}/{giftList.length} ท่าน
                  </span>
                  {giftQueueWinners.length > 0 && (
                    <button
                      type="button"
                      onClick={handleResetGiftQueue}
                      className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-400 hover:to-rose-500 text-white font-extrabold text-xs shadow-md shadow-rose-500/20 transition-all flex items-center space-x-1.5"
                      title="รีเซ็ตคิวจับของขวัญทั้งหมด เพื่อเริ่มสุ่มใหม่"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>รีเซ็ตเอาใหม่ (เริ่มใหม่ทั้งหมด)</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Gift Queue Cards Grid */}
              {giftQueueWinners.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {giftQueueWinners.map((q) => (
                    <div
                      key={q.ticketNo}
                      className="p-3.5 rounded-2xl bg-slate-950/80 border border-indigo-500/20 hover:border-indigo-500/40 transition-all flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white font-black text-sm flex items-center justify-center shadow-lg shadow-indigo-500/25 shrink-0">
                          #{q.queueNo}
                        </span>
                        <div className="space-y-0.5">
                          <div className="font-bold text-white text-sm">
                            {q.name} {q.nickname && <span className="text-amber-300 font-normal text-xs">({q.nickname})</span>}
                          </div>
                          <div className="text-[11px] text-amber-400 font-semibold flex items-center space-x-2">
                            <span>ของขวัญที่นำมา: #{q.giftNumber}</span>
                            <span className="text-slate-500">•</span>
                            <span className="text-slate-400 font-mono text-[10px]">{q.wonAt}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveGiftQueueItem(q.ticketNo)}
                        className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition-all ml-2"
                        title="ยกเลิกคิวนี้"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-10 text-center text-slate-500 text-xs space-y-1">
                  <Gift className="w-8 h-8 text-indigo-400/30 mx-auto" />
                  <div className="font-semibold text-slate-400">ยังไม่มีการสุ่มคิวจับของขวัญ</div>
                  <div className="text-[11px] text-slate-500">
                    กดปุ่ม "🎲 เริ่มสุ่มรางวัล" ด้านบนเพื่อเริ่มสุ่มผู้จับของขวัญคิวที่ 1
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* BOTTOM SECTION FOR MODE 4: ทำเนียบรางวัลโต๊ะ / เก้าอี้นำโชค  */}
          {/* ======================================================== */}
          {drawSubTab === "table_seat" && (
            <div className="bg-slate-900/90 rounded-3xl p-5 sm:p-6 border border-sky-500/30 shadow-2xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2 text-sky-400">
                    <Armchair className="w-5 h-5" />
                    <h3 className="font-extrabold text-base text-white">
                      🪑 ทำเนียบผู้โชคดีรางวัลโต๊ะ / เก้าอี้นำโชค
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400">
                    บันทึกรางวัลที่สุ่มได้จากเก้าอี้หรือโต๊ะ สามารถกดดึงกลับเข้าโถสุ่มหรือล้างประวัติได้
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs px-3 py-1 rounded-xl bg-sky-500/20 text-sky-300 font-bold border border-sky-500/30">
                    บันทึกแล้ว {tableDrawWinners.length} รางวัล
                  </span>
                  {tableDrawWinners.length > 0 && (
                    <button
                      type="button"
                      onClick={handleResetTableDrawWinners}
                      className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-400 hover:to-rose-500 text-white font-extrabold text-xs shadow-md transition-all flex items-center space-x-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>ล้างประวัติทั้งหมด</span>
                    </button>
                  )}
                </div>
              </div>

              {tableDrawWinners.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {tableDrawWinners.map((w) => (
                    <div
                      key={w.id}
                      className="p-3.5 rounded-2xl bg-slate-950/80 border border-sky-500/25 flex items-start justify-between text-xs gap-2"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center space-x-1.5 flex-wrap">
                          <span className="px-2 py-0.5 rounded-lg bg-sky-500/20 text-sky-300 font-black">
                            {w.mode === "table" ? `🍽️ ${w.tableLabel} (ยกโต๊ะ)` : `🪑 ${w.tableLabel} • ${w.seatCode}`}
                          </span>
                          <span className="text-[10px] text-amber-300 font-bold">{w.prizeName}</span>
                        </div>
                        {w.mode === "table" ? (
                          <div className="text-[11px] text-slate-300">
                            สมาชิก {w.membersCount} ท่าน: {(w.members || []).map(m => m.nickname || m.name.split(" ")[0]).join(", ")}
                          </div>
                        ) : (
                          <div className="font-bold text-white text-sm">
                            {w.name} {w.nickname && <span className="text-amber-300 font-normal text-xs">({w.nickname})</span>}
                          </div>
                        )}
                        <div className="text-[10px] text-slate-500 font-mono">{w.wonAt}</div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRestoreTableDrawWinner(w.id)}
                        className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition-all shrink-0 cursor-pointer"
                        title="ดึงกลับเข้าโถสุ่ม"
                      >
                        <Undo2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-10 text-center text-slate-500 text-xs space-y-1">
                  <Armchair className="w-8 h-8 text-sky-400/30 mx-auto" />
                  <div className="font-semibold text-slate-400">ยังไม่มีประวัติรางวัลโต๊ะ/เก้าอี้นำโชค</div>
                  <div className="text-[11px] text-slate-500">
                    กดปุ่ม "🎲 เริ่มสุ่มรางวัล" ด้านบนเพื่อสุ่มเก้าอี้หรือโต๊ะนำโชคได้เลย
                  </div>
                </div>
              )}
            </div>
          )}

        </main>
      )}
      {/* ========================================================== */}
      {activeMainTab === "survey" && (() => {
        const categories = currentSurveyConfig.categories || [];

        // Build list of all attendee comments matching category filter
        const commentsList = [];
        surveyResponses.forEach(r => {
          if (r.categoryComments && typeof r.categoryComments === "object") {
            Object.entries(r.categoryComments).forEach(([catId, commentText]) => {
              if (commentText && typeof commentText === "string" && commentText.trim()) {
                const catObj = categories.find(c => c.id === catId);
                if (surveyFeedbackCategoryFilter === "all" || surveyFeedbackCategoryFilter === catId) {
                  commentsList.push({
                    id: `${r.id || r.ticketNo}_${catId}`,
                    name: r.name || "ผู้ประเมิน",
                    nickname: r.nickname || "",
                    ticketNo: r.ticketNo || "",
                    club: r.club || "",
                    time: r.displayTime || r.submittedAt || "-",
                    catTitle: catObj?.title || "ข้อเสนอแนะ",
                    catId: catId,
                    comment: commentText.trim()
                  });
                }
              }
            });
          }
          if (r.comment && typeof r.comment === "string" && r.comment.trim()) {
            if (surveyFeedbackCategoryFilter === "all" || surveyFeedbackCategoryFilter === categories[0]?.id) {
              commentsList.push({
                id: `${r.id || r.ticketNo}_legacy`,
                name: r.name || "ผู้ประเมิน",
                nickname: r.nickname || "",
                ticketNo: r.ticketNo || "",
                club: r.club || "",
                time: r.displayTime || r.submittedAt || "-",
                catTitle: categories[0]?.title || "ข้อเสนอแนะทั่วไป",
                catId: categories[0]?.id || "cat_general",
                comment: r.comment.trim()
              });
            }
          }
        });

        const handleExportSurveyCSV = () => {
          if (speedRankingList.length === 0) {
            alert("ยังไม่มีข้อมูลแบบประเมินความพึงพอใจสำหรับส่งออกครับ");
            return;
          }
          try {
            const headers = [
              "อันดับความเร็ว",
              "สิทธิ์ของรางวัล",
              "เลขที่บัตร",
              "ชื่อผู้ประเมิน",
              "ชื่อเล่น",
              "สังกัด",
              "คะแนนเฉลี่ยรวม"
            ];
            categories.forEach((cat, cIdx) => {
              (cat.questions || []).forEach((q, qIdx) => {
                headers.push(`"[${cIdx + 1}.${qIdx + 1}] ${cat.title} - ${q.label}"`);
              });
            });
            categories.forEach((cat, cIdx) => {
              headers.push(`"[ข้อเสนอแนะ] ${cat.title}"`);
            });
            headers.push("วันเวลาส่ง (แม่นยำระดับวินาที)");

            const rows = speedRankingList.map((r) => {
              const giveawayStatus = r.rank <= 20 ? "Top 20 (มีสิทธิ์รับรางวัล)" : r.rank <= 30 ? "Top 30 (มีสิทธิ์รับรางวัล)" : "-";
              const row = [
                r.rank,
                `"${giveawayStatus}"`,
                `"${r.ticketNo || ''}"`,
                `"${r.name || ''}"`,
                `"${r.nickname || ''}"`,
                `"${r.club || ''}"`,
                r.overallAverage || r.overallAvg || r.ratings?.ratingOverall || "0.00"
              ];

              categories.forEach((cat, cIdx) => {
                (cat.questions || []).forEach(q => {
                  let score = "";
                  if (r.scores && r.scores[q.id] !== undefined) {
                    score = r.scores[q.id];
                  } else if (r.ratings) {
                    const legacyKey = cIdx === 0 ? "ratingOverall" : cIdx === 1 ? "ratingVenue" : cIdx === 2 ? "ratingFood" : cIdx === 3 ? "ratingActivities" : "ratingStaff";
                    score = r.ratings[legacyKey] || "";
                  }
                  row.push(score);
                });
              });

              categories.forEach((cat, cIdx) => {
                let commentText = "";
                if (r.categoryComments && r.categoryComments[cat.id]) {
                  commentText = r.categoryComments[cat.id];
                } else if (cIdx === 0 && r.comment) {
                  commentText = r.comment;
                }
                row.push(`"${(commentText || '').replace(/"/g, '""')}"`);
              });

              row.push(`"${r.displayTimeWithSec || r.displayTime || r.submittedAt || ''}"`);
              return row;
            });

            const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
            const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", `ผลประเมินความพึงพอใจ_จัดอันดับความเร็ว_${new Date().toISOString().slice(0, 10)}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          } catch (err) {
            console.error("Export survey error:", err);
            alert("เกิดข้อผิดพลาดในการส่งออกไฟล์ CSV ครับ");
          }
        };

        const ICON_MAP = {
          Sparkles,
          Building2,
          UtensilsCrossed,
          PartyPopper,
          Heart,
          Award,
          Star
        };

        return (
          <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6 animate-fadeIn">
            
            {/* Header Card for Satisfaction Survey (Clean 2-Tier Layout for Phone, iPad & Desktop) */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-sm space-y-4">
              {/* Top Tier: Icon + Full-Width Title + Status Pills + Subtitle */}
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0 mt-0.5">
                    <Star className="w-5 h-5 text-amber-500 fill-amber-400" />
                  </div>
                  <div className="min-w-0 space-y-1.5">
                    <h2 className="text-base sm:text-xl font-black text-slate-900 leading-snug">
                      แบบประเมินความพึงพอใจงาน SME FAN 2026
                    </h2>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center font-mono text-xs px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 font-bold border border-amber-200 whitespace-nowrap">
                        ตอบแล้ว {surveyStats.total} ท่าน
                      </span>

                      {/* Status Badge (Single crisp icon, never wraps vertically) */}
                      {eventConfig?.isSurveyOpen ? (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                          <span>กำลังเปิดรับแบบประเมิน (LIVE)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 whitespace-nowrap">
                          <Lock className="w-3 h-3 text-slate-500 shrink-0" />
                          <span>ปิดรับแบบประเมินอยู่ (รอเปิดระบบ)</span>
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      มาตรวัด 5 ระดับครอบคลุม {categories.length} ด้าน ({categories.reduce((s, c) => s + (c.questions?.length || 0), 0)} ข้อย่อย) พร้อมรวบรวมข้อเสนอแนะแยกตามหัวข้อ
                    </p>
                  </div>
                </div>
              </div>

              {/* Bottom Tier: Clean Action Bar (2-Col Grid on Phone, Clean Wrap Row on iPad/Desktop) */}
              <div className="pt-3 border-t border-slate-100 grid grid-cols-2 sm:flex sm:flex-wrap sm:items-center gap-2">
                {/* 1. Survey Test Preview Button */}
                <button
                  type="button"
                  onClick={() => setIsSurveyPreviewOpen(true)}
                  className="flex items-center justify-center space-x-1.5 px-3.5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-xs active:scale-95 transition-all cursor-pointer whitespace-nowrap"
                  title="ทดสอบทำแบบสอบถามในมุมมองผู้เข้าร่วมงาน (โหมดทดสอบ ไม่บันทึกคะแนน)"
                >
                  <Eye className="w-3.5 h-3.5 shrink-0" />
                  <span>ทดสอบทำแบบประเมิน</span>
                </button>

                {/* 2. Survey Builder Button */}
                <button
                  type="button"
                  onClick={() => setIsSurveyBuilderOpen(true)}
                  className="flex items-center justify-center space-x-1.5 px-3.5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-xs active:scale-95 transition-all cursor-pointer whitespace-nowrap"
                  title="เปิดหน้าต่างแก้ไขและจัดการข้อคำถามแบบสอบถาม"
                >
                  <Sliders className="w-3.5 h-3.5 shrink-0" />
                  <span>จัดการคำถาม</span>
                </button>

                {/* 3. Toggle Survey Open/Close Button */}
                {setEventConfig && (
                  <button
                    type="button"
                    onClick={() => {
                      const isCurrentlyOpen = Boolean(eventConfig?.isSurveyOpen);
                      const promptMsg = isCurrentlyOpen
                        ? "ต้องการปิดรับแบบประเมินความพึงพอใจใช่หรือไม่?\n(เมื่อปิดแล้ว สมาชิกทั่วไปจะไม่สามารถส่งแบบประเมินเพิ่มได้)"
                        : "ต้องการเปิดระบบรับแบบประเมินความพึงพอใจใช่หรือไม่?\n(เมื่อเปิดแล้ว สมาชิกทุกคนจะสามารถกดทำแบบประเมินได้ทันที)";
                      if (window.confirm(promptMsg)) {
                        setEventConfig(prev => ({
                          ...prev,
                          isSurveyOpen: !isCurrentlyOpen
                        }));
                        playAudioEffect(isCurrentlyOpen ? "beep" : "fanfare");
                      }
                    }}
                    className={`flex items-center justify-center space-x-1.5 px-3.5 py-2.5 rounded-xl font-bold text-xs shadow-xs transition-all active:scale-95 cursor-pointer whitespace-nowrap ${
                      eventConfig?.isSurveyOpen
                        ? "bg-rose-600 hover:bg-rose-500 text-white"
                        : "bg-emerald-600 hover:bg-emerald-500 text-white"
                    }`}
                    title={eventConfig?.isSurveyOpen ? "คลิกเพื่อปิดรับแบบประเมิน" : "คลิกเพื่อเปิดระบบรับแบบประเมิน"}
                  >
                    <span>{eventConfig?.isSurveyOpen ? "🔴 ปิดรับประเมิน" : "🟢 เปิดรับประเมิน"}</span>
                  </button>
                )}

                {/* 4. Refresh Button */}
                <button
                  type="button"
                  onClick={() => {
                    try {
                      const saved = localStorage.getItem("sme_fan_survey_responses_v1");
                      setSurveyResponses(saved ? JSON.parse(saved) : []);
                      playAudioEffect("beep");
                    } catch (e) {}
                  }}
                  className="flex items-center justify-center space-x-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 text-xs font-semibold border border-slate-200 cursor-pointer whitespace-nowrap"
                  title="รีเฟรชผลคะแนนล่าสุด"
                >
                  <RefreshCw className="w-3.5 h-3.5 shrink-0" />
                  <span>รีเฟรช</span>
                </button>

                {/* 5. Export CSV Button (Full width on mobile col-span-2, right-aligned on desktop) */}
                <button
                  type="button"
                  onClick={handleExportSurveyCSV}
                  className="col-span-2 sm:col-span-1 sm:ml-auto flex items-center justify-center space-x-1.5 px-4 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold border border-amber-300 transition-all cursor-pointer whitespace-nowrap"
                  title="ดาวน์โหลดผลประเมินทุกข้อย่อยและข้อเสนอแนะเป็นไฟล์ CSV"
                >
                  <Download className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <span>ส่งออก CSV ละเอียด</span>
                </button>
              </div>
            </div>

            {/* 4 Stat Overview Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              {/* Stat 1: Total Responses */}
              <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-sm space-y-1">
                <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider block">
                  จำนวนผู้ประเมิน
                </span>
                <div className="flex items-baseline space-x-1.5">
                  <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
                    {surveyStats.total}
                  </span>
                  <span className="text-xs text-slate-500">
                    / {registrations.length} ท่าน
                  </span>
                </div>
                <div className="text-[10px] text-amber-700 font-medium">
                  {Math.round((surveyStats.total / Math.max(1, registrations.length)) * 100)}% ของผู้ลงทะเบียน
                </div>
              </div>

              {/* Stat 2: Average Score */}
              <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-sm space-y-1">
                <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider block">
                  คะแนนเฉลี่ยรวม
                </span>
                <div className="flex items-baseline space-x-1.5">
                  <span className="text-2xl sm:text-3xl font-black text-amber-600 font-mono">
                    {surveyStats.totalAvg}
                  </span>
                  <span className="text-xs text-amber-700 font-bold">/ 5.0 ⭐</span>
                </div>
                <div className="text-[10px] text-emerald-700 font-medium">
                  {Number(surveyStats.totalAvg) >= 4.5 ? "ระดับยอดเยี่ยมมาก 🌟" : Number(surveyStats.totalAvg) >= 3.5 ? "ระดับดีมาก 👍" : Number(surveyStats.totalAvg) > 0 ? "ระดับปานกลาง" : "ยังไม่มีคะแนน"}
                </div>
              </div>

              {/* Stat 3: Comments Count */}
              <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-sm space-y-1">
                <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider block">
                  ความคิดเห็น / ข้อเสนอแนะ
                </span>
                <div className="flex items-baseline space-x-1.5">
                  <span className="text-2xl sm:text-3xl font-black text-teal-700 font-mono">
                    {surveyStats.totalCommentsCount}
                  </span>
                  <span className="text-xs text-slate-500">ข้อความ</span>
                </div>
                <div className="text-[10px] text-slate-500">
                  ครอบคลุม {categories.length} หมวด
                </div>
              </div>

              {/* Stat 4: System Status */}
              <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-sm space-y-1">
                <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider block">
                  สถานะแบบประเมิน
                </span>
                <div className="text-base sm:text-lg font-extrabold font-mono pt-1">
                  {eventConfig?.isSurveyOpen ? (
                    <span className="text-emerald-700">🟢 เปิดรับข้อมูล</span>
                  ) : (
                    <span className="text-slate-500">🔒 ปิดระบบ</span>
                  )}
                </div>
                <div className="text-[10px] text-slate-500">
                  {eventConfig?.isSurveyOpen ? "ผู้ร่วมงานประเมินได้" : "รอเปิดระบบ"}
                </div>
              </div>
            </div>

            {/* Categories & Sub-Questions Detailed Breakdown */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm space-y-5">
              <div className="flex items-start sm:items-center justify-between flex-wrap gap-2">
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center space-x-2">
                  <Award className="w-5 h-5 text-amber-500 shrink-0" />
                  <span>ผลคะแนนเฉลี่ยแยกตามหมวดหมู่และข้อคำถามย่อย (เต็ม 5.0 คะแนน)</span>
                </h3>
                <span className="text-xs text-slate-500 font-mono whitespace-nowrap">
                  {categories.length} ด้าน • {categories.reduce((s, c) => s + (c.questions?.length || 0), 0)} ข้อย่อย
                </span>
              </div>

              <div className="space-y-4">
                {(surveyStats.categoryStats || []).map((catStat, cIdx) => {
                  const IconComp = ICON_MAP[catStat.icon] || Award;
                  const catPercent = Math.min(100, Math.round((Number(catStat.avg) / 5) * 100));

                  return (
                    <div
                      key={catStat.id || cIdx}
                      className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4 hover:border-amber-300 transition-all"
                    >
                      {/* Category Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 border border-amber-200">
                            <IconComp className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h4 className="text-sm font-extrabold text-slate-900">
                                {catStat.title}
                              </h4>
                              {catStat.subtitle && (
                                <span className="text-xs text-amber-700 font-medium">
                                  {catStat.subtitle}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500">
                              มีคำถาม {catStat.questions?.length || 0} ข้อย่อย
                            </p>
                          </div>
                        </div>

                        {/* Category Score Badge */}
                        <div className="flex items-center space-x-2 self-start sm:self-auto bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs">
                          <span className="text-xs text-slate-600 font-medium">เฉลี่ยหมวดนี้:</span>
                          <span className="font-mono text-base font-black text-amber-600">
                            {catStat.avg}
                          </span>
                          <span className="text-xs text-amber-700 font-bold">/ 5.0 ⭐</span>
                        </div>
                      </div>

                      {/* Sub-Questions Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {(catStat.questionStats || []).map((qStat, qIdx) => {
                          const qPercent = Math.min(100, Math.round((Number(qStat.avg) / 5) * 100));
                          return (
                            <div
                              key={qStat.id || qIdx}
                              className="p-3 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-1.5"
                            >
                              <div className="flex justify-between items-start gap-2">
                                <div className="space-y-0.5 min-w-0 flex-1">
                                  <div className="text-xs font-bold text-slate-800 flex items-start space-x-1.5 leading-snug">
                                    <span className="font-mono text-amber-600 text-[11px] shrink-0 font-extrabold">
                                      {cIdx + 1}.{qIdx + 1}
                                    </span>
                                    <span>{qStat.label}</span>
                                  </div>
                                  {qStat.desc && (
                                    <p className="text-[11px] text-slate-500 leading-relaxed">
                                      {qStat.desc}
                                    </p>
                                  )}
                                </div>
                                <div className="shrink-0 text-right whitespace-nowrap">
                                  <span className="font-mono font-black text-amber-600 text-xs">
                                    {qStat.avg}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-mono"> / 5.0</span>
                                </div>
                              </div>

                              {/* Progress bar */}
                              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/50">
                                <div
                                  className="bg-gradient-to-r from-amber-500 to-yellow-400 h-2 rounded-full transition-all duration-500"
                                  style={{ width: `${qPercent}%` }}
                                ></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Feedback & Comments Stream with Category Filter */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                <div className="flex items-center space-x-2">
                  <MessageSquare className="w-4 h-4 text-teal-600" />
                  <h3 className="text-sm font-bold text-slate-900">
                    ข้อเสนอแนะและความคิดเห็นจากผู้เข้าร่วมงาน ({commentsList.length} ข้อความ)
                  </h3>
                </div>

                {/* Category Filter Tabs */}
                <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                  <button
                    type="button"
                    onClick={() => setSurveyFeedbackCategoryFilter("all")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                      surveyFeedbackCategoryFilter === "all"
                        ? "bg-amber-500 text-slate-950 shadow-sm"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                    }`}
                  >
                    ทั้งหมด
                  </button>
                  {categories.map((cat, cIdx) => (
                    <button
                      key={cat.id || cIdx}
                      type="button"
                      onClick={() => setSurveyFeedbackCategoryFilter(cat.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                        surveyFeedbackCategoryFilter === cat.id
                          ? "bg-amber-500 text-slate-950 shadow-sm"
                          : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                      }`}
                    >
                      ด้านที่ {cIdx + 1}
                    </button>
                  ))}
                </div>
              </div>

              {commentsList.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2 bg-slate-50/50 rounded-xl">
                  <MessageSquare className="w-10 h-10 mx-auto opacity-30 text-teal-600" />
                  <div className="text-sm font-semibold text-slate-600">
                    ยังไม่มีข้อเสนอแนะในหมวดนี้
                  </div>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    เมื่อผู้เข้าร่วมงานกรอกข้อเสนอแนะในแต่ละหัวข้อ ความคิดเห็นจะแสดงที่นี่แบบเรียลไทม์
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                  {commentsList.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs hover:border-amber-300 transition-all"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                          <span className="w-6 h-6 rounded-lg bg-teal-100 text-teal-800 font-mono font-bold flex items-center justify-center text-[11px] shrink-0 border border-teal-200">
                            #{idx + 1}
                          </span>
                          <div className="font-extrabold text-slate-900 text-sm">
                            {item.name} {item.nickname ? `(${item.nickname})` : ''}
                          </div>
                          <span className="font-mono text-amber-600 text-xs font-bold">
                            {item.ticketNo}
                          </span>
                          <span className="text-slate-500 text-xs">
                            • {item.club}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            {item.catTitle}
                          </span>
                        </div>
                        <span className="font-mono text-[11px] text-slate-500">
                          {item.time}
                        </span>
                      </div>

                      {/* Comment text */}
                      <div className="p-3 rounded-lg bg-white border border-slate-200 text-slate-700 italic text-xs leading-relaxed">
                        "{item.comment}"
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ========================================================== */}
            {/* SECTION 4: SPEED RANKING & GIVEAWAY TRACKER (จับเวลาวินาที) */}
            {/* ========================================================== */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <Trophy className="w-5 h-5 text-amber-500" />
                    <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                      ตารางจัดอันดับความเร็วการส่งแบบประเมิน (Speed Ranking & Giveaway Tracker)
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600">
                    จับเวลาแม่นยำระดับวินาที เรียงลำดับผู้ที่ประเมินเสร็จก่อน-หลัง เพื่อจัดเตรียมของรางวัลสำหรับ 20 หรือ 30 คนแรก
                  </p>
                </div>

                <div className="flex items-center space-x-2 self-start md:self-auto">
                  <span className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 font-mono text-xs font-bold">
                    ประเมินแล้ว {speedRankingList.length} ท่าน
                  </span>
                </div>
              </div>

              {/* Filters & Search Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                {/* Filter Tabs */}
                <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                  <button
                    type="button"
                    onClick={() => setSurveyRankingFilter("all")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                      surveyRankingFilter === "all"
                        ? "bg-amber-500 text-slate-950 shadow-sm"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                    }`}
                  >
                    ทั้งหมด ({speedRankingList.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSurveyRankingFilter("top20")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                      surveyRankingFilter === "top20"
                        ? "bg-amber-500 text-slate-950 shadow-sm"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                    }`}
                  >
                    🏆 Top 20 แรก (สิทธิ์ของรางวัล)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSurveyRankingFilter("top30")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                      surveyRankingFilter === "top30"
                        ? "bg-amber-500 text-slate-950 shadow-sm"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                    }`}
                  >
                    🎁 Top 30 แรก
                  </button>
                  <button
                    type="button"
                    onClick={() => setSurveyRankingFilter("top50")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                      surveyRankingFilter === "top50"
                        ? "bg-amber-500 text-slate-950 shadow-sm"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                    }`}
                  >
                    Top 50
                  </button>
                </div>

                {/* Search Input */}
                <div className="relative min-w-[220px]">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={surveyRankingSearch}
                    onChange={(e) => setSurveyRankingSearch(e.target.value)}
                    placeholder="ค้นหาชื่อ, เบอร์, เลขบัตร..."
                    className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs placeholder-slate-400 focus:outline-none focus:bg-white focus:border-amber-400 transition-colors"
                  />
                  {surveyRankingSearch && (
                    <button
                      type="button"
                      onClick={() => setSurveyRankingSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Table or Empty State */}
              {filteredRankingList.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2 bg-slate-50/50 rounded-xl">
                  <Clock className="w-10 h-10 mx-auto opacity-30 text-amber-500" />
                  <div className="text-sm font-semibold text-slate-600">
                    {speedRankingList.length === 0
                      ? "ยังไม่มีข้อมูลผู้ส่งแบบประเมินความพึงพอใจ"
                      : "ไม่พบข้อมูลที่ตรงกับเงื่อนไขการค้นหา"}
                  </div>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    {speedRankingList.length === 0
                      ? "เมื่อผู้เข้าร่วมงานกดส่งแบบประเมิน ระบบจะบันทึกเวลาเป็นวินาทีและเรียงลำดับให้ทันที"
                      : "ลองเปลี่ยนคำค้นหา หรือเลือกตัวกรองหมวดหมู่ทั้งหมด"}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 uppercase tracking-wider text-[11px] font-bold">
                        <th className="py-3 px-3 text-center w-20">อันดับ</th>
                        <th className="py-3 px-3">เวลาที่ส่ง (วินาที)</th>
                        <th className="py-3 px-3">ผู้ประเมิน</th>
                        <th className="py-3 px-3">เลขที่บัตร</th>
                        <th className="py-3 px-3">สังกัด / คลับ</th>
                        <th className="py-3 px-3 text-center">คะแนนรวม</th>
                        <th className="py-3 px-3 text-center">สิทธิ์ของรางวัล</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {filteredRankingList.map((item) => {
                        const rank = item.rank;
                        const isTop1 = rank === 1;
                        const isTop2 = rank === 2;
                        const isTop3 = rank === 3;
                        const isTop20 = rank <= 20;
                        const isTop30 = rank <= 30;

                        return (
                          <tr
                            key={item.id || rank}
                            className={`transition-colors hover:bg-amber-50/50 ${
                              isTop1
                                ? "bg-amber-50/70"
                                : isTop2
                                  ? "bg-slate-50"
                                  : isTop3
                                    ? "bg-orange-50/60"
                                    : isTop20
                                      ? "bg-amber-50/30"
                                      : ""
                            }`}
                          >
                            {/* อันดับ */}
                            <td className="py-3 px-3 text-center">
                              {isTop1 ? (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black text-xs shadow-xs">
                                  <span>🥇</span>
                                  <span>#1</span>
                                </span>
                              ) : isTop2 ? (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-slate-200 to-slate-300 text-slate-950 font-black text-xs shadow-xs">
                                  <span>🥈</span>
                                  <span>#2</span>
                                </span>
                              ) : isTop3 ? (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-600 to-amber-700 text-white font-black text-xs shadow-xs">
                                  <span>🥉</span>
                                  <span>#3</span>
                                </span>
                              ) : isTop20 ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-mono font-bold text-xs border border-amber-200">
                                  #{rank}
                                </span>
                              ) : isTop30 ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-teal-100 text-teal-800 font-mono font-bold text-xs border border-teal-200">
                                  #{rank}
                                </span>
                              ) : (
                                <span className="font-mono text-slate-600 font-bold">
                                  #{rank}
                                </span>
                              )}
                            </td>

                            {/* เวลาส่งที่แม่นยำระดับวินาที */}
                            <td className="py-3 px-3">
                              <div className="flex items-center space-x-1.5 font-mono text-xs">
                                <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                <span className="font-bold text-amber-700 whitespace-nowrap">
                                  {item.displayTimeWithSec}
                                </span>
                              </div>
                            </td>

                            {/* ผู้ประเมิน */}
                            <td className="py-3 px-3">
                              <div className="font-bold text-slate-900 text-xs sm:text-sm">
                                {item.name} {item.nickname ? `(${item.nickname})` : ''}
                              </div>
                            </td>

                            {/* เลขที่บัตร */}
                            <td className="py-3 px-3">
                              <span className="font-mono text-amber-600 font-bold text-xs">
                                {item.ticketNo || "-"}
                              </span>
                            </td>

                            {/* สังกัด */}
                            <td className="py-3 px-3 text-slate-600">
                              {item.club || "-"}
                            </td>

                            {/* คะแนนรวม */}
                            <td className="py-3 px-3 text-center">
                              <span className="font-mono font-extrabold text-amber-700 text-xs bg-amber-50 px-2 py-1 rounded-md border border-amber-200">
                                {item.overallAverage || item.overallAvg || item.ratings?.ratingOverall || "0.00"} ⭐
                              </span>
                            </td>

                            {/* สิทธิ์ของรางวัล */}
                            <td className="py-3 px-3 text-center">
                              {isTop20 ? (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300">
                                  <span>🏆</span>
                                  <span>Top 20 (ได้รางวัล)</span>
                                </span>
                              ) : isTop30 ? (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-teal-100 text-teal-800 border border-teal-300">
                                  <span>🎁</span>
                                  <span>Top 30 (ได้รางวัล)</span>
                                </span>
                              ) : (
                                <span className="text-slate-400 text-xs font-mono">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </main>
        );
      })()}

      {/* ========================================================== */}
      {/* MODAL 1: CAMERA QR SCANNER MODAL                          */}
      {/* ========================================================== */}
      {isScannerOpen && (
        <TicketScannerModal
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          registrations={registrations}
          onCheckIn={handleScanSuccess}
          onCapturePhoto={(attendee, pType = 'checkin') => {
            setIsScannerOpen(false);
            openPhotoModal(attendee, pType);
          }}
          onToggleShirtReceived={onToggleShirtReceived}
        />
      )}

      {/* ========================================================== */}
      {/* MODAL 2: ADD GIFT REGISTRATION MODAL                      */}
      {/* ========================================================== */}
      {isGiftModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 rounded-3xl border border-amber-500/40 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                  <Gift className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base">
                    ลงทะเบียนของขวัญ
                  </h3>
                  <p className="text-xs text-slate-400">
                    เลือกผู้ร่วมงานที่นำของขวัญมา (เฉพาะผู้ที่เช็คอินเข้างานแล้ว)
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsGiftModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Next Gift Number Notification */}
            <div className="bg-amber-500/10 px-5 py-3 border-b border-amber-500/20 flex items-center justify-between text-xs">
              <span className="text-amber-200">
                หมายเลขของขวัญที่จะได้รับถัดไป:
              </span>
              <span className="font-mono font-extrabold text-sm px-3 py-0.5 rounded-lg bg-amber-500 text-slate-950 shadow-sm">
                #{giftList.length + 1}
              </span>
            </div>

            {/* Search Attendee Input */}
            <div className="p-4 border-b border-white/5">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อผู้ร่วมงาน, ชื่อเล่น, เลขที่บัตร..."
                  value={searchGiftAttendee}
                  onChange={(e) => setSearchGiftAttendee(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Eligible Attendees List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {filteredEligibleGift.map((r) => (
                <div
                  key={r.ticketNo}
                  onClick={() => handleSelectAttendeeForGift(r.ticketNo)}
                  className="p-3.5 rounded-2xl bg-slate-950/70 hover:bg-amber-500/15 border border-white/5 hover:border-amber-500/40 cursor-pointer transition-all flex items-center justify-between group"
                >
                  <div className="space-y-0.5">
                    <div className="font-bold text-white text-sm group-hover:text-amber-300 flex items-center space-x-1.5">
                      <span>{r.name}</span>
                      {r.nickname && <span className="text-amber-400 text-xs">({r.nickname})</span>}
                    </div>
                    <div className="text-xs text-slate-400 flex items-center space-x-2">
                      <span className="font-mono text-amber-400/90">{r.ticketNo}</span>
                      <span>•</span>
                      <span>{r.club || "สงสพัท"}</span>
                      <span>•</span>
                      <span className="text-emerald-400">เข้างานแล้ว ✓</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 group-hover:bg-amber-500 group-hover:text-slate-950 transition-all">
                      ออกเบอร์ #{giftList.length + 1}
                    </span>
                  </div>
                </div>
              ))}

              {filteredEligibleGift.length === 0 && (
                <div className="py-12 text-center text-slate-500 space-y-3 px-4">
                  <Gift className="w-10 h-10 mx-auto opacity-30 text-amber-400" />
                  <div className="text-sm font-semibold text-slate-400">
                    {eligibleForGift.length === 0
                      ? "ยังไม่มีผู้ร่วมงานที่เช็คอินเข้างานแล้วที่ยังไม่ได้รับเบอร์ของขวัญ"
                      : "ไม่พบรายชื่อที่ค้นหา"}
                  </div>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    {eligibleForGift.length === 0
                      ? "กรุณาสแกน QR Code เช็คอินเข้างานในแถบที่ 1 ก่อน เพื่อให้รายชื่อปรากฏในหน้านี้ครับ"
                      : "ลองค้นหาด้วยคำอื่น หรือตรวจสอบเลขที่บัตร"}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-white/10 bg-slate-950/60 flex justify-end">
              <button
                type="button"
                onClick={() => setIsGiftModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 hover:text-white"
              >
                ปิดหน้าต่าง
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* MODAL 3: EMERGENCY CHECK-IN OVERRIDE (ADMIN OVERRIDE)     */}
      {/* ========================================================== */}
      {emergencyTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 rounded-3xl border border-amber-500/40 shadow-2xl w-full max-w-md p-6 space-y-4">
            
            <div className="flex items-center space-x-3 text-amber-400">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center border border-amber-500/30">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-white text-base">
                  เช็คอินฉุกเฉินโดยแอดมิน
                </h3>
                <span className="text-xs text-amber-300">
                  Admin Manual Override
                </span>
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-white/5 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">ชื่อผู้ร่วมงาน:</span>
                <strong className="text-white font-bold">{emergencyTarget.name} ({emergencyTarget.nickname || "-"})</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">เลขที่บัตร:</span>
                <span className="font-mono text-amber-400 font-bold">{emergencyTarget.ticketNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">สังกัด:</span>
                <span className="text-slate-200">{emergencyTarget.club}</span>
              </div>
              {emergencyTarget.hasShirt && (
                <div className="flex justify-between text-amber-300 pt-1 border-t border-white/5">
                  <span>สิทธิ์เสื้อที่ระลึก:</span>
                  <strong>ไซซ์ {emergencyTarget.shirtSize} ({emergencyTarget.shirtGender || "ทั่วไป"})</strong>
                </div>
              )}
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              * ใช้เฉพาะกรณีผู้ร่วมงานไม่ได้บันทึกภาพบัตรเข้างาน หรือมือถือแบตหมด เพื่ออำนวยความสะดวกหน้างาน
            </p>

            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setEmergencyTarget(null)}
                className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 hover:text-white"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => {
                  const unpaidFine = getUnpaidFineForTicket(seatingPlan, emergencyTarget.ticketNo, Date.now());
                  if (unpaidFine) {
                    // Has late fine -> take check-in photo first, then LateHoldFineModal pops up right after saving photo!
                    playAudioEffect("beep");
                    openPhotoModal(emergencyTarget, 'checkin');
                    setEmergencyTarget(null);
                    return;
                  }
                  handleCheckInWithSeatCheck(emergencyTarget.ticketNo, true);
                  playAudioEffect("beep");
                  setLastCheckInAttendee(emergencyTarget);
                  openPhotoModal(emergencyTarget, 'checkin');
                  setEmergencyTarget(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/25 hover:from-emerald-400 hover:to-teal-400"
              >
                ยืนยันเช็คอินเข้างาน
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 4: CREATE CONTEST TEAM MODAL */}
      {isCreateTeamModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 rounded-3xl border border-indigo-500/40 shadow-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] flex flex-col">
            
            <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
              <div className="flex items-center space-x-2">
                <span className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
                  <Users className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-extrabold text-white text-base">สร้างกลุ่มผู้เข้าประกวดใหม่</h3>
                  <p className="text-xs text-slate-400">เลือกสมาชิกในทีมและตั้งชื่อกลุ่มสำหรับประกวด</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateTeamModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto pr-1">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  ชื่อกลุ่ม / ชื่อทีม <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="เช่น ทีมมนต์รักลูกทุ่ง, ทีมสงสพัท VIP..."
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-bold"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-bold text-slate-300 mb-2">
                  <span>เลือกสมาชิกในทีม ({selectedMemberTicketNos.length} คน):</span>
                  <span className="text-[11px] text-indigo-400 font-normal">
                    (เฉพาะผู้ลงทะเบียน)
                  </span>
                </div>

                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {registrations.map(r => {
                    const isSelected = selectedMemberTicketNos.includes(r.ticketNo);
                    return (
                      <div
                        key={r.ticketNo}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedMemberTicketNos(prev => prev.filter(t => t !== r.ticketNo));
                          } else {
                            setSelectedMemberTicketNos(prev => [...prev, r.ticketNo]);
                          }
                        }}
                        className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between text-xs ${
                          isSelected
                            ? "bg-indigo-500/20 border-indigo-500/50 text-white font-semibold"
                            : "bg-slate-950/60 border-white/5 text-slate-300 hover:bg-white/5"
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <div className={`w-4 h-4 rounded-md flex items-center justify-center text-[10px] font-bold ${
                            isSelected ? "bg-indigo-500 text-white" : "border border-white/20"
                          }`}>
                            {isSelected ? "✓" : ""}
                          </div>
                          <span>{r.name} {r.nickname ? `(${r.nickname})` : ""}</span>
                        </div>
                        <span className="font-mono text-[10px] text-slate-500">{r.ticketNo}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3 pt-3 border-t border-white/10 shrink-0">
              <button
                type="button"
                onClick={() => setIsCreateTeamModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 hover:text-white"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleCreateTeam}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-500/25 transition-all"
              >
                บันทึกกลุ่มผู้เข้าประกวด
              </button>
            </div>

          </div>
        </div>
      )}

      </div>

      {/* MODAL 5: ATTENDEE PHOTO CAPTURE MODAL (1:1 SQUARE) */}
      {photoModalTarget && (
        <AttendeePhotoModal
          isOpen={!!photoModalTarget}
          onClose={() => setPhotoModalTarget(null)}
          attendee={photoModalTarget}
          photoType={photoModalType}
          onSavePhoto={(photoUrl, ticketNo, pType) => {
            const actualUrl = (typeof photoUrl === 'string' && (photoUrl.startsWith('http') || photoUrl.startsWith('data:')))
              ? photoUrl
              : (typeof ticketNo === 'string' && (ticketNo.startsWith('http') || ticketNo.startsWith('data:')) ? ticketNo : photoUrl);
            const targetTicket = (ticketNo && !ticketNo.startsWith('http') && !ticketNo.startsWith('data:'))
              ? ticketNo
              : photoModalTarget?.ticketNo;
            const currentPType = pType || photoModalType || 'checkin';

            // If check-in photo AND attendee has an unpaid late-hold fine -> save photo first WITHOUT completing check-in, then immediately pop up LateHoldFineModal!
            if (currentPType === 'checkin' && targetTicket) {
              const unpaidFine = getUnpaidFineForTicket(seatingPlan, targetTicket, Date.now());
              if (unpaidFine) {
                if (onUpdateAttendeePhoto) {
                  onUpdateAttendeePhoto(targetTicket, actualUrl, 'checkin', false);
                }
                const targetAtt =
                  registrations.find((r) => r.ticketNo === targetTicket) || photoModalTarget;
                setPhotoModalTarget(null);
                setPendingLateFineCheckIn({
                  attendee: { ...targetAtt, photoUrl: actualUrl },
                  fine: unpaidFine
                });
                return;
              }
            }
            
            // Mark checkedIn: true as well when capturing photo at check-in desk
            if (currentPType === 'checkin' && onCheckIn && targetTicket) {
              handleCheckInWithSeatCheck(targetTicket, true);
            }
            if (onUpdateAttendeePhoto && targetTicket) {
              onUpdateAttendeePhoto(targetTicket, actualUrl, currentPType, currentPType === 'checkin');
            }
            setPhotoModalTarget(null);
            playAudioEffect("fanfare");
          }}
        />
      )}

      {/* MODAL 5.5: ATTENDEE PHOTO VIEWER (LIGHTBOX) */}
      {photoViewerTarget && (() => {
        const attendee = registrations.find(r => r.ticketNo === photoViewerTarget.ticketNo) || photoViewerTarget;
        const hasCheckin = Boolean(attendee.photoUrl);
        const hasShirt = Boolean(attendee.shirtPhoto);
        const activeTab = (photoViewerTab === 'shirt' && hasShirt) || (!hasCheckin && hasShirt) ? 'shirt' : 'checkin';
        const currentImg = activeTab === 'shirt' ? attendee.shirtPhoto : attendee.photoUrl;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
            <div className="bg-slate-900 rounded-3xl border border-amber-500/40 shadow-2xl w-full max-w-sm sm:max-w-md p-5 sm:p-6 space-y-4">
              
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center space-x-2.5">
                  <div className={`p-2 rounded-xl ${activeTab === 'shirt' ? 'bg-teal-500/20 text-teal-400' : 'bg-amber-500/20 text-amber-400'}`}>
                    {activeTab === 'shirt' ? <Shirt className="w-5 h-5" /> : <Camera className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-white text-base leading-tight">
                      {attendee.name} {attendee.nickname ? `(${attendee.nickname})` : ''}
                    </h3>
                    <p className="text-xs text-amber-400 font-mono font-semibold">
                      {attendee.ticketNo} • สนาม {attendee.club || 'สงสพัท'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPhotoViewerTarget(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Photo Type Toggle Tabs (If both exist or shirt eligible) */}
              {(hasCheckin || hasShirt) && (
                <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-2xl border border-white/10">
                  <button
                    type="button"
                    onClick={() => setPhotoViewerTab('checkin')}
                    className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
                      activeTab === 'checkin'
                        ? 'bg-amber-500 text-slate-950 shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>📸 รูปเข้างาน {hasCheckin ? '✓' : '(ว่าง)'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPhotoViewerTab('shirt')}
                    className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
                      activeTab === 'shirt'
                        ? 'bg-teal-400 text-slate-950 shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Shirt className="w-3.5 h-3.5" />
                    <span>👕 รูปรับเสื้อ {hasShirt ? '✓' : '(ว่าง)'}</span>
                  </button>
                </div>
              )}

              {/* High-Res Photo Display */}
              <div className="relative rounded-2xl overflow-hidden aspect-square border-2 border-amber-400/40 shadow-2xl bg-black flex items-center justify-center">
                {currentImg ? (
                  <img
                    src={currentImg}
                    alt={attendee.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="p-6 text-center text-slate-500 space-y-2">
                    <AlertCircle className="w-10 h-10 text-slate-600 mx-auto" />
                    <p className="text-xs">ยังไม่มี{activeTab === 'shirt' ? 'รูปรับเสื้อ' : 'รูปเข้างาน'}</p>
                    <button
                      type="button"
                      onClick={() => {
                        setPhotoViewerTarget(null);
                        openPhotoModal(attendee, activeTab);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs"
                    >
                      ถ่ายรูปตอนนี้
                    </button>
                  </div>
                )}
              </div>

              {/* Info Badges */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-2xl bg-white/5 border border-white/10 text-xs">
                <div className="text-slate-300">
                  เสื้อที่ระลึก: <strong className="text-white">ไซส์ {attendee.shirtSize || 'L'} ({attendee.shirtGender || 'ชาย'})</strong>
                </div>
                <div>
                  {attendee.shirtReceived ? (
                    <span className="text-[10px] font-bold text-teal-300 bg-teal-500/20 border border-teal-500/30 px-2 py-0.5 rounded-full">
                      ✓ รับเสื้อแล้ว
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-amber-300 bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 rounded-full">
                      📦 ยังไม่ได้รับเสื้อ
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const target = attendee;
                    const typeToShoot = activeTab;
                    setPhotoViewerTarget(null);
                    openPhotoModal(target, typeToShoot);
                  }}
                  className="py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center space-x-1.5 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>📸 ถ่ายรูป{activeTab === 'shirt' ? 'รับเสื้อใหม่' : 'เข้างานใหม่'}</span>
                </button>

                {currentImg ? (
                  <a
                    href={currentImg}
                    download={`รูป_${activeTab}_${attendee.ticketNo}_${attendee.name}.jpg`}
                    target="_blank"
                    rel="noreferrer"
                    className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center space-x-1.5 border border-white/10 transition-all cursor-pointer text-center"
                  >
                    <Download className="w-4 h-4" />
                    <span>💾 บันทึกรูปภาพ</span>
                  </a>
                ) : (
                  <div className="py-2.5 px-3 rounded-xl bg-slate-800/40 text-slate-600 font-bold text-xs flex items-center justify-center space-x-1.5 border border-white/5">
                    <span>ไม่มีรูปให้โหลด</span>
                  </div>
                )}
              </div>

            </div>
          </div>
        );
      })()}

      {/* MODAL 6: SHIRT 16:9 MASTER PRESENTATION SLIDE */}
      <ShirtPresentationModal
        isOpen={isShirtSlideOpen}
        onClose={() => setIsShirtSlideOpen(false)}
        attendees={registrations}
        eventTitle={eventConfig?.eventTitle || "งานสังสรรค์ปีใหม่ SME FAN 2026"}
      />

      {/* MODAL 7: CONTEST JUDGE MOBILE INTERFACE MODAL */}
      <ContestJudgeModal
        isOpen={isJudgeModalOpen}
        onClose={() => setIsJudgeModalOpen(false)}
        attendees={registrations}
        teams={contestTeams}
        existingVotes={allJudgeVotes}
        onSaveVotes={(voteData) => {
          try {
            const saved = localStorage.getItem(CONTEST_VOTES_STORAGE_KEY);
            let list = saved ? JSON.parse(saved) : [];
            const cleanVPhone = cleanPhoneNumber(voteData.judgePhone);
            const existingIdx = list.findIndex(v => 
              (voteData.judgeTicketNo && v.judgeTicketNo === voteData.judgeTicketNo) || 
              (cleanVPhone && v.judgePhone && cleanPhoneNumber(v.judgePhone) === cleanVPhone) ||
              (voteData.judgeId && v.judgeId === voteData.judgeId) || 
              (voteData.judgeName && v.judgeName === voteData.judgeName)
            );
            if (existingIdx >= 0) {
              const mergedAudit = [
                ...(list[existingIdx].auditLogs || list[existingIdx].auditTrail || []),
                ...(voteData.auditLogs || voteData.auditTrail || [])
              ];
              list[existingIdx] = {
                ...voteData,
                auditLogs: mergedAudit,
                auditTrail: mergedAudit
              };
            } else {
              list.push({
                ...voteData,
                auditTrail: voteData.auditLogs || []
              });
            }
            localStorage.setItem(CONTEST_VOTES_STORAGE_KEY, JSON.stringify(list));
            setAllJudgeVotes([...list]);
            playAudioEffect("fanfare");
            triggerConfetti();
          } catch (e) {}
        }}
      />

      {/* High-Security Multi-step Clear Modal */}
      <ClearSecurityModal
        isOpen={isClearSecurityOpen}
        onClose={() => setIsClearSecurityOpen(false)}
        currentUser={currentUser}
        totalRegistrations={registrations.length}
        onSelectPurgePhotos={() => setIsPurgeModalOpen(true)}
        onSelectResetRegistrations={() => setIsResetModalOpen(true)}
      />

      {/* Storage Purge Modal (Post-Event Photo Cleanup) */}
      <StoragePurgeModal
        isOpen={isPurgeModalOpen}
        onClose={() => setIsPurgeModalOpen(false)}
        registrations={registrations}
        onPurgeComplete={(cleanedRegistrations) => {
          if (onPurgeComplete) {
            onPurgeComplete(cleanedRegistrations);
          }
        }}
      />

      {/* Dedicated Reset All Registrations & Scores Modal */}
      <ResetRegistrationsModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        totalRegistrations={registrations.length}
        onConfirmReset={async () => {
          if (onResetAllRegistrations) {
            await onResetAllRegistrations();
          }
          setAllJudgeVotes([]);
          setContestTeams([]);
          try {
            localStorage.removeItem(CONTEST_VOTES_STORAGE_KEY);
            localStorage.removeItem(CONTEST_TEAMS_STORAGE_KEY);
            localStorage.removeItem("sme_fan_judge_scores_v1");
          } catch (e) {}
        }}
      />

      {/* Attendee Details & Slip Inspection Modal */}
      <AttendeeInspectionModal
        isOpen={!!activeInspectingAttendee}
        onClose={() => setInspectingAttendee(null)}
        attendee={activeInspectingAttendee}
        onCheckIn={handleCheckInWithSeatCheck}
        onShirtReceive={onToggleShirtReceived}
        onViewTicket={onViewTicket}
        onUpdateAttendee={(updated) => {
          if (onUpdateRegistration) {
            onUpdateRegistration(updated);
          }
          setInspectingAttendee(updated);
        }}
        eventConfig={eventConfig}
      />

      {/* Admin Survey Builder Modal */}
      {isSurveyBuilderOpen && (
        <AdminSurveyManagerModal
          isOpen={isSurveyBuilderOpen}
          onClose={() => setIsSurveyBuilderOpen(false)}
          surveyConfig={eventConfig?.surveyConfig}
          onSaveConfig={(newConfig) => {
            if (setEventConfig) {
              setEventConfig(prev => ({
                ...prev,
                surveyConfig: newConfig
              }));
            }
          }}
        />
      )}

      {/* Admin Survey Test Preview Modal */}
      {isSurveyPreviewOpen && (
        <SatisfactionSurveyModal
          isOpen={isSurveyPreviewOpen}
          onClose={() => setIsSurveyPreviewOpen(false)}
          surveyConfig={eventConfig?.surveyConfig}
          isPreviewMode={true}
        />
      )}

      {/* ========================================================== */}
      {/* CHECK-IN HELD SEAT CONFIRMATION MODAL                      */}
      {/* เด้งถามทันทีเมื่อผู้ที่จองที่นั่งล่วงหน้า 15 นาที มาลงทะเบียนเข้างานจริง */}
      {/* ========================================================== */}
      {pendingCheckInSeatConfirm && (() => {
        const { attendee, seatInfo } = pendingCheckInSeatConfirm;
        const liveSeat = attendeeSeatMap.get(attendee.ticketNo) || seatInfo;
        const isOwnerUser = currentUser?.role === "owner";

        return (
          <div className="fixed inset-0 z-[95] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-3xl border-4 border-emerald-400 shadow-2xl overflow-hidden text-slate-900">
              {/* Top Celebration Header */}
              <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white text-center space-y-2">
                <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-extrabold">
                  <Armchair className="w-4 h-4" />
                  <span>พบการจองเก้าอี้ล่วงหน้าไว้แล้ว!</span>
                </div>

                {attendee.photoUrl && (
                  <img
                    src={attendee.photoUrl}
                    alt={attendee.name}
                    className="w-16 h-16 rounded-full object-cover ring-4 ring-emerald-400 mx-auto shadow-lg"
                  />
                )}

                <div>
                  <h3 className="text-lg sm:text-xl font-black leading-tight">
                    {attendee.name}
                    {attendee.nickname && (
                      <span className="text-amber-300 ml-1.5 font-bold">({attendee.nickname})</span>
                    )}
                  </h3>
                  <p className="text-xs text-emerald-300 font-mono mt-0.5">
                    ✓ ลงทะเบียนเข้างานสำเร็จ ({attendee.ticketNo})
                  </p>
                </div>
              </div>

              {/* Body: Huge Seat Highlight + Big Confirm CTA + Small Change Request Button */}
              <div className="p-6 text-center space-y-4">
                <p className="text-sm font-bold text-slate-700">
                  ท่านประสงค์ที่จะนั่งเก้าอี้หมายเลขที่จองล่วงหน้าไว้หรือไม่?
                </p>

                <div className="py-5 px-4 rounded-2xl bg-gradient-to-br from-sky-50 via-emerald-50 to-teal-50 border-2 border-emerald-400 shadow-inner space-y-1">
                  <div className="text-xs font-extrabold text-emerald-700 uppercase tracking-wider">
                    ที่นั่งที่จองล่วงหน้าไว้
                  </div>
                  <div className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                    {liveSeat.tableLabel} • เก้าอี้ {liveSeat.seatCode}
                  </div>
                  {liveSeat.status === "hold" && liveSeat.remainingMs > 0 && (
                    <div className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-amber-100 border border-amber-300 text-amber-800 text-[11px] font-mono font-bold mt-1">
                      <Clock className="w-3 h-3" />
                      <span>เวลาจองชั่วคราวคงเหลือ {formatCountdownMmSs(liveSeat.remainingMs)} น.</span>
                    </div>
                  )}
                </div>

                {/* Primary BIG Prominent Confirm Button */}
                <button
                  type="button"
                  onClick={handleConfirmHeldSeatOnCheckIn}
                  className="w-full py-4 px-5 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-base sm:text-lg shadow-xl shadow-emerald-600/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
                  <span>ยืนยันเก้าอี้ {liveSeat.seatCode} ({liveSeat.tableLabel})</span>
                </button>

                {/* Small Subtle Secondary Button: ขอเปลี่ยนที่นั่ง */}
                <div className="pt-1 flex flex-col items-center space-y-1">
                  <button
                    type="button"
                    onClick={handleRequestChangeHeldSeatOnCheckIn}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-500 hover:text-amber-700 hover:bg-amber-50 border border-slate-200 hover:border-amber-300 transition-all cursor-pointer"
                  >
                    {isOwnerUser ? "ขอเปลี่ยนที่นั่ง (เจ้าของแอปเปลี่ยนได้ทันที)" : "ขอเปลี่ยนที่นั่ง (ส่งให้เจ้าของแอปอนุมัติ)"}
                  </button>
                  {!isOwnerUser && (
                    <span className="text-[10px] text-slate-400">
                      หมายเหตุ: การเปลี่ยนที่นั่งต้องได้รับอนุมัติจากเจ้าของแอปเท่านั้น
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ========================================================== */}
      {/* LATE ARRIVAL HOLD FINE PAYMENT MODAL                       */}
      {/* เด้งแจ้งเตือนหลังถ่ายรูปเข้างานเมื่อจองล่วงหน้า 30/60 นาทีแล้วมาไม่ทัน */}
      {/* ========================================================== */}
      <LateHoldFineModal
        isOpen={Boolean(pendingLateFineCheckIn)}
        attendee={pendingLateFineCheckIn?.attendee || null}
        fine={pendingLateFineCheckIn?.fine || null}
        qrCodeUrl={seatingPlan?.fineQrCodeUrl || eventConfig?.qrCodeImage || null}
        onCompletePaymentAndCheckIn={handleCompleteLateFineAndCheckIn}
        onCancel={() => setPendingLateFineCheckIn(null)}
      />

      {/* Footer Accreditation */}
      <footer className="relative z-10 py-6 border-t border-white/5 text-center text-xs text-slate-500 space-y-1">
        <p>© 2026 งานสังสรรค์ปีใหม่ SME FAN 2026</p>
        <p className="text-[11px] text-slate-600">นักพัฒนาซอฟต์แวร์ คุณทีป์ชลิต ทองจันทร์ (ผอ.โต๊ด)</p>
      </footer>

    </div>
  );
}
