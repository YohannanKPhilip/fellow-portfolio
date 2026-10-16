# The Google Sheet

All site content lives in one Google Sheet with three data tabs. The site reads them by name, so keep the tab names and header rows exactly as below. Headers are not case-sensitive, and column order doesn't matter.

## Set up the sheet

Any native Google Sheet works, including one you made yourself. You need three tabs named exactly `fellows`, `resources` and `files`.

1. Open your sheet. Rename the first tab (`Sheet1`) to `fellows`. Use the **+** at the bottom left to add two more tabs named `resources` and `files`.
2. In the `fellows` tab, click cell **A1**, then paste the contents of `data-template/paste/fellows.tsv`. Tab-separated text lands in separate columns on its own. Do the same for `resources` and `files`.
3. Click **Share**, set **General access** to **Anyone with the link**, role **Viewer**.
4. Copy the ID from the address bar (`docs.google.com/spreadsheets/d/<ID>/edit`) into `VITE_SHEET_ID`.

Do not put emails, phone numbers or student names in this sheet. Anyone with the link can read every tab.

## Tabs

### `fellows`: one row per fellow

| Column                     | Example                 | Notes                                                          |
| -------------------------- | ----------------------- | -------------------------------------------------------------- |
| `fellow_id`                | `yohannan`              | Page address. Lowercase, digits and hyphens.                   |
| `status`                   | `Published`             | Only `Published` fellows appear.                               |
| `name`                     | `Yohannan K Philip`     | Full name                                                      |
| `first_name`               | `Yohannan`              | Shown in "Hi, I'm …". Defaults to the first word of `name`.    |
| `headline_role`            | `Grade 5 Teacher`       | "I'm a …"                                                      |
| `headline_highlight`       | `TFI Fellow`            | The orange line                                                |
| `status_text`              | `Teaching in Bengaluru` | The green-dot pill                                             |
| `intro`                    | `I teach all subjects…` | One or two sentences under the headline                        |
| `school`, `city`, `cohort` |                         | Stored for later features                                      |
| `photo_url`                | Drive share link        | Square photo. The file must be shared as Anyone with the link. |

### `resources`: one row per resource

| Column                                | Example                                             | Notes                                                          |
| ------------------------------------- | --------------------------------------------------- | -------------------------------------------------------------- |
| `resource_id`                         | `yohannan-fractions-rotis`                          | Start with the `fellow_id` so IDs never clash between fellows. |
| `fellow_id`                           | `yohannan`                                          | Must match a published fellow                                  |
| `status`                              | `Published` or `Draft`                              |                                                                |
| `title`                               | `Fractions with rotis`                              | Required                                                       |
| `subject`                             | `Maths`                                             | Drives the filter buttons                                      |
| `grade`, `board`, `chapter`, `length` | `Grade 5`, `NCERT`, `Maths Mela · Ch 2`, `6 blocks` |                                                                |
| `summary`                             | One line                                            | Shown on the card and under the title                          |
| `about`                               | A short paragraph                                   | Detail page                                                    |
| `in_my_classroom`                     | What happened                                       | Shows "Reflection coming soon" when empty                      |
| `what_id_change`                      | What you'd change                                   | Same                                                           |
| `drive_link`                          | Folder or file link                                 | The main "Open in Google Drive" button                         |

### `files`: one row per file inside a resource

| Column        | Example                                |
| ------------- | -------------------------------------- |
| `resource_id` | `yohannan-fractions-rotis`             |
| `order`       | `1`                                    |
| `file_name`   | `Unit plan with tiered KUD objectives` |
| `file_link`   | Drive link (optional)                  |

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
