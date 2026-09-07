import { createClient } from '@supabase/supabase-js';
import { env } from './env';

/**
 * Service-role client – used only in backend.
 * Has full DB access, bypasses RLS.
 * NEVER expose this key to the frontend.
 */
export const supabaseAdmin = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

/**
 * Anon-key client – used for verifying user JWT tokens
 * (calling supabase.auth.getUser(jwt)).
 */
export const supabaseClient = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_ANON_KEY
);
