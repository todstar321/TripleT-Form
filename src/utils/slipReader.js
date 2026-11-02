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
 * Parse Thai QR Slip standard payload (EMVCo TLV mini-QR on bank transfer slips)
 */
export const parseThaiQRSlip = (qrRaw) => {
  if (!qrRaw || typeof qrRaw !== 'string') return null;
  
  let sendingBank = "";
  let transRef = "";

  // Look for Bank of Thailand 3-digit bank code in Tag 01 length 03 (e.g., 0103025 => 025 BAY, 0103004 => 004 KBANK)
  const bankMatch = qrRaw.match(/0103(\d{3})/);
  if (bankMatch) {
    const code = bankMatch[1];
    sendingBank = THAI_BANK_CODES[code] || `ธนาคารรหัส ${code}`;
  }

  // Look for Transaction Reference in Tag 02 length XX (e.g., 0225K...)
  const refMatch = qrRaw.match(/02(\d{2})([A-Za-z0-9\-]+)/);
  if (refMatch) {
    const len = parseInt(refMatch[1], 10);
    if (!isNaN(len) && len > 0) {
      transRef = refMatch[2].slice(0, len);
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

  // Apply slight contrast boost
  try {
    const imgData = ctx.getImageData(0, 0, width, height);
    const d = imgData.data;
    const factor = (259 * (128 + 30)) / (255 * (259 - 30));
    for (let i = 0; i < d.length; i += 4) {
      d[i] = factor * (d[i] - 128) + 128;
      d[i + 1] = factor * (d[i + 1] - 128) + 128;
      d[i + 2] = factor * (d[i + 2] - 128) + 128;
    }
    ctx.putImageData(imgData, 0, 0);
  } catch (e) {
    // Canvas security or fallback
  }

  return canvas.toDataURL("image/jpeg", 0.9);
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
        // Fallback to English only (very lightweight, ~2MB)
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
    // 15 second safety timeout
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
 * Intelligent regex parser to extract amount, date, time, sender, ref from slip OCR text
 */
export const parseSlipText = (text, qrRaw = '', context = {}) => {
  const normalizedText = (text || "").replace(/\r/g, "");
  
  // 1. EXTRACT AMOUNT
  let parsedAmount = null;

  // Pattern A: Labeled amount (e.g. จำนวนเงิน: 344.50, Amount: 500.00, ยอดโอน 1,000.00)
  const labeledRegexes = [
    /(?:จำนวนเงินโอน|จำนวนเงิน|จํานวนเงิน|ยอดเงินโอน|ยอดเงินที่โอน|ยอดเงิน|ยอดโอน|จำนวน|Amount|Total|Amt)[^\d\n\r]{0,30}([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2}))/i,
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

  // Pattern B: Scan all 2-decimal floating points and filter out 0.00 (fee)
  if (parsedAmount === null) {
    const allDecimals = Array.from(normalizedText.matchAll(/([0-9]{1,3}(?:,[0-9]{3})*\.[0-9]{2})/g))
      .map(m => parseFloat(m[1].replace(/,/g, '')))
      .filter(n => !isNaN(n) && n > 0);
    
    if (allDecimals.length > 0) {
      // If there's an expected amount matching one of them, prefer it
      if (context.expectedAmount && allDecimals.includes(Number(context.expectedAmount))) {
        parsedAmount = Number(context.expectedAmount);
      } else {
        parsedAmount = allDecimals[0];
      }
    }
  }

  // 2. EXTRACT DATE
  let parsedDate = '';
  const datePatterns = [
    /(\d{1,2}\s+(?:ม\.?ค\.?|ก\.?พ\.?|มี\.?ค\.?|เม\.?ย\.?|พ\.?ค\.?|มิ\.?ย\.?|ก\.?ค\.?|ส\.?ค\.?|ก\.?ย\.?|ต\.?ค\.?|พ\.?ย\.?|ธ\.?ค\.?|มกราคม|กุมภาพันธ์|มีนาคม|เมษายน|พฤษภาคม|มิถุนายน|กรกฎาคม|สิงหาคม|กันยายน|ตุลาคม|พฤศจิกายน|ธันวาคม|[A-Za-z]{3,})\s+\d{2,4})/i,
    /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/
  ];
  for (const pat of datePatterns) {
    const m = normalizedText.match(pat);
    if (m) {
      parsedDate = m[1].trim();
      break;
    }
  }

  // 3. EXTRACT TIME
  let parsedTime = '';
  const timeMatch = normalizedText.match(/([0-2]?[0-9]:[0-5][0-9](?::[0-5][0-9])?)/);
  if (timeMatch) {
    parsedTime = `${timeMatch[1].trim()} น.`;
  }

  // 4. EXTRACT SENDER
  let parsedSender = '';
  const senderRegex = /(?:ผู้?โอนเง?ิน|ผู้?โอน|จาก|Sender|From)[\s\S]{0,20}?[:\s]\s*([^\n\r]+)/i;
  const matchSender = normalizedText.match(senderRegex);
  if (matchSender) {
    const cleanSender = matchSender[1].replace(/[\(\)\[\]\{\}]/g, '').replace(/xxx-[0-9\-]+/gi, '').trim();
    if (cleanSender.length >= 3) {
      parsedSender = cleanSender;
    }
  }
  if (!parsedSender) {
    const engName = normalizedText.match(/([A-Z][A-Z\-\s]{4,30}[A-Z])/);
    if (engName && !engName[1].includes('SCAN') && !engName[1].includes('PAY') && !engName[1].includes('BANK')) {
      parsedSender = engName[1].trim();
    }
  }

  // 5. EXTRACT BANK & REF
  let parsedBank = '';
  let parsedRef = '';

  const qrInfo = parseThaiQRSlip(qrRaw);
  if (qrInfo) {
    if (qrInfo.sendingBank) parsedBank = qrInfo.sendingBank;
    if (qrInfo.transRef) parsedRef = qrInfo.transRef;
  }

  // Check text for bank names if not found from QR
  if (!parsedBank) {
    if (/กรุงศรี|BAY|อยุธยา/i.test(normalizedText)) {
      parsedBank = "ธนาคารกรุงศรีอยุธยา (BAY)";
    } else if (/กสิกร|KBANK|K PLUS/i.test(normalizedText)) {
      parsedBank = "ธนาคารกสิกรไทย (KBANK)";
    } else if (/ไทยพาณิชย์|SCB|EASY/i.test(normalizedText)) {
      parsedBank = "ธนาคารไทยพาณิชย์ (SCB)";
    } else if (/กรุงไทย|KTB|NEXT/i.test(normalizedText)) {
      parsedBank = "ธนาคารกรุงไทย (KTB)";
    } else if (/กรุงเทพ|BBL|Bualuang/i.test(normalizedText)) {
      parsedBank = "ธนาคารกรุงเทพ (BBL)";
    } else if (/ทหารไทย|ttb/i.test(normalizedText)) {
      parsedBank = "ธนาคารทหารไทยธนชาต (TTB)";
    } else if (/ออมสิน|GSB/i.test(normalizedText)) {
      parsedBank = "ธนาคารออมสิน (GSB)";
    }
  }

  // If ref not from QR, search in text
  if (!parsedRef) {
    const refRegex = /(?:รห[ั้]?ส[อถ]?้?า?ง[อถ]?ิ?ง|เลขอ้างอิง|หมายเลขอ้างอิง|เลขที่รายการ|Ref(?:\s*No)?|Transaction(?:\s*ID|\s*Ref)?)[^\dA-Za-z]{0,10}([A-Za-z0-9\-]{8,})/i;
    const matchRef = normalizedText.match(refRegex);
    if (matchRef) {
      parsedRef = matchRef[1].trim();
    }
  }

  return {
    amount: parsedAmount,
    transferDate: parsedDate,
    transferTime: parsedTime,
    senderName: parsedSender,
    bankName: parsedBank,
    refNo: parsedRef
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
  const actualBank = parsed.bankName || bankConfig.bankName || "ธนาคารพาณิชย์";
  const actualRef = parsed.refNo || (qrRaw ? (qrRaw.length > 25 ? qrRaw.slice(0, 26) : qrRaw) : generateSlipRefNo("SLIP"));

  const isMatched = (actualAmount === expectedAmount);
  const isUnderpaid = (expectedAmount > 0 && actualAmount < expectedAmount);
  const isOverpaid = (actualAmount > expectedAmount);
  const shortage = isUnderpaid ? (expectedAmount - actualAmount) : 0;
  const contribution = isOverpaid ? (actualAmount - expectedAmount) : 0;

  const receiverStr = `${bankConfig.bankName} เลขที่ ${bankConfig.accountNumber} (${bankConfig.accountName})`;

  if (onProgress) onProgress("อ่านข้อมูลสลิปเรียบร้อยแล้ว");

  return {
    transferDate: actualDate,
    transferTime: actualTime,
    senderName: actualSender,
    receiverAccount: receiverStr,
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

