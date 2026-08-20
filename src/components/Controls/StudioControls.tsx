import React from 'react';
import {
  Power,
  Sparkles,
  Layers,
  Eye,
  Sliders,
  Sun,
  Flame,
  Gauge,
  Palette,
  Check,
} from 'lucide-react';
import { StudioSettings, RGBMode } from '../../types/pc';
import { soundFx } from '../../utils/audio';

interface StudioControlsProps {
  settings: StudioSettings;
  onUpdateSettings: (updater: (prev: StudioSettings) => StudioSettings) => void;
  onPowerToggle: () => void;
}

const RGB_MODES: { id: RGBMode; label: string }[] = [
  { id: 'rainbow', label: 'Rainbow Wave' },
  { id: 'synthwave', label: 'Synthwave Neon' },
  { id: 'breathing', label: 'Breathing Glow' },
  { id: 'static', label: 'Static Color' },
  { id: 'off', label: 'Stealth Black' },
];

const LIGHTING_ENVIRONMENTS: {
  id: StudioSettings['environmentLighting'];
  label: string;
  color: string;
}[] = [
  { id: 'studio_dark', label: 'Studio Dark', color: '#08090d' },
  { id: 'cyberpunk_neon', label: 'Cyberpunk Neon', color: '#ec4899' },
  { id: 'studio_clean', label: 'Studio Clean', color: '#ffffff' },
  { id: 'warm_amber', label: 'Warm Amber', color: '#f59e0b' },
];

const COLOR_PRESETS = ['#06b6d4', '#3b82f6', '#ec4899', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ffffff'];

export const StudioControls: React.FC<StudioControlsProps> = ({
  settings,
  onUpdateSettings,
  onPowerToggle,
}) => {
  return (
    <div id="studio-controls-panel" className="w-full bg-[#080808] border border-white/10 p-5 flex flex-col gap-5">
      {/* Power Button & Quick Status */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          <button
            id="btn-master-power"
            onClick={onPowerToggle}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-colors cursor-pointer ${
              settings.isPoweredOn
                ? 'bg-emerald-400 text-black hover:bg-emerald-300'
                : 'bg-white text-black hover:bg-white/90'
            }`}
          >
            <Power className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>{settings.isPoweredOn ? 'ACTIVE // ON' : 'STANDBY // OFF'}</span>
          </button>

          <span className="text-[10px] text-white/40 font-mono uppercase tracking-widest">
            {settings.isPoweredOn ? 'FAN & ARGB ENGAGED' : 'CLICK TO INITIALIZE'}
          </span>
        </div>

        {/* Vertical GPU Riser Toggle */}
        <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-white/70 font-bold uppercase tracking-wider">
          <input
            id="toggle-vertical-gpu"
            type="checkbox"
            checked={settings.gpuVertical}
            onChange={(e) => {
              soundFx.playPartSnap();
              onUpdateSettings((s) => ({ ...s, gpuVertical: e.target.checked }));
            }}
            className="w-4 h-4 rounded text-black bg-white/10 border-white/30 focus:ring-0"
          />
          <span className="text-[11px]">Vertical GPU</span>
        </label>
      </div>

      {/* Exploded View Slider */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-white font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-white/60" />
            <span>Exploded Assembly Offset</span>
          </span>
          <span className="text-white font-mono text-[11px] font-bold">{Math.round(settings.explodedProgress * 100)}%</span>
        </div>
        <input
          id="slider-exploded-view"
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={settings.explodedProgress}
          onChange={(e) => {
            const val = parseFloat(e.target.value);
            onUpdateSettings((s) => ({
              ...s,
              explodedProgress: val,
              viewMode: val > 0 ? 'exploded' : 'normal',
            }));
          }}
          className="w-full h-1 bg-white/20 rounded-none appearance-none cursor-pointer"
        />
      </div>

      {/* Fan Speed Slider */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-white font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
            <Gauge className="w-3.5 h-3.5 text-white/60" />
            <span>PWM Fan RPM Profile</span>
          </span>
          <span className="text-white font-mono text-[11px] font-bold">{settings.fanSpeed}% RPM</span>
        </div>
        <input
          id="slider-fan-speed"
          type="range"
          min="0"
          max="100"
          step="5"
          value={settings.fanSpeed}
          onChange={(e) => {
            const val = parseInt(e.target.value, 10);
            onUpdateSettings((s) => ({ ...s, fanSpeed: val }));
          }}
          className="w-full h-1 bg-white/20 rounded-none appearance-none cursor-pointer"
        />
      </div>

      {/* RGB Lighting Studio */}
      <div className="flex flex-col gap-2.5 pt-2 border-t border-white/10">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-white/60" />
            <span>ARGB Lighting Profile</span>
          </span>

          <label className="flex items-center gap-1.5 text-xs text-white/50 cursor-pointer">
            <input
              id="toggle-rgb-enabled"
              type="checkbox"
              checked={settings.rgb.enabled}
              onChange={(e) => {
                soundFx.playClick();
                onUpdateSettings((s) => ({
                  ...s,
                  rgb: { ...s.rgb, enabled: e.target.checked },
                }));
              }}
              className="w-3.5 h-3.5 text-black bg-white/10 border-white/30"
            />
            <span className="text-[10px] uppercase font-mono tracking-wider">LED ACTIVE</span>
          </label>
        </div>

        {/* RGB Modes */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
          {RGB_MODES.map((mode) => {
            const isActive = settings.rgb.mode === mode.id;
            return (
              <button
                key={mode.id}
                id={`btn-rgb-${mode.id}`}
                onClick={() => {
                  soundFx.playClick();
                  onUpdateSettings((s) => ({
                    ...s,
                    rgb: { ...s.rgb, mode: mode.id, enabled: mode.id !== 'off' },
                  }));
                }}
                className={`px-3 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors border cursor-pointer ${
                  isActive
                    ? 'bg-white text-black border-white'
                    : 'bg-white/5 hover:bg-white/10 text-white/50 hover:text-white border-white/10'
                }`}
              >
                {mode.label}
              </button>
            );
          })}
        </div>

        {/* Color Palette Swatches (when static or breathing) */}
        {(settings.rgb.mode === 'static' || settings.rgb.mode === 'breathing') && (
          <div className="flex items-center gap-2 pt-1">
            {COLOR_PRESETS.map((color) => {
              const isSelected = settings.rgb.color1 === color;
              return (
                <button
                  key={color}
                  onClick={() => {
                    soundFx.playClick();
                    onUpdateSettings((s) => ({
                      ...s,
                      rgb: { ...s.rgb, color1: color },
                    }));
                  }}
                  className={`w-5 h-5 transition-transform flex items-center justify-center cursor-pointer ${
                    isSelected ? 'ring-2 ring-white scale-110' : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                >
                  {isSelected && <Check className="w-3 h-3 text-black font-bold" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Studio Environment Lighting */}
      <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
        <span className="text-[11px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
          <Sun className="w-3.5 h-3.5 text-white/60" />
          <span>Stage Environment</span>
        </span>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {LIGHTING_ENVIRONMENTS.map((env) => {
            const isActive = settings.environmentLighting === env.id;
            return (
              <button
                key={env.id}
                id={`btn-env-${env.id}`}
                onClick={() => {
                  soundFx.playClick();
                  onUpdateSettings((s) => ({ ...s, environmentLighting: env.id }));
                }}
                className={`px-2.5 py-2 text-[10px] font-bold uppercase tracking-wider text-center transition-colors border cursor-pointer ${
                  isActive
                    ? 'bg-white text-black border-white'
                    : 'bg-white/5 hover:bg-white/10 text-white/50 hover:text-white border-white/10'
                }`}
              >
                {env.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
