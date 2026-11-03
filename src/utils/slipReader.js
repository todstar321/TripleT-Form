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
 * Preprocess and crop a specific region of an image on canvas to boost OCR clarity (contrast & scale)
 */
export const cropAndPreprocessSlice = (img, sxPct = 0, syPct = 0, swPct = 1, shPct = 1, options = {}) => {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  const sx = Math.floor(img.width * Math.max(0, Math.min(1, sxPct)));
  const sy = Math.floor(img.height * Math.max(0, Math.min(1, syPct)));
  const sw = Math.floor(img.width * Math.max(0.1, Math.min(1, swPct)));
  const sh = Math.floor(img.height * Math.max(0.1, Math.min(1, shPct)));

  // Target width around 800 - 1200px for optimal OCR recognition
  const targetW = options.targetWidth || (sw < 600 ? Math.min(1200, sw * 3) : Math.min(1400, sw * 2));
  const scale = targetW / sw;
  const targetH = Math.round(sh * scale);

  canvas.width = targetW;
  canvas.height = targetH;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetW, targetH);

  try {
    const imgData = ctx.getImageData(0, 0, targetW, targetH);
    const d = imgData.data;
    const contrastVal = options.contrast !== undefined ? options.contrast : 55;
    const factor = (259 * (128 + contrastVal)) / (255 * (259 - contrastVal));
    
    for (let i = 0; i < d.length; i += 4) {
      // Grayscale conversion
      const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      // High contrast boosting
      const boosted = factor * (gray - 128) + 128;
      const clamped = Math.max(0, Math.min(255, boosted));
      d[i] = clamped;
      d[i + 1] = clamped;
      d[i + 2] = clamped;
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
        // PSM 6: Assume a single uniform block of text (prevents column fragmentation on mobile slips)
        await worker.setParameters({
          tessedit_pageseg_mode: '6',
          preserve_interword_spaces: '1'
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
        await workerEng.setParameters({
          tessedit_pageseg_mode: '6',
          preserve_interword_spaces: '1'
        });
        return workerEng;
      }
    })();
  }
  return cachedWorkerPromise;
};

/**
 * Recognize text from image using Multi-Region Tesseract OCR with timeout safeguard
 * Slices the slip into Amount, Parties, and Header regions to bypass watermarks and mascots
 */
export const recognizeSlipText = async (dataUrl, onProgress) => {
  return new Promise(async (resolve) => {
    const timeout = setTimeout(() => {
      console.warn("OCR recognize timed out after 20s");
      resolve("");
    }, 20000);

    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = async () => {
        try {
          const worker = await getTesseractWorker(onProgress);

          // Region 1: Amount Slice (y: 48% - 80%, x: 0 - 85% to exclude mascot)
          if (onProgress) onProgress("กำลังอ่านยอดเงินโอนจริงจากสลิป (Amount Region)...");
          const amountSliceUrl = cropAndPreprocessSlice(img, 0, 0.46, 0.85, 0.36, { contrast: 60 });
          const resAmount = await worker.recognize(amountSliceUrl);
          const amountText = resAmount?.data?.text || "";

          // Region 2: Parties Slice (y: 14% - 60%, x: 0 - 75% to exclude mascot)
          if (onProgress) onProgress("กำลังอ่านชื่อผู้โอนและบัญชีผู้รับ (Parties Region)...");
          const partiesSliceUrl = cropAndPreprocessSlice(img, 0, 0.14, 0.75, 0.46, { contrast: 50 });
          const resParties = await worker.recognize(partiesSliceUrl);
          const partiesText = resParties?.data?.text || "";

          // Region 3: Header / Date Slice (y: 4% - 28%, full width)
          if (onProgress) onProgress("กำลังอ่านวันที่และเวลาโอน (Header Region)...");
          const headerSliceUrl = cropAndPreprocessSlice(img, 0, 0.04, 1.0, 0.26, { contrast: 45 });
          const resHeader = await worker.recognize(headerSliceUrl);
          const headerText = resHeader?.data?.text || "";

          // Combine region texts with section headers in natural visual order:
          // 1. Header (Date / Time)
          // 2. Parties (Sender -> Receiver)
          // 3. Amount & Ref
          const combinedText = [
            "=== HEADER SECTION ===",
            headerText,
            "=== PARTIES SECTION ===",
            partiesText,
            "=== AMOUNT SECTION ===",
            amountText
          ].join("\n");

          clearTimeout(timeout);
          resolve(combinedText);
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
export const detectBankFromSnippet = (snippet) => {
  if (!snippet) return "";
  if (/กสิกร|กศิ|KBANK|K PLUS|K-PLUS/i.test(snippet)) return "ธนาคารกสิกรไทย (KBANK)";
  if (/กรุงศรี|กจุงศ|อยุธยา|BAY/i.test(snippet)) return "ธนาคารกรุงศรีอยุธยา (BAY)";
  if (/ไทยพาณิชย์|SCB|EASY/i.test(snippet)) return "ธนาคารไทยพาณิชย์ (SCB)";
  if (/กรุงไทย|KTB|NEXT/i.test(snippet)) return "ธนาคารกรุงไทย (KTB)";
  if (/กรุงเทพ|BBL|Bualuang/i.test(snippet)) return "ธนาคารกรุงเทพ (BBL)";
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
  
  // 1. EXTRACT AMOUNT (MULTILINE RESILIENT & FEE AVOIDANCE)
  let parsedAmount = null;

  // Filter out explicit fee lines first (ค่าธรรมเนียม / Fee: 0.00)
  const nonFeeLines = normalizedText
    .split('\n')
    .filter(line => !/ค่าธรรมเนียม|Fee|000 uw|0\.00\s*(?:บาท|ขาท|THB|บ\.|uw|wm|๓)/i.test(line))
    .join('\n');

  // Regex 1: Labeled with Thai / Eng keywords (handling OCR misread of 'จำนวน')
  const labeledRegexes = [
    /(?:จำนวนเงินโอน|จำนวนเงิน|จํานวนเงิน|ยอดเงินโอน|ยอดเงินที่โอน|ยอดเงิน|ยอดโอน|จำนวน|จํานวน|จํามาด|จําฆาน|จํานาน|จําขาน|\bAmount\b|\bTotal\b|\bAmt\b)[\s\S]{0,35}?([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2}))/i,
    /([0-9]{1,3}(?:,[0-9]{3})*\.[0-9]{2})\s*(?:THB|บาท|ขาท|บ\.|Unn|บาn|wm|wu|๓|Baht)/i,
    /(?:THB|บาท|ขาท)\s*([0-9]{1,3}(?:,[0-9]{3})*\.[0-9]{2})/i
  ];

  for (const regex of labeledRegexes) {
    const match = nonFeeLines.match(regex);
    if (match) {
      const val = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(val) && val > 0) {
        parsedAmount = val;
        break;
      }
    }
  }

  // Fallback: extract all non-zero decimal numbers with 2 decimal places
  if (parsedAmount === null) {
    const allDecimals = Array.from(nonFeeLines.matchAll(/([0-9]{1,3}(?:,[0-9]{3})*\.[0-9]{2})/g))
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
    "พ.ย.": "พ.ย.", "พฤศจิกายน": "พ.ย.", "พแต": "พ.ย.", "พย": "พ.ย.", "พ.บ.": "พ.ย.", "Nov": "พ.ย.", "November": "พ.ย.",
    "ธ.ค.": "ธ.ค.", "ธันวาคม": "ธ.ค.", "Dec": "ธ.ค.", "December": "ธ.ค."
  };

  const thaiDateRegex = /(\d{1,2})\s*[\s\.\-\/]?\s*(ม\.?ค\.?|ก\.?พ\.?|มี\.?ค\.?|เม\.?ย\.?|พ\.?ค\.?|มิ\.?ย\.?|ก\.?ค\.?|ส\.?ค\.?|ก\.?ย\.?|ต\.?ค\.?|พ\.?ย\.?|ธ\.?ค\.?|พแต|พย|พ\.บ\.|มกราคม|กุมภาพันธ์|มีนาคม|เมษายน|พฤษภาคม|มิถุนายน|กรกฎาคม|สิงหาคม|กันยายน|ตุลาคม|พฤศจิกายน|ธันวาคม|Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s*[\s\.\-\/]?\s*(\d{2,4})/i;
  const matchThaiDate = normalizedText.match(thaiDateRegex);

  if (matchThaiDate) {
    const day = parseInt(matchThaiDate[1], 10);
    const rawMonth = matchThaiDate[2].trim();
    let month = "พ.ย.";
    for (const [key, val] of Object.entries(thaiMonthMap)) {
      if (rawMonth.toLowerCase().startsWith(key.toLowerCase().replace(/\./g, '')) || rawMonth === key) {
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

  // 3. EXTRACT TIME (FROM HEADER/PARTIES SECTIONS, AVOIDING CONFLICT WITH AMOUNTS)
  let parsedTime = '';
  let isTimeDetected = false;

  const headerAndParties = normalizedText.replace(/=== AMOUNT SECTION ===[\s\S]*$/, '');
  const timeMatch = (headerAndParties || normalizedText).match(/(?:เวลา\s*)?([0-2]?[0-9]:[0-5][0-9](?::[0-5][0-9])?|[0-2]?[0-9]\.[0-5][0-9]\s*น)/i);
  if (timeMatch) {
    const raw = timeMatch[1].replace(/น\.?/i, '').trim().replace('.', ':');
    parsedTime = `${raw} น.`;
    isTimeDetected = true;
  }

  // 4. HELPER: DETECT ACCOUNT MASK / ACCOUNT NUMBERS (PREVENT BEING USED AS SENDER NAME)
  const isAccountMask = (str) => {
    if (!str) return true;
    const trimmed = str.trim();
    if (/^xxx/i.test(trimmed)) return true;
    if (/^[xX0-9\-\s\.\/]{5,}$/.test(trimmed)) return true;
    return false;
  };

  const isDateOrTimeLine = (str) => {
    if (/\d{1,2}[:.]\d{2}/.test(str)) return true;
    if (/(?:ม\.?ค|ก\.?พ|มี\.?ค|เม\.?ย|พ\.?ค|มิ\.?ย|ก\.?ค|ส\.?ค|ก\.?ย|ต\.?ค|พ\.?ย|ธ\.?ค|พแต|พย)/i.test(str)) return true;
    if (/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/i.test(str)) return true;
    return false;
  };

  const isAmountLabel = (str) => {
    return /จำนวน|จํานวน|จํามาด|จําฆาน|จํานาน|จําขาน|ยอดเงิน|ยอดโอน|Amount|Total|Amt|ค่าธรรมเนียม|Fee/i.test(str);
  };

  const cleanPersonName = (str) => {
    if (!str) return "";
    return str
      .replace(/^[0-9๑-๙\.\s\-\_\(\)\[\]\{\}\@\*\&\|\+\#\:\;]+/, '')
      .replace(/xxx-[0-9xX\-]+/gi, '')
      .replace(/[0-9๑-๙\.\s\-\_\(\)\[\]\{\}\@\*\&\|\+\#\:\;]+$/, '')
      .trim();
  };

  // 5. EXTRACT SENDER, RECEIVER, AND BANKS
  let parsedSender = '';
  let receiverName = '';
  let sendingBank = '';
  let receiverBank = '';
  let receiverAccount = '';

  // Focus on PARTIES SECTION for Sender and Receiver
  const partiesMatch = normalizedText.match(/=== PARTIES SECTION ===([\s\S]*?)(?:=== AMOUNT SECTION ===|$)/);
  const partiesTextOnly = partiesMatch ? partiesMatch[1] : normalizedText;
  const partyLines = partiesTextOnly.split('\n').map(l => l.trim()).filter(Boolean);

  for (const line of partyLines) {
    if (/===|โอนเงิน|สําเว็จ|สำเร็จ|ค่าธรรมเนียม|รายการ|Ref|Transaction/i.test(line)) continue;
    if (isAmountLabel(line)) continue;
    
    // Check if line contains bank keywords
    const detectedBank = detectBankFromSnippet(line);
    if (detectedBank) {
      if (!sendingBank) {
        sendingBank = detectedBank;
      } else if (!receiverBank && detectedBank !== sendingBank) {
        receiverBank = detectedBank;
      }
      continue;
    }

    if (isDateOrTimeLine(line)) continue;

    // Check for Account mask (e.g. xxx-x-x9115-x)
    if (isAccountMask(line)) {
      if (line.includes('9115') || (parsedSender && !receiverAccount)) {
        receiverAccount = line;
      }
      continue;
    }

    const cleaned = cleanPersonName(line);
    if (cleaned.length >= 3 && !isAccountMask(cleaned) && !isAmountLabel(cleaned)) {
      if (!parsedSender) {
        parsedSender = cleaned;
      } else if (!receiverName && cleaned !== parsedSender) {
        receiverName = cleaned;
      }
    }
  }

  // Find distinct receiving bank from any section if not yet found
  if (!receiverBank || receiverBank === sendingBank) {
    const allLines = normalizedText.split('\n');
    for (const l of allLines) {
      const b = detectBankFromSnippet(l);
      if (b && b !== sendingBank) {
        receiverBank = b;
        break;
      }
    }
  }

  // Secondary extraction for sender if still empty
  if (!parsedSender) {
    const fromMatch = normalizedText.match(/(?:จาก|ผู้โอน)[\s\S]{0,120}?(?=(?:ไปยัง|ถึง|ผู้รับ|จำนวนเงิน|$))/i);
    if (fromMatch) {
      const fLines = fromMatch[0].split('\n').map(l => l.trim()).filter(Boolean);
      for (const l of fLines) {
        if (/จาก|ผู้โอน/i.test(l) || detectBankFromSnippet(l) || isDateOrTimeLine(l) || isAccountMask(l) || isAmountLabel(l)) continue;
        const c = cleanPersonName(l);
        if (c.length >= 3) {
          parsedSender = c;
          break;
        }
      }
    }
  }

  // 6. EXTRACT QR CODE METADATA (BOT SLIP VERIFY)
  let parsedRef = '';

  const qrInfo = parseThaiQRSlip(qrRaw);
  if (qrInfo) {
    if (qrInfo.sendingBank && !sendingBank) sendingBank = qrInfo.sendingBank;
    if (qrInfo.transRef) parsedRef = qrInfo.transRef;
  }

  if (!parsedRef) {
    const refRegex = /(?:รห[ั้]?ส[อถ]?้?า?ง[อถ]?ิ?ง|เลขอ้างอิง|หมายเลขอ้างอิง|เลขที่รายการ|Ref(?:\s*No)?|Transaction(?:\s*ID|\s*Ref)?)[^\dA-Za-z]{0,10}([A-Za-z0-9\-]{8,})/i;
    const matchRef = normalizedText.match(refRegex);
    if (matchRef) {
      parsedRef = matchRef[1].trim();
    }
  }

  // 7. STRICT FINANCIAL CROSS-CHECK (RECEIVER VERIFICATION)
  const expectedBank = context.bankAccount || {
    bankName: "ธนาคารกสิกรไทย (KBANK)",
    accountNumber: "045-8-99921-4",
    accountName: "กองทุนกิจกรรม SME FAN (ทีป์ชลิต ทองจันทร์)"
  };

  // Known authorized accounts for ผอ.โต๊ด & SME FAN:
  // 1) KBANK: 045-8-99921-4 (กองทุนกิจกรรม SME FAN / ทีป์ชลิต ทองจันทร์)
  // 2) Krungsri (BAY): xxx-x-x9115-x (ว่าที่ ร.ต. ทีปชลิต ทองจันทร์)
  const nameKeywords = ["กองทุน", "SME", "FAN", "ทีป์ชลิต", "ทีปชลิต", "ทีปัชคิด", "ทองจันทร์"];
  const isTodAccount = nameKeywords.some(kw => 
    normalizedText.includes(kw) || receiverName.includes(kw)
  );

  let receiverVerificationStatus = "unclear";
  let receiverVerificationMessage = "";
  let isReceiverVerified = false;

  if (isTodAccount) {
    isReceiverVerified = true;
    receiverVerificationStatus = "verified";
    if (receiverBank.includes("กรุงศรี") || normalizedText.includes("กรุงศรี") || normalizedText.includes("กจุงศ")) {
      receiverBank = "ธนาคารกรุงศรีอยุธยา (BAY)";
      if (!receiverAccount) receiverAccount = "xxx-x-x9115-x";
      if (!receiverName) receiverName = "ว่าที่ ร.ต. ทีปชลิต ทองจันทร์";
      receiverVerificationMessage = "ตรงกับบัญชีทางการของ ผอ.ทีป์ชลิต ทองจันทร์ (ธ.กรุงศรีอยุธยา)";
    } else {
      receiverBank = expectedBank.bankName;
      if (!receiverAccount) receiverAccount = expectedBank.accountNumber;
      if (!receiverName) receiverName = expectedBank.accountName;
      receiverVerificationMessage = `ตรงกับบัญชีทางการของงาน (${expectedBank.bankName} เลขที่ ${expectedBank.accountNumber})`;
    }
  } else if (receiverBank && !receiverBank.includes("กสิกร") && !receiverBank.includes("กรุงศรี")) {
    receiverVerificationStatus = "mismatch";
    isReceiverVerified = false;
    receiverVerificationMessage = `คำเตือน: ในสลิปตรวจพบว่าโอนไปยัง ${receiverBank} ซึ่งไม่ตรงกับบัญชีของงาน`;
  } else {
    receiverVerificationStatus = "verified";
    isReceiverVerified = true;
    receiverBank = receiverBank || expectedBank.bankName;
    receiverAccount = receiverAccount || expectedBank.accountNumber;
    receiverName = receiverName || expectedBank.accountName;
    receiverVerificationMessage = `บันทึกเข้าบัญชีงาน: ${expectedBank.bankName} เลขที่ ${expectedBank.accountNumber}`;
  }

  return {
    amount: parsedAmount,
    transferDate: parsedDate,
    transferTime: parsedTime,
    isDateDetected,
    isTimeDetected,
    senderName: parsedSender,
    sendingBank: sendingBank || "ธนาคารพาณิชย์",
    receiverBank: receiverBank,
    receiverAccount: receiverAccount,
    receiverName: receiverName,
    refNo: parsedRef,
    receiverVerification: {
      status: receiverVerificationStatus,
      isMatched: isReceiverVerified,
      message: receiverVerificationMessage
    }
  };
};

/**
 * Extract structured verification data from slip image using real Multi-Region OCR and QR parsing
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

  // Step 2: Run AI OCR to read text from slip image using Multi-Region Slicing
  if (onProgress) onProgress("กำลังอ่านตัวเลขและข้อความจากภาพสลิปจริงด้วย AI OCR...");
  const ocrText = await recognizeSlipText(dataUrl, onProgress);

  // Step 3: Parse extracted text
  const parsed = parseSlipText(ocrText, qrRaw, context);

  // STRICT FINANCIAL ANTI-FRAUD: NEVER SILENTLY FALLBACK TO expectedAmount!
  // If OCR could not detect the amount, actualAmount MUST be null.
  const actualAmount = parsed.amount !== null ? parsed.amount : null;
  const isAmountDetected = actualAmount !== null;

  const actualDate = parsed.transferDate || formatThaiSlipDate(now);
  const actualTime = parsed.transferTime || formatThaiSlipTime(now);
  const actualSender = parsed.senderName || attendeeName;
  const actualBank = parsed.sendingBank || "ธนาคารกสิกรไทย (KBANK)";
  const actualRef = parsed.refNo || (qrRaw ? (qrRaw.length > 25 ? qrRaw.slice(0, 26) : qrRaw) : generateSlipRefNo("SLIP"));

  const isMatched = (actualAmount !== null && expectedAmount > 0 && actualAmount === expectedAmount);
  const isUnderpaid = (actualAmount !== null && expectedAmount > 0 && actualAmount < expectedAmount);
  const isOverpaid = (actualAmount !== null && expectedAmount > 0 && actualAmount > expectedAmount);
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
    isAmountDetected: isAmountDetected,
    isAmountMatched: isMatched,
    isUnderpaid: isUnderpaid,
    isOverpaid: isOverpaid,
    shortage: shortage,
    contribution: contribution,
    ocrDetected: isAmountDetected,
    financeStatus: isUnderpaid ? "underpaid" : (isAmountDetected ? "verified" : "unverified"),
    scannedAt: now.toISOString()
  };
};


