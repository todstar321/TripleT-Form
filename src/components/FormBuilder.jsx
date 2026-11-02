import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Copy, 
  ArrowUp, 
  ArrowDown, 
  CheckSquare, 
  CircleDot, 
  AlignLeft, 
  Type, 
  Star, 
  Calendar, 
  Mail, 
  Phone, 
  ChevronDown, 
  Database, 
  Sliders, 
  HelpCircle,
  Eye,
  GripVertical
} from 'lucide-react';

const fieldTypeIcons = {
  text: Type,
  textarea: AlignLeft,
  email: Mail,
  phone: Phone,
  radio: CircleDot,
  checkbox: CheckSquare,
  dropdown: ChevronDown,
  rating: Star,
  date: Calendar
};

const fieldTypeLabels = {
  text: "ข้อความสั้น (Short Text)",
  textarea: "ข้อความยาว (Paragraph)",
  email: "อีเมล (Email)",
  phone: "เบอร์โทรศัพท์ (Phone)",
  radio: "เลือกคำตอบเดียว (Multiple Choice)",
  checkbox: "เลือกได้หลายข้อ (Checkboxes)",
  dropdown: "รายการเลื่อนลง (Dropdown)",
  rating: "คะแนนประเมิน (Star Rating)",
  date: "วันที่ (Date)"
};

export default function FormBuilder({ formData, setFormData, onPreviewClick }) {
  const [activeFieldId, setActiveFieldId] = useState(null);

  // Update form top-level property
  const updateFormInfo = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  // Update form settings property
  const updateSettings = (key, value) => {
    setFormData(prev => ({
      ...prev,
      settings: { ...prev.settings, [key]: value }
    }));
  };

  // Update specific question field
  const updateField = (fieldId, updates) => {
    setFormData(prev => ({
      ...prev,
      fields: prev.fields.map(f => f.id === fieldId ? { ...f, ...updates } : f)
    }));
  };

  // Add new question
  const addField = (type = 'text') => {
    const newId = `field_${Date.now()}`;
    const newField = {
      id: newId,
      type: type,
      label: `คำถามข้อที่ ${formData.fields.length + 1}`,
      description: "",
      required: false,
      placeholder: "",
      options: ['radio', 'checkbox', 'dropdown'].includes(type) ? ["ตัวเลือกที่ 1", "ตัวเลือกที่ 2", "ตัวเลือกที่ 3"] : undefined,
      optionsSource: "manual",
      sheetColumn: "",
      maxRating: type === 'rating' ? 5 : undefined
    };

    setFormData(prev => ({
      ...prev,
      fields: [...prev.fields, newField]
    }));
    setActiveFieldId(newId);
  };

  // Delete question
  const deleteField = (fieldId) => {
    setFormData(prev => ({
      ...prev,
      fields: prev.fields.filter(f => f.id !== fieldId)
    }));
    if (activeFieldId === fieldId) setActiveFieldId(null);
  };

  // Duplicate question
  const duplicateField = (fieldId) => {
    const fieldToDup = formData.fields.find(f => f.id === fieldId);
    if (!fieldToDup) return;

    const newField = {
      ...JSON.parse(JSON.stringify(fieldToDup)),
      id: `field_${Date.now()}`,
      label: `${fieldToDup.label} (สำเนา)`
    };

    const index = formData.fields.findIndex(f => f.id === fieldId);
    const newFields = [...formData.fields];
    newFields.splice(index + 1, 0, newField);

    setFormData(prev => ({ ...prev, fields: newFields }));
    setActiveFieldId(newField.id);
  };

  // Move question up / down
  const moveField = (index, direction) => {
    const newFields = [...formData.fields];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newFields.length) return;

    const temp = newFields[index];
    newFields[index] = newFields[targetIndex];
    newFields[targetIndex] = temp;

    setFormData(prev => ({ ...prev, fields: newFields }));
  };

  // Option items management for radio/checkbox/dropdown
  const addOption = (fieldId) => {
    const field = formData.fields.find(f => f.id === fieldId);
    if (!field) return;
    const currentOptions = field.options || [];
    updateField(fieldId, {
      options: [...currentOptions, `ตัวเลือกที่ ${currentOptions.length + 1}`]
    });
  };

  const updateOptionText = (fieldId, optionIndex, newText) => {
    const field = formData.fields.find(f => f.id === fieldId);
    if (!field || !field.options) return;
    const newOptions = [...field.options];
    newOptions[optionIndex] = newText;
    updateField(fieldId, { options: newOptions });
  };

  const deleteOption = (fieldId, optionIndex) => {
    const field = formData.fields.find(f => f.id === fieldId);
    if (!field || !field.options || field.options.length <= 1) return;
    const newOptions = field.options.filter((_, idx) => idx !== optionIndex);
    updateField(fieldId, { options: newOptions });
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 space-y-6">
      
      {/* 1. Form Header Card (Title & Description) */}
      <div className="bg-slate-900/80 border border-white/10 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
        
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-1">
              ชื่อหัวข้อแบบฟอร์ม (Form Title)
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => updateFormInfo('title', e.target.value)}
              placeholder="เช่น แบบฟอร์มลงทะเบียนเข้าร่วมงาน..."
              className="w-full text-xl sm:text-2xl font-bold bg-transparent border-b border-white/10 pb-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              คำอธิบายรายละเอียดแบบฟอร์ม (Form Description)
            </label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => updateFormInfo('description', e.target.value)}
              placeholder="กรอกรายละเอียด ชี้แจงวัตถุประสงค์ หรือข้อกำหนดในการลงทะเบียน..."
              className="w-full text-sm bg-slate-950/50 border border-white/10 rounded-xl p-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                ข้อความบนปุ่มกดส่ง (Submit Button Text)
              </label>
              <input
                type="text"
                value={formData.settings.submitButtonText || "ส่งข้อมูลลงทะเบียน"}
                onChange={(e) => updateSettings('submitButtonText', e.target.value)}
                className="w-full text-xs bg-slate-950/50 border border-white/10 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                ข้อความหลังลงทะเบียนเสร็จ (Success Title)
              </label>
              <input
                type="text"
                value={formData.settings.successTitle || "ลงทะเบียนสำเร็จเรียบร้อย! 🎉"}
                onChange={(e) => updateSettings('successTitle', e.target.value)}
                className="w-full text-xs bg-slate-950/50 border border-white/10 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Questions List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center space-x-2">
            <h3 className="text-base font-bold text-white">รายการคำถามทั้งหมด</h3>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-white/10">
              {formData.fields.length} ข้อ
            </span>
          </div>
          <button
            onClick={onPreviewClick}
            className="flex items-center space-x-1 text-xs text-indigo-400 hover:text-indigo-300 font-medium"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>พรีวิวแบบฟอร์ม</span>
          </button>
        </div>

        {formData.fields.map((field, index) => {
          const Icon = fieldTypeIcons[field.type] || Type;
          const isSelected = activeFieldId === field.id;

          return (
            <div
              key={field.id}
              onClick={() => setActiveFieldId(field.id)}
              className={`group bg-slate-900/80 rounded-2xl border transition-all duration-200 backdrop-blur-xl ${
                isSelected 
                  ? 'border-indigo-500 ring-2 ring-indigo-500/30 shadow-xl' 
                  : 'border-white/10 hover:border-white/20'
              }`}
            >
              {/* Field Header Bar */}
              <div className="flex items-center justify-between p-4 border-b border-white/5">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <span className="w-6 h-6 rounded-lg bg-white/5 text-slate-400 text-xs font-semibold flex items-center justify-center shrink-0">
                    {index + 1}
                  </span>
                  <div className="flex items-center space-x-2 shrink-0 text-indigo-400">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="font-medium text-sm text-white truncate">
                    {field.label || `คำถามข้อที่ ${index + 1}`}
                  </span>
                  {field.required && (
                    <span className="text-rose-400 text-xs font-bold shrink-0">*จำเป็น</span>
                  )}
                  {field.optionsSource === 'google_sheets' && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0 flex items-center space-x-1">
                      <Database className="w-2.5 h-2.5" />
                      <span>Live Sheets</span>
                    </span>
                  )}
                </div>

                {/* Card Controls */}
                <div className="flex items-center space-x-1 pl-2 shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); moveField(index, -1); }}
                    disabled={index === 0}
                    title="เลื่อนขึ้น"
                    className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 rounded-lg hover:bg-white/5"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); moveField(index, 1); }}
                    disabled={index === formData.fields.length - 1}
                    title="เลื่อนลง"
                    className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 rounded-lg hover:bg-white/5"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); duplicateField(field.id); }}
                    title="ทำซ้ำข้อนี้"
                    className="p-1.5 text-slate-400 hover:text-indigo-400 rounded-lg hover:bg-white/5"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteField(field.id); }}
                    title="ลบข้อนี้"
                    className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Field Expanded Editor */}
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Field Label */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      ข้อความคำถาม (Label)
                    </label>
                    <input
                      type="text"
                      value={field.label}
                      onChange={(e) => updateField(field.id, { label: e.target.value })}
                      placeholder="พิมพ์คำถามของคุณ..."
                      className="w-full text-xs bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* Field Type Selector */}
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      ประเภทคำถาม
                    </label>
                    <select
                      value={field.type}
                      onChange={(e) => {
                        const newType = e.target.value;
                        const updates = { type: newType };
                        if (['radio', 'checkbox', 'dropdown'].includes(newType) && !field.options) {
                          updates.options = ["ตัวเลือกที่ 1", "ตัวเลือกที่ 2", "ตัวเลือกที่ 3"];
                          updates.optionsSource = "manual";
                        }
                        updateField(field.id, updates);
                      }}
                      className="w-full text-xs bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                    >
                      {Object.entries(fieldTypeLabels).map(([key, label]) => (
                        <option key={key} value={key} className="bg-slate-900 text-white">
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Subtitle / Helper Description */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    คำอธิบายเพิ่มเติม (Description / Helper text)
                  </label>
                  <input
                    type="text"
                    value={field.description || ""}
                    onChange={(e) => updateField(field.id, { description: e.target.value })}
                    placeholder="เช่น ระบุรายละเอียดให้ผู้ตอบเข้าใจง่ายขึ้น (ไม่บังคับ)"
                    className="w-full text-xs bg-slate-950 border border-white/10 rounded-xl px-3 py-1.5 text-slate-300 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Options Editor for Choice Fields (Radio, Checkbox, Dropdown) */}
                {['radio', 'checkbox', 'dropdown'].includes(field.type) && (
                  <div className="bg-slate-950/70 p-4 rounded-xl border border-white/5 space-y-3">
                    
                    {/* Source Selector: Manual vs Google Sheets */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-white/5">
                      <span className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                        <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                        <span>แหล่งที่มาของตัวเลือก (Options Source):</span>
                      </span>

                      <div className="inline-flex rounded-lg bg-slate-900 p-0.5 border border-white/10">
                        <button
                          type="button"
                          onClick={() => updateField(field.id, { optionsSource: 'manual' })}
                          className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-all ${
                            field.optionsSource !== 'google_sheets'
                              ? 'bg-indigo-600 text-white shadow-sm'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          พิมพ์ระบุเอง
                        </button>
                        <button
                          type="button"
                          onClick={() => updateField(field.id, { optionsSource: 'google_sheets' })}
                          className={`flex items-center space-x-1 px-2.5 py-1 text-[11px] font-medium rounded-md transition-all ${
                            field.optionsSource === 'google_sheets'
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          <Database className="w-3 h-3" />
                          <span>ดึงสดจาก Google Sheets</span>
                        </button>
                      </div>
                    </div>

                    {/* Google Sheets Dynamic Column Setup */}
                    {field.optionsSource === 'google_sheets' ? (
                      <div className="p-3 bg-emerald-950/30 border border-emerald-500/20 rounded-xl space-y-2">
                        <div className="flex items-center space-x-2 text-xs text-emerald-300 font-medium">
                          <Database className="w-4 h-4 text-emerald-400" />
                          <span>ดึงตัวเลือกอัตโนมัติจากคอลัมน์ใน Google Sheets</span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          ระบุชื่อหัวตาราง หรือระบุคอลัมน์ (เช่น A, B, C หรือ Department) ในชีต ระบบจะนำข้อมูลทุกแถวมาสร้างเป็นตัวเลือกสดให้ทันที
                        </p>
                        <div className="flex items-center space-x-2 pt-1">
                          <input
                            type="text"
                            value={field.sheetColumn || ""}
                            onChange={(e) => updateField(field.id, { sheetColumn: e.target.value })}
                            placeholder="เช่น Department หรือ A"
                            className="flex-1 text-xs bg-slate-900 border border-emerald-500/30 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-emerald-500 font-mono"
                          />
                        </div>
                      </div>
                    ) : (
                      /* Manual Options List */
                      <div className="space-y-2">
                        {(field.options || []).map((opt, optIdx) => (
                          <div key={optIdx} className="flex items-center space-x-2">
                            <span className="w-4 text-center text-xs text-slate-500 font-mono">
                              {optIdx + 1}.
                            </span>
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => updateOptionText(field.id, optIdx, e.target.value)}
                              className="flex-1 text-xs bg-slate-900 border border-white/10 rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500"
                            />
                            <button
                              type="button"
                              onClick={() => deleteOption(field.id, optIdx)}
                              disabled={(field.options || []).length <= 1}
                              className="p-1 text-slate-500 hover:text-rose-400 disabled:opacity-20 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}

                        <button
                          type="button"
                          onClick={() => addOption(field.id)}
                          className="flex items-center space-x-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-medium pt-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>เพิ่มตัวเลือก</span>
                        </button>
                      </div>
                    )}

                  </div>
                )}

                {/* Rating max score editor */}
                {field.type === 'rating' && (
                  <div className="flex items-center space-x-3 text-xs text-slate-300">
                    <span>จำนวนดาวสูงสุด:</span>
                    <select
                      value={field.maxRating || 5}
                      onChange={(e) => updateField(field.id, { maxRating: parseInt(e.target.value, 10) })}
                      className="bg-slate-950 border border-white/10 rounded-lg px-2 py-1 text-white text-xs"
                    >
                      <option value="5">5 ดาว</option>
                      <option value="10">10 ดาว</option>
                    </select>
                  </div>
                )}

                {/* Bottom Bar: Required Toggle */}
                <div className="pt-2 flex items-center justify-between border-t border-white/5">
                  <label className="flex items-center space-x-2 cursor-pointer text-xs text-slate-300 select-none">
                    <input
                      type="checkbox"
                      checked={field.required}
                      onChange={(e) => updateField(field.id, { required: e.target.checked })}
                      className="rounded bg-slate-950 border-white/20 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                    />
                    <span>จำเป็นต้องตอบคำถามข้อนี้ (Required)</span>
                  </label>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Add Question Bar */}
      <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-4 backdrop-blur-xl">
        <span className="text-xs font-semibold text-slate-400 block mb-3 text-center sm:text-left">
          + คลิกเพื่อเพิ่มคำถามประเภทต่างๆ เข้าฟอร์ม:
        </span>
        <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
          <button
            onClick={() => addField('text')}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-white/10 transition-all hover:scale-105"
          >
            <Type className="w-3.5 h-3.5 text-indigo-400" />
            <span>ข้อความสั้น</span>
          </button>

          <button
            onClick={() => addField('textarea')}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-white/10 transition-all hover:scale-105"
          >
            <AlignLeft className="w-3.5 h-3.5 text-purple-400" />
            <span>ข้อความยาว</span>
          </button>

          <button
            onClick={() => addField('radio')}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-white/10 transition-all hover:scale-105"
          >
            <CircleDot className="w-3.5 h-3.5 text-cyan-400" />
            <span>เลือกคำตอบเดียว</span>
          </button>

          <button
            onClick={() => addField('checkbox')}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-white/10 transition-all hover:scale-105"
          >
            <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
            <span>หลายตัวเลือก</span>
          </button>

          <button
            onClick={() => addField('dropdown')}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-white/10 transition-all hover:scale-105"
          >
            <ChevronDown className="w-3.5 h-3.5 text-amber-400" />
            <span>Dropdown</span>
          </button>

          <button
            onClick={() => addField('rating')}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-white/10 transition-all hover:scale-105"
          >
            <Star className="w-3.5 h-3.5 text-yellow-400" />
            <span>ให้คะแนน</span>
          </button>

          <button
            onClick={() => addField('date')}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-white/10 transition-all hover:scale-105"
          >
            <Calendar className="w-3.5 h-3.5 text-rose-400" />
            <span>วันที่</span>
          </button>
        </div>
      </div>

    </div>
  );
}
