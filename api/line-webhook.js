// Vercel Serverless Function: LINE Messaging API Webhook
// Handles Webhook verification and automatically replies with groupId when bot is invited or when asked (#id)

const DEFAULT_LINE_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || 
  "XGJececS24KISZpzkTHpnTJo0f10vXRtNdOhtz3i4NMXqTmxjLk2cvGFrlsZ39KycLX4uqea82GZN1Y1wVx9bZRbQgca3shrIwViQH3pRJCVM5qyTfdTQEXGh8d8X0LVWrggMhkoIlVij0YDDLZysgdB04t89/1O/w1cDnyilFU=";

export default async function handler(req, res) {
  // Allow GET for easy browser testing / healthcheck
  if (req.method === "GET") {
    return res.status(200).json({
      status: "ok",
      service: "Triple T Form - LINE OA Webhook",
      timestamp: new Date().toISOString()
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = req.body || {};
    const events = body.events || [];

    // LINE Developers Console "Verify" sends events: []
    if (!events || events.length === 0) {
      return res.status(200).json({ status: "verified", message: "Webhook endpoint verified successfully" });
    }

    const token = DEFAULT_LINE_ACCESS_TOKEN;

    // Process each event
    for (const event of events) {
      const replyToken = event.replyToken;
      const source = event.source || {};
      const sourceType = source.type; // 'group' | 'room' | 'user'
      const groupId = source.groupId || source.roomId || source.userId;

      // Case 1: Bot joins group or room
      if ((event.type === "join" || event.type === "memberJoined") && replyToken && groupId) {
        await replyLineMessage(replyToken, token, [
          {
            type: "text",
            text: `🎉 สวัสดีครับ! บอท SME FAN สงสพัท OA เข้าร่วมกลุ่มเรียบร้อยแล้ว\n\n📋 รหัสกลุ่ม LINE (Group ID) ของกลุ่มนี้คือ:\n${groupId}\n\n👉 กรุณาคัดลอกรหัสนี้ไปใส่ในหน้า Admin > ตั้งค่าการแจ้งเตือน LINE เพื่อรับข้อความเมื่อมีผู้ลงทะเบียนใหม่ครับ`
          }
        ]);
      }

      // Case 2: User sends text message inquiring about ID (#id, #groupid, /id, groupId)
      if (event.type === "message" && event.message?.type === "text" && replyToken) {
        const text = (event.message.text || "").trim().toLowerCase();
        if (text === "#id" || text === "#groupid" || text === "/id" || text === "groupid" || text === "ขอไอดีกลุ่ม") {
          let replyContent = "";
          if (sourceType === "group") {
            replyContent = `📋 รหัสกลุ่ม LINE (Group ID) คือ:\n${source.groupId}\n\n👉 นำรหัสนี้ไปบันทึกในหน้า Admin > คลาวด์/LINE เพื่อรับแจ้งเตือนผู้ลงทะเบียนใหม่ได้ทันทีครับ`;
          } else if (sourceType === "room") {
            replyContent = `📋 รหัสห้อง LINE (Room ID) คือ:\n${source.roomId}\n\n👉 นำรหัสนี้ไปบันทึกในหน้า Admin ได้เลยครับ`;
          } else {
            replyContent = `👤 รหัสผู้ใช้งาน LINE (User ID) ของคุณคือ:\n${source.userId}\n\n(หากต้องการให้แจ้งเตือนเข้ากลุ่ม กรุณาเชิญบอทเข้ากลุ่มแล้วพิมพ์ #id ในกลุ่มครับ)`;
          }

          await replyLineMessage(replyToken, token, [
            {
              type: "text",
              text: replyContent
            }
          ]);
        }
      }
    }

    return res.status(200).json({ status: "success", processed: events.length });
  } catch (err) {
    console.error("LINE Webhook error:", err);
    return res.status(500).json({ error: err.message });
  }
}

async function replyLineMessage(replyToken, accessToken, messages) {
  if (!replyToken || !accessToken) return;
  try {
    const resp = await fetch("https://api.line.me/v2/bot/message/reply", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        replyToken,
        messages
      })
    });
    const result = await resp.json().catch(() => null);
    return result;
  } catch (e) {
    console.warn("LINE reply error:", e);
  }
}
