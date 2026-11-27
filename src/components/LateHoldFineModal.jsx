import React, { useState, useRef, useEffect } from "react";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  X,
  QrCode,
  Banknote,
  RefreshCw,
  UserCheck,
  Clock,
  Loader2
} from "lucide-react";
import { uploadToCloudinary } from "../utils/cloudinary";

// Helper to compress captured image to lightweight JPEG before upload
function compressImageDataUrl(fileOrDataUrl, maxSize = 900, quality = 0.82) {
  return new Promise((resolve) => {
    const processSrc = (src) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxSize || height > maxSize) {
          if (width >= height) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          } else {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => resolve(src);
      img.src = src;
    };

    if (typeof fileOrDataUrl === "string") {
      processSrc(fileOrDataUrl);
    } else {
      const reader = new FileReader();
      reader.onload = (e) => processSrc(e.target.result);
      reader.readAsDataURL(fileOrDataUrl);
    }
  });
}

export default function LateHoldFineModal({
  isOpen,
  attendee,
  fine,
  qrCodeUrl,
  onCompletePaymentAndCheckIn,
  onCancel
}) {
  const [paymentMethod, setPaymentMethod] = useState("qr_slip"); // "qr_slip" | "cash"
  const [proofPreview, setProofPreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLiveCameraOpen, setIsLiveCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState("");

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsLiveCameraOpen(false);
  };

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setProofPreview(null);
      setPaymentMethod("qr_slip");
      setCameraError("");
      setIsUploading(false);
    }
    return () => stopCamera();
  }, [isOpen]);

  const startLiveCamera = async () => {
    setCameraError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      streamRef.current = stream;
      setIsLiveCameraOpen(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 60);
    } catch (err) {
      setCameraError("ไม่สามารถเปิดกล้องสดได้ กรุณากดปุ่ม 'ถ่ายรูปจากกล้องมือถือ' แทน");
      setIsLiveCameraOpen(false);
    }
  };

  const handleCaptureFromLiveCamera = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 800;
    canvas.height = video.videoHeight || 600;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const rawDataUrl = canvas.toDataURL("image/jpeg", 0.85);
    stopCamera();
    const compressed = await compressImageDataUrl(rawDataUrl);
    setProofPreview(compressed);
  };

  const handleFilePicked = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    stopCamera();
    const compressed = await compressImageDataUrl(file);
    setProofPreview(compressed);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleConfirmComplete = async () => {
    if (!proofPreview || isUploading) return;
    setIsUploading(true);
    try {
      const uploadedUrl = await uploadToCloudinary(proofPreview, {}, "fine_proofs");
      onCompletePaymentAndCheckIn({
        fine,
        attendee,
        paymentMethod,
        proofPhotoUrl: uploadedUrl || proofPreview
      });
    } catch (err) {
      onCompletePaymentAndCheckIn({
        fine,
        attendee,
        paymentMethod,
        proofPhotoUrl: proofPreview
      });
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen || !attendee || !fine) return null;

  const bookerDisplay = fine.bookedByName
    ? `${fine.bookedByName}${fine.bookedByNickname ? ` (${fine.bookedByNickname})` : ""}`
    : "ผู้จองล่วงหน้า";

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-white rounded-3xl border-4 border-rose-500 shadow-2xl overflow-hidden my-auto max-h-[94vh] flex flex-col text-slate-900">
        {/* Top Alert Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-rose-700 via-rose-600 to-orange-600 text-white shrink-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center space-x-2.5">
              <div className="w-11 h-11 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 text-amber-200 animate-pulse" />
              </div>
              <div>
                <div className="text-[11px] font-extrabold uppercase tracking-wider text-rose-100">
                  แจ้งเตือนการจองที่นั่งล่วงหน้าเกินกำหนดเวลา
                </div>
                <h3 className="text-base sm:text-lg font-black leading-tight">
                  ท่านได้จองล่วงหน้า {fine.holdDurationMinutes} นาที
                </h3>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                stopCamera();
                onCancel?.();
              }}
              title="ยกเลิก (ยังไม่ลงทะเบียนเข้างาน)"
              className="p-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Fine Message Highlight Box */}
          <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-300 text-center space-y-2">
            <div className="text-sm sm:text-base font-black text-rose-900 leading-snug">
              ท่านไม่สามารถมาตามเวลาได้ — ปรับ{" "}
              <span className="text-2xl sm:text-3xl text-rose-600 font-mono">
                {Number(fine.fineAmount).toLocaleString()}
              </span>{" "}
              บาท
            </div>

            <div className="pt-2 border-t border-rose-200/80 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-left">
              <div className="bg-white rounded-xl p-2 border border-rose-100">
                <span className="text-[10px] font-bold text-slate-400 block">ผู้เข้าร่วมงาน (มาลงทะเบียน):</span>
                <span className="font-black text-slate-900">
                  {attendee.name} {attendee.nickname ? `(${attendee.nickname})` : ""}
                </span>
              </div>
              <div className="bg-white rounded-xl p-2 border border-rose-100">
                <span className="text-[10px] font-bold text-slate-400 block">ผู้จองเก้าอี้ล่วงหน้าให้:</span>
                <span className="font-black text-indigo-700 flex items-center space-x-1">
                  <UserCheck className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{bookerDisplay}</span>
                </span>
              </div>
            </div>

            <div className="flex items-center justify-center space-x-2 text-[11px] font-bold text-rose-700">
              <Clock className="w-3.5 h-3.5" />
              <span>
                เก้าอี้ที่เคยจอง: {fine.tableLabel} • {fine.seatCode} (หมดเวลาแล้ว ถูกคืนเป็นเก้าอี้ว่าง)
              </span>
            </div>
          </div>

          {/* Payment Method Toggle */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPaymentMethod("qr_slip")}
              className={`py-2.5 px-3 rounded-xl border-2 text-xs font-extrabold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                paymentMethod === "qr_slip"
                  ? "border-indigo-500 bg-indigo-50 text-indigo-900 shadow-xs"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              <QrCode className="w-4 h-4 text-indigo-600" />
              <span>สแกนจ่าย QR (ถ่ายสลิป)</span>
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod("cash")}
              className={`py-2.5 px-3 rounded-xl border-2 text-xs font-extrabold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                paymentMethod === "cash"
                  ? "border-emerald-500 bg-emerald-50 text-emerald-900 shadow-xs"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Banknote className="w-4 h-4 text-emerald-600" />
              <span>รับเงินสด (ถ่ายรูปเงินสด)</span>
            </button>
          </div>

          {/* QR Code Display (Shown when QR payment selected) */}
          {paymentMethod === "qr_slip" && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-2">
              <div className="text-xs font-extrabold text-slate-700">
                สแกน QR Code เพื่อชำระค่าปรับ {Number(fine.fineAmount).toLocaleString()} บาท
              </div>
              {qrCodeUrl ? (
                <img
                  src={qrCodeUrl}
                  alt="QR Code ชำระค่าปรับ"
                  className="w-52 h-52 sm:w-56 sm:h-56 object-contain mx-auto rounded-2xl border-2 border-white shadow-md bg-white p-1.5"
                />
              ) : (
                <div className="py-8 px-4 rounded-xl bg-white border border-dashed border-slate-300 text-xs text-slate-500 space-y-1">
                  <QrCode className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="font-bold text-slate-600">ยังไม่ได้อัปโหลดรูป QR Code รับค่าปรับ</p>
                  <p className="text-[11px]">เจ้าของแอปสามารถอัปโหลดได้ในหน้า &ldquo;จัดผังห้อง (Owner)&rdquo;</p>
                </div>
              )}
            </div>
          )}

          {/* Proof Photo Capture Section (Mandatory before completing check-in!) */}
          <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-amber-300 flex items-center space-x-1.5">
                <Camera className="w-4 h-4" />
                <span>
                  {paymentMethod === "qr_slip"
                    ? "ถ่ายรูปสลิปโอนเงินในมือถือของแขก *"
                    : "ถ่ายรูปเงินสดที่รับชำระ *"}
                </span>
              </span>
              {proofPreview && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/25 text-emerald-300 font-bold border border-emerald-400/30">
                  ✓ มีหลักฐานแล้ว
                </span>
              )}
            </div>

            {cameraError && (
              <div className="p-2 rounded-lg bg-rose-500/20 border border-rose-400/40 text-rose-200 text-[11px]">
                {cameraError}
              </div>
            )}

            {/* Live WebRTC Camera View */}
            {isLiveCameraOpen && (
              <div className="space-y-2">
                <div className="relative rounded-2xl overflow-hidden bg-black aspect-[4/3]">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold cursor-pointer"
                  >
                    ปิดกล้อง
                  </button>
                  <button
                    type="button"
                    onClick={handleCaptureFromLiveCamera}
                    className="py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    <span>กดถ่ายภาพ</span>
                  </button>
                </div>
              </div>
            )}

            {/* Captured Proof Preview */}
            {!isLiveCameraOpen && proofPreview && (
              <div className="space-y-2">
                <img
                  src={proofPreview}
                  alt="หลักฐานชำระค่าปรับ"
                  className="w-full max-h-56 object-contain rounded-xl bg-black border border-white/15"
                />
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>ถ่ายรูปใหม่ (มือถือ)</span>
                  </button>
                  <button
                    type="button"
                    onClick={startLiveCamera}
                    className="py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>เปิดกล้องถ่ายใหม่</span>
                  </button>
                </div>
              </div>
            )}

            {/* Capture Buttons when no photo yet */}
            {!isLiveCameraOpen && !proofPreview && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="py-3 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs flex items-center justify-center space-x-1.5 shadow-md cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>
                    {paymentMethod === "qr_slip" ? "📷 ถ่ายรูปสลิปโอนเงิน" : "📷 ถ่ายรูปเงินสด"}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={startLiveCamera}
                  className="py-3 px-4 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white font-bold text-xs flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <Camera className="w-4 h-4 text-amber-300" />
                  <span>เปิดกล้องสดบนหน้าจอ</span>
                </button>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFilePicked}
              className="hidden"
            />
          </div>
        </div>

        {/* Bottom Action Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-2 shrink-0">
          <button
            type="button"
            disabled={!proofPreview || isUploading}
            onClick={handleConfirmComplete}
            className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:from-slate-300 disabled:to-slate-300 disabled:text-slate-500 text-white font-black text-sm sm:text-base shadow-lg transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:cursor-not-allowed"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>กำลังบันทึกหลักฐานและลงทะเบียนเข้า...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                <span>
                  {proofPreview
                    ? "✅ ลงทะเบียนเข้าสำเร็จ"
                    : "กรุณาถ่ายรูปสลิป / เงินสด ก่อนกดลงทะเบียนเข้าสำเร็จ"}
                </span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              stopCamera();
              onCancel?.();
            }}
            className="w-full py-1.5 text-center text-[11px] font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            ยกเลิก (ยังไม่ลงทะเบียนเข้างาน)
          </button>
        </div>
      </div>
    </div>
  );
}
