-- A second kind of section for a fellow's page: a list of links (see docs/PAGE-BUILDER-PLAN.md).
--
--   section = ...hero... | ...resources...
--           | { "id": "...", "type": "links",
--               "title": [ { "t": "text", "c": "accent" }, ... ],     optional, up to 8 pieces
--               "items": [ { "label": "Fraction videos", "url": "https://..." }, ... ] }   up to 12
--
-- label: 1 to 60 characters. url: an https:// address, no spaces, up to 500 characters.
-- Only these fields are accepted, so no HTML or script can be stored.

-- A section heading: up to 8 pieces of text, each with an optional palette color.
-- (The same check the resources section used inline, now shared.)
create or replace function private.valid_title(t jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare r jsonb;
begin
  if coalesce(jsonb_typeof(t), '') <> 'array' or jsonb_array_length(t) > 8 then return false; end if;
  for r in select * from jsonb_array_elements(t) loop
    if jsonb_typeof(r) <> 'object' then return false; end if;
    if exists (select 1 from jsonb_object_keys(r) k where k not in ('t', 'c')) then return false; end if;
    if not private.is_text(r -> 't', 1, 120) then return false; end if;
    if r ? 'c' and (r ->> 'c') not in ('muted', 'accent', 'blue', 'green', 'pink', 'purple', 'teal') then
      return false;
    end if;
  end loop;
  return true;
end $$;
grant execute on function private.valid_title(jsonb) to authenticated;

-- The items of a links section.
create or replace function private.valid_links(items jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare i jsonb;
begin
  if coalesce(jsonb_typeof(items), '') <> 'array' or jsonb_array_length(items) > 12 then return false; end if;
  for i in select * from jsonb_array_elements(items) loop
    if jsonb_typeof(i) <> 'object' then return false; end if;
    if exists (select 1 from jsonb_object_keys(i) k where k not in ('label', 'url')) then return false; end if;
    if not private.is_text(i -> 'label', 1, 60) then return false; end if;
    if not private.is_text(i -> 'url', 9, 500) or (i ->> 'url') !~ '^https://[^[:space:]]+$' then
      return false;
    end if;
  end loop;
  return true;
end $$;
grant execute on function private.valid_links(jsonb) to authenticated;

create or replace function private.valid_page(p jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare
  s jsonb;
  t text;
  ids text[] := '{}';
  heroes int := 0;
begin
  if p is null then return true; end if;
  if jsonb_typeof(p) <> 'object' or length(p::text) > 30000 then return false; end if;
  if exists (select 1 from jsonb_object_keys(p) k where k not in ('v', 'sections')) then return false; end if;
  if p -> 'v' is distinct from '1'::jsonb then return false; end if;
  if coalesce(jsonb_typeof(p -> 'sections'), '') <> 'array' then return false; end if;
  if jsonb_array_length(p -> 'sections') not between 1 and 20 then return false; end if;

  for s in select * from jsonb_array_elements(p -> 'sections') loop
    if jsonb_typeof(s) <> 'object' then return false; end if;
    if not private.is_text(s -> 'id', 1, 64) then return false; end if;
    if (s ->> 'id') = any (ids) then return false; end if;
    ids := ids || (s ->> 'id');
    t := s ->> 'type';

    if t = 'hero' then
      heroes := heroes + 1;
      if exists (select 1 from jsonb_object_keys(s) k where k not in ('id', 'type', 'blocks')) then return false; end if;
      if s -> 'blocks' is null or not private.valid_hero(jsonb_build_object('v', 1, 'blocks', s -> 'blocks')) then
        return false;
      end if;

    elsif t = 'resources' then
      if exists (
        select 1 from jsonb_object_keys(s) k
        where k not in ('id', 'type', 'title', 'subtitle', 'filter', 'showFilters', 'sort', 'limit')
      ) then return false; end if;

      if s ? 'title' and not private.valid_title(s -> 'title') then return false; end if;

      if s ? 'subtitle' and not private.is_text(s -> 'subtitle', 0, 300) then return false; end if;

      if s ? 'filter' then
        if jsonb_typeof(s -> 'filter') <> 'object' then return false; end if;
        if exists (select 1 from jsonb_object_keys(s -> 'filter') k where k not in ('subjects', 'tags')) then
          return false;
        end if;
        if (s -> 'filter') ? 'subjects' and not private.valid_string_list(s -> 'filter' -> 'subjects', 10) then
          return false;
        end if;
        if (s -> 'filter') ? 'tags' and not private.valid_string_list(s -> 'filter' -> 'tags', 10) then
          return false;
        end if;
      end if;

      if s ? 'showFilters' and jsonb_typeof(s -> 'showFilters') <> 'boolean' then return false; end if;
      if s ? 'sort' and not coalesce((s ->> 'sort') = any (array['oldest', 'newest']), false) then
        return false;
      end if;
      if s ? 'limit' and jsonb_typeof(s -> 'limit') <> 'null' then
        if jsonb_typeof(s -> 'limit') <> 'number' or (s ->> 'limit') !~ '^[0-9]+$'
           or (s ->> 'limit')::int not between 1 and 100 then
          return false;
        end if;
      end if;

    elsif t = 'links' then
      if exists (select 1 from jsonb_object_keys(s) k where k not in ('id', 'type', 'title', 'items')) then
        return false;
      end if;
      if s ? 'title' and not private.valid_title(s -> 'title') then return false; end if;
      if not private.valid_links(s -> 'items') then return false; end if;

    else
      return false;
    end if;
  end loop;

  return heroes <= 1;
end $$;
