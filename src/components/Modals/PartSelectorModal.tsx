import React, { useState, useEffect } from 'react';
import { X, Search, Check, Plus, Filter, ShieldCheck, Sparkles } from 'lucide-react';
import { PCPart, PCCategory, PCBuild } from '../../types/pc';
import { PC_PARTS_DATABASE } from '../../data/pcPartsDatabase';
import { soundFx } from '../../utils/audio';

interface PartSelectorModalProps {
  category: PCCategory;
  currentBuild: PCBuild;
  onSelectPart: (part: PCPart) => void;
  onClose: () => void;
}

export const PartSelectorModal: React.FC<PartSelectorModalProps> = ({
  category,
  currentBuild,
  onSelectPart,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [selectedColor, setSelectedColor] = useState<string>('all');

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

  const categoryParts = PC_PARTS_DATABASE.filter((p) => p.category === category);
  const brands = ['all', ...Array.from(new Set(categoryParts.map((p) => p.brand)))];

  const filteredParts = categoryParts.filter((part) => {
    if (selectedBrand !== 'all' && part.brand !== selectedBrand) return false;
    if (selectedColor !== 'all' && part.color !== selectedColor) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      part.name.toLowerCase().includes(q) ||
      part.model.toLowerCase().includes(q) ||
      part.tags.some((t) => t.toLowerCase().includes(q))
    );
  });

  const categoryTitles: Record<PCCategory, string> = {
    case: 'Select Computer Chassis / Case',
    cpu: 'Select Processor (CPU)',
    motherboard: 'Select Motherboard',
    gpu: 'Select Graphics Card (GPU)',
    cooler: 'Select CPU Cooler',
    ram: 'Select System Memory (RAM)',
    storage: 'Select NVMe SSD Storage',
    psu: 'Select Power Supply Unit (PSU)',
    fans: 'Select Case Fans & Airflow',
    cables: 'Select Custom Braided Sleeved Cables',
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div
        id="part-selector-modal"
        className="w-full max-w-3xl max-h-[85vh] bg-[#080808] border border-white/20 shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <div>
            <span className="text-[10px] tracking-[0.25em] text-white/40 uppercase font-bold block mb-1">
              Hardware Component Database
            </span>
            <h3 className="text-xl font-black text-white uppercase tracking-tight">{categoryTitles[category]}</h3>
          </div>

          <button
            id="btn-close-modal"
            onClick={() => {
              soundFx.playClick();
              onClose();
            }}
            className="p-2 border border-white/20 hover:bg-white/10 text-white/60 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Bar */}
        <div className="p-4 bg-black/50 border-b border-white/10 flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`FILTER ${category.toUpperCase()}...`}
              className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/20 text-xs font-bold text-white uppercase tracking-wider placeholder:text-white/30 focus:outline-none focus:border-white/60"
            />
          </div>

          {/* Brand Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
            <span className="text-white/40 text-[10px] font-mono uppercase tracking-widest">BRAND:</span>
            {brands.map((b) => (
              <button
                key={b}
                onClick={() => {
                  soundFx.playClick();
                  setSelectedBrand(b);
                }}
                className={`px-3 py-1 uppercase text-[10px] font-bold tracking-wider transition-colors border cursor-pointer ${
                  selectedBrand === b
                    ? 'bg-white text-black border-white'
                    : 'bg-white/5 text-white/50 hover:text-white border-white/10'
                }`}
              >
                {b}
              </button>
            ))}
          </div>
        </div>

        {/* Parts Cards List */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {filteredParts.length === 0 ? (
            <div className="py-12 text-center text-white/40">
              <p className="text-sm font-bold uppercase tracking-wider">No {category} found matching filter</p>
              <p className="text-xs font-mono text-white/30 mt-1 uppercase">Try resetting search or brand selection.</p>
            </div>
          ) : (
            filteredParts.map((part) => {
              const isEquipped = currentBuild[category]?.id === part.id;

              return (
                <div
                  key={part.id}
                  id={`modal-card-${part.id}`}
                  className={`p-4 border transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                    isEquipped
                      ? 'bg-white/10 border-white/40'
                      : 'bg-white/5 hover:bg-white/10 border-white/10'
                  }`}
                >
                  {/* Left Specs */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base font-bold text-white uppercase tracking-tight">{part.name}</span>
                      <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest">
                        STK#{part.id.slice(-3).padStart(3, '0')}
                      </span>
                      <span className="px-1.5 py-0.5 border border-white/20 text-[9px] font-mono uppercase text-white/60">
                        {part.brand}
                      </span>
                      {part.visuals.hasRGB && (
                        <span className="px-1.5 py-0.5 border border-white/20 text-white text-[9px] font-bold uppercase tracking-wider">
                          ARGB
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-white/40 mt-1 font-mono">{part.description}</p>

                    {/* Technical Specs Badges */}
                    <div className="flex flex-wrap items-center gap-2 mt-2 text-[10px] text-white/60 font-mono">
                      {Object.entries(part.specs).slice(0, 3).map(([key, val]) => (
                        <span key={key} className="px-2 py-0.5 border border-white/15 bg-black/40">
                          {key.toUpperCase()}: <strong className="text-white">{String(val)}</strong>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Right Price & Equip Action */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-3 shrink-0">
                    <span className="font-mono text-base font-bold text-white">${part.price.toFixed(2)}</span>

                    {isEquipped ? (
                      <div className="px-3.5 py-1.5 border border-emerald-400/40 text-emerald-400 text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        <span>EQUIPPED</span>
                      </div>
                    ) : (
                      <button
                        id={`btn-equip-${part.id}`}
                        onClick={() => {
                          soundFx.playPartSnap();
                          onSelectPart(part);
                        }}
                        className="px-4 py-2 bg-white hover:bg-emerald-400 text-black font-bold text-xs uppercase tracking-widest transition-colors cursor-pointer"
                      >
                        EQUIP TO RIG
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
