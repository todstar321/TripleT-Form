import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Star, 
  Send, 
  CheckCircle2, 
  Sparkles, 
  MessageSquare, 
  Heart, 
  Award, 
  Building2, 
  UtensilsCrossed, 
  PartyPopper,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Check,
  RotateCcw,
  Sliders,
  HelpCircle,
  Eye,
  Lock
} from 'lucide-react';
import { defaultSurveyConfig } from '../data/smeFanData';

export const SURVEY_STORAGE_KEY = "sme_fan_survey_responses_v1";

const ICON_MAP = {
  Sparkles: Sparkles,
  Building2: Building2,
  UtensilsCrossed: UtensilsCrossed,
  PartyPopper: PartyPopper,
  Heart: Heart,
  Award: Award,
  Star: Star
};

const DUMMY_PREVIEW_ATTENDEE = {
  name: "ผู้ดูแลระบบ (โหมดทดสอบ)",
  nickname: "แอดมิน",
  club: "ทดสอบระบบ",
  ticketNo: "PREVIEW-2026",
  phone: "080-000-0000"
};

export default function SatisfactionSurveyModal({
  isOpen,
  onClose,
  attendee,
  surveyConfig,
  onSaveSurvey,
  isPreviewMode = false
}) {
  // Use passed surveyConfig or fallback to default
  const activeConfig = useMemo(() => {
    return surveyConfig && Array.isArray(surveyConfig.categories) && surveyConfig.categories.length > 0
      ? surveyConfig
      : defaultSurveyConfig;
  }, [surveyConfig]);

  const categories = activeConfig.categories || [];

  const activeAttendee = attendee || (isPreviewMode ? DUMMY_PREVIEW_ATTENDEE : null);

  // Step state: 0 to categories.length (categories.length = final review/submit step)
  const [currentStep, setCurrentStep] = useState(0);

  // Scores map: { [questionId]: score (1..5) }
  const [scores, setScores] = useState({});

  // Comments map per category: { [categoryId]: string }
  const [categoryComments, setCategoryComments] = useState({});

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [existingResponse, setExistingResponse] = useState(null);
  const [shakingQuestionIds, setShakingQuestionIds] = useState([]);

  const getDraftKey = (att, isPreview) => {
    if (isPreview) return "triple_t_survey_draft_preview";
    const id = att?.ticketNo || att?.phone || "attendee";
    return `triple_t_survey_draft_${id}`;
  };

  // Initialize or load existing response when opened
  useEffect(() => {
    if (!isOpen) return;
    if (!activeAttendee) return;

    // 1. Check if attendee already submitted in real mode
    if (!isPreviewMode) {
      try {
        const saved = localStorage.getItem(SURVEY_STORAGE_KEY);
        if (saved) {
          const list = JSON.parse(saved);
          const found = list.find(r => 
            (activeAttendee.ticketNo && r.ticketNo === activeAttendee.ticketNo) ||
            (activeAttendee.phone && r.phone === activeAttendee.phone)
          );
          if (found) {
            setExistingResponse(found);
            setScores(found.scores || found.ratings || {});
            setCategoryComments(found.categoryComments || (found.comment ? { [categories[0]?.id || 'cat_reg']: found.comment } : {}));
            setIsSubmitted(true);
            return;
          }
        }
      } catch (e) {
        console.warn("Could not read survey responses:", e);
      }
    }

    // 2. If not submitted, restore draft if exists (so accidental close doesn't lose data)
    setExistingResponse(null);
    setIsSubmitted(false);
    setError("");

    try {
      const draftKey = getDraftKey(activeAttendee, isPreviewMode);
      const draftStr = localStorage.getItem(draftKey);
      if (draftStr) {
        const draft = JSON.parse(draftStr);
        if (draft.scores && Object.keys(draft.scores).length > 0) {
          setScores(draft.scores || {});
          setCategoryComments(draft.categoryComments || {});
          setCurrentStep(draft.currentStep !== undefined ? draft.currentStep : 0);
          return;
        }
      }
    } catch (e) {}

    // Default if no draft:
    setCurrentStep(0);
    setScores({});
    setCategoryComments({});
  }, [isOpen, activeAttendee?.ticketNo, activeAttendee?.phone, isPreviewMode]);

  // 3. Auto-save draft on every score / comment / step change
  useEffect(() => {
    if (!isOpen || isSubmitted || !activeAttendee) return;
    try {
      const draftKey = getDraftKey(activeAttendee, isPreviewMode);
      localStorage.setItem(draftKey, JSON.stringify({
        scores,
        categoryComments,
        currentStep,
        updatedAt: Date.now()
      }));
    } catch (e) {}
  }, [scores, categoryComments, currentStep, isOpen, isSubmitted, activeAttendee, isPreviewMode]);

  // Current category data
  const currentCategory = categories[currentStep] || null;
  const isReviewStep = currentStep === categories.length;

  // Real-time calculation: Category Average Score
  const currentCategoryStats = useMemo(() => {
    if (!currentCategory) return { answered: 0, total: 0, avg: "0.0" };
    const qList = currentCategory.questions || [];
    let sum = 0;
    let count = 0;
    qList.forEach(q => {
      const val = scores[q.id];
      if (val && val >= 1 && val <= 5) {
        sum += val;
        count++;
      }
    });
    return {
      answered: count,
      total: qList.length,
      avg: count > 0 ? (sum / count).toFixed(2) : "0.0"
    };
  }, [currentCategory, scores]);

  // Real-time calculation: Overall Live Score across ALL questions
  const overallLiveStats = useMemo(() => {
    let sum = 0;
    let count = 0;
    let totalQuestions = 0;

    categories.forEach(cat => {
      (cat.questions || []).forEach(q => {
        totalQuestions++;
        const val = scores[q.id];
        if (val && val >= 1 && val <= 5) {
          sum += val;
          count++;
        }
      });
    });

    return {
      answered: count,
      totalQuestions,
      overallAvg: count > 0 ? (sum / count).toFixed(2) : "0.0",
      percent: totalQuestions > 0 ? Math.round((count / totalQuestions) * 100) : 0
    };
  }, [categories, scores]);

  // Check category completion
  const isCategoryComplete = (cat) => {
    if (!cat || !cat.questions) return false;
    return cat.questions.every(q => scores[q.id] && scores[q.id] >= 1);
  };

  const getCategoryAvg = (cat) => {
    if (!cat || !cat.questions) return "0.0";
    let sum = 0;
    let count = 0;
    cat.questions.forEach(q => {
      const val = scores[q.id];
      if (val && val >= 1) {
        sum += val;
        count++;
      }
    });
    return count > 0 ? (sum / count).toFixed(2) : "0.0";
  };

  if (!isOpen || !activeAttendee) return null;

  const handleScoreClick = (questionId, score) => {
    setScores(prev => ({
      ...prev,
      [questionId]: score
    }));
    setError("");
    setShakingQuestionIds(prev => prev.filter(id => id !== questionId));
  };

  const handleNext = () => {
    // Validate that all questions in current category are answered
    if (currentCategory) {
      const unAnsweredList = (currentCategory.questions || []).filter(q => !scores[q.id]);
      if (unAnsweredList.length > 0) {
        const unAnsweredIds = unAnsweredList.map(q => q.id);
        setShakingQuestionIds(unAnsweredIds);
        setError(`⚠️ ยังลงคะแนนไม่ครบ: กรุณาลงคะแนนข้อที่มีกรอบเตือนสีแดง (เหลืออีก ${unAnsweredList.length} ข้อในหมวดนี้) ให้ครบก่อนดำเนินการต่อครับ`);
        setTimeout(() => setShakingQuestionIds([]), 1200);
        const firstEl = document.getElementById(`q_card_${unAnsweredIds[0]}`);
        if (firstEl) firstEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
    }
    setError("");
    setCurrentStep(prev => Math.min(categories.length, prev + 1));
  };

  const handleBack = () => {
    setError("");
    setCurrentStep(prev => Math.max(0, prev - 1));
  };

  const handleSubmit = (e) => {
    if (e) e.preventDefault();

    // Final full validation: ALL questions across ALL categories must be answered
    for (let cIdx = 0; cIdx < categories.length; cIdx++) {
      const cat = categories[cIdx];
      const missing = (cat.questions || []).filter(q => !scores[q.id]);
      if (missing.length > 0) {
        setCurrentStep(cIdx);
        const missingIds = missing.map(q => q.id);
        setShakingQuestionIds(missingIds);
        setError(`❌ ยังลงคะแนนไม่ครบ: หมวด "${cat.title}" ยังเหลืออีก ${missing.length} ข้อที่ยังไม่ได้ลงคะแนน กรุณาให้คะแนนครบทุกข้อย่อยก่อนส่งครับ`);
        setTimeout(() => setShakingQuestionIds([]), 1200);
        setTimeout(() => {
          const firstEl = document.getElementById(`q_card_${missingIds[0]}`);
          if (firstEl) firstEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
        return;
      }
    }

    // Build category averages map
    const catAverages = {};
    categories.forEach(cat => {
      catAverages[cat.id] = getCategoryAvg(cat);
    });

    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const timeWithSec = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())} น.`;
    const dateFormatted = now.toLocaleDateString('th-TH', { 
      year: 'numeric', month: 'short', day: 'numeric' 
    });
    const fullDisplayTime = `${dateFormatted} เวลา ${timeWithSec}`;

    const newResponse = {
      id: existingResponse?.id || `survey_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      ticketNo: activeAttendee.ticketNo,
      name: activeAttendee.name,
      nickname: activeAttendee.nickname || "",
      phone: activeAttendee.phone,
      club: activeAttendee.club || "",
      scores: { ...scores },
      ratings: { ...scores }, // backward compatibility
      categoryAverages: catAverages,
      categoryComments: { ...categoryComments },
      overallAverage: Number(overallLiveStats.overallAvg),
      submittedAt: now.toISOString(),
      displayTime: fullDisplayTime
    };

    if (isPreviewMode) {
      alert(`[โหมดทดสอบแบบสอบถาม]\n\n🎉 คุณได้ทดสอบให้คะแนนครบทั้ง ${overallLiveStats.totalQuestions} ข้อย่อยเรียบร้อยแล้ว!\nคะแนนเฉลี่ยรวมที่ทดลองประเมิน: ${overallLiveStats.overallAvg} / 5.0 ⭐\nเวลาที่บันทึก: ${fullDisplayTime}\n\n⚠️ ในโหมดทดสอบนี้ จะไม่มีการบันทึกคะแนนใดๆ ลงในระบบจริง เพื่อป้องกันไม่ให้ข้อมูลปนเปื้อนครับ`);
      setExistingResponse(newResponse);
      setIsSubmitted(true);
      return;
    }

    try {
      const saved = localStorage.getItem(SURVEY_STORAGE_KEY);
      let list = saved ? JSON.parse(saved) : [];
      const existingIdx = list.findIndex(r => 
        (activeAttendee.ticketNo && r.ticketNo === activeAttendee.ticketNo) ||
        (activeAttendee.phone && r.phone === activeAttendee.phone)
      );
      if (existingIdx >= 0) {
        list[existingIdx] = newResponse;
      } else {
        list.push(newResponse);
      }
      localStorage.setItem(SURVEY_STORAGE_KEY, JSON.stringify(list));
      window.dispatchEvent(new Event("triple_t_survey_updated"));

      // Clear draft once successfully submitted
      try {
        localStorage.removeItem(getDraftKey(activeAttendee, false));
      } catch (e) {}
    } catch (err) {
      console.error("Failed to save survey to localStorage:", err);
    }

    if (onSaveSurvey) {
      try {
        onSaveSurvey(newResponse);
      } catch (err) {}
    }

    setIsSubmitted(true);
    setExistingResponse(newResponse);
  };

  const getScoreBadgeText = (score) => {
    switch (score) {
      case 5: return "พอใจมากที่สุด 🌟";
      case 4: return "พอใจมาก 👍";
      case 3: return "ปานกลาง 🙂";
      case 2: return "ไม่พอใจ 😐";
      case 1: return "ไม่พอใจเลย ⚠️";
      default: return "ยังไม่ได้เลือก";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-amber-500/40 rounded-3xl p-4 sm:p-6 text-slate-100 shadow-2xl space-y-4 max-h-[94vh] overflow-y-auto">
        
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
          title="ปิดหน้าต่าง"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-3 border-b border-white/10 pb-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500/25 via-yellow-400/20 to-emerald-500/25 border border-amber-500/40 text-amber-300 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-amber-400" />
          </div>
          <div className="min-w-0 pr-6">
            <h3 className="text-base sm:text-lg font-extrabold text-white truncate">
              {activeConfig.title || "แบบประเมินความพึงพอใจการจัดงาน"}
            </h3>
            <p className="text-xs text-amber-300/90 font-medium">
              {activeConfig.subtitle || "งานสังสรรค์ปีใหม่ SME FAN (โรงแรมบุรีศรีภู)"}
            </p>
          </div>
        </div>

        {/* ==================================================== */}
        {/* SUCCESS / VIEW SUBMITTED RECORD SCREEN (READ ONLY)   */}
        {/* ==================================================== */}
        {isSubmitted && existingResponse ? (
          <div className="py-4 text-center space-y-4 animate-fadeIn">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xl font-extrabold text-white">
                บันทึกแบบประเมินความพึงพอใจเรียบร้อยแล้ว 🎉
              </h4>
              <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                ขอขอบพระคุณเป็นอย่างยิ่งที่ร่วมส่งความคิดเห็น ทุกคะแนนและข้อเสนอแนะมีคุณค่าต่อการพัฒนาการจัดกิจกรรม SME FAN ในครั้งต่อไปครับ
              </p>
              <div className="pt-1">
                <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-950 border border-emerald-500/30 text-[11px] text-emerald-300 font-mono">
                  <span>⏱️ บันทึกเวลา:</span>
                  <span className="font-bold">{existingResponse.displayTime || existingResponse.submittedAt}</span>
                </span>
              </div>
            </div>

            {/* Score Summary Box */}
            <div className="bg-slate-950/80 p-4 rounded-2xl border border-white/10 space-y-3 text-xs text-left max-w-lg mx-auto">
              <div className="flex justify-between items-center pb-2 border-b border-white/10">
                <span className="text-slate-400 font-bold">ผู้ประเมิน:</span>
                <span className="font-extrabold text-white">
                  {activeAttendee.name} {activeAttendee.nickname ? `(${activeAttendee.nickname})` : ''} ({activeAttendee.ticketNo})
                </span>
              </div>

              {/* Overall Score Banner */}
              <div className="p-3 rounded-xl bg-gradient-to-r from-amber-500/20 via-yellow-400/10 to-amber-500/20 border border-amber-500/30 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-amber-300 uppercase tracking-wider font-bold block">
                    คะแนนเฉลี่ยรวมทั้งงานของคุณ
                  </span>
                  <span className="text-xs text-slate-300">
                    {Number(existingResponse.overallAverage || overallLiveStats.overallAvg) >= 4.5 ? "ระดับยอดเยี่ยมมาก 🌟" : "ระดับดีมาก 👍"}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xl sm:text-2xl font-black text-amber-400 font-mono">
                    {existingResponse.overallAverage || overallLiveStats.overallAvg}
                  </span>
                  <span className="text-xs text-amber-300"> / 5.0 ⭐</span>
                </div>
              </div>

              {/* Category Breakdown */}
              <div className="space-y-2 pt-1">
                {categories.map((cat, idx) => {
                  const catAvg = existingResponse.categoryAverages?.[cat.id] || getCategoryAvg(cat);
                  const catComment = (existingResponse.categoryComments || {})[cat.id];
                  return (
                    <div key={cat.id} className="p-2.5 rounded-xl bg-white/5 border border-white/5 space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-200">{cat.title}</span>
                        <div className="flex items-center space-x-1 font-mono font-bold text-amber-400">
                          <span>{catAvg}</span>
                          <span>⭐</span>
                        </div>
                      </div>
                      {catComment && (
                        <div className="text-[11px] text-slate-300 italic bg-black/30 p-2 rounded-lg">
                          "{catComment}"
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Read-Only Notice - Locked once submitted */}
            <div className="p-2.5 rounded-xl bg-slate-900 border border-white/10 text-slate-400 text-xs flex items-center justify-center space-x-2 max-w-sm mx-auto">
              <Lock className="w-4 h-4 text-amber-400 shrink-0" />
              <span>ข้อมูลถูกบันทึกสมบูรณ์แล้ว ไม่สามารถแก้ไขได้</span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-center gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="px-8 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-extrabold shadow-lg shadow-amber-500/25 transition-all cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        ) : (
          /* ==================================================== */
          /* MULTI-STEP WIZARD (STEP 1 - 5 + REVIEW STEP)         */
          /* ==================================================== */
          <div className="space-y-4">
            
            {/* Inline Shake Animation CSS */}
            <style>{`
              @keyframes surveyShake {
                0%, 100% { transform: translateX(0); }
                15%, 45%, 75% { transform: translateX(-6px); }
                30%, 60%, 90% { transform: translateX(6px); }
              }
              .survey-shake {
                animation: surveyShake 0.5s ease-in-out;
              }
            `}</style>

            {/* ==================================================== */}
            {/* UNIFIED MASTER CONTAINER: TOP EVALUATOR + CATEGORIES */}
            {/* ==================================================== */}
            <div className="p-3 sm:p-4 rounded-2xl bg-slate-950/80 border border-amber-500/30 shadow-lg space-y-2.5">
              
              {/* ส่วนที่ 1 (ด้านบน): ข้อมูลผู้ประเมิน + คะแนนเฉลี่ยรวมทุกหัวข้อ (ขนาดกะทัดรัด แถบเดียวกัน ไม่กินที่จอมือถือ) */}
              <div className="p-2 sm:p-2.5 rounded-xl bg-gradient-to-r from-amber-500/15 via-yellow-400/10 to-amber-500/15 border border-amber-500/25 flex flex-wrap items-center justify-between gap-2">
                {/* ข้อมูลผู้ประเมิน */}
                <div className="flex items-center space-x-1.5 min-w-0">
                  <span className="text-amber-400 text-xs shrink-0">👤 ผู้ประเมิน:</span>
                  <span className="font-bold text-white text-xs sm:text-sm truncate">
                    {activeAttendee.name} {activeAttendee.nickname ? `(${activeAttendee.nickname})` : ''}
                  </span>
                  {activeAttendee.ticketNo && (
                    <span className="text-amber-300 font-mono text-[10px] bg-slate-900/80 px-1.5 py-0.5 rounded border border-white/10 shrink-0">
                      #{activeAttendee.ticketNo}
                    </span>
                  )}
                </div>

                {/* คะแนนเฉลี่ยรวมสด & จำนวนข้อที่ตอบแล้ว */}
                <div className="flex items-center space-x-2 shrink-0">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-300 block leading-tight">คะแนนเฉลี่ยรวมทุกหัวข้อ</span>
                    <div className="text-sm sm:text-base font-black text-amber-400 font-mono leading-none">
                      {overallLiveStats.overallAvg} <span className="text-[10px] font-bold text-amber-300">/ 5.0 ⭐</span>
                    </div>
                  </div>
                  <div className="pl-2 border-l border-white/10 text-right">
                    <span className="text-[10px] text-slate-400 block leading-tight">ตอบแล้ว</span>
                    <span className="text-xs font-mono font-bold text-emerald-400">
                      {overallLiveStats.answered}/{overallLiveStats.totalQuestions} ({overallLiveStats.percent}%)
                    </span>
                  </div>
                </div>
              </div>

              {/* ส่วนที่ 2 (ด้านล่าง ในกรอบเดียวกัน): 📋 หัวข้อการประเมิน (คลิกเลือกหมวด) */}
              <div className="space-y-1 pt-0.5">
                <div className="flex items-center justify-between px-1 pb-0.5">
                  <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider">
                    📋 หัวข้อการประเมิน (คลิกเลือกหมวด)
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    ครบ {categories.filter(c => isCategoryComplete(c)).length}/{categories.length} หมวด
                  </span>
                </div>

                {/* รายการหมวด 1-5 */}
                <div className="space-y-1">
                  {categories.map((cat, idx) => {
                    const isActive = idx === currentStep;
                    const catQuestions = cat.questions || [];
                    const answeredCount = catQuestions.filter(q => scores[q.id] && scores[q.id] >= 1).length;
                    const remainingCount = catQuestions.length - answeredCount;
                    const isDone = remainingCount === 0 && catQuestions.length > 0;
                    const catScore = getCategoryAvg(cat);
                    const catTitle = cat.title || cat.label || `หมวดที่ ${idx + 1}`;

                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setError("");
                          setCurrentStep(idx);
                        }}
                        className={`w-full px-2.5 py-1.5 rounded-xl text-left transition-all flex items-center justify-between text-xs border cursor-pointer ${
                          isActive
                            ? "bg-amber-500/20 text-white border-amber-500/60 ring-1 ring-amber-400/40 shadow-sm"
                            : isDone
                              ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/25 hover:bg-emerald-500/15"
                              : "bg-white/5 text-slate-300 border-white/5 hover:bg-white/10 hover:text-white"
                        }`}
                        title={`คลิกเพื่อไปที่ ${catTitle}`}
                      >
                        <div className="flex items-center space-x-2 min-w-0 pr-1">
                          <span className={`w-4 h-4 rounded-md font-bold text-[9px] flex items-center justify-center shrink-0 ${
                            isActive
                              ? "bg-amber-500 text-slate-950 font-black"
                              : isDone
                                ? "bg-emerald-500/20 text-emerald-400"
                                : "bg-white/10 text-slate-400"
                          }`}>
                            {idx + 1}
                          </span>
                          <span className="truncate font-semibold text-xs text-slate-100">
                            {catTitle}
                          </span>
                        </div>

                        <div className="flex items-center space-x-2 shrink-0 pl-1">
                          <span className={`font-mono text-[11px] font-bold ${
                            isActive ? "text-amber-300" : isDone ? "text-emerald-400" : "text-slate-400"
                          }`}>
                            {catScore} ⭐
                          </span>
                          {/* สถานะ: ครบ (สีเขียว) หรือ ยังไม่ลง (สีแดง บอกจำนวนข้อที่เหลือ) แทนคำว่า "เลือก" */}
                          {isDone ? (
                            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 rounded border border-emerald-500/30 flex items-center space-x-0.5">
                              <span>✓ ครบ</span>
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-rose-400 bg-rose-500/15 px-1.5 py-0.5 rounded border border-rose-500/30">
                              ⚠️ ยังไม่ลง ({remainingCount} ข้อ)
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* ปุ่มไปหน้าสรุปผล */}
                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    setCurrentStep(categories.length);
                  }}
                  className={`w-full px-2.5 py-1.5 rounded-xl text-left transition-all flex items-center justify-between text-xs border cursor-pointer mt-1 ${
                    isReviewStep
                      ? "bg-amber-500/20 text-white border-amber-500/60 ring-1 ring-amber-400/40 shadow-sm"
                      : "bg-white/5 text-slate-300 border-white/5 hover:bg-white/10 hover:text-white"
                  }`}
                  title="คลิกเพื่อไปที่หน้าสรุปผลและส่งแบบประเมิน"
                >
                  <div className="flex items-center space-x-2 min-w-0">
                    <span className={`w-4 h-4 rounded-md font-bold text-[9px] flex items-center justify-center shrink-0 ${
                      isReviewStep ? "bg-amber-500 text-slate-950" : "bg-white/10 text-slate-400"
                    }`}>
                      ✓
                    </span>
                    <span className="font-bold text-xs text-amber-200 truncate">
                      หน้าสรุปผลการประเมิน
                    </span>
                  </div>
                  <span className="text-[10px] text-amber-300 font-semibold font-mono shrink-0 pl-1">
                    {overallLiveStats.percent === 100 ? "ครบ 100% 🌟" : `${overallLiveStats.percent}%`}
                  </span>
                </button>
              </div>
            </div>

            {/* Current Active Category Subheader (แสดงเฉพาะในหน้าข้อคำถาม 1-5) */}
            {!isReviewStep && currentCategory && (
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-950/80 border border-white/10 text-xs">
                <span className="text-slate-300 font-medium truncate pr-2">
                  กำลังประเมินหน้า {currentStep + 1} จาก {categories.length}: <strong className="text-white">{currentCategory.title || currentCategory.label}</strong>
                </span>
                <div className="flex items-center space-x-1.5 text-amber-400 font-mono font-bold shrink-0">
                  <span className="text-[11px] text-slate-400 hidden sm:inline">คะแนนเฉลี่ยหมวดนี้:</span>
                  <span className="bg-amber-500/15 px-2 py-0.5 rounded-md border border-amber-500/30 text-amber-300 text-xs">
                    {currentCategoryStats.avg} / 5.0 ⭐
                  </span>
                </div>
              </div>
            )}

            {/* Error Banner */}
            {error && (
              <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs flex items-center space-x-2 animate-fadeIn shadow-md">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            {/* ==================================================== */}
            {/* VIEW A: CATEGORY QUESTIONS PAGE (STEP 1 TO 5)        */}
            {/* ==================================================== */}
            {!isReviewStep && currentCategory && (
              <div className="space-y-4 animate-fadeIn">
                
                {/* Questions List for Current Category: พื้นหลังสีขาว ตัวหนังสือชัดเจนตามความต้องการ */}
                <div className="space-y-3">
                  {(currentCategory.questions || []).map((q, qIdx) => {
                    const currentVal = scores[q.id];
                    const isShaking = shakingQuestionIds.includes(q.id);

                    return (
                      <div 
                        key={q.id}
                        id={`q_card_${q.id}`}
                        className={`p-3.5 sm:p-4 rounded-2xl border-2 transition-all shadow-sm ${
                          isShaking
                            ? "survey-shake border-rose-500 ring-4 ring-rose-400/40 bg-rose-50"
                            : currentVal 
                              ? "bg-white border-amber-400/80 shadow-md" 
                              : "bg-white border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        {/* Title & Inline Rating Badge (ต่อท้ายหัวข้อทันที) */}
                        <div className="pb-2">
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug flex flex-wrap items-center gap-1.5">
                            <span>{q.title || q.label || `คำถามข้อที่ ${qIdx + 1}`}</span>
                            {currentVal ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300 shadow-xs">
                                ({getScoreBadgeText(currentVal)})
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-200">
                                (* ยังไม่ได้ลงคะแนน)
                              </span>
                            )}
                          </h4>
                          {q.desc && (
                            <p className="text-[11px] text-slate-600 pt-1 leading-relaxed">
                              {q.desc}
                            </p>
                          )}
                        </div>

                        {/* 5-Star Rating Buttons on White Card */}
                        <div className="flex items-center justify-between sm:justify-start sm:space-x-3 pt-2.5 border-t border-slate-100">
                          <div className="flex items-center space-x-1 sm:space-x-2">
                            {[1, 2, 3, 4, 5].map((starNum) => {
                              const isFilled = starNum <= (currentVal || 0);
                              return (
                                <button
                                  key={starNum}
                                  type="button"
                                  onClick={() => handleScoreClick(q.id, starNum)}
                                  className="p-1 sm:p-1.5 rounded-xl hover:scale-125 transition-transform cursor-pointer group flex flex-col items-center"
                                  title={`ให้ ${starNum} ดาว`}
                                >
                                  <Star 
                                    className={`w-7 h-7 sm:w-8 sm:h-8 transition-colors ${
                                      isFilled 
                                        ? "fill-amber-400 text-amber-500 drop-shadow-sm" 
                                        : "text-slate-300 group-hover:text-amber-300"
                                    }`} 
                                  />
                                  <span className="text-[10px] text-slate-500 pt-0.5 font-mono font-bold">
                                    {starNum}
                                  </span>
                                </button>
                              );
                            })}
                          </div>

                          <div className="font-mono text-xs sm:text-sm font-extrabold pl-2">
                            {currentVal ? (
                              <span className="text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                                {currentVal} / 5 ⭐
                              </span>
                            ) : (
                              <span className="text-rose-500 font-semibold text-xs">
                                ยังไม่เลือก
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Per-Category Comments / Feedback Box (การ์ดขาวสะอาดตา) */}
                <div className="p-3.5 sm:p-4 rounded-2xl bg-white border-2 border-slate-200 shadow-sm space-y-1.5">
                  <label className="flex items-center space-x-1.5 text-xs sm:text-sm font-bold text-slate-800">
                    <MessageSquare className="w-4 h-4 text-amber-600" />
                    <span>ข้อเสนอแนะเพิ่มเติมสำหรับ {currentCategory.title} (ไม่บังคับ):</span>
                  </label>
                  <textarea
                    value={categoryComments[currentCategory.id] || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCategoryComments(prev => ({
                        ...prev,
                        [currentCategory.id]: val
                      }));
                    }}
                    placeholder={`พิมพ์ข้อเสนอแนะ สิ่งที่ประทับใจ หรือสิ่งที่อยากให้พัฒนาเกี่ยวกับ ${currentCategory.title}...`}
                    rows={2}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:border-amber-500 focus:bg-white shadow-inner resize-none transition-colors"
                  />
                </div>

                {/* Navigation Buttons: ⬅ ย้อนกลับ & ถัดไป ➔ */}
                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={handleBack}
                    disabled={currentStep === 0}
                    className={`px-4 py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center space-x-2 ${
                      currentStep === 0
                        ? "opacity-30 cursor-not-allowed bg-white/5 text-slate-500"
                        : "bg-white/10 hover:bg-white/15 text-slate-200 hover:text-white cursor-pointer"
                    }`}
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>ย้อนกลับ</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleNext}
                    className="px-6 py-3 rounded-2xl text-xs sm:text-sm font-extrabold bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 shadow-lg shadow-amber-500/25 flex items-center space-x-2 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                  >
                    <span>{currentStep === categories.length - 1 ? "ดูสรุปผลคะแนนทั้งหมด ➔" : "หัวข้อถัดไป ➔"}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

              </div>
            )}

            {/* ==================================================== */}
            {/* VIEW B: FINAL REVIEW & SUBMIT STEP                   */}
            {/* ==================================================== */}
            {isReviewStep && (
              <div className="space-y-4 animate-fadeIn">
                <div className="text-center space-y-1">
                  <h4 className="text-base sm:text-lg font-black text-white">
                    📋 สรุปผลการประเมินความพึงพอใจทั้งหมด
                  </h4>
                  <p className="text-xs text-slate-400">
                    กรุณาตรวจสอบคะแนนและข้อเสนอแนะของท่านก่อนกดยืนยันส่งข้อมูล
                  </p>
                </div>

                {/* Breakdown per Category with Comments */}
                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                  {categories.map((cat, idx) => {
                    const catAvg = getCategoryAvg(cat);
                    const catComment = categoryComments[cat.id];
                    return (
                      <div key={cat.id} className="p-3 rounded-xl bg-slate-950/80 border border-white/10 space-y-2 text-xs">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center space-x-2">
                            <span className="w-5 h-5 rounded-md bg-amber-500/20 text-amber-300 font-bold flex items-center justify-center text-[10px]">
                              {idx + 1}
                            </span>
                            <span className="font-extrabold text-white text-xs sm:text-sm">
                              {cat.title}
                            </span>
                          </div>

                          <div className="flex items-center space-x-2">
                            <span className="font-mono font-extrabold text-amber-400">
                              {catAvg} / 5.0 ⭐
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setError("");
                                setCurrentStep(idx);
                              }}
                              className="text-[10px] text-amber-400 hover:text-amber-300 underline font-semibold cursor-pointer"
                            >
                              แก้ไข
                            </button>
                          </div>
                        </div>

                        {catComment && (
                          <div className="p-2 rounded-lg bg-white/5 border border-white/5 text-[11px] text-slate-300 italic">
                            💬 ข้อเสนอแนะ: "{catComment}"
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Action Buttons: เหมือนจริง 100% */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleBack}
                    className="w-full sm:w-auto px-4 py-3 rounded-2xl text-xs sm:text-sm font-bold bg-white/10 hover:bg-white/15 text-slate-200 hover:text-white transition-all flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>ย้อนกลับไปแก้ไข</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSubmit}
                    className="w-full sm:w-auto px-6 py-3.5 rounded-2xl text-sm font-extrabold bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-xl shadow-emerald-500/25 flex items-center justify-center space-x-2 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>ยืนยันและส่งแบบประเมิน</span>
                  </button>
                </div>

              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}
