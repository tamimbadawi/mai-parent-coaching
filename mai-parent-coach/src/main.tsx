import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { supabase } from './lib/supabase';

const runSupabaseConnectionTest = async () => {
  const { data, error } = await supabase.from('test_connection').select('*');

  if (error) {
    console.error('❌ Supabase connection failed:', error);
    return;
  }

  console.log('✅ Connected to Supabase');
  console.log(data);
};

void runSupabaseConnectionTest();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
