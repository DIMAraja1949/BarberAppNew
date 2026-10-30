create table if not exists public.content_reports (
  id bigint generated always as identity primary key,
  content_type text not null check (
    content_type in ('reel', 'comment', 'gallery', 'user_block')
  ),
  target_content_id text not null check (length(trim(target_content_id)) between 1 and 100),
  reported_user_id uuid references auth.users(id) on delete set null,
  reporter_user_id uuid references auth.users(id) on delete set null,
  reason text not null check (length(trim(reason)) between 1 and 1000),
  status text not null default 'pending'
    check (status in ('pending', 'reviewed', 'actioned', 'dismissed')),
  created_at timestamptz not null default now()
);

alter table public.content_reports enable row level security;

grant insert on public.content_reports to anon, authenticated;
grant usage on sequence public.content_reports_id_seq to anon, authenticated;

drop policy if exists "Allow users to submit content reports"
  on public.content_reports;
create policy "Allow users to submit content reports"
  on public.content_reports
  for insert
  to anon, authenticated
  with check (
    reporter_user_id is not distinct from auth.uid()
    and status = 'pending'
  );

alter table public.content_reports
  drop constraint if exists content_reports_content_type_check;
alter table public.content_reports
  add constraint content_reports_content_type_check
  check (content_type in ('reel', 'comment', 'gallery', 'user_block'));

grant select, update on public.content_reports to authenticated;

drop policy if exists "Admins can review content reports"
  on public.content_reports;
create policy "Admins can review content reports"
  on public.content_reports
  for select
  to authenticated
  using ((auth.jwt() ->> 'email') = 'mohameddayan2@gmail.com');

drop policy if exists "Admins can update content reports"
  on public.content_reports;
create policy "Admins can update content reports"
  on public.content_reports
  for update
  to authenticated
  using ((auth.jwt() ->> 'email') = 'mohameddayan2@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'mohameddayan2@gmail.com');

create or replace function public.notify_content_moderation_queue()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_notify(
    'content_moderation_alert',
    json_build_object(
      'report_id', new.id,
      'content_type', new.content_type,
      'created_at', new.created_at
    )::text
  );
  return new;
end;
$$;

drop trigger if exists content_moderation_queue_alert
  on public.content_reports;
create trigger content_moderation_queue_alert
  after insert on public.content_reports
  for each row execute function public.notify_content_moderation_queue();
