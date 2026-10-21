-- =====================================================================
--  Crochet blog — database schema
--  Paste this whole file in Supabase → SQL Editor → "New query" → Run.
--  It is safe to run more than once.
-- =====================================================================

-- --------j-------------------------------------------------------------
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
-- 1b. SETTINGS  (single row: site name, contact info, AdSense)
-- ---------------------------------------------------------------------
create table if not exists public.settings (
  id                      int primary key default 1 check (id = 1), -- forces a single row
  site_name               text not null default 'My Crochet Blog',
  author_name             text not null default 'The Designer',
  contact_email           text not null default 'hello@example.com',
  etsy_url                text not null default 'https://www.etsy.com',
  pinterest_url           text not null default 'https://www.pinterest.com',
  description             text not null default 'Free crochet patterns with clear US-term instructions: amigurumi, wearables, home decor and beginner tutorials.',
  ads_enabled             boolean not null default true,
  adsense_client          text not null default '',
  adsense_slot_in_article text not null default '',
  adsense_slot_display    text not null default '',
  updated_at              timestamptz not null default now()
);

insert into public.settings (id) values (1) on conflict (id) do nothing;

drop trigger if exists settings_set_updated_at on public.settings;
create trigger settings_set_updated_at
  before update on public.settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 1c. CATEGORIES
-- ---------------------------------------------------------------------
create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  color       text not null default 'rose',
  description text not null default '',
  sort_order  int not null default 0,
  updated_at  timestamptz not null default now()
);

insert into public.categories (slug, name, color, description, sort_order) values
  ('free-patterns', 'Free patterns', 'rose',   'Free crochet patterns with clear US-term instructions, stitch counts and printable pattern cards.', 1),
  ('amigurumi',     'Amigurumi',     'butter', 'Free amigurumi patterns: small crocheted animals, dolls and toys, worked in the round.', 2),
  ('wearables',     'Wearables',     'lilac',  'Free crochet patterns for hats, scarves, sweaters, bags and other things you can wear.', 3),
  ('home-decor',    'Home decor',    'mint',   'Free crochet patterns for blankets, pillows, coasters, baskets and cozy home accents.', 4),
  ('tutorials',     'Tutorials',     'sky',    'Step-by-step crochet tutorials: stitches, techniques, reading patterns and finishing tips.', 5)
on conflict (slug) do nothing;

drop trigger if exists categories_set_updated_at on public.categories;
create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 1d. PAGES  (About / Privacy / Terms / Disclaimer — Markdown content)
-- ---------------------------------------------------------------------
create table if not exists public.pages (
  slug       text primary key check (slug in ('about', 'privacy-policy', 'terms', 'disclaimer')),
  title      text not null,
  content    text not null default '',
  updated_at timestamptz not null default now()
);

drop trigger if exists pages_set_updated_at on public.pages;
create trigger pages_set_updated_at
  before update on public.pages
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
-- 3b. SUBSCRIBERS  (the email box at the bottom of every post)
-- ---------------------------------------------------------------------
create table if not exists public.subscribers (
  id         uuid primary key default gen_random_uuid(),
  name       text not null default '',
  email      text not null unique,
  source     text not null default '',   -- the post they signed up from
  created_at timestamptz not null default now()
);

create index if not exists subscribers_created_idx on public.subscribers (created_at desc);

-- ---------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY
-- ---------------------------------------------------------------------
alter table public.posts       enable row level security;
alter table public.admins      enable row level security;
alter table public.messages    enable row level security;
alter table public.subscribers enable row level security;
alter table public.settings   enable row level security;
alter table public.categories enable row level security;
alter table public.pages      enable row level security;

-- SETTINGS: everyone can read, only admins can update (no insert/delete from the app).
drop policy if exists "Public can read settings" on public.settings;
create policy "Public can read settings"
  on public.settings for select
  to anon, authenticated
  using (true);

drop policy if exists "Admins can update settings" on public.settings;
create policy "Admins can update settings"
  on public.settings for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- CATEGORIES: everyone can read, only admins can write.
drop policy if exists "Public can read categories" on public.categories;
create policy "Public can read categories"
  on public.categories for select
  to anon, authenticated
  using (true);

drop policy if exists "Admins can insert categories" on public.categories;
create policy "Admins can insert categories"
  on public.categories for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "Admins can update categories" on public.categories;
create policy "Admins can update categories"
  on public.categories for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can delete categories" on public.categories;
create policy "Admins can delete categories"
  on public.categories for delete
  to authenticated
  using (public.is_admin());

-- PAGES: everyone can read, only admins can update (slugs are fixed, pre-seeded below).
drop policy if exists "Public can read pages" on public.pages;
create policy "Public can read pages"
  on public.pages for select
  to anon, authenticated
  using (true);

drop policy if exists "Admins can update pages" on public.pages;
create policy "Admins can update pages"
  on public.pages for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

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

-- SUBSCRIBERS: anyone can sign up, only admins can read the list.
-- No select policy for anon, so the email list can never be read from the site.
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
-- 5b. SEED the 4 static pages (Markdown). Safe to run again: only inserts
--     if the row is missing, so edits made from /admin are never overwritten.
-- ---------------------------------------------------------------------
insert into public.pages (slug, title, content) values
('about', 'About', $md$Hi, I'm The Designer — the hands behind My Crochet Blog.

I design crochet patterns that are calm to make and lovely to use: soft amigurumi friends, warm wearables and simple pieces for the home. Every pattern on this site is written in **US crochet terms**, tested, and photographed step by step.

## Why the patterns are free

I believe everyone should be able to learn to crochet. The patterns on this blog are free to read, and the site is supported by ads. If you would rather have a clean, printable copy without ads, you can buy the PDF version in my [Etsy shop](https://www.etsy.com). Every purchase helps me publish more free patterns.

## What you will find here

- Free patterns with stitch counts for every round
- Beginner-friendly tutorials for stitches and techniques
- Printable pattern cards — no ads on paper

## Say hello

I love seeing what you make! Share your finished projects on [Pinterest](https://www.pinterest.com) or send me a note through the [contact page](/contact).
$md$),
('privacy-policy', 'Privacy Policy', $md$This Privacy Policy explains what information My Crochet Blog ("we", "us") collects when you visit the site, how it is used, and the choices you have.

## Information we collect

- **Contact form:** when you send a message, we store your name, email address and message so we can reply. We never sell this information, and we do not add you to the mailing list unless you sign up for it yourself.
- **Mailing list:** if you sign up through the form at the end of a pattern, we store the first name and email address you give us, together with the post you signed up from, so we can send you new patterns.
- **Log data:** our hosting provider automatically records technical information such as your IP address, browser type and the pages you visit, for security and performance.
- **Cookies:** small files stored on your device, mostly by our advertising partner (see below).

## Advertising and Google AdSense cookies

We use Google AdSense to show ads on this site. Third-party vendors, including Google, use cookies to serve ads based on a user's prior visits to this website or other websites.

Google's use of advertising cookies enables it and its partners to serve ads to our users based on their visit to this site and/or other sites on the Internet.

You may opt out of personalized advertising by visiting [Google Ads Settings](https://adssettings.google.com). Alternatively, you can opt out of a third-party vendor's use of cookies for personalized advertising by visiting [www.aboutads.info](https://www.aboutads.info/choices/).

To learn more, read [How Google uses information from sites or apps that use its services](https://policies.google.com/technologies/partner-sites).

## Visitors in the EEA, the UK and Switzerland

If you visit from the European Economic Area, the United Kingdom or Switzerland, we ask for your consent before personalized ads and non-essential cookies are used, through a consent message provided by Google (a certified consent management platform). You can change or withdraw your consent at any time using the privacy settings link shown by that message. If you do not consent, you may still see non-personalized ads.

## How we use your information

- To answer your messages
- To send you new patterns, but only if you signed up for them
- To keep the site secure and working well
- To show ads that keep the patterns free

## The mailing list

Joining the mailing list is optional: you only hear from us if you fill in the sign-up form yourself. We use your email address to send new patterns, tutorials and the occasional free file — nothing else.

We never sell, rent or share your email address. The list is managed with [Brevo](https://www.brevo.com), a company based in the European Union, which stores it on our behalf. Any email we send you will include an unsubscribe link, and you can ask us to remove you at any time through the [contact page](/contact). Once you unsubscribe, we delete your address from the list.

## Where your information is stored

This website is hosted by **Vercel**, and everything described above — contact messages, mailing-list addresses and the photos on the site — is stored in a **Supabase** database. If you join the mailing list, your first name and email address are also stored with **Brevo**, the service we use to send those emails. All three companies process this data only on our instructions, as service providers, and are not allowed to use it for their own purposes.

Their servers may be located outside your own country, including in the United States, so your information may be transferred to and processed there.

## Data retention and your rights

Contact messages are deleted once they are no longer needed. You can ask us at any time to access, correct or delete the personal data we hold about you by writing to [hello@example.com](mailto:hello@example.com). Depending on where you live (for example under the GDPR or the CCPA), you may have additional rights, including the right to complain to a data protection authority.

## External links

Our posts link to other websites such as Etsy and Pinterest. Their own privacy policies apply when you visit them.

## Children

This site is not directed at children under 13, and we do not knowingly collect their personal information.

## Changes

We may update this policy from time to time. The date at the top of this page shows the latest version. Questions? [Contact us](/contact).
$md$),
('terms', 'Terms of Use', $md$By using My Crochet Blog, you agree to these terms. If you do not agree, please do not use the site.

## Copyright of patterns and photos

All patterns, text and photos on this site are © The Designer and protected by copyright. The patterns are free to read and to use for your own crocheting.

- **You may** make items from the patterns for yourself, as gifts, for charity, or to sell in small quantities. Please credit My Crochet Blog with a link when you sell or share them.
- **You may not** copy, translate, republish, share or sell the pattern text or photos, in whole or in part, online or in print. Sharing a link to the post is always welcome.

## Pinterest and social media

You are welcome to pin our photos with the "Save to Pinterest" button, or share one photo with a link back to the original post.

## Purchases

PDF patterns are sold through [Etsy](https://www.etsy.com). Etsy's terms and refund policies apply to those purchases.

## No warranty

Patterns are tested carefully, but mistakes can happen and results depend on your yarn, hook and tension. The site is provided "as is", without warranties of any kind. See our [Disclaimer](/disclaimer).

## Limitation of liability

To the extent permitted by law, The Designer is not liable for any damage resulting from the use of this site or its patterns.

## Changes

We may update these terms at any time. Continued use of the site means you accept the latest version. Questions? [Contact us](/contact).
$md$),
('disclaimer', 'Disclaimer', $md$## Advertising

My Crochet Blog is supported by advertising. Ads are served by Google AdSense and are clearly labelled "Advertisement". We do not choose the individual ads you see, and showing an ad does not mean we endorse the product. Read our [Privacy Policy](/privacy-policy) to learn how ad cookies work.

## Our own products

Some links point to our own [Etsy shop](https://www.etsy.com), where we sell ad-free PDF versions of our patterns. If a post ever contains an affiliate link, it will be mentioned in that post.

## Safety: toys and items for babies

**Plastic safety eyes, buttons, beads and other small parts are a choking hazard** and are not safe for babies and children under 3 years old. For toys made for babies and young children, embroider the eyes and details with yarn instead, sew all parts on very securely, and check the toy regularly for wear.

Never leave a baby unattended with a toy, and do not put crocheted toys, blankets or loose items in a sleeping infant's crib. Items made from our patterns are made at your own risk, and you are responsible for the safety of anything you make, give or sell.

## Accuracy

Patterns are tested, but errors can still happen, and your finished size may differ depending on yarn, hook and tension. If you find a mistake, please [tell us](/contact) so we can fix it.
$md$)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------
-- 6. MAKE YOUR USER AN ADMIN
--    1) Supabase → Authentication → Users → "Add user" (email + password,
--       tick "Auto Confirm User").
--    2) Replace the email below with yours, then run ONLY this line:
-- ---------------------------------------------------------------------
-- insert into public.admins (user_id)
-- select id from auth.users where email = 'you@example.com'
-- on conflict do nothing;
