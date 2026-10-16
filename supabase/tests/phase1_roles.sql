-- Phase 1 tests: the users trigger and who can do what.
-- Run the whole file at once (SQL editor or the Supabase connector).
-- Everything happens inside one transaction that is rolled back at the end,
-- so no test accounts or rows are left behind. Every row of the result
-- should have pass = true.

begin;

create temp table results (
  n bigserial primary key,
  area text, name text, expected text, actual text, pass boolean
);
grant insert, select on pg_temp.results to public;
grant usage on sequence pg_temp.results_n_seq to public;

-- Act as a visitor, a signed-in user (by id), or postgres again.
create function pg_temp.become(who text) returns void language plpgsql as $$
begin
  if who = 'postgres' then
    perform set_config('role', 'postgres', true);
    perform set_config('request.jwt.claims', '', true);
  elsif who = 'visitor' then
    perform set_config('request.jwt.claims', '{"role":"anon"}', true);
    perform set_config('role', 'anon', true);
  else
    perform set_config('request.jwt.claims',
      json_build_object('sub', who, 'role', 'authenticated')::text, true);
    perform set_config('role', 'authenticated', true);
  end if;
end $$;

-- Runs a write; returns "ok:<rows changed>" or "error:<code>".
create function pg_temp.try(q text) returns text language plpgsql as $$
declare n int;
begin
  execute q;
  get diagnostics n = row_count;
  return 'ok:' || n;
exception when others then
  return 'error:' || sqlstate;
end $$;

-- Counts the rows a query can see; returns the count or "error:<code>".
create function pg_temp.cnt(q text) returns text language plpgsql as $$
declare n int;
begin
  execute 'select count(*) from (' || q || ') s' into n;
  return n::text;
exception when others then
  return 'error:' || sqlstate;
end $$;

-- expected "refused" passes on an error or on 0 rows changed.
create function pg_temp.chk(area text, name text, expected text, actual text) returns void
language sql as $$
  insert into pg_temp.results (area, name, expected, actual, pass)
  values (area, name, expected, actual,
          actual = expected
          or (expected = 'error' and actual like 'error:%')
          or (expected = 'refused' and (actual like 'error:%' or actual = 'ok:0')));
$$;

do $do$
declare
  -- Test accounts
  u_new   text := 'dddddddd-0000-4000-8000-000000000004'; -- trigger test
  u_dash  text := 'eeeeeeee-0000-4000-8000-000000000005'; -- created already confirmed
  a       text := 'aaaaaaaa-0000-4000-8000-000000000001'; -- fellow A
  b       text := 'bbbbbbbb-0000-4000-8000-000000000002'; -- fellow B
  f       text := 'ffffffff-0000-4000-8000-000000000006'; -- fellow with a draft page
  adm     text := 'cccccccc-0000-4000-8000-000000000003'; -- admin
  -- Test resources
  ra_pub  text := '0000000a-0000-4000-8000-000000000001';
  ra_drf  text := '0000000a-0000-4000-8000-000000000002';
  rb_pub  text := '0000000b-0000-4000-8000-000000000001';
  rb_drf  text := '0000000b-0000-4000-8000-000000000002';
  rf_pub  text := '0000000f-0000-4000-8000-000000000001';
  test_fellows text := $$ select 1 from public.fellows where slug like 'test-fellow-%' $$;
  test_resources text := $$ select 1 from public.resources where slug like 'test-%' $$;
  users_before int;
begin
  ---------------------------------------------------------------- trigger
  select count(*) into users_before from public.users;

  insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values (u_new::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
          'Test.New@Example.com', '{}', '{}', now(), now());
  perform pg_temp.chk('trigger', 'unconfirmed sign-up creates no users row', '0',
    pg_temp.cnt(format('select 1 from public.users where id = %L', u_new)));

  update auth.users set email_confirmed_at = now(), last_sign_in_at = now() where id = u_new::uuid;
  perform pg_temp.chk('trigger', 'first verification creates exactly one row', '1',
    pg_temp.cnt(format('select 1 from public.users where id = %L', u_new)));
  perform pg_temp.chk('trigger', 'row id = auth id, email lowercase, role fellow', '1',
    pg_temp.cnt(format($$select 1 from public.users where id = %L
      and email = 'test.new@example.com' and role = 'fellow'$$, u_new)));

  update auth.users set last_sign_in_at = now() + interval '1 day' where id = u_new::uuid;
  update auth.users set last_sign_in_at = now() + interval '2 days' where id = u_new::uuid;
  update auth.users set last_sign_in_at = now() + interval '3 days', updated_at = now() where id = u_new::uuid;
  perform pg_temp.chk('trigger', 'three later logins add no rows', (users_before + 1)::text,
    pg_temp.cnt('select 1 from public.users'));

  update auth.users set email = 'test.changed@example.com' where id = u_new::uuid;
  perform pg_temp.chk('trigger', 'email change updates the row, adds none', '1',
    pg_temp.cnt(format($$select 1 from public.users where id = %L and email = 'test.changed@example.com'$$, u_new)));
  perform pg_temp.chk('trigger', 'still one row per account after email change', (users_before + 1)::text,
    pg_temp.cnt('select 1 from public.users'));

  insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values (u_dash::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
          'test.dashboard@example.com', now(), '{}', '{}', now(), now());
  perform pg_temp.chk('trigger', 'account created confirmed gets exactly one row', '1',
    pg_temp.cnt(format('select 1 from public.users where id = %L', u_dash)));

  ---------------------------------------------------------------- test data
  insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  select x.id::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
         x.email, now(), '{}', '{}', now(), now()
  from (values (a, 'test.a@example.com'), (b, 'test.b@example.com'),
               (f, 'test.f@example.com'), (adm, 'test.admin@example.com')) as x(id, email);
  update public.users set role = 'admin' where id = adm::uuid;
  perform pg_temp.chk('enum', 'role rejects a value outside the enum', 'error',
    pg_temp.try(format($$update public.users set role = 'superuser' where id = %L$$, a)));

  insert into public.fellows (user_id, slug, status, name, first_name) values
    (a::uuid, 'test-fellow-a', 'published', 'Test Fellow A', 'A'),
    (b::uuid, 'test-fellow-b', 'published', 'Test Fellow B', 'B'),
    (f::uuid, 'test-fellow-f', 'draft', 'Test Fellow F', 'F');
  insert into public.resources (id, user_id, slug, status, title) values
    (ra_pub::uuid, a::uuid, 'test-a-pub', 'published', 'A published'),
    (ra_drf::uuid, a::uuid, 'test-a-draft', 'draft', 'A draft'),
    (rb_pub::uuid, b::uuid, 'test-b-pub', 'published', 'B published'),
    (rb_drf::uuid, b::uuid, 'test-b-draft', 'draft', 'B draft'),
    (rf_pub::uuid, f::uuid, 'test-f-pub', 'published', 'F published, page draft');
  insert into public.resource_files (resource_id, position, file_name, file_link)
  select r::uuid, 1, 'Worksheet', 'https://drive.google.com/file/d/test'
  from unnest(array[ra_pub, ra_drf, rb_pub, rb_drf, rf_pub]) r;
  insert into public.resource_media (resource_id, position, url, consent_confirmed)
  select r::uuid, 1, 'https://www.youtube.com/watch?v=test', true
  from unnest(array[ra_pub, ra_drf, rb_pub, rb_drf, rf_pub]) r;
  insert into storage.objects (bucket_id, name) values ('portfolio', b || '/covers/test.webp');

  perform pg_temp.chk('data', 'published_at set on publish, empty on draft', '3',
    pg_temp.cnt($$select 1 from public.resources where slug like 'test-%'
      and (status = 'published') = (published_at is not null) and status = 'published'$$));

  ---------------------------------------------------------------- visitor
  perform pg_temp.become('visitor');
  perform pg_temp.chk('visitor', 'read users', 'error', pg_temp.cnt('select 1 from public.users'));
  perform pg_temp.chk('visitor', 'sees published pages only (A, B; not F)', '2', pg_temp.cnt(test_fellows));
  perform pg_temp.chk('visitor', 'sees published resources of published pages only', '2', pg_temp.cnt(test_resources));
  perform pg_temp.chk('visitor', 'read A draft resource', '0',
    pg_temp.cnt(format('select 1 from public.resources where id = %L', ra_drf)));
  perform pg_temp.chk('visitor', 'read published resource on a draft page', '0',
    pg_temp.cnt(format('select 1 from public.resources where id = %L', rf_pub)));
  perform pg_temp.chk('visitor', 'files of A published resource', '1',
    pg_temp.cnt(format('select 1 from public.resource_files where resource_id = %L', ra_pub)));
  perform pg_temp.chk('visitor', 'files of A draft resource', '0',
    pg_temp.cnt(format('select 1 from public.resource_files where resource_id = %L', ra_drf)));
  perform pg_temp.chk('visitor', 'media of A published resource', '1',
    pg_temp.cnt(format('select 1 from public.resource_media where resource_id = %L', ra_pub)));
  perform pg_temp.chk('visitor', 'media of A draft resource', '0',
    pg_temp.cnt(format('select 1 from public.resource_media where resource_id = %L', ra_drf)));
  perform pg_temp.chk('visitor', 'create a page', 'error',
    pg_temp.try(format($$insert into public.fellows (user_id, slug, name, first_name) values (%L, 'test-fellow-x', 'X', 'X')$$, a)));
  perform pg_temp.chk('visitor', 'edit a resource', 'refused',
    pg_temp.try(format($$update public.resources set title = 'hacked' where id = %L$$, ra_pub)));
  perform pg_temp.chk('visitor', 'delete a resource', 'refused',
    pg_temp.try(format('delete from public.resources where id = %L', ra_pub)));
  perform pg_temp.chk('visitor', 'add media', 'error',
    pg_temp.try(format($$insert into public.resource_media (resource_id, url, consent_confirmed) values (%L, 'https://x.test', true)$$, ra_pub)));
  perform pg_temp.chk('visitor', 'upload to storage', 'error',
    pg_temp.try(format($$insert into storage.objects (bucket_id, name) values ('portfolio', %L)$$, a || '/x.webp')));

  ---------------------------------------------------------------- fellow A
  perform pg_temp.become(a);
  perform pg_temp.chk('fellow A', 'reads only own users row', '1', pg_temp.cnt('select 1 from public.users'));
  perform pg_temp.chk('fellow A', 'makes self admin', 'error',
    pg_temp.try(format($$update public.users set role = 'admin' where id = %L$$, a)));
  perform pg_temp.chk('fellow A', 'inserts a users row', 'error',
    pg_temp.try($$insert into public.users (id, email) values (gen_random_uuid(), 'x@example.com')$$));
  perform pg_temp.chk('fellow A', 'deletes a users row', 'error',
    pg_temp.try(format('delete from public.users where id = %L', b)));
  perform pg_temp.chk('fellow A', 'reads own draft resource', '1',
    pg_temp.cnt(format('select 1 from public.resources where id = %L', ra_drf)));
  perform pg_temp.chk('fellow A', 'reads B draft resource', '0',
    pg_temp.cnt(format('select 1 from public.resources where id = %L', rb_drf)));
  perform pg_temp.chk('fellow A', 'reads files of B draft', '0',
    pg_temp.cnt(format('select 1 from public.resource_files where resource_id = %L', rb_drf)));
  perform pg_temp.chk('fellow A', 'reads media of B draft', '0',
    pg_temp.cnt(format('select 1 from public.resource_media where resource_id = %L', rb_drf)));
  perform pg_temp.chk('fellow A', 'reads F draft page', '0',
    pg_temp.cnt($$select 1 from public.fellows where slug = 'test-fellow-f'$$));
  perform pg_temp.chk('fellow A', 'reads B published resource', '1',
    pg_temp.cnt(format('select 1 from public.resources where id = %L', rb_pub)));
  perform pg_temp.chk('fellow A', 'edits own resource', 'ok:1',
    pg_temp.try(format($$update public.resources set title = 'A edited' where id = %L$$, ra_pub)));
  perform pg_temp.chk('fellow A', 'edits own page', 'ok:1',
    pg_temp.try(format($$update public.fellows set intro = 'Hello' where user_id = %L$$, a)));
  perform pg_temp.chk('fellow A', 'edits B resource', 'refused',
    pg_temp.try(format($$update public.resources set title = 'hacked' where id = %L$$, rb_pub)));
  perform pg_temp.chk('fellow A', 'unpublishes B resource', 'refused',
    pg_temp.try(format($$update public.resources set status = 'draft' where id = %L$$, rb_pub)));
  perform pg_temp.chk('fellow A', 'edits B page', 'refused',
    pg_temp.try(format($$update public.fellows set name = 'hacked' where user_id = %L$$, b)));
  perform pg_temp.chk('fellow A', 'deletes B resource', 'refused',
    pg_temp.try(format('delete from public.resources where id = %L', rb_pub)));
  perform pg_temp.chk('fellow A', 'deletes B file', 'refused',
    pg_temp.try(format('delete from public.resource_files where resource_id = %L', rb_pub)));
  perform pg_temp.chk('fellow A', 'creates a resource owned by B', 'error',
    pg_temp.try(format($$insert into public.resources (user_id, slug, title) values (%L, 'test-sneaky', 'x')$$, b)));
  perform pg_temp.chk('fellow A', 'moves own resource to B', 'error',
    pg_temp.try(format($$update public.resources set user_id = %L where id = %L$$, b, ra_pub)));
  perform pg_temp.chk('fellow A', 'adds a file to B resource', 'error',
    pg_temp.try(format($$insert into public.resource_files (resource_id, file_name) values (%L, 'x')$$, rb_pub)));
  perform pg_temp.chk('fellow A', 'adds media to B resource', 'error',
    pg_temp.try(format($$insert into public.resource_media (resource_id, url, consent_confirmed) values (%L, 'https://x.test', true)$$, rb_pub)));
  perform pg_temp.chk('fellow A', 'creates own resource (default owner)', 'ok:1',
    pg_temp.try($$insert into public.resources (slug, title) values ('test-a-new', 'New')$$));
  perform pg_temp.chk('fellow A', 'new resource starts as draft', '1',
    pg_temp.cnt($$select 1 from public.resources where slug = 'test-a-new' and status = 'draft' and published_at is null$$));
  perform pg_temp.chk('fellow A', 'adds media to own resource with consent', 'ok:1',
    pg_temp.try(format($$insert into public.resource_media (resource_id, url, consent_confirmed) values (%L, 'https://x.test/p.jpg', true)$$, ra_pub)));
  perform pg_temp.chk('fellow A', 'adds media without consent', 'error',
    pg_temp.try(format($$insert into public.resource_media (resource_id, url) values (%L, 'https://x.test/p.jpg')$$, ra_pub)));
  perform pg_temp.chk('fellow A', 'adds a cover without consent', 'error',
    pg_temp.try(format($$update public.resources set cover_path = 'https://x.test/c.jpg' where id = %L$$, ra_pub)));
  perform pg_temp.chk('fellow A', 'adds a cover with consent', 'ok:1',
    pg_temp.try(format($$update public.resources set cover_path = %L, cover_consent_confirmed = true where id = %L$$, a || '/covers/c.webp', ra_pub)));
  perform pg_temp.chk('fellow A', 'javascript: link as cover', 'error',
    pg_temp.try(format($$update public.resources set cover_path = 'javascript:alert(1)' where id = %L$$, ra_pub)));
  perform pg_temp.chk('fellow A', 'http (not https) Drive link', 'error',
    pg_temp.try(format($$update public.resources set drive_link = 'http://drive.google.com/x' where id = %L$$, ra_pub)));
  perform pg_temp.chk('fellow A', '9 tags', 'error',
    pg_temp.try(format($$update public.resources set tags = array['1','2','3','4','5','6','7','8','9'] where id = %L$$, ra_pub)));
  perform pg_temp.chk('fellow A', 'page address "setup"', 'error',
    pg_temp.try(format($$update public.fellows set slug = 'setup' where user_id = %L$$, a)));
  perform pg_temp.chk('fellow A', 'page address "assets"', 'error',
    pg_temp.try(format($$update public.fellows set slug = 'assets' where user_id = %L$$, a)));
  perform pg_temp.chk('fellow A', 'page address "Bad Slug"', 'error',
    pg_temp.try(format($$update public.fellows set slug = 'Bad Slug' where user_id = %L$$, a)));
  perform pg_temp.chk('fellow A', 'page address already taken by B', 'error',
    pg_temp.try(format($$update public.fellows set slug = 'test-fellow-b' where user_id = %L$$, a)));
  perform pg_temp.chk('fellow A', 'second page for self', 'error',
    pg_temp.try($$insert into public.fellows (slug, name, first_name) values ('test-fellow-a2', 'A2', 'A2')$$));
  perform pg_temp.chk('fellow A', 'uploads to own folder', 'ok:1',
    pg_temp.try(format($$insert into storage.objects (bucket_id, name) values ('portfolio', %L)$$, a || '/covers/mine.webp')));
  perform pg_temp.chk('fellow A', 'uploads to B folder', 'error',
    pg_temp.try(format($$insert into storage.objects (bucket_id, name) values ('portfolio', %L)$$, b || '/covers/sneaky.webp')));
  perform pg_temp.chk('fellow A', 'replaces a file in B folder', 'refused',
    pg_temp.try(format($$update storage.objects set name = %L where name = %L$$, b || '/covers/replaced.webp', b || '/covers/test.webp')));
  perform pg_temp.chk('fellow A', 'deletes a file in B folder', 'refused',
    pg_temp.try(format($$delete from storage.objects where name = %L$$, b || '/covers/test.webp')));
  perform pg_temp.chk('fellow A', 'lists B folder', '0',
    pg_temp.cnt(format($$select 1 from storage.objects where name like %L$$, b || '/%')));

  ---------------------------------------------------------------- fellow B
  perform pg_temp.become(b);
  perform pg_temp.chk('fellow B', 'reads only own users row', '1', pg_temp.cnt('select 1 from public.users'));
  perform pg_temp.chk('fellow B', 'reads A draft resource', '0',
    pg_temp.cnt(format('select 1 from public.resources where id = %L', ra_drf)));
  perform pg_temp.chk('fellow B', 'reads A new draft resource', '0',
    pg_temp.cnt($$select 1 from public.resources where slug = 'test-a-new'$$));
  perform pg_temp.chk('fellow B', 'edits A resource', 'refused',
    pg_temp.try(format($$update public.resources set title = 'hacked' where id = %L$$, ra_pub)));
  perform pg_temp.chk('fellow B', 'edits A file', 'refused',
    pg_temp.try(format($$update public.resource_files set file_name = 'hacked' where resource_id = %L$$, ra_pub)));
  perform pg_temp.chk('fellow B', 'deletes A media', 'refused',
    pg_temp.try(format('delete from public.resource_media where resource_id = %L', ra_pub)));
  perform pg_temp.chk('fellow B', 'unpublishes A page', 'refused',
    pg_temp.try(format($$update public.fellows set status = 'draft' where user_id = %L$$, a)));
  perform pg_temp.chk('fellow B', 'reads own draft resource', '1',
    pg_temp.cnt(format('select 1 from public.resources where id = %L', rb_drf)));

  ---------------------------------------------------------------- new user (setup)
  perform pg_temp.become(u_dash);
  perform pg_temp.chk('new user', 'has no page yet', '0',
    pg_temp.cnt(format('select 1 from public.fellows where user_id = %L', u_dash)));
  perform pg_temp.chk('new user', 'creates a page owned by A', 'error',
    pg_temp.try(format($$insert into public.fellows (user_id, slug, name, first_name) values (%L, 'test-fellow-x', 'X', 'X')$$, a)));
  perform pg_temp.chk('new user', 'sets up own page', 'ok:1',
    pg_temp.try($$insert into public.fellows (slug, name, first_name) values ('test-fellow-new', 'New Fellow', 'New')$$));
  perform pg_temp.chk('new user', 'new page starts as draft', '1',
    pg_temp.cnt($$select 1 from public.fellows where slug = 'test-fellow-new' and status = 'draft'$$));
  perform pg_temp.become('visitor');
  perform pg_temp.chk('new user', 'visitors cannot see the draft page', '0',
    pg_temp.cnt($$select 1 from public.fellows where slug = 'test-fellow-new'$$));
  perform pg_temp.become(u_dash);
  perform pg_temp.chk('new user', 'publishes own page', 'ok:1',
    pg_temp.try($$update public.fellows set status = 'published' where slug = 'test-fellow-new'$$));
  perform pg_temp.become('visitor');
  perform pg_temp.chk('new user', 'visitors see it once published', '1',
    pg_temp.cnt($$select 1 from public.fellows where slug = 'test-fellow-new'$$));

  ---------------------------------------------------------------- admin
  perform pg_temp.become(adm);
  perform pg_temp.chk('admin', 'reads all users rows', (users_before + 6)::text,
    pg_temp.cnt('select 1 from public.users'));
  perform pg_temp.chk('admin', 'reads draft pages and resources', '1',
    pg_temp.cnt(format('select 1 from public.resources where id = %L', rb_drf)));
  perform pg_temp.chk('admin', 'changes a role', 'error',
    pg_temp.try(format($$update public.users set role = 'admin' where id = %L$$, a)));
  perform pg_temp.chk('admin', 'rewrites B resource title', 'error',
    pg_temp.try(format($$update public.resources set title = 'rewritten' where id = %L$$, rb_pub)));
  perform pg_temp.chk('admin', 'rewrites B page name', 'error',
    pg_temp.try(format($$update public.fellows set name = 'rewritten' where user_id = %L$$, b)));
  perform pg_temp.chk('admin', 'moves B resource to self', 'error',
    pg_temp.try(format($$update public.resources set user_id = %L where id = %L$$, a, rb_pub)));
  perform pg_temp.chk('admin', 'creates a resource for B', 'error',
    pg_temp.try(format($$insert into public.resources (user_id, slug, title) values (%L, 'test-admin', 'x')$$, b)));
  perform pg_temp.chk('admin', 'edits B file', 'refused',
    pg_temp.try(format($$update public.resource_files set file_name = 'rewritten' where resource_id = %L$$, rb_pub)));
  perform pg_temp.chk('admin', 'unpublishes B resource', 'ok:1',
    pg_temp.try(format($$update public.resources set status = 'draft' where id = %L$$, rb_pub)));
  perform pg_temp.chk('admin', 'unpublishes B page', 'ok:1',
    pg_temp.try(format($$update public.fellows set status = 'draft' where user_id = %L$$, b)));
  perform pg_temp.chk('admin', 'deletes B media', 'ok:1',
    pg_temp.try(format('delete from public.resource_media where resource_id = %L', rb_drf)));
  perform pg_temp.chk('admin', 'deletes B resource', 'ok:1',
    pg_temp.try(format('delete from public.resources where id = %L', rb_drf)));
  perform pg_temp.become('visitor');
  perform pg_temp.chk('admin', 'visitors no longer see B page after take-down', '0',
    pg_temp.cnt($$select 1 from public.fellows where slug = 'test-fellow-b'$$));

  perform pg_temp.become('postgres');
end
$do$;

select n, area, name, expected, actual, pass from pg_temp.results order by n;

rollback;
