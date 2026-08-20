import React, { useState, useMemo, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { Header } from './components/Header';
import { UniversalSearchBar } from './components/SearchBar/UniversalSearchBar';
import { PCModelCanvas } from './components/ThreeCanvas/PCModelCanvas';
import { PartsInventory } from './components/PartsList/PartsInventory';
import { StudioControls } from './components/Controls/StudioControls';
import { PartSelectorModal } from './components/Modals/PartSelectorModal';
import { BuildSummaryModal } from './components/Modals/BuildSummaryModal';
import { PCBuild, StudioSettings, PCCategory, PCPart, BuildPreset } from './types/pc';
import { PC_PARTS_DATABASE, BUILD_PRESETS } from './data/pcPartsDatabase';
import { checkBuildCompatibility, calculateBuildTotal, REQUIRED_CATEGORIES } from './utils/compatibility';
import { soundFx } from './utils/audio';

export default function App() {
  // Initialize with the Apex Predator Preset as default showcase
  const [build, setBuild] = useState<PCBuild>(() => {
    const defaultPreset = BUILD_PRESETS[0];
    const initial: PCBuild = {
      case: null,
      cpu: null,
      motherboard: null,
      gpu: null,
      cooler: null,
      ram: null,
      storage: null,
      psu: null,
      fans: null,
      cables: null,
    };

    Object.entries(defaultPreset.parts).forEach(([cat, partId]) => {
      const found = PC_PARTS_DATABASE.find((p) => p.id === partId);
      if (found) {
        initial[cat as PCCategory] = found;
      }
    });

    return initial;
  });

  // Studio Settings State
  const [settings, setSettings] = useState<StudioSettings>({
    isPoweredOn: true,
    explodedProgress: 0,
    glassPanelOpen: false,
    viewMode: 'normal',
    fanSpeed: 80,
    environmentLighting: 'studio_dark',
    rgb: {
      enabled: true,
      mode: 'rainbow',
      color1: '#06b6d4',
      color2: '#ec4899',
      speed: 1.0,
      brightness: 85,
    },
    gpuVertical: false,
    showCableManagement: true,
    selectedComponent: null,
  });

  // Modals & Viewport state
  const [activeCategoryModal, setActiveCategoryModal] = useState<PCCategory | null>(null);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [isExpandedStudio, setIsExpandedStudio] = useState(false);

  // Derived compatibility & total calculations
  const compatibility = useMemo(() => checkBuildCompatibility(build), [build]);
  const totalPrice = useMemo(() => calculateBuildTotal(build), [build]);

  // Add or Replace a Part
  const handleAddPart = useCallback((part: PCPart) => {
    setBuild((prev) => ({
      ...prev,
      [part.category]: part,
    }));
  }, []);

  // Multi-Add Parts (from smart search parser or presets)
  const handleMultiAddParts = useCallback((parts: PCPart[]) => {
    setBuild((prev) => {
      const next = { ...prev };
      parts.forEach((p) => {
        next[p.category] = p;
      });
      return next;
    });
  }, []);

  // Remove Part
  const handleRemovePart = useCallback((category: PCCategory) => {
    setBuild((prev) => ({
      ...prev,
      [category]: null,
    }));
  }, []);

  // Auto-Fill Missing Required Parts with compatible defaults
  const handleAutoFillMissing = useCallback(() => {
    setBuild((prev) => {
      const next = { ...prev };
      REQUIRED_CATEGORIES.forEach((cat) => {
        if (!next[cat]) {
          const fallback = PC_PARTS_DATABASE.find((p) => p.category === cat);
          if (fallback) {
            next[cat] = fallback;
          }
        }
      });
      return next;
    });
  }, []);

  // Clear Build
  const handleClearBuild = useCallback(() => {
    setBuild({
      case: null,
      cpu: null,
      motherboard: null,
      gpu: null,
      cooler: null,
      ram: null,
      storage: null,
      psu: null,
      fans: null,
      cables: null,
    });
  }, []);

  // Select Preset Rig
  const handleSelectPreset = useCallback((preset: BuildPreset) => {
    const next: PCBuild = {
      case: null,
      cpu: null,
      motherboard: null,
      gpu: null,
      cooler: null,
      ram: null,
      storage: null,
      psu: null,
      fans: null,
      cables: null,
    };

    Object.entries(preset.parts).forEach(([cat, partId]) => {
      const found = PC_PARTS_DATABASE.find((p) => p.id === partId);
      if (found) {
        next[cat as PCCategory] = found;
      }
    });

    setBuild(next);
  }, []);

  // Power On / Toggle System
  const handlePowerToggle = useCallback(() => {
    setSettings((prev) => {
      const nextPowered = !prev.isPoweredOn;
      if (nextPowered) {
        soundFx.playSystemBoot();
        // Fire celebration if build is 100% complete
        if (compatibility.isComplete && compatibility.isCompatible) {
          try {
            confetti({
              particleCount: 60,
              spread: 70,
              origin: { y: 0.6 },
              colors: ['#06b6d4', '#3b82f6', '#ec4899', '#34d399'],
            });
          } catch {
            // Ignore confetti errors
          }
        }
      } else {
        soundFx.playClick();
      }
      return { ...prev, isPoweredOn: nextPowered };
    });
  }, [compatibility.isComplete, compatibility.isCompatible]);

  return (
    <div className="min-h-screen bg-[#050505] text-[#F0F0F0] flex flex-col font-sans selection:bg-white selection:text-black">
      {/* Top Header */}
      <Header
        totalPrice={totalPrice}
        settings={settings}
        compatibility={compatibility}
        onSelectPreset={handleSelectPreset}
        onOpenSummary={() => setShowSummaryModal(true)}
        onPowerToggle={handlePowerToggle}
      />

      {/* Main Workspace */}
      <main className="flex-1 w-full max-w-[1720px] mx-auto px-3 sm:px-5 lg:px-7 py-5 flex flex-col gap-5">
        {/* Universal Search Bar */}
        <UniversalSearchBar
          build={build}
          onAddPart={handleAddPart}
          onMultiAddParts={handleMultiAddParts}
          onOpenCategoryModal={(cat) => setActiveCategoryModal(cat)}
        />

        {/* 3D Visualizer & Hardware Panels Layout */}
        {isExpandedStudio ? (
          /* EXPANDED THEATER / STUDIO LAYOUT: Full-width massive viewport with multi-column dashboard below */
          <div className="flex flex-col gap-6">
            {/* Full-width 3D Canvas Studio Viewport */}
            <div className="w-full h-[620px] sm:h-[740px] lg:h-[840px] xl:h-[900px] z-10">
              <PCModelCanvas
                build={build}
                settings={settings}
                compatibility={compatibility}
                isExpanded={isExpandedStudio}
                onToggleExpand={() => setIsExpandedStudio(false)}
                onUpdateSettings={setSettings}
                onSelectCategory={(cat) => setActiveCategoryModal(cat)}
              />
            </div>

            {/* Expansive Bottom Control Modules Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-7 xl:col-span-8">
                <PartsInventory
                  build={build}
                  compatibility={compatibility}
                  totalPrice={totalPrice}
                  onOpenCategoryModal={(cat) => setActiveCategoryModal(cat)}
                  onRemovePart={handleRemovePart}
                  onAutoFillMissing={handleAutoFillMissing}
                  onClearBuild={handleClearBuild}
                  onFocusComponent={(cat) => setSettings((s) => ({ ...s, selectedComponent: cat }))}
                />
              </div>
              <div className="lg:col-span-5 xl:col-span-4">
                <StudioControls
                  settings={settings}
                  onUpdateSettings={setSettings}
                  onPowerToggle={handlePowerToggle}
                />
              </div>
            </div>
          </div>
        ) : (
          /* STANDARD HIGH-PRODUCTIVITY SPLIT VIEW: Large prominent viewport with side panel */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left / Center 3D Viewport (8 Cols on desktop with tall height) */}
            <div className="lg:col-span-7 xl:col-span-8 w-full h-[540px] sm:h-[650px] lg:h-[780px] xl:h-[840px] lg:sticky lg:top-24 z-10">
              <PCModelCanvas
                build={build}
                settings={settings}
                compatibility={compatibility}
                isExpanded={isExpandedStudio}
                onToggleExpand={() => setIsExpandedStudio(true)}
                onUpdateSettings={setSettings}
                onSelectCategory={(cat) => setActiveCategoryModal(cat)}
              />
            </div>

            {/* Right Controls & Checklist (5-4 Cols on desktop) */}
            <div className="lg:col-span-5 xl:col-span-4 w-full flex flex-col gap-5">
              {/* Component Inventory & Checklist */}
              <PartsInventory
                build={build}
                compatibility={compatibility}
                totalPrice={totalPrice}
                onOpenCategoryModal={(cat) => setActiveCategoryModal(cat)}
                onRemovePart={handleRemovePart}
                onAutoFillMissing={handleAutoFillMissing}
                onClearBuild={handleClearBuild}
                onFocusComponent={(cat) => setSettings((s) => ({ ...s, selectedComponent: cat }))}
              />

              {/* Studio & RGB Lighting Controls */}
              <StudioControls
                settings={settings}
                onUpdateSettings={setSettings}
                onPowerToggle={handlePowerToggle}
              />
            </div>
          </div>
        )}
      </main>

      {/* Part Selection Modal */}
      {activeCategoryModal && (
        <PartSelectorModal
          category={activeCategoryModal}
          currentBuild={build}
          onSelectPart={(part) => {
            handleAddPart(part);
            setActiveCategoryModal(null);
          }}
          onClose={() => setActiveCategoryModal(null)}
        />
      )}

      {/* Specification & Benchmark Summary Modal */}
      {showSummaryModal && (
        <BuildSummaryModal
          build={build}
          compatibility={compatibility}
          onClose={() => setShowSummaryModal(false)}
        />
      )}
    </div>
  );
}
