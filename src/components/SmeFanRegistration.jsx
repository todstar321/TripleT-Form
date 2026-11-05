import React, { useState, useMemo, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { 
  Sparkles, 
  UserCheck, 
  UserPlus, 
  Search, 
  Calendar, 
  Phone, 
  Mail, 
  MapPin, 
  Shirt, 
  CreditCard, 
  Upload, 
  Copy, 
  Check, 
  AlertCircle,
  AlertTriangle,
  ArrowRight, 
  ArrowLeft, 
  RotateCcw, 
  HelpCircle,
  FileCheck2,
  ExternalLink,
  Lock,
  ShieldCheck,
  Settings,
  Edit3,
  Crop,
  Palette,
  Image as ImageIcon,
  Plus,
  Trash2,
  X,
  Sliders,
  Eye,
  DollarSign,
  Save,
  Download,
  PartyPopper,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Clock,
  Hourglass,
  Flame,
  HeartHandshake,
  FileSpreadsheet
} from 'lucide-react';
import TicketModal from './TicketModal';
import ImageCropperModal from './ImageCropperModal';
import RegistrationCountdown from './RegistrationCountdown';
import SponsorRegistrationModal from './SponsorRegistrationModal';
import EventPublicDataSheetModal from './EventPublicDataSheetModal';
import { MusicFooterToggle } from './BackgroundMusicPlayer';
import { themePresetsList } from '../data/smeFanData';
import { uploadToCloudinary } from '../utils/cloudinary';
import { analyzeSlipData } from '../utils/slipReader';
import { formatPhoneNumber, cleanPhoneNumber } from '../utils/phoneFormatter';
import { getScheduleStatus, formatThaiScheduleDateTime, formatThaiShortDateTime } from '../utils/scheduleHelper';
import { fetchRegistrationsFromCloud, fetchSponsorsFromCloud } from '../utils/supabaseClient';

const THAI_MONTHS_FULL = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
];

const THAI_WEEKDAYS = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];

const formatThaiDate = (dateStr) => {
  if (!dateStr) return "";
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return dateStr;
  const thaiYear = year + 543;
  return `${day} ${THAI_MONTHS_FULL[month]} พ.ศ. ${thaiYear} (${year})`;
};
// Thai Prefixes, Military/Police Ranks, Academic Titles, and Salutations for VIP Guests
const PREFIX_GROUPS = [
  {
    category: "คำนำหน้าทั่วไป",
    options: ["นาย", "นาง", "นางสาว", "เด็กชาย", "เด็กหญิง", "ด.ช.", "ด.ญ.", "คุณ"]
  },
  {
    category: "ตำรวจ (Royal Thai Police)",
    options: [
      "พล.ต.อ.", "พล.ต.ท.", "พล.ต.ต.",
      "พ.ต.อ.(พิเศษ)", "พ.ต.อ.", "พ.ต.ท.", "พ.ต.ต.",
      "ร.ต.อ.", "ร.ต.ท.", "ร.ต.ต.", "ด.ต."
    ]
  },
  {
    category: "ทหารบก (Royal Thai Army)",
    options: [
      "พล.อ.", "พล.ท.", "พล.ต.",
      "พ.อ.(พิเศษ)", "พ.อ.", "พ.ท.", "พ.ต.",
      "ร.อ.", "ร.ท.", "ร.ต.", "จ.ส.อ."
    ]
  },
  {
    category: "ทหารเรือ (Royal Thai Navy)",
    options: [
      "พล.ร.อ.", "พล.ร.ท.", "พล.ร.ต.",
      "น.อ.(พิเศษ)", "น.อ.", "น.ท.", "น.ต.",
      "ร.อ. ร.น.", "ร.ท. ร.น.", "ร.ต. ร.น."
    ]
  },
  {
    category: "ทหารอากาศ (Royal Thai Air Force)",
    options: [
      "พล.อ.อ.", "พล.อ.ท.", "พล.อ.ต.",
      "น.อ.(พิเศษ) อ.", "น.อ.", "น.ท.", "น.ต.",
      "ร.อ.", "ร.ท.", "ร.ต."
    ]
  },
  {
    category: "วิชาการ & การศึกษา & ด็อกเตอร์",
    options: [
      "ศ.ดร.", "ศ.", "ศ.เกียรติคุณ",
      "รศ.ดร.", "รศ.",
      "ผศ.ดร.", "ผศ.",
      "อ.ดร.", "ดร.", "อาจารย์"
    ]
  },
  {
    category: "การแพทย์ & สาธารณสุข",
    options: [
      "ศ.นพ.", "รศ.นพ.", "ผศ.นพ.", "นพ.",
      "ศ.พญ.", "รศ.พญ.", "ผศ.พญ.", "พญ.",
      "ทพ.", "ทพญ.",
      "ภก.", "ภญ.",
      "น.สพ.", "สพ.ญ."
    ]
  },
  {
    category: "ฐานันดรศักดิ์ & บรรดาศักดิ์ & เครื่องราชฯ",
    options: [
      "ม.ร.ว.", "ม.ล.", "ท่านผู้หญิง", "คุณหญิง"
    ]
  },
  {
    category: "ตำแหน่งผู้นำ / การเมือง / ปกครอง / ข้าราชการ",
    options: [
      "ฯพณฯ", "ท่าน", "ส.ส.", "ส.ว.",
      "นายก", "รองนายก", "กำนัน", "ผู้ใหญ่บ้าน"
    ]
  }
];

export default function SmeFanRegistration({
  eventConfig,
  setEventConfig,
  registrations,
  onAddRegistration,
  onUpdateRegistration,
  currentUser,
  onAdminClick,
  onLogout,
  onRecordDownload
}) {
  // Step state: 0 = Landing, 1 = Type Select, 2 = Details, 3 = Payment & Slip, 4 = Shirt (if eligible)
  const [step, setStep] = useState(0);

  // Live Clock & Registration Schedule Status
  const [currentTime, setCurrentTime] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const scheduleStatus = useMemo(() => {
    return getScheduleStatus(eventConfig?.registrationSchedule, currentTime);
  }, [eventConfig?.registrationSchedule, currentTime]);

  const isAdmin = Boolean(currentUser && ['owner', 'manager', 'admin'].includes(currentUser.role));
  const canRegister = scheduleStatus.isOpen || isAdmin;

  // Guard: If step > 0 and registration is NOT open, redirect back to landing (step 0)
  useEffect(() => {
    if (step > 0 && !canRegister) {
      setStep(0);
    }
  }, [step, canRegister]);

  // Form State
  const [regType, setRegType] = useState('member'); // 'member' | 'guest'
  const [selectedClub, setSelectedClub] = useState(eventConfig.clubs[0] || "สงสพัท");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMember, setSelectedMember] = useState(null);
  
  // Attendee info
  const [titlePrefix, setTitlePrefix] = useState("");
  const [customPrefix, setCustomPrefix] = useState("");
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [calculatedAge, setCalculatedAge] = useState(null);
  const [recommender, setRecommender] = useState("");
  const [recommenderSearch, setRecommenderSearch] = useState("");
  const [isRecommenderOpen, setIsRecommenderOpen] = useState(false);
  const recommenderContainerRef = useRef(null);

  // Custom Calendar Picker State
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarViewDate, setCalendarViewDate] = useState(() => new Date(2000, 0, 1));
  const calendarContainerRef = useRef(null);

  // Payment & Slip
  const [slipFile, setSlipFile] = useState(null);
  const [slipPreview, setSlipPreview] = useState("");
  const [slipDetails, setSlipDetails] = useState(null);
  const [isUploadingSlip, setIsUploadingSlip] = useState(false);
  const [isAnalyzingSlip, setIsAnalyzingSlip] = useState(false);
  const [slipStatusMessage, setSlipStatusMessage] = useState("");
  const [copiedAccount, setCopiedAccount] = useState(false);

  // Shirt selection
  const [shirtGender, setShirtGender] = useState("ชาย");
  const [shirtSize, setShirtSize] = useState("L");

  // Duplicate / Edit State
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
  const [underpaidModalOpen, setUnderpaidModalOpen] = useState(false);
  const [existingAttendee, setExistingAttendee] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editReason, setEditReason] = useState("");

  // Ticket Modal state
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [completedTicket, setCompletedTicket] = useState(null);
  const [registrationSuccessModalOpen, setRegistrationSuccessModalOpen] = useState(false);
  const [autoOpenImageDownload, setAutoOpenImageDownload] = useState(false);

  // Find / Download Ticket Modal State (From Landing Page)
  const [isFindTicketModalOpen, setIsFindTicketModalOpen] = useState(false);
  const [findTicketSearch, setFindTicketSearch] = useState("");
  const [findTicketSelected, setFindTicketSelected] = useState(null);
  const [findTicketPhone, setFindTicketPhone] = useState("");
  const [findTicketError, setFindTicketError] = useState("");

  // Sponsorship & Public Data Sheet Modal States
  const [isSponsorModalOpen, setIsSponsorModalOpen] = useState(false);
  const [isDataSheetModalOpen, setIsDataSheetModalOpen] = useState(false);
  const [sponsorsList, setSponsorsList] = useState([]);

  useEffect(() => {
    fetchSponsorsFromCloud()
      .then((data) => {
        if (Array.isArray(data)) setSponsorsList(data);
      })
      .catch((err) => console.error("Error loading sponsors:", err));
  }, []);

  // Wrapper for recording download count and timestamps
  const handleRecordDownloadWrapper = (ticketNo) => {
    if (onRecordDownload) {
      onRecordDownload(ticketNo);
    }
    const now = new Date();
    const formatted = now.toLocaleDateString('th-TH', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    }) + ' ' + now.toLocaleTimeString('th-TH', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    }) + ' น.';

    setCompletedTicket(prev => {
      if (!prev || prev.ticketNo !== ticketNo) return prev;
      return {
        ...prev,
        downloadCount: (prev.downloadCount || 0) + 1,
        lastDownloadedAt: formatted,
        downloadHistory: [...(prev.downloadHistory || []), formatted]
      };
    });
  };

  // Errors state
  const [errors, setErrors] = useState({});

  // Dynamic Theme Styling
  const primaryButtonStyle = {
    background: eventConfig.themeGradient || eventConfig.themeColor || 'linear-gradient(135deg, #f59e0b, #d97706)',
    color: eventConfig.themeTextColor || '#0f172a'
  };

  const isWhiteCard = eventConfig.cardMode === 'white';
  const isGlassCard = eventConfig.cardMode === 'glass';
  const mainCardClass = isWhiteCard
    ? 'bg-white/95 text-slate-800 border border-slate-200/90 shadow-2xl rounded-3xl overflow-hidden'
    : isGlassCard
      ? 'glass-panel text-white border border-white/20 shadow-2xl rounded-3xl overflow-hidden'
      : 'glass-panel text-white border border-white/10 shadow-2xl rounded-3xl overflow-hidden';


  // Admin In-Form Edit Mode State (Google Forms Style)
  const [isInlineEditing, setIsInlineEditing] = useState(false);
  const [themeModalOpen, setThemeModalOpen] = useState(false);
  const [subBannerModalOpen, setSubBannerModalOpen] = useState(false);
  const [cropperModalOpen, setCropperModalOpen] = useState(false);
  const [cropperTarget, setCropperTarget] = useState('banner'); // 'banner' | 'background' | 'subBanner'
  const [newClubInput, setNewClubInput] = useState("");
  const [newSizeInput, setNewSizeInput] = useState("");

  // Safety guard: Inline editing is strictly forbidden unless currentUser is an active admin
  useEffect(() => {
    if (!currentUser && isInlineEditing) {
      setIsInlineEditing(false);
    }
  }, [currentUser, isInlineEditing]);

  // Render 50% Sub-Banner for subsequent steps (Step 1, 2, 3)
  const renderSubBanner = (stepNumber) => {
    if (eventConfig.showSubBanner === false) return null;

    const isCustom = eventConfig.subBannerMode === 'custom' && eventConfig.subBannerImage;
    const bannerSrc = isCustom ? eventConfig.subBannerImage : eventConfig.bannerImage;
    const posY = eventConfig.subBannerPositionY ?? 50;

    const stepLabel = stepNumber === 1 
      ? 'ขั้นตอนที่ 1 จาก 3: เลือกประเภทผู้เข้าร่วม'
      : stepNumber === 2
        ? `ขั้นตอนที่ 2 จาก 3: กรอกข้อมูล (${regType === 'member' ? 'สมาชิก SME FAN' : 'แขกผู้มีเกียรติ'})`
        : 'ขั้นตอนที่ 3 จาก 3: สรุปยอดและแนบสลิปโอนเงิน';

    return (
      <div className="relative h-32 sm:h-40 w-full overflow-hidden group border-b border-white/10">
        <img
          src={bannerSrc}
          alt={`Step ${stepNumber} Banner`}
          className="w-full h-full object-cover transition-all duration-300"
          style={{ objectPosition: `center ${posY}%` }}
        />
        {/* Subtle gradient overlay */}
        <div className={`absolute inset-0 bg-gradient-to-t ${
          isWhiteCard 
            ? 'from-white/95 via-white/40 to-transparent' 
            : 'from-slate-950/95 via-slate-950/40 to-transparent'
        }`} />

        {/* Step Badge Overlaid */}
        <div className="absolute top-3 left-4 z-10 flex items-center space-x-2">
          <span 
            className="px-3 py-1 rounded-full text-[11px] font-bold shadow-md flex items-center space-x-1"
            style={primaryButtonStyle}
          >
            <span>{stepLabel}</span>
          </span>
        </div>

        {/* In-Place Quick Controls for Admin / Inline Editing */}
        {isInlineEditing && (
          <div className="absolute top-3 right-4 z-20 flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setSubBannerModalOpen(true)}
              className="flex items-center space-x-1 px-3 py-1 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-amber-300 border border-amber-500/40 text-[11px] font-bold backdrop-blur-md shadow-lg transition-all hover:scale-105"
            >
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              <span>ปรับรูปหน้าถัดไป (50% / เลื่อนภาพ)</span>
            </button>
          </div>
        )}
      </div>
    );
  };

  // Direct In-Place Config Update Handlers
  const handleUpdateConfig = (key, value) => {
    if (setEventConfig) {
      setEventConfig(prev => ({
        ...prev,
        [key]: value
      }));
    }
  };

  const handleUpdateNested = (section, key, value) => {
    if (setEventConfig) {
      setEventConfig(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          [key]: value
        }
      }));
    }
  };

  const handleAddClubInline = (e) => {
    if (e) e.preventDefault();
    const trimmed = newClubInput.trim();
    if (!trimmed) return;
    if (eventConfig.clubs.includes(trimmed)) {
      alert("สังกัดสนามนี้มีอยู่แล้วในระบบ");
      return;
    }
    handleUpdateConfig('clubs', [...eventConfig.clubs, trimmed]);
    setNewClubInput("");
  };

  const handleRemoveClubInline = (clubName) => {
    if (eventConfig.clubs.length <= 1) {
      alert("ต้องมีอย่างน้อย 1 สังกัดสนาม");
      return;
    }
    if (window.confirm(`ต้องการลบสังกัด "${clubName}" หรือไม่?`)) {
      const updated = eventConfig.clubs.filter(c => c !== clubName);
      handleUpdateConfig('clubs', updated);
      if (selectedClub === clubName) {
        setSelectedClub(updated[0] || "");
      }
    }
  };

  const handleAddSizeInline = (e) => {
    if (e) e.preventDefault();
    const trimmed = newSizeInput.trim().toUpperCase();
    if (!trimmed) return;
    const sizes = eventConfig.shirtQuota?.sizes || [];
    if (sizes.includes(trimmed)) return;
    handleUpdateNested('shirtQuota', 'sizes', [...sizes, trimmed]);
    setNewSizeInput("");
  };

  const handleRemoveSizeInline = (sizeName) => {
    const sizes = eventConfig.shirtQuota?.sizes || [];
    if (sizes.length <= 1) return;
    handleUpdateNested('shirtQuota', 'sizes', sizes.filter(s => s !== sizeName));
  };

  const applyThemePreset = (preset) => {
    handleUpdateConfig('themeColor', preset.color);
    handleUpdateConfig('themeGradient', preset.gradient || null);
    handleUpdateConfig('themeTextColor', preset.textColor || '#ffffff');
  };

  // Admin shortcut (Ctrl+Shift+A or Alt+A)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'a') || (e.altKey && e.key.toLowerCase() === 'a')) {
        e.preventDefault();
        if (onAdminClick) onAdminClick();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onAdminClick]);

  // Calculate current shirt recipients count
  const shirtRecipientsCount = useMemo(() => {
    return registrations.filter(r => r.hasShirt).length;
  }, [registrations]);

  const maxShirtQuota = eventConfig.shirtQuota?.maxQuota || 15;
  const remainingShirtQuota = Math.max(0, maxShirtQuota - shirtRecipientsCount);

  // Age & Price calculation
  const calculatedFee = useMemo(() => {
    if (regType === 'member') {
      return eventConfig.pricing.adultPrice; // 500 THB
    }
    // For guest
    if (calculatedAge === null) return eventConfig.pricing.adultPrice;
    if (calculatedAge <= eventConfig.pricing.freeMaxAge) return 0;
    if (calculatedAge <= eventConfig.pricing.childMaxAge) return eventConfig.pricing.childPrice;
    return eventConfig.pricing.adultPrice;
  }, [regType, calculatedAge, eventConfig]);

  // Is eligible for shirt? (Must pay 500 THB and either within first 15 or editing an existing shirt recipient)
  const isEligibleForShirt = useMemo(() => {
    if (calculatedFee !== eventConfig.pricing.adultPrice) return false;
    if (isEditMode && existingAttendee?.hasShirt) return true;
    return remainingShirtQuota > 0;
  }, [calculatedFee, remainingShirtQuota, isEditMode, existingAttendee, eventConfig]);

  // Handle Birth Date change and calculate age
  const handleBirthDateChange = (val) => {
    setBirthDate(val);
    if (!val) {
      setCalculatedAge(null);
      return;
    }
    const parts = val.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
        setCalendarViewDate(new Date(y, m, d));
      }
    }
    const birth = new Date(val);
    const eventDay = new Date("2026-01-10");
    let age = eventDay.getFullYear() - birth.getFullYear();
    const m = eventDay.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && eventDay.getDate() < birth.getDate())) {
      age--;
    }
    setCalculatedAge(Math.max(0, age));
    if (errors.birthDate) {
      setErrors(prev => {
        const next = { ...prev };
        delete next.birthDate;
        return next;
      });
    }
  };

  // Click outside to close calendar dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (calendarContainerRef.current && !calendarContainerRef.current.contains(event.target)) {
        setIsCalendarOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Calculate calendar days
  const calendarDays = useMemo(() => {
    const year = calendarViewDate.getFullYear();
    const month = calendarViewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay(); // 0 = Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days = [];
    // Previous month trailing days
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({
        day: daysInPrevMonth - i,
        isCurrent: false,
        monthOffset: -1
      });
    }
    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        day: i,
        isCurrent: true,
        monthOffset: 0
      });
    }
    // Next month leading days (fill up to multiple of 7)
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        day: i,
        isCurrent: false,
        monthOffset: 1
      });
    }
    return days;
  }, [calendarViewDate]);

  // Filter members by query and selected club
  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.trim().toLowerCase();
    return eventConfig.members.filter(m => 
      m.club === selectedClub && 
      (
        (m.memberCode && m.memberCode.toLowerCase().includes(q)) ||
        m.name.toLowerCase().includes(q) || 
        (m.nickname && m.nickname.toLowerCase().includes(q)) ||
        (m.phone && m.phone.includes(q))
      )
    );
  }, [searchQuery, selectedClub, eventConfig.members]);

  // Check for duplicate registration
  const checkForDuplicate = (memberName, memberPhone) => {
    const cleanMemberPhone = cleanPhoneNumber(memberPhone);
    const found = registrations.find(r => 
      (memberName && r.name && r.name.trim().toLowerCase() === memberName.trim().toLowerCase()) ||
      (cleanMemberPhone && r.phone && cleanPhoneNumber(r.phone) === cleanMemberPhone)
    );
    return found;
  };

  // Select Member from Autocomplete
  const handleSelectMember = (member) => {
    setSelectedMember(member);
    setName(member.name);
    setNickname(member.nickname || "");
    setPhone(formatPhoneNumber(member.phone || ""));
    setEmail(member.email || "");
    setSearchQuery(member.name);

    // Check duplicate
    const existing = checkForDuplicate(member.name, member.phone);
    if (existing) {
      setExistingAttendee(existing);
      setDuplicateModalOpen(true);
    }
  };

  // Click outside to close recommender dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (recommenderContainerRef.current && !recommenderContainerRef.current.contains(event.target)) {
        setIsRecommenderOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Filter recommender members by query and club
  const filteredRecommenderMembers = useMemo(() => {
    let list = eventConfig.members || [];
    const q = recommenderSearch.trim().toLowerCase();

    // If a specific club is selected
    if (selectedClub && selectedClub !== 'all') {
      const inClub = list.filter(m => m.club === selectedClub);
      if (!q) return inClub;

      const matchedInClub = inClub.filter(m => 
        (m.memberCode && m.memberCode.toLowerCase().includes(q)) ||
        m.name.toLowerCase().includes(q) || 
        (m.nickname && m.nickname.toLowerCase().includes(q)) ||
        (m.phone && m.phone.includes(q))
      );
      if (matchedInClub.length > 0) return matchedInClub;

      // If not found in selected club, search across all clubs
      return list.filter(m => 
        (m.memberCode && m.memberCode.toLowerCase().includes(q)) ||
        m.name.toLowerCase().includes(q) || 
        (m.nickname && m.nickname.toLowerCase().includes(q)) ||
        m.club.toLowerCase().includes(q) ||
        (m.phone && m.phone.includes(q))
      );
    }

    if (!q) return list;
    return list.filter(m => 
      (m.memberCode && m.memberCode.toLowerCase().includes(q)) ||
      m.name.toLowerCase().includes(q) || 
      (m.nickname && m.nickname.toLowerCase().includes(q)) ||
      m.club.toLowerCase().includes(q) ||
      (m.phone && m.phone.includes(q))
    );
  }, [eventConfig.members, selectedClub, recommenderSearch]);

  // Select Recommender
  const handleSelectRecommender = (m) => {
    setRecommender(m.name);
    setRecommenderSearch(m.name);
    if (m.club && selectedClub !== m.club) {
      setSelectedClub(m.club);
    }
    setIsRecommenderOpen(false);
    if (errors.recommender) {
      setErrors(prev => {
        const next = { ...prev };
        delete next.recommender;
        return next;
      });
    }
  };

  // Select Custom Recommender
  const handleCustomRecommender = (customName) => {
    setRecommender(customName);
    setRecommenderSearch(customName);
    setIsRecommenderOpen(false);
    if (errors.recommender) {
      setErrors(prev => {
        const next = { ...prev };
        delete next.recommender;
        return next;
      });
    }
  };

  // Handle Copy Bank Account
  const handleCopyAccount = () => {
    navigator.clipboard.writeText(eventConfig.bankInfo.accountNumber);
    setCopiedAccount(true);
    setTimeout(() => setCopiedAccount(false), 2000);
  };

  // Handle Slip Upload (Direct Cloudinary upload if configured + local fallback + Slip Analysis)
  const handleSlipChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSlipFile(file);
    setIsUploadingSlip(true);
    setIsAnalyzingSlip(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const localDataUrl = event.target.result;
      setSlipPreview(localDataUrl);

      // Smart Slip Verification & QR Reader with AI OCR
      try {
        setSlipStatusMessage("กำลังตรวจหา QR Code และอ่านยอดเงินจริงจากสลิปด้วย AI OCR...");
        const details = await analyzeSlipData(
          localDataUrl,
          {
            attendeeName: name.trim() || "ผู้ลงทะเบียน",
            expectedAmount: calculatedFee,
            bankAccount: eventConfig.bankInfo || eventConfig.bankAccount
          },
          (progressText) => setSlipStatusMessage(progressText)
        );

        // Smart Resolution:
        // If OCR detected amount (e.g. 1179 or 500), use it!
        // If OCR could not detect amount, default to calculatedFee so user is not trapped, while allowing edit
        const hasDetectedAmount = (details.amount !== null && details.amount !== undefined && Number(details.amount) > 0);
        const resolvedAmount = hasDetectedAmount 
          ? Number(details.amount) 
          : (calculatedFee > 0 ? calculatedFee : null);

        const updatedDetails = {
          ...details,
          amount: resolvedAmount,
          isAmountDetected: hasDetectedAmount,
          isOverpaid: resolvedAmount !== null && calculatedFee > 0 && resolvedAmount > calculatedFee,
          isUnderpaid: resolvedAmount !== null && calculatedFee > 0 && resolvedAmount < calculatedFee,
          contribution: (resolvedAmount !== null && calculatedFee > 0 && resolvedAmount > calculatedFee) ? (resolvedAmount - calculatedFee) : 0,
          shortage: (resolvedAmount !== null && calculatedFee > 0 && resolvedAmount < calculatedFee) ? (calculatedFee - resolvedAmount) : 0
        };

        setSlipDetails(updatedDetails);
        if (updatedDetails.amount !== null && updatedDetails.amount < calculatedFee && calculatedFee > 0) {
          setUnderpaidModalOpen(true);
        }
      } catch (err) {
        console.warn("Could not analyze slip:", err);
      } finally {
        setIsAnalyzingSlip(false);
        setSlipStatusMessage("");
      }

      try {
        const cloudUrl = await uploadToCloudinary(file, eventConfig.cloudinaryConfig, "slips");
        if (cloudUrl) {
          setSlipPreview(cloudUrl);
        }
      } catch (err) {
        console.warn("Could not upload to Cloudinary:", err);
      } finally {
        setIsUploadingSlip(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Validation
  const validateStep2 = () => {
    const errs = {};
    if (!name.trim()) errs.name = "กรุณาระบุชื่อ-นามสกุล";
    const cleanPhone = cleanPhoneNumber(phone);
    if (!cleanPhone) {
      errs.phone = "กรุณาระบุเบอร์โทรศัพท์ติดต่อ";
    } else if (cleanPhone.length < 9 || cleanPhone.length > 10) {
      errs.phone = "กรุณาระบุเบอร์โทรศัพท์ 9-10 หลักให้ถูกต้อง";
    }
    if (regType === 'member') {
      if (!selectedMember) {
        errs.name = "กรุณาพิมพ์ค้นหาและเลือกชื่อสมาชิกของท่าน";
      }
    }
    if (regType === 'guest') {
      if (!birthDate) errs.birthDate = "กรุณาระบุวันเดือนปีเกิดเพื่อคำนวณอัตราค่าเข้างาน";
      if (!recommender) errs.recommender = "กรุณาเลือกสมาชิกผู้แนะนำ";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep3 = () => {
    const errs = {};
    if (calculatedFee > 0 && !slipPreview) {
      errs.slip = "กรุณาแนบภาพสลิปการโอนเงินเพื่อยืนยันการลงทะเบียน";
    }
    const rawAmt = slipDetails?.amount;
    const transferAmount = Number(rawAmt !== undefined && rawAmt !== null && Number(rawAmt) > 0 ? rawAmt : calculatedFee);
    if (calculatedFee > 0 && slipPreview) {
      if (transferAmount < calculatedFee) {
        const shortage = calculatedFee - transferAmount;
        errs.slip = `ยอดเงินโอน (${transferAmount.toLocaleString()} บาท) ไม่ครบตามจำนวนค่าลงทะเบียนที่กำหนด (${calculatedFee.toLocaleString()} บาท, ขาดอีก ${shortage.toLocaleString()} บาท)`;
        setUnderpaidModalOpen(true);
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Submit Registration
  const handleSubmitRegistration = async () => {
    // 1. Fetch freshest registrations from Cloud to avoid stale maxNum collision
    let currentRegs = registrations;
    try {
      const freshCloud = await fetchRegistrationsFromCloud();
      if (freshCloud && Array.isArray(freshCloud)) {
        currentRegs = freshCloud;
      }
    } catch (e) {}

    const maxNum = currentRegs.reduce((max, r) => {
      const match = (r.ticketNo || '').match(/\d+/);
      return match ? Math.max(max, parseInt(match[0], 10)) : max;
    }, 0);
    const ticketNumber = existingAttendee?.ticketNo || `SME-${String(maxNum + 1).padStart(3, '0')}`;
    const nowStr = new Date().toLocaleString('th-TH');

    // 6-Month Slip Expiry Date (180 days from now)
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 180);
    const expiryStr = expiryDate.toISOString().split('T')[0];

    const activePrefix = regType === 'guest'
      ? (titlePrefix === 'other' ? customPrefix.trim() : (titlePrefix || '').trim())
      : "";

    let finalName = name.trim();
    if (activePrefix && !finalName.startsWith(activePrefix)) {
      finalName = `${activePrefix} ${finalName}`;
    }

    const rawAmt = slipDetails?.amount;
    const transferAmount = Number(rawAmt !== undefined && rawAmt !== null ? rawAmt : calculatedFee);
    const isOverpaid = transferAmount > calculatedFee;
    const isUnderpaid = calculatedFee > 0 && transferAmount < calculatedFee;
    const contributionAmount = isOverpaid ? (transferAmount - calculatedFee) : 0;
    const shortageAmount = isUnderpaid ? (calculatedFee - transferAmount) : 0;

    const newTicket = {
      ticketNo: ticketNumber,
      timestamp: nowStr,
      createdAt: existingAttendee?.createdAt || new Date().toISOString(),
      regType: regType,
      memberCode: regType === 'member' && selectedMember?.memberCode ? selectedMember.memberCode : "",
      club: selectedClub === 'all' ? (eventConfig.clubs[0] || "สงสพัท") : selectedClub,
      prefix: activePrefix,
      name: finalName,
      nickname: nickname.trim(),
      phone: formatPhoneNumber(phone.trim()),
      email: email.trim(),
      birthDate: birthDate || "",
      age: calculatedAge,
      recommender: regType === 'guest' ? recommender : "",
      amount: calculatedFee,
      paidAmount: transferAmount,
      contributionAmount: contributionAmount,
      shortage: shortageAmount,
      hasShirt: isEligibleForShirt,
      shirtGender: isEligibleForShirt ? shirtGender : "",
      shirtSize: isEligibleForShirt ? shirtSize : "",
      slipUrl: slipPreview || "",
      slipDetails: slipDetails ? {
        ...slipDetails,
        amount: transferAmount,
        paidAmount: transferAmount,
        contributionAmount: contributionAmount,
        shortage: shortageAmount,
        financeStatus: isUnderpaid ? 'underpaid' : (slipDetails.isAmountDetected ? 'verified' : 'manual_review')
      } : {
        transferDate: new Date().toLocaleDateString('th-TH'),
        transferTime: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
        senderName: finalName,
        receiverAccount: `${eventConfig.bankInfo?.bankName || 'ธ.กสิกรไทย'} ${eventConfig.bankInfo?.accountNumber || '045-8-99921-4'}`,
        amount: transferAmount,
        paidAmount: transferAmount,
        contributionAmount: contributionAmount,
        shortage: shortageAmount,
        refNo: `REF-${Date.now().toString().slice(-8)}`,
        financeStatus: isUnderpaid ? 'underpaid' : 'verified'
      },
      slipUploadedAt: nowStr,
      slipExpiresAt: expiryStr,
      downloadCount: existingAttendee?.downloadCount || 0,
      lastDownloadedAt: existingAttendee?.lastDownloadedAt || null,
      downloadHistory: existingAttendee?.downloadHistory || [],
      editHistory: isEditMode ? [
        ...(existingAttendee?.editHistory || []),
        { date: nowStr, reason: editReason || "แก้ไขข้อมูลทั่วไป" }
      ] : []
    };

    if (isEditMode && existingAttendee) {
      onUpdateRegistration(newTicket);
    } else {
      onAddRegistration(newTicket);
    }

    setCompletedTicket(newTicket);

    // Trigger celebration confetti!
    try {
      confetti({
        particleCount: 150,
        spread: 90,
        origin: { y: 0.5 },
        colors: ['#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#fbbf24']
      });
    } catch (e) {
      console.log("Confetti trigger:", e);
    }

    // Open Registration Success Popup
    setRegistrationSuccessModalOpen(true);
    setAutoOpenImageDownload(true);
  };

  // Reset to start new registration
  const handleReset = () => {
    setStep(0);
    setSearchQuery("");
    setSelectedMember(null);
    setTitlePrefix("");
    setCustomPrefix("");
    setName("");
    setNickname("");
    setPhone("");
    setEmail("");
    setBirthDate("");
    setCalculatedAge(null);
    setIsCalendarOpen(false);
    setRecommender("");
    setRecommenderSearch("");
    setIsRecommenderOpen(false);
    setSlipFile(null);
    setSlipPreview("");
    setSlipDetails(null);
    setIsEditMode(false);
    setExistingAttendee(null);
    setEditReason("");
    setErrors({});
  };

  return (
    <div 
      className="min-h-screen pb-16 relative bg-cover bg-center bg-no-repeat bg-fixed font-sans"
      style={{ backgroundImage: `url(${eventConfig.backgroundImage})` }}
    >
      {/* Background Dim Filter */}
      <div 
        className="fixed inset-0 pointer-events-none transition-opacity"
        style={{ 
          backgroundColor: isWhiteCard ? '#f8fafc' : '#020617',
          opacity: (eventConfig.bgOverlayOpacity || 85) / 100 
        }}
      />

      {/* Admin Live Form Editor Sticky Top Bar */}
      {isInlineEditing && (
        <div className="sticky top-0 z-50 bg-slate-900/95 border-b border-amber-500/50 text-white px-4 py-2.5 backdrop-blur-xl shadow-2xl flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 flex items-center justify-center font-bold shadow-md shadow-amber-500/30">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-xs sm:text-sm text-white">โหมดแก้ไขแบบฟอร์ม (Google Forms Style)</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                  ✓ บันทึกอัตโนมัติ
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                คลิกแก้ไขข้อความ คำถาม ตัวเลือก หรือเงื่อนไขในหน้านี้ได้โดยตรง
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Quick Theme Picker */}
            <button
              type="button"
              onClick={() => setThemeModalOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-white border border-white/10 transition-all hover:scale-105"
            >
              <Palette className="w-3.5 h-3.5 text-amber-400" />
              <span>ปรับโทนสี & สายรุ้ง</span>
            </button>

            {/* Quick Sub-Banner Settings */}
            <button
              type="button"
              onClick={() => setSubBannerModalOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-white border border-white/10 transition-all hover:scale-105"
            >
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">รูปหน้าถัดไป (50%)</span>
              <span className="sm:hidden">รูป 50%</span>
            </button>

            {/* Quick Wallpaper Cropper */}
            <button
              type="button"
              onClick={() => {
                setCropperTarget('background');
                setCropperModalOpen(true);
              }}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-white border border-white/10 transition-all hover:scale-105"
            >
              <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">เปลี่ยนภาพพื้นหลัง</span>
              <span className="sm:hidden">พื้นหลัง</span>
            </button>

            {/* Finish Editing / Live Preview */}
            <button
              type="button"
              onClick={() => setIsInlineEditing(false)}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20 transition-all hover:scale-105"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>ดูตัวอย่างฟอร์มจริง</span>
            </button>
          </div>
        </div>
      )}

      <div className="relative z-10 max-w-2xl mx-auto pt-4 sm:pt-8 px-2 sm:px-6">
        
        {/* ==================================================== */}
        {/* STEP 0: LANDING / WELCOME SCREEN                     */}
        {/* ==================================================== */}
        {step === 0 && (
          <div className="space-y-6">
            <div className={mainCardClass}>
              
              {/* Event Banner */}
              <div className="relative h-64 sm:h-80 w-full overflow-hidden group">
                <img 
                  src={eventConfig.bannerImage} 
                  alt="Event Banner" 
                  className="w-full h-full object-cover transition-transform duration-700 hover:scale-105" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
                
                {/* Event date badge on top */}
                <div className="absolute top-4 left-4 z-20">
                  {isInlineEditing ? (
                    <input
                      type="text"
                      value={eventConfig.bannerBadge || "✨ New Year 2026 Celebration"}
                      onChange={(e) => handleUpdateConfig('bannerBadge', e.target.value)}
                      placeholder="ข้อความป้าย..."
                      className="px-3 py-1 rounded-full text-xs font-bold shadow-lg bg-slate-950/90 border border-dashed border-amber-400 text-amber-300 focus:outline-none"
                    />
                  ) : (
                    <span 
                      className="px-3 py-1 rounded-full text-xs font-bold shadow-lg"
                      style={primaryButtonStyle}
                    >
                      {eventConfig.bannerBadge || "✨ New Year 2026 Celebration"}
                    </span>
                  )}
                </div>

                {/* In-Place Banner Image Change Button & Sub-Banner Settings */}
                {isInlineEditing && (
                  <div className="absolute top-4 right-4 z-20 flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setSubBannerModalOpen(true)}
                      className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-amber-300 border border-amber-500/40 text-xs font-semibold backdrop-blur-md shadow-lg transition-all hover:scale-105"
                    >
                      <Sliders className="w-3.5 h-3.5 text-amber-400" />
                      <span>ตั้งค่ารูปหน้าถัดไป (50%)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setCropperTarget('banner');
                        setCropperModalOpen(true);
                      }}
                      className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-amber-300 border border-amber-500/40 text-xs font-semibold backdrop-blur-md shadow-lg transition-all hover:scale-105"
                    >
                      <Crop className="w-3.5 h-3.5 text-amber-400" />
                      <span>เปลี่ยนรูปหน้าปก (16:9)</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Title & Info */}
              <div className="p-4 sm:p-8 space-y-4 text-center">
                {isInlineEditing ? (
                  <div className="space-y-1">
                    <span className="text-[11px] text-amber-400 font-medium block">✏️ แก้ไขหัวข้องาน (Event Title):</span>
                    <input
                      type="text"
                      value={eventConfig.eventTitle}
                      onChange={(e) => handleUpdateConfig('eventTitle', e.target.value)}
                      placeholder="ชื่องานกิจกรรม..."
                      className="w-full text-center text-xl sm:text-2xl font-extrabold bg-slate-950/80 border-2 border-dashed border-amber-500/60 rounded-2xl p-2.5 text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                ) : (
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                    {eventConfig.eventTitle}
                  </h1>
                )}
                
                {isInlineEditing ? (
                  <div className="space-y-1">
                    <span className="text-[11px] text-amber-400 font-medium block">✏️ แก้ไขคำอธิบายรายละเอียดงาน (Subtitle):</span>
                    <textarea
                      rows={2}
                      value={eventConfig.eventSubtitle}
                      onChange={(e) => handleUpdateConfig('eventSubtitle', e.target.value)}
                      placeholder="คำอธิบายรายละเอียดงาน..."
                      className="w-full text-center text-xs sm:text-sm bg-slate-950/80 border-2 border-dashed border-amber-500/40 rounded-2xl p-2 text-slate-200 focus:outline-none focus:border-amber-400 max-w-lg mx-auto block"
                    />
                  </div>
                ) : (
                  <p className="text-sm text-slate-300 max-w-lg mx-auto leading-relaxed">
                    {eventConfig.eventSubtitle}
                  </p>
                )}

                {/* Event Details Grid - 2 columns side-by-side on mobile and desktop */}
                <div className="grid grid-cols-2 gap-2 sm:gap-3 py-2 text-xs text-left max-w-lg mx-auto">
                  <div className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 flex items-start space-x-2 sm:space-x-2.5">
                    <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] sm:text-xs text-slate-400 font-medium">วันและเวลาจัดงาน</div>
                      {isInlineEditing ? (
                        <input
                          type="text"
                          value={eventConfig.eventDate}
                          onChange={(e) => handleUpdateConfig('eventDate', e.target.value)}
                          className="w-full text-[11px] sm:text-xs font-semibold text-white bg-slate-950 border border-dashed border-amber-500/40 rounded-lg px-2 py-1 focus:outline-none focus:border-amber-400 mt-0.5"
                        />
                      ) : (
                        <div className="font-semibold text-white text-[11px] sm:text-xs leading-snug break-words mt-0.5">
                          {eventConfig.eventDate?.includes('เวลา') ? (
                            <>
                              <div className="leading-tight">{eventConfig.eventDate.split('เวลา')[0].trim()}</div>
                              <div className="text-amber-300 font-normal text-[10px] sm:text-[11px] leading-tight pt-0.5">
                                เวลา {eventConfig.eventDate.split('เวลา')[1].trim()}
                              </div>
                            </>
                          ) : (
                            <div>{eventConfig.eventDate}</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 flex items-start space-x-2 sm:space-x-2.5">
                    <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-rose-400 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] sm:text-xs text-slate-400 font-medium">สถานที่จัดงาน</div>
                      {isInlineEditing ? (
                        <input
                          type="text"
                          value={eventConfig.eventVenue}
                          onChange={(e) => handleUpdateConfig('eventVenue', e.target.value)}
                          className="w-full text-[11px] sm:text-xs font-semibold text-white bg-slate-950 border border-dashed border-amber-500/40 rounded-lg px-2 py-1 focus:outline-none focus:border-amber-400 mt-0.5"
                        />
                      ) : (
                        <div className="font-semibold text-white text-[11px] sm:text-xs leading-snug break-words mt-0.5">
                          {eventConfig.eventVenue?.includes('(') ? (
                            <>
                              <div className="leading-tight">{eventConfig.eventVenue.split('(')[0].trim()}</div>
                              <div className="text-slate-400 font-normal text-[10px] sm:text-[11px] leading-tight pt-0.5">
                                ({eventConfig.eventVenue.split('(')[1]}
                              </div>
                            </>
                          ) : (
                            <div>{eventConfig.eventVenue}</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* ==================================================== */}
                {/* REGISTRATION SCHEDULE COUNTDOWN & STATUS BANNER       */}
                {/* ==================================================== */}
                {scheduleStatus.status === 'UPCOMING' && (
                  <RegistrationCountdown
                    mode="launch"
                    targetDate={scheduleStatus.targetDate}
                    formattedDateText={scheduleStatus.formattedOpenDate}
                    remainingShirtQuota={remainingShirtQuota}
                    maxShirtQuota={maxShirtQuota}
                  />
                )}

                {scheduleStatus.status === 'OPEN' && scheduleStatus.targetDate && (
                  <RegistrationCountdown
                    mode="closing"
                    targetDate={scheduleStatus.targetDate}
                    formattedDateText={scheduleStatus.formattedCloseDate}
                    remainingShirtQuota={remainingShirtQuota}
                    maxShirtQuota={maxShirtQuota}
                  />
                )}

                {scheduleStatus.status === 'CLOSED' && (
                  <div className="p-4 sm:p-5 rounded-3xl bg-rose-950/40 border-2 border-rose-500/40 text-center space-y-2 shadow-xl my-4 animate-fadeIn">
                    <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto">
                      <Lock className="w-6 h-6" />
                    </div>
                    <h4 className="text-base sm:text-lg font-black text-rose-300">
                      ระบบปิดรับลงทะเบียนเรียบร้อยแล้ว
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
                      {scheduleStatus.closedMessage || "ระบบปิดรับลงทะเบียนเรียบร้อยแล้ว ขอขอบคุณทุกท่านที่ให้ความสนใจ"}
                    </p>
                  </div>
                )}

                {/* Big Action Button Area */}
                <div className="pt-2">
                  {/* Admin Bypass Notice */}
                  {isAdmin && !scheduleStatus.isOpen && (
                    <div className="mb-3 p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-200 text-xs flex items-center justify-between gap-2">
                      <span className="font-semibold flex items-center space-x-1.5">
                        <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>👑 โหมดผู้ดูแลระบบ: ท่านสามารถทดสอบกรอกฟอร์มได้แม้ยังไม่เปิด/ปิดแล้ว</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="px-3 py-1 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs shrink-0 hover:scale-105 transition-transform"
                      >
                        ทดสอบฟอร์ม
                      </button>
                    </div>
                  )}

                  {isInlineEditing && (
                    <div className="mb-2 text-left">
                      <label className="text-[11px] text-amber-400 block mb-1">✏️ แก้ไขข้อความบนปุ่ม (Button Text):</label>
                      <input
                        type="text"
                        value={eventConfig.landingButtonText === "กดลงทะเบียนเข้างาน" ? "ลงทะเบียนเข้างาน" : (eventConfig.landingButtonText || "ลงทะเบียนเข้างาน")}
                        onChange={(e) => handleUpdateConfig('landingButtonText', e.target.value)}
                        className="w-full text-xs bg-slate-950 border border-dashed border-amber-500/40 rounded-xl px-3 py-1.5 text-white focus:outline-none"
                      />
                    </div>
                  )}

                  {/* Row 1: 80% Registration : 20% Sponsorship */}
                  <div className="flex items-stretch gap-2 sm:gap-3">
                    {/* 80% Main Registration Button */}
                    <div className="flex-[4] min-w-0">
                      {scheduleStatus.isOpen ? (
                        <button
                          type="button"
                          onClick={() => setStep(1)}
                          className="w-full h-full min-h-[52px] sm:min-h-[56px] py-3 sm:py-3.5 px-3 sm:px-4 rounded-2xl text-sm sm:text-base font-black bg-gradient-to-r from-emerald-400 via-teal-200 to-emerald-400 hover:from-emerald-300 hover:via-teal-100 hover:to-emerald-300 text-slate-950 shadow-xl shadow-emerald-400/35 hover:shadow-emerald-400/55 border-2 border-emerald-200 transition-all hover:scale-[1.01] active:scale-95 flex items-center justify-center cursor-pointer tracking-wide"
                        >
                          <span className="truncate">
                            {(!eventConfig.landingButtonText || eventConfig.landingButtonText === "กดลงทะเบียนเข้างาน")
                              ? "ลงทะเบียนเข้างาน"
                              : eventConfig.landingButtonText}
                          </span>
                        </button>
                      ) : scheduleStatus.status === 'UPCOMING' ? (
                        <button
                          type="button"
                          disabled
                          className="w-full h-full min-h-[52px] sm:min-h-[56px] py-3 sm:py-3.5 px-2 sm:px-4 rounded-2xl text-[11px] sm:text-sm font-bold bg-slate-900 border border-amber-500/40 text-amber-300/80 shadow-lg flex items-center justify-center space-x-1.5 sm:space-x-2 cursor-not-allowed opacity-90"
                        >
                          <Clock className="w-4 h-4 text-amber-400 animate-spin-slow shrink-0" />
                          <span className="truncate">⏳ รอเปิดรับลงทะเบียน ({scheduleStatus.formattedShortOpenDate || 'เร็วๆ นี้'})</span>
                          <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled
                          className="w-full h-full min-h-[52px] sm:min-h-[56px] py-3 sm:py-3.5 px-2 sm:px-4 rounded-2xl text-xs sm:text-sm font-bold bg-rose-950/50 border border-rose-500/30 text-rose-300/80 shadow-lg flex items-center justify-center space-x-1.5 sm:space-x-2 cursor-not-allowed opacity-90"
                        >
                          <Lock className="w-4 h-4 text-rose-400 shrink-0" />
                          <span>🔒 ปิดรับลงทะเบียนแล้ว</span>
                        </button>
                      )}
                    </div>

                    {/* 20% Sponsorship Button */}
                    <div className="flex-[1] min-w-[76px] sm:min-w-[95px]">
                      <button
                        type="button"
                        onClick={() => setIsSponsorModalOpen(true)}
                        className="w-full h-full min-h-[52px] sm:min-h-[56px] py-2 px-2 rounded-2xl text-xs sm:text-sm font-bold bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 border border-amber-300 transition-all hover:scale-[1.02] active:scale-95 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 text-center leading-tight cursor-pointer"
                        title="ร่วมเป็นผู้สนับสนุนกิจกรรม (เงินสด / ของสนับสนุน)"
                      >
                        <HeartHandshake className="w-4 h-4 sm:w-5 sm:h-5 text-slate-950 shrink-0" />
                        <span className="font-extrabold whitespace-nowrap">ผู้สนับสนุน</span>
                      </button>
                    </div>
                  </div>

                  {/* Row 2: 80% Download Ticket : 20% Public Data Sheet */}
                  <div className="flex items-stretch gap-2 sm:gap-3 mt-3">
                    {/* 80% Action: Download Ticket */}
                    <div className="flex-[4] min-w-0">
                      <button
                        type="button"
                        onClick={() => {
                          setIsFindTicketModalOpen(true);
                          setFindTicketSearch("");
                          setFindTicketSelected(null);
                          setFindTicketPhone("");
                          setFindTicketError("");
                        }}
                        className="w-full h-full min-h-[48px] sm:min-h-[50px] py-2.5 sm:py-3.5 px-3 sm:px-4 rounded-2xl text-xs sm:text-sm font-extrabold bg-slate-900/90 hover:bg-slate-800 border border-white/15 hover:border-amber-500/50 text-slate-200 hover:text-white transition-all shadow-lg flex items-center justify-center group hover:scale-[1.01]"
                      >
                        <span className="truncate">สำหรับผู้ที่ลงทะเบียนแล้ว • ดาวน์โหลดบัตรเข้างาน</span>
                      </button>
                    </div>

                    {/* 20% Action: Public Data Sheet (Excel / A4 View) */}
                    <div className="flex-[1] min-w-[76px] sm:min-w-[95px]">
                      <button
                        type="button"
                        onClick={() => setIsDataSheetModalOpen(true)}
                        className="w-full h-full min-h-[48px] sm:min-h-[50px] py-2 px-2 rounded-2xl text-xs sm:text-sm font-bold bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-amber-300 border border-white/15 hover:border-amber-400/40 shadow-lg transition-all hover:scale-[1.02] active:scale-95 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 text-center leading-tight cursor-pointer"
                        title="ดูสรุปข้อมูลผู้ลงทะเบียนและผู้สนับสนุนกิจกรรม (ตาราง Excel / A4)"
                      >
                        <FileSpreadsheet className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 shrink-0" />
                        <span className="font-extrabold whitespace-nowrap">ข้อมูล</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* STEP 1: TYPE SELECTION (สมาชิก / แขกผู้มีเกียรติ)       */}
        {/* ==================================================== */}
        {step === 1 && (
          <div className="space-y-6">
            <div className={mainCardClass}>
              {/* 50% Sub-Banner for Step 1 */}
              {renderSubBanner(1)}

              <div className="p-4 sm:p-8">
                <div className="text-center mb-6 sm:mb-8">
                  <span className="text-xs font-mono px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 font-bold">
                  ขั้นตอนที่ 1 จาก 3
                </span>
                <h2 className="text-xl sm:text-2xl font-extrabold text-white mt-3">
                  ท่านเป็นสมาชิก SME FAN หรือไม่?
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  กรุณาเลือกประเภทการเข้าร่วมงานของท่านเพื่อดำเนินการต่อ
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5 sm:gap-5">
                {/* Option 1: สมาชิก SME FAN (2 คอลัมน์เคียงข้างกันทั้งบนมือถือและคอมพิวเตอร์) */}
                <button
                  type="button"
                  onClick={() => {
                    if (!isInlineEditing) {
                      setRegType('member');
                      setStep(2);
                    }
                  }}
                  className={`group relative w-full p-3 sm:p-8 rounded-2xl sm:rounded-3xl border transition-all text-center flex flex-col items-center justify-between cursor-pointer hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-2xl ${
                    isWhiteCard
                      ? 'border-slate-200 bg-slate-50 hover:bg-amber-500/10 hover:border-amber-500 text-slate-800'
                      : 'border-white/10 bg-white/5 hover:border-amber-500 hover:bg-amber-500/10 text-white'
                  }`}
                >
                  <div className="space-y-2.5 sm:space-y-4 flex flex-col items-center w-full">
                    {/* Centered Icon */}
                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center group-hover:scale-110 group-hover:bg-amber-500/20 group-hover:text-amber-400 transition-all shadow-inner">
                      <UserCheck className="w-6 h-6 sm:w-8 sm:h-8" />
                    </div>

                    {/* Centered Title & Description */}
                    <div className="space-y-1 sm:space-y-2 w-full text-center">
                      {isInlineEditing ? (
                        <div className="space-y-1.5" onClick={(e) => e.stopPropagation()}>
                          <label className="text-[10px] text-amber-400 font-medium block">✏️ แก้ไขหัวข้อตัวเลือกที่ 1:</label>
                          <input
                            type="text"
                            value={eventConfig.memberCardTitle || "สมาชิก SME FAN"}
                            onChange={(e) => handleUpdateConfig('memberCardTitle', e.target.value)}
                            className="w-full text-center text-xs sm:text-sm font-bold text-white bg-slate-950 border border-dashed border-amber-500/50 rounded-xl px-2 py-1 focus:outline-none"
                          />
                          <textarea
                            rows={2}
                            value={eventConfig.memberCardDesc || "สำหรับสมาชิกเดิมในสังกัดสนามต่างๆ เช่น สงสพัท, โรตารี่ (มีรายชื่อในระบบอยู่แล้ว)"}
                            onChange={(e) => handleUpdateConfig('memberCardDesc', e.target.value)}
                            className="w-full text-center text-[10px] sm:text-xs text-slate-300 bg-slate-950 border border-dashed border-amber-500/40 rounded-xl p-1.5 focus:outline-none"
                          />
                        </div>
                      ) : (
                        <>
                          <h3 className={`text-sm sm:text-xl font-extrabold group-hover:text-amber-400 transition-colors ${
                            isWhiteCard ? 'text-slate-900' : 'text-white'
                          }`}>
                            {eventConfig.memberCardTitle || "สมาชิก SME FAN"}
                          </h3>
                          <p className={`text-[11px] sm:text-sm mt-0.5 sm:mt-1 leading-snug sm:leading-relaxed max-w-xs mx-auto line-clamp-3 sm:line-clamp-none ${
                            isWhiteCard ? 'text-slate-600' : 'text-slate-400 group-hover:text-slate-300'
                          }`}>
                            {eventConfig.memberCardDesc || "สำหรับสมาชิกเดิมในสังกัดสนามต่างๆ เช่น สงสพัท, โรตารี่ (มีรายชื่อในระบบอยู่แล้ว)"}
                          </p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Centered Action Button Pill */}
                  <div className="mt-3 sm:mt-6 w-full flex items-center justify-center space-x-1 sm:space-x-2 px-1.5 sm:px-5 py-2 sm:py-2.5 rounded-xl text-[11px] sm:text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md group-hover:shadow-amber-500/30 group-hover:scale-105 transition-all">
                    <span><span className="hidden sm:inline">เลือก</span>ลงทะเบียนสมาชิก</span>
                    <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:translate-x-1 transition-transform shrink-0" />
                  </div>
                </button>

                {/* Option 2: แขกผู้มีเกียรติ (2 คอลัมน์เคียงข้างกันทั้งบนมือถือและคอมพิวเตอร์) */}
                <button
                  type="button"
                  onClick={() => {
                    if (!isInlineEditing) {
                      setRegType('guest');
                      setStep(2);
                    }
                  }}
                  className={`group relative w-full p-3 sm:p-8 rounded-2xl sm:rounded-3xl border transition-all text-center flex flex-col items-center justify-between cursor-pointer hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-2xl ${
                    isWhiteCard
                      ? 'border-slate-200 bg-slate-50 hover:bg-emerald-500/10 hover:border-emerald-500 text-slate-800'
                      : 'border-white/10 bg-white/5 hover:border-emerald-500 hover:bg-emerald-500/10 text-white'
                  }`}
                >
                  <div className="space-y-2.5 sm:space-y-4 flex flex-col items-center w-full">
                    {/* Centered Icon */}
                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-110 group-hover:bg-emerald-500/30 transition-all shadow-inner">
                      <UserPlus className="w-6 h-6 sm:w-8 sm:h-8" />
                    </div>

                    {/* Centered Title & Description */}
                    <div className="space-y-1 sm:space-y-2 w-full text-center">
                      {isInlineEditing ? (
                        <div className="space-y-1.5" onClick={(e) => e.stopPropagation()}>
                          <label className="text-[10px] text-emerald-400 font-medium block">✏️ แก้ไขหัวข้อตัวเลือกที่ 2:</label>
                          <input
                            type="text"
                            value={eventConfig.guestCardTitle || "แขกผู้มีเกียรติ (VIP Guest)"}
                            onChange={(e) => handleUpdateConfig('guestCardTitle', e.target.value)}
                            className="w-full text-center text-xs sm:text-sm font-bold text-white bg-slate-950 border border-dashed border-emerald-500/50 rounded-xl px-2 py-1 focus:outline-none"
                          />
                          <textarea
                            rows={2}
                            value={eventConfig.guestCardDesc || "สำหรับผู้ที่ได้รับคำเชิญจากสมาชิก SME FAN หรือบุคคลภายนอกที่สนใจร่วมงาน"}
                            onChange={(e) => handleUpdateConfig('guestCardDesc', e.target.value)}
                            className="w-full text-center text-[10px] sm:text-xs text-slate-300 bg-slate-950 border border-dashed border-emerald-500/40 rounded-xl p-1.5 focus:outline-none"
                          />
                        </div>
                      ) : (
                        <>
                          <h3 className={`text-sm sm:text-xl font-extrabold group-hover:text-emerald-400 transition-colors ${
                            isWhiteCard ? 'text-slate-900' : 'text-white'
                          }`}>
                            {eventConfig.guestCardTitle || "แขกผู้มีเกียรติ"}
                          </h3>
                          <p className={`text-[11px] sm:text-sm mt-0.5 sm:mt-1 leading-snug sm:leading-relaxed max-w-xs mx-auto line-clamp-3 sm:line-clamp-none ${
                            isWhiteCard ? 'text-slate-600' : 'text-slate-400 group-hover:text-slate-300'
                          }`}>
                            {eventConfig.guestCardDesc || "สำหรับผู้ที่ได้รับคำเชิญจากสมาชิก SME FAN หรือบุคคลภายนอกที่สนใจร่วมงาน"}
                          </p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Centered Action Button Pill */}
                  <div className="mt-3 sm:mt-6 w-full flex items-center justify-center space-x-1 sm:space-x-2 px-1.5 sm:px-5 py-2 sm:py-2.5 rounded-xl text-[11px] sm:text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md group-hover:shadow-emerald-500/30 group-hover:scale-105 transition-all">
                    <span><span className="hidden sm:inline">เลือก</span>ลงทะเบียนแขก</span>
                    <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:translate-x-1 transition-transform shrink-0" />
                  </div>
                </button>
              </div>

              <div className="mt-8 pt-4 border-t border-white/10 flex justify-between">
                <button
                  onClick={() => setStep(0)}
                  className="flex items-center space-x-1 text-xs text-slate-400 hover:text-white"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>ย้อนกลับหน้าแรก</span>
                </button>
              </div>

              </div>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* STEP 2: FILL INFORMATION                             */}
        {/* ==================================================== */}
        {step === 2 && (
          <div className="space-y-6">
            <div className={mainCardClass}>
              {/* 50% Sub-Banner for Step 2 */}
              {renderSubBanner(2)}

              <div className="p-4 sm:p-8">
                <div className="mb-6">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 font-bold">
                    ขั้นตอนที่ 2: กรอกข้อมูล ({regType === 'member' ? 'สมาชิก SME FAN' : 'แขกผู้มีเกียรติ'})
                  </span>
                  {isEditMode && (
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 font-bold">
                      โหมดแก้ไขข้อมูล
                    </span>
                  )}
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-white mt-2">
                  {regType === 'member' ? 'เลือกสังกัดและค้นหาชื่อสมาชิก' : 'ข้อมูลส่วนตัวของแขกผู้มีเกียรติ'}
                </h2>
              </div>

              {/* Edit Mode Remark notice */}
              {isEditMode && (
                <div className="mb-5 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 space-y-1.5">
                  <div className="font-bold flex items-center space-x-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-400" />
                    <span>ระบุเหตุผลในการแก้ไขข้อมูล:</span>
                  </div>
                  <input
                    type="text"
                    value={editReason}
                    onChange={(e) => setEditReason(e.target.value)}
                    placeholder="เช่น แก้ไขเบอร์โทรศัพท์ / เปลี่ยนไซซ์เสื้อ"
                    className="w-full text-xs bg-slate-950 border border-amber-500/30 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              )}

              {/* ------------------------------------------- */}
              {/* MEMBER FLOW SPECIFIC CONTROLS               */}
              {/* ------------------------------------------- */}
              {regType === 'member' && (
                <div className="space-y-5">
                  
                  {/* Select Club buttons */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-semibold text-slate-300">
                        สังกัดสนามของท่าน:
                      </label>
                      {isInlineEditing && (
                        <span className="text-[11px] text-amber-400">
                          ✏️ แก้ไขสังกัดสนาม (กด × เพื่อลบ หรือพิมพ์เพิ่มสนามใหม่)
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {eventConfig.clubs.map((club) => (
                        <div key={club} className="relative inline-flex items-center">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedClub(club);
                              setSelectedMember(null);
                              setSearchQuery("");
                            }}
                            style={selectedClub === club ? primaryButtonStyle : {}}
                            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                              selectedClub === club
                                ? 'shadow-md'
                                : 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10'
                            }`}
                          >
                            สนาม {club}
                          </button>
                          {isInlineEditing && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveClubInline(club);
                              }}
                              title={`ลบสังกัด ${club}`}
                              className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center text-[10px] font-bold shadow"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      ))}

                      {/* Inline Add Club input */}
                      {isInlineEditing && (
                        <form onSubmit={handleAddClubInline} className="flex items-center space-x-1">
                          <input
                            type="text"
                            value={newClubInput}
                            onChange={(e) => setNewClubInput(e.target.value)}
                            placeholder="+ เพิ่มสนามใหม่..."
                            className="px-3 py-2 rounded-xl text-xs bg-slate-950 border border-dashed border-amber-400 text-white placeholder-slate-500 focus:outline-none w-36"
                          />
                          <button
                            type="submit"
                            className="px-2.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all"
                          >
                            เพิ่ม
                          </button>
                        </form>
                      )}
                    </div>
                  </div>

                  {/* Autocomplete Search Member */}
                  <div className="relative">
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      ค้นหาด้วยรหัสสมาชิก หรือชื่อ-สกุล ในสนาม {selectedClub}: <span className="text-amber-400">*</span>
                    </label>
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          if (selectedMember && e.target.value !== selectedMember.name) {
                            setSelectedMember(null);
                          }
                        }}
                        placeholder="พิมพ์รหัส เช่น SME-001 หรือชื่อ 'ทีป์ชลิต ทองจันทร์'..."
                        className="w-full pl-10 pr-10 py-3 rounded-2xl text-xs sm:text-sm bg-slate-950 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 shadow-inner"
                      />
                      {selectedMember && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedMember(null);
                            setSearchQuery("");
                            setName("");
                            setPhone("");
                            setEmail("");
                          }}
                          className="absolute right-3 top-3 p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                          title="ล้างค่าและเลือกใหม่"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    {errors.name && <span className="text-rose-400 text-[11px] mt-1 block font-semibold">{errors.name}</span>}

                    {/* Autocomplete Dropdown List */}
                    {searchQuery.trim() && !selectedMember && filteredMembers.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-slate-900 border border-white/15 rounded-2xl shadow-2xl z-30 max-h-56 overflow-y-auto divide-y divide-white/5">
                        {filteredMembers.map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => handleSelectMember(m)}
                            className="w-full p-3 text-left hover:bg-amber-500/20 transition-all flex items-center justify-between text-xs group"
                          >
                            <div className="flex items-center space-x-2">
                              {m.memberCode && (
                                <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold border border-amber-500/30">
                                  {m.memberCode}
                                </span>
                              )}
                              <span className="font-bold text-white group-hover:text-amber-300 transition-colors">{m.name}</span>
                              {m.nickname && <span className="text-amber-400 font-semibold">({m.nickname})</span>}
                            </div>
                            <span className="text-[11px] text-slate-400 font-mono">{m.phone || ""}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Member Selection Dependent Section */}
                  {!selectedMember ? (
                    <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border-2 border-dashed border-amber-500/30 text-center space-y-1.5 my-2 animate-in fade-in">
                      <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-500/20 text-amber-300 mb-1">
                        <Search className="w-4 h-4 text-amber-400" />
                      </div>
                      <p className="text-xs sm:text-sm font-bold text-amber-300">
                        👆 กรุณาพิมพ์ค้นหาและกดเลือก "ชื่อสมาชิก" ของท่านด้านบน
                      </p>
                      <p className="text-[11px] text-slate-400">
                        เมื่อกดเลือกชื่อแล้ว ข้อมูลเบอร์โทรศัพท์มือถือจะขึ้นมาให้อัตโนมัติ (และท่านสามารถแก้ไขได้ครับ)
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 pt-1 animate-in fade-in duration-300">
                      {/* Selected Member Details Card */}
                      <div className="flex flex-wrap items-center justify-between gap-2 p-3.5 rounded-2xl bg-amber-500/15 border-2 border-amber-500/40 text-xs text-amber-300 shadow-md">
                        <div className="flex flex-wrap items-center gap-2">
                          {selectedMember.memberCode && (
                            <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-200 font-mono font-bold">
                              <span>รหัส:</span>
                              <span className="text-amber-100">{selectedMember.memberCode}</span>
                            </span>
                          )}
                          <span className="text-white font-bold text-sm">
                            {selectedMember.name}
                          </span>
                          {selectedMember.nickname && (
                            <span className="text-amber-300 font-semibold">
                              ({selectedMember.nickname})
                            </span>
                          )}
                          <span className="text-slate-300 text-[11px]">
                            • สนาม {selectedClub}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedMember(null);
                            setSearchQuery("");
                            setName("");
                            setPhone("");
                            setEmail("");
                          }}
                          className="text-[11px] px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all"
                        >
                          เปลี่ยนสมาชิก
                        </button>
                      </div>

                      {/* PROMINENT PHONE & EMAIL SECTION (MEMBER) */}
                      <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-amber-500/5 border-2 border-amber-500/40 shadow-lg space-y-3">
                        {/* 1. Phone Row */}
                        <div className="space-y-1.5">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                            <label className="text-xs sm:text-sm font-bold text-amber-300 flex items-center space-x-1.5">
                              <Phone className="w-4 h-4 text-amber-400 shrink-0" />
                              <span>เบอร์โทรศัพท์มือถือ * (ตรวจสอบให้ถูกต้อง)</span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold shrink-0">
                                สำคัญมาก
                              </span>
                            </label>
                            <span className="text-[11px] text-amber-200/90 font-medium">
                              ⭐ ใช้ยืนยันตัวตนร่วมกิจกรรม & เป็นกรรมการตัดสิน
                            </span>
                          </div>
                          <input
                            type="text"
                            value={phone}
                            onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
                            placeholder="08x-xxx-xxxx"
                            className="w-full px-3.5 py-2.5 rounded-xl text-sm sm:text-base bg-slate-950 border-2 border-amber-400/60 text-amber-300 font-mono font-bold tracking-wider placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 shadow-inner"
                          />
                          {selectedMember.phone && (
                            <p className="text-[11px] text-emerald-400 flex items-center space-x-1">
                              <span>✅ ดึงเบอร์จากฐานข้อมูลสมาชิกอัตโนมัติ (แก้ไขได้หากเปลี่ยนเบอร์)</span>
                            </p>
                          )}
                          {errors.phone && <span className="text-rose-400 text-[11px] mt-1 block font-semibold">{errors.phone}</span>}
                        </div>

                        {/* 2. Email Row (Separate Line) */}
                        <div className="space-y-1.5 pt-2.5 border-t border-amber-500/20">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                              <Mail className="w-3.5 h-3.5 text-amber-400/90 shrink-0" />
                              <span>อีเมล (Email) สำหรับรับบัตรเข้างาน E-Ticket</span>
                            </label>
                            <span className="text-[10px] text-slate-400">(ไม่บังคับ)</span>
                          </div>
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="อีเมล (สำหรับรับบัตร E-Ticket เช่น name@example.com)"
                            className="w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm bg-slate-950/80 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 shadow-inner"
                          />
                        </div>

                        {/* Important Warning Note */}
                        <div className="text-[11px] text-amber-200/80 bg-amber-950/40 p-2.5 rounded-xl border border-amber-500/20 leading-relaxed">
                          ⚠️ <strong>หมายเหตุสำคัญ:</strong> กรุณาตรวจสอบเบอร์โทรศัพท์มือถือให้ถูกต้องและจำเบอร์นี้ไว้ เนื่องจากระบบจะใช้เบอร์โทรศัพท์นี้ในการยืนยันตัวตนเข้าร่วมกิจกรรมในงาน และสแกน QR Code เพื่อให้คะแนนการประกวดแต่งกาย (1 เบอร์ / 1 สิทธิ์การตัดสิน)
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              )}

              {/* ------------------------------------------- */}
              {/* GUEST FLOW SPECIFIC CONTROLS                */}
              {/* ------------------------------------------- */}
              {regType === 'guest' && (
                <div className="space-y-4">
                  
                  {/* Guest Name & Nickname */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        ชื่อ - นามสกุลจริง <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="พิมพ์ชื่อจริงและนามสกุล..."
                        className="w-full px-3 py-2.5 rounded-xl text-xs bg-slate-950 border border-white/10 text-white focus:outline-none focus:border-amber-500"
                      />
                      {errors.name && <span className="text-rose-400 text-[11px] mt-1 block">{errors.name}</span>}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        ชื่อเล่น (Nickname)
                      </label>
                      <input
                        type="text"
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        placeholder="เช่น เอก"
                        className="w-full px-3 py-2.5 rounded-xl text-xs bg-slate-950 border border-white/10 text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  {/* DOB & Auto-Age with Custom Calendar Picker - 2 columns on mobile */}
                  <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
                    <div ref={calendarContainerRef} className="relative">
                      <div className="mb-1">
                        <label className="block text-[11px] sm:text-xs font-medium text-slate-300 truncate">
                          วันเดือนปีเกิด <span className="text-rose-400">*</span>
                        </label>
                      </div>

                      {/* Calendar Trigger Field */}
                      <button
                        type="button"
                        onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                        className={`w-full px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-xl text-xs bg-slate-950 border transition-all text-left flex items-center justify-between shadow-inner ${
                          isCalendarOpen
                            ? 'border-emerald-500 ring-2 ring-emerald-500/30'
                            : birthDate
                            ? 'border-emerald-500/50 text-white'
                            : 'border-white/10 text-slate-400 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center space-x-1.5 truncate">
                          <Calendar className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${birthDate ? 'text-emerald-400' : 'text-slate-400'}`} />
                          <span className={birthDate ? 'text-white font-medium text-[11px] sm:text-xs truncate' : 'text-slate-400 text-[11px] sm:text-xs truncate'}>
                            {birthDate ? formatThaiDate(birthDate) : "เลือกวันเกิด..."}
                          </span>
                        </div>
                        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${isCalendarOpen ? 'rotate-180 text-emerald-400' : ''}`} />
                      </button>
                      {errors.birthDate && <span className="text-rose-400 text-[10px] mt-1 block">{errors.birthDate}</span>}

                      {/* Interactive Calendar Popover Dialog */}
                      {isCalendarOpen && (
                        <div className="absolute top-full left-0 w-[calc(100vw-2.5rem)] max-w-xs sm:w-80 mt-1.5 z-50 bg-slate-900 border border-white/20 rounded-2xl p-4 shadow-2xl backdrop-blur-xl animate-in fade-in duration-150">
                          
                          {/* Header: Month & Year Controls */}
                          <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-white/10">
                            <button
                              type="button"
                              onClick={() => {
                                setCalendarViewDate(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() - 1, 1));
                              }}
                              className="p-1 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                              title="เดือนก่อนหน้า"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </button>

                            <div className="flex items-center space-x-1.5">
                              {/* Month Selector */}
                              <select
                                value={calendarViewDate.getMonth()}
                                onChange={(e) => {
                                  setCalendarViewDate(new Date(calendarViewDate.getFullYear(), parseInt(e.target.value, 10), 1));
                                }}
                                className="bg-slate-950 border border-white/15 text-white text-xs rounded-lg px-2 py-1 font-semibold focus:outline-none focus:border-emerald-500 cursor-pointer"
                              >
                                {THAI_MONTHS_FULL.map((m, idx) => (
                                  <option key={m} value={idx} className="bg-slate-900 text-white">
                                    {m}
                                  </option>
                                ))}
                              </select>

                              {/* Year Selector (พ.ศ. / ค.ศ.) */}
                              <select
                                value={calendarViewDate.getFullYear()}
                                onChange={(e) => {
                                  setCalendarViewDate(new Date(parseInt(e.target.value, 10), calendarViewDate.getMonth(), 1));
                                }}
                                className="bg-slate-950 border border-white/15 text-emerald-300 text-xs rounded-lg px-2 py-1 font-mono font-bold focus:outline-none focus:border-emerald-500 cursor-pointer"
                              >
                                {Array.from({ length: 97 }, (_, i) => 2026 - i).map((y) => (
                                  <option key={y} value={y} className="bg-slate-900 text-white">
                                    พ.ศ. {y + 543} ({y})
                                  </option>
                                ))}
                              </select>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setCalendarViewDate(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() + 1, 1));
                              }}
                              className="p-1 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                              title="เดือนถัดไป"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Weekdays Row */}
                          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold mb-1.5">
                            {THAI_WEEKDAYS.map((w, idx) => (
                              <div key={w} className={idx === 0 ? 'text-rose-400' : idx === 6 ? 'text-amber-400' : 'text-slate-400'}>
                                {w}
                              </div>
                            ))}
                          </div>

                          {/* Calendar Days Grid */}
                          <div className="grid grid-cols-7 gap-1">
                            {calendarDays.map((c, idx) => {
                              const cellDate = new Date(
                                calendarViewDate.getFullYear(), 
                                calendarViewDate.getMonth() + c.monthOffset, 
                                c.day
                              );
                              const dateStr = `${cellDate.getFullYear()}-${String(cellDate.getMonth() + 1).padStart(2, '0')}-${String(c.day).padStart(2, '0')}`;
                              const isSelected = birthDate === dateStr;
                              const isSunday = cellDate.getDay() === 0;
                              const isSaturday = cellDate.getDay() === 6;

                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => {
                                    handleBirthDateChange(dateStr);
                                    setIsCalendarOpen(false);
                                  }}
                                  className={`h-7 rounded-lg text-xs font-semibold flex items-center justify-center transition-all ${
                                    isSelected
                                      ? 'bg-emerald-500 text-slate-950 font-bold shadow-md scale-105 ring-2 ring-emerald-300'
                                      : !c.isCurrent
                                      ? 'text-slate-600 hover:text-slate-400 hover:bg-white/5'
                                      : isSunday
                                      ? 'text-rose-300 hover:bg-rose-500/20 hover:text-white'
                                      : isSaturday
                                      ? 'text-amber-300 hover:bg-amber-500/20 hover:text-white'
                                      : 'text-slate-200 hover:bg-emerald-500/20 hover:text-emerald-300'
                                  }`}
                                >
                                  {c.day}
                                </button>
                              );
                            })}
                          </div>

                          {/* Quick Year / Age Shortcuts */}
                          <div className="mt-3 pt-2.5 border-t border-white/10 space-y-1.5">
                            <div className="flex items-center justify-between text-[10px] text-slate-400">
                              <span>ทางลัดเลือกตามช่วงอายุ:</span>
                              {birthDate && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleBirthDateChange("");
                                    setIsCalendarOpen(false);
                                  }}
                                  className="text-rose-400 hover:text-rose-300 transition-colors"
                                >
                                  ล้างค่า
                                </button>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setCalendarViewDate(new Date(2021, 0, 1));
                                }}
                                className="px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] text-slate-300 transition-colors"
                              >
                                เด็ก 5 ปี (เข้าฟรี)
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setCalendarViewDate(new Date(2016, 0, 1));
                                }}
                                className="px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] text-slate-300 transition-colors"
                              >
                                เด็ก 10 ปี (250บ.)
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setCalendarViewDate(new Date(2001, 0, 1));
                                }}
                                className="px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] text-slate-300 transition-colors"
                              >
                                ผู้ใหญ่ 25 ปี
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setCalendarViewDate(new Date(1986, 0, 1));
                                }}
                                className="px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] text-slate-300 transition-colors"
                              >
                                ผู้ใหญ่ 40 ปี
                              </button>
                            </div>
                          </div>

                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        อายุคำนวณอัตโนมัติ ณ วันงาน:
                      </label>
                      <div className="px-3 py-2.5 rounded-xl text-xs bg-slate-950 border border-white/10 text-amber-400 font-bold flex items-center justify-between shadow-inner">
                        <span>{calculatedAge !== null ? `${calculatedAge} ปี` : "รอเลือกวันเกิดในปฏิทิน"}</span>
                        {calculatedAge !== null && (
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                            calculatedAge <= (eventConfig.pricing?.freeMaxAge ?? 6)
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : calculatedAge <= (eventConfig.pricing?.childMaxAge ?? 12)
                              ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}>
                            {calculatedAge <= (eventConfig.pricing?.freeMaxAge ?? 6) 
                              ? '(เข้างานฟรี)' 
                              : calculatedAge <= (eventConfig.pricing?.childMaxAge ?? 12) 
                              ? `(${eventConfig.pricing?.childPrice ?? 250} บาท)` 
                              : `(${eventConfig.pricing?.adultPrice ?? 500} บาท)`}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Guest Info Dependent Section (Phone & Recommender) */}
                  {!(name.trim() && birthDate) ? (
                    <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border-2 border-dashed border-amber-500/30 text-center space-y-1.5 my-2 animate-in fade-in">
                      <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-500/20 text-amber-300 mb-1">
                        <UserCheck className="w-4 h-4 text-amber-400" />
                      </div>
                      <p className="text-xs sm:text-sm font-bold text-amber-300">
                        👆 กรุณากรอก "ชื่อ - นามสกุลจริง" และเลือก "วันเดือนปีเกิด" ด้านบนให้เรียบร้อย
                      </p>
                      <p className="text-[11px] text-slate-400">
                        เมื่อกรอกชื่อและวันเกิดแล้ว ช่องกรอกเบอร์โทรศัพท์มือถือและเลือกสมาชิกผู้แนะนำจะแสดงขึ้นมาโดยอัตโนมัติครับ
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4 pt-1 animate-in fade-in duration-300">
                      {/* PROMINENT PHONE & EMAIL SECTION (GUEST) */}
                      <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-amber-500/5 border-2 border-amber-500/40 shadow-lg space-y-3">
                        {/* 1. Phone Row */}
                        <div className="space-y-1.5">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                            <label className="text-xs sm:text-sm font-bold text-amber-300 flex items-center space-x-1.5">
                              <Phone className="w-4 h-4 text-amber-400 shrink-0" />
                              <span>เบอร์โทรศัพท์มือถือ * (ตรวจสอบให้ถูกต้อง)</span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold shrink-0">
                                สำคัญมาก
                              </span>
                            </label>
                            <span className="text-[11px] text-amber-200/90 font-medium">
                              ⭐ ใช้ยืนยันตัวตนร่วมกิจกรรม & เป็นกรรมการตัดสิน
                            </span>
                          </div>
                          <input
                            type="text"
                            value={phone}
                            onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
                            placeholder="08x-xxx-xxxx"
                            className="w-full px-3.5 py-2.5 rounded-xl text-sm sm:text-base bg-slate-950 border-2 border-amber-400/60 text-amber-300 font-mono font-bold tracking-wider placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 shadow-inner"
                          />
                          {errors.phone && <span className="text-rose-400 text-[11px] mt-1 block font-semibold">{errors.phone}</span>}
                        </div>

                        {/* 2. Email Row (Separate Line) */}
                        <div className="space-y-1.5 pt-2.5 border-t border-amber-500/20">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                              <Mail className="w-3.5 h-3.5 text-amber-400/90 shrink-0" />
                              <span>อีเมล (Email) สำหรับรับบัตรเข้างาน E-Ticket</span>
                            </label>
                            <span className="text-[10px] text-slate-400">(ไม่บังคับ)</span>
                          </div>
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="อีเมล (สำหรับรับบัตร E-Ticket เช่น name@example.com)"
                            className="w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm bg-slate-950/80 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 shadow-inner"
                          />
                        </div>

                        {/* Important Warning Note */}
                        <div className="text-[11px] text-amber-200/80 bg-amber-950/40 p-2.5 rounded-xl border border-amber-500/20 leading-relaxed">
                          ⚠️ <strong>หมายเหตุสำคัญ:</strong> กรุณาตรวจสอบเบอร์โทรศัพท์มือถือให้ถูกต้องและจำเบอร์นี้ไว้ เนื่องจากระบบจะใช้เบอร์โทรศัพท์นี้ในการยืนยันตัวตนเข้าร่วมกิจกรรมในงาน และสแกน QR Code เพื่อให้คะแนนการประกวดแต่งกาย (1 เบอร์ / 1 สิทธิ์การตัดสิน)
                        </div>
                      </div>

                      {/* Club & Recommender */}
                      <div className="pt-2 border-t border-white/10 space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-semibold text-slate-300">
                            {isInlineEditing ? (
                              <div className="flex items-center space-x-2">
                                <span className="text-[10px] text-amber-400 font-mono">✏️ แก้ไขหัวข้อ:</span>
                                <input
                                  type="text"
                                  value={eventConfig.guestRecommenderLabel || "สังกัดสนามและสมาชิกที่เป็นผู้แนะนำ:"}
                                  onChange={(e) => handleUpdateConfig('guestRecommenderLabel', e.target.value)}
                                  className="bg-slate-950 border border-dashed border-amber-400 rounded-lg px-2 py-0.5 text-xs text-white focus:outline-none"
                                />
                              </div>
                            ) : (
                              <span>{eventConfig.guestRecommenderLabel || "สังกัดสนามและสมาชิกที่เป็นผู้แนะนำ:"} <span className="text-rose-400">*</span></span>
                            )}
                          </label>
                          <span className="text-[11px] text-slate-400 hidden sm:inline">
                            🔍 พิมพ์ค้นหาชื่อ หรือเลือกจากสนาม
                          </span>
                        </div>

                        {/* Club Selector Pills */}
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedClub('all')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                              selectedClub === 'all'
                                ? 'bg-emerald-500 text-slate-950 shadow-md scale-105'
                                : 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10'
                            }`}
                          >
                            ทุกสนาม ({eventConfig.members?.length || 0})
                          </button>
                          {eventConfig.clubs.map((c) => {
                            const countInClub = (eventConfig.members || []).filter(m => m.club === c).length;
                            return (
                              <button
                                key={c}
                                type="button"
                                onClick={() => {
                                  setSelectedClub(c);
                                }}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                  selectedClub === c
                                    ? 'bg-emerald-500 text-slate-950 shadow-md scale-105'
                                    : 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10'
                                }`}
                              >
                                สนาม {c} {countInClub > 0 && <span className="text-[10px] opacity-80">({countInClub})</span>}
                              </button>
                            );
                          })}
                        </div>

                        {/* Searchable Recommender Input with Autocomplete */}
                        <div ref={recommenderContainerRef} className="relative">
                          {/* Search Bar Input */}
                          <div className="relative">
                            <Search className="w-4 h-4 text-emerald-400 absolute left-3.5 top-3.5" />
                            <input
                              type="text"
                              value={recommenderSearch}
                              onFocus={() => setIsRecommenderOpen(true)}
                              onChange={(e) => {
                                setRecommenderSearch(e.target.value);
                                setIsRecommenderOpen(true);
                                if (recommender && e.target.value !== recommender) {
                                  setRecommender("");
                                }
                              }}
                              placeholder={
                                selectedClub && selectedClub !== 'all'
                                  ? `พิมพ์ค้นหาชื่อ หรือชื่อเล่นสมาชิกในสนาม ${selectedClub} (เช่น 'ทีป์', 'ทิพย์', 'สมชาย')...`
                                  : `พิมพ์ค้นหาชื่อสมาชิกผู้แนะนำ หรือชื่อเล่น...`
                              }
                              className="w-full pl-10 pr-20 py-3 rounded-2xl text-xs bg-slate-950 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all shadow-inner"
                            />
                            <div className="absolute right-2.5 top-2.5 flex items-center space-x-1">
                              {recommenderSearch && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRecommenderSearch("");
                                    setRecommender("");
                                    setIsRecommenderOpen(true);
                                  }}
                                  className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                                  title="ล้างข้อความค้นหา"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setIsRecommenderOpen(!isRecommenderOpen)}
                                className="p-1 text-slate-400 hover:text-emerald-400 rounded-lg hover:bg-white/10 transition-colors"
                                title="เปิด/ปิด รายชื่อสมาชิก"
                              >
                                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isRecommenderOpen ? 'rotate-180 text-emerald-400' : ''}`} />
                              </button>
                            </div>
                          </div>

                          {/* Autocomplete Dropdown List */}
                          {isRecommenderOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1.5 bg-slate-900 border border-white/15 rounded-2xl shadow-2xl z-40 max-h-60 overflow-y-auto divide-y divide-white/5 animate-in fade-in duration-150">
                              {/* Helper Header */}
                              <div className="p-2.5 bg-slate-950/90 text-[11px] text-slate-400 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
                                <span>
                                  {selectedClub && selectedClub !== 'all' ? `สมาชิกในสนาม ${selectedClub}` : 'สมาชิกทุกสนาม'} ({filteredRecommenderMembers.length} ท่าน)
                                </span>
                                <span className="text-[10px] text-emerald-400 font-semibold">คลิกเพื่อเลือกทันที</span>
                              </div>

                              {/* Member Suggestions */}
                              {filteredRecommenderMembers.length > 0 ? (
                                filteredRecommenderMembers.map((m) => {
                                  const isCurrent = recommender === m.name;
                                  return (
                                    <button
                                      key={m.id}
                                      type="button"
                                      onClick={() => handleSelectRecommender(m)}
                                      className={`w-full p-3 text-left transition-all flex items-center justify-between text-xs group ${
                                        isCurrent ? 'bg-emerald-500/20' : 'hover:bg-emerald-500/15'
                                      }`}
                                    >
                                      <div className="flex items-center space-x-2.5">
                                        <div className="w-7 h-7 rounded-xl bg-white/5 group-hover:bg-emerald-500/20 text-slate-300 group-hover:text-emerald-300 flex items-center justify-center shrink-0">
                                          <UserCheck className="w-3.5 h-3.5" />
                                        </div>
                                        <div>
                                          <div className="flex items-center space-x-1.5 flex-wrap">
                                            {m.memberCode && (
                                              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold border border-emerald-500/30">
                                                {m.memberCode}
                                              </span>
                                            )}
                                            <span className="font-bold text-white group-hover:text-emerald-300 transition-colors">
                                              {m.name}
                                            </span>
                                          </div>
                                          {m.nickname && (
                                            <span className="text-emerald-400 font-semibold text-[11px]">
                                              ({m.nickname})
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex items-center space-x-2 shrink-0">
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-slate-300 border border-white/10">
                                          สนาม {m.club}
                                        </span>
                                        {isCurrent && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
                                      </div>
                                    </button>
                                  );
                                })
                              ) : (
                                <div className="p-4 text-center text-xs text-slate-400 space-y-1">
                                  <div>ไม่พบชื่อสมาชิกที่ตรงกับ "<strong>{recommenderSearch}</strong>"</div>
                                  <div className="text-[11px] text-slate-500">ท่านสามารถใช้ชื่อนี้เป็นผู้แนะนำได้โดยตรงด้านล่าง</div>
                                </div>
                              )}

                              {/* Allow Custom Free-text Recommender */}
                              {recommenderSearch.trim() && (
                                <button
                                  type="button"
                                  onClick={() => handleCustomRecommender(recommenderSearch.trim())}
                                  className="w-full p-3 text-left bg-emerald-950/70 hover:bg-emerald-900/70 text-emerald-300 text-xs flex items-center space-x-2 font-medium border-t border-emerald-500/20 transition-colors"
                                >
                                  <Plus className="w-4 h-4 text-emerald-400 shrink-0" />
                                  <div className="truncate">
                                    <span>ระบุชื่อนี้เป็นผู้แนะนำ: </span>
                                    <strong className="text-white underline underline-offset-2">"{recommenderSearch.trim()}"</strong>
                                  </div>
                                </button>
                              )}
                            </div>
                          )}

                          {/* Confirmed Selection Badge */}
                          {recommender && (
                            <div className="mt-2.5 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/40 text-xs flex items-center justify-between">
                              <div className="flex items-center space-x-2.5">
                                <div className="w-7 h-7 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-bold">
                                  <Check className="w-4 h-4" />
                                </div>
                                <div>
                                  <div className="text-[10px] text-emerald-400 font-semibold">สมาชิกผู้แนะนำที่เลือก:</div>
                                  <div className="font-bold text-white text-xs sm:text-sm">
                                    {recommender}
                                    {selectedClub && selectedClub !== 'all' && (
                                      <span className="ml-2 text-[10px] font-normal text-emerald-300 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30">
                                        สนาม {selectedClub}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setRecommender("");
                                  setRecommenderSearch("");
                                  setIsRecommenderOpen(true);
                                }}
                                className="text-[11px] text-slate-300 hover:text-white px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/15 transition-all flex items-center space-x-1"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>เปลี่ยน</span>
                              </button>
                            </div>
                          )}

                          {errors.recommender && (
                            <span className="text-rose-400 text-[11px] mt-1.5 block font-medium">
                              {errors.recommender}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              )}

              {/* Navigation */}
              <div className="mt-8 pt-4 border-t border-white/10 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex items-center space-x-1 text-xs text-slate-400 hover:text-white"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>ย้อนกลับ</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (validateStep2()) {
                      setStep(3);
                    }
                  }}
                  style={primaryButtonStyle}
                  className="flex items-center space-x-2 px-6 py-3 rounded-2xl text-xs font-bold shadow-lg transition-all hover:scale-105 hover:opacity-95"
                >
                  <span>ขั้นตอนถัดไป: ชำระเงิน</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              </div>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* STEP 3: PAYMENT & SLIP UPLOAD                         */}
        {/* ==================================================== */}
        {step === 3 && (
          <div className="space-y-6">
            <div className={mainCardClass}>
              {/* 50% Sub-Banner for Step 3 */}
              {renderSubBanner(3)}

              <div className="p-4 sm:p-8">
                <div className="mb-6">
                <span className="text-xs font-mono px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 font-bold">
                  ขั้นตอนที่ 3: สรุปยอดและชำระเงิน
                </span>
                <h2 className="text-xl sm:text-2xl font-extrabold text-white mt-2">
                  สรุปการลงทะเบียน & แนบสลิปโอนเงิน
                </h2>
              </div>

              {/* If Inline Editing: Editable Pricing Rules */}
              {isInlineEditing && (
                <div className="p-5 rounded-2xl bg-amber-500/10 border-2 border-dashed border-amber-500/50 space-y-4 mb-6">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center space-x-1.5">
                      <DollarSign className="w-4 h-4" />
                      <span>✏️ กำหนดอัตราค่าลงทะเบียน (Pricing Rules)</span>
                    </span>
                    <span className="text-[11px] text-amber-400 font-mono bg-amber-500/20 px-2 py-0.5 rounded-full">
                      ✓ บันทึกอัตโนมัติ
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-300 text-[11px] mb-1">ราคาผู้ใหญ่ / สมาชิก (บาท)</label>
                      <input
                        type="number"
                        min="0"
                        value={eventConfig.pricing?.adultPrice ?? 500}
                        onChange={(e) => handleUpdateNested('pricing', 'adultPrice', Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/20 text-white font-bold text-sm focus:outline-none focus:border-amber-400"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 text-[11px] mb-1">ราคาเด็ก (บาท)</label>
                      <input
                        type="number"
                        min="0"
                        value={eventConfig.pricing?.childPrice ?? 250}
                        onChange={(e) => handleUpdateNested('pricing', 'childPrice', Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/20 text-white font-bold text-sm focus:outline-none focus:border-amber-400"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 text-[11px] mb-1">เด็กเข้าฟรี (อายุไม่เกิน กี่ปี)</label>
                      <input
                        type="number"
                        min="0"
                        value={eventConfig.pricing?.freeMaxAge ?? 6}
                        onChange={(e) => handleUpdateNested('pricing', 'freeMaxAge', Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/20 text-white font-bold text-sm focus:outline-none focus:border-amber-400"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 text-[11px] mb-1">คิดราคาเด็ก (อายุไม่เกิน กี่ปี)</label>
                      <input
                        type="number"
                        min="0"
                        value={eventConfig.pricing?.childMaxAge ?? 12}
                        onChange={(e) => handleUpdateNested('pricing', 'childMaxAge', Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/20 text-white font-bold text-sm focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Pricing Summary Card */}
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-white/10 space-y-2 mb-6">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span>ผู้ลงทะเบียน:</span>
                  <span className="font-bold text-white">{name} ({regType === 'member' ? 'สมาชิก' : 'แขก'})</span>
                </div>
                {calculatedAge !== null && (
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>อายุ:</span>
                    <span>{calculatedAge} ปี</span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-2 border-t border-white/10 text-sm">
                  <span className="font-bold text-slate-200">ยอดเงินที่ต้องชำระ:</span>
                  <span className="text-xl font-extrabold text-amber-400">
                    {calculatedFee === 0 ? 'เข้างานฟรี (0 บาท)' : `${calculatedFee.toLocaleString()} บาท`}
                  </span>
                </div>
              </div>

              {/* Bank Account Details */}
              {isInlineEditing ? (
                <div className="p-5 rounded-2xl bg-amber-500/10 border-2 border-dashed border-amber-500/50 space-y-4 mb-6">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center space-x-1.5">
                      <CreditCard className="w-4 h-4" />
                      <span>✏️ แก้ไขข้อมูลบัญชีธนาคารสำหรับโอนเงิน</span>
                    </span>
                    <span className="text-[11px] text-amber-400 font-mono bg-amber-500/20 px-2 py-0.5 rounded-full">
                      ✓ บันทึกอัตโนมัติ
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-300 text-[11px] mb-1">ชื่อธนาคาร</label>
                      <input
                        type="text"
                        value={eventConfig.bankInfo?.bankName || ''}
                        onChange={(e) => handleUpdateNested('bankInfo', 'bankName', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/20 text-white focus:outline-none focus:border-amber-400"
                        placeholder="เช่น ธนาคารกสิกรไทย (KBANK)"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 text-[11px] mb-1">เลขที่บัญชี</label>
                      <input
                        type="text"
                        value={eventConfig.bankInfo?.accountNumber || ''}
                        onChange={(e) => handleUpdateNested('bankInfo', 'accountNumber', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/20 text-white font-mono focus:outline-none focus:border-amber-400"
                        placeholder="045-8-99921-4"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 text-[11px] mb-1">ชื่อบัญชี</label>
                      <input
                        type="text"
                        value={eventConfig.bankInfo?.accountName || ''}
                        onChange={(e) => handleUpdateNested('bankInfo', 'accountName', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/20 text-white focus:outline-none focus:border-amber-400"
                        placeholder="ชื่อบัญชี"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 text-[11px] mb-1">เบอร์พร้อมเพย์ (ถ้ามี)</label>
                      <input
                        type="text"
                        value={eventConfig.bankInfo?.promptPayNumber || ''}
                        onChange={(e) => handleUpdateNested('bankInfo', 'promptPayNumber', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/20 text-white font-mono focus:outline-none focus:border-amber-400"
                        placeholder="081-234-5678"
                      />
                    </div>
                  </div>
                </div>
              ) : calculatedFee > 0 ? (
                <div className="p-5 rounded-2xl bg-slate-950 border border-amber-500/30 space-y-4 mb-6">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center space-x-1.5">
                      <CreditCard className="w-4 h-4" />
                      <span>ข้อมูลบัญชีธนาคารสำหรับโอนเงิน</span>
                    </span>
                    <span className="text-[11px] text-slate-400">{eventConfig.bankInfo.bankName}</span>
                  </div>

                  <div className="flex items-center justify-between bg-slate-900 p-3 rounded-xl border border-white/10">
                    <div>
                      <div className="text-[10px] text-slate-400">เลขที่บัญชี</div>
                      <div className="font-mono text-base font-bold text-white tracking-wider">
                        {eventConfig.bankInfo.accountNumber}
                      </div>
                      <div className="text-[11px] text-slate-300 mt-0.5">
                        ชื่อบัญชี: {eventConfig.bankInfo.accountName}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyAccount}
                      className="flex items-center space-x-1 px-3 py-2 rounded-xl text-xs font-semibold bg-amber-500 text-slate-950 shadow-md hover:bg-amber-400 transition-all shrink-0"
                    >
                      {copiedAccount ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      <span>{copiedAccount ? 'คัดลอกแล้ว' : 'คัดลอกเลขบัญชี'}</span>
                    </button>
                  </div>
                </div>
              ) : null}

              {/* Slip Upload & Verification Preview */}
              {calculatedFee > 0 && (
                <div className="space-y-3 mb-6">
                  <label className="block text-xs font-semibold text-slate-300">
                    แนบรูปภาพสลิปการโอนเงิน (Slip Verification): <span className="text-rose-400">*</span>
                  </label>

                  <div className="p-4 rounded-2xl bg-slate-950 border border-dashed border-white/20 text-center space-y-3">
                    {isUploadingSlip ? (
                      <div className="py-8 space-y-2">
                        <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
                        <span className="text-xs text-amber-300 font-medium block">กำลังอัปโหลดรูปภาพสลิปขึ้น Cloudinary...</span>
                      </div>
                    ) : slipPreview ? (
                      <div className="space-y-3">
                        <div className="max-h-48 rounded-xl overflow-hidden inline-block border border-white/15">
                          <img src={slipPreview} alt="Slip Preview" className="h-44 object-contain mx-auto" />
                        </div>
                        {/* Live Slip Verification Summary Card */}
                        {isAnalyzingSlip ? (
                          <div className="bg-slate-900/95 border border-amber-500/40 rounded-2xl p-4 text-center space-y-2.5 shadow-xl animate-pulse">
                            <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
                            <div className="space-y-1">
                              <h5 className="text-xs font-bold text-white">กำลังอ่านและตรวจสอบยอดเงินจากสลิปจริงด้วย AI OCR...</h5>
                              <p className="text-[11px] text-amber-300 font-medium">
                                {slipStatusMessage || "กำลังวิเคราะห์ตัวเลข วันที่ และรหัสธุรกรรมจากภาพ..."}
                              </p>
                              <span className="text-[10px] text-slate-400 block">ระบบกำลังถอดรหัสตัวเลขจริง เพื่อตรวจสอบว่ายอดเงินถูกต้องหรือไม่</span>
                            </div>
                          </div>
                        ) : slipDetails && (
                          <div className="bg-slate-900/90 border border-emerald-500/40 rounded-2xl p-4 text-left space-y-3 shadow-xl">
                            <div className="flex items-center justify-between pb-2 border-b border-white/10">
                              <div className="flex items-center space-x-2">
                                <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                                  <FileCheck2 className="w-3.5 h-3.5" />
                                </div>
                                <div>
                                  <h5 className="text-xs font-bold text-white">สรุปข้อมูลการโอนเงินจากสลิป (บันทึกเพื่อการเงินตรวจสอบ)</h5>
                                  <span className="text-[10px] text-slate-400">ระบบถอดรหัสและบันทึกข้อมูลสลิปลงระบบอัตโนมัติ</span>
                                </div>
                              </div>
                              {slipDetails.isUnderpaid ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center space-x-1">
                                  <AlertTriangle className="w-3 h-3 text-rose-400" />
                                  <span>ยอดเงินไม่ครบ (ขาดอีก {slipDetails.shortage?.toLocaleString()} บ.)</span>
                                </span>
                              ) : slipDetails.isOverpaid ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center space-x-1">
                                  <ShieldCheck className="w-3 h-3 text-amber-400" />
                                  <span>ยอดถูกต้อง + สมทบ (+{slipDetails.contribution?.toLocaleString()} บ.)</span>
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center space-x-1">
                                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                                  <span>อ่านข้อมูลสำเร็จ</span>
                                </span>
                              )}
                            </div>

                            {/* Details 2-col Grid on both Mobile and Desktop */}
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="bg-slate-950/70 p-2.5 rounded-xl border border-white/5 space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-400 block text-[10px]">🗓️ วันที่และเวลาโอน:</span>
                                  {slipDetails.isDateDetected && (
                                    <span className="text-[9px] text-emerald-400 font-bold bg-emerald-500/15 px-1.5 py-0.5 rounded border border-emerald-500/30">
                                      ✓ จากสลิปจริง
                                    </span>
                                  )}
                                </div>
                                <div className="space-y-1 font-semibold text-white">
                                  <input
                                    type="text"
                                    value={slipDetails.transferDate || ""}
                                    onChange={(e) => setSlipDetails(prev => ({ ...prev, transferDate: e.target.value }))}
                                    placeholder="เช่น 2 พ.ย. 2569"
                                    className="w-full bg-slate-900/80 px-2 py-1 rounded text-white text-[11px] sm:text-xs border border-white/10 focus:outline-none focus:border-amber-400 font-mono"
                                  />
                                  <div className="flex items-center space-x-1">
                                    <span className="text-slate-400 text-[10px] shrink-0">เวลา:</span>
                                    <input
                                      type="text"
                                      value={slipDetails.transferTime || ""}
                                      onChange={(e) => setSlipDetails(prev => ({ ...prev, transferTime: e.target.value }))}
                                      placeholder="09:43 น."
                                      className="w-full bg-slate-900/80 px-2 py-1 rounded text-white text-[11px] sm:text-xs border border-white/10 focus:outline-none focus:border-amber-400 font-mono"
                                    />
                                  </div>
                                </div>
                              </div>

                              <div className="bg-slate-950/70 p-2.5 rounded-xl border border-white/5 space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-400 block text-[10px]">👤 ผู้โอนเงิน (ในสลิป):</span>
                                  {slipDetails.senderName && (
                                    <span className="text-[9px] text-emerald-400 font-bold bg-emerald-500/15 px-1.5 py-0.5 rounded border border-emerald-500/30">
                                      ✓ จากสลิปจริง
                                    </span>
                                  )}
                                </div>
                                <input
                                  type="text"
                                  value={slipDetails.senderName || ""}
                                  onChange={(e) => setSlipDetails(prev => ({ ...prev, senderName: e.target.value }))}
                                  placeholder="ชื่อผู้โอน"
                                  className="w-full bg-slate-900/80 px-2 py-1 rounded text-amber-300 font-semibold text-[11px] sm:text-xs border border-white/10 focus:outline-none focus:border-amber-400 mt-0.5"
                                />
                                <div className="text-[10px] text-slate-400 truncate">
                                  ธนาคารต้นทาง: {slipDetails.bankName || "ธนาคารพาณิชย์"}
                                </div>
                              </div>

                              {/* Receiving Bank Audit Card (Full Width) */}
                              <div className="p-2.5 sm:p-3 rounded-xl border col-span-2 space-y-1 bg-slate-950/70 border-white/5">
                                <div className="flex flex-wrap items-center justify-between gap-1">
                                  <span className="text-slate-400 text-[10px] font-semibold flex items-center space-x-1">
                                    <span>🏦 ตรวจสอบบัญชีผู้รับโอน (บันทึกลงระบบ):</span>
                                  </span>
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center space-x-1">
                                    <Check className="w-3 h-3 text-emerald-400" />
                                    <span>บันทึกเข้าระบบเรียบร้อย</span>
                                  </span>
                                </div>

                                <div className="text-xs font-semibold text-slate-200 mt-0.5 break-words">
                                  {slipDetails.receiverAccount || `${eventConfig.bankInfo?.bankName || 'ธนาคารกสิกรไทย'} เลขที่ ${eventConfig.bankInfo?.accountNumber || '045-8-99921-4'} (${eventConfig.bankInfo?.accountName || 'กองทุนกิจกรรม SME FAN'})`}
                                </div>
                              </div>

                              <div className="bg-slate-950/70 p-3 rounded-xl border border-white/5 sm:col-span-2 space-y-2">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <span className="text-slate-400 text-[10px] font-medium">💵 ยอดเงินที่โอนจริง (ระบุในสลิป):</span>
                                  <div className="flex items-center space-x-1.5">
                                    <input
                                      type="number"
                                      value={slipDetails.amount !== undefined && slipDetails.amount !== null ? slipDetails.amount : ""}
                                      placeholder="ระบุยอดเงินโอน"
                                      onChange={(e) => {
                                        const val = e.target.value === "" ? null : Number(e.target.value);
                                        setSlipDetails(prev => ({
                                          ...prev,
                                          amount: val,
                                          isAmountDetected: val !== null,
                                          isUnderpaid: val !== null && calculatedFee > 0 && val < calculatedFee,
                                          isOverpaid: val !== null && calculatedFee > 0 && val > calculatedFee,
                                          shortage: (val !== null && calculatedFee > 0 && val < calculatedFee) ? (calculatedFee - val) : 0,
                                          contribution: (val !== null && calculatedFee > 0 && val > calculatedFee) ? (val - calculatedFee) : 0
                                        }));
                                        if (val !== null && val < calculatedFee && calculatedFee > 0) {
                                          setUnderpaidModalOpen(true);
                                        }
                                      }}
                                      className="w-32 bg-slate-900/90 px-3 py-1.5 rounded-xl text-white font-mono font-extrabold text-sm border border-amber-500/40 focus:outline-none focus:border-amber-400 text-right shadow-inner"
                                    />
                                    <span className="text-slate-300 text-xs font-semibold">บาท</span>
                                  </div>
                                </div>

                                {/* Quick Amount Shortcuts */}
                                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                  <span className="text-[10px] text-slate-400 mr-0.5">ปุ่มลัดยอดเงิน:</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const val = calculatedFee;
                                      setSlipDetails(prev => ({
                                        ...prev,
                                        amount: val,
                                        isAmountDetected: true,
                                        isUnderpaid: false,
                                        isOverpaid: false,
                                        shortage: 0,
                                        contribution: 0
                                      }));
                                    }}
                                    className="text-[10px] px-2 py-0.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 border border-white/10 transition-all font-mono"
                                  >
                                    {calculatedFee.toLocaleString()} บ. (ค่าบัตร)
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const val = 1000;
                                      setSlipDetails(prev => ({
                                        ...prev,
                                        amount: val,
                                        isAmountDetected: true,
                                        isUnderpaid: val < calculatedFee,
                                        isOverpaid: val > calculatedFee,
                                        shortage: val < calculatedFee ? calculatedFee - val : 0,
                                        contribution: val > calculatedFee ? val - calculatedFee : 0
                                      }));
                                    }}
                                    className="text-[10px] px-2 py-0.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 border border-white/10 transition-all font-mono"
                                  >
                                    1,000 บ.
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const val = 1179;
                                      setSlipDetails(prev => ({
                                        ...prev,
                                        amount: val,
                                        isAmountDetected: true,
                                        isUnderpaid: val < calculatedFee,
                                        isOverpaid: val > calculatedFee,
                                        shortage: val < calculatedFee ? calculatedFee - val : 0,
                                        contribution: val > calculatedFee ? val - calculatedFee : 0
                                      }));
                                    }}
                                    className="text-[10px] px-2 py-0.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition-all font-mono font-bold"
                                  >
                                    1,179 บ.
                                  </button>
                                </div>

                                {!slipDetails.isAmountDetected && (
                                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 space-y-0.5">
                                    <div className="flex items-center space-x-1.5 font-bold text-white text-[11px]">
                                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                      <span>ใส่ยอดตามค่าบัตร ({calculatedFee.toLocaleString()} บาท) ให้อัตโนมัติ</span>
                                    </div>
                                    <p className="text-[10px] text-slate-300">
                                      หากท่านโอนยอดอื่น (เช่น โอนเกินเพื่อร่วมสมทบกิจกรรม) สามารถแตะแก้ไขตัวเลขหรือกดปุ่มลัดด้านบนได้เลยครับ
                                    </p>
                                  </div>
                                )}

                                {/* Financial Reconciliation Breakdown */}
                                {(() => {
                                  const rawAmt = slipDetails.amount;
                                  const transferAmount = Number(rawAmt !== undefined && rawAmt !== null ? rawAmt : 0);
                                  const isOverpaid = rawAmt !== null && transferAmount > calculatedFee;
                                  const isUnderpaid = calculatedFee > 0 && (rawAmt === null || transferAmount < calculatedFee);
                                  const contribution = isOverpaid ? (transferAmount - calculatedFee) : 0;
                                  const shortage = isUnderpaid ? (calculatedFee - transferAmount) : 0;

                                  if (rawAmt === null || transferAmount === 0) {
                                    return (
                                      <div className="mt-2 bg-amber-500/10 border border-amber-500/30 rounded-xl p-2.5 text-xs text-amber-300 flex items-center space-x-2">
                                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                                        <span>กรุณาระบุยอดเงินโอนจริงตามสลิปในช่องด้านบน</span>
                                      </div>
                                    );
                                  }

                                  if (isOverpaid) {
                                    return (
                                      <div className="mt-2 bg-gradient-to-r from-amber-500/10 via-amber-600/10 to-emerald-500/10 border border-amber-500/30 rounded-xl p-3 space-y-1.5 text-xs">
                                        <div className="flex justify-between text-slate-300">
                                          <span>ค่าบัตร / ค่าลงทะเบียน:</span>
                                          <span className="font-mono text-white font-semibold">{calculatedFee.toLocaleString()} บาท</span>
                                        </div>
                                        <div className="flex justify-between text-amber-300 font-bold border-t border-amber-500/20 pt-1.5">
                                          <span className="flex items-center space-x-1">
                                            <span>💖 เงินสมทบเข้าร่วมกิจกรรม:</span>
                                          </span>
                                          <span className="font-mono text-amber-300">+{contribution.toLocaleString()} บาท</span>
                                        </div>
                                        <div className="flex justify-between text-emerald-400 font-extrabold text-sm border-t border-emerald-500/30 pt-1.5">
                                          <span>รวมยอดโอนทั้งสิ้น:</span>
                                          <span className="font-mono text-base">{transferAmount.toLocaleString()} บาท</span>
                                        </div>
                                        <div className="pt-1">
                                          <span className="px-2.5 py-1 rounded-lg text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium inline-block">
                                            🎉 ขอบพระคุณที่ร่วมสนับสนุนเงินสมทบในกิจกรรมปีใหม่ (+{contribution.toLocaleString()} บาท)
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  }

                                  if (isUnderpaid) {
                                    return (
                                      <div className="mt-2 bg-rose-500/15 border border-rose-500/40 rounded-xl p-3 space-y-1.5 text-xs">
                                        <div className="flex justify-between text-slate-300">
                                          <span>ค่าลงทะเบียนที่กำหนด:</span>
                                          <span className="font-mono text-white font-semibold">{calculatedFee.toLocaleString()} บาท</span>
                                        </div>
                                        <div className="flex justify-between text-rose-400 font-bold">
                                          <span>ยอดเงินที่โอนในสลิป:</span>
                                          <span className="font-mono">{transferAmount.toLocaleString()} บาท</span>
                                        </div>
                                        <div className="flex justify-between text-rose-300 font-bold border-t border-rose-500/30 pt-1.5">
                                          <span>ยอดเงินที่ยังขาดอยู่:</span>
                                          <span className="font-mono font-extrabold text-rose-400 text-sm">
                                            ขาดอีก {shortage.toLocaleString()} บาท
                                          </span>
                                        </div>
                                        <div className="pt-1 flex items-center justify-between">
                                          <span className="text-[10px] text-rose-400 font-medium flex items-center space-x-1">
                                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                            <span>ยอดเงินน้อยกว่าราคาที่กำหนดไว้</span>
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => setUnderpaidModalOpen(true)}
                                            className="text-[10px] px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold transition-all shadow-sm"
                                          >
                                            ดูรายละเอียดข้อความเตือน
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  }

                                  return (
                                    <div className="flex items-center space-x-2 mt-1">
                                      <span className="font-bold text-emerald-400 text-sm font-mono">
                                        {transferAmount.toLocaleString()} บาท
                                      </span>
                                      <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-500/20 text-emerald-300 font-medium">
                                        ✓ ยอดถูกต้องตรงตามค่าลงทะเบียน
                                      </span>
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>

                            {/* Ref ID */}
                            <div className="flex items-center justify-between text-[11px] bg-slate-950/80 px-3 py-1.5 rounded-xl border border-white/5">
                              <span className="text-slate-400">รหัสอ้างอิงรายการ (Transaction Ref):</span>
                              <span className="font-mono text-amber-400 font-semibold">{slipDetails.refNo}</span>
                            </div>
                          </div>
                        )}
                        <label className="inline-block text-xs text-amber-400 hover:text-amber-300 font-medium cursor-pointer">
                          เปลี่ยนรูปสลิป
                          <input type="file" accept="image/*" onChange={handleSlipChange} className="hidden" />
                        </label>
                      </div>
                    ) : (
                      <div>
                        <div className="w-12 h-12 rounded-full bg-white/5 mx-auto flex items-center justify-center text-slate-400 mb-2">
                          <Upload className="w-6 h-6 text-amber-400" />
                        </div>
                        <p className="text-xs text-slate-300">คลิกเพื่ออัปโหลดรูปภาพสลิปการโอนเงิน</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">ระบบจะจัดเก็บขึ้น Cloudinary แยกโฟลเดอร์ slips อัตโนมัติ</p>
                        <label className="mt-3 inline-block px-4 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-white cursor-pointer transition-all">
                          เลือกรูปภาพสลิป
                          <input type="file" accept="image/*" onChange={handleSlipChange} className="hidden" />
                        </label>
                      </div>
                    )}
                  </div>
                  {errors.slip && <span className="text-rose-400 text-[11px] mt-1 block">{errors.slip}</span>}
                </div>
              )}

              {/* T-Shirt Step inline if eligible or in admin edit mode */}
              {(isEligibleForShirt || isInlineEditing) && (
                <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-amber-500/20 border border-amber-500/40 space-y-4 mb-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className="p-2 rounded-xl bg-amber-500 text-slate-950 font-bold">
                        <Shirt className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">
                          🎉 สิทธิพิเศษ: คุณได้รับสิทธิ์รับเสื้อที่ระลึกฟรี 1 ตัว!
                        </h4>
                        <p className="text-xs text-amber-300/80">
                          สำหรับผู้ชำระเงิน {eventConfig.pricing?.adultPrice ?? 500} บาท ภายใน {maxShirtQuota} ท่านแรก
                        </p>
                      </div>
                    </div>

                    {isInlineEditing && (
                      <div className="flex items-center space-x-2">
                        <label className="text-[11px] text-amber-300 whitespace-nowrap">โควตาเสื้อ (ตัว):</label>
                        <input
                          type="number"
                          min="0"
                          value={eventConfig.shirtQuota?.maxQuota || 15}
                          onChange={(e) => handleUpdateNested('shirtQuota', 'maxQuota', parseInt(e.target.value) || 0)}
                          className="w-16 px-2 py-1 rounded-lg bg-slate-950 border border-dashed border-amber-400 text-amber-300 font-mono font-bold text-center text-xs focus:outline-none"
                        />
                      </div>
                    )}
                  </div>

                  {/* Shirt Mockup Image Preview */}
                  <div className="relative">
                    {eventConfig.shirtMockupImage && (
                      <div className="h-36 rounded-xl overflow-hidden border border-white/10 relative">
                        <img 
                          src={eventConfig.shirtMockupImage} 
                          alt="T-shirt mockup" 
                          className="w-full h-full object-cover" 
                        />
                        <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-slate-950/80 text-[10px] text-amber-400">
                          ตัวอย่างลายเสื้อปีใหม่ SME FAN
                        </div>
                      </div>
                    )}
                    {isInlineEditing && (
                      <button
                        type="button"
                        onClick={() => {
                          setCropperTarget('shirtMockup');
                          setCropperModalOpen(true);
                        }}
                        className="mt-2 flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-amber-300 border border-dashed border-amber-400/60 transition-all"
                      >
                        <Crop className="w-3.5 h-3.5" />
                        <span>ปรับขนาด / เปลี่ยนภาพลายเสื้อ</span>
                      </button>
                    )}
                  </div>

                  {/* Admin Inline Edit for Sizes */}
                  {isInlineEditing ? (
                    <div className="space-y-2 pt-2 border-t border-white/10">
                      <label className="block text-xs font-semibold text-amber-300">
                        ✏️ จัดการไซซ์เสื้อที่มีให้เลือก (เพิ่ม / ลบไซซ์):
                      </label>
                      <div className="flex flex-wrap items-center gap-2">
                        {(eventConfig.shirtQuota?.sizes || []).map((s) => (
                          <span
                            key={s}
                            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/20 text-amber-200 border border-amber-500/40"
                          >
                            <span>{s}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveSizeInline(s)}
                              title={`ลบไซซ์ ${s}`}
                              className="w-4 h-4 rounded-full hover:bg-rose-500/30 text-rose-300 flex items-center justify-center transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                        <div className="flex items-center space-x-1">
                          <input
                            type="text"
                            value={newSizeInput}
                            onChange={(e) => setNewSizeInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddSizeInline();
                              }
                            }}
                            placeholder="+ เพิ่มไซซ์ เช่น 4XL"
                            className="w-28 px-2.5 py-1.5 rounded-xl text-xs bg-slate-900 border border-dashed border-amber-400 text-white placeholder-slate-500 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={handleAddSizeInline}
                            className="p-1.5 rounded-xl bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 transition-colors"
                            title="เพิ่มไซซ์"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Gender Selector */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                          เลือกเพศทรงเสื้อ:
                        </label>
                        <div className="flex space-x-2">
                          {(eventConfig.shirtQuota?.genders || ["ชาย", "หญิง"]).map(g => (
                            <button
                              key={g}
                              type="button"
                              onClick={() => setShirtGender(g)}
                              style={shirtGender === g ? primaryButtonStyle : {}}
                              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                                shirtGender === g
                                  ? 'shadow-md'
                                  : 'bg-white/5 border border-white/10 text-slate-300'
                              }`}
                            >
                              ทรง{g}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Size Selector */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                          เลือกไซซ์เสื้อ:
                        </label>
                        <div className="grid grid-cols-6 gap-2">
                          {(eventConfig.shirtQuota?.sizes || []).map(s => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => setShirtSize(s)}
                              style={shirtSize === s ? primaryButtonStyle : {}}
                              className={`py-2 rounded-xl text-xs font-bold transition-all ${
                                shirtSize === s
                                  ? 'shadow-md ring-2 ring-white/60'
                                  : 'bg-white/5 border border-white/10 text-slate-300'
                              }`}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Navigation */}
              <div className="mt-8 pt-4 border-t border-white/10 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex items-center space-x-1 text-xs text-slate-400 hover:text-white"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>ย้อนกลับ</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (validateStep3()) {
                      handleSubmitRegistration();
                    }
                  }}
                  style={primaryButtonStyle}
                  className="flex items-center space-x-2 px-7 py-3.5 rounded-2xl text-xs font-bold shadow-xl transition-all hover:scale-105 hover:opacity-95"
                >
                  <Check className="w-4 h-4" />
                  <span>ยืนยันการลงทะเบียน</span>
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

        {/* Admin & Live Edit Control Buttons: Only shown to logged-in Admin/Owner, NEVER shown to public members */}
        {currentUser && (
          <div className="mt-8 pt-4 border-t border-white/5 flex flex-wrap items-center justify-center gap-2.5">
            {/* Toggle Inline Form Editing */}
            <button
              type="button"
              onClick={() => setIsInlineEditing(!isInlineEditing)}
              className={`flex items-center space-x-1.5 px-4 py-2 rounded-full shadow-lg text-xs font-bold transition-all border ${
                isInlineEditing
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-300 ring-4 ring-amber-500/20'
                  : 'bg-slate-900/90 hover:bg-slate-800 text-amber-300 border-amber-500/40 hover:scale-105'
              }`}
              title="สลับโหมดแก้ไขฟอร์มสดเหมือน Google Forms"
            >
              {isInlineEditing ? (
                <>
                  <Eye className="w-3.5 h-3.5" />
                  <span>ดูตัวอย่างฟอร์มจริง</span>
                </>
              ) : (
                <>
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>✏️ แก้ไขฟอร์มนี้ (เหมือน Google Forms)</span>
                </>
              )}
            </button>

            {/* Admin Dashboard Button */}
            {onAdminClick && (
              <button
                type="button"
                onClick={onAdminClick}
                title={`เข้าสู่แดชบอร์ดในนาม: ${currentUser.name}`}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-full bg-slate-900/90 hover:bg-slate-800 border border-white/10 hover:border-amber-500/40 text-slate-300 hover:text-white shadow-lg text-xs font-semibold transition-all hover:scale-105"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>แดชบอร์ด Owner</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
                  {currentUser.role === 'owner' ? 'Owner' : currentUser.role === 'manager' ? 'Manager' : 'Staff'}
                </span>
              </button>
            )}

            {/* Logout Admin Button (Quick Return to Clean Public View) */}
            {onLogout && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("คุณต้องการออกจากระบบแอดมิน เพื่อกลับเป็นหน้าลงทะเบียนสำหรับสมาชิกทั่วไปใช่หรือไม่?")) {
                    setIsInlineEditing(false);
                    onLogout();
                  }
                }}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-full bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 hover:text-rose-100 shadow-lg text-xs font-semibold transition-all hover:scale-105"
                title="ออกจากระบบแอดมิน เพื่อดูหน้าฟอร์มเหมือนสมาชิกทั่วไป"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>ออกจากระบบแอดมิน</span>
              </button>
            )}
          </div>
        )}

        {/* Form Footer */}
        <footer className="mt-8 text-center text-xs text-slate-400 space-y-2.5 pb-10">
          <p className="font-medium text-slate-300">
            © 2026 {eventConfig.eventTitle || "งานสังสรรค์ปีใหม่ SME FAN 2026"}
          </p>

          <div className="text-[11px] text-slate-400 space-y-0.5 leading-relaxed">
            <p className="font-semibold text-amber-400">
              นักพัฒนาซอฟต์แวร์ คุณทีป์ชลิต ทองจันทร์ (ผอ.โต๊ด)
            </p>
            <p className="text-slate-400">
              หัวหน้าทีม Web Master | ทีมพัฒนาระบบ
            </p>
          </div>

          {onAdminClick && (
            <div className="pt-1">
              <button
                type="button"
                onClick={onAdminClick}
                className="text-[11px] text-slate-500 hover:text-slate-300 inline-flex items-center space-x-1.5 transition-colors underline underline-offset-4"
              >
                <Lock className="w-3 h-3" />
                <span>{currentUser ? `จัดการระบบในนาม: ${currentUser.name}` : 'เข้าสู่ระบบผู้ดูแล (Admin Portal)'}</span>
              </button>
            </div>
          )}

          {/* Mini Background Music Control (50% smaller, non-floating, centered at the very bottom) */}
          <MusicFooterToggle />
        </footer>

      </div>

      {/* ==================================================== */}
      {/* DUPLICATE REGISTRATION POPUP MODAL                   */}
      {/* ==================================================== */}
      {duplicateModalOpen && existingAttendee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-slate-900 border border-white/15 rounded-3xl p-6 text-slate-100 shadow-2xl space-y-4">
            <button
              type="button"
              onClick={() => setDuplicateModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
              title="ปิดหน้าต่าง"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8" />
            </div>

            <div className="text-center">
              <h3 className="text-lg font-bold text-white">
                ท่านได้ลงทะเบียนเข้าร่วมงานแล้ว!
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                พบข้อมูลชื่อ <strong className="text-white">{existingAttendee.name}</strong> ในระบบเรียบร้อยแล้ว
              </p>
            </div>

            {/* Existing Info Summary */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-white/10 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">เลขที่บัตร:</span>
                <span className="font-mono font-bold text-amber-400">{existingAttendee.ticketNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">เบอร์โทรศัพท์:</span>
                <span className="text-white">{existingAttendee.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">สิทธิ์รับเสื้อ:</span>
                <span className="text-white font-medium">
                  {existingAttendee.hasShirt ? `ได้รับเสื้อ (ไซซ์ ${existingAttendee.shirtSize})` : 'ไม่ได้รับเสื้อ'}
                </span>
              </div>
            </div>

            {/* Action Buttons (แนวตั้ง ขนาดเท่ากัน) */}
            <div className="flex flex-col gap-3 pt-2 w-full">
              {/* 1. แก้ไขข้อมูล: ปุ่มสีดำ ตัวหนังสือสีขาว */}
              <button
                type="button"
                onClick={() => {
                  setIsEditMode(true);
                  setDuplicateModalOpen(false);
                  // Populate data for editing
                  if (existingAttendee.prefix) {
                    const allKnownPrefixes = PREFIX_GROUPS.flatMap(g => g.options);
                    if (allKnownPrefixes.includes(existingAttendee.prefix)) {
                      setTitlePrefix(existingAttendee.prefix);
                      setCustomPrefix("");
                    } else {
                      setTitlePrefix("other");
                      setCustomPrefix(existingAttendee.prefix);
                    }
                    let cleanName = existingAttendee.name || "";
                    if (cleanName.startsWith(existingAttendee.prefix)) {
                      cleanName = cleanName.slice(existingAttendee.prefix.length).trim();
                    }
                    setName(cleanName);
                  } else {
                    setTitlePrefix("");
                    setCustomPrefix("");
                    setName(existingAttendee.name || "");
                  }
                  setNickname(existingAttendee.nickname || "");
                  setPhone(formatPhoneNumber(existingAttendee.phone || ""));
                  setEmail(existingAttendee.email || "");
                  if (existingAttendee.birthDate) {
                    setBirthDate(existingAttendee.birthDate);
                    setCalculatedAge(existingAttendee.age || null);
                  }
                  if (existingAttendee.recommender) {
                    setRecommender(existingAttendee.recommender);
                    setRecommenderSearch(existingAttendee.recommender);
                  }
                  if (existingAttendee.hasShirt) {
                    setShirtGender(existingAttendee.shirtGender || "ชาย");
                    setShirtSize(existingAttendee.shirtSize || "L");
                  }
                  if (existingAttendee.slipUrl) {
                    setSlipPreview(existingAttendee.slipUrl);
                  }
                }}
                className="w-full py-3.5 px-4 rounded-2xl text-sm font-extrabold bg-slate-950 hover:bg-black text-white border border-slate-700/80 shadow-md flex items-center justify-center space-x-2 transition-all active:scale-[0.98]"
              >
                <Edit3 className="w-4 h-4 text-slate-300" />
                <span>แก้ไขข้อมูล</span>
              </button>

              {/* 2. ดาวโหลดบัตรเข้างาน: สีตามที่แอปตั้ง */}
              <button
                type="button"
                onClick={() => {
                  setCompletedTicket(existingAttendee);
                  setDuplicateModalOpen(false);
                  setTicketModalOpen(true);
                }}
                style={primaryButtonStyle}
                className="w-full py-3.5 px-4 rounded-2xl text-sm font-extrabold shadow-lg flex items-center justify-center space-x-2 transition-all active:scale-[0.98] hover:opacity-95"
              >
                <Download className="w-4 h-4" />
                <span>ดาวโหลดบัตรเข้างาน</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* UNDERPAID WARNING POPUP MODAL (ยอดเงินโอนน้อยกว่าที่กำหนด) */}
      {/* ==================================================== */}
      {underpaidModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md bg-gradient-to-b from-rose-950 via-slate-900 to-slate-950 border-2 border-rose-500 rounded-3xl p-6 text-slate-100 shadow-2xl space-y-4">
            
            <div className="w-14 h-14 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center mx-auto shadow-lg shadow-rose-500/20">
              <AlertTriangle className="w-8 h-8 text-rose-400 animate-pulse" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-white">
                ⚠️ ยอดเงินโอนน้อยกว่าราคาที่กำหนดไว้
              </h3>
              <p className="text-xs text-rose-300">
                ระบบตรวจพบว่ายอดเงินโอนในสลิปไม่ครบตามอัตราค่าลงทะเบียน
              </p>
            </div>

            {/* Financial Details Box */}
            <div className="bg-rose-950/40 p-4 rounded-2xl border border-rose-500/30 text-xs space-y-2">
              <div className="flex justify-between items-center text-slate-300">
                <span>ยอดค่าลงทะเบียนที่กำหนด:</span>
                <span className="font-mono font-bold text-white">{calculatedFee.toLocaleString()} บาท</span>
              </div>
              <div className="flex justify-between items-center text-rose-300">
                <span>ยอดเงินที่โอนในสลิป:</span>
                <span className="font-mono font-bold text-rose-400">
                  {Number(slipDetails?.amount !== undefined && slipDetails?.amount !== null ? slipDetails.amount : 0).toLocaleString()} บาท
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-rose-500/30 font-bold">
                <span className="text-white">ยอดเงินที่ยังขาดอยู่:</span>
                <span className="font-mono text-base text-rose-400 font-extrabold">
                  ขาดอีก {Math.max(0, calculatedFee - Number(slipDetails?.amount !== undefined && slipDetails?.amount !== null ? slipDetails.amount : 0)).toLocaleString()} บาท
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/80 border border-white/10 text-[11px] text-slate-300 leading-relaxed">
              💡 <strong>คำแนะนำ:</strong> กรุณาตรวจสอบยอดเงินในสลิปให้ถูกต้อง หรือโอนเงินเพิ่มให้ครบตามจำนวนที่กำหนด ({calculatedFee.toLocaleString()} บาท) เพื่อให้ฝ่ายการเงินสามารถตรวจสอบและอนุมัติการลงทะเบียนได้ครับ
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => setUnderpaidModalOpen(false)}
                className="py-2.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/15 text-slate-200 border border-white/10 transition-all text-center"
              >
                ตรวจสอบ / แก้ไขยอดเงิน
              </button>
              <label className="py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white text-center cursor-pointer shadow-lg shadow-rose-600/30 transition-all flex items-center justify-center space-x-1">
                <Upload className="w-3.5 h-3.5" />
                <span>เปลี่ยนรูปสลิปใหม่</span>
                <input type="file" accept="image/*" onChange={(e) => {
                  setUnderpaidModalOpen(false);
                  handleSlipChange(e);
                }} className="hidden" />
              </label>
            </div>

          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* REGISTRATION SUCCESS POPUP MODAL                     */}
      {/* ==================================================== */}
      {registrationSuccessModalOpen && completedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-2 border-amber-500/40 rounded-3xl p-6 text-slate-100 shadow-[0_0_50px_rgba(245,158,11,0.25)] space-y-4 text-center">
            
            <button
              type="button"
              onClick={() => {
                setRegistrationSuccessModalOpen(false);
                setTicketModalOpen(true);
              }}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
              title="ปิดหน้าต่าง"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Celebration Icon */}
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-500/25 via-yellow-400/20 to-emerald-500/25 border border-amber-500/40 text-amber-300 flex items-center justify-center mx-auto shadow-2xl shadow-amber-500/20">
              <PartyPopper className="w-8 h-8 text-amber-400 animate-bounce" />
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-bold tracking-wider uppercase text-amber-400/90 font-mono">
                REGISTRATION SUCCESSFUL
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-white">
                คุณลงทะเบียนเข้าร่วมงานสำเร็จ! 🎉
              </h3>
            </div>

            {/* Attendee Summary Card */}
            <div className="bg-slate-950/80 p-4 rounded-2xl border border-white/10 space-y-2 text-xs text-left">
              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <span className="text-slate-400">ผู้ลงทะเบียน:</span>
                <span className="font-bold text-white text-sm">
                  {completedTicket.name} {completedTicket.nickname ? `(${completedTicket.nickname})` : ''}
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <span className="text-slate-400">เลขที่บัตร:</span>
                <span className="font-mono font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                  {completedTicket.ticketNo}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">สังกัดสนาม:</span>
                <span className="font-medium text-slate-200">{completedTicket.club}</span>
              </div>
              {completedTicket.hasShirt && (
                <div className="flex justify-between items-center text-amber-300 font-bold border-t border-white/5 pt-2">
                  <span>สิทธิ์รับเสื้อ:</span>
                  <span>ไซซ์ {completedTicket.shirtSize} ({completedTicket.shirtGender})</span>
                </div>
              )}
            </div>

            <p className="text-xs text-slate-300 leading-relaxed px-1">
              📌 ระบบได้บันทึกข้อมูลเรียบร้อยแล้ว กรุณากดปุ่มด้านล่างเพื่อ <strong className="text-amber-300 font-bold">ดาวน์โหลดบัตรเข้างาน (E-Ticket)</strong> สำหรับแสดงหน้างานนะครับ
            </p>

            {/* Big Action Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setRegistrationSuccessModalOpen(false);
                  setAutoOpenImageDownload(true);
                  setTicketModalOpen(true);
                }}
                style={primaryButtonStyle}
                className="w-full py-4 px-5 rounded-2xl text-base font-extrabold shadow-xl shadow-amber-500/25 flex items-center justify-center space-x-2 transition-all active:scale-[0.98] hover:opacity-95 cursor-pointer"
              >
                <Download className="w-5 h-5" />
                <span>ดาวน์โหลดบัตรเข้างาน</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* FIND & DOWNLOAD TICKET MODAL (FROM LANDING PAGE)     */}
      {/* ==================================================== */}
      {isFindTicketModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-lg bg-slate-900 border border-amber-500/40 rounded-3xl p-6 text-slate-100 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setIsFindTicketModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
              title="ปิดหน้าต่าง"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center space-x-3 border-b border-white/10 pb-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
                <Download className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-white">
                  ค้นหาและดาวน์โหลดบัตรเข้างาน
                </h3>
                <p className="text-xs text-slate-400">
                  สำหรับผู้ที่ลงทะเบียนเรียบร้อยแล้ว พิมพ์ชื่อและยืนยันเบอร์โทรศัพท์
                </p>
              </div>
            </div>

            {/* STEP 1: Search Name Autocomplete */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-amber-300">
                1. พิมพ์ชื่อ, ชื่อเล่น หรือเลขที่บัตรของคุณ:
              </label>
              
              {!findTicketSelected ? (
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={findTicketSearch}
                    onChange={(e) => {
                      setFindTicketSearch(e.target.value);
                      setFindTicketError("");
                    }}
                    placeholder="พิมพ์ชื่อ เช่น ทีป์, สมชาย, สุรชัย หรือพิมพ์ตัวอักษร 'ต'..."
                    className="w-full pl-10 pr-12 py-3 rounded-2xl bg-slate-950 border border-white/15 text-white text-xs sm:text-sm focus:outline-none focus:border-amber-400 shadow-inner"
                    autoFocus
                  />
                  {findTicketSearch && (
                    <button
                      type="button"
                      onClick={() => setFindTicketSearch("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs px-1.5 py-0.5 rounded bg-white/5"
                    >
                      ล้าง
                    </button>
                  )}
                </div>
              ) : (
                /* Selected Attendee Card */
                <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-amber-600/10 to-yellow-500/20 border border-amber-500/40 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                      ✓ รายชื่อผู้ลงทะเบียนที่เลือก
                    </span>
                    <div className="text-sm font-extrabold text-white flex items-center space-x-1.5">
                      <span>{findTicketSelected.name}</span>
                      {findTicketSelected.nickname && (
                        <span className="text-amber-300 text-xs">({findTicketSelected.nickname})</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-300 flex items-center space-x-2">
                      <span className="font-mono text-amber-400 font-bold">{findTicketSelected.ticketNo}</span>
                      <span>•</span>
                      <span>{findTicketSelected.club}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setFindTicketSelected(null);
                      setFindTicketPhone("");
                      setFindTicketError("");
                    }}
                    className="text-xs px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 border border-white/10 transition-all font-semibold"
                  >
                    เปลี่ยนชื่อ
                  </button>
                </div>
              )}

              {/* Autocomplete Suggestions Dropdown List */}
              {!findTicketSelected && findTicketSearch.trim().length > 0 && (
                <div className="mt-2 bg-slate-950 rounded-2xl border border-white/10 max-h-56 overflow-y-auto divide-y divide-white/5 shadow-2xl">
                  {registrations
                    .filter(r => {
                      const q = findTicketSearch.trim().toLowerCase();
                      const matchName = r.name?.toLowerCase().includes(q);
                      const matchNick = r.nickname?.toLowerCase().includes(q);
                      const matchTicket = r.ticketNo?.toLowerCase().includes(q);
                      return matchName || matchNick || matchTicket;
                    })
                    .map((item) => (
                      <div
                        key={item.ticketNo}
                        onClick={() => {
                          setFindTicketSelected(item);
                          setFindTicketPhone("");
                          setFindTicketError("");
                        }}
                        className="p-3 hover:bg-amber-500/15 cursor-pointer transition-colors flex items-center justify-between group"
                      >
                        <div className="space-y-0.5">
                          <div className="text-xs font-bold text-white group-hover:text-amber-300 flex items-center space-x-1.5">
                            <span>{item.name}</span>
                            {item.nickname && (
                              <span className="text-amber-400 font-normal">({item.nickname})</span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center space-x-2">
                            <span className="font-mono text-amber-300 font-semibold">{item.ticketNo}</span>
                            <span>•</span>
                            <span>{item.club}</span>
                          </div>
                        </div>

                        <span className="text-[11px] px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 group-hover:bg-amber-500 group-hover:text-slate-950 transition-all">
                          เลือกคนนี้ ➔
                        </span>
                      </div>
                    ))}

                  {registrations.filter(r => {
                    const q = findTicketSearch.trim().toLowerCase();
                    return r.name?.toLowerCase().includes(q) || (r.nickname && r.nickname.toLowerCase().includes(q)) || (r.ticketNo && r.ticketNo.toLowerCase().includes(q));
                  }).length === 0 && (
                    <div className="p-4 text-center text-xs text-slate-500">
                      ไม่พบชื่อผู้ลงทะเบียนที่ตรงกับ "{findTicketSearch}"
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* STEP 2: Phone Verification (Only visible when attendee is selected) */}
            {findTicketSelected && (
              <div className="space-y-3 pt-2 border-t border-white/10 animate-fadeIn">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-amber-300">
                    2. ยืนยันเบอร์โทรศัพท์ของคุณ (ระบบจะเติมขีดให้อัตโนมัติ):
                  </label>
                  <p className="text-[11px] text-slate-400">
                    เพื่อความปลอดภัย ป้องกันผู้อื่นดาวน์โหลดบัตรแทน กรุณาระบุเบอร์โทรศัพท์ที่ใช้ลงทะเบียน
                  </p>
                </div>

                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={findTicketPhone}
                    onChange={(e) => {
                      setFindTicketPhone(formatPhoneNumber(e.target.value));
                      if (findTicketError) setFindTicketError("");
                    }}
                    placeholder="เช่น 093-792-5665 (พิมพ์ตัวเลขได้เลย)"
                    className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-950 border border-white/15 text-white font-mono text-sm sm:text-base font-bold focus:outline-none focus:border-amber-400 shadow-inner"
                    autoFocus
                  />
                </div>

                {findTicketError && (
                  <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2 animate-fadeIn">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{findTicketError}</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    const enteredClean = cleanPhoneNumber(findTicketPhone);
                    const registeredClean = cleanPhoneNumber(findTicketSelected.phone);

                    if (!enteredClean) {
                      setFindTicketError("กรุณาระบุเบอร์โทรศัพท์ที่ใช้ลงทะเบียนครับ");
                      return;
                    }

                    if (enteredClean !== registeredClean) {
                      setFindTicketError("เบอร์โทรศัพท์ไม่ตรงกับข้อมูลที่ลงทะเบียนไว้ กรุณาตรวจสอบอีกครั้งครับ");
                      return;
                    }

                    // Success! Open Ticket Modal with automatic image download popup
                    setIsFindTicketModalOpen(false);
                    setCompletedTicket(findTicketSelected);
                    setAutoOpenImageDownload(true);
                    setTicketModalOpen(true);
                    handleRecordDownloadWrapper(findTicketSelected.ticketNo);
                  }}
                  style={primaryButtonStyle}
                  className="w-full py-4 px-4 rounded-2xl text-sm sm:text-base font-extrabold shadow-xl flex items-center justify-center space-x-2 transition-all hover:scale-[1.01] active:scale-[0.98] cursor-pointer mt-2"
                >
                  <Download className="w-5 h-5" />
                  <span>ยืนยันและเปิดบัตรเข้างานดิจิทัล</span>
                </button>
              </div>
            )}

            {/* Footer help note */}
            <div className="pt-2 border-t border-white/5 text-[11px] text-slate-500 text-center">
              หากท่านจำเบอร์โทรศัพท์ไม่ได้ สามารถติดต่อแอดมินหรือเจ้าหน้าที่หน้างานได้ครับ
            </div>

          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* DIGITAL E-TICKET & RECEIPT MODAL                     */}
      {/* ==================================================== */}
      <TicketModal
        isOpen={ticketModalOpen}
        onClose={() => {
          setTicketModalOpen(false);
          setAutoOpenImageDownload(false);
          handleReset();
        }}
        ticketData={completedTicket}
        eventConfig={eventConfig}
        autoOpenDownloadImage={autoOpenImageDownload}
        onRecordDownload={handleRecordDownloadWrapper}
      />


      {/* ==================================================== */}
      {/* THEME PRESETS MODAL (17 Themes + Rainbow)            */}
      {/* ==================================================== */}
      {themeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-2xl bg-slate-900 border border-white/15 rounded-3xl p-6 text-slate-100 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center space-x-2">
                <Palette className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-base font-bold text-white">
                    เลือกโทนสี & สไตล์แบบฟอร์ม (17 Theme Presets & Rainbow)
                  </h3>
                  <p className="text-xs text-slate-400">
                    คลิกเลือกเฉดสีที่ต้องการ ระบบจะปรับแต่งปุ่ม สีข้อความ และแสงเงาแบบเรียลไทม์
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setThemeModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Presets Grid */}
            <div className="space-y-4">
              {/* Card Base Mode (Dark, White, Glass) */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  🌓 รูปแบบพื้นหลังการ์ดฟอร์ม (Card Base Mode):
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleUpdateConfig('cardMode', 'dark')}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center ${
                      eventConfig.cardMode === 'dark' || !eventConfig.cardMode
                        ? 'border-amber-400 bg-amber-500/20 text-amber-300 ring-2 ring-amber-400/50'
                        : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    🌙 โทนดำ/มืด
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateConfig('cardMode', 'white')}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center ${
                      eventConfig.cardMode === 'white'
                        ? 'border-indigo-400 bg-indigo-500/20 text-indigo-300 ring-2 ring-indigo-400/50'
                        : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    ☀️ โทนขาว/สว่าง
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateConfig('cardMode', 'glass')}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center ${
                      eventConfig.cardMode === 'glass'
                        ? 'border-amber-400 bg-amber-500/20 text-amber-300 ring-2 ring-amber-400/50'
                        : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    ✨ กลาสมอร์ฟิซึม
                  </button>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2.5">
                  🌈 กลุ่มสายรุ้ง & ไล่เฉดสีพิเศษ (Rainbow & Multi-color Gradients)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {themePresetsList.filter(p => p.type === 'gradient').map((preset) => {
                    const isSelected = eventConfig.themeGradient === preset.gradient;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => applyThemePreset(preset)}
                        className={`flex items-center space-x-3 p-3 rounded-2xl border text-left transition-all ${
                          isSelected
                            ? 'border-amber-400 bg-amber-500/20 ring-2 ring-amber-400/50'
                            : 'border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10'
                        }`}
                      >
                        <div
                          className="w-9 h-9 rounded-xl shadow-inner shrink-0 border border-white/20"
                          style={{ background: preset.gradient }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-white truncate">{preset.name}</div>
                          <div className="text-[10px] text-slate-400">Gradient Overlay</div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-amber-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2.5">
                  💎 กลุ่มสีเดี่ยวคมชัด (Solid Colors)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {themePresetsList.filter(p => p.type === 'solid').map((preset) => {
                    const isSelected = eventConfig.themeColor === preset.color && !eventConfig.themeGradient;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => applyThemePreset(preset)}
                        className={`flex items-center space-x-2.5 p-2.5 rounded-2xl border text-left transition-all ${
                          isSelected
                            ? 'border-amber-400 bg-amber-500/20 ring-2 ring-amber-400/50'
                            : 'border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10'
                        }`}
                      >
                        <div
                          className="w-7 h-7 rounded-lg shadow-inner shrink-0 border border-white/20"
                          style={{ backgroundColor: preset.color }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] font-bold text-white truncate">{preset.name}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Adjustments */}
              <div className="pt-3 border-t border-white/10 space-y-3">
                <h4 className="text-xs font-bold text-slate-300">
                  ⚙️ ปรับแต่งเพิ่มเติมด้วยตนเอง (Custom Adjustments)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-white/10">
                    <span className="text-xs text-slate-300">เลือกสีหลักด้วย Color Picker:</span>
                    <input
                      type="color"
                      value={eventConfig.themeColor || "#f59e0b"}
                      onChange={(e) => {
                        handleUpdateConfig('themeColor', e.target.value);
                        handleUpdateConfig('themeGradient', null);
                      }}
                      className="w-10 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-950 border border-white/10 space-y-1.5">
                    <div className="flex justify-between text-xs text-slate-300">
                      <span>ความเข้มม่านบังตาพื้นหลัง (Opacity):</span>
                      <span className="font-mono text-amber-400 font-bold">{eventConfig.bgOverlayOpacity ?? 85}%</span>
                    </div>
                    <input
                      type="range"
                      min="30"
                      max="95"
                      value={eventConfig.bgOverlayOpacity ?? 85}
                      onChange={(e) => handleUpdateConfig('bgOverlayOpacity', Number(e.target.value))}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 flex justify-end">
              <button
                type="button"
                onClick={() => setThemeModalOpen(false)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all shadow-md"
              >
                เสร็จสิ้น & ใช้งานธีมนี้
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* SUB-BANNER SETTINGS MODAL (50% & Image Shifting)     */}
      {/* ==================================================== */}
      {subBannerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-2xl bg-slate-900 border border-white/15 rounded-3xl p-6 text-slate-100 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    ตั้งค่ารูปภาพสำหรับหน้าถัดไป (50% Sub-Banner & Shift)
                  </h3>
                  <p className="text-xs text-slate-400">
                    หน้าแรกเป็นรูปหลัก ส่วนหน้าถัดไปสามารถลดขนาดเหลือ 50% พร้อมเลื่อนตำแหน่งภาพ หรืออัปโหลดรูปใหม่ได้
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSubBannerModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Toggle show/hide sub-banner */}
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-white">แสดงรูปภาพส่วนหัวในทุกหน้าถัดไป (ขั้นตอน 1, 2, 3)</div>
                <div className="text-[11px] text-slate-400">หากปิด จะแสดงเฉพาะเนื้อหาแบบฟอร์มโดยไม่มีภาพส่วนหัว</div>
              </div>
              <button
                type="button"
                onClick={() => handleUpdateConfig('showSubBanner', eventConfig.showSubBanner === false ? true : false)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  eventConfig.showSubBanner !== false ? 'bg-amber-500' : 'bg-slate-700'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  eventConfig.showSubBanner !== false ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>

            {/* Live Comparison Preview Card */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-300 block">
                👁️ ตัวอย่างเปรียบเทียบภาพจริง (Live Comparison Preview):
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-950 border border-white/10">
                
                {/* Preview 1: หน้าแรก (รูปหลัก 100%) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-amber-400">1. หน้าแรก (รูปหลัก 100%)</span>
                    <span className="font-mono text-slate-400 text-[10px]">ความสูงเต็ม (16:9)</span>
                  </div>
                  <div className="h-28 rounded-xl overflow-hidden border border-white/15 relative">
                    <img
                      src={eventConfig.bannerImage}
                      alt="Main Banner Preview"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-1 left-2 text-[10px] font-bold text-white drop-shadow">
                      หน้าปก / Landing
                    </div>
                  </div>
                </div>

                {/* Preview 2: หน้าถัดไป (ลด 50% พร้อมเลื่อน) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-emerald-400">2. หน้าถัดไป (ลดขนาดเหลือ 50%)</span>
                    <span className="font-mono text-slate-400 text-[10px]">
                      {eventConfig.subBannerMode === 'custom' ? 'รูปใหม่' : `เลื่อน Y: ${eventConfig.subBannerPositionY ?? 50}%`}
                    </span>
                  </div>
                  <div className="h-14 rounded-xl overflow-hidden border border-emerald-500/40 relative">
                    <img
                      src={eventConfig.subBannerMode === 'custom' && eventConfig.subBannerImage ? eventConfig.subBannerImage : eventConfig.bannerImage}
                      alt="Sub Banner Preview"
                      className="w-full h-full object-cover transition-all duration-200"
                      style={{ objectPosition: `center ${eventConfig.subBannerPositionY ?? 50}%` }}
                    />
                    <div className="absolute bottom-1 left-2 text-[10px] font-bold text-white drop-shadow">
                      ขั้นตอนที่ 1, 2, 3
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Mode 1: Use same image as main banner (50% with position slider) */}
            <div className={`p-4 rounded-2xl border transition-all ${
              eventConfig.subBannerMode !== 'custom' 
                ? 'border-amber-400/80 bg-amber-500/10 ring-2 ring-amber-400/30' 
                : 'border-white/10 bg-white/5 hover:border-white/20'
            }`}>
              <label 
                className="flex items-start space-x-3 cursor-pointer"
                onClick={() => handleUpdateConfig('subBannerMode', 'same')}
              >
                <input
                  type="radio"
                  name="subBannerModeRadio"
                  checked={eventConfig.subBannerMode !== 'custom'}
                  onChange={() => handleUpdateConfig('subBannerMode', 'same')}
                  className="mt-0.5 text-amber-500 focus:ring-amber-400 cursor-pointer"
                />
                <div className="flex-1">
                  <div className="text-xs font-bold text-white flex items-center justify-between">
                    <span>ใช้ภาพเดียวกับรูปหลัก (หน้าแรก) — ลดขนาดเหลือ 50%</span>
                    <span className="text-[10px] font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30">
                      แนะนำ
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    นำรูปหน้าปกมาย่อความสูงลง 50% และสามารถเลื่อนปรับระดับภาพขึ้น-ลง เพื่อให้เห็นส่วนที่ต้องการได้อย่างเหมาะสม
                  </p>
                </div>
              </label>

              {/* Slider & Quick Buttons when mode is 'same' */}
              {eventConfig.subBannerMode !== 'custom' && (
                <div className="mt-3.5 pt-3 border-t border-white/10 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-semibold">เลื่อนตำแหน่งภาพขึ้น-ลง (Vertical Position):</span>
                    <span className="font-mono text-amber-400 font-bold bg-slate-950 px-2 py-0.5 rounded border border-white/10">
                      {eventConfig.subBannerPositionY ?? 50}%
                    </span>
                  </div>

                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={eventConfig.subBannerPositionY ?? 50}
                    onChange={(e) => handleUpdateConfig('subBannerPositionY', Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
                  />

                  {/* 3 Quick Shift Buttons */}
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleUpdateConfig('subBannerPositionY', 0)}
                      className={`py-1.5 px-2 rounded-xl text-xs font-semibold border transition-all ${
                        (eventConfig.subBannerPositionY ?? 50) === 0
                          ? 'bg-amber-500 text-slate-950 font-bold border-amber-400'
                          : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      🔝 ด้านบน (0%)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateConfig('subBannerPositionY', 50)}
                      className={`py-1.5 px-2 rounded-xl text-xs font-semibold border transition-all ${
                        (eventConfig.subBannerPositionY ?? 50) === 50
                          ? 'bg-amber-500 text-slate-950 font-bold border-amber-400'
                          : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      🎯 กึ่งกลาง (50%)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateConfig('subBannerPositionY', 100)}
                      className={`py-1.5 px-2 rounded-xl text-xs font-semibold border transition-all ${
                        (eventConfig.subBannerPositionY ?? 50) === 100
                          ? 'bg-amber-500 text-slate-950 font-bold border-amber-400'
                          : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      🔻 ด้านล่าง (100%)
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mode 2: Upload new custom image for subsequent steps */}
            <div className={`p-4 rounded-2xl border transition-all ${
              eventConfig.subBannerMode === 'custom' 
                ? 'border-emerald-400/80 bg-emerald-500/10 ring-2 ring-emerald-400/30' 
                : 'border-white/10 bg-white/5 hover:border-white/20'
            }`}>
              <label 
                className="flex items-start space-x-3 cursor-pointer"
                onClick={() => handleUpdateConfig('subBannerMode', 'custom')}
              >
                <input
                  type="radio"
                  name="subBannerModeRadio"
                  checked={eventConfig.subBannerMode === 'custom'}
                  onChange={() => handleUpdateConfig('subBannerMode', 'custom')}
                  className="mt-0.5 text-emerald-500 focus:ring-emerald-400 cursor-pointer"
                />
                <div className="flex-1">
                  <div className="text-xs font-bold text-white flex items-center justify-between">
                    <span>นำเข้ารูปภาพใหม่จากแหล่งอื่น (อัปรูปใหม่สำหรับหน้าถัดไป)</span>
                    <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30">
                      รูปเฉพาะหน้า
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    อัปโหลดรูปภาพใหม่ที่แตกต่างจากหน้าแรก เพื่อใช้เป็นภาพส่วนหัวในขั้นตอนที่ 1, 2, 3 โดยเฉพาะ
                  </p>
                </div>
              </label>

              {eventConfig.subBannerMode === 'custom' && (
                <div className="mt-3.5 pt-3 border-t border-white/10 space-y-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="url"
                      value={eventConfig.subBannerImage || ''}
                      onChange={(e) => handleUpdateConfig('subBannerImage', e.target.value)}
                      placeholder="วาง URL รูปภาพใหม่ หรือกดปุ่มครอปตัดรูป..."
                      className="flex-1 px-3 py-2 rounded-xl text-xs bg-slate-950 border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 font-mono"
                    />

                    <button
                      type="button"
                      onClick={() => {
                        setCropperTarget('subBanner');
                        setCropperModalOpen(true);
                      }}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md flex items-center space-x-1 shrink-0 transition-all hover:scale-105"
                    >
                      <Crop className="w-3.5 h-3.5" />
                      <span>ครอปตัดรูปใหม่</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Save / Done Button */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSubBannerModalOpen(false)}
                className="px-6 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg transition-all hover:scale-105"
              >
                บันทึกและปิดหน้าต่าง
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* IMAGE CROPPER MODAL (Banner, Background, Shirt)       */}
      {/* ==================================================== */}
      <ImageCropperModal
        isOpen={cropperModalOpen}
        onClose={() => setCropperModalOpen(false)}
        targetField={cropperTarget}
        defaultAspect={
          cropperTarget === 'subBanner'
            ? 16 / 4
            : cropperTarget === 'banner'
            ? 16 / 7
            : cropperTarget === 'background'
            ? 16 / 9
            : 1
        }
        title={
          cropperTarget === 'subBanner'
            ? '✂️ ปรับขนาดและครอบตัดภาพสำหรับหน้าถัดไป (Sub-Banner Image)'
            : cropperTarget === 'banner'
            ? '✂️ ปรับขนาดและครอบตัดภาพหน้าปก (Banner Image)'
            : cropperTarget === 'background'
            ? '✂️ ปรับขนาดและครอบตัดภาพพื้นหลัง (Background Image)'
            : '✂️ ปรับขนาดและครอบตัดภาพลายเสื้อ (T-Shirt Mockup)'
        }
        onCropComplete={(croppedDataUrl) => {
          if (cropperTarget === 'banner') {
            handleUpdateConfig('bannerImage', croppedDataUrl);
          } else if (cropperTarget === 'background') {
            handleUpdateConfig('backgroundImage', croppedDataUrl);
          } else if (cropperTarget === 'shirtMockup') {
            handleUpdateConfig('shirtMockupImage', croppedDataUrl);
          } else if (cropperTarget === 'subBanner') {
            handleUpdateConfig('subBannerImage', croppedDataUrl);
            handleUpdateConfig('subBannerMode', 'custom');
          }
          setCropperModalOpen(false);
        }}
      />

      {/* ==================================================== */}
      {/* SPONSOR REGISTRATION MODAL                            */}
      {/* ==================================================== */}
      <SponsorRegistrationModal
        isOpen={isSponsorModalOpen}
        onClose={() => setIsSponsorModalOpen(false)}
        eventConfig={eventConfig}
        registrations={registrations}
        existingSponsors={sponsorsList}
        onSponsorSuccess={(newSponsor) => {
          setSponsorsList((prev) => [newSponsor, ...(prev || [])]);
        }}
      />

      {/* ==================================================== */}
      {/* PUBLIC DATA SHEET MODAL (A4 / Excel View)             */}
      {/* ==================================================== */}
      <EventPublicDataSheetModal
        isOpen={isDataSheetModalOpen}
        onClose={() => setIsDataSheetModalOpen(false)}
        registrations={registrations}
        sponsors={sponsorsList}
        eventConfig={eventConfig}
      />

    </div>
  );
}
