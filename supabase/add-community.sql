-- Likes and moderated discussions. Run in the BLOG project's SQL Editor.
-- Safe to run more than once. No service-role key is needed by the website.

create table if not exists public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  visitor_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (post_id, visitor_id)
);

create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  parent_id uuid,
  visitor_id uuid not null,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  body text not null check (char_length(btrim(body)) between 3 and 2000),
  status text not null default 'pending' check (status in ('pending', 'approved', 'hidden')),
  is_author boolean not null default false,
  created_at timestamptz not null default clock_timestamp(),
  unique (id, post_id),
  foreign key (parent_id, post_id) references public.post_comments(id, post_id) on delete cascade,
  check (parent_id is distinct from id)
);

create index if not exists post_comments_post_idx on public.post_comments(post_id, status, created_at);
create index if not exists post_comments_parent_idx on public.post_comments(parent_id, post_id);
create index if not exists post_comments_visitor_idx on public.post_comments(visitor_id, created_at desc);

alter table public.post_likes enable row level security;
alter table public.post_comments enable row level security;

-- Visitors never get direct table access, including the private visitor IDs.
-- The functions below expose only approved text and aggregate counts.
revoke all on public.post_likes, public.post_comments from public, anon, authenticated;
grant select, update, delete on public.post_comments to authenticated;
grant all on public.post_likes, public.post_comments to service_role;

drop policy if exists "Admins read comments" on public.post_comments;
create policy "Admins read comments" on public.post_comments for select to authenticated using (public.is_admin());
drop policy if exists "Admins moderate comments" on public.post_comments;
create policy "Admins moderate comments" on public.post_comments for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Admins delete comments" on public.post_comments;
create policy "Admins delete comments" on public.post_comments for delete to authenticated using (public.is_admin());

create or replace function public.get_post_community(p_post_id uuid, p_visitor_id uuid default null, p_page integer default 1)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  roots uuid[];
  root_count bigint;
begin
  if not exists (select 1 from public.posts where id = p_post_id and status = 'published' and published_at <= now()) then
    raise exception 'POST_NOT_FOUND' using errcode = 'P0002';
  end if;
  if p_page is null or p_page < 1 or p_page > 10000 then
    raise exception 'INVALID_PAGE' using errcode = '22023';
  end if;
  select count(*) into root_count from public.post_comments
    where post_id = p_post_id and status = 'approved' and parent_id is null;
  select coalesce(array_agg(id), '{}'::uuid[]) into roots from (
    select id from public.post_comments
    where post_id = p_post_id and status = 'approved' and parent_id is null
    order by created_at desc, id desc limit 20 offset (p_page - 1) * 20
  ) selected;
  return jsonb_build_object(
    'likes', (select count(*) from public.post_likes where post_id = p_post_id),
    'liked', exists (select 1 from public.post_likes where post_id = p_post_id and visitor_id = p_visitor_id),
    'comment_count', (select count(*) from public.post_comments c
      where c.post_id = p_post_id and c.status = 'approved' and
        (c.parent_id is null or exists (select 1 from public.post_comments parent where parent.id = c.parent_id and parent.status = 'approved'))),
    'comments', coalesce((select jsonb_agg(jsonb_build_object(
      'id', c.id, 'parent_id', c.parent_id, 'name', c.name, 'body', c.body,
      'is_author', c.is_author, 'created_at', c.created_at
    ) order by c.created_at, c.id) from public.post_comments c
      where c.post_id = p_post_id and c.status = 'approved' and (c.id = any(roots) or c.parent_id = any(roots))), '[]'::jsonb),
    'has_more', root_count > p_page * 20
  );
end;
$$;

-- An explicit desired state makes retries safe: one like per browser and post.
create or replace function public.set_post_like(p_post_id uuid, p_visitor_id uuid, p_liked boolean)
returns bigint language plpgsql security definer set search_path = '' as $$
begin
  if p_visitor_id is null or p_liked is null then raise exception 'INVALID_LIKE' using errcode = '22023'; end if;
  if not exists (select 1 from public.posts where id = p_post_id and status = 'published' and published_at <= now()) then
    raise exception 'POST_NOT_FOUND' using errcode = 'P0002';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_visitor_id::text, 0));
  if p_liked then
    insert into public.post_likes(post_id, visitor_id) values (p_post_id, p_visitor_id) on conflict do nothing;
  else
    delete from public.post_likes where post_id = p_post_id and visitor_id = p_visitor_id;
  end if;
  return (select count(*) from public.post_likes where post_id = p_post_id);
end;
$$;

create or replace function public.add_post_comment(p_post_id uuid, p_visitor_id uuid, p_name text, p_body text, p_parent_id uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  author boolean := public.is_admin();
  comment_id uuid;
  display_name text := btrim(p_name);
begin
  if p_visitor_id is null or p_name is null or p_body is null or
    char_length(btrim(p_name)) not between 1 and 60 or char_length(btrim(p_body)) not between 3 and 2000 then
    raise exception 'INVALID_COMMENT' using errcode = '22023';
  end if;
  if not exists (select 1 from public.posts where id = p_post_id and status = 'published' and published_at <= now()) then
    raise exception 'POST_NOT_FOUND' using errcode = 'P0002';
  end if;
  if p_parent_id is not null and not exists (
    select 1 from public.post_comments where id = p_parent_id and post_id = p_post_id and status = 'approved' and parent_id is null
  ) then raise exception 'REPLY_NOT_AVAILABLE' using errcode = '22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_visitor_id::text, 0));
  if not author and exists (select 1 from public.post_comments where visitor_id = p_visitor_id and created_at > now() - interval '60 seconds') then
    raise exception 'COMMENT_RATE_LIMIT' using errcode = 'P0001';
  end if;
  if author then select left(author_name, 60) into display_name from public.settings where id = 1; end if;
  insert into public.post_comments(post_id, visitor_id, parent_id, name, body, status, is_author)
    values (p_post_id, p_visitor_id, p_parent_id, coalesce(nullif(display_name, ''), 'Author'), btrim(p_body),
      case when author then 'approved' else 'pending' end, author)
    returning id into comment_id;
  return comment_id;
end;
$$;

revoke all on function public.get_post_community(uuid, uuid, integer) from public;
revoke all on function public.set_post_like(uuid, uuid, boolean) from public;
revoke all on function public.add_post_comment(uuid, uuid, text, text, uuid) from public;
grant execute on function public.get_post_community(uuid, uuid, integer) to anon, authenticated;
grant execute on function public.set_post_like(uuid, uuid, boolean) to anon, authenticated;
grant execute on function public.add_post_comment(uuid, uuid, text, text, uuid) to anon, authenticated;

-- Explain the new feature in the existing editable privacy page.
update public.pages set content = content || E'\n\n## Comments and likes\n\nWhen you comment, we store the name and message you provide to moderate and publish the discussion. Approved comments and replies are public. No email address is required. Please do not post private information. We use a first-party cookie to remember your likes in this browser and a random visitor identifier to prevent duplicate likes and limit comment spam. This identifier is not used for advertising. You can request removal of your comments through our [contact page](/contact).\n'
where slug = 'privacy-policy' and content not like '%## Comments and likes%';

notify pgrst, 'reload schema';
