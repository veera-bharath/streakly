import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL!;
const key = process.env.SUPABASE_ANON_KEY!;

if (!url || !key) {
  throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be set in .env');
}

// RLS is disabled on all tables (plain CREATE TABLE), so the anon key
// has full access when used server-side with our own auth middleware.
export const db = createClient(url, key, {
  auth: { persistSession: false },
});
