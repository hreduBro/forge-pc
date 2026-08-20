import React from 'react';
import {
  CheckCircle2,
  CircleDashed,
  Trash2,
  Sparkles,
  Zap,
  RotateCcw,
  Sliders,
  DollarSign,
  Maximize2,
  Box,
  Cpu,
  Tv,
  Fan,
  HardDrive,
  Power,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { PCBuild, PCCategory, PCPart, CompatibilityCheckResult } from '../../types/pc';
import { soundFx } from '../../utils/audio';

interface PartsInventoryProps {
  build: PCBuild;
  compatibility: CompatibilityCheckResult;
  totalPrice: number;
  onOpenCategoryModal: (category: PCCategory) => void;
  onRemovePart: (category: PCCategory) => void;
  onAutoFillMissing: () => void;
  onClearBuild: () => void;
  onFocusComponent: (category: PCCategory) => void;
}

const SLOT_CONFIG: {
  category: PCCategory;
  title: string;
  required: boolean;
  icon: React.ElementType;
}[] = [
  { category: 'case', title: 'Case / Chassis', required: true, icon: Box },
  { category: 'cpu', title: 'Processor (CPU)', required: true, icon: Cpu },
  { category: 'motherboard', title: 'Motherboard', required: true, icon: Layers },
  { category: 'gpu', title: 'Graphics Card (GPU)', required: true, icon: Tv },
  { category: 'cooler', title: 'CPU Cooler', required: true, icon: Fan },
  { category: 'ram', title: 'Memory (RAM)', required: true, icon: Sliders },
  { category: 'storage', title: 'Storage (SSD)', required: true, icon: HardDrive },
  { category: 'psu', title: 'Power Supply', required: true, icon: Power },
  { category: 'fans', title: 'Case Fans', required: false, icon: Fan },
  { category: 'cables', title: 'Custom Cables', required: false, icon: Layers },
];

export const PartsInventory: React.FC<PartsInventoryProps> = ({
  build,
  compatibility,
  totalPrice,
  onOpenCategoryModal,
  onRemovePart,
  onAutoFillMissing,
  onClearBuild,
  onFocusComponent,
}) => {
  const configuredCount = SLOT_CONFIG.filter((s) => s.required && build[s.category]).length;
  const totalRequired = SLOT_CONFIG.filter((s) => s.required).length;
  const progressPercent = Math.round((configuredCount / totalRequired) * 100);

  return (
    <div id="parts-inventory-panel" className="w-full flex flex-col gap-4 bg-[#080808] border border-white/10 p-5">
      {/* Header Summary & Progress */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
        <div>
          <span className="text-[9px] tracking-[0.25em] text-white/40 uppercase font-bold block mb-0.5">
            Active Hardware Manifest
          </span>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-black text-white tracking-tight uppercase">Component Slots</h2>
            <span className="px-2 py-0.5 border border-white/20 text-white font-mono text-[10px] font-bold uppercase">
              {configuredCount}/{totalRequired} REQUIRED
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {configuredCount < totalRequired && (
            <button
              id="btn-autofill-missing"
              onClick={() => {
                soundFx.playPartSnap();
                onAutoFillMissing();
              }}
              className="px-3 py-1.5 bg-white hover:bg-emerald-400 text-black text-xs font-bold uppercase tracking-widest transition-colors cursor-pointer"
              title="Automatically equip compatible parts for remaining empty slots"
            >
              <span>Auto-Fill</span>
            </button>
          )}

          <button
            id="btn-clear-build"
            onClick={() => {
              soundFx.playClick();
              onClearBuild();
            }}
            className="p-2 border border-white/20 hover:bg-white/10 text-white/60 hover:text-white transition-colors cursor-pointer"
            title="Reset all parts"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-white/10 h-1 overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${
            progressPercent === 100 ? 'bg-emerald-400' : 'bg-white'
          }`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Slots List */}
      <div className="flex flex-col gap-2 max-h-[460px] overflow-y-auto pr-1">
        {SLOT_CONFIG.map(({ category, title, required, icon: Icon }, index) => {
          const part = build[category];
          const slotNumber = String(index + 1).padStart(2, '0');

          return (
            <div
              key={category}
              id={`slot-item-${category}`}
              className={`p-3 border transition-colors flex items-center justify-between gap-3 ${
                part
                  ? 'bg-white/5 border-white/15 hover:border-white/30'
                  : 'bg-transparent border-white/10 hover:border-white/20'
              }`}
            >
              {/* Left Slot Details */}
              <div
                onClick={() => {
                  soundFx.playClick();
                  onOpenCategoryModal(category);
                }}
                className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer group"
              >
                <div
                  className={`w-9 h-9 border flex items-center justify-center shrink-0 transition-colors ${
                    part
                      ? 'bg-white/10 text-white border-white/30'
                      : 'bg-transparent text-white/30 border-white/10'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">
                      SLOT#{slotNumber} // {category.toUpperCase()}
                    </span>
                    {required ? (
                      <span className="text-[9px] text-white/30 font-mono font-bold">REQ</span>
                    ) : (
                      <span className="text-[9px] text-white/20 font-mono">OPT</span>
                    )}
                  </div>

                  {part ? (
                    <p className="text-sm font-bold text-white truncate uppercase tracking-tight group-hover:text-emerald-400 transition-colors">
                      {part.name}
                    </p>
                  ) : (
                    <p className="text-xs text-white/30 uppercase tracking-wider font-mono">Select {title}</p>
                  )}
                </div>
              </div>

              {/* Right Slot Actions & Price */}
              <div className="flex items-center gap-2 shrink-0">
                {part ? (
                  <>
                    <span className="font-mono text-xs font-bold text-white">${part.price.toFixed(2)}</span>

                    <button
                      id={`btn-focus-${category}`}
                      onClick={() => {
                        soundFx.playClick();
                        onFocusComponent(category);
                      }}
                      className="p-1.5 border border-white/10 hover:bg-white/10 text-white/60 hover:text-white transition-colors cursor-pointer"
                      title="Focus in 3D View"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      id={`btn-remove-${category}`}
                      onClick={() => {
                        soundFx.playClick();
                        onRemovePart(category);
                      }}
                      className="p-1.5 border border-white/10 hover:bg-white/10 text-white/60 hover:text-white transition-colors cursor-pointer"
                      title="Remove part"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : (
                  <button
                    id={`btn-select-${category}`}
                    onClick={() => {
                      soundFx.playClick();
                      onOpenCategoryModal(category);
                    }}
                    className="px-3 py-1 bg-white/5 hover:bg-white/15 text-white text-[11px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1 border border-white/20 cursor-pointer"
                  >
                    <span>SELECT</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Running Total & Power Draw Footer */}
      <div className="pt-3 border-t border-white/10 flex items-center justify-between">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-widest text-white/40 block">Total Build Cost</span>
          <p className="text-xl font-black font-mono text-white">${totalPrice.toFixed(2)}</p>
        </div>

        <div className="text-right">
          <span className="text-[10px] uppercase font-bold tracking-widest text-white/40 block">Estimated Power</span>
          <p className="text-sm font-bold font-mono text-white">{compatibility.estimatedWattage} Watts</p>
        </div>
      </div>
    </div>
  );
};
