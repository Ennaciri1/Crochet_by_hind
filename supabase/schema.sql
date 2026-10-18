-- =====================================================================
--  Crochet blog — database schema
--  Paste this whole file in Supabase → SQL Editor → "New query" → Run.
--  It is safe to run more than once.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. POSTS
-- ---------------------------------------------------------------------
create table if not exists public.posts (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  title           text not null,
  excerpt         text not null default '',
  cover_url       text,
  cover_alt       text not null default '',
  category        text not null default 'free-patterns'
                  check (category in ('free-patterns', 'amigurumi', 'wearables', 'home-decor', 'tutorials')),
  tags            text[] not null default '{}',
  content         text not null default '',          -- article body (Markdown)
  difficulty      text check (difficulty in ('beginner', 'easy', 'intermediate', 'experienced')),
  yarn            text not null default '',
  hook            text not null default '',
  gauge           text not null default '',
  finished_size   text not null default '',
  time_estimate   text not null default '',
  materials       text[] not null default '{}',
  abbreviations   text not null default '',
  pattern         text not null default '',          -- instructions (Markdown). Empty = no pattern card.
  faq             jsonb not null default '[]'::jsonb, -- [{ "q": "...", "a": "..." }]
  etsy_url        text not null default '',
  seo_title       text not null default '',
  seo_description text not null default '',
  status          text not null default 'draft' check (status in ('draft', 'published')),
  published_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists posts_published_idx on public.posts (status, published_at desc);
create index if not exists posts_category_idx  on public.posts (category);

-- Keep updated_at fresh on every UPDATE.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists posts_set_updated_at on public.posts;
create trigger posts_set_updated_at
  before update on public.posts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 2. ADMINS  (only users listed here can use /admin)
-- ---------------------------------------------------------------------
create table if not exists public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- "security definer" lets the function read the admins table even though
-- normal users have no access to it.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

grant execute on function public.is_admin() to anon, authenticated;

-- ---------------------------------------------------------------------
-- 3. MESSAGES  (contact form)
-- ---------------------------------------------------------------------
create table if not exists public.messages (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text not null,
  body       text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY
-- ---------------------------------------------------------------------
alter table public.posts    enable row level security;
alter table public.admins   enable row level security;
alter table public.messages enable row level security;

-- POSTS: everyone can read published posts whose date has arrived.
drop policy if exists "Public can read published posts" on public.posts;
create policy "Public can read published posts"
  on public.posts for select
  using (status = 'published' and published_at <= now());

-- POSTS: admins can read everything (drafts, scheduled posts).
drop policy if exists "Admins can read all posts" on public.posts;
create policy "Admins can read all posts"
  on public.posts for select
  to authenticated
  using (public.is_admin());

drop policy if exists "Admins can insert posts" on public.posts;
create policy "Admins can insert posts"
  on public.posts for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "Admins can update posts" on public.posts;
create policy "Admins can update posts"
  on public.posts for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can delete posts" on public.posts;
create policy "Admins can delete posts"
  on public.posts for delete
  to authenticated
  using (public.is_admin());

-- ADMINS: a logged-in user can only see their own row (no writes from the app).
drop policy if exists "Users can see their own admin row" on public.admins;
create policy "Users can see their own admin row"
  on public.admins for select
  to authenticated
  using (user_id = auth.uid());

-- MESSAGES: anyone can send a message, with length limits.
drop policy if exists "Anyone can send a message" on public.messages;
create policy "Anyone can send a message"
  on public.messages for insert
  to anon, authenticated
  with check (
    char_length(name)  between 1 and 100
    and char_length(email) between 3 and 200
    and email like '%@%'
    and char_length(body)  between 10 and 5000
  );

drop policy if exists "Admins can read messages" on public.messages;
create policy "Admins can read messages"
  on public.messages for select
  to authenticated
  using (public.is_admin());

drop policy if exists "Admins can delete messages" on public.messages;
create policy "Admins can delete messages"
  on public.messages for delete
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------
-- 5. STORAGE: public bucket "images"
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('images', 'images', true)
on conflict (id) do update set public = true;

drop policy if exists "Public can read images" on storage.objects;
create policy "Public can read images"
  on storage.objects for select
  using (bucket_id = 'images');

drop policy if exists "Admins can upload images" on storage.objects;
create policy "Admins can upload images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'images' and public.is_admin());

drop policy if exists "Admins can update images" on storage.objects;
create policy "Admins can update images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'images' and public.is_admin());

drop policy if exists "Admins can delete images" on storage.objects;
create policy "Admins can delete images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'images' and public.is_admin());

-- ---------------------------------------------------------------------
-- 6. MAKE YOUR USER AN ADMIN
--    1) Supabase → Authentication → Users → "Add user" (email + password,
--       tick "Auto Confirm User").
--    2) Replace the email below with yours, then run ONLY this line:
-- ---------------------------------------------------------------------
-- insert into public.admins (user_id)
-- select id from auth.users where email = 'you@example.com'
-- on conflict do nothing;
