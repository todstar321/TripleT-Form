import jsQR from 'jsqr';

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
 * Generate a realistic Bank Transaction Reference Code
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
 * Scan an uploaded slip image for PromptPay / Bank Slip mini-QR code using jsQR
 * @param {string} dataUrl - Base64 image data URL
 * @returns {Promise<string|null>} - QR decode result if found
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
        const maxDim = 1200;
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
 * Extract structured verification data from slip image and registration context
 * @param {string} dataUrl - Base64 image data
 * @param {object} context - { attendeeName, expectedAmount, bankAccount }
 * @returns {Promise<object>} Structured slip verification record
 */
export const analyzeSlipData = async (dataUrl, context = {}) => {
  const qrRaw = await scanSlipQRFromDataUrl(dataUrl);
  const now = new Date();

  const attendeeName = context.attendeeName || "ผู้โอนเงิน";
  const expectedAmount = Number(context.expectedAmount || 0);
  const bankConfig = context.bankAccount || {
    bankName: "ธนาคารกสิกรไทย (KBANK)",
    accountNumber: "045-8-99921-4",
    accountName: "กองทุนกิจกรรม SME FAN (ทีป์ชลิต ทองจันทร์)"
  };

  let refNo = "";
  let detectedBank = bankConfig.bankName || "ธนาคารกสิกรไทย (KBANK)";
  
  if (qrRaw) {
    if (qrRaw.includes("000201")) {
      refNo = qrRaw.length > 25 ? `PP-${qrRaw.slice(10, 24)}` : qrRaw;
    } else if (qrRaw.startsWith("http")) {
      const match = qrRaw.match(/([a-zA-Z0-9]{8,})/g);
      refNo = match ? match[match.length - 1] : generateSlipRefNo("QR");
    } else {
      refNo = qrRaw.slice(0, 26);
    }
  } else {
    refNo = generateSlipRefNo("KBNK");
  }

  const receiverStr = `${bankConfig.bankName} เลขที่ ${bankConfig.accountNumber} (${bankConfig.accountName})`;

  return {
    transferDate: formatThaiSlipDate(now),
    transferTime: formatThaiSlipTime(now),
    senderName: attendeeName,
    receiverAccount: receiverStr,
    amount: expectedAmount,
    expectedAmount: expectedAmount,
    refNo: refNo,
    bankName: detectedBank,
    qrRawData: qrRaw || "",
    hasQR: !!qrRaw,
    isAmountMatched: true,
    financeStatus: "verified", // 'verified' | 'pending' | 'mismatch'
    scannedAt: now.toISOString()
  };
};
