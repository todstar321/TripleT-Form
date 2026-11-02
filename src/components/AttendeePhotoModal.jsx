import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, 
  Upload, 
  X, 
  Check, 
  RefreshCw, 
  Sparkles, 
  User, 
  Image as ImageIcon, 
  Loader2, 
  AlertCircle,
  Shirt,
  Smartphone
} from 'lucide-react';
import { uploadToCloudinary } from '../utils/cloudinary';

export default function AttendeePhotoModal({
  isOpen,
  onClose,
  attendee,
  onSavePhoto
}) {
  const [activeMode, setActiveMode] = useState('camera'); // 'camera' | 'upload'
  const [capturedImage, setCapturedImage] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isConnectingCamera, setIsConnectingCamera] = useState(false);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' (back) | 'user' (front)
  const [countdown, setCountdown] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);
  const nativeCameraInputRef = useRef(null);

  // Initialize camera whenever modal opens (fresh capture ready)
  useEffect(() => {
    if (isOpen) {
      setCapturedImage(null);
      setCameraError(null);
      if (activeMode === 'camera') {
        // Small delay to ensure DOM is ready
        const timer = setTimeout(() => {
          startCamera(facingMode);
        }, 120);
        return () => clearTimeout(timer);
      }
    } else {
      stopCamera();
      setCapturedImage(null);
      setCountdown(null);
      setCameraError(null);
    }
    return () => stopCamera();
  }, [isOpen, activeMode]);

  // Start Camera with resilient multi-level fallback
  const startCamera = async (currentFacing = facingMode) => {
    stopCamera();
    setCameraError(null);
    setIsConnectingCamera(true);
    setIsCameraActive(false);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('เบราว์เซอร์นี้ไม่รองรับการเปิดกล้องสด กรุณากดปุ่ม "ถ่ายด้วยกล้องมือถือ" หรือ "เลือกรูปจากเครื่อง" ด้านล่างแทนครับ');
      setIsConnectingCamera(false);
      return;
    }

    let stream = null;
    const constraintList = [
      // 1. Ideal HD constraints with selected facing mode
      { video: { facingMode: { ideal: currentFacing }, width: { ideal: 1280 }, height: { ideal: 1280 } } },
      // 2. Simple facing mode
      { video: { facingMode: currentFacing } },
      // 3. Any available video camera
      { video: true }
    ];

    for (const constraint of constraintList) {
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraint);
        if (stream) break;
      } catch (err) {
        console.warn('Constraint failed, trying next:', constraint, err);
      }
    }

    if (!stream) {
      setCameraError('ไม่สามารถเชื่อมต่อกล้องได้ (อาจยังไม่ได้อนุญาตสิทธิ์เข้าถึงกล้อง) กรุณากดปุ่ม "ถ่ายด้วยกล้องมือถือ" ด้านล่างแทนครับ');
      setIsConnectingCamera(false);
      return;
    }

    streamRef.current = stream;
    const video = videoRef.current;
    if (video) {
      video.srcObject = stream;
      video.setAttribute('playsinline', 'true');
      video.setAttribute('webkit-playsinline', 'true');
      video.muted = true;

      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsCameraActive(true);
            setIsConnectingCamera(false);
          })
          .catch((err) => {
            console.warn('Video play interrupted:', err);
            // Even if autoPlay fails, mark active and attempt user tap
            setIsCameraActive(true);
            setIsConnectingCamera(false);
          });
      } else {
        setIsCameraActive(true);
        setIsConnectingCamera(false);
      }
    } else {
      setIsConnectingCamera(false);
    }
  };

  // Stop Camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setIsConnectingCamera(false);
  };

  // Switch Front/Back Camera
  const handleToggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  // Switch mode (camera vs upload)
  const handleSwitchMode = (mode) => {
    setActiveMode(mode);
    if (mode === 'camera') {
      startCamera(facingMode);
    } else {
      stopCamera();
    }
  };

  // Capture Snapshot from Camera (Square 1:1)
  const handleSnapCountdown = () => {
    setCountdown(3);
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          takeSnapshot();
          return null;
        }
        return prev - 1;
      });
    }, 800);
  };

  const takeSnapshot = () => {
    const video = videoRef.current;
    if (!video) return;

    const canvas = canvasRef.current || document.createElement('canvas');
    const width = video.videoWidth || 720;
    const height = video.videoHeight || 720;
    const size = Math.min(width, height);

    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const startX = (width - size) / 2;
    const startY = (height - size) / 2;

    // Draw square cropped image (mirror if front camera)
    ctx.save();
    if (facingMode === 'user') {
      ctx.translate(size, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, startX, startY, size, size, 0, 0, size, size);
    ctx.restore();

    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(dataUrl);
    stopCamera();
  };

  // Handle File Upload from Device or Native Mobile Camera
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Crop to 1:1 square
        const canvas = document.createElement('canvas');
        const size = Math.min(img.width, img.height);
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        const startX = (img.width - size) / 2;
        const startY = (img.height - size) / 2;
        ctx.drawImage(img, startX, startY, size, size, 0, 0, size, size);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        setCapturedImage(dataUrl);
        stopCamera();
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Save Image to Attendee (with Cloudinary Cloud Upload support)
  const handleSave = async () => {
    if (!capturedImage) return;
    setIsSaving(true);
    try {
      const finalUrl = await uploadToCloudinary(capturedImage, {}, "attendees");
      const urlToSave = finalUrl || capturedImage;
      if (onSavePhoto && attendee) {
        onSavePhoto(urlToSave, attendee.ticketNo);
      }
      stopCamera();
      onClose();
    } catch (err) {
      console.warn("Cloudinary upload fallback to local image:", err);
      if (onSavePhoto && attendee) {
        onSavePhoto(capturedImage, attendee.ticketNo);
      }
      stopCamera();
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || !attendee) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-md bg-slate-900 border border-white/15 rounded-3xl p-4 sm:p-6 text-slate-100 shadow-2xl space-y-3 sm:space-y-4 my-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center space-x-2.5">
            <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <Camera className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-extrabold text-white text-base flex items-center space-x-1.5">
                <span>ถ่ายรูปผู้ร่วมงาน (สี่เหลี่ยมจัตุรัส 1:1)</span>
              </h3>
              <p className="text-xs text-slate-400">
                {attendee.name} {attendee.nickname ? `(${attendee.nickname})` : ''} • <span className="font-mono text-amber-400 font-semibold">{attendee.ticketNo}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Badge: Shirt details or check-in context */}
        {attendee.hasShirt && (
          <div className="px-3 py-1.5 rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-300 text-xs flex items-center justify-between">
            <span className="flex items-center space-x-1.5 font-medium">
              <Shirt className="w-4 h-4 text-teal-400" />
              <span>เสื้อที่ระลึก: ไซส์ <strong>{attendee.shirtSize || 'L'}</strong> ({attendee.shirtGender || 'ชาย'})</span>
            </span>
            {attendee.shirtReceived ? (
              <span className="text-[10px] bg-teal-500/30 text-teal-200 px-2 py-0.5 rounded-full font-bold">✓ รับเสื้อแล้ว</span>
            ) : (
              <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-bold">📦 บันทึกรับเสื้อ</span>
            )}
          </div>
        )}

        {/* Mode Selector Tabs (Live Camera vs Upload File) */}
        {!capturedImage && (
          <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-2xl border border-white/5">
            <button
              type="button"
              onClick={() => handleSwitchMode('camera')}
              className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
                activeMode === 'camera'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>เปิดกล้องถ่ายสด</span>
            </button>
            <button
              type="button"
              onClick={() => handleSwitchMode('upload')}
              className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
                activeMode === 'upload'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>เลือกรูปจากเครื่อง</span>
            </button>
          </div>
        )}

        {/* Viewport: Live Camera / Captured Preview / Upload Box */}
        <div className="relative rounded-2xl overflow-hidden bg-black aspect-square flex items-center justify-center border-2 border-amber-500/30 shadow-inner">
          
          {/* ALWAYS MOUNTED VIDEO ELEMENT TO PREVENT REF DEADLOCK */}
          <video
            ref={videoRef}
            playsInline
            webkit-playsinline="true"
            autoPlay
            muted
            className={`w-full h-full object-cover ${(!capturedImage && activeMode === 'camera' && isCameraActive) ? 'block' : 'hidden'} ${facingMode === 'user' ? '-scale-x-100' : ''}`}
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* 1. Captured Photo Preview */}
          {capturedImage ? (
            <div className="w-full h-full relative">
              <img
                src={capturedImage}
                alt={attendee.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 right-3">
                <span className="px-2.5 py-1 rounded-full bg-emerald-500 text-slate-950 font-bold text-[10px] shadow-lg flex items-center space-x-1">
                  <Check className="w-3 h-3 stroke-[3]" />
                  <span>บันทึกรูปนี้แล้ว</span>
                </span>
              </div>
            </div>
          ) : activeMode === 'camera' ? (
            /* 2. Live Camera Mode Overlays */
            <>
              {isCameraActive ? (
                <>
                  {/* 1:1 Square Frame Guide */}
                  <div className="absolute inset-4 border-2 border-dashed border-amber-400/70 rounded-2xl pointer-events-none flex items-center justify-center">
                    <span className="px-3 py-1 rounded-full bg-black/60 text-amber-300 text-[11px] font-medium backdrop-blur-sm">
                      จัดตำแหน่งใบหน้า / เสื้อผ้าในกรอบ 1:1
                    </span>
                  </div>

                  {/* Switch Front/Back Camera Floating Button */}
                  <button
                    type="button"
                    onClick={handleToggleFacingMode}
                    className="absolute top-3 right-3 px-2.5 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-white text-xs font-semibold backdrop-blur-md border border-white/20 shadow-lg flex items-center space-x-1.5 transition-all active:scale-95 z-10"
                    title="สลับกล้องหน้า / กล้องหลัง"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin-hover" />
                    <span>{facingMode === 'environment' ? 'กล้องหลัง' : 'กล้องหน้า'}</span>
                  </button>

                  {/* Countdown overlay */}
                  {countdown !== null && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center text-amber-400 font-black text-7xl animate-ping z-20">
                      {countdown}
                    </div>
                  )}
                </>
              ) : isConnectingCamera ? (
                <div className="p-4 text-center space-y-3">
                  <div className="w-10 h-10 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-amber-300 font-medium">กำลังเปิดกล้อง...</p>
                  <p className="text-[10px] text-slate-400">กรุณากด &quot;อนุญาต (Allow)&quot; หากมีข้อความขอเข้าถึงกล้อง</p>
                </div>
              ) : (
                <div className="p-5 text-center space-y-3 max-w-xs">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
                    <AlertCircle className="w-6 h-6 text-amber-400" />
                  </div>
                  <p className="text-xs text-amber-200 leading-relaxed font-medium">
                    {cameraError || 'ไม่สามารถเปิดกล้องสดอัตโนมัติได้'}
                  </p>
                  <div className="space-y-2 pt-1">
                    <button
                      type="button"
                      onClick={() => nativeCameraInputRef.current?.click()}
                      className="w-full py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center space-x-1.5 shadow-md shadow-amber-500/25 transition-all"
                    >
                      <Smartphone className="w-4 h-4" />
                      <span>📸 กดเพื่อเปิดแอปกล้องมือถือ</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => startCamera(facingMode)}
                      className="w-full py-2 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium text-xs flex items-center justify-center space-x-1 transition-all"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>ลองเชื่อมต่อกล้องใหม่อีกครั้ง</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* 3. Upload File Box */
            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-full p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-white/5 transition-all space-y-3"
            >
              <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shadow-inner">
                <ImageIcon className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-white">คลิกเพื่อเลือกไฟล์รูปภาพ</p>
                <p className="text-[11px] text-slate-400">รองรับไฟล์ JPG, PNG, WEBP (ระบบจะครอบเป็น 1:1 ให้อัตโนมัติ)</p>
              </div>
            </div>
          )}

        </div>

        {/* Hidden inputs for Native Camera and File Picker */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
        />
        <input
          ref={nativeCameraInputRef}
          type="file"
          accept="image/*"
          capture={facingMode}
          onChange={handleFileUpload}
          className="hidden"
        />

        {/* Action Controls */}
        <div className="space-y-2 pt-1">
          {capturedImage ? (
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => {
                  setCapturedImage(null);
                  if (activeMode === 'camera') startCamera(facingMode);
                }}
                className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-white/10 flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>ถ่ายใหม่ / เปลี่ยนรูป</span>
              </button>

              <button
                type="button"
                disabled={isSaving}
                onClick={handleSave}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/25 flex items-center justify-center space-x-1.5 transition-all disabled:opacity-60 cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>กำลังบันทึก...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>✅ ใช้รูปนี้ (บันทึก)</span>
                  </>
                )}
              </button>
            </div>
          ) : activeMode === 'camera' ? (
            <div className="space-y-2">
              <div className="grid grid-cols-5 gap-2">
                <button
                  type="button"
                  disabled={!isCameraActive || countdown !== null}
                  onClick={handleSnapCountdown}
                  className="col-span-4 py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/25 flex items-center justify-center space-x-2 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Camera className="w-5 h-5" />
                  <span>{countdown !== null ? `กำลังถ่ายใน ${countdown}...` : '📸 กดถ่ายภาพ (นับถอยหลัง 3 วิ)'}</span>
                </button>
                <button
                  type="button"
                  disabled={!isCameraActive || countdown !== null}
                  onClick={takeSnapshot}
                  className="col-span-1 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs border border-white/10 flex items-center justify-center shadow-lg transition-all disabled:opacity-50 cursor-pointer"
                  title="ถ่ายทันทีไม่ต้องรอ 3 วินาที"
                >
                  <span>ถ่ายทันที</span>
                </button>
              </div>

              {/* Direct Native Camera Fallback button */}
              <button
                type="button"
                onClick={() => nativeCameraInputRef.current?.click()}
                className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white font-medium text-xs flex items-center justify-center space-x-1.5 border border-white/10 transition-all cursor-pointer"
              >
                <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                <span>หรือคลิกเพื่อเปิดกล้องมือถือโดยตรง (Native Mobile Camera)</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/25 flex items-center justify-center space-x-2 transition-all cursor-pointer"
            >
              <Upload className="w-5 h-5" />
              <span>เลือกรูปภาพจากมือถือ / คอมพิวเตอร์</span>
            </button>
          )}

          <p className="text-[11px] text-center text-slate-400">
            * รูปถ่ายจะถูกนำไปใช้ในสไลด์โชว์ผู้ได้รับเสื้อ และในการประกวดแต่งกาย
          </p>
        </div>

      </div>
    </div>
  );
}

