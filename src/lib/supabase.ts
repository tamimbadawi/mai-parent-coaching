import { createClient } from '@supabase/supabase-js';

// Find these in your Supabase project dashboard under Project Settings > API.
// The anon key is safe to expose in the browser because RLS policies protect the data.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
