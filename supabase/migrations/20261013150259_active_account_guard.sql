create or replace function public.active_account()
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from auth.users where id=(select auth.uid()));
$$;
revoke all on function public.active_account() from public,anon;
grant execute on function public.active_account() to authenticated;
do $guard$
declare t text;
begin
 foreach t in array array['profiles','plants','grows','journal_logs','diagnosis_reports','tasks','chat_sessions','chat_messages','user_daily_usage','app_ratings','support_tickets','user_feedback'] loop
  execute format('create policy active_account_required on public.%I as restrictive for all to authenticated using ((select public.active_account())) with check ((select public.active_account()))',t);
 end loop;
end;
$guard$;
