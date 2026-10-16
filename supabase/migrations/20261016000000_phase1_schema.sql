-- Fellow Portfolio, Phase 1: tables, sign-up trigger, Row Level Security, Storage.
-- Design: docs/SUPABASE-PLAN.md. Build notes and approved changes: docs/BUILD-PLAN.md.
-- Tests for everything here: supabase/tests/phase1_roles.sql.

-- Private schema --------------------------------------------------------
-- Helper functions live here so the website API (which only exposes
-- "public") can never call them directly.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

-- Timestamps --------------------------------------------------------------
create or replace function private.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end $$;

create or replace function private.set_published_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.status = 'published' and new.published_at is null then
    new.published_at = now();
  end if;
  return new;
end $$;

-- Users: one row per confirmed account -----------------------------------
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique check (email = lower(email)),
  role text not null default 'fellow' check (role in ('fellow', 'admin')),
  created_at timestamptz not null default now()
);

-- Copies a confirmed account into public.users. Runs as the table owner
-- because the person signing in has no rights on public.users.
-- Fires on the first verification (and on an email change, which updates the
-- row). Ordinary later logins only touch last_sign_in_at, so it never fires.
-- Any error is turned into a warning: an error here would block sign-in.
create or replace function private.handle_confirmed_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.email_confirmed_at is not null and new.email is not null then
    insert into public.users (id, email)
    values (new.id, lower(new.email))
    on conflict (id) do update set email = excluded.email;
  end if;
  return new;
exception when others then
  raise warning 'handle_confirmed_user failed for %: %', new.id, sqlerrm;
  return new;
end $$;
revoke all on function private.handle_confirmed_user() from public, anon, authenticated;

-- Account created already confirmed (for example, from the dashboard).
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_confirmed_user();

-- First verification of the magic link, or a changed email.
create trigger on_auth_user_confirmed
  after update of email_confirmed_at, email on auth.users
  for each row
  when (new.email_confirmed_at is not null
        and (old.email_confirmed_at is null or old.email is distinct from new.email))
  execute function private.handle_confirmed_user();

create or replace function private.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.users
    where id = (select auth.uid()) and role = 'admin'
  );
$$;
revoke all on function private.is_admin() from public, anon;
grant execute on function private.is_admin() to authenticated;

-- Tags: at most 8, each 1 to 40 characters.
create or replace function private.valid_tags(tags text[]) returns boolean
language sql immutable set search_path = '' as $$
  select cardinality(tags) <= 8
     and coalesce((select bool_and(length(t) between 1 and 40) from unnest(tags) t), true);
$$;
grant execute on function private.valid_tags(text[]) to authenticated;

-- An image is an outside https link or a path in our Storage bucket
-- ("<user id>/...").
create or replace function private.valid_image_ref(ref text) returns boolean
language sql immutable set search_path = '' as $$
  select ref is null
      or ref ~ '^https://'
      or ref ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[A-Za-z0-9._/-]+$';
$$;
grant execute on function private.valid_image_ref(text) to authenticated;

-- Fellows: the public page, at most one per user --------------------------
create table public.fellows (
  user_id uuid primary key default auth.uid() references public.users (id) on delete cascade,
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) between 3 and 40)
    check (slug not in ('me', 'login', 'auth', 'r', 'admin', 'about', 'api', 'setup', 'assets', '404')),
  -- Hidden until the fellow presses "Publish my page".
  status text not null default 'draft' check (status in ('draft', 'published')),
  name text not null check (length(name) between 1 and 80),
  first_name text not null check (length(first_name) between 1 and 40),
  headline_role text check (length(headline_role) <= 120),
  headline_highlight text check (length(headline_highlight) <= 120),
  status_text text check (length(status_text) <= 120),
  intro text check (length(intro) <= 600),
  school text check (length(school) <= 120),
  city text check (length(city) <= 80),
  cohort text check (length(cohort) <= 40),
  photo_path text check (private.valid_image_ref(photo_path)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Resources --------------------------------------------------------------
create table public.resources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.fellows (user_id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 80),
  status text not null default 'draft' check (status in ('draft', 'published')),
  title text not null check (length(title) between 1 and 120),
  subject text check (length(subject) <= 40),
  grade text check (length(grade) <= 40),
  length text check (length(length) <= 40),
  tags text[] not null default '{}' check (private.valid_tags(tags)),
  cover_path text check (private.valid_image_ref(cover_path)),
  -- The fellow ticked "I have consent for any students who can be identified".
  cover_consent_confirmed boolean not null default false,
  summary text check (length(summary) <= 300),
  description text check (length(description) <= 5000),
  drive_link text check (drive_link is null or drive_link ~ '^https://'),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, slug),
  check (cover_path is null or cover_consent_confirmed)
);

create table public.resource_files (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources (id) on delete cascade,
  position int not null default 0,
  file_name text not null check (length(file_name) between 1 and 200),
  file_link text check (file_link is null or file_link ~ '^https://')
);

create table public.resource_media (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources (id) on delete cascade,
  position int not null default 0,
  url text not null check (url is not null and private.valid_image_ref(url)),
  caption text check (length(caption) <= 300),
  type_hint text check (type_hint in ('image', 'video') or type_hint is null),
  -- Required: no students' faces or names without consent.
  consent_confirmed boolean not null default false check (consent_confirmed)
);

-- Indexes (fellows.slug and resources (user_id, slug) are indexed by their unique constraints)
create index resources_listing_idx on public.resources (user_id, status, published_at desc);
create index resource_files_order_idx on public.resource_files (resource_id, position);
create index resource_media_order_idx on public.resource_media (resource_id, position);

-- Triggers ---------------------------------------------------------------
create trigger fellows_updated before update on public.fellows
  for each row execute function private.set_updated_at();
create trigger resources_updated before update on public.resources
  for each row execute function private.set_updated_at();
create trigger resources_published before insert or update on public.resources
  for each row execute function private.set_published_at();

-- Admin take-down: an admin may change only the status of someone else's
-- page or resource, never its content or owner.
create or replace function private.guard_admin_edit() returns trigger
language plpgsql set search_path = '' as $$
declare
  ignored text[] := array['status', 'updated_at', 'published_at'];
begin
  if current_user = 'authenticated'
     and (select auth.uid()) is distinct from old.user_id
     and (to_jsonb(new) - ignored) is distinct from (to_jsonb(old) - ignored) then
    raise exception 'Only the owner can change this. An admin can only publish or unpublish it.'
      using errcode = '42501';
  end if;
  return new;
end $$;

create trigger fellows_guard_admin before update on public.fellows
  for each row execute function private.guard_admin_edit();
create trigger resources_guard_admin before update on public.resources
  for each row execute function private.guard_admin_edit();

-- Table privileges -------------------------------------------------------
-- Start from nothing, then grant only what the policies below need.
revoke all on public.users, public.fellows, public.resources,
  public.resource_files, public.resource_media from anon, authenticated;

grant select on public.fellows, public.resources,
  public.resource_files, public.resource_media to anon;
grant select on public.users to authenticated;
grant select, insert, update, delete on public.fellows, public.resources,
  public.resource_files, public.resource_media to authenticated;

-- Row Level Security -----------------------------------------------------
alter table public.users enable row level security;
alter table public.fellows enable row level security;
alter table public.resources enable row level security;
alter table public.resource_files enable row level security;
alter table public.resource_media enable row level security;

-- users: read your own account (admin reads all). Only the trigger writes.
create policy "users: read own, admin all" on public.users
  for select to authenticated
  using (id = (select auth.uid()) or (select private.is_admin()));

-- fellows
create policy "fellows: visitors read published" on public.fellows
  for select to anon
  using (status = 'published');
create policy "fellows: read published, own, admin all" on public.fellows
  for select to authenticated
  using (status = 'published' or user_id = (select auth.uid()) or (select private.is_admin()));
create policy "fellows: create own" on public.fellows
  for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "fellows: owner edits, admin changes status" on public.fellows
  for update to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()))
  with check (user_id = (select auth.uid()) or (select private.is_admin()));
create policy "fellows: owner or admin deletes" on public.fellows
  for delete to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()));

-- resources: public only when both the resource and the fellow's page are published.
create policy "resources: visitors read published" on public.resources
  for select to anon
  using (
    status = 'published'
    and exists (select 1 from public.fellows f
                where f.user_id = resources.user_id and f.status = 'published')
  );
create policy "resources: read published, own, admin all" on public.resources
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or (select private.is_admin())
    or (status = 'published'
        and exists (select 1 from public.fellows f
                    where f.user_id = resources.user_id and f.status = 'published'))
  );
create policy "resources: create own" on public.resources
  for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "resources: owner edits, admin changes status" on public.resources
  for update to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()))
  with check (user_id = (select auth.uid()) or (select private.is_admin()));
create policy "resources: owner or admin deletes" on public.resources
  for delete to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()));

-- resource_files and resource_media: readable when the parent resource is
-- readable (the inner query is itself filtered by the resources policies);
-- writable when the parent resource is yours.
create policy "files: visitors read with resource" on public.resource_files
  for select to anon
  using (exists (select 1 from public.resources r where r.id = resource_id));
create policy "files: read with resource" on public.resource_files
  for select to authenticated
  using (exists (select 1 from public.resources r where r.id = resource_id));
create policy "files: owner adds" on public.resource_files
  for insert to authenticated
  with check (exists (select 1 from public.resources r
                      where r.id = resource_id and r.user_id = (select auth.uid())));
create policy "files: owner edits" on public.resource_files
  for update to authenticated
  using (exists (select 1 from public.resources r
                 where r.id = resource_id and r.user_id = (select auth.uid())))
  with check (exists (select 1 from public.resources r
                      where r.id = resource_id and r.user_id = (select auth.uid())));
create policy "files: owner or admin deletes" on public.resource_files
  for delete to authenticated
  using ((select private.is_admin())
         or exists (select 1 from public.resources r
                    where r.id = resource_id and r.user_id = (select auth.uid())));

create policy "media: visitors read with resource" on public.resource_media
  for select to anon
  using (exists (select 1 from public.resources r where r.id = resource_id));
create policy "media: read with resource" on public.resource_media
  for select to authenticated
  using (exists (select 1 from public.resources r where r.id = resource_id));
create policy "media: owner adds" on public.resource_media
  for insert to authenticated
  with check (exists (select 1 from public.resources r
                      where r.id = resource_id and r.user_id = (select auth.uid())));
create policy "media: owner edits" on public.resource_media
  for update to authenticated
  using (exists (select 1 from public.resources r
                 where r.id = resource_id and r.user_id = (select auth.uid())))
  with check (exists (select 1 from public.resources r
                      where r.id = resource_id and r.user_id = (select auth.uid())));
create policy "media: owner or admin deletes" on public.resource_media
  for delete to authenticated
  using ((select private.is_admin())
         or exists (select 1 from public.resources r
                    where r.id = resource_id and r.user_id = (select auth.uid())));

-- Storage ---------------------------------------------------------------
-- Public bucket: anyone with an image's address can view it. Each fellow
-- writes only inside their own folder, "<user id>/...". There is no policy
-- for visitors, so nobody can list the bucket.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('portfolio', 'portfolio', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']);

-- Replacing a file (upsert) needs select as well as insert and update.
create policy "portfolio: read own folder" on storage.objects
  for select to authenticated
  using (bucket_id = 'portfolio' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "portfolio: upload to own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'portfolio' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "portfolio: replace in own folder" on storage.objects
  for update to authenticated
  using (bucket_id = 'portfolio' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'portfolio' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "portfolio: delete from own folder" on storage.objects
  for delete to authenticated
  using (bucket_id = 'portfolio' and (storage.foldername(name))[1] = (select auth.uid())::text);
