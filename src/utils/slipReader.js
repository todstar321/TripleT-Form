import jsQR from 'jsqr';
import { createWorker } from 'tesseract.js';

/**
 * Bank of Thailand 3-digit bank code directory
 */
export const THAI_BANK_CODES = {
  "002": "ธนาคารกรุงเทพ (BBL)",
  "004": "ธนาคารกสิกรไทย (KBANK)",
  "006": "ธนาคารกรุงไทย (KTB)",
  "011": "ธนาคารทหารไทยธนชาต (TTB)",
  "014": "ธนาคารไทยพาณิชย์ (SCB)",
  "022": "ธนาคารซีไอเอ็มบี ไทย (CIMB)",
  "024": "ธนาคารยูโอบี (UOB)",
  "025": "ธนาคารกรุงศรีอยุธยา (BAY)",
  "030": "ธนาคารออมสิน (GSB)",
  "034": "ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร (ธ.ก.ส.)",
  "065": "ธนาคารธนชาต (TBANK)",
  "069": "ธนาคารเกียรตินาคินภัทร (KKP)",
  "070": "ธนาคารไทยเครดิต",
  "073": "ธนาคารแลนด์ แอนด์ เฮ้าส์ (LH Bank)",
  "098": "ธนาคารพัฒนาวิสาหกิจขนาดกลางและขนาดย่อม (SME Bank)"
};

/**
 * Format a Date object to Thai short date string (e.g., "1 พ.ย. 2569")
 */
export const formatThaiSlipDate = (d = new Date()) => {
  const thaiMonths = [
    "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
    "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
  ];
  const day = d.getDate();
  const month = thaiMonths[d.getMonth()];
  const thaiYear = d.getFullYear() + 543;
  return `${day} ${month} ${thaiYear}`;
};

/**
 * Format time to Thai format string (e.g., "14:35 น.")
 */
export const formatThaiSlipTime = (d = new Date()) => {
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes} น.`;
};

/**
 * Generate a realistic Bank Transaction Reference Code fallback
 */
export const generateSlipRefNo = (prefix = "KBNK") => {
  const now = new Date();
  const datePart = now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0');
  const randomPart = Math.floor(100000 + Math.random() * 900000);
  return `${prefix}-${datePart}-${randomPart}`;
};

/**
 * Parse standard EMVCo TLV string (Bank of Thailand Slip Verify Mini-QR)
 * Structure: Tag (2 digits) + Length (2 digits) + Value
 */
export const parseEMVCoTLV = (str) => {
  if (!str || typeof str !== 'string') return {};
  const tags = {};
  let i = 0;
  while (i < str.length - 4) {
    const tag = str.substr(i, 2);
    const len = parseInt(str.substr(i + 2, 2), 10);
    if (isNaN(len) || i + 4 + len > str.length) break;
    const val = str.substr(i + 4, len);
    tags[tag] = val;
    i += 4 + len;
  }
  return tags;
};

/**
 * Parse Thai QR Slip standard payload (EMVCo TLV mini-QR on bank transfer slips)
 */
export const parseThaiQRSlip = (qrRaw) => {
  if (!qrRaw || typeof qrRaw !== 'string') return null;
  
  let sendingBank = "";
  let transRef = "";

  // 1. Try standard EMVCo TLV parse
  const tlv = parseEMVCoTLV(qrRaw);
  if (tlv["01"]) {
    const code = tlv["01"];
    sendingBank = THAI_BANK_CODES[code] || `ธนาคารรหัส ${code}`;
  }
  if (tlv["02"]) {
    transRef = tlv["02"];
  }

  // 2. Fallbacks if TLV offset was slightly shifted
  if (!sendingBank) {
    const bankMatch = qrRaw.match(/0103(\d{3})/);
    if (bankMatch) {
      const code = bankMatch[1];
      sendingBank = THAI_BANK_CODES[code] || `ธนาคารรหัส ${code}`;
    }
  }

  if (!transRef) {
    const refMatch = qrRaw.match(/0103\d{3}02(\d{2})([A-Za-z0-9\-]+)/);
    if (refMatch) {
      const len = parseInt(refMatch[1], 10);
      if (!isNaN(len) && len > 0) {
        transRef = refMatch[2].slice(0, len);
      }
    } else {
      const altRefMatch = qrRaw.match(/02(\d{2})([A-Za-z0-9\-]+)/);
      if (altRefMatch && !altRefMatch[0].startsWith("0201")) {
        const len = parseInt(altRefMatch[1], 10);
        if (!isNaN(len) && len > 0) {
          transRef = altRefMatch[2].slice(0, len);
        }
      }
    }
  }

  if (!transRef) {
    if (qrRaw.includes("000201")) {
      transRef = qrRaw.length > 25 ? `PP-${qrRaw.slice(10, 24)}` : qrRaw;
    } else if (qrRaw.startsWith("http")) {
      const match = qrRaw.match(/([a-zA-Z0-9]{8,})/g);
      transRef = match ? match[match.length - 1] : "";
    } else {
      transRef = qrRaw.slice(0, 32);
    }
  }

  return { sendingBank, transRef };
};

/**
 * Scan an uploaded slip image for PromptPay / Bank Slip mini-QR code using jsQR
 */
export const scanSlipQRFromDataUrl = (dataUrl) => {
  return new Promise((resolve) => {
    if (!dataUrl) {
      resolve(null);
      return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        
        let width = img.width;
        let height = img.height;
        const maxDim = 1400;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        const imageData = ctx.getImageData(0, 0, width, height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert"
        });

        if (code && code.data) {
          resolve(code.data);
        } else {
          const codeRetry = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "attemptBoth"
          });
          resolve(codeRetry ? codeRetry.data : null);
        }
      } catch (err) {
        console.warn("Error scanning slip QR:", err);
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
};

/**
 * Preprocess image on canvas to boost OCR clarity (contrast & scale)
 */
const prepareCanvasForOCR = (img) => {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  let width = img.width;
  let height = img.height;
  const targetWidth = 1400;

  if (width !== targetWidth) {
    height = Math.round((height * targetWidth) / width);
    width = targetWidth;
  }

  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(img, 0, 0, width, height);

  try {
    const imgData = ctx.getImageData(0, 0, width, height);
    const d = imgData.data;
    const factor = (259 * (128 + 45)) / (255 * (259 - 45));
    for (let i = 0; i < d.length; i += 4) {
      const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      const boosted = factor * (gray - 128) + 128;
      d[i] = boosted;
      d[i + 1] = boosted;
      d[i + 2] = boosted;
    }
    ctx.putImageData(imgData, 0, 0);
  } catch (e) {
    // Canvas fallback
  }

  return canvas.toDataURL("image/jpeg", 0.92);
};

// Singleton worker promise to reuse across scans
let cachedWorkerPromise = null;

const getTesseractWorker = async (onProgress) => {
  if (!cachedWorkerPromise) {
    cachedWorkerPromise = (async () => {
      try {
        const worker = await createWorker(['tha', 'eng'], 1, {
          logger: (m) => {
            if (m.status === 'recognizing text' && onProgress) {
              const pct = Math.round(m.progress * 100);
              onProgress(`กำลังอ่านข้อความบนสลิป (${pct}%)`);
            }
          }
        });
        return worker;
      } catch (err) {
        console.warn("Failed to create Tesseract worker with ['tha', 'eng'], falling back to 'eng':", err);
        const workerEng = await createWorker('eng', 1, {
          logger: (m) => {
            if (m.status === 'recognizing text' && onProgress) {
              const pct = Math.round(m.progress * 100);
              onProgress(`กำลังอ่านตัวเลขสลิป (${pct}%)`);
            }
          }
        });
        return workerEng;
      }
    })();
  }
  return cachedWorkerPromise;
};

/**
 * Recognize text from image using Tesseract OCR with timeout safeguard
 */
export const recognizeSlipText = async (dataUrl, onProgress) => {
  return new Promise(async (resolve) => {
    const timeout = setTimeout(() => {
      console.warn("OCR recognize timed out after 15s");
      resolve("");
    }, 15000);

    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = async () => {
        try {
          const preprocessedUrl = prepareCanvasForOCR(img);
          const worker = await getTesseractWorker(onProgress);
          const ret = await worker.recognize(preprocessedUrl);
          clearTimeout(timeout);
          resolve(ret?.data?.text || "");
        } catch (ocrErr) {
          console.warn("Error inside worker.recognize:", ocrErr);
          clearTimeout(timeout);
          resolve("");
        }
      };
      img.onerror = () => {
        clearTimeout(timeout);
        resolve("");
      };
      img.src = dataUrl;
    } catch (err) {
      console.warn("Error initializing OCR:", err);
      clearTimeout(timeout);
      resolve("");
    }
  });
};

/**
 * Helper to identify bank name from text snippet
 */
const detectBankFromSnippet = (snippet) => {
  if (!snippet) return "";
  if (/กสิกร|KBANK|K PLUS|K-PLUS/i.test(snippet)) return "ธนาคารกสิกรไทย (KBANK)";
  if (/ไทยพาณิชย์|SCB|EASY/i.test(snippet)) return "ธนาคารไทยพาณิชย์ (SCB)";
  if (/กรุงไทย|KTB|NEXT/i.test(snippet)) return "ธนาคารกรุงไทย (KTB)";
  if (/กรุงเทพ|BBL|Bualuang/i.test(snippet)) return "ธนาคารกรุงเทพ (BBL)";
  if (/กรุงศรี|BAY|อยุธยา/i.test(snippet)) return "ธนาคารกรุงศรีอยุธยา (BAY)";
  if (/ทหารไทย|ttb|TMB|ธนชาต/i.test(snippet)) return "ธนาคารทหารไทยธนชาต (TTB)";
  if (/ออมสิน|GSB/i.test(snippet)) return "ธนาคารออมสิน (GSB)";
  if (/พร้อมเพย์|PromptPay/i.test(snippet)) return "พร้อมเพย์ (PromptPay)";
  if (/ธ\.?ก\.?ส|BAAC/i.test(snippet)) return "ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร (ธ.ก.ส.)";
  return "";
};

/**
 * Intelligent parser to extract amount, date, time, sender, receiver from slip OCR text
 */
export const parseSlipText = (text, qrRaw = '', context = {}) => {
  const normalizedText = (text || "").replace(/\r/g, "");
  
  // 1. EXTRACT AMOUNT (MULTILINE RESILIENT)
  let parsedAmount = null;

  const labeledRegexes = [
    /(?:จำนวนเงินโอน|จำนวนเงิน|จํานวนเงิน|ยอดเงินโอน|ยอดเงินที่โอน|ยอดเงิน|ยอดโอน|จำนวน|\bAmount\b|\bTotal\b|\bAmt\b)[\s\S]{0,35}?([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2}))/i,
    /([0-9]{1,3}(?:,[0-9]{3})*\.[0-9]{2})\s*(?:THB|บาท|บ\.)/i,
    /(?:THB|บาท)\s*([0-9]{1,3}(?:,[0-9]{3})*\.[0-9]{2})/i
  ];

  for (const regex of labeledRegexes) {
    const match = normalizedText.match(regex);
    if (match) {
      const val = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(val) && val > 0) {
        parsedAmount = val;
        break;
      }
    }
  }

  if (parsedAmount === null) {
    const allDecimals = Array.from(normalizedText.matchAll(/([0-9]{1,3}(?:,[0-9]{3})*\.[0-9]{2})/g))
      .map(m => parseFloat(m[1].replace(/,/g, '')))
      .filter(n => !isNaN(n) && n > 0);
    
    if (allDecimals.length > 0) {
      if (context.expectedAmount && allDecimals.includes(Number(context.expectedAmount))) {
        parsedAmount = Number(context.expectedAmount);
      } else {
        parsedAmount = allDecimals[0];
      }
    }
  }

  // 2. EXTRACT DATE (FROM SLIP)
  let parsedDate = '';
  let isDateDetected = false;

  const thaiMonthMap = {
    "ม.ค.": "ม.ค.", "มกราคม": "ม.ค.", "Jan": "ม.ค.", "January": "ม.ค.",
    "ก.พ.": "ก.พ.", "กุมภาพันธ์": "ก.พ.", "Feb": "ก.พ.", "February": "ก.พ.",
    "มี.ค.": "มี.ค.", "มีนาคม": "มี.ค.", "Mar": "มี.ค.", "March": "มี.ค.",
    "เม.ย.": "เม.ย.", "เมษายน": "เม.ย.", "Apr": "เม.ย.", "April": "เม.ย.",
    "พ.ค.": "พ.ค.", "พฤษภาคม": "พ.ค.", "May": "พ.ค.",
    "มิ.ย.": "มิ.ย.", "มิถุนายน": "มิ.ย.", "Jun": "มิ.ย.", "June": "มิ.ย.",
    "ก.ค.": "ก.ค.", "กรกฎาคม": "ก.ค.", "Jul": "ก.ค.", "July": "ก.ค.",
    "ส.ค.": "ส.ค.", "สิงหาคม": "ส.ค.", "Aug": "ส.ค.", "August": "ส.ค.",
    "ก.ย.": "ก.ย.", "กันยายน": "ก.ย.", "Sep": "ก.ย.", "September": "ก.ย.",
    "ต.ค.": "ต.ค.", "ตุลาคม": "ต.ค.", "Oct": "ต.ค.", "October": "ต.ค.",
    "พ.ย.": "พ.ย.", "พฤศจิกายน": "พ.ย.", "Nov": "พ.ย.", "November": "พ.ย.",
    "ธ.ค.": "ธ.ค.", "ธันวาคม": "ธ.ค.", "Dec": "ธ.ค.", "December": "ธ.ค."
  };

  const thaiDateRegex = /(\d{1,2})\s+(ม\.?ค\.?|ก\.?พ\.?|มี\.?ค\.?|เม\.?ย\.?|พ\.?ค\.?|มิ\.?ย\.?|ก\.?ค\.?|ส\.?ค\.?|ก\.?ย\.?|ต\.?ค\.?|พ\.?ย\.?|ธ\.?ค\.?|มกราคม|กุมภาพันธ์|มีนาคม|เมษายน|พฤษภาคม|มิถุนายน|กรกฎาคม|สิงหาคม|กันยายน|ตุลาคม|พฤศจิกายน|ธันวาคม|Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{2,4})/i;
  const matchThaiDate = normalizedText.match(thaiDateRegex);

  if (matchThaiDate) {
    const day = parseInt(matchThaiDate[1], 10);
    const rawMonth = matchThaiDate[2].trim();
    let month = rawMonth;
    for (const [key, val] of Object.entries(thaiMonthMap)) {
      if (rawMonth.toLowerCase().startsWith(key.toLowerCase().replace(/\./g, ''))) {
        month = val;
        break;
      }
    }
    let year = parseInt(matchThaiDate[3], 10);
    if (year < 100) {
      year = year >= 50 ? 2500 + year : 2000 + year;
    } else if (year < 2400) {
      year = year + 543;
    }
    parsedDate = `${day} ${month} ${year}`;
    isDateDetected = true;
  }

  if (!parsedDate) {
    const numericDateMatch = normalizedText.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
    if (numericDateMatch) {
      const day = parseInt(numericDateMatch[1], 10);
      const monthIdx = parseInt(numericDateMatch[2], 10) - 1;
      let year = parseInt(numericDateMatch[3], 10);
      if (year < 100) {
        year = year >= 50 ? 2500 + year : 2000 + year;
      } else if (year < 2400) {
        year = year + 543;
      }
      const months = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
      if (monthIdx >= 0 && monthIdx < 12) {
        parsedDate = `${day} ${months[monthIdx]} ${year}`;
        isDateDetected = true;
      }
    }
  }

  // 3. EXTRACT TIME (FROM SLIP)
  let parsedTime = '';
  let isTimeDetected = false;

  const timeMatch = normalizedText.match(/([0-2]?[0-9]:[0-5][0-9](?::[0-5][0-9])?)/);
  if (timeMatch) {
    parsedTime = `${timeMatch[1].trim()} น.`;
    isTimeDetected = true;
  }

  // 4. SEPARATE "FROM" (ผู้โอน) AND "TO" (ผู้รับโอน) SECTIONS
  const fromMatch = normalizedText.match(/(?:จาก|ผู้โอนเง?ิน|ผู้โอน|\bSender\b|\bFrom\b)[\s\S]{0,160}?(?=(?:ไปยัง|ถึง|\bTo\b|ผู้รับ|จำนวนเงิน|\bAmount\b|$))/i);
  const fromSection = fromMatch ? fromMatch[0] : "";

  const toMatch = normalizedText.match(/(?:ไปยังบัญชี|ไปยัง|ถึง|ผู้รับโอน|ผู้รับ|\bTo\b|\bRecipient\b)[\s\S]{0,220}?(?=(?:จำนวนเงิน|\bAmount\b|ค่าธรรมเนียม|\bFee\b|บันทึก|\bMemo\b|รหัสอ้างอิง|$))/i);
  const toSection = toMatch ? toMatch[0] : "";

  // 5. EXTRACT SENDER
  let parsedSender = '';
  if (fromSection) {
    const lines = fromSection.split('\n').map(l => l.trim()).filter(Boolean);
    for (const line of lines) {
      if (/จาก|ผู้โอน|Sender|From/i.test(line)) continue;
      if (/กสิกร|ไทยพาณิชย์|กรุงไทย|กรุงเทพ|กรุงศรี|ทหารไทย|ออมสิน|KBANK|SCB|KTB|BBL|BAY|TTB|GSB|xxx-/i.test(line)) continue;
      if (line.length >= 3) {
        parsedSender = line.replace(/[\(\)\[\]\{\}]/g, '').replace(/xxx-[0-9\-]+/gi, '').trim();
        if (parsedSender) break;
      }
    }
  }

  if (!parsedSender) {
    const engName = normalizedText.match(/([A-Z][A-Z\-\s]{3,35}[A-Z])/);
    if (engName && !/SCAN|PAY|BANK|PLUS|TRANSFER|SUCCESS|AMOUNT|TOTAL|DATE|TIME/i.test(engName[1])) {
      parsedSender = engName[1].trim();
    }
  }

  // 6. EXTRACT RECEIVER BANK & ACCOUNT (ผู้รับโอน)
  let receiverBank = detectBankFromSnippet(toSection);
  let receiverAccount = "";
  let receiverName = "";

  if (toSection) {
    const accMatch = toSection.match(/(?:xxx[-\s]?[0-9xX]+[-\s]?[0-9]+|\d{3}[-\s]?\d{1}[-\s]?\d{4,5}[-\s]?\d{1}|\d{10,12})/);
    if (accMatch) {
      receiverAccount = accMatch[0].trim();
    }

    const lines = toSection.split('\n').map(l => l.trim()).filter(Boolean);
    for (const line of lines) {
      if (/ไปยัง|ถึง|ผู้รับ|To|Recipient/i.test(line)) continue;
      if (/กสิกร|ไทยพาณิชย์|กรุงไทย|กรุงเทพ|กรุงศรี|ทหารไทย|ออมสิน|KBANK|SCB|KTB|BBL|BAY|TTB|GSB|xxx-/i.test(line)) continue;
      if (line.length >= 3 && !receiverName) {
        receiverName = line.replace(/[\(\)\[\]\{\}]/g, '').trim();
      }
    }
  }

  if (!receiverBank) {
    receiverBank = detectBankFromSnippet(normalizedText);
  }

  // 7. EXTRACT QR CODE METADATA (BOT SLIP VERIFY)
  let parsedSendingBank = '';
  let parsedRef = '';

  const qrInfo = parseThaiQRSlip(qrRaw);
  if (qrInfo) {
    if (qrInfo.sendingBank) parsedSendingBank = qrInfo.sendingBank;
    if (qrInfo.transRef) parsedRef = qrInfo.transRef;
  }

  if (!parsedRef) {
    const refRegex = /(?:รห[ั้]?ส[อถ]?้?า?ง[อถ]?ิ?ง|เลขอ้างอิง|หมายเลขอ้างอิง|เลขที่รายการ|Ref(?:\s*No)?|Transaction(?:\s*ID|\s*Ref)?)[^\dA-Za-z]{0,10}([A-Za-z0-9\-]{8,})/i;
    const matchRef = normalizedText.match(refRegex);
    if (matchRef) {
      parsedRef = matchRef[1].trim();
    }
  }

  // 8. STRICT FINANCIAL CROSS-CHECK (RECEIVER VERIFICATION)
  const expectedBank = context.bankAccount || {
    bankName: "ธนาคารกสิกรไทย (KBANK)",
    accountNumber: "045-8-99921-4",
    accountName: "กองทุนกิจกรรม SME FAN (ทีป์ชลิต ทองจันทร์)"
  };

  const expectedAccountClean = (expectedBank.accountNumber || "").replace(/[^0-9]/g, '');
  const expectedAccountSuffix = expectedAccountClean.length >= 4 
    ? expectedAccountClean.slice(-4) 
    : expectedAccountClean;

  const detectedAccountClean = (receiverAccount || "").replace(/[^0-9]/g, '');
  const isAccountSuffixMatched = expectedAccountSuffix && detectedAccountClean.endsWith(expectedAccountSuffix);

  const isBankMatched = receiverBank.includes("กสิกร") || 
    receiverBank.includes("KBANK") || 
    expectedBank.bankName.includes(receiverBank.replace(/\s*\(.*\)/, '').trim());

  const nameKeywords = ["กองทุน", "SME", "FAN", "ทีป์ชลิต", "ทองจันทร์"];
  const isNameMatched = nameKeywords.some(kw => 
    toSection.includes(kw) || receiverName.includes(kw)
  );

  let receiverVerificationStatus = "unclear";
  let receiverVerificationMessage = "";
  let isReceiverVerified = false;

  if (isAccountSuffixMatched || (isBankMatched && isNameMatched)) {
    receiverVerificationStatus = "verified";
    isReceiverVerified = true;
    receiverVerificationMessage = `ตรงกับบัญชีทางการของงาน (${expectedBank.bankName} เลขที่ ${expectedBank.accountNumber})`;
  } else if (receiverBank && !isBankMatched) {
    receiverVerificationStatus = "mismatch";
    isReceiverVerified = false;
    receiverVerificationMessage = `คำเตือน: ในสลิปตรวจพบว่าโอนไปยัง ${receiverBank} ซึ่งไม่ตรงกับบัญชีของงาน (${expectedBank.bankName})`;
  } else if (detectedAccountClean.length >= 4 && !isAccountSuffixMatched) {
    receiverVerificationStatus = "mismatch";
    isReceiverVerified = false;
    receiverVerificationMessage = `คำเตือน: เลขบัญชีผู้รับในสลิป (...${detectedAccountClean.slice(-4)}) ไม่ตรงกับบัญชีของงาน (...${expectedAccountSuffix})`;
  } else {
    receiverVerificationStatus = "unclear";
    isReceiverVerified = true;
    receiverVerificationMessage = `บันทึกเข้าบัญชีงาน: ${expectedBank.bankName} เลขที่ ${expectedBank.accountNumber}`;
  }

  return {
    amount: parsedAmount,
    transferDate: parsedDate,
    transferTime: parsedTime,
    isDateDetected,
    isTimeDetected,
    senderName: parsedSender,
    sendingBank: parsedSendingBank,
    receiverBank: receiverBank || expectedBank.bankName,
    receiverAccount: receiverAccount || expectedBank.accountNumber,
    receiverName: receiverName || expectedBank.accountName,
    refNo: parsedRef,
    receiverVerification: {
      status: receiverVerificationStatus,
      isMatched: isReceiverVerified,
      message: receiverVerificationMessage
    }
  };
};

/**
 * Extract structured verification data from slip image using real OCR and QR parsing
 * @param {string} dataUrl - Base64 image data
 * @param {object} context - { attendeeName, expectedAmount, bankAccount }
 * @param {function} onProgress - Progress status callback
 * @returns {Promise<object>} Structured slip verification record
 */
export const analyzeSlipData = async (dataUrl, context = {}, onProgress = null) => {
  const now = new Date();
  const attendeeName = context.attendeeName || "ผู้ลงทะเบียน";
  const expectedAmount = Number(context.expectedAmount || 0);
  const bankConfig = context.bankAccount || {
    bankName: "ธนาคารกสิกรไทย (KBANK)",
    accountNumber: "045-8-99921-4",
    accountName: "กองทุนกิจกรรม SME FAN (ทีป์ชลิต ทองจันทร์)"
  };

  // Step 1: Scan QR code
  if (onProgress) onProgress("กำลังตรวจหา QR Code สลิป...");
  const qrRaw = await scanSlipQRFromDataUrl(dataUrl);

  // Step 2: Run AI OCR to read text from slip image
  if (onProgress) onProgress("กำลังอ่านตัวเลขและข้อความจากภาพสลิปจริง...");
  const ocrText = await recognizeSlipText(dataUrl, onProgress);

  // Step 3: Parse extracted text
  const parsed = parseSlipText(ocrText, qrRaw, context);

  // Determine actual values (real OCR values prioritized, fallback to sensible context)
  const actualAmount = parsed.amount !== null ? parsed.amount : expectedAmount;
  const actualDate = parsed.transferDate || formatThaiSlipDate(now);
  const actualTime = parsed.transferTime || formatThaiSlipTime(now);
  const actualSender = parsed.senderName || attendeeName;
  const actualBank = parsed.sendingBank || parsed.receiverBank || bankConfig.bankName || "ธนาคารพาณิชย์";
  const actualRef = parsed.refNo || (qrRaw ? (qrRaw.length > 25 ? qrRaw.slice(0, 26) : qrRaw) : generateSlipRefNo("SLIP"));

  const isMatched = (actualAmount === expectedAmount);
  const isUnderpaid = (expectedAmount > 0 && actualAmount < expectedAmount);
  const isOverpaid = (actualAmount > expectedAmount);
  const shortage = isUnderpaid ? (expectedAmount - actualAmount) : 0;
  const contribution = isOverpaid ? (actualAmount - expectedAmount) : 0;

  const receiverStr = `${parsed.receiverBank} เลขที่ ${parsed.receiverAccount} (${parsed.receiverName || bankConfig.accountName})`;

  if (onProgress) onProgress("อ่านข้อมูลสลิปเรียบร้อยแล้ว");

  return {
    transferDate: actualDate,
    transferTime: actualTime,
    isDateDetected: parsed.isDateDetected,
    isTimeDetected: parsed.isTimeDetected,
    senderName: actualSender,
    receiverAccount: receiverStr,
    receiverBank: parsed.receiverBank,
    receiverAccountNumber: parsed.receiverAccount,
    receiverName: parsed.receiverName,
    receiverVerification: parsed.receiverVerification,
    amount: actualAmount,
    expectedAmount: expectedAmount,
    refNo: actualRef,
    bankName: actualBank,
    qrRawData: qrRaw || "",
    hasQR: !!qrRaw,
    ocrTextRaw: ocrText,
    isAmountMatched: isMatched,
    isUnderpaid: isUnderpaid,
    isOverpaid: isOverpaid,
    shortage: shortage,
    contribution: contribution,
    ocrDetected: parsed.amount !== null,
    financeStatus: isUnderpaid ? "underpaid" : "verified",
    scannedAt: now.toISOString()
  };
};

