import React, { useState, useEffect } from 'react';
import {
  X,
  Copy,
  Check,
  Download,
  Share2,
  Zap,
  ShieldCheck,
  AlertTriangle,
  Gamepad2,
  Cpu,
  Tv,
  Layers,
  Sparkles,
} from 'lucide-react';
import { PCBuild, PCPart, CompatibilityCheckResult } from '../../types/pc';
import { calculateBuildTotal } from '../../utils/compatibility';
import { soundFx } from '../../utils/audio';

interface BuildSummaryModalProps {
  build: PCBuild;
  compatibility: CompatibilityCheckResult;
  onClose: () => void;
}

export const BuildSummaryModal: React.FC<BuildSummaryModalProps> = ({
  build,
  compatibility,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const totalPrice = calculateBuildTotal(build);

  // Lock body scroll and listen for Escape key
  useEffect(() => {
    const origOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = origOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Dynamic FPS estimation based on CPU and GPU
  const gpuTier = build.gpu ? (build.gpu.price > 1500 ? 4 : build.gpu.price > 800 ? 3 : 2) : 1;
  const cpuTier = build.cpu ? (build.cpu.price > 400 ? 3 : 2) : 1;

  const estimatedFps = {
    cyberpunk: Math.round(35 * gpuTier * 0.9 + cpuTier * 8),
    blackMyth: Math.round(40 * gpuTier * 0.85 + cpuTier * 10),
    callOfDuty: Math.round(75 * gpuTier + cpuTier * 20),
    valorant: Math.round(220 * cpuTier + gpuTier * 80),
  };

  const handleCopyMarkdown = () => {
    soundFx.playClick();
    const rows = (Object.entries(build) as [string, PCPart | null][])
      .filter(([_, part]) => part !== null)
      .map(([cat, part]) => `- **${cat.toUpperCase()}**: ${part?.name} ($${part?.price.toFixed(2)})`)
      .join('\n');

    const md = `# Forge3D Custom PC Build Configuration\n\n**Total Estimated Price:** $${totalPrice.toFixed(2)}\n**Estimated System Draw:** ~${compatibility.estimatedWattage}W\n\n### Hardware Specification:\n${rows}\n\n*Generated via Forge3D Rig Visualizer*`;

    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadJSON = () => {
    soundFx.playClick();
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(build, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `Forge3D-Build-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div
        id="build-summary-modal"
        className="w-full max-w-3xl max-h-[88vh] bg-[#080808] border border-white/20 shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <div>
            <span className="text-[10px] tracking-[0.25em] text-white/40 uppercase font-bold block mb-1">
              Telemetry & Benchmark Report
            </span>
            <h3 className="text-xl font-black text-white uppercase tracking-tight">
              Rig Specification & Performance
            </h3>
          </div>

          <button
            onClick={() => {
              soundFx.playClick();
              onClose();
            }}
            className="p-2 border border-white/20 hover:bg-white/10 text-white/60 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 flex flex-col gap-6">
          {/* Top Stat Ribbon */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 bg-white/5 border border-white/10 flex flex-col">
              <span className="text-[10px] uppercase font-bold tracking-widest text-white/40">Total Build Price</span>
              <span className="text-2xl font-black font-mono text-white mt-1">${totalPrice.toFixed(2)}</span>
            </div>

            <div className="p-4 bg-white/5 border border-white/10 flex flex-col">
              <span className="text-[10px] uppercase font-bold tracking-widest text-white/40">Estimated Power Draw</span>
              <span className="text-2xl font-black font-mono text-white mt-1">~{compatibility.estimatedWattage} W</span>
            </div>

            <div className="p-4 bg-white/5 border border-white/10 flex flex-col">
              <span className="text-[10px] uppercase font-bold tracking-widest text-white/40">Status Check</span>
              <span className={`text-base font-black uppercase mt-1 flex items-center gap-1.5 ${
                compatibility.isComplete && compatibility.isCompatible ? 'text-emerald-400 font-mono' : 'text-amber-400 font-mono'
              }`}>
                {compatibility.isComplete && compatibility.isCompatible ? (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>100% VALIDATED</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4" />
                    <span>{compatibility.missingRequired.length} SLOTS REQ</span>
                  </>
                )}
              </span>
            </div>
          </div>

          {/* Simulated Gaming Performance */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Gamepad2 className="w-4 h-4 text-white/60" />
              <h4 className="text-xs font-black uppercase tracking-widest text-white">Estimated Gaming Frame Rates</h4>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 bg-black border border-white/10 flex flex-col">
                <span className="text-[10px] text-white/40 font-bold uppercase truncate">Cyberpunk (RT)</span>
                <span className="text-xl font-black font-mono text-white mt-1">{estimatedFps.cyberpunk} FPS</span>
                <span className="text-[9px] text-white/30 font-mono uppercase">4K DLSS 3.5</span>
              </div>

              <div className="p-3 bg-black border border-white/10 flex flex-col">
                <span className="text-[10px] text-white/40 font-bold uppercase truncate">Wukong</span>
                <span className="text-xl font-black font-mono text-white mt-1">{estimatedFps.blackMyth} FPS</span>
                <span className="text-[9px] text-white/30 font-mono uppercase">Very High</span>
              </div>

              <div className="p-3 bg-black border border-white/10 flex flex-col">
                <span className="text-[10px] text-white/40 font-bold uppercase truncate">Warzone</span>
                <span className="text-xl font-black font-mono text-white mt-1">{estimatedFps.callOfDuty} FPS</span>
                <span className="text-[9px] text-white/30 font-mono uppercase">1440p Comp</span>
              </div>

              <div className="p-3 bg-black border border-white/10 flex flex-col">
                <span className="text-[10px] text-white/40 font-bold uppercase truncate">Valorant / CS2</span>
                <span className="text-xl font-black font-mono text-emerald-400 mt-1">{estimatedFps.valorant}+ FPS</span>
                <span className="text-[9px] text-white/30 font-mono uppercase">High Hz</span>
              </div>
            </div>
          </div>

          {/* Installed Hardware List */}
          <div className="flex flex-col gap-2">
            <h4 className="text-xs font-black uppercase tracking-widest text-white">Equipped Hardware Components</h4>
            <div className="border border-white/10 divide-y divide-white/10">
              {(Object.entries(build) as [string, PCPart | null][]).map(([category, part]) => (
                <div key={category} className="p-3 flex items-center justify-between text-xs bg-white/5">
                  <span className="font-mono text-white/40 uppercase w-28 text-[10px] tracking-wider">{category}</span>
                  <span className="font-bold text-white uppercase flex-1 truncate">{part ? part.name : '— EMPTY SLOT —'}</span>
                  <span className="font-mono font-bold text-white ml-3">{part ? `$${part.price.toFixed(2)}` : '$0.00'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-black border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyMarkdown}
              className="px-3.5 py-2 border border-white/20 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'COPIED MARKDOWN' : 'COPY SPEC'}</span>
            </button>

            <button
              onClick={handleDownloadJSON}
              className="px-3.5 py-2 border border-white/20 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>EXPORT JSON</span>
            </button>
          </div>

          <button
            onClick={() => {
              soundFx.playClick();
              onClose();
            }}
            className="px-6 py-2 bg-white hover:bg-emerald-400 text-black font-bold text-xs uppercase tracking-widest transition-colors cursor-pointer"
          >
            DISMISS
          </button>
        </div>
      </div>
    </div>
  );
};
