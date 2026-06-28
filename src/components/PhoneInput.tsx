import { useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface Country {
  code: string;   // dial code e.g. "+20"
  iso: string;    // ISO-2 e.g. "EG"
  name: string;
  flag: string;
}

const COUNTRIES: Country[] = [
  { code: '+20',  iso: 'EG', name: 'Egypt',                flag: '🇪🇬' },
  { code: '+966', iso: 'SA', name: 'Saudi Arabia',         flag: '🇸🇦' },
  { code: '+971', iso: 'AE', name: 'United Arab Emirates', flag: '🇦🇪' },
  { code: '+974', iso: 'QA', name: 'Qatar',                flag: '🇶🇦' },
  { code: '+965', iso: 'KW', name: 'Kuwait',               flag: '🇰🇼' },
  { code: '+973', iso: 'BH', name: 'Bahrain',              flag: '🇧🇭' },
  { code: '+968', iso: 'OM', name: 'Oman',                 flag: '🇴🇲' },
  { code: '+962', iso: 'JO', name: 'Jordan',               flag: '🇯🇴' },
  { code: '+961', iso: 'LB', name: 'Lebanon',              flag: '🇱🇧' },
  { code: '+963', iso: 'SY', name: 'Syria',                flag: '🇸🇾' },
  { code: '+964', iso: 'IQ', name: 'Iraq',                 flag: '🇮🇶' },
  { code: '+212', iso: 'MA', name: 'Morocco',              flag: '🇲🇦' },
  { code: '+213', iso: 'DZ', name: 'Algeria',              flag: '🇩🇿' },
  { code: '+216', iso: 'TN', name: 'Tunisia',              flag: '🇹🇳' },
  { code: '+218', iso: 'LY', name: 'Libya',                flag: '🇱🇾' },
  { code: '+249', iso: 'SD', name: 'Sudan',                flag: '🇸🇩' },
  { code: '+44',  iso: 'GB', name: 'United Kingdom',       flag: '🇬🇧' },
  { code: '+1',   iso: 'US', name: 'United States',        flag: '🇺🇸' },
  { code: '+33',  iso: 'FR', name: 'France',               flag: '🇫🇷' },
  { code: '+49',  iso: 'DE', name: 'Germany',              flag: '🇩🇪' },
  { code: '+39',  iso: 'IT', name: 'Italy',                flag: '🇮🇹' },
  { code: '+34',  iso: 'ES', name: 'Spain',                flag: '🇪🇸' },
  { code: '+31',  iso: 'NL', name: 'Netherlands',          flag: '🇳🇱' },
  { code: '+46',  iso: 'SE', name: 'Sweden',               flag: '🇸🇪' },
  { code: '+47',  iso: 'NO', name: 'Norway',               flag: '🇳🇴' },
  { code: '+45',  iso: 'DK', name: 'Denmark',              flag: '🇩🇰' },
  { code: '+61',  iso: 'AU', name: 'Australia',            flag: '🇦🇺' },
  { code: '+64',  iso: 'NZ', name: 'New Zealand',          flag: '🇳🇿' },
  { code: '+1',   iso: 'CA', name: 'Canada',               flag: '🇨🇦' },
  { code: '+55',  iso: 'BR', name: 'Brazil',               flag: '🇧🇷' },
  { code: '+91',  iso: 'IN', name: 'India',                flag: '🇮🇳' },
  { code: '+86',  iso: 'CN', name: 'China',                flag: '🇨🇳' },
  { code: '+81',  iso: 'JP', name: 'Japan',                flag: '🇯🇵' },
  { code: '+82',  iso: 'KR', name: 'South Korea',          flag: '🇰🇷' },
  { code: '+65',  iso: 'SG', name: 'Singapore',            flag: '🇸🇬' },
  { code: '+60',  iso: 'MY', name: 'Malaysia',             flag: '🇲🇾' },
  { code: '+27',  iso: 'ZA', name: 'South Africa',         flag: '🇿🇦' },
  { code: '+234', iso: 'NG', name: 'Nigeria',              flag: '🇳🇬' },
  { code: '+254', iso: 'KE', name: 'Kenya',                flag: '🇰🇪' },
  { code: '+7',   iso: 'RU', name: 'Russia',               flag: '🇷🇺' },
  { code: '+90',  iso: 'TR', name: 'Turkey',               flag: '🇹🇷' },
  { code: '+92',  iso: 'PK', name: 'Pakistan',             flag: '🇵🇰' },
  { code: '+880', iso: 'BD', name: 'Bangladesh',           flag: '🇧🇩' },
];

/** Parse a stored phone string like "+201005809498" into { dialCode: "+20", local: "1005809498" } */
export const parsePhone = (stored: string | null): { dialCode: string; local: string } => {
  if (!stored) return { dialCode: '+20', local: '' };
  const match = COUNTRIES.map((c) => c.code)
    .sort((a, b) => b.length - a.length) // longest first so +966 beats +9
    .find((code) => stored.startsWith(code));
  if (match) return { dialCode: match, local: stored.slice(match.length) };
  return { dialCode: '+20', local: stored };
};

/** Combine dial code + local number into a single string for storage */
export const formatPhone = (dialCode: string, local: string): string | null => {
  const trimmed = local.trim();
  if (!trimmed) return null;
  return `${dialCode}${trimmed}`;
};

interface PhoneInputProps {
  value: string;           // full stored value e.g. "+201005809498"
  onChange: (value: string) => void;
  className?: string;
  inputClassName?: string;
  label?: string;
}

const PhoneInput = ({ value, onChange, inputClassName = '', label }: PhoneInputProps): JSX.Element => {
  const { dialCode: initialDial, local: initialLocal } = parsePhone(value || null);
  const [dialCode, setDialCode] = useState(initialDial);
  const [local, setLocal] = useState(initialLocal);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selected = COUNTRIES.find((c) => c.code === dialCode) ?? COUNTRIES[0];

  const filtered = COUNTRIES.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.includes(search) ||
      c.iso.toLowerCase().includes(search.toLowerCase())
  );

  const handleDialSelect = (country: Country): void => {
    setDialCode(country.code);
    setOpen(false);
    setSearch('');
    onChange(formatPhone(country.code, local) ?? '');
  };

  const handleLocalChange = (val: string): void => {
    // Only allow digits, spaces, hyphens
    const cleaned = val.replace(/[^\d\s\-]/g, '');
    setLocal(cleaned);
    onChange(formatPhone(dialCode, cleaned) ?? '');
  };

  return (
    <div>
      {label ? (
        <label className="mb-1 block text-xs font-medium uppercase tracking-[0.14em] text-warm-gray">
          {label}
        </label>
      ) : null}
      <div className="flex gap-2">
        {/* Country code picker */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            className={`flex items-center gap-1.5 rounded-2xl border border-beige bg-white px-3 py-3 text-sm text-charcoal outline-none transition hover:border-sage focus:border-sage ${inputClassName}`}
            aria-label="Select country code"
          >
            <span className="text-base leading-none">{selected.flag}</span>
            <span className="font-medium">{selected.code}</span>
            <ChevronDown className="h-3.5 w-3.5 text-warm-gray" />
          </button>

          {open ? (
            <div className="absolute left-0 top-full z-50 mt-1 w-[min(16rem,calc(100vw-2rem))] rounded-2xl border border-beige bg-white shadow-lg">
              <div className="p-2">
                <input
                  autoFocus
                  placeholder="Search country..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-xl border border-beige px-3 py-2 text-sm text-charcoal outline-none focus:border-sage"
                />
              </div>
              <ul className="max-h-52 overflow-y-auto pb-2">
                {filtered.map((country) => (
                  <li key={`${country.iso}-${country.code}`}>
                    <button
                      type="button"
                      onClick={() => handleDialSelect(country)}
                      className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition hover:bg-cream ${dialCode === country.code && selected.iso === country.iso ? 'bg-sage/10 font-medium text-sage-dark' : 'text-charcoal'}`}
                    >
                      <span className="text-base">{country.flag}</span>
                      <span className="flex-1 truncate">{country.name}</span>
                      <span className="text-xs text-warm-gray">{country.code}</span>
                    </button>
                  </li>
                ))}
                {filtered.length === 0 ? (
                  <li className="px-3 py-2 text-sm text-warm-gray">No results</li>
                ) : null}
              </ul>
            </div>
          ) : null}
        </div>

        {/* Local number */}
        <input
          type="tel"
          value={local}
          onChange={(e) => handleLocalChange(e.target.value)}
          placeholder="Mobile number"
          className={`flex-1 rounded-2xl border border-beige bg-white px-4 py-3 text-sm text-charcoal outline-none transition focus:border-sage ${inputClassName}`}
        />
      </div>
    </div>
  );
};

export default PhoneInput;
