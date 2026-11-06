// Vercel Serverless Function: Push Notification to Telegram Group / Channel
// Sends beautifully formatted HTML message to Telegram using Telegram Bot API

const DEFAULT_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "7577840608:AAH_m0LWjRk3916GSvBcTsp1YLdaJXFlIy0";
const DEFAULT_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "-5413358910";

export default async function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).json({
      status: "ok",
      service: "Triple T Form - Telegram Notify API",
      timestamp: new Date().toISOString()
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      ticket,
      botToken,
      chatId,
      isTest,
      remainingSeats,
      maxSeats,
      totalRegistered,
      ticketPhoto,
      photo
    } = req.body || {};

    const activeToken = (botToken || "").trim() || DEFAULT_BOT_TOKEN;
    const targetChatId = (chatId || "").trim() || DEFAULT_CHAT_ID;

    if (!activeToken) {
      return res.status(400).json({
        success: false,
        error: "Telegram Bot Token is required (กรุณาระบุ Bot Token จาก @BotFather ในหน้าตั้งค่าแอดมิน)"
      });
    }

    if (!targetChatId) {
      return res.status(400).json({
        success: false,
        error: "Telegram Chat ID is required (กรุณาระบุ Chat ID ของกลุ่มในหน้าตั้งค่าแอดมิน)"
      });
    }

    let textMessage = "";

    // ==========================================
    // CASE A: TEST MESSAGE
    // ==========================================
    if (isTest) {
      const nowThai = new Date().toLocaleString("th-TH", { timeZone: "Asia/Bangkok" });
      textMessage = 
        `🧪 <b>ทดสอบระบบแจ้งเตือน Telegram สำเร็จ!</b>\n` +
        `━━━━━━━━━━\n` +
        `✅ <b>สถานะ:</b> บอทเชื่อมต่อกับกลุ่มเรียบร้อยแล้ว\n` +
        `📢 <b>Chat ID:</b> <code>${escapeHtml(targetChatId)}</code>\n` +
        `⏰ <b>เวลาทดสอบ:</b> ${escapeHtml(nowThai)}\n\n` +
        `✨ <i>ระบบพร้อมส่งการแจ้งเตือนพร้อมรูปบัตรเข้างานอัตโนมัติฟรี 100% ทุกครั้งที่มีผู้ส่งใบสมัครใหม่แล้วครับ!</i>`;
    } 
    // ==========================================
    // CASE B: NEW ATTENDEE REGISTRATION
    // ==========================================
    else if (ticket) {
      const isMember = ticket.regType === "member";
      const memberCodeBadge = ticket.memberCode ? ` [${escapeHtml(ticket.memberCode)}]` : "";
      const nicknameDisplay = ticket.nickname ? ` (${escapeHtml(ticket.nickname)})` : "";
      const regTypeLabel = isMember ? "สมาชิกสนาม" : (ticket.regType === "guest" ? "บุคคลทั่วไป/แขก" : "ผู้ร่วมงาน");
      const shirtInfo = ticket.hasShirt 
        ? `รับเสื้อ ไซส์ ${escapeHtml(ticket.shirtSize || "-")} (${escapeHtml(ticket.shirtGender || "-")})`
        : "ไม่ได้รับเสื้อ";
      const paidStr = Number(ticket.paidAmount || ticket.amount || 0).toLocaleString("th-TH") + " บาท";

      const remainingText = (remainingSeats !== null && remainingSeats !== undefined)
        ? `เหลืออีก ${remainingSeats} ท่านสุดท้าย (เปิดรับ ${maxSeats || 70} ท่าน)`
        : `ยอดรวมผู้ลงทะเบียน: ${totalRegistered || "1"} ท่าน`;

      textMessage = 
        `🎉 <b>มีผู้ลงทะเบียนใหม่! [งานสังสรรค์ปีใหม่ SME FAN 2026]</b>\n` +
        `━━━━━━━━━━\n` +
        `🎟️ <b>รหัสบัตร:</b> <code>${escapeHtml(ticket.ticketNo || "SME")}</code>\n` +
        `👤 <b>ชื่อ-นามสกุล:</b> <b>${escapeHtml(ticket.name)}${nicknameDisplay}</b>\n` +
        `⛳ <b>สังกัด:</b> ${regTypeLabel}${memberCodeBadge} • สนาม${escapeHtml(ticket.club || "สงสพัท")}\n` +
        `📞 <b>เบอร์ติดต่อ:</b> <code>${escapeHtml(ticket.phone || "-")}</code>\n` +
        `💰 <b>ยอดชำระ:</b> <b>${paidStr}</b>\n` +
        `👕 <b>เสื้อที่ระลึก:</b> ${shirtInfo}\n` +
        `⏰ <b>เวลาลงทะเบียน:</b> ${escapeHtml(ticket.timestamp || "-")}\n` +
        `━━━━━━━━━━\n` +
        `📊 <b>โควตาที่นั่ง:</b> <b>${remainingText}</b>`;
    } else {
      return res.status(400).json({ error: "Missing ticket data" });
    }

    // Telegram Bot API SendMessage / SendPhoto
    let telegramApiUrl = `https://api.telegram.org/bot${activeToken}/sendMessage`;
    let requestOptions = {};

    const rawPhoto = ticketPhoto || photo;

    // Check if photo (ticket card image) is attached
    if (rawPhoto && typeof rawPhoto === "string") {
      try {
        const formData = new FormData();
        formData.append("chat_id", targetChatId);

        if (rawPhoto.startsWith("http://") || rawPhoto.startsWith("https://")) {
          formData.append("photo", rawPhoto);
        } else {
          const base64Data = rawPhoto.replace(/^data:image\/\w+;base64,/, "");
          const buffer = Buffer.from(base64Data, "base64");
          const blob = new Blob([buffer], { type: "image/png" });
          formData.append("photo", blob, `ticket_${ticket?.ticketNo || "card"}.png`);
        }

        formData.append("caption", textMessage);
        formData.append("parse_mode", "HTML");
        formData.append("reply_markup", JSON.stringify({
          inline_keyboard: [
            [
              {
                text: "🌐 เปิดดูเว็บไซต์ / ตรวจสอบสลิป",
                url: "https://triple-t-form.vercel.app"
              }
            ]
          ]
        }));

        telegramApiUrl = `https://api.telegram.org/bot${activeToken}/sendPhoto`;
        requestOptions = {
          method: "POST",
          body: formData
        };
      } catch (photoErr) {
        console.warn("Failed to prepare photo for Telegram, will fallback to text message:", photoErr);
      }
    }

    // Fallback to text message if photo not provided or failed to build
    if (!requestOptions.body) {
      telegramApiUrl = `https://api.telegram.org/bot${activeToken}/sendMessage`;
      const payload = {
        chat_id: targetChatId,
        text: textMessage,
        parse_mode: "HTML",
        disable_web_page_preview: true,
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "🌐 เปิดดูเว็บไซต์ / ตรวจสอบสลิป",
                url: "https://triple-t-form.vercel.app"
              }
            ]
          ]
        }
      };
      requestOptions = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      };
    }

    let response = await fetch(telegramApiUrl, requestOptions);
    let data = await response.json().catch(() => null);

    // If sendPhoto failed (e.g. payload too large or photo rejected), fallback automatically to text sendMessage
    if ((!response.ok || !data?.ok) && telegramApiUrl.includes("/sendPhoto")) {
      console.warn("Telegram sendPhoto failed, retrying with sendMessage:", data);
      const fallbackUrl = `https://api.telegram.org/bot${activeToken}/sendMessage`;
      const fallbackPayload = {
        chat_id: targetChatId,
        text: textMessage,
        parse_mode: "HTML",
        disable_web_page_preview: true,
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "🌐 เปิดดูเว็บไซต์ / ตรวจสอบสลิป",
                url: "https://triple-t-form.vercel.app"
              }
            ]
          ]
        }
      };
      response = await fetch(fallbackUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fallbackPayload)
      });
      data = await response.json().catch(() => null);
    }

    if (!response.ok || !data?.ok) {
      console.error("Telegram API Error:", response.status, data);
      return res.status(response.status || 400).json({
        success: false,
        error: data?.description || `Telegram API Error (${response.status})`,
        details: data
      });
    }

    return res.status(200).json({
      success: true,
      message: isTest ? "Telegram test message sent successfully" : "Telegram notification sent",
      result: data.result
    });

  } catch (error) {
    console.error("Telegram Handler Error:", error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
