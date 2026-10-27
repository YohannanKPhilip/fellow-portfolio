-- Two more page backgrounds, "warmblack" and "chalkboard". Same rules as before otherwise; the
-- allowed list must match BACKGROUNDS in src/lib/theme.ts.
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
  if t ? 'background'
     and (t ->> 'background') not in ('auto', 'light', 'dark', 'warm', 'warmblack', 'chalkboard') then
    return false;
  end if;
  if t ? 'font' and (t ->> 'font') not in ('modern', 'friendly', 'classic') then
    return false;
  end if;
  return true;
end $$;
grant execute on function private.valid_theme(jsonb) to authenticated;
