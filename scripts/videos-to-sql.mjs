// Turns YouTube datasets (.xlsx, from youtube-dataset.mjs) into one SQL file that adds them to gemeas.videos.
// Usage: node scripts/videos-to-sql.mjs <user-id> <out.sql> "<channel name>=<dataset.xlsx>" [...]
// Keep the datasets and the SQL file outside this public repo.
// Clips of a minute or less, live streams and pregnancy classes are left out. The file runs as one transaction.
// Re-running is safe: new videos are added; existing ones get the latest title, date, length
// and views, playlists and tags are merged, and notes and flags are kept.
import fs from 'node:fs'
import zlib from 'node:zlib'

const [userId, outFile, ...sources] = process.argv.slice(2)
if (!userId || !outFile || !sources.length)
  throw new Error('usage: node scripts/videos-to-sql.mjs <user-id> <out.sql> "<channel name>=<dataset.xlsx>" [...]')

const NOT_WATCHED = 'Ancora da guardare'

// ---- read the first sheet of an .xlsx (a zip of XML files) without extra packages ----
function unzip(buf) {
  const files = {}
  let eocd = buf.length - 22
  while (buf.readUInt32LE(eocd) !== 0x06054b50) eocd--
  let p = buf.readUInt32LE(eocd + 16) // central directory
  const count = buf.readUInt16LE(eocd + 10)
  for (let i = 0; i < count; i++) {
    const method = buf.readUInt16LE(p + 10)
    const size = buf.readUInt32LE(p + 20)
    const nameLen = buf.readUInt16LE(p + 28)
    const extraLen = buf.readUInt16LE(p + 30)
    const commentLen = buf.readUInt16LE(p + 32)
    const local = buf.readUInt32LE(p + 42)
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen)
    const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28)
    const data = buf.subarray(start, start + size)
    files[name] = method === 8 ? zlib.inflateRawSync(data).toString('utf8') : data.toString('utf8')
    p += 46 + nameLen + extraLen + commentLen
  }
  return files
}

const decode = (s) =>
  s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&')

function readFirstSheet(buf) {
  const z = unzip(buf)
  const shared = z['xl/sharedStrings.xml']
    ? [...z['xl/sharedStrings.xml'].matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) =>
        decode([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join('')),
      )
    : []
  return [...z['xl/worksheets/sheet1.xml'].matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)].map((r) =>
    [...r[1].matchAll(/<c r="([A-Z]+)\d+"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)].reduce((row, c) => {
      const type = /t="(\w+)"/.exec(c[2])?.[1]
      const v = /<v>([\s\S]*?)<\/v>/.exec(c[3] ?? '')?.[1] ?? /<t[^>]*>([\s\S]*?)<\/t>/.exec(c[3] ?? '')?.[1]
      row[c[1]] = v == null ? null : type === 's' ? shared[Number(v)] : decode(v)
      return row
    }, {}),
  )
}

// ---- rough tags from the title (a first guess; the coach can correct them) ----
const TAGS = {
  foot: /\b(foot|feet|toes?|arch|ankles?|achilles|calf|calves|soleus)\b/i,
  pilates: /\bpilates\b/i,
  yoga: /\byoga\b/i,
  barre: /\b(barre|dancer)\b/i,
  strength: /\b(strength|strengthen\w*|strong\w*|weights?|dumbbells?|kettlebells?|resistance|sculpt|bodyweight)\b/i,
  band: /\bbands?\b/i,
  cardio: /\b(cardio|hiit|plyo\w*|jumps?|hops?|bounding)\b/i,
  mobility: /\b(mobility|flexibility)\b/i,
  stretch: /\bstretch\w*\b/i,
  warmup: /\b(warm[ -]?ups?|pre[ -]?run)\b/i,
  cooldown: /\b(cool[ -]?down|post[ -]?run|after running)\b/i,
  core: /\b(core|abs)\b/i,
  upper: /\b(upper body|arms?|shoulders?|chest)\b/i,
  lower: /\b(lower body|legs?|glutes?|booty|hips?|hamstrings?|quads?)\b/i,
  back: /\b(back|spine|posture)\b/i,
  'full-body': /\bfull[ -]?body\b/i,
  beginner: /\bbeginners?\b/i,
  gentle: /\bgentle\b/i,
  'no-equipment': /\bno equipment\b/i,
  running: /\b(run|runs|runner|runners|running)\b/i,
}
const tagsFor = (title) => Object.keys(TAGS).filter((t) => TAGS[t].test(title))

const idOf = (url) => /[?&]v=([\w-]{11})/.exec(url ?? '')?.[1] ?? null
function seconds(len) {
  const parts = String(len ?? '').split(':').map(Number)
  return parts.some((n) => !Number.isFinite(n)) ? 0 : parts.reduce((t, n) => t * 60 + n, 0)
}
const q = (s) => (s == null ? 'null' : `'${String(s).replace(/'/g, "''")}'`)
const arr = (xs) => `array[${xs.map(q).join(',')}]::text[]`

// ---- build the rows ----
const videos = new Map()
for (const source of sources) {
  const at = source.lastIndexOf('=')
  const channel = source.slice(0, at)
  const [, ...rows] = readFirstSheet(fs.readFileSync(source.slice(at + 1)))
  let skipped = 0
  let added = 0
  for (const r of rows) {
    const id = idOf(r.D)
    const duration = seconds(r.E)
    if (!id || duration <= 60 || r.H === 'yes' || /\b(live stream|pregnancy)\b/i.test(r.B ?? '')) {
      skipped++
      continue
    }
    added++
    videos.set(id, { id, title: r.B, date: r.C, duration, views: r.F ? Number(r.F) : null, channel })
  }
  console.log(`${channel}: ${added} videos, ${skipped} left out`)
}

const stamp = new Date().toISOString()
const values = [...videos.values()].map(
  (v) =>
    `(${q(v.id)},${q(v.title)},${q(v.date)},${v.duration},${v.views ?? 'null'},${arr([v.channel])},${arr(tagsFor(v.title))},${q(NOT_WATCHED)},${q(stamp)},${q(userId)})`,
)

const merged = (column) =>
  `${column} = array(select distinct x from unnest(gemeas.videos.${column} || excluded.${column}) as x order by x)`

fs.writeFileSync(
  outFile,
  `begin;
insert into gemeas.videos (yt_id, title, published_at, duration_s, views, playlists, tags, flags, synced_at, user_id) values
${values.join(',\n')}
on conflict (user_id, yt_id) do update set
  title = excluded.title,
  published_at = excluded.published_at,
  duration_s = excluded.duration_s,
  views = excluded.views,
  ${merged('playlists')},
  ${merged('tags')},
  synced_at = excluded.synced_at;
commit;
`,
)

const counts = {}
for (const v of videos.values()) for (const t of tagsFor(v.title)) counts[t] = (counts[t] ?? 0) + 1
console.log(`${videos.size} distinct videos; tags: ${JSON.stringify(counts)}`)
console.log(`untagged: ${[...videos.values()].filter((v) => !tagsFor(v.title).length).length}`)
