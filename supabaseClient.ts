import { createClient } from '@supabase/supabase-js';

// Safe environment variable access for both Vite and Node-like environments
const getEnv = (key: string, fallback: string): string => {
  const metaEnv = (import.meta as any).env;
  if (metaEnv && metaEnv[`VITE_${key}`]) {
    return metaEnv[`VITE_${key}`];
  }
  
  try {
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key] as string;
    }
  } catch (e) {
    // process might not be defined in some browser contexts
  }

  return fallback;
};

const supabaseUrl = getEnv('SUPABASE_URL', 'https://kjbqmczcmzuqtqmltoml.supabase.co');
const supabaseAnonKey = getEnv('SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtqYnFtY3pjbXp1cXRxbWx0b21sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwNDU3MDIsImV4cCI6MjA4NjYyMTcwMn0.klXrOu4tB_5l8L9X9wz4eMMx-YEz55cFjAzh9qhl2AA');

export let configError: string | null = null;

if (!supabaseAnonKey) {
  configError = "VITE_SUPABASE_ANON_KEY is missing. Database operations will fail.";
  console.error(`[SUPABASE] ERROR: ${configError}`);
} else if (supabaseAnonKey.startsWith('sb_publishable_')) {
  configError = "You are using a 'Management API' key (starts with sb_publishable_) instead of an 'Anon' key. Go to Project Settings > API in Supabase and copy the 'anon' public key (which starts with 'eyJ').";
  console.error(`[SUPABASE] CRITICAL ERROR: ${configError}`);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey || 'MISSING_KEY');