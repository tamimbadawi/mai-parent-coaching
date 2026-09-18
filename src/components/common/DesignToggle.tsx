import { useState } from 'react';
import { Palette, ChevronUp, ChevronDown, Check, Sparkles, SlidersHorizontal, X } from 'lucide-react';
import { useDesign, DESIGN_SPECS } from '../../context/DesignContext';

export default function DesignToggle() {
  const { designMode, toggleDesignMode, setDesignMode, currentSpec, isDesignerMode } = useDesign();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  if (isMinimized) {
    return (
      <div className="fixed bottom-5 right-5 z-50 print:hidden">
        <button
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-2 px-3 py-2 rounded-full bg-charcoal text-white shadow-2xl hover:scale-105 transition-all text-xs font-medium border border-white/20 backdrop-blur-md"
          title="Open Design Comparison Tool"
        >
          <Palette className="w-4 h-4 text-terracotta" />
          <span className="hidden sm:inline">Design: {isDesignerMode ? 'Regulations' : 'Classic'}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end print:hidden">
      {/* Expanded Spec Panel */}
      {isOpen && (
        <div className="mb-3 w-80 sm:w-96 rounded-2xl bg-white/95 backdrop-blur-lg border border-border p-4 shadow-2xl transition-all duration-300 animate-fade-in text-charcoal">
          <div className="flex items-center justify-between pb-3 border-b border-border/60">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-terracotta/10 text-terracotta">
                <SlidersHorizontal className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-semibold tracking-tight">Design System Inspector</h4>
                <p className="text-[11px] text-warm-gray leading-tight">Live comparison tool</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-soft-gray hover:text-charcoal transition-colors rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="mt-3 grid grid-cols-2 gap-1.5 p-1 bg-surface rounded-xl border border-border/40">
            <button
              type="button"
              onClick={() => setDesignMode('designer')}
              className={`py-2 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                isDesignerMode
                  ? 'bg-terracotta text-white shadow-sm'
                  : 'text-warm-gray hover:text-charcoal'
              }`}
            >
              {isDesignerMode && <Check className="w-3.5 h-3.5" />}
              Designer Guide
            </button>
            <button
              type="button"
              onClick={() => setDesignMode('classic')}
              className={`py-2 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                !isDesignerMode
                  ? 'bg-charcoal text-white shadow-sm'
                  : 'text-warm-gray hover:text-charcoal'
              }`}
            >
              {!isDesignerMode && <Check className="w-3.5 h-3.5" />}
              Classic Editorial
            </button>
          </div>

          {/* Active Specs Breakdown */}
          <div className="mt-4 space-y-3">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-warm-gray block mb-1.5">
                Active Color Palette
              </span>
              <div className="grid grid-cols-4 gap-2">
                <div className="flex flex-col items-center gap-1 p-1.5 rounded-lg bg-surface border border-border/40">
                  <span
                    className="w-5 h-5 rounded-full border border-black/10 shadow-inner"
                    style={{ backgroundColor: currentSpec.colors.darkOrange }}
                  />
                  <span className="text-[10px] font-mono font-medium">{currentSpec.colors.darkOrange}</span>
                  <span className="text-[9px] text-warm-gray">Orange</span>
                </div>
                <div className="flex flex-col items-center gap-1 p-1.5 rounded-lg bg-surface border border-border/40">
                  <span
                    className="w-5 h-5 rounded-full border border-black/10 shadow-inner"
                    style={{ backgroundColor: currentSpec.colors.mint }}
                  />
                  <span className="text-[10px] font-mono font-medium">{currentSpec.colors.mint}</span>
                  <span className="text-[9px] text-warm-gray">Mint</span>
                </div>
                <div className="flex flex-col items-center gap-1 p-1.5 rounded-lg bg-surface border border-border/40">
                  <span
                    className="w-5 h-5 rounded-full border border-black/10 shadow-inner"
                    style={{ backgroundColor: currentSpec.colors.bloodOrange }}
                  />
                  <span className="text-[10px] font-mono font-medium">{currentSpec.colors.bloodOrange}</span>
                  <span className="text-[9px] text-warm-gray">Blood</span>
                </div>
                <div className="flex flex-col items-center gap-1 p-1.5 rounded-lg bg-surface border border-border/40">
                  <span
                    className="w-5 h-5 rounded-full border border-black/10 shadow-inner"
                    style={{ backgroundColor: currentSpec.colors.lightGrey }}
                  />
                  <span className="text-[10px] font-mono font-medium">{currentSpec.colors.lightGrey}</span>
                  <span className="text-[9px] text-warm-gray">Light Grey</span>
                </div>
              </div>

              {isDesignerMode && (
                <div className="mt-2 grid grid-cols-4 gap-2">
                  <div className="flex flex-col items-center gap-1 p-1.5 rounded-lg bg-surface border border-border/40">
                    <span
                      className="w-5 h-5 rounded-full border border-black/10 shadow-inner"
                      style={{ backgroundColor: currentSpec.colors.logoMint }}
                    />
                    <span className="text-[10px] font-mono font-medium">{currentSpec.colors.logoMint}</span>
                    <span className="text-[9px] text-warm-gray">Logo Mint</span>
                  </div>
                  <div className="flex flex-col items-center gap-1 p-1.5 rounded-lg bg-surface border border-border/40">
                    <span
                      className="w-5 h-5 rounded-full border border-black/10 shadow-inner"
                      style={{ backgroundColor: currentSpec.colors.logoYellow }}
                    />
                    <span className="text-[10px] font-mono font-medium">{currentSpec.colors.logoYellow}</span>
                    <span className="text-[9px] text-warm-gray">Logo Yellow</span>
                  </div>
                  <div className="flex flex-col items-center gap-1 p-1.5 rounded-lg bg-surface border border-border/40">
                    <span
                      className="w-5 h-5 rounded-full border border-black/10 shadow-inner"
                      style={{ backgroundColor: currentSpec.colors.fontColor }}
                    />
                    <span className="text-[10px] font-mono font-medium">{currentSpec.colors.fontColor}</span>
                    <span className="text-[9px] text-warm-gray">Font Color</span>
                  </div>
                  <div className="flex flex-col items-center gap-1 p-1.5 rounded-lg bg-surface border border-border/40">
                    <span
                      className="w-5 h-5 rounded-full border border-black/10 shadow-inner"
                      style={{ backgroundColor: currentSpec.colors.background }}
                    />
                    <span className="text-[10px] font-mono font-medium">{currentSpec.colors.background}</span>
                    <span className="text-[9px] text-warm-gray">Base</span>
                  </div>
                </div>
              )}
            </div>

            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-warm-gray block mb-1.5">
                Active Typography
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded-lg bg-surface border border-border/40">
                  <span className="text-[10px] text-warm-gray block">Headings & Display:</span>
                  <span className="font-semibold text-charcoal">{isDesignerMode ? 'Atma / Binate' : 'Georgia Serif'}</span>
                </div>
                <div className="p-2 rounded-lg bg-surface border border-border/40">
                  <span className="text-[10px] text-warm-gray block">Body & UI:</span>
                  <span className="font-semibold text-charcoal">{isDesignerMode ? 'Binate / Atma' : 'Inter Sans'}</span>
                </div>
                <div className="p-2 rounded-lg bg-surface border border-border/40">
                  <span className="text-[10px] text-warm-gray block">Courses:</span>
                  <span className="font-semibold text-charcoal">{isDesignerMode ? 'BM Hanna Air' : 'Georgia Serif'}</span>
                </div>
                <div className="p-2 rounded-lg bg-surface border border-border/40">
                  <span className="text-[10px] text-warm-gray block">Arabic:</span>
                  <span className="font-semibold text-charcoal">{isDesignerMode ? 'Tufuli Arabic' : 'System Arabic'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Floating Pill Button */}
      <div className="flex items-center gap-1.5 bg-white/95 backdrop-blur-md border border-border rounded-full p-1.5 shadow-xl hover:shadow-2xl transition-all duration-200">
        <button
          type="button"
          onClick={toggleDesignMode}
          className="flex items-center gap-2 pl-3 pr-2.5 py-1.5 rounded-full bg-surface hover:bg-beige/40 text-charcoal transition-all text-xs font-semibold"
          title="Click to toggle between Designer Regulations and Classic design"
        >
          <div className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full ring-2 ring-white shadow-sm"
              style={{
                backgroundColor: isDesignerMode ? '#F1873B' : '#7D9D8B',
              }}
            />
            <span>{isDesignerMode ? 'Designer Regulations' : 'Classic Editorial'}</span>
          </div>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-terracotta/15 text-terracotta-dark font-mono font-medium">
            Toggle
          </span>
        </button>

        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="p-1.5 rounded-full hover:bg-surface text-warm-gray hover:text-charcoal transition-colors"
          title="View Design Specs & Details"
        >
          {isOpen ? <ChevronDown className="w-4 h-4" /> : <SlidersHorizontal className="w-4 h-4" />}
        </button>

        <button
          type="button"
          onClick={() => setIsMinimized(true)}
          className="p-1.5 rounded-full hover:bg-surface text-soft-gray hover:text-charcoal transition-colors"
          title="Minimize Widget"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
