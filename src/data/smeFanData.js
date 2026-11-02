/**
 * Data store and configuration for SME FAN New Year Event Registration
 */

export const initialSmeFanConfig = {
  eventId: "sme_fan_ny_2026",
  eventTitle: "งานสังสรรค์ปีใหม่ SME FAN 2026",
  eventSubtitle: "ขอเชิญสมาชิก SME FAN และแขกผู้มีเกียรติร่วมเฉลิมฉลองค่ำคืนแห่งความสุข ส่งท้ายปีเก่าต้อนรับปีใหม่",
  eventDate: "วันเสาร์ที่ 10 มกราคม 2026 เวลา 17:30 - 22:30 น.",
  eventVenue: "ห้องบอลรูม โรงแรมแกรนด์ริชมอนด์ (Grand Richmond Hotel)",
  
  // Images
  bannerImage: "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1920&q=80",
  subBannerMode: "same", // 'same' | 'custom'
  subBannerImage: "",
  subBannerPositionY: 50, // 0 - 100% vertical offset to slide image
  showSubBanner: true,
  backgroundImage: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1920&q=80",
  shirtMockupImage: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=80",
  logoImage: "",
  
  // Styling
  cardMode: "dark", // 'dark' | 'white' | 'glass'
  themeColor: "#f59e0b",
  themeGradient: "linear-gradient(135deg, #f59e0b, #d97706, #b45309)",
  themeTextColor: "#0f172a",
  bgOverlayOpacity: 85,
  glassmorphism: true,

  // Bank Info
  bankInfo: {
    bankName: "ธนาคารกสิกรไทย (KBANK)",
    accountNumber: "045-8-99921-4",
    accountName: "กองทุนกิจกรรม SME FAN (ทีป์ชลิต ทองจันทร์)",
    promptPayNumber: "081-234-5678",
    qrImage: "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=00020101021129370016A000000677010111011300668123456785802TH53037646304"
  },

  // Pricing Rules
  pricing: {
    freeMaxAge: 6,       // 0 - 6 years: Free (0 THB)
    childMaxAge: 12,     // 6y1d - 12 years: 250 THB
    childPrice: 250,
    adultPrice: 500      // 12+ years: 500 THB
  },

  // T-Shirt Quota Rules
  shirtQuota: {
    maxQuota: 15,
    sizes: ["S", "M", "L", "XL", "2XL", "3XL"],
    genders: ["ชาย", "หญิง"]
  },

  // Cloudinary Configuration
  cloudinaryConfig: {
    cloudName: "dx2asgfo7",
    uploadPreset: "sme_fan_uploads",
    folderPrefix: "triple_t_forms/sme_fan_2026"
  },

  // Role-Based Admin Users (Email + Phone Number as Password)
  adminUsers: [
    {
      id: "u_owner",
      name: "ทีป์ชลิต ทองจันทร์",
      email: "teepchalit@smefan.com",
      phone: "081-234-5678",
      role: "owner" // 'owner' | 'manager' | 'admin'
    },
    {
      id: "u_manager",
      name: "ผู้จัดการกิจกรรม SME FAN",
      email: "manager@smefan.com",
      phone: "089-111-2233",
      role: "manager"
    },
    {
      id: "u_staff",
      name: "เจ้าหน้าที่ลงทะเบียน (Staff)",
      email: "staff@smefan.com",
      phone: "086-555-7788",
      role: "admin"
    }
  ],

  // Clubs / Fields list
  clubs: ["สงสพัท", "โรตารี่"],

  // Pre-loaded Members list per club
  members: [
    { id: "m_1", memberCode: "SME-001", club: "สงสพัท", name: "ทีป์ชลิต ทองจันทร์", nickname: "ทีป์", phone: "081-234-5678", email: "teepchalit@smefan.com" },
    { id: "m_2", memberCode: "SME-002", club: "สงสพัท", name: "ทวีศักดิ์ วรเดช", nickname: "ทวี", phone: "089-111-2233", email: "taweesak@smefan.com" },
    { id: "m_3", memberCode: "SME-003", club: "สงสพัท", name: "ทิพวรรณ ศรีสวัสดิ์", nickname: "ทิพย์", phone: "086-555-7788", email: "tippawan@smefan.com" },
    { id: "m_4", memberCode: "SME-004", club: "สงสพัท", name: "ทศพล เกียรติสกุล", nickname: "ทศ", phone: "082-333-8899", email: "todsapol@smefan.com" },
    { id: "m_5", memberCode: "SME-005", club: "สงสพัท", name: "สมชาย มั่งคั่งพาณิชย์", nickname: "ชาย", phone: "081-999-4455", email: "somchai@smefan.com" },
    { id: "m_6", memberCode: "SME-006", club: "สงสพัท", name: "กิตติพงษ์ สุขใจดี", nickname: "กิต", phone: "083-444-1122", email: "kittipong@smefan.com" },
    { id: "m_7", memberCode: "SME-007", club: "สงสพัท", name: "ณัฐพร บำรุงจิตต์", nickname: "นัท", phone: "085-777-9900", email: "nattaporn@smefan.com" },
    { id: "m_8", memberCode: "SME-008", club: "สงสพัท", name: "สุรชัย รัตนวงศ์", nickname: "ชัย", phone: "088-666-5544", email: "surachai@smefan.com" },

    { id: "m_9", memberCode: "ROT-001", club: "โรตารี่", name: "ทินกร เลิศไพศาล", nickname: "กร", phone: "081-888-3344", email: "tinnakorn@rotary.org" },
    { id: "m_10", memberCode: "ROT-002", club: "โรตารี่", name: "ธนกร วิทยารัตน์", nickname: "ธน", phone: "084-222-7711", email: "thanakorn@rotary.org" },
    { id: "m_11", memberCode: "ROT-003", club: "โรตารี่", name: "ทัศนีย์ อัครเดชา", nickname: "ทัศ", phone: "087-333-6655", email: "tassanee@rotary.org" },
    { id: "m_12", memberCode: "ROT-004", club: "โรตารี่", name: "วิชัย พงษ์สถิตย์", nickname: "วิชัย", phone: "089-666-3322", email: "wichai@rotary.org" },
    { id: "m_13", memberCode: "ROT-005", club: "โรตารี่", name: "ประเสริฐ เจริญผลเจริญ", nickname: "เสริฐ", phone: "086-123-9876", email: "prasert@rotary.org" },
    { id: "m_14", memberCode: "ROT-006", club: "โรตารี่", name: "พงศ์เทพ วงศ์สวรรค์", nickname: "เทพ", phone: "083-555-8877", email: "pongthep@rotary.org" }
  ],

  // Google Sheets integration URL
  googleSheetsUrl: ""
};

/**
 * Initial sample registered attendees with 6-month slip retention timestamps
 */
const now = new Date();
const sixMonthsLater = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);

export const initialRegistrations = [
  {
    ticketNo: "SME-001",
    timestamp: "2026-11-02 12:17:00",
    regType: "member",
    memberCode: "SME-001",
    club: "สงสพัท",
    name: "คุณทีป์ชลิต ทองจันทร์ (ผอ.โต๊ด)",
    nickname: "ผอ.โต๊ด",
    phone: "0819998888",
    email: "todstar321@gmail.com",
    amount: 500,
    paidAmount: 500,
    paymentStatus: "paid",
    hasShirt: true,
    shirtGender: "ชาย",
    shirtSize: "XL",
    shirtReceived: true,
    checkedIn: true,
    giftNumber: 1,
    photoUrl: null,
    costumePhoto: null
  },
  {
    ticketNo: "SME-002",
    timestamp: "2026-11-02 12:17:00",
    regType: "member",
    memberCode: "SME-002",
    club: "สงสพัท",
    name: "คุณสมชาย รักสงบ",
    nickname: "ชาย",
    phone: "0823456789",
    email: "somchai@example.com",
    amount: 500,
    paidAmount: 500,
    paymentStatus: "paid",
    hasShirt: true,
    shirtGender: "ชาย",
    shirtSize: "L",
    shirtReceived: false,
    checkedIn: true,
    giftNumber: 2,
    photoUrl: null,
    costumePhoto: null
  },
  {
    ticketNo: "SME-003",
    timestamp: "2026-11-02 12:47:18",
    regType: "member",
    memberCode: "SME-003",
    club: "สงสพัท",
    name: "ทีป์ชลิต ทองจันทร์",
    nickname: "ทีป์",
    phone: "093-792-5665",
    email: "todstar321@gmail.com",
    amount: 500,
    paidAmount: 500,
    paymentStatus: "paid",
    hasShirt: true,
    shirtGender: "ชาย",
    shirtSize: "L",
    shirtReceived: false,
    checkedIn: false,
    giftNumber: null,
    photoUrl: null,
    costumePhoto: null
  },
  {
    ticketNo: "SME-004",
    timestamp: "2026-11-02 12:42:13",
    regType: "member",
    memberCode: "SME-004",
    club: "สงสพัท",
    name: "ทีป์ชลิต ทองจันทร์",
    nickname: "ทีป์",
    phone: "081-234-5678",
    email: "teepchalit@smefan.com",
    amount: 500,
    paidAmount: 500,
    paymentStatus: "paid",
    hasShirt: true,
    shirtGender: "ชาย",
    shirtSize: "3XL",
    shirtReceived: false,
    checkedIn: false,
    giftNumber: null,
    photoUrl: null,
    costumePhoto: null
  }
];

export const themePresetsList = [
  // 1. Rainbow & Multi-Color Gradients
  { 
    id: "grad-rainbow", 
    name: "Rainbow Prism (สายรุ้งโฮโลแกรม)", 
    type: "gradient", 
    gradient: "linear-gradient(135deg, #ff0080, #ff8c00, #40e0d0, #7928ca, #ff0080)", 
    color: "#ff0080", 
    textColor: "#ffffff" 
  },
  { 
    id: "grad-holographic", 
    name: "Holographic Pearl (ประกายมุกพาสเทล)", 
    type: "gradient", 
    gradient: "linear-gradient(135deg, #a78bfa, #f472b6, #38bdf8, #34d399)", 
    color: "#a78bfa", 
    textColor: "#0f172a" 
  },
  { 
    id: "grad-sunset", 
    name: "Sunset Horizon (ส้มทอง-ชมพูม่วง)", 
    type: "gradient", 
    gradient: "linear-gradient(135deg, #f59e0b, #ec4899, #8b5cf6)", 
    color: "#f59e0b", 
    textColor: "#ffffff" 
  },
  { 
    id: "grad-gold", 
    name: "Golden Royalty (ทองหรูหราปีใหม่)", 
    type: "gradient", 
    gradient: "linear-gradient(135deg, #f59e0b, #d97706, #b45309)", 
    color: "#f59e0b", 
    textColor: "#0f172a" 
  },
  { 
    id: "grad-aurora", 
    name: "Emerald Aurora (เขียวมรกต-ฟ้าน้ำทะเล)", 
    type: "gradient", 
    gradient: "linear-gradient(135deg, #10b981, #06b6d4, #3b82f6)", 
    color: "#10b981", 
    textColor: "#0f172a" 
  },
  { 
    id: "grad-cyber", 
    name: "Cyberpunk Neon (ชมพูนีออน-ฟ้า)", 
    type: "gradient", 
    gradient: "linear-gradient(135deg, #ec4899, #8b5cf6, #06b6d4)", 
    color: "#ec4899", 
    textColor: "#ffffff" 
  },
  { 
    id: "grad-cosmic", 
    name: "Cosmic Space (ม่วงกาแล็กซี่-น้ำเงิน)", 
    type: "gradient", 
    gradient: "linear-gradient(135deg, #8b5cf6, #3b82f6, #1d4ed8)", 
    color: "#8b5cf6", 
    textColor: "#ffffff" 
  },
  { 
    id: "grad-fire", 
    name: "Volcano Flame (แดงเพลิง-ส้มทอง)", 
    type: "gradient", 
    gradient: "linear-gradient(135deg, #ef4444, #f97316, #eab308)", 
    color: "#ef4444", 
    textColor: "#ffffff" 
  },
  { 
    id: "grad-dark-luxury", 
    name: "Black Onyx & Gold (ดำสนิท-ขอบทอง)", 
    type: "gradient", 
    gradient: "linear-gradient(135deg, #1e293b, #0f172a, #f59e0b)", 
    color: "#f59e0b", 
    textColor: "#ffffff" 
  },

  // 2. Solid Pure Shades
  { id: "solid-gold", name: "Amber Gold", type: "solid", color: "#f59e0b", bg: "#f59e0b", textColor: "#0f172a" },
  { id: "solid-indigo", name: "Electric Indigo", type: "solid", color: "#6366f1", bg: "#6366f1", textColor: "#ffffff" },
  { id: "solid-cyan", name: "Cyan Teal", type: "solid", color: "#06b6d4", bg: "#06b6d4", textColor: "#0f172a" },
  { id: "solid-emerald", name: "Neon Emerald", type: "solid", color: "#10b981", bg: "#10b981", textColor: "#0f172a" },
  { id: "solid-rose", name: "Ruby Rose", type: "solid", color: "#f43f5e", bg: "#f43f5e", textColor: "#ffffff" },
  { id: "solid-violet", name: "Deep Violet", type: "solid", color: "#8b5cf6", bg: "#8b5cf6", textColor: "#ffffff" },
  { id: "solid-blue", name: "Royal Blue", type: "solid", color: "#2563eb", bg: "#2563eb", textColor: "#ffffff" },
  { id: "solid-orange", name: "Warm Orange", type: "solid", color: "#ea580c", bg: "#ea580c", textColor: "#ffffff" }
];

