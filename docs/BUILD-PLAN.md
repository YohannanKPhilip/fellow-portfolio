# Fellow Portfolio on Supabase: build plan

Status: **draft for review.** Nothing has been built or changed yet.
Based on `docs/SUPABASE-PLAN.md` (the design) and the code as committed on 16 Oct 2026.
Supabase project `fellow-portfolio` (`ydwjuixkrvavlbxmvdts`, ap-south-1): checked today. It is empty, with no tables in `public`, no buckets and no migrations.

This plan says **how** the design gets built: the order of work, every file, what you do in the dashboard and when, and how each phase is tested. Where it changes the design, the change is listed in section 1 so you can approve or reject each one.

---

## 1. Changes to the design plan (please approve each)

| #   | Design plan says                                                        | Build plan does                                                                                                                                                               | Why                                                                                                                                                                                                                                     |
| --- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A   | `/me` shows "Set up your page" when there's no `fellows` row            | A separate `/setup` route. After sign-in: no `fellows` row → `/setup`, otherwise `/me`                                                                                        | Matches your decision                                                                                                                                                                                                                   |
| B   | Reserved page addresses: `me, login, auth, r, admin, about, api`        | Adds `setup`, `assets` and `404`                                                                                                                                              | `/setup` is a route. `assets` is where Vite puts the site's own files on GitHub Pages, so a fellow called "assets" would break the site                                                                                                 |
| C   | Admin has an update policy that allows any column                       | Admin keeps the update policy, plus a database trigger that refuses an admin edit to someone else's row if it changes anything except `status`                                | "Admin can hide, not rewrite" becomes enforced by the database, not only by the site                                                                                                                                                    |
| D   | `is_admin()` and the sign-up trigger function live in `public`          | They live in a `private` schema that the website API can't see                                                                                                                | Functions in `public` can be called by anyone through the API. The Security Advisor flags security-definer functions there                                                                                                              |
| E   | Separate policies for owner, public and admin on each action            | One policy per table per action, with the conditions joined by `or`                                                                                                           | Same rules. Several permissive policies on one action trigger Performance Advisor warnings and slow every query                                                                                                                         |
| F   | Consent tick-box only on media uploads                                  | `resource_media.consent_confirmed` must be `true` (a check in the database), and a new `resources.cover_consent_confirmed` must be `true` whenever there is a cover           | Your rule: no students' faces or names without consent. Covers often show students too. The database refuses a row without the tick, whatever the site does                                                                             |
| G   | Sign-in link uses the default PKCE link                                 | The email link goes to `/auth/callback?token_hash=…&type=email` and the site calls `verifyOtp`. The 6-digit code stays as the fallback                                        | A default PKCE link only works in the same browser that asked for it. A fellow who asks on a laptop and opens the email on a phone would get an error. A `token_hash` link works on any device, and plain link-scanners don't use it up |
| H   | Import runs from my sandbox with the **secret key**                     | A local script reads the Sheet's public CSV and writes an `import.sql` file. I show it to you, then apply it through the Supabase connector                                   | The secret key is never needed for this, so it never leaves the dashboard                                                                                                                                                               |
| I   | Each page loads only what it shows, and pages change to use new queries | In Supabase mode the data layer loads **one fellow's** published page (profile, resources, files, media) in one request and hands the pages the same `Dataset` they use today | `FellowPage`, `ResourcePage` and every component stay unchanged, so the look can't drift. One fellow's data is a few KB                                                                                                                 |
| J   | "Newest first" by `published_at`                                        | The import gives each resource a `published_at` in Sheet row order. The fellow page lists oldest to newest and "More from" lists newest first, as now                         | Keeps today's order exactly                                                                                                                                                                                                             |
| K   | Your account and data come over in Phase 3, after the login page exists | Phase 2: you invite yourself from the dashboard (one click on the email). The trigger creates your `users` row, and I import your Sheet data under that account               | Phase 2 can then compare the Sheet and Supabase versions on **real** data. It also tests the trigger with a real email confirmation early                                                                                               |

---

## 2. Open questions, and when I need each answer

| Question                                         | Needed before                                                                | My recommendation                                                                                                                                          |
| ------------------------------------------------ | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Q2. Hide a fellow's page until they publish?** | **Phase 1** (it decides the default for `fellows.status` and the read rules) | **Yes, hidden.** `/setup` saves a draft page, and a "Publish my page" button makes it public. With open sign-up, this stops empty or test pages showing up |
| Consent for your existing media                  | Phase 2 import                                                               | You confirm that every photo and video now in the Sheet has consent, so the import can set the tick. Anything you're unsure about is left out              |
| Q1. Who sends sign-in emails?                    | Phase 6 (before anyone but you signs in)                                     | Your own small domain with Resend. Phases 1 to 5 use Supabase's built-in email, which reaches you because you're on the team                               |
| Q3. Keep the Sheet as a backup?                  | Phase 7                                                                      | Keep it read-only for 4 weeks after the switch, then retire it. The `VITE_DATA_SOURCE` switch stays until then                                             |

---

## 3. Phase overview

| Phase | What                                                                   | Who                              | Live site changes?         |
| ----- | ---------------------------------------------------------------------- | -------------------------------- | -------------------------- |
| 1     | Database: tables, trigger, RLS, Storage, as one migration              | me                               | No                         |
| 2     | Site reads from Supabase behind `VITE_DATA_SOURCE`; your data imported | me + one email click from you    | No (default stays `sheet`) |
| 3     | Sign-in: `/login`, `/auth/callback`, `/setup`, `/me` shell             | me + dashboard settings from you | No                         |
| 4     | Switch the live site to Supabase                                       | you (repo variables, push)       | **Yes**                    |
| 5     | Editor: resources, profile, uploads, consent                           | me                               | Yes, after you push        |
| 6     | Open to fellows: real email, `/admin`, fellow guide                    | me + you                         | Yes                        |
| 7     | Housekeeping: keep-alive, backups, delete account, retire Sheet        | me + you                         | Yes                        |

Each phase ends with `npm run check` passing, the Security Advisor and Performance Advisor clean, and screenshots at desktop (1280 px) and phone (375 px) width of anything visible that changed. I leave committing to you in GitHub Desktop at the end of each phase, with a suggested commit message.

---

## 4. Phase 1: Database

### Files

| File                                                   | New/changed | What                                                                                          |
| ------------------------------------------------------ | ----------- | --------------------------------------------------------------------------------------------- |
| `supabase/migrations/20261016000000_phase1_schema.sql` | new         | The whole migration, exactly as applied, so the repo has a record of the database             |
| `supabase/tests/phase1_roles.sql`                      | new         | The role and trigger tests, so they can be run again after any later change                   |
| `src/data/supabase/database.types.ts`                  | new         | TypeScript types generated from the schema                                                    |
| `docs/SUPABASE-PLAN.md`                                | changed     | Brought in line with the section 1 changes you approve                                        |
| `docs/DATABASE.md`                                     | new         | Short reference: the tables, who can do what, how to make someone admin, how to run the tests |

### Migration contents, in order

1. Schema `private` (no API access), revoked from `anon` and `authenticated` except `usage` so policies can call `private.is_admin()`.
2. Helper trigger functions: `set_updated_at`, `set_published_at`.
3. `public.users` + `private.handle_confirmed_user()` + the two `auth.users` triggers:
   - **after insert**: only acts if the account is already confirmed (e.g. created from the dashboard).
   - **after update of `email_confirmed_at`, `email`**: fires when `email_confirmed_at` goes from empty to set (the first verification), or when the email changes (updates `users.email`, never adds a row).
   - An ordinary later login only changes `last_sign_in_at`, so neither trigger fires. `on conflict (id)` means even a repeat can't add a second row.
4. `private.is_admin()` (security definer, fixed `search_path`).
5. `fellows`, `resources` (+ `cover_consent_confirmed`), `resource_files`, `resource_media` (consent must be true), with the checks from the design plan and the extra reserved addresses.
6. Indexes on the design plan's columns, plus the foreign keys (`resources.user_id`, `resource_files.resource_id`, `resource_media.resource_id`), which the Performance Advisor expects to be indexed.
7. `private.guard_admin_edit()` trigger on `fellows` and `resources` (change C).
8. RLS on all five tables, one policy per action (change E):
   - `users`: select own row, or all if admin. No insert, update or delete for anyone through the API.
   - `fellows`: select if published, own, or admin. Insert only own. Update own, or admin (status only, by the guard). Delete own or admin.
   - `resources`: select if (published and fellow published), own, or admin. Insert/update/delete own; admin update (status only) and delete.
   - `resource_files` / `resource_media`: select if parent resource is readable. Insert/update/delete if parent is own; admin delete.
9. Grants: `anon` gets `select` only on `fellows`, `resources`, `resource_files`, `resource_media`. `authenticated` gets what the policies need. Nothing on `users` except `select`.
10. Storage: bucket `portfolio` (public, 5 MB, jpeg/png/webp only), with policies: insert/update/delete only where the first folder is your own user id. Reading public files doesn't need a policy; there is no listing policy, so nobody can list other fellows' files.

### Tests (run through the connector, inside a transaction that is rolled back, so nothing is left behind)

Test accounts are made by inserting fake rows into `auth.users`. Each role is simulated with `set local role` plus `request.jwt.claims`, the same way the real API does it.

**`users` trigger**

1. Insert an unconfirmed account → 0 `users` rows.
2. Set `email_confirmed_at` (first verification) → exactly 1 row, `id` equals the auth id, email lowercase, role `fellow`.
3. Update `last_sign_in_at` three times (later logins) → still exactly 1 row.
4. Change the email → still 1 row, email updated.
5. Insert an already-confirmed account (dashboard style) → exactly 1 row.

**Roles** (fellow A with a published page, one published and one draft resource; fellow B the same; admin; visitor)

| Check                                                    | Visitor | A            | B           | Admin                           |
| -------------------------------------------------------- | ------- | ------------ | ----------- | ------------------------------- |
| Read `users`                                             | none    | own row only | own only    | all                             |
| Insert/update/delete `users` (incl. making self admin)   | refused | refused      | refused     | refused (dashboard only)        |
| Read A's published page and resource, files, media       | yes     | yes          | yes         | yes                             |
| Read A's draft resource and its files/media              | no      | yes          | **no**      | yes                             |
| Read a draft (unpublished) fellow page and its resources | no      | own only     | no          | yes                             |
| Edit A's resource or page                                | refused | yes          | **refused** | status only; title edit refused |
| Insert a resource with `user_id` = A                     | refused | yes          | **refused** | refused                         |
| Move own resource to someone else (`user_id` change)     | —       | refused      | refused     | refused                         |
| Delete A's resource                                      | refused | yes          | **refused** | yes                             |
| Add a file/media row to A's resource                     | refused | yes          | **refused** | refused                         |
| Media row without consent; cover without consent         | —       | refused      | refused     | —                               |
| Page address `setup`, `assets`, `Bad Slug`               | —       | refused      | —           | —                               |
| Upload to `portfolio/<A id>/…`; delete from it           | refused | yes          | **refused** | refused                         |

Then: Security Advisor and Performance Advisor, fix anything they report and re-run until clean.

**You do in the dashboard for Phase 1:** nothing.
**Done when:** every test above passes, both advisors are clean, and the migration and test files are in your folder.

---

## 5. Phase 2: Site reads from Supabase

### You do first (2 minutes)

Authentication > Users > **Invite user** with `yohannankphilip@gmail.com`, then click the link in the email. (Where it lands doesn't matter; the confirmation happens on Supabase's side.) I then check that exactly one `users` row was created and make it admin.

### Files

| File                                         | New/changed                                  | What                                                                                                                                                    |
| -------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `package.json`                               | changed                                      | Adds `@supabase/supabase-js` (exact version)                                                                                                            |
| `src/config.ts`                              | changed                                      | `dataSource` (`sheet` default, or `supabase`), `supabaseUrl`, `supabasePublishableKey`. Fails with a clear message if `supabase` is chosen without them |
| `src/vite-env.d.ts`                          | changed                                      | Types for the new `VITE_*` variables                                                                                                                    |
| `.env.example`                               | changed                                      | The three new variables, with comments                                                                                                                  |
| `.env.local`                                 | new (not committed; already in `.gitignore`) | Your local URL and publishable key, which I fetch through the connector                                                                                 |
| `src/data/supabase/client.ts`                | new                                          | One `createClient(url, publishableKey)`                                                                                                                 |
| `src/data/supabase/mappers.ts`               | new                                          | Database rows → the existing `Fellow` and `Resource` types. Storage paths → public URLs; outside URLs pass through unchanged                            |
| `src/data/supabase/queries.ts`               | new                                          | `loadFellowDataset(slug)`: one embedded select returning the fellow and their published resources with files and media, in today's order                |
| `src/data/loadData.ts`                       | changed                                      | Picks the Sheet or Supabase by `config.dataSource`. Offline copy kept per fellow in Supabase mode, with the same notice                                 |
| `src/data/DataProvider.tsx`                  | changed                                      | In Supabase mode, reloads when the fellow in the address changes (e.g. going to another fellow's page)                                                  |
| `src/types.ts`                               | changed                                      | `DataOrigin` gains `'supabase'`                                                                                                                         |
| `src/components/Layout.tsx`                  | unchanged                                    | The offline notice already only checks for `'cache'`                                                                                                    |
| `src/pages/*`, `src/components/*`            | **unchanged**                                |                                                                                                                                                         |
| `scripts/import-sheet.mjs`                   | new                                          | Reads the four Sheet tabs from the public CSV with the existing parsers, then writes `import.sql` (scratch, not committed) for your user id             |
| `src/data/__tests__/supabaseMappers.test.ts` | new                                          | Row mapping, storage path vs outside URL, order of resources, files and media, missing optional fields                                                  |
| `src/data/__tests__/source.test.ts`          | new                                          | `sheet` vs `supabase` selection, the missing-settings error, cache fallback                                                                             |
| `.github/workflows/deploy.yml`               | changed                                      | Passes the three new variables to the build (unset means `sheet`, so the live site doesn't change)                                                      |

### Tests

- `npm run check` (lint, typecheck, the 28 current tests plus the new ones).
- Import check: row counts in Supabase equal the published rows in the Sheet for each tab. Every Sheet resource address opens in Supabase mode.
- Visual check: the dev server runs once with `VITE_DATA_SOURCE=sheet` and once with `supabase`. Screenshots of the home page, `/yohannan` and two resource pages (one with media, one without) at 1280 px and 375 px, side by side. They must match. I also compare the page text automatically, so small differences don't get missed by eye.
- Network check: in Supabase mode only the publishable key appears in requests. The built `dist/` folder is searched for `sb_secret`.

**Done when:** both versions match and all checks pass.

---

## 6. Phase 3: Sign-in

### You do first in the dashboard (about 15 minutes)

1. Authentication > URL Configuration: Site URL `https://yohannankphilip.github.io/fellow-portfolio/`. Redirect URLs: that address + `auth/callback`, and `http://localhost:5173/fellow-portfolio/auth/callback`.
2. Authentication > Emails > Templates: I give you the exact text for **both** "Confirm signup" (a new person's first email) and "Magic Link" (returning people). Each has the `token_hash` link and the 6-digit `{{ .Token }}` code.
3. Authentication > Providers > Email: OTP expiry 3600 seconds or less.
4. Cloudflare Turnstile: create a free widget in Cloudflare (you need a Cloudflare account), paste its secret into Authentication > Attack Protection, and give me the **site** key (public, safe to share).
5. Turn on MFA for your own Supabase account.

### Files

| File                                                   | New/changed | What                                                                                                                                             |
| ------------------------------------------------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/auth/AuthProvider.tsx`, `src/auth/authContext.ts` | new         | Session, sign in, verify code, sign out                                                                                                          |
| `src/auth/RequireAuth.tsx`                             | new         | Protects `/setup`, `/me/*` and later `/admin`. Sends people without a page to `/setup`                                                           |
| `src/pages/auth/LoginPage.tsx`                         | new         | Email → "Send me a link" → "Or type the 6-digit code". Turnstile widget                                                                          |
| `src/pages/auth/CallbackPage.tsx`                      | new         | `verifyOtp` with the `token_hash`, then `/setup` or `/me`                                                                                        |
| `src/pages/setup/SetupPage.tsx`                        | new         | Page address (checked live), name, first name, headline, intro, school, city, cohort. Photo **upload** waits for Phase 5; a photo link works now |
| `src/pages/me/MePage.tsx`                              | new         | Shell: "Your page", draft or published badge, Publish my page, View my page, Sign out                                                            |
| `src/App.tsx`                                          | changed     | New routes, placed **before** `/:fellowId` so `login`, `setup` and `me` aren't read as fellow names                                              |
| `src/styles/global.css`                                | changed     | Form styles only, in the existing tokens. Public page styles untouched                                                                           |
| `src/config.ts`, `.env.example`, `deploy.yml`          | changed     | `VITE_TURNSTILE_SITE_KEY`                                                                                                                        |
| Tests                                                  | new         | Slug check and reserved words, redirect logic (no page → `/setup`, page → `/me`), form validation                                                |

### Tests

- Unit tests above + `npm run check`.
- Real run on `localhost` with your email: new link → `/me` (you already have a page from the import). The trigger row count stays at 1 after several logins.
- The `/setup` path, tested with a second address you own that's on your Supabase team (the built-in email only reaches team members), or with a dashboard-created test account that I delete afterwards with your OK.
- Phone: open the link on your phone after asking on the laptop, and type the code instead of clicking.
- Screenshots of `/login`, the code step, `/setup`, `/me` at both widths. Public pages re-checked unchanged.

**Done when:** you can sign in on your phone and laptop, and a new account lands on `/setup` and ends with a draft page.

---

## 7. Phase 4: Switch the live site

**You do:** GitHub > Settings > Secrets and variables > Actions > **Variables** (not Secrets, since these are public values): `VITE_DATA_SOURCE=supabase`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_TURNSTILE_SITE_KEY`. Push from GitHub Desktop.

**Tests:** I screenshot the live site at both widths against the Phase 2 Sheet screenshots, and check every resource address from the Sheet.
**Going back:** set `VITE_DATA_SOURCE=sheet` and re-run the deploy action. Remember that anything fellows add in Supabase after this won't be in the Sheet.

---

## 8. Phase 5: Editor

Adds `@tanstack/react-query` (exact version) for "saved, now refresh the list".

| File                                                                        | What                                                                                                                                                                                                                                                   |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/data/supabase/mutations.ts`                                            | Save draft, publish/unpublish, delete, reorder files and media, profile save, check whether a page address is free                                                                                                                                     |
| `src/data/supabase/storage.ts`                                              | Resize in the browser (covers 1600 px, photos 600 px, media 1600 px, WebP) and upload to `portfolio/<user id>/…`; public URL                                                                                                                           |
| `src/pages/me/MePage.tsx`                                                   | My resources in the 280 px card style with Draft/Published badges, Edit and a Publish switch                                                                                                                                                           |
| `src/pages/me/ResourceEditor.tsx` (+ small parts in `src/pages/me/editor/`) | The editor in the same order as the resource page; tags; cover upload or link; files list; media list with live preview using the existing `MediaGallery`; consent tick-box on every cover and media item; unsaved-changes warning; address from title |
| `src/pages/me/ProfileEditor.tsx`                                            | Setup fields + photo upload + live `Hero` preview; warning when changing the page address                                                                                                                                                              |
| Tests                                                                       | Slug-from-title, tag input rules, resize maths, consent required before save, mutation payloads                                                                                                                                                        |

**Tests:** unit tests; RLS re-tested through the real site as A and B (B's edit attempts on A's resource fail with a clear message); you make a resource on your phone with a cover and a classroom photo, publish it and see it live. Screenshots of every editor screen at both widths.

---

## 9. Phase 6: Open to fellows

- **Needs Q1 answered.** You buy the domain if chosen and connect SMTP (I write the step-by-step for Resend or Brevo); I send test emails to Gmail and an office/school address and check spam.
- `/admin`: list of fellows and resources, Unpublish and Delete. Uses the Phase 1 rules, so admin can't rewrite.
- `docs/FELLOW-GUIDE.md`: one page, "How to add your resources", including the consent rule.
- Authentication > Rate Limits set for a cohort.
- 1 or 2 fellows first, then the rest.

## 10. Phase 7: Housekeeping

- `.github/workflows/keep-alive.yml`: one small read every 3 days.
- `.github/workflows/backup.yml`: weekly export of the public tables to JSON as a private workflow artifact (no secret key: the backup reads only what's public, plus drafts if you want them, which would need a secret stored as a GitHub **secret**; I'll ask then).
- "Delete my account" in `/me`: removes the Storage folder, then the account (needs a small database function; I'll design it then).
- **Needs Q3:** retire the Sheet, remove `VITE_DATA_SOURCE=sheet` code, `googleSheets.ts`, `schema.ts` and the Sheet docs.

---

## 11. Dashboard tasks for you, in one list

| When           | Task                                                                                |
| -------------- | ----------------------------------------------------------------------------------- |
| Before Phase 2 | Invite yourself (Authentication > Users > Invite user) and click the link           |
| Before Phase 3 | URL configuration, both email templates, OTP expiry, Turnstile, MFA on your account |
| Phase 4        | Four GitHub repository variables, then push                                         |
| Phase 6        | Domain and SMTP, rate limits                                                        |

## 12. Not changing

Public page design, components and CSS for public pages; the URLs `/:fellow` and `/:fellow/r/:resource`; the safe-URL and embed code in `src/lib/`; GitHub Pages hosting and the `404.html` fallback; your ClassTribe and other Supabase projects (only `ydwjuixkrvavlbxmvdts` is touched).
