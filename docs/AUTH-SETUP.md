# Sign-in setup (Supabase dashboard)

Do these in the Supabase dashboard for the **fellow-portfolio** project
(https://supabase.com/dashboard/project/ydwjuixkrvavlbxmvdts). Steps 1 to 3 are needed for sign-in to work. Step 4 can wait until before you invite other fellows. Step 5 is a good habit now.

## 1. URL configuration (needed)

Authentication > **URL Configuration**

- **Site URL**: `https://yohannankphilip.github.io/`
- **Redirect URLs** (add both):
  - `https://yohannankphilip.github.io/auth/callback`
  - `http://localhost:5173/auth/callback`

Save. The sign-in link in the email goes to the address the site asks for, and Supabase refuses any address not in this list.

## 2. Email templates (only after custom SMTP, Phase 6)

> Supabase does not let you edit email templates until a custom SMTP service is connected. **Skip this step while testing.** The default email still works: its link goes through Supabase and returns to `/auth/callback`, which the site handles. The only differences are that the default email has no 6-digit code, and the link can be used up by an email scanner. Set up the templates below when you connect SMTP.

Authentication > **Email Templates**. Edit **both** "Confirm signup" (a new person's first email) and "Magic Link" (returning people). Give both the same subject and body.

**Subject:** `Your Fellow Portfolio sign-in link`

**Body** (switch to the source/HTML view and paste):

```html
<p>Click to sign in to Fellow Portfolio:</p>
<p><a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email">Sign in</a></p>
<p>Or type this code on the sign-in page: <strong>{{ .Token }}</strong></p>
<p>
  The link and the code work once and expire in 1 hour. If you didn't ask for this, you can ignore
  this email.
</p>
```

Why this shape:

- The link carries a `token_hash`, so it works on **any device**: ask on a laptop, open the email on a phone. (A default link only works in the browser that asked for it.)
- The 6-digit code is the fallback when an email scanner opens and uses up the link before the person does.
- Short and plain, with no marketing text, so it is less likely to land in spam.

## 3. Expiry (needed)

Authentication > **Sign In / Providers** > **Email**

- **Email OTP expiration**: `3600` seconds (1 hour) or less.
- Leave **Confirm email** on.

## 4. Bot protection with Cloudflare Turnstile (before other fellows join)

Sign-up is open to anyone, so a form that scripts can fill in is a risk. Turnstile is free and usually invisible.

1. In Cloudflare, go to **Turnstile** > **Add widget**. Hostnames: `yohannankphilip.github.io` and `localhost`. Mode: **Managed**.
2. Copy the **Secret key** into Supabase: Authentication > **Attack Protection** > **Enable CAPTCHA protection** > provider **Cloudflare Turnstile**.
3. Give me the **Site key** (this one is public). I add it as `VITE_TURNSTILE_SITE_KEY` in `.env.local` and in the GitHub repository variables.

**Order matters:** once CAPTCHA protection is switched on in Supabase, sign-in without the widget fails. Do step 3 (site key in the site) and step 2 together, or switch it on last.

## 5. Your own account

Turn on multi-factor authentication for your own Supabase login (supabase.com > Account > Security). That account controls everything.

## Check it worked

Run the site locally and sign in with your email (see `docs/DATABASE.md`). The email should arrive within a minute, and the link should open `/auth/callback` and then take you to `/me`.

If you get "Email address not authorized", the built-in email only delivers to members of your Supabase team. That is expected until a real email service (SMTP) is set up in Phase 6.
