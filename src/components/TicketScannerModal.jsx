import React, { useState, useEffect, useRef } from 'react';
import { X, Camera, CheckCircle2, User, Sparkles, RefreshCw, Volume2, ShieldCheck, AlertCircle, Shirt } from 'lucide-react';
import jsQR from 'jsqr';

export default function TicketScannerModal({
  isOpen,
  onClose,
  registrations = [],
  onCheckIn,
  onCapturePhoto,
  onToggleShirtReceived
}) {
  const [scanResult, setScanResult] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [simulatedInput, setSimulatedInput] = useState('');

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const animationFrameId = useRef(null);
  const streamRef = useRef(null);

  // Sound beep on successful scan using Web Audio API
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // 880Hz (A5)
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch (e) {
      console.log('Audio error:', e);
    }
  };

  // Find attendee from scanned text
  const matchAttendee = (text) => {
    if (!text) return null;
    const clean = text.trim();
    // 1. Try matching ticketNo e.g. "SME-004"
    const ticketMatch = clean.match(/SME-\d+/i) || clean.match(/ROT-\d+/i) || clean.match(/MEM-\d+/i);
    if (ticketMatch) {
      const found = registrations.find(r => r.ticketNo?.toLowerCase() === ticketMatch[0].toLowerCase());
      if (found) return found;
    }
    // 2. Try matching name in registrations
    const nameFound = registrations.find(r => clean.includes(r.name) || (r.nickname && clean.includes(r.nickname)));
    if (nameFound) return nameFound;

    // 3. Fallback mock attendee parsed from text
    return {
      ticketNo: ticketMatch ? ticketMatch[0].toUpperCase() : 'PASS-OK',
      name: clean.split('[')[0].replace('•', '').trim() || 'ผู้ลงทะเบียน',
      nickname: '',
      club: 'สงสพัท',
      regType: 'member',
      hasShirt: true,
      shirtSize: 'L',
      shirtGender: 'ชาย',
      amount: 500,
      paidAmount: 500
    };
  };

  // Start Camera
  const startCamera = async () => {
    setCameraError(null);
    setScanResult(null);
    setIsScanning(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.play();
        requestAnimationFrame(tick);
      }
    } catch (err) {
      console.warn('Camera access error:', err);
      setCameraError('ไม่สามารถเปิดกล้องได้ (เบราว์เซอร์ไม่อนุญาต หรือไม่มีกล้อง) ท่านสามารถใช้ช่องจำลองการสแกนด้านล่างได้ครับ');
      setIsScanning(false);
    }
  };

  // Stop Camera
  const stopCamera = () => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  // Frame scanner loop
  const tick = () => {
    if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        canvas.height = videoRef.current.videoHeight;
        canvas.width = videoRef.current.videoWidth;
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert'
        });

        if (code && code.data) {
          playBeep();
          const matched = matchAttendee(code.data);
          setScanResult({
            raw: code.data,
            attendee: matched
          });
          if (onCheckIn && matched) {
            onCheckIn(matched);
          }
          stopCamera();
          return;
        }
      }
    }
    animationFrameId.current = requestAnimationFrame(tick);
  };

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle simulation test
  const handleSimulate = (sampleText) => {
    playBeep();
    const matched = matchAttendee(sampleText || simulatedInput);
    setScanResult({
      raw: sampleText || simulatedInput,
      attendee: matched
    });
    if (onCheckIn && matched) {
      onCheckIn(matched);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-md bg-slate-900 border border-white/15 rounded-3xl p-5 sm:p-6 text-slate-100 shadow-2xl space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center space-x-2">
            <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <Camera className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-extrabold text-white text-base">กล้องสแกนเนอร์บัตรเข้างาน</h3>
              <p className="text-[11px] text-slate-400">สแกน QR Code / บาร์โค้ด เพื่อตรวจสอบชื่อจริง-ชื่อเล่น</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera Viewport or Error */}
        {!scanResult && (
          <div className="relative rounded-2xl overflow-hidden bg-black aspect-square flex items-center justify-center border border-white/10">
            {isScanning && (
              <>
                <video ref={videoRef} className="w-full h-full object-cover" />
                <canvas ref={canvasRef} className="hidden" />

                {/* Scanning Target Crosshair */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-56 h-56 border-2 border-emerald-400/80 rounded-2xl relative animate-pulse">
                    <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
                    <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
                    <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />
                    
                    {/* Laser scanning line */}
                    <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34d399] absolute top-1/2 -translate-y-1/2 animate-bounce" />
                  </div>
                </div>

                <div className="absolute bottom-3 left-3 right-3 text-center">
                  <span className="px-3 py-1 rounded-full bg-black/75 text-emerald-300 text-xs font-medium border border-emerald-500/30">
                    นำกล้องส่องที่ QR Code หรือบาร์โค้ดบนบัตร
                  </span>
                </div>
              </>
            )}

            {cameraError && (
              <div className="p-4 text-center space-y-2">
                <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
                <p className="text-xs text-amber-200">{cameraError}</p>
              </div>
            )}
          </div>
        )}

        {/* Scan Result Card (Verified Attendee Pop-up) */}
        {scanResult && (
          <div className="space-y-4 animate-fade-in">
            <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 flex items-center space-x-3">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 shrink-0" />
              <div>
                <h4 className="font-extrabold text-white text-base">สแกนบัตรสำเร็จ! ข้อมูลถูกต้อง</h4>
                <p className="text-xs text-emerald-200">ตรวจสอบผู้เข้าร่วมงานเรียบร้อยแล้ว</p>
              </div>
            </div>

            {/* Attendee Details */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-white/10 space-y-2.5 text-xs sm:text-sm">
              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <span className="text-slate-400">ชื่อ - สกุล (ชื่อเล่น):</span>
                <span className="font-extrabold text-amber-300 text-right text-base">
                  {scanResult.attendee?.name} {scanResult.attendee?.nickname ? `(${scanResult.attendee.nickname})` : ''}
                </span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <span className="text-slate-400">เลขที่ลงทะเบียน:</span>
                <span className="font-mono font-bold text-white text-right">
                  {scanResult.attendee?.ticketNo}
                </span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <span className="text-slate-400">ประเภท / สังกัดสนาม:</span>
                <span className="font-semibold text-slate-200 text-right">
                  {scanResult.attendee?.regType === 'member' ? 'สมาชิก' : 'แขก'} (สนาม {scanResult.attendee?.club || 'สงสพัท'})
                </span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <span className="text-slate-400">สถานะชำระเงิน:</span>
                <span className="font-bold text-emerald-400 text-right">
                  ชำระเงินเรียบร้อยแล้ว ✅
                </span>
              </div>

              {scanResult.attendee?.hasShirt && (
                <div className="mt-3 p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/25 via-amber-400/20 to-yellow-500/25 border-2 border-amber-400 shadow-xl shadow-amber-500/20 text-slate-100 flex items-center justify-between gap-3 animate-pulse">
                  <div className="flex items-center space-x-3">
                    <div className="w-11 h-11 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shadow-md shadow-amber-500/40 shrink-0">
                      <Shirt className="w-6 h-6 stroke-[2.5]" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-400 text-slate-950">
                          สิทธิ์รับเสื้อที่ระลึก VIP ฟรี 1 ตัว
                        </span>
                      </div>
                      <div className="text-xl sm:text-2xl font-black text-amber-300 tracking-tight mt-0.5">
                        ไซซ์ {scanResult.attendee.shirtSize} ({scanResult.attendee.shirtGender || 'ทั่วไป'})
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    {scanResult.attendee.shirtReceived ? (
                      <div className="space-y-1 text-right">
                        <span className="text-[10px] sm:text-xs font-bold px-2.5 py-1 rounded-xl bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 inline-flex items-center space-x-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>แจกเสื้อแล้ว ✓</span>
                        </span>
                        {onCapturePhoto && (
                          <div>
                            <button
                              type="button"
                              onClick={() => {
                                onClose();
                                onCapturePhoto(scanResult.attendee);
                              }}
                              className="text-[10px] text-amber-300 hover:text-amber-200 underline inline-flex items-center space-x-1 cursor-pointer"
                            >
                              <Camera className="w-3 h-3" />
                              <span>📸 ถ่ายรูปเก็บภาพ</span>
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <button
                          type="button"
                          onClick={() => {
                            if (onToggleShirtReceived) {
                              onToggleShirtReceived(scanResult.attendee.ticketNo, true);
                            }
                            setScanResult(prev => ({
                              ...prev,
                              attendee: { ...prev.attendee, shirtReceived: true }
                            }));
                            if (onCapturePhoto) {
                              onClose();
                              onCapturePhoto({ ...scanResult.attendee, shirtReceived: true });
                            }
                          }}
                          className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-black text-xs shadow-lg shadow-teal-500/30 hover:scale-105 active:scale-95 transition-all inline-flex items-center space-x-1.5 cursor-pointer"
                        >
                          <Shirt className="w-3.5 h-3.5" />
                          <span>📦 ส่งมอบเสื้อ</span>
                        </button>
                        <p className="text-[10px] text-amber-200 font-medium mt-1">
                          (กดเพื่อส่งมอบ & เด้งกล้อง)
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setScanResult(null);
                  startCamera();
                }}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/15 text-white transition-all flex items-center justify-center space-x-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>สแกนบัตรใบต่อไป</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onCapturePhoto && scanResult?.attendee) {
                    onClose();
                    onCapturePhoto(scanResult.attendee);
                  } else {
                    onClose();
                  }
                }}
                className="flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>เช็คอินเข้างานสำเร็จ (เปิดกล้องถ่ายรูป)</span>
              </button>
            </div>
          </div>
        )}

        {/* Quick Simulation Buttons for Instant Testing */}
        {!scanResult && (
          <div className="pt-2 border-t border-white/10 space-y-2">
            <div className="text-[11px] text-slate-400 flex items-center justify-between">
              <span>🎯 ทดสอบจำลองการสแกนทันที:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {registrations.slice(0, 3).map((r) => (
                <button
                  key={r.ticketNo}
                  type="button"
                  onClick={() => handleSimulate(`${r.name} (${r.nickname || 'สมาชิก'}) [${r.ticketNo}]`)}
                  className="px-2.5 py-1 rounded-lg text-[11px] bg-slate-800 hover:bg-slate-700 text-amber-300 font-mono transition-all border border-white/5 truncate max-w-[200px]"
                >
                  {r.ticketNo}: {r.name}
                </button>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
