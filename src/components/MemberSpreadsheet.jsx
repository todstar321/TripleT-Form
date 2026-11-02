import React, { useState, useEffect, useRef } from 'react';
import { 
  Table, 
  FileSpreadsheet, 
  Plus, 
  Trash2, 
  Save, 
  Download, 
  Check, 
  Search, 
  ClipboardPaste, 
  Sparkles,
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { formatPhoneNumber } from '../utils/phoneFormatter';

export default function MemberSpreadsheet({
  activeClub,
  initialMembers = [],
  onSaveMembers,
  isOwner = true
}) {
  // Local rows for editing in the spreadsheet grid
  const [rows, setRows] = useState([]);
  const [isDirty, setIsDirty] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [quickPasteOpen, setQuickPasteOpen] = useState(false);
  const [quickPasteText, setQuickPasteText] = useState('');

  // Sync rows when activeClub or initialMembers change
  useEffect(() => {
    const clubMembers = initialMembers
      .filter(m => m.club === activeClub)
      .map(m => ({
        id: m.id || `m_${Date.now()}_${Math.random()}`,
        memberCode: m.memberCode || m.code || '',
        name: m.name || '',
        nickname: m.nickname || '',
        phone: m.phone || '',
        email: m.email || ''
      }));

    // Ensure at least 5 rows for convenient typing like Google Sheets
    while (clubMembers.length < 5) {
      clubMembers.push({
        id: `row_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        memberCode: '',
        name: '',
        nickname: '',
        phone: '',
        email: '',
        isNew: true
      });
    }

    setRows(clubMembers);
    setIsDirty(false);
  }, [activeClub, initialMembers]);

  // Handle cell edit
  const handleCellChange = (index, field, value) => {
    const formattedVal = field === 'phone' ? formatPhoneNumber(value) : value;
    setRows(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: formattedVal };
      return next;
    });
    setIsDirty(true);
    setSaveSuccess(false);
  };

  // Add empty row
  const handleAddRow = (count = 1) => {
    setRows(prev => {
      const added = Array.from({ length: count }, () => ({
        id: `row_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        memberCode: '',
        name: '',
        nickname: '',
        phone: '',
        email: '',
        isNew: true
      }));
      return [...prev, ...added];
    });
    setIsDirty(true);
  };

  // Delete row
  const handleDeleteRow = (index) => {
    setRows(prev => {
      const next = [...prev];
      next.splice(index, 1);
      if (next.length === 0) {
        next.push({
          id: `row_${Date.now()}`,
          memberCode: '',
          name: '',
          nickname: '',
          phone: '',
          email: '',
          isNew: true
        });
      }
      return next;
    });
    setIsDirty(true);
  };

  // Clear blank rows
  const handleClearBlankRows = () => {
    setRows(prev => {
      const filtered = prev.filter(r => (r.memberCode && r.memberCode.trim()) || r.name.trim() || r.nickname.trim() || r.phone.trim() || r.email.trim());
      while (filtered.length < 5) {
        filtered.push({
          id: `row_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          memberCode: '',
          name: '',
          nickname: '',
          phone: '',
          email: '',
          isNew: true
        });
      }
      return filtered;
    });
  };

  // Smart Clipboard Paste Handler (Google Sheets / Excel Format)
  const parseAndApplyPaste = (pastedText, startRowIndex = 0) => {
    if (!pastedText || !pastedText.trim()) return;

    const lines = pastedText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return;

    const parsedData = lines.map(line => {
      // Priority 1: Tab-separated (Google Sheets / Excel standard)
      if (line.includes('\t')) {
        const parts = line.split('\t').map(p => p.trim());
        if (parts.length >= 5) {
          return {
            memberCode: parts[0] || '',
            name: parts[1] || '',
            nickname: parts[2] || '',
            phone: parts[3] || '',
            email: parts[4] || ''
          };
        } else if (parts.length === 4) {
          // If 4th column has @, likely legacy format: name, nickname, phone, email
          const hasEmailAtEnd = (parts[3] || '').includes('@');
          if (hasEmailAtEnd) {
            return {
              memberCode: '',
              name: parts[0] || '',
              nickname: parts[1] || '',
              phone: parts[2] || '',
              email: parts[3] || ''
            };
          } else {
            return {
              memberCode: parts[0] || '',
              name: parts[1] || '',
              nickname: parts[2] || '',
              phone: parts[3] || '',
              email: ''
            };
          }
        } else if (parts.length === 3) {
          return {
            memberCode: '',
            name: parts[0] || '',
            nickname: parts[1] || '',
            phone: parts[2] || '',
            email: ''
          };
        } else if (parts.length === 2) {
          return {
            memberCode: parts[0] || '',
            name: parts[1] || '',
            nickname: '',
            phone: '',
            email: ''
          };
        }
      }
      // Priority 2: Comma or Semicolon separated
      if (line.includes(',') || line.includes(';')) {
        const parts = line.split(/[,;]/).map(p => p.trim());
        if (parts.length >= 5) {
          return {
            memberCode: parts[0] || '',
            name: parts[1] || '',
            nickname: parts[2] || '',
            phone: parts[3] || '',
            email: parts[4] || ''
          };
        }
        return {
          memberCode: '',
          name: parts[0] || '',
          nickname: parts[1] || '',
          phone: parts[2] || '',
          email: parts[3] || ''
        };
      }
      // Single column: Name only
      return {
        memberCode: '',
        name: line,
        nickname: '',
        phone: '',
        email: ''
      };
    });

    setRows(prev => {
      const next = [...prev];
      parsedData.forEach((item, i) => {
        const targetIdx = startRowIndex + i;
        const rowObj = {
          id: `m_paste_${Date.now()}_${i}`,
          memberCode: item.memberCode,
          name: item.name,
          nickname: item.nickname,
          phone: formatPhoneNumber(item.phone || ''),
          email: item.email
        };

        if (targetIdx < next.length) {
          next[targetIdx] = rowObj;
        } else {
          next.push(rowObj);
        }
      });
      return next;
    });

    setIsDirty(true);
    setSaveSuccess(false);
  };

  // Direct paste onto grid cell
  const handleCellPaste = (e, rowIndex) => {
    const clipboardText = e.clipboardData.getData('text');
    // If it contains newline or tab, treat as multi-cell spreadsheet paste
    if (clipboardText.includes('\n') || clipboardText.includes('\t')) {
      e.preventDefault();
      parseAndApplyPaste(clipboardText, rowIndex);
    }
  };

  // Save all valid members to system
  const handleSave = () => {
    const validMembers = rows
      .filter(r => (r.name && r.name.trim()) || (r.memberCode && r.memberCode.trim()))
      .map(r => ({
        id: r.id.startsWith('row_') ? `m_${Date.now()}_${Math.random().toString(36).substr(2, 6)}` : r.id,
        club: activeClub,
        memberCode: (r.memberCode || '').trim(),
        name: (r.name || '').trim(),
        nickname: (r.nickname || '').trim(),
        phone: formatPhoneNumber((r.phone || '').trim()),
        email: (r.email || '').trim()
      }));

    if (onSaveMembers) {
      onSaveMembers(validMembers, activeClub);
    }
    setIsDirty(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3500);
  };

  // Export current club roster to CSV
  const handleExportCSV = () => {
    const valid = rows.filter(r => (r.name && r.name.trim()) || (r.memberCode && r.memberCode.trim()));
    if (valid.length === 0) {
      alert('ไม่มีข้อมูลสมาชิกสำหรับส่งออก');
      return;
    }

    let csvContent = '\uFEFFรหัสสมาชิก,ชื่อ - นามสกุลจริง,ชื่อเล่น,เบอร์โทรศัพท์,อีเมล,สังกัดสนาม\n';
    valid.forEach(r => {
      csvContent += `"${r.memberCode || ''}","${r.name || ''}","${r.nickname || ''}","${r.phone || ''}","${r.email || ''}","${activeClub}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `รายชื่อสมาชิก_${activeClub}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filtered rows for display
  const displayedRows = rows.filter((r) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      (r.memberCode && r.memberCode.toLowerCase().includes(q)) ||
      r.name.toLowerCase().includes(q) ||
      r.nickname.toLowerCase().includes(q) ||
      r.phone.includes(q) ||
      r.email.toLowerCase().includes(q)
    );
  });

  const validRowCount = rows.filter(r => (r.name && r.name.trim()) || (r.memberCode && r.memberCode.trim())).length;

  return (
    <div className="space-y-4">
      {/* Spreadsheet Header Toolbar */}
      <div className="bg-slate-900 border border-white/10 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-lg">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <h3 className="text-sm sm:text-base font-extrabold text-white flex items-center space-x-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
              <span>ตารางรายชื่อสมาชิก: สนาม {activeClub}</span>
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            พิมพ์ข้อมูลลงในตารางได้โดยตรง หรือกด <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 font-mono text-[10px]">Ctrl+V</kbd> เพื่อวางข้อมูลจาก Google Sheets / Excel ทั้งหมดได้ทันที
          </p>
        </div>

        {/* Toolbar Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Paste Button */}
          <button
            type="button"
            onClick={() => setQuickPasteOpen(true)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25 transition-all flex items-center space-x-1.5"
            title="วางข้อมูลจาก Google Sheets"
          >
            <ClipboardPaste className="w-3.5 h-3.5" />
            <span>วางจาก Google Sheets</span>
          </button>

          {/* Add Row Buttons */}
          <button
            type="button"
            onClick={() => handleAddRow(1)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-white transition-all flex items-center space-x-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>เพิ่มแถว</span>
          </button>

          <button
            type="button"
            onClick={() => handleAddRow(5)}
            className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 transition-all"
            title="เพิ่มทีเดียว 5 แถว"
          >
            +5 แถว
          </button>

          <button
            type="button"
            onClick={handleClearBlankRows}
            className="px-2.5 py-1.5 rounded-xl text-xs text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-all"
            title="ล้างแถวที่ว่างอยู่"
          >
            ล้างแถวว่าง
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3 py-1.5 rounded-xl text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 transition-all flex items-center space-x-1"
            title="ดาวน์โหลดเป็นไฟล์ CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>ส่งออก CSV</span>
          </button>

          {/* Save Button */}
          <button
            type="button"
            onClick={handleSave}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md flex items-center space-x-1.5 ${
              isDirty
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 ring-2 ring-amber-400/50 animate-bounce'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            {saveSuccess ? (
              <>
                <Check className="w-4 h-4 text-white" />
                <span>บันทึกแล้ว!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{isDirty ? '💾 บันทึกการเปลี่ยนแปลง *' : 'บันทึกข้อมูลเข้าสู่ระบบ'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Status Bar & Search Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1 text-xs">
        <div className="flex items-center space-x-3 text-slate-400">
          <span>
            สมาชิกสนาม <strong className="text-white">{activeClub}</strong>: <strong className="text-amber-400 font-mono text-sm">{validRowCount}</strong> ท่าน
          </span>
          {isDirty && (
            <span className="text-amber-400 font-medium inline-flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              <span>มีข้อมูลที่ยังไม่ได้บันทึก</span>
            </span>
          )}
          {saveSuccess && (
            <span className="text-emerald-400 font-medium inline-flex items-center space-x-1">
              <Check className="w-3.5 h-3.5" />
              <span>บันทึกเข้าสู่ระบบเรียบร้อยแล้ว</span>
            </span>
          )}
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="ค้นหาในตาราง..."
            className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-white/10 text-white text-xs w-48 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Spreadsheet Table Grid (Google Sheets Look & Feel) */}
      <div className="border border-white/15 rounded-2xl overflow-hidden bg-slate-950 shadow-2xl">
        <div className="overflow-x-auto max-h-[520px]">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900 border-b border-white/15 text-slate-300 font-semibold sticky top-0 z-10 shadow-sm">
                <th className="w-12 px-3 py-2.5 text-center text-slate-500 border-r border-white/10 select-none">#</th>
                <th className="min-w-[130px] px-3 py-2.5 border-r border-white/10">
                  <span className="flex items-center justify-between">
                    <span className="text-amber-300 font-bold">รหัสสมาชิก</span>
                    <span className="text-[10px] text-slate-500 font-normal">คอลัมน์ A</span>
                  </span>
                </th>
                <th className="min-w-[210px] px-3 py-2.5 border-r border-white/10">
                  <span className="flex items-center justify-between">
                    <span>ชื่อ - นามสกุลจริง <span className="text-rose-400">*</span></span>
                    <span className="text-[10px] text-slate-500 font-normal">คอลัมน์ B</span>
                  </span>
                </th>
                <th className="min-w-[110px] px-3 py-2.5 border-r border-white/10">
                  <span className="flex items-center justify-between">
                    <span>ชื่อเล่น</span>
                    <span className="text-[10px] text-slate-500 font-normal">คอลัมน์ C</span>
                  </span>
                </th>
                <th className="min-w-[140px] px-3 py-2.5 border-r border-white/10">
                  <span className="flex items-center justify-between">
                    <span>เบอร์โทรศัพท์</span>
                    <span className="text-[10px] text-slate-500 font-normal">คอลัมน์ D</span>
                  </span>
                </th>
                <th className="min-w-[180px] px-3 py-2.5 border-r border-white/10">
                  <span className="flex items-center justify-between">
                    <span>อีเมล</span>
                    <span className="text-[10px] text-slate-500 font-normal">คอลัมน์ E</span>
                  </span>
                </th>
                <th className="w-14 px-2 py-2.5 text-center text-slate-500">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-sans">
              {displayedRows.map((row, idx) => {
                const actualIndex = rows.findIndex(r => r.id === row.id);
                const hasValue = !!(row.name?.trim() || row.memberCode?.trim());

                return (
                  <tr 
                    key={row.id} 
                    className={`hover:bg-white/[0.04] transition-colors ${
                      hasValue ? 'bg-transparent' : 'bg-slate-950/40 opacity-75'
                    }`}
                  >
                    {/* Row Index */}
                    <td className="px-2 py-1 text-center font-mono text-[11px] text-slate-500 border-r border-white/10 bg-slate-900/40 select-none">
                      {actualIndex + 1}
                    </td>

                    {/* Column A: Member Code */}
                    <td className="p-0 border-r border-white/10 focus-within:ring-2 focus-within:ring-amber-500 focus-within:z-10 relative">
                      <input
                        type="text"
                        value={row.memberCode || ''}
                        onChange={(e) => handleCellChange(actualIndex, 'memberCode', e.target.value)}
                        onPaste={(e) => handleCellPaste(e, actualIndex)}
                        placeholder="เช่น SME-001"
                        className="w-full h-full px-3 py-2 bg-transparent text-amber-300 font-mono font-semibold placeholder-slate-600 focus:outline-none"
                      />
                    </td>

                    {/* Column B: Full Name */}
                    <td className="p-0 border-r border-white/10 focus-within:ring-2 focus-within:ring-emerald-500 focus-within:z-10 relative">
                      <input
                        type="text"
                        value={row.name}
                        onChange={(e) => handleCellChange(actualIndex, 'name', e.target.value)}
                        onPaste={(e) => handleCellPaste(e, actualIndex)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (actualIndex === rows.length - 1) {
                              handleAddRow(1);
                            }
                          }
                        }}
                        placeholder="เช่น นายทีป์ชลิต ทองจันทร์"
                        className="w-full h-full px-3 py-2 bg-transparent text-white font-medium placeholder-slate-600 focus:outline-none"
                      />
                    </td>

                    {/* Column C: Nickname */}
                    <td className="p-0 border-r border-white/10 focus-within:ring-2 focus-within:ring-emerald-500 focus-within:z-10 relative">
                      <input
                        type="text"
                        value={row.nickname}
                        onChange={(e) => handleCellChange(actualIndex, 'nickname', e.target.value)}
                        onPaste={(e) => handleCellPaste(e, actualIndex)}
                        placeholder="เช่น ทีป์"
                        className="w-full h-full px-3 py-2 bg-transparent text-amber-200 placeholder-slate-600 focus:outline-none"
                      />
                    </td>

                    {/* Column D: Phone */}
                    <td className="p-0 border-r border-white/10 focus-within:ring-2 focus-within:ring-emerald-500 focus-within:z-10 relative">
                      <input
                        type="text"
                        value={row.phone}
                        onChange={(e) => handleCellChange(actualIndex, 'phone', e.target.value)}
                        onPaste={(e) => handleCellPaste(e, actualIndex)}
                        placeholder="08x-xxx-xxxx"
                        className="w-full h-full px-3 py-2 bg-transparent text-slate-200 font-mono placeholder-slate-600 focus:outline-none"
                      />
                    </td>

                    {/* Column E: Email */}
                    <td className="p-0 border-r border-white/10 focus-within:ring-2 focus-within:ring-emerald-500 focus-within:z-10 relative">
                      <input
                        type="email"
                        value={row.email}
                        onChange={(e) => handleCellChange(actualIndex, 'email', e.target.value)}
                        onPaste={(e) => handleCellPaste(e, actualIndex)}
                        placeholder="name@email.com"
                        className="w-full h-full px-3 py-2 bg-transparent text-slate-300 placeholder-slate-600 focus:outline-none"
                      />
                    </td>

                    {/* Actions: Delete */}
                    <td className="px-2 py-1 text-center">
                      <button
                        type="button"
                        onClick={() => handleDeleteRow(actualIndex)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="ลบแถวนี้"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Paste Modal */}
      {quickPasteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-lg bg-slate-900 border border-white/15 rounded-3xl p-6 text-slate-100 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center space-x-2">
                <ClipboardPaste className="w-5 h-5 text-emerald-400" />
                <h4 className="font-bold text-white text-base">วางรายชื่อจาก Google Sheets หรือ Excel</h4>
              </div>
              <button
                type="button"
                onClick={() => setQuickPasteOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              คัดลอกเซลล์จาก Google Sheets หรือ Excel มาวางในกล่องนี้ได้เลย (ระบบรองรับ 5 คอลัมน์: <strong>รหัสสมาชิก, ชื่อ-สกุล, ชื่อเล่น, เบอร์โทร, อีเมล</strong> หรือวาง 4 คอลัมน์แบบเดิมก็ได้):
            </p>

            <textarea
              rows={8}
              value={quickPasteText}
              onChange={(e) => setQuickPasteText(e.target.value)}
              placeholder={`SME-001\tนายสมชาย ใจดี\tสมชาย\t0812345678\tsomchai@email.com\nSME-002\tนางสมศรี มีสุข\tสมศรี\t0898765432\tsomsri@email.com\nSME-003\tนายเอกชัย สมบูรณ์\tเอก\t0861112233\tekkachai@email.com`}
              className="w-full p-3 rounded-2xl bg-slate-950 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-emerald-500 placeholder-slate-600"
            />

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setQuickPasteOpen(false)}
                className="px-4 py-2 rounded-xl text-xs bg-white/10 text-white hover:bg-white/15"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => {
                  parseAndApplyPaste(quickPasteText, rows.filter(r => r.name?.trim() || r.memberCode?.trim()).length);
                  setQuickPasteText('');
                  setQuickPasteOpen(false);
                }}
                disabled={!quickPasteText.trim()}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all disabled:opacity-50"
              >
                นำเข้าข้อมูลลงในตาราง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
