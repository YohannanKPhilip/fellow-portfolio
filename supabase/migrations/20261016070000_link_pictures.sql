-- A link can have a picture (see docs/PAGE-BUILDER-PLAN.md).
--
--   link = { "label": "...", "url": "https://...",
--            "image": "<user id>/links/<name>.webp",     optional: the fellow's own uploaded picture
--            "blurhash": "...",                           optional: the blurred stand-in
--            "consent": true }                            required whenever there is an image
--
-- Rules, as for covers and classroom photos: a picture needs the consent confirmation, it must live
-- in the fellow's own storage folder, and nothing else can be stored.

create or replace function private.valid_links(items jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare i jsonb;
begin
  if coalesce(jsonb_typeof(items), '') <> 'array' or jsonb_array_length(items) > 12 then return false; end if;
  for i in select * from jsonb_array_elements(items) loop
    if jsonb_typeof(i) <> 'object' then return false; end if;
    if exists (
      select 1 from jsonb_object_keys(i) k where k not in ('label', 'url', 'image', 'blurhash', 'consent')
    ) then return false; end if;
    if not private.is_text(i -> 'label', 1, 60) then return false; end if;
    if not private.is_text(i -> 'url', 9, 500) or (i ->> 'url') !~ '^https://[^[:space:]]+$' then
      return false;
    end if;

    if i ? 'image' then
      if not private.is_text(i -> 'image', 1, 200)
         or (i ->> 'image') !~ '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}/links/[A-Za-z0-9._-]+$' then
        return false;
      end if;
      if i -> 'consent' is distinct from 'true'::jsonb then return false; end if;
      if i ? 'blurhash' and not (
        private.is_text(i -> 'blurhash', 6, 166) and private.valid_blurhash(i ->> 'blurhash')
      ) then return false; end if;
    elsif i ? 'blurhash' or i ? 'consent' then
      return false;
    end if;
  end loop;
  return true;
end $$;

-- True when every link picture on the page is in the page owner's own storage folder.
create or replace function private.page_images_owned(p jsonb, owner uuid) returns boolean
language sql immutable set search_path = '' as $$
  select coalesce(jsonb_typeof(p -> 'sections'), '') <> 'array'
      or not exists (
        select 1
        from jsonb_array_elements(p -> 'sections') s,
             jsonb_array_elements(
               case when jsonb_typeof(s -> 'items') = 'array' then s -> 'items' else '[]'::jsonb end
             ) i
        where i ? 'image' and split_part(i ->> 'image', '/', 1) <> owner::text
      );
$$;
grant execute on function private.page_images_owned(jsonb, uuid) to authenticated;

alter table public.fellows
  add constraint fellows_page_images_own check (private.page_images_owned(page, user_id));
