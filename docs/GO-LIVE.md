# Switching the live site to Supabase (Phase 4)

Fellows' pages live at the **root** of the site, like a social profile: `https://yohannankphilip.github.io/yohannan`, not `.../fellow-portfolio/yohannan`. For that, GitHub Pages must serve the site from the root, which happens when the repository is named `yohannankphilip.github.io`. When you later move to your own domain, the same setup carries over (see the end of this file).

The code for Supabase is already in the repo. The site reads from Supabase only when `VITE_DATA_SOURCE` is `supabase`.

## Checked before this step

A production build in Supabase mode (the same build GitHub Pages serves) was compared with the Sheet version. The home page, your page and all three resource pages, plus the "doesn't exist" pages, are **byte-identical**. A signed-out visitor to `/me` is sent to `/login`. The build contains only the publishable key.

## Steps, in this order

**1. Rename the repository.** GitHub > the repository > **Settings** > **General** > **Repository name** > `yohannankphilip.github.io` > **Rename**.

- GitHub forwards the old repository address, so GitHub Desktop keeps working. If it ever asks, point the remote at `https://github.com/YohannanKPhilip/yohannankphilip.github.io`.
- **The old site address `.../fellow-portfolio/...` stops working.** Any link you already shared with that prefix will break.
- You only get one `<username>.github.io` site per account. Check you don't already have a repository with that name.

**2. Commit and push** the Phase 1 to 4 changes in GitHub Desktop. The build now uses `/` as the base path by default. If the Actions run is red, tell me what it says.

**3. Remove an old base-path variable, if you set one.** Settings > Secrets and variables > Actions > **Variables**. If `VITE_BASE` exists with `/fellow-portfolio/`, delete it (or set it to `/`).

**4. Check Pages is set to Actions.** Settings > **Pages** > Source: **GitHub Actions**.

**5. Update Supabase** (Authentication > URL Configuration), as in `docs/AUTH-SETUP.md` step 1:

- Site URL: `https://yohannankphilip.github.io/`
- Redirect URLs: `https://yohannankphilip.github.io/auth/callback` and `http://localhost:5173/auth/callback`

**6. Set the variables.** Same page as step 3, **Variables** tab (not Secrets). Add:

| Name                            | Value                                            |
| ------------------------------- | ------------------------------------------------ |
| `VITE_DATA_SOURCE`              | `supabase`                                       |
| `VITE_SUPABASE_URL`             | `https://ydwjuixkrvavlbxmvdts.supabase.co`       |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_CkkENHq0UlLDQFO3TvXkYg_ThV4Aa_k` |

Leave `VITE_SHEET_ID` and `VITE_DEFAULT_FELLOW` as they are. Do **not** add the secret key anywhere.

**7. Deploy.** Actions > **Deploy to GitHub Pages** > **Run workflow** (variables are only read when the site is built).

**8. Check the live site.** Open `https://yohannankphilip.github.io/yohannan`, each resource page, and `https://yohannankphilip.github.io/login`.

## Going back to the Sheet

Set `VITE_DATA_SOURCE` to `sheet` (or delete it) and re-run the deploy. Anything added in Supabase after the switch is not in the Sheet.

## What is live after this step

- Public pages read from Supabase.
- `/login` exists on the live site. Sign-up is open to anyone, but the built-in email only delivers to your Supabase team, so other people can't get a link until custom SMTP is connected (Phase 6). There is no bot check yet (Turnstile, `docs/AUTH-SETUP.md` step 4).
- Fellows can't add resources yet. That is the editor (Phase 5).
- The Sheet is no longer edited by anyone, so changes to your resources now happen in Supabase (for now through the dashboard or SQL) until the editor exists.

## Later: your own domain

1. Buy the domain, then Settings > **Pages** > **Custom domain** and follow GitHub's DNS instructions. GitHub adds a `CNAME` file by itself when using the Actions source.
2. Supabase: change the Site URL and the redirect URL to the new domain, and keep `localhost`.
3. Nothing else changes in the code (`VITE_BASE` stays `/`). Pages are then `yourdomain/yohannan`.
4. Use the same domain as the sender for sign-in emails (Phase 6).
