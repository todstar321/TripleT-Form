# 🚀 Triple T Form - Next-Gen Form & Registration Platform

เว็บแอปพลิเคชันสร้างแบบฟอร์มลงทะเบียนและแบบสอบถามสไตล์โมเดิร์น ยุคดิจิทัล (Digital-Age UI/UX) ที่ออกแบบมาเพื่อยกระดับประสบการณ์การกรอกฟอร์มให้สวยงาม ทันสมัย เหนือกว่า Google Forms พร้อมระบบเชื่อมต่อ Google Sheets แบบ 2 ทาง (Two-way Real-time Sync)

---

## ✨ จุดเด่นและฟังก์ชันการทำงาน

### 🎨 1. ปรับแต่งดีไซน์ได้อิสระเต็มรูปแบบ (Modern Digital UI)
- **ภาพหน้าปกและฉากหลัง (Cover & Wallpaper)**: ตั้งภาพหน้าปกหัวฟอร์ม และภาพพื้นหลังแบบ Futuristic / Dark Space / Cyber Neon หรือเลือกภาพถ่ายความละเอียดสูงจาก Unsplash
- **สไตล์ Glassmorphism**: เอฟเฟกต์กระจกฝ้าโปร่งแสงดูหรูหรา และรองรับการปรับระดับความมืดของ Background Overlay ให้อ่านง่าย คมชัด
- **Theme Presets ยอดนิยม**: สลับธีมได้ใน 1 คลิก เช่น Cosmic Violet, Cyber Neon, Deep Luxury Gold, Emerald Modern, Sunset Rose, Clean Minimal Light
- **ระบบการตอบแบบฟอร์ม 2 โหมด**:
  - **Classic Scroll Flow**: เลื่อนลงตอบอย่างต่อเนื่องเป็นระเบียบ
  - **Step-by-Step Card Flow**: สไตล์ Typeform โฟกัสทีละข้อ พร้อมปุ่ม Next และรองรับการกดแป้นพิมพ์ `Enter` เพื่อไปข้อถัดไป

### 📊 2. เชื่อมต่อ Google Sheets แบบ 2 ทาง (Two-Way Real-time Sync)
1. **บันทึกข้อมูล (Write)**: ส่งคำตอบจากหน้าฟอร์มเข้า Google Sheets อัตโนมัติทันที พร้อม Timestamp และจัดหัวตารางให้อัตโนมัติ
2. **ดึงตัวเลือกสดจากชีต (Dynamic Options / Live Sync)**:
   - ผูกคำถามแบบ Dropdown หรือ Multiple Choice กับคอลัมน์ใน Google Sheets ได้โดยตรง
   - เมื่อเพิ่มหรือแก้ไขตัวเลือกใน Google Sheets หน้าฟอร์มจะอัปเดตตัวเลือกใหม่ให้ทันทีแบบสดๆ โดยไม่ต้องเข้ามาแก้ไขฟอร์ม!

### 🛠️ 3. เครื่องมือสร้างฟอร์ม (Visual Form Builder)
- จัดการชุดคำถาม: ลากย้ายตำแหน่ง, ทำสำเนา (Duplicate), ลบ, กำหนดข้อที่จำเป็น (Required)
- รองรับประเภทคำถามหลากหลาย:
  - ข้อความสั้น (Short Text)
  - ข้อความยาว (Paragraph)
  - อีเมล (Email)
  - เบอร์โทรศัพท์ (Phone)
  - คำตอบเดียว (Multiple Choice / Modern Radio Cards)
  - หลายตัวเลือก (Checkboxes)
  - รายการเลือกเลื่อนลง (Dropdown - รองรับ Live Sync จาก Sheets)
  - คะแนนประเมิน / ดาว (Star Rating)
  - วันที่ (Date Picker)
- ระบบส่งออก (Export) และนำเข้า (Import) ฟอร์มเป็นไฟล์ JSON
- ระบบบันทึกอัตโนมัติในเบราว์เซอร์ (Auto-save)

### 📲 4. ระบบแชร์และฝังแบบฟอร์ม (Share & Embed)
- สร้างลิงก์ฟอร์มพร้อมปุ่มกดคัดลอก
- สร้าง QR Code อัตโนมัติสำหรับสแกนผ่านมือถือ
- โค้ด HTML `<iframe>` สำหรับนำไปฝังในเว็บไซต์หรือบล็อกของคุณ

---

## 💻 วิธีการรันโปรเจกต์ (Quick Start)

### 1. เปิด Terminal ในโฟลเดอร์นี้ แล้วสั่งรัน:
```bash
npm run dev
```

เปิดเบราว์เซอร์ไปที่: `http://localhost:3000` (หรือพอร์ตที่ระบบแสดง)

### 2. สร้างไฟล์สำหรับ Production (Build):
```bash
npm run build
```

---

## 📑 วิธีการเชื่อมต่อ Google Sheets (ใช้เวลาเพียง 1 นาที)

1. เปิด [Google Sheets](https://sheets.new) แผ่นใหม่
2. ไปที่เมนู **ส่วนขยาย (Extensions) > Apps Script**
3. ลบโค้ดเดิมทั้งหมด แล้วคัดลอกโค้ดจากไฟล์ `google-apps-script/Code.gs` ไปวาง
4. กดปุ่ม **บันทึก (Save)**
5. กดปุ่มสีน้ำเงิน **ทำให้ใช้งานได้ (Deploy) > การทำให้ใช้งานได้ใหม่ (New deployment)**
   - เลือกประเภทเป็น **เว็บแอป (Web app)**
   - เรียกใช้ในฐานะ (Execute as): **ฉัน (Me)**
   - ผู้ที่มีสิทธิ์เข้าถึง (Who has access): **ทุกคน (Anyone)** *(สำคัญมาก)*
6. กด **ทำให้ใช้งานได้ (Deploy)** และให้สิทธิ์บัญชี Google
7. คัดลอก **URL ของเว็บแอป (Web App URL)** มาวางในปุ่ม **"ต่อ Google Sheets"** บนเมนูด้านบนของหน้าเว็บ Triple T Form แล้วกดบันทึก
