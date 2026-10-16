-- The top of a fellow's page becomes one editable document ("hero") instead of fixed columns,
-- and the page gets a small "theme" (accent color, background, headline font).
--
-- hero = { "v": 1, "blocks": [ block, ... ] }
--   block = { "type": "headline", "size": "s"|"m"|"l", "runs": [run, ...] }   a big line
--         | { "type": "text", "runs": [run, ...] }                           a paragraph (the old "intro")
--   run   = { "t": "text", "c": "muted"|"accent"|"blue"|"green"|"pink"|"purple"|"teal" }  (c optional)
--         | { "photo": true }                       the fellow's photo, inline (headline blocks only, once)
--         | { "pill": "Teaching in Bengaluru" }     the status pill (once)
-- Fellows pick from fixed colors and sizes; they never write HTML or CSS, so a page can't carry
-- anything the site doesn't draw itself.

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
  if h -> 'v' is distinct from '1'::jsonb or jsonb_typeof(h -> 'blocks') <> 'array' then return false; end if;
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
    if jsonb_typeof(b -> 'runs') <> 'array' or jsonb_array_length(b -> 'runs') not between 1 and 16 then
      return false;
    end if;

    for r in select * from jsonb_array_elements(b -> 'runs') loop
      if jsonb_typeof(r) <> 'object' then return false; end if;
      if r ? 't' then
        if exists (select 1 from jsonb_object_keys(r) k where k not in ('t', 'c')) then return false; end if;
        if jsonb_typeof(r -> 't') <> 'string' or length(r ->> 't') not between 1 and 700 then return false; end if;
        if r ? 'c' and (r ->> 'c') not in ('muted', 'accent', 'blue', 'green', 'pink', 'purple', 'teal') then
          return false;
        end if;
        chars := chars + length(r ->> 't');
      elsif r ? 'photo' then
        if r <> '{"photo": true}'::jsonb or b ->> 'type' <> 'headline' then return false; end if;
        photos := photos + 1;
      elsif r ? 'pill' then
        if (select count(*) from jsonb_object_keys(r)) <> 1 then return false; end if;
        if jsonb_typeof(r -> 'pill') <> 'string' or length(r ->> 'pill') not between 1 and 80 then return false; end if;
        pills := pills + 1;
        chars := chars + length(r ->> 'pill');
      else
        return false;
      end if;
    end loop;
  end loop;

  return heads <= 6 and texts <= 4 and photos <= 1 and pills <= 1 and chars <= 2000;
end $$;
grant execute on function private.valid_hero(jsonb) to authenticated;

create or replace function private.valid_theme(t jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
begin
  if t is null then return false; end if;
  if jsonb_typeof(t) <> 'object' or length(t::text) > 300 then return false; end if;
  if exists (select 1 from jsonb_object_keys(t) k where k not in ('accent', 'background', 'font')) then
    return false;
  end if;
  if t ? 'accent' and (t ->> 'accent') not in ('orange', 'blue', 'green', 'pink', 'purple', 'teal') then
    return false;
  end if;
  if t ? 'background' and (t ->> 'background') not in ('auto', 'light', 'dark', 'warm') then
    return false;
  end if;
  if t ? 'font' and (t ->> 'font') not in ('modern', 'friendly', 'classic') then
    return false;
  end if;
  return true;
end $$;
grant execute on function private.valid_theme(jsonb) to authenticated;

alter table public.fellows
  add column hero jsonb,
  add column theme jsonb not null default '{}'::jsonb;

-- Turn each existing page into a hero document that renders exactly as it does today:
--   Hi, I'm [photo] <first name>!  /  I'm a <role> &  /  <highlight>. (pill)  /  intro paragraph
update public.fellows f set hero = jsonb_build_object(
  'v', 1,
  'blocks',
  jsonb_build_array(jsonb_build_object('type', 'headline', 'runs', jsonb_build_array(
    jsonb_build_object('t', 'Hi, I''m '),
    jsonb_build_object('photo', true),
    jsonb_build_object('t', ' ' || f.first_name || '!')
  )))
  || case when coalesce(f.headline_role, '') <> '' then
       jsonb_build_array(jsonb_build_object('type', 'headline', 'runs',
         jsonb_build_array(
           jsonb_build_object('t', 'I''m a', 'c', 'muted'),
           jsonb_build_object('t', ' ' || f.headline_role)
         ) || case when coalesce(f.headline_highlight, '') <> ''
                then jsonb_build_array(jsonb_build_object('t', ' &', 'c', 'muted'))
                else '[]'::jsonb end))
     else '[]'::jsonb end
  || case when coalesce(f.headline_highlight, '') <> '' then
       jsonb_build_array(jsonb_build_object('type', 'headline', 'runs',
         jsonb_build_array(jsonb_build_object('t', f.headline_highlight || '.', 'c', 'accent'))
         || case when coalesce(f.status_text, '') <> ''
                then jsonb_build_array(jsonb_build_object('pill', f.status_text))
                else '[]'::jsonb end))
     else '[]'::jsonb end
  || case when coalesce(f.intro, '') <> '' then
       jsonb_build_array(jsonb_build_object('type', 'text', 'runs',
         jsonb_build_array(jsonb_build_object('t', f.intro))))
     else '[]'::jsonb end
);

alter table public.fellows
  add constraint fellows_hero_valid check (private.valid_hero(hero)),
  add constraint fellows_theme_valid check (private.valid_theme(theme));

alter table public.fellows
  drop column headline_role,
  drop column headline_highlight,
  drop column status_text,
  drop column intro;
