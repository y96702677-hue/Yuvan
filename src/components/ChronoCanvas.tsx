import React, { useRef, useEffect, useState, useCallback } from 'react';
import { BlendingSettings, HistoricalEra } from '../types.ts';

interface ChronoCanvasProps {
  era: HistoricalEra;
  userPhotoSrc: string;
  settings: BlendingSettings;
  onSettingsChange?: (settings: BlendingSettings) => void;
  className?: string;
  interactive?: boolean;
}

export const ChronoCanvas: React.FC<ChronoCanvasProps> = ({
  era,
  userPhotoSrc,
  settings,
  onSettingsChange,
  className = '',
  interactive = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [bgImg, setBgImg] = useState<HTMLImageElement | null>(null);
  const [userImg, setUserImg] = useState<HTMLImageElement | null>(null);
  const isDraggingRef = useRef<boolean>(false);
  const lastMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Load background image
  useEffect(() => {
    if (!era.imageSrc) {
      setBgImg(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => setBgImg(img);
    img.onerror = () => setBgImg(null);
    img.src = era.imageSrc;
  }, [era.imageSrc]);

  // Load user photo
  useEffect(() => {
    if (!userPhotoSrc) {
      setUserImg(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => setUserImg(img);
    img.src = userPhotoSrc;
  }, [userPhotoSrc]);

  // Render composite canvas
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // 1. Draw Background
    if (bgImg) {
      ctx.drawImage(bgImg, 0, 0, width, height);
    } else {
      // Procedural fallback backdrop based on era
      renderProceduralBackdrop(ctx, width, height, era);
    }

    // 2. Draw User Face with Feathered Oval Mask
    if (userImg) {
      ctx.save();

      // Convert percentage coordinates to canvas pixels
      const faceCenterX = (settings.x / 100) * width;
      const faceCenterY = (settings.y / 100) * height;

      // Base face size relative to canvas
      const baseFaceWidth = width * 0.38 * settings.scale;
      const baseFaceHeight = height * 0.34 * settings.scale;

      ctx.translate(faceCenterX, faceCenterY);
      ctx.rotate((settings.rotation * Math.PI) / 180);

      // Create an offscreen buffer for the face to apply feathering & color grading
      const faceCanvas = document.createElement('canvas');
      faceCanvas.width = baseFaceWidth * 1.5;
      faceCanvas.height = baseFaceHeight * 1.5;
      const fCtx = faceCanvas.getContext('2d');

      if (fCtx) {
        const fcw = faceCanvas.width;
        const fch = faceCanvas.height;

        // Draw elliptical feathered mask
        fCtx.save();
        fCtx.beginPath();
        fCtx.ellipse(fcw / 2, fch / 2, baseFaceWidth * 0.44, baseFaceHeight * 0.46, 0, 0, Math.PI * 2);
        fCtx.clip();

        // Draw user photo centered
        fCtx.drawImage(
          userImg,
          (fcw - baseFaceWidth) / 2,
          (fch - baseFaceHeight) / 2,
          baseFaceWidth,
          baseFaceHeight
        );

        // Apply Warmth / Skin Tint
        if (settings.warmth !== 0) {
          fCtx.globalCompositeOperation = settings.warmth > 0 ? 'color-burn' : 'color-dodge';
          fCtx.fillStyle = settings.warmth > 0 ? `rgba(217, 119, 6, ${Math.abs(settings.warmth) * 0.006})` : `rgba(59, 130, 246, ${Math.abs(settings.warmth) * 0.006})`;
          fCtx.fillRect(0, 0, fcw, fch);
        }

        fCtx.restore();

        // Soften outer edge with radial gradient eraser for seamless blending
        fCtx.save();
        fCtx.globalCompositeOperation = 'destination-in';
        const radGrad = fCtx.createRadialGradient(
          fcw / 2,
          fch / 2,
          baseFaceWidth * 0.28,
          fcw / 2,
          fch / 2,
          baseFaceWidth * 0.48
        );
        radGrad.addColorStop(0, 'rgba(0,0,0,1)');
        radGrad.addColorStop(0.7, 'rgba(0,0,0,0.85)');
        radGrad.addColorStop(1, 'rgba(0,0,0,0)');
        fCtx.fillStyle = radGrad;
        fCtx.fillRect(0, 0, fcw, fch);
        fCtx.restore();

        // Draw feathered face into main canvas
        ctx.globalAlpha = settings.opacity;
        ctx.globalCompositeOperation = settings.blendMode || 'normal';
        ctx.filter = `brightness(${settings.brightness}) contrast(${settings.contrast}) sepia(${settings.sepia * 0.5})`;
        ctx.drawImage(faceCanvas, -fcw / 2, -fch / 2);
        ctx.filter = 'none';
        ctx.globalCompositeOperation = 'source-over';
      }

      ctx.restore();
    }

    // 3. Draw Period Accessories Overlay
    drawAccessory(ctx, width, height, settings, era);

    // 4. Era-specific Color Grading and Grain
    applyEraFilmGrading(ctx, width, height, era, settings);
  }, [bgImg, userImg, era, settings]);

  useEffect(() => {
    render();
  }, [render]);

  // Mouse & Touch Drag Handlers for direct manipulation on canvas
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!interactive || !onSettingsChange) return;
    isDraggingRef.current = true;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!interactive || !isDraggingRef.current || !onSettingsChange || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const dx = ((e.clientX - lastMousePosRef.current.x) / rect.width) * 100;
    const dy = ((e.clientY - lastMousePosRef.current.y) / rect.height) * 100;

    lastMousePosRef.current = { x: e.clientX, y: e.clientY };

    onSettingsChange({
      ...settings,
      x: Math.min(95, Math.max(5, settings.x + dx)),
      y: Math.min(95, Math.max(5, settings.y + dy)),
    });
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    if (!interactive || !onSettingsChange) return;
    e.preventDefault();
    const delta = e.deltaY * -0.001;
    const newScale = Math.min(2.0, Math.max(0.4, settings.scale + delta));
    onSettingsChange({
      ...settings,
      scale: parseFloat(newScale.toFixed(2)),
    });
  };

  return (
    <div className={`relative overflow-hidden select-none ${className}`}>
      <canvas
        ref={canvasRef}
        width={720}
        height={960}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        className={`w-full h-full object-contain ${
          interactive ? 'cursor-grab active:cursor-grabbing' : ''
        }`}
      />
    </div>
  );
};

// Procedural historical backdrop renderer for eras without static photos
function renderProceduralBackdrop(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  era: HistoricalEra
) {
  if (era.id === 'apollo_mission') {
    // 1969 Lunar Landing Background
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.65);
    skyGrad.addColorStop(0, '#000000');
    skyGrad.addColorStop(1, '#050b14');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h * 0.65);

    // Distant Earth in black sky
    ctx.save();
    ctx.beginPath();
    ctx.arc(w * 0.8, h * 0.18, 28, 0, Math.PI * 2);
    const earthGrad = ctx.createRadialGradient(w * 0.78, h * 0.16, 5, w * 0.8, h * 0.18, 28);
    earthGrad.addColorStop(0, '#38bdf8');
    earthGrad.addColorStop(0.6, '#0284c7');
    earthGrad.addColorStop(1, '#082f49');
    ctx.fillStyle = earthGrad;
    ctx.fill();
    ctx.restore();

    // Lunar terrain surface
    const moonGrad = ctx.createLinearGradient(0, h * 0.6, 0, h);
    moonGrad.addColorStop(0, '#64748b');
    moonGrad.addColorStop(0.3, '#475569');
    moonGrad.addColorStop(1, '#1e293b');
    ctx.fillStyle = moonGrad;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.62);
    ctx.quadraticCurveTo(w * 0.3, h * 0.58, w * 0.6, h * 0.64);
    ctx.quadraticCurveTo(w * 0.85, h * 0.68, w, h * 0.61);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.fill();

    // Apollo Lander Legs silhouette
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(w * 0.15, h * 0.5, 8, h * 0.2);
    ctx.fillRect(w * 0.28, h * 0.53, 8, h * 0.2);
  } else if (era.id === 'victorian_steampunk') {
    // Victorian Cobblestone & Gaslight Street
    const streetGrad = ctx.createLinearGradient(0, 0, 0, h);
    streetGrad.addColorStop(0, '#09090b');
    streetGrad.addColorStop(0.5, '#18181b');
    streetGrad.addColorStop(1, '#27272a');
    ctx.fillStyle = streetGrad;
    ctx.fillRect(0, 0, w, h);

    // Gaslamp warm golden light beam
    const lampGlow = ctx.createRadialGradient(w * 0.8, h * 0.25, 10, w * 0.8, h * 0.25, 220);
    lampGlow.addColorStop(0, 'rgba(251, 191, 36, 0.45)');
    lampGlow.addColorStop(0.5, 'rgba(245, 158, 11, 0.15)');
    lampGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = lampGlow;
    ctx.fillRect(0, 0, w, h);
  } else if (era.id === 'cyber_arcade') {
    // 1984 Neon Grid & Sun
    ctx.fillStyle = '#050515';
    ctx.fillRect(0, 0, w, h);

    // Neon horizon line
    const horizon = h * 0.68;

    // Glowing wireframe perspective grid
    ctx.strokeStyle = '#ec4899';
    ctx.lineWidth = 1.5;
    for (let x = -w * 0.5; x <= w * 1.5; x += w * 0.12) {
      ctx.beginPath();
      ctx.moveTo(w / 2, horizon);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = horizon + 15; y < h; y += (y - horizon) * 0.35 + 8) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  } else {
    // Elegant deep historical vignette
    const baseGrad = ctx.createRadialGradient(w / 2, h / 2, w * 0.1, w / 2, h / 2, w * 0.7);
    baseGrad.addColorStop(0, '#292524');
    baseGrad.addColorStop(1, '#0c0a09');
    ctx.fillStyle = baseGrad;
    ctx.fillRect(0, 0, w, h);
  }
}

// Draw authentic period accessories overlay
function drawAccessory(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  settings: BlendingSettings,
  era: HistoricalEra
) {
  if (!settings.activeAccessory) return;

  const faceX = (settings.x / 100) * w;
  const faceY = (settings.y / 100) * h;
  const scale = settings.scale;

  ctx.save();
  ctx.translate(faceX, faceY);
  ctx.rotate((settings.rotation * Math.PI) / 180);

  if (settings.activeAccessory === 'nemes_crown' || settings.activeAccessory === 'renaissance_beret') {
    // Renaissance Beret / Crown
    ctx.fillStyle = '#78350f';
    ctx.beginPath();
    ctx.ellipse(0, -h * 0.14 * scale, w * 0.22 * scale, h * 0.08 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    // Gold badge pin
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(0, -h * 0.14 * scale, 8 * scale, 0, Math.PI * 2);
    ctx.fill();
  } else if (settings.activeAccessory === 'ruff_collar') {
    // Renaissance lace ruff collar
    ctx.fillStyle = '#f5f5f4';
    ctx.strokeStyle = '#d6d3d1';
    ctx.lineWidth = 2 * scale;
    ctx.beginPath();
    ctx.ellipse(0, h * 0.16 * scale, w * 0.26 * scale, h * 0.07 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (settings.activeAccessory === 'fedora_hat') {
    // 1920s Fedora
    ctx.fillStyle = '#292524';
    ctx.beginPath();
    ctx.ellipse(0, -h * 0.15 * scale, w * 0.25 * scale, h * 0.06 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-w * 0.16 * scale, -h * 0.22 * scale, w * 0.32 * scale, h * 0.09 * scale);
  } else if (settings.activeAccessory === 'flapper_band') {
    // 1920s Flapper Headband
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 6 * scale;
    ctx.beginPath();
    ctx.ellipse(0, -h * 0.1 * scale, w * 0.18 * scale, h * 0.04 * scale, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else if (settings.activeAccessory === 'space_visor') {
    // Apollo Helmet Visor rim
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 7 * scale;
    ctx.beginPath();
    ctx.ellipse(0, 0, w * 0.24 * scale, h * 0.26 * scale, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else if (settings.activeAccessory === 'brass_monocle') {
    // Victorian Brass Monocle
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 4 * scale;
    ctx.beginPath();
    ctx.arc(w * 0.06 * scale, -h * 0.02 * scale, 22 * scale, 0, Math.PI * 2);
    ctx.stroke();
    // Chain
    ctx.beginPath();
    ctx.moveTo(w * 0.06 * scale + 22 * scale, -h * 0.02 * scale);
    ctx.quadraticCurveTo(w * 0.16 * scale, h * 0.1 * scale, w * 0.12 * scale, h * 0.2 * scale);
    ctx.stroke();
  } else if (settings.activeAccessory === 'shutter_shades') {
    // 80s Shutter Shades
    ctx.fillStyle = '#ec4899';
    ctx.fillRect(-w * 0.15 * scale, -h * 0.04 * scale, w * 0.3 * scale, h * 0.05 * scale);
    ctx.fillStyle = '#000000';
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(-w * 0.14 * scale, -h * 0.035 * scale + i * 5 * scale, w * 0.28 * scale, 2 * scale);
    }
  }

  ctx.restore();
}

// Master film tone & grain emulation
function applyEraFilmGrading(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  era: HistoricalEra,
  settings: BlendingSettings
) {
  // Vignette
  const vignette = ctx.createRadialGradient(w / 2, h / 2, w * 0.32, w / 2, h / 2, w * 0.72);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(0.7, 'rgba(0,0,0,0.25)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.6)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);

  // Era filter tints
  if (era.filterPreset === 'sepia') {
    ctx.fillStyle = 'rgba(120, 53, 15, 0.14)';
    ctx.globalCompositeOperation = 'color';
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
  } else if (era.filterPreset === 'chiaroscuro') {
    ctx.fillStyle = 'rgba(217, 119, 6, 0.08)';
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
  } else if (era.filterPreset === 'tintype') {
    ctx.fillStyle = 'rgba(100, 116, 139, 0.15)';
    ctx.globalCompositeOperation = 'saturation';
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
  }

  // Authentic Photobooth Film Border with Era Stamp
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 12;
  ctx.strokeRect(6, 6, w - 12, h - 12);

  // Era typography stamp in footer
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.font = '600 16px "Cinzel", serif';
  ctx.fillText(era.name.toUpperCase(), 24, h - 28);

  ctx.fillStyle = '#f59e0b';
  ctx.font = '700 14px "Space Mono", monospace';
  ctx.fillText(era.yearDisplay, w - 110, h - 28);
}
