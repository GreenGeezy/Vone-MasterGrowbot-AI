-- Reserve at most 100 MiB for the launch on the existing free plan.
-- The global lock makes the project and owner limits atomic across simultaneous requests.
create or replace function public.reserve_journal_attachment(p_user uuid,p_id uuid,p_draft uuid,p_name text,p_mime text,p_bytes bigint)
returns public.journal_attachments language plpgsql security invoker set search_path='' as $$
declare existing public.journal_attachments; total_bytes bigint; file_count integer; project_bytes bigint;
begin
 perform pg_advisory_xact_lock(173,1);
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,173));
 select * into existing from public.journal_attachments where id=p_id;
 if found then
  if existing.user_id<>p_user or existing.draft_id<>p_draft or existing.byte_size<>p_bytes or existing.filename<>p_name or existing.mime_type<>p_mime then raise exception 'Attachment conflict'; end if;
  return existing;
 end if;
 if not exists(select 1 from public.mobile_features where id and uploads_enabled) then raise exception 'Uploads temporarily unavailable'; end if;
 if exists(select 1 from public.journal_logs where id=p_draft and user_id<>p_user) then raise exception 'Journal unavailable'; end if;
 select coalesce(sum(byte_size),0) into project_bytes from public.journal_attachments;
 if project_bytes+p_bytes>104857600 then raise exception 'New uploads are temporarily at capacity. Existing files remain available.'; end if;
 select coalesce(sum(byte_size),0) into total_bytes from public.journal_attachments where user_id=p_user;
 select count(*) into file_count from public.journal_attachments where user_id=p_user and draft_id=p_draft;
 if total_bytes+p_bytes>104857600 then raise exception 'Your 100 MB file allowance is full. Delete a file to make room.'; end if;
 if file_count>=5 then raise exception 'You can attach up to five files per note.'; end if;
 insert into public.journal_attachments(id,user_id,draft_id,filename,object_path,mime_type,byte_size)
 values(p_id,p_user,p_draft,p_name,p_user::text||'/'||p_id::text,p_mime,p_bytes) returning * into existing;
 return existing;
end $$;
create index conversion_events_owner_date on public.conversion_events(user_id,created_at);
