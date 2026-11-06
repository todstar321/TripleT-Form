// Vercel Serverless Function: Push Notification to LINE Group
// Sends rich LINE Flex Message (or test message) using LINE Messaging API Push endpoint

const DEFAULT_LINE_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || 
  "XGJececS24KISZpzkTHpnTJo0f10vXRtNdOhtz3i4NMXqTmxjLk2cvGFrlsZ39KycLX4uqea82GZN1Y1wVx9bZRbQgca3shrIwViQH3pRJCVM5qyTfdTQEXGh8d8X0LVWrggMhkoIlVij0YDDLZysgdB04t89/1O/w1cDnyilFU=";

export default async function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).json({
      status: "ok",
      service: "Triple T Form - LINE Notify API",
      timestamp: new Date().toISOString()
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      ticket,
      token,
      groupId,
      isTest,
      remainingSeats,
      maxSeats,
      totalRegistered
    } = req.body || {};

    const accessToken = (token || "").trim() || DEFAULT_LINE_ACCESS_TOKEN;
    const targetId = (groupId || "").trim();

    if (!targetId) {
      return res.status(400).json({
        success: false,
        error: "LINE Group ID is required (กรุณาระบุรหัสกลุ่ม LINE ในหน้าตั้งค่าแอดมิน)"
      });
    }

    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: "LINE Channel Access Token is required"
      });
    }

    let messages = [];

    // ==========================================
    // CASE A: TEST PUSH MESSAGE
    // ==========================================
    if (isTest) {
      const nowThai = new Date().toLocaleString("th-TH", { timeZone: "Asia/Bangkok" });
      messages = [
        {
          type: "flex",
          altText: "🧪 ทดสอบระบบแจ้งเตือน LINE OA สำเร็จ",
          contents: {
            type: "bubble",
            size: "mega",
            header: {
              type: "box",
              layout: "vertical",
              backgroundColor: "#0f172a",
              paddingTop: "20px",
              paddingBottom: "16px",
              paddingStart: "20px",
              paddingEnd: "20px",
              contents: [
                {
                  type: "text",
                  text: "🧪 TEST NOTIFICATION",
                  weight: "bold",
                  size: "xxs",
                  color: "#f59e0b",
                  letterSpacing: "1px"
                },
                {
                  type: "text",
                  text: "ทดสอบการเชื่อมต่อ LINE สำเร็จ!",
                  weight: "bold",
                  size: "lg",
                  color: "#ffffff",
                  margin: "xs"
                },
                {
                  type: "text",
                  text: "SME FAN สงสพัท OA • Triple T Form",
                  size: "xs",
                  color: "#94a3b8",
                  margin: "xs"
                }
              ]
            },
            body: {
              type: "box",
              layout: "vertical",
              spacing: "md",
              backgroundColor: "#ffffff",
              paddingAll: "20px",
              contents: [
                {
                  type: "box",
                  layout: "vertical",
                  backgroundColor: "#f0fdf4",
                  cornerRadius: "md",
                  paddingAll: "12px",
                  borderColor: "#86efac",
                  borderWidth: "1px",
                  contents: [
                    {
                      type: "text",
                      text: "✅ บอทเชื่อมต่อกับกลุ่ม LINE นี้เรียบร้อยแล้ว",
                      weight: "bold",
                      size: "sm",
                      color: "#166534"
                    },
                    {
                      type: "text",
                      text: "ระบบจะแจ้งเตือนอัตโนมัติเฉพาะเมื่อมีผู้ส่งใบสมัครใหม่",
                      size: "xs",
                      color: "#15803d",
                      margin: "xs"
                    }
                  ]
                },
                {
                  type: "box",
                  layout: "vertical",
                  margin: "md",
                  spacing: "sm",
                  contents: [
                    {
                      type: "box",
                      layout: "horizontal",
                      contents: [
                        { type: "text", text: "กลุ่มเป้าหมาย", size: "xs", color: "#64748b", flex: 3 },
                        { type: "text", text: targetId.slice(0, 10) + "...", size: "xs", color: "#0f172a", weight: "bold", flex: 5, align: "end" }
                      ]
                    },
                    {
                      type: "box",
                      layout: "horizontal",
                      contents: [
                        { type: "text", text: "เวลาทดสอบ", size: "xs", color: "#64748b", flex: 3 },
                        { type: "text", text: nowThai, size: "xs", color: "#0f172a", flex: 5, align: "end" }
                      ]
                    }
                  ]
                }
              ]
            },
            footer: {
              type: "box",
              layout: "vertical",
              backgroundColor: "#f8fafc",
              paddingAll: "12px",
              contents: [
                {
                  type: "button",
                  style: "primary",
                  height: "sm",
                  color: "#d97706",
                  action: {
                    type: "uri",
                    label: "เปิดระบบลงทะเบียน",
                    uri: "https://triple-t-form.vercel.app"
                  }
                }
              ]
            }
          }
        }
      ];
    } else if (ticket) {
      // ==========================================
      // CASE B: NEW ATTENDEE REGISTRATION NOTIFICATION
      // ==========================================
      const isMember = ticket.regType === "member";
      const memberCodeBadge = ticket.memberCode ? ` [${ticket.memberCode}]` : "";
      const nicknameDisplay = ticket.nickname ? ` (${ticket.nickname})` : "";
      const regTypeLabel = isMember ? "สมาชิกสนาม" : (ticket.regType === "guest" ? "บุคคลทั่วไป/แขก" : "ผู้ร่วมงาน");
      const shirtInfo = ticket.hasShirt 
        ? `รับเสื้อ ไซส์ ${ticket.shirtSize || "-"} (${ticket.shirtGender || "-"})`
        : "ไม่ได้รับเสื้อ";
      const paidStr = Number(ticket.paidAmount || ticket.amount || 0).toLocaleString("th-TH") + " บาท";

      const remainingText = (remainingSeats !== null && remainingSeats !== undefined)
        ? `เหลืออีก ${remainingSeats} ท่านสุดท้าย (เปิดรับ ${maxSeats || 70} ท่าน)`
        : `ยอดรวมผู้ลงทะเบียน: ${totalRegistered || "1"} ท่าน`;

      const altText = `🎉 มีผู้ลงทะเบียนใหม่: ${ticket.name}${nicknameDisplay} (${ticket.ticketNo || "SME"})`;

      messages = [
        {
          type: "flex",
          altText: altText,
          contents: {
            type: "bubble",
            size: "mega",
            header: {
              type: "box",
              layout: "vertical",
              backgroundColor: "#0f172a",
              paddingTop: "20px",
              paddingBottom: "16px",
              paddingStart: "20px",
              paddingEnd: "20px",
              contents: [
                {
                  type: "box",
                  layout: "horizontal",
                  contents: [
                    {
                      type: "text",
                      text: "🎉 มีผู้ลงทะเบียนใหม่!",
                      weight: "bold",
                      size: "sm",
                      color: "#fbbf24"
                    },
                    {
                      type: "text",
                      text: ticket.ticketNo || "SME",
                      weight: "bold",
                      size: "sm",
                      color: "#38bdf8",
                      align: "end"
                    }
                  ]
                },
                {
                  type: "text",
                  text: "งานสังสรรค์ปีใหม่ SME FAN 2026",
                  size: "xs",
                  color: "#94a3b8",
                  margin: "xs"
                }
              ]
            },
            body: {
              type: "box",
              layout: "vertical",
              spacing: "md",
              backgroundColor: "#ffffff",
              paddingAll: "20px",
              contents: [
                // Highlight: Name
                {
                  type: "box",
                  layout: "vertical",
                  backgroundColor: "#fffbeb",
                  cornerRadius: "md",
                  paddingAll: "12px",
                  borderColor: "#fde68a",
                  borderWidth: "1px",
                  contents: [
                    {
                      type: "text",
                      text: `${ticket.name}${nicknameDisplay}`,
                      weight: "bold",
                      size: "md",
                      color: "#92400e",
                      wrap: true
                    },
                    {
                      type: "text",
                      text: `${regTypeLabel}${memberCodeBadge} • สนาม${ticket.club || "สงสพัท"}`,
                      size: "xs",
                      color: "#b45309",
                      margin: "xs"
                    }
                  ]
                },

                // Details List
                {
                  type: "box",
                  layout: "vertical",
                  margin: "sm",
                  spacing: "sm",
                  contents: [
                    {
                      type: "box",
                      layout: "horizontal",
                      contents: [
                        { type: "text", text: "📞 เบอร์ติดต่อ", size: "xs", color: "#64748b", flex: 4 },
                        { type: "text", text: ticket.phone || "-", size: "xs", color: "#0f172a", weight: "bold", flex: 6, align: "end" }
                      ]
                    },
                    {
                      type: "box",
                      layout: "horizontal",
                      contents: [
                        { type: "text", text: "💰 ยอดชำระ", size: "xs", color: "#64748b", flex: 4 },
                        { type: "text", text: paidStr, size: "xs", color: "#16a34a", weight: "bold", flex: 6, align: "end" }
                      ]
                    },
                    {
                      type: "box",
                      layout: "horizontal",
                      contents: [
                        { type: "text", text: "👕 เสื้อที่ระลึก", size: "xs", color: "#64748b", flex: 4 },
                        { type: "text", text: shirtInfo, size: "xs", color: "#0f172a", flex: 6, align: "end", wrap: true }
                      ]
                    },
                    {
                      type: "box",
                      layout: "horizontal",
                      contents: [
                        { type: "text", text: "⏰ วันที่ลงทะเบียน", size: "xs", color: "#64748b", flex: 4 },
                        { type: "text", text: ticket.timestamp || "-", size: "xs", color: "#64748b", flex: 6, align: "end" }
                      ]
                    }
                  ]
                },

                // Remaining Quota Badge
                {
                  type: "box",
                  layout: "vertical",
                  backgroundColor: "#ecfeff",
                  cornerRadius: "md",
                  paddingAll: "10px",
                  borderColor: "#a5f3fc",
                  borderWidth: "1px",
                  contents: [
                    {
                      type: "text",
                      text: `📊 โควตา: ${remainingText}`,
                      weight: "bold",
                      size: "xs",
                      color: "#0891b2"
                    }
                  ]
                }
              ]
            },
            footer: {
              type: "box",
              layout: "vertical",
              backgroundColor: "#f8fafc",
              paddingAll: "12px",
              contents: [
                {
                  type: "button",
                  style: "primary",
                  height: "sm",
                  color: "#d97706",
                  action: {
                    type: "uri",
                    label: "เปิดดูหน้าฟอร์ม / ตรวจสอบสลิป",
                    uri: "https://triple-t-form.vercel.app"
                  }
                }
              ]
            }
          }
        }
      ];
    } else {
      return res.status(400).json({ error: "Missing ticket data" });
    }

    // Call LINE Messaging API push endpoint
    const lineResponse = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        to: targetId,
        messages: messages
      })
    });

    const respData = await lineResponse.json().catch(() => null);

    if (!lineResponse.ok) {
      console.error("LINE Push failed:", lineResponse.status, respData);
      
      // Fallback: If Flex message had schema issues, try sending simple text message
      if (ticket && !isTest) {
        const fallbackText = `🎉 มีผู้ลงทะเบียนใหม่!\n` +
          `🎟️ รหัสบัตร: ${ticket.ticketNo}\n` +
          `👤 ชื่อ: ${ticket.name} ${ticket.nickname ? `(${ticket.nickname})` : ''}\n` +
          `⛳ สังกัด: สนาม${ticket.club || 'สงสพัท'}\n` +
          `📞 โทร: ${ticket.phone}\n` +
          `💰 ยอดชำระ: ${ticket.paidAmount || ticket.amount || 0} บาท\n` +
          `⏰ เวลา: ${ticket.timestamp}\n` +
          `🌐 ดูเพิ่มเติม: https://triple-t-form.vercel.app`;

        const fallbackResp = await fetch("https://api.line.me/v2/bot/message/push", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            to: targetId,
            messages: [{ type: "text", text: fallbackText }]
          })
        });

        if (fallbackResp.ok) {
          return res.status(200).json({
            success: true,
            fallbackUsed: true,
            message: "Sent via fallback text format"
          });
        }
      }

      return res.status(lineResponse.status).json({
        success: false,
        error: respData?.message || `LINE API error (${lineResponse.status})`,
        details: respData
      });
    }

    return res.status(200).json({
      success: true,
      message: isTest ? "Test message sent successfully" : "Registration notification sent to LINE",
      result: respData
    });

  } catch (error) {
    console.error("LINE Notify Handler Error:", error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
