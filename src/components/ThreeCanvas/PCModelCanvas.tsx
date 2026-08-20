import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  Eye,
  Flame,
  Layers,
  RotateCcw,
  Volume2,
  VolumeX,
  ShieldCheck,
  AlertTriangle,
  Compass,
  Play,
  Pause,
  Sun,
  Monitor,
  Cpu,
  Tv,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Expand,
  Sparkles,
} from 'lucide-react';
import { PCBuild, StudioSettings, PCCategory, CompatibilityCheckResult } from '../../types/pc';
import { ThreePCScene, CameraPreset } from './ThreePCScene';
import { soundFx } from '../../utils/audio';

interface PCModelCanvasProps {
  build: PCBuild;
  settings: StudioSettings;
  compatibility: CompatibilityCheckResult;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  onUpdateSettings: (updater: (prev: StudioSettings) => StudioSettings) => void;
  onSelectCategory: (category: PCCategory) => void;
}

export const PCModelCanvas: React.FC<PCModelCanvasProps> = ({
  build,
  settings,
  compatibility,
  isExpanded = false,
  onToggleExpand,
  onUpdateSettings,
  onSelectCategory,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<ThreePCScene | null>(null);
  const [hoveredCategory, setHoveredCategory] = useState<PCCategory | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isTurntable, setIsTurntable] = useState(false);
  const [snapshotSuccess, setSnapshotSuccess] = useState(false);
  const [activePreset, setActivePreset] = useState<CameraPreset>('hero');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Initialize ThreePCScene
  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new ThreePCScene(containerRef.current, {
      onSelectCategory: (cat) => {
        soundFx.playClick();
        onSelectCategory(cat);
      },
      onHoverCategory: (cat) => {
        setHoveredCategory(cat);
      },
    });

    // Immediately render current build state on mount so model is visible with zero latency
    scene.updateBuild(build, settings);
    sceneRef.current = scene;

    // Safety layout check for flex container stabilization
    const timer1 = setTimeout(() => scene.handleResize(), 50);
    const timer2 = setTimeout(() => scene.handleResize(), 250);

    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      setTimeout(() => scene.handleResize(), 100);
    };
    document.addEventListener('fullscreenchange', handleFsChange);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      document.removeEventListener('fullscreenchange', handleFsChange);
      scene.dispose();
      sceneRef.current = null;
    };
  }, []); // Mount once and drive updates via subsequent effects

  // Update 3D scene when physical build parts change
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.updateBuild(build, settings);
    }
  }, [build, settings.gpuVertical]);

  // Fast-path: Apply visual settings without reconstructing 3D geometry
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.applySettings(settings);
    }
  }, [
    settings.explodedProgress,
    settings.glassPanelOpen,
    settings.viewMode,
    settings.fanSpeed,
    settings.environmentLighting,
    settings.rgb,
    settings.isPoweredOn,
  ]);

  // Handle focused category camera motion
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.focusOnCategory(settings.selectedComponent);
    }
  }, [settings.selectedComponent]);

  // Handle container resize when expanding/collapsing studio mode
  useEffect(() => {
    const timer = setTimeout(() => {
      if (sceneRef.current) {
        sceneRef.current.handleResize();
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [isExpanded]);

  const handleToggleGlass = () => {
    soundFx.playPartSnap();
    onUpdateSettings((s) => ({ ...s, glassPanelOpen: !s.glassPanelOpen }));
  };

  const handleToggleThermals = () => {
    soundFx.playClick();
    onUpdateSettings((s) => ({
      ...s,
      viewMode: s.viewMode === 'thermals' ? 'normal' : 'thermals',
    }));
  };

  const handleToggleExploded = () => {
    soundFx.playClick();
    onUpdateSettings((s) => ({
      ...s,
      explodedProgress: s.explodedProgress > 0 ? 0 : 0.75,
      viewMode: s.explodedProgress > 0 ? 'normal' : 'exploded',
    }));
  };

  const handleResetCamera = () => {
    soundFx.playClick();
    setActivePreset('hero');
    if (sceneRef.current) {
      sceneRef.current.resetCamera();
    }
  };

  const handleZoomIn = () => {
    soundFx.playClick();
    if (sceneRef.current) {
      sceneRef.current.zoomBy(-0.8);
    }
  };

  const handleZoomOut = () => {
    soundFx.playClick();
    if (sceneRef.current) {
      sceneRef.current.zoomBy(0.8);
    }
  };

  const handleSelectPreset = (preset: CameraPreset) => {
    soundFx.playClick();
    setActivePreset(preset);
    if (sceneRef.current) {
      sceneRef.current.setCameraPreset(preset);
    }
  };

  const handleToggleTurntable = () => {
    soundFx.playClick();
    const next = !isTurntable;
    setIsTurntable(next);
    if (sceneRef.current) {
      sceneRef.current.isTurntableActive = next;
    }
  };

  const handleToggleFullscreen = () => {
    soundFx.playClick();
    if (!wrapperRef.current) return;

    if (!document.fullscreenElement) {
      wrapperRef.current.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  const handleCycleLighting = () => {
    soundFx.playClick();
    const presets: Array<StudioSettings['environmentLighting']> = [
      'studio_dark',
      'cyberpunk_neon',
      'studio_clean',
      'warm_amber',
    ];
    const currentIdx = presets.indexOf(settings.environmentLighting);
    const nextPreset = presets[(currentIdx + 1) % presets.length];
    onUpdateSettings((s) => ({ ...s, environmentLighting: nextPreset }));
  };

  const handleSnapshot = () => {
    if (!sceneRef.current) return;
    soundFx.playClick();
    const dataUrl = sceneRef.current.captureSnapshot();
    const link = document.createElement('a');
    link.download = `Forge3D-Rig-BlenderSpec-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();

    setSnapshotSuccess(true);
    setTimeout(() => setSnapshotSuccess(false), 2200);
  };

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    soundFx.setMuted(next);
  };

  const hoveredPart = hoveredCategory ? build[hoveredCategory] : null;

  return (
    <div
      ref={wrapperRef}
      id="pc-3d-viewport-container"
      className={`relative w-full h-full min-h-[540px] sm:min-h-[640px] lg:min-h-[740px] overflow-hidden bg-[#06070a] border border-white/10 flex flex-col group select-none ${
        isFullscreen ? 'fixed inset-0 z-[200] border-0 min-h-screen' : ''
      }`}
    >
      {/* Architectural Corner Bracket Accents */}
      <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-white/60 pointer-events-none z-20" />
      <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-white/60 pointer-events-none z-20" />
      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-white/60 pointer-events-none z-20" />
      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-white/60 pointer-events-none z-20" />

      {/* Subtle Dot Grid Background Overlay */}
      <div className="absolute inset-0 bg-tech-dots opacity-20 pointer-events-none" />

      {/* 3D Canvas Mount Element */}
      <div ref={containerRef} className="w-full h-full flex-1 cursor-grab active:cursor-grabbing select-none relative z-10" />

      {/* Top Floating Status Overlay */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none gap-2 z-20">
        {/* Live System Specs Badge */}
        <div className="pointer-events-auto flex items-center gap-3 px-3.5 py-2 bg-black/85 backdrop-blur-md border border-white/15 text-xs shadow-xl">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                settings.isPoweredOn
                  ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)] animate-pulse'
                  : 'bg-white/30'
              }`}
            />
            <span className="font-bold tracking-widest text-white uppercase text-[10px]">
              {settings.isPoweredOn ? 'SYSTEM ACTIVE' : 'STANDBY'}
            </span>
          </div>

          <div className="h-3 w-px bg-white/20" />

          <div className="flex items-center gap-3 text-white/70 font-mono text-[11px]">
            <span>
              EST. <strong className="text-white">{compatibility.estimatedWattage}W</strong>
            </span>
            <span className="hidden sm:inline">
              FAN <strong className="text-white">{settings.isPoweredOn ? `${settings.fanSpeed}%` : '0%'}</strong>
            </span>
          </div>
        </div>

        {/* Top Right Controls (Validation, Studio Lighting, Turntable, Expand Viewport, Audio) */}
        <div className="pointer-events-auto flex items-center gap-2">
          {compatibility.isComplete && compatibility.isCompatible ? (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-black/85 border border-emerald-400/50 text-emerald-400 text-[10px] font-mono font-bold uppercase tracking-widest backdrop-blur-md shadow-lg">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>100% VALIDATED</span>
            </div>
          ) : compatibility.issues.length > 0 ? (
            <div className="flex items-center gap-1.5 px-3 py-2 bg-black/85 border border-red-400/50 text-red-400 text-[10px] font-mono font-bold uppercase tracking-widest backdrop-blur-md shadow-lg">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{compatibility.issues.length} ISSUE DETECTED</span>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-black/85 border border-white/20 text-white/70 text-[10px] font-mono font-bold uppercase tracking-widest backdrop-blur-md">
              <span>{compatibility.missingRequired.length} SLOTS REMAINING</span>
            </div>
          )}

          {/* Lighting Mode Quick Toggle */}
          <button
            id="btn-lighting-preset"
            onClick={handleCycleLighting}
            className="p-2.5 bg-black/85 hover:bg-white/15 border border-white/20 text-white transition-colors cursor-pointer backdrop-blur-md shadow-lg flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider"
            title={`Lighting: ${settings.environmentLighting.replace('_', ' ').toUpperCase()}`}
          >
            <Sun className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline text-[10px]">{settings.environmentLighting.split('_')[0]}</span>
          </button>

          {/* Turntable Auto-Spin */}
          <button
            id="btn-turntable-toggle"
            onClick={handleToggleTurntable}
            className={`p-2.5 border transition-colors cursor-pointer backdrop-blur-md shadow-lg flex items-center gap-1.5 ${
              isTurntable
                ? 'bg-cyan-500 text-black border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.6)]'
                : 'bg-black/85 hover:bg-white/15 border-white/20 text-white'
            }`}
            title={isTurntable ? 'Stop 360° Turntable' : 'Start 360° Turntable Showcase'}
          >
            {isTurntable ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span className="hidden md:inline text-[10px] font-bold uppercase font-mono tracking-wider">360° SPIN</span>
          </button>

          {/* Expand / Theater Mode Button */}
          {onToggleExpand && (
            <button
              id="btn-expand-viewport"
              onClick={onToggleExpand}
              className={`p-2.5 border transition-colors cursor-pointer backdrop-blur-md shadow-lg flex items-center gap-1.5 ${
                isExpanded
                  ? 'bg-white text-black border-white'
                  : 'bg-black/85 hover:bg-white/15 border-white/20 text-white'
              }`}
              title={isExpanded ? 'Collapse to Split View' : 'Expand to Full Studio Canvas'}
            >
              {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              <span className="hidden lg:inline text-[10px] font-bold uppercase font-mono tracking-wider">
                {isExpanded ? 'SPLIT VIEW' : 'WIDE STUDIO'}
              </span>
            </button>
          )}

          {/* True Fullscreen Toggle */}
          <button
            id="btn-fullscreen-toggle"
            onClick={handleToggleFullscreen}
            className="p-2.5 bg-black/85 hover:bg-white/15 border border-white/20 text-white transition-colors cursor-pointer backdrop-blur-md shadow-lg"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen Mode'}
          >
            <Expand className="w-3.5 h-3.5 text-white" />
          </button>

          {/* Sound Toggle */}
          <button
            id="btn-sound-toggle"
            onClick={toggleMute}
            className="p-2.5 bg-black/85 hover:bg-white/15 border border-white/20 text-white transition-colors cursor-pointer backdrop-blur-md shadow-lg"
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-white/40" /> : <Volume2 className="w-3.5 h-3.5 text-white" />}
          </button>
        </div>
      </div>

      {/* Floating Cinematic Camera Angle Quick Switcher (Top-Center) */}
      <div className="absolute top-16 left-1/2 -translate-x-1/2 pointer-events-auto flex items-center gap-1 p-1 bg-black/90 backdrop-blur-md border border-white/15 shadow-2xl z-20">
        <button
          onClick={() => handleSelectPreset('hero')}
          className={`px-2.5 py-1 text-[10px] font-bold uppercase font-mono tracking-wider transition-all cursor-pointer ${
            activePreset === 'hero' ? 'bg-white text-black' : 'text-white/60 hover:text-white hover:bg-white/10'
          }`}
          title="Isometric Hero View"
        >
          Hero
        </button>
        <button
          onClick={() => handleSelectPreset('internals')}
          className={`px-2.5 py-1 text-[10px] font-bold uppercase font-mono tracking-wider transition-all cursor-pointer ${
            activePreset === 'internals' ? 'bg-white text-black' : 'text-white/60 hover:text-white hover:bg-white/10'
          }`}
          title="Direct Internals View"
        >
          Internals
        </button>
        <button
          onClick={() => handleSelectPreset('gpu')}
          className={`px-2.5 py-1 text-[10px] font-bold uppercase font-mono tracking-wider transition-all cursor-pointer flex items-center gap-1 ${
            activePreset === 'gpu' ? 'bg-white text-black' : 'text-white/60 hover:text-white hover:bg-white/10'
          }`}
          title="GPU Close-Up"
        >
          <Tv className="w-3 h-3" />
          <span>GPU</span>
        </button>
        <button
          onClick={() => handleSelectPreset('cpu')}
          className={`px-2.5 py-1 text-[10px] font-bold uppercase font-mono tracking-wider transition-all cursor-pointer flex items-center gap-1 ${
            activePreset === 'cpu' ? 'bg-white text-black' : 'text-white/60 hover:text-white hover:bg-white/10'
          }`}
          title="CPU & Cooler Close-Up"
        >
          <Cpu className="w-3 h-3" />
          <span>CPU</span>
        </button>
        <button
          onClick={() => handleSelectPreset('top')}
          className={`px-2.5 py-1 text-[10px] font-bold uppercase font-mono tracking-wider transition-all cursor-pointer hidden sm:block ${
            activePreset === 'top' ? 'bg-white text-black' : 'text-white/60 hover:text-white hover:bg-white/10'
          }`}
          title="Top Exhaust View"
        >
          Top
        </button>
        <button
          onClick={() => handleSelectPreset('rear')}
          className={`px-2.5 py-1 text-[10px] font-bold uppercase font-mono tracking-wider transition-all cursor-pointer hidden sm:block ${
            activePreset === 'rear' ? 'bg-white text-black' : 'text-white/60 hover:text-white hover:bg-white/10'
          }`}
          title="Rear I/O Shield View"
        >
          Rear
        </button>
      </div>

      {/* Floating Zoom & Framing Buttons (Left Edge) */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-auto flex flex-col gap-1.5 p-1 bg-black/90 backdrop-blur-md border border-white/15 shadow-2xl z-20">
        <button
          id="btn-zoom-in"
          onClick={handleZoomIn}
          className="p-2 text-white/70 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
          title="Zoom In (+)"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          id="btn-zoom-out"
          onClick={handleZoomOut}
          className="p-2 text-white/70 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
          title="Zoom Out (-)"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <div className="h-px bg-white/20 my-0.5" />
        <button
          id="btn-quick-reset"
          onClick={handleResetCamera}
          className="p-2 text-white/70 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
          title="Reset Camera Center"
        >
          <Compass className="w-4 h-4" />
        </button>
      </div>

      {/* Hovered Component Tooltip Overlay */}
      {hoveredCategory && (
        <div className="absolute top-28 left-1/2 -translate-x-1/2 px-5 py-2.5 bg-black/95 border border-white/40 backdrop-blur-lg shadow-2xl text-center pointer-events-none transition-all duration-200 animate-in fade-in z-20">
          <p className="text-[9px] uppercase tracking-[0.3em] text-white/50 font-bold font-mono">
            SLOT // {hoveredCategory.toUpperCase()}
          </p>
          <p className="text-sm font-black text-white tracking-tight uppercase">
            {hoveredPart ? hoveredPart.name : `EMPTY ${hoveredCategory} SLOT`}
          </p>
          <p className="text-[9px] text-emerald-400 font-mono mt-0.5 tracking-wider uppercase">CLICK TO CONFIGURE</p>
        </div>
      )}

      {/* Bottom Floating Control Ribbon */}
      <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center justify-between gap-3 pointer-events-none z-20">
        {/* Left Interactive Tool Buttons */}
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            id="btn-quick-explode"
            onClick={handleToggleExploded}
            className={`px-3.5 py-2 text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-colors cursor-pointer shadow-lg ${
              settings.explodedProgress > 0
                ? 'bg-white text-black'
                : 'bg-black/85 text-white hover:bg-white/15 border border-white/20'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Exploded View</span>
          </button>

          <button
            id="btn-quick-thermals"
            onClick={handleToggleThermals}
            className={`px-3.5 py-2 text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-colors cursor-pointer shadow-lg ${
              settings.viewMode === 'thermals'
                ? 'bg-white text-black'
                : 'bg-black/85 text-white hover:bg-white/15 border border-white/20'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-orange-400" />
            <span>Thermal Flow</span>
          </button>

          <button
            id="btn-quick-glass-door"
            onClick={handleToggleGlass}
            className={`px-3.5 py-2 text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-colors cursor-pointer shadow-lg ${
              settings.glassPanelOpen
                ? 'bg-white text-black'
                : 'bg-black/85 text-white hover:bg-white/15 border border-white/20'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{settings.glassPanelOpen ? 'Chassis Opened' : 'Open Chassis'}</span>
          </button>
        </div>

        {/* Right Camera & Snapshot Actions */}
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            id="btn-reset-camera"
            onClick={handleResetCamera}
            className="px-3 py-2 text-xs font-bold uppercase tracking-widest text-white bg-black/85 hover:bg-white/15 border border-white/20 transition-colors flex items-center gap-1.5 cursor-pointer shadow-lg"
            title="Reset Camera Angle"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Reset</span>
          </button>

          <button
            id="btn-take-snapshot"
            onClick={handleSnapshot}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-widest flex items-center gap-1.5 transition-colors cursor-pointer shadow-xl ${
              snapshotSuccess
                ? 'bg-emerald-400 text-black shadow-[0_0_12px_rgba(52,211,153,0.8)]'
                : 'bg-white hover:bg-emerald-400 text-black'
            }`}
            title="Save high-res 3D PNG screenshot"
          >
            <Camera className="w-3.5 h-3.5 stroke-[2.2]" />
            <span>{snapshotSuccess ? 'SAVED PNG' : 'EXPORT SPEC'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

