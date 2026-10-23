/**
 * Client Supabase (progetto Free in eu-central-1).
 * Su Supabase stanno solo metadati: utenti, nuclei, appartenenze, inviti, consensi, promemoria.
 * Cibo e dati sanitari restano nel documento cifrato del nucleo.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config';

let client: SupabaseClient | null | undefined;

/** Restituisce null se l'app non è configurata (es. sviluppo senza .env.local). */
export function supabase(): SupabaseClient | null {
  if (client === undefined) {
    client =
      config.supabaseUrl && config.supabaseAnonKey
        ? createClient(config.supabaseUrl, config.supabaseAnonKey, {
            auth: { persistSession: true, autoRefreshToken: true },
          })
        : null;
  }
  return client;
}
