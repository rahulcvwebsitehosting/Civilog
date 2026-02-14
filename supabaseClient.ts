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

const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://kjbqmczcmzuqtqmltoml.supabase.co');
const supabaseAnonKey = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'sb_publishable_3sO9BGar1mN32EZ9k1ER7A_JreG-8IN');

export const supabase = createClient(supabaseUrl, supabaseAnonKey);