import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, RefreshCw, Upload, Sparkles, AlertCircle, Check, Eye } from 'lucide-react';
import { sounds } from '../utils/soundEffects.ts';

interface CameraBoothProps {
  onPhotoCaptured: (dataUrl: string) => void;
  isAnalyzing?: boolean;
}

// Built-in sample portraits if camera is unavailable or user wants an instant preview
const SAMPLE_PORTRAITS = [
  {
    name: 'Eleanor (Classic Portrait)',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
    eraHint: 'Ideal for 1920s or Renaissance',
  },
  {
    name: 'Julian (Dapper Expression)',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80',
    eraHint: 'Ideal for Victorian or Speakeasy',
  },
  {
    name: 'Amina (Regal Demeanor)',
    url: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=600&q=80',
    eraHint: 'Ideal for Egypt or Renaissance',
  },
];

export const CameraBooth: React.FC<CameraBoothProps> = ({ onPhotoCaptured, isAnalyzing }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [flashActive, setFlashActive] = useState<boolean>(false);
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [multiShotCount, setMultiShotCount] = useState<number>(0);
  const [isMultiShotMode, setIsMultiShotMode] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Start live webcam stream
  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 960 },
          facingMode: 'user',
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err: unknown) {
      console.warn('Camera access denied or unavailable:', err);
      setCameraError(
        'Camera is unavailable or permission was declined. You can upload any photo or choose a sample portrait below.'
      );
      setCameraActive(false);
    }
  }, []);

  // Stop camera stream on unmount
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  useEffect(() => {
    // Attempt camera start on mount
    startCamera();
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  // Execute snapshot capture from video feed
  const captureFrame = useCallback(() => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Mirror image for natural selfie feel
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setCapturedPreview(dataUrl);

    // Audio & flash animation
    sounds.playFlash();
    sounds.playShutter();
    setFlashActive(true);
    setTimeout(() => setFlashActive(false), 220);

    return dataUrl;
  }, []);

  // Initiate countdown timer
  const triggerCountdown = (isSeries = false) => {
    if (!cameraActive) return;
    sounds.playCountdownBeep(false);
    setCountdown(3);

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null) return null;
        if (prev > 1) {
          sounds.playCountdownBeep(false);
          return prev - 1;
        }
        clearInterval(interval);
        sounds.playCountdownBeep(true);
        setTimeout(() => {
          const shot = captureFrame();
          setCountdown(null);
          if (shot && !isSeries) {
            onPhotoCaptured(shot);
          } else if (shot && isSeries) {
            setMultiShotCount((c) => {
              const nextCount = c + 1;
              if (nextCount < 4) {
                setTimeout(() => triggerCountdown(true), 1200);
              } else {
                setIsMultiShotMode(false);
                onPhotoCaptured(shot);
              }
              return nextCount;
            });
          }
        }, 300);
        return 0;
      });
    }, 900);
  };

  // Handle local file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setCapturedPreview(dataUrl);
        sounds.playShutter();
        onPhotoCaptured(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  // Select sample portrait
  const handleSelectSample = async (url: string) => {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || 600;
        canvas.height = img.naturalHeight || 800;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
          setCapturedPreview(dataUrl);
          sounds.playShutter();
          onPhotoCaptured(dataUrl);
        }
      };
      img.src = url;
    } catch (e) {
      console.error('Failed to load sample image:', e);
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* Retro Booth Enclosure */}
      <div className="relative w-full max-w-2xl bg-stone-900 border border-stone-800 rounded-2xl p-4 md:p-6 shadow-2xl overflow-hidden">
        {/* Metal rivets styling */}
        <div className="flex justify-between items-center pb-3 mb-4 border-b border-stone-800/80 text-xs text-stone-400">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
            <span className="font-mono-tabular tracking-wider uppercase text-amber-300/90 text-xs">
              CHRONO-CHAMBER OPTICS // READY
            </span>
          </div>
          <div className="flex items-center gap-2 text-stone-400">
            <span>35mm Silver Halide Emulation</span>
            <span aria-hidden="true">·</span>
            <span>f/2.8 Temporal Aperture</span>
          </div>
        </div>

        {/* Viewfinder Window */}
        <div className="relative w-full aspect-[4/3] bg-black rounded-xl overflow-hidden border border-stone-700/60 shadow-inner flex items-center justify-center">
          {/* Live Video */}
          <video
            ref={videoRef}
            playsInline
            muted
            className={`w-full h-full object-cover -scale-x-100 ${
              cameraActive ? 'block' : 'hidden'
            }`}
          />

          {/* Flash animation scrim */}
          <div
            className={`absolute inset-0 bg-white pointer-events-none transition-opacity duration-200 ${
              flashActive ? 'opacity-95' : 'opacity-0'
            }`}
          />

          {/* Fallback when camera is not active */}
          {!cameraActive && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-stone-950/90">
              <Camera className="w-12 h-12 text-stone-600 mb-3 animate-pulse" />
              <p className="text-sm font-medium text-stone-300 max-w-sm mb-4">
                {cameraError || 'Initializing vintage optical sensor...'}
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                <button
                  type="button"
                  onClick={startCamera}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 transition-colors flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Retry Camera
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 transition-colors flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Upload Portrait
                </button>
              </div>
            </div>
          )}

          {/* Oval Face Framing Guide */}
          {cameraActive && !capturedPreview && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
              <div className="relative w-44 h-60 md:w-56 md:h-72 rounded-[50%] border-2 border-dashed border-amber-400/50 shadow-[0_0_15px_rgba(245,158,11,0.15)] flex items-center justify-center">
                {/* Crosshairs */}
                <div className="absolute w-6 h-[1px] bg-amber-400/40 -left-3" />
                <div className="absolute w-6 h-[1px] bg-amber-400/40 -right-3" />
                <div className="absolute h-6 w-[1px] bg-amber-400/40 -top-3" />
                <div className="absolute h-6 w-[1px] bg-amber-400/40 -bottom-3" />
                <span className="text-[10px] tracking-wider uppercase text-amber-300/60 bg-stone-950/60 px-2 py-0.5 rounded backdrop-blur-sm">
                  Align Face Here
                </span>
              </div>
            </div>
          )}

          {/* Countdown Display Overlay */}
          {countdown !== null && (
            <div className="absolute inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center pointer-events-none">
              <div className="w-28 h-28 rounded-full border-4 border-amber-400 flex items-center justify-center bg-black/60 shadow-[0_0_30px_rgba(245,158,11,0.5)] animate-scale">
                <span className="font-mono-tabular text-5xl font-bold text-amber-400">
                  {countdown === 0 ? 'FLASH' : countdown}
                </span>
              </div>
            </div>
          )}

          {/* Captured Preview Badge */}
          {capturedPreview && (
            <div className="absolute bottom-3 left-3 bg-stone-950/80 backdrop-blur-md border border-stone-700/80 px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs text-stone-300">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Portrait Locked</span>
              <button
                type="button"
                onClick={() => setCapturedPreview(null)}
                className="ml-2 text-amber-400 hover:underline cursor-pointer"
              >
                Retake
              </button>
            </div>
          )}
        </div>

        {/* Shutter & Controls Toolbar */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {/* Take 1 Shot Button */}
            <button
              type="button"
              disabled={countdown !== null || isAnalyzing}
              onClick={() => triggerCountdown(false)}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold text-sm shadow-[0_4px_16px_rgba(245,158,11,0.25)] active:translate-y-0.5 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>Snap Photo (3s)</span>
            </button>

            {/* 4-Shot Strip Mode */}
            <button
              type="button"
              disabled={countdown !== null || isAnalyzing}
              onClick={() => {
                setIsMultiShotMode(true);
                setMultiShotCount(0);
                triggerCountdown(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-medium text-xs transition-colors border border-stone-700 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Takes 4 consecutive shots for an authentic 4-frame strip"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>4-Shot Series</span>
            </button>
          </div>

          {/* Upload & Sample Buttons */}
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-medium border border-stone-700/80 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Photo</span>
            </button>
          </div>
        </div>

        {/* Multi-Shot Progress indicator */}
        {isMultiShotMode && (
          <div className="mt-3 flex items-center justify-between text-xs text-amber-300 bg-amber-950/30 border border-amber-800/40 rounded-lg px-3 py-1.5">
            <span>Taking 4-Shot Photo Series</span>
            <span className="font-mono-tabular">Shot {multiShotCount + 1} of 4</span>
          </div>
        )}
      </div>

      {/* Preset / Sample Portraits Carousel */}
      <div className="w-full max-w-2xl mt-4 bg-stone-900/60 border border-stone-800/60 rounded-xl p-3.5">
        <div className="flex items-center justify-between text-xs text-stone-400 mb-2.5">
          <span className="flex items-center gap-1.5 font-medium text-stone-300">
            <Eye className="w-3.5 h-3.5 text-amber-400" />
            Quick Test Portraits (No camera needed)
          </span>
          <span className="text-stone-500">Click to load instantly</span>
        </div>
        <div className="grid grid-cols-3 gap-2.5">
          {SAMPLE_PORTRAITS.map((sample, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelectSample(sample.url)}
              className="group relative flex flex-col items-center bg-stone-800/70 hover:bg-stone-800 border border-stone-700/60 hover:border-amber-500/50 rounded-lg p-2 transition-all cursor-pointer text-left"
            >
              <div className="w-full aspect-square rounded-md overflow-hidden bg-stone-950 mb-1.5">
                <img
                  src={sample.url}
                  alt={sample.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <span className="text-[11px] font-semibold text-stone-200 truncate w-full">
                {sample.name.split(' ')[0]}
              </span>
              <span className="text-[9px] text-stone-400 truncate w-full">
                {sample.eraHint}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
