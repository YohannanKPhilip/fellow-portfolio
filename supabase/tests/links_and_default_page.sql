-- Checks for the links section and the default page (migrations 050000 and 060000).
-- Safe to run on the live database: everything is rolled back at the end, and the result is
-- reported through the final "error" message, which starts with RESULT.
--
-- Run it in the Supabase SQL editor. Expected: every "pass" below is true.

do $$
declare
  uid uuid := gen_random_uuid();
  p jsonb;
  kept jsonb;
  failures text := '';
  c record;
  too_many jsonb;
begin
  -- 1. Page validator: links section and the rules it must keep refusing.
  for c in
    select * from (values
      ('links ok', true, '{"v":1,"sections":[{"id":"l","type":"links","title":[{"t":"Links","c":"accent"}],"items":[{"label":"Videos","url":"https://youtube.com/x"}]}]}'::jsonb),
      ('links with no items yet', true, '{"v":1,"sections":[{"id":"l","type":"links","items":[]}]}'::jsonb),
      ('no items key', false, '{"v":1,"sections":[{"id":"l","type":"links"}]}'::jsonb),
      ('http link', false, '{"v":1,"sections":[{"id":"l","type":"links","items":[{"label":"A","url":"http://x.test/a"}]}]}'::jsonb),
      ('javascript link', false, '{"v":1,"sections":[{"id":"l","type":"links","items":[{"label":"A","url":"javascript:alert(1)"}]}]}'::jsonb),
      ('space in link', false, '{"v":1,"sections":[{"id":"l","type":"links","items":[{"label":"A","url":"https://x.test/a b"}]}]}'::jsonb),
      ('empty label', false, '{"v":1,"sections":[{"id":"l","type":"links","items":[{"label":"","url":"https://x.test/a"}]}]}'::jsonb),
      ('extra link field', false, '{"v":1,"sections":[{"id":"l","type":"links","items":[{"label":"A","url":"https://x.test/a","html":"<b>"}]}]}'::jsonb),
      ('extra section field', false, '{"v":1,"sections":[{"id":"l","type":"links","items":[],"style":"x"}]}'::jsonb),
      ('bad heading color', false, '{"v":1,"sections":[{"id":"l","type":"links","title":[{"t":"x","c":"red"}],"items":[]}]}'::jsonb),
      ('link picture ok', true, '{"v":1,"sections":[{"id":"l","type":"links","items":[{"label":"A","url":"https://x.test/a","image":"11111111-1111-4111-8111-111111111111/links/a.webp","blurhash":"LEHV6nWB2yk8pyo0adR*.7kCMdnj","consent":true}]}]}'::jsonb),
      ('link picture without blurhash ok', true, '{"v":1,"sections":[{"id":"l","type":"links","items":[{"label":"A","url":"https://x.test/a","image":"11111111-1111-4111-8111-111111111111/links/a.webp","consent":true}]}]}'::jsonb),
      ('link picture without consent', false, '{"v":1,"sections":[{"id":"l","type":"links","items":[{"label":"A","url":"https://x.test/a","image":"11111111-1111-4111-8111-111111111111/links/a.webp"}]}]}'::jsonb),
      ('link picture consent false', false, '{"v":1,"sections":[{"id":"l","type":"links","items":[{"label":"A","url":"https://x.test/a","image":"11111111-1111-4111-8111-111111111111/links/a.webp","consent":false}]}]}'::jsonb),
      ('link picture in the wrong folder', false, '{"v":1,"sections":[{"id":"l","type":"links","items":[{"label":"A","url":"https://x.test/a","image":"11111111-1111-4111-8111-111111111111/media/a.webp","consent":true}]}]}'::jsonb),
      ('link picture is an outside address', false, '{"v":1,"sections":[{"id":"l","type":"links","items":[{"label":"A","url":"https://x.test/a","image":"https://x.test/a.png","consent":true}]}]}'::jsonb),
      ('consent with no picture', false, '{"v":1,"sections":[{"id":"l","type":"links","items":[{"label":"A","url":"https://x.test/a","consent":true}]}]}'::jsonb),
      ('blurhash with no picture', false, '{"v":1,"sections":[{"id":"l","type":"links","items":[{"label":"A","url":"https://x.test/a","blurhash":"LEHV6nWB2yk8pyo0adR*.7kCMdnj"}]}]}'::jsonb),
      ('bad blurhash', false, '{"v":1,"sections":[{"id":"l","type":"links","items":[{"label":"A","url":"https://x.test/a","image":"11111111-1111-4111-8111-111111111111/links/a.webp","blurhash":"no spaces allowed","consent":true}]}]}'::jsonb),
      ('resources still ok', true, '{"v":1,"sections":[{"id":"r","type":"resources","title":[{"t":"R","c":"muted"}],"sort":"newest","limit":6}]}'::jsonb),
      ('resources bad heading color', false, '{"v":1,"sections":[{"id":"r","type":"resources","title":[{"t":"R","c":"red"}]}]}'::jsonb),
      ('unknown section type', false, '{"v":1,"sections":[{"id":"r","type":"video"}]}'::jsonb)
    ) as t(name, expect, doc)
  loop
    if private.valid_page(c.doc) is distinct from c.expect then
      failures := failures || ' [' || c.name || ']';
    end if;
  end loop;

  select jsonb_agg(jsonb_build_object('label', 'a', 'url', 'https://x.test/a')) into too_many from generate_series(1, 13);
  if private.valid_links(too_many) then failures := failures || ' [13 links accepted]'; end if;

  -- 2. A new fellow with no page gets hero then resources, and that page is valid.
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
  values ('00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', 'rollback-only@fellow-test.invalid', 'x', now(), '{}', '{}', now(), now(), '', '', '', '');
  insert into public.fellows (user_id, slug, name, first_name) values (uid, 'rollback-only', 'Asha Rao', 'Asha') returning page into p;
  if p #>> '{sections,0,type}' <> 'hero' or p #>> '{sections,1,type}' <> 'resources' then failures := failures || ' [default is not hero then resources]'; end if;
  if not private.valid_page(p) then failures := failures || ' [default page invalid]'; end if;
  if p #>> '{sections,0,blocks,0,runs,2,t}' <> ' Asha!' then failures := failures || ' [name not in headline]'; end if;

  -- 3. A page that is sent is kept.
  delete from public.fellows where user_id = uid;
  insert into public.fellows (user_id, slug, name, first_name, page)
  values (uid, 'rollback-only', 'Asha Rao', 'Asha', '{"v":1,"sections":[{"id":"x","type":"links","items":[]}]}') returning page into kept;
  if kept #>> '{sections,0,type}' <> 'links' then failures := failures || ' [sent page replaced]'; end if;

  -- 3b. A page can only use link pictures from its own folder.
  delete from public.fellows where user_id = uid;
  begin
    insert into public.fellows (user_id, slug, name, first_name, page)
    values (uid, 'rollback-only', 'Asha Rao', 'Asha',
      jsonb_build_object('v', 1, 'sections', jsonb_build_array(jsonb_build_object('id', 'l', 'type', 'links', 'items',
        jsonb_build_array(jsonb_build_object('label', 'A', 'url', 'https://x.test/a',
          'image', '11111111-1111-4111-8111-111111111111/links/a.webp', 'consent', true))))));
    failures := failures || ' [a picture from another folder was accepted]';
  exception when check_violation then
    null;
  end;
  insert into public.fellows (user_id, slug, name, first_name, page)
  values (uid, 'rollback-only', 'Asha Rao', 'Asha',
    jsonb_build_object('v', 1, 'sections', jsonb_build_array(jsonb_build_object('id', 'l', 'type', 'links', 'items',
      jsonb_build_array(jsonb_build_object('label', 'A', 'url', 'https://x.test/a',
        'image', uid::text || '/links/a.webp', 'consent', true))))));

  -- 4. No fellow is left without a page.
  if exists (select 1 from public.fellows where page is null) then failures := failures || ' [a page is null]'; end if;

  raise exception 'RESULT: %', case when failures = '' then 'all checks pass' else 'FAILED:' || failures end;
end $$;
