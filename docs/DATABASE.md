# Database reference

Supabase project `fellow-portfolio` (`ydwjuixkrvavlbxmvdts`, ap-south-1). Built in Phase 1.
The migration is `supabase/migrations/20261016000000_phase1_schema.sql`, exactly as applied.
The design and reasons are in `docs/SUPABASE-PLAN.md`; the build order is in `docs/BUILD-PLAN.md`.

## Tables

| Table            | What                                    | Notes                                                                                                     |
| ---------------- | --------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `users`          | One row per confirmed account (private) | `id` = `auth.users.id`. Written only by the trigger. `role` is the enum `user_role` (`fellow` or `admin`) |
| `fellows`        | A fellow's public page                  | One per user. `status` starts as `draft`. Reserved addresses are refused                                  |
| `resources`      | A fellow's resources                    | `status` starts as `draft`. `published_at` is set the first time it's published                           |
| `resource_files` | "What's inside"                         | Links must be `https://`                                                                                  |
| `resource_media` | "In the classroom"                      | `consent_confirmed` must be true, or the row is refused                                                   |

A cover image needs `cover_consent_confirmed = true`. Image fields accept an `https://` link or a Storage path `<user id>/...`.

## Who can do what

| Table                      | Visitor                                 | Signed-in fellow                             | Admin                                      |
| -------------------------- | --------------------------------------- | -------------------------------------------- | ------------------------------------------ |
| `users`                    | nothing                                 | read own row                                 | read all; nobody can write through the API |
| `fellows`                  | published pages                         | read published + own; create/edit/delete own | read all; change `status` only; delete     |
| `resources`                | published, on a published page          | read the same + own; create/edit/delete own  | read all; change `status` only; delete     |
| `resource_files`, `_media` | those of resources the visitor can read | same + create/edit/delete on own resources   | read all; delete                           |
| Storage bucket `portfolio` | view a file by its address (no listing) | upload, replace, delete in `<own user id>/`  | same as a fellow                           |

The "status only" rule for admin is enforced by a database trigger (`private.guard_admin_edit`), not only by the site.

## The sign-up trigger

`private.handle_confirmed_user()` runs on `auth.users`:

- **on insert**, only if the account is already confirmed (for example, created from the dashboard);
- **on update of `email_confirmed_at` or `email`**, only when `email_confirmed_at` goes from empty to set (the first verification) or the email changes.

Later logins only change `last_sign_in_at`, so neither fires. `on conflict (id)` prevents duplicates. If the function ever fails it logs a warning instead of blocking the sign-in.

## Making someone an admin

Roles can only be set from the dashboard SQL editor. After the person has signed in once:

```sql
update public.users set role = 'admin' where email = 'yohannankphilip@gmail.com';
```

## Running the tests

Open `supabase/tests/phase1_roles.sql`, run the whole file in the SQL editor (or through the connector), and check that every row has `pass = true`. It runs in one transaction that is rolled back, so it leaves no data behind. Run it again after every migration, then run both advisors (Dashboard > Advisors).

## Known gaps in the tests

- Storage deletes and replacements by SQL are blocked by Supabase itself ("use the Storage API"), so the delete/replace-in-another-folder checks prove the block, not our folder policy. Our folder policy is proven for **uploads** (inserts). Delete/replace are re-tested through the real Storage API in Phase 5 with two real accounts.
- The tests simulate roles in SQL. The real sign-in path (email link, `verifyOtp`) is tested in Phases 2 and 3.

## After changing the schema

1. Add a new file in `supabase/migrations/` and apply it.
2. Regenerate `src/data/supabase/database.types.ts`.
3. Re-run the tests and both advisors.
