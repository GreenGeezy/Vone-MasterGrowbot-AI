-- 1. Create the table
create table if not exists user_daily_usage (
  user_id uuid references auth.users not null,
  date date not null default current_date,
  request_count int not null default 1,
  primary key (user_id, date)
);

-- 2. Enable Row Level Security (RLS)
alter table user_daily_usage enable row level security;

-- 3. Create RLS Policies

-- Policy: Allow users to insert/update/select their OWN rows.
-- This is required because the Edge Function uses the User's Auth Token.
create policy "Users can manage their own usage"
on user_daily_usage
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Policy: Allow Service Role full access (for admin/backend scripts)
create policy "Service Role can manage all"
on user_daily_usage
for all
to service_role
using (true)
with check (true);
