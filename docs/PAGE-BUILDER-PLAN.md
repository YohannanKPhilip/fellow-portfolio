# Page builder plan: editing the fellow's real homepage

Status: **plan for review. Nothing in this plan is built yet.**

## 1. The mindset

A fellow's page is not a profile form. It is a **website they build**: a stack of **sections** (widgets) on one page, in an order they choose. They edit it **on the page itself**, the way they'd edit a site in a website builder: click the text and type, click a picture to change it, add a section, move it up or down, style the whole page.

Everything they can edit is a section of one of a few **types**. Today there are two (the hero and a list of resources). More are added later (links, text, image, video) without redesigning anything.

```
Fellow page  =  theme  +  ordered list of sections
                          ├─ hero        big lines, photo chip, status pill, intro
                          ├─ resources   a titled, optionally filtered set of resource cards
                          ├─ resources   (another one, e.g. only "SEL")
                          └─ later: links, text, image, video, contact …
```

Three examples this has to support from day one:

1. Hero first, then "Maths" resources (filtered to subject Maths), then "SEL" resources (filtered to SEL).
2. A fellow who wants a plain page: hero and one list of everything.
3. Later: hero, a links section, then resources.

## 2. What stays and what changes

**Reused as it is:** the hero editor (TipTap), the page theme (accent, background, font), the resource data layer, picture upload and resizing, the consent rule, the starters in first-time setup, and the public page look.

**Changes:**

| Today                                           | After                                                                           |
| ----------------------------------------------- | ------------------------------------------------------------------------------- |
| `/<username>/me/profile`, a "profile" form page | `/<username>/edit`, the real page in edit mode                                  |
| Details (name, address, school…) mixed into it  | A separate **Settings** page, `/<username>/settings`                            |
| Resource form at `/<username>/me/r/<resource>`  | The real resource page in edit mode, `/<username>/r/<resource>/edit`            |
| `fellows.hero` column holds only the top        | `fellows.page` holds the whole section list, with the hero as the first section |
| Public page layout is fixed in code             | Public page is drawn from the section list (default looks identical)            |

## 3. Addresses

One rule: **add `/edit` to any of your own public pages to edit it.** Only the owner can open it; anyone else is sent to the public page.

| Address                         | What                                                                                                                                  | Who       |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| `/<username>`                   | Public page (unchanged). The owner also sees a small "Edit" button here                                                               | everyone  |
| `/<username>/edit`              | The page builder: the homepage in edit mode                                                                                           | owner     |
| `/<username>/r/<resource>`      | Public resource page (unchanged)                                                                                                      | everyone  |
| `/<username>/r/<resource>/edit` | The resource page in edit mode                                                                                                        | owner     |
| `/<username>/r/new/edit`        | A new resource, edited in place                                                                                                       | owner     |
| `/<username>/settings`          | Details, visibility (publish or hide the page), account                                                                               | owner     |
| `/<username>/me`                | Home for the owner: **Edit page**, **Settings**, and the library of all resources (drafts included, since drafts have no public page) | owner     |
| `/login`, `/setup`, `/me`       | As now. `/me` forwards to `/<username>/me`                                                                                            | signed in |

`edit`, `settings` and `new` are reserved words, so no fellow or resource can take them as an address.

## 4. How a page is stored

One JSON document, `fellows.page`, next to `fellows.theme`:

```json
{
  "v": 1,
  "sections": [
    { "id": "a1…", "type": "hero", "blocks": [ …the hero document we already have… ] },
    { "id": "b2…", "type": "resources",
      "title": [ { "t": "Maths ", "c": "accent" }, { "t": "from my class" } ],
      "filter": { "subjects": ["Maths"], "tags": [] },
      "showFilters": false, "sort": "newest", "limit": null },
    { "id": "c3…", "type": "resources", "title": [ { "t": "SEL" } ], "filter": { "subjects": ["SEL"] } }
  ]
}
```

- **Safe by construction, like the hero today.** Only known section types, known fields, fixed colors and sizes. No HTML or CSS can be stored. The database checks the shape (`private.valid_page`), and the site drops anything unexpected when it draws the page.
- **Limits:** at most 20 sections, bounded text, bounded filter lists.
- **Filters use the resource's own subject and tags**, so "show Maths here" keeps working as the fellow adds Maths resources. A resource that matches two sections appears in both (see decision 3).
- **Migration:** your page becomes `[hero, resources(all)]`, which draws exactly what you see today. The `hero` column is then removed. A page with no `page` value draws that default.
- The Sheet mode builds the same default document, so both data sources go through one renderer.

### Adding a new widget later (how the Links widget was built)

Phase E added **Links** this way, so the same recipe works for text, image, video and so on. Seven small steps:

1. **Database.** A migration that teaches `private.valid_page` the new type (`supabase/migrations/…_links_section.sql` is the model): the allowed fields, their limits, and https-only addresses. Add a check file under `supabase/tests/`.
2. **Shape.** In `src/lib/page.ts`: the type (`LinksSection`), add it to the `Section` union, limits in `PAGE_LIMITS`, a `default…Section()`, a `parse…Section()` called from `parsePage` (drops anything unexpected), and small editing helpers (`setLink`, `moveLink`, `removeLink`). Unit tests in `src/lib/__tests__/`.
3. **Public view.** A component like `src/components/LinksSectionView.tsx`, and one line in `src/pages/FellowPage.tsx` to draw it.
4. **Editor.** A component like `src/components/editor/LinksSectionEditor.tsx`. Use `TitleEditor` for the heading and `Dialog` for adding and editing one item.
5. **Builder.** In `src/pages/edit/PageBuilder.tsx`: a `LABEL`, the editor in the section body, the entry in the "Add section" menu, and what `addSection` creates.
6. **Styles.** In `src/styles/global.css`.
7. **Check.** `npm run check`, the public-page hash check, and the signed-in test (see `docs/TESTING.md`).

The shell (add, move, duplicate, delete, save, undo) needs no change.

**Built (Phase E).** `links`: a heading and up to 12 links, each a name and an https address (a missing `https://` is added for the fellow; `http://` becomes `https://`). Public: cards showing the name and the site (`youtube.com ↗`) that open in a new tab. Editor: the same cards; a card opens a small window to change, move earlier or later, or remove it; an "Add a link" card adds one. A section with no links is hidden from visitors. **Pictures on links:** a YouTube link shows its thumbnail automatically (the same way classroom videos do); any link can instead have a picture the fellow uploads (stored in `<user id>/links/…`, shrunk to 800 px, with a blurhash). An uploaded picture needs the consent tick, and the database refuses a link picture without `consent: true`, outside the fellow's own `links` folder, or from another user's folder (`private.valid_links`, `private.page_images_owned`). Pictures that are replaced, removed or abandoned are deleted when the page is saved. Automatic previews for other websites (their share image) are not built: browsers can't read other sites' pages, so that needs a small server function (an Edge Function that fetches the page when the link is saved, refuses internal addresses, limits size, and copies the picture into our own storage). That is the planned next step if wanted. Every new account starts with the top of the page and a resources section (filled by the database, see `docs/DATABASE.md`); until it has resources, the editor shows "Your resources will appear here" with a link to the fellow's resources.

Each widget type is one small module with four parts: its **shape** (and database check), its **renderer** (public), its **editor** (in place), and its **settings panel**. A `links` widget, for example, is `{ type: "links", title, items: [{ label, url }] }` plus a list-of-links renderer and an "add, reorder, remove link" editor. The page builder shell (add, move, delete, duplicate, save, undo, preview) does not change.

## 5. How editing works

### Page builder (`/<username>/edit`)

The page looks exactly as visitors see it. On top of it:

- **Top bar:** ← Back, the page name, **Undo / Redo**, **Desktop / Phone** preview toggle, **Style** (accent, background, font, as built today), **Settings**, **Save**. Save is disabled until something changes; leaving with unsaved changes asks first.
- **Sections:** hovering (or tapping) a section shows a slim handle bar: **↑ ↓** move, **⚙** section settings, **duplicate**, **delete**. Between sections is a **+ Add section** line that opens a picker of widget types, each with a one-line description and a small preview.
- **Hero section:** click any text and type. A **floating toolbar appears above the text you're editing** (size, colors, + photo, + status, + paragraph), instead of a fixed bar at the top. Click the photo chip to upload, replace or remove it.
- **Resources section:**
  - the heading is edited in place, like hero text;
  - **⚙ settings** open a side panel (a bottom sheet on phones): which resources (all, or by subject, or by tag, chosen from the fellow's own subjects and tags), show the subject filter chips on or off, order (newest or oldest first), and how many to show;
  - cards show an **edit pencil on hover** that opens that resource in place;
  - a dashed **+ Add resource** card at the end of the section creates a new draft (with the section's subject filled in).
- **Phone:** the section controls move to a bottom bar when a section is selected, so everything works with a thumb.

### Resource page (`/<username>/r/<resource>/edit`)

Same idea, on the real resource page: the title, summary, description and facts (grade, length) are edited where they appear; the subject is a pill you type into; tags are chips with a "+ Add a tag" box; the cover picture and classroom photos are uploaded in their own cards in the same place they sit on the page; "What's inside" files and the Drive link are edited in the side card; the consent tick-box appears on the cover and on each photo or video. A bar at the top offers **Save draft, Publish, Unpublish, Delete, View**. The consent rule and all limits stay.

**Built (Phase D).** The editor is `src/pages/edit/ResourceBuilder.tsx`, with `InlineText` (text that looks like the page text and grows as you type) and `ListFields` (files, classroom media) in `src/components/editor/`. `/<username>/r/new/edit` creates a resource; after the first save the address becomes `/<username>/r/<slug>/edit`. The dashboard's "Add a resource" and each card's pencil go here, and a fellow viewing their own resource page sees a floating "Edit resource" button (nobody else does, so public pages are unchanged). The old form at `/<username>/me/r/<resource>` is gone. On a phone the top bar scrolls with the page instead of sticking.

**Simplified after testing as a fellow (16 Oct 2026).** The first version still felt like a form. Now: the cover is one big picture slot (click or drop a photo; always uploaded, no pasted link; Change and Remove once filled); "In the classroom" is a gallery of small tiles with an "Add" tile, and each tile opens one window (`Dialog`, `MediaEditor`) with upload or paste-a-link, caption, the consent tick, and move or remove; files are compact name and link rows; character counts only appear near the limit; the page address is folded under "Advanced". The hidden file picker no longer makes the page scroll sideways.

**"What's inside" is names only (16 Oct 2026).** The fellow already shares one Drive link, so per-file links were repeated work. "What's inside" is now typed like tags (Enter or a comma, up to 12 items of up to 60 characters). Files keep their table (`resource_files`) but `file_link` is left empty: the two links that existed were cleared, and the Google Sheet still has them. On the public page a file shows its name; an "Open" link appears only if a file has a link (so Sheet mode is unchanged), and "Link coming" is gone. The two public resource pages that have files render differently on purpose. "What's inside" is shown as small rounded tabs (pills) instead of rows, the same look as in the editor (where each has an ×); the heading no longer shows a count. Current hashes: `yohannan-fractions-rotis` `9da87f0c36b0`, `yohannan-string-pen-team-challenge-drawing` `9c6a5641805c`; the other four checked pages are unchanged. Afterwards "If you change it, share your version back." was removed from the resource page's side card (it now reads "Free to use and adapt in your classroom."), so all three resource pages changed again on purpose. Current hashes: `yohannan-fractions-rotis` `e1bca8d94786`, `yohannan-string-pen-team-challenge-drawing` `21820da5ab8b`, `yohannan-the-crew` `cb3c023430ff`; `/yohannan`, `/nobody` and `/login` are unchanged (`f7713d7d06aa`, `a9aa1eb308e0`, `a24f4b0ebed1`).

### Settings (`/<username>/settings`)

Full name, first name, page address (with the "links will break" warning), school, city, cohort; **publish or hide the page**; signed-in email and sign out. Later: delete account, custom domain.

## 6. Order of work

Each phase ends with something you can check, `npm run check` passing, the public pages still **byte-identical** to today (the same hash test as before), and screenshots at desktop and phone width.

| Phase                            | Work                                                                                                                                                                                                                           | You can check                                                                         |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| **A. Data and renderer**         | `fellows.page` and its database check; move your hero into it; the public page draws from sections (hero + resources, with filters); Sheet mode builds the same default; reserved words; unit tests                            | Public pages unchanged; a test page with "Maths" and "SEL" sections renders correctly |
| **B. Builder shell**             | `/edit` route and the owner's "Edit" button; top bar with undo/redo, preview toggle, style panel, save; add, move, duplicate, delete sections; hero editing with the floating toolbar; **Settings page**; remove `/me/profile` | Build a page by adding, moving and deleting sections, change the style, save          |
| **C. Resources section**         | Editable heading; settings panel (filters, chips, order, limit); pencil on cards; "+ Add resource" card; the owner's home becomes the resource library                                                                         | Make "Maths" and "SEL" sections that filter correctly                                 |
| **D. In-place resource editing** | `/<username>/r/<resource>/edit`: every field edited on the page; retire the old form                                                                                                                                           | Create and publish a resource entirely on the page, on a phone (**done**)             |
| **E. First extra widget: Links** | Links section (add, reorder, remove, open); documentation for adding more widgets                                                                                                                                              | Add a Links section between the hero and resources (**done**)                         |

Phase A is the foundation and the riskiest; A and B are enough for a first useful version.

## 7. Testing

- **Unit tests:** section model (add, move, delete, duplicate), filters (subject, tag, empty results), validation, conversion between the document and the editor, and "unknown content is dropped".
- **Database checks:** the new validator accepts good documents and rejects bad types, extra keys, oversized lists, and anything that isn't a known field (script-looking text stays plain text).
- **Public regression:** the five page hashes from before (home, your page, three resources) must stay identical.
- **Real API tests with a temporary test account** (deleted after, as before): save and reload a page, a second account can't edit it, invalid pages are refused.
- **Screenshots** of each screen at desktop and phone width, and keyboard use of the move and delete controls.

## 8. Decisions (all four approved on 16 Oct 2026 as recommended)

1. **Addresses:** as in section 3.
2. **Going live:** Save publishes straight away on a published page.
3. **A resource matching two sections:** shown in both.
4. **Moving sections:** up/down buttons first; drag and drop later.

The questions as asked:

1. **Addresses:** `/<username>/edit`, `/<username>/r/<resource>/edit` and `/<username>/settings` as in section 3?
2. **When do edits go live?** Recommended: **Save publishes straight away on a published page** (simple, what most builders do). The alternative is "Save draft" plus a separate "Publish changes" step, which is safer but doubles the concepts.
3. **A resource that matches two sections:** show it in both (recommended; the fellow is in control), or only in the first?
4. **Moving sections:** ↑ ↓ buttons first, which also work with keyboards and screen readers, with drag and drop added later.

## 9. Not in this plan (kept simple on purpose)

Dragging resource cards into a custom order (cards sort by newest or oldest for now), several pages per fellow, comments, search across fellows, and custom CSS. The section model leaves room for each.
