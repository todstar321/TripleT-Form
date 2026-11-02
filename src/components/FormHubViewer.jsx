import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { 
  ArrowLeft, 
  Send, 
  CheckCircle2, 
  Star, 
  Sparkles, 
  Building2, 
  User, 
  Calendar, 
  Phone, 
  Mail, 
  Layers, 
  Palette,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';

export default function FormHubViewer({
  form,
  onBackToDashboard,
  onSubmitResponse,
  onOpenThemeCustomizer
}) {
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedId, setSubmittedId] = useState("");

  const theme = form.theme || {
    cardMode: 'white',
    themeColor: '#2563eb',
    themeGradient: 'linear-gradient(135deg, #2563eb, #3b82f6, #60a5fa)',
    themeTextColor: '#ffffff',
    backgroundImage: "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1920&q=80",
    bgOverlayOpacity: 85
  };

  const isWhite = theme.cardMode === 'white';
  const isGlass = theme.cardMode === 'glass';
  const isDark = !isWhite && !isGlass;

  // Handle Input Changes
  const handleInputChange = (fieldId, value) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
    if (errors[fieldId]) {
      setErrors(prev => {
        const copy = { ...prev };
        delete copy[fieldId];
        return copy;
      });
    }
  };

  // Handle Multi-Checkbox
  const handleCheckboxToggle = (fieldId, option) => {
    const current = Array.isArray(formData[fieldId]) ? formData[fieldId] : [];
    let updated;
    if (current.includes(option)) {
      updated = current.filter(item => item !== option);
    } else {
      updated = [...current, option];
    }
    handleInputChange(fieldId, updated);
  };

  // Validate form
  const validate = () => {
    const errs = {};
    (form.fields || []).forEach(f => {
      if (f.required) {
        const val = formData[f.id];
        if (val === undefined || val === null || val === '') {
          errs[f.id] = `กรุณากรอกหรือเลือกข้อมูลในหัวข้อนี้`;
        } else if (Array.isArray(val) && val.length === 0) {
          errs[f.id] = `กรุณาเลือกอย่างน้อย 1 รายการ`;
        }
      }
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Submit Handler
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) {
      window.scrollTo({ top: 300, behavior: 'smooth' });
      return;
    }

    const newResponse = {
      id: `resp_${Date.now()}`,
      submittedAt: new Date().toLocaleString('th-TH'),
      ...formData
    };

    setSubmittedId(newResponse.id);
    setIsSubmitted(true);

    if (onSubmitResponse) {
      onSubmitResponse(form.id, newResponse);
    }

    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (err) {
      console.log("Confetti trigger:", err);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Reset form to answer again
  const handleReset = () => {
    setFormData({});
    setErrors({});
    setIsSubmitted(false);
    setSubmittedId("");
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const primaryBtnStyle = {
    background: theme.themeGradient || theme.themeColor,
    color: theme.themeTextColor || '#ffffff'
  };

  return (
    <div 
      className="min-h-screen relative bg-cover bg-center bg-no-repeat bg-fixed font-sans pb-20"
      style={{ backgroundImage: `url(${theme.backgroundImage})` }}
    >
      {/* Background Dim Filter */}
      <div 
        className="fixed inset-0 pointer-events-none transition-opacity"
        style={{ 
          backgroundColor: isWhite ? '#f8fafc' : '#020617',
          opacity: (theme.bgOverlayOpacity || 85) / 100 
        }}
      />

      {/* Floating Top Control Bar (For Owner / Admin) */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-white/10 px-4 py-3 shadow-md">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBackToDashboard}
            className="flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-white/10 transition-all hover:scale-105"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>กลับสู่แผงควบคุม (Owner Dashboard)</span>
          </button>

          <div className="flex items-center space-x-2">
            <span className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800">
              <Layers className="w-3.5 h-3.5" />
              <span>แบบฟอร์มที่ {form.formNumber}: {form.shortTitle}</span>
            </span>

            {onOpenThemeCustomizer && (
              <button
                type="button"
                onClick={() => onOpenThemeCustomizer(form.id)}
                className="flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-sm transition-all hover:scale-105"
              >
                <Palette className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">ปรับแต่งโทนสีฟอร์มนี้</span>
                <span className="sm:hidden">สีฟอร์ม</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Form Container */}
      <main className="relative z-10 max-w-2xl mx-auto pt-8 px-4 sm:px-6">
        
        {/* ==================================================== */}
        {/* SUCCESS CARD AFTER SUBMISSION                        */}
        {/* ==================================================== */}
        {isSubmitted ? (
          <div className={`rounded-3xl p-8 text-center space-y-6 shadow-2xl transition-all ${
            isWhite 
              ? 'bg-white text-slate-800 border border-slate-200' 
              : isGlass 
                ? 'bg-white/10 backdrop-blur-2xl text-white border border-white/20' 
                : 'bg-slate-900/95 text-white border border-white/10'
          }`}>
            <div 
              className="w-20 h-20 rounded-full mx-auto flex items-center justify-center shadow-lg"
              style={primaryBtnStyle}
            >
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <h2 className={`text-2xl sm:text-3xl font-extrabold ${isWhite ? 'text-slate-900' : 'text-white'}`}>
                ส่งข้อมูลเรียบร้อยแล้ว! 🎉
              </h2>
              <p className={`text-sm ${isWhite ? 'text-slate-600' : 'text-slate-300'} max-w-md mx-auto`}>
                ระบบได้ทำการบันทึกข้อมูลของท่านเข้าสู่ฐานข้อมูล Triple T Multi-Form เรียบร้อยแล้ว ขอขอบพระคุณเป็นอย่างยิ่งครับ
              </p>
            </div>

            <div className={`p-4 rounded-2xl text-xs space-y-1 font-mono inline-block mx-auto ${
              isWhite ? 'bg-slate-100 text-slate-700' : 'bg-white/5 text-slate-300'
            }`}>
              <div>รหัสการส่ง: <strong>{submittedId}</strong></div>
              <div>เวลาที่ส่ง: {new Date().toLocaleString('th-TH')}</div>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleReset}
                className="w-full sm:w-auto flex items-center justify-center space-x-2 px-6 py-3 rounded-2xl text-xs font-bold border transition-all hover:scale-105"
                style={isWhite ? { borderColor: '#cbd5e1', backgroundColor: '#f8fafc', color: '#1e293b' } : { borderColor: 'rgba(255,255,255,0.2)', backgroundColor: 'rgba(255,255,255,0.05)', color: '#ffffff' }}
              >
                <RotateCcw className="w-4 h-4" />
                <span>ส่งคำตอบอีกครั้ง (Submit another response)</span>
              </button>

              <button
                type="button"
                onClick={onBackToDashboard}
                className="w-full sm:w-auto flex items-center justify-center space-x-2 px-6 py-3 rounded-2xl text-xs font-bold shadow-lg transition-all hover:scale-105"
                style={primaryBtnStyle}
              >
                <span>กลับสู่หน้ารายการฟอร์ม</span>
              </button>
            </div>
          </div>
        ) : (
          /* ==================================================== */
          /* ACTIVE FORM QUESTIONS VIEW                           */
          /* ==================================================== */
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Form Header Card */}
            <div className={`rounded-3xl overflow-hidden shadow-2xl transition-all ${
              isWhite 
                ? 'bg-white text-slate-800 border border-slate-200' 
                : isGlass 
                  ? 'bg-white/10 backdrop-blur-2xl text-white border border-white/20' 
                  : 'bg-slate-900/90 text-white border border-white/10'
            }`}>
              {/* Optional Cover Banner */}
              {theme.coverImage && (
                <div className="relative h-44 sm:h-56 w-full overflow-hidden">
                  <img 
                    src={theme.coverImage} 
                    alt={form.title} 
                    className="w-full h-full object-cover" 
                  />
                  <div className={`absolute inset-0 bg-gradient-to-t ${
                    isWhite 
                      ? 'from-white via-white/30 to-transparent' 
                      : 'from-slate-900 via-slate-900/40 to-transparent'
                  }`} />
                  
                  {/* Category Pill */}
                  <div className="absolute top-4 left-4 z-10">
                    <span 
                      className="px-3 py-1 rounded-full text-xs font-bold shadow-lg inline-flex items-center space-x-1"
                      style={primaryBtnStyle}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{form.category || "Triple T Form Hub"}</span>
                    </span>
                  </div>
                </div>
              )}

              <div className="p-6 sm:p-8 space-y-3">
                <div className="flex items-center space-x-2">
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                    isWhite 
                      ? 'bg-slate-100 text-slate-700 border-slate-300' 
                      : 'bg-white/10 text-slate-200 border-white/20'
                  }`}>
                    แบบฟอร์มลำดับที่ {form.formNumber}
                  </span>
                  <span className="text-[11px] font-semibold text-emerald-500 flex items-center space-x-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>เปิดรับการส่งข้อมูล (Active)</span>
                  </span>
                </div>

                <h1 className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${
                  isWhite ? 'text-slate-900' : 'text-white'
                }`}>
                  {form.title}
                </h1>

                <p className={`text-sm leading-relaxed ${
                  isWhite ? 'text-slate-600' : 'text-slate-300'
                }`}>
                  {form.description}
                </p>

                <div className={`pt-3 border-t text-xs flex items-center justify-between ${
                  isWhite ? 'border-slate-100 text-slate-500' : 'border-white/10 text-slate-400'
                }`}>
                  <span>* จำเป็นต้องกรอก</span>
                  <span>ระบบ Triple T Form Hub</span>
                </div>
              </div>
            </div>

            {/* Questions Fields */}
            {(form.fields || []).map((field, idx) => {
              const hasError = !!errors[field.id];
              const value = formData[field.id];

              return (
                <div 
                  key={field.id}
                  className={`rounded-2xl p-5 sm:p-6 shadow-md transition-all ${
                    hasError ? 'ring-2 ring-rose-500' : ''
                  } ${
                    isWhite 
                      ? 'bg-white text-slate-800 border border-slate-200' 
                      : isGlass 
                        ? 'bg-white/10 backdrop-blur-xl text-white border border-white/15' 
                        : 'bg-slate-900/80 text-white border border-white/10'
                  }`}
                >
                  {/* Field Label */}
                  <label className="block mb-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className={`font-bold text-sm sm:text-base ${
                        isWhite ? 'text-slate-900' : 'text-white'
                      }`}>
                        {field.label} {field.required && <span className="text-rose-500">*</span>}
                      </span>
                    </div>
                    {field.description && (
                      <p className={`text-xs mt-1 ${isWhite ? 'text-slate-500' : 'text-slate-400'}`}>
                        {field.description}
                      </p>
                    )}
                  </label>

                  {/* FIELD TYPE: TEXT / TEL / EMAIL */}
                  {(field.type === 'text' || field.type === 'tel' || field.type === 'email') && (
                    <input
                      type={field.type}
                      value={value || ''}
                      onChange={(e) => handleInputChange(field.id, e.target.value)}
                      placeholder={field.placeholder || 'คำตอบของคุณ...'}
                      className={`w-full px-4 py-3 rounded-xl text-sm transition-all outline-none focus:ring-2 ${
                        isWhite 
                          ? 'bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-indigo-500/20' 
                          : 'bg-slate-950/70 border border-white/15 text-white placeholder-slate-500 focus:border-amber-400 focus:ring-amber-400/20'
                      }`}
                    />
                  )}

                  {/* FIELD TYPE: TEXTAREA */}
                  {field.type === 'textarea' && (
                    <textarea
                      rows={3}
                      value={value || ''}
                      onChange={(e) => handleInputChange(field.id, e.target.value)}
                      placeholder={field.placeholder || 'รายละเอียดเพิ่มเติม...'}
                      className={`w-full px-4 py-3 rounded-xl text-sm transition-all outline-none focus:ring-2 ${
                        isWhite 
                          ? 'bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-indigo-500/20' 
                          : 'bg-slate-950/70 border border-white/15 text-white placeholder-slate-500 focus:border-amber-400 focus:ring-amber-400/20'
                      }`}
                    />
                  )}

                  {/* FIELD TYPE: SELECT / DROPDOWN */}
                  {field.type === 'select' && (
                    <select
                      value={value || ''}
                      onChange={(e) => handleInputChange(field.id, e.target.value)}
                      className={`w-full px-4 py-3 rounded-xl text-sm transition-all outline-none focus:ring-2 ${
                        isWhite 
                          ? 'bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-indigo-500/20' 
                          : 'bg-slate-950/90 border border-white/15 text-white focus:border-amber-400 focus:ring-amber-400/20'
                      }`}
                    >
                      <option value="">-- กรุณาเลือกตัวเลือก --</option>
                      {(field.options || []).map((opt, i) => (
                        <option key={i} value={opt} className={isWhite ? 'text-slate-950' : 'bg-slate-900 text-white'}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  )}

                  {/* FIELD TYPE: RADIO */}
                  {field.type === 'radio' && (
                    <div className="space-y-2.5 pt-1">
                      {(field.options || []).map((opt, i) => {
                        const isChecked = value === opt;
                        return (
                          <label
                            key={i}
                            onClick={() => handleInputChange(field.id, opt)}
                            className={`flex items-center space-x-3 p-3 rounded-xl border text-sm cursor-pointer transition-all ${
                              isChecked 
                                ? (isWhite 
                                    ? 'border-indigo-500 bg-indigo-50/60 text-slate-900 font-bold shadow-sm' 
                                    : 'border-amber-400 bg-amber-400/10 text-white font-bold') 
                                : (isWhite 
                                    ? 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/70 text-slate-700' 
                                    : 'border-white/10 bg-white/5 hover:bg-white/10 text-slate-200')
                            }`}
                          >
                            <input
                              type="radio"
                              name={field.id}
                              checked={isChecked}
                              onChange={() => {}}
                              className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                            <span>{opt}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {/* FIELD TYPE: CHECKBOX */}
                  {field.type === 'checkbox' && (
                    <div className="space-y-2.5 pt-1">
                      {(field.options || []).map((opt, i) => {
                        const checkedList = Array.isArray(value) ? value : [];
                        const isChecked = checkedList.includes(opt);
                        return (
                          <label
                            key={i}
                            onClick={() => handleCheckboxToggle(field.id, opt)}
                            className={`flex items-center space-x-3 p-3 rounded-xl border text-sm cursor-pointer transition-all ${
                              isChecked 
                                ? (isWhite 
                                    ? 'border-indigo-500 bg-indigo-50/60 text-slate-900 font-bold shadow-sm' 
                                    : 'border-amber-400 bg-amber-400/10 text-white font-bold') 
                                : (isWhite 
                                    ? 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/70 text-slate-700' 
                                    : 'border-white/10 bg-white/5 hover:bg-white/10 text-slate-200')
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}}
                              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                            <span>{opt}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {/* FIELD TYPE: STAR RATING (1-5) */}
                  {field.type === 'rating' && (
                    <div className="pt-2">
                      <div className="flex items-center space-x-2 sm:space-x-3">
                        {[1, 2, 3, 4, 5].map((starVal) => {
                          const isFilled = (value || 0) >= starVal;
                          return (
                            <button
                              key={starVal}
                              type="button"
                              onClick={() => handleInputChange(field.id, starVal)}
                              className="group p-2 rounded-xl transition-transform hover:scale-125 focus:outline-none"
                            >
                              <Star 
                                className={`w-8 h-8 transition-colors ${
                                  isFilled 
                                    ? 'fill-amber-400 text-amber-400 drop-shadow' 
                                    : (isWhite ? 'text-slate-300 hover:text-amber-300' : 'text-slate-600 hover:text-amber-300')
                                }`} 
                              />
                            </button>
                          );
                        })}
                        {value && (
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                            isWhite ? 'bg-amber-100 text-amber-800' : 'bg-amber-500/20 text-amber-300'
                          }`}>
                            {value} จาก 5 ดาว
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* FIELD TYPE: NPS SCORE (1-10) */}
                  {field.type === 'nps' && (
                    <div className="pt-2 space-y-2">
                      <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => {
                          const isSelected = value === score;
                          return (
                            <button
                              key={score}
                              type="button"
                              onClick={() => handleInputChange(field.id, score)}
                              className={`py-3 rounded-xl text-xs sm:text-sm font-bold border transition-all ${
                                isSelected
                                  ? 'scale-105 shadow-md'
                                  : (isWhite 
                                      ? 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700' 
                                      : 'border-white/10 bg-white/5 hover:bg-white/10 text-slate-200')
                              }`}
                              style={isSelected ? primaryBtnStyle : {}}
                            >
                              {score}
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                        <span>1 (น้อยที่สุด)</span>
                        <span>10 (มากที่สุด)</span>
                      </div>
                    </div>
                  )}

                  {/* Error Message */}
                  {hasError && (
                    <p className="text-xs text-rose-500 font-medium mt-2">
                      ⚠️ {errors[field.id]}
                    </p>
                  )}
                </div>
              );
            })}

            {/* Submit Action Box */}
            <div className="pt-2 flex items-center justify-between gap-4">
              <button
                type="submit"
                className="flex-1 flex items-center justify-center space-x-2 py-4 px-8 rounded-2xl text-base font-bold shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={primaryBtnStyle}
              >
                <Send className="w-5 h-5" />
                <span>ส่งข้อมูลแบบฟอร์ม (Submit)</span>
              </button>
            </div>
          </form>
        )}

        {/* Official Footer Accreditation */}
        <footer className="mt-12 text-center space-y-2 text-xs text-slate-400">
          <p className="font-semibold text-slate-300">
            © 2026 งานสังสรรค์ปีใหม่ SME FAN 2026
          </p>
          <div className="space-y-0.5 text-[11px] text-slate-400">
            <p>นักพัฒนาซอฟต์แวร์ คุณทีป์ชลิต ทองจันทร์ (ผอ.โต๊ด)</p>
            <p>หัวหน้าทีม Web Master | ทีมพัฒนาระบบ</p>
            <p className="font-semibold text-amber-400/90 pt-1">
              จัดการระบบในนาม: ทีป์ชลิต ทองจันทร์
            </p>
          </div>
        </footer>

      </main>
    </div>
  );
}
