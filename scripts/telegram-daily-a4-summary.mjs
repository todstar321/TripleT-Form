/**
 * Triple T Form & SME FAN 2026
 * Daily Automated Telegram Report (4-Page A4 Summary)
 *
 * Runs daily at 20:00 (Asia/Bangkok) via GitHub Actions / manual trigger.
 * Evaluates 3 Stop Conditions:
 *   1. Registration Schedule (closed or outside open/close dates)
 *   2. Capacity Limit reached (e.g. 70/70 seats full)
 *   3. Manual Admin Toggle Switch (dailyReportEnabled === false)
 *
 * Generates 4 separate consecutive A4 images in RAM and sends sequentially to Telegram.
 * Zero persistent disk storage used.
 */

import puppeteer from 'puppeteer-core';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Configuration & Default Credentials
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://hsswobqnjzwqsczbxmrj.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_fr8rj2iLrQhkl3Yjg7qGPg_O4FnnIYG';
const DEFAULT_TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '7577840608:AAH_m0LWjRk3916GSvBcTsp1YLdaJXFlIy0';
const DEFAULT_TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '-5413358910';
const APP_URL = process.env.APP_URL || 'https://triple-t-form.vercel.app';
const FORCE_RUN = process.env.FORCE_RUN === 'true';

const THAI_MONTHS_FULL = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

function getBangkokDate() {
  const now = new Date();
  return new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
}

function formatThaiTimestamp(d = getBangkokDate()) {
  const day = d.getDate();
  const month = THAI_MONTHS_FULL[d.getMonth()];
  const rawYear = d.getFullYear();
  const year = rawYear > 2500 ? rawYear : rawYear + 543;
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return {
    dateStr: `ข้อมูล ณ วันที่ ${day} ${month} ${year}`,
    timeStr: `เวลา ${hours}.${minutes}.${seconds} น.`
  };
}

function findChromeExecutable() {
  const possiblePaths = [
    process.env.CHROME_PATH,
    process.env.PUPPETEER_EXECUTABLE_PATH,
    process.env.CHROME_BIN,
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
  ].filter(Boolean);

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

async function sendTelegramPhoto(botToken, chatId, photoBuffer, caption, filename) {
  const url = `https://api.telegram.org/bot${botToken}/sendPhoto`;
  const formData = new FormData();
  formData.append('chat_id', chatId);
  const blob = new Blob([photoBuffer], { type: 'image/png' });
  formData.append('photo', blob, filename || 'a4_page.png');
  formData.append('caption', caption);
  formData.append('parse_mode', 'HTML');

  const res = await fetch(url, {
    method: 'POST',
    body: formData
  });

  const resJson = await res.json().catch(() => ({}));
  if (!res.ok || !resJson.ok) {
    throw new Error(`Telegram API Error (${res.status}): ${resJson.description || 'Unknown error'}`);
  }
  return resJson;
}

async function main() {
  console.log('====================================================');
  console.log('🚀 Triple T Form - Daily Telegram A4 Summary Reporter');
  console.log('⏰ Current Bangkok Time:', formatThaiTimestamp().dateStr, formatThaiTimestamp().timeStr);
  console.log('====================================================');

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // 1. Fetch Event Config
  console.log('📡 Fetching event configuration from Supabase...');
  const { data: configRow, error: configErr } = await supabase
    .from('event_config')
    .select('config')
    .eq('id', 'current')
    .maybeSingle();

  if (configErr) {
    console.warn('⚠️ Warning: Failed to fetch event_config from Supabase:', configErr.message);
  }

  const eventConfig = configRow?.config || {};
  const tgCfg = eventConfig.telegramConfig || {};
  const botToken = (tgCfg.botToken || DEFAULT_TELEGRAM_BOT_TOKEN).trim();
  const chatId = (tgCfg.chatId || DEFAULT_TELEGRAM_CHAT_ID).trim();
  const schedule = eventConfig.registrationSchedule || {};

  // 2. Fetch Registrations Count
  console.log('📡 Fetching registrations from Supabase...');
  const { data: registrations, error: regErr } = await supabase
    .from('registrations')
    .select('ticket_no, name, nickname, club, reg_type, amount, payment_status, checked_in');

  if (regErr) {
    console.warn('⚠️ Warning: Failed to fetch registrations:', regErr.message);
  }

  const registeredList = registrations || [];
  const totalRegs = registeredList.length;
  const maxSeats = Number(schedule.maxSeats || eventConfig.maxSeats || 70);
  const remainingSeats = Math.max(0, maxSeats - totalRegs);

  // 3. Fetch Sponsors for Caption Stats
  console.log('📡 Fetching sponsors from Supabase...');
  const { data: sponsorsRow, error: sponsorsErr } = await supabase
    .from('event_config')
    .select('config')
    .eq('id', 'sponsors_data')
    .maybeSingle();

  if (sponsorsErr) {
    console.warn('⚠️ Warning: Failed to fetch sponsors:', sponsorsErr.message);
  }

  const sponsors = Array.isArray(sponsorsRow?.config?.sponsors) ? sponsorsRow.config.sponsors : [];
  const cashSponsorsTotal = sponsors
    .filter((s) => s.sponsorType === 'cash')
    .reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
  const itemSponsorsCount = sponsors.filter((s) => s.sponsorType === 'item').length;

  console.log(`📊 Current Stats: ${totalRegs}/${maxSeats} registered, ${sponsors.length} sponsors.`);

  // ====================================================
  // EVALUATE THE 3 STOP CONDITIONS
  // ====================================================
  if (!FORCE_RUN) {
    // Condition 3: Manual Admin Pause/Stop Switch
    const dailyReportEnabled = tgCfg.dailyReportEnabled !== false;
    if (!dailyReportEnabled) {
      console.log('🛑 [Condition 3 Met - Manual Stop]: Admin has turned off daily A4 report switch in Admin panel.');
      console.log('Exiting cleanly without sending.');
      process.exit(0);
    }

    // Condition 2: Capacity Limit
    const enableCapacityLimit = schedule.enableCapacityLimit !== false;
    if (enableCapacityLimit && totalRegs >= maxSeats) {
      console.log(`👥 [Condition 2 Met - Capacity Full]: Total registrations (${totalRegs}) reached capacity limit (${maxSeats} seats).`);
      console.log('Registration closed. Exiting cleanly without sending.');
      process.exit(0);
    }

    // Condition 1: Registration Schedule (Open/Close Dates)
    const mode = schedule.mode || 'auto';
    const bkkNow = getBangkokDate();

    if (mode === 'closed') {
      console.log('⏰ [Condition 1 Met - Schedule Closed]: Registration mode is explicitly set to closed.');
      console.log('Exiting cleanly without sending.');
      process.exit(0);
    }

    if (mode === 'auto') {
      const openDate = schedule.openDateTime ? new Date(schedule.openDateTime) : null;
      const closeDate = schedule.closeDateTime ? new Date(schedule.closeDateTime) : null;

      if (openDate && bkkNow.getTime() < openDate.getTime()) {
        console.log(`⏰ [Condition 1 Met - Before Open]: Current time is before registration opens (${schedule.openDateTime}).`);
        console.log('Exiting cleanly without sending.');
        process.exit(0);
      }

      if (closeDate && bkkNow.getTime() > closeDate.getTime()) {
        console.log(`⏰ [Condition 1 Met - Past Close]: Current time is past registration close deadline (${schedule.closeDateTime}).`);
        console.log('Exiting cleanly without sending.');
        process.exit(0);
      }
    }
  } else {
    console.log('⚡ FORCE_RUN=true: Bypassing stop conditions for manual verification test.');
  }

  console.log('✅ All conditions passed! Proceeding to capture 4 A4 pages...');

  // ====================================================
  // PUPPETEER HIGH-RESOLUTION SCREENSHOTS
  // ====================================================
  const chromePath = findChromeExecutable();
  if (!chromePath) {
    throw new Error('Chrome/Chromium executable not found. Please set PUPPETEER_EXECUTABLE_PATH or install Chrome.');
  }
  console.log('🌐 Launching Chrome from:', chromePath);

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--font-render-hinting=none'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 2600, deviceScaleFactor: 2 });

  const targetUrl = `${APP_URL}/?view=a4_print`;
  console.log(`📄 Navigating to: ${targetUrl}`);
  await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 45000 });

  console.log('⏳ Waiting for A4 modal pages to render...');
  await page.waitForSelector('#a4-page-render-1', { timeout: 30000 });
  await page.waitForSelector('#a4-page-render-4', { timeout: 30000 });

  // Brief pause for full font rasterization and styles
  await new Promise((r) => setTimeout(r, 2000));

  // Reset transform scale to 1.0 for perfect native 794x1123 render
  await page.evaluate(() => {
    for (let i = 1; i <= 4; i++) {
      const el = document.getElementById(`a4-page-render-${i}`);
      if (el) {
        el.style.transform = 'none';
        if (el.parentElement) {
          el.parentElement.style.width = '794px';
          el.parentElement.style.height = '1123px';
          el.parentElement.style.boxShadow = 'none';
          el.parentElement.style.borderRadius = '0';
        }
      }
    }
  });

  // Capture buffers in memory (zero disk storage)
  const pageBuffers = [];
  for (let i = 1; i <= 4; i++) {
    const el = await page.$(`#a4-page-render-${i}`);
    if (!el) {
      throw new Error(`Could not find DOM element #a4-page-render-${i}`);
    }
    await el.scrollIntoView();
    await new Promise((r) => setTimeout(r, 300));
    const buf = await el.screenshot({ type: 'png', omitBackground: false });
    pageBuffers.push({ pageNum: i, buffer: buf });
    console.log(`📸 Page ${i}/4 captured in RAM (${buf.length} bytes)`);
  }

  await browser.close();
  console.log('🔒 Browser closed.');

  // ====================================================
  // SEND 4 SEPARATE CONSECUTIVE MESSAGES TO TELEGRAM
  // ====================================================
  console.log('✈️ Sending 4 separate consecutive messages to Telegram...');
  const timeInfo = formatThaiTimestamp();

  const pageMeta = [
    {
      num: 1,
      title: 'ตารางลงทะเบียน (รวมทุกสังกัด)',
      detail: `👥 <b>ยอดรวมผู้ลงทะเบียน:</b> ${totalRegs} ท่าน (เหลืออีก ${remainingSeats} ที่นั่ง)`
    },
    {
      num: 2,
      title: 'ตารางลงทะเบียน สโมสรสงสพัท',
      detail: `⛳ <b>สมาชิกและแขกผู้มีเกียรติ สโมสรสงสพัท:</b> ${registeredList.filter(r => r.club === 'สงสพัท').length} ท่าน`
    },
    {
      num: 3,
      title: 'ตารางลงทะเบียน สโมสรโรตารี่',
      detail: `⛳ <b>สมาชิกและแขกผู้มีเกียรติ สโมสรโรตารี่:</b> ${registeredList.filter(r => r.club === 'โรตารี่').length} ท่าน`
    },
    {
      num: 4,
      title: 'ตารางรายนามผู้สนับสนุนกิจกรรม',
      detail: `🎁 <b>ผู้สนับสนุนกิจกรรม:</b> ${sponsors.length} ราย (เงินสด ${cashSponsorsTotal.toLocaleString()} บาท • สิ่งของ ${itemSponsorsCount} รายการ)`
    }
  ];

  for (let i = 0; i < pageBuffers.length; i++) {
    const p = pageBuffers[i];
    const meta = pageMeta[i];

    const caption = 
      `📄 <b>[แผ่นที่ ${meta.num}/4] ${meta.title}</b>\n` +
      `━━━━━━━━━━\n` +
      `🎉 <b>งานสังสรรค์ปีใหม่ SME FAN 2026</b>\n` +
      `⏰ ${timeInfo.dateStr} ${timeInfo.timeStr}\n` +
      `${meta.detail}\n` +
      `━━━━━━━━━━\n` +
      `🌐 <b>ดูข้อมูลสด:</b> ${APP_URL}`;

    console.log(`📤 Sending Page ${meta.num}/4 to Telegram Chat ID ${chatId}...`);
    await sendTelegramPhoto(botToken, chatId, p.buffer, caption, `a4_summary_page_${meta.num}.png`);
    console.log(`✅ Page ${meta.num}/4 delivered successfully!`);

    // Clean up buffer reference
    p.buffer = null;

    if (i < pageBuffers.length - 1) {
      console.log('⏳ Waiting 1.5 seconds before sending next page...');
      await new Promise((r) => setTimeout(r, 1500));
    }
  }

  console.log('====================================================');
  console.log('🎉 All 4 A4 pages successfully sent to Telegram!');
  console.log('====================================================');
}

main().catch((err) => {
  console.error('❌ Fatal error in daily Telegram reporter:', err);
  process.exit(1);
});
