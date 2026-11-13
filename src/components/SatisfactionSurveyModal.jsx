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

  const activeAttendee = attendee || (isPreviewMode ? {
    name: "ผู้ดูแลระบบ (โหมดทดสอบ)",
    nickname: "แอดมิน",
    club: "ทดสอบระบบ",
    ticketNo: "PREVIEW-2026",
    phone: "080-000-0000"
  } : null);

  // Step state: 0 to categories.length (categories.length = final review/submit step)
  const [currentStep, setCurrentStep] = useState(0);

  // Scores map: { [questionId]: score (1..5) }
  const [scores, setScores] = useState({});

  // Comments map per category: { [categoryId]: string }
  const [categoryComments, setCategoryComments] = useState({});

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [existingResponse, setExistingResponse] = useState(null);

  // Initialize or load existing response when opened
  useEffect(() => {
    if (!activeAttendee || !isOpen) return;

    if (isPreviewMode) {
      setExistingResponse(null);
      setIsSubmitted(false);
      setCurrentStep(0);
      setScores({});
      setCategoryComments({});
      setError("");
      return;
    }

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

    // Default: initialize empty scores
    setExistingResponse(null);
    setIsSubmitted(false);
    setCurrentStep(0);
    setError("");
  }, [activeAttendee, isOpen, categories, isPreviewMode]);

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
  };

  const handleNext = () => {
    // Validate that all questions in current category are answered
    if (currentCategory) {
      const unAnswered = (currentCategory.questions || []).find(q => !scores[q.id]);
      if (unAnswered) {
        setError(`กรุณาให้คะแนนข้อ "${unAnswered.title}" ก่อนดำเนินการต่อครับ`);
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
    if (isPreviewMode) {
      alert("โหมดทดสอบ: ไม่สามารถส่งคะแนนจริงได้ครับ");
      return;
    }

    // Final full validation
    for (const cat of categories) {
      for (const q of cat.questions || []) {
        if (!scores[q.id]) {
          setError(`ยังให้คะแนนไม่ครบ: กรุณาให้คะแนน "${q.title}" ใน ${cat.title} ครับ`);
          return;
        }
      }
    }

    // Build category averages map
    const catAverages = {};
    categories.forEach(cat => {
      catAverages[cat.id] = getCategoryAvg(cat);
    });

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
      submittedAt: new Date().toISOString(),
      displayTime: new Date().toLocaleDateString('th-TH', { 
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
      })
    };

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

        {/* Test Mode Notification Banner */}
        {isPreviewMode && (
          <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-300 flex items-center justify-between text-xs animate-fadeIn">
            <div className="flex items-center space-x-2.5">
              <Eye className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
              <div>
                <span className="font-extrabold text-amber-200">
                  โหมดทดสอบแบบสอบถาม (Survey Test / Preview Mode)
                </span>
                <p className="text-[11px] text-amber-300/80">
                  คุณสามารถทดลองคลิกให้คะแนนและพิมพ์ข้อเสนอแนะได้ แต่ระบบจะปิดการส่งคะแนนจริง
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-amber-500/30 text-amber-200 font-mono text-[10px] font-black border border-amber-500/40 shrink-0">
              PREVIEW ONLY
            </span>
          </div>
        )}

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
        {/* SUCCESS / VIEW SUBMITTED RECORD SCREEN               */}
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

              <div className="text-right text-[10px] text-slate-500 pt-1">
                ส่งเมื่อ: {existingResponse.displayTime || "เมื่อสักครู่"}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsSubmitted(false);
                  setCurrentStep(0);
                }}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                <span>แก้ไขคำตอบแบบประเมิน</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold shadow-lg shadow-amber-500/25 transition-all cursor-pointer"
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
            
            {/* REAL-TIME LIVE SCORE & STEPPER HEADER BAR (ส่วนบนสรุปคะแนนสด) */}
            <div className="p-3 sm:p-4 rounded-2xl bg-slate-950/90 border border-amber-500/30 space-y-2.5 shadow-inner">
              
              {/* Row 1: Attendee Pill & Live Overall Total Score */}
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/10">
                <div className="flex items-center space-x-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-300 font-bold flex items-center justify-center text-xs shrink-0">
                    👤
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] text-slate-400 block leading-none">ผู้ประเมิน</span>
                    <span className="font-extrabold text-white text-xs truncate block">
                      {activeAttendee.name} {activeAttendee.nickname ? `(${activeAttendee.nickname})` : ''}
                    </span>
                  </div>
                </div>

                {/* Live Overall Rating Pill (ยอดรวมคะแนนเฉลี่ยสดทั้งงาน) */}
                <div className="bg-gradient-to-r from-amber-500/20 via-yellow-400/20 to-amber-500/20 border border-amber-500/40 px-3 py-1.5 rounded-xl flex items-center space-x-2 shrink-0">
                  <div className="text-right">
                    <span className="text-[10px] text-amber-300 font-bold block uppercase tracking-wider leading-none">
                      ยอดคะแนนเฉลี่ยรวม
                    </span>
                    <span className="text-[10px] text-slate-400 block leading-none pt-0.5">
                      ตอบแล้ว {overallLiveStats.answered}/{overallLiveStats.totalQuestions} ข้อ
                    </span>
                  </div>
                  <div className="flex items-center space-x-1 pl-1 border-l border-amber-500/30">
                    <span className="font-mono text-base sm:text-lg font-black text-amber-400">
                      {overallLiveStats.overallAvg}
                    </span>
                    <span className="text-amber-400 text-xs">⭐</span>
                  </div>
                </div>
              </div>

              {/* Row 2: Category Stepper Tabs (1 - 5 + สรุป) */}
              <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
                {categories.map((cat, idx) => {
                  const isActive = idx === currentStep;
                  const isDone = isCategoryComplete(cat);
                  const catScore = getCategoryAvg(cat);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setError("");
                        setCurrentStep(idx);
                      }}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center space-x-1.5 border cursor-pointer ${
                        isActive
                          ? "bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/25 scale-[1.02]"
                          : isDone
                            ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25"
                            : "bg-white/5 text-slate-400 border-white/10 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <span>{idx + 1}. {cat.title.replace(/^\d+\.\s*(ด้าน)?/, '').slice(0, 10)}...</span>
                      {isDone && (
                        <span className={`text-[10px] px-1 rounded-md font-mono font-bold ${
                          isActive ? "bg-slate-950 text-amber-300" : "bg-emerald-500/20 text-emerald-400"
                        }`}>
                          {catScore}⭐
                        </span>
                      )}
                    </button>
                  );
                })}

                {/* Review Tab */}
                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    setCurrentStep(categories.length);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center space-x-1 border cursor-pointer ${
                    isReviewStep
                      ? "bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/25 scale-[1.02]"
                      : "bg-white/5 text-slate-400 border-white/10 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <span>📋 สรุปผล</span>
                </button>
              </div>

              {/* Row 3: Current Category Live Real-time Score Badge */}
              {!isReviewStep && currentCategory && (
                <div className="flex items-center justify-between pt-1 text-xs">
                  <span className="text-slate-300 font-medium">
                    หน้า {currentStep + 1} จาก {categories.length}: <strong className="text-white">{currentCategory.title}</strong>
                  </span>
                  <div className="flex items-center space-x-2 text-amber-400 font-mono font-bold">
                    <span>คะแนนเฉลี่ยหน้านี้:</span>
                    <span className="bg-amber-500/15 px-2 py-0.5 rounded-md border border-amber-500/30 text-amber-300">
                      {currentCategoryStats.avg} / 5.0 ⭐
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Error Banner */}
            {error && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2 animate-fadeIn">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {/* ==================================================== */}
            {/* VIEW A: CATEGORY QUESTIONS PAGE (STEP 1 TO 5)        */}
            {/* ==================================================== */}
            {!isReviewStep && currentCategory && (
              <div className="space-y-4 animate-fadeIn">
                
                {/* Questions List for Current Category */}
                <div className="space-y-3">
                  {(currentCategory.questions || []).map((q, qIdx) => {
                    const currentVal = scores[q.id];
                    return (
                      <div 
                        key={q.id}
                        className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
                          currentVal 
                            ? "bg-slate-950/80 border-amber-500/30 shadow-sm" 
                            : "bg-slate-950/50 border-white/10"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1.5 pb-2">
                          <div>
                            <h4 className="text-xs sm:text-sm font-bold text-white flex items-center space-x-2">
                              <span>{q.title}</span>
                              {currentVal && (
                                <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px]">
                                  ✓
                                </span>
                              )}
                            </h4>
                            {q.desc && (
                              <p className="text-[11px] text-slate-400 pt-0.5 leading-relaxed">
                                {q.desc}
                              </p>
                            )}
                          </div>

                          <div className="shrink-0 self-start sm:self-auto">
                            <span className={`text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-lg border ${
                              currentVal
                                ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                                : "bg-white/5 text-slate-500 border-white/10"
                            }`}>
                              {getScoreBadgeText(currentVal)}
                            </span>
                          </div>
                        </div>

                        {/* 5-Star Rating Buttons (1 to 5) */}
                        <div className="flex items-center justify-between sm:justify-start sm:space-x-3 pt-2 border-t border-white/5">
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
                                      ? "fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" 
                                      : "text-slate-600 group-hover:text-slate-400"
                                  }`} 
                                />
                                <span className="text-[9px] text-slate-400 pt-0.5 font-mono">
                                  {starNum}
                                </span>
                              </button>
                            );
                          })}
                          <span className="font-mono text-xs sm:text-sm font-bold text-white pl-2">
                            {currentVal ? `${currentVal} / 5` : 'ยังไม่ได้เลือก'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Per-Category Comments / Feedback Box (ทุกหัวข้อใหญ่จะมีกล่องความเห็น) */}
                <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-white/10 space-y-1.5">
                  <label className="flex items-center space-x-1.5 text-xs font-bold text-amber-300">
                    <MessageSquare className="w-4 h-4 text-amber-400" />
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
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs sm:text-sm focus:outline-none focus:border-amber-400 shadow-inner resize-none"
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

                {/* Overall Score Highlight Card */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-yellow-400/10 to-amber-500/20 border-2 border-amber-500/40 text-center space-y-1">
                  <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider block">
                    คะแนนเฉลี่ยรวมทุกหัวข้อ
                  </span>
                  <div className="text-3xl sm:text-4xl font-black text-amber-400 font-mono">
                    {overallLiveStats.overallAvg} <span className="text-lg text-amber-300">/ 5.0 ⭐</span>
                  </div>
                  <div className="text-xs text-slate-300">
                    ตอบครบถ้วน {overallLiveStats.answered} จาก {overallLiveStats.totalQuestions} ข้อย่อย (100%)
                  </div>
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
                              className="text-[10px] text-amber-400 hover:text-amber-300 underline font-semibold"
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

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleBack}
                    className="w-full sm:w-auto px-4 py-3 rounded-2xl text-xs sm:text-sm font-bold bg-white/10 hover:bg-white/15 text-slate-200 hover:text-white transition-all flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>ย้อนกลับไปแก้ไข</span>
                  </button>

                  {isPreviewMode ? (
                    <div className="flex flex-col items-center sm:items-end space-y-1 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={() => {
                          alert(`[โหมดทดสอบแบบสอบถาม]\n\nคุณได้ทดสอบให้คะแนนครบถ้วนแล้วครับ!\nคะแนนเฉลี่ยที่ทดลองประเมินคือ: ${overallLiveStats.overallAvg} / 5.0 ⭐\n\n⚠️ ในโหมดทดสอบนี้ จะไม่มีการบันทึกคะแนนใดๆ ลงในระบบจริง เพื่อป้องกันไม่ให้ข้อมูลปนเปื้อนครับ`);
                        }}
                        className="w-full sm:w-auto px-6 py-3.5 rounded-2xl text-xs sm:text-sm font-extrabold bg-slate-800 hover:bg-slate-750 text-slate-300 border border-amber-500/40 flex items-center justify-center space-x-2 cursor-pointer transition-all shadow-md"
                        title="คลิกเพื่อตรวจสอบผลการจำลองในโหมดทดสอบ"
                      >
                        <Lock className="w-4 h-4 text-amber-400" />
                        <span>🔒 โหมดทดสอบ (ปิดการส่งคะแนนจริง)</span>
                      </button>
                      <span className="text-[11px] text-amber-400/90 font-medium">
                        * สามารถทดสอบกดให้คะแนนได้ แต่ไม่สามารถส่งคะแนนจริงได้
                      </span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSubmit}
                      className="w-full sm:w-auto px-6 py-3.5 rounded-2xl text-sm font-extrabold bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-xl shadow-emerald-500/25 flex items-center justify-center space-x-2 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                      <span>ยืนยันและส่งแบบประเมิน</span>
                    </button>
                  )}
                </div>

              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}
