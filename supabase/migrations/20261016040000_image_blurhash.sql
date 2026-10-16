-- Blurhash for uploaded pictures: a ~30 character string the browser draws as a blurred stand-in
-- while the real picture loads. Made in the browser at upload time and stored next to the picture's
-- path. Only uploaded pictures have one; outside links leave it empty.

-- A blurhash is made of the base 83 characters below. 6 characters is the shortest possible one and
-- 166 the longest (9 x 9 components); the site makes ones of up to 36.
create or replace function private.valid_blurhash(h text) returns boolean
language sql immutable set search_path = '' as $fn$
  select h is null
      or (length(h) between 6 and 166 and h ~ '^[]0-9A-Za-z#$%*+,.:;=?@[^_{|}~-]+$');
$fn$;
grant execute on function private.valid_blurhash(text) to authenticated;

alter table public.fellows
  add column photo_blurhash text check (private.valid_blurhash(photo_blurhash));

alter table public.resources
  add column cover_blurhash text check (private.valid_blurhash(cover_blurhash));

-- A classroom photo also keeps its shape (width / height), so its space is held while it loads.
alter table public.resource_media
  add column blurhash text check (private.valid_blurhash(blurhash)),
  add column ratio real check (ratio is null or ratio between 0.1 and 10);
