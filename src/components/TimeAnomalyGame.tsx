import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Volume2, VolumeX, Sparkles, Trophy, RotateCcw, Play } from 'lucide-react';
import { sounds } from '../utils/soundEffects.ts';

interface Anomaly {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  name: string;
  eraName: string;
  icon: string;
  hp: number;
  color: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
}

interface TimeAnomalyGameProps {
  onUnlockReward?: () => void;
  onExitGame?: () => void;
}

export const TimeAnomalyGame: React.FC<TimeAnomalyGameProps> = ({ onUnlockReward, onExitGame }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // High-level game screen state
  const [screen, setScreen] = useState<'title' | 'playing' | 'paused' | 'victory' | 'gameover'>('title');
  const [score, setScore] = useState<number>(0);
  const [integrity, setIntegrity] = useState<number>(100);
  const [combo, setCombo] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(sounds.getMuted());

  // Mutable game simulation state preserved across React renders
  const simRef = useRef({
    score: 0,
    integrity: 100,
    combo: 0,
    anomaliesCleared: 0,
    targetAnomalies: 8,
    player: {
      x: 400,
      y: 300,
      radius: 22,
      speed: 340,
    },
    heldKeys: new Set<string>(),
    justPressed: new Set<string>(),
    anomalies: [] as Anomaly[],
    particles: [] as Particle[],
    lastTime: performance.now(),
    cameraShake: 0,
    hitStopUntil: 0,
    screen: 'title' as 'title' | 'playing' | 'paused' | 'victory' | 'gameover',
  });

  const nextAnomalyIdRef = useRef<number>(1);

  // Spawn a temporal anomaly
  const spawnAnomaly = useCallback((w: number, h: number) => {
    const types = [
      { name: 'Smartphone', era: 'Ancient Egypt', icon: '📱', color: '#38bdf8' },
      { name: 'Neon Boombox', era: 'Renaissance', icon: '📻', color: '#ec4899' },
      { name: 'Drone Copier', era: '1888 London', icon: '🛸', color: '#f59e0b' },
      { name: 'Plastic Cup', era: 'Imperial Rome', icon: '🥤', color: '#10b981' },
      { name: 'VR Headset', era: 'Feudal Kyoto', icon: '🥽', color: '#a855f7' },
    ];
    const picked = types[Math.floor(Math.random() * types.length)];
    const margin = 50;

    const anomaly: Anomaly = {
      id: nextAnomalyIdRef.current++,
      x: margin + Math.random() * (w - margin * 2),
      y: margin + Math.random() * (h - margin * 2),
      vx: (Math.random() - 0.5) * 80,
      vy: (Math.random() - 0.5) * 80,
      radius: 26,
      name: picked.name,
      eraName: picked.era,
      icon: picked.icon,
      hp: 1,
      color: picked.color,
    };
    simRef.current.anomalies.push(anomaly);
  }, []);

  // Keyboard input listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const code = e.code;

      if (code === 'KeyW' || code === 'KeyA' || code === 'KeyS' || code === 'KeyD' ||
          code === 'ArrowUp' || code === 'ArrowLeft' || code === 'ArrowDown' || code === 'ArrowRight' ||
          code === 'Space' || code === 'Enter' || code === 'Escape') {
        e.preventDefault();
      }

      if (!simRef.current.heldKeys.has(code)) {
        simRef.current.justPressed.add(code);
      }
      simRef.current.heldKeys.add(code);

      // Handle screen transitions via keys
      if (simRef.current.screen === 'title' && (code === 'Space' || code === 'Enter')) {
        startGame();
      } else if (code === 'Escape') {
        if (simRef.current.screen === 'playing') {
          simRef.current.screen = 'paused';
          setScreen('paused');
        } else if (simRef.current.screen === 'paused') {
          simRef.current.screen = 'playing';
          setScreen('playing');
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      simRef.current.heldKeys.delete(e.code);
    };

    const handleBlur = () => {
      simRef.current.heldKeys.clear();
      simRef.current.justPressed.clear();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  // Start / restart game
  const startGame = () => {
    sounds.playTimeWarp();
    simRef.current.score = 0;
    simRef.current.integrity = 100;
    simRef.current.combo = 0;
    simRef.current.anomaliesCleared = 0;
    simRef.current.anomalies = [];
    simRef.current.particles = [];
    simRef.current.screen = 'playing';
    simRef.current.lastTime = performance.now();

    const canvas = canvasRef.current;
    const w = canvas?.width || 800;
    const h = canvas?.height || 600;
    simRef.current.player.x = w / 2;
    simRef.current.player.y = h / 2;

    for (let i = 0; i < 4; i++) {
      spawnAnomaly(w, h);
    }

    setScore(0);
    setIntegrity(100);
    setCombo(0);
    setScreen('playing');
  };

  // Main 60fps game simulation loop
  useEffect(() => {
    let animId: number;

    const gameLoop = (now: number) => {
      const rawDt = (now - simRef.current.lastTime) / 1000;
      simRef.current.lastTime = now;
      const dt = Math.min(rawDt, 0.05); // clamped dt for stable physics

      const canvas = canvasRef.current;
      if (!canvas) {
        animId = requestAnimationFrame(gameLoop);
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        animId = requestAnimationFrame(gameLoop);
        return;
      }

      const w = canvas.width;
      const h = canvas.height;

      // Handle hitstop
      if (now < simRef.current.hitStopUntil) {
        animId = requestAnimationFrame(gameLoop);
        return;
      }

      // Update simulation if playing
      if (simRef.current.screen === 'playing') {
        const { player, heldKeys, justPressed } = simRef.current;

        // Player movement
        let moveX = 0;
        let moveY = 0;
        if (heldKeys.has('KeyW') || heldKeys.has('ArrowUp')) moveY -= 1;
        if (heldKeys.has('KeyS') || heldKeys.has('ArrowDown')) moveY += 1;
        if (heldKeys.has('KeyA') || heldKeys.has('ArrowLeft')) moveX -= 1;
        if (heldKeys.has('KeyD') || heldKeys.has('ArrowRight')) moveX += 1;

        if (moveX !== 0 && moveY !== 0) {
          const invLen = 1 / Math.SQRT2;
          moveX *= invLen;
          moveY *= invLen;
        }

        player.x = Math.max(player.radius, Math.min(w - player.radius, player.x + moveX * player.speed * dt));
        player.y = Math.max(player.radius, Math.min(h - player.radius, player.y + moveY * player.speed * dt));

        // Action trigger: Space or justPressed
        if (justPressed.has('Space')) {
          // Fire Chrono Tether
          let hit = false;
          simRef.current.anomalies = simRef.current.anomalies.filter((anom) => {
            const dist = Math.hypot(player.x - anom.x, player.y - anom.y);
            if (dist < player.radius + anom.radius + 35) {
              hit = true;
              sounds.playAnomalyCapture();
              simRef.current.cameraShake = 12;
              simRef.current.hitStopUntil = now + 40; // 40ms simulation hitstop
              simRef.current.score += 100 * (simRef.current.combo + 1);
              simRef.current.combo += 1;
              simRef.current.anomaliesCleared += 1;

              // Spawn particles
              for (let p = 0; p < 18; p++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 80 + Math.random() * 160;
                simRef.current.particles.push({
                  x: anom.x,
                  y: anom.y,
                  vx: Math.cos(angle) * speed,
                  vy: Math.sin(angle) * speed,
                  life: 0.5,
                  maxLife: 0.5,
                  color: anom.color,
                });
              }
              return false;
            }
            return true;
          });

          if (!hit) {
            simRef.current.combo = 0;
          }

          // Check win condition
          if (simRef.current.anomaliesCleared >= simRef.current.targetAnomalies) {
            simRef.current.screen = 'victory';
            setScreen('victory');
            onUnlockReward?.();
          }

          // Replenish anomalies if needed
          while (simRef.current.anomalies.length < 3 && simRef.current.anomaliesCleared < simRef.current.targetAnomalies) {
            spawnAnomaly(w, h);
          }

          setScore(simRef.current.score);
          setCombo(simRef.current.combo);
        }

        // Anomaly patrol movement & temporal integrity decay
        simRef.current.anomalies.forEach((anom) => {
          anom.x += anom.vx * dt;
          anom.y += anom.vy * dt;

          if (anom.x < anom.radius || anom.x > w - anom.radius) anom.vx *= -1;
          if (anom.y < anom.radius || anom.y > h - anom.radius) anom.vy *= -1;
        });

        // Slow temporal decay
        simRef.current.integrity = Math.max(0, simRef.current.integrity - dt * 2.5);
        setIntegrity(Math.floor(simRef.current.integrity));

        if (simRef.current.integrity <= 0) {
          simRef.current.screen = 'gameover';
          setScreen('gameover');
        }

        // Decay camera shake
        simRef.current.cameraShake = Math.max(0, simRef.current.cameraShake - dt * 35);
      }

      // Update particles
      simRef.current.particles = simRef.current.particles.filter((p) => {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
        return p.life > 0;
      });

      // Clear justPressed for next frame
      simRef.current.justPressed.clear();

      // RENDER PASS
      ctx.save();

      // Camera Shake
      if (simRef.current.cameraShake > 0) {
        const sx = (Math.random() - 0.5) * simRef.current.cameraShake;
        const sy = (Math.random() - 0.5) * simRef.current.cameraShake;
        ctx.translate(sx, sy);
      }

      // Background: Retro Space-Time Grid
      ctx.fillStyle = '#09090b';
      ctx.fillRect(0, 0, w, h);

      // Parallax Grid
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.08)';
      ctx.lineWidth = 1;
      const t = now * 0.001;
      for (let x = 0; x < w; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Ambient Chrono-Vortex Centerpiece
      const vortex = ctx.createRadialGradient(w / 2, h / 2, 20, w / 2, h / 2, w * 0.45);
      vortex.addColorStop(0, 'rgba(245, 158, 11, 0.06)');
      vortex.addColorStop(0.5, 'rgba(168, 85, 247, 0.04)');
      vortex.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = vortex;
      ctx.fillRect(0, 0, w, h);

      // Render Anomalies
      simRef.current.anomalies.forEach((anom) => {
        // Anomaly aura pulse
        const pulse = Math.sin(t * 6 + anom.id) * 4;
        ctx.beginPath();
        ctx.arc(anom.x, anom.y, anom.radius + pulse, 0, Math.PI * 2);
        ctx.fillStyle = `${anom.color}22`;
        ctx.fill();
        ctx.strokeStyle = anom.color;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Icon text
        ctx.font = '20px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(anom.icon, anom.x, anom.y);

        // Name tag
        ctx.font = '10px "Space Mono", monospace';
        ctx.fillStyle = '#fafaf9';
        ctx.fillText(anom.name, anom.x, anom.y - anom.radius - 8);
      });

      // Render Particles
      simRef.current.particles.forEach((p) => {
        const alpha = p.life / p.maxLife;
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
      });

      // Render Player Chrono-Reticle
      if (simRef.current.screen === 'playing') {
        const p = simRef.current.player;

        // Outer targeting ring
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.stroke();

        // Crosshairs
        ctx.beginPath();
        ctx.moveTo(p.x - p.radius - 8, p.y);
        ctx.lineTo(p.x - p.radius + 4, p.y);
        ctx.moveTo(p.x + p.radius - 4, p.y);
        ctx.lineTo(p.x + p.radius + 8, p.y);
        ctx.moveTo(p.x, p.y - p.radius - 8);
        ctx.lineTo(p.x, p.y - p.radius + 4);
        ctx.moveTo(p.x, p.y + p.radius - 4);
        ctx.lineTo(p.x, p.y + p.radius + 8);
        ctx.stroke();

        // Inner glowing core
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();

      animId = requestAnimationFrame(gameLoop);
    };

    animId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animId);
  }, [spawnAnomaly, onUnlockReward]);

  // Toggle audio
  const handleToggleMute = () => {
    const nextMuted = sounds.toggleMute();
    setIsMuted(nextMuted);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[620px] bg-black rounded-2xl overflow-hidden border border-stone-800 shadow-2xl select-none"
    >
      {/* 60fps Native Canvas Viewport */}
      <canvas
        ref={canvasRef}
        width={960}
        height={620}
        className="w-full h-full object-cover block"
      />

      {/* World-Matched, Low-Occlusion UI Overlay (>85% unobstructed) */}
      {screen === 'playing' && (
        <div className="absolute inset-0 pointer-events-none p-5 flex flex-col justify-between">
          {/* Top Status Bar Cluster */}
          <div className="flex items-center justify-between text-xs font-mono-tabular">
            {/* Score & Combo */}
            <div className="flex items-center gap-4 bg-stone-950/70 border border-stone-800/80 px-3.5 py-1.5 rounded-lg text-amber-300">
              <div>
                <span className="text-[10px] text-stone-500 uppercase block">Score</span>
                <span className="font-bold text-sm">{score}</span>
              </div>
              {combo > 1 && (
                <div className="text-emerald-400 font-bold animate-pulse">
                  {combo}x COMBO
                </div>
              )}
            </div>

            {/* Temporal Integrity */}
            <div className="flex items-center gap-3 bg-stone-950/70 border border-stone-800/80 px-3.5 py-1.5 rounded-lg">
              <span className="text-[10px] text-stone-400 uppercase">Integrity</span>
              <div className="w-28 h-2 bg-stone-800 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-200 ${
                    integrity > 50 ? 'bg-amber-400' : 'bg-red-500'
                  }`}
                  style={{ width: `${integrity}%` }}
                />
              </div>
              <span className="text-stone-200 font-bold">{integrity}%</span>
            </div>

            {/* Audio Toggle */}
            <button
              type="button"
              onClick={handleToggleMute}
              className="pointer-events-auto p-2 rounded-lg bg-stone-950/70 border border-stone-800 text-stone-400 hover:text-stone-200 transition-colors cursor-pointer"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>

          {/* Bottom Flat Control Hint Line */}
          <div className="flex justify-between items-center text-[11px] text-stone-500 font-mono-tabular">
            <span>WASD / Arrows to Pilot · Space to Tether Anomaly · Esc to Pause</span>
            <span>Target: 8 Paradoxes</span>
          </div>
        </div>
      )}

      {/* TITLE SCREEN MODAL */}
      {screen === 'title' && (
        <div className="absolute inset-0 bg-stone-950/85 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center">
          {/* Bespoke inline SVG Title Lockup over 35% negative space */}
          <div className="mb-6 flex flex-col items-center">
            <svg
              className="w-16 h-16 text-amber-400 mb-2 animate-bounce"
              viewBox="0 0 64 64"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <circle cx="32" cy="32" r="28" strokeOpacity="0.4" strokeDasharray="4 4" />
              <circle cx="32" cy="32" r="20" stroke="#f59e0b" />
              <path d="M32 18V32L40 40" strokeLinecap="round" />
            </svg>
            <h2 className="text-3xl md:text-4xl font-extrabold text-stone-100 font-cinzel tracking-wider">
              CHRONO PARADOX
            </h2>
            <p className="font-mono-tabular text-xs text-amber-400 tracking-widest uppercase mt-1">
              Temporal Anomaly Hunter
            </p>
          </div>

          <p className="text-xs text-stone-300 max-w-md leading-relaxed mb-8">
            Temporal rifts have leaked modern relics into ancient history! Pilot the Chrono-Reticle, track down out-of-time artifacts, and stabilize the spacetime continuum.
          </p>

          <button
            type="button"
            onClick={startGame}
            className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold text-sm shadow-[0_0_25px_rgba(245,158,11,0.4)] cursor-pointer transition-all active:scale-95 flex items-center gap-2"
          >
            <Play className="w-4 h-4 fill-stone-950" />
            <span>Enter Spacetime (Space / Enter)</span>
          </button>

          <div className="mt-8 text-[11px] text-stone-500 font-mono-tabular">
            WASD Move · Space Action · Esc Pause
          </div>
        </div>
      )}

      {/* VICTORY MODAL */}
      {screen === 'victory' && (
        <div className="absolute inset-0 bg-stone-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mb-4">
            <Trophy className="w-8 h-8" />
          </div>
          <h3 className="text-2xl font-bold text-amber-300 font-cinzel">
            TIMELINE STABILIZED!
          </h3>
          <p className="text-xs text-stone-300 mt-2 max-w-sm">
            All temporal anomalies safely tethered and contained. You have unlocked the exclusive <strong className="text-amber-400 font-bold">Chrono Master Gold Lens</strong> for your photo booth!
          </p>
          <div className="mt-4 p-3 rounded-lg bg-stone-900 border border-stone-800 font-mono-tabular text-xs text-stone-400">
            Final Score: <span className="text-amber-300 font-bold">{score}</span>
          </div>
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={startGame}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs cursor-pointer transition-colors flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Play Again
            </button>
            <button
              type="button"
              onClick={onExitGame}
              className="px-5 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold text-xs border border-stone-700 cursor-pointer transition-colors"
            >
              Back to Photo Studio
            </button>
          </div>
        </div>
      )}

      {/* GAME OVER MODAL */}
      {screen === 'gameover' && (
        <div className="absolute inset-0 bg-stone-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
          <h3 className="text-2xl font-bold text-red-400 font-cinzel">
            TEMPORAL PARADOX COLLAPSE
          </h3>
          <p className="text-xs text-stone-400 mt-2 max-w-sm">
            Temporal integrity reached 0%. Spacetime unravelled before the anomalies were neutralized.
          </p>
          <div className="mt-6">
            <button
              type="button"
              onClick={startGame}
              className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs cursor-pointer transition-colors flex items-center gap-1.5"
            >
              <RotateCcw className="w-4 h-4" />
              Reboot Chrono Jump
            </button>
          </div>
        </div>
      )}

      {/* PAUSE MODAL */}
      {screen === 'paused' && (
        <div className="absolute inset-0 bg-stone-950/80 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center">
          <h3 className="text-xl font-bold text-stone-200 font-cinzel mb-4">
            CHRONO DILATION PAUSED
          </h3>
          <button
            type="button"
            onClick={() => {
              simRef.current.screen = 'playing';
              setScreen('playing');
            }}
            className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs cursor-pointer transition-colors"
          >
            Resume Simulation (Esc)
          </button>
        </div>
      )}
    </div>
  );
};
