# Testing the signed-in pages

## The permanent test fellow

There is one test account in the `fellow-portfolio` Supabase project, kept for every test so no account has to be created or deleted each time.

| What     | Value                                                              |
| -------- | ------------------------------------------------------------------ |
| Email    | `test-fellow@fellow-test.invalid` (`.invalid` can never get email) |
| Password | in `.env.local` as `TEST_FELLOW_PASSWORD` (git-ignored, not here)  |
| Page     | `/test-fellow`, kept **hidden** (draft), so visitors never see it  |
| Role     | `fellow`                                                           |

Magic links can't reach a `.invalid` address, so the test signs in with the password, in the browser console of the running dev site:

```js
const { getClient } = await import('/src/data/supabase/client.ts');
await getClient().auth.signInWithPassword({
  email: 'test-fellow@fellow-test.invalid',
  password: '…',
});
```

Rules:

- Use only this account for tests. Never use a real fellow's account.
- Test resources may stay between tests, but remove ones that are no longer needed, and never upload photos of real students.
- If a test publishes the page or a resource, set it back to hidden afterwards.
- Before going live (see `GO-LIVE.md`), decide whether to keep or delete this account.

## The other checks

- `npm run check`: types, lint and unit tests.
- `npm run format:check`: formatting (CI runs it).
- Public pages unchanged: the SHA-256 of each public page's `<main>` must match the saved hashes (`/yohannan`, three resource pages, `/nobody`, `/login`).
- `supabase/tests/phase1_roles.sql`: database rules, run in a transaction that is rolled back.
