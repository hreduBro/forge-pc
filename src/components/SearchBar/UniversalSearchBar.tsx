import React, { useState, useRef, useEffect } from 'react';
import { Search, X, Plus, Check, Zap, Sparkles, Filter, SlidersHorizontal, Cpu, HardDrive, Monitor, Fan, Box, Layers } from 'lucide-react';
import { PCPart, PCCategory, PCBuild } from '../../types/pc';
import { PC_PARTS_DATABASE } from '../../data/pcPartsDatabase';
import { soundFx } from '../../utils/audio';

interface UniversalSearchBarProps {
  build: PCBuild;
  onAddPart: (part: PCPart) => void;
  onMultiAddParts: (parts: PCPart[]) => void;
  onOpenCategoryModal: (category: PCCategory) => void;
}

const CATEGORY_TABS: { id: PCCategory | 'all'; label: string; icon?: React.ElementType }[] = [
  { id: 'all', label: 'All Parts' },
  { id: 'case', label: 'Cases' },
  { id: 'cpu', label: 'CPUs' },
  { id: 'gpu', label: 'GPUs' },
  { id: 'cooler', label: 'Coolers' },
  { id: 'motherboard', label: 'Motherboards' },
  { id: 'ram', label: 'Memory' },
  { id: 'storage', label: 'Storage' },
  { id: 'psu', label: 'Power Supply' },
  { id: 'fans', label: 'Fans' },
];

export const UniversalSearchBar: React.FC<UniversalSearchBarProps> = ({
  build,
  onAddPart,
  onMultiAddParts,
  onOpenCategoryModal,
}) => {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<PCCategory | 'all'>('all');
  const [isOpen, setIsOpen] = useState(false);
  const [isMultiParsing, setIsMultiParsing] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Keyboard shortcut '/' or 'Cmd+K' to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === '/' || (e.metaKey && e.key === 'k') || (e.ctrlKey && e.key === 'k')) && document.activeElement !== inputRef.current) {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filter parts based on query and category
  const filteredParts = React.useMemo(() => {
    const cleanQuery = query.toLowerCase().trim();
    return PC_PARTS_DATABASE.filter((part) => {
      // Category filter
      if (activeCategory !== 'all' && part.category !== activeCategory) {
        return false;
      }
      if (!cleanQuery) return true;

      // Match name, brand, model, tags, specs
      const matchName = part.name.toLowerCase().includes(cleanQuery);
      const matchBrand = part.brand.toLowerCase().includes(cleanQuery);
      const matchModel = part.model.toLowerCase().includes(cleanQuery);
      const matchTag = part.tags.some((t) => t.toLowerCase().includes(cleanQuery));
      const matchCategory = part.category.toLowerCase().includes(cleanQuery);
      const matchSocket = part.socket?.toLowerCase().includes(cleanQuery);

      return matchName || matchBrand || matchModel || matchTag || matchCategory || matchSocket;
    });
  }, [query, activeCategory]);

  // Handle Multi-Part Smart Parser (e.g. typing multiple comma-separated parts)
  const handleSmartMultiParse = () => {
    if (!query.trim()) return;
    setIsMultiParsing(true);
    soundFx.playClick();

    const partsToAdd: PCPart[] = [];
    const tokens = query.split(/[,;\n+]+/).map((t) => t.trim().toLowerCase()).filter(Boolean);

    tokens.forEach((token) => {
      const match = PC_PARTS_DATABASE.find(
        (p) =>
          p.name.toLowerCase().includes(token) ||
          p.model.toLowerCase().includes(token) ||
          p.tags.some((tag) => tag.toLowerCase().includes(token)) ||
          p.brand.toLowerCase().includes(token)
      );
      if (match && !partsToAdd.some((existing) => existing.category === match.category)) {
        partsToAdd.push(match);
      }
    });

    if (partsToAdd.length > 0) {
      onMultiAddParts(partsToAdd);
      setQuery('');
      setIsOpen(false);
    } else if (filteredParts.length > 0) {
      onAddPart(filteredParts[0]);
      setQuery('');
      setIsOpen(false);
    }

    setTimeout(() => setIsMultiParsing(false), 400);
  };

  const handleSelectPart = (part: PCPart) => {
    soundFx.playPartSnap();
    onAddPart(part);
    setQuery('');
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredParts.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredParts.length) % Math.max(1, filteredParts.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (query.includes(',') || query.includes('+')) {
        handleSmartMultiParse();
      } else if (filteredParts[selectedIndex]) {
        handleSelectPart(filteredParts[selectedIndex]);
      }
    }
  };

  return (
    <div id="universal-search-section" className="relative w-full z-20" ref={containerRef}>
      {/* Sleek Master Search Input Bar */}
      <div className="relative">
        <div className="relative flex items-center bg-white/5 backdrop-blur-xl border border-white/20 hover:border-white/40 focus-within:border-white/80 transition-colors">
          <div className="pl-4 pr-2 text-white/40">
            <Search className="w-4 h-4" />
          </div>

          <input
            id="pc-part-search-input"
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
              setSelectedIndex(0);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder="SEARCH HARDWARE COMPONENTS (E.G. 'RTX 4090', 'RYZEN 7800X3D', 'O11 DYNAMIC', '64GB DDR5')..."
            className="w-full py-3.5 px-2 bg-transparent text-white placeholder:text-white/30 text-xs sm:text-sm font-bold tracking-wider uppercase focus:outline-none"
          />

          {query && (
            <button
              id="btn-clear-search"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              className="p-1.5 mr-1 text-white/40 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Quick Assemble / Smart Add Action Button */}
          {query && (
            <button
              id="btn-smart-add"
              onClick={handleSmartMultiParse}
              className="mr-2 px-4 py-2 bg-white hover:bg-emerald-400 text-black font-bold text-xs tracking-widest uppercase transition-colors shrink-0 cursor-pointer"
            >
              <span>{query.includes(',') || query.includes('+') ? 'ASSEMBLE' : 'EQUIP'}</span>
            </button>
          )}

          {/* Keyboard Shortcut Indicator */}
          {!query && (
            <div className="hidden sm:flex items-center gap-1 mr-4 text-white/30 font-mono text-xs select-none">
              <span>/</span>
            </div>
          )}
        </div>
      </div>

      {/* Category Pills Slider */}
      <div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto pb-1 no-scrollbar">
        {CATEGORY_TABS.map((tab) => {
          const isActive = activeCategory === tab.id;
          return (
            <button
              key={tab.id}
              id={`tab-cat-${tab.id}`}
              onClick={() => {
                soundFx.playClick();
                setActiveCategory(tab.id);
                setIsOpen(true);
              }}
              className={`px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] whitespace-nowrap transition-colors border cursor-pointer flex items-center gap-1.5 ${
                isActive
                  ? 'bg-white text-black border-white'
                  : 'bg-white/5 hover:bg-white/10 text-white/50 hover:text-white border-white/10'
              }`}
            >
              <span>{tab.label}</span>
              {tab.id !== 'all' && build[tab.id as PCCategory] && (
                <span className={`w-1 h-1 rounded-full ${isActive ? 'bg-black' : 'bg-emerald-400'}`} />
              )}
            </button>
          );
        })}
      </div>

      {/* Dropdown Live Results List */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 max-h-[420px] bg-[#080808] border border-white/20 shadow-2xl overflow-y-auto z-50 divide-y divide-white/10 animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Multi-item Smart Banner if user typed comma/plus list */}
          {(query.includes(',') || query.includes('+')) && (
            <div className="p-3 bg-white/5 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-white/80 font-mono">
                <Sparkles className="w-4 h-4 text-white/60" />
                <span className="uppercase tracking-wider">Multi-Part Spec Token Detected:</span>
              </div>
              <button
                onClick={handleSmartMultiParse}
                className="px-3.5 py-1.5 bg-white hover:bg-emerald-400 text-black font-bold text-xs uppercase tracking-widest cursor-pointer"
              >
                Assemble All
              </button>
            </div>
          )}

          {filteredParts.length === 0 ? (
            <div className="p-8 text-center text-white/40">
              <p className="text-xs font-bold uppercase tracking-widest">No matching components found for "{query}"</p>
              <p className="text-[10px] font-mono text-white/30 mt-1 uppercase tracking-wider">Try searching by category, brand (ASUS, AMD, NVIDIA, NZXT) or clear filters.</p>
            </div>
          ) : (
            filteredParts.map((part, idx) => {
              const isSelected = idx === selectedIndex;
              const isEquipped = build[part.category]?.id === part.id;

              return (
                <div
                  key={part.id}
                  id={`search-result-${part.id}`}
                  onClick={() => handleSelectPart(part)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`p-3.5 flex items-center justify-between gap-4 cursor-pointer transition-colors ${
                    isSelected ? 'bg-white/10' : 'hover:bg-white/5'
                  }`}
                >
                  {/* Left Specs & Meta */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 bg-white/5 border border-white/20 flex items-center justify-center text-white/60 shrink-0 font-mono font-bold text-[10px] uppercase tracking-wider">
                      {part.category.slice(0, 3)}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="text-sm font-bold text-white truncate tracking-tight">{part.name}</span>
                        <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest">
                          STK#{part.id.slice(-3).padStart(3, '0')}
                        </span>
                        <span className="px-1.5 py-0.5 border border-white/20 text-[9px] uppercase font-mono tracking-wider text-white/60">
                          {part.category}
                        </span>
                        {part.visuals.hasRGB && (
                          <span className="px-1.5 py-0.5 border border-white/20 text-white/80 text-[9px] font-bold uppercase tracking-wider">
                            ARGB
                          </span>
                        )}
                        {part.color === 'white' && (
                          <span className="px-1.5 py-0.5 bg-white text-black text-[9px] font-bold uppercase tracking-wider">
                            WHITE
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-white/40 line-clamp-1 mt-0.5 font-mono">{part.description}</p>
                    </div>
                  </div>

                  {/* Right Price & Equip Action */}
                  <div className="flex items-center gap-4 shrink-0">
                    <span className="font-mono text-sm font-bold text-white">${part.price.toFixed(2)}</span>

                    {isEquipped ? (
                      <div className="px-3 py-1.5 border border-emerald-400/40 text-emerald-400 text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        <span>EQUIPPED</span>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectPart(part);
                        }}
                        className="px-3.5 py-1.5 bg-white/10 hover:bg-white hover:text-black text-white text-xs font-bold uppercase tracking-widest border border-white/20 transition-colors cursor-pointer"
                      >
                        EQUIP
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
