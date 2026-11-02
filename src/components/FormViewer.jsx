import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  Star, 
  Calendar, 
  Send, 
  RotateCcw, 
  Sparkles,
  Database,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { fetchLiveOptions, submitFormToSheets } from '../utils/googleSheets';

export default function FormViewer({ formData, onBackToBuilder }) {
  const settings = formData.settings;
  const isLight = settings.themeMode === 'light';
  const themeColor = settings.themeColor || '#6366f1';
  const displayMode = settings.displayMode || 'classic'; // 'classic' | 'step'

  // State
  const [answers, setAnswers] = useState({});
  const [errors, setErrors] = useState({});
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);
  const [dynamicOptionsMap, setDynamicOptionsMap] = useState({});
  const [loadingOptions, setLoadingOptions] = useState(false);

  // Fetch live options from Google Sheets when form loads
  useEffect(() => {
    const loadSheetsOptions = async () => {
      const sheetsUrl = settings.googleSheetsUrl;
      if (!sheetsUrl) return;

      const dynamicFields = formData.fields.filter(
        f => f.optionsSource === 'google_sheets' && f.sheetColumn
      );
      if (dynamicFields.length === 0) return;

      setLoadingOptions(true);
      const newMap = {};

      for (const field of dynamicFields) {
        try {
          const opts = await fetchLiveOptions(
            sheetsUrl, 
            settings.sheetTabName || "MasterData", 
            field.sheetColumn
          );
          if (opts && opts.length > 0) {
            newMap[field.id] = opts;
          }
        } catch (err) {
          console.warn("Failed fetching live options for field:", field.id, err);
        }
      }

      setDynamicOptionsMap(newMap);
      setLoadingOptions(false);
    };

    loadSheetsOptions();
  }, [formData, settings.googleSheetsUrl, settings.sheetTabName]);

  // Handle single answer change
  const handleInputChange = (fieldId, value) => {
    setAnswers(prev => ({ ...prev, [fieldId]: value }));
    if (errors[fieldId]) {
      setErrors(prev => {
        const copy = { ...prev };
        delete copy[fieldId];
        return copy;
      });
    }
  };

  // Handle checkbox multiple choices
  const handleCheckboxChange = (fieldId, option) => {
    const currentValues = answers[fieldId] || [];
    let updated;
    if (currentValues.includes(option)) {
      updated = currentValues.filter(item => item !== option);
    } else {
      updated = [...currentValues, option];
    }
    handleInputChange(fieldId, updated);
  };

  // Validate form
  const validateField = (field) => {
    if (!field.required) return true;
    const val = answers[field.id];
    if (val === undefined || val === null || val === "") return false;
    if (Array.isArray(val) && val.length === 0) return false;
    return true;
  };

  const validateAll = () => {
    const newErrors = {};
    formData.fields.forEach(field => {
      if (!validateField(field)) {
        newErrors[field.id] = "กรุณากรอกข้อมูลในข้อนี้";
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    if (!validateAll()) {
      // Find first error and scroll to it if classic mode
      if (displayMode === 'classic') {
        const firstErrorId = Object.keys(errors)[0] || formData.fields.find(f => !validateField(f))?.id;
        if (firstErrorId) {
          const el = document.getElementById(`field_container_${firstErrorId}`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await submitFormToSheets(settings.googleSheetsUrl, formData, answers);
      setSubmitResult(res);
      setIsSubmitted(true);

      // Trigger Confetti Celebration!
      try {
        confetti({
          particleCount: 120,
          spread: 70,
          origin: { y: 0.6 },
          colors: [themeColor, '#10b981', '#38bdf8', '#fbbf24', '#f43f5e']
        });
      } catch (err) {
        console.log("Confetti trigger:", err);
      }
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการส่งข้อมูล: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Next / Prev for Step Mode
  const handleNextStep = () => {
    const currentField = formData.fields[currentStep];
    if (currentField && !validateField(currentField)) {
      setErrors(prev => ({ ...prev, [currentField.id]: "กรุณาตอบคำถามนี้ก่อนไปต่อ" }));
      return;
    }

    if (currentStep < formData.fields.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleSubmit();
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  // Keyboard navigation for step mode
  useEffect(() => {
    if (displayMode !== 'step' || isSubmitted) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        // Prevent accidental submit from textarea
        const activeTagName = document.activeElement?.tagName?.toLowerCase();
        if (activeTagName !== 'textarea') {
          e.preventDefault();
          handleNextStep();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [displayMode, currentStep, answers, isSubmitted]);

  // Reset form to answer again
  const handleResetForm = () => {
    setAnswers({});
    setErrors({});
    setIsSubmitted(false);
    setCurrentStep(0);
  };

  // Helper: Get choices for a field (handles dynamic sync)
  const getFieldChoices = (field) => {
    if (field.optionsSource === 'google_sheets' && dynamicOptionsMap[field.id]) {
      return dynamicOptionsMap[field.id];
    }
    return field.options || [];
  };

  // ==========================================
  // Render Success Screen
  // ==========================================
  if (isSubmitted) {
    return (
      <div 
        className="min-h-screen py-16 px-4 flex items-center justify-center relative bg-cover bg-center bg-no-repeat transition-all"
        style={{ backgroundImage: `url(${settings.backgroundImage})` }}
      >
        <div 
          className="absolute inset-0 transition-opacity"
          style={{ 
            backgroundColor: isLight ? '#f8fafc' : '#020617', 
            opacity: (settings.bgOverlayOpacity || 85) / 100 
          }}
        />

        <div className={`relative z-10 w-full max-w-lg rounded-3xl p-8 sm:p-10 text-center shadow-2xl transition-all ${
          settings.glassmorphism 
            ? (isLight ? 'glass-panel-light text-slate-900' : 'glass-panel text-white') 
            : (isLight ? 'bg-white text-slate-900 border border-slate-200' : 'bg-slate-900 text-white border border-white/10')
        }`}>
          {/* Animated Success Icon */}
          <div className="w-20 h-20 rounded-full mx-auto flex items-center justify-center shadow-xl mb-6 animate-bounce"
            style={{ backgroundColor: `${themeColor}20`, border: `2px solid ${themeColor}` }}
          >
            <CheckCircle2 className="w-10 h-10" style={{ color: themeColor }} />
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-3">
            {settings.successTitle || "ลงทะเบียนสำเร็จเรียบร้อย! 🎉"}
          </h2>
          
          <p className="text-sm opacity-80 leading-relaxed max-w-md mx-auto mb-6">
            {settings.successMessage || "เราได้รับข้อมูลของคุณแล้ว ขอบคุณสำหรับการตอบแบบฟอร์มครับ"}
          </p>

          {/* Submission Info Card */}
          <div className={`p-4 rounded-2xl text-xs mb-8 text-left space-y-1.5 ${
            isLight ? 'bg-slate-100 text-slate-600' : 'bg-slate-950/60 text-slate-400 border border-white/5'
          }`}>
            <div className="flex items-center justify-between">
              <span>สถานะ:</span>
              <span className="font-semibold text-emerald-400 flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{submitResult?.status === "simulated" ? "บันทึกในโหมดจำลอง (ยังไม่มีชีต URL)" : "บันทึกเข้า Google Sheets เรียบร้อย"}</span>
              </span>
            </div>
            {submitResult?.timestamp && (
              <div className="flex items-center justify-between">
                <span>บันทึกเมื่อ:</span>
                <span className="font-mono">{submitResult.timestamp}</span>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={handleResetForm}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl text-xs font-semibold flex items-center justify-center space-x-2 text-white shadow-lg transition-transform hover:scale-105"
              style={{ backgroundColor: themeColor }}
            >
              <RotateCcw className="w-4 h-4" />
              <span>ส่งคำตอบอีกครั้ง</span>
            </button>
            
            {onBackToBuilder && (
              <button
                onClick={onBackToBuilder}
                className="w-full sm:w-auto px-6 py-3 rounded-2xl text-xs font-semibold border border-white/10 hover:bg-white/10 transition-all opacity-80 hover:opacity-100"
              >
                กลับไปหน้าออกแบบ
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // Render Input Field Component
  // ==========================================
  const renderFieldInput = (field) => {
    const val = answers[field.id] || "";
    const choices = getFieldChoices(field);
    const hasError = !!errors[field.id];

    switch (field.type) {
      case 'textarea':
        return (
          <textarea
            rows={4}
            value={val}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            placeholder={field.placeholder || "พิมพ์คำตอบของคุณที่นี่..."}
            className={`w-full rounded-2xl p-4 text-sm transition-all resize-none ${
              isLight 
                ? 'bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white' 
                : 'glass-input text-white placeholder-slate-500'
            } ${hasError ? 'border-rose-500 ring-2 ring-rose-500/30' : ''}`}
          />
        );

      case 'radio':
        return (
          <div className="grid grid-cols-1 gap-2.5">
            {choices.map((opt, idx) => {
              const isSelected = val === opt;
              return (
                <label
                  key={idx}
                  onClick={() => handleInputChange(field.id, opt)}
                  className={`group flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-indigo-500 ring-2 ring-indigo-500/40 font-semibold'
                      : isLight 
                        ? 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50' 
                        : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                  }`}
                  style={isSelected ? { borderColor: themeColor } : {}}
                >
                  <div className="flex items-center space-x-3.5">
                    <div 
                      className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                        isSelected ? 'border-transparent shadow-sm' : 'border-slate-500'
                      }`}
                      style={isSelected ? { backgroundColor: themeColor } : {}}
                    >
                      {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                    <span className="text-sm">{opt}</span>
                  </div>
                  {isSelected && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: `${themeColor}40` }}>
                      เลือกแล้ว
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        );

      case 'checkbox':
        return (
          <div className="grid grid-cols-1 gap-2.5">
            {choices.map((opt, idx) => {
              const isChecked = Array.isArray(val) && val.includes(opt);
              return (
                <label
                  key={idx}
                  onClick={() => handleCheckboxChange(field.id, opt)}
                  className={`group flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all ${
                    isChecked
                      ? 'border-indigo-500 ring-2 ring-indigo-500/40 font-semibold'
                      : isLight 
                        ? 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50' 
                        : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                  }`}
                  style={isChecked ? { borderColor: themeColor } : {}}
                >
                  <div className="flex items-center space-x-3.5">
                    <div 
                      className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                        isChecked ? 'border-transparent shadow-sm' : 'border-slate-500'
                      }`}
                      style={isChecked ? { backgroundColor: themeColor } : {}}
                    >
                      {isChecked && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <span className="text-sm">{opt}</span>
                  </div>
                </label>
              );
            })}
          </div>
        );

      case 'dropdown':
        return (
          <div className="relative">
            <select
              value={val}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              className={`w-full rounded-2xl px-4 py-3.5 text-sm appearance-none transition-all cursor-pointer ${
                isLight 
                  ? 'bg-slate-50 border border-slate-300 text-slate-900' 
                  : 'glass-input text-white'
              } ${hasError ? 'border-rose-500' : ''}`}
            >
              <option value="" className="text-slate-500 bg-slate-900">
                -- กรุณาเลือกตัวเลือก --
              </option>
              {choices.map((opt, idx) => (
                <option key={idx} value={opt} className="bg-slate-900 text-white">
                  {opt}
                </option>
              ))}
            </select>
            {field.optionsSource === 'google_sheets' && (
              <div className="mt-1.5 flex items-center space-x-1 text-[11px] text-emerald-400">
                <Database className="w-3 h-3" />
                <span>ตัวเลือกนี้ซิงก์สดจาก Google Sheets</span>
              </div>
            )}
          </div>
        );

      case 'rating': {
        const max = field.maxRating || 5;
        const currentRating = parseInt(val, 10) || 0;
        return (
          <div className="flex items-center space-x-2 py-2">
            {[...Array(max)].map((_, i) => {
              const starNumber = i + 1;
              const isFilled = starNumber <= currentRating;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleInputChange(field.id, starNumber)}
                  className="group p-1.5 transition-transform hover:scale-125 focus:outline-none"
                >
                  <Star 
                    className={`w-8 h-8 transition-colors ${
                      isFilled 
                        ? 'fill-amber-400 text-amber-400 drop-shadow-md' 
                        : 'text-slate-600 hover:text-amber-400'
                    }`} 
                  />
                </button>
              );
            })}
            {currentRating > 0 && (
              <span className="ml-3 text-sm font-semibold opacity-80">
                {currentRating} / {max} คะแนน
              </span>
            )}
          </div>
        );
      }

      case 'date':
        return (
          <input
            type="date"
            value={val}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            className={`w-full rounded-2xl px-4 py-3.5 text-sm transition-all ${
              isLight 
                ? 'bg-slate-50 border border-slate-300 text-slate-900' 
                : 'glass-input text-white'
            } ${hasError ? 'border-rose-500' : ''}`}
          />
        );

      case 'email':
        return (
          <input
            type="email"
            value={val}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            placeholder={field.placeholder || "name@example.com"}
            className={`w-full rounded-2xl px-4 py-3.5 text-sm transition-all ${
              isLight 
                ? 'bg-slate-50 border border-slate-300 text-slate-900' 
                : 'glass-input text-white placeholder-slate-500'
            } ${hasError ? 'border-rose-500' : ''}`}
          />
        );

      default:
        return (
          <input
            type="text"
            value={val}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            placeholder={field.placeholder || "พิมพ์คำตอบของคุณ..."}
            className={`w-full rounded-2xl px-4 py-3.5 text-sm transition-all ${
              isLight 
                ? 'bg-slate-50 border border-slate-300 text-slate-900' 
                : 'glass-input text-white placeholder-slate-500'
            } ${hasError ? 'border-rose-500' : ''}`}
          />
        );
    }
  };

  // ==========================================
  // Render Form Container (Classic vs Step Mode)
  // ==========================================
  return (
    <div 
      className="min-h-screen py-10 px-4 sm:px-6 relative bg-cover bg-center bg-no-repeat bg-fixed transition-all"
      style={{ backgroundImage: `url(${settings.backgroundImage})` }}
    >
      {/* Background Dim Filter Overlay */}
      <div 
        className="fixed inset-0 pointer-events-none transition-opacity"
        style={{ 
          backgroundColor: isLight ? '#f8fafc' : '#020617', 
          opacity: (settings.bgOverlayOpacity || 85) / 100 
        }}
      />

      <div className="relative z-10 max-w-3xl mx-auto">
        
        {/* ==================================================== */}
        {/* 1. CLASSIC DISPLAY MODE (Smooth single-page scroll) */}
        {/* ==================================================== */}
        {displayMode === 'classic' && (
          <div className="space-y-6">
            
            {/* Form Header Card */}
            <div className={`rounded-3xl overflow-hidden shadow-2xl transition-all ${
              settings.glassmorphism 
                ? (isLight ? 'glass-panel-light text-slate-900' : 'glass-panel text-white') 
                : (isLight ? 'bg-white text-slate-900 border border-slate-200' : 'bg-slate-900 text-white border border-white/10')
            }`}>
              {/* Cover Banner */}
              {settings.coverImage && (
                <div className="h-44 sm:h-56 w-full relative overflow-hidden">
                  <img 
                    src={settings.coverImage} 
                    alt="Form Cover" 
                    className="w-full h-full object-cover" 
                  />
                  <div 
                    className="absolute inset-0 opacity-20"
                    style={{ backgroundColor: themeColor }}
                  />
                </div>
              )}

              {/* Title & Info */}
              <div className="p-6 sm:p-8 space-y-3">
                <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold"
                  style={{ backgroundColor: `${themeColor}20`, color: themeColor }}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Triple T Form</span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  {formData.title}
                </h1>

                {formData.description && (
                  <p className="text-sm opacity-80 leading-relaxed whitespace-pre-line">
                    {formData.description}
                  </p>
                )}

                <div className="pt-2 flex items-center justify-between text-xs opacity-60 border-t border-white/10">
                  <span>* จำเป็นต้องกรอก (Required)</span>
                  <span>จำนวนคำถาม {formData.fields.length} ข้อ</span>
                </div>
              </div>
            </div>

            {/* Questions List */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {formData.fields.map((field, idx) => {
                const hasError = !!errors[field.id];

                return (
                  <div
                    key={field.id}
                    id={`field_container_${field.id}`}
                    className={`rounded-3xl p-6 sm:p-7 transition-all duration-200 shadow-xl ${
                      settings.glassmorphism 
                        ? (isLight ? 'glass-panel-light text-slate-900' : 'glass-panel text-white') 
                        : (isLight ? 'bg-white text-slate-900 border border-slate-200' : 'bg-slate-900 text-white border border-white/10')
                    } ${hasError ? 'ring-2 ring-rose-500/50' : 'hover:border-white/30'}`}
                  >
                    {/* Question Header */}
                    <div className="mb-4">
                      <div className="flex items-start justify-between">
                        <label className="text-base font-semibold leading-snug">
                          <span className="opacity-60 text-sm font-mono mr-2">{idx + 1}.</span>
                          {field.label}
                          {field.required && <span className="text-rose-400 ml-1 font-bold">*</span>}
                        </label>
                      </div>

                      {field.description && (
                        <p className="text-xs opacity-70 mt-1 leading-relaxed">
                          {field.description}
                        </p>
                      )}
                    </div>

                    {/* Input Control */}
                    <div>
                      {renderFieldInput(field)}
                    </div>

                    {/* Error message */}
                    {hasError && (
                      <div className="mt-2 text-xs text-rose-400 font-medium flex items-center space-x-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{errors[field.id]}</span>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Submit Button Card */}
              <div className="pt-4 flex items-center justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-8 py-4 rounded-2xl text-sm font-bold text-white shadow-2xl flex items-center space-x-2 transition-all hover:scale-105 disabled:opacity-50"
                  style={{ backgroundColor: themeColor }}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>กำลังส่งข้อมูล...</span>
                    </>
                  ) : (
                    <>
                      <span>{settings.submitButtonText || "ส่งข้อมูลลงทะเบียน"}</span>
                      <Send className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ==================================================== */}
        {/* 2. STEP-BY-STEP MODE (Interactive Typeform style)   */}
        {/* ==================================================== */}
        {displayMode === 'step' && formData.fields.length > 0 && (
          <div className="space-y-6">
            
            {/* Step Progress Bar */}
            <div className={`p-4 rounded-2xl backdrop-blur-xl shadow-lg flex items-center justify-between ${
              settings.glassmorphism ? 'glass-panel text-white' : 'bg-slate-900 text-white border border-white/10'
            }`}>
              <div className="flex items-center space-x-3">
                <span className="text-xs font-mono opacity-80">
                  ข้อ {currentStep + 1} จาก {formData.fields.length}
                </span>
                <div className="w-32 sm:w-48 h-2 rounded-full bg-white/10 overflow-hidden">
                  <div 
                    className="h-full transition-all duration-300 rounded-full"
                    style={{ 
                      width: `${((currentStep + 1) / formData.fields.length) * 100}%`,
                      backgroundColor: themeColor
                    }}
                  />
                </div>
              </div>

              <span className="text-xs font-semibold opacity-70">
                {Math.round(((currentStep + 1) / formData.fields.length) * 100)}%
              </span>
            </div>

            {/* Active Question Card */}
            {(() => {
              const field = formData.fields[currentStep];
              const hasError = !!errors[field.id];
              const isLastStep = currentStep === formData.fields.length - 1;

              return (
                <div className={`rounded-3xl p-8 sm:p-12 shadow-2xl transition-all ${
                  settings.glassmorphism 
                    ? (isLight ? 'glass-panel-light text-slate-900' : 'glass-panel text-white') 
                    : (isLight ? 'bg-white text-slate-900 border border-slate-200' : 'bg-slate-900 text-white border border-white/10')
                }`}>
                  
                  {/* Step Question Title */}
                  <div className="mb-6 space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md"
                        style={{ backgroundColor: `${themeColor}20`, color: themeColor }}
                      >
                        คำถาม {currentStep + 1}
                      </span>
                      {field.required && (
                        <span className="text-xs text-rose-400 font-semibold">*จำเป็น</span>
                      )}
                    </div>

                    <h2 className="text-xl sm:text-2xl font-bold leading-tight">
                      {field.label}
                    </h2>

                    {field.description && (
                      <p className="text-sm opacity-70 leading-relaxed">
                        {field.description}
                      </p>
                    )}
                  </div>

                  {/* Input Element */}
                  <div className="py-2">
                    {renderFieldInput(field)}
                  </div>

                  {/* Error Notification */}
                  {hasError && (
                    <div className="mt-3 text-xs text-rose-400 font-medium flex items-center space-x-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{errors[field.id]}</span>
                    </div>
                  )}

                  {/* Navigation Controls */}
                  <div className="mt-10 pt-6 border-t border-white/10 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={handlePrevStep}
                      disabled={currentStep === 0}
                      className="px-4 py-2.5 rounded-xl text-xs font-medium flex items-center space-x-1.5 opacity-60 hover:opacity-100 disabled:opacity-20 transition-all"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>ย้อนกลับ</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleNextStep}
                      disabled={isSubmitting}
                      className="px-6 py-3 rounded-2xl text-xs font-bold text-white shadow-xl flex items-center space-x-2 transition-transform hover:scale-105"
                      style={{ backgroundColor: themeColor }}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>กำลังส่งข้อมูล...</span>
                        </>
                      ) : isLastStep ? (
                        <>
                          <span>{settings.submitButtonText || "ส่งข้อมูลลงทะเบียน"}</span>
                          <Send className="w-4 h-4" />
                        </>
                      ) : (
                        <>
                          <span>ถัดไป</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>

                  {/* Keyboard hint */}
                  <div className="mt-4 text-center">
                    <span className="text-[11px] opacity-40">
                      กดปุ่ม <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono text-[10px]">Enter ↵</kbd> เพื่อไปยังข้อถัดไป
                    </span>
                  </div>

                </div>
              );
            })()}

          </div>
        )}

      </div>
    </div>
  );
}
