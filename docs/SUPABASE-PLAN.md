# Fellow Portfolio on Supabase: full plan

Status: Phase 1 (database) is built and tested. See `docs/BUILD-PLAN.md` for the build order and `docs/DATABASE.md` for the database as built.

> **Where the build differs from the draft SQL below.** The migration in `supabase/migrations/` is the source of truth. Approved changes (BUILD-PLAN section 1): helper functions live in a `private` schema; one policy per table per action; a trigger limits an admin to changing `status` only; extra reserved addresses (`setup`, `assets`, `404`); a `cover_consent_confirmed` column, and consent required by the database on media and covers; fellows' pages start as `draft` and stay hidden until published (open question 2 is decided: hidden); `/setup` is its own route; the email link uses `token_hash`; the data import is a generated SQL file, not the secret key.
> Supabase project: `ydwjuixkrvavlbxmvdts` (https://supabase.com/dashboard/project/ydwjuixkrvavlbxmvdts)

---

## 1. What we are building

Today the site is a static React app on GitHub Pages that reads one public Google Sheet. Only someone with edit access to the Sheet can change anything, and everyone who can edit can change everyone's rows.

After this change:

- Anyone signs up and signs in with a link sent to their email (no passwords, no invite list).
- When they confirm their email, a row is created for them in a `users` table automatically, using their Supabase user id.
- On first sign-in they set up their own page (`/their-name`) with their photo, headline and intro.
- They add, edit, publish, unpublish and delete their own resources from a simple editor on the site, including uploading a cover image and adding classroom photos and videos.
- Visitors see exactly what they see today: a fellow's page and resource pages. No login needed to read.
- No fellow can see another fellow's drafts or change another fellow's work. This is enforced by the database itself, not just by hiding buttons.

### Decisions already made

| Question                 | Decision                                     |
| ------------------------ | -------------------------------------------- |
| Sign-in method           | Email link only (magic link)                 |
| Review before publishing | None. A fellow's own Publish button is final |
| Pages                    | Each fellow keeps their own page, as now     |
| Search across fellows    | Not now. Each page stands alone              |
| Who can sign up          | Anyone. No invite list                       |
| Users table              | Yes, filled automatically on confirmation    |

### Not in this version

Search or browse across fellows, comments or likes, a public directory of fellows, Google sign-in, admin approval, video uploads (videos stay as YouTube, Drive or Instagram links), and a mobile app.

---

## 2. Before anything is built: what only you can do

1. ~~Give the Supabase connector access to this project.~~ Done: the connector can read and change project `fellow-portfolio` (`ydwjuixkrvavlbxmvdts`).
2. **Decide the sender email for sign-in links** (see section 5). Supabase's built-in email cannot send to fellows.

---

## 3. How the pieces fit

```
Visitor's browser ──► GitHub Pages (the React site, unchanged hosting)
        │
        └──► Supabase (one project)
               ├─ Auth      email-link sign-in, sessions
               ├─ Database  users, fellows, resources, files, media
               │            Row Level Security decides who can read or write each row
               └─ Storage   cover images and fellow photos
```

- No server of our own. The site talks to Supabase directly with the public **publishable key** (`sb_publishable_…`). That key is safe to ship in the site because it can only do what the Row Level Security rules allow.
- The **secret key** (`sb_secret_…`) never goes into the site, the repo or GitHub variables. It is only used once, from my sandbox, for the data import, and then not again.
- Use the new publishable and secret keys, not the legacy `anon` and `service_role` keys. Supabase says the legacy keys stop working at the end of 2026.
- No Edge Functions in this version. Everything needed (sign-up gate, ownership rules, timestamps) runs inside the database.

---

## 4. Users and sign-up

### Open sign-up

There is no invite list. Anyone can type their email on `/login`, get a link, and have an account. Each person's account has two parts:

| Table     | What it is                                                                                          | Who can see it                  |
| --------- | --------------------------------------------------------------------------------------------------- | ------------------------------- |
| `users`   | The account: id, email, role, when they joined. Created automatically when they confirm their email | Only that user (and you, admin) |
| `fellows` | The public page: page address, name, photo, headline, intro. Created when they set up their page    | Everyone, once published        |

Keeping them separate means a fellow's email is never readable by visitors, even though their page is public.

### How a `users` row is created

1. A new person requests a sign-in link. Supabase creates their account in its own `auth.users` table, not yet confirmed.
2. They click the link or type the code. Supabase sets `email_confirmed_at` on their account.
3. A database trigger on `auth.users` sees the confirmation and inserts a row into `public.users` with `id` = their Supabase user id (the same value as `auth.uid()` when they are signed in) and their email.
4. If someone requests a link but never confirms, no `users` row is created, so unconfirmed sign-ups leave nothing behind in our tables.
5. If they later change their email, the same trigger updates `users.email`.

The trigger function is kept very small on purpose: if it errors, Supabase refuses the sign-in, so it must never fail.

### Keeping open sign-up safe

Because anyone can join and nothing is reviewed, the plan adds light safeguards that do not get in a real fellow's way:

- **Pages are hidden until published.** A new account has no public page until the person fills in their profile and presses Publish.
- **Take-down.** Your `users.role` is `admin`. An admin can unpublish or delete any fellow page or resource if something inappropriate appears. Admin cannot edit another fellow's content; only hide or remove it.
- **Bot protection.** Cloudflare Turnstile (free, usually invisible) on the `/login` form, switched on in Supabase under Authentication > Bot and Abuse Protection. This stops scripts from mass-creating accounts and burning through the email allowance.
- **Rate limits.** Supabase already allows only one link per email per minute; the overall email limit is set in Authentication > Rate Limits.
- Roles are set only by you from the dashboard. No one can make themselves an admin from the site.

### Sign-in flow

1. Fellow opens `/login`, types their email, presses "Send me a link".
2. The site calls Supabase `signInWithOtp` with `emailRedirectTo` set to `https://<site>/auth/callback`.
3. The email contains a link and also a 6-digit code. The code matters: some school and office email systems open links automatically to scan them, which uses up a one-time link before the person clicks it. Typing the code on the same `/login` page still works.
4. The callback page finishes sign-in (PKCE flow), then sends them to `/me`.
5. The session is kept in the browser, so they stay signed in on that device. "Sign out" is in the editor header.

Dashboard settings this needs (Authentication):

- Site URL: the GitHub Pages address.
- Redirect URLs: the GitHub Pages `/auth/callback` address and `http://localhost:5173/auth/callback` for local testing.
- Email OTP expiry: 1 hour or less.
- Email templates: edit the Magic Link template so it shows both the link and the `{{ .Token }}` code, in plain, short wording (no marketing text, which pushes emails into spam).

### First sign-in: claim your page

If the signed-in user has no `fellows` row yet, `/me` shows "Set up your page":

- Page address (`fellow-portfolio/…/priya-sharma`): lowercase letters, numbers and hyphens, checked live for availability. Words used by the site's own routes (`me`, `login`, `auth`, `r`, `admin`, `about`, `api`) are reserved.
- Full name, first name (used in "Hi, I'm …" and "More from …"), headline role, highlight, status text, intro, school, city, cohort, photo.
- The page address can be changed later, but changing it breaks links people already shared, so the form warns about that. A later improvement could keep old addresses as redirects.

---

## 5. Email delivery (this blocks inviting anyone)

Supabase's built-in email is for testing only. Per Supabase's docs it only delivers to members of the Supabase organisation's team and has a very low hourly limit. Any other address gets "Email address not authorized".

Plan:

- **While building:** use the built-in email. It reaches you, because you are on the team. Enough to test everything.
- **Before the first other fellow joins:** connect a real email service through Authentication > Emails > SMTP Settings. Options that work with Supabase include Resend, Brevo, Postmark, Amazon SES and ZeptoMail.
  - The cleanest setup is a small domain you own (for example `fellowportfolio.in`), with the sender `no-reply@` on it. A domain also makes a nicer site address than GitHub Pages later.
  - Brevo can send from a single verified address without a domain, but Gmail addresses as senders tend to land in spam. Use that only as a stopgap.
- After SMTP is connected, Supabase starts at about 30 emails an hour. That is plenty for a cohort and can be raised under Authentication > Rate Limits.

---

## 6. Database design

All tables live in the `public` schema with Row Level Security switched on. IDs that appear in addresses stay as readable slugs, so current links like `/yohannan/r/yohannan-fractions-rotis` keep working.

### Tables

**`users`** (one per confirmed account, private)

| column     | type                                                             | notes                                     |
| ---------- | ---------------------------------------------------------------- | ----------------------------------------- |
| id         | uuid, primary key, references `auth.users(id)` on delete cascade | same value as `auth.uid()`                |
| email      | text, not null, unique                                           | copied from the account, stored lowercase |
| role       | text, `fellow` or `admin`, default `fellow`                      | changed only from the dashboard           |
| created_at | timestamptz, default now()                                       | when they confirmed                       |

**`fellows`** (the public page, at most one per user)

| column                                         | type                                                        | notes                                   |
| ---------------------------------------------- | ----------------------------------------------------------- | --------------------------------------- |
| user_id                                        | uuid, primary key, references `users(id)` on delete cascade | the owner                               |
| slug                                           | text, unique, not null                                      | page address; same format rule as today |
| status                                         | text, `draft` or `published`, default `draft`               | page hidden until published             |
| name, first_name                               | text, not null                                              |                                         |
| headline_role, headline_highlight, status_text | text                                                        |                                         |
| intro, school, city, cohort                    | text                                                        |                                         |
| photo_path                                     | text                                                        | Storage path, or an outside image URL   |
| created_at, updated_at                         | timestamptz                                                 | `updated_at` set by trigger             |

**`resources`**

| column                 | type                                                            | notes                                                       |
| ---------------------- | --------------------------------------------------------------- | ----------------------------------------------------------- |
| id                     | uuid, primary key, default `gen_random_uuid()`                  | internal id                                                 |
| user_id                | uuid, not null, references `fellows(user_id)` on delete cascade | the owner                                                   |
| slug                   | text, not null                                                  | address part; unique per fellow                             |
| status                 | text, `draft` or `published`, default `draft`                   |                                                             |
| title                  | text, not null                                                  |                                                             |
| subject, grade, length | text                                                            |                                                             |
| tags                   | text[], default `{}`                                            | max 8, each under 40 characters                             |
| cover_path             | text                                                            | Storage path, or an outside image URL                       |
| summary, description   | text                                                            | length limits (summary 300, description 5000)               |
| drive_link             | text                                                            | must start with `https://`                                  |
| published_at           | timestamptz                                                     | set the first time it is published; used for "newest first" |
| created_at, updated_at | timestamptz                                                     |                                                             |
|                        | unique (`user_id`, `slug`)                                      |                                                             |

**`resource_files`** ("What's inside")

| column      | type                                               | notes             |
| ----------- | -------------------------------------------------- | ----------------- |
| id          | uuid, primary key                                  |                   |
| resource_id | uuid, references `resources(id)` on delete cascade |                   |
| position    | int                                                | order on the page |
| file_name   | text, not null                                     |                   |
| file_link   | text                                               | `https://` only   |

**`resource_media`** ("In the classroom")

| column            | type                                               | notes                                                 |
| ----------------- | -------------------------------------------------- | ----------------------------------------------------- |
| id                | uuid, primary key                                  |                                                       |
| resource_id       | uuid, references `resources(id)` on delete cascade |                                                       |
| position          | int                                                |                                                       |
| url               | text, not null                                     | YouTube, Instagram, Drive, or an uploaded image path  |
| caption           | text                                               |                                                       |
| type_hint         | text, `image`, `video` or empty                    | same meaning as the Sheet's `type` column             |
| consent_confirmed | boolean, not null                                  | fellow ticked "I have consent for any students shown" |

Indexes: `fellows(slug)`, `resources(user_id, status, published_at desc)`, `resource_files(resource_id, position)`, `resource_media(resource_id, position)`.

Why `user_id` sits on `resources` directly: every ownership check becomes a simple "is this row's `user_id` me?", which is fast and hard to get wrong. Files and media check ownership through their resource.

### Draft SQL (to review before running)

```sql
-- Helpers -------------------------------------------------------------
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;

-- Users: one row per confirmed account ------------------------------
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique check (email = lower(email)),
  role text not null default 'fellow' check (role in ('fellow','admin')),
  created_at timestamptz not null default now()
);

-- Copies a confirmed auth account into public.users.
-- Runs as the table owner (security definer) because the person signing in
-- has no rights on public.users yet. Kept minimal: an error here blocks sign-in.
create or replace function public.handle_confirmed_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.email_confirmed_at is not null and new.email is not null then
    insert into public.users (id, email)
    values (new.id, lower(new.email))
    on conflict (id) do update set email = excluded.email;
  end if;
  return new;
end $$;

revoke execute on function public.handle_confirmed_user() from anon, authenticated, public;

-- New account that is already confirmed (e.g. created from the dashboard)
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_confirmed_user();

-- Normal magic-link flow: account confirmed on first click, or email changed
create trigger on_auth_user_confirmed
  after update of email_confirmed_at, email on auth.users
  for each row
  when (new.email_confirmed_at is not null
        and (old.email_confirmed_at is null or old.email is distinct from new.email))
  execute function public.handle_confirmed_user();

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.users
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

-- Fellows -------------------------------------------------------------
create table public.fellows (
  user_id uuid primary key references public.users (id) on delete cascade,
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) between 3 and 40)
    check (slug not in ('me','login','auth','r','admin','about','api')),
  status text not null default 'draft' check (status in ('draft','published')),
  name text not null check (length(name) between 1 and 80),
  first_name text not null check (length(first_name) between 1 and 40),
  headline_role text, headline_highlight text, status_text text,
  intro text check (length(intro) <= 600),
  school text, city text, cohort text, photo_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Resources -----------------------------------------------------------
create table public.resources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.fellows (user_id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  status text not null default 'draft' check (status in ('draft','published')),
  title text not null check (length(title) between 1 and 120),
  subject text, grade text, length text,
  tags text[] not null default '{}' check (cardinality(tags) <= 8),
  cover_path text,
  summary text check (length(summary) <= 300),
  description text check (length(description) <= 5000),
  drive_link text check (drive_link is null or drive_link ~ '^https://'),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, slug)
);

create table public.resource_files (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources (id) on delete cascade,
  position int not null default 0,
  file_name text not null,
  file_link text check (file_link is null or file_link ~ '^https://')
);

create table public.resource_media (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources (id) on delete cascade,
  position int not null default 0,
  url text not null,
  caption text,
  type_hint text check (type_hint in ('image','video') or type_hint is null),
  consent_confirmed boolean not null default false
);

-- Triggers: timestamps, and published_at on first publish
create trigger fellows_updated before update on public.fellows
  for each row execute function public.set_updated_at();
create trigger resources_updated before update on public.resources
  for each row execute function public.set_updated_at();

create or replace function public.set_published_at() returns trigger
language plpgsql as $$ begin
  if new.status = 'published' and new.published_at is null then
    new.published_at = now();
  end if;
  return new;
end $$;
create trigger resources_published before insert or update on public.resources
  for each row execute function public.set_published_at();
```

### Row Level Security (who can do what)

Switch it on for every table, then add only these policies. Anything not allowed is refused.

| Table                              | Anyone (not signed in)                            | Signed-in fellow                                                  | Admin (you)                                   |
| ---------------------------------- | ------------------------------------------------- | ----------------------------------------------------------------- | --------------------------------------------- |
| `users`                            | nothing                                           | read only their own row; cannot change it                         | read all rows                                 |
| `fellows`                          | read rows with status `published`                 | read, create and edit only their own row (`user_id = auth.uid()`) | as a fellow, plus unpublish or delete any row |
| `resources`                        | read `published` resources of `published` fellows | full control of rows where `user_id = auth.uid()`                 | as a fellow, plus unpublish or delete any row |
| `resource_files`, `resource_media` | read rows whose resource is readable              | full control where the parent resource is theirs                  | as a fellow, plus delete any row              |

Rows in `users` are only ever written by the trigger. There is no insert or update policy for it, so the site cannot create, edit or promote an account.

```sql
alter table public.users          enable row level security;
alter table public.fellows        enable row level security;
alter table public.resources      enable row level security;
alter table public.resource_files enable row level security;
alter table public.resource_media enable row level security;

create policy "user reads own account" on public.users
  for select to authenticated using (id = (select auth.uid()));
create policy "admin reads all accounts" on public.users
  for select to authenticated using (public.is_admin());

create policy "public reads published fellows" on public.fellows
  for select using (status = 'published');
create policy "owner reads own fellow row" on public.fellows
  for select to authenticated using (user_id = (select auth.uid()));
create policy "owner creates own fellow row" on public.fellows
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "owner edits own fellow row" on public.fellows
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "public reads published resources" on public.resources
  for select using (
    status = 'published'
    and exists (select 1 from public.fellows f
                where f.user_id = resources.user_id and f.status = 'published')
  );
create policy "owner manages own resources" on public.resources
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Same pair for resource_files and resource_media:
create policy "public reads files of readable resources" on public.resource_files
  for select using (exists (select 1 from public.resources r where r.id = resource_id));
create policy "owner manages own files" on public.resource_files
  for all to authenticated
  using (exists (select 1 from public.resources r
                 where r.id = resource_id and r.user_id = (select auth.uid())))
  with check (exists (select 1 from public.resources r
                      where r.id = resource_id and r.user_id = (select auth.uid())));
-- (repeat for resource_media)

-- Take-down: admin can unpublish or delete anything, but not rewrite it.
create policy "admin reads all fellows" on public.fellows
  for select to authenticated using (public.is_admin());
create policy "admin unpublishes fellows" on public.fellows
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin deletes fellows" on public.fellows
  for delete to authenticated using (public.is_admin());
-- (same three for resources; delete only for resource_files and resource_media)
```

The admin update policy allows any column at the database level; the site only ever sends a status change from the admin screen. If tighter control is wanted later, an `unpublish(id)` database function can replace the update policy.

The "files of readable resources" check works because the inner query on `resources` is itself filtered by the `resources` policies: a visitor can only see files of resources they are allowed to see.

Deleting an account (in `auth.users`) deletes their `users` row, which deletes their `fellows` row, resources, files and media (cascade). Their Storage folder is removed by the "Delete my account" action in the editor.

### Making yourself admin

After you sign in once, run this in the SQL editor (it is the only way to set a role):

```sql
update public.users set role = 'admin' where email = 'yohannankphilip@gmail.com';
```

---

## 7. Images and files (Storage)

- One public bucket, `portfolio`, for covers and fellow photos. Public means anyone can view an image if they have its address, which is what a public page needs.
- Folder rule: every file goes under the uploader's own user id, for example `portfolio/<user_id>/covers/<resource_id>.webp` or `portfolio/<user_id>/photo.webp`. Storage policies allow upload, replace and delete only inside your own folder (`(storage.foldername(name))[1] = auth.uid()::text`).
- Bucket limits: images only (`image/jpeg`, `image/png`, `image/webp`), 5 MB per file.
- The editor shrinks images in the browser before upload: longest side 1600 px for covers, 600 px for photos, saved as WebP. This keeps pages fast on school and phone connections and stretches the free 1 GB of storage a long way.
- **Classroom photos:** can be uploaded to the same bucket (`<user_id>/media/<resource_id>/…`) or linked as today (Drive, Instagram).
- **Videos:** not uploaded. They stay as YouTube, Drive or Instagram links, which the site already embeds safely. Video storage would quickly exceed the free plan.
- **Lesson files** ("What's inside"): stay as Drive links. Fellows already keep these in Drive, and Drive handles sharing permissions.
- The site keeps accepting outside image URLs in `cover_path` and `photo_path`, so your current Drive-hosted images keep working without re-uploading.

### Student privacy

Same rule as the Sheet guide: no students' faces or names without consent. In the editor, every cover or classroom photo upload shows a required tick-box, "I have consent for any students who can be identified", stored as `consent_confirmed`. The site will not save media without it.

---

## 8. Changes to the site

### Routes

| Address                  | What                                                              | Who       |
| ------------------------ | ----------------------------------------------------------------- | --------- |
| `/:fellow`               | Fellow page (unchanged look)                                      | everyone  |
| `/:fellow/r/:resource`   | Resource page (unchanged look)                                    | everyone  |
| `/login`                 | Email and code form                                               | everyone  |
| `/auth/callback`         | Finishes sign-in                                                  | everyone  |
| `/me`                    | My resources: list with Draft or Published badges, "Add resource" | signed in |
| `/me/profile`            | Edit my page (photo, headline, intro, page address)               | signed in |
| `/me/r/new`, `/me/r/:id` | Resource editor                                                   | signed in |
| `/admin`                 | List of fellows and resources with Unpublish and Delete buttons   | admin     |

GitHub Pages has no server-side routing, so these all rely on the existing `404.html` fallback, which already handles the current routes.

### Loading data

Today the site loads the whole Sheet at once. With Supabase each page loads only what it shows:

- Fellow page: the fellow by slug, plus their published resources (title, subject, grade, length, tags, cover, summary). One request with an embedded select.
- Resource page: that one resource with its files and media, plus the three newest other resources for "More from …".
- Editor: the signed-in fellow's own resources, including drafts.

The pages and components (`Hero`, `ResourceCard`, `MediaGallery` and the rest) stay as they are. A new set of query functions returns the same `Fellow` and `Resource` types the pages already use, so the visual work we have done is not touched.

The offline copy stays: the last successful load per fellow page is kept in the browser and shown if Supabase cannot be reached, with the same "this is the copy saved on …" notice.

### Editor screens

- **My resources:** cards in the same 280 px style, each with a Draft or Published badge, Edit, and a quick Publish or Unpublish switch.
- **Resource editor:** a single page in the same order as the resource page, so fellows see where each field will appear: title, summary, subject, grade, length, tags (type and press Enter, max 8), cover (upload or paste a link, with crop preview), description, Drive link, "What's inside" list (add, reorder, remove), "In the classroom" list (paste a link or upload a photo; a live preview uses the same embed code as the public page), Save draft, Publish, View page, Delete (with confirm).
- Unsaved-changes warning when leaving the page.
- The resource's address is generated from the title the first time (for example "Fractions with rotis" becomes `fractions-with-rotis`) and can be edited.
- **Profile editor:** fields from the "Set up your page" form, plus a live preview of the hero.

### Code layout

```
src/data/source.ts            chooses Sheet or Supabase from config
src/data/supabase/client.ts   createClient(url, publishable key)
src/data/supabase/queries.ts  fellow page, resource page, my resources
src/data/supabase/mutations.ts save, publish, delete, reorder
src/data/supabase/storage.ts  resize and upload, public URL
src/data/supabase/database.types.ts  generated from the schema
src/auth/AuthProvider.tsx     session, sign in, sign out
src/auth/RequireAuth.tsx      protects /me and /admin routes
src/pages/editor/…            My resources, Resource editor, Profile
src/pages/admin/…             Take-down list
```

New dependency: `@supabase/supabase-js`. Optionally `@tanstack/react-query` for caching and refetching. It is worth adding once the editor exists, because it handles "saved, now refresh the list" cleanly.

New GitHub repository variables: `VITE_DATA_SOURCE` (`sheet` or `supabase`), `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`. The existing `VITE_SHEET_ID` stays until the Sheet is retired.

---

## 9. Moving your current data

1. You sign in once on the new site and claim the page address `yohannan`. This creates your `fellows` row and gives your user id.
2. I run an import script from my sandbox: it reads the four Sheet tabs (`fellows`, `resources`, `files`, `media`) and writes them as your rows, keeping every resource slug so existing links still work. It uses the secret key once, from the sandbox only, and the key is not saved anywhere afterwards.
3. Cover and photo links stay as they are (outside URLs). You can swap them for uploads later from the editor.
4. I compare the old and new site page by page (screenshots at desktop and phone width) before switching.
5. The Sheet stays as a read-only backup for a few weeks, then is retired.

The 5 older resources missing from the Sheet (Angles, Chewing Gum, Rainbow, Community, Family) can be restored from the Sheet's version history first, so they come across too, or added later in the editor.

---

## 10. Keeping it running on the free plan

| Limit (free plan)                                      | Effect here                                                  | What we do                                                                                               |
| ------------------------------------------------------ | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| Project paused after about a week with little activity | Site shows the offline copy or an error until you restore it | A scheduled GitHub Action makes one small read every few days; the site's offline copy covers short gaps |
| 500 MB database                                        | Text only; thousands of resources fit                        | Nothing needed                                                                                           |
| 1 GB storage                                           | Covers and photos only                                       | Shrink images before upload; videos stay as links                                                        |
| Email limits (after SMTP setup)                        | About 30 sign-in emails an hour to start                     | Raise in Rate Limits if a whole cohort joins at once                                                     |
| No downloadable backups                                | Data loss risk if something goes wrong                       | A weekly GitHub Action exports all public tables to JSON in a private place (or the repo)                |

---

## 11. Security checklist

- [ ] Row Level Security on every table; run Supabase's Security Advisor after each change and fix every warning.
- [ ] Only the publishable key in the site; the secret key never committed or stored in GitHub.
- [ ] `users` trigger tested: unconfirmed sign-up creates no row; confirming creates exactly one; changing email updates it; a failure cannot block sign-in.
- [ ] A signed-in fellow cannot insert, update or delete any `users` row, and cannot read anyone else's.
- [ ] Storage policies tested: a fellow cannot upload into, or delete from, another fellow's folder.
- [ ] Tested as each role: visitor, fellow A, fellow B, admin. A cannot read B's drafts or edit B's rows.
- [ ] All links still pass through the site's existing safe-URL check; embeds still rebuilt from IDs, never copied raw.
- [ ] Text shown as text (React does this already); no raw HTML from fellows.
- [ ] Redirect URLs limited to the real site and localhost.
- [ ] Multi-factor authentication on your own Supabase account, since it controls everything.
- [ ] Bot protection (Cloudflare Turnstile) switched on for sign-in, since sign-up is open.

---

## 12. Phases

Each phase ends with something working that you can check. Nothing goes live on the public site until phase 4.

**Phase 0: Setup (you, about 20 minutes)**
Publishable key and project URL; Site URL and redirect URLs; decision on email sender. (Connector access: done.)

**Phase 1: Database (me)**
Tables (including `users` and its confirmation trigger), Row Level Security, admin take-down rules, Storage bucket and policies, as one migration. Run the Security Advisor. Test every role with SQL before any site code.
Done when: all role tests pass and the advisors show no warnings.

**Phase 2: Site reads from Supabase (me)**
Supabase client and queries behind `VITE_DATA_SOURCE`. Seed a test fellow. Public pages look identical to today.
Done when: the Sheet and Supabase versions match in screenshots.

**Phase 3: Sign-in and your data (me, with one sign-in from you)**
`/login` with Turnstile, callback, session, sign out. You sign in (your `users` row appears), I make you admin, you claim `yohannan`, then I run the import.
Done when: you can sign in on your phone and laptop, and your page on Supabase matches the Sheet version.

**Phase 4: Switch the live site (you push in GitHub Desktop)**
Set the repo variables to Supabase and deploy. The Sheet stays as a read-only backup.

**Phase 5: Editor (me)**
My resources, resource editor with drafts and publish, profile editor, image upload with resizing and the consent tick-box.
Done when: you can create a resource from your phone, with a cover and a classroom photo, publish it and see it live.

**Phase 6: Open to fellows**
Real email service (SMTP) connected and tested; `/admin` take-down screen; a one-page "How to add your resources" guide for fellows. Share the link with 1 or 2 fellows first, fix what they trip on, then the rest.

**Phase 7: Housekeeping**
Keep-alive and backup GitHub Actions, delete-my-account, retire the Sheet and update the docs.

---

## 13. Risks and how they are handled

| Risk                                             | Handling                                                                                       |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| A stranger signs up and publishes something      | Pages hidden until published; admin take-down; Turnstile against bots                          |
| Sign-in emails go to spam or never arrive        | Proper SMTP with your own domain; the 6-digit code as a fallback                               |
| School email scanners use up the link            | The 6-digit code still works                                                                   |
| Free project paused                              | Keep-alive action plus the offline copy in the browser                                         |
| A rule mistake exposes drafts                    | Role tests in phase 1, Security Advisor after every change                                     |
| A fellow uploads a student photo without consent | Required tick-box; clear rule in the fellow guide; you can delete any media from the dashboard |
| Breaking current links                           | Slugs kept exactly; page addresses reserved and unique                                         |
| Being stuck if the switch goes wrong             | `VITE_DATA_SOURCE=sheet` brings the old version back in one deploy until the Sheet is retired  |

---

## 14. Still to decide

1. Sender for sign-in emails: buy a small domain (recommended, can also become the site address) or a temporary Brevo single sender?
2. Should a fellow's page be hidden until they publish it (recommended), or public as soon as it is created?
3. Keep the Google Sheet as a backup after the switch, or retire it right away?
