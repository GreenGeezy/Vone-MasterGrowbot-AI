-- Additive change: old clients may continue sending the original event fields.
alter table public.conversion_events add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.public_reports add column if not exists user_id uuid default auth.uid();
create index if not exists public_reports_user_id_idx on public.public_reports(user_id);

-- These narrowly privileged helpers are only callable by the server's service role.
-- User identity is verified by delete-account; never supplied by a client as a deletion target.
create or replace function public.account_deletion_manifest(target_user uuid)
returns table(bucket_id text,name text)
language sql security definer set search_path = '' as $$
  select o.bucket_id,o.name from storage.objects o
  where o.owner_id=target_user::text or o.owner=target_user or split_part(o.name,'/',1)=target_user::text;
$$;
revoke all on function public.account_deletion_manifest(uuid) from public,anon,authenticated;
grant execute on function public.account_deletion_manifest(uuid) to service_role;

create or replace function public.finish_account_deletion(target_user uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if target_user is null then raise exception 'User required'; end if;
  if exists(select 1 from storage.objects o where o.owner_id=target_user::text or o.owner=target_user or split_part(o.name,'/',1)=target_user::text) then
    raise exception 'Storage cleanup incomplete';
  end if;
  -- Old share rows lack ownership; only remove those linked to an unambiguous user path.
  delete from public.public_reports r where r.user_id=target_user or exists(
    select 1 from unnest(r.image_urls) u where u like '%/user_uploads/'||target_user::text||'/%'
  );
  delete from public.journal_attachments where user_id=target_user;
  delete from public.chat_messages where session_id in(select id from public.chat_sessions where user_id=target_user);
  delete from public.chat_sessions where user_id=target_user;
  delete from public.tasks where user_id=target_user;
  delete from public.journal_logs where user_id=target_user;
  delete from public.diagnosis_reports where user_id=target_user;
  delete from public.plants where user_id=target_user;
  delete from public.grows where user_id=target_user;
  delete from public.user_daily_usage where user_id=target_user;
  delete from public.user_feedback where user_id=target_user;
  delete from public.support_tickets where user_id=target_user;
  delete from public.app_ratings where user_id=target_user;
  delete from public.conversion_events where user_id=target_user;
  delete from public.profiles where id=target_user;
  -- Includes Auth sessions/identities through Supabase-managed cascade relations.
  delete from auth.users where id=target_user;
end;
$$;
revoke all on function public.finish_account_deletion(uuid) from public,anon,authenticated;
grant execute on function public.finish_account_deletion(uuid) to service_role;
