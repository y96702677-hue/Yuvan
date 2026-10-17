import React, { useState, useEffect } from 'react';
import {
  Camera,
  Compass,
  Film,
  Sparkles,
  Sliders,
  RotateCcw,
  Download,
  Wand2,
  Volume2,
  VolumeX,
  Trophy,
  History,
  Send,
  Eye,
  Check,
} from 'lucide-react';
import { CameraBooth } from './components/CameraBooth.tsx';
import { ChronoCanvas } from './components/ChronoCanvas.tsx';
import { FaceAnalysisModal } from './components/FaceAnalysisModal.tsx';
import { PhotoStripMaker } from './components/PhotoStripMaker.tsx';
import { TimeAnomalyGame } from './components/TimeAnomalyGame.tsx';
import { HISTORICAL_ERAS } from './data/eras.ts';
import { HistoricalEra, BlendingSettings, FaceAnalysisData, ActiveTab } from './types.ts';
import { sounds } from './utils/soundEffects.ts';

// Initial default user portrait so app looks full & ready immediately
const INITIAL_DEMO_PHOTO =
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('booth');
  const [eras, setEras] = useState<HistoricalEra[]>(HISTORICAL_ERAS);
  const [activeEra, setActiveEra] = useState<HistoricalEra>(HISTORICAL_ERAS[0]);
  const [userPhoto, setUserPhoto] = useState<string>(INITIAL_DEMO_PHOTO);
  const [blendingSettings, setBlendingSettings] = useState<BlendingSettings>({
    ...HISTORICAL_ERAS[0].defaultFaceConfig,
    opacity: 0.95,
    sepia: 15,
    grain: 10,
    activeAccessory: undefined,
  });

  const [faceAnalysis, setFaceAnalysis] = useState<FaceAnalysisData | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState<boolean>(false);
  const [customEraInput, setCustomEraInput] = useState<string>('');
  const [refinePrompt, setRefinePrompt] = useState<string>('');
  const [isRefining, setIsRefining] = useState<boolean>(false);
  const [aiLoreText, setAiLoreText] = useState<string>('');
  const [unlockedGoldLens, setUnlockedGoldLens] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(sounds.getMuted());
  const [travelerName, setTravelerName] = useState<string>('Elena Rostova');

  // Sync default face config when changing era
  const handleSelectEra = (era: HistoricalEra) => {
    sounds.playTick();
    setActiveEra(era);
    setBlendingSettings((prev) => ({
      ...prev,
      ...era.defaultFaceConfig,
      activeAccessory: era.accessoryOptions?.[0]?.id,
    }));
  };

  // Called when a photo is snapped in the camera booth
  const handlePhotoCaptured = async (dataUrl: string) => {
    setUserPhoto(dataUrl);
    setActiveTab('studio');
    // Automatically trigger Gemini face analysis
    triggerFaceAnalysis(dataUrl);
  };

  // Trigger server-side Gemini image understanding
  const triggerFaceAnalysis = async (photoUrl: string) => {
    setIsAnalyzing(true);
    try {
      const res = await fetch('/api/analyze-face', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: photoUrl }),
      });
      if (res.ok) {
        const data: FaceAnalysisData = await res.json();
        setFaceAnalysis(data);
        setIsAnalysisModalOpen(true);
      }
    } catch (err) {
      console.error('Error analyzing photo with Gemini:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Handle custom era addition by user
  const handleCreateCustomEra = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEraInput.trim()) return;

    sounds.playTimeWarp();
    const newEra: HistoricalEra = {
      id: `custom_${Date.now()}`,
      name: customEraInput.trim(),
      yearDisplay: 'Custom Era',
      period: 'Temporal Anomaly',
      location: 'Spacetime Nexus',
      description: `A custom timeline destination generated for ${customEraInput.trim()}.`,
      greeting: 'Welcome, traveler of uncharted centuries!',
      trivia: 'Temporal reality shifts constantly when traversing unmapped historical timelines.',
      imageSrc: '',
      fallbackGradient: 'linear-gradient(135deg, #18181b 0%, #3f3f46 100%)',
      defaultFaceConfig: {
        x: 50,
        y: 50,
        scale: 1.0,
        rotation: 0,
        feather: 25,
        warmth: 10,
        brightness: 1.0,
        contrast: 1.1,
        blendMode: 'source-over',
      },
      filterPreset: 'antique-oil',
    };

    setEras((prev) => [newEra, ...prev]);
    handleSelectEra(newEra);
    setCustomEraInput('');
  };

  // Handle AI Text Prompt refinement
  const handleRefineWithAi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refinePrompt.trim()) return;

    setIsRefining(true);
    sounds.playTimeWarp();

    try {
      const res = await fetch('/api/time-travel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userPhotoBase64: userPhoto,
          eraName: activeEra.name,
          userPrompt: refinePrompt,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.generatedImageBase64) {
          // If Gemini generated an image
          setUserPhoto(data.generatedImageBase64);
        }
        if (data.historicalContext) {
          setAiLoreText(`${data.historicalContext} — ${data.stylingTips}`);
        }
      }
    } catch (err) {
      console.error('Refine prompt error:', err);
    } finally {
      setIsRefining(false);
      setRefinePrompt('');
    }
  };

  // Download individual portrait PNG
  const handleDownloadPortrait = () => {
    sounds.playShutter();
    const canvas = document.querySelector('canvas');
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `chronos_${activeEra.id}_portrait.png`;
    link.href = url;
    link.click();
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col antialiased selection:bg-amber-500/30 selection:text-amber-200">
      {/* 
        TOP BAR CONTRACT (Frontend Design Section 2):
        [Brand wordmark, one line] — [4-5 clean single-line nav links] — [1 primary action]
      */}
      <header className="flex items-center justify-between gap-8 px-6 py-4 border-b border-stone-800/80 bg-stone-950/90 backdrop-blur-md sticky top-0 z-40">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-3 whitespace-nowrap shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-stone-950 shadow-[0_0_12px_rgba(245,158,11,0.3)]">
            <Sparkles className="w-4 h-4 fill-stone-950" />
          </div>
          <span className="text-lg font-bold font-cinzel tracking-wider text-amber-200">
            CHRONOS BOOTH
          </span>
        </div>

        {/* Zone 2: 4 Single-Line Nav Links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-semibold uppercase tracking-wider text-stone-400">
          <button
            type="button"
            onClick={() => {
              sounds.playTick();
              setActiveTab('booth');
            }}
            className={`whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
              activeTab === 'booth'
                ? 'text-amber-300 border-b-2 border-amber-400 pb-1'
                : 'hover:text-stone-200'
            }`}
          >
            Photo Chamber
          </button>
          <button
            type="button"
            onClick={() => {
              sounds.playTick();
              setActiveTab('studio');
            }}
            className={`whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
              activeTab === 'studio'
                ? 'text-amber-300 border-b-2 border-amber-400 pb-1'
                : 'hover:text-stone-200'
            }`}
          >
            Time Travel Studio
          </button>
          <button
            type="button"
            onClick={() => {
              sounds.playTick();
              setActiveTab('strip');
            }}
            className={`whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
              activeTab === 'strip'
                ? 'text-amber-300 border-b-2 border-amber-400 pb-1'
                : 'hover:text-stone-200'
            }`}
          >
            Photo Strip
          </button>
          <button
            type="button"
            onClick={() => {
              sounds.playTick();
              setActiveTab('game');
            }}
            className={`whitespace-nowrap shrink-0 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'game'
                ? 'text-amber-300 border-b-2 border-amber-400 pb-1'
                : 'hover:text-stone-200'
            }`}
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>Paradox Arcade</span>
          </button>
        </nav>

        {/* Zone 3: 1 Primary Action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              const muted = sounds.toggleMute();
              setIsMuted(muted);
            }}
            className="p-2 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-900 transition-colors cursor-pointer"
            title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => {
              if (activeTab === 'strip') {
                handleDownloadPortrait();
              } else {
                setActiveTab('booth');
              }
            }}
            className="px-4 py-2 text-xs font-bold text-stone-950 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 rounded-lg shadow-sm transition-all whitespace-nowrap shrink-0 cursor-pointer"
          >
            {activeTab === 'strip' ? 'Export Strip' : 'Snap New Portrait'}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 flex flex-col">
        {/* TAB 1: PHOTO BOOTH CHAMBER */}
        {activeTab === 'booth' && (
          <div className="w-full max-w-4xl mx-auto flex flex-col items-center">
            <div className="text-center mb-6">
              <h1 className="text-2xl md:text-3xl font-extrabold text-stone-100 font-cinzel">
                The Chronos Photo Chamber
              </h1>
              <p className="text-xs text-stone-400 mt-1 max-w-md mx-auto">
                Step inside, align your face within the temporal frame, and let our 35mm optical sensors record your likeness for historical transposition.
              </p>
            </div>

            <CameraBooth
              onPhotoCaptured={handlePhotoCaptured}
              isAnalyzing={isAnalyzing}
            />
          </div>
        )}

        {/* TAB 2: TIME TRAVEL STUDIO */}
        {activeTab === 'studio' && (
          <div className="w-full flex flex-col lg:flex-row gap-8 items-start">
            {/* Left Column: Interactive Canvas & Live Controls */}
            <div className="w-full lg:w-7/12 flex flex-col items-center">
              {/* Canvas viewport container */}
              <div className="relative w-full max-w-md aspect-[3/4] bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl overflow-hidden p-2">
                <ChronoCanvas
                  era={activeEra}
                  userPhotoSrc={userPhoto}
                  settings={blendingSettings}
                  onSettingsChange={setBlendingSettings}
                  interactive={true}
                  className="w-full h-full rounded-xl overflow-hidden"
                />

                {/* Direct drag hint */}
                <div className="absolute top-4 left-4 bg-stone-950/70 backdrop-blur-xs px-2.5 py-1 rounded text-[10px] font-mono-tabular text-stone-300 pointer-events-none">
                  Click & drag face · Wheel to zoom
                </div>

                {/* AI Facial Analysis trigger badge */}
                <button
                  type="button"
                  onClick={() => {
                    if (faceAnalysis) {
                      setIsAnalysisModalOpen(true);
                    } else {
                      triggerFaceAnalysis(userPhoto);
                    }
                  }}
                  className="absolute bottom-4 right-4 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>
                    {isAnalyzing
                      ? 'Analyzing Face...'
                      : faceAnalysis
                      ? 'View AI Analysis'
                      : 'Analyze with Gemini'}
                  </span>
                </button>
              </div>

              {/* Action Strip below Canvas */}
              <div className="w-full max-w-md mt-4 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    sounds.playTick();
                    setBlendingSettings({
                      ...activeEra.defaultFaceConfig,
                      opacity: 0.95,
                      sepia: 15,
                      grain: 10,
                      activeAccessory: activeEra.accessoryOptions?.[0]?.id,
                    });
                  }}
                  className="px-3 py-2 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-800 text-stone-300 text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Alignment</span>
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('strip')}
                    className="px-3.5 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold border border-stone-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Film className="w-3.5 h-3.5 text-amber-400" />
                    <span>Make Photo Strip</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadPortrait}
                    className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold shadow-md transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download PNG</span>
                  </button>
                </div>
              </div>

              {/* AI Lore & Styling Note */}
              {aiLoreText && (
                <div className="w-full max-w-md mt-4 p-3.5 rounded-xl bg-amber-950/20 border border-amber-800/30 text-xs text-amber-200/90 leading-relaxed italic">
                  "{aiLoreText}"
                </div>
              )}
            </div>

            {/* Right Column: Era Picker, Face Adjustments & Prompt Editor */}
            <div className="w-full lg:w-5/12 space-y-6">
              {/* Era Selector Carousel */}
              <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-stone-200 font-cinzel flex items-center gap-2">
                    <Compass className="w-4 h-4 text-amber-400" />
                    <span>Historical Destination</span>
                  </h3>
                  <span className="font-mono-tabular text-xs text-amber-400 font-bold">
                    {activeEra.yearDisplay}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1">
                  {eras.map((era) => {
                    const isSelected = era.id === activeEra.id;
                    return (
                      <button
                        key={era.id}
                        type="button"
                        onClick={() => handleSelectEra(era)}
                        className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer relative overflow-hidden ${
                          isSelected
                            ? 'bg-amber-500/15 border-amber-500 text-amber-200 shadow-sm'
                            : 'bg-stone-950/60 border-stone-800/80 text-stone-400 hover:text-stone-200 hover:border-stone-700'
                        }`}
                      >
                        <span className="text-[10px] font-mono-tabular text-amber-400/90 block">
                          {era.yearDisplay}
                        </span>
                        <span className="text-xs font-bold block truncate mt-0.5 text-stone-200">
                          {era.name}
                        </span>
                        <span className="text-[10px] text-stone-500 block truncate">
                          {era.period}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Custom Era Jump Form */}
                <form onSubmit={handleCreateCustomEra} className="mt-3.5 flex gap-2">
                  <input
                    type="text"
                    value={customEraInput}
                    onChange={(e) => setCustomEraInput(e.target.value)}
                    placeholder="Enter custom era (e.g. 1789 Paris, Edo Samurai)..."
                    className="flex-1 px-3 py-1.5 rounded-lg bg-stone-950 border border-stone-700 text-xs text-stone-200 focus:outline-hidden focus:border-amber-500 transition-colors"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium border border-stone-700 transition-colors cursor-pointer"
                  >
                    Jump
                  </button>
                </form>

                {/* Era Description & Lore */}
                <div className="mt-4 pt-3 border-t border-stone-800/80 text-xs text-stone-400 space-y-1">
                  <p className="leading-relaxed">{activeEra.description}</p>
                  <p className="text-amber-400/80 italic text-[11px] pt-1">
                    "{activeEra.greeting}"
                  </p>
                </div>
              </div>

              {/* Period Accessories Overlay Selector */}
              {activeEra.accessoryOptions && activeEra.accessoryOptions.length > 0 && (
                <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone-300 mb-3 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Period Adornments & Headwear
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setBlendingSettings((s) => ({ ...s, activeAccessory: undefined }))
                      }
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                        !blendingSettings.activeAccessory
                          ? 'bg-amber-500/15 border-amber-500 text-amber-300'
                          : 'bg-stone-950 border-stone-800 text-stone-400 hover:text-stone-200'
                      }`}
                    >
                      None
                    </button>
                    {activeEra.accessoryOptions.map((acc) => (
                      <button
                        key={acc.id}
                        type="button"
                        onClick={() => {
                          sounds.playTick();
                          setBlendingSettings((s) => ({
                            ...s,
                            activeAccessory:
                              s.activeAccessory === acc.id ? undefined : acc.id,
                          }));
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                          blendingSettings.activeAccessory === acc.id
                            ? 'bg-amber-500/15 border-amber-500 text-amber-300'
                            : 'bg-stone-950 border-stone-800 text-stone-400 hover:text-stone-200'
                        }`}
                      >
                        {acc.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Optical Face Fusion Fine-Tuning */}
              <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone-300 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-amber-400" />
                    Face Fusion & Lighting Calibration
                  </h4>
                </div>

                <div className="space-y-3 text-xs">
                  {/* Face Scale */}
                  <div>
                    <div className="flex justify-between text-stone-400 mb-1">
                      <span>Face Scale</span>
                      <span className="font-mono-tabular">
                        {blendingSettings.scale.toFixed(2)}x
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="1.8"
                      step="0.05"
                      value={blendingSettings.scale}
                      onChange={(e) =>
                        setBlendingSettings((s) => ({
                          ...s,
                          scale: parseFloat(e.target.value),
                        }))
                      }
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>

                  {/* Face Rotation */}
                  <div>
                    <div className="flex justify-between text-stone-400 mb-1">
                      <span>Head Tilt / Rotation</span>
                      <span className="font-mono-tabular">
                        {blendingSettings.rotation}°
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-30"
                      max="30"
                      step="1"
                      value={blendingSettings.rotation}
                      onChange={(e) =>
                        setBlendingSettings((s) => ({
                          ...s,
                          rotation: parseInt(e.target.value, 10),
                        }))
                      }
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>

                  {/* Skin Warmth / Ambient Tone */}
                  <div>
                    <div className="flex justify-between text-stone-400 mb-1">
                      <span>Historical Color Temperature</span>
                      <span className="font-mono-tabular">
                        {blendingSettings.warmth > 0 ? `+${blendingSettings.warmth}` : blendingSettings.warmth}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-40"
                      max="40"
                      step="2"
                      value={blendingSettings.warmth}
                      onChange={(e) =>
                        setBlendingSettings((s) => ({
                          ...s,
                          warmth: parseInt(e.target.value, 10),
                        }))
                      }
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>

                  {/* Edge Feather */}
                  <div>
                    <div className="flex justify-between text-stone-400 mb-1">
                      <span>Edge Feathering Radius</span>
                      <span className="font-mono-tabular">
                        {blendingSettings.feather}px
                      </span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="45"
                      step="1"
                      value={blendingSettings.feather}
                      onChange={(e) =>
                        setBlendingSettings((s) => ({
                          ...s,
                          feather: parseInt(e.target.value, 10),
                        }))
                      }
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>

                  {/* Blend Modes */}
                  <div>
                    <span className="text-stone-400 block mb-1.5">
                      Photographic Emulsion Mode
                    </span>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { id: 'source-over', label: 'Direct Cut' },
                        { id: 'soft-light', label: 'Soft Chiaroscuro' },
                        { id: 'overlay', label: 'High Contrast' },
                      ].map((mode) => (
                        <button
                          key={mode.id}
                          type="button"
                          onClick={() =>
                            setBlendingSettings((s) => ({
                              ...s,
                              blendMode: mode.id as GlobalCompositeOperation,
                            }))
                          }
                          className={`py-1 px-2 rounded text-[11px] font-medium border transition-colors cursor-pointer text-center ${
                            blendingSettings.blendMode === mode.id
                              ? 'bg-amber-500/20 border-amber-500 text-amber-200'
                              : 'bg-stone-950 border-stone-800 text-stone-400 hover:text-stone-200'
                          }`}
                        >
                          {mode.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Text Prompt AI Enhancement Input */}
              <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-300 mb-2 flex items-center gap-1.5">
                  <Wand2 className="w-3.5 h-3.5 text-amber-400" />
                  Text-Prompt Chrono Transformation
                </h4>
                <p className="text-[11px] text-stone-400 mb-3">
                  Prompt Gemini to refine lighting, add period attire, or evoke specific historical styles.
                </p>
                <form onSubmit={handleRefineWithAi} className="flex gap-2">
                  <input
                    type="text"
                    value={refinePrompt}
                    onChange={(e) => setRefinePrompt(e.target.value)}
                    placeholder="e.g. 'Add gold crown', '1890s silver daguerreotype'..."
                    className="flex-1 px-3 py-2 rounded-lg bg-stone-950 border border-stone-700 text-xs text-stone-200 focus:outline-hidden focus:border-amber-500 transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={isRefining || !refinePrompt.trim()}
                    className="px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1"
                  >
                    <Send className="w-3 h-3" />
                    <span>{isRefining ? 'Fusing...' : 'Apply'}</span>
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: PHOTO STRIP & PASSPORT */}
        {activeTab === 'strip' && (
          <div className="w-full">
            <PhotoStripMaker
              userPhotoSrc={userPhoto}
              eras={eras}
              activeEra={activeEra}
              userName={travelerName}
              onUpdateUserName={setTravelerName}
            />
          </div>
        )}

        {/* TAB 4: TIME PARADOX ARCADE GAME */}
        {activeTab === 'game' && (
          <div className="w-full max-w-4xl mx-auto flex flex-col items-center">
            <div className="text-center mb-4">
              <h2 className="text-xl md:text-2xl font-bold font-cinzel text-amber-200">
                Chrono-Paradox Anomaly Scanner
              </h2>
              <p className="text-xs text-stone-400 mt-0.5">
                Neutralize temporal paradoxes scattered across history to unlock the Chrono Master Gold Lens.
              </p>
            </div>

            <TimeAnomalyGame
              onUnlockReward={() => setUnlockedGoldLens(true)}
              onExitGame={() => setActiveTab('studio')}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-800/80 py-4 px-6 text-center text-xs text-stone-400 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span>Chronos Time-Travel Photo Booth</span>
          <span aria-hidden="true">·</span>
          <span>Version 2.4</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono-tabular">Origin 2026 AD</span>
        </div>
        <div className="flex items-center gap-3 text-stone-400">
          {unlockedGoldLens && (
            <span className="flex items-center gap-1 text-amber-400 font-bold">
              <Trophy className="w-3.5 h-3.5" />
              Chrono Master Gold Lens Active
            </span>
          )}
          <span>Powered by Gemini Multimodal Vision</span>
        </div>
      </footer>

      {/* Face Analysis Modal */}
      {faceAnalysis && (
        <FaceAnalysisModal
          analysis={faceAnalysis}
          isOpen={isAnalysisModalOpen}
          onClose={() => setIsAnalysisModalOpen(false)}
          onSelectEra={(eraName) => {
            const found = eras.find((e) =>
              e.name.toLowerCase().includes(eraName.toLowerCase())
            );
            if (found) {
              handleSelectEra(found);
            }
          }}
        />
      )}
    </div>
  );
}
