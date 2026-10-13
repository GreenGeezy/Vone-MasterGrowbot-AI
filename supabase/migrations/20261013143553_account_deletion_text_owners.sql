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
  delete from public.tasks where user_id=target_user::text;
  delete from public.journal_logs where user_id=target_user;
  delete from public.diagnosis_reports where user_id=target_user;
  delete from public.plants where user_id=target_user;
  delete from public.grows where user_id=target_user;
  delete from public.user_daily_usage where user_id=target_user;
  delete from public.user_feedback where user_id=target_user::text;
  delete from public.support_tickets where user_id=target_user::text;
  delete from public.app_ratings where user_id=target_user;
  delete from public.conversion_events where user_id=target_user;
  delete from public.profiles where id=target_user;
  -- Includes Auth sessions/identities through Supabase-managed cascade relations.
  delete from auth.users where id=target_user;
end;
$$;
revoke all on function public.finish_account_deletion(uuid) from public,anon,authenticated;
grant execute on function public.finish_account_deletion(uuid) to service_role;
