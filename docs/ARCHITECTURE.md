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

The router is a data router (`createBrowserRouter` in `src/App.tsx`), which is what lets `<Link viewTransition>` animate page changes. `RootLayout` holds what every page shares (sign-in, data, page frame, `ScrollRestoration`).

## Motion

The design is "one quiet sheet", so motion explains what changed and then gets out of the way. No animation library: it is CSS plus the browser's View Transitions, so browsers without them just switch instantly.

- **Tokens** in `:root` (`global.css`): `--dur-fast` 120ms, `--dur` 200ms, `--dur-slow` 320ms, `--ease-out`. Use these, not new numbers.
- **Keyframes:** `fade`, `rise` (6px) and `pop` (4px, 98%). Entrances fill `backwards` so a delayed item stays hidden until its turn.
- **Page changes:** `<Link viewTransition>` crossfades the old and new page (same length and curve, so brightness never dips). A card's cover and the resource page's cover share the name `resource-cover`, set through `useViewTransitionState`, so the cover grows and shrinks between them. Cards on a resource page pass `morph={false}` so the name is never on two elements at once.
- **Layout changes:** `withViewTransition` (`src/lib/motion.ts`) wraps a state update. The page builder uses it for adding, moving, copying and removing sections, and for theme changes. Per-section names (`--vt-name`) apply only while `data-vt` is set on `.builder__page`.
- **After a skeleton:** `useRevealAfterLoad` adds `.reveal`, which staggers the hero, headings and cards in. Pages that open with their data already there are not animated twice.
- **Filters:** changing a subject filter replays the card stagger (`.grid--rise`), 30ms apart, capped at eight.
- **Menus, panels and dialogs** ease in with `pop`. They close at once on purpose.
- **Reduced motion:** a single `prefers-reduced-motion` block in `global.css` shortens every animation and transition to nothing and switches off view transitions. `withViewTransition` also skips the transition.
- **Not used, on purpose:** scroll-triggered reveals, parallax, springs or bounce, hover tilts, confetti, exit animations, and background textures or gradients (surfaces stay flat).

## Safety

- Links from the sheet go through `safeUrl`, which allows only `http(s)`, so a cell can't inject `javascript:` links.
- All sheet text is rendered as text by React, never as HTML.
- External links open with `rel="noopener noreferrer"`.

## Quality checks

`npm run check` runs ESLint, TypeScript in strict mode and Vitest. CI also checks formatting and runs a production build. Tests cover the CSV parser, validation rules, link handling, the Sheets loader (with a mocked network) and the sample data.
