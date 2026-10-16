# Database reference

Supabase project `fellow-portfolio` (`ydwjuixkrvavlbxmvdts`, ap-south-1). Built in Phase 1.
The migration is `supabase/migrations/20261016000000_phase1_schema.sql`, exactly as applied.
The design and reasons are in `docs/SUPABASE-PLAN.md`; the build order is in `docs/BUILD-PLAN.md`.

## A page: `page` and `theme`

A fellow's whole page is **one JSON document**, `fellows.page`: an ordered list of sections (the top of the page, lists of resources, later links and more). It replaced the separate headline, status, intro and `hero` columns. See `docs/PAGE-BUILDER-PLAN.md`. `fellows.theme` holds the page style (accent color, background, headline font). Both are checked by the database (`private.valid_page`, which uses `private.valid_hero` for the top-of-page section, and `private.valid_theme`), so only fixed colors, sizes and shapes are accepted: no HTML or CSS can be stored.

```json
{
  "v": 1,
  "blocks": [
    {
      "type": "headline",
      "size": "l",
      "runs": [{ "t": "Hi, I'm " }, { "photo": true }, { "t": " Priya!" }]
    },
    {
      "type": "headline",
      "runs": [{ "t": "TFI Fellow.", "c": "accent" }, { "pill": "Teaching in Pune" }]
    },
    { "type": "text", "runs": [{ "t": "I teach Grade 5." }] }
  ]
}
```

- `size`: `s`, `m` (default), `l`. `c`: `muted`, `accent`, `blue`, `green`, `pink`, `purple`, `teal`.
- Limits: 10 blocks (6 big lines, 4 paragraphs), 16 runs per block, 2000 characters in all, one photo, one pill.
- The photo itself is `fellows.photo_path`; `{ "photo": true }` only says where it appears.
- `theme`: `{ "accent": "orange|blue|green|pink|purple|teal", "background": "auto|light|dark|warm", "font": "modern|friendly|classic" }`. Empty means the site's default look.

The example above is the hero section's `blocks`. The sections of a page are:

| Type        | Fields                                                                                                                                                                                                                                                                                             |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `hero`      | `id`, `blocks` (above). At most one per page.                                                                                                                                                                                                                                                      |
| `resources` | `id`, optional `title` (up to 8 colored pieces), `subtitle`, `filter` (`subjects`, `tags`), `showFilters`, `sort` (`oldest` or `newest`), `limit`                                                                                                                                                  |
| `links`     | `id`, optional `title`, `items`: up to 12 of `{ "label": 1 to 60 characters, "url": https only, no spaces, up to 500 characters }`. A link may also have `image` (`<user id>/links/<name>`, in the page owner's own folder), `blurhash`, and `consent: true`, required whenever there is an image. |

**Every new fellow starts with a page.** A trigger (`fellows_default_page`, `private.fill_default_page`) fills `page` on insert when none is sent: the hero ("Hi, I'm [photo] Name!") followed by an "all resources" section, which is the layout the site has always had. The sign-up screen still sends the starter layout the fellow picked, and a page that is sent is kept as it is. `page` is `not null`. The checks are in `supabase/tests/links_and_default_page.sql`.

## Tables

| Table            | What                                    | Notes                                                                                                                           |
| ---------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `users`          | One row per confirmed account (private) | `id` = `auth.users.id`. Written only by the trigger. `role` is the enum `user_role` (`fellow` or `admin`)                       |
| `fellows`        | A fellow's public page                  | One per user. `status` starts as `draft`. Reserved addresses are refused. Headline, status and intro live in `hero` (see above) |
| `resources`      | A fellow's resources                    | `status` starts as `draft`. `published_at` is set the first time it's published                                                 |
| `resource_files` | "What's inside"                         | Links must be `https://`                                                                                                        |
| `resource_media` | "In the classroom"                      | `consent_confirmed` must be true, or the row is refused                                                                         |

A cover image needs `cover_consent_confirmed = true`. Image fields accept an `https://` link or a Storage path `<user id>/...`.

### Blurhash

Every uploaded picture keeps a [blurhash](https://blurha.sh) next to its path: `fellows.photo_blurhash`, `resources.cover_blurhash` and `resource_media.blurhash` (media also keeps `ratio`, width / height). The browser makes it at upload time (`src/lib/image.ts`, 4 x 3 to 4 x 4 components, 28 to 36 characters) and draws it as the `<img>`'s background while the picture loads (`src/components/BlurImg.tsx`). It is optional: pictures uploaded before it existed, and outside links, have none and load as before. The site only uses a blurhash that sits next to a Storage path and passes `isBlurhash`; the database refuses anything that isn't 6 to 166 base 83 characters (`private.valid_blurhash`) or a `ratio` outside 0.1 to 10.

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
