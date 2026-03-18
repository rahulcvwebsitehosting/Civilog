import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export let configError: string | null = null;

if (!supabaseUrl || !supabaseAnonKey) {
  configError = "Supabase configuration is missing. Please check your environment variables.";
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
