
import { createClient } from '@supabase/supabase-js';

// Prioritize environment variables for Vercel/Production deployments
// Fallback to the provided defaults for local development and prototyping
const supabaseUrl = (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_SUPABASE_URL) 
  ? process.env.NEXT_PUBLIC_SUPABASE_URL 
  : 'https://kjbqmczcmzuqtqmltoml.supabase.co';

const supabaseAnonKey = (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) 
  ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY 
  : 'sb_publishable_3sO9BGar1mN32EZ9k1ER7A_JreG-8IN';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
