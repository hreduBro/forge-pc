import React, { useState } from 'react';
import {
  Sparkles,
  Power,
  ChevronDown,
  BarChart3,
  Layers,
} from 'lucide-react';
import { BUILD_PRESETS } from '../data/pcPartsDatabase';
import { BuildPreset, StudioSettings, CompatibilityCheckResult } from '../types/pc';
import { soundFx } from '../utils/audio';

interface HeaderProps {
  totalPrice: number;
  settings: StudioSettings;
  compatibility?: CompatibilityCheckResult;
  onSelectPreset: (preset: BuildPreset) => void;
  onOpenSummary: () => void;
  onPowerToggle: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  totalPrice,
  settings,
  compatibility,
  onSelectPreset,
  onOpenSummary,
  onPowerToggle,
}) => {
  const [isPresetsOpen, setIsPresetsOpen] = useState(false);

  const tdp = compatibility ? compatibility.estimatedWattage : 640;
  const isComplete = compatibility?.isComplete && compatibility?.isCompatible;

  return (
    <header className="w-full bg-[#050505] border-b border-white/10 px-4 sm:px-8 lg:px-10 py-5 flex flex-col md:flex-row md:items-end justify-between gap-5 z-40 sticky top-0">
      {/* Brand & Main Bold Heading */}
      <div className="flex flex-col">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] tracking-[0.3em] text-white/40 uppercase font-bold">
            System Configurator // 3D Rig Visualizer
          </span>
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
        </div>
        <div className="flex items-baseline gap-4">
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tighter leading-none text-[#F0F0F0] font-sans">
            FORGE.PC
          </h1>
          <span className="hidden sm:inline-block px-2 py-0.5 border border-white/20 text-[10px] font-mono text-white/50 tracking-widest uppercase">
            STABLE_V2.0
          </span>
        </div>
      </div>

      {/* Right Technical Telemetry Stats & Action Controls */}
      <div className="flex flex-wrap items-center md:items-end gap-5 sm:gap-8">
        {/* Telemetry Stats */}
        <div className="flex items-center gap-6 sm:gap-8">
          <div className="text-left md:text-right">
            <span className="block text-[10px] uppercase text-white/40 font-bold tracking-widest">
              Compatibility
            </span>
            <span className={`font-mono text-sm font-bold ${isComplete ? 'text-emerald-400' : 'text-amber-400'}`}>
              {isComplete ? '99.4% VALID' : `${compatibility?.missingRequired.length || 2} SLOTS REQ`}
            </span>
          </div>

          <div className="text-left md:text-right">
            <span className="block text-[10px] uppercase text-white/40 font-bold tracking-widest">
              Total TDP
            </span>
            <span className="text-white font-mono text-sm font-bold">
              {tdp}W
            </span>
          </div>

          <div className="text-left md:text-right">
            <span className="block text-[10px] uppercase text-white/40 font-bold tracking-widest">
              System Cost
            </span>
            <span className="text-white font-mono text-sm font-bold">
              ${totalPrice.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          {/* Curated Presets Dropdown */}
          <div className="relative">
            <button
              id="btn-presets-dropdown"
              onClick={() => {
                soundFx.playClick();
                setIsPresetsOpen(!isPresetsOpen);
              }}
              className="px-3.5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/20 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-white/70" />
              <span>Presets</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isPresetsOpen ? 'rotate-180' : ''}`} />
            </button>

            {isPresetsOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsPresetsOpen(false)}
                />
                <div className="absolute top-full right-0 mt-2 w-72 sm:w-80 bg-[#080808] border border-white/20 shadow-2xl z-50 p-2 flex flex-col gap-1.5 animate-in fade-in slide-in-from-top-2">
                  <div className="px-3 py-1.5 text-[10px] font-mono text-white/40 uppercase tracking-[0.2em] font-bold">
                    Curated Configurations
                  </div>

                  {BUILD_PRESETS.map((preset) => (
                    <div
                      key={preset.id}
                      id={`preset-option-${preset.id}`}
                      onClick={() => {
                        soundFx.playPartSnap();
                        onSelectPreset(preset);
                        setIsPresetsOpen(false);
                      }}
                      className="p-2.5 hover:bg-white/10 cursor-pointer transition-colors border border-transparent hover:border-white/10"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-white uppercase tracking-wider">{preset.name}</span>
                        <span className="px-1.5 py-0.5 border border-white/20 text-white/70 text-[9px] font-mono font-bold uppercase">
                          {preset.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-white/40 line-clamp-1 mt-0.5 font-mono">{preset.tagline}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Benchmark / Specs Modal Button */}
          <button
            id="btn-open-specs-modal"
            onClick={() => {
              soundFx.playClick();
              onOpenSummary();
            }}
            className="px-3.5 py-2.5 border border-white/20 hover:bg-white/10 text-white text-xs font-bold uppercase tracking-widest flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <BarChart3 className="w-3.5 h-3.5 text-white/70" />
            <span className="hidden sm:inline">Benchmark</span>
          </button>

          {/* Power Button */}
          <button
            id="btn-header-power"
            onClick={onPowerToggle}
            className={`px-4 py-2.5 font-bold text-xs uppercase tracking-widest flex items-center gap-2 transition-colors cursor-pointer ${
              settings.isPoweredOn
                ? 'bg-emerald-400 hover:bg-emerald-300 text-black'
                : 'bg-white hover:bg-white/90 text-black'
            }`}
            title={settings.isPoweredOn ? 'System Power On (Active)' : 'Power On System'}
          >
            <Power className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>{settings.isPoweredOn ? 'ACTIVE' : 'BOOT'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
