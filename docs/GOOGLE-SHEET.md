# The Google Sheet

All site content lives in one Google Sheet with four data tabs. The site reads them by name, so keep the tab names and header rows exactly as below. Headers are not case-sensitive, and column order doesn't matter.

## Set up the sheet

Any native Google Sheet works, including one you made yourself. You need four tabs named exactly `fellows`, `resources`, `files` and `media`. The `media` tab is optional.

1. Open your sheet. Rename the first tab (`Sheet1`) to `fellows`. Use the **+** at the bottom left to add three more tabs named `resources`, `files` and `media`.
2. In the `fellows` tab, click cell **A1**, then paste the contents of `data-template/paste/fellows.tsv`. Tab-separated text lands in separate columns on its own. Do the same for `resources`, `files` and `media`.
3. Click **Share**, set **General access** to **Anyone with the link**, role **Viewer**.
4. Copy the ID from the address bar (`docs.google.com/spreadsheets/d/<ID>/edit`) into `VITE_SHEET_ID`.

Do not put emails, phone numbers or student names in this sheet. Anyone with the link can read every tab.

## Tabs

### `fellows`: one row per fellow

| Column                     | Example                 | Notes                                                                                   |
| -------------------------- | ----------------------- | --------------------------------------------------------------------------------------- |
| `fellow_id`                | `yohannan`              | Page address. Letters, digits and hyphens. Capitals and spaces are fixed automatically. |
| `status`                   | `Published`             | Only `Published` fellows appear.                                                        |
| `name`                     | `Yohannan K Philip`     | Full name                                                                               |
| `first_name`               | `Yohannan`              | Shown in "Hi, I'm …". Defaults to the first word of `name`.                             |
| `headline_role`            | `Grade 5 Teacher`       | "I'm a …"                                                                               |
| `headline_highlight`       | `TFI Fellow`            | The orange line                                                                         |
| `status_text`              | `Teaching in Bengaluru` | The green-dot pill                                                                      |
| `intro`                    | `I teach all subjects…` | One or two sentences under the headline                                                 |
| `school`, `city`, `cohort` |                         | Stored for later features                                                               |
| `photo_url`                | Drive share link        | Square photo. The file must be shared as Anyone with the link.                          |

### `resources`: one row per resource

| Column        | Example                             | Notes                                                                                           |
| ------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------- |
| `resource_id` | `yohannan-fractions-rotis`          | Start with the `fellow_id` so IDs never clash between fellows.                                  |
| `fellow_id`   | `yohannan`                          | Must match a published fellow                                                                   |
| `status`      | `Published` or `Draft`              |                                                                                                 |
| `title`       | `Fractions with rotis`              | Required                                                                                        |
| `subject`     | `Maths`                             | Drives the filter buttons                                                                       |
| `grade`       | `Grade 5`                           |                                                                                                 |
| `length`      | `6 blocks`                          |                                                                                                 |
| `tags`        | `NCERT, Maths Mela, Ch 2`           | Comma-separated. Shown as chips (three on the card, all on the page). Up to 8; repeats ignored. |
| `cover_url`   | A Drive image link or any image URL | Optional. Empty means no image is shown at all. See "Covers" below.                             |
| `summary`     | One line                            | Shown on the card and under the title                                                           |
| `description` | A short paragraph                   | The "Description" section of the detail page                                                    |
| `drive_link`  | Folder or file link                 | The main "Open in Google Drive" button                                                          |

### `files`: one row per file inside a resource

| Column        | Example                                |
| ------------- | -------------------------------------- |
| `resource_id` | `yohannan-fractions-rotis`             |
| `order`       | `1`                                    |
| `file_name`   | `Unit plan with tiered KUD objectives` |
| `file_link`   | Drive link (optional)                  |

### `media`: photos and videos of the resource in use (optional)

One row per item. They appear in an "In the classroom" section on the resource page.

| Column        | Example                            | Notes                                                   |
| ------------- | ---------------------------------- | ------------------------------------------------------- |
| `resource_id` | `yohannan-fractions-rotis`         |                                                         |
| `order`       | `1`                                | Display order                                           |
| `url`         | A YouTube, Instagram or Drive link | See the table below                                     |
| `caption`     | `Groups sharing three rotis`       | Optional. Do not use students' names.                   |
| `type`        | `image` or `video`                 | Optional. Only needed for a Drive link that is a photo. |

| Link                                          | What visitors see                                                                                                                    |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| YouTube (`watch`, `youtu.be`, Shorts)         | A thumbnail that plays in the page when clicked                                                                                      |
| Instagram post or reel (`/p/…`, `/reel/…`)    | An Instagram embed, loaded when clicked. Always has an "Open on Instagram" link, because Instagram sometimes asks viewers to log in. |
| Google Drive video                            | A Drive preview that plays in the page when clicked                                                                                  |
| Google Drive photo with `type` = `image`      | The photo                                                                                                                            |
| A direct image link (`.jpg`, `.png`, `.webp`) | The photo                                                                                                                            |
| Anything else                                 | A plain link                                                                                                                         |

Nothing from YouTube or Instagram loads until a visitor clicks play, so the page stays fast and visitors are not tracked just for scrolling past.

**Covers and photos from Drive:** the file must be shared as "Anyone with the link: Viewer", or it will not show. A cover that fails to load is hidden, so the page never has a broken image.

**Children's privacy:** post classroom photos and videos only with your school's permission. Avoid students' names in captions. For videos where faces are visible, prefer an unlisted YouTube video or a Drive video over a public Instagram post.

## Adding another fellow

1. Add a row to `fellows` with a new `fellow_id` and `status` = `Draft`.
2. Add their resources and files.
3. Check them, then switch the fellow and resources to `Published`.
4. Their page is live at `/<fellow_id>`.

Problems in the sheet, such as a bad ID or a resource pointing at a missing fellow, skip that row instead of breaking the site. They're listed in the browser console under `[fellow-portfolio] data warnings`.

## Letting fellows submit (next step)

When more fellows join, put a Google Form in front of the sheet so they never edit it directly:

1. Create a form with the same fields as `resources`.
2. Link its responses to a separate, private sheet.
3. Copy approved rows into this sheet with `status` = `Published`.

That keeps emails and unchecked submissions out of the public sheet.
