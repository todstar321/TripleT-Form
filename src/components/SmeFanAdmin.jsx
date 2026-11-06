import React, { useState, useMemo } from 'react';
import { 
  Users, 
  User,
  Shirt, 
  DollarSign, 
  Calendar, 
  Image as ImageIcon, 
  Crop, 
  Plus, 
  Minus,
  Trash2, 
  CreditCard, 
  Sliders, 
  Sparkles, 
  CheckCircle2, 
  Eye, 
  ArrowRight,
  Database,
  ExternalLink,
  ShieldCheck,
  Lock,
  Download,
  Clock,
  Cloud,
  FileImage,
  AlertTriangle,
  UserPlus,
  LogOut,
  Palette,
  FileText,
  Layers,
  ChevronRight,
  Search,
  Check,
  Share2,
  Copy,
  Star,
  Settings,
  HelpCircle,
  Menu,
  Camera,
  X,
  Server,
  HardDrive,
  RefreshCw,
  RotateCcw,
  MessageSquare,
  Send,
  Bell
} from 'lucide-react';
import ImageCropperModal from './ImageCropperModal';
import MemberSpreadsheet from './MemberSpreadsheet';
import TicketScannerModal from './TicketScannerModal';
import StoragePurgeModal from './StoragePurgeModal';
import ResetRegistrationsModal from './ResetRegistrationsModal';
import ClearSecurityModal from './ClearSecurityModal';
import AttendeeInspectionModal from './AttendeeInspectionModal';
import { themePresetsList } from '../data/smeFanData';
import { testSupabaseConnection, saveSupabaseConfig, getSupabaseConfig, isSupabaseConfigured, upsertRegistrationToCloud, saveEventConfigToCloud, formatThaiDisplayDateTime } from '../utils/supabaseClient';
import { testCloudinaryConnection, saveCloudinaryConfig, getCloudinaryConfig, isCloudinaryConfigured } from '../utils/cloudinary';
import { getScheduleStatus, formatThaiScheduleDateTime } from '../utils/scheduleHelper';

export default function SmeFanAdmin({
  eventConfig,
  setEventConfig,
  registrations,
  onOpenGoogleSheetsModal,
  currentUser,
  onLoginClick,
  onLogout,
  onDeleteRegistration,
  onDeleteSlip,
  onPurgeExpiredSlips,
  onSwitchToForm,
  onBackToPortal,
  onGoToCheckIn,
  formsList = [],
  setFormsList,
  onViewForm,
  onPurgeComplete,
  onForceSyncCloud,
  onResetAllRegistrations,
  onUpdateRegistration,
  initialActiveTab = 'overview'
}) {
  const [activeTab, setActiveTab] = useState(initialActiveTab); 
  // 'overview' | 'forms_hub' | 'attendees' | 'slips' | 'members' | 'themes' | 'roles' | 'design'
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [adminInspectingAttendee, setAdminInspectingAttendee] = useState(null);
  const activeAdminInspectingAttendee = useMemo(() => {
    if (!adminInspectingAttendee) return null;
    return registrations.find(r => r.ticketNo === adminInspectingAttendee.ticketNo) || adminInspectingAttendee;
  }, [adminInspectingAttendee, registrations]);
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Form Hub state
  const [viewingResponsesFormId, setViewingResponsesFormId] = useState(null);
  const [themeStudioTargetFormId, setThemeStudioTargetFormId] = useState('form_1_sme_event');
  const [copiedLink, setCopiedLink] = useState(false);
  const [isAdminScannerOpen, setIsAdminScannerOpen] = useState(false);

  // High-Security Clear Modal State
  const [isClearSecurityOpen, setIsClearSecurityOpen] = useState(false);
  // Cloud & Purge States
  const [isPurgeModalOpen, setIsPurgeModalOpen] = useState(false);
  const [sbConfig, setSbConfig] = useState(() => getSupabaseConfig());
  const [cldConfig, setCldConfig] = useState(() => getCloudinaryConfig());
  const [sbTestResult, setSbTestResult] = useState(null);
  const [cldTestResult, setCldTestResult] = useState(null);
  const [isTestingSb, setIsTestingSb] = useState(false);
  const [isTestingCld, setIsTestingCld] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // LINE Official Account Notification States
  const [isTestingLine, setIsTestingLine] = useState(false);
  const [lineTestResult, setLineTestResult] = useState(null);
  const [copiedWebhookUrl, setCopiedWebhookUrl] = useState(false);
  const [showLineToken, setShowLineToken] = useState(false);

  // Image cropper state
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperTarget, setCropperTarget] = useState('banner');
  const [cropperTitle, setCropperTitle] = useState('');
  const [cropperAspect, setCropperAspect] = useState(16 / 9);

  // Member management state
  const clubsList = eventConfig?.clubs && eventConfig.clubs.length > 0 ? eventConfig.clubs : ["สงสพัท", "โรตารี่"];
  const membersList = eventConfig?.members || [];
  const [activeMemberClub, setActiveMemberClub] = useState(clubsList[0] || "สงสพัท");
  const [newClubName, setNewClubName] = useState("");

  // New Admin User Form (Owner only)
  const [newAdminName, setNewAdminName] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminPhone, setNewAdminPhone] = useState("");
  const [newAdminRole, setNewAdminRole] = useState("admin"); // 'owner' | 'manager' | 'admin'

  // Table filters
  const [filterClub, setFilterClub] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [searchAttendee, setSearchAttendee] = useState("");

  // Summary statistics
  const totalRegistrations = registrations.length;
  const memberCount = registrations.filter(r => r.regType === 'member').length;
  const guestCount = registrations.filter(r => r.regType === 'guest').length;
  const shirtCount = registrations.filter(r => r.hasShirt).length;
  const totalRevenue = registrations.reduce((sum, r) => sum + (r.paidAmount || r.amount || 0), 0);
  const totalContributions = registrations.reduce((sum, r) => sum + (r.contributionAmount || 0), 0);
  const totalSlips = registrations.filter(r => !!r.slipUrl).length;

  // Role permissions
  const role = currentUser?.role || 'admin';
  const isOwner = role === 'owner';
  const isManager = role === 'manager' || isOwner;

  // Selected Form in Theme Studio
  const selectedThemeForm = (formsList || []).find(f => f.id === themeStudioTargetFormId) || {
    id: 'form_1_sme_event',
    formNumber: 1,
    title: eventConfig.eventTitle,
    theme: {
      cardMode: eventConfig.cardMode || 'dark',
      themeColor: eventConfig.themeColor || '#f59e0b',
      themeGradient: eventConfig.themeGradient || 'linear-gradient(135deg, #f59e0b, #d97706, #b45309)',
      themeTextColor: eventConfig.themeTextColor || '#0f172a',
      backgroundImage: eventConfig.backgroundImage,
      bgOverlayOpacity: eventConfig.bgOverlayOpacity ?? 85
    }
  };

  // Update Theme for a specific Form
  const handleUpdateFormTheme = (formId, newThemeUpdates) => {
    // 1. If modifying Form 1, sync with eventConfig
    if (formId === 'form_1_sme_event') {
      setEventConfig(prev => ({
        ...prev,
        ...newThemeUpdates
      }));
    }

    // 2. Sync in formsList
    if (setFormsList) {
      setFormsList(prev => prev.map(f => {
        if (f.id === formId) {
          return {
            ...f,
            theme: {
              ...(f.theme || {}),
              ...newThemeUpdates
            }
          };
        }
        return f;
      }));
    }
  };

  // Apply Theme Preset to current Form in Theme Studio
  const handleApplyPreset = (preset) => {
    const isGradient = preset.type === 'gradient';
    const updates = {
      themeColor: preset.color,
      themeGradient: isGradient ? preset.gradient : null,
      themeTextColor: preset.textColor || '#ffffff'
    };
    handleUpdateFormTheme(themeStudioTargetFormId, updates);
  };

  // Open cropper
  const openCropper = (target) => {
    setCropperTarget(target);
    if (target === 'banner') {
      setCropperTitle('ปรับขนาดและตัดรูปภาพปกกิจกรรม (Event Banner)');
      setCropperAspect(2.5 / 1);
    } else if (target === 'subBanner') {
      setCropperTitle('ปรับขนาดและตัดรูปภาพหัวฟอร์มหน้าถัดไป (Sub-Banner ย่อ 50%)');
      setCropperAspect(16 / 4);
    } else if (target === 'shirtMockup') {
      setCropperTitle('ปรับขนาดและตัดรูปภาพตัวอย่างลายเสื้อ (T-Shirt Mockup)');
      setCropperAspect(1);
    } else {
      setCropperTitle('ปรับขนาดและตัดรูปภาพพื้นหลังฉากหลัง (Background Wallpaper)');
      setCropperAspect(16 / 9);
    }
    setCropperOpen(true);
  };

  const handleCropComplete = (croppedUrl) => {
    if (cropperTarget === 'banner') {
      setEventConfig(prev => ({ ...prev, bannerImage: croppedUrl }));
    } else if (cropperTarget === 'subBanner') {
      setEventConfig(prev => ({ ...prev, subBannerImage: croppedUrl, subBannerMode: 'custom' }));
    } else if (cropperTarget === 'shirtMockup') {
      setEventConfig(prev => ({ ...prev, shirtMockupImage: croppedUrl }));
    } else if (cropperTarget === 'background') {
      setEventConfig(prev => ({ ...prev, backgroundImage: croppedUrl }));
      handleUpdateFormTheme(themeStudioTargetFormId, { backgroundImage: croppedUrl });
    }
  };

  // Handle Save Members from Spreadsheet
  const handleSaveSpreadsheetMembers = (club, updatedMembers) => {
    const membersToSave = Array.isArray(club) ? club : (Array.isArray(updatedMembers) ? updatedMembers : []);
    const targetClub = typeof club === 'string' ? club : activeMemberClub;

    setEventConfig(prev => {
      const otherMembers = prev.members.filter(m => m.club !== targetClub);
      return {
        ...prev,
        members: [...otherMembers, ...membersToSave]
      };
    });
  };

  // Add Club
  const handleAddClub = (e) => {
    e.preventDefault();
    if (!newClubName.trim()) return;
    const trimmed = newClubName.trim();
    if (eventConfig.clubs.includes(trimmed)) {
      alert("มีชื่อสังกัดสนามนี้อยู่แล้ว");
      return;
    }

    setEventConfig(prev => ({
      ...prev,
      clubs: [...prev.clubs, trimmed]
    }));
    setActiveMemberClub(trimmed);
    setNewClubName("");
  };

  // Delete Club
  const handleDeleteClub = (clubName) => {
    if (!isOwner) {
      alert("เฉพาะ Owner เท่านั้นที่สามารถลบสนามได้");
      return;
    }
    if (eventConfig.clubs.length <= 1) {
      alert("ไม่สามารถลบสนามทั้งหมดได้ ต้องมีอย่างน้อย 1 สนาม");
      return;
    }
    const hasMembers = eventConfig.members.some(m => m.club === clubName);
    if (hasMembers) {
      if (!window.confirm(`สนาม "${clubName}" มีสมาชิกอยู่ในระบบ หากยืนยันลบ สมาชิกของสนามนี้จะถูกลบไปด้วย ยืนยันหรือไม่?`)) {
        return;
      }
    }
    setEventConfig(prev => ({
      ...prev,
      clubs: prev.clubs.filter(c => c !== clubName),
      members: prev.members.filter(m => m.club !== clubName)
    }));
    const remaining = eventConfig.clubs.filter(c => c !== clubName);
    setActiveMemberClub(remaining[0] || "");
  };

  // Add Admin User (Owner only)
  const handleAddAdminUser = (e) => {
    e.preventDefault();
    if (!newAdminEmail.trim() || !newAdminPhone.trim()) return;

    const newUser = {
      id: `u_${Date.now()}`,
      name: newAdminName.trim() || "ผู้ดูแลระบบ",
      email: newAdminEmail.trim().toLowerCase(),
      phone: newAdminPhone.trim(),
      role: newAdminRole
    };

    setEventConfig(prev => ({
      ...prev,
      adminUsers: [...(prev.adminUsers || []), newUser]
    }));

    setNewAdminName("");
    setNewAdminEmail("");
    setNewAdminPhone("");
    alert("เพิ่มผู้ใช้งานระบบเรียบร้อยแล้ว!");
  };

  // Delete Admin User
  const handleDeleteAdminUser = (userId) => {
    if (!isOwner) return;
    if (userId === 'u_owner') {
      alert("ไม่สามารถลบบัญชีเจ้าของหลักได้");
      return;
    }
    if (window.confirm("ต้องการลบสิทธิ์ผู้ใช้งานนี้ใช่หรือไม่?")) {
      setEventConfig(prev => ({
        ...prev,
        adminUsers: prev.adminUsers.filter(u => u.id !== userId)
      }));
    }
  };

  // Batch Download All Slips
  const handleDownloadAllSlips = () => {
    const slipsList = registrations.filter(r => !!r.slipUrl);
    if (slipsList.length === 0) {
      alert("ไม่พบรูปสลิปในระบบ");
      return;
    }
    slipsList.forEach((r, idx) => {
      setTimeout(() => {
        const a = document.createElement('a');
        a.href = r.slipUrl;
        a.download = `SLIP_${r.ticketNo}_${r.name}.jpg`;
        a.target = '_blank';
        a.click();
      }, idx * 300);
    });
    alert(`กำลังเริ่มดาวน์โหลดรูปสลิปทั้งหมด ${slipsList.length} รูป...`);
  };

  // Copy Form Link
  const handleCopyFormLink = (formId) => {
    const url = `${window.location.origin}${window.location.pathname}?form=${formId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    });
  };

  // Cloud Config & Test Handlers
  const handleSaveSupabase = (e) => {
    e?.preventDefault();
    saveSupabaseConfig(sbConfig.url, sbConfig.anonKey);
    alert('บันทึกการตั้งค่า Supabase เรียบร้อยแล้ว');
  };

  const handleTestSupabase = async () => {
    setIsTestingSb(true);
    setSbTestResult(null);
    saveSupabaseConfig(sbConfig.url, sbConfig.anonKey);
    const res = await testSupabaseConnection();
    setSbTestResult(res);
    setIsTestingSb(false);
  };

  const [isSyncingAll, setIsSyncingAll] = useState(false);

  const handleSyncAllToSupabase = async () => {
    if (!registrations || registrations.length === 0) {
      alert('ไม่มีข้อมูลผู้ลงทะเบียนสำหรับซิงค์ครับ');
      return;
    }
    if (!window.confirm(`ต้องการซิงค์ข้อมูลผู้ลงทะเบียนทั้งหมด ${registrations.length} ท่าน ขึ้นสู่ Supabase ใช่หรือไม่?`)) {
      return;
    }
    setIsSyncingAll(true);
    let successCount = 0;
    saveSupabaseConfig(sbConfig.url, sbConfig.anonKey);
    for (const reg of registrations) {
      const ok = await upsertRegistrationToCloud(reg);
      if (ok) successCount++;
    }
    setIsSyncingAll(false);
    alert(`ซิงค์ข้อมูลขึ้น Supabase สำเร็จเรียบร้อยแล้ว ${successCount} จาก ${registrations.length} รายการ!`);
  };

  const [isSavingConfig, setIsSavingConfig] = useState(false);

  const handleSaveConfigToSupabase = async () => {
    setIsSavingConfig(true);
    saveSupabaseConfig(sbConfig.url, sbConfig.anonKey);
    const ok = await saveEventConfigToCloud(eventConfig);
    setIsSavingConfig(false);
    if (ok) {
      alert("บันทึกการตั้งค่าหน้าปก, ธีมสี, และข้อมูลกิจกรรมขึ้น Supabase เรียบร้อยแล้ว! อุปกรณ์ของคนอื่นที่เปิดใช้งานจะอัปเดตตามทันที");
    } else {
      alert("ไม่สามารถบันทึกได้ กรุณาตรวจสอบว่าสร้างตาราง event_config ใน Supabase หรือยังครับ");
    }
  };

  const handleSaveCloudinary = (e) => {
    e?.preventDefault();
    saveCloudinaryConfig(cldConfig.cloudName, cldConfig.uploadPreset, cldConfig.folderPrefix);
    alert('บันทึกการตั้งค่า Cloudinary เรียบร้อยแล้ว');
  };

  const handleTestCloudinary = async () => {
    setIsTestingCld(true);
    setCldTestResult(null);
    saveCloudinaryConfig(cldConfig.cloudName, cldConfig.uploadPreset, cldConfig.folderPrefix);
    const res = await testCloudinaryConnection(cldConfig);
    setCldTestResult(res);
    setIsTestingCld(false);
  };

  // LINE Official Account Handlers
  const handleUpdateLineConfig = (key, value) => {
    setEventConfig(prev => ({
      ...prev,
      lineConfig: {
        ...(prev.lineConfig || {}),
        [key]: value
      }
    }));
  };

  const handleTestLineNotify = async () => {
    const lineCfg = eventConfig?.lineConfig || {};
    const targetGroup = (lineCfg.groupId || '').trim();
    if (!targetGroup) {
      alert('กรุณาระบุรหัสกลุ่ม LINE (Group ID) ก่อนกดทดสอบครับ\n\nคำแนะนำ: เชิญบอทเข้ากลุ่มแล้วพิมพ์ #id ในกลุ่ม บอทจะส่งรหัสกลุ่มกลับมาครับ');
      return;
    }

    setIsTestingLine(true);
    setLineTestResult(null);

    try {
      const resp = await fetch('/api/line-notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isTest: true,
          token: lineCfg.channelAccessToken,
          groupId: targetGroup
        })
      });

      const data = await resp.json().catch(() => null);

      if (resp.ok && data?.success) {
        setLineTestResult({ success: true, message: 'ส่งข้อความทดสอบสำเร็จเรียบร้อยแล้ว!' });
        alert('🎉 ส่งข้อความทดสอบเข้ากลุ่ม LINE สำเร็จเรียบร้อยแล้ว! กรุณาเปิดดูในแอป LINE');
      } else {
        const errorMsg = data?.error || `LINE API error (${resp.status})`;
        setLineTestResult({ success: false, error: errorMsg });
        alert(`❌ ไม่สามารถส่งข้อความได้: ${errorMsg}\n\nคำแนะนำ: กรุณาตรวจสอบว่าเชิญบอทเข้ากลุ่มแล้ว และ Channel Access Token ถูกต้อง`);
      }
    } catch (err) {
      setLineTestResult({ success: false, error: err.message });
      alert(`❌ เกิดข้อผิดพลาดในการเชื่อมต่อ: ${err.message}`);
    } finally {
      setIsTestingLine(false);
    }
  };

  const handleCopyWebhookUrl = () => {
    const webhookUrl = `${window.location.origin}/api/line-webhook`;
    navigator.clipboard.writeText(webhookUrl).then(() => {
      setCopiedWebhookUrl(true);
      setTimeout(() => setCopiedWebhookUrl(false), 2500);
    });
  };

  const handleCopySqlSchema = () => {
    const sqlScript = `-- TRIPLE T FORM & SME FAN 2026 - SUPABASE DATABASE SCHEMA
CREATE TABLE IF NOT EXISTS public.registrations (
    ticket_no TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    nickname TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    email TEXT DEFAULT '',
    reg_type TEXT DEFAULT 'member',
    club TEXT DEFAULT 'สงสพัท',
    amount NUMERIC DEFAULT 500,
    paid_amount NUMERIC DEFAULT 500,
    payment_status TEXT DEFAULT 'paid',
    payment_slip TEXT,
    slip_uploaded_at TIMESTAMPTZ,
    has_shirt BOOLEAN DEFAULT true,
    shirt_size TEXT DEFAULT 'L',
    shirt_gender TEXT DEFAULT 'ชาย',
    shirt_received BOOLEAN DEFAULT false,
    shirt_received_at TIMESTAMPTZ,
    checked_in BOOLEAN DEFAULT false,
    checked_in_at TIMESTAMPTZ,
    gift_number INTEGER,
    gift_registered_at TIMESTAMPTZ,
    photo_url TEXT,
    costume_photo TEXT,
    recommender_name TEXT DEFAULT '',
    guest_title TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read All" ON public.registrations FOR SELECT USING (true);
CREATE POLICY "Public Insert All" ON public.registrations FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update All" ON public.registrations FOR UPDATE USING (true);
CREATE POLICY "Public Delete All" ON public.registrations FOR DELETE USING (true);
`;
    navigator.clipboard.writeText(sqlScript).then(() => {
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2000);
    });
  };

  // Filtered attendees
  const filteredAttendees = registrations.filter(r => {
    if (filterClub !== 'all' && r.club !== filterClub) return false;
    if (filterType !== 'all' && r.regType !== filterType) return false;
    if (searchAttendee.trim()) {
      const q = searchAttendee.toLowerCase();
      const matchName = (r.name || '').toLowerCase().includes(q);
      const matchTicket = (r.ticketNo || '').toLowerCase().includes(q);
      const matchPhone = (r.phone || '').includes(q);
      const matchMemberCode = (r.memberCode || '').toLowerCase().includes(q);
      if (!matchName && !matchTicket && !matchPhone && !matchMemberCode) return false;
    }
    return true;
  });

  // Calculate 6-month expired slips count
  const expiredSlipsCount = registrations.filter(r => {
    if (!r.slipUrl) return false;
    if (!r.slipExpiresAt) return false;
    return new Date() > new Date(r.slipExpiresAt);
  }).length;

  // Active Form Responses Table Data
  const activeViewingForm = formsList.find(f => f.id === viewingResponsesFormId);

  // Left Sidebar Menu Items
  const menuItems = [
    { id: 'overview', label: 'ภาพรวม & ตัวเลข', icon: Sliders, badge: null },
    { id: 'forms_hub', label: 'จัดการแบบฟอร์ม 1-4', icon: Layers, badge: '4 ฟอร์ม' },
    { id: 'attendees', label: 'ผู้ลงทะเบียน', icon: Users, badge: totalRegistrations },
    { id: 'slips', label: 'คลังตรวจสอบสลิป', icon: FileImage, badge: totalSlips },
    { id: 'cloud', label: 'คลาวด์ & LINE แจ้งเตือน', icon: Cloud, badge: isSupabaseConfigured() ? 'Cloud/LINE' : 'ตั้งค่า' },
    { id: 'members', label: 'สังกัด & สมาชิกสนาม', icon: Database, badge: eventConfig.members?.length || 0 },
    { id: 'themes', label: 'ปรับแต่งธีม & โทนสี', icon: Palette, badge: 'New' },
    ...(isOwner ? [{ id: 'roles', label: 'จัดการสิทธิ์แอดมิน', icon: ShieldCheck, badge: 'Owner' }] : []),
    ...(isManager ? [{ id: 'design', label: 'หน้าปก & Cloudinary', icon: ImageIcon, badge: null }] : []),
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col md:flex-row font-sans">

      {/* ==================================================== */}
      {/* MOBILE TOP NAVBAR                                    */}
      {/* ==================================================== */}
      <div className="md:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-40 shadow-sm">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 text-slate-950 flex items-center justify-center font-extrabold shadow-sm">
            <Sparkles className="w-4 h-4 text-slate-950" />
          </div>
          <div>
            <div className="text-sm font-extrabold text-slate-900">Triple T Form</div>
            <div className="text-[10px] text-slate-500">Owner Admin Portal</div>
          </div>
        </div>

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* ==================================================== */}
      {/* LEFT SIDEBAR NAVIGATION                              */}
      {/* ==================================================== */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-72 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 shadow-sm transition-transform duration-300
        md:translate-x-0 md:static md:h-screen md:sticky md:top-0
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Top Branding Section */}
        <div className="p-5 border-b border-slate-100 space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 text-slate-950 flex items-center justify-center font-extrabold shadow-md shadow-amber-500/20">
              <Sparkles className="w-5 h-5 text-slate-950" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-extrabold text-slate-900 tracking-tight truncate">
                Triple T Form
              </h1>
              <p className="text-[11px] font-medium text-slate-500">
                แดชบอร์ดจัดการระบบ Owner
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="space-y-2">
            {onGoToCheckIn && (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onGoToCheckIn();
                }}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Camera className="w-4 h-4" />
                <span>🎟️ ลงทะเบียนเข้างาน (หน้างาน)</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                if (onSwitchToForm) {
                  onSwitchToForm();
                } else if (onViewForm) {
                  onViewForm('form_1_sme_event');
                }
              }}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Eye className="w-4 h-4" />
              <span>ดูหน้าฟอร์มจริง (Live View)</span>
            </button>

            {onBackToPortal && (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onBackToPortal();
                }}
                className="w-full flex items-center justify-center space-x-1.5 px-3 py-1.5 rounded-xl text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all"
              >
                <span>🏢 ศูนย์ควบคุม Owner</span>
              </button>
            )}
          </div>
        </div>

        {/* Vertical Navigation Links running downwards */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            เมนูจัดการระบบ (System Menu)
          </div>

          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-slate-900 text-white font-bold shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center space-x-3 truncate">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                  <span className="truncate">{item.label}</span>
                </div>

                {item.badge !== null && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ml-2 shrink-0 ${
                    isActive
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          {/* Quick link to Google Sheets modal */}
          {onOpenGoogleSheetsModal && (
            <button
              type="button"
              onClick={() => {
                onOpenGoogleSheetsModal();
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-emerald-700 bg-emerald-50/70 hover:bg-emerald-100 transition-all mt-2"
            >
              <div className="flex items-center space-x-3">
                <Database className="w-4 h-4 text-emerald-600" />
                <span>ต่อ Google Sheets (5 แท็บ)</span>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
            </button>
          )}
        </div>

        {/* Bottom Profile & Role Status Card */}
        <div className="p-3.5 border-t border-slate-100 bg-slate-50/80">
          <div className="p-3 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2.5">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 flex items-center justify-center font-bold text-xs shrink-0">
                {currentUser?.name ? currentUser.name.charAt(0) : 'ผ'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-1.5">
                  <span className="text-xs font-extrabold text-slate-900 truncate">
                    {currentUser?.name || 'ทีป์ชลิต ทองจันทร์'}
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 truncate">
                  {currentUser?.email || 'teepchalit@smefan.com'}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px]">
              <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/80">
                {isOwner ? '👑 เจ้าของ (Owner)' : isManager ? '💼 ผู้จัดการ' : '🛡️ แอดมิน'}
              </span>

              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  onClick={onLoginClick}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
                  title="สลับบัญชีสิทธิ์"
                >
                  <Lock className="w-3.5 h-3.5" />
                </button>
                {onLogout && (
                  <button
                    type="button"
                    onClick={onLogout}
                    className="p-1 rounded-lg hover:bg-rose-50 text-rose-500 transition-colors"
                    title="ออกจากระบบ"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Backdrop overlay */}
      {mobileMenuOpen && (
        <div 
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-slate-900/50 z-30 md:hidden backdrop-blur-xs"
        />
      )}

      {/* ==================================================== */}
      {/* MAIN CONTENT WORKSPACE (WHITE OFFICIAL THEME)        */}
      {/* ==================================================== */}
      <main className="flex-1 min-w-0 min-h-screen p-4 sm:p-8 space-y-6 overflow-y-auto">

        {/* Top Header Bar inside content */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs text-slate-500 mb-1">
              <span>แดชบอร์ด Owner</span>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="font-semibold text-slate-800 capitalize">
                {menuItems.find(m => m.id === activeTab)?.label || 'ระบบจัดการ'}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              {activeTab === 'overview' && 'ภาพรวมและตัวเลขสถิติ (Executive Overview)'}
              {activeTab === 'forms_hub' && 'ศูนย์กลางแบบฟอร์ม 1 - 4 (Multi-Form Hub)'}
              {activeTab === 'attendees' && `รายชื่อผู้ลงทะเบียนเข้างาน (${totalRegistrations} ท่าน)`}
              {activeTab === 'slips' && `คลังตรวจสอบสลิปการโอนเงิน (${totalSlips} สลิป)`}
              {activeTab === 'cloud' && 'ตั้งค่าระบบคลาวด์ & คลังรูปภาพ (Supabase & Cloudinary)'}
              {activeTab === 'members' && 'จัดการสังกัด & บัญชีรายชื่อสมาชิก (Google Sheets Style)'}
              {activeTab === 'themes' && 'สตูดิโอปรับแต่งธีม & โทนสีแบบฟอร์ม (Per-Form Theme Studio)'}
              {activeTab === 'roles' && 'จัดการสิทธิ์ผู้ดูแลระบบ (Role-Based Admin Users)'}
              {activeTab === 'design' && 'ตั้งค่ารูปภาพหน้าปก & บัญชี Cloudinary'}
            </h2>
          </div>

          <div className="flex items-center space-x-2 shrink-0 flex-wrap gap-y-2">
            {onForceSyncCloud && (
              <button
                type="button"
                onClick={onForceSyncCloud}
                className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-all hover:scale-105"
                title="ซิงค์ข้อมูลล่าสุดจาก Supabase Cloud และล้างข้อมูลจำลอง"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>🔄 ซิงค์ Cloud</span>
              </button>
            )}

            {onResetAllRegistrations && (
              <button
                type="button"
                onClick={() => setIsClearSecurityOpen(true)}
                className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-rose-950/90 to-red-950/80 hover:from-rose-900 hover:to-red-900 text-rose-200 hover:text-white border border-rose-500/50 hover:border-rose-400 shadow-md shadow-rose-950/50 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                title="ระบบความปลอดภัย: เคลียร์ข้อมูล (ลบรูปหลังจบงาน / ล้างข้อมูลลงทะเบียน)"
              >
                <span>⛔ Clear</span>
              </button>
            )}

            {onGoToCheckIn && (
              <button
                type="button"
                onClick={onGoToCheckIn}
                className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-all hover:scale-105"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>🎟️ ลงทะเบียนเข้างาน</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                if (onSwitchToForm) onSwitchToForm();
                else if (onViewForm) onViewForm('form_1_sme_event');
              }}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm transition-all hover:scale-105"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>เปิดดูหน้าฟอร์ม</span>
            </button>

            {onBackToPortal && (
              <button
                type="button"
                onClick={onBackToPortal}
                className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all"
              >
                <span>🏢 ศูนย์ Owner</span>
              </button>
            )}

            {onOpenGoogleSheetsModal && (
              <button
                type="button"
                onClick={onOpenGoogleSheetsModal}
                className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-all"
              >
                <Database className="w-3.5 h-3.5 text-emerald-600" />
                <span>Google Sheets</span>
              </button>
            )}
          </div>
        </div>

        {/* ---------------------------------------------------- */}
        {/* TAB 1: OVERVIEW & STATS (White Theme)                */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Top 4 Stat Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1.5">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs font-medium">ผู้ลงทะเบียนทั้งหมด</span>
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-extrabold text-slate-900">{totalRegistrations}</div>
                <div className="text-xs text-indigo-600 font-semibold">
                  สมาชิก {memberCount} | แขก {guestCount}
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1.5">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs font-medium">ยอดเงินโอนเข้าบัญชี</span>
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-extrabold text-amber-600">฿{totalRevenue.toLocaleString()}</div>
                <div className="text-xs text-slate-500">
                  ตรวจสอบแล้ว {totalSlips} รายการ
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1.5">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs font-medium">ยอดจองเสื้อที่ระลึก</span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Shirt className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-extrabold text-emerald-700">{shirtCount} ตัว</div>
                <div className="text-xs text-emerald-600 font-semibold">
                  โควตาสนามละ 15 ตัว
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1.5">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs font-medium">สังกัดสนามที่เข้าร่วม</span>
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Database className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-extrabold text-slate-900">{(eventConfig?.clubs || []).length} สนาม</div>
                <div className="text-xs text-slate-500">
                  สมาชิกทั้งหมด {(eventConfig?.members || []).length} คน
                </div>
              </div>
            </div>

            {/* Quick Actions to Multi-Form Hub */}
            <div className="p-6 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-white border border-amber-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500 text-slate-950">
                    ฟังก์ชันใหม่
                  </span>
                  <h3 className="text-base font-bold text-slate-900">
                    ระบบศูนย์กลางแบบฟอร์ม 1 - 4 (Multi-Form Hub)
                  </h3>
                </div>
                <p className="text-xs text-slate-600">
                  ท่านสามารถเลือกเปิดดูหน้าฟอร์มจริง ปรับแต่งสีและธีมของแบบฟอร์มที่ 1, 2, 3, 4 ได้อย่างอิสระ
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('forms_hub')}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-sm flex items-center space-x-2 shrink-0 transition-all hover:scale-105"
              >
                <Layers className="w-4 h-4 text-amber-400" />
                <span>ไปที่ศูนย์กลางแบบฟอร์ม</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Registration Schedule Manager Card */}
            {(() => {
              const currentSchedule = eventConfig?.registrationSchedule || {
                mode: 'auto',
                openDateTime: '2026-11-05T09:09',
                closeDateTime: '2026-12-15T22:00',
                upcomingMessage: 'ระบบจะเปิดรับลงทะเบียนในวันที่ 5 พฤศจิกายน 2569 เวลา 09:09 น.',
                closedMessage: 'ระบบปิดรับลงทะเบียนเรียบร้อยแล้ว ขอขอบคุณทุกท่านที่ให้ความสนใจ'
              };
              const currentStatus = getScheduleStatus(currentSchedule);

              const handleUpdateSchedule = (key, value) => {
                setEventConfig(prev => ({
                  ...prev,
                  registrationSchedule: {
                    ...(prev.registrationSchedule || currentSchedule),
                    [key]: value
                  }
                }));
              };

              return (
                <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center">
                        <Clock className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="text-base font-extrabold text-slate-900">
                            ⏰ ตั้งค่ากำหนดการเปิด-ปิดรับลงทะเบียนออนไลน์
                          </h3>
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${currentStatus.badgeClass}`}>
                            {currentStatus.label}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          กำหนดวันเวลาเปิด-ปิดรับสมัคร พร้อมระบบนาฬิกานับถอยหลัง Real-time บนหน้าแบบฟอร์ม
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (onSwitchToForm) onSwitchToForm();
                      }}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center space-x-1.5 transition-all self-start sm:self-auto"
                    >
                      <Eye className="w-3.5 h-3.5 text-amber-500" />
                      <span>ดูตัวอย่างหน้าฟอร์ม</span>
                    </button>
                  </div>

                  {/* Mode Selector */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 block">
                      เลือกโหมดการเปิด-ปิดรับลงทะเบียน:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {/* Option 1: Auto */}
                      <div
                        onClick={() => handleUpdateSchedule('mode', 'auto')}
                        className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                          (currentSchedule.mode || 'auto') === 'auto'
                            ? 'bg-amber-500/10 border-amber-500 text-slate-900 shadow-sm'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs flex items-center space-x-1.5">
                            <span>⏱️ อัตโนมัติตามวันเวลา</span>
                          </span>
                          <input
                            type="radio"
                            name="scheduleMode"
                            checked={(currentSchedule.mode || 'auto') === 'auto'}
                            onChange={() => handleUpdateSchedule('mode', 'auto')}
                            className="text-amber-500"
                          />
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">
                          เปิดและปิดตามวัน-เวลาที่กำหนด พร้อมนาฬิกานับถอยหลัง
                        </p>
                      </div>

                      {/* Option 2: Always Open */}
                      <div
                        onClick={() => handleUpdateSchedule('mode', 'always_open')}
                        className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                          currentSchedule.mode === 'always_open'
                            ? 'bg-emerald-500/10 border-emerald-500 text-slate-900 shadow-sm'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs flex items-center space-x-1.5 text-emerald-700">
                            <span>🟢 เปิดตลอดเวลา</span>
                          </span>
                          <input
                            type="radio"
                            name="scheduleMode"
                            checked={currentSchedule.mode === 'always_open'}
                            onChange={() => handleUpdateSchedule('mode', 'always_open')}
                            className="text-emerald-500"
                          />
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">
                          เปิดรับลงทะเบียนทันที ไม่จำกัดเวลา
                        </p>
                      </div>

                      {/* Option 3: Closed */}
                      <div
                        onClick={() => handleUpdateSchedule('mode', 'closed')}
                        className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                          currentSchedule.mode === 'closed'
                            ? 'bg-rose-500/10 border-rose-500 text-slate-900 shadow-sm'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs flex items-center space-x-1.5 text-rose-700">
                            <span>🔒 ปิดรับชั่วคราว</span>
                          </span>
                          <input
                            type="radio"
                            name="scheduleMode"
                            checked={currentSchedule.mode === 'closed'}
                            onChange={() => handleUpdateSchedule('mode', 'closed')}
                            className="text-rose-500"
                          />
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">
                          ปิดระบบรับสมัครทันที ป้องกันการกรอกข้อมูล
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Datetime Pickers (Only in Auto mode) */}
                  {(currentSchedule.mode || 'auto') === 'auto' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                      {/* Open DateTime */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span>วันและเวลาเริ่มเปิดรับลงทะเบียน:</span>
                        </label>
                        <input
                          type="datetime-local"
                          value={currentSchedule.openDateTime || '2026-11-05T09:09'}
                          onChange={(e) => handleUpdateSchedule('openDateTime', e.target.value)}
                          className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                        />
                        <div className="text-[11px] text-slate-500 font-medium pt-0.5">
                          📅 {formatThaiScheduleDateTime(currentSchedule.openDateTime || '2026-11-05T09:09')}
                        </div>
                      </div>

                      {/* Close DateTime */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                          <span className="w-2 h-2 rounded-full bg-rose-500" />
                          <span>วันและเวลาปิดรับลงทะเบียน:</span>
                        </label>
                        <input
                          type="datetime-local"
                          value={currentSchedule.closeDateTime || '2026-12-15T22:00'}
                          onChange={(e) => handleUpdateSchedule('closeDateTime', e.target.value)}
                          className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                        />
                        <div className="text-[11px] text-slate-500 font-medium pt-0.5">
                          📅 {formatThaiScheduleDateTime(currentSchedule.closeDateTime || '2026-12-15T22:00')}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ========================================================================= */}
                  {/* ตารางตั้งค่าคำนวณจำนวนคน (Capacity & Seats Limit Table) ใต้กำหนดการ            */}
                  {/* ========================================================================= */}
                  {(() => {
                    const currentMaxSeats = Number(currentSchedule.maxSeats ?? 70);
                    const currentEnableLimit = currentSchedule.enableCapacityLimit !== false;
                    const currentRemainingSeats = Math.max(0, currentMaxSeats - totalRegistrations);
                    const currentPercent = currentMaxSeats > 0 ? Math.min(100, Math.round((totalRegistrations / currentMaxSeats) * 100)) : 0;

                    return (
                      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-cyan-50/70 via-slate-50 to-amber-50/40 border-2 border-cyan-500/30 space-y-4">
                        
                        {/* Header of Capacity Table */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-cyan-200/60">
                          <div className="flex items-center space-x-2.5">
                            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-700 flex items-center justify-center">
                              <Users className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <h4 className="text-sm font-extrabold text-slate-900">
                                  👥 ตารางตั้งค่าโควตาจำนวนผู้เข้าร่วมงาน (จำกัดจำนวนคน)
                                </h4>
                                <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-cyan-100 text-cyan-800 border border-cyan-300">
                                  เป้าหมาย {currentMaxSeats} ท่าน
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500">
                                กำหนดจำนวนคนที่เปิดรับสมัคร เพื่อคำนวณและแสดงป้ายจำนวนที่นั่งคงเหลือคู่กับเวลานับถอยหลัง
                              </p>
                            </div>
                          </div>

                          {/* Enable/Disable Limit Switch */}
                          <label className="flex items-center space-x-2 text-xs font-bold text-slate-700 cursor-pointer self-start sm:self-auto bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs hover:border-cyan-400">
                            <input
                              type="checkbox"
                              checked={currentEnableLimit}
                              onChange={(e) => handleUpdateSchedule('enableCapacityLimit', e.target.checked)}
                              className="w-4 h-4 text-cyan-600 rounded focus:ring-cyan-500"
                            />
                            <span>เปิดใช้งานการจำกัดจำนวน</span>
                          </label>
                        </div>

                        {/* Table View of Capacity Setting */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="border-b border-slate-200/80 text-slate-600 font-bold">
                                <th className="pb-2 px-2">จำนวนเปิดรับสูงสุด (แอดมินกำหนด)</th>
                                <th className="pb-2 px-2 text-center">ลงทะเบียนแล้ว</th>
                                <th className="pb-2 px-2 text-center">ที่นั่งว่างคงเหลือ</th>
                                <th className="pb-2 px-2 text-center">สถานะความจุ</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium">
                              <tr className="bg-white/80 rounded-xl">
                                {/* Column 1: Max Seats Controls */}
                                <td className="py-3 px-2">
                                  <div className="space-y-2">
                                    <div className="flex items-center space-x-1.5">
                                      <button
                                        type="button"
                                        onClick={() => handleUpdateSchedule('maxSeats', Math.max(1, currentMaxSeats - 5))}
                                        className="px-2 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all"
                                        title="ลด 5 คน"
                                      >
                                        -5
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleUpdateSchedule('maxSeats', Math.max(1, currentMaxSeats - 1))}
                                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-all"
                                        title="ลด 1 คน"
                                      >
                                        <Minus className="w-3.5 h-3.5" />
                                      </button>
                                      <div className="relative">
                                        <input
                                          type="number"
                                          min="1"
                                          max="999"
                                          value={currentMaxSeats}
                                          onChange={(e) => handleUpdateSchedule('maxSeats', Math.max(1, parseInt(e.target.value) || 1))}
                                          className="w-20 text-center font-black text-sm px-2 py-1.5 rounded-xl border-2 border-cyan-500 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                                        />
                                        <span className="text-[10px] text-slate-400 absolute right-2 top-2 pointer-events-none">ท่าน</span>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => handleUpdateSchedule('maxSeats', currentMaxSeats + 1)}
                                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-all"
                                        title="เพิ่ม 1 คน"
                                      >
                                        <Plus className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleUpdateSchedule('maxSeats', currentMaxSeats + 5)}
                                        className="px-2 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all"
                                        title="เพิ่ม 5 คน"
                                      >
                                        +5
                                      </button>
                                    </div>

                                    {/* Quick Presets */}
                                    <div className="flex items-center space-x-1.5 text-[11px]">
                                      <span className="text-slate-400">ลัด:</span>
                                      {[50, 70, 80, 100].map(preset => (
                                        <button
                                          key={preset}
                                          type="button"
                                          onClick={() => handleUpdateSchedule('maxSeats', preset)}
                                          className={`px-2 py-0.5 rounded-md font-bold transition-all ${
                                            currentMaxSeats === preset
                                              ? 'bg-cyan-600 text-white shadow-xs'
                                              : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                                          }`}
                                        >
                                          {preset} ท่าน
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                </td>

                                {/* Column 2: Total Registrations */}
                                <td className="py-3 px-2 text-center align-middle">
                                  <span className="font-mono text-base font-extrabold text-slate-800">
                                    {totalRegistrations}
                                  </span>
                                  <span className="text-xs text-slate-500 ml-1">ท่าน</span>
                                </td>

                                {/* Column 3: Remaining Seats */}
                                <td className="py-3 px-2 text-center align-middle">
                                  <div className="inline-flex flex-col items-center">
                                    <span className={`font-mono text-base font-black px-2.5 py-0.5 rounded-lg ${
                                      currentRemainingSeats <= 0
                                        ? 'bg-rose-100 text-rose-700'
                                        : currentRemainingSeats <= 10
                                        ? 'bg-amber-100 text-amber-800'
                                        : 'bg-cyan-100 text-cyan-800'
                                    }`}>
                                      {currentRemainingSeats <= 0 ? 'เต็มแล้ว (0)' : `${currentRemainingSeats} ท่าน`}
                                    </span>
                                    <div className="w-24 h-1.5 rounded-full bg-slate-200 mt-1.5 overflow-hidden">
                                      <div
                                        className={`h-full rounded-full transition-all duration-500 ${
                                          currentRemainingSeats <= 0 ? 'bg-rose-500' : 'bg-cyan-500'
                                        }`}
                                        style={{ width: `${currentPercent}%` }}
                                      />
                                    </div>
                                    <span className="text-[10px] text-slate-400 mt-0.5 font-mono">{currentPercent}% เต็ม</span>
                                  </div>
                                </td>

                                {/* Column 4: Quota Status */}
                                <td className="py-3 px-2 text-center align-middle">
                                  {currentRemainingSeats <= 0 ? (
                                    <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-700 border border-rose-200">
                                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                                      <span>โควตาเต็มแล้ว</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-700 border border-emerald-200">
                                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                      <span>เปิดรับปกติ</span>
                                    </span>
                                  )}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        {/* Live Preview of Twin Badges (สิ่งที่ผู้ใช้เห็นบนหน้าแรก) */}
                        <div className="pt-2 border-t border-cyan-200/50">
                          <div className="text-[11px] font-bold text-slate-600 mb-2 flex items-center space-x-1.5">
                            <Eye className="w-3.5 h-3.5 text-cyan-600" />
                            <span>ตัวอย่างป้ายคู่ที่แสดงบนหน้าแรก (ขนาดเท่ากัน ติดกัน ใช้คนละสี):</span>
                          </div>
                          
                          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-center gap-2 max-w-lg mx-auto shadow-inner">
                            {/* Preview Badge 1: Time */}
                            <div className="flex-1 w-full flex items-center justify-center font-mono text-xs font-black text-amber-300 bg-slate-900/90 px-3 py-2 rounded-xl border border-amber-500/40 min-h-[42px]">
                              <div className="w-[220px] flex items-center space-x-1.5 text-left">
                                <Clock className="w-4 h-4 text-amber-400 animate-spin-slow shrink-0" />
                                <span className="text-slate-300 font-bold shrink-0">เหลืออีก</span>
                                <span className="text-white font-extrabold">39 วัน </span>
                                <span className="text-amber-200">13:39:23</span>
                              </div>
                            </div>

                            {/* Preview Badge 2: Quota */}
                            <div className={`flex-1 w-full flex items-center justify-center font-mono text-xs font-black px-3 py-2 rounded-xl border min-h-[42px] ${
                              currentRemainingSeats <= 0
                                ? 'bg-rose-950/70 border-rose-500/50 text-rose-300'
                                : 'bg-slate-900/90 border-cyan-500/40 text-cyan-300'
                            }`}>
                              <div className="w-[220px] flex items-center space-x-1.5 text-left">
                                <User className={`w-4 h-4 shrink-0 ${currentRemainingSeats <= 0 ? 'text-rose-400' : 'text-cyan-400'}`} />
                                {currentRemainingSeats <= 0 ? (
                                  <span className="text-rose-300 font-black">ที่นั่งเต็มแล้ว ({currentMaxSeats} ท่าน)</span>
                                ) : (
                                  <>
                                    <span className="text-slate-300 font-bold shrink-0">เหลืออีก</span>
                                    <span className="text-white font-black text-sm px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-200 shrink-0">
                                      {currentRemainingSeats}
                                    </span>
                                    <span className="text-slate-300 font-bold truncate">ท่านสุดท้าย</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                      </div>
                    );
                  })()}

                  {/* Status Summary Banner */}
                  <div className="p-3.5 rounded-xl bg-slate-900 text-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                    <div className="flex items-center space-x-2.5 text-center sm:text-left">
                      <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                      <div>
                        <span className="font-bold text-white">สิ่งที่ผู้ใช้เห็นขณะนี้: </span>
                        <span className="text-slate-300">
                          {currentStatus.status === 'UPCOMING' && `⏳ หน้านับถอยหลังรอเปิดระบบ (จะเปิดในวันที่ ${formatThaiScheduleDateTime(currentSchedule.openDateTime)})`}
                          {currentStatus.status === 'OPEN' && `🟢 หน้าแบบฟอร์มเปิดให้ลงทะเบียนปกติ ${currentStatus.formattedCloseDate ? `(ปิดรับ ${currentStatus.formattedCloseDate})` : ''} • โควตารับ ${Number(currentSchedule.maxSeats ?? 70)} ท่าน (เหลือ ${Math.max(0, Number(currentSchedule.maxSeats ?? 70) - totalRegistrations)} ท่าน)`}
                          {currentStatus.status === 'CLOSED' && `🔒 หน้าแจ้งเตือนปิดรับลงทะเบียนแล้ว`}
                        </span>
                      </div>
                    </div>
                    <span className="text-[11px] px-2 py-1 rounded bg-slate-800 border border-slate-700 text-amber-300 font-mono shrink-0">
                      ☁️ ซิงค์ Cloud ทันที
                    </span>
                  </div>

                </div>
              );
            })()}

            {/* LINE OA Notification Quick Status Bar in Overview */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center shrink-0">
                  <MessageSquare className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h4 className="text-xs font-extrabold text-slate-900">
                      ระบบแจ้งเตือนเข้ากลุ่ม LINE OA (SME FAN สงสพัท OA)
                    </h4>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      eventConfig?.lineConfig?.enabled && eventConfig?.lineConfig?.groupId
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {eventConfig?.lineConfig?.enabled && eventConfig?.lineConfig?.groupId
                        ? '🟢 พร้อมแจ้งเตือนกลุ่ม'
                        : (eventConfig?.lineConfig?.enabled ? '🟡 ยังไม่ได้ระบุ Group ID' : '⚪ ปิดแจ้งเตือน')}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    แจ้งเตือนเข้ากลุ่มอัตโนมัติเฉพาะผู้ลงทะเบียนใหม่ • Token พร้อมใช้งาน
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('cloud')}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center space-x-1.5 transition-all self-start sm:self-auto shrink-0"
              >
                <Settings className="w-3.5 h-3.5 text-slate-500" />
                <span>ตั้งค่า LINE OA</span>
              </button>
            </div>

            {/* Club Distribution & Status Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Club Distribution Card */}
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center justify-between">
                  <span>สัดส่วนผู้ลงทะเบียนตามสังกัดสนาม</span>
                  <span className="text-xs text-slate-500">รวม {totalRegistrations} คน</span>
                </h3>

                <div className="space-y-3">
                  {(eventConfig?.clubs || []).map(club => {
                    const count = registrations.filter(r => r.club === club).length;
                    const pct = totalRegistrations > 0 ? Math.round((count / totalRegistrations) * 100) : 0;
                    return (
                      <div key={club} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-700">⛳ สนาม {club}</span>
                          <span className="font-mono text-slate-500">{count} ท่าน ({pct}%)</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div 
                            className="h-full rounded-full bg-amber-500 transition-all duration-500" 
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bank & Financial Verification Card */}
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center justify-between">
                  <span>ข้อมูลบัญชีรับโอนเงินและระบบตรวจสอบสลิป</span>
                  <span className="text-xs text-emerald-600 font-semibold">✓ บัญชีพร้อมรับโอน</span>
                </h3>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">ธนาคาร:</span>
                    <span className="font-bold text-slate-800">{eventConfig.bankInfo?.bankName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">เลขที่บัญชี:</span>
                    <span className="font-mono font-bold text-amber-700">{eventConfig.bankInfo?.accountNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">ชื่อบัญชี:</span>
                    <span className="font-semibold text-slate-800">{eventConfig.bankInfo?.accountName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">พร้อมเพย์:</span>
                    <span className="font-mono font-bold text-slate-800">{eventConfig.bankInfo?.promptPayNumber}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 text-xs">
                  <span className="text-slate-500">คลังสลิปบันทึกและตรวจสอบแล้ว:</span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('slips')}
                    className="font-bold text-amber-600 hover:text-amber-700 flex items-center space-x-1"
                  >
                    <span>เปิดดูคลังสลิป ({totalSlips})</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB 2: MULTI-FORM HUB (Forms 1, 2, 3, 4)             */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'forms_hub' && (
          <div className="space-y-6">
            
            {/* Header info banner */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center space-x-2">
                  <Layers className="w-5 h-5 text-amber-500" />
                  <span>ศูนย์กลางจัดการแบบฟอร์ม 1, 2, 3, 4 (Multi-Form Hub)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  ระบบรองรับแบบฟอร์มลงทะเบียนและแบบสอบถามทั้งหมด 4 รูปแบบ สามารถกดดูหน้าฟอร์มจริง ปรับแต่งสี และดูผลการตอบได้ทีละอัน
                </p>
              </div>

              {copiedLink && (
                <div className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 animate-pulse">
                  ✓ คัดลอกลิงก์แบบฟอร์มเรียบร้อยแล้ว!
                </div>
              )}
            </div>

            {/* Forms 1, 2, 3, 4 Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {(formsList || []).map((form) => {
                const isForm1 = form.id === 'form_1_sme_event';
                const responseCount = isForm1 ? registrations.length : (form.responses?.length || 0);
                const theme = isForm1 
                  ? {
                      cardMode: eventConfig.cardMode || 'dark',
                      themeColor: eventConfig.themeColor || '#f59e0b',
                      themeGradient: eventConfig.themeGradient,
                      themeTextColor: eventConfig.themeTextColor
                    }
                  : (form.theme || {});

                const cardModeLabel = theme.cardMode === 'white' 
                  ? '☀️ โทนขาวสว่าง' 
                  : theme.cardMode === 'glass' 
                    ? '✨ กลาสมอร์ฟิซึม' 
                    : '🌙 โทนดำหรูหรา';

                return (
                  <div 
                    key={form.id}
                    className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="w-7 h-7 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-extrabold text-xs">
                            {form.formNumber}
                          </span>
                          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                            {form.category || 'แบบฟอร์ม'}
                          </span>
                        </div>

                        <span className="text-[11px] font-semibold text-emerald-600 flex items-center space-x-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                          <span>เปิดรับคำตอบ</span>
                        </span>
                      </div>

                      <div>
                        <h4 className="text-base font-extrabold text-slate-900 leading-snug">
                          {form.title}
                        </h4>
                        <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                          {form.description}
                        </p>
                      </div>

                      {/* Theme & Style Indicator */}
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2">
                          <div 
                            className="w-4 h-4 rounded-full shadow-sm shrink-0 border border-white"
                            style={{ background: theme.themeGradient || theme.themeColor || '#f59e0b' }}
                          />
                          <span className="font-semibold text-slate-700">สไตล์: {cardModeLabel}</span>
                        </div>

                        <div className="font-bold text-slate-800">
                          คำตอบ: <span className="text-amber-600 font-mono text-sm">{responseCount}</span> ชุด
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-2 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {/* Live Form View Button */}
                      <button
                        type="button"
                        onClick={() => {
                          if (isForm1) {
                            if (onSwitchToForm) onSwitchToForm();
                            else if (onViewForm) onViewForm(form.id);
                          } else {
                            if (onViewForm) onViewForm(form.id);
                          }
                        }}
                        className="flex items-center justify-center space-x-1 px-3 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm transition-all hover:scale-105"
                        title="เปิดดูหน้าฟอร์มจริง"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>ดูฟอร์ม</span>
                      </button>

                      {/* Customize Theme Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setThemeStudioTargetFormId(form.id);
                          setActiveTab('themes');
                        }}
                        className="flex items-center justify-center space-x-1 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-all"
                        title="ปรับแต่งสีและธีมฟอร์มนี้"
                      >
                        <Palette className="w-3.5 h-3.5 text-amber-500" />
                        <span>ปรับสี</span>
                      </button>

                      {/* View Responses Button */}
                      <button
                        type="button"
                        onClick={() => {
                          if (isForm1) {
                            setActiveTab('attendees');
                          } else {
                            setViewingResponsesFormId(form.id);
                          }
                        }}
                        className="flex items-center justify-center space-x-1 px-3 py-2 rounded-xl text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-all"
                        title="ดูข้อมูลคำตอบ"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>คำตอบ ({responseCount})</span>
                      </button>

                      {/* Copy Share Link */}
                      <button
                        type="button"
                        onClick={() => handleCopyFormLink(form.id)}
                        className="flex items-center justify-center space-x-1 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all"
                        title="คัดลอกลิงก์ฟอร์มนี้"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>คัดลอก</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Response Detail Viewer Modal / Section */}
            {viewingResponsesFormId && activeViewingForm && (
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-lg space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-5 h-5 text-indigo-600" />
                    <div>
                      <h4 className="text-base font-extrabold text-slate-900">
                        ผลการตอบแบบฟอร์มที่ {activeViewingForm.formNumber}: {activeViewingForm.title}
                      </h4>
                      <p className="text-xs text-slate-500">
                        มีข้อมูลการตอบทั้งหมด {activeViewingForm.responses?.length || 0} รายการ
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setViewingResponsesFormId(null)}
                    className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Responses Table */}
                {(activeViewingForm.responses || []).length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    ยังไม่มีข้อมูลการส่งคำตอบสำหรับแบบฟอร์มนี้
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                        <tr>
                          <th className="p-3">ลำดับ</th>
                          <th className="p-3">เวลาที่ส่ง</th>
                          {activeViewingForm.fields?.map(f => (
                            <th key={f.id} className="p-3 min-w-[140px] truncate">{f.label}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {activeViewingForm.responses.map((resp, idx) => (
                          <tr key={resp.id || idx} className="hover:bg-slate-50/70">
                            <td className="p-3 font-mono font-bold">{idx + 1}</td>
                            <td className="p-3 text-slate-500 font-mono">{resp.submittedAt}</td>
                            {activeViewingForm.fields?.map(f => {
                              const val = resp[f.id];
                              let displayVal = val;
                              if (Array.isArray(val)) displayVal = val.join(', ');
                              if (val === undefined || val === null || val === '') displayVal = '-';
                              return (
                                <td key={f.id} className="p-3 max-w-xs truncate">
                                  {f.type === 'rating' ? `⭐ ${val} / 5` : String(displayVal)}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB 3: ATTENDEES TABLE (White Theme)                 */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'attendees' && (
          <div className="space-y-4">
            {/* Filter Toolbar */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {/* Search */}
                <div className="relative min-w-[200px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchAttendee}
                    onChange={(e) => setSearchAttendee(e.target.value)}
                    placeholder="ค้นหาชื่อ, รหัส, เบอร์..."
                    className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Club Filter */}
                <select
                  value={filterClub}
                  onChange={(e) => setFilterClub(e.target.value)}
                  className="px-3 py-1.5 rounded-xl text-xs bg-slate-50 border border-slate-300 text-slate-800 focus:outline-none"
                >
                  <option value="all">ทุกสังกัดสนาม</option>
                  {eventConfig.clubs.map(c => (
                    <option key={c} value={c}>สนาม {c}</option>
                  ))}
                </select>

                {/* Reg Type Filter */}
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-3 py-1.5 rounded-xl text-xs bg-slate-50 border border-slate-300 text-slate-800 focus:outline-none"
                >
                  <option value="all">ทุกประเภทผู้เข้าร่วม</option>
                  <option value="member">สมาชิก</option>
                  <option value="guest">แขกผู้มีเกียรติ</option>
                </select>
              </div>

              <div className="flex items-center space-x-3">
                <div className="text-xs text-slate-500 font-semibold">
                  พบข้อมูล {filteredAttendees.length} จากทั้งหมด {totalRegistrations} ท่าน
                </div>
                <button
                  type="button"
                  onClick={() => setIsAdminScannerOpen(true)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm flex items-center space-x-1.5 transition-all"
                  title="เปิดกล้องสแกน QR Code / บาร์โค้ด บนบัตรผู้เข้าร่วมงาน"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>📷 สแกนเนอร์บัตรเข้างาน</span>
                </button>
              </div>
            </div>

            {/* Attendees Table */}
            <div className="overflow-x-auto rounded-2xl bg-white border border-slate-200 shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">รหัสบัตร</th>
                    <th className="p-3.5">วัน-เวลาลงทะเบียน</th>
                    <th className="p-3.5">ชื่อ - นามสกุล</th>
                    <th className="p-3.5">สังกัดสนาม</th>
                    <th className="p-3.5">ประเภท</th>
                    <th className="p-3.5">เบอร์โทรศัพท์</th>
                    <th className="p-3.5">เสื้อที่ระลึก</th>
                    <th className="p-3.5">ยอดเงิน</th>
                    <th className="p-3.5">สลิป</th>
                    <th className="p-3.5 text-center">ดาวน์โหลดบัตร</th>
                    <th className="p-3.5 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredAttendees.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="p-8 text-center text-slate-400">
                        ไม่พบข้อมูลผู้ลงทะเบียนตามเงื่อนไข
                      </td>
                    </tr>
                  ) : (
                    filteredAttendees.map((r) => (
                      <tr 
                        key={r.ticketNo} 
                        onClick={() => setAdminInspectingAttendee(r)}
                        className="cursor-pointer hover:bg-slate-50/80 transition-colors group"
                        title="คลิกเพื่อตรวจข้อมูลและสลิปธนาคาร"
                      >
                        <td className="p-3.5 font-mono font-bold text-amber-700 whitespace-nowrap">
                          {r.ticketNo}
                        </td>
                        <td className="p-3.5 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                          <div className="flex items-center space-x-1">
                            <Clock className="w-3.5 h-3.5 text-amber-600/80 shrink-0" />
                            <span>{formatThaiDisplayDateTime(r.createdAt || r.timestamp || r.slipUploadedAt)}</span>
                          </div>
                        </td>
                        <td className="p-3.5 font-bold text-slate-900">
                          <div className="flex items-center space-x-1.5 flex-wrap group-hover:text-amber-700 transition-colors">
                            {r.memberCode && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-100 text-amber-800 border border-amber-200" title="รหัสสมาชิก">
                                {r.memberCode}
                              </span>
                            )}
                            <span className="underline-offset-2 group-hover:underline">{r.name}</span>
                            {r.nickname && <span className="font-normal text-slate-500">({r.nickname})</span>}
                          </div>
                        </td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 font-medium">
                            {r.club}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            r.regType === 'member'
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}>
                            {r.regType === 'member' ? 'สมาชิก' : 'แขกผู้มีเกียรติ'}
                          </span>
                        </td>
                        <td className="p-3.5 font-mono text-slate-600 whitespace-nowrap">
                          {r.phone || '-'}
                        </td>
                        <td className="p-3.5 whitespace-nowrap">
                          {r.hasShirt ? (
                            <span className="font-semibold text-emerald-700">
                              {r.shirtSize} ({r.shirtGender})
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="p-3.5 font-mono whitespace-nowrap">
                          <span className="font-bold text-slate-800">
                            ฿{(r.paidAmount || r.amount)?.toLocaleString()}
                          </span>
                          {r.contributionAmount > 0 && (
                            <span className="block text-[10px] text-emerald-600 font-sans font-medium">
                              (สมทบ +฿{r.contributionAmount.toLocaleString()})
                            </span>
                          )}
                        </td>
                        <td className="p-3.5">
                          {r.slipUrl ? (
                            <button 
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setAdminInspectingAttendee(r);
                              }}
                              className="w-8 h-8 rounded-lg overflow-hidden border border-slate-200 block hover:scale-110 transition-transform cursor-pointer"
                              title="คลิกเพื่อตรวจสลิป"
                            >
                              <img src={r.slipUrl} alt="Slip" className="w-full h-full object-cover" />
                            </button>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        {/* Download Tracking Status */}
                        <td className="p-3.5 text-center whitespace-nowrap">
                          {r.downloadCount > 0 ? (
                            <div className="inline-flex flex-col items-center">
                              <span 
                                className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-sm cursor-help"
                                title={`ประวัติการดาวน์โหลดบัตร (${r.downloadCount} ครั้ง):\n${(r.downloadHistory || []).map((t, idx) => `ครั้งที่ ${idx + 1}: ${t}`).join('\n')}`}
                              >
                                📥 โหลดแล้ว {r.downloadCount} ครั้ง
                              </span>
                              {r.lastDownloadedAt && (
                                <span className="text-[10px] text-slate-400 mt-0.5 whitespace-nowrap">
                                  ล่าสุด: {r.lastDownloadedAt}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                              ⏳ ยังไม่ดาวน์โหลด
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center space-x-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setAdminInspectingAttendee(r);
                              }}
                              className="p-1.5 px-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors inline-flex items-center space-x-1 cursor-pointer font-bold text-[10px]"
                              title="เปิดดูข้อมูลที่กรอกและสลิปธนาคาร"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>ตรวจข้อมูล</span>
                            </button>

                            {isOwner && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (window.confirm(`ยืนยันการลบผู้ลงทะเบียน ${r.name} (${r.ticketNo}) ใช่หรือไม่?`)) {
                                    onDeleteRegistration(r.ticketNo);
                                  }
                                }}
                                className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-500 hover:text-rose-600 transition-colors cursor-pointer"
                                title="ลบข้อมูล"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB 4: SLIP VAULT & VERIFICATION (White Theme)       */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'slips' && (
          <div className="space-y-6">
            {/* Top Slip Vault Actions Toolbar */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <FileImage className="w-5 h-5 text-amber-500" />
                  <h3 className="text-base font-extrabold text-slate-900">
                    คลังสลิปและข้อมูลการตรวจสอบการโอนเงิน (Slip Vault)
                  </h3>
                </div>
                <p className="text-xs text-slate-500">
                  ระบบเก็บรักษาภาพสลิปสูงสุด 6 เดือน (180 วัน) พร้อมสรุปข้อมูลการโอนเงิน (วันเวลา, บัญชี, ยอดเงิน, ผู้โอน) เพื่อการเงินตรวจสอบ
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleDownloadAllSlips}
                  className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition-all hover:scale-105"
                >
                  <Download className="w-4 h-4 text-amber-400" />
                  <span>ดาวน์โหลดสลิปทั้งหมด</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsPurgeModalOpen(true)}
                  className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 transition-all shadow-sm"
                  title="ล้างรูปถ่ายและสลิปทั้งหมดหลังจบงานเพื่อประหยัดพื้นที่"
                >
                  <Trash2 className="w-4 h-4 text-rose-600" />
                  <span>ล้างรูปทั้งหมดหลังจบงาน</span>
                </button>

                {isOwner && expiredSlipsCount > 0 && (
                  <button
                    type="button"
                    onClick={onPurgeExpiredSlips}
                    className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>ล้างสลิปหมดอายุ ({expiredSlipsCount})</span>
                  </button>
                )}
              </div>
            </div>

            {/* Slips Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {registrations.filter(r => !!r.slipUrl).map((r) => {
                const s = r.slipDetails || {};
                return (
                  <div 
                    key={r.ticketNo}
                    className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between space-y-3"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div>
                        <span className="font-mono font-bold text-amber-700 text-xs">
                          {r.ticketNo}
                        </span>
                        <div className="font-bold text-slate-900 text-sm truncate">
                          {r.name}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                          ฿{(r.paidAmount || r.amount)?.toLocaleString()}
                        </span>
                        {r.contributionAmount > 0 && (
                          <div className="text-[10px] text-amber-600 font-medium mt-0.5">
                            (สมทบ +฿{r.contributionAmount.toLocaleString()})
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Slip Image */}
                    <a 
                      href={r.slipUrl} 
                      target="_blank" 
                      rel="noreferrer"
                      className="block h-48 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 group relative"
                    >
                      <img 
                        src={r.slipUrl} 
                        alt="Slip" 
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform" 
                      />
                      <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">
                        🔍 คลิกเพื่อดูรูปเต็ม
                      </div>
                    </a>

                    {/* Structured Slip Summary */}
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-500">วัน-เวลาโอน:</span>
                        <span className="font-mono font-semibold text-slate-800">
                          {s.transferDate || r.timestamp?.split(' ')[0]} {s.transferTime || ''}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">ผู้โอน:</span>
                        <span className="font-semibold text-slate-800 truncate max-w-[150px]">
                          {s.senderName || r.name}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">เข้าบัญชี:</span>
                        <span className="font-semibold text-slate-800 truncate max-w-[150px]">
                          {s.receiverAccount || 'กองทุนกิจกรรม SME FAN'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">รหัสอ้างอิง:</span>
                        <span className="font-mono text-slate-600 truncate max-w-[150px]">
                          {s.refNo || r.ticketNo}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-1 text-xs">
                      <span className="text-[11px] text-slate-400">
                        หมดอายุ: {r.slipExpiresAt || '6 เดือน'}
                      </span>
                      {onDeleteSlip && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`ยืนยันการลบรูปสลิปของ ${r.ticketNo} ใช่หรือไม่?`)) {
                              onDeleteSlip(r.ticketNo);
                            }
                          }}
                          className="text-rose-500 hover:text-rose-600 font-semibold"
                        >
                          ลบรูปนี้
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB: CLOUD INFRASTRUCTURE & STORAGE (Supabase/Cloudinary) */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'cloud' && (
          <div className="space-y-6">
            
            {/* Header Banner */}
            <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-md border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                    <Cloud className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold text-white">
                      การเชื่อมต่อระบบคลาวด์ & คลังรูปภาพ (Production Cloud)
                    </h3>
                    <p className="text-xs text-indigo-200/80">
                      Vercel Web Hosting • Supabase PostgreSQL • Cloudinary Media Storage
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsPurgeModalOpen(true)}
                  className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 transition-all hover:scale-105"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>ล้างรูปภาพหลังจบงาน</span>
                </button>
              </div>
            </div>

            {/* Two Column Grid: Supabase & Cloudinary */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* CARD 1: Supabase Configuration */}
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between space-y-5">
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold border border-emerald-200">
                        ⚡
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-sm">
                          1. ฐานข้อมูลคลาวด์ Supabase
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Real-time Database • PostgreSQL • Instant Sync
                        </p>
                      </div>
                    </div>
                    <span className={`text-[11px] px-2.5 py-1 rounded-full font-bold border ${
                      isSupabaseConfigured()
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                        : 'bg-amber-50 text-amber-700 border-amber-300'
                    }`}>
                      {isSupabaseConfigured() ? '🟢 มีข้อมูลเชื่อมต่อ' : '⚪ ยังไม่ตั้งค่า'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    ใช้บันทึกข้อมูลการลงทะเบียน, บัตรเข้างาน, การเช็คอิน, เสื้อ, และผลคะแนนแบบ Real-time เข้าถึงได้จากทุกอุปกรณ์
                  </p>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Supabase Project URL:
                      </label>
                      <input
                        type="url"
                        value={sbConfig.url}
                        onChange={(e) => setSbConfig(prev => ({ ...prev, url: e.target.value }))}
                        placeholder="https://xxxxxxxx.supabase.co"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white text-slate-900 font-mono text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Supabase Anon Public Key:
                      </label>
                      <input
                        type="password"
                        value={sbConfig.anonKey}
                        onChange={(e) => setSbConfig(prev => ({ ...prev, anonKey: e.target.value }))}
                        placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white text-slate-900 font-mono text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {sbTestResult && (
                    <div className={`p-3 rounded-xl text-xs flex items-start space-x-2 border ${
                      sbTestResult.success 
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800' 
                        : 'bg-rose-50 border-rose-300 text-rose-800'
                    }`}>
                      {sbTestResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" /> : <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />}
                      <span className="leading-relaxed">{sbTestResult.message}</span>
                    </div>
                  )}

                  {/* Schema helper */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
                        <Database className="w-3.5 h-3.5 text-emerald-600" />
                        <span>โครงสร้างตาราง (supabase_schema.sql)</span>
                      </span>
                      <button
                        type="button"
                        onClick={handleCopySqlSchema}
                        className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center space-x-1"
                      >
                        {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedSql ? 'คัดลอกสำเร็จ!' : 'คัดลอกคำสั่ง SQL'}</span>
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      นำคำสั่ง SQL นี้ไปวางใน Supabase SQL Editor แล้วกด Run เพียงครั้งเดียว ระบบจะสร้างตารางและนโยบายความปลอดภัย RLS ให้อัตโนมัติ
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handleSaveSupabase}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-all"
                  >
                    บันทึก Supabase
                  </button>
                  <button
                    type="button"
                    disabled={isTestingSb}
                    onClick={handleTestSupabase}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition-all disabled:opacity-50"
                  >
                    {isTestingSb ? 'กำลังทดสอบ...' : 'ทดสอบการเชื่อมต่อ'}
                  </button>
                  <a
                    href="https://supabase.com/dashboard"
                    target="_blank"
                    rel="noreferrer"
                    className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all"
                    title="เปิด Supabase Dashboard"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>

                <div className="pt-2 space-y-2">
                  <button
                    type="button"
                    disabled={isSavingConfig}
                    onClick={handleSaveConfigToSupabase}
                    className="w-full py-2 rounded-xl text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 transition-all flex items-center justify-center space-x-1.5 shadow-sm disabled:opacity-50"
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-amber-600" />
                    <span>{isSavingConfig ? 'กำลังบันทึกหน้าปก...' : 'ซิงค์รูปหน้าปก & ธีมปัจจุบันขึ้น Supabase ทันที'}</span>
                  </button>

                  <button
                    type="button"
                    disabled={isSyncingAll}
                    onClick={handleSyncAllToSupabase}
                    className="w-full py-2 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 transition-all flex items-center justify-center space-x-1.5 shadow-sm disabled:opacity-50"
                  >
                    <Cloud className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{isSyncingAll ? 'กำลังส่งข้อมูลขึ้น Supabase...' : `ซิงค์ข้อมูลผู้ลงทะเบียนทั้งหมด (${registrations.length} ท่าน) ขึ้น Supabase`}</span>
                  </button>
                </div>
              </div>

              {/* CARD 2: Cloudinary Configuration */}
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between space-y-5">
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold border border-sky-200">
                        ☁️
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-sm">
                          2. คลังจัดเก็บรูปภาพ Cloudinary
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Cloud Image Hosting • Direct Unsigned Preset
                        </p>
                      </div>
                    </div>
                    <span className={`text-[11px] px-2.5 py-1 rounded-full font-bold border ${
                      isCloudinaryConfigured()
                        ? 'bg-sky-50 text-sky-700 border-sky-300'
                        : 'bg-amber-50 text-amber-700 border-amber-300'
                    }`}>
                      {isCloudinaryConfigured() ? '🟢 มีข้อมูลเชื่อมต่อ' : '⚪ ยังไม่ตั้งค่า'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    ใช้จัดเก็บรูปถ่ายผู้เข้างาน, ภาพชุดประกวด 1:1 และสลิปการโอนเงิน โดยอัปโหลดตรงจากเบราว์เซอร์ ประหยัดพื้นที่ฐานข้อมูล
                  </p>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Cloudinary Cloud Name:
                      </label>
                      <input
                        type="text"
                        value={cldConfig.cloudName}
                        onChange={(e) => setCldConfig(prev => ({ ...prev, cloudName: e.target.value }))}
                        placeholder="เช่น triplet-cloud หรือ demo"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white text-slate-900 font-mono text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Upload Preset (Unsigned):
                      </label>
                      <input
                        type="text"
                        value={cldConfig.uploadPreset}
                        onChange={(e) => setCldConfig(prev => ({ ...prev, uploadPreset: e.target.value }))}
                        placeholder="เช่น sme_fan_uploads หรือ ml_default"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white text-slate-900 font-mono text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Folder Prefix:
                      </label>
                      <input
                        type="text"
                        value={cldConfig.folderPrefix}
                        onChange={(e) => setCldConfig(prev => ({ ...prev, folderPrefix: e.target.value }))}
                        placeholder="triple_t_forms/sme_fan_2026"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white text-slate-900 font-mono text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {cldTestResult && (
                    <div className={`p-3 rounded-xl text-xs flex items-start space-x-2 border ${
                      cldTestResult.success 
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800' 
                        : 'bg-rose-50 border-rose-300 text-rose-800'
                    }`}>
                      {cldTestResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" /> : <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />}
                      <span className="leading-relaxed">{cldTestResult.message}</span>
                    </div>
                  )}

                  {/* Cloudinary hint */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 space-y-1">
                    <p className="font-bold text-slate-700">วิธีสร้าง Unsigned Preset ใน Cloudinary:</p>
                    <p>ไปที่ Settings → Upload → เพิ่ม Upload preset → เปลี่ยน Signing Mode เป็น <strong>Unsigned</strong></p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handleSaveCloudinary}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white shadow-sm transition-all"
                  >
                    บันทึก Cloudinary
                  </button>
                  <button
                    type="button"
                    disabled={isTestingCld}
                    onClick={handleTestCloudinary}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition-all disabled:opacity-50"
                  >
                    {isTestingCld ? 'กำลังทดสอบ...' : 'ทดสอบอัปโหลด 1x1'}
                  </button>
                  <a
                    href="https://console.cloudinary.com"
                    target="_blank"
                    rel="noreferrer"
                    className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all"
                    title="เปิด Cloudinary Console"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>

            </div>

            {/* CARD 3: LINE Messaging API Integration */}
            {(() => {
              const lineCfg = eventConfig?.lineConfig || {
                enabled: true,
                channelAccessToken: "XGJececS24KISZpzkTHpnTJo0f10vXRtNdOhtz3i4NMXqTmxjLk2cvGFrlsZ39KycLX4uqea82GZN1Y1wVx9bZRbQgca3shrIwViQH3pRJCVM5qyTfdTQEXGh8d8X0LVWrggMhkoIlVij0YDDLZysgdB04t89/1O/w1cDnyilFU=",
                groupId: "",
                notifyOnNewRegistration: true
              };
              const isLineActive = !!(lineCfg.enabled && lineCfg.groupId);

              return (
                <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold border border-emerald-200">
                        <MessageSquare className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="text-base font-extrabold text-slate-900">
                            3. ระบบแจ้งเตือนเข้ากลุ่ม LINE OA (LINE Messaging API)
                          </h3>
                          <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold border ${
                            isLineActive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                              : (lineCfg.enabled ? 'bg-amber-50 text-amber-700 border-amber-300' : 'bg-slate-100 text-slate-500 border-slate-300')
                          }`}>
                            {isLineActive ? '🟢 พร้อมแจ้งเตือนกลุ่ม' : (lineCfg.enabled ? '🟡 ยังไม่ได้ระบุ Group ID' : '⚪ ปิดการแจ้งเตือน')}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          ส่งข้อความแจ้งเตือนอัตโนมัติเข้ากลุ่ม LINE เมื่อมีผู้ส่งใบสมัครใหม่ (New Registrations Only)
                        </p>
                      </div>
                    </div>

                    <a
                      href="https://developers.line.biz/console/"
                      target="_blank"
                      rel="noreferrer"
                      className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center space-x-1.5 transition-all self-start sm:self-auto"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
                      <span>LINE Developers Console</span>
                    </a>
                  </div>

                  {/* Enable Switch */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-xs text-slate-800">
                        เปิดระบบแจ้งเตือนเข้ากลุ่ม LINE อัตโนมัติ
                      </div>
                      <div className="text-[11px] text-slate-500">
                        ส่งข้อมูลชื่อ เบอร์ ยอดชำระ ไซส์เสื้อ และที่นั่งคงเหลือ เข้ากลุ่ม LINE เมื่อมีผู้ส่งใบสมัครใหม่
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={lineCfg.enabled ?? true}
                        onChange={(e) => handleUpdateLineConfig('enabled', e.target.checked)}
                        className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                      />
                      <span className="ml-2 text-xs font-bold text-slate-700">
                        {lineCfg.enabled ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                      </span>
                    </label>
                  </div>

                  {/* Inputs Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Channel Access Token */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700 flex items-center space-x-1">
                          <Lock className="w-3.5 h-3.5 text-slate-400" />
                          <span>Channel Access Token (Long-lived)</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowLineToken(!showLineToken)}
                          className="text-[11px] text-slate-500 hover:text-slate-700 flex items-center space-x-1"
                        >
                          <Eye className="w-3 h-3" />
                          <span>{showLineToken ? 'ซ่อน' : 'แสดง'}</span>
                        </button>
                      </div>
                      <input
                        type={showLineToken ? "text" : "password"}
                        value={lineCfg.channelAccessToken || ""}
                        onChange={(e) => handleUpdateLineConfig('channelAccessToken', e.target.value)}
                        placeholder="วาง Channel Access Token จาก LINE Developers Console"
                        className="w-full text-xs font-mono px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                      <p className="text-[10px] text-slate-400">
                        Channel ID: 2007340782 (SME FAN สงสพัท OA)
                      </p>
                    </div>

                    {/* Group ID */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 flex items-center space-x-1">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span>รหัสกลุ่ม LINE (Group ID) <span className="text-rose-500">*</span></span>
                      </label>
                      <input
                        type="text"
                        value={lineCfg.groupId || ""}
                        onChange={(e) => handleUpdateLineConfig('groupId', e.target.value.trim())}
                        placeholder="ตัวอย่าง: Cxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                        className="w-full text-xs font-mono px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                      <p className="text-[10px] text-slate-400">
                        💡 เชิญบอทเข้ากลุ่มแล้วพิมพ์ <span className="font-mono font-bold text-emerald-600 bg-emerald-50 px-1 rounded">#id</span> ในกลุ่ม บอทจะตอบรหัสกลุ่มกลับมาครับ
                      </p>
                    </div>
                  </div>

                  {/* Actions & Test Result */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={isTestingLine}
                        onClick={handleTestLineNotify}
                        className="px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm flex items-center space-x-2 transition-all disabled:opacity-50"
                      >
                        {isTestingLine ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>กำลังส่งทดสอบ...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            <span>🧪 ทดสอบส่งเข้ากลุ่ม LINE</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        disabled={isSavingConfig}
                        onClick={handleSaveConfigToSupabase}
                        className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition-all disabled:opacity-50"
                      >
                        {isSavingConfig ? 'กำลังบันทึก...' : '💾 บันทึกการตั้งค่า LINE'}
                      </button>
                    </div>

                    {/* Webhook Copy Button */}
                    <button
                      type="button"
                      onClick={handleCopyWebhookUrl}
                      className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center space-x-1.5 transition-all"
                    >
                      {copiedWebhookUrl ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700 font-bold">คัดลอก Webhook URL แล้ว!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-500" />
                          <span>คัดลอก Webhook URL</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Test Result Message Box */}
                  {lineTestResult && (
                    <div className={`p-3 rounded-xl text-xs flex items-center space-x-2 border ${
                      lineTestResult.success
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-rose-50 border-rose-200 text-rose-800'
                    }`}>
                      {lineTestResult.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      )}
                      <span>{lineTestResult.message || lineTestResult.error}</span>
                    </div>
                  )}

                  {/* Step-by-Step LINE Setup Guide */}
                  <div className="p-4 rounded-xl bg-slate-900 text-slate-200 space-y-3 text-xs">
                    <div className="flex items-center space-x-2 text-amber-400 font-bold">
                      <Sparkles className="w-4 h-4" />
                      <span>วิธีตั้งค่าและเปิดใช้งานใน 3 ขั้นตอน (สำหรับแอดมิน):</span>
                    </div>
                    
                    <ol className="list-decimal list-inside space-y-2 text-slate-300 leading-relaxed text-[11px]">
                      <li>
                        <strong>ตั้งค่า Webhook ใน LINE Developers Console:</strong> เข้าไปที่ Channel <code className="text-amber-300 bg-slate-800 px-1 py-0.5 rounded">SME FAN สงสพัท OA</code> &gt; แท็บ <strong>Messaging API</strong> &gt; ที่หัวข้อ <strong>Webhook URL</strong> วางลิงก์ <code className="text-emerald-300 bg-slate-800 px-1 py-0.5 rounded font-mono">{typeof window !== 'undefined' ? `${window.location.origin}/api/line-webhook` : 'https://triple-t-form.vercel.app/api/line-webhook'}</code> แล้วเปิดสวิตช์ <strong>Use webhook: ON</strong>
                      </li>
                      <li>
                        <strong>เปิดให้บอทเข้ากลุ่ม LINE:</strong> ในแท็บ Messaging API เลื่อนลงมาที่ <strong>LINE Official Account features</strong> &gt; ตรวจสอบว่า <strong>Allow bot to join group chats: Enabled</strong>
                      </li>
                      <li>
                        <strong>ดึงรหัสกลุ่ม (Group ID):</strong> เชิญบอท <strong className="text-white">SME FAN สงสพัท OA</strong> เข้ากลุ่ม LINE ที่ต้องการรับแจ้งเตือน &gt; พิมพ์ <code className="text-cyan-300 font-bold bg-slate-800 px-1.5 py-0.5 rounded">#id</code> ในกลุ่ม &gt; บอทจะตอบรหัสกลุ่ม (ขึ้นต้นด้วยตัว C) &gt; นำรหัสมาวางในช่อง <strong>"รหัสกลุ่ม LINE"</strong> ด้านบน แล้วกด <strong>"บันทึกการตั้งค่า LINE"</strong>
                      </li>
                    </ol>
                  </div>

                </div>
              );
            })()}

            {/* CARD 4: Storage Purge Manager (Post-Event Photo Cleanup) */}
            <div className="p-6 rounded-2xl bg-white border-2 border-rose-200 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold border border-rose-200">
                    <Trash2 className="w-5 h-5 text-rose-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">
                      ศูนย์ล้างรูปภาพเพื่อประหยัดพื้นที่หลังจบงาน (Post-Event Photo Purge)
                    </h3>
                    <p className="text-xs text-slate-500">
                      ลบรูปภาพทั้งหมดเมื่อเสร็จสิ้นงาน โดยรักษาประวัติการลงทะเบียน ยอดเงิน และคะแนนไว้ครบ 100%
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsPurgeModalOpen(true)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/25 transition-all hover:scale-105"
                >
                  เปิดระบบลบรูปภาพทั้งหมด
                </button>
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-xs text-slate-600">
                    <Camera className="w-4 h-4 text-emerald-600" />
                    <span>ภาพถ่ายผู้เข้างาน & ประกวด:</span>
                  </div>
                  <strong className="font-mono text-sm text-slate-900">
                    {registrations.filter(r => r.photoUrl || r.costumePhoto).length} รูป
                  </strong>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-xs text-slate-600">
                    <FileImage className="w-4 h-4 text-amber-600" />
                    <span>สลิปหลักฐานโอนเงิน:</span>
                  </div>
                  <strong className="font-mono text-sm text-slate-900">
                    {registrations.filter(r => r.paymentSlip).length} สลิป
                  </strong>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-xs text-slate-600">
                    <HardDrive className="w-4 h-4 text-rose-600" />
                    <span>พื้นที่รูปภาพโดยประมาณ:</span>
                  </div>
                  <strong className="font-mono text-sm text-rose-600">
                    ~{((registrations.filter(r => r.photoUrl || r.costumePhoto || r.paymentSlip).length) * 0.25).toFixed(1)} MB
                  </strong>
                </div>
              </div>

              {/* Safety Guarantee */}
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start space-x-2">
                <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                <p className="leading-relaxed">
                  <strong>ความปลอดภัยของข้อมูล:</strong> การกดลบรูปภาพนี้จะล้างเฉพาะ URL รูปภาพในคลังเท่านั้น ข้อมูลชื่อ นามสกุล เบอร์โทร สังกัด ยอดเงินชำระ และคะแนนการประกวดของกรรมการจะไม่ได้รับผลกระทบใดๆ ทั้งสิ้น
                </p>
              </div>
            </div>

          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB 5: MEMBERS & CLUBS SPREADSHEET (White Theme)     */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'members' && (
          <div className="space-y-6">
            {/* Club Pill Switcher */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-2">
                  <Database className="w-5 h-5 text-amber-500" />
                  <h3 className="text-sm font-bold text-slate-900">
                    เลือกสังกัดสนามเพื่อจัดการรายชื่อสมาชิก:
                  </h3>
                </div>

                {/* Add New Club Inline Form */}
                <form onSubmit={handleAddClub} className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={newClubName}
                    onChange={(e) => setNewClubName(e.target.value)}
                    placeholder="+ เพิ่มสังกัดสนามใหม่..."
                    className="px-3 py-1.5 rounded-xl text-xs bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all"
                  >
                    เพิ่ม
                  </button>
                </form>
              </div>

              {/* Club Pills */}
              <div className="flex flex-wrap gap-2 pt-1">
                {eventConfig.clubs.map(club => {
                  const isSelected = activeMemberClub === club;
                  const count = eventConfig.members.filter(m => m.club === club).length;
                  return (
                    <div 
                      key={club} 
                      className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                        isSelected 
                          ? 'bg-slate-900 text-white shadow-sm ring-2 ring-slate-900/20' 
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setActiveMemberClub(club)}
                        className="flex items-center space-x-1.5"
                      >
                        <span>⛳ สนาม {club}</span>
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                          isSelected ? 'bg-amber-500 text-slate-950' : 'bg-slate-200 text-slate-600'
                        }`}>
                          {count}
                        </span>
                      </button>

                      {isOwner && eventConfig.clubs.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteClub(club)}
                          className="ml-1 text-slate-400 hover:text-rose-500 p-0.5 rounded"
                          title="ลบสนามนี้"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Embedded Google Sheets Style Spreadsheet */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <MemberSpreadsheet
                activeClub={activeMemberClub}
                initialMembers={eventConfig.members || []}
                onSaveMembers={(updatedMembers) => handleSaveSpreadsheetMembers(activeMemberClub, updatedMembers)}
                isOwner={isOwner}
              />
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB 6: PER-FORM THEME STUDIO & COLOR PICKER          */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'themes' && (
          <div className="space-y-6">
            
            {/* Form Selector Banner */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 flex items-center space-x-2">
                    <Palette className="w-5 h-5 text-amber-500" />
                    <span>สตูดิโอปรับแต่งสีและธีมแบบฟอร์ม (Per-Form Theme Studio)</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    เลือกแบบฟอร์มที่ต้องการ และปรับแต่งรูปแบบการ์ด (โทนดำ, โทนขาว, กลาสมอร์ฟิซึม) พร้อมเฉดสีสายรุ้งหรือผสมสีเอง
                  </p>
                </div>

                {/* Target Form Switcher Pills */}
                <div className="flex flex-wrap gap-1.5">
                  {(formsList || []).map(f => {
                    const isSelected = themeStudioTargetFormId === f.id;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setThemeStudioTargetFormId(f.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          isSelected
                            ? 'bg-amber-500 text-slate-950 shadow-sm'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        ฟอร์มที่ {f.formNumber}: {f.shortTitle || f.title.slice(0, 15)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 1. Base Card Mode Selector (Dark / White / Glass) */}
              <div className="pt-3 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-700 block mb-2.5">
                  1. เลือกสไตล์พื้นหลังการ์ดของแบบฟอร์ม (Card Base Mode):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Mode A: Dark Mode */}
                  <button
                    type="button"
                    onClick={() => handleUpdateFormTheme(themeStudioTargetFormId, { cardMode: 'dark' })}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      selectedThemeForm.theme?.cardMode === 'dark' || !selectedThemeForm.theme?.cardMode
                        ? 'border-slate-900 bg-slate-900 text-white shadow-md ring-2 ring-slate-900/30'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800'
                    }`}
                  >
                    <div className="text-sm font-bold flex items-center justify-between">
                      <span>🌙 โทนดำ / มืด (Dark Elegance)</span>
                      {(selectedThemeForm.theme?.cardMode === 'dark' || !selectedThemeForm.theme?.cardMode) && (
                        <CheckCircle2 className="w-4 h-4 text-amber-400" />
                      )}
                    </div>
                    <p className={`text-xs mt-1 ${selectedThemeForm.theme?.cardMode === 'dark' ? 'text-slate-300' : 'text-slate-500'}`}>
                      เหมาะกับงานราตรี งานกาล่าดินเนอร์ งานปาร์ตี้คอนเสิร์ต
                    </p>
                  </button>

                  {/* Mode B: White Mode */}
                  <button
                    type="button"
                    onClick={() => handleUpdateFormTheme(themeStudioTargetFormId, { cardMode: 'white' })}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      selectedThemeForm.theme?.cardMode === 'white'
                        ? 'border-indigo-600 bg-indigo-50/80 text-indigo-950 shadow-md ring-2 ring-indigo-500/30 font-bold'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800'
                    }`}
                  >
                    <div className="text-sm font-bold flex items-center justify-between">
                      <span>☀️ โทนขาว / สว่าง (Professional White)</span>
                      {selectedThemeForm.theme?.cardMode === 'white' && (
                        <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      สะอาดตา ดูเป็นทางการ เหมาะกับแบบสอบถามและงานสัมมนา
                    </p>
                  </button>

                  {/* Mode C: Glassmorphism */}
                  <button
                    type="button"
                    onClick={() => handleUpdateFormTheme(themeStudioTargetFormId, { cardMode: 'glass' })}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      selectedThemeForm.theme?.cardMode === 'glass'
                        ? 'border-amber-500 bg-amber-50/80 text-amber-950 shadow-md ring-2 ring-amber-500/30 font-bold'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800'
                    }`}
                  >
                    <div className="text-sm font-bold flex items-center justify-between">
                      <span>✨ กลาสมอร์ฟิซึม (Glassmorphism)</span>
                      {selectedThemeForm.theme?.cardMode === 'glass' && (
                        <CheckCircle2 className="w-4 h-4 text-amber-600" />
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      กระจกฝ้าโปร่งแสง ทันสมัย ส่องเห็นภาพพื้นหลังทะลุผ่าน
                    </p>
                  </button>
                </div>
              </div>

              {/* 2. Rainbow & Gradient Presets */}
              <div className="pt-3 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-700 block mb-2.5">
                  2. 🌈 กลุ่มสายรุ้งโฮโลแกรม & ไล่เฉดสีพิเศษ (Rainbow & Gradient Presets):
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {themePresetsList.filter(p => p.type === 'gradient').map((preset) => {
                    const isSelected = selectedThemeForm.theme?.themeGradient === preset.gradient;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleApplyPreset(preset)}
                        className={`group p-2.5 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'border-amber-500 ring-2 ring-amber-500/40 bg-amber-50/40 scale-[1.02] shadow-sm'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div 
                          className="h-9 rounded-lg mb-2 shadow-xs group-hover:scale-105 transition-transform"
                          style={{ background: preset.gradient }}
                        />
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-800 truncate">{preset.name}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Solid Colors & Custom Color Picker */}
              <div className="pt-3 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-700 block mb-2.5">
                  3. 🎨 กลุ่มสีเดี่ยว & เลือกผสมสีเองอิสระ (Solid Shades & Custom Color Picker):
                </span>
                <div className="flex flex-wrap items-center gap-2.5">
                  {themePresetsList.filter(p => p.type === 'solid').map((preset) => {
                    const isSelected = !selectedThemeForm.theme?.themeGradient && selectedThemeForm.theme?.themeColor === preset.color;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleApplyPreset(preset)}
                        className={`flex items-center space-x-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
                          isSelected
                            ? 'border-slate-800 bg-slate-100 ring-2 ring-slate-800/20 font-bold text-slate-900'
                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div 
                          className="w-3.5 h-3.5 rounded-full shadow-xs shrink-0"
                          style={{ backgroundColor: preset.color }}
                        />
                        <span>{preset.name}</span>
                      </button>
                    );
                  })}

                  {/* Visual Color Picker (HTML5) */}
                  <div className="flex items-center space-x-2 pl-3 border-l border-slate-200">
                    <span className="text-xs font-bold text-slate-600">ผสมสีเอง:</span>
                    <input
                      type="color"
                      value={selectedThemeForm.theme?.themeColor || "#f59e0b"}
                      onChange={(e) => {
                        handleUpdateFormTheme(themeStudioTargetFormId, {
                          themeColor: e.target.value,
                          themeGradient: null,
                          themeTextColor: '#ffffff'
                        });
                      }}
                      className="w-9 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                    <input
                      type="text"
                      value={selectedThemeForm.theme?.themeColor || "#f59e0b"}
                      onChange={(e) => {
                        handleUpdateFormTheme(themeStudioTargetFormId, {
                          themeColor: e.target.value,
                          themeGradient: null
                        });
                      }}
                      className="w-24 px-2 py-1 rounded-lg text-xs font-mono bg-slate-50 border border-slate-300 text-slate-800 uppercase focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* 4. Live Interactive Form Preview Card */}
              <div className="pt-4 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-700 block mb-2.5">
                  4. 👁️ ตัวอย่างหน้าตาแบบฟอร์มจริง (Real-Time Live Preview):
                </span>

                <div 
                  className="rounded-2xl p-6 sm:p-8 transition-all border shadow-lg relative overflow-hidden"
                  style={{
                    backgroundColor: selectedThemeForm.theme?.cardMode === 'white' 
                      ? '#ffffff' 
                      : selectedThemeForm.theme?.cardMode === 'glass' 
                        ? 'rgba(255, 255, 255, 0.15)' 
                        : '#0f172a',
                    color: selectedThemeForm.theme?.cardMode === 'white' ? '#0f172a' : '#ffffff',
                    borderColor: selectedThemeForm.theme?.cardMode === 'white' ? '#e2e8f0' : 'rgba(255,255,255,0.1)'
                  }}
                >
                  <div className="max-w-md mx-auto space-y-4 text-center">
                    <span 
                      className="px-3 py-1 rounded-full text-xs font-bold shadow-md inline-block"
                      style={{
                        background: selectedThemeForm.theme?.themeGradient || selectedThemeForm.theme?.themeColor || '#f59e0b',
                        color: selectedThemeForm.theme?.themeTextColor || '#0f172a'
                      }}
                    >
                      ✨ ตัวอย่างป้ายแบบฟอร์มที่ {selectedThemeForm.formNumber}
                    </span>

                    <h4 className="text-xl font-extrabold tracking-tight">
                      {selectedThemeForm.title}
                    </h4>

                    <p className={`text-xs leading-relaxed ${
                      selectedThemeForm.theme?.cardMode === 'white' ? 'text-slate-600' : 'text-slate-300'
                    }`}>
                      {selectedThemeForm.description}
                    </p>

                    <div className="pt-2 flex justify-center">
                      <button
                        type="button"
                        className="px-6 py-2.5 rounded-xl text-xs font-bold shadow-lg transition-transform hover:scale-105"
                        style={{
                          background: selectedThemeForm.theme?.themeGradient || selectedThemeForm.theme?.themeColor || '#f59e0b',
                          color: selectedThemeForm.theme?.themeTextColor || '#0f172a'
                        }}
                      >
                        ปุ่มตัวอย่าง (Primary Button)
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB 7: ROLES MANAGEMENT (Owner Only)                 */}
        {/* ---------------------------------------------------- */}
        {isOwner && activeTab === 'roles' && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-5 h-5 text-amber-500" />
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      จัดการผู้ใช้งานและสิทธิ์ผู้ดูแลระบบ (Admin Users & RBAC)
                    </h3>
                    <p className="text-xs text-slate-500">
                      เฉพาะเจ้าของระบบ (Owner) เท่านั้นที่สามารถเพิ่ม ลบ หรือแก้ไขสิทธิ์ผู้ใช้งานได้
                    </p>
                  </div>
                </div>
              </div>

              {/* Add User Form */}
              <form onSubmit={handleAddAdminUser} className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-3">
                <input
                  type="text"
                  value={newAdminName}
                  onChange={(e) => setNewAdminName(e.target.value)}
                  placeholder="ชื่อผู้ดูแล..."
                  className="px-3 py-2 rounded-xl text-xs bg-white border border-slate-300 text-slate-900 focus:outline-none"
                />
                <input
                  type="email"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  placeholder="อีเมล (Username)..."
                  className="px-3 py-2 rounded-xl text-xs bg-white border border-slate-300 text-slate-900 focus:outline-none"
                />
                <input
                  type="tel"
                  value={newAdminPhone}
                  onChange={(e) => setNewAdminPhone(e.target.value)}
                  placeholder="เบอร์โทร (Password)..."
                  className="px-3 py-2 rounded-xl text-xs bg-white border border-slate-300 text-slate-900 focus:outline-none"
                />
                <div className="flex items-center space-x-2">
                  <select
                    value={newAdminRole}
                    onChange={(e) => setNewAdminRole(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl text-xs bg-white border border-slate-300 text-slate-900 focus:outline-none"
                  >
                    <option value="admin">แอดมิน (Admin)</option>
                    <option value="manager">ผู้จัดการ (Manager)</option>
                    <option value="owner">เจ้าของ (Owner)</option>
                  </select>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all shrink-0"
                  >
                    + เพิ่ม
                  </button>
                </div>
              </form>

              {/* Users List */}
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                {(eventConfig.adminUsers || []).map((u) => (
                  <div key={u.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs">
                        {u.name?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-xs">{u.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{u.email} • {u.phone}</div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        u.role === 'owner' 
                          ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                          : u.role === 'manager' 
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' 
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}>
                        {u.role === 'owner' ? '👑 Owner' : u.role === 'manager' ? '💼 Manager' : '🛡️ Admin'}
                      </span>

                      {u.id !== 'u_owner' && (
                        <button
                          type="button"
                          onClick={() => handleDeleteAdminUser(u.id)}
                          className="p-1 rounded text-slate-400 hover:text-rose-500"
                          title="ลบสิทธิ์ผู้ใช้นี้"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB 8: DESIGN & CLOUDINARY                           */}
        {/* ---------------------------------------------------- */}
        {isManager && activeTab === 'design' && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-5">
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <ImageIcon className="w-5 h-5 text-indigo-500" />
                <span>ตั้งค่าภาพหน้าปก & ภาพพื้นหลัง (Banner & Wallpaper)</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Banner Image */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                    <span>รูปภาพหน้าปกกิจกรรม (16:9 / Banner):</span>
                    <button
                      type="button"
                      onClick={() => openCropper('banner')}
                      className="text-amber-600 hover:text-amber-700 font-bold"
                    >
                      ✂️ ครอปรูป
                    </button>
                  </div>
                  <div className="h-32 rounded-lg overflow-hidden border border-slate-200 bg-slate-200">
                    <img src={eventConfig.bannerImage} alt="Banner" className="w-full h-full object-cover" />
                  </div>
                  <input
                    type="url"
                    value={eventConfig.bannerImage}
                    onChange={(e) => setEventConfig(prev => ({ ...prev, bannerImage: e.target.value }))}
                    className="w-full px-3 py-1.5 rounded-lg text-xs bg-white border border-slate-300 text-slate-900"
                    placeholder="URL รูปภาพหน้าปก..."
                  />
                </div>

                {/* Sub-Banner for subsequent pages (50% height & shift) */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                    <span>🖼️ รูปหัวฟอร์มหน้าถัดไป (Sub-Banner ย่อ 50% ทุกหน้าถัดไป):</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={eventConfig.showSubBanner !== false}
                        onChange={(e) => setEventConfig(prev => ({ ...prev, showSubBanner: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600"></div>
                      <span className="ml-2 text-xs text-slate-600 font-medium">
                        {eventConfig.showSubBanner !== false ? 'เปิดแสดง' : 'ปิด'}
                      </span>
                    </label>
                  </div>

                  {eventConfig.showSubBanner !== false && (
                    <>
                      {/* Mode selector */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => setEventConfig(prev => ({ ...prev, subBannerMode: 'same' }))}
                          className={`py-2 px-3 rounded-lg border font-bold text-center transition-all ${
                            eventConfig.subBannerMode !== 'custom'
                              ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-sm'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          🔄 ใช้รูปเดิม (ย่อ 50%)
                        </button>
                        <button
                          type="button"
                          onClick={() => setEventConfig(prev => ({ ...prev, subBannerMode: 'custom' }))}
                          className={`py-2 px-3 rounded-lg border font-bold text-center transition-all ${
                            eventConfig.subBannerMode === 'custom'
                              ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-sm'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          ✨ อัปโหลดรูปภาพใหม่
                        </button>
                      </div>

                      {/* Mode 'same': Slider and presets */}
                      {eventConfig.subBannerMode !== 'custom' ? (
                        <div className="space-y-2 pt-1">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-600">📐 เลื่อนตำแหน่งแนวตั้งภาพ (Vertical Shift):</span>
                            <span className="font-mono font-bold text-amber-600">
                              {eventConfig.subBannerPositionY ?? 50}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={eventConfig.subBannerPositionY ?? 50}
                            onChange={(e) => setEventConfig(prev => ({ ...prev, subBannerPositionY: Number(e.target.value) }))}
                            className="w-full accent-amber-600 cursor-pointer"
                          />
                          <div className="flex items-center justify-between gap-1 pt-1">
                            <button
                              type="button"
                              onClick={() => setEventConfig(prev => ({ ...prev, subBannerPositionY: 0 }))}
                              className={`flex-1 py-1 text-[11px] rounded border transition-all ${
                                (eventConfig.subBannerPositionY ?? 50) === 0
                                  ? 'bg-amber-100 border-amber-400 font-bold text-amber-900'
                                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              🔝 ด้านบน (0%)
                            </button>
                            <button
                              type="button"
                              onClick={() => setEventConfig(prev => ({ ...prev, subBannerPositionY: 50 }))}
                              className={`flex-1 py-1 text-[11px] rounded border transition-all ${
                                (eventConfig.subBannerPositionY ?? 50) === 50
                                  ? 'bg-amber-100 border-amber-400 font-bold text-amber-900'
                                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              🎯 กึ่งกลาง (50%)
                            </button>
                            <button
                              type="button"
                              onClick={() => setEventConfig(prev => ({ ...prev, subBannerPositionY: 100 }))}
                              className={`flex-1 py-1 text-[11px] rounded border transition-all ${
                                (eventConfig.subBannerPositionY ?? 50) === 100
                                  ? 'bg-amber-100 border-amber-400 font-bold text-amber-900'
                                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              🔻 ด้านล่าง (100%)
                            </button>
                          </div>

                          {/* Live 50% Preview */}
                          <div className="pt-2">
                            <div className="text-[11px] text-slate-500 font-medium mb-1">
                              ตัวอย่างภาพหัวฟอร์มหน้า 1, 2, 3 (สูง 50% จากรูปหลัก):
                            </div>
                            <div className="h-20 rounded-lg overflow-hidden border border-slate-300 bg-slate-200 relative">
                              <img
                                src={eventConfig.bannerImage}
                                alt="Sub Banner Preview"
                                className="w-full h-full object-cover transition-all"
                                style={{ objectPosition: `center ${eventConfig.subBannerPositionY ?? 50}%` }}
                              />
                              <span className="absolute bottom-1 right-2 text-[10px] bg-slate-900/80 text-white px-2 py-0.5 rounded font-mono">
                                สูง 50% • Pos: {eventConfig.subBannerPositionY ?? 50}%
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2 pt-1">
                          <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                            <span>รูปภาพเฉพาะสำหรับหน้าถัดไป:</span>
                            <button
                              type="button"
                              onClick={() => openCropper('subBanner')}
                              className="text-amber-600 hover:text-amber-700 font-bold"
                            >
                              ✂️ ครอปรูปใหม่ (16:4)
                            </button>
                          </div>
                          <div className="h-20 rounded-lg overflow-hidden border border-slate-300 bg-slate-200">
                            {eventConfig.subBannerImage ? (
                              <img
                                src={eventConfig.subBannerImage}
                                alt="Custom Sub-Banner"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                                ยังไม่มีรูปภาพเฉพาะ (คลิกครอปรูป หรือระบุ URL ด้านล่าง)
                              </div>
                            )}
                          </div>
                          <input
                            type="url"
                            value={eventConfig.subBannerImage || ''}
                            onChange={(e) => setEventConfig(prev => ({ ...prev, subBannerImage: e.target.value }))}
                            className="w-full px-3 py-1.5 rounded-lg text-xs bg-white border border-slate-300 text-slate-900"
                            placeholder="URL รูปภาพเฉพาะหน้าถัดไป..."
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Background Wallpaper */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                    <span>รูปภาพฉากหลังฟอร์ม (Wallpaper):</span>
                    <button
                      type="button"
                      onClick={() => openCropper('background')}
                      className="text-amber-600 hover:text-amber-700 font-bold"
                    >
                      ✂️ ครอปรูป
                    </button>
                  </div>
                  <div className="h-32 rounded-lg overflow-hidden border border-slate-200 bg-slate-200">
                    <img src={eventConfig.backgroundImage} alt="Background" className="w-full h-full object-cover" />
                  </div>
                  <input
                    type="url"
                    value={eventConfig.backgroundImage}
                    onChange={(e) => setEventConfig(prev => ({ ...prev, backgroundImage: e.target.value }))}
                    className="w-full px-3 py-1.5 rounded-lg text-xs bg-white border border-slate-300 text-slate-900"
                    placeholder="URL รูปภาพพื้นหลัง..."
                  />
                </div>

                {/* T-Shirt Mockup Image */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                    <span>👕 รูปภาพตัวอย่างลายเสื้อปีใหม่ (T-Shirt Mockup):</span>
                    <button
                      type="button"
                      onClick={() => openCropper('shirtMockup')}
                      className="text-amber-600 hover:text-amber-700 font-bold"
                    >
                      ✂️ ครอป / เปลี่ยนภาพ
                    </button>
                  </div>
                  {eventConfig.shirtMockupImage && (
                    <div className="h-32 rounded-lg overflow-hidden border border-slate-200 bg-slate-200">
                      <img src={eventConfig.shirtMockupImage} alt="Shirt Mockup" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <input
                    type="url"
                    value={eventConfig.shirtMockupImage || ''}
                    onChange={(e) => setEventConfig(prev => ({ ...prev, shirtMockupImage: e.target.value }))}
                    className="w-full px-3 py-1.5 rounded-lg text-xs bg-white border border-slate-300 text-slate-900"
                    placeholder="URL รูปภาพตัวอย่างลายเสื้อ..."
                  />
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Image Cropper Modal */}
      <ImageCropperModal
        isOpen={cropperOpen}
        onClose={() => setCropperOpen(false)}
        targetField={cropperTarget}
        title={cropperTitle}
        aspectRatio={cropperAspect}
        onCropComplete={handleCropComplete}
      />

      {/* Ticket Scanner Modal */}
      {isAdminScannerOpen && (
        <TicketScannerModal
          isOpen={isAdminScannerOpen}
          onClose={() => setIsAdminScannerOpen(false)}
          registrations={registrations}
        />
      )}

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

      {/* Reset All Registrations Modal */}
      <ResetRegistrationsModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        totalRegistrations={registrations.length}
        onConfirmReset={async () => {
          if (onResetAllRegistrations) {
            await onResetAllRegistrations();
          }
        }}
      />

      {/* Attendee Details & Slip Inspection Modal */}
      <AttendeeInspectionModal
        isOpen={!!activeAdminInspectingAttendee}
        onClose={() => setAdminInspectingAttendee(null)}
        attendee={activeAdminInspectingAttendee}
        onUpdateAttendee={(updated) => {
          if (onUpdateRegistration) {
            onUpdateRegistration(updated);
          }
          setAdminInspectingAttendee(updated);
        }}
        eventConfig={eventConfig}
      />

    </div>
  );
}
