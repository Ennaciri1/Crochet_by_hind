-- =====================================================================
--  Add the short "about me" shown beside every pattern.
--  Supabase → SQL Editor → New query → paste all of this → Run.
--  Safe to run more than once.
-- =====================================================================

alter table public.settings
  add column if not exists author_bio text not null default '';

-- A starting text, only if the field is still empty. Edit it afterwards in
-- /admin → Settings; running this file again will not overwrite your version.
update public.settings
set author_bio = 'My mom taught me to crochet, and after five years of designing I now share free patterns written in clear US terms — tested, photographed step by step, and made to be fun for beginners.'
where id = 1 and author_bio = '';
