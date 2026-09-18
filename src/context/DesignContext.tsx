import { createContext, useContext, useEffect, useState, useMemo, ReactNode } from 'react';

export type DesignMode = 'designer' | 'classic';

export interface DesignSpec {
  mode: DesignMode;
  name: string;
  tagline: string;
  colors: {
    darkOrange: string;
    bloodOrange: string;
    mint: string;
    logoMint: string;
    logoYellow: string;
    lightGrey: string;
    fontColor: string;
    background: string;
  };
  fonts: {
    heading: string;
    body: string;
    course: string;
    arabic: string;
  };
  vars: Record<string, string>;
}

export const DESIGN_SPECS: Record<DesignMode, DesignSpec> = {
  designer: {
    mode: 'designer',
    name: 'Designer Regulations',
    tagline: 'Initial Designer Brand Guide (Atma, Mint #92CFCA, Dark Orange #F1873B)',
    colors: {
      darkOrange: '#F1873B',
      bloodOrange: '#DB623D',
      mint: '#92CFCA',
      logoMint: '#9BD2CC',
      logoYellow: '#F4D721',
      lightGrey: '#F1F0ED',
      fontColor: '#3B3638',
      background: '#FFF8F8',
    },
    fonts: {
      heading: "'Atma', 'Binate', cursive, sans-serif",
      body: "'Binate', 'Atma', system-ui, -apple-system, sans-serif",
      course: "'BM Hanna Air', 'BMHANNAAir', sans-serif",
      arabic: "'Tufuli Arabic', 'Atma', 'Tajawal', 'Almarai', sans-serif",
    },
    vars: {
      '--color-background': '255 248 248',
      '--color-surface': '241 240 237',
      '--color-border': '229 227 223',
      '--color-ivory': '255 248 248',
      '--color-cream': '241 240 237',
      '--color-beige': '229 227 223',
      '--color-sand': '213 211 207',
      '--color-sage': '146 207 202',
      '--color-sage-dark': '107 184 178',
      '--color-sage-light': '155 210 204',
      '--color-olive': '139 154 107',
      '--color-olive-light': '168 184 138',
      '--color-dusty-blue': '143 163 184',
      '--color-dusty-blue-light': '176 196 212',
      '--color-dusty-blue-dark': '110 132 152',
      '--color-terracotta': '241 135 59',
      '--color-terracotta-light': '245 168 112',
      '--color-terracotta-dark': '219 98 61',
      '--color-gold': '244 215 33',
      '--color-charcoal': '59 54 56',
      '--color-warm-gray': '122 115 117',
      '--color-soft-gray': '172 168 170',
      '--font-sans': "'Binate', 'Atma', system-ui, -apple-system, sans-serif",
      '--font-serif': "'Atma', 'Binate', cursive, sans-serif",
      '--font-course': "'BM Hanna Air', 'BMHANNAAir', sans-serif",
      '--font-arabic': "'Tufuli Arabic', 'Atma', 'Tajawal', system-ui, sans-serif",
    },
  },
  classic: {
    mode: 'classic',
    name: 'Classic Editorial',
    tagline: 'Muted Scandinavian Editorial Style (Inter & Georgia Serif)',
    colors: {
      darkOrange: '#C87D55',
      bloodOrange: '#A05330',
      mint: '#7D9D8B',
      logoMint: '#A8C2B3',
      logoYellow: '#E5C058',
      lightGrey: '#F3EFE9',
      fontColor: '#2C2A29',
      background: '#FAF8F5',
    },
    fonts: {
      heading: "Georgia, Cambria, 'Times New Roman', serif",
      body: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      course: "Georgia, Cambria, 'Times New Roman', serif",
      arabic: "system-ui, -apple-system, sans-serif",
    },
    vars: {
      '--color-background': '250 248 245',
      '--color-surface': '243 239 233',
      '--color-border': '224 218 208',
      '--color-ivory': '250 248 245',
      '--color-cream': '243 239 233',
      '--color-beige': '224 218 208',
      '--color-sand': '212 204 192',
      '--color-sage': '125 157 139',
      '--color-sage-dark': '91 123 105',
      '--color-sage-light': '168 194 179',
      '--color-olive': '138 148 116',
      '--color-olive-light': '170 180 150',
      '--color-dusty-blue': '130 150 168',
      '--color-dusty-blue-light': '170 188 202',
      '--color-dusty-blue-dark': '96 116 134',
      '--color-terracotta': '200 125 85',
      '--color-terracotta-light': '225 160 125',
      '--color-terracotta-dark': '160 83 48',
      '--color-gold': '229 192 88',
      '--color-charcoal': '44 42 41',
      '--color-warm-gray': '112 106 100',
      '--color-soft-gray': '165 158 152',
      '--font-sans': "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      '--font-serif': "Georgia, Cambria, 'Times New Roman', Times, serif",
      '--font-course': "Georgia, Cambria, 'Times New Roman', serif",
      '--font-arabic': "system-ui, -apple-system, sans-serif",
    },
  },
};

const STORAGE_KEY = 'mai-design-mode';

interface DesignContextType {
  designMode: DesignMode;
  setDesignMode: (mode: DesignMode) => void;
  toggleDesignMode: () => void;
  currentSpec: DesignSpec;
  isDesignerMode: boolean;
}

const DesignContext = createContext<DesignContextType | null>(null);

export function DesignProvider({ children }: { children: ReactNode }) {
  const [designMode, setDesignModeState] = useState<DesignMode>('designer');

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY) as DesignMode | null;
    if (saved && (saved === 'designer' || saved === 'classic')) {
      setDesignModeState(saved);
    }
  }, []);

  useEffect(() => {
    const spec = DESIGN_SPECS[designMode];
    const root = document.documentElement;

    Object.entries(spec.vars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

    root.setAttribute('data-design-mode', designMode);
    window.localStorage.setItem(STORAGE_KEY, designMode);
  }, [designMode]);

  const toggleDesignMode = () => {
    setDesignModeState((prev) => (prev === 'designer' ? 'classic' : 'designer'));
  };

  const currentSpec = DESIGN_SPECS[designMode];
  const isDesignerMode = designMode === 'designer';

  const value = useMemo(
    () => ({
      designMode,
      setDesignMode: setDesignModeState,
      toggleDesignMode,
      currentSpec,
      isDesignerMode,
    }),
    [designMode, currentSpec, isDesignerMode]
  );

  return <DesignContext.Provider value={value}>{children}</DesignContext.Provider>;
}

export function useDesign() {
  const context = useContext(DesignContext);
  if (!context) {
    throw new Error('useDesign must be used within a DesignProvider');
  }
  return context;
}
