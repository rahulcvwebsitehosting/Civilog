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
const supabaseAnonKey = getEnv('SUPABASE_ANON_KEY', 'sb_publishable_3sO9BGar1mN32EZ9k1ER7A_JreG-8IN');

console.log("[SUPABASE] Initializing with URL:", supabaseUrl);
if (supabaseAnonKey.startsWith('sb_publishable_')) {
  console.warn("[SUPABASE] Warning: The Anon Key starts with 'sb_publishable_'. This is unusual for Supabase (standard keys start with 'eyJ'). Please verify your VITE_SUPABASE_ANON_KEY.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);