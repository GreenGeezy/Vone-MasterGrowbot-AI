-- Product decision: allow up to five video requests in a day when the
-- authoritative $0.90 rolling weekly AI budget still has capacity.
create or replace function public.reserve_ai_usage(
  p_user_id uuid,
  p_mode text,
  p_reserved_cost_usd numeric,
  p_count_request boolean default true
)
returns table(allowed boolean, reason text, weekly_cost_usd numeric, video_requests_today integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_weekly numeric := 0;
  v_video integer := 0;
  v_requests integer := 0;
begin
  if p_user_id is null or p_reserved_cost_usd <= 0 or p_reserved_cost_usd > 0.20 then
    raise exception 'invalid usage reservation';
  end if;
  if p_mode not in ('diagnosis', 'insight', 'chat', 'voice', 'video_visual_analysis', 'fallback') then
    raise exception 'invalid AI mode';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));
  insert into public.user_daily_usage
    (user_id, date, request_count, video_request_count, estimated_cost_usd, reserved_cost_usd, input_tokens, output_tokens)
  values (p_user_id, current_date, 0, 0, 0, 0, 0, 0)
  on conflict (user_id, date) do nothing;
  select coalesce(sum(u.estimated_cost_usd + u.reserved_cost_usd), 0)
    into v_weekly
    from public.user_daily_usage u
   where u.user_id = p_user_id and u.date between current_date - 6 and current_date;
  select u.video_request_count, u.request_count
    into v_video, v_requests
    from public.user_daily_usage u
   where u.user_id = p_user_id and u.date = current_date
   for update;
  if p_count_request and v_requests >= 100 then
    return query select false, 'daily_request_limit'::text, v_weekly, v_video;
    return;
  end if;
  if p_count_request and p_mode = 'video_visual_analysis' and v_video >= 5 then
    return query select false, 'daily_video_limit'::text, v_weekly, v_video;
    return;
  end if;
  if v_weekly + p_reserved_cost_usd > 0.90 then
    return query select false, 'weekly_cost_limit'::text, v_weekly, v_video;
    return;
  end if;
  update public.user_daily_usage
     set request_count = request_count + case when p_count_request then 1 else 0 end,
         video_request_count = video_request_count + case when p_count_request and p_mode = 'video_visual_analysis' then 1 else 0 end,
         reserved_cost_usd = reserved_cost_usd + p_reserved_cost_usd
   where user_id = p_user_id and date = current_date;
  return query select true, null::text, v_weekly + p_reserved_cost_usd,
    v_video + case when p_count_request and p_mode = 'video_visual_analysis' then 1 else 0 end;
end;
$$;

revoke all on function public.reserve_ai_usage(uuid, text, numeric, boolean) from public, anon, authenticated;
grant execute on function public.reserve_ai_usage(uuid, text, numeric, boolean) to service_role;
