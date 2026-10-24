-- Masterfood: registrazione dell'utente, collegamento del nucleo a Drive e chiave del nucleo in Vault.
--
-- La chiave AES del nucleo nasce sul dispositivo dell'amministratore e viene custodita
-- in Supabase Vault (cifrata a riposo). Solo i membri del nucleo possono leggerla,
-- tramite chiave_nucleo(); né le tabelle né i log contengono la chiave in chiaro.

-- Crea (o ritrova) la riga in public.utenti per l'utente collegato.
create function public.registra_utente() returns void
  language plpgsql security definer set search_path = ''
as $$
declare
  email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  sub text := coalesce(auth.jwt() -> 'user_metadata' ->> 'provider_id', auth.jwt() -> 'user_metadata' ->> 'sub', auth.uid()::text);
begin
  if auth.uid() is null then
    raise exception 'Accesso richiesto';
  end if;
  insert into public.utenti (id, google_sub, email_hash)
    values (auth.uid(), sub, encode(sha256(convert_to(email, 'UTF8')), 'hex'))
    on conflict (id) do nothing;
end;
$$;

-- Porta su account un nucleo nato sul dispositivo, mantenendo il suo id.
-- Idempotente per l'amministratore: una seconda chiamata non cambia la chiave.
create function public.collega_nucleo(p_id uuid, p_membro_id text, p_chiave text)
  returns void
  language plpgsql security definer set search_path = ''
as $$
declare
  esistente public.nuclei;
  segreto uuid;
begin
  perform public.registra_utente();
  select * into esistente from public.nuclei where id = p_id;
  if found then
    if esistente.amministratore_id <> auth.uid() then
      raise exception 'Nucleo già collegato da un altro account';
    end if;
    return;
  end if;
  if length(p_chiave) <> 44 then
    raise exception 'Chiave del nucleo non valida';
  end if;
  segreto := vault.create_secret(p_chiave, 'nucleo-' || p_id::text, 'Chiave AES-256 del nucleo');
  insert into public.nuclei (id, amministratore_id, modalita_storage, chiave_segreto_id)
    values (p_id, auth.uid(), 'locale_drive', segreto);
  insert into public.appartenenze (nucleo_id, utente_id, ruolo, membro_id)
    values (p_id, auth.uid(), 'amministratore', p_membro_id);
  update public.utenti set nucleo_principale_id = coalesce(nucleo_principale_id, p_id) where id = auth.uid();
end;
$$;

-- Consegna la chiave del nucleo (base64) solo ai suoi membri.
create function public.chiave_nucleo(p_nucleo uuid) returns text
  language plpgsql stable security definer set search_path = ''
as $$
declare
  chiave text;
begin
  if not public.e_membro(p_nucleo) then
    raise exception 'Non sei membro di questo nucleo';
  end if;
  select s.decrypted_secret into chiave
    from public.nuclei n
    join vault.decrypted_secrets s on s.id = n.chiave_segreto_id
    where n.id = p_nucleo;
  return chiave;
end;
$$;

revoke execute on function public.registra_utente() from public, anon;
revoke execute on function public.collega_nucleo(uuid, text, text) from public, anon;
revoke execute on function public.chiave_nucleo(uuid) from public, anon;
grant execute on function public.registra_utente() to authenticated;
grant execute on function public.collega_nucleo(uuid, text, text) to authenticated;
grant execute on function public.chiave_nucleo(uuid) to authenticated;
