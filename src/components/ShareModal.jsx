import React, { useState } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  QrCode, 
  Code, 
  Share2, 
  ExternalLink,
  Smartphone,
  Send
} from 'lucide-react';

export default function ShareModal({ isOpen, onClose, formData, onSwitchToPreview }) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [activeTab, setActiveTab] = useState('link'); // 'link' | 'qr' | 'embed'

  if (!isOpen) return null;

  // Clean form URL for attendees (without any admin query params)
  const currentUrl = window.location.origin + window.location.pathname;
  const embedCode = `<iframe src="${currentUrl}" width="100%" height="800" frameborder="0" style="border:none;border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,0.3);" allow="camera; microphone; autoplay; encrypted-media;"></iframe>`;

  // Generate lightweight QR Code image URL via public QR API
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(currentUrl)}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyEmbed = () => {
    navigator.clipboard.writeText(embedCode);
    setCopiedEmbed(true);
    setTimeout(() => setCopiedEmbed(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-lg bg-slate-900 border border-white/10 rounded-3xl shadow-2xl p-6 sm:p-8 text-slate-100">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Share2 className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">แชร์แบบฟอร์มลงทะเบียน</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              ส่งต่อแบบฟอร์มให้ผู้ลงทะเบียนได้ทุกช่องทาง
            </p>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex border-b border-white/10 pb-3 mb-6 space-x-2">
          <button
            onClick={() => setActiveTab('link')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              activeTab === 'link' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>ลิงก์ส่งต่อ</span>
          </button>

          <button
            onClick={() => setActiveTab('qr')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              activeTab === 'qr' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>QR Code</span>
          </button>

          <button
            onClick={() => setActiveTab('embed')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              activeTab === 'embed' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>โค้ดฝังเว็บ (Embed)</span>
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'link' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                ลิงก์สำหรับส่งให้ผู้กรอกแบบฟอร์ม (Form URL)
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  readOnly
                  value={currentUrl}
                  className="flex-1 px-3 py-2.5 rounded-xl text-xs bg-slate-950 border border-white/10 text-slate-300 font-mono select-all focus:outline-none"
                />
                <button
                  onClick={handleCopyLink}
                  className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition-all shrink-0"
                >
                  {copiedLink ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedLink ? 'คัดลอกแล้ว!' : 'คัดลอก'}</span>
                </button>
              </div>

              {/* Clean Form Mode Notice */}
              <div className="mt-2.5 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-start space-x-2.5">
                <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold">โหมดสำหรับสมาชิกทั่วไป (Public Member View):</span>
                  <p className="text-[11px] text-emerald-200/80 leading-relaxed">
                    ลิงก์นี้ปลอดภัย 100% สำหรับส่งให้สมาชิก สมาชิกจะเห็นเฉพาะแบบฟอร์มลงทะเบียน โดยปุ่มแก้ไขฟอร์มและแดชบอร์ด Owner จะถูกซ่อนทั้งหมด สมาชิกจะไม่สามารถแก้ไขข้อมูลหรือเข้าถึงระบบหลังบ้านได้ครับ
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Share Links */}
            <div className="pt-2">
              <span className="text-xs text-slate-400 block mb-2">แชร์ด่วนผ่านช่องทางต่างๆ:</span>
              <div className="grid grid-cols-2 gap-2">
                <a
                  href={`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(currentUrl)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center space-x-2 p-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/20 text-xs font-medium transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>แชร์ไปยัง LINE</span>
                </a>
                <a
                  href={`mailto:?subject=${encodeURIComponent(formData.title)}&body=${encodeURIComponent("ขอเชิญกรอกแบบฟอร์มลงทะเบียน: " + currentUrl)}`}
                  className="flex items-center justify-center space-x-2 p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 text-xs font-medium transition-all"
                >
                  <span>ส่งทาง Email</span>
                </a>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'qr' && (
          <div className="flex flex-col items-center justify-center py-4 space-y-4">
            <div className="p-4 bg-white rounded-2xl shadow-xl">
              <img src={qrUrl} alt="Form QR Code" className="w-48 h-48" />
            </div>
            <p className="text-xs text-slate-400 text-center max-w-xs">
              สแกนด้วยสมาร์ตโฟนเพื่อเปิดหน้าแบบฟอร์มลงทะเบียนได้ทันที
            </p>
            <a
              href={qrUrl}
              download="Triple-T-Form-QR.png"
              target="_blank"
              rel="noreferrer"
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-white border border-white/10 transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>ดาวน์โหลดภาพ QR Code</span>
            </a>
          </div>
        )}

        {activeTab === 'embed' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                HTML iFrame Code (สำหรับนำไปฝังในเว็บไซต์ของคุณ)
              </label>
              <textarea
                readOnly
                rows={4}
                value={embedCode}
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-950 border border-white/10 text-slate-300 font-mono select-all focus:outline-none"
              />
            </div>
            <button
              onClick={handleCopyEmbed}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition-all"
            >
              {copiedEmbed ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
              <span>{copiedEmbed ? 'คัดลอกโค้ดเรียบร้อย!' : 'คัดลอกโค้ด iFrame'}</span>
            </button>
          </div>
        )}

        {/* Footer info */}
        <div className="mt-8 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
          <span>รองรับการแสดงผลทุกขนาดหน้าจอ 100%</span>
          <button
            onClick={() => {
              onClose();
              onSwitchToPreview();
            }}
            className="text-indigo-400 hover:text-indigo-300 font-medium flex items-center space-x-1"
          >
            <span>ทดลองกรอกหน้าจริง</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>

      </div>
    </div>
  );
}
