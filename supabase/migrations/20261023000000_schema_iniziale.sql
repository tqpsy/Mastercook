-- Masterfood: schema iniziale Supabase (progetto Free, regione eu-central-1).
--
-- Qui stanno SOLO metadati: utenti, nuclei, appartenenze, inviti, consensi,
-- iscrizioni push, promemoria e richieste privacy. Cibo, profili e allergie
-- restano nel documento Yjs cifrato sul Google Drive dell'amministratore.
-- Email, nomi e chiavi dei nuclei non sono in chiaro: le colonne *_segreto_id
-- puntano a voci di Supabase Vault, gestite da funzioni lato server.

create extension if not exists pgcrypto;

-- ───────────── Tabelle ─────────────

create table public.utenti (
  id uuid primary key references auth.users (id) on delete cascade,
  google_sub text not null unique,
  email_hash text not null unique,
  email_segreto_id uuid,
  nome_segreto_id uuid,
  nucleo_principale_id uuid,
  preferenze jsonb not null default '{}'::jsonb,
  preferenze_notifiche jsonb not null default '{}'::jsonb,
  creato_il timestamptz not null default now()
);

create table public.nuclei (
  id uuid primary key default gen_random_uuid(),
  nome_segreto_id uuid,
  amministratore_id uuid not null references public.utenti (id),
  modalita_storage text not null default 'locale_drive'
    check (modalita_storage in ('locale', 'drive', 'locale_drive')),
  drive_folder_id text,
  -- { "dati": "<id>", "storico": "<id>", "foto_frigo": "<id>", "foto_dispensa": "<id>", "manifest": "<id>" }
  drive_file_ids jsonb not null default '{}'::jsonb,
  chiave_segreto_id uuid,
  versione_chiave integer not null default 1 check (versione_chiave > 0),
  versione_schema integer not null default 1 check (versione_schema > 0),
  creato_il timestamptz not null default now()
);

alter table public.utenti
  add constraint utenti_nucleo_principale_fk
  foreign key (nucleo_principale_id) references public.nuclei (id) on delete set null;

create table public.appartenenze (
  nucleo_id uuid not null references public.nuclei (id) on delete cascade,
  utente_id uuid not null references public.utenti (id) on delete cascade,
  ruolo text not null check (ruolo in ('amministratore', 'membro')),
  stato text not null default 'attivo'
    check (stato in ('attivo', 'in_attesa_drive', 'uscito', 'rimosso')),
  -- Ponte verso il profilo del membro dentro il documento cifrato.
  membro_id text not null,
  creato_il timestamptz not null default now(),
  primary key (nucleo_id, utente_id)
);

-- Un solo amministratore attivo per nucleo.
create unique index appartenenze_un_admin_attivo
  on public.appartenenze (nucleo_id)
  where ruolo = 'amministratore' and stato = 'attivo';

create index appartenenze_utente on public.appartenenze (utente_id);

create table public.inviti (
  id uuid primary key default gen_random_uuid(),
  nucleo_id uuid not null references public.nuclei (id) on delete cascade,
  creato_da uuid not null references public.utenti (id),
  -- Invito a codice (8 caratteri) o via email: si salva solo l'hash.
  codice_hash text unique,
  email_hash text,
  scade_il timestamptz not null default now() + interval '7 days',
  usato_il timestamptz,
  usato_da uuid references public.utenti (id),
  creato_il timestamptz not null default now(),
  check (codice_hash is not null or email_hash is not null)
);

-- Registro dei consensi: solo inserimenti, mai modifiche.
create table public.consensi (
  id bigint generated always as identity primary key,
  utente_id uuid not null references public.utenti (id) on delete cascade,
  tipo text not null check (tipo in ('generale', 'dati_sanitari')),
  versione_testo text not null,
  concesso boolean not null,
  il timestamptz not null default now()
);

create table public.iscrizioni_push (
  id uuid primary key default gen_random_uuid(),
  utente_id uuid not null references public.utenti (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  creato_il timestamptz not null default now()
);

-- Promemoria per le notifiche ad app chiusa: testo generico, mai nomi di prodotti.
create table public.promemoria (
  id uuid primary key default gen_random_uuid(),
  nucleo_id uuid not null references public.nuclei (id) on delete cascade,
  tipo text not null,
  destinatari uuid[] not null default '{}',
  invia_il timestamptz not null,
  testo_generico text not null,
  chiave_dedup text not null unique,
  inviato_il timestamptz,
  creato_il timestamptz not null default now()
);

create index promemoria_da_inviare on public.promemoria (invia_il) where inviato_il is null;

create table public.richieste_privacy (
  id uuid primary key default gen_random_uuid(),
  utente_id uuid not null references public.utenti (id) on delete cascade,
  tipo text not null check (tipo in ('accesso', 'rettifica', 'cancellazione', 'portabilita', 'opposizione')),
  stato text not null default 'ricevuta' check (stato in ('ricevuta', 'in_corso', 'evasa')),
  creato_il timestamptz not null default now(),
  evasa_il timestamptz
);

-- ───────────── Funzioni di supporto per RLS ─────────────

create function public.e_membro(nucleo uuid) returns boolean
  language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.appartenenze a
    where a.nucleo_id = nucleo
      and a.utente_id = auth.uid()
      and a.stato in ('attivo', 'in_attesa_drive')
  );
$$;

create function public.e_amministratore(nucleo uuid) returns boolean
  language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.appartenenze a
    where a.nucleo_id = nucleo
      and a.utente_id = auth.uid()
      and a.ruolo = 'amministratore'
      and a.stato = 'attivo'
  );
$$;

-- Crea un nucleo e l'appartenenza del suo amministratore in un'unica transazione.
create function public.crea_nucleo(membro_id text, modalita_storage text default 'locale_drive')
  returns uuid
  language plpgsql security definer set search_path = ''
as $$
declare
  nuovo uuid;
begin
  if auth.uid() is null then
    raise exception 'Accesso richiesto';
  end if;
  insert into public.nuclei (amministratore_id, modalita_storage)
    values (auth.uid(), modalita_storage)
    returning id into nuovo;
  insert into public.appartenenze (nucleo_id, utente_id, ruolo, membro_id)
    values (nuovo, auth.uid(), 'amministratore', membro_id);
  return nuovo;
end;
$$;

revoke execute on function public.crea_nucleo(text, text) from public, anon;
grant execute on function public.crea_nucleo(text, text) to authenticated;

-- ───────────── Row Level Security ─────────────

alter table public.utenti enable row level security;
alter table public.nuclei enable row level security;
alter table public.appartenenze enable row level security;
alter table public.inviti enable row level security;
alter table public.consensi enable row level security;
alter table public.iscrizioni_push enable row level security;
alter table public.promemoria enable row level security;
alter table public.richieste_privacy enable row level security;

create policy "utente: legge sé stesso" on public.utenti
  for select to authenticated using (id = auth.uid());
create policy "utente: si registra" on public.utenti
  for insert to authenticated with check (id = auth.uid());
create policy "utente: modifica sé stesso" on public.utenti
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "nucleo: lo vedono i membri" on public.nuclei
  for select to authenticated using (public.e_membro(id));
create policy "nucleo: lo modifica l'amministratore" on public.nuclei
  for update to authenticated using (public.e_amministratore(id)) with check (public.e_amministratore(id));

-- Le nuove appartenenze nascono da crea_nucleo o dalla Edge Function degli inviti.
create policy "appartenenze: le vedono i membri" on public.appartenenze
  for select to authenticated using (public.e_membro(nucleo_id));
create policy "appartenenze: le gestisce l'amministratore" on public.appartenenze
  for update to authenticated using (public.e_amministratore(nucleo_id)) with check (public.e_amministratore(nucleo_id));
create policy "appartenenze: il membro può uscire" on public.appartenenze
  for update to authenticated using (utente_id = auth.uid()) with check (utente_id = auth.uid() and stato = 'uscito');

create policy "inviti: li vede l'amministratore" on public.inviti
  for select to authenticated using (public.e_amministratore(nucleo_id));
create policy "inviti: li crea l'amministratore" on public.inviti
  for insert to authenticated with check (public.e_amministratore(nucleo_id) and creato_da = auth.uid());
create policy "inviti: li revoca l'amministratore" on public.inviti
  for delete to authenticated using (public.e_amministratore(nucleo_id));

create policy "consensi: li legge l'interessato" on public.consensi
  for select to authenticated using (utente_id = auth.uid());
create policy "consensi: li registra l'interessato" on public.consensi
  for insert to authenticated with check (utente_id = auth.uid());

create policy "push: le proprie iscrizioni" on public.iscrizioni_push
  for all to authenticated using (utente_id = auth.uid()) with check (utente_id = auth.uid());

create policy "promemoria: del proprio nucleo" on public.promemoria
  for all to authenticated using (public.e_membro(nucleo_id)) with check (public.e_membro(nucleo_id));

create policy "privacy: le proprie richieste (lettura)" on public.richieste_privacy
  for select to authenticated using (utente_id = auth.uid());
create policy "privacy: le proprie richieste (invio)" on public.richieste_privacy
  for insert to authenticated with check (utente_id = auth.uid());
