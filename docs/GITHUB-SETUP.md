# Putting the project on GitHub

This is a one-time setup. Afterwards, every change you push goes live on its own in about two minutes.

You'll end up with a site at `https://<your-username>.github.io/fellow-portfolio/`.

## 1. Create a GitHub account

Go to [github.com/signup](https://github.com/signup) and create an account. Your username becomes part of your site address, so pick one you're happy to share.

## 2. Install GitHub Desktop

[GitHub Desktop](https://desktop.github.com) is the simplest way to upload code without using the command line. Install it and sign in with your new account.

## 3. Add this project

1. In GitHub Desktop, choose **File > Add local repository**.
2. Pick the `fellow-portfolio` folder.
3. It's already a Git repository with a first commit, so it opens straight away.

## 4. Publish it to GitHub

1. Click **Publish repository**.
2. Keep the name `fellow-portfolio`.
3. Untick **Keep this code private** if you want a free GitHub Pages site. (Private repos need a paid plan for Pages.)
4. Click **Publish repository**.

## 5. Turn on GitHub Pages

1. Open the repository on github.com.
2. Go to **Settings > Pages**.
3. Under **Build and deployment**, set **Source** to **GitHub Actions**.

## 6. Connect your Google Sheet

1. Still in **Settings**, open **Secrets and variables > Actions**, then the **Variables** tab.
2. Click **New repository variable** and add:

| Name                  | Value                                                                                    |
| --------------------- | ---------------------------------------------------------------------------------------- |
| `VITE_SHEET_ID`       | The long ID from your sheet's address: `docs.google.com/spreadsheets/d/<this part>/edit` |
| `VITE_DEFAULT_FELLOW` | `yohannan`                                                                               |

These aren't secrets. The sheet ID ends up in the public site, which is fine because the sheet is view-only.

## 7. Run the first deploy

1. Go to the **Actions** tab.
2. Open **Deploy to GitHub Pages** and click **Run workflow**.
3. When it turns green, your site is live at `https://<your-username>.github.io/fellow-portfolio/`.

From now on, every push to `main` deploys automatically.

## Day-to-day

- **Changing resources or your profile:** edit the Google Sheet. No deploy needed.
- **Changing the design or code:** edit the files, then in GitHub Desktop write a short summary, click **Commit to main**, then **Push origin**.

## If something goes wrong

| What you see                         | What to do                                                                                 |
| ------------------------------------ | ------------------------------------------------------------------------------------------ |
| The Actions run is red               | Open it and read the failing step. `npm run check` on your computer shows the same errors. |
| The site says it couldn't read a tab | The sheet isn't shared as **Anyone with the link can view**, or a tab name was changed.    |
| The site shows sample data           | `VITE_SHEET_ID` isn't set. Add it (step 6) and run the deploy again.                       |
| Pages 404 straight after setup       | Wait two minutes, and check that **Source** is **GitHub Actions** (step 5).                |
