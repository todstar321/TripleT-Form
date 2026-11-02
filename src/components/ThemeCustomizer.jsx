import React from 'react';
import { themePresets } from '../data/defaultForm';
import { 
  Palette, 
  Image as ImageIcon, 
  Layers, 
  Sparkles, 
  Sliders, 
  Sun, 
  Moon, 
  Check, 
  LayoutList, 
  Presentation,
  UploadCloud
} from 'lucide-react';

const stockCovers = [
  { name: "Tech Conference", url: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1600&q=80" },
  { name: "Cyber Matrix", url: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1600&q=80" },
  { name: "Cosmic Neon", url: "https://images.unsplash.com/photo-1534972195531-a756b1126f24?auto=format&fit=crop&w=1600&q=80" },
  { name: "Digital Abstract", url: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1600&q=80" },
  { name: "Executive Business", url: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1600&q=80" },
  { name: "Sunset Horizon", url: "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1600&q=80" }
];

const stockWallpapers = [
  { name: "Circuit Grid", url: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1920&q=80" },
  { name: "Deep Galaxy", url: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1920&q=80" },
  { name: "Global Network", url: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1920&q=80" },
  { name: "Dark Marble", url: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1920&q=80" },
  { name: "Aurora Gradient", url: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=1920&q=80" },
  { name: "Clean Mesh", url: "https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&w=1920&q=80" }
];

const colorPalette = [
  { name: "Indigo", hex: "#6366f1" },
  { name: "Cyan", hex: "#06b6d4" },
  { name: "Emerald", hex: "#10b981" },
  { name: "Amber", hex: "#f59e0b" },
  { name: "Rose", hex: "#f43f5e" },
  { name: "Violet", hex: "#8b5cf6" },
  { name: "Sky Blue", hex: "#3b82f6" },
  { name: "Fuchsia", hex: "#d946ef" }
];

export default function ThemeCustomizer({ formData, setFormData }) {
  const settings = formData.settings;

  const updateSetting = (key, value) => {
    setFormData(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        [key]: value
      }
    }));
  };

  const applyPreset = (preset) => {
    setFormData(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        themeColor: preset.themeColor,
        themeMode: preset.themeMode,
        coverImage: preset.coverImage,
        backgroundImage: preset.backgroundImage,
        bgOverlayOpacity: preset.bgOverlayOpacity,
        glassmorphism: preset.glassmorphism
      }
    }));
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
      <div className="space-y-8">
        {/* Header */}
        <div className="border-b border-white/10 pb-5">
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-3">
            <Palette className="w-7 h-7 text-indigo-400" />
            <span>ปรับแต่งรูปลักษณ์และธีม (Design & Themes)</span>
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            เปลี่ยนแบบฟอร์มธรรมดาให้กลายเป็นหน้าลงทะเบียนระดับดิจิทัล ด้วยดีไซน์ที่คุณคัสตอมได้ทุกจุด
          </p>
        </div>

        {/* 1. Theme Presets */}
        <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
          <h3 className="text-base font-semibold text-white flex items-center space-x-2 mb-4">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <span>ธีมสำเร็จรูปยอดนิยม (Theme Presets)</span>
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {themePresets.map((preset) => {
              const isSelected = settings.themeColor === preset.themeColor && settings.backgroundImage === preset.backgroundImage;
              return (
                <button
                  key={preset.id}
                  onClick={() => applyPreset(preset)}
                  className={`group relative overflow-hidden rounded-xl border p-3 text-left transition-all ${
                    isSelected 
                      ? 'border-indigo-500 ring-2 ring-indigo-500/50 bg-white/10 shadow-lg'
                      : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                  }`}
                >
                  <div className="h-14 rounded-lg overflow-hidden relative mb-2">
                    <img 
                      src={preset.coverImage} 
                      alt={preset.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                    />
                    <div 
                      className="absolute inset-0 opacity-40" 
                      style={{ backgroundColor: preset.themeColor }}
                    />
                    <div 
                      className="absolute bottom-1 right-1 w-4 h-4 rounded-full border border-white/40 shadow-sm"
                      style={{ backgroundColor: preset.themeColor }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-200 truncate">{preset.name}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Form Display Mode */}
        <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
          <h3 className="text-base font-semibold text-white flex items-center space-x-2 mb-4">
            <Layers className="w-5 h-5 text-indigo-400" />
            <span>โหมดการตอบแบบฟอร์ม (Form Experience)</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => updateSetting('displayMode', 'classic')}
              className={`p-4 rounded-xl border text-left flex items-start space-x-4 transition-all ${
                settings.displayMode === 'classic'
                  ? 'border-indigo-500 bg-indigo-500/10 ring-2 ring-indigo-500/40 text-white'
                  : 'border-white/10 bg-white/5 hover:bg-white/10 text-slate-300'
              }`}
            >
              <div className="p-2.5 rounded-lg bg-indigo-500/20 text-indigo-400">
                <LayoutList className="w-6 h-6" />
              </div>
              <div>
                <div className="font-semibold text-sm">Classic Scroll Flow</div>
                <div className="text-xs text-slate-400 mt-1">
                  แสดงคำถามเรียงต่อกันในหน้าเดียว ผู้ตอบสามารถเลื่อนอ่านและกรอกได้อย่างคุ้นเคยและเป็นระเบียบ
                </div>
              </div>
            </button>

            <button
              onClick={() => updateSetting('displayMode', 'step')}
              className={`p-4 rounded-xl border text-left flex items-start space-x-4 transition-all ${
                settings.displayMode === 'step'
                  ? 'border-indigo-500 bg-indigo-500/10 ring-2 ring-indigo-500/40 text-white'
                  : 'border-white/10 bg-white/5 hover:bg-white/10 text-slate-300'
              }`}
            >
              <div className="p-2.5 rounded-lg bg-purple-500/20 text-purple-400">
                <Presentation className="w-6 h-6" />
              </div>
              <div>
                <div className="font-semibold text-sm">Interactive Step Card (Typeform Style)</div>
                <div className="text-xs text-slate-400 mt-1">
                  โฟกัสทีละคำถาม พร้อมปุ่ม Next และแอนิเมชันเลื่อนเปลี่ยนข้อ เพิ่มความน่าสนใจและอัตราการกรอกสำเร็จ
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* 3. Theme Colors & Mode */}
        <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
          <h3 className="text-base font-semibold text-white flex items-center space-x-2 mb-4">
            <Sliders className="w-5 h-5 text-indigo-400" />
            <span>โทนสีหลักและโหมดการแสดงผล (Color & Style)</span>
          </h3>
          
          <div className="space-y-6">
            {/* Color Swatches */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-2">
                สีเน้นหลัก (Accent Color)
              </label>
              <div className="flex flex-wrap items-center gap-3">
                {colorPalette.map(color => (
                  <button
                    key={color.hex}
                    onClick={() => updateSetting('themeColor', color.hex)}
                    className="group relative flex items-center justify-center transition-transform hover:scale-110"
                    title={color.name}
                  >
                    <div 
                      className={`w-9 h-9 rounded-xl shadow-md transition-all ${
                        settings.themeColor === color.hex ? 'ring-4 ring-white/40 scale-105' : ''
                      }`}
                      style={{ backgroundColor: color.hex }}
                    />
                    {settings.themeColor === color.hex && (
                      <Check className="w-4 h-4 text-white absolute drop-shadow-md" />
                    )}
                  </button>
                ))}
                
                {/* Custom Color Input */}
                <div className="flex items-center space-x-2 ml-2 pl-3 border-l border-white/10">
                  <input
                    type="color"
                    value={settings.themeColor}
                    onChange={(e) => updateSetting('themeColor', e.target.value)}
                    className="w-9 h-9 rounded-lg bg-transparent cursor-pointer border border-white/20"
                  />
                  <span className="text-xs font-mono text-slate-400">{settings.themeColor}</span>
                </div>
              </div>
            </div>

            {/* Dark / Light Mode */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">
                  โหมดแสง (Mode)
                </label>
                <div className="inline-flex rounded-xl bg-slate-950 p-1 border border-white/10">
                  <button
                    onClick={() => updateSetting('themeMode', 'dark')}
                    className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      settings.themeMode === 'dark' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Moon className="w-3.5 h-3.5" />
                    <span>Dark Tech</span>
                  </button>
                  <button
                    onClick={() => updateSetting('themeMode', 'light')}
                    className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      settings.themeMode === 'light' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Sun className="w-3.5 h-3.5" />
                    <span>Light Clean</span>
                  </button>
                </div>
              </div>

              {/* Glassmorphism Toggle */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">
                  เอฟเฟกต์กระจกฝ้า (Glassmorphism)
                </label>
                <button
                  onClick={() => updateSetting('glassmorphism', !settings.glassmorphism)}
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                    settings.glassmorphism
                      ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
                      : 'bg-white/5 border-white/10 text-slate-400'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{settings.glassmorphism ? 'เปิดใช้งาน Glass Effect' : 'ปิด Glass Effect (Solid)'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Cover Banner Settings */}
        <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
          <h3 className="text-base font-semibold text-white flex items-center space-x-2 mb-4">
            <ImageIcon className="w-5 h-5 text-indigo-400" />
            <span>ภาพหน้าปกหัวฟอร์ม (Header Cover Image)</span>
          </h3>

          <div className="space-y-4">
            {/* Live Preview of Cover */}
            <div className="relative h-36 rounded-xl overflow-hidden border border-white/10">
              {settings.coverImage ? (
                <img 
                  src={settings.coverImage} 
                  alt="Cover preview" 
                  className="w-full h-full object-cover" 
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-slate-950 text-slate-500 text-xs">
                  ไม่มีภาพหน้าปก
                </div>
              )}
            </div>

            {/* Quick Cover Presets */}
            <div>
              <span className="text-xs text-slate-400 block mb-2">เลือกจากภาพตัวอย่างยอดนิยม:</span>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {stockCovers.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => updateSetting('coverImage', item.url)}
                    className={`h-12 rounded-lg overflow-hidden border transition-all ${
                      settings.coverImage === item.url ? 'ring-2 ring-indigo-500 border-indigo-500' : 'border-white/10 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            {/* Custom URL Input */}
            <div className="pt-2">
              <label className="block text-xs font-medium text-slate-300 mb-1">
                หรือวาง URL รูปภาพหน้าปกของคุณเอง:
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={settings.coverImage || ""}
                  onChange={(e) => updateSetting('coverImage', e.target.value)}
                  placeholder="https://example.com/banner.jpg"
                  className="flex-1 px-3 py-2 rounded-xl text-xs bg-slate-950/80 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                {settings.coverImage && (
                  <button
                    onClick={() => updateSetting('coverImage', '')}
                    className="px-3 py-2 rounded-xl text-xs bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition-all"
                  >
                    ลบรูปปก
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 5. Background Wallpaper Settings */}
        <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
          <h3 className="text-base font-semibold text-white flex items-center space-x-2 mb-4">
            <UploadCloud className="w-5 h-5 text-indigo-400" />
            <span>ภาพพื้นหลังฉากหลัง (Background Wallpaper)</span>
          </h3>

          <div className="space-y-4">
            {/* Quick Wallpaper Presets */}
            <div>
              <span className="text-xs text-slate-400 block mb-2">เลือกฉากหลัง Futuristic & Gradient:</span>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {stockWallpapers.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => updateSetting('backgroundImage', item.url)}
                    className={`h-12 rounded-lg overflow-hidden border transition-all ${
                      settings.backgroundImage === item.url ? 'ring-2 ring-indigo-500 border-indigo-500' : 'border-white/10 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Background URL */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                หรือวาง URL ภาพฉากหลังที่คุณชอบ:
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={settings.backgroundImage || ""}
                  onChange={(e) => updateSetting('backgroundImage', e.target.value)}
                  placeholder="https://example.com/wallpaper.jpg"
                  className="flex-1 px-3 py-2 rounded-xl text-xs bg-slate-950/80 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                {settings.backgroundImage && (
                  <button
                    onClick={() => updateSetting('backgroundImage', '')}
                    className="px-3 py-2 rounded-xl text-xs bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition-all"
                  >
                    ลบพื้นหลัง
                  </button>
                )}
              </div>
            </div>

            {/* Overlay Darkness Slider */}
            <div className="pt-2">
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>ความทึบของแผ่นฟิลเตอร์มืดด้านหลัง (Background Overlay)</span>
                <span className="font-mono text-indigo-400">{settings.bgOverlayOpacity || 85}%</span>
              </div>
              <input
                type="range"
                min="30"
                max="95"
                value={settings.bgOverlayOpacity || 85}
                onChange={(e) => updateSetting('bgOverlayOpacity', parseInt(e.target.value, 10))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                ยิ่งปรับสูง ตัวหนังสือและเนื้อหาฟอร์มจะยิ่งอ่านง่าย คมชัดยิ่งขึ้น
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
