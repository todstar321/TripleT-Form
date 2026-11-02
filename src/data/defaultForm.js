export const themePresets = [
  {
    id: "cosmic-violet",
    name: "Cosmic Violet",
    themeColor: "#8b5cf6",
    themeMode: "dark",
    coverImage: "https://images.unsplash.com/photo-1534972195531-a756b1126f24?auto=format&fit=crop&w=1600&q=80",
    backgroundImage: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1920&q=80",
    bgOverlayOpacity: 85,
    glassmorphism: true,
  },
  {
    id: "cyber-neon",
    name: "Cyber Neon",
    themeColor: "#06b6d4",
    themeMode: "dark",
    coverImage: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1600&q=80",
    backgroundImage: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1920&q=80",
    bgOverlayOpacity: 85,
    glassmorphism: true,
  },
  {
    id: "deep-luxury",
    name: "Deep Luxury Gold",
    themeColor: "#f59e0b",
    themeMode: "dark",
    coverImage: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1600&q=80",
    backgroundImage: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1920&q=80",
    bgOverlayOpacity: 88,
    glassmorphism: true,
  },
  {
    id: "emerald-tech",
    name: "Emerald Modern",
    themeColor: "#10b981",
    themeMode: "dark",
    coverImage: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1600&q=80",
    backgroundImage: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1920&q=80",
    bgOverlayOpacity: 85,
    glassmorphism: true,
  },
  {
    id: "rose-elegance",
    name: "Sunset Rose",
    themeColor: "#f43f5e",
    themeMode: "dark",
    coverImage: "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1600&q=80",
    backgroundImage: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=1920&q=80",
    bgOverlayOpacity: 85,
    glassmorphism: true,
  },
  {
    id: "clean-minimal",
    name: "Clean Minimal Light",
    themeColor: "#3b82f6",
    themeMode: "light",
    coverImage: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1600&q=80",
    backgroundImage: "https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&w=1920&q=80",
    bgOverlayOpacity: 70,
    glassmorphism: true,
  }
];

export const defaultFormData = {
  id: "triple_t_sample_form",
  title: "แบบฟอร์มลงทะเบียนสัมมนา AI & Digital Innovation 2026",
  description: "กรุณากรอกข้อมูลเพื่อสำรองที่นั่งเข้าร่วมสัมมนาและรับสิทธิ์เข้าถึงเวิร์กช็อปพิเศษ ข้อมูลจะถูกบันทึกและเชื่อมโยงกับระบบโดยอัตโนมัติ",
  settings: {
    coverImage: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1600&q=80",
    backgroundImage: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1920&q=80",
    themeMode: "dark",
    themeColor: "#6366f1",
    bgOverlayOpacity: 85,
    displayMode: "classic", // "classic" | "step"
    glassmorphism: true,
    logoUrl: "",
    submitButtonText: "ส่งข้อมูลลงทะเบียน",
    successTitle: "ลงทะเบียนสำเร็จเรียบร้อย! 🎉",
    successMessage: "เราได้รับข้อมูลของคุณแล้ว ทีมงานจะส่งอีเมลยืนยันพร้อมรหัสเข้างานให้ก่อนวันเริ่มสัมมนาครับ",
    googleSheetsUrl: "", // Google Apps Script Web App URL
    sheetTabName: "Responses"
  },
  fields: [
    {
      id: "field_1",
      type: "text",
      label: "ชื่อ - นามสกุล (Full Name)",
      placeholder: "เช่น นายธนากร สิทธิชัย",
      required: true,
      description: "ชื่อนี้จะถูกนำไปใช้ในการออก e-Certificate หลังจบงาน"
    },
    {
      id: "field_2",
      type: "email",
      label: "อีเมลสำหรับติดต่อ (Email Address)",
      placeholder: "example@company.com",
      required: true,
      description: "ลิงก์เข้างานและเอกสารจะถูกจัดส่งไปที่อีเมลนี้"
    },
    {
      id: "field_3",
      type: "phone",
      label: "เบอร์โทรศัพท์ (Phone Number)",
      placeholder: "08x-xxx-xxxx",
      required: true
    },
    {
      id: "field_4",
      type: "dropdown",
      label: "แผนก / หน่วยงาน (Department)",
      required: true,
      description: "สามารถเลือกหรือดึงข้อมูลสดจาก Google Sheets ได้",
      optionsSource: "manual", // "manual" หรือ "google_sheets"
      sheetColumn: "Department",
      options: [
        "ฝ่ายเทคโนโลยีและนวัตกรรม (IT & Digital)",
        "ฝ่ายการตลาดและการขาย (Marketing & Sales)",
        "ฝ่ายทรัพยากรบุคคล (HR & Organization)",
        "ฝ่ายบริหารและวางแผนกลยุทธ์ (Management)",
        "ฝ่ายการเงินและบัญชี (Finance & Accounting)",
        "อื่นๆ / บุคคลทั่วไป"
      ]
    },
    {
      id: "field_5",
      type: "radio",
      label: "รูปแบบการเข้าร่วมงาน (Attendance Mode)",
      required: true,
      options: [
        "เข้าร่วม ณ สถานที่จริง (On-site @ ศูนย์ประชุมแห่งชาติ)",
        "เข้าร่วมผ่านระบบเสมือนจริง (Online Live Interactive)"
      ]
    },
    {
      id: "field_6",
      type: "checkbox",
      label: "หัวข้อสัมมนาที่คุณสนใจเข้าร่วม (เลือกได้หลายข้อ)",
      required: false,
      options: [
        "Generative AI & Agentic Workflow สำหรับองค์กร",
        "Building Modern Web Applications with AI",
        "Automating Business Process with Google Workspace & Sheets",
        "Cybersecurity & Data Governance in 2026"
      ]
    },
    {
      id: "field_7",
      type: "rating",
      label: "ระดับความพร้อมในการนำ AI มาประยุกต์ใช้ในงานปัจจุบัน",
      description: "1 = ยังไม่เคยเริ่ม, 5 = ใช้งานเป็นประจำในงานทุกวัน",
      required: false,
      maxRating: 5
    },
    {
      id: "field_8",
      type: "textarea",
      label: "คำถามหรือความคาดหวังที่อยากให้วิทยากรตอบเป็นพิเศษ",
      placeholder: "ระบุข้อความหรือคำถามที่ต้องการถาม...",
      required: false
    }
  ]
};
