/**
 * Registration Schedule Helper Utilities
 * Handles flexible open/close timing, real-time countdown calculation, and Thai date formatting.
 */

const THAI_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
];

const THAI_DAYS = [
  "วันอาทิตย์", "วันจันทร์", "วันอังคาร", "วันพุธ", "วันพฤหัสบดี", "วันศุกร์", "วันเสาร์"
];

/**
 * Parses date string (ISO or datetime-local format) into a Date object.
 */
export function parseScheduleDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Formats a Date object or ISO string to Thai full format with Buddhist Era.
 * Example: "วันพฤหัสบดีที่ 5 พฤศจิกายน 2569 เวลา 09:09 น."
 */
export function formatThaiScheduleDateTime(dateInput) {
  const d = typeof dateInput === 'string' ? parseScheduleDate(dateInput) : dateInput;
  if (!d || isNaN(d.getTime())) return "";

  const dayName = THAI_DAYS[d.getDay()];
  const day = d.getDate();
  const month = THAI_MONTHS[d.getMonth()];
  const thaiYear = d.getFullYear() + 543;
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');

  return `${dayName}ที่ ${day} ${month} พ.ศ. ${thaiYear} เวลา ${hours}:${minutes} น.`;
}

/**
 * Formats a short Thai datetime.
 * Example: "5 พ.ย. 69 เวลา 09:09 น."
 */
export function formatThaiShortDateTime(dateInput) {
  const d = typeof dateInput === 'string' ? parseScheduleDate(dateInput) : dateInput;
  if (!d || isNaN(d.getTime())) return "";

  const shortMonths = [
    "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
    "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
  ];

  const day = d.getDate();
  const month = shortMonths[d.getMonth()];
  const shortYear = String((d.getFullYear() + 543) % 100).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');

  return `${day} ${month} ${shortYear} เวลา ${hours}:${minutes} น.`;
}

/**
 * Calculates remaining time broken down into days, hours, minutes, and seconds.
 */
export function calculateRemainingTime(targetDate, now = new Date()) {
  if (!targetDate) {
    return { totalMs: 0, days: 0, hours: 0, minutes: 0, seconds: 0, isZero: true };
  }

  const diff = targetDate.getTime() - now.getTime();
  if (diff <= 0) {
    return { totalMs: 0, days: 0, hours: 0, minutes: 0, seconds: 0, isZero: true };
  }

  const seconds = Math.floor((diff / 1000) % 60);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  return {
    totalMs: diff,
    days,
    hours,
    minutes,
    seconds,
    isZero: false
  };
}

/**
 * Determines current registration status based on event schedule config.
 * 
 * @param {Object} schedule - eventConfig.registrationSchedule
 * @param {Date} [now] - Current timestamp (defaults to new Date())
 * @returns {Object} status object
 */
export function getScheduleStatus(schedule = {}, now = new Date()) {
  const mode = schedule?.mode || 'auto'; // 'auto' | 'always_open' | 'closed'

  // Forced mode: Always Open
  if (mode === 'always_open') {
    return {
      status: 'OPEN',
      mode: 'always_open',
      isOpen: true,
      label: 'เปิดรับลงทะเบียนตลอดเวลา',
      badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      timeRemaining: null,
      targetDate: null,
      openDate: null,
      closeDate: null
    };
  }

  // Forced mode: Closed
  if (mode === 'closed') {
    return {
      status: 'CLOSED',
      mode: 'closed',
      isOpen: false,
      label: 'ปิดรับลงทะเบียนชั่วคราว',
      badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      timeRemaining: null,
      targetDate: null,
      openDate: parseScheduleDate(schedule.openDateTime),
      closeDate: parseScheduleDate(schedule.closeDateTime),
      closedMessage: schedule.closedMessage || "ระบบปิดรับลงทะเบียนเรียบร้อยแล้ว ขอขอบคุณทุกท่านที่ให้ความสนใจ"
    };
  }

  // Mode: Auto (Based on openDateTime and closeDateTime)
  const openDate = parseScheduleDate(schedule.openDateTime);
  const closeDate = parseScheduleDate(schedule.closeDateTime);

  // 1. If openDate exists and now is before openDate -> UPCOMING
  if (openDate && now.getTime() < openDate.getTime()) {
    const timeRemaining = calculateRemainingTime(openDate, now);
    return {
      status: 'UPCOMING',
      mode: 'auto',
      isOpen: false,
      label: 'ยังไม่ถึงเวลาเปิดลงทะเบียน',
      badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      targetDate: openDate,
      timeRemaining,
      openDate,
      closeDate,
      formattedOpenDate: formatThaiScheduleDateTime(openDate),
      formattedShortOpenDate: formatThaiShortDateTime(openDate),
      upcomingMessage: schedule.upcomingMessage || `ระบบจะเปิดรับลงทะเบียนใน${formatThaiScheduleDateTime(openDate)}`
    };
  }

  // 2. If closeDate exists and now is after closeDate -> CLOSED
  if (closeDate && now.getTime() > closeDate.getTime()) {
    return {
      status: 'CLOSED',
      mode: 'auto',
      isOpen: false,
      label: 'ปิดรับลงทะเบียนแล้ว',
      badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      targetDate: null,
      timeRemaining: null,
      openDate,
      closeDate,
      formattedCloseDate: formatThaiScheduleDateTime(closeDate),
      formattedShortCloseDate: formatThaiShortDateTime(closeDate),
      closedMessage: schedule.closedMessage || `ระบบปิดรับลงทะเบียนเมื่อ ${formatThaiScheduleDateTime(closeDate)} ขอขอบคุณทุกท่านที่ให้ความสนใจ`
    };
  }

  // 3. Otherwise -> OPEN
  const timeRemaining = closeDate ? calculateRemainingTime(closeDate, now) : null;
  return {
    status: 'OPEN',
    mode: 'auto',
    isOpen: true,
    label: 'กำลังเปิดรับลงทะเบียน',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    targetDate: closeDate,
    timeRemaining,
    openDate,
    closeDate,
    formattedCloseDate: closeDate ? formatThaiScheduleDateTime(closeDate) : "",
    formattedShortCloseDate: closeDate ? formatThaiShortDateTime(closeDate) : ""
  };
}
