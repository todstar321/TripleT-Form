import React, { useState, useRef, useEffect } from 'react';
import { X, Crop, ZoomIn, ZoomOut, Check, Upload, Move, RotateCcw } from 'lucide-react';

export default function ImageCropperModal({
  isOpen,
  onClose,
  onCropComplete,
  defaultAspect = 16 / 9,
  title = "ปรับขนาดและตัดรูปภาพ (Image Cropper)"
}) {
  const [imageSrc, setImageSrc] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [aspectRatio, setAspectRatio] = useState(defaultAspect); // width / height

  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const fileInputRef = useRef(null);

  // Reset when opened
  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setAspectRatio(defaultAspect);
    }
  }, [isOpen, defaultAspect]);

  if (!isOpen) return null;

  // Handle local file selection
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setImageSrc(event.target.result);
      setZoom(1);
      setPan({ x: 0, y: 0 });
    };
    reader.readAsDataURL(file);
    e.target.value = null;
  };

  // Dragging logic
  const handleMouseDown = (e) => {
    if (!imageSrc) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Perform canvas crop
  const handleApplyCrop = () => {
    if (!imageSrc || !imageRef.current) return;

    const img = imageRef.current;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Desired output resolution (HD high quality)
    const targetWidth = 1920;
    const targetHeight = Math.round(targetWidth / aspectRatio);
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    // Viewport dimensions in modal (e.g. 500 x 500/aspectRatio)
    const viewportWidth = 480;
    const viewportHeight = 480 / aspectRatio;

    // Scale factor from viewport to full canvas
    const scale = targetWidth / viewportWidth;

    ctx.save();
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, targetWidth, targetHeight);

    // Calculate drawing center & transformed dimensions
    const drawX = (pan.x + viewportWidth / 2) * scale;
    const drawY = (pan.y + viewportHeight / 2) * scale;
    const drawWidth = img.naturalWidth * zoom * (viewportWidth / img.naturalWidth) * scale;
    const drawHeight = img.naturalHeight * zoom * (viewportWidth / img.naturalWidth) * scale;

    ctx.drawImage(
      img,
      drawX - drawWidth / 2,
      drawY - drawHeight / 2,
      drawWidth,
      drawHeight
    );
    ctx.restore();

    const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.92);
    onCropComplete(croppedDataUrl);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-xl bg-slate-900 border border-white/10 rounded-3xl shadow-2xl p-6 text-slate-100 flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <Crop className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">{title}</h3>
              <p className="text-xs text-slate-400">ลากเพื่อขยับตำแหน่ง และเลื่อนซูมเพื่อเลือกส่วนภาพที่ต้องการ</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Aspect Ratio Buttons */}
        <div className="flex items-center space-x-2 mb-3">
          <span className="text-xs text-slate-400">สัดส่วน:</span>
          <button
            type="button"
            onClick={() => { setAspectRatio(16 / 9); setPan({ x: 0, y: 0 }); }}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              Math.abs(aspectRatio - 16 / 9) < 0.05
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            16:9 (แนวนอนมาตรฐาน)
          </button>
          <button
            type="button"
            onClick={() => { setAspectRatio(2.5 / 1); setPan({ x: 0, y: 0 }); }}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              Math.abs(aspectRatio - 2.5 / 1) < 0.05
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            2.5:1 (Banner หน้าปกยาว)
          </button>
          <button
            type="button"
            onClick={() => { setAspectRatio(1); setPan({ x: 0, y: 0 }); }}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              Math.abs(aspectRatio - 1) < 0.05
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            1:1 (จัตุรัส)
          </button>
        </div>

        {/* Cropper Viewport */}
        <div className="flex-1 flex items-center justify-center bg-slate-950 rounded-2xl border border-white/5 overflow-hidden p-2 min-h-[260px] relative">
          {imageSrc ? (
            <div
              className="relative overflow-hidden border-2 border-amber-500 shadow-2xl rounded-xl cursor-grab active:cursor-grabbing select-none"
              style={{
                width: '460px',
                height: `${460 / aspectRatio}px`,
                maxHeight: '340px'
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {/* Target crop frame guideline lines */}
              <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 z-10">
                <div className="border-r border-b border-white/20"></div>
                <div className="border-r border-b border-white/20"></div>
                <div className="border-b border-white/20"></div>
                <div className="border-r border-b border-white/20"></div>
                <div className="border-r border-b border-white/20"></div>
                <div className="border-b border-white/20"></div>
                <div className="border-r border-white/20"></div>
                <div className="border-r border-white/20"></div>
                <div></div>
              </div>

              {/* Movable Image */}
              <img
                ref={imageRef}
                src={imageSrc}
                alt="Source preview"
                className="absolute max-w-none transition-transform pointer-events-none"
                style={{
                  left: '50%',
                  top: '50%',
                  transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) scale(${zoom})`,
                  transformOrigin: 'center center',
                  width: '100%',
                  height: 'auto'
                }}
                draggable={false}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center space-y-3">
              <div className="p-4 rounded-2xl bg-white/5 text-slate-400 border border-white/10">
                <Upload className="w-8 h-8 text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-200">ยังไม่ได้เลือกรูปภาพ</p>
                <p className="text-xs text-slate-400 mt-0.5">กดปุ่มด้านล่างเพื่อเลือกไฟล์รูปภาพจากเครื่องของคุณ (PNG, JPG, WebP)</p>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all shadow-md"
              >
                เลือกรูปภาพจากเครื่อง
              </button>
            </div>
          )}
        </div>

        {/* Controls: Zoom & File change */}
        {imageSrc && (
          <div className="pt-4 space-y-3">
            <div className="flex items-center space-x-3 text-xs text-slate-300">
              <ZoomOut className="w-4 h-4 text-slate-400" />
              <input
                type="range"
                min="0.5"
                max="3"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="flex-1 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
              <ZoomIn className="w-4 h-4 text-slate-400" />
              <span className="font-mono text-[11px] w-10 text-right">{Math.round(zoom * 100)}%</span>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <button
                type="button"
                onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
                className="flex items-center space-x-1 text-slate-400 hover:text-white"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>รีเซ็ตตำแหน่ง</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-amber-400 hover:text-amber-300 font-medium"
              >
                เปลี่ยนไฟล์รูปอื่น
              </button>
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Footer Actions */}
        <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-all"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={handleApplyCrop}
            disabled={!imageSrc}
            className="flex items-center space-x-1.5 px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-40"
          >
            <Check className="w-4 h-4" />
            <span>ยืนยันและใช้งานรูปนี้</span>
          </button>
        </div>

      </div>
    </div>
  );
}
