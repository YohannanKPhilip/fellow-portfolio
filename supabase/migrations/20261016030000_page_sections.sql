-- A fellow's page becomes an ordered list of sections (see docs/PAGE-BUILDER-PLAN.md).
--
-- page = { "v": 1, "sections": [ section, ... ] }          1 to 20 sections, unique ids
--   section = { "id": "...", "type": "hero", "blocks": [ ...hero blocks... ] }   at most one hero
--           | { "id": "...", "type": "resources",
--               "title": [ { "t": "text", "c": "accent" }, ... ],          optional, up to 8 pieces
--               "subtitle": "text",                                         optional
--               "filter": { "subjects": ["Maths"], "tags": ["NCERT"] },     optional
--               "showFilters": true, "sort": "oldest" | "newest", "limit": 6 }
-- Only these fields and fixed colors are accepted: no HTML or CSS can be stored.

-- Null-safe text check: true only for a JSON string whose length is between lo and hi.
create or replace function private.is_text(j jsonb, lo int, hi int) returns boolean
language sql immutable set search_path = '' as $$
  select coalesce(jsonb_typeof(j) = 'string' and length(j #>> '{}') between lo and hi, false);
$$;
grant execute on function private.is_text(jsonb, int, int) to authenticated;

-- The hero blocks check, now also refusing a document with no blocks or a block with no runs
-- (missing keys used to slip through because NULL comparisons are not "true").
create or replace function private.valid_hero(h jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare
  b jsonb;
  r jsonb;
  heads int := 0;
  texts int := 0;
  photos int := 0;
  pills int := 0;
  chars int := 0;
begin
  if h is null then return true; end if;
  if jsonb_typeof(h) <> 'object' or length(h::text) > 12000 then return false; end if;
  if exists (select 1 from jsonb_object_keys(h) k where k not in ('v', 'blocks')) then return false; end if;
  if h -> 'v' is distinct from '1'::jsonb then return false; end if;
  if coalesce(jsonb_typeof(h -> 'blocks'), '') <> 'array' then return false; end if;
  if jsonb_array_length(h -> 'blocks') not between 1 and 10 then return false; end if;

  for b in select * from jsonb_array_elements(h -> 'blocks') loop
    if jsonb_typeof(b) <> 'object' then return false; end if;
    if exists (select 1 from jsonb_object_keys(b) k where k not in ('type', 'size', 'runs')) then return false; end if;
    if b ->> 'type' = 'headline' then
      heads := heads + 1;
      if b ? 'size' and (b ->> 'size') not in ('s', 'm', 'l') then return false; end if;
    elsif b ->> 'type' = 'text' then
      texts := texts + 1;
      if b ? 'size' then return false; end if;
    else
      return false;
    end if;
    if coalesce(jsonb_typeof(b -> 'runs'), '') <> 'array' then return false; end if;
    if jsonb_array_length(b -> 'runs') not between 1 and 16 then return false; end if;

    for r in select * from jsonb_array_elements(b -> 'runs') loop
      if jsonb_typeof(r) <> 'object' then return false; end if;
      if r ? 't' then
        if exists (select 1 from jsonb_object_keys(r) k where k not in ('t', 'c')) then return false; end if;
        if not private.is_text(r -> 't', 1, 700) then return false; end if;
        if r ? 'c' and (r ->> 'c') not in ('muted', 'accent', 'blue', 'green', 'pink', 'purple', 'teal') then
          return false;
        end if;
        chars := chars + length(r ->> 't');
      elsif r ? 'photo' then
        if r <> '{"photo": true}'::jsonb or b ->> 'type' <> 'headline' then return false; end if;
        photos := photos + 1;
      elsif r ? 'pill' then
        if (select count(*) from jsonb_object_keys(r)) <> 1 then return false; end if;
        if not private.is_text(r -> 'pill', 1, 80) then return false; end if;
        pills := pills + 1;
        chars := chars + length(r ->> 'pill');
      else
        return false;
      end if;
    end loop;
  end loop;

  return heads <= 6 and texts <= 4 and photos <= 1 and pills <= 1 and chars <= 2000;
end $$;

-- A list of up to `maxn` strings, each 1 to 40 characters.
create or replace function private.valid_string_list(j jsonb, maxn int) returns boolean
language plpgsql immutable set search_path = '' as $$
declare e jsonb;
begin
  if coalesce(jsonb_typeof(j), '') <> 'array' or jsonb_array_length(j) > maxn then return false; end if;
  for e in select * from jsonb_array_elements(j) loop
    if not private.is_text(e, 1, 40) then return false; end if;
  end loop;
  return true;
end $$;

create or replace function private.valid_page(p jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare
  s jsonb;
  r jsonb;
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

      if s ? 'title' then
        if coalesce(jsonb_typeof(s -> 'title'), '') <> 'array' or jsonb_array_length(s -> 'title') > 8 then
          return false;
        end if;
        for r in select * from jsonb_array_elements(s -> 'title') loop
          if jsonb_typeof(r) <> 'object' then return false; end if;
          if exists (select 1 from jsonb_object_keys(r) k where k not in ('t', 'c')) then return false; end if;
          if not private.is_text(r -> 't', 1, 120) then return false; end if;
          if r ? 'c' and (r ->> 'c') not in ('muted', 'accent', 'blue', 'green', 'pink', 'purple', 'teal') then
            return false;
          end if;
        end loop;
      end if;

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

    else
      return false;
    end if;
  end loop;

  return heroes <= 1;
end $$;
grant execute on function private.valid_string_list(jsonb, int) to authenticated;
grant execute on function private.valid_page(jsonb) to authenticated;

alter table public.fellows add column page jsonb;

-- Every existing page becomes [hero, all resources], which draws exactly what it draws today.
update public.fellows f set page = jsonb_build_object(
  'v', 1,
  'sections', jsonb_build_array(
    jsonb_build_object('id', 'hero', 'type', 'hero', 'blocks', coalesce(f.hero -> 'blocks',
      jsonb_build_array(jsonb_build_object('type', 'headline', 'runs', jsonb_build_array(
        jsonb_build_object('t', 'Hi, I''m '),
        jsonb_build_object('photo', true),
        jsonb_build_object('t', ' ' || f.first_name || '!')
      ))))),
    jsonb_build_object(
      'id', 'resources',
      'type', 'resources',
      'title', jsonb_build_array(
        jsonb_build_object('t', 'Resources '),
        jsonb_build_object('t', 'from my classroom.', 'c', 'muted')
      ),
      'subtitle', 'Lesson plans, worksheets and classroom systems. Free to use and adapt.',
      'filter', '{}'::jsonb,
      'showFilters', true,
      'sort', 'oldest'
    )
  )
);

alter table public.fellows add constraint fellows_page_valid check (private.valid_page(page));
alter table public.fellows drop constraint fellows_hero_valid;
alter table public.fellows drop column hero;
