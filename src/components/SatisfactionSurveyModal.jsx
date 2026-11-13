import React, { useState, useEffect } from 'react';
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
  AlertCircle
} from 'lucide-react';

export const SURVEY_STORAGE_KEY = "sme_fan_survey_responses_v1";

const SURVEY_QUESTIONS = [
  {
    id: "ratingOverall",
    label: "1. ภาพรวมความพึงพอใจในการจัดงาน",
    desc: "ความประทับใจโดยรวมของค่ำคืนนี้",
    icon: Sparkles
  },
  {
    id: "ratingVenue",
    label: "2. สถานที่ ความสะดวก และบรรยากาศงาน",
    desc: "ห้องจัดเลี้ยง แสง สี เสียง และการจัดโต๊ะ",
    icon: Building2
  },
  {
    id: "ratingFood",
    label: "3. อาหาร เครื่องดื่ม และการให้บริการ",
    desc: "รสชาติ ความหลากหลาย และความเพียงพอ",
    icon: UtensilsCrossed
  },
  {
    id: "ratingActivities",
    label: "4. กิจกรรม การแสดง และความสนุกสนานบนเวที",
    desc: "การประกวดแต่งกาย วงดนตรี และการจับฉลาก",
    icon: PartyPopper
  },
  {
    id: "ratingStaff",
    label: "5. การบริการและการต้อนรับของทีมงาน",
    desc: "การลงทะเบียน การดูแล และความพร้อมของสตาฟฟ์",
    icon: Heart
  }
];

export default function SatisfactionSurveyModal({
  isOpen,
  onClose,
  attendee,
  onSaveSurvey
}) {
  const [ratings, setRatings] = useState({
    ratingOverall: 5,
    ratingVenue: 5,
    ratingFood: 5,
    ratingActivities: 5,
    ratingStaff: 5
  });
  const [comment, setComment] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [existingResponse, setExistingResponse] = useState(null);

  // Check if current attendee has already submitted
  useEffect(() => {
    if (!attendee) return;
    try {
      const saved = localStorage.getItem(SURVEY_STORAGE_KEY);
      if (saved) {
        const list = JSON.parse(saved);
        const found = list.find(r => 
          (attendee.ticketNo && r.ticketNo === attendee.ticketNo) ||
          (attendee.phone && r.phone === attendee.phone)
        );
        if (found) {
          setExistingResponse(found);
          setRatings(found.ratings || {
            ratingOverall: 5,
            ratingVenue: 5,
            ratingFood: 5,
            ratingActivities: 5,
            ratingStaff: 5
          });
          setComment(found.comment || "");
          setIsSubmitted(true);
        } else {
          setExistingResponse(null);
          setIsSubmitted(false);
        }
      }
    } catch (e) {
      console.warn("Could not read survey responses:", e);
    }
  }, [attendee, isOpen]);

  if (!isOpen || !attendee) return null;

  const handleStarClick = (questionId, score) => {
    setRatings(prev => ({
      ...prev,
      [questionId]: score
    }));
    setError("");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate ratings
    for (const q of SURVEY_QUESTIONS) {
      if (!ratings[q.id] || ratings[q.id] < 1) {
        setError(`กรุณาให้คะแนนหัวข้อ "${q.label}" ให้ครบถ้วนครับ`);
        return;
      }
    }

    const newResponse = {
      id: existingResponse?.id || `survey_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      ticketNo: attendee.ticketNo,
      name: attendee.name,
      nickname: attendee.nickname || "",
      phone: attendee.phone,
      club: attendee.club || "",
      ratings: { ...ratings },
      comment: comment.trim(),
      submittedAt: new Date().toISOString(),
      displayTime: new Date().toLocaleDateString('th-TH', { 
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
      })
    };

    try {
      const saved = localStorage.getItem(SURVEY_STORAGE_KEY);
      let list = saved ? JSON.parse(saved) : [];
      const existingIdx = list.findIndex(r => 
        (attendee.ticketNo && r.ticketNo === attendee.ticketNo) ||
        (attendee.phone && r.phone === attendee.phone)
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

  const getScoreLabel = (score) => {
    switch (score) {
      case 5: return "ยอดเยี่ยมมาก 🌟";
      case 4: return "ดีมาก 👍";
      case 3: return "ปานกลาง 🙂";
      case 2: return "พอใช้ 😐";
      case 1: return "ควรปรับปรุง ⚠️";
      default: return "";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-xl bg-slate-900 border border-amber-500/40 rounded-3xl p-5 sm:p-7 text-slate-100 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
        
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
        <div className="flex items-center space-x-3.5 border-b border-white/10 pb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500/25 via-yellow-400/20 to-emerald-500/25 border border-amber-500/40 text-amber-300 flex items-center justify-center shrink-0">
            <Sparkles className="w-6 h-6 text-amber-400" />
          </div>
          <div className="min-w-0 pr-6">
            <h3 className="text-lg sm:text-xl font-extrabold text-white truncate">
              แบบประเมินความพึงพอใจการจัดงาน
            </h3>
            <p className="text-xs text-amber-300/90 font-medium">
              งานสังสรรค์ปีใหม่ SME FAN 2026
            </p>
          </div>
        </div>

        {/* Attendee Identity Pill */}
        <div className="p-3 rounded-2xl bg-slate-950/80 border border-white/10 flex items-center justify-between text-xs">
          <div className="space-y-0.5">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
              ผู้ประเมิน
            </span>
            <span className="font-extrabold text-white text-sm">
              {attendee.name} {attendee.nickname ? `(${attendee.nickname})` : ''}
            </span>
          </div>
          <div className="text-right">
            <span className="font-mono text-amber-400 font-bold block">
              {attendee.ticketNo}
            </span>
            <span className="text-[11px] text-slate-400">
              {attendee.club}
            </span>
          </div>
        </div>

        {/* Success View if already submitted */}
        {isSubmitted && existingResponse ? (
          <div className="py-6 text-center space-y-4 animate-fadeIn">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xl font-extrabold text-white">
                บันทึกแบบประเมินความพึงพอใจเรียบร้อยแล้ว
              </h4>
              <p className="text-xs text-slate-300 max-w-md mx-auto">
                ขอขอบพระคุณเป็นอย่างยิ่งที่ร่วมส่งความคิดเห็น ทุกคะแนนและข้อเสนอแนะมีคุณค่าต่อการพัฒนาการจัดกิจกรรม SME FAN ในครั้งต่อไปครับ
              </p>
            </div>

            {/* Summary of Submitted Ratings */}
            <div className="bg-slate-950/80 p-4 rounded-2xl border border-white/10 text-xs space-y-2.5 text-left max-w-md mx-auto">
              <div className="flex justify-between items-center pb-2 border-b border-white/5 text-[11px] text-slate-400">
                <span>บันทึกเมื่อ:</span>
                <span className="font-mono text-slate-300">{existingResponse.displayTime || "เมื่อสักครู่"}</span>
              </div>
              {SURVEY_QUESTIONS.map(q => (
                <div key={q.id} className="flex justify-between items-center">
                  <span className="text-slate-300 truncate pr-2">{q.label.replace(/^\d+\.\s*/, '')}:</span>
                  <div className="flex items-center space-x-1 shrink-0">
                    <span className="font-bold text-amber-400 font-mono">{ratings[q.id]}/5</span>
                    <span className="text-amber-400 text-xs">⭐</span>
                  </div>
                </div>
              ))}
              {comment && (
                <div className="pt-2 border-t border-white/5 space-y-1">
                  <span className="text-[11px] text-slate-400 block">ข้อเสนอแนะที่ส่งไว้:</span>
                  <p className="text-xs text-slate-200 italic bg-white/5 p-2 rounded-xl">
                    "{comment}"
                  </p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsSubmitted(false)}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-bold transition-all cursor-pointer"
              >
                ✏️ แก้ไขคะแนนการประเมิน
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold shadow-lg shadow-amber-500/25 transition-all cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        ) : (
          /* Form View */
          <form onSubmit={handleSubmit} className="space-y-5 animate-fadeIn">
            <p className="text-xs text-slate-300 leading-relaxed">
              กรุณาเลือกให้คะแนนระดับความพึงพอใจในแต่ละด้าน (1 = ควรปรับปรุง ถึง 5 = ยอดเยี่ยมมาก)
            </p>

            {/* Questions List */}
            <div className="space-y-4">
              {SURVEY_QUESTIONS.map((q) => {
                const Icon = q.icon;
                const currentVal = ratings[q.id] || 5;
                return (
                  <div key={q.id} className="p-3.5 sm:p-4 rounded-2xl bg-slate-950/70 border border-white/10 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs sm:text-sm font-bold text-white">
                            {q.label}
                          </h4>
                          <p className="text-[11px] text-slate-400">
                            {q.desc}
                          </p>
                        </div>
                      </div>
                      
                      <span className="text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20 shrink-0">
                        {getScoreLabel(currentVal)}
                      </span>
                    </div>

                    {/* 5-Star Rating Buttons */}
                    <div className="flex items-center justify-between sm:justify-start sm:space-x-3 pt-1">
                      {[1, 2, 3, 4, 5].map((starNum) => {
                        const isFilled = starNum <= currentVal;
                        return (
                          <button
                            key={starNum}
                            type="button"
                            onClick={() => handleStarClick(q.id, starNum)}
                            className="p-1 sm:p-1.5 rounded-xl hover:scale-125 transition-transform cursor-pointer group"
                            title={`ให้ ${starNum} ดาว`}
                          >
                            <Star 
                              className={`w-7 h-7 sm:w-8 sm:h-8 transition-colors ${
                                isFilled 
                                  ? "fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" 
                                  : "text-slate-600 group-hover:text-slate-400"
                              }`} 
                            />
                          </button>
                        );
                      })}
                      <span className="font-mono text-sm font-bold text-white pl-2">
                        {currentVal} / 5
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Comment / Feedback */}
            <div className="space-y-1.5">
              <label className="flex items-center space-x-1.5 text-xs font-bold text-amber-300">
                <MessageSquare className="w-4 h-4" />
                <span>ข้อเสนอแนะเพิ่มเติม หรือความประทับใจในงาน (ไม่บังคับ):</span>
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="พิมพ์ข้อเสนอแนะ สิ่งที่ประทับใจ หรือสิ่งที่อยากให้มีในงานครั้งต่อไป..."
                rows={3}
                className="w-full p-3 rounded-2xl bg-slate-950 border border-white/15 text-white text-xs sm:text-sm focus:outline-none focus:border-amber-400 shadow-inner resize-none"
              />
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2 animate-fadeIn">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full py-3.5 px-4 rounded-2xl text-sm font-extrabold bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 shadow-xl shadow-amber-500/25 flex items-center justify-center space-x-2 transition-all hover:scale-[1.01] active:scale-[0.98] cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>ส่งแบบประเมินความพึงพอใจ</span>
            </button>
          </form>
        )}

      </div>
    </div>
  );
}
