create table if not exists public.grows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null default 'My Grow',
  status text not null default 'active',
  created_at timestamptz default timezone('utc'::text, now()),
  updated_at timestamptz default timezone('utc'::text, now())
);

alter table public.plants add column if not exists grow_id uuid references public.grows(id) on delete set null;
alter table public.plants add column if not exists image_url text;
alter table public.plants add column if not exists health_score integer default 100;
alter table public.plants add column if not exists days_in_stage integer default 1;
alter table public.plants add column if not exists total_days integer default 1;
alter table public.plants add column if not exists strain_details jsonb;
alter table public.plants add column if not exists updated_at timestamptz default timezone('utc'::text, now());

alter table public.journal_logs add column if not exists updated_at timestamptz default timezone('utc'::text, now());
alter table public.diagnosis_reports add column if not exists updated_at timestamptz default timezone('utc'::text, now());

create index if not exists grows_user_id_idx on public.grows(user_id);
create index if not exists plants_user_id_idx on public.plants(user_id);
create index if not exists plants_grow_id_idx on public.plants(grow_id);
create index if not exists journal_logs_user_id_idx on public.journal_logs(user_id);
create index if not exists journal_logs_plant_id_idx on public.journal_logs(plant_id);
create index if not exists diagnosis_reports_user_id_idx on public.diagnosis_reports(user_id);
create index if not exists diagnosis_reports_plant_id_idx on public.diagnosis_reports(plant_id);

alter table public.grows enable row level security;
alter table public.plants enable row level security;
alter table public.journal_logs enable row level security;
alter table public.diagnosis_reports enable row level security;

drop policy if exists "Users manage their own grows" on public.grows;
create policy "Users manage their own grows"
  on public.grows
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Authenticated users manage own plants" on public.plants;
create policy "Authenticated users manage own plants"
  on public.plants
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Authenticated users manage own journal logs" on public.journal_logs;
create policy "Authenticated users manage own journal logs"
  on public.journal_logs
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Authenticated users manage own diagnosis reports" on public.diagnosis_reports;
create policy "Authenticated users manage own diagnosis reports"
  on public.diagnosis_reports
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can view own user_uploads" on storage.objects;
create policy "Users can view own user_uploads"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'user_uploads' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can upload own user_uploads" on storage.objects;
create policy "Users can upload own user_uploads"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'user_uploads' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can update own user_uploads" on storage.objects;
create policy "Users can update own user_uploads"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'user_uploads' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'user_uploads' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can delete own user_uploads" on storage.objects;
create policy "Users can delete own user_uploads"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'user_uploads' and (storage.foldername(name))[1] = auth.uid()::text);
