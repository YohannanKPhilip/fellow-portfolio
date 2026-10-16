# Fellow Portfolio

A portfolio site where TFI fellows share the classroom resources they've made: lesson plans, worksheets and classroom systems. Each fellow gets their own page, and every resource has a detail page with what's inside, how it went in class, and what the fellow would change.

It's a sharing space for TFI fellows, starting with one fellow's portfolio.

- **Live data from Google Sheets.** Fellows and resources live in one Google Sheet. Edit the sheet and the site updates on the next page load, with no redeploy.
- **Many fellows.** Each fellow has a page at `/<fellow_id>`. Only rows marked `Published` appear.
- **Deploys itself.** Every push to `main` is checked and published to GitHub Pages by GitHub Actions.

## Pages

| Address                        | Shows                                                          |
| ------------------------------ | -------------------------------------------------------------- |
| `/`                            | The default fellow's page (set by `VITE_DEFAULT_FELLOW`)       |
| `/<fellow_id>`                 | A fellow's intro and resource grid. `?subject=EVS` filters it. |
| `/<fellow_id>/r/<resource_id>` | One resource in detail                                         |

## Run it on your computer

You need [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install
npm run dev
```

Open the address it prints. Without a sheet configured it shows the sample data in `src/data/sample.ts`.

To use your real sheet, copy `.env.example` to `.env.local` and fill in `VITE_SHEET_ID`.

## Commands

| Command           | Does                                      |
| ----------------- | ----------------------------------------- |
| `npm run dev`     | Local dev server with live reload         |
| `npm run build`   | Production build into `dist/`             |
| `npm run preview` | Serves the production build locally       |
| `npm run check`   | Lint, type check and tests (what CI runs) |
| `npm run format`  | Formats every file with Prettier          |

## Setup guides

1. [Put the project on GitHub and turn on the live site](docs/GITHUB-SETUP.md), written for a first-time GitHub user
2. [Set up the Google Sheet](docs/GOOGLE-SHEET.md): tabs, columns, sharing, adding a fellow
3. [How the code is organised](docs/ARCHITECTURE.md)

## Project layout

```
.github/workflows/   CI on pull requests, deploy to Pages on push to main
data-template/       Starting content for the Google Sheet (CSV per tab, plus paste/ TSVs for pasting into Sheets)
docs/                Setup and architecture guides
public/              Static files copied as-is (favicon)
scripts/             Build helpers
src/
  components/        UI pieces (hero, cards, grid, status views)
  data/              Loading data: Google Sheets reader, validation, sample data
  lib/               Small helpers (CSV parser, safe links, page title)
  pages/             One file per route
  styles/            Global styles and colour tokens
```

## Content rules

- No student faces or names in any shared file or photo.
- No emails or phone numbers in the sheet. Anyone with the link can read every tab.
- Fellows keep ownership of their resources. Decide a content licence (for example CC BY-SA 4.0) before inviting other fellows, and add a code licence (for example MIT) if you want others to reuse the code.
