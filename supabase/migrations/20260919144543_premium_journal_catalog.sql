-- Additive release: existing app tables, products and analysis routes are unchanged.
create table public.mobile_features (
 id boolean primary key default true check(id), uploads_enabled boolean not null default false,
 catalog_enabled boolean not null default false
);
insert into public.mobile_features(id) values(true);
alter table public.mobile_features enable row level security;
grant select on public.mobile_features to authenticated;
create policy "Read feature availability" on public.mobile_features for select to authenticated using(true);

create table public.journal_attachments (
 id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,
 draft_id uuid not null, entry_id uuid references public.journal_logs(id) on delete restrict,
 filename text not null check(length(filename) between 1 and 180),
 object_path text not null unique, mime_type text not null,
 byte_size bigint not null check(byte_size > 0 and byte_size <= 10485760),
 state text not null default 'pending' check(state in ('pending','ready')),
 created_at timestamptz not null default now()
);
create index journal_attachments_owner on public.journal_attachments(user_id,draft_id);
create index journal_attachments_entry on public.journal_attachments(entry_id);
alter table public.journal_attachments enable row level security;
grant select on public.journal_attachments to authenticated;
revoke insert,update,delete on public.journal_attachments from anon,authenticated;
create policy "Read own attachments" on public.journal_attachments for select to authenticated using((select auth.uid())=user_id);

-- Server-only RPC: all quota decisions serialize for one owner, including pending uploads.
create function public.reserve_journal_attachment(p_user uuid,p_id uuid,p_draft uuid,p_name text,p_mime text,p_bytes bigint)
returns public.journal_attachments language plpgsql security invoker set search_path='' as $$
declare existing public.journal_attachments; total_bytes bigint; file_count integer;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,173));
 select * into existing from public.journal_attachments where id=p_id;
 if found then
  if existing.user_id<>p_user or existing.draft_id<>p_draft or existing.byte_size<>p_bytes or existing.filename<>p_name or existing.mime_type<>p_mime then raise exception 'Attachment conflict'; end if;
  return existing;
 end if;
 if not exists(select 1 from public.mobile_features where id and uploads_enabled) then raise exception 'Uploads temporarily unavailable'; end if;
 if exists(select 1 from public.journal_logs where id=p_draft and user_id<>p_user) then raise exception 'Journal unavailable'; end if;
 select coalesce(sum(byte_size),0) into total_bytes from public.journal_attachments where user_id=p_user;
 select count(*) into file_count from public.journal_attachments where user_id=p_user and draft_id=p_draft;
 if total_bytes+p_bytes>104857600 then raise exception 'Your 100 MB file allowance is full. Delete a file to make room.'; end if;
 if file_count>=5 then raise exception 'You can attach up to five files per note.'; end if;
 insert into public.journal_attachments(id,user_id,draft_id,filename,object_path,mime_type,byte_size)
 values(p_id,p_user,p_draft,p_name,p_user::text||'/'||p_id::text,p_mime,p_bytes) returning * into existing;
 return existing;
end $$;
revoke all on function public.reserve_journal_attachment(uuid,uuid,uuid,text,text,bigint) from public,anon,authenticated;
grant execute on function public.reserve_journal_attachment(uuid,uuid,uuid,text,text,bigint) to service_role;

create function public.bind_journal_attachments() returns trigger language plpgsql security definer set search_path='' as $$
begin
 update public.journal_attachments set entry_id=new.id where draft_id=new.id and user_id=new.user_id and state='ready';
 return new;
end $$;
revoke all on function public.bind_journal_attachments() from public,anon,authenticated;
create trigger bind_journal_files after insert on public.journal_logs for each row execute function public.bind_journal_attachments();

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('journal_documents','journal_documents',false,10485760,array['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','text/csv','text/plain']);
-- No direct client writes or reads: signed links and server authorization only.

create table public.premium_strain_profiles (
 id text primary key, name text not null unique, profile jsonb not null,
 source_url text not null check(source_url like 'https://%'), reviewed_at date not null
);
alter table public.premium_strain_profiles enable row level security;
revoke all on public.premium_strain_profiles from anon,authenticated;

create table public.conversion_events (
 id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,
 event text not null, surface text not null, version text not null,
 created_at timestamptz not null default now()
);
create index conversion_events_date on public.conversion_events(created_at,event);
alter table public.conversion_events enable row level security;
revoke all on public.conversion_events from anon,authenticated;
grant all on public.mobile_features,public.journal_attachments,public.premium_strain_profiles,public.conversion_events to service_role;
