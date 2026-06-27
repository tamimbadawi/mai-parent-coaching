import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

type ThemeKey = 'scandinavian' | 'hope' | 'boutique' | 'nature' | 'luxury';

type ThemeDefinition = {
  label: string;
  vars: Record<string, string>;
};

const themes: Record<ThemeKey, ThemeDefinition> = {
  scandinavian: {
    label: 'Scandinavian',
    vars: {
      '--color-background': '253 251 247',
      '--color-surface': '245 240 232',
      '--color-border': '232 224 213',
      '--color-ivory': '253 251 247',
      '--color-cream': '245 240 232',
      '--color-beige': '232 224 213',
      '--color-sand': '212 200 184',
      '--color-sage': '156 175 136',
      '--color-sage-dark': '122 143 106',
      '--color-sage-light': '184 201 169',
      '--color-olive': '139 154 107',
      '--color-olive-light': '168 184 138',
      '--color-dusty-blue': '143 163 184',
      '--color-dusty-blue-light': '176 196 212',
      '--color-dusty-blue-dark': '110 132 152',
      '--color-terracotta': '196 149 106',
      '--color-terracotta-light': '212 176 138',
      '--color-terracotta-dark': '166 123 82',
      '--color-charcoal': '61 61 61',
      '--color-warm-gray': '107 101 96',
      '--color-soft-gray': '163 158 153',
      '--font-sans': "Inter, system-ui, -apple-system, sans-serif",
      '--font-serif': "Georgia, Cambria, 'Times New Roman', serif",
      '--radius-xl': '1rem',
      '--radius-2xl': '1.5rem',
      '--radius-3xl': '2rem',
      '--shadow-sm': '0 1px 2px rgba(61, 61, 61, 0.05)',
      '--shadow': '0 10px 30px rgba(61, 61, 61, 0.08)',
      '--shadow-lg': '0 20px 45px rgba(61, 61, 61, 0.12)',
      '--space-4': '1rem',
      '--space-5': '1.25rem',
      '--space-6': '1.5rem',
      '--space-8': '2rem',
      '--space-10': '2.5rem',
      '--space-12': '3rem',
      '--space-16': '4rem',
      '--space-20': '5rem',
      '--space-24': '6rem',
      '--space-32': '8rem',
    },
  },
  hope: {
    label: 'Hope',
    vars: {
      '--color-background': '250 247 243',
      '--color-surface': '255 250 242',
      '--color-border': '232 220 204',
      '--color-ivory': '250 247 243',
      '--color-cream': '255 250 242',
      '--color-beige': '232 220 204',
      '--color-sand': '223 208 190',
      '--color-sage': '218 171 161',
      '--color-sage-dark': '179 108 93',
      '--color-sage-light': '237 211 206',
      '--color-olive': '157 135 120',
      '--color-olive-light': '203 183 170',
      '--color-dusty-blue': '148 159 180',
      '--color-dusty-blue-light': '201 209 220',
      '--color-dusty-blue-dark': '100 114 136',
      '--color-terracotta': '202 136 109',
      '--color-terracotta-light': '226 190 170',
      '--color-terracotta-dark': '163 95 72',
      '--color-charcoal': '51 45 42',
      '--color-warm-gray': '117 104 97',
      '--color-soft-gray': '173 164 156',
      '--font-sans': "Inter, system-ui, -apple-system, sans-serif",
      '--font-serif': "Georgia, Cambria, 'Times New Roman', serif",
      '--radius-xl': '1rem',
      '--radius-2xl': '1.5rem',
      '--radius-3xl': '2rem',
      '--shadow-sm': '0 1px 2px rgba(51, 45, 42, 0.06)',
      '--shadow': '0 12px 34px rgba(51, 45, 42, 0.1)',
      '--shadow-lg': '0 22px 48px rgba(51, 45, 42, 0.14)',
      '--space-4': '1rem',
      '--space-5': '1.25rem',
      '--space-6': '1.5rem',
      '--space-8': '2rem',
      '--space-10': '2.5rem',
      '--space-12': '3rem',
      '--space-16': '4rem',
      '--space-20': '5rem',
      '--space-24': '6rem',
      '--space-32': '8rem',
    },
  },
  boutique: {
    label: 'Boutique',
    vars: {
      '--color-background': '250 248 246',
      '--color-surface': '255 251 249',
      '--color-border': '227 210 203',
      '--color-ivory': '250 248 246',
      '--color-cream': '255 251 249',
      '--color-beige': '227 210 203',
      '--color-sand': '221 205 194',
      '--color-sage': '187 161 150',
      '--color-sage-dark': '140 109 97',
      '--color-sage-light': '223 204 197',
      '--color-olive': '155 134 123',
      '--color-olive-light': '206 194 187',
      '--color-dusty-blue': '129 125 147',
      '--color-dusty-blue-light': '190 185 203',
      '--color-dusty-blue-dark': '90 82 112',
      '--color-terracotta': '178 112 108',
      '--color-terracotta-light': '216 163 156',
      '--color-terracotta-dark': '136 70 70',
      '--color-charcoal': '44 37 39',
      '--color-warm-gray': '120 104 102',
      '--color-soft-gray': '168 156 154',
      '--font-sans': "Inter, system-ui, -apple-system, sans-serif",
      '--font-serif': "Georgia, Cambria, 'Times New Roman', serif",
      '--radius-xl': '1rem',
      '--radius-2xl': '1.5rem',
      '--radius-3xl': '2rem',
      '--shadow-sm': '0 1px 2px rgba(44, 37, 39, 0.06)',
      '--shadow': '0 12px 34px rgba(44, 37, 39, 0.12)',
      '--shadow-lg': '0 24px 60px rgba(44, 37, 39, 0.16)',
      '--space-4': '1rem',
      '--space-5': '1.25rem',
      '--space-6': '1.5rem',
      '--space-8': '2rem',
      '--space-10': '2.5rem',
      '--space-12': '3rem',
      '--space-16': '4rem',
      '--space-20': '5rem',
      '--space-24': '6rem',
      '--space-32': '8rem',
    },
  },
  nature: {
    label: 'Nature',
    vars: {
      '--color-background': '248 250 244',
      '--color-surface': '240 244 234',
      '--color-border': '209 219 200',
      '--color-ivory': '248 250 244',
      '--color-cream': '240 244 234',
      '--color-beige': '209 219 200',
      '--color-sand': '211 206 187',
      '--color-sage': '128 163 118',
      '--color-sage-dark': '72 102 58',
      '--color-sage-light': '177 201 170',
      '--color-olive': '103 142 94',
      '--color-olive-light': '176 199 164',
      '--color-dusty-blue': '120 160 168',
      '--color-dusty-blue-light': '181 204 207',
      '--color-dusty-blue-dark': '69 100 107',
      '--color-terracotta': '189 126 95',
      '--color-terracotta-light': '219 164 135',
      '--color-terracotta-dark': '125 74 53',
      '--color-charcoal': '49 54 45',
      '--color-warm-gray': '109 110 98',
      '--color-soft-gray': '155 158 145',
      '--font-sans': "Inter, system-ui, -apple-system, sans-serif",
      '--font-serif': "Georgia, Cambria, 'Times New Roman', serif",
      '--radius-xl': '1rem',
      '--radius-2xl': '1.5rem',
      '--radius-3xl': '2rem',
      '--shadow-sm': '0 1px 2px rgba(49, 54, 45, 0.05)',
      '--shadow': '0 10px 30px rgba(49, 54, 45, 0.08)',
      '--shadow-lg': '0 18px 42px rgba(49, 54, 45, 0.12)',
      '--space-4': '1rem',
      '--space-5': '1.25rem',
      '--space-6': '1.5rem',
      '--space-8': '2rem',
      '--space-10': '2.5rem',
      '--space-12': '3rem',
      '--space-16': '4rem',
      '--space-20': '5rem',
      '--space-24': '6rem',
      '--space-32': '8rem',
    },
  },
  luxury: {
    label: 'Luxury',
    vars: {
      '--color-background': '24 22 21',
      '--color-surface': '38 34 32',
      '--color-border': '84 75 66',
      '--color-ivory': '248 242 233',
      '--color-cream': '255 248 241',
      '--color-beige': '217 203 184',
      '--color-sand': '200 180 156',
      '--color-sage': '178 164 134',
      '--color-sage-dark': '126 109 79',
      '--color-sage-light': '212 204 183',
      '--color-olive': '143 124 96',
      '--color-olive-light': '190 175 145',
      '--color-dusty-blue': '114 118 136',
      '--color-dusty-blue-light': '166 169 183',
      '--color-dusty-blue-dark': '73 78 95',
      '--color-terracotta': '183 120 91',
      '--color-terracotta-light': '221 176 145',
      '--color-terracotta-dark': '132 77 55',
      '--color-charcoal': '233 224 212',
      '--color-warm-gray': '200 185 168',
      '--color-soft-gray': '179 164 145',
      '--font-sans': "Inter, system-ui, -apple-system, sans-serif",
      '--font-serif': "Georgia, Cambria, 'Times New Roman', serif",
      '--radius-xl': '1rem',
      '--radius-2xl': '1.5rem',
      '--radius-3xl': '2rem',
      '--shadow-sm': '0 1px 2px rgba(233, 224, 212, 0.08)',
      '--shadow': '0 14px 40px rgba(233, 224, 212, 0.12)',
      '--shadow-lg': '0 24px 60px rgba(233, 224, 212, 0.18)',
      '--space-4': '1rem',
      '--space-5': '1.25rem',
      '--space-6': '1.5rem',
      '--space-8': '2rem',
      '--space-10': '2.5rem',
      '--space-12': '3rem',
      '--space-16': '4rem',
      '--space-20': '5rem',
      '--space-24': '6rem',
      '--space-32': '8rem',
    },
  },
};

const ThemeContext = createContext<{
  theme: ThemeKey;
  setTheme: (theme: ThemeKey) => void;
  themeKeys: Array<{ key: ThemeKey; label: string }>;
} | null>(null);

const themeKeys: Array<{ key: ThemeKey; label: string }> = [
  { key: 'scandinavian', label: 'Scandinavian' },
  { key: 'hope', label: 'Hope' },
  { key: 'boutique', label: 'Boutique' },
  { key: 'nature', label: 'Nature' },
  { key: 'luxury', label: 'Luxury' },
];

function applyTheme(theme: ThemeDefinition) {
  const root = document.documentElement;
  Object.entries(theme.vars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
  root.dataset.theme = theme.label.toLowerCase();
}

const STORAGE_KEY = 'mai-theme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeKey>('scandinavian');

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY) as ThemeKey | null;
    if (saved && themes[saved]) {
      setThemeState(saved);
    }
  }, []);

  useEffect(() => {
    applyTheme(themes[theme]);
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const value = useMemo(
    () => ({ theme, setTheme: setThemeState, themeKeys }),
    [theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}

export function ThemeSwitcher() {
  const { theme, setTheme, themeKeys } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed right-4 bottom-4 z-50 flex flex-col items-end gap-2">
      <div
        className="rounded-2xl border border-[rgb(var(--color-border)/0.18)] bg-[rgb(var(--color-surface)/0.95)] p-3 shadow-lg backdrop-blur-sm transition-all duration-300"
        aria-label="Theme switcher"
      >
        <button
          type="button"
          onClick={() => setIsOpen((state) => !state)}
          className="flex items-center gap-2 rounded-full border border-[rgb(var(--color-border)/0.16)] bg-[rgb(var(--color-background)/0.96)] px-4 py-2 text-sm font-medium text-[rgb(var(--color-charcoal))] shadow-sm transition hover:bg-[rgb(var(--color-surface)/1)]"
        >
          Theme: {themes[theme].label}
        </button>
        {isOpen && (
          <div className="mt-3 grid gap-2">
            {themeKeys.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setTheme(key);
                  setIsOpen(false);
                }}
                className={`rounded-2xl border px-3 py-2 text-left text-sm transition ${
                  key === theme
                    ? 'border-[rgb(var(--color-sage)/0.8)] bg-[rgb(var(--color-sage)/0.14)] text-[rgb(var(--color-charcoal))]'
                    : 'border-[rgb(var(--color-border)/0.12)] bg-[rgb(var(--color-background)/0.96)] text-[rgb(var(--color-warm-gray))] hover:border-[rgb(var(--color-border)/0.18)] hover:bg-[rgb(var(--color-surface)/0.98)]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
