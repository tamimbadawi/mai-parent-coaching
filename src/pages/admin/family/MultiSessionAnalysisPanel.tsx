import { useState } from 'react';
import { Sparkles, Loader2, AlertCircle, Info } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { CaseSession } from '../../../types/family';

interface Props {
  householdId: string;
  allSessions: CaseSession[];
  selectedSessionIds: string[];
  onSelectedSessionIdsChange: (ids: string[]) => void;
}

export const MultiSessionAnalysisPanel = ({ allSessions, selectedSessionIds, onSelectedSessionIdsChange }: Props): JSX.Element => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ text: string; frameworkConfigured: boolean } | null>(null);

  const handleRun = async (): Promise<void> => {
    if (selectedSessionIds.length === 0) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const { data, error: invokeErr } = await supabase.functions.invoke('family-session-analysis', {
        body: { sessionIds: selectedSessionIds },
      });
      if (invokeErr) throw invokeErr;
      if (data?.error) throw new Error(data.error);
      setResult({ text: data.text, frameworkConfigured: data.frameworkConfigured });
    } catch (err: any) {
      setError(err.message || 'Analysis failed.');
    } finally {
      setLoading(false);
    }
  };

  if (allSessions.length === 0) {
    return <p className="text-xs text-warm-gray italic">Record at least one session to run pattern analysis.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onSelectedSessionIdsChange(allSessions.map((s) => s.id))}
            className="text-xs font-medium text-sage-dark hover:underline"
          >
            Select all {allSessions.length} sessions
          </button>
          <span className="text-warm-gray">·</span>
          <button
            type="button"
            onClick={() => onSelectedSessionIdsChange([])}
            className="text-xs font-medium text-warm-gray hover:text-charcoal hover:underline"
          >
            Clear
          </button>
          <span className="text-xs text-warm-gray">
            ({selectedSessionIds.length} selected — check sessions above)
          </span>
        </div>
        <button
          type="button"
          onClick={handleRun}
          disabled={selectedSessionIds.length === 0 || loading}
          className="inline-flex items-center gap-2 rounded-xl bg-charcoal px-4 py-2 text-xs font-medium text-white hover:bg-black disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 text-sage" />}
          Run Analysis
        </button>
      </div>

      {error ? (
        <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
          <p>{error}</p>
        </div>
      ) : null}

      {result ? (
        <div className="rounded-xl border border-beige/80 bg-[#faf8f4] p-4 space-y-3">
          {!result.frameworkConfigured ? (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-[11px] text-amber-800">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
              <p>No clinical framework configured yet — this is a raw observational summary, not a clinical assessment.</p>
            </div>
          ) : null}
          <p className="text-sm text-charcoal leading-relaxed whitespace-pre-wrap">{result.text}</p>
        </div>
      ) : null}
    </div>
  );
};
