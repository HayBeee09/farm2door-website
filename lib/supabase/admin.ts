import { createClient } from "@supabase/supabase-js";
import { Database } from "./types";

/**
 * Privileged Admin Supabase client.
 * Bypasses Row Level Security (RLS) using the service role secret.
 * NEVER expose this client to the browser.
 */
export function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-project.supabase.co";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-service-role-key";

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
