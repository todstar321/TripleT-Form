/**
 * Forms Data Store for Triple T Multi-Form System
 * Contains definitions for Forms 1, 2, 3, and 4
 */

export const initialFormsList = [
  {
    id: "form_1_sme_event",
    formNumber: 1,
    title: "แบบฟอร์มลงทะเบียนเข้างานสังสรรค์ปีใหม่ SME FAN 2026",
    shortTitle: "ลงทะเบียนเข้างาน SME FAN",
    category: "งานสังสรรค์ & จำหน่ายบัตร",
    description: "ขอเชิญสมาชิก SME FAN และแขกผู้มีเกียรติร่วมเฉลิมฉลองค่ำคืนแห่งความสุข ส่งท้ายปีเก่าต้อนรับปีใหม่ พร้อมระบบสลิปตรวจสอบและบัตร E-Ticket",
    type: "sme_registration", // Primary custom registration form
    status: "active",
    createdAt: "2026-10-25",
    theme: {
      cardMode: "dark", // 'dark' | 'white' | 'glass'
      themeColor: "#f59e0b",
      themeGradient: "linear-gradient(135deg, #f59e0b, #d97706, #b45309)",
      themeTextColor: "#0f172a",
      backgroundImage: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1920&q=80",
      bgOverlayOpacity: 85,
      coverImage: "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1920&q=80"
    },
    responses: []
  },
  {
    id: "form_2_satisfaction",
    formNumber: 2,
    title: "แบบประเมินความพึงพอใจการจัดงาน (Event Satisfaction & NPS Survey)",
    shortTitle: "ประเมินความพึงพอใจ",
    category: "แบบสอบถาม & วิจัย",
    description: "ขอความอนุเคราะห์ทุกท่านร่วมให้คะแนนและข้อเสนอแนะต่อการจัดงาน เพื่อนำไปพัฒนาและยกระดับกิจกรรมเครือข่าย SME FAN ให้ดียิ่งขึ้น",
    type: "survey",
    status: "active",
    createdAt: "2026-10-28",
    theme: {
      cardMode: "white", // White theme by default for professional survey
      themeColor: "#2563eb",
      themeGradient: "linear-gradient(135deg, #2563eb, #3b82f6, #60a5fa)",
      themeTextColor: "#ffffff",
      backgroundImage: "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1920&q=80",
      bgOverlayOpacity: 85,
      coverImage: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1600&q=80"
    },
    fields: [
      {
        id: "eval_name",
        type: "text",
        label: "ชื่อ - นามสกุล ผู้ประเมิน (ไม่ระบุก็ได้)",
        placeholder: "เช่น นายสมเกียรติ มั่นคง หรือ ปล่อยว่างเพื่อไม่ประสงค์ออกนาม",
        required: false
      },
      {
        id: "eval_club",
        type: "select",
        label: "สังกัดสนาม / เครือข่ายของท่าน",
        required: true,
        options: ["สงสพัท", "โรตารี่", "แขกผู้มีเกียรติ / พันธมิตรภายนอก", "อื่นๆ"]
      },
      {
        id: "rating_overall",
        type: "rating",
        label: "1. ความประทับใจโดยรวมต่อการจัดงานในครั้งนี้",
        description: "ให้คะแนน 1 - 5 ดาว (5 ดาว = ประทับใจมากที่สุด)",
        required: true
      },
      {
        id: "rating_venue_food",
        type: "rating",
        label: "2. ความสะดวกของสถานที่จัดงาน บรรยากาศ และรสชาติอาหารเครื่องดื่ม",
        description: "ความสะอาด ความสะดวกในการเดินทาง และคุณภาพอาหาร",
        required: true
      },
      {
        id: "rating_entertainment",
        type: "rating",
        label: "3. กิจกรรมการแสดง ดนตรี ของรางวัล และการดำเนินรายการบนเวที",
        description: "ความสนุกสนานและความบันเทิงตลอดทั้งงาน",
        required: true
      },
      {
        id: "nps_score",
        type: "nps",
        label: "4. ท่านมีแนวโน้มจะแนะนำให้เพื่อนหรือคู่ค้า SME มาร่วมงานในครั้งต่อไปมากน้อยเพียงใด? (NPS Score)",
        description: "ระดับ 1 (ไม่มีทางแนะนำเลย) ถึง 10 (ยินดีแนะนำอย่างยิ่ง)",
        required: true
      },
      {
        id: "feedback_highlight",
        type: "text",
        label: "5. สิ่งที่ท่านประทับใจหรือชื่นชอบมากที่สุดในค่ำคืนนี้",
        placeholder: "เช่น การได้พบปะเพื่อนสมาชิก, อาหารอร่อย, การต้อนรับอบอุ่น",
        required: false
      },
      {
        id: "feedback_improvement",
        type: "textarea",
        label: "6. ข้อเสนอแนะเพิ่มเติมเพื่อการปรับปรุงในครั้งต่อไป",
        placeholder: "เช่น การจัดสรรเวลา, การขยายเวลาเปิดรับสมัคร, เพิ่มเวิร์กช็อป...",
        required: false
      }
    ],
    responses: [
      {
        id: "resp_201",
        submittedAt: "2026-10-29 20:30",
        eval_name: "ดร.วิชัย พงษ์สถิตย์",
        eval_club: "โรตารี่",
        rating_overall: 5,
        rating_venue_food: 5,
        rating_entertainment: 4,
        nps_score: 10,
        feedback_highlight: "ระบบการลงทะเบียนและสแกน E-Ticket สะดวกรวดเร็วมาก อาหารอร่อย",
        feedback_improvement: "อยากให้เพิ่มเวลาพูดคุยสร้างเครือข่าย Networking ในช่วงก่อนเริ่มงาน"
      },
      {
        id: "resp_202",
        submittedAt: "2026-10-30 09:15",
        eval_name: "คุณณัฐพร บำรุงจิตต์",
        eval_club: "สงสพัท",
        rating_overall: 5,
        rating_venue_food: 4,
        rating_entertainment: 5,
        nps_score: 9,
        feedback_highlight: "การจับรางวัลสนุกมาก และชอบเสื้อที่ระลึกผ้าใส่สบายมากค่ะ",
        feedback_improvement: "อยากให้จัดกิจกรรมเชื่อมสัมพันธ์แบบนี้ทุกปีค่ะ"
      }
    ]
  },
  {
    id: "form_3_b2b_matching",
    formNumber: 3,
    title: "แบบสำรวจความต้องการและจับคู่ธุรกิจ SME (SME Business Matching & B2B Needs)",
    shortTitle: "สำรวจและจับคู่ธุรกิจ SME",
    category: "เชื่อมโยงธุรกิจ & การค้า",
    description: "ส่งเสริมและเปิดโอกาสให้สมาชิกเครือข่าย SME FAN ได้แลกเปลี่ยน แนะนำสินค้า และจับคู่ธุรกิจ (Business Matching) เพื่อเติบโตร่วมกันอย่างยั่งยืน",
    type: "survey",
    status: "active",
    createdAt: "2026-10-29",
    theme: {
      cardMode: "white",
      themeColor: "#10b981",
      themeGradient: "linear-gradient(135deg, #10b981, #06b6d4, #3b82f6)",
      themeTextColor: "#0f172a",
      backgroundImage: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1920&q=80",
      bgOverlayOpacity: 85,
      coverImage: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1600&q=80"
    },
    fields: [
      {
        id: "company_name",
        type: "text",
        label: "ชื่อบริษัท / ร้านค้า / แบรนด์ธุรกิจของท่าน",
        placeholder: "เช่น บริษัท ทริปเปิ้ล ที อินโนเวชั่น จำกัด",
        required: true
      },
      {
        id: "contact_name",
        type: "text",
        label: "ชื่อผู้ติดต่อ และตำแหน่งงาน",
        placeholder: "เช่น คุณทีป์ชลิต ทองจันทร์ (กรรมการผู้จัดการ)",
        required: true
      },
      {
        id: "contact_phone",
        type: "tel",
        label: "เบอร์โทรศัพท์ และ LINE ID สำหรับติดต่อธุรกิจ",
        placeholder: "เช่น 081-234-5678 (LINE: teepchalit)",
        required: true
      },
      {
        id: "industry_category",
        type: "select",
        label: "หมวดหมู่อุตสาหกรรม / ประเภทธุรกิจ",
        required: true,
        options: [
          "อาหาร เครื่องดื่ม และเกษตรแปรรูป",
          "ค้าส่ง - ค้าปลีก และ E-Commerce",
          "ไอที ซอฟต์แวร์ และเทคโนโลยี AI",
          "การผลิต โรงงานอุตสาหกรรม และบรรจุภัณฑ์",
          "บริการ การตลาด สื่อ และโฆษณา",
          "การเงิน ประกันภัย และที่ปรึกษาธุรกิจ",
          "สุขภาพ ความงาม และการแพทย์",
          "โลจิสติกส์ และการขนส่ง",
          "อสังหาริมทรัพย์ การก่อสร้าง และตกแต่ง",
          "อื่นๆ"
        ]
      },
      {
        id: "business_size",
        type: "radio",
        label: "ขนาดธุรกิจ / ยอดขายเฉลี่ยต่อปีโดยประมาณ",
        required: true,
        options: [
          "Micro SME (ยอดขายไม่เกิน 1.8 ล้านบาท/ปี)",
          "Small SME (ยอดขาย 1.8 - 50 ล้านบาท/ปี)",
          "Medium SME (ยอดขาย 50 - 300 ล้านบาท/ปี)",
          "Large Corporate (ยอดขายมากกว่า 300 ล้านบาท/ปี)"
        ]
      },
      {
        id: "products_offer",
        type: "textarea",
        label: "สินค้า หรือ บริการหลักที่ท่านต้องการนำเสนอให้กับเพื่อนสมาชิก",
        placeholder: "อธิบายจุดเด่นของผลิตภัณฑ์หรือบริการ สิทธิประโยชน์พิเศษสำหรับสมาชิก SME FAN...",
        required: true
      },
      {
        id: "matching_needs",
        type: "checkbox",
        label: "ความต้องการจับคู่ธุรกิจ (Business Matching) ที่ท่านมองหามากที่สุด (เลือกได้หลายข้อ)",
        required: true,
        options: [
          "หาตัวแทนจำหน่าย / ช่องทางการจัดจำหน่าย (Distributor)",
          "หาผู้ร่วมลงทุน / แหล่งเงินทุนและสินเชื่อธุรกิจ (Capital & Funding)",
          "หาโรงงานผลิต OEM / วัตถุดิบต้นทุนต่ำ (Supplier & Material)",
          "หาที่ปรึกษาด้านการตลาดดิจิทัล การยิงโฆษณา และ AI Automation",
          "หาคู่ค้าเพื่อทำ Co-Branding หรือ Cross-Promotion",
          "จัดซื้อจัดจ้างสำหรับองค์กร (Corporate B2B Purchasing)"
        ]
      }
    ],
    responses: [
      {
        id: "b2b_301",
        submittedAt: "2026-10-30 14:20",
        company_name: "บริษัท กรีนเทค ฟาร์ม แอนด์ ฟู้ด จำกัด",
        contact_name: "คุณสมชาย มั่งคั่งพาณิชย์",
        contact_phone: "081-999-4455 (LINE: somchai_sme)",
        industry_category: "อาหาร เครื่องดื่ม และเกษตรแปรรูป",
        business_size: "Small SME (ยอดขาย 1.8 - 50 ล้านบาท/ปี)",
        products_offer: "ผลิตและจำหน่ายเครื่องดื่มสมุนไพรออร์แกนิก ได้รับมาตรฐาน อย. และ GMP พร้อมส่งออก",
        matching_needs: [
          "หาตัวแทนจำหน่าย / ช่องทางการจัดจำหน่าย (Distributor)",
          "หาที่ปรึกษาด้านการตลาดดิจิทัล การยิงโฆษณา และ AI Automation"
        ]
      }
    ]
  },
  {
    id: "form_4_skills_directory",
    formNumber: 4,
    title: "ทำเนียบข้อมูลและทักษะความเชี่ยวชาญสมาชิก (Member Skills & Networking Directory)",
    shortTitle: "ทำเนียบทักษะและความเชี่ยวชาญ",
    category: "เครือข่าย & บุคลากร",
    description: "รวบรวมคลังปัญญา องค์ความรู้ และความเชี่ยวชาญเฉพาะทางของสมาชิก SME FAN เพื่อการแลกเปลี่ยนคำปรึกษาและแบ่งปันความรู้ภายในกลุ่ม",
    type: "survey",
    status: "active",
    createdAt: "2026-10-30",
    theme: {
      cardMode: "white",
      themeColor: "#ff0080",
      themeGradient: "linear-gradient(135deg, #ff0080, #ff8c00, #40e0d0, #7928ca, #ff0080)", // Rainbow Prism
      themeTextColor: "#ffffff",
      backgroundImage: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1920&q=80",
      bgOverlayOpacity: 85,
      coverImage: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1600&q=80"
    },
    fields: [
      {
        id: "member_name",
        type: "text",
        label: "ชื่อ - นามสกุล และชื่อเล่น",
        placeholder: "เช่น คุณทีป์ชลิต ทองจันทร์ (ผอ.โต๊ด)",
        required: true
      },
      {
        id: "member_club",
        type: "select",
        label: "สังกัดสนาม / ชมรม",
        required: true,
        options: ["สงสพัท", "โรตารี่", "สมาชิกเครือข่ายทั่วไป"]
      },
      {
        id: "primary_skills",
        type: "checkbox",
        label: "ทักษะความเชี่ยวชาญหลักของท่าน (เลือกได้หลายข้อ)",
        required: true,
        options: [
          "การเงิน บัญชี และการวางแผนภาษีธุรกิจ",
          "การตลาดดิจิทัล, SEO, ยิงแอด Facebook / TikTok",
          "การพัฒนาซอฟต์แวร์, เว็บไซต์, และ AI Automation",
          "กฎหมายธุรกิจ, สัญญาการค้า, และทรัพย์สินทางปัญญา",
          "การบริหารงานบุคคล (HR) และพัฒนาภาวะผู้นำ",
          "การบริหารคลังสินค้า, ซัพพลายเชน และโลจิสติกส์",
          "การเจรจาต่อรอง และการนำเสนอการขาย (B2B Sales)"
        ]
      },
      {
        id: "mentoring_support",
        type: "radio",
        label: "ความพร้อมในการเป็นพี่เลี้ยงหรือให้คำปรึกษาเพื่อนสมาชิก",
        required: true,
        options: [
          "ยินดีให้คำปรึกษาเบื้องต้นฟรี (1-on-1 Mentoring)",
          "ยินดีร่วมเป็นวิทยากรบรรยายแชร์ประสบการณ์ในสัมมนา",
          "สะดวกให้คำปรึกษาเฉพาะโครงการพิเศษที่สนใจ",
          "ขณะนี้ขอเน้นเป็นผู้รับฟังและแลกเปลี่ยนความรู้ทั่วไป"
        ]
      },
      {
        id: "portfolio_social",
        type: "text",
        label: "ช่องทางการติดต่อ / เว็บไซต์ / โปรไฟล์ (LinkedIn / Facebook / TikTok)",
        placeholder: "เช่น https://facebook.com/teepchalit หรือ https://linkedin.com/in/...",
        required: false
      },
      {
        id: "personal_motto",
        type: "textarea",
        label: "คติประจำใจ หรือ ปรัชญาในการดำเนินชีวิต / การทำธุรกิจ",
        placeholder: "เช่น 'การเติบโตที่แท้จริง คือการช่วยให้คนอื่นเติบโตไปด้วยกัน'",
        required: false
      }
    ],
    responses: [
      {
        id: "dir_401",
        submittedAt: "2026-10-31 16:45",
        member_name: "คุณทีป์ชลิต ทองจันทร์ (ผอ.โต๊ด)",
        member_club: "สงสพัท",
        primary_skills: [
          "การพัฒนาซอฟต์แวร์, เว็บไซต์, และ AI Automation",
          "การตลาดดิจิทัล, SEO, ยิงแอด Facebook / TikTok"
        ],
        mentoring_support: "ยินดีให้คำปรึกษาเบื้องต้นฟรี (1-on-1 Mentoring)",
        portfolio_social: "https://smefan.com/team/teepchalit",
        personal_motto: "นำเทคโนโลยีและ AI มาช่วยยกระดับธุรกิจ SME ไทยให้ก้าวไกล"
      }
    ]
  }
];

export const FORMS_STORAGE_KEY = "triple_t_forms_hub_v1";
