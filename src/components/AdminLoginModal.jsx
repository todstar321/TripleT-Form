import React, { useState } from 'react';
import { Lock, Mail, Phone, ShieldCheck, X, ArrowRight, UserCheck, KeyRound } from 'lucide-react';

export default function AdminLoginModal({
  isOpen,
  onClose,
  adminUsers = [],
  onLoginSuccess
}) {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const handleLogin = (e) => {
    if (e) e.preventDefault();
    setErrorMsg("");

    const cleanInputEmail = email.trim().toLowerCase();
    const cleanInputPhone = phone.replace(/\D/g, "");

    const foundUser = adminUsers.find(u => {
      const uEmail = u.email.trim().toLowerCase();
      const uPhone = u.phone.replace(/\D/g, "");
      return uEmail === cleanInputEmail && uPhone === cleanInputPhone;
    });

    if (foundUser) {
      onLoginSuccess(foundUser);
      onClose();
    } else {
      setErrorMsg("อีเมลหรือรหัสผ่าน (เบอร์โทรศัพท์) ไม่ถูกต้อง");
    }
  };

  // Quick switch for testing
  const handleQuickLogin = (roleName) => {
    const user = adminUsers.find(u => u.role === roleName) || adminUsers[0];
    if (user) {
      onLoginSuccess(user);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-slate-900 border border-white/15 rounded-3xl p-6 sm:p-8 text-slate-100 shadow-2xl space-y-6">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/10">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-bold text-white">เข้าสู่ระบบแอดมิน (Admin Portal)</h3>
          <p className="text-xs text-slate-400">
            ล็อกอินตามสิทธิ์ (เจ้าของ, ผู้จัดการ, หรือแอดมิน)
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              อีเมลผู้ใช้งาน (Username)
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="เช่น teepchalit@smefan.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs bg-slate-950 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              รหัสผ่าน (เบอร์โทรศัพท์มือถือ)
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="เช่น 081-234-5678"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs bg-slate-950 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs text-center">
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center space-x-2"
          >
            <span>เข้าสู่ระบบ</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Quick Login Presets for testing */}
        <div className="pt-4 border-t border-white/10 space-y-2">
          <span className="text-[11px] text-slate-400 block text-center">
            ทางลัดทดสอบเข้าสู่ระบบตามสิทธิ์ต่างๆ:
          </span>
          <div className="grid grid-cols-3 gap-2 text-[10px]">
            <button
              type="button"
              onClick={() => handleQuickLogin('owner')}
              className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 transition-all font-bold"
            >
              1. สิทธิ์เจ้าของ (Owner)
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('manager')}
              className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20 transition-all font-bold"
            >
              2. สิทธิ์ผู้จัดการ (Manager)
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('admin')}
              className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20 transition-all font-bold"
            >
              3. สิทธิ์แอดมิน (Staff)
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
