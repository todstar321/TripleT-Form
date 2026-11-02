import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, X, Check, RefreshCw, Sparkles, User, Image as ImageIcon, Loader2 } from 'lucide-react';
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
  const [countdown, setCountdown] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  // Initialize with existing photo if present
  useEffect(() => {
    if (isOpen) {
      setCapturedImage(attendee?.photoUrl || attendee?.costumePhoto || null);
      if (activeMode === 'camera') {
        startCamera();
      }
    } else {
      stopCamera();
      setCapturedImage(null);
      setCountdown(null);
    }
    return () => stopCamera();
  }, [isOpen]);

  // Start Camera
  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'user',
          width: { ideal: 720 },
          height: { ideal: 720 }
        }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsCameraActive(true);
      }
    } catch (err) {
      console.warn('Camera error:', err);
      setCameraError('ไม่สามารถเข้าถึงกล้องได้ กรุณาใช้ตัวเลือก "แนบรูปภาพจากเครื่อง" ด้านล่างแทนครับ');
      setIsCameraActive(false);
    }
  };

  // Stop Camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  // Switch mode
  const handleSwitchMode = (mode) => {
    setActiveMode(mode);
    if (mode === 'camera') {
      startCamera();
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
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');
    
    // Make 1:1 square crop
    const size = Math.min(video.videoWidth || 600, video.videoHeight || 600);
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const startX = ((video.videoWidth || 600) - size) / 2;
    const startY = ((video.videoHeight || 600) - size) / 2;

    // Draw square cropped image
    ctx.drawImage(video, startX, startY, size, size, 0, 0, size, size);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedImage(dataUrl);
    stopCamera();
  };

  // Handle File Upload
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
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setCapturedImage(dataUrl);
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
      // If Cloudinary is configured via .env or settings, upload to cloud folder 'attendees'
      const finalUrl = await uploadToCloudinary(capturedImage, {}, "attendees");
      if (onSavePhoto && attendee) {
        onSavePhoto(attendee.ticketNo, finalUrl);
      }
      stopCamera();
      onClose();
    } catch (err) {
      console.warn("Cloudinary upload fallback to local image:", err);
      if (onSavePhoto && attendee) {
        onSavePhoto(attendee.ticketNo, capturedImage);
      }
      stopCamera();
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || !attendee) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md bg-slate-900 border border-white/15 rounded-3xl p-5 sm:p-6 text-slate-100 shadow-2xl space-y-4 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center space-x-2.5">
            <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <Camera className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-extrabold text-white text-base">
                ถ่ายรูปผู้ร่วมงาน (สี่เหลี่ยมจัตุรัส 1:1)
              </h3>
              <p className="text-xs text-slate-400">
                {attendee.name} {attendee.nickname ? `(${attendee.nickname})` : ''} • {attendee.ticketNo}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs (Camera vs Upload) */}
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
            /* 2. Live Camera Feed */
            <div className="w-full h-full relative flex items-center justify-center">
              {isCameraActive ? (
                <>
                  <video
                    ref={videoRef}
                    playsInline
                    autoPlay
                    muted
                    className="w-full h-full object-cover"
                  />
                  <canvas ref={canvasRef} className="hidden" />

                  {/* 1:1 Square Frame Guide */}
                  <div className="absolute inset-4 border-2 border-dashed border-amber-400/70 rounded-2xl pointer-events-none flex items-center justify-center">
                    <span className="px-3 py-1 rounded-full bg-black/60 text-amber-300 text-[11px] font-medium backdrop-blur-sm">
                      จัดตำแหน่งใบหน้า / เสื้อผ้าในกรอบ 1:1
                    </span>
                  </div>

                  {/* Countdown overlay */}
                  {countdown !== null && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center text-amber-400 font-black text-7xl animate-ping">
                      {countdown}
                    </div>
                  )}
                </>
              ) : (
                <div className="p-4 text-center space-y-2">
                  <Camera className="w-10 h-10 text-slate-600 mx-auto" />
                  <p className="text-xs text-slate-400">
                    {cameraError || 'กำลังเชื่อมต่อกล้อง...'}
                  </p>
                </div>
              )}
            </div>
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
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          )}

        </div>

        {/* Action Controls */}
        <div className="space-y-2 pt-1">
          {capturedImage ? (
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => {
                  setCapturedImage(null);
                  if (activeMode === 'camera') startCamera();
                }}
                className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-white/10 flex items-center justify-center space-x-1.5 transition-all"
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
                    <span>กำลังอัปโหลด...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>ใช้รูปนี้ (บันทึก)</span>
                  </>
                )}
              </button>
            </div>
          ) : activeMode === 'camera' ? (
            <button
              type="button"
              disabled={!isCameraActive || countdown !== null}
              onClick={handleSnapCountdown}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/25 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
            >
              <Camera className="w-5 h-5" />
              <span>{countdown !== null ? `กำลังถ่ายใน ${countdown}...` : '📸 กดถ่ายภาพตอนนี้ (นับถอยหลัง 3 วิ)'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/25 flex items-center justify-center space-x-2 transition-all"
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
