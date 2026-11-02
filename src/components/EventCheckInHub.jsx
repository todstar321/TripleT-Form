import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  Camera, 
  Search, 
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
  Download
} from "lucide-react";
import confetti from "canvas-confetti";
import QRCode from "qrcode";
import TicketScannerModal from "./TicketScannerModal";
import AttendeePhotoModal from "./AttendeePhotoModal";
import ShirtPresentationModal from "./ShirtPresentationModal";
import ContestJudgeModal from "./ContestJudgeModal";
import StoragePurgeModal from "./StoragePurgeModal";
import { cleanPhoneNumber } from "../utils/phoneFormatter";

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

export default function EventCheckInHub({
  eventConfig,
  currentUser,
  registrations = [],
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
  lastCloudSync
}) {
  // Main Tab: "checkin" | "gifts" | "shirts" | "contest" | "lucky_draw"
  const [activeMainTab, setActiveMainTab] = useState("checkin");

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

  // Storage Purge Modal State (Delete photos/slips after event)
  const [isPurgeModalOpen, setIsPurgeModalOpen] = useState(false);

  // Camera QR Scanner Modal State
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [lastCheckInAttendee, setLastCheckInAttendee] = useState(null);

  // Photo Capture Modal State (1:1 Ratio)
  const [photoModalTarget, setPhotoModalTarget] = useState(null);
  // High-Resolution Photo Viewer Lightbox State
  const [photoViewerTarget, setPhotoViewerTarget] = useState(null);

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
      const saved = localStorage.getItem("sme_fan_contest_teams_v1");
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
      const saved = localStorage.getItem("sme_fan_contest_all_votes_v1");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Sync contest teams to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("sme_fan_contest_teams_v1", JSON.stringify(contestTeams));
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
        const saved = localStorage.getItem("sme_fan_contest_all_votes_v1");
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
  const [drawSubTab, setDrawSubTab] = useState("general"); // "general" | "grand" | "gift_exclusive"
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

  // Sound effects enabled toggle
  const [soundEnabled, setSoundEnabled] = useState(true);

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
        photoUrl: r.photoUrl || r.costumePhoto || ""
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
        photoUrl: attendee.photoUrl || attendee.costumePhoto,
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
      if (filterCheckInClub !== "all" && r.club !== filterCheckInClub) return false;
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
    playAudioEffect("beep");
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }
    onCheckIn(scannedAttendee.ticketNo, true);
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

  // Current candidate pool for lucky draw
  const candidatePool = useMemo(() => {
    return getCandidatePool();
  }, [drawSubTab, checkedInList, registrations, grandPrizeWinners, giftQueueWinners, giftList]);

  // Search filtered pool for Right-Side Panel
  const filteredCandidatePool = useMemo(() => {
    return candidatePool.filter(r => {
      if (!searchDrawPool.trim()) return true;
      const q = searchDrawPool.toLowerCase();
      const matchName = r.name?.toLowerCase().includes(q);
      const matchNick = r.nickname?.toLowerCase().includes(q);
      const matchTicket = r.ticketNo?.toLowerCase().includes(q);
      const matchClub = r.club?.toLowerCase().includes(q);
      return matchName || matchNick || matchTicket || matchClub;
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

      {/* Top Header Bar */}
      <header className="relative z-10 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl sticky top-0 px-4 sm:px-6 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        
        {/* Left: Branding & Back to Portal */}
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={onBackToPortal}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all shadow-sm"
            title="กลับสู่ศูนย์ควบคุม Owner"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div>
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <h1 className="font-extrabold text-white text-base sm:text-lg tracking-tight">
                ระบบลงทะเบียนเข้างาน & กิจกรรมหน้างาน
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                Live On-Site
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {eventConfig?.eventTitle || "งานสังสรรค์ปีใหม่ SME FAN 2026"} • {currentUser?.name || "ทีป์ชลิต"}
            </p>
          </div>
        </div>

        {/* Center: Live Stats Chips */}
        <div className="flex items-center space-x-2 sm:space-x-3 text-xs overflow-x-auto pb-1 md:pb-0">
          <div className="px-3 py-1.5 rounded-xl bg-slate-900/90 border border-white/10 flex items-center space-x-1.5 shrink-0">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400">ผู้สมัครทั้งหมด:</span>
            <strong className="text-white font-mono">{totalCount}</strong>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-emerald-950/60 border border-emerald-500/30 flex items-center space-x-1.5 shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-emerald-300">เข้างานแล้ว:</span>
            <strong className="text-emerald-400 font-mono">{checkedInCount}</strong>
            <span className="text-[10px] text-emerald-400/80">({totalCount > 0 ? Math.round((checkedInCount / totalCount) * 100) : 0}%)</span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-amber-950/60 border border-amber-500/30 flex items-center space-x-1.5 shrink-0">
            <Gift className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-amber-300">ของขวัญ:</span>
            <strong className="text-amber-400 font-mono">{giftCount}</strong>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-teal-950/60 border border-teal-500/30 flex items-center space-x-1.5 shrink-0">
            <Shirt className="w-3.5 h-3.5 text-teal-400" />
            <span className="text-teal-300">เสื้อที่ระลึก:</span>
            <strong className="text-teal-400 font-mono">{shirtReceivedCount}/{shirtTotalCount}</strong>
          </div>
        </div>

        {/* Right: Sound & Navigation Switches */}
        <div className="flex items-center space-x-2 shrink-0">
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-xl border text-xs transition-all ${
              soundEnabled 
                ? "bg-amber-500/20 border-amber-500/40 text-amber-300" 
                : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
            }`}
            title={soundEnabled ? "ปิดเสียงเอฟเฟกต์" : "เปิดเสียงเอฟเฟกต์"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => setIsPurgeModalOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/30 text-xs font-semibold text-rose-300 hover:text-white transition-all shadow-sm"
            title="ล้างรูปภาพและสลิปหลังจบงานเพื่อประหยัดพื้นที่"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden sm:inline">ลบรูปหลังจบงาน</span>
          </button>

          {onForceSyncCloud && (
            <button
              type="button"
              onClick={handleManualSync}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-sm cursor-pointer ${
                isSyncing 
                  ? "bg-emerald-500/30 border-emerald-400 text-emerald-200 animate-pulse" 
                  : "bg-emerald-950/60 hover:bg-emerald-900/80 border-emerald-500/40 text-emerald-300 hover:text-white"
              }`}
              title={`ซิงค์ข้อมูล Cloud ล่าสุด (อัปเดตล่าสุด: ${lastCloudSync ? lastCloudSync.toLocaleTimeString('th-TH') : 'เรียลไทม์'})`}
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isSyncing ? "animate-spin" : ""}`} />
              <span className="inline">ซิงค์ Cloud</span>
              <span className="hidden lg:inline text-[10px] text-emerald-400/80 font-normal">
                ({lastCloudSync ? lastCloudSync.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'สด'})
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={onGoToSettings}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-xs font-semibold text-slate-300 hover:text-white transition-all shadow-sm"
            title="ไปยังหน้าตั้งค่าระบบ (แอดมิน)"
          >
            <Settings className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">ตั้งค่าระบบ</span>
          </button>

          <button
            type="button"
            onClick={onSwitchToPublicForm}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white transition-all"
            title="ไปยังหน้าฟอร์มลงทะเบียน"
          >
            <Globe className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 5 Main Tabs Header */}
      <div className="relative z-10 bg-slate-900/60 border-b border-white/10 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center space-x-2 sm:space-x-3 overflow-x-auto py-2.5">
          
          {/* Tab 1: ลงทะเบียนเข้า */}
          <button
            type="button"
            onClick={() => setActiveMainTab("checkin")}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 ${
              activeMainTab === "checkin"
                ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/25"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>ลงทะเบียนเข้า ({checkedInCount}/{totalCount})</span>
          </button>

          {/* Tab 2: ลงทะเบียนจับของขวัญ */}
          <button
            type="button"
            onClick={() => setActiveMainTab("gifts")}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 ${
              activeMainTab === "gifts"
                ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/25"
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
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 ${
              activeMainTab === "shirts"
                ? "bg-teal-500 text-slate-950 shadow-lg shadow-teal-500/25"
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
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 ${
              activeMainTab === "contest"
                ? "bg-rose-500 text-white shadow-lg shadow-rose-500/25"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Crown className="w-4 h-4" />
            <span>การประกวดการแข่งขัน</span>
          </button>

          {/* Tab 5: Random จับของรางวัล */}
          <button
            type="button"
            onClick={() => setActiveMainTab("lucky_draw")}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 ${
              activeMainTab === "lucky_draw"
                ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/25"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Dices className="w-4 h-4" />
            <span>Random จับของรางวัล</span>
          </button>

        </div>
      </div>

      {/* ========================================================== */}
      {/* TAB 1: แถบลงทะเบียนเข้า (CHECK-IN)                         */}
      {/* ========================================================== */}
      {activeMainTab === "checkin" && (
        <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-4">
          
          {/* Top Action & Search Bar */}
          <div className="bg-slate-900/80 rounded-2xl p-4 border border-white/10 shadow-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            
            {/* Primary Action Button: Open Camera Scanner */}
            <button
              type="button"
              onClick={() => setIsScannerOpen(true)}
              className="flex items-center justify-center space-x-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-sm shadow-xl shadow-emerald-500/25 hover:scale-[1.02] active:scale-95 transition-all"
            >
              <Camera className="w-5 h-5" />
              <span>📷 เปิดกล้องสแกน QR Code บัตรเข้างาน</span>
            </button>

            {/* Search & Filters */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1 md:max-w-xl md:justify-end">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อ, ชื่อเล่น, เลขที่บัตร, เบอร์..."
                  value={searchCheckIn}
                  onChange={(e) => setSearchCheckIn(e.target.value)}
                  className="w-full bg-slate-950/80 border border-white/10 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <select
                value={filterCheckInStatus}
                onChange={(e) => setFilterCheckInStatus(e.target.value)}
                className="bg-slate-950/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
              >
                <option value="all">สถานะทั้งหมด</option>
                <option value="checked_in">🟢 เข้างานแล้ว</option>
                <option value="not_checked_in">⚪ ยังไม่เข้างาน</option>
              </select>

              <select
                value={filterCheckInClub}
                onChange={(e) => setFilterCheckInClub(e.target.value)}
                className="bg-slate-950/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
              >
                <option value="all">ทุกสังกัด</option>
                <option value="สงสพัท">สงสพัท</option>
                <option value="โรตารี่">โรตารี่</option>
              </select>
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

          {/* Google Sheets Style Table */}
          <div className="bg-slate-900/70 rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
            
            {/* Sheet Sub-header Bar */}
            <div className="bg-slate-950/80 px-3 sm:px-4 py-2 sm:py-2.5 border-b border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-[11px] sm:text-xs text-slate-400">
              <div className="flex items-center space-x-2 font-mono">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="font-bold text-slate-200">Google Sheets View:</span>
                <span className="truncate">ตารางรายชื่อผู้ลงทะเบียนออนไลน์ (เรียงลำดับ 1 ถึง {totalCount})</span>
              </div>
              <div className="text-[10px] sm:text-xs text-slate-400">
                แสดง {filteredCheckInList.length} จากทั้งหมด {totalCount} รายการ
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto max-h-[620px] overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-950/90 text-slate-400 font-semibold sticky top-0 z-10 border-b border-white/10">
                  <tr>
                    <th className="py-2.5 px-2 sm:py-3 sm:px-3 w-12 sm:w-14 text-center border-r border-white/5 text-[11px] sm:text-xs">ลำดับ</th>
                    <th className="py-2.5 px-2.5 sm:py-3 sm:px-3.5 w-20 sm:w-24 border-r border-white/5 text-[11px] sm:text-xs">เลขที่บัตร</th>
                    <th className="py-2.5 px-1.5 sm:py-3 sm:px-2 w-14 sm:w-16 text-center border-r border-white/5 text-[11px] sm:text-xs">รูปถ่าย</th>
                    <th className="py-2.5 px-3 sm:py-3 sm:px-4 border-r border-white/5 min-w-[140px] sm:min-w-[180px] text-[11px] sm:text-xs">ชื่อ - นามสกุล (ชื่อเล่น)</th>
                    <th className="py-2.5 px-2.5 sm:py-3 sm:px-3.5 border-r border-white/5 min-w-[100px] sm:min-w-[120px] text-[11px] sm:text-xs">ประเภท / สังกัด</th>
                    <th className="py-2.5 px-2.5 sm:py-3 sm:px-3.5 border-r border-white/5 text-[11px] sm:text-xs">เบอร์โทรศัพท์</th>
                    <th className="py-2.5 px-2.5 sm:py-3 sm:px-3.5 border-r border-white/5 text-[11px] sm:text-xs">เสื้อที่ระลึก</th>
                    <th className="py-2.5 px-3 sm:py-3 sm:px-4 border-r border-white/5 min-w-[130px] sm:min-w-[150px] text-[11px] sm:text-xs">สถานะเข้างาน</th>
                    <th className="py-2.5 px-2 sm:py-3 sm:px-3.5 border-r border-white/5 text-center text-[11px] sm:text-xs">ของขวัญ</th>
                    <th className="py-2.5 px-2 sm:py-3 sm:px-3 text-center text-[11px] sm:text-xs">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredCheckInList.map((r, idx) => {
                    const isCheckedIn = !!r.checkedIn;
                    return (
                      <tr 
                        key={r.ticketNo || idx}
                        className={`hover:bg-white/[0.03] transition-colors ${
                          isCheckedIn ? "bg-emerald-950/15" : ""
                        }`}
                      >
                        {/* 1. ลำดับ */}
                        <td className="py-2 px-2 sm:py-2.5 sm:px-3 text-center font-mono text-slate-400 border-r border-white/5 text-[11px] sm:text-xs">
                          {idx + 1}
                        </td>

                        {/* 2. เลขที่บัตร */}
                        <td className="py-2 px-2.5 sm:py-2.5 sm:px-3.5 font-mono font-bold text-amber-400 border-r border-white/5 text-[11px] sm:text-xs">
                          {r.ticketNo || "SME-001"}
                        </td>

                        {/* 2.5 รูปถ่าย (1:1) */}
                        <td className="py-2 px-1.5 sm:py-2 sm:px-2 text-center border-r border-white/5">
                          {r.photoUrl || r.costumePhoto ? (
                            <button
                              type="button"
                              onClick={() => setPhotoViewerTarget(r)}
                              className="relative inline-block cursor-pointer group hover:scale-110 active:scale-95 transition-all mx-auto"
                              title="คลิกเพื่อดูรูปถ่ายขนาดใหญ่"
                            >
                              <img
                                src={r.photoUrl || r.costumePhoto}
                                alt={r.name}
                                className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl object-cover border-2 border-amber-400/70 shadow-md mx-auto group-hover:border-amber-300"
                              />
                              <span className="absolute -bottom-1 -right-1 px-1 py-0.5 rounded-full bg-slate-900 border border-amber-400/60 text-[9px] text-amber-300 shadow leading-none font-bold">
                                🔍
                              </span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setPhotoModalTarget(r)}
                              className="p-1.5 px-2 rounded-xl bg-white/5 hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-300 border border-white/10 hover:border-emerald-500/30 transition-all inline-flex items-center space-x-1 cursor-pointer"
                              title="ถ่ายรูปผู้เข้าร่วมงาน (สัดส่วน 1:1)"
                            >
                              <Camera className="w-3.5 h-3.5" />
                              <span className="text-[10px]">ถ่าย</span>
                            </button>
                          )}
                        </td>

                        {/* 3. ชื่อ - นามสกุล */}
                        <td className="py-2 px-3 sm:py-2.5 sm:px-4 font-semibold text-white border-r border-white/5 text-[11px] sm:text-xs">
                          <div className="flex items-center space-x-1.5">
                            <span>{r.name}</span>
                            {r.nickname && (
                              <span className="text-amber-300 font-normal text-[10px] sm:text-[11px]">
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
                        <td className="py-2 px-2.5 sm:py-2.5 sm:px-3.5 border-r border-white/5 text-[11px] sm:text-xs">
                          {r.regType === "member" ? (
                            <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 whitespace-nowrap">
                              สมาชิก{r.club || "สงสพัท"}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 whitespace-nowrap">
                              แขกผู้มีเกียรติ {r.club && `(${r.club})`}
                            </span>
                          )}
                        </td>

                        {/* 5. เบอร์โทร */}
                        <td className="py-2 px-2.5 sm:py-2.5 sm:px-3.5 font-mono text-slate-300 border-r border-white/5 text-[11px] sm:text-xs whitespace-nowrap">
                          {r.phone || "-"}
                        </td>

                        {/* 6. เสื้อที่ระลึก */}
                        <td className="py-2 px-2.5 sm:py-2.5 sm:px-3.5 border-r border-white/5 text-[11px] sm:text-xs whitespace-nowrap">
                          {r.hasShirt ? (
                            <span className="text-amber-300 font-medium text-[10px] sm:text-[11px] flex items-center space-x-1">
                              <Shirt className="w-3 h-3 text-amber-400" />
                              <span>{r.shirtSize} ({r.shirtGender || "ทั่วไป"})</span>
                            </span>
                          ) : (
                            <span className="text-slate-500">-</span>
                          )}
                        </td>

                        {/* 7. สถานะเข้างาน */}
                        <td className="py-2 px-3 sm:py-2.5 sm:px-4 border-r border-white/5 whitespace-nowrap">
                          {isCheckedIn ? (
                            <div className="inline-flex items-center space-x-1 sm:space-x-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] sm:text-[11px] font-bold shadow-xs">
                              <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-400" />
                              <span>เข้างานแล้ว {r.checkedInAt ? `(${r.checkedInAt})` : ""}</span>
                            </div>
                          ) : (
                            <span className="inline-flex items-center space-x-1 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-slate-800 text-slate-400 text-[10px] sm:text-[11px] font-medium border border-white/5">
                              <span>⏳ ยังไม่เข้างาน</span>
                            </span>
                          )}
                        </td>

                        {/* 8. สถานะของขวัญ */}
                        <td className="py-2 px-2 sm:py-2.5 sm:px-3.5 text-center border-r border-white/5 whitespace-nowrap">
                          {r.giftNumber ? (
                            <span className="font-mono font-extrabold px-2 py-0.5 rounded-md bg-amber-500/25 text-amber-300 border border-amber-500/40 text-[10px] sm:text-xs">
                              🎁 #{r.giftNumber}
                            </span>
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </td>

                        {/* 9. การจัดการ (ปุ่มเช็คอินฉุกเฉิน) */}
                        <td className="py-2 px-2 sm:py-2.5 sm:px-3 text-center whitespace-nowrap">
                          {isCheckedIn ? (
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`ต้องการยกเลิกสถานะเข้างานของคุณ ${r.name} ใช่หรือไม่?`)) {
                                  onCheckIn(r.ticketNo, false);
                                }
                              }}
                              className="text-[9px] sm:text-[10px] px-2 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition-all"
                              title="ยกเลิกการเช็คอิน"
                            >
                              ยกเลิก
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setEmergencyTarget(r)}
                              className="text-[9px] sm:text-[10px] px-2 sm:px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 font-medium transition-all"
                              title="กดเช็คอินกรณีฉุกเฉิน (ผู้ร่วมงานไม่ได้บันทึกภาพบัตรมา)"
                            >
                              ⚡ เช็คอินฉุกเฉิน
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {filteredCheckInList.length === 0 && (
                <div className="py-12 text-center text-slate-500 space-y-2">
                  <Search className="w-8 h-8 mx-auto opacity-30" />
                  <p>ไม่พบรายชื่อผู้ลงทะเบียนที่ตรงกับเงื่อนไขการค้นหา</p>
                </div>
              )}
            </div>
          </div>
        </main>
      )}

      {/* ========================================================== */}
      {/* TAB 2: แถบลงทะเบียนจับของขวัญ (GIFT EXCHANGE)              */}
      {/* ========================================================== */}
      {activeMainTab === "gifts" && (
        <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-4">
          
          {/* Header Card for Gifts */}
          <div className="bg-slate-900/80 rounded-2xl p-5 border border-amber-500/30 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <Gift className="w-5 h-5 text-amber-400" />
                <h2 className="text-lg sm:text-xl font-black text-white">
                  ตารางลงทะเบียนจับของขวัญปีใหม่
                </h2>
                <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                  ลงทะเบียนแล้ว {giftCount} ชิ้น
                </span>
              </div>
              <p className="text-xs text-slate-300">
                เมื่อผู้ร่วมงานนำของขวัญมาส่งที่จุดลงทะเบียน ให้กดปุ่มเครื่องหมายบวก (+) เพื่อเลือกชื่อและรับหมายเลขของขวัญทันที
              </p>
            </div>

            {/* Quick Add Button in header */}
            <button
              type="button"
              onClick={() => setIsGiftModalOpen(true)}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 hover:scale-105 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>เพิ่มผู้ลงทะเบียนของขวัญ</span>
            </button>
          </div>

          {/* Google Sheets Style Table for Gifts */}
          <div className="bg-slate-900/70 rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
            <div className="bg-slate-950/80 px-3 sm:px-4 py-2 sm:py-2.5 border-b border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-[11px] sm:text-xs text-slate-400 font-mono">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                <span className="font-bold text-slate-200">Google Sheets View:</span>
                <span className="truncate">ตารางหมายเลขของขวัญ (เรียงลำดับ 1 ถึง {giftCount > 0 ? giftCount : "..."})</span>
              </div>
              <div className="text-[10px] sm:text-xs text-amber-400">
                ทั้งหมด {giftCount} ชิ้น
              </div>
            </div>

            {giftList.length > 0 ? (
              <div className="overflow-x-auto max-h-[620px] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-950/90 text-slate-400 font-semibold sticky top-0 z-10 border-b border-white/10">
                    <tr>
                      <th className="py-2.5 px-2.5 sm:py-3 sm:px-4 w-24 sm:w-28 text-center border-r border-white/5 text-[11px] sm:text-xs">หมายเลขของขวัญ</th>
                      <th className="py-2.5 px-2.5 sm:py-3 sm:px-3.5 w-20 sm:w-24 border-r border-white/5 text-[11px] sm:text-xs">เลขที่บัตร</th>
                      <th className="py-2.5 px-3 sm:py-3 sm:px-4 border-r border-white/5 min-w-[140px] sm:min-w-[180px] text-[11px] sm:text-xs">ชื่อผู้มอบของขวัญ (ชื่อเล่น)</th>
                      <th className="py-2.5 px-2.5 sm:py-3 sm:px-3.5 border-r border-white/5 text-[11px] sm:text-xs">สังกัด</th>
                      <th className="py-2.5 px-2.5 sm:py-3 sm:px-3.5 border-r border-white/5 text-[11px] sm:text-xs">เบอร์โทรศัพท์</th>
                      <th className="py-2.5 px-3 sm:py-3 sm:px-4 border-r border-white/5 text-[11px] sm:text-xs">เวลาลงทะเบียน</th>
                      <th className="py-2.5 px-2 sm:py-3 sm:px-3 text-center text-[11px] sm:text-xs">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {giftList.map((g) => (
                      <tr key={g.ticketNo} className="hover:bg-white/[0.03] transition-colors">
                        
                        {/* 1. หมายเลขของขวัญ */}
                        <td className="py-2 px-2.5 sm:py-3 sm:px-4 text-center border-r border-white/5 whitespace-nowrap">
                          <span className="font-mono font-black text-xs sm:text-sm px-2 sm:px-3 py-0.5 sm:py-1 rounded-xl bg-amber-500/25 text-amber-300 border border-amber-500/40 shadow-inner">
                            🎁 #{g.giftNumber}
                          </span>
                        </td>

                        {/* 2. เลขที่บัตร */}
                        <td className="py-2 px-2.5 sm:py-3 sm:px-3.5 font-mono font-bold text-slate-300 border-r border-white/5 text-[11px] sm:text-xs whitespace-nowrap">
                          {g.ticketNo}
                        </td>

                        {/* 3. ชื่อผู้มอบ */}
                        <td className="py-2 px-3 sm:py-3 sm:px-4 font-semibold text-white border-r border-white/5 text-[11px] sm:text-xs">
                          <div className="flex items-center space-x-1.5">
                            <span>{g.name}</span>
                            {g.nickname && (
                              <span className="text-amber-300 font-normal text-[10px] sm:text-[11px]">
                                ({g.nickname})
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 4. สังกัด */}
                        <td className="py-2 px-2.5 sm:py-3 sm:px-3.5 border-r border-white/5 text-slate-300 text-[11px] sm:text-xs whitespace-nowrap">
                          {g.regType === "member" ? `สมาชิก${g.club || "สงสพัท"}` : `แขกผู้มีเกียรติ (${g.club || "ทั่วไป"})`}
                        </td>

                        {/* 5. เบอร์โทร */}
                        <td className="py-2 px-2.5 sm:py-3 sm:px-3.5 font-mono text-slate-400 border-r border-white/5 text-[11px] sm:text-xs whitespace-nowrap">
                          {g.phone || "-"}
                        </td>

                        {/* 6. เวลาลงทะเบียนของขวัญ */}
                        <td className="py-2 px-3 sm:py-3 sm:px-4 font-mono text-emerald-400 border-r border-white/5 text-[10px] sm:text-xs whitespace-nowrap">
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
                            className="p-1.5 rounded-lg hover:bg-rose-500/20 text-rose-400 hover:text-rose-200 transition-all"
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
              /* Empty State (Google Sheet Style) */
              <div className="py-20 text-center space-y-4 px-4">
                <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto shadow-inner">
                  <Gift className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-white">
                    ยังไม่มีผู้ลงทะเบียนจับของขวัญ
                  </h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    เมื่อผู้ร่วมงานนำของขวัญมาส่งที่โต๊ะลงทะเบียน ให้กดปุ่มเครื่องหมายบวก <strong className="text-amber-400 font-bold">(+)</strong> เพื่อเลือกชื่อผู้ร่วมงานและรับหมายเลขของขวัญเรียงลำดับจาก 1 ไปเรื่อยๆ
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsGiftModalOpen(true)}
                  className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/25 hover:scale-105 transition-all"
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
          <div className="bg-slate-900/80 rounded-2xl p-5 border border-teal-500/30 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <Shirt className="w-5 h-5 text-teal-400" />
                <h2 className="text-lg sm:text-xl font-black text-white">
                  ตารางลงทะเบียนรับเสื้อที่ระลึก
                </h2>
                <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-bold border border-teal-500/30">
                  มอบแล้ว {shirtReceivedCount} / {shirtTotalCount} ตัว
                </span>
              </div>
              <p className="text-xs text-slate-300">
                สำหรับผู้เข้าร่วมงานที่ได้รับสิทธิ์เสื้อที่ระลึก ตรวจสอบไซซ์และกดส่งมอบเสื้อ หรือคลิกถ่ายรูป 1:1 เพื่อเตรียมขึ้นสไลด์นำเสนอ
              </p>
            </div>

            {/* Slide Presentation Button */}
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setIsShirtSlideOpen(true)}
                className="flex items-center space-x-2 px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs sm:text-sm shadow-xl shadow-amber-500/30 hover:scale-105 active:scale-95 transition-all"
              >
                <Printer className="w-4 h-4 stroke-[2.5]" />
                <span>🖨️ นำเสนอสไลด์ผู้ได้รับเสื้อ (16:9)</span>
              </button>
            </div>
          </div>

          {/* Search & Status Filters */}
          <div className="bg-slate-900/80 rounded-2xl p-4 border border-white/10 shadow-lg flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="ค้นหาชื่อ, ชื่อเล่น, เลขที่บัตร, เบอร์, ไซซ์เสื้อ..."
                value={searchShirt}
                onChange={(e) => setSearchShirt(e.target.value)}
                className="w-full bg-slate-950/80 border border-white/10 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
              />
            </div>

            <div className="flex items-center space-x-2">
              <select
                value={filterShirtStatus}
                onChange={(e) => setFilterShirtStatus(e.target.value)}
                className="bg-slate-950/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-teal-500"
              >
                <option value="all">สถานะรับเสื้อทั้งหมด ({shirtTotalCount})</option>
                <option value="received">🟢 รับเสื้อเรียบร้อย ({shirtReceivedCount})</option>
                <option value="not_received">⏳ ยังไม่ได้รับเสื้อ ({shirtTotalCount - shirtReceivedCount})</option>
              </select>
            </div>
          </div>

          {/* Google Sheets Style Table for Shirt Recipients */}
          <div className="bg-slate-900/70 rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
            <div className="bg-slate-950/80 px-3 sm:px-4 py-2 sm:py-2.5 border-b border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-[11px] sm:text-xs text-slate-400 font-mono">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-500 shrink-0" />
                <span className="font-bold text-slate-200">Google Sheets View:</span>
                <span className="truncate">ตารางผู้ได้รับสิทธิ์เสื้อที่ระลึก (แสดง {filteredShirtList.length} จาก {shirtTotalCount} รายการ)</span>
              </div>
              <div className="text-[10px] sm:text-xs text-amber-400">
                คงเหลือยังไม่ได้รับ: {shirtTotalCount - shirtReceivedCount} ตัว
              </div>
            </div>

            {filteredShirtList.length > 0 ? (
              <div className="overflow-x-auto max-h-[620px] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-950/90 text-slate-400 font-semibold sticky top-0 z-10 border-b border-white/10">
                    <tr>
                      <th className="py-2.5 px-2 sm:py-3 sm:px-3 w-12 sm:w-14 text-center border-r border-white/5 text-[11px] sm:text-xs">ลำดับ</th>
                      <th className="py-2.5 px-2.5 sm:py-3 sm:px-3.5 w-20 sm:w-24 border-r border-white/5 text-[11px] sm:text-xs">เลขที่บัตร</th>
                      <th className="py-2.5 px-1.5 sm:py-3 sm:px-2 w-14 sm:w-16 text-center border-r border-white/5 text-[11px] sm:text-xs">รูปถ่าย</th>
                      <th className="py-2.5 px-3 sm:py-3 sm:px-4 border-r border-white/5 min-w-[140px] sm:min-w-[180px] text-[11px] sm:text-xs">ชื่อ - นามสกุล (ชื่อเล่น)</th>
                      <th className="py-2.5 px-2.5 sm:py-3 sm:px-3.5 border-r border-white/5 min-w-[100px] sm:min-w-[120px] text-[11px] sm:text-xs">ประเภท / สังกัด / ผู้เชิญ</th>
                      <th className="py-2.5 px-2.5 sm:py-3 sm:px-3.5 border-r border-white/5 text-[11px] sm:text-xs">เบอร์โทรศัพท์</th>
                      <th className="py-2.5 px-2.5 sm:py-3 sm:px-3.5 border-r border-white/5 text-[11px] sm:text-xs">ไซซ์เสื้อที่ระลึก</th>
                      <th className="py-2.5 px-2.5 sm:py-3 sm:px-3.5 border-r border-white/5 text-center text-[11px] sm:text-xs">เข้างาน</th>
                      <th className="py-2.5 px-3 sm:py-3 sm:px-4 text-center text-[11px] sm:text-xs">สถานะรับเสื้อ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredShirtList.map((r, idx) => {
                      const isReceived = !!r.shirtReceived;
                      return (
                        <tr key={r.ticketNo} className={`hover:bg-white/[0.03] transition-colors ${isReceived ? "bg-teal-950/15" : ""}`}>
                          
                          {/* 1. ลำดับ */}
                          <td className="py-2 px-2 sm:py-2.5 sm:px-3 text-center font-mono text-slate-400 border-r border-white/5 text-[11px] sm:text-xs">
                            {idx + 1}
                          </td>

                          {/* 2. เลขที่บัตร */}
                          <td className="py-2 px-2.5 sm:py-2.5 sm:px-3.5 font-mono font-bold text-amber-400 border-r border-white/5 text-[11px] sm:text-xs whitespace-nowrap">
                            {r.ticketNo}
                          </td>

                          {/* 3. รูปถ่าย 1:1 */}
                          <td className="py-2 px-1.5 sm:py-2 sm:px-2 text-center border-r border-white/5">
                            {r.photoUrl || r.costumePhoto ? (
                              <button
                                type="button"
                                onClick={() => setPhotoViewerTarget(r)}
                                className="relative inline-block cursor-pointer group hover:scale-110 active:scale-95 transition-all mx-auto"
                                title="คลิกเพื่อดูรูปถ่ายขนาดใหญ่"
                              >
                                <img
                                  src={r.photoUrl || r.costumePhoto}
                                  alt={r.name}
                                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl object-cover border-2 border-teal-400/70 shadow-md mx-auto group-hover:border-teal-300"
                                />
                                <span className="absolute -bottom-1 -right-1 px-1 py-0.5 rounded-full bg-slate-900 border border-teal-400/60 text-[9px] text-teal-300 shadow leading-none font-bold">
                                  🔍
                                </span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setPhotoModalTarget(r)}
                                className="p-1.5 px-2 rounded-xl bg-white/5 hover:bg-teal-500/20 text-slate-400 hover:text-teal-300 border border-white/10 hover:border-teal-500/30 transition-all inline-flex items-center space-x-1 cursor-pointer"
                                title="ถ่ายรูปผู้เข้าร่วมงาน (สัดส่วน 1:1)"
                              >
                                <Camera className="w-3.5 h-3.5" />
                                <span className="text-[10px]">ถ่าย</span>
                              </button>
                            )}
                          </td>

                          {/* 4. ชื่อ - สกุล */}
                          <td className="py-2 px-3 sm:py-2.5 sm:px-4 font-semibold text-white border-r border-white/5 text-[11px] sm:text-xs">
                            <div className="flex items-center space-x-1.5">
                              <span>{r.name}</span>
                              {r.nickname && (
                                <span className="text-amber-300 font-normal text-[10px] sm:text-[11px]">
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

                          {/* 5. สังกัด */}
                          <td className="py-2 px-2.5 sm:py-2.5 sm:px-3.5 border-r border-white/5 text-[11px] sm:text-xs">
                            {r.regType === "member" ? (
                              <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 whitespace-nowrap">
                                สมาชิก{r.club || "สงสพัท"}
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 whitespace-nowrap">
                                แขก {r.club && `(${r.club})`}
                              </span>
                            )}
                          </td>

                          {/* 6. เบอร์โทร */}
                          <td className="py-2 px-2.5 sm:py-2.5 sm:px-3.5 font-mono text-slate-300 border-r border-white/5 text-[11px] sm:text-xs whitespace-nowrap">
                            {r.phone || "-"}
                          </td>

                          {/* 7. ไซซ์เสื้อ */}
                          <td className="py-2 px-2.5 sm:py-2.5 sm:px-3.5 border-r border-white/5 whitespace-nowrap">
                            <span className="inline-flex items-center space-x-1 font-mono font-bold px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] sm:text-xs">
                              <Shirt className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-amber-400" />
                              <span>ไซซ์ {r.shirtSize} ({r.shirtGender || "ทั่วไป"})</span>
                            </span>
                          </td>

                          {/* 8. สถานะเข้างาน */}
                          <td className="py-2 px-2.5 sm:py-2.5 sm:px-3.5 text-center border-r border-white/5 whitespace-nowrap">
                            {r.checkedIn ? (
                              <span className="text-emerald-400 font-bold text-[10px] sm:text-[11px]">✓ เข้างาน</span>
                            ) : (
                              <span className="text-slate-500 text-[10px] sm:text-[11px]">ยังไม่เข้า</span>
                            )}
                          </td>

                          {/* 9. ส่งมอบเสื้อ */}
                          <td className="py-2 px-3 sm:py-2.5 sm:px-4 text-center whitespace-nowrap">
                            {isReceived ? (
                              <div className="inline-flex items-center space-x-1.5 sm:space-x-2">
                                <span className="inline-flex items-center space-x-1 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40 text-[10px] sm:text-xs shadow-xs">
                                  <CheckCircle2 className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-emerald-400" />
                                  <span>รับเสื้อแล้ว ✓</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => onToggleShirtReceived(r.ticketNo, false)}
                                  className="text-[9px] sm:text-[10px] text-slate-500 hover:text-rose-400 underline transition-colors"
                                  title="คลิกเพื่อยกเลิกสถานะรับเสื้อหากกดผิด"
                                >
                                  แก้ไข
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  onToggleShirtReceived(r.ticketNo, true);
                                  playAudioEffect("fanfare");
                                  setPhotoModalTarget(r);
                                }}
                                className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-bold text-[10px] sm:text-xs shadow-md shadow-teal-500/20 hover:scale-105 active:scale-95 transition-all inline-flex items-center space-x-1 cursor-pointer"
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
              <div className="py-16 text-center text-slate-500 space-y-3 px-4">
                <Shirt className="w-12 h-12 mx-auto opacity-30 text-teal-400" />
                <div className="text-base font-bold text-slate-300">
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
          <div className="bg-slate-900/80 rounded-2xl p-5 border border-rose-500/30 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <Crown className="w-5 h-5 text-rose-400" />
                <h2 className="text-lg sm:text-xl font-black text-white">
                  การประกวดแต่งกาย SME FAN 2026
                </h2>
                <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
                  กรรมการลงคะแนนแล้ว {allJudgeVotes.length} ท่าน
                </span>
              </div>
              <p className="text-xs text-slate-300">
                รองรับประกวดเดี่ยว & กลุ่ม • 2 ประเภทรางวัล (ความสวยงาม & ความคิดสร้างสรรค์) • คะแนนเฉพาะ 5, 4, 3, 2, 1 ห้ามซ้ำ พร้อมบันทึกเหตุผลหากมีการแก้ไข
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setIsJudgeModalOpen(true)}
                className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-400 hover:to-pink-400 text-white font-bold text-xs shadow-lg shadow-rose-500/25 hover:scale-105 active:scale-95 transition-all"
              >
                <Award className="w-4 h-4" />
                <span>⚖️ เปิดหน้าต่างให้คะแนน (กรรมการ)</span>
              </button>
            </div>
          </div>

          {/* Subtabs Selector */}
          <div className="bg-slate-900/80 p-2 rounded-2xl border border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-2 overflow-x-auto">
              
              <button
                type="button"
                onClick={() => setContestSubTab("leaderboard")}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 ${
                  contestSubTab === "leaderboard"
                    ? "bg-rose-500 text-white shadow-md shadow-rose-500/25"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Trophy className="w-4 h-4" />
                <span>ลีดเดอร์บอร์ด & ผลคะแนนสด</span>
              </button>

              <button
                type="button"
                onClick={() => setContestSubTab("teams")}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 ${
                  contestSubTab === "teams"
                    ? "bg-indigo-500 text-white shadow-md shadow-indigo-500/25"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Users className="w-4 h-4" />
                <span>จัดกลุ่มผู้เข้าประกวด ({contestTeams.length} ทีม)</span>
              </button>

              <button
                type="button"
                onClick={() => setContestSubTab("judge_qr")}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 ${
                  contestSubTab === "judge_qr"
                    ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <ExternalLink className="w-4 h-4" />
                <span>QR Code กรรมการ & ประวัติ ({allJudgeVotes.length})</span>
              </button>

            </div>

            {/* Quick Live Refresh Button */}
            <button
              type="button"
              onClick={() => {
                try {
                  const saved = localStorage.getItem("sme_fan_contest_all_votes_v1");
                  setAllJudgeVotes(saved ? JSON.parse(saved) : []);
                  playAudioEffect("beep");
                } catch (e) {}
              }}
              className="p-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs flex items-center space-x-1.5 self-start sm:self-auto border border-white/10"
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
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-2xl border border-white/5">
                
                {/* Category Switcher: Individual vs Team */}
                <div className="flex items-center space-x-2 bg-slate-950 p-1.5 rounded-xl border border-white/10">
                  <button
                    type="button"
                    onClick={() => setContestCategoryView("individual")}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      contestCategoryView === "individual"
                        ? "bg-rose-500 text-white shadow-sm"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <span>👤 ประกวดเดี่ยว</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/30 font-mono">
                      {registrations.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setContestCategoryView("team")}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      contestCategoryView === "team"
                        ? "bg-rose-500 text-white shadow-sm"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <span>👥 ประกวดกลุ่ม</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/30 font-mono">
                      {contestTeams.length}
                    </span>
                  </button>
                </div>

                {/* Award Type Switcher */}
                <div className="flex items-center space-x-1.5 overflow-x-auto text-xs">
                  <span className="text-slate-400 text-[11px] pr-1">เรียงตาม:</span>
                  <button
                    type="button"
                    onClick={() => setContestAwardView("total")}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                      contestAwardView === "total"
                        ? "bg-amber-500 text-slate-950 shadow-md"
                        : "bg-white/5 text-slate-300 hover:text-white"
                    }`}
                  >
                    🏆 คะแนนรวมสูงสุด
                  </button>
                  <button
                    type="button"
                    onClick={() => setContestAwardView("beauty")}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                      contestAwardView === "beauty"
                        ? "bg-amber-500 text-slate-950 shadow-md"
                        : "bg-white/5 text-slate-300 hover:text-white"
                    }`}
                  >
                    ✨ ความสวยงาม
                  </button>
                  <button
                    type="button"
                    onClick={() => setContestAwardView("creativity")}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                      contestAwardView === "creativity"
                        ? "bg-amber-500 text-slate-950 shadow-md"
                        : "bg-white/5 text-slate-300 hover:text-white"
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

              {/* Detailed Ranking Table */}
              <div className="bg-slate-900/70 rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
                <div className="bg-slate-950/80 px-3 sm:px-4 py-2 sm:py-3 border-b border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-[11px] sm:text-xs text-slate-400">
                  <div className="flex items-center space-x-2 font-mono">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                    <span className="font-bold text-slate-200">
                      ตารางสรุปผลคะแนนรวมคณะกรรมการ ({contestCategoryView === "individual" ? "ผู้เข้าประกวดเดี่ยว" : "ทีมเข้าประกวด"})
                    </span>
                  </div>
                  <div className="text-[10px] sm:text-xs text-slate-400">
                    กรรมการลงคะแนนแล้ว {allJudgeVotes.length} ท่าน
                  </div>
                </div>

                <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-950/90 text-slate-400 font-semibold sticky top-0 z-10 border-b border-white/10">
                      <tr>
                        <th className="py-2.5 px-2 sm:py-3 sm:px-3 w-12 sm:w-16 text-center border-r border-white/5 text-[11px] sm:text-xs">อันดับ</th>
                        <th className="py-2.5 px-1.5 sm:py-3 sm:px-2 w-14 sm:w-16 text-center border-r border-white/5 text-[11px] sm:text-xs">รูปถ่าย</th>
                        <th className="py-2.5 px-3 sm:py-3 sm:px-4 border-r border-white/5 min-w-[140px] sm:min-w-[180px] text-[11px] sm:text-xs">ผู้เข้าประกวด</th>
                        <th className="py-2.5 px-2.5 sm:py-3 sm:px-3.5 border-r border-white/5 min-w-[110px] sm:min-w-[130px] text-[11px] sm:text-xs">สังกัด / สมาชิก</th>
                        <th className="py-2.5 px-2 sm:py-3 sm:px-3.5 border-r border-white/5 text-center text-[11px] sm:text-xs">ความสวยงาม</th>
                        <th className="py-2.5 px-2 sm:py-3 sm:px-3.5 border-r border-white/5 text-center text-[11px] sm:text-xs">ความคิดสร้างสรรค์</th>
                        <th className="py-2.5 px-2.5 sm:py-3 sm:px-3.5 border-r border-white/5 text-center font-bold text-amber-400 text-[11px] sm:text-xs">คะแนนรวม</th>
                        <th className="py-2.5 px-2 sm:py-3 sm:px-3.5 text-center text-[11px] sm:text-xs">กรรมการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {(contestCategoryView === "individual" ? individualLeaderboard : teamLeaderboard).map((item, idx) => (
                        <tr 
                          key={item.id} 
                          className={`hover:bg-white/[0.03] transition-colors ${
                            idx === 0 && item.overallTotal > 0 ? "bg-amber-500/10" : ""
                          }`}
                        >
                          <td className="py-2 px-2 sm:py-3 sm:px-3 text-center font-mono border-r border-white/5 text-[11px] sm:text-xs">
                            {idx === 0 && item.overallTotal > 0 ? (
                              <span className="text-sm sm:text-base">🥇</span>
                            ) : idx === 1 && item.overallTotal > 0 ? (
                              <span className="text-sm sm:text-base">🥈</span>
                            ) : idx === 2 && item.overallTotal > 0 ? (
                              <span className="text-sm sm:text-base">🥉</span>
                            ) : (
                              <span className="text-slate-400 font-bold">{idx + 1}</span>
                            )}
                          </td>

                          <td className="py-2 px-1.5 sm:py-2 sm:px-2 text-center border-r border-white/5">
                            {item.photoUrl ? (
                              <img
                                src={item.photoUrl}
                                alt={item.name}
                                className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl object-cover border border-white/15 mx-auto"
                              />
                            ) : (
                              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-800 border border-white/10 flex items-center justify-center text-slate-400 mx-auto">
                                <Users className="w-4 h-4" />
                              </div>
                            )}
                          </td>

                          <td className="py-2 px-3 sm:py-3 sm:px-4 font-semibold text-white border-r border-white/5 text-[11px] sm:text-xs">
                            <div className="flex items-center space-x-1.5">
                              <span>{item.name}</span>
                              {item.nickname && (
                                <span className="text-amber-300 font-normal text-[10px] sm:text-[11px]">
                                  ({item.nickname})
                                </span>
                              )}
                            </div>
                            {item.ticketNo && (
                              <span className="font-mono text-[9px] sm:text-[10px] text-amber-400/80">
                                {item.ticketNo}
                              </span>
                            )}
                          </td>

                          <td className="py-2 px-2.5 sm:py-3 sm:px-3.5 border-r border-white/5 text-slate-300 text-[11px] sm:text-xs">
                            {contestCategoryView === "individual" ? (
                              item.club || "สงสพัท"
                            ) : (
                              <span className="text-[10px] sm:text-[11px] text-slate-400 line-clamp-1">
                                {item.members?.map(m => m.name).join(", ") || "-"}
                              </span>
                            )}
                          </td>

                          <td className="py-2 px-2 sm:py-3 sm:px-3.5 text-center border-r border-white/5 font-mono whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-lg bg-white/5 text-slate-200 font-bold text-[10px] sm:text-xs">
                              {item.beautyTotal}
                            </span>
                          </td>

                          <td className="py-2 px-2 sm:py-3 sm:px-3.5 text-center border-r border-white/5 font-mono whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-lg bg-white/5 text-slate-200 font-bold text-[10px] sm:text-xs">
                              {item.creativityTotal}
                            </span>
                          </td>

                          <td className="py-2 px-2.5 sm:py-3 sm:px-3.5 text-center border-r border-white/5 font-mono whitespace-nowrap">
                            <span className="px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-xl bg-amber-500/20 text-amber-300 font-extrabold text-xs sm:text-sm border border-amber-500/30">
                              {item.overallTotal}
                            </span>
                          </td>

                          <td className="py-2 px-2 sm:py-3 sm:px-3.5 text-center text-slate-400 text-[10px] sm:text-xs whitespace-nowrap">
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
                            localStorage.removeItem("sme_fan_contest_all_votes_v1");
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
          <div className="bg-slate-900/80 p-2 rounded-2xl border border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-2 overflow-x-auto">
              
              <button
                type="button"
                onClick={() => { setDrawSubTab("general"); setCurrentWinner(null); setSearchDrawPool(""); }}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 ${
                  drawSubTab === "general"
                    ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Dices className="w-4 h-4" />
                <span>Random ทั่วไป (สุ่มซ้ำได้ / เก็บชื่อไว้)</span>
              </button>

              <button
                type="button"
                onClick={() => { setDrawSubTab("grand"); setCurrentWinner(null); setSearchDrawPool(""); }}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 ${
                  drawSubTab === "grand"
                    ? "bg-rose-500 text-white shadow-md shadow-rose-500/25"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Trophy className="w-4 h-4" />
                <span>Random คัดชื่อออก (รางวัลใหญ่ / ตัดชื่อทิ้ง)</span>
              </button>

              <button
                type="button"
                onClick={() => { setDrawSubTab("gift_exclusive"); setCurrentWinner(null); setSearchDrawPool(""); }}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 ${
                  drawSubTab === "gift_exclusive"
                    ? "bg-indigo-500 text-white shadow-md shadow-indigo-500/25"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Gift className="w-4 h-4" />
                <span>Random เฉพาะคนลงทะเบียนของขวัญ</span>
              </button>

            </div>

            {/* Candidate Pool Indicator */}
            <div className="text-xs text-slate-400 px-3 py-1 rounded-xl bg-slate-950 border border-white/5 flex items-center space-x-2 self-start sm:self-auto">
              <span>โถสุ่มปัจจุบัน:</span>
              <strong className="text-amber-400 font-mono text-sm">{getCandidatePool().length}</strong>
              <span>ท่าน</span>
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
                  </span>
                </span>

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
                    <div className="space-y-2 animate-fadeIn">
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
                        {displayedCandidate.giftNumber && (
                          <span className="text-xs px-2.5 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                            🎁 ของขวัญ #{displayedCandidate.giftNumber}
                          </span>
                        )}
                      </div>
                    </div>
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

        </main>
      )}

      {/* ========================================================== */}
      {/* MODAL 1: CAMERA QR SCANNER MODAL                          */}
      {/* ========================================================== */}
      {isScannerOpen && (
        <TicketScannerModal
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          registrations={registrations}
          onCheckIn={handleScanSuccess}
          onCapturePhoto={(attendee) => {
            setIsScannerOpen(false);
            setPhotoModalTarget(attendee);
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
                  onCheckIn(emergencyTarget.ticketNo, true);
                  playAudioEffect("beep");
                  setLastCheckInAttendee(emergencyTarget);
                  setPhotoModalTarget(emergencyTarget);
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

      {/* MODAL 5: ATTENDEE PHOTO CAPTURE MODAL (1:1 SQUARE) */}
      {photoModalTarget && (
        <AttendeePhotoModal
          isOpen={!!photoModalTarget}
          onClose={() => setPhotoModalTarget(null)}
          attendee={photoModalTarget}
          onSavePhoto={(photoUrl, ticketNo) => {
            const actualUrl = (typeof photoUrl === 'string' && (photoUrl.startsWith('http') || photoUrl.startsWith('data:')))
              ? photoUrl
              : (typeof ticketNo === 'string' && (ticketNo.startsWith('http') || ticketNo.startsWith('data:')) ? ticketNo : photoUrl);
            const targetTicket = (ticketNo && !ticketNo.startsWith('http') && !ticketNo.startsWith('data:'))
              ? ticketNo
              : photoModalTarget?.ticketNo;
            
            // Mark checkedIn: true as well when capturing photo at check-in desk
            if (onCheckIn && targetTicket) {
              onCheckIn(targetTicket, true);
            }
            if (onUpdateAttendeePhoto && targetTicket) {
              onUpdateAttendeePhoto(targetTicket, actualUrl, true);
            }
            setPhotoModalTarget(null);
            playAudioEffect("fanfare");
          }}
        />
      )}

      {/* MODAL 5.5: ATTENDEE PHOTO VIEWER (LIGHTBOX) */}
      {photoViewerTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 rounded-3xl border border-amber-500/40 shadow-2xl w-full max-w-sm sm:max-w-md p-5 sm:p-6 space-y-4">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base leading-tight">
                    {photoViewerTarget.name} {photoViewerTarget.nickname ? `(${photoViewerTarget.nickname})` : ''}
                  </h3>
                  <p className="text-xs text-amber-400 font-mono font-semibold">
                    {photoViewerTarget.ticketNo} • สนาม {photoViewerTarget.club || 'สงสพัท'}
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

            {/* High-Res Photo Display */}
            <div className="relative rounded-2xl overflow-hidden aspect-square border-2 border-amber-400/40 shadow-2xl bg-black flex items-center justify-center">
              <img
                src={photoViewerTarget.photoUrl || photoViewerTarget.costumePhoto}
                alt={photoViewerTarget.name}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Info Badges */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-2xl bg-white/5 border border-white/10 text-xs">
              <div className="text-slate-300">
                เสื้อที่ระลึก: <strong className="text-white">ไซส์ {photoViewerTarget.shirtSize || 'L'} ({photoViewerTarget.shirtGender || 'ชาย'})</strong>
              </div>
              <div>
                {photoViewerTarget.shirtReceived ? (
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
                  const target = photoViewerTarget;
                  setPhotoViewerTarget(null);
                  setPhotoModalTarget(target);
                }}
                className="py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center space-x-1.5 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>📸 ถ่ายรูปใหม่</span>
              </button>

              <a
                href={photoViewerTarget.photoUrl || photoViewerTarget.costumePhoto}
                download={`รูปถ่าย_${photoViewerTarget.ticketNo}_${photoViewerTarget.name}.jpg`}
                target="_blank"
                rel="noreferrer"
                className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center space-x-1.5 border border-white/10 transition-all cursor-pointer text-center"
              >
                <Download className="w-4 h-4" />
                <span>💾 บันทึกรูปภาพ</span>
              </a>
            </div>

          </div>
        </div>
      )}

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
            const saved = localStorage.getItem("sme_fan_contest_all_votes_v1");
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
            localStorage.setItem("sme_fan_contest_all_votes_v1", JSON.stringify(list));
            setAllJudgeVotes([...list]);
            playAudioEffect("fanfare");
            triggerConfetti();
          } catch (e) {}
        }}
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

      {/* Footer Accreditation */}
      <footer className="relative z-10 py-6 border-t border-white/5 text-center text-xs text-slate-500 space-y-1">
        <p>© 2026 งานสังสรรค์ปีใหม่ SME FAN 2026</p>
        <p className="text-[11px] text-slate-600">นักพัฒนาซอฟต์แวร์ คุณทีป์ชลิต ทองจันทร์ (ผอ.โต๊ด)</p>
      </footer>

    </div>
  );
}
