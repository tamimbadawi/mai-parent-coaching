import { Link } from 'react-router-dom';
import { Eye, X } from 'lucide-react';
import { useState } from 'react';

export default function PreviewBanner() {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-[100] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 rounded-2xl border border-sage/30 bg-charcoal px-4 py-3 text-white shadow-xl sm:flex sm:items-center sm:justify-between sm:gap-4">
      <div className="flex items-start gap-3 sm:items-center">
        <Eye className="mt-0.5 h-4 w-4 shrink-0 text-sage-light sm:mt-0" />
        <p className="text-sm leading-snug">
          <span className="font-semibold">Homepage redesign preview.</span>{' '}
          <Link to="/" className="underline underline-offset-2 hover:text-sage-light">
            View current homepage
          </Link>
        </p>
      </div>
      <button
        type="button"
        onClick={() => setVisible(false)}
        className="mt-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20 sm:mt-0"
        aria-label="Dismiss preview banner"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
