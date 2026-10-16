// Turns one fellow's published rows in the Google Sheet into a SQL file for Supabase.
//
//   npx vite-node scripts/import-sheet.mjs -- --fellow yohannan --user-id <auth user id> --out import.sql
//
// It only reads the public Sheet and writes a file, so it needs no Supabase key at all.
// Review the file, then apply it (Supabase connector or SQL editor). The whole file runs
// in one transaction, so it either imports everything or nothing.
// Rows keep their Sheet order: published_at is spaced one minute apart, oldest first, so
// "newest first" on the site stays as it is today.
import { writeFileSync } from 'node:fs';
import { loadFromGoogleSheet } from '../src/data/googleSheets';

const args = process.argv.slice(2).filter((a) => a !== '--');
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};

const sheetId = arg(
  'sheet',
  process.env.VITE_SHEET_ID || '1SuHv0vo_1yoN4VO6zY7mOK68f4W07HB28aGDoCIzTLI',
);
const fellowId = arg('fellow', 'yohannan');
const userId = arg('user-id', '');
const out = arg('out', 'import.sql');

if (!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(userId)) {
  console.error("Pass the fellow's auth user id: --user-id <uuid>");
  process.exit(1);
}

const { dataset, warnings } = await loadFromGoogleSheet(sheetId);
const fellow = dataset.fellows.find((f) => f.id === fellowId);
if (!fellow) {
  console.error(`No published fellow "${fellowId}" in the sheet.`);
  process.exit(1);
}
const resources = dataset.resources.filter((r) => r.fellowId === fellowId);

// --- helpers -------------------------------------------------------------
const lit = (s) => (s === '' || s == null ? 'null' : `'${String(s).replace(/'/g, "''")}'`);
const problems = [];
const check = (where, field, value, { max, https } = {}) => {
  if (!value) return;
  if (max && value.length > max)
    problems.push(`${where}: ${field} is ${value.length} characters (limit ${max})`);
  if (https && !/^https:\/\//.test(value))
    problems.push(`${where}: ${field} must start with https:// ("${value}")`);
};

// --- validate against the database's rules --------------------------------
check('fellow', 'slug', fellow.id, { max: 40 });
check('fellow', 'name', fellow.name, { max: 80 });
check('fellow', 'first_name', fellow.firstName, { max: 40 });
check('fellow', 'headline_role', fellow.headlineRole, { max: 120 });
check('fellow', 'headline_highlight', fellow.headlineHighlight, { max: 120 });
check('fellow', 'status_text', fellow.statusText, { max: 120 });
check('fellow', 'intro', fellow.intro, { max: 600 });
check('fellow', 'school', fellow.school, { max: 120 });
check('fellow', 'city', fellow.city, { max: 80 });
check('fellow', 'cohort', fellow.cohort, { max: 40 });
check('fellow', 'photo_url', fellow.photoUrl, { https: true });
for (const r of resources) {
  const w = `resource ${r.id}`;
  check(w, 'slug', r.id, { max: 80 });
  check(w, 'title', r.title, { max: 120 });
  check(w, 'subject', r.subject, { max: 40 });
  check(w, 'grade', r.grade, { max: 40 });
  check(w, 'length', r.length, { max: 40 });
  check(w, 'summary', r.summary, { max: 300 });
  check(w, 'description', r.description, { max: 5000 });
  check(w, 'cover_url', r.coverUrl, { https: true });
  check(w, 'drive_link', r.driveLink, { https: true });
  for (const t of r.tags) check(w, `tag "${t}"`, t, { max: 40 });
  for (const f of r.files) {
    check(w, `file "${f.name}"`, f.name, { max: 200 });
    check(w, `file link of "${f.name}"`, f.link, { https: true });
  }
  for (const m of r.media) {
    check(w, 'media url', m.url, { https: true });
    check(w, 'media caption', m.caption, { max: 300 });
    if (m.hint && m.hint !== 'image' && m.hint !== 'video') {
      problems.push(`${w}: media type "${m.hint}" must be image, video or empty`);
    }
  }
}
if (problems.length) {
  console.error('These rows break the database rules. Fix them in the Sheet and run again:');
  for (const p of problems) console.error(` - ${p}`);
  process.exit(1);
}

// --- build the SQL ----------------------------------------------------------
const base = Date.now() - resources.length * 60_000;
const at = (i) => `'${new Date(base + i * 60_000).toISOString()}'`;
const sql = [];
sql.push(`-- Import of "${fellowId}" from Google Sheet ${sheetId}`);
sql.push(`-- ${resources.length} resources. Generated ${new Date().toISOString()}.`);
sql.push('begin;');
sql.push(
  `insert into public.fellows (user_id, slug, status, name, first_name, headline_role, headline_highlight, status_text, intro, school, city, cohort, photo_path)\nvalues ('${userId}', ${lit(fellow.id)}, 'published', ${lit(fellow.name)}, ${lit(fellow.firstName)}, ${lit(fellow.headlineRole)}, ${lit(fellow.headlineHighlight)}, ${lit(fellow.statusText)}, ${lit(fellow.intro)}, ${lit(fellow.school)}, ${lit(fellow.city)}, ${lit(fellow.cohort)}, ${lit(fellow.photoUrl)});`,
);
resources.forEach((r, i) => {
  const tags = r.tags.length ? `array[${r.tags.map(lit).join(', ')}]::text[]` : "'{}'::text[]";
  sql.push(
    `insert into public.resources (user_id, slug, status, title, subject, grade, length, tags, cover_path, cover_consent_confirmed, summary, description, drive_link, published_at, created_at)\nvalues ('${userId}', ${lit(r.id)}, 'published', ${lit(r.title)}, ${lit(r.subject)}, ${lit(r.grade)}, ${lit(r.length)}, ${tags}, ${lit(r.coverUrl)}, ${r.coverUrl ? 'true' : 'false'}, ${lit(r.summary)}, ${lit(r.description)}, ${lit(r.driveLink)}, ${at(i)}, ${at(i)});`,
  );
  const owner = `(select id from public.resources where user_id = '${userId}' and slug = ${lit(r.id)})`;
  r.files.forEach((f, j) => {
    sql.push(
      `insert into public.resource_files (resource_id, position, file_name, file_link) values (${owner}, ${j + 1}, ${lit(f.name)}, ${lit(f.link)});`,
    );
  });
  r.media.forEach((m, j) => {
    sql.push(
      `insert into public.resource_media (resource_id, position, url, caption, type_hint, consent_confirmed) values (${owner}, ${j + 1}, ${lit(m.url)}, ${lit(m.caption)}, ${lit(m.hint)}, true);`,
    );
  });
});
sql.push('commit;');

writeFileSync(out, sql.join('\n') + '\n');
const others = dataset.fellows.filter((f) => f.id !== fellowId).map((f) => f.id);
console.log(
  `Wrote ${out}: 1 fellow, ${resources.length} resources, ${resources.reduce((n, r) => n + r.files.length, 0)} files, ${resources.reduce((n, r) => n + r.media.length, 0)} media.`,
);
if (others.length) console.log(`Not imported (they need their own accounts): ${others.join(', ')}`);
for (const w of warnings) console.log(`Sheet warning: ${w}`);
