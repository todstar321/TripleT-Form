/**
 * Utility functions for Google Sheets & Google Apps Script integration
 */

export async function testConnection(webAppUrl) {
  if (!webAppUrl || !webAppUrl.startsWith("http")) {
    throw new Error("กรุณากรอก Web App URL ให้ถูกต้อง");
  }

  try {
    const url = new URL(webAppUrl);
    url.searchParams.set("action", "ping");

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: { "Accept": "application/json" }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Test connection error:", error);
    throw error;
  }
}

export async function fetchLiveOptions(webAppUrl, sheetName, column) {
  if (!webAppUrl || !column) return null;

  try {
    const url = new URL(webAppUrl);
    url.searchParams.set("action", "getOptions");
    if (sheetName) url.searchParams.set("sheetName", sheetName);
    url.searchParams.set("column", column);

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: { "Accept": "application/json" }
    });

    if (!response.ok) return null;
    const data = await response.json();
    if (data.status === "success" && Array.isArray(data.options)) {
      return data.options;
    }
    return null;
  } catch (err) {
    console.warn("Could not fetch live options from Google Sheets:", err);
    return null;
  }
}

export async function submitFormToSheets(webAppUrl, formData, answers) {
  if (!webAppUrl) {
    // Simulated submission when no Google Sheets URL configured
    await new Promise(resolve => setTimeout(resolve, 800));
    return {
      status: "simulated",
      message: "บันทึกในโหมดจำลอง (ยังไม่ได้เชื่อมต่อ Google Sheets URL)",
      timestamp: new Date().toISOString()
    };
  }

  try {
    // Map answer keys to readable question labels for Google Sheet headers
    const readableAnswers = {};
    formData.fields.forEach(field => {
      const val = answers[field.id];
      if (val !== undefined && val !== null) {
        readableAnswers[field.label] = val;
      }
    });

    const payload = {
      action: "submit",
      sheetName: formData.settings?.sheetTabName || "Responses",
      formTitle: formData.title,
      answers: readableAnswers
    };

    /**
     * Google Apps Script Web App responds with redirects (302).
     * Using text/plain with POST prevents CORS preflight issues in Google Apps Script!
     */
    const response = await fetch(webAppUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(payload)
    });

    try {
      const data = await response.json();
      return data;
    } catch {
      // If CORS prevented reading response JSON but request succeeded
      return {
        status: "success",
        message: "ส่งข้อมูลสำเร็จเรียบร้อย"
      };
    }
  } catch (error) {
    console.error("Submission error:", error);
    throw error;
  }
}

export async function submitSmeFanTicketToSheets(webAppUrl, ticket) {
  if (!webAppUrl) {
    console.log("No Google Sheets URL configured; operating in local mode");
    return { status: "simulated", message: "บันทึกในระบบจำลอง" };
  }

  try {
    const payload = {
      action: "sme_fan_registration",
      ticket: ticket
    };

    const response = await fetch(webAppUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(payload)
    });

    try {
      return await response.json();
    } catch {
      return { status: "success", message: "ส่งข้อมูลลง Google Sheets เรียบร้อย" };
    }
  } catch (error) {
    console.warn("Failed to push to Google Sheets:", error);
    return { status: "error", message: error.message };
  }
}

