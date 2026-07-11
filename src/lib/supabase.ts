/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import supabaseConfig from '../../supabase-config.json';

/**
 * Cliente Supabase. A `anonKey` é pública por design (como a apiKey do Firebase
 * web) — a proteção real dos dados fica nas policies de Row Level Security
 * definidas em supabase-schema.sql.
 *
 * Sem configuração, o app roda em modo local (localStorage), sem exigir login.
 */
let supabase: SupabaseClient | undefined;
let supabaseEnabled = false;

try {
  if (supabaseConfig && supabaseConfig.url && supabaseConfig.anonKey) {
    supabase = createClient(supabaseConfig.url, supabaseConfig.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
    supabaseEnabled = true;
    console.log('Supabase initialized successfully.');
  } else {
    console.warn('Supabase configuration missing. Running in Local Storage fallback mode.');
  }
} catch (error) {
  console.error('Error initializing Supabase:', error);
}

export { supabase, supabaseEnabled };
