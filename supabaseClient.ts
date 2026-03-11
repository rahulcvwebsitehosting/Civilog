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

const supabaseUrl = 'https://kjbqmczcmzuqtqmltoml.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtqYnFtY3pjbXp1cXRxbWx0b21sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwNDU3MDIsImV4cCI6MjA4NjYyMTcwMn0.klXrOu4tB_5l8L9X9wz4eMMx-YEz55cFjAzh9qhl2AA';

export let configError: string | null = null;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);