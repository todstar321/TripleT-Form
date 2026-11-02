import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  X, 
  Copy, 
  Check, 
  ExternalLink, 
  Activity, 
  Sparkles,
  HelpCircle,
  Database,
  ArrowRight
} from 'lucide-react';
import { testConnection } from '../utils/googleSheets';

export default function GoogleSheetsModal({ 
  isOpen, 
  onClose, 
  formData, 
  setFormData 
}) {
  const [url, setUrl] = useState(formData.settings.googleSheetsUrl || "");
  const [sheetTabName, setSheetTabName] = useState(formData.settings.sheetTabName || "Responses");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [activeGuideTab, setActiveGuideTab] = useState('setup'); // 'setup' | 'dynamic'

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    if (!url.trim()) {
      setTestResult({
        success: false,
        message: "กรุณาวาง Web App URL ก่อนกดทดสอบ"
      });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const res = await testConnection(url.trim());
      if (res && res.status === "success") {
        setTestResult({
          success: true,
          message: `เชื่อมต่อสำเร็จ! พบชีต: "${res.sheetTitle || 'Google Sheet'}"`,
          sheets: res.sheets
        });
      } else {
        setTestResult({
          success: false,
          message: res?.message || "ไม่สามารถเชื่อมต่อได้ กรุณาตรวจสอบ URL"
        });
      }
    } catch (err) {
      setTestResult({
        success: false,
        message: "เชื่อมต่อไม่สำเร็จ: " + (err.message || "กรุณาตรวจการตั้งค่า Web App ใน Apps Script ให้เป็น 'Anyone'")
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    setFormData(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        googleSheetsUrl: url.trim(),
        sheetTabName: sheetTabName.trim() || "Responses"
      }
    }));
    onClose();
  };

  const copyScriptCode = () => {
    // We will fetch or embed the script code
    const scriptCode = `// Triple T Form - Google Apps Script
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);
  try {
    var rawData = e.postData ? e.postData.contents : null;
    if (!rawData) return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "No data" })).setMimeType(ContentService.MimeType.JSON);
    var payload = JSON.parse(rawData);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetName = payload.sheetName || "Responses";
    var sheet = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);
    var answers = payload.answers || {};
    var headers = [];
    if (sheet.getLastRow() === 0) {
      headers = ["Timestamp"];
      for (var key in answers) headers.push(key);
      sheet.appendRow(headers);
      var r = sheet.getRange(1, 1, 1, headers.length);
      r.setBackground("#4338ca").setFontColor("#ffffff").setFontWeight("bold");
      sheet.setFrozenRows(1);
    } else {
      headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      for (var fk in answers) {
        if (headers.indexOf(fk) === -1) {
          headers.push(fk);
          sheet.getRange(1, headers.length).setValue(fk).setBackground("#4338ca").setFontColor("#ffffff").setFontWeight("bold");
        }
      }
    }
    var newRow = [];
    var nowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
    for (var i = 0; i < headers.length; i++) {
      var h = headers[i];
      if (h === "Timestamp") newRow.push(nowStr);
      else {
        var v = answers[h];
        newRow.push(Array.isArray(v) ? v.join(", ") : (v !== undefined && v !== null ? v : ""));
      }
    }
    sheet.appendRow(newRow);
    return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "บันทึกเรียบร้อย", timestamp: nowStr })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var action = e.parameter.action || "ping";
    if (action === "ping") {
      return ContentService.createTextOutput(JSON.stringify({ status: "success", sheetTitle: ss.getName(), sheets: ss.getSheets().map(function(s) { return s.getName(); }) })).setMimeType(ContentService.MimeType.JSON);
    }
    if (action === "getOptions") {
      var sName = e.parameter.sheetName;
      var sheet = sName ? ss.getSheetByName(sName) : ss.getSheets()[0];
      if (!sheet) return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Sheet not found" })).setMimeType(ContentService.MimeType.JSON);
      var col = e.parameter.column || "A";
      var colIdx = 1;
      if (/^[A-Za-z]+$/.test(col)) {
        colIdx = 0;
        for (var i = 0; i < col.length; i++) colIdx += (col.charCodeAt(i) - 64) * Math.pow(26, col.length - i - 1);
      } else {
        var hdrs = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
        var found = hdrs.indexOf(col);
        if (found !== -1) colIdx = found + 1;
      }
      var lastR = sheet.getLastRow();
      if (lastR <= 1) return ContentService.createTextOutput(JSON.stringify({ status: "success", options: [] })).setMimeType(ContentService.MimeType.JSON);
      var vals = sheet.getRange(2, colIdx, lastR - 1, 1).getValues();
      var opts = [];
      for (var r = 0; r < vals.length; r++) {
        var v = vals[r][0];
        if (v !== "" && v !== null && opts.indexOf(String(v).trim()) === -1) opts.push(String(v).trim());
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "success", count: opts.length, options: opts })).setMimeType(ContentService.MimeType.JSON);
    }
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Unknown action" })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}`;

    navigator.clipboard.writeText(scriptCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-white/10 rounded-3xl shadow-2xl p-6 sm:p-8 my-8 text-slate-100">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <FileSpreadsheet className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white flex items-center space-x-2">
              <span>เชื่อมต่อ Google Sheets แบบ Real-time</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold">
                Two-Way Sync
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              บันทึกคำตอบลง Google Sheets และดึงตัวเลือกสดจากตารางมาแสดงผลอัตโนมัติ
            </p>
          </div>
        </div>

        {/* Tab Guides */}
        <div className="flex space-x-2 border-b border-white/10 pb-3 mb-5">
          <button
            onClick={() => setActiveGuideTab('setup')}
            className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-all ${
              activeGuideTab === 'setup'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            1. วิธีติดตั้งสคริปต์ (Apps Script)
          </button>
          <button
            onClick={() => setActiveGuideTab('dynamic')}
            className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-all ${
              activeGuideTab === 'dynamic'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            2. วิธีดึงตัวเลือกสดจากชีต (Dynamic Options)
          </button>
        </div>

        {activeGuideTab === 'setup' ? (
          /* Step-by-Step Guide */
          <div className="space-y-4 mb-6 text-xs text-slate-300 bg-slate-950/60 p-4 rounded-2xl border border-white/5">
            <div className="flex items-start space-x-3">
              <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold shrink-0 mt-0.5">1</span>
              <div>
                <span>เปิด </span>
                <a href="https://sheets.new" target="_blank" rel="noreferrer" className="text-indigo-400 underline font-medium inline-flex items-center space-x-1">
                  <span>Google Sheets แผ่นใหม่</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                <span> แล้วไปที่เมนู <strong>ส่วนขยาย (Extensions) &gt; Apps Script</strong></span>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold shrink-0 mt-0.5">2</span>
              <div className="flex-1">
                <span>คัดลอกโค้ดสคริปต์สำเร็จรูปไปวางแทนที่โค้ดเดิมทั้งหมด:</span>
                <div className="mt-2">
                  <button
                    onClick={copyScriptCode}
                    className="flex items-center space-x-2 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-all shadow-md"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? 'คัดลอกโค้ดเรียบร้อยแล้ว!' : 'กดเพื่อคัดลอกโค้ด Google Apps Script'}</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold shrink-0 mt-0.5">3</span>
              <div>
                <span>กดปุ่ม <strong>ทำให้ใช้งานได้ (Deploy)</strong> &gt; <strong>การทำให้ใช้งานได้ใหม่ (New deployment)</strong></span>
                <ul className="list-disc list-inside mt-1 space-y-0.5 text-slate-400">
                  <li>เลือกประเภท: <strong>เว็บแอป (Web app)</strong></li>
                  <li>ผู้ที่มีสิทธิ์เข้าถึง (Who has access): <strong className="text-amber-300">ทุกคน (Anyone)</strong></li>
                </ul>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold shrink-0 mt-0.5">4</span>
              <div>
                <span>กดปุ่ม <strong>ทำให้ใช้งานได้</strong> แล้วคัดลอก <strong>URL ของเว็บแอป (Web App URL)</strong> มาวางในช่องด้านล่าง</span>
              </div>
            </div>
          </div>
        ) : (
          /* Dynamic Options Guide */
          <div className="space-y-3 mb-6 text-xs text-slate-300 bg-slate-950/60 p-4 rounded-2xl border border-white/5">
            <div className="font-semibold text-white flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>การดึงตัวเลือกอัตโนมัติจาก Google Sheets (ไม่ต้องมาแก้ฟอร์ม)</span>
            </div>
            <p className="text-slate-400">
              เหมาะมากสำหรับคำถามที่มีตัวเลือกเปลี่ยนบ่อย เช่น รายการสินค้า, แผนก, สาขา, หรือรอบวันเวลา:
            </p>
            <div className="p-3 bg-slate-900 rounded-xl border border-white/10 space-y-2">
              <div className="flex items-center space-x-2 text-indigo-300 font-medium">
                <Database className="w-4 h-4" />
                <span>ขั้นตอนการทำ:</span>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-slate-300">
                <li>ใน Google Sheets ให้สร้างแท็บใหม่ เช่น ชื่อ <strong>"MasterData"</strong></li>
                <li>ใส่หัวคอลัมน์แถวแรก เช่น <strong>"Department"</strong> หรือใช้คอลัมน์ <strong>A</strong></li>
                <li>พิมพ์รายการตัวเลือกลงมาในแถวด้านล่าง (เช่น ฝ่ายไอที, การตลาด, การเงิน)</li>
                <li>ในหน้า <strong>"สร้างฟอร์ม"</strong> ของ Triple T Form เลือกคำถามแบบ Dropdown &gt; ติ๊กเลือก <strong>"ดึงตัวเลือกสดจาก Google Sheets"</strong> แล้วระบุชื่อคอลัมน์</li>
              </ol>
            </div>
          </div>
        )}

        {/* Input Fields */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Google Apps Script Web App URL <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/.../exec"
              className="w-full px-4 py-2.5 rounded-xl text-xs bg-slate-950 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              ชื่อแท็บในชีตสำหรับบันทึกคำตอบ (Response Sheet Name)
            </label>
            <input
              type="text"
              value={sheetTabName}
              onChange={(e) => setSheetTabName(e.target.value)}
              placeholder="Responses"
              className="w-full px-4 py-2 rounded-xl text-xs bg-slate-950 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <span className="text-[11px] text-slate-500 mt-1 block">
              หากในชีตยังไม่มีแท็บนี้ ระบบจะสร้างแท็บใหม่และตั้งค่าหัวตารางให้อัตโนมัติทันที
            </span>
          </div>

          {/* Test Connection Button & Result */}
          <div className="pt-1">
            <button
              onClick={handleTestConnection}
              disabled={testing}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 transition-all disabled:opacity-50"
            >
              <Activity className={`w-3.5 h-3.5 ${testing ? 'animate-spin text-indigo-400' : 'text-emerald-400'}`} />
              <span>{testing ? 'กำลังทดสอบการเชื่อมต่อ...' : 'ทดสอบการเชื่อมต่อ (Ping Test)'}</span>
            </button>

            {testResult && (
              <div className={`mt-3 p-3 rounded-xl text-xs border ${
                testResult.success
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}>
                <div className="font-medium">{testResult.message}</div>
                {testResult.sheets && (
                  <div className="mt-1 text-[11px] text-emerald-400/80">
                    แท็บชีตที่มีอยู่ในไฟล์: {testResult.sheets.join(", ")}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Modal Actions */}
        <div className="mt-8 pt-4 border-t border-white/10 flex items-center justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-all"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleSave}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all"
          >
            <span>บันทึกการตั้งค่า</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
}
