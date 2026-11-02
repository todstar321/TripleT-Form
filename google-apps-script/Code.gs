/**
 * =========================================================================
 * SME FAN New Year Event 2026 - Google Apps Script Backend (5 Sheets Sync)
 * =========================================================================
 * สคริปต์นี้ทำหน้าที่รับข้อมูลการลงทะเบียนจากหน้าเว็บ Triple T Form
 * และกระจายข้อมูลลงใน 5 แท็บของ Google Sheets แบบ Real-time อัตโนมัติ:
 * 
 * 1. "ข้อมูลการลงทะเบียนทั้งหมด" : ข้อมูลของทุกคนที่ลงทะเบียน
 * 2. "แยกลงสนาม" : แยกตามสังกัด (สงสพัท, โรตารี่, อื่นๆ) พร้อมระบุ "(แขกรับเชิญ)"
 * 3. "แขกรับเชิญพิเศษ" : ข้อมูลเฉพาะแขกผู้มีเกียรติและระบุผู้แนะนำ
 * 4. "คนที่ได้รับเสื้อ" : รวบรวมเฉพาะผู้ได้รับสิทธิ์เสื้อที่ระลึก 15 คนแรก พร้อมไซซ์
 * 5. "อันดับผู้เชิญแขกมากที่สุด" : สรุปจัดอันดับสมาชิกที่เชิญแขกมาร่วมงานมากที่สุด
 * 
 * พร้อมระบบจัดเก็บภาพสลิปโอนเงินลงใน Google Drive อัตโนมัติ!
 * =========================================================================
 */

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(15000);

  try {
    var rawData = e.postData ? e.postData.contents : null;
    if (!rawData) {
      return createJsonResponse({ status: "error", message: "No data received" });
    }

    var payload = JSON.parse(rawData);
    var ticket = payload.ticket || payload.answers || {};
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1. จัดเก็บรูปภาพสลิปลง Google Drive (ถ้ามี)
    var slipFileUrl = "";
    if (ticket.slipUrl && ticket.slipUrl.indexOf("data:image") === 0) {
      try {
        var folderName = "SME_FAN_Payment_Slips_2026";
        var folders = DriveApp.getFoldersByName(folderName);
        var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
        
        var base64Data = ticket.slipUrl.split(",")[1];
        var decoded = Utilities.base64Decode(base64Data);
        var blob = Utilities.newBlob(decoded, "image/jpeg", "Slip_" + (ticket.ticketNo || "REG") + "_" + (ticket.name || "User") + ".jpg");
        var driveFile = folder.createFile(blob);
        driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        slipFileUrl = driveFile.getUrl();
      } catch (err) {
        slipFileUrl = "บันทึกในระบบ (" + err.message + ")";
      }
    } else if (ticket.slipUrl) {
      slipFileUrl = ticket.slipUrl;
    }

    // ----------------------------------------------------
    // แท็บที่ 1: "ข้อมูลการลงทะเบียนทั้งหมด"
    // ----------------------------------------------------
    var sheet1 = getOrCreateSheet(ss, "ข้อมูลการลงทะเบียนทั้งหมด", [
      "Timestamp", "เลขที่บัตร", "ประเภท", "สังกัดสนาม", "ชื่อ-นามสกุล", "ชื่อเล่น", 
      "วันเกิด", "อายุ", "เบอร์โทรศัพท์", "อีเมล", "ผู้แนะนำ/ผู้ชักชวน", 
      "ยอดเงิน (บาท)", "สิทธิ์รับเสื้อ", "เพศทรงเสื้อ", "ไซซ์เสื้อ", "ลิงก์สลิปโอนเงิน", "หมายเหตุการแก้ไข"
    ]);

    var editHistoryText = "";
    if (ticket.editHistory && ticket.editHistory.length > 0) {
      editHistoryText = ticket.editHistory.map(function(h) { return h.date + ": " + h.reason; }).join(" | ");
    }

    sheet1.appendRow([
      ticket.timestamp || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss"),
      ticket.ticketNo || "",
      ticket.regType === 'member' ? "สมาชิก SME FAN" : "แขกผู้มีเกียรติ",
      ticket.club || "",
      ticket.name || "",
      ticket.nickname || "",
      ticket.birthDate || "",
      ticket.age !== undefined && ticket.age !== null ? ticket.age : "",
      ticket.phone || "",
      ticket.email || "",
      ticket.recommender || "-",
      ticket.amount || 0,
      ticket.hasShirt ? "ได้รับเสื้อ" : "ไม่ได้รับเสื้อ",
      ticket.shirtGender || "-",
      ticket.shirtSize || "-",
      slipFileUrl || "-",
      editHistoryText || "-"
    ]);

    // ----------------------------------------------------
    // แท็บที่ 2: "แยกลงสนาม" (สงสพัท, โรตารี่ ฯลฯ)
    // ----------------------------------------------------
    var sheet2 = getOrCreateSheet(ss, "แยกลงสนาม", [
      "Timestamp", "สังกัดสนาม", "ประเภทผู้เข้าร่วม", "เลขที่บัตร", "ชื่อ-นามสกุล", 
      "ชื่อเล่น", "เบอร์โทรศัพท์", "ผู้แนะนำ (กรณีเป็นแขก)", "ยอดเงิน", "สิทธิ์รับเสื้อ"
    ]);

    sheet2.appendRow([
      ticket.timestamp || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss"),
      ticket.club || "",
      ticket.regType === 'member' ? "สมาชิก" : "แขกรับเชิญ",
      ticket.ticketNo || "",
      ticket.name + (ticket.regType === 'guest' ? " (แขกรับเชิญ)" : ""),
      ticket.nickname || "",
      ticket.phone || "",
      ticket.recommender || "-",
      ticket.amount || 0,
      ticket.hasShirt ? "ได้รับเสื้อ (" + ticket.shirtSize + ")" : "-"
    ]);

    // ----------------------------------------------------
    // แท็บที่ 3: "แขกรับเชิญพิเศษ"
    // ----------------------------------------------------
    if (ticket.regType === 'guest') {
      var sheet3 = getOrCreateSheet(ss, "แขกรับเชิญพิเศษ", [
        "Timestamp", "เลขที่บัตร", "ชื่อ-นามสกุลแขก", "ชื่อเล่น", "อายุ", 
        "เบอร์โทรศัพท์", "สังกัดสนาม", "สมาชิกผู้แนะนำ (Recommender)", "ยอดเงิน", "สิทธิ์รับเสื้อ"
      ]);

      sheet3.appendRow([
        ticket.timestamp || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss"),
        ticket.ticketNo || "",
        ticket.name || "",
        ticket.nickname || "",
        ticket.age || "",
        ticket.phone || "",
        ticket.club || "",
        ticket.recommender || "-",
        ticket.amount || 0,
        ticket.hasShirt ? "ได้รับเสื้อ (" + ticket.shirtSize + " " + ticket.shirtGender + ")" : "-"
      ]);
    }

    // ----------------------------------------------------
    // แท็บที่ 4: "คนที่ได้รับเสื้อ" (15 คนแรก)
    // ----------------------------------------------------
    if (ticket.hasShirt) {
      var sheet4 = getOrCreateSheet(ss, "คนที่ได้รับเสื้อ", [
        "ลำดับเสื้อ", "Timestamp", "เลขที่บัตร", "ชื่อ-นามสกุล", "ประเภท", 
        "สังกัดสนาม", "เพศทรงเสื้อ", "ไซซ์เสื้อ", "เบอร์โทรศัพท์"
      ]);

      var shirtRowNumber = sheet4.getLastRow(); // แถวที่ 2 เป็นต้นไปคือคนที่ 1
      sheet4.appendRow([
        shirtRowNumber,
        ticket.timestamp || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss"),
        ticket.ticketNo || "",
        ticket.name || "",
        ticket.regType === 'member' ? "สมาชิก" : "แขกผู้มีเกียรติ",
        ticket.club || "",
        ticket.shirtGender || "ชาย",
        ticket.shirtSize || "L",
        ticket.phone || ""
      ]);
    }

    // ----------------------------------------------------
    // แท็บที่ 5: "อันดับผู้เชิญแขกมากที่สุด" (คำนวณสรุป)
    // ----------------------------------------------------
    updateRecommendersLeaderboard(ss);

    return createJsonResponse({
      status: "success",
      message: "บันทึกข้อมูลและกระจายลง 5 แท็บเรียบร้อยแล้ว",
      ticketNo: ticket.ticketNo,
      slipDriveUrl: slipFileUrl
    });

  } catch (error) {
    return createJsonResponse({
      status: "error",
      message: error.toString()
    });
  } finally {
    lock.releaseLock();
  }
}

/**
 * คำนวณจัดอันดับสมาชิกที่เชิญแขกมากที่สุดจากแท็บแขกรับเชิญ
 */
function updateRecommendersLeaderboard(ss) {
  var sheetGuest = ss.getSheetByName("แขกรับเชิญพิเศษ");
  if (!sheetGuest || sheetGuest.getLastRow() <= 1) return;

  var data = sheetGuest.getRange(2, 1, sheetGuest.getLastRow() - 1, sheetGuest.getLastColumn()).getValues();
  // Col 7 = Club, Col 8 = Recommender
  var tally = {}; // { "ชื่อผู้แนะนำ": { club: "...", count: 0 } }

  for (var i = 0; i < data.length; i++) {
    var club = data[i][6];
    var recommender = data[i][7];
    if (recommender && recommender !== "-") {
      if (!tally[recommender]) {
        tally[recommender] = { club: club, count: 0 };
      }
      tally[recommender].count++;
    }
  }

  // แปลงเป็น Array แล้วเรียงจากมากไปหาน้อย
  var list = [];
  for (var name in tally) {
    list.push({ name: name, club: tally[name].club, count: tally[name].count });
  }
  list.sort(function(a, b) { return b.count - a.count; });

  var sheet5 = getOrCreateSheet(ss, "อันดับผู้เชิญแขกมากที่สุด", [
    "อันดับ (Rank)", "ชื่อสมาชิกผู้แนะนำ", "สังกัดสนาม", "จำนวนแขกที่ชักชวน (คน)"
  ]);

  // เคลียร์ข้อมูลเก่าตั้งแต่แถว 2
  if (sheet5.getLastRow() > 1) {
    sheet5.getRange(2, 1, sheet5.getLastRow() - 1, 4).clearContent();
  }

  var rows = [];
  for (var r = 0; r < list.length; r++) {
    rows.push([r + 1, list[r].name, list[r].club, list[r].count]);
  }

  if (rows.length > 0) {
    sheet5.getRange(2, 1, rows.length, 4).setValues(rows);
  }
}

function getOrCreateSheet(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  if (sheet.getLastRow() === 0 && headers && headers.length > 0) {
    sheet.appendRow(headers);
    var range = sheet.getRange(1, 1, 1, headers.length);
    range.setBackground("#d97706"); // สี Amber / Gold ปีใหม่
    range.setFontColor("#ffffff");
    range.setFontWeight("bold");
    range.setHorizontalAlignment("center");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    return createJsonResponse({
      status: "success",
      message: "SME FAN 2026 API Ready",
      sheetTitle: ss.getName(),
      sheets: ss.getSheets().map(function(s) { return s.getName(); })
    });
  } catch (error) {
    return createJsonResponse({ status: "error", message: error.toString() });
  }
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
