-- =====================================================================
--  Add the email sign-up box (table "subscribers").
--  Supabase → SQL Editor → New query → paste all of this → Run.
--  Safe to run more than once.
--
--  This is the same block that lives in schema.sql; it is here on its own
--  so an existing site can add the feature without re-running everything.
-- =====================================================================

create table if not exists public.subscribers (
  id         uuid primary key default gen_random_uuid(),
  name       text not null default '',
  email      text not null unique,
  source     text not null default '',   -- the post they signed up from
  created_at timestamptz not null default now()
);

create index if not exists subscribers_created_idx on public.subscribers (created_at desc);

alter table public.subscribers enable row level security;

-- Anyone can sign up, but nobody can read the list from the public site:
-- there is no select policy for "anon" on purpose.
drop policy if exists "Anyone can subscribe" on public.subscribers;
create policy "Anyone can subscribe"
  on public.subscribers for insert
  to anon, authenticated
  with check (
    char_length(email) between 3 and 200
    and email like '%_@_%.__%'
    and char_length(name) <= 100
    and char_length(source) <= 200
  );

drop policy if exists "Admins can read subscribers" on public.subscribers;
create policy "Admins can read subscribers"
  on public.subscribers for select
  to authenticated
  using (public.is_admin());

drop policy if exists "Admins can delete subscribers" on public.subscribers;
create policy "Admins can delete subscribers"
  on public.subscribers for delete
  to authenticated
  using (public.is_admin());
