import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Save,
  RotateCcw,
  Sparkles,
  Building2,
  UtensilsCrossed,
  PartyPopper,
  Heart,
  Award,
  Star,
  ChevronUp,
  ChevronDown,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Layers,
  Edit2
} from 'lucide-react';
import { defaultSurveyConfig } from '../data/smeFanData';

const AVAILABLE_ICONS = [
  { key: 'Sparkles', label: 'วิบวับ / ดิจิทัล (Sparkles)', icon: Sparkles },
  { key: 'Building2', label: 'สถานที่ / อาคาร (Building2)', icon: Building2 },
  { key: 'UtensilsCrossed', label: 'อาหาร / บุฟเฟ่ต์ (UtensilsCrossed)', icon: UtensilsCrossed },
  { key: 'PartyPopper', label: 'ปาร์ตี้ / กิจกรรม (PartyPopper)', icon: PartyPopper },
  { key: 'Heart', label: 'หัวใจ / การบริการ (Heart)', icon: Heart },
  { key: 'Award', label: 'รางวัล / มาตรฐาน (Award)', icon: Award },
  { key: 'Star', label: 'ดาว / ความพึงพอใจ (Star)', icon: Star }
];

export default function AdminSurveyManagerModal({
  isOpen,
  onClose,
  surveyConfig,
  onSaveConfig
}) {
  const [config, setConfig] = useState(() => {
    if (surveyConfig && Array.isArray(surveyConfig.categories) && surveyConfig.categories.length > 0) {
      return JSON.parse(JSON.stringify(surveyConfig));
    }
    return JSON.parse(JSON.stringify(defaultSurveyConfig));
  });

  const [activeCatIndex, setActiveCatIndex] = useState(0);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (surveyConfig && Array.isArray(surveyConfig.categories) && surveyConfig.categories.length > 0) {
        setConfig(JSON.parse(JSON.stringify(surveyConfig)));
      } else {
        setConfig(JSON.parse(JSON.stringify(defaultSurveyConfig)));
      }
      setActiveCatIndex(0);
      setSaveSuccess(false);
    }
  }, [isOpen, surveyConfig]);

  if (!isOpen) return null;

  const categories = config.categories || [];
  const activeCategory = categories[activeCatIndex] || categories[0];

  // Save changes
  const handleSave = () => {
    // Validation: Ensure at least one category and each has questions
    if (categories.length === 0) {
      alert("กรุณาเพิ่มหัวข้อการประเมินอย่างน้อย 1 หัวข้อครับ");
      return;
    }
    for (let i = 0; i < categories.length; i++) {
      if (!categories[i].title.trim()) {
        alert(`หัวข้อที่ ${i + 1} ยังไม่ได้ใส่ชื่อหัวข้อครับ`);
        return;
      }
      if (!categories[i].questions || categories[i].questions.length === 0) {
        alert(`หัวข้อ "${categories[i].title}" ต้องมีข้อคำถามย่อยอย่างน้อย 1 ข้อครับ`);
        return;
      }
    }

    if (onSaveConfig) {
      onSaveConfig(config);
    }
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 700);
  };

  // Reset to default
  const handleResetToDefault = () => {
    if (window.confirm("ต้องการรีเซ็ตแบบสอบถามทั้งหมดกลับเป็นค่ามาตรฐาน (5 ด้าน 20 ข้อย่อย) หรือไม่?\nข้อความที่แก้ไขไว้จะถูกแทนที่ด้วยค่าตั้งต้น")) {
      setConfig(JSON.parse(JSON.stringify(defaultSurveyConfig)));
      setActiveCatIndex(0);
    }
  };

  // Category Actions
  const handleAddCategory = () => {
    const newId = `cat_${Date.now()}`;
    const newCategory = {
      id: newId,
      title: `ด้านที่ ${categories.length + 1}: หัวข้อใหม่`,
      subtitle: "",
      icon: "Award",
      commentPlaceholder: "พิมพ์ข้อเสนอแนะเพิ่มเติมในส่วนนี้...",
      questions: [
        {
          id: `${newId}_q1`,
          label: "ความพึงพอใจในส่วนนี้",
          desc: "คำอธิบายเกณฑ์การประเมิน..."
        }
      ]
    };
    setConfig(prev => ({
      ...prev,
      categories: [...prev.categories, newCategory]
    }));
    setActiveCatIndex(categories.length);
  };

  const handleDeleteCategory = (catIdx) => {
    if (categories.length <= 1) {
      alert("ไม่สามารถลบได้ ต้องมีอย่างน้อย 1 หัวข้อการประเมินครับ");
      return;
    }
    const target = categories[catIdx];
    if (window.confirm(`ต้องการลบหัวข้อ "${target.title}" และข้อคำถามย่อยทั้งหมดในหัวข้อนี้หรือไม่?`)) {
      const updated = categories.filter((_, i) => i !== catIdx);
      setConfig(prev => ({ ...prev, categories: updated }));
      setActiveCatIndex(Math.max(0, catIdx - 1));
    }
  };

  const handleMoveCategory = (fromIdx, direction) => {
    const toIdx = fromIdx + direction;
    if (toIdx < 0 || toIdx >= categories.length) return;
    const newCategories = [...categories];
    const temp = newCategories[fromIdx];
    newCategories[fromIdx] = newCategories[toIdx];
    newCategories[toIdx] = temp;
    setConfig(prev => ({ ...prev, categories: newCategories }));
    setActiveCatIndex(toIdx);
  };

  const handleUpdateCategoryField = (catIdx, field, value) => {
    setConfig(prev => {
      const updated = [...prev.categories];
      updated[catIdx] = { ...updated[catIdx], [field]: value };
      return { ...prev, categories: updated };
    });
  };

  // Question Actions within active category
  const handleAddQuestion = (catIdx) => {
    const targetCat = categories[catIdx];
    const newQId = `${targetCat.id}_q_${Date.now()}`;
    const newQuestion = {
      id: newQId,
      label: `ข้อที่ ${(targetCat.questions?.length || 0) + 1}`,
      desc: "รายละเอียดการประเมิน..."
    };
    setConfig(prev => {
      const updated = [...prev.categories];
      updated[catIdx] = {
        ...updated[catIdx],
        questions: [...(updated[catIdx].questions || []), newQuestion]
      };
      return { ...prev, categories: updated };
    });
  };

  const handleDeleteQuestion = (catIdx, qIdx) => {
    const targetCat = categories[catIdx];
    if ((targetCat.questions?.length || 0) <= 1) {
      alert("ในแต่ละหัวข้อต้องมีข้อคำถามอย่างน้อย 1 ข้อครับ");
      return;
    }
    if (window.confirm(`ต้องการลบข้อคำถาม "${targetCat.questions[qIdx].label}" หรือไม่?`)) {
      setConfig(prev => {
        const updated = [...prev.categories];
        updated[catIdx] = {
          ...updated[catIdx],
          questions: updated[catIdx].questions.filter((_, i) => i !== qIdx)
        };
        return { ...prev, categories: updated };
      });
    }
  };

  const handleMoveQuestion = (catIdx, qIdx, direction) => {
    const targetCat = categories[catIdx];
    const toIdx = qIdx + direction;
    if (toIdx < 0 || toIdx >= (targetCat.questions?.length || 0)) return;
    setConfig(prev => {
      const updated = [...prev.categories];
      const questions = [...updated[catIdx].questions];
      const temp = questions[qIdx];
      questions[qIdx] = questions[toIdx];
      questions[toIdx] = temp;
      updated[catIdx] = { ...updated[catIdx], questions };
      return { ...prev, categories: updated };
    });
  };

  const handleUpdateQuestionField = (catIdx, qIdx, field, value) => {
    setConfig(prev => {
      const updated = [...prev.categories];
      const questions = [...updated[catIdx].questions];
      questions[qIdx] = { ...questions[qIdx], [field]: value };
      updated[catIdx] = { ...updated[catIdx], questions };
      return { ...prev, categories: updated };
    });
  };

  const totalQuestions = categories.reduce((sum, c) => sum + (c.questions?.length || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md overflow-hidden animate-fadeIn">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-amber-500/30 rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-amber-500/20 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-black text-white">
                  จัดการและออกแบบแบบสอบถาม (Survey Builder)
                </h2>
                <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                  {categories.length} ด้าน ({totalQuestions} ข้อย่อย)
                </span>
              </div>
              <p className="text-xs text-slate-400">
                เพิ่ม/แก้ไข/ลบหัวข้อใหญ่ และข้อคำถามย่อย พร้อมกำหนดข้อความกล่องเสนอแนะ
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleResetToDefault}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold flex items-center space-x-1.5 border border-white/10 transition-all cursor-pointer"
              title="คืนค่าแบบประเมินตั้งต้น 5 ด้าน 20 ข้อย่อย"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">คืนค่ามาตรฐาน</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body: Two columns layout */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* Left Sidebar: Categories Navigation & Management */}
          <div className="w-full md:w-80 bg-slate-950/80 border-b md:border-b-0 md:border-r border-white/10 flex flex-col shrink-0 overflow-y-auto">
            <div className="p-3.5 border-b border-white/5 flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                หัวข้อการประเมิน ({categories.length})
              </span>
              <button
                type="button"
                onClick={handleAddCategory}
                className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold flex items-center space-x-1 transition-all cursor-pointer shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>เพิ่มหัวข้อ</span>
              </button>
            </div>

            <div className="p-2 space-y-1.5 flex-1 overflow-y-auto">
              {categories.map((cat, idx) => {
                const isActive = idx === activeCatIndex;
                return (
                  <div
                    key={cat.id || idx}
                    onClick={() => setActiveCatIndex(idx)}
                    className={`group p-3 rounded-2xl cursor-pointer transition-all border flex items-center justify-between gap-2 ${
                      isActive
                        ? "bg-amber-500/15 border-amber-500/40 text-amber-200 shadow-md"
                        : "bg-slate-900/60 hover:bg-slate-800/60 border-white/5 text-slate-300"
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                      <div className={`w-7 h-7 rounded-xl flex items-center justify-center font-mono font-black text-xs shrink-0 ${
                        isActive ? "bg-amber-500 text-slate-950" : "bg-slate-800 text-slate-400"
                      }`}>
                        {idx + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className={`text-xs font-bold truncate ${isActive ? "text-amber-300" : "text-white"}`}>
                          {cat.title || `หัวข้อที่ ${idx + 1}`}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {cat.questions?.length || 0} ข้อย่อย • {cat.subtitle || 'ไม่มีคำอธิบายเสริม'}
                        </div>
                      </div>
                    </div>

                    {/* Move and delete controls */}
                    <div className="flex items-center space-x-1 shrink-0 opacity-80 group-hover:opacity-100" onClick={e => e.stopPropagation()}>
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveCategory(idx, -1)}
                        className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white disabled:opacity-20 cursor-pointer"
                        title="เลื่อนขึ้น"
                      >
                        <ChevronUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === categories.length - 1}
                        onClick={() => handleMoveCategory(idx, 1)}
                        className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white disabled:opacity-20 cursor-pointer"
                        title="เลื่อนลง"
                      >
                        <ChevronDown className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(idx)}
                        className="p-1 rounded hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 cursor-pointer"
                        title="ลบหัวข้อนี้"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Main Area: Edit Active Category & Its Questions */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            {activeCategory ? (
              <div className="space-y-6">
                
                {/* Active Category Meta Settings */}
                <div className="bg-slate-950/60 p-4 sm:p-5 rounded-2xl border border-white/10 space-y-4">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div className="flex items-center space-x-2">
                      <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 font-mono text-xs font-black flex items-center justify-center">
                        {activeCatIndex + 1}
                      </span>
                      <h3 className="text-sm font-extrabold text-white">
                        ข้อมูลหัวข้อหลัก (ด้านที่ {activeCatIndex + 1})
                      </h3>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">
                      ID: {activeCategory.id}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Category Title */}
                    <div className="sm:col-span-2 space-y-1.5">
                      <label className="text-xs font-bold text-slate-300 flex items-center space-x-1">
                        <span>ชื่อหัวข้อหลัก</span>
                        <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={activeCategory.title || ""}
                        onChange={e => handleUpdateCategoryField(activeCatIndex, "title", e.target.value)}
                        placeholder="เช่น ด้านที่ 1: ด้านระบบลงทะเบียน"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs font-medium focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                      />
                    </div>

                    {/* Subtitle / Venue Tag */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-300">
                        คำอธิบายเสริม / วงเล็บ (Subtitle)
                      </label>
                      <input
                        type="text"
                        value={activeCategory.subtitle || ""}
                        onChange={e => handleUpdateCategoryField(activeCatIndex, "subtitle", e.target.value)}
                        placeholder="เช่น (โรงแรมบุรีศรีภู), (บุฟเฟ่ต์)"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs font-medium focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                      />
                    </div>

                    {/* Icon Selection */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-300">
                        ไอคอนประจำหัวข้อ
                      </label>
                      <select
                        value={activeCategory.icon || "Award"}
                        onChange={e => handleUpdateCategoryField(activeCatIndex, "icon", e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs font-medium focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 cursor-pointer"
                      >
                        {AVAILABLE_ICONS.map(ic => (
                          <option key={ic.key} value={ic.key} className="bg-slate-900 text-white">
                            {ic.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Comment Placeholder */}
                    <div className="sm:col-span-2 space-y-1.5">
                      <label className="text-xs font-bold text-slate-300">
                        ข้อความแนะนำในกล่องความคิดเห็น (Comment Placeholder)
                      </label>
                      <input
                        type="text"
                        value={activeCategory.commentPlaceholder || ""}
                        onChange={e => handleUpdateCategoryField(activeCatIndex, "commentPlaceholder", e.target.value)}
                        placeholder="เช่น พิมพ์ข้อเสนอแนะเกี่ยวกับอาหารและเครื่องดื่ม..."
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs font-medium focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                      />
                    </div>
                  </div>
                </div>

                {/* Sub-questions section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-extrabold text-white flex items-center space-x-2">
                        <span>ข้อคำถามย่อย (มาตรวัด 5 ระดับ)</span>
                        <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-white/10">
                          {activeCategory.questions?.length || 0} ข้อ
                        </span>
                      </h4>
                      <p className="text-xs text-slate-400">
                        คะแนน 1-5 (1 = ไม่พอใจเลย ถึง 5 = พอใจมากที่สุด)
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAddQuestion(activeCatIndex)}
                      className="px-3 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold flex items-center space-x-1.5 border border-amber-500/30 transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>เพิ่มข้อย่อย</span>
                    </button>
                  </div>

                  <div className="space-y-3">
                    {(activeCategory.questions || []).map((q, qIdx) => (
                      <div
                        key={q.id || qIdx}
                        className="p-4 rounded-2xl bg-slate-950/60 border border-white/10 space-y-3 group hover:border-amber-500/30 transition-all"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center space-x-2 min-w-0">
                            <span className="font-mono font-extrabold text-amber-400 text-xs px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                              {activeCatIndex + 1}.{qIdx + 1}
                            </span>
                            <span className="text-xs font-bold text-slate-200 truncate">
                              {q.label || `คำถามข้อที่ ${qIdx + 1}`}
                            </span>
                          </div>

                          <div className="flex items-center space-x-1 shrink-0">
                            <button
                              type="button"
                              disabled={qIdx === 0}
                              onClick={() => handleMoveQuestion(activeCatIndex, qIdx, -1)}
                              className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white disabled:opacity-20 cursor-pointer"
                              title="เลื่อนขึ้น"
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={qIdx === (activeCategory.questions?.length || 0) - 1}
                              onClick={() => handleMoveQuestion(activeCatIndex, qIdx, 1)}
                              className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white disabled:opacity-20 cursor-pointer"
                              title="เลื่อนลง"
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteQuestion(activeCatIndex, qIdx)}
                              className="p-1 rounded hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 cursor-pointer"
                              title="ลบคำถามนี้"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-slate-400">
                              หัวข้อคำถาม (Label)
                            </label>
                            <input
                              type="text"
                              value={q.label || ""}
                              onChange={e => handleUpdateQuestionField(activeCatIndex, qIdx, "label", e.target.value)}
                              placeholder="เช่น ความทันสมัยของระบบ"
                              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs font-medium focus:outline-none focus:border-amber-400"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-slate-400">
                              คำอธิบายขยายความ (Description)
                            </label>
                            <input
                              type="text"
                              value={q.desc || ""}
                              onChange={e => handleUpdateQuestionField(activeCatIndex, qIdx, "desc", e.target.value)}
                              placeholder="เช่น การยืนยันตัวตนรวดเร็ว ไม่แออัด..."
                              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-slate-300 text-xs font-medium focus:outline-none focus:border-amber-400"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            ) : (
              <div className="py-16 text-center text-slate-500">
                <AlertCircle className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                <p>กรุณาเลือกหรือเพิ่มหัวข้อการประเมินจากเมนูด้านซ้าย</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-950 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <HelpCircle className="w-4 h-4 text-amber-400" />
            <span>
              เมื่อกดบันทึก แบบฟอร์มประเมินในหน้าแอปของสมาชิกและหน้าสรุปผลจะอัปเดตตามโครงสร้างใหม่ทันที
            </span>
          </div>

          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center space-x-2 cursor-pointer"
            >
              {saveSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-slate-950" />
                  <span>บันทึกสำเร็จ!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>บันทึกการตั้งค่าแบบสอบถาม</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
