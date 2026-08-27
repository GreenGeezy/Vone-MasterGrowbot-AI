-- Preserve all existing rows while making bigint primary keys server-generated.
-- Locks close the small race between reading max(id) and attaching defaults.
lock table public.support_tickets in share row exclusive mode;
lock table public.tasks in share row exclusive mode;
lock table public.user_feedback in share row exclusive mode;

create sequence if not exists public.support_tickets_id_seq;
alter sequence public.support_tickets_id_seq owned by public.support_tickets.id;
select setval(
  'public.support_tickets_id_seq',
  greatest(coalesce((select max(id) from public.support_tickets), 0) + 1, 1),
  false
);
alter table public.support_tickets
  alter column id set default nextval('public.support_tickets_id_seq');

create sequence if not exists public.tasks_id_seq;
alter sequence public.tasks_id_seq owned by public.tasks.id;
select setval(
  'public.tasks_id_seq',
  greatest(coalesce((select max(id) from public.tasks), 0) + 1, 1),
  false
);
alter table public.tasks
  alter column id set default nextval('public.tasks_id_seq');

create sequence if not exists public.user_feedback_id_seq;
alter sequence public.user_feedback_id_seq owned by public.user_feedback.id;
select setval(
  'public.user_feedback_id_seq',
  greatest(coalesce((select max(id) from public.user_feedback), 0) + 1, 1),
  false
);
alter table public.user_feedback
  alter column id set default nextval('public.user_feedback_id_seq');
