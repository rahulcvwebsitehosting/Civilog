

import { createClient } from '@supabase/supabase-js';

// Safe environment variable access for both Vite and Node-like environments
const getEnv = (key: string, fallback: string): string => {
  // Fix: Cast import.meta to any to resolve 'Property env does not exist on type ImportMeta' TypeScript error
  if (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env[`VITE_${key}`]) {
    return (import.meta as any).env[`VITE_${key}`];
  }
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key] as string;
  }
  return fallback;
};

const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://kjbqmczcmzuqtqmltoml.supabase.co');
const supabaseAnonKey = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'sb_publishable_3sO9BGar1mN32EZ9k1ER7A_JreG-8IN');

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
