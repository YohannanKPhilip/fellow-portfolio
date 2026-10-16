# Architecture

A static React app. It's built once by GitHub Actions and reads its content from a Google Sheet in the visitor's browser.

```
Google Sheet ──CSV per tab──▶ src/data/googleSheets.ts ──rows──▶ src/data/mappers.ts
                                                                    │ validated Dataset
                                                                    ▼
                                         src/data/DataProvider.tsx (loads once per visit)
                                                                    │
                                              pages/FellowPage, pages/ResourcePage
```

## Data layer (`src/data`)

- `schema.ts`: tab names, column names and the ID rule. This is the contract with the sheet.
- `googleSheets.ts`: fetches each tab as CSV from the public `gviz` endpoint. A private sheet returns an HTML sign-in page, which is caught and turned into a clear error.
- `mappers.ts`: turns raw rows into typed `Fellow` and `Resource` objects. It keeps only `Published` rows, rejects bad or duplicate IDs, and attaches files in order.
- `loadData.ts`: picks the source. With no sheet ID it uses sample data. Otherwise it reads the live sheet and saves a copy in the browser, which it falls back to if the sheet is unreachable.
- `DataProvider.tsx` and `dataContext.ts`: share the loaded data with every page.

The UI never talks to Google directly. To move to a database later, such as Supabase once fellows log in and upload, write a new loader that returns the same `Dataset` and switch to it in `loadData.ts`. Pages and components stay the same.

## Routing

`react-router-dom` with real paths (`/yohannan/r/...`). GitHub Pages has no server routing, so `scripts/spa-fallback.mjs` copies `index.html` to `404.html`. Any deep link then loads the app, which reads the address and shows the right page. `VITE_BASE` sets the path prefix (`/` when the repo is named `<user>.github.io` or uses a custom domain).

## Safety

- Links from the sheet go through `safeUrl`, which allows only `http(s)`, so a cell can't inject `javascript:` links.
- All sheet text is rendered as text by React, never as HTML.
- External links open with `rel="noopener noreferrer"`.

## Quality checks

`npm run check` runs ESLint, TypeScript in strict mode and Vitest. CI also checks formatting and runs a production build. Tests cover the CSV parser, validation rules, link handling, the Sheets loader (with a mocked network) and the sample data.
