I'm continuing work on **Fellow Portfolio**, my site where TFI fellows share classroom resources. We're moving it from Google Sheets to Supabase. Please make a detailed build plan for the work below first, check it with me, and only then start building.

## Where things are

- **Code:** React + Vite + TypeScript, deployed to GitHub Pages. Repo: https://github.com/YohannanKPhilip/fellow-portfolio. My local copy, the source of truth, is `C:\Users\Yohannan K Philip\Documents\build\T resource\T resource\fellow-portfolio`. I commit and push with GitHub Desktop.
- **Plan:** read `docs/SUPABASE-PLAN.md` in that folder first. A copy is in this Claude project as `claude/supabase-migration-plan.md`. It covers sign-in, tables, Row Level Security, Storage, routes, the editor, the data move, the free-plan limits, the security checklist and the phases.
- **Supabase project:** `fellow-portfolio`, ref `ydwjuixkrvavlbxmvdts`, region ap-south-1. The Supabase connector has access and the database is still empty. Don't use my other Supabase projects; ClassTribe holds student data.
- **Current data:** Google Sheet `1SuHv0vo_1yoN4VO6zY7mOK68f4W07HB28aGDoCIzTLI`, with tabs `fellows`, `resources`, `files` and `media`. The site reads it through the public gviz CSV endpoint. The code for this is in `src/data/` (`schema.ts`, `mappers.ts`, `googleSheets.ts`, `loadData.ts`), and the types are in `src/types.ts`.
- **State of the code:** the latest design work is committed in my folder: full-screen hero, 280px home cards with a 120px cover strip, and "More from [photo] [first name]". `npm run check` runs lint, typecheck and 28 Vitest tests, and all pass.

## Decisions already made

- Sign-in is by email link only (magic link). The plan adds a 6-digit code as a fallback.
- There's no approval step. A fellow's own Publish button is final.
- Each fellow keeps their own page, at `/:fellow` and `/:fellow/r/:resource`.
- There's no search across fellows for now.
- Sign-up is open to anyone, with no invite list and no `allowed_emails` table.
- There's a `users` table. When someone confirms their email, a trigger on `auth.users` inserts their row with `id` = their auth user id (`auth.uid()`). `fellows` (the public page) references `users(id)`.
- Use the new publishable and secret keys, not the legacy anon and service_role keys. The secret key never goes into the site, the repo or GitHub.

## Still open

Ask me about these before the phases that depend on them:

1. Who sends the sign-in emails: my own domain with Resend or Brevo, or a temporary sender? Supabase's built-in email only reaches its team members.
2. Should a fellow's page stay hidden until they publish it?
3. Should the Google Sheet stay as a backup after the switch?

## What I want in this chat

1. Read the plan and the current code, then give me the build plan: phases, files to create or change, the order of work, what I have to do in the dashboard and when, and how each phase gets tested.
2. After I approve, start with Phase 1, the database. Apply it as a migration, run the Security Advisor, and test it for a visitor, fellow A, fellow B and an admin. Include the `users` trigger: an unconfirmed sign-up creates no row, and confirming creates exactly one.
3. Keep the public pages looking exactly as they do now. Keep a setting (`VITE_DATA_SOURCE=sheet|supabase`) so I can switch back to the Sheet until we retire it.

## Working notes

- Edit files in my folder directly. When you change something, show me screenshots at desktop and phone width.
- Git in my folder can't delete its own lock files unless I allow deletes, so either ask for delete permission or leave committing to me in GitHub Desktop.
- Plans and docs as markdown, please, not Word files.
- Students' faces and names never appear without consent. The plan has a consent tick-box for photos.
