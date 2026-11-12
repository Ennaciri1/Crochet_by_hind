-- =====================================================================
--  Add the Instagram link to the site settings (footer + Google profile).
--  Supabase → SQL Editor → New query → paste all of this → Run.
--  Safe to run more than once.
-- =====================================================================

alter table public.settings
  add column if not exists instagram_url text not null default '';

-- Fill in the profile, only if the field is still empty. Edit it afterwards in
-- /admin → Settings; running this file again will not overwrite your version.
update public.settings
set instagram_url = 'https://www.instagram.com/crochet_henouda/'
where id = 1 and instagram_url = '';
