import QRCode from 'qrcode';

/**
 * Helper to load an image from URL safely
 */
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

/**
 * Universal Rounded Rectangle drawing function compatible with all browsers & iOS Safari
 */
function drawRoundRect(ctx, x, y, w, h, r = 16) {
  let radii = { tl: r, tr: r, br: r, bl: r };
  if (typeof r === 'number') {
    radii = { tl: r, tr: r, br: r, bl: r };
  } else if (typeof r === 'object') {
    radii = { ...radii, ...r };
  }
  ctx.beginPath();
  ctx.moveTo(x + radii.tl, y);
  ctx.lineTo(x + w - radii.tr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radii.tr);
  ctx.lineTo(x + w, y + h - radii.br);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radii.br, y + h);
  ctx.lineTo(x + radii.bl, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radii.bl);
  ctx.lineTo(x, y + radii.tl);
  ctx.quadraticCurveTo(x, y, x + radii.tl, y);
  ctx.closePath();
}

/**
 * Bulletproof text centering helper that mathematically positions text
 * Immune to browser/device canvas textAlign quirks
 */
function drawCenteredText(ctx, text, centerX, y, font, color = '#ffffff') {
  ctx.save();
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  const textWidth = ctx.measureText(text).width;
  ctx.fillText(text, centerX - textWidth / 2, y);
  ctx.restore();
}

/**
 * Bulletproof fitted text helper that scales text down to fit maxWidth and centers it
 */
function drawFittedCenteredText(ctx, text, centerX, y, maxWidth, initialSize, weight = 'bold', color = '#ffffff') {
  ctx.save();
  let size = initialSize;
  const minSize = 14;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = color;

  ctx.font = `${weight} ${size}px "Prompt", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  while (ctx.measureText(text).width > maxWidth && size > minSize) {
    size -= 1;
    ctx.font = `${weight} ${size}px "Prompt", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  }

  let displayText = text;
  if (ctx.measureText(displayText).width > maxWidth) {
    while (ctx.measureText(displayText + '...').width > maxWidth && displayText.length > 3) {
      displayText = displayText.slice(0, -1);
    }
    displayText += '...';
  }

  const textWidth = ctx.measureText(displayText).width;
  ctx.fillText(displayText, centerX - textWidth / 2, y);
  ctx.restore();
}

/**
 * Bulletproof fitted text helper that scales text down to fit maxWidth (left-aligned)
 */
function drawFittedText(ctx, text, x, y, maxWidth, initialSize, weight = 'normal', color = '#ffffff') {
  ctx.save();
  let size = initialSize;
  const minSize = 10;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = color;

  ctx.font = `${weight} ${size}px "Prompt", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  while (ctx.measureText(text).width > maxWidth && size > minSize) {
    size -= 1;
    ctx.font = `${weight} ${size}px "Prompt", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  }

  let displayText = text;
  if (ctx.measureText(displayText).width > maxWidth) {
    while (ctx.measureText(displayText + '...').width > maxWidth && displayText.length > 3) {
      displayText = displayText.slice(0, -1);
    }
    displayText += '...';
  }

  ctx.fillText(displayText, x, y);
  ctx.restore();
}

/**
 * Generate a luxury digital event pass image using HTML5 Canvas
 * Height: 1152px (80% of original 1440px)
 * Proportions: Header ~35%, Attendee ~45% (wider & centered), QR Code ~20% (2-Column: Left 35% QR, Right 65% Text)
 * Scanned Text: {Name} ({Nick}) [เลขที่บัตร {No}] - สมาชิก{Club} หรือ แขกผู้มีเกียรติ
 * Footer: © 2026 งานสังสรรค์ปีใหม่ SME FAN 2026 / นักพัฒนาซอฟต์แวร์ คุณทีป์ชลิต ทองจันทร์ (ผอ.โต๊ด)
 */
export async function generateTicketCardImage(ticketData, eventConfig = {}, options = {}) {
  // Ensure web fonts are ready before drawing
  if (typeof document !== 'undefined' && document.fonts) {
    try {
      await document.fonts.ready;
    } catch (e) {
      // ignore
    }
  }

  const qrMode = options.qrMode || 'name';

  // 1. Prepare Attendee Name & Nickname
  const attendeeName = (ticketData.name || 'ผู้ร่วมงาน').trim();
  const attendeeNick = ticketData.nickname ? `(${ticketData.nickname.trim()})` : '';
  const attendeeFullLabel = attendeeNick ? `${attendeeName} ${attendeeNick}` : attendeeName;

  // 2. Prepare Role & Club String (e.g. "สมาชิกสงสพัท", "สมาชิกโรตารี่", หรือ "แขกผู้มีเกียรติ")
  let roleClubStr = '';
  const club = ticketData.club ? ticketData.club.trim() : '';

  if (ticketData.regType === 'member') {
    if (club) {
      const cleanClub = club.startsWith('สมาชิก') ? club.replace(/^สมาชิก\s*/, '') : club;
      roleClubStr = `สมาชิก${cleanClub}`;
    } else {
      roleClubStr = 'สมาชิก SME FAN';
    }
  } else {
    if (club && club !== 'ทั่วไป' && club !== '-') {
      roleClubStr = `แขกผู้มีเกียรติ (${club})`;
    } else {
      roleClubStr = 'แขกผู้มีเกียรติ';
    }
  }

  const ticketNoStr = ticketData.ticketNo || 'SME-001';

  // Exact QR Content:
  // e.g. "ทีป์ชลิต ทองจันทร์ (ทีป์) [เลขที่บัตร SME-003] - สมาชิกสงสพัท"
  let qrContent = '';
  if (qrMode === 'url' && typeof window !== 'undefined') {
    qrContent = `${window.location.origin}${window.location.pathname}?verify=${encodeURIComponent(ticketNoStr)}`;
  } else {
    qrContent = `${attendeeFullLabel} [เลขที่บัตร ${ticketNoStr}] - ${roleClubStr}`;
  }

  // 3. Generate QR Code Data URL (High quality, high contrast)
  const qrDataUrl = await QRCode.toDataURL(qrContent, {
    width: 360,
    margin: 1,
    color: {
      dark: '#0a0f1d',
      light: '#ffffff'
    },
    errorCorrectionLevel: 'H'
  });

  // 4. Load Banner/Cover Image if available
  let bannerImg = null;
  const bannerUrl = eventConfig?.bannerImage || eventConfig?.coverImage;
  if (bannerUrl) {
    try {
      bannerImg = await loadImage(bannerUrl);
    } catch (err) {
      console.warn('Could not load banner image for ticket:', err);
    }
  }

  // 5. Create Main Canvas (Retina 800 x 960 - Ultra-Compact & Balanced, No Empty Spaces)
  const width = 800;
  const height = 960;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // Background - Deep Luxury Navy-Black Gradient
  const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
  bgGradient.addColorStop(0, '#060911');
  bgGradient.addColorStop(0.2, '#090e1b');
  bgGradient.addColorStop(0.5, '#0d1527');
  bgGradient.addColorStop(0.8, '#090e1b');
  bgGradient.addColorStop(1, '#05080f');
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, width, height);

  // Outer Gold Border Frame (Smooth 22px rounded corners)
  ctx.save();
  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 3;
  drawRoundRect(ctx, 16, 16, width - 32, height - 32, 22);
  ctx.stroke();

  // Inner Delicate Gold Hairline
  ctx.strokeStyle = 'rgba(251, 191, 36, 0.35)';
  ctx.lineWidth = 1.2;
  drawRoundRect(ctx, 22, 22, width - 44, height - 44, 16);
  ctx.stroke();
  ctx.restore();

  // ----------------------------------------------------
  // SECTION 1: HEADER & BANNER (y: 0 to 312)
  // ----------------------------------------------------
  const bannerH = 150;
  const cardInnerX = 18;
  const cardInnerY = 18;
  const cardInnerW = width - 36;

  if (bannerImg) {
    ctx.save();
    // Clip top rounded corners to fit inside the gold card frame
    drawRoundRect(ctx, cardInnerX, cardInnerY, cardInnerW, bannerH, { tl: 20, tr: 20, br: 0, bl: 0 });
    ctx.clip();

    // Cover-fit image calculation
    const imgRatio = bannerImg.naturalWidth / bannerImg.naturalHeight;
    const boxRatio = cardInnerW / bannerH;
    let sW, sH, sX, sY;
    if (imgRatio > boxRatio) {
      sH = bannerImg.naturalHeight;
      sW = sH * boxRatio;
      sX = (bannerImg.naturalWidth - sW) / 2;
      sY = 0;
    } else {
      sW = bannerImg.naturalWidth;
      sH = sW / boxRatio;
      sX = 0;
      sY = (bannerImg.naturalHeight - sH) / 2;
    }

    ctx.drawImage(bannerImg, sX, sY, sW, sH, cardInnerX, cardInnerY, cardInnerW, bannerH);

    // Dark Gradient Vignette Overlay at bottom of banner for seamless fade
    const bannerFade = ctx.createLinearGradient(0, cardInnerY + bannerH - 75, 0, cardInnerY + bannerH);
    bannerFade.addColorStop(0, 'rgba(6, 9, 17, 0)');
    bannerFade.addColorStop(0.65, 'rgba(6, 9, 17, 0.82)');
    bannerFade.addColorStop(1, '#060911');
    ctx.fillStyle = bannerFade;
    ctx.fillRect(cardInnerX, cardInnerY + bannerH - 75, cardInnerW, 75);

    ctx.restore();
  } else {
    // Fallback aura gradient if no banner image
    const aura = ctx.createRadialGradient(width / 2, 70, 10, width / 2, 70, 280);
    aura.addColorStop(0, 'rgba(245, 158, 11, 0.25)');
    aura.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = aura;
    ctx.fillRect(cardInnerX, cardInnerY, cardInnerW, bannerH);
  }

  // 1. VIP Pass Badge Pill
  const vipPillW = 300;
  const vipPillH = 30;
  const vipPillX = width / 2 - vipPillW / 2;
  const vipPillY = 28;

  ctx.save();
  const vipGrad = ctx.createLinearGradient(vipPillX, vipPillY, vipPillX + vipPillW, vipPillY + vipPillH);
  vipGrad.addColorStop(0, 'rgba(15, 23, 42, 0.88)');
  vipGrad.addColorStop(1, 'rgba(26, 36, 61, 0.92)');
  ctx.fillStyle = vipGrad;
  drawRoundRect(ctx, vipPillX, vipPillY, vipPillW, vipPillH, 15);
  ctx.fill();
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 1.3;
  ctx.stroke();

  drawCenteredText(ctx, '✨ VIP PASS • บัตรเข้างานดิจิทัล', width / 2, vipPillY + vipPillH / 2, 'bold 14px "Prompt", sans-serif', '#fde68a');
  ctx.restore();

  // 2. Main Event Title (Clean, crisp, readable)
  const eventTitle = eventConfig?.eventTitle || 'งานสังสรรค์ปีใหม่ SME FAN 2026';
  drawFittedCenteredText(ctx, eventTitle, width / 2, 182, width - 80, 26, 'bold', '#ffffff');

  // 3. Date & Venue (Separated into 2 distinct lines for enhanced readability)
  const dateStr = eventConfig?.eventDate || 'วันพุธที่ 23 ธ.ค. 2026 • 17:30 - 22:30 น.';
  const venueStr = eventConfig?.eventVenue || 'โรงแรมแกรนด์ริชมอนด์';

  // Line 1: Date & Time
  drawCenteredText(ctx, `📅 ${dateStr}`, width / 2, 210, '500 15px "Prompt", sans-serif', '#f1f5f9');
  // Line 2: Venue
  drawCenteredText(ctx, `📍 ${venueStr}`, width / 2, 234, '500 15px "Prompt", sans-serif', '#cbd5e1');

  // 4. Ticket No Pill (Gold Glow)
  const tNoW = 280;
  const tNoH = 38;
  const tNoX = width / 2 - tNoW / 2;
  const tNoY = 258;

  ctx.save();
  ctx.fillStyle = '#030712';
  drawRoundRect(ctx, tNoX, tNoY, tNoW, tNoH, 12);
  ctx.fill();
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 1.8;
  ctx.stroke();

  drawCenteredText(ctx, `เลขที่บัตร: ${ticketNoStr}`, width / 2, tNoY + tNoH / 2, 'bold 18px "Courier New", monospace', '#fbbf24');
  ctx.restore();

  // ----------------------------------------------------
  // PERFORATED DIVIDER 1 (Stub Cut Effect)
  // ----------------------------------------------------
  const divY1 = 312;
  ctx.save();
  // Cutout left notch
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.arc(16, divY1, 13, 0, Math.PI * 2);
  ctx.fill();
  // Cutout right notch
  ctx.beginPath();
  ctx.arc(width - 16, divY1, 13, 0, Math.PI * 2);
  ctx.fill();
  // Golden Dashed Line
  ctx.setLineDash([8, 5]);
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.45)';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(34, divY1);
  ctx.lineTo(width - 34, divY1);
  ctx.stroke();
  ctx.restore();

  // ----------------------------------------------------
  // SECTION 2: ATTENDEE DETAILS (Hero Card + 2 Columns + Shirt)
  // ----------------------------------------------------
  const secX = 32;
  const secW = width - 64; // 736px wide

  // Hero Card: Attendee Information (Taller & Double Name Size!)
  const heroY = 326;
  const heroH = 156;

  ctx.save();
  const heroGrad = ctx.createLinearGradient(secX, heroY, secX, heroY + heroH);
  heroGrad.addColorStop(0, '#101a33');
  heroGrad.addColorStop(1, '#0d152b');
  ctx.fillStyle = heroGrad;
  drawRoundRect(ctx, secX, heroY, secW, heroH, 18);
  ctx.fill();
  ctx.strokeStyle = 'rgba(251, 191, 36, 0.35)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Centered Header Label
  drawCenteredText(ctx, '👤 ข้อมูลผู้ลงทะเบียนเข้าร่วมงาน', width / 2, heroY + 22, '600 13px "Prompt", sans-serif', '#94a3b8');

  // Big Bold Attendee Name (Double Size ~46px Bold, Horizontally Centered!)
  drawFittedCenteredText(ctx, attendeeName, width / 2, heroY + 68, secW - 40, 46, 'bold', '#ffffff');

  // Centered Badges Group:
  // User Requirement: "คำว่า สมาชิก SME FAN เปลี่ยนเป็น สมาชิกสงสพัท โรตารี่ หรือ แขกผู้มีเกียรติ"
  const badges = [];

  // 1) Nickname Badge
  if (ticketData.nickname) {
    badges.push({
      text: `ชื่อเล่น: ${ticketData.nickname}`,
      bg: 'rgba(245, 158, 11, 0.22)',
      border: '#f59e0b',
      color: '#fde047',
      font: 'bold 14px "Prompt", sans-serif'
    });
  }

  // 2) Dynamic Role & Club Badge (Replaced hardcoded "สมาชิก SME FAN")
  const isMember = ticketData.regType === 'member';
  const cleanClub = club ? (club.startsWith('สมาชิก') ? club.replace(/^สมาชิก\s*/, '') : club) : 'สงสพัท';
  const typeText = isMember ? `👑 สมาชิก${cleanClub}` : '🌟 แขกผู้มีเกียรติ';
  badges.push({
    text: typeText,
    bg: isMember ? 'rgba(99, 102, 241, 0.25)' : 'rgba(16, 185, 129, 0.25)',
    border: isMember ? '#818cf8' : '#34d399',
    color: isMember ? '#c7d2fe' : '#a7f3d0',
    font: 'bold 14px "Prompt", sans-serif'
  });

  // 3) Member Code Badge
  if (ticketData.memberCode) {
    badges.push({
      text: `รหัส: ${ticketData.memberCode}`,
      bg: 'rgba(255, 255, 255, 0.08)',
      border: 'rgba(255, 255, 255, 0.2)',
      color: '#fef08a',
      font: 'bold 14px "Courier New", monospace'
    });
  }

  // Measure and Center the entire row of badges
  const badgeGap = 10;
  let totalBadgesWidth = 0;
  badges.forEach((b) => {
    ctx.font = b.font;
    b.width = ctx.measureText(b.text).width + 24;
    totalBadgesWidth += b.width;
  });
  totalBadgesWidth += (badges.length - 1) * badgeGap;

  let curBadgeX = (width - totalBadgesWidth) / 2;
  const badgeY = heroY + 122;
  const badgeH = 28;

  badges.forEach((b) => {
    ctx.fillStyle = b.bg;
    drawRoundRect(ctx, curBadgeX, badgeY - badgeH / 2, b.width, badgeH, 8);
    ctx.fill();
    ctx.strokeStyle = b.border;
    ctx.lineWidth = 1;
    ctx.stroke();

    drawCenteredText(ctx, b.text, curBadgeX + b.width / 2, badgeY, b.font, b.color);
    curBadgeX += b.width + badgeGap;
  });

  ctx.restore();

  // 2-Column Info Cards:
  // User Requirement: "ซ้ายบน เบอร์โทร ล้าง Email ขวา ยอดชำระ 500"
  const infoY = heroY + heroH + 12;
  const colGap = 14;
  const colW = (secW - colGap) / 2; // 361px
  const colH = 88;

  // Left Card: Top = Phone | Bottom = Email
  ctx.save();
  ctx.fillStyle = '#0f172a';
  drawRoundRect(ctx, secX, infoY, colW, colH, 16);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Row 1: Phone
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#94a3b8';
  ctx.font = '500 11px "Prompt", sans-serif';
  ctx.fillText('📞 เบอร์โทรศัพท์:', secX + 16, infoY + 18);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 17px "Courier New", monospace';
  ctx.fillText(ticketData.phone || '-', secX + 16, infoY + 36);

  // Row 2: Email
  ctx.fillStyle = '#94a3b8';
  ctx.font = '500 11px "Prompt", sans-serif';
  ctx.fillText('📧 อีเมล (Email):', secX + 16, infoY + 56);

  const emailText = ticketData.email || '-';
  ctx.fillStyle = '#a5b4fc';
  ctx.font = '500 12px "Prompt", sans-serif';
  drawFittedText(ctx, emailText, secX + 16, infoY + 72, colW - 32, 12, '500', '#a5b4fc');
  ctx.restore();

  // Right Card: Payment Amount (500 บาท) & Status
  ctx.save();
  ctx.fillStyle = '#0f172a';
  drawRoundRect(ctx, secX + colW + colGap, infoY, colW, colH, 16);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 1;
  ctx.stroke();

  const rX = secX + colW + colGap;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#94a3b8';
  ctx.font = '500 12px "Prompt", sans-serif';
  ctx.fillText('💵 ยอดชำระเงิน:', rX + 18, infoY + 20);

  const amountNumber = ticketData.paidAmount || ticketData.amount || 500;
  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 22px "Prompt", sans-serif';
  ctx.fillText(`${amountNumber.toLocaleString()} บาท`, rX + 18, infoY + 44);

  ctx.fillStyle = '#34d399';
  ctx.font = 'bold 12px "Prompt", sans-serif';
  ctx.fillText('✅ แนบสลิปชำระเงินแล้ว', rX + 18, infoY + 68);
  ctx.restore();

  // Shirt Privileges Banner (Centered Horizontally!)
  const shirtY = infoY + colH + 12;
  const shirtH = 64;

  ctx.save();
  if (ticketData.hasShirt) {
    const shirtGrad = ctx.createLinearGradient(secX, shirtY, secX + secW, shirtY + shirtH);
    shirtGrad.addColorStop(0, 'rgba(245, 158, 11, 0.22)');
    shirtGrad.addColorStop(1, 'rgba(217, 119, 6, 0.15)');
    ctx.fillStyle = shirtGrad;
    drawRoundRect(ctx, secX, shirtY, secW, shirtH, 14);
    ctx.fill();
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    drawCenteredText(ctx, '🎽 สิทธิพิเศษ: ได้รับเสื้อที่ระลึก 1 ตัว ฟรี!', width / 2, shirtY + 22, 'bold 15px "Prompt", sans-serif', '#fde047');

    const sizeText = `ขนาดเสื้อ: ไซซ์ ${ticketData.shirtSize || 'L'} (${ticketData.shirtGender || 'ทั่วไป'}) • แสดงบัตรนี้เพื่อรับเสื้อหน้างาน`;
    drawFittedCenteredText(ctx, sizeText, width / 2, shirtY + 44, secW - 32, 13, '500', '#f8fafc');
  } else {
    ctx.fillStyle = '#0f172a';
    drawRoundRect(ctx, secX, shirtY, secW, shirtH, 14);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.stroke();

    drawCenteredText(ctx, '🎫 บัตรเข้าร่วมงานสังสรรค์ทั่วไป', width / 2, shirtY + 22, 'bold 15px "Prompt", sans-serif', '#cbd5e1');
    drawCenteredText(ctx, 'ขอขอบคุณที่มาร่วมงานสังสรรค์ปีใหม่ SME FAN 2026', width / 2, shirtY + 44, '500 13px "Prompt", sans-serif', '#94a3b8');
  }
  ctx.restore();

  // ----------------------------------------------------
  // PERFORATED DIVIDER 2 (Stub Cut Before QR)
  // ----------------------------------------------------
  const divY2 = shirtY + shirtH + 12;
  ctx.save();
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.arc(16, divY2, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(width - 16, divY2, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.setLineDash([8, 5]);
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.45)';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(34, divY2);
  ctx.lineTo(width - 34, divY2);
  ctx.stroke();
  ctx.restore();

  // ----------------------------------------------------
  // SECTION 3: SCANNABLE QR CODE - 2 COLUMNS (Compact & Tight)
  // Left Column: QR Code (35%) | Right Column: Text & Info (65%)
  // ----------------------------------------------------
  const qrSecY = divY2 + 12;
  const qrSecH = 176;

  const colLeftW = Math.round(secW * 0.35); // 258px (35%)
  const colGapQR = 16;
  const colRightW = secW - colLeftW - colGapQR; // 462px (65%)
  const colRightX = secX + colLeftW + colGapQR; // 306

  // 1) LEFT COLUMN (35%): QR Code Centered and Filling the Channel
  const qrImg = await loadImage(qrDataUrl);
  const qrBoxSize = 165;
  const leftCenterX = secX + colLeftW / 2;
  const qrBoxX = leftCenterX - qrBoxSize / 2;
  const qrBoxY = qrSecY + 5;

  ctx.save();
  // Drop shadow
  ctx.shadowColor = 'rgba(245, 158, 11, 0.28)';
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 3;
  ctx.fillStyle = '#ffffff';
  drawRoundRect(ctx, qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 16);
  ctx.fill();
  ctx.restore();

  // Draw QR Image inside with subtle padding (fills nicely!)
  const qrPad = 6;
  ctx.drawImage(qrImg, qrBoxX + qrPad, qrBoxY + qrPad, qrBoxSize - qrPad * 2, qrBoxSize - qrPad * 2);

  // 2) RIGHT COLUMN (65%): Information Panel
  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  // Heading requested: "แสดง QR Code หน้างานให้เจ้าหน้าที่"
  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 16px "Prompt", sans-serif';
  ctx.fillText('📱 แสดง QR Code หน้างานให้เจ้าหน้าที่', colRightX, qrSecY + 16);

  // Sub-heading
  ctx.fillStyle = '#94a3b8';
  ctx.font = '500 12px "Prompt", sans-serif';
  ctx.fillText('เจ้าหน้าที่แอดมินจะใช้ระบบสแกนเพื่อลงทะเบียนเข้างาน', colRightX, qrSecY + 36);

  // Attendee Info Card inside Right Column
  const infoCardY = qrSecY + 48;
  const infoCardH = 122;
  ctx.fillStyle = '#0f172a';
  drawRoundRect(ctx, colRightX, infoCardY, colRightW, infoCardH, 14);
  ctx.fill();
  ctx.strokeStyle = 'rgba(251, 191, 36, 0.3)';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Row 1: Attendee Name
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px "Prompt", sans-serif';
  drawFittedText(ctx, `👤 ${attendeeFullLabel}`, colRightX + 16, infoCardY + 20, colRightW - 32, 16, 'bold', '#ffffff');

  // Row 2: Ticket Number & Status / Club
  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 14px "Courier New", monospace';
  ctx.fillText(`เลขที่บัตร: ${ticketNoStr}`, colRightX + 16, infoCardY + 42);

  ctx.fillStyle = '#a5b4fc';
  ctx.font = '600 13px "Prompt", sans-serif';
  drawFittedText(ctx, `•  ${roleClubStr}`, colRightX + 175, infoCardY + 42, colRightW - 190, 13, '600', '#a5b4fc');

  // Row 3: Scanned Content Preview Box
  const scanBoxY = infoCardY + 56;
  const scanBoxH = 54;
  const scanBoxW = colRightW - 24;
  ctx.fillStyle = 'rgba(16, 185, 129, 0.12)';
  drawRoundRect(ctx, colRightX + 12, scanBoxY, scanBoxW, scanBoxH, 10);
  ctx.fill();
  ctx.strokeStyle = 'rgba(16, 185, 129, 0.35)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#34d399';
  ctx.font = 'bold 11px "Prompt", sans-serif';
  ctx.fillText('✓ ข้อมูลเมื่อแอดมินสแกน:', colRightX + 22, scanBoxY + 16);

  ctx.fillStyle = '#f1f5f9';
  ctx.font = '500 12px "Prompt", sans-serif';
  drawFittedText(ctx, `"${qrContent}"`, colRightX + 22, scanBoxY + 35, scanBoxW - 20, 12, '500', '#f1f5f9');

  ctx.restore();

  // ----------------------------------------------------
  // SECTION 4: FOOTER ACCREDITATION (Compact & Tight)
  // ----------------------------------------------------
  drawCenteredText(ctx, '© 2026 งานสังสรรค์ปีใหม่ SME FAN 2026', width / 2, height - 42, '500 12px "Prompt", sans-serif', '#64748b');
  drawCenteredText(ctx, 'นักพัฒนาซอฟต์แวร์ คุณทีป์ชลิต ทองจันทร์ (ผอ.โต๊ด)', width / 2, height - 22, '600 12px "Prompt", sans-serif', '#94a3b8');

  // Output as Data URL and Blob
  const dataUrl = canvas.toDataURL('image/png');
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  const safeName = (ticketData.name || 'member').replace(/\s+/g, '_');
  const fileName = `บัตรเข้างาน_${ticketNoStr}_${safeName}.png`;

  return { dataUrl, blob, fileName };
}
