-- Every new fellow starts with a page, whatever created the row: the hero followed by all their
-- resources (the layout the site has always had). The sign-up screen still sends the starter layout
-- the fellow picked; this fills the page in when nothing was sent.

create or replace function private.default_page(first_name text) returns jsonb
language sql immutable set search_path = '' as $$
  select jsonb_build_object(
    'v', 1,
    'sections', jsonb_build_array(
      jsonb_build_object(
        'id', 'hero',
        'type', 'hero',
        'blocks', jsonb_build_array(
          jsonb_build_object(
            'type', 'headline',
            'runs', jsonb_build_array(
              jsonb_build_object('t', 'Hi, I''m '),
              jsonb_build_object('photo', true),
              jsonb_build_object('t', ' ' || left(trim(first_name), 60) || '!')
            )
          )
        )
      ),
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
$$;
grant execute on function private.default_page(text) to authenticated;

create or replace function private.fill_default_page() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.page is null then
    new.page := private.default_page(new.first_name);
  end if;
  return new;
end $$;

create trigger fellows_default_page
  before insert on public.fellows
  for each row execute function private.fill_default_page();

-- Any page that has none yet gets the default, then a page is required from now on.
update public.fellows set page = private.default_page(first_name) where page is null;
alter table public.fellows alter column page set not null;
