import { createClient } from "@supabase/supabase-js";
import { Database } from "./types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-project.supabase.co";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "placeholder-anon-key";

/**
 * Public browser-safe Supabase client.
 * Enforces Row Level Security (RLS) according to caller session.
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
