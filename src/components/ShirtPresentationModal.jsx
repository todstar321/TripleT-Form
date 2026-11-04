import React, { useRef } from 'react';
import { X, Printer, Maximize, Shirt, Sparkles, User, Award } from 'lucide-react';

export default function ShirtPresentationModal({
  isOpen,
  onClose,
  attendees = [],
  eventTitle = "งานสังสรรค์ปีใหม่ SME FAN 2026"
}) {
  const containerRef = useRef(null);

  if (!isOpen) return null;

  // Filter attendees who received shirt (or all shirt eligible if none received yet for preview)
  const shirtAttendees = attendees.filter(r => r.hasShirt && (r.shirtReceived || r.checkedIn));
  const count = shirtAttendees.length;

  // Compute dynamic responsive grid columns & sizing to fill 16:9 sheet
  const getGridConfig = () => {
    if (count <= 2) {
      return {
        cols: 'grid-cols-1 sm:grid-cols-2',
        cardPad: 'p-6 sm:p-8',
        imgSize: 'w-48 h-48 sm:w-64 sm:h-64',
        nameSize: 'text-2xl sm:text-3xl',
        clubSize: 'text-base sm:text-lg',
        badgeSize: 'text-sm px-3.5 py-1.5'
      };
    }
    if (count <= 4) {
      return {
        cols: 'grid-cols-2 sm:grid-cols-2 lg:grid-cols-4',
        cardPad: 'p-4 sm:p-5',
        imgSize: 'w-32 h-32 sm:w-40 sm:h-40',
        nameSize: 'text-lg sm:text-xl',
        clubSize: 'text-xs sm:text-sm',
        badgeSize: 'text-xs px-2.5 py-1'
      };
    }
    if (count <= 6) {
      return {
        cols: 'grid-cols-2 sm:grid-cols-3',
        cardPad: 'p-3.5 sm:p-4',
        imgSize: 'w-28 h-28 sm:w-36 sm:h-36',
        nameSize: 'text-base sm:text-lg',
        clubSize: 'text-xs',
        badgeSize: 'text-xs px-2 py-0.5'
      };
    }
    if (count <= 8) {
      return {
        cols: 'grid-cols-2 sm:grid-cols-4',
        cardPad: 'p-3 sm:p-3.5',
        imgSize: 'w-24 h-24 sm:w-32 sm:h-32',
        nameSize: 'text-sm sm:text-base',
        clubSize: 'text-[11px]',
        badgeSize: 'text-[11px] px-2 py-0.5'
      };
    }
    if (count <= 10) {
      return {
        cols: 'grid-cols-2 sm:grid-cols-5',
        cardPad: 'p-2.5 sm:p-3',
        imgSize: 'w-20 h-20 sm:w-28 sm:h-28',
        nameSize: 'text-xs sm:text-sm',
        clubSize: 'text-[10px]',
        badgeSize: 'text-[10px] px-2 py-0.5'
      };
    }
    if (count <= 15) {
      return {
        cols: 'grid-cols-3 sm:grid-cols-5',
        cardPad: 'p-2 sm:p-2.5',
        imgSize: 'w-16 h-16 sm:w-24 sm:h-24',
        nameSize: 'text-xs',
        clubSize: 'text-[9px]',
        badgeSize: 'text-[9px] px-1.5 py-0.5'
      };
    }
    return {
      cols: 'grid-cols-3 sm:grid-cols-6',
      cardPad: 'p-1.5 sm:p-2',
      imgSize: 'w-14 h-14 sm:w-20 sm:h-20',
      nameSize: 'text-[11px]',
      clubSize: 'text-[8px]',
      badgeSize: 'text-[8px] px-1 py-0.2'
    };
  };

  const grid = getGridConfig();

  // Print function
  const handlePrint = () => {
    window.print();
  };

  // Toggle fullscreen for stage projector
  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.().catch(err => {
        console.warn('Fullscreen error:', err);
      });
    } else {
      document.exitFullscreen?.();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-slate-950/95 backdrop-blur-xl overflow-y-auto print:p-0 print:bg-white print:overflow-visible">
      
      {/* 16:9 Aspect Ratio Master Slide Container */}
      <div 
        ref={containerRef}
        className="w-full max-w-7xl bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/40 border border-amber-500/30 rounded-3xl p-4 sm:p-8 shadow-2xl text-slate-100 flex flex-col justify-between print:border-none print:shadow-none print:w-screen print:h-screen print:rounded-none print:p-6 print:text-black print:bg-white min-h-[580px] aspect-[16/9]"
      >
        
        {/* Top Header Bar (Hidden in Clean Print View) */}
        <div className="flex items-center justify-between border-b border-amber-500/20 pb-3 mb-4 print:border-b-2 print:border-amber-600 print:pb-2">
          
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/25 shrink-0 print:w-8 print:h-8">
              <Shirt className="w-6 h-6 stroke-[2.5] print:w-5 print:h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-black text-base sm:text-xl text-white tracking-tight print:text-black">
                  ทำเนียบผู้ได้รับเสื้อที่ระลึก VIP
                </h2>
                <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 print:bg-amber-100 print:text-amber-800">
                  {count} ท่าน
                </span>
              </div>
              <p className="text-xs text-amber-300/80 print:text-gray-600">
                {eventTitle} • สไลด์นำเสนอบนเวที (อัตราส่วน 16:9 แนวนอน)
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2 print:hidden">
            <button
              type="button"
              onClick={handleToggleFullscreen}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center space-x-1.5 border border-white/10"
              title="เปิดเต็มจอสำหรับโปรเจกเตอร์"
            >
              <Maximize className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">เต็มจอ</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 text-xs font-black transition-all flex items-center space-x-1.5 shadow-md shadow-amber-500/25"
              title="พิมพ์ออกกระดาษหรือบันทึกเป็น PDF แนวนอน 16:9"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>พิมพ์นำเสนอ (16:9)</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Dynamic Responsive 16:9 Grid of Attendees */}
        <div className="flex-1 flex items-center justify-center">
          {count > 0 ? (
            <div className={`w-full grid ${grid.cols} gap-3 sm:gap-4 items-center justify-center`}>
              {shirtAttendees.map((r, idx) => (
                <div
                  key={r.ticketNo || idx}
                  className={`bg-slate-950/70 border border-amber-500/30 rounded-2xl ${grid.cardPad} shadow-xl flex flex-col items-center text-center space-y-2 hover:border-amber-400/60 transition-all print:bg-white print:border-amber-400 print:shadow-none`}
                >
                  {/* Square 1:1 Photo Frame */}
                  <div className={`relative ${grid.imgSize} rounded-2xl overflow-hidden bg-slate-900 border-2 border-amber-400/60 shadow-lg print:border-amber-600 shrink-0`}>
                    {r.shirtPhoto || r.photoUrl || r.costumePhoto ? (
                      <img
                        src={r.shirtPhoto || r.photoUrl || r.costumePhoto}
                        alt={r.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-950 text-slate-600 space-y-1">
                        <User className="w-1/2 h-1/2 text-amber-500/40" />
                        <span className="text-[10px] text-slate-500">รอภาพถ่าย</span>
                      </div>
                    )}

                    {/* VIP Ribbon corner */}
                    <div className="absolute top-1 right-1">
                      <span className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-[9px] font-black shadow">
                        ★
                      </span>
                    </div>
                  </div>

                  {/* Name & Nickname */}
                  <div className="w-full">
                    <div className={`font-black text-white ${grid.nameSize} truncate print:text-black tracking-tight`}>
                      {r.name}
                    </div>
                    {r.nickname && (
                      <div className="text-amber-300 font-bold text-xs truncate print:text-amber-800">
                        ({r.nickname})
                      </div>
                    )}
                  </div>

                  {/* Club / Guest Inviter Details */}
                  <div className={`w-full ${grid.clubSize} text-slate-300 print:text-gray-700 leading-tight`}>
                    {r.regType === 'member' ? (
                      <span className="font-semibold text-indigo-300 print:text-indigo-800">
                        ⛳ สมาชิกสนาม {r.club || "สงสพัท"}
                      </span>
                    ) : (
                      <div className="space-y-0.5">
                        <span className="font-bold text-amber-300 print:text-amber-800">
                          🌟 แขกผู้มีเกียรติ
                        </span>
                        {r.inviter && (
                          <div className="text-[10px] text-slate-400 print:text-gray-600 truncate">
                            ผู้เชิญ: {r.inviter} ({r.inviterClub || r.club || "สงสพัท"})
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Shirt Size Badge */}
                  <div className="pt-0.5">
                    <span className={`inline-flex items-center space-x-1 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black ${grid.badgeSize} shadow-sm print:bg-amber-500 print:text-black`}>
                      <Shirt className="w-3 h-3 stroke-[3]" />
                      <span>ไซซ์ {r.shirtSize} ({r.shirtGender || 'ทั่วไป'})</span>
                    </span>
                  </div>

                </div>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center space-y-3">
              <Shirt className="w-16 h-16 text-amber-400/30 mx-auto" />
              <div className="text-lg font-bold text-white">ยังไม่มีผู้ได้รับเสื้อในขณะนี้</div>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                เมื่อผู้ร่วมงานเช็คอินเข้างานและแอดมินกดปุ่มมอบเสื้อ รายชื่อพร้อมรูปถ่ายจะแสดงบนสไลด์ 16:9 นี้ทันที
              </p>
            </div>
          )}
        </div>

        {/* Footer Bar */}
        <div className="border-t border-amber-500/20 pt-2.5 mt-3 flex items-center justify-between text-[11px] text-slate-400 print:border-t print:text-gray-600">
          <span>สไลด์นำเสนอทางการ • {eventTitle}</span>
          <span className="font-mono text-amber-300 font-bold print:text-black">
            © 2026 Triple T Form • นักพัฒนาซอฟต์แวร์ คุณทีป์ชลิต ทองจันทร์ (ผอ.โต๊ด)
          </span>
        </div>

      </div>

      {/* Embedded Print CSS for 16:9 Landscape Full Page */}
      <style>{`
        @media print {
          @page {
            size: landscape;
            margin: 0;
          }
          body {
            background: white !important;
            color: black !important;
          }
        }
      `}</style>

    </div>
  );
}
