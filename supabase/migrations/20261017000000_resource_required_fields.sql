-- A resource needs a title, a subject and a resource link, drafts included, matching the editor.
-- Grade is optional, but when given it is a number or a range of numbers: "5" or "5-7".

-- Older rows wrote the grade as "Grade 5". Keep the number; anything else that isn't a number
-- or a range is cleared rather than blocking the new rule.
update public.resources
set grade = regexp_replace(btrim(grade), '^grade\s*', '', 'i')
where grade ~* '^\s*grade\s*[0-9]';
update public.resources
set grade = regexp_replace(grade, '\s*[-–]\s*', '-')
where grade ~ '^[0-9]{1,2}\s*[-–]\s*[0-9]{1,2}$';
update public.resources
set grade = null
where grade is not null and grade !~ '^[0-9]{1,2}(-[0-9]{1,2})?$';

alter table public.resources
  drop constraint resources_title_check,
  add constraint resources_title_check check (length(btrim(title)) between 1 and 120),
  drop constraint resources_subject_check,
  alter column subject set not null,
  add constraint resources_subject_check check (length(btrim(subject)) between 1 and 40),
  drop constraint resources_drive_link_check,
  alter column drive_link set not null,
  add constraint resources_drive_link_check check (drive_link ~ '^https://[^[:space:]]+$'),
  drop constraint resources_grade_check,
  add constraint resources_grade_check check (grade is null or grade ~ '^[0-9]{1,2}(-[0-9]{1,2})?$');
