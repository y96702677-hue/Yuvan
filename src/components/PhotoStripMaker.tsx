import React, { useRef, useState } from 'react';
import { Download, Printer, Sparkles, User, RefreshCw, Check } from 'lucide-react';
import confetti from 'canvas-confetti';
import { HistoricalEra } from '../types.ts';
import { sounds } from '../utils/soundEffects.ts';

interface PhotoStripMakerProps {
  userPhotoSrc: string;
  eras: HistoricalEra[];
  activeEra: HistoricalEra;
  userName?: string;
  onUpdateUserName?: (name: string) => void;
}

export const PhotoStripMaker: React.FC<PhotoStripMakerProps> = ({
  userPhotoSrc,
  eras,
  userName = 'Temporal Traveler',
  onUpdateUserName,
}) => {
  const [selectedEraIds, setSelectedEraIds] = useState<string[]>([
    eras[0]?.id || 'renaissance_florence',
    eras[1]?.id || 'egypt_pharaoh',
    eras[2]?.id || 'roaring_twenties',
    eras[3]?.id || 'apollo_mission',
  ]);
  const [stripTheme, setStripTheme] = useState<'vintage-cream' | 'film-noir' | 'sepia'>('vintage-cream');
  const [travelerName, setTravelerName] = useState<string>(userName);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);

  // Quick switch of an era slot in the 4-frame strip
  const handleSlotChange = (slotIndex: number, newEraId: string) => {
    sounds.playTick();
    const updated = [...selectedEraIds];
    updated[slotIndex] = newEraId;
    setSelectedEraIds(updated);
  };

  // Generate and export high-res canvas strip
  const handleDownloadStrip = async () => {
    setIsDownloading(true);
    sounds.playShutter();

    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 1900;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      setIsDownloading(false);
      return;
    }

    // Background theme color
    const bgColor = stripTheme === 'vintage-cream' ? '#f5f2eb' : stripTheme === 'film-noir' ? '#18181b' : '#3e2723';
    const textColor = stripTheme === 'vintage-cream' ? '#1c1917' : '#fafaf9';
    const subColor = stripTheme === 'vintage-cream' ? '#78716c' : '#a8a29e';

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Header banner
    ctx.fillStyle = textColor;
    ctx.font = '700 24px "Cinzel", serif';
    ctx.textAlign = 'center';
    ctx.fillText('CHRONOS TIME-TRAVEL BOOTH', canvas.width / 2, 70);

    ctx.fillStyle = subColor;
    ctx.font = '500 13px "Space Mono", monospace';
    ctx.fillText('PORTABLE TEMPORAL RECONSTRUCTION // SPECIMEN NO. 4082', canvas.width / 2, 98);

    // Load user image
    const userImg = new Image();
    userImg.crossOrigin = 'anonymous';
    userImg.src = userPhotoSrc;
    await new Promise((resolve) => {
      userImg.onload = resolve;
      userImg.onerror = resolve;
    });

    // Draw the 4 photo frames
    const frameWidth = 500;
    const frameHeight = 350;
    const startY = 130;
    const gap = 30;

    for (let i = 0; i < 4; i++) {
      const eraId = selectedEraIds[i];
      const era = eras.find((e) => e.id === eraId) || eras[0];
      const y = startY + i * (frameHeight + gap);

      // Frame border & background
      ctx.fillStyle = '#09090b';
      ctx.fillRect((canvas.width - frameWidth) / 2, y, frameWidth, frameHeight);

      // Draw era backdrop if available
      if (era.imageSrc) {
        const bgImg = new Image();
        bgImg.crossOrigin = 'anonymous';
        bgImg.src = era.imageSrc;
        await new Promise((resolve) => {
          bgImg.onload = resolve;
          bgImg.onerror = resolve;
        });
        if (bgImg.complete && bgImg.naturalWidth > 0) {
          ctx.drawImage(bgImg, (canvas.width - frameWidth) / 2, y, frameWidth, frameHeight);
        }
      }

      // Draw user face with feathering
      if (userImg.complete && userImg.naturalWidth > 0) {
        const faceX = (canvas.width - frameWidth) / 2 + (era.defaultFaceConfig.x / 100) * frameWidth;
        const faceY = y + (era.defaultFaceConfig.y / 100) * frameHeight;
        const faceSize = frameHeight * 0.42 * era.defaultFaceConfig.scale;

        ctx.save();
        ctx.beginPath();
        ctx.ellipse(faceX, faceY, faceSize * 0.45, faceSize * 0.55, 0, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(userImg, faceX - faceSize / 2, faceY - faceSize / 2, faceSize, faceSize);
        ctx.restore();
      }

      // Vignette
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 4;
      ctx.strokeRect((canvas.width - frameWidth) / 2, y, frameWidth, frameHeight);

      // Era label in photo corner
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect((canvas.width - frameWidth) / 2 + 10, y + frameHeight - 34, 260, 24);
      ctx.fillStyle = '#f59e0b';
      ctx.font = '700 12px "Space Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`${era.name.toUpperCase()} · ${era.yearDisplay}`, (canvas.width - frameWidth) / 2 + 18, y + frameHeight - 18);
    }

    // Bottom strip credentials
    const footerY = startY + 4 * (frameHeight + gap) + 40;
    ctx.textAlign = 'center';
    ctx.fillStyle = textColor;
    ctx.font = '600 16px "Cinzel", serif';
    ctx.fillText(`VOYAGER: ${travelerName.toUpperCase()}`, canvas.width / 2, footerY);

    ctx.fillStyle = subColor;
    ctx.font = '400 12px "Space Mono", monospace';
    ctx.fillText(`ORIGIN YEAR: 2026 AD · TEMPORAL CLEARANCE: VERIFIED`, canvas.width / 2, footerY + 24);

    // Decorative barcode
    ctx.fillStyle = textColor;
    const barcodeStartX = canvas.width / 2 - 120;
    for (let b = 0; b < 40; b++) {
      const bw = (b % 3 === 0 ? 4 : 2);
      ctx.fillRect(barcodeStartX + b * 6, footerY + 40, bw, 30);
    }

    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `chronos_photostrip_${Date.now()}.png`;
    link.href = dataUrl;
    link.click();

    setIsDownloading(false);
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3000);

    // Trigger celebratory confetti
    confetti({
      particleCount: 60,
      spread: 70,
      origin: { y: 0.7 },
      colors: ['#f59e0b', '#d97706', '#fbbf24', '#78350f'],
    });
  };

  const handlePrint = () => {
    sounds.playTick();
    window.print();
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col md:flex-row gap-8 items-start">
      {/* Photobooth Strip Preview Canvas Container */}
      <div className="w-full md:w-auto flex flex-col items-center">
        <div
          className={`relative p-5 rounded-2xl shadow-2xl transition-colors duration-300 ${
            stripTheme === 'vintage-cream'
              ? 'bg-[#f5f2eb] text-stone-900 border border-stone-300'
              : stripTheme === 'film-noir'
              ? 'bg-stone-900 text-stone-100 border border-stone-800'
              : 'bg-[#2b1810] text-amber-100 border border-amber-900/60'
          }`}
          style={{ width: '300px' }}
        >
          {/* Header */}
          <div className="text-center pb-3 border-b border-current/15 mb-3">
            <h4 className="font-cinzel text-xs font-bold tracking-wider">
              CHRONOS TIME-TRAVEL
            </h4>
            <p className="font-mono-tabular text-[9px] opacity-70">
              FOUR-ERA PHOTOGRAPHIC STRIP
            </p>
          </div>

          {/* 4 Photos */}
          <div className="space-y-3">
            {selectedEraIds.map((eraId, idx) => {
              const era = eras.find((e) => e.id === eraId) || eras[0];
              return (
                <div
                  key={idx}
                  className="relative aspect-[4/3] w-full rounded-md overflow-hidden bg-black border border-current/20 shadow-inner group"
                >
                  {/* Era scene background */}
                  {era.imageSrc ? (
                    <img
                      src={era.imageSrc}
                      alt={era.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div
                      className="w-full h-full"
                      style={{ background: era.fallbackGradient }}
                    />
                  )}

                  {/* User face composite */}
                  {userPhotoSrc && (
                    <div
                      className="absolute rounded-full overflow-hidden shadow-md"
                      style={{
                        left: `${era.defaultFaceConfig.x}%`,
                        top: `${era.defaultFaceConfig.y}%`,
                        transform: 'translate(-50%, -50%)',
                        width: '38%',
                        height: '48%',
                      }}
                    >
                      <img
                        src={userPhotoSrc}
                        alt="User Portrait"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover rounded-full"
                      />
                    </div>
                  )}

                  {/* Stamp */}
                  <div className="absolute bottom-1.5 left-1.5 bg-black/75 backdrop-blur-xs px-2 py-0.5 rounded text-[9px] font-mono-tabular text-amber-300 font-bold">
                    {era.yearDisplay} · {era.name}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Strip Footer */}
          <div className="mt-4 pt-3 border-t border-current/15 text-center">
            <span className="font-cinzel text-[11px] font-bold block">
              VOYAGER: {travelerName.toUpperCase()}
            </span>
            <span className="font-mono-tabular text-[8px] opacity-70 block mb-2">
              ORIGIN: 2026 AD · TEMPORAL CLEARANCE #4082
            </span>
            {/* Minimal Barcode */}
            <div className="flex justify-center items-center gap-[3px] h-4 opacity-75">
              {[6, 12, 4, 8, 14, 6, 10, 4, 12, 8, 4, 14, 6, 8, 10, 4, 6, 12].map(
                (h, i) => (
                  <div
                    key={i}
                    className="w-[2px] bg-current"
                    style={{ height: `${h}px` }}
                  />
                )
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Customizer & Controls Panel */}
      <div className="flex-1 bg-stone-900/80 border border-stone-800 rounded-2xl p-6 space-y-6">
        <div>
          <h3 className="text-lg font-bold text-stone-100 font-cinzel">
            Photo Strip Customizer
          </h3>
          <p className="text-xs text-stone-400 mt-1">
            Curate the 4 historical eras for your printable photobooth strip.
          </p>
        </div>

        {/* Traveler Name input */}
        <div>
          <label className="block text-xs font-semibold text-stone-300 mb-1.5 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-amber-400" />
            Traveler Name
          </label>
          <input
            type="text"
            value={travelerName}
            onChange={(e) => {
              setTravelerName(e.target.value);
              onUpdateUserName?.(e.target.value);
            }}
            placeholder="Your Name"
            className="w-full px-3.5 py-2 rounded-lg bg-stone-950 border border-stone-700 text-stone-200 text-xs focus:outline-hidden focus:border-amber-500 transition-colors"
          />
        </div>

        {/* Paper Theme Selector */}
        <div>
          <label className="block text-xs font-semibold text-stone-300 mb-2">
            Photobooth Paper Stock
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'vintage-cream', label: 'Vintage Cream' },
              { id: 'film-noir', label: 'Film Noir Black' },
              { id: 'sepia', label: 'Sepia Gelatin' },
            ].map((theme) => (
              <button
                key={theme.id}
                type="button"
                onClick={() => {
                  sounds.playTick();
                  setStripTheme(theme.id as 'vintage-cream' | 'film-noir' | 'sepia');
                }}
                className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer text-center ${
                  stripTheme === theme.id
                    ? 'bg-amber-500/15 border-amber-500 text-amber-300'
                    : 'bg-stone-800/60 border-stone-700/60 text-stone-400 hover:text-stone-200'
                }`}
              >
                {theme.label}
              </button>
            ))}
          </div>
        </div>

        {/* Slot Era Pickers */}
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-stone-300">
            Era Selection (Frames 1 to 4)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {[0, 1, 2, 3].map((slotIdx) => (
              <div key={slotIdx} className="bg-stone-950 p-2.5 rounded-lg border border-stone-800">
                <span className="text-[10px] text-amber-400 font-mono-tabular uppercase block mb-1">
                  Frame {slotIdx + 1}
                </span>
                <select
                  value={selectedEraIds[slotIdx]}
                  onChange={(e) => handleSlotChange(slotIdx, e.target.value)}
                  className="w-full bg-stone-900 border border-stone-700 text-stone-200 text-xs rounded px-2 py-1.5 focus:outline-hidden focus:border-amber-500 cursor-pointer"
                >
                  {eras.map((era) => (
                    <option key={era.id} value={era.id}>
                      {era.yearDisplay} — {era.name}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 border-t border-stone-800 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={isDownloading}
            onClick={handleDownloadStrip}
            className="flex-1 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {downloadSuccess ? (
              <>
                <Check className="w-4 h-4 text-stone-950" />
                <span>Downloaded!</span>
              </>
            ) : isDownloading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Rendering High-Res Strip...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Download Photo Strip (PNG)</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-medium text-xs border border-stone-700 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4 text-stone-400" />
            <span>Print</span>
          </button>
        </div>
      </div>
    </div>
  );
};
