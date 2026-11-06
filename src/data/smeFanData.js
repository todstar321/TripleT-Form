/**
 * Data store and configuration for SME FAN New Year Event Registration
 */

export const initialSmeFanConfig = {
  eventId: "sme_fan_ny_2026",
  eventTitle: "งานสังสรรค์ปีใหม่ SME FAN 2026",
  eventSubtitle: "ขอเชิญสมาชิก SME FAN และแขกผู้มีเกียรติร่วมเฉลิมฉลองค่ำคืนแห่งความสุข ส่งท้ายปีเก่าต้อนรับปีใหม่",
  eventDate: "วันเสาร์ที่ 23 ธันวาคม 2026 เวลา 18:00 - 22:30 น.",
  eventVenue: "ห้องแมกโนเลีย โรงแรมลีการ์เดนส์พลาซ่า หาดใหญ่ (Lee Gardens Plaza Hotel Hat Yai)",
  forceLogoutBefore: "2026-11-03T08:16:40.000+07:00",
  
  // Registration Schedule Rules (Flexible Auto Open/Close Window & Countdown)
  registrationSchedule: {
    mode: "auto", // 'auto' | 'always_open' | 'closed'
    openDateTime: "2026-11-05T09:09",
    closeDateTime: "2026-12-15T22:00",
    upcomingMessage: "ระบบจะเปิดรับลงทะเบียนในวันที่ 5 พฤศจิกายน 2569 เวลา 09:09 น.",
    closedMessage: "ระบบปิดรับลงทะเบียนเรียบร้อยแล้วเมื่อวันที่ 15 ธันวาคม 2569 เวลา 22:00 น. ขอขอบคุณทุกท่านที่ให้ความสนใจ",
    allowExistingTicketDownload: true,
    maxSeats: 70,
    enableCapacityLimit: true,
    autoCloseOnFull: true
  },
  
  // Images
  bannerImage: "https://res.cloudinary.com/dx2asgfo7/image/upload/v1793663023/triple_t_forms/sme_fan_2026/banners/official_sme_fan_banner_2026.png",
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
      name: "คุณทีป์ชลิต ทองจันทร์ (ผอ.โต๊ด)",
      email: "Todstar321@gmail.com",
      phone: "093-792-5665",
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
  {
    "id": "m_f001",
    "memberCode": "F001",
    "club": "สงสพัท",
    "name": "พิชัย จงไพรัตน์",
    "nickname": "ฟุก",
    "phone": "081-541-3231",
    "email": "pichaifook@hotmail.com"
  },
  {
    "id": "m_f002",
    "memberCode": "F002",
    "club": "สงสพัท",
    "name": "วิฑูรย์ ตันติพิมลพันธ์",
    "nickname": "ทอง",
    "phone": "081-541-2599",
    "email": "wtt14@hotmail.com"
  },
  {
    "id": "m_f003",
    "memberCode": "F003",
    "club": "สงสพัท",
    "name": "พศุตม์ วราภิสิทธิ์",
    "nickname": "เก่ง",
    "phone": "081-898-4490",
    "email": "keng_ww@hotmail.com"
  },
  {
    "id": "m_f004",
    "memberCode": "F004",
    "club": "สงสพัท",
    "name": "พัชรินทร์ เชาว์กิติวุฒิ",
    "nickname": "ผึ้ง",
    "phone": "086-488-0988",
    "email": "sis.patcharin@gmail.com"
  },
  {
    "id": "m_f005",
    "memberCode": "F005",
    "club": "สงสพัท",
    "name": "เชิดศักดิ์ นิคมจิตร",
    "nickname": "เชิด",
    "phone": "086-692-2782",
    "email": "adart.adcom@gmail.com"
  },
  {
    "id": "m_f006",
    "memberCode": "F006",
    "club": "สงสพัท",
    "name": "พิรัชพงษ์ ลาภพูลธนะอนันต์",
    "nickname": "ปอนด์",
    "phone": "065-469-8749",
    "email": "sp.nacharee@gmail.com"
  },
  {
    "id": "m_f009",
    "memberCode": "F009",
    "club": "สงสพัท",
    "name": "อุกฤษฏ์ เวโรจน์พร",
    "nickname": "โอ๊ต",
    "phone": "096-989-9565",
    "email": "oat_xp@hotmail.com"
  },
  {
    "id": "m_f010",
    "memberCode": "F010",
    "club": "สงสพัท",
    "name": "ธนเดช เตชะทวีกิจ",
    "nickname": "หงส์",
    "phone": "092-664-9593",
    "email": "thanadej.t@joyprinthatyai.com"
  },
  {
    "id": "m_f011",
    "memberCode": "F011",
    "club": "สงสพัท",
    "name": "ทักษ์กร ปรียานนท์",
    "nickname": "ทักษ์",
    "phone": "081-896-6517",
    "email": "takkorn@gmail.com"
  },
  {
    "id": "m_f012",
    "memberCode": "F012",
    "club": "สงสพัท",
    "name": "บุญเจือ อาจิณพัฒน์",
    "nickname": "เต้",
    "phone": "089-734-5241",
    "email": "taebj007@gmail.com"
  },
  {
    "id": "m_f013",
    "memberCode": "F013",
    "club": "สงสพัท",
    "name": "วัชรพงษ์ เศรษฐโชดึก",
    "nickname": "โอ๊ต",
    "phone": "085-908-4105",
    "email": "watcharapong.prm@gmail.com"
  },
  {
    "id": "m_f019",
    "memberCode": "F019",
    "club": "สงสพัท",
    "name": "ณณฐกร ตั้งนนทศิริ",
    "nickname": "ตี้",
    "phone": "097-826-2628",
    "email": "nontakorn6023@gmail.com"
  },
  {
    "id": "m_f020",
    "memberCode": "F020",
    "club": "สงสพัท",
    "name": "ศุภาพัทธ์ จันทภาโส",
    "nickname": "ฝน",
    "phone": "094-592-9449",
    "email": "Medfon32@gmail.com"
  },
  {
    "id": "m_f021",
    "memberCode": "F021",
    "club": "สงสพัท",
    "name": "กมลพรรณ หวานเพ็ชร์",
    "nickname": "ยิ้ม",
    "phone": "089-294-4044",
    "email": "kamolphan1970@gmail.com"
  },
  {
    "id": "m_f023",
    "memberCode": "F023",
    "club": "สงสพัท",
    "name": "มัญชุสา เดชาปกรณ์ชัย",
    "nickname": "แอ๊ด",
    "phone": "090-698-9944",
    "email": "kempkung@gmail.com"
  },
  {
    "id": "m_f024",
    "memberCode": "F024",
    "club": "สงสพัท",
    "name": "วรพจน์ พฤฒารัตน์",
    "nickname": "พจน์",
    "phone": "080-999-3879",
    "email": "paisalgp@gmail.com"
  },
  {
    "id": "m_f025",
    "memberCode": "F025",
    "club": "สงสพัท",
    "name": "จอมปรีชา คงเจริญ",
    "nickname": "จอม",
    "phone": "096-515-6163",
    "email": "jomjaroen@gmail.com"
  },
  {
    "id": "m_f027",
    "memberCode": "F027",
    "club": "สงสพัท",
    "name": "เฉลิมพงษ์ ชาติวัฒนา",
    "nickname": "พงษ์",
    "phone": "061-886-0964",
    "email": "chtpong1980@gmail.com"
  },
  {
    "id": "m_f029",
    "memberCode": "F029",
    "club": "สงสพัท",
    "name": "ชฎาภรณ์ พิพุทธางกูร",
    "nickname": "หนู",
    "phone": "097-451-6242",
    "email": "chadanooh@hotmail.com"
  },
  {
    "id": "m_f030",
    "memberCode": "F030",
    "club": "สงสพัท",
    "name": "ทศม วงศ์ช่วย",
    "nickname": "ปอนด์",
    "phone": "089-733-8624",
    "email": "Thasama@gmail.com"
  },
  {
    "id": "m_f032",
    "memberCode": "F032",
    "club": "สงสพัท",
    "name": "ร.ต.อ.อภิชัย รักล้วน",
    "nickname": "ขวด",
    "phone": "087-967-9626",
    "email": "Apichai79626@gmail.com"
  },
  {
    "id": "m_f035",
    "memberCode": "F035",
    "club": "สงสพัท",
    "name": "ฟาริดา ดุลกูล",
    "nickname": "ดา",
    "phone": "081-898-6578",
    "email": "fdunkul@gmail.com"
  },
  {
    "id": "m_f036",
    "memberCode": "F036",
    "club": "สงสพัท",
    "name": "สุวภัทร รตาคุณานนต์",
    "nickname": "เชอรี่",
    "phone": "062-829-6364",
    "email": "suwapat_r@hotmail.com"
  },
  {
    "id": "m_f037",
    "memberCode": "F037",
    "club": "สงสพัท",
    "name": "รพิพรรณี วรรณเพชร",
    "nickname": "บุ๋ม",
    "phone": "097-242-2251",
    "email": "itsarawealth@gmail.com"
  },
  {
    "id": "m_f038",
    "memberCode": "F038",
    "club": "สงสพัท",
    "name": "จีราพร เลากาวงศ์",
    "nickname": "นุ่น",
    "phone": "061-456-2946",
    "email": "nun_1326@hotmail.com"
  },
  {
    "id": "m_f043",
    "memberCode": "F043",
    "club": "สงสพัท",
    "name": "พลอยอันดา ชูกำเนิด",
    "nickname": "พลอย",
    "phone": "065-998-2956",
    "email": "ployanda@icloud.com"
  },
  {
    "id": "m_f044",
    "memberCode": "F044",
    "club": "สงสพัท",
    "name": "วีริสร์ กุลพงษ์ภิวัฒน์",
    "nickname": "ชิน",
    "phone": "081-957-0929",
    "email": "Anthony.c@greentechbiolab.com"
  },
  {
    "id": "m_f046",
    "memberCode": "F046",
    "club": "สงสพัท",
    "name": "สมพัชร รัตนสุวรรณ",
    "nickname": "โปรนัท",
    "phone": "084-114-8999",
    "email": "nut16399@gmail.com"
  },
  {
    "id": "m_f049",
    "memberCode": "F049",
    "club": "สงสพัท",
    "name": "ปราการ ศักดี",
    "nickname": "หมุย",
    "phone": "091-742-8338",
    "email": "prakarnsakdee@gmail.com"
  },
  {
    "id": "m_f050",
    "memberCode": "F050",
    "club": "สงสพัท",
    "name": "ศุภธนกฤษ ประทุมชาติภักดี",
    "nickname": "โจอี้",
    "phone": "062-982-5265",
    "email": "p.supatanakit@gmail.com"
  },
  {
    "id": "m_f051",
    "memberCode": "F051",
    "club": "สงสพัท",
    "name": "ธานัท กฤชคงพันธุ์",
    "nickname": "นัท",
    "phone": "096-496-5696",
    "email": "tanatgrid@gmail.com"
  },
  {
    "id": "m_f052",
    "memberCode": "F052",
    "club": "สงสพัท",
    "name": "สุมิตดานัน จันทวี",
    "nickname": "สิม",
    "phone": "097-824-9249",
    "email": "penmit@penmitcraftcocoa.com"
  },
  {
    "id": "m_f056",
    "memberCode": "F056",
    "club": "สงสพัท",
    "name": "ปัญญนันท์ สุขสำราญ",
    "nickname": "ปูปั้น",
    "phone": "064-487-2382",
    "email": "suksumrarn@gmail.com"
  },
  {
    "id": "m_f059",
    "memberCode": "F059",
    "club": "สงสพัท",
    "name": "สุมลรัตน์ ลิขิตศรีไพบูลย์",
    "nickname": "คุณมิน",
    "phone": "087-074-8119",
    "email": "sumolrat.1859@gmail.com"
  },
  {
    "id": "m_f061",
    "memberCode": "F061",
    "club": "สงสพัท",
    "name": "พิพัฒน์ หวังวิทยารัตน์",
    "nickname": "เก่ง",
    "phone": "083-699-5929",
    "email": "plar_carf@hotmail.com"
  },
  {
    "id": "m_f062",
    "memberCode": "F062",
    "club": "สงสพัท",
    "name": "ธนัชสวิสส์ สนิทมัจโร",
    "nickname": "ก๊อป",
    "phone": "080-649-3556",
    "email": "gopkeeyadee@gmail.com"
  },
  {
    "id": "m_f063",
    "memberCode": "F063",
    "club": "สงสพัท",
    "name": "ศิริขวัญ มณี",
    "nickname": "ขวัญ",
    "phone": "098-205-2994",
    "email": "sirikhwan.m@gmail.com"
  },
  {
    "id": "m_f065",
    "memberCode": "F065",
    "club": "สงสพัท",
    "name": "สิริมา โกวิทยา",
    "nickname": "เบบิ้น",
    "phone": "063-965-6595",
    "email": "skovitaya@hotmail.com"
  },
  {
    "id": "m_f066",
    "memberCode": "F066",
    "club": "สงสพัท",
    "name": "วิกรานต์ ทั่วยาบัตร",
    "nickname": "อาม",
    "phone": "099-092-4692",
    "email": "vikrantuayabat@gmail.com"
  },
  {
    "id": "m_f069",
    "memberCode": "F069",
    "club": "สงสพัท",
    "name": "ยุภา ไชยศักดิ์",
    "nickname": "สร้อย",
    "phone": "066-120-5731",
    "email": "missyupa2205@gmail.com"
  },
  {
    "id": "m_f070",
    "memberCode": "F070",
    "club": "สงสพัท",
    "name": "ศรุตยา ทวีรัตน์",
    "nickname": "อ้อย",
    "phone": "061-892-2356",
    "email": "sarutaya1984@gmail.com"
  },
  {
    "id": "m_f072",
    "memberCode": "F072",
    "club": "สงสพัท",
    "name": "วีรวดี ธรรมธาดา",
    "nickname": "หมอกิ่ง",
    "phone": "083-192-0337",
    "email": "veeravadeeclinic@gmail.com"
  },
  {
    "id": "m_f076",
    "memberCode": "F076",
    "club": "สงสพัท",
    "name": "นภัสกร ฆังรัตนะ",
    "nickname": "เขียว",
    "phone": "096-532-4742",
    "email": "green.napat@gmail.com"
  },
  {
    "id": "m_f077",
    "memberCode": "F077",
    "club": "สงสพัท",
    "name": "คธาวุฒิ หวันแลหมัน",
    "nickname": "เรย์",
    "phone": "089-653-8530",
    "email": "katawoot@gmail.com"
  },
  {
    "id": "m_f078",
    "memberCode": "F078",
    "club": "สงสพัท",
    "name": "สุขคล อินกะโผะ",
    "nickname": "ปู",
    "phone": "081-895-3998",
    "email": "sukkoli.smartinnotech@gmail.com"
  },
  {
    "id": "m_f083",
    "memberCode": "F083",
    "club": "สงสพัท",
    "name": "สุจินดา ปัญญาคุ้มวงศ์",
    "nickname": "หยง",
    "phone": "096-949-1622",
    "email": "sujinda.rel@gmail.com"
  },
  {
    "id": "m_f085",
    "memberCode": "F085",
    "club": "สงสพัท",
    "name": "ปภาวรินท์ พึ่งเกียรติรัศมี",
    "nickname": "ปันปัน",
    "phone": "099-453-6459",
    "email": "Songthumbirdnest.01@gmail.com"
  },
  {
    "id": "m_f087",
    "memberCode": "F087",
    "club": "สงสพัท",
    "name": "เกษมศรี สังข์สนิท",
    "nickname": "ศรี",
    "phone": "081-969-9012",
    "email": "kasemsrisang.1968@gmail.com"
  },
  {
    "id": "m_f089",
    "memberCode": "F089",
    "club": "สงสพัท",
    "name": "ปิยนุช คงสม",
    "nickname": "นุช",
    "phone": "093-595-4169",
    "email": "piyanoot4169@gmail.com"
  },
  {
    "id": "m_f091",
    "memberCode": "F091",
    "club": "สงสพัท",
    "name": "ปภาดา ชีทรัพย์เจริญ",
    "nickname": "อุ๋ม",
    "phone": "094-595-9964",
    "email": "prapada.spc@gmail.com"
  },
  {
    "id": "m_f094",
    "memberCode": "F094",
    "club": "สงสพัท",
    "name": "สุทธิรัตน์ ทัศนพรสถิต",
    "nickname": "ฟีฟี่",
    "phone": "083-951-6363",
    "email": "higenius.th@gmail.com"
  },
  {
    "id": "m_f095",
    "memberCode": "F095",
    "club": "สงสพัท",
    "name": "อรฉาย แก้วกาธร",
    "nickname": "แอ๋ว",
    "phone": "096-659-6446",
    "email": "elle365988@gmail.com"
  },
  {
    "id": "m_f100",
    "memberCode": "F100",
    "club": "สงสพัท",
    "name": "วศินธารา วัชรเสถียร",
    "nickname": "มัจ",
    "phone": "097-492-6356",
    "email": "wasintara2010@gmail.com"
  },
  {
    "id": "m_f101",
    "memberCode": "F101",
    "club": "สงสพัท",
    "name": "ปิยะนุช ทวีรัตน์",
    "nickname": "ปุ๋ม",
    "phone": "089-870-4640",
    "email": "pss_proconstruction@hotmail.com"
  },
  {
    "id": "m_f102",
    "memberCode": "F102",
    "club": "สงสพัท",
    "name": "ทนง ทองด้วง",
    "nickname": "นง",
    "phone": "081-957-3486",
    "email": "masterconsulting2012@gmail.com"
  },
  {
    "id": "m_f105",
    "memberCode": "F105",
    "club": "สงสพัท",
    "name": "วรพัทธ์ นิธิธนะพัฒน์",
    "nickname": "คุณพัทธ์",
    "phone": "061-652-6289",
    "email": "Nititanapat2511@gmail.com"
  },
  {
    "id": "m_f108",
    "memberCode": "F108",
    "club": "สงสพัท",
    "name": "กฤศนิน บุญพริกพรพันธุ์",
    "nickname": "เมย์",
    "phone": "099-365-4542",
    "email": "kitsanin2534@gmail.com"
  },
  {
    "id": "m_f112",
    "memberCode": "F112",
    "club": "สงสพัท",
    "name": "ทีป์ชลิต ทองจันทร์",
    "nickname": "ผอ.โต๊ด",
    "phone": "093-792-5665",
    "email": "Todstar321@gmail.com"
  },
  {
    "id": "m_f113",
    "memberCode": "F113",
    "club": "สงสพัท",
    "name": "พรทิมล ยงยศยิ่ง",
    "nickname": "ก้อย",
    "phone": "081-542-6402",
    "email": "porntimon_yyy@yahoo.com"
  },
  {
    "id": "m_f114",
    "memberCode": "F114",
    "club": "สงสพัท",
    "name": "พิมพาภรณ์ เรืองเริงกุลฤทธิ์",
    "nickname": "พิม",
    "phone": "086-955-4647",
    "email": "Pim219007@gmail.com"
  },
  {
    "id": "m_f116",
    "memberCode": "F116",
    "club": "สงสพัท",
    "name": "มารินี อนนตรี",
    "nickname": "นี",
    "phone": "089-465-6254",
    "email": "marinee.an@gmail.com"
  },
  {
    "id": "m_f118",
    "memberCode": "F118",
    "club": "สงสพัท",
    "name": "วราภรณ์ ลิม",
    "nickname": "ปุ้ม",
    "phone": "089-297-4430",
    "email": "warapron4430@gmail.com"
  },
  {
    "id": "m_f119",
    "memberCode": "F119",
    "club": "สงสพัท",
    "name": "สุจินต์ ปานะบุตร",
    "nickname": "จู",
    "phone": "087-290-0354",
    "email": "sujin.su54@gmail.com"
  },
  {
    "id": "m_f122",
    "memberCode": "F122",
    "club": "สงสพัท",
    "name": "ศรัณรัตน์ รุจิเรขเรืองรอง",
    "nickname": "ลิลลี่",
    "phone": "098-568-9179",
    "email": "bellaweddinghatyai@gmail.com"
  },
  {
    "id": "m_f123",
    "memberCode": "F123",
    "club": "สงสพัท",
    "name": "ปารณีย์ ตั้งสุรเสฏฐ์",
    "nickname": "หนิง",
    "phone": "064-923-6599",
    "email": "Ning22564@gmail.com"
  },
  {
    "id": "m_f124",
    "memberCode": "F124",
    "club": "สงสพัท",
    "name": "ธนิสา คูประเสริฐ",
    "nickname": "นุ๊ก",
    "phone": "095-226-1498",
    "email": "Tanisa.nuk@gmail.com"
  },
  {
    "id": "m_f125",
    "memberCode": "F125",
    "club": "สงสพัท",
    "name": "ยสินทร สินศุภเศวต",
    "nickname": "คุณบิ๊ก",
    "phone": "080-329-6261",
    "email": "sec@greentechbiolab.com"
  },
  {
    "id": "m_f126",
    "memberCode": "F126",
    "club": "สงสพัท",
    "name": "ปณรรฐนนท์ เฉลียวพงศ์",
    "nickname": "หมิว",
    "phone": "063-546-2229",
    "email": "Chaliewpong@gmail.com"
  },
  {
    "id": "m_f127",
    "memberCode": "F127",
    "club": "สงสพัท",
    "name": "วีระชัย กิ่งจันทร์",
    "nickname": "วี",
    "phone": "065-582-3168",
    "email": "Veerachaikingchan@gmail.com"
  },
  {
    "id": "m_f128",
    "memberCode": "F128",
    "club": "สงสพัท",
    "name": "เกรียงไกร นวลเนื้อ",
    "nickname": "เบิ้ม",
    "phone": "098-889-2782",
    "email": "berm1300@gmail.com"
  },
  {
    "id": "m_f129",
    "memberCode": "F129",
    "club": "สงสพัท",
    "name": "เยาวลักษณ์ จันทรปาน",
    "nickname": "น้องเล็ก",
    "phone": "097-195-4282",
    "email": "Chompoo9653@gmail.com"
  },
  {
    "id": "m_rot001",
    "memberCode": "ROT-001",
    "club": "โรตารี่",
    "name": "ทินกร เลิศไพศาล",
    "nickname": "กร",
    "phone": "081-888-3344",
    "email": "tinnakorn@rotary.org"
  },
  {
    "id": "m_rot002",
    "memberCode": "ROT-002",
    "club": "โรตารี่",
    "name": "ธนกร วิทยารัตน์",
    "nickname": "ธน",
    "phone": "084-222-7711",
    "email": "thanakorn@rotary.org"
  },
  {
    "id": "m_rot003",
    "memberCode": "ROT-003",
    "club": "โรตารี่",
    "name": "ทัศนีย์ อัครเดชา",
    "nickname": "ทัศ",
    "phone": "087-333-6655",
    "email": "tassanee@rotary.org"
  },
  {
    "id": "m_rot004",
    "memberCode": "ROT-004",
    "club": "โรตารี่",
    "name": "วิชัย พงษ์สถิตย์",
    "nickname": "วิชัย",
    "phone": "089-666-3322",
    "email": "wichai@rotary.org"
  },
  {
    "id": "m_rot005",
    "memberCode": "ROT-005",
    "club": "โรตารี่",
    "name": "ประเสริฐ เจริญผลเจริญ",
    "nickname": "เสริฐ",
    "phone": "086-123-9876",
    "email": "prasert@rotary.org"
  },
  {
    "id": "m_rot006",
    "memberCode": "ROT-006",
    "club": "โรตารี่",
    "name": "พงศ์เทพ วงศ์สวรรค์",
    "nickname": "เทพ",
    "phone": "083-555-8877",
    "email": "pongthep@rotary.org"
  }
],

  // Google Sheets integration URL
  googleSheetsUrl: ""
};

/**
 * Initial sample registered attendees with 6-month slip retention timestamps
 */
const now = new Date();
const sixMonthsLater = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);

export const initialRegistrations = [];

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

