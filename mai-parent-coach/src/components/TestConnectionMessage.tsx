import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function TestConnectionMessage() {
  const [message, setMessage] = useState('Loading...');

  useEffect(() => {
    let mounted = true;

    const loadMessage = async () => {
      const { data, error } = await supabase.from('test_connection').select('message').limit(1).maybeSingle();

      if (!mounted) {
        return;
      }

      if (error) {
        setMessage(error.message);
        return;
      }

      setMessage((data?.message as string | undefined) ?? 'No message found');
    };

    loadMessage();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
      <div className="rounded-lg border border-sage/20 bg-cream/70 px-4 py-3 text-sm text-charcoal shadow-sm">
        {message}
      </div>
    </div>
  );
}
