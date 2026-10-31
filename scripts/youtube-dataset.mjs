// Saves a YouTube channel's video list and playlists as .xlsx and .csv, for the coach's video table.
// Usage: node scripts/youtube-dataset.mjs <handle> <out-prefix> <key-file>
//   handle: the channel's @name, without the @
//   out-prefix: path and start of the file names; keep it outside this public repo
//   key-file: a text file holding only the YouTube Data API key; keep it outside this repo too
// Sheet 1 "All Videos (…)" has every public video, newest first; the other sheets are playlists.
// Only reads public data. Each API call costs 1 unit of the 10,000 free per day.
import fs from 'node:fs'
import zlib from 'node:zlib'

const [handle, outPrefix, keyFile] = process.argv.slice(2)
if (!handle || !outPrefix || !keyFile)
  throw new Error('usage: node scripts/youtube-dataset.mjs <handle> <out-prefix> <key-file>')
const key = fs.readFileSync(keyFile, 'utf8').trim()

// ---- YouTube API ----
let calls = 0
// The key goes in a header, so it never shows up in a URL or an error message.
async function api(method, params) {
  calls++
  const res = await fetch(`https://www.googleapis.com/youtube/v3/${method}?${new URLSearchParams(params)}`, {
    headers: { 'X-Goog-Api-Key': key },
  })
  const body = await res.json()
  if (!res.ok) throw new Error(`${method}: ${res.status} ${body.error?.message ?? ''}`)
  return body
}

async function allPages(method, params) {
  const items = []
  let pageToken
  do {
    const body = await api(method, { ...params, maxResults: 50, ...(pageToken ? { pageToken } : {}) })
    items.push(...body.items)
    pageToken = body.nextPageToken
  } while (pageToken)
  return items
}

const playlistVideoIds = async (playlistId) =>
  (await allPages('playlistItems', { part: 'contentDetails', playlistId })).map((i) => i.contentDetails.videoId)

// Deleted and private videos come back from the API with no details, so they drop out here.
async function videoDetails(ids) {
  const found = new Map()
  for (let i = 0; i < ids.length; i += 50) {
    const body = await api('videos', {
      part: 'snippet,contentDetails,statistics,liveStreamingDetails',
      id: ids.slice(i, i + 50).join(','),
      maxResults: 50,
    })
    for (const v of body.items) found.set(v.id, v)
  }
  return found
}

// ---- rows ----
const HEADER = ['#', 'Title', 'Publish Date', 'URL', 'Length', 'Views', 'Description', 'Live']

// PT1H2M3S -> 1:02:03; a live stream with no length stays 0:00
function length(iso) {
  const [, h = 0, m = 0, s = 0] = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso ?? '') ?? []
  const pad = (n) => String(n).padStart(2, '0')
  return Number(h) > 0 ? `${Number(h)}:${pad(m)}:${pad(s)}` : `${Number(m)}:${pad(s)}`
}

const rowsFor = (videos) => [
  HEADER,
  ...videos.map((v, i) => [
    i + 1,
    v.snippet.title,
    v.snippet.publishedAt.slice(0, 10),
    `https://www.youtube.com/watch?v=${v.id}`,
    length(v.contentDetails.duration),
    v.statistics?.viewCount == null ? '' : Number(v.statistics.viewCount),
    v.snippet.description,
    v.liveStreamingDetails ? 'yes' : '',
  ]),
]

// ---- write the .csv, the same shape Excel opens directly ----
function csvCell(value) {
  if (typeof value === 'number') return String(value)
  const s = /^[=+\-@]/.test(value) ? `'${value}` : value // never let Excel read a title as a formula
  return /[;"\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
const toCsv = (rows) => `﻿${rows.map((r) => r.map(csvCell).join(';')).join('\r\n')}\r\n`

// ---- write the .xlsx (a zip of XML files) without extra packages ----
function zip(files) {
  const locals = []
  const centrals = []
  let offset = 0
  for (const [name, text] of Object.entries(files)) {
    const data = Buffer.from(text, 'utf8')
    const packed = zlib.deflateRawSync(data)
    const nameBuf = Buffer.from(name, 'utf8')
    const common = Buffer.alloc(26)
    common.writeUInt16LE(20, 0) // version needed
    common.writeUInt16LE(0x0800, 2) // names are UTF-8
    common.writeUInt16LE(8, 4) // deflate
    common.writeUInt32LE(zlib.crc32(data), 10)
    common.writeUInt32LE(packed.length, 14)
    common.writeUInt32LE(data.length, 18)
    common.writeUInt16LE(nameBuf.length, 22)
    const local = Buffer.concat([Buffer.from([0x50, 0x4b, 3, 4]), common, nameBuf, packed])
    const tail = Buffer.alloc(14)
    tail.writeUInt32LE(offset, 10)
    centrals.push(Buffer.concat([Buffer.from([0x50, 0x4b, 1, 2, 20, 0]), common, tail, nameBuf]))
    locals.push(local)
    offset += local.length
  }
  const central = Buffer.concat(centrals)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(centrals.length, 8)
  end.writeUInt16LE(centrals.length, 10)
  end.writeUInt32LE(central.length, 12)
  end.writeUInt32LE(offset, 16)
  return Buffer.concat([...locals, central, end])
}

const xml = (s) =>
  String(s)
    .replace(/[^\t\n\r -퟿-�\u{10000}-\u{10FFFF}]/gu, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const columnName = (i) => String.fromCharCode(65 + i) // the sheet has fewer than 26 columns

function sheetXml(rows) {
  const body = rows
    .map((row, r) => {
      const cells = row.map((value, c) => {
        const ref = `${columnName(c)}${r + 1}`
        return typeof value === 'number'
          ? `<c r="${ref}"><v>${value}</v></c>`
          : `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xml(value)}</t></is></c>`
      })
      return `<row r="${r + 1}">${cells.join('')}</row>`
    })
    .join('')
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${body}</sheetData></worksheet>`
}

// Excel allows 31 characters per sheet name, some characters not at all, and no repeats.
function sheetNames(titles) {
  const used = new Set()
  return titles.map((title) => {
    const clean = title.replace(/[[\]:*?/\\]/g, ' ').trim().slice(0, 31) || 'Playlist'
    let name = clean
    for (let n = 2; used.has(name.toLowerCase()); n++) name = `${clean.slice(0, 27)} (${n})`
    used.add(name.toLowerCase())
    return name
  })
}

function toXlsx(sheets) {
  const names = sheetNames(sheets.map((s) => s.name))
  const type = 'application/vnd.openxmlformats-officedocument.spreadsheetml'
  const rel = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
  const files = {
    '[Content_Types].xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="${type}.sheet.main+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="${type}.worksheet+xml"/>`).join('')}</Types>`,
    '_rels/.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${rel}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    'xl/workbook.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="${rel}"><sheets>${names.map((n, i) => `<sheet name="${xml(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`,
    'xl/_rels/workbook.xml.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="${rel}/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}</Relationships>`,
  }
  sheets.forEach((s, i) => {
    files[`xl/worksheets/sheet${i + 1}.xml`] = sheetXml(s.rows)
  })
  return zip(files)
}

// ---- run ----
const channel = (await api('channels', { part: 'snippet,contentDetails,statistics', forHandle: handle })).items?.[0]
if (!channel) throw new Error(`no channel found for @${handle}`)
console.log(`Channel: ${channel.snippet.title} (YouTube says ${channel.statistics.videoCount} videos)`)

const uploadIds = await playlistVideoIds(channel.contentDetails.relatedPlaylists.uploads)
const playlists = await allPages('playlists', { part: 'snippet', channelId: channel.id })
const playlistIds = new Map()
for (const p of playlists) playlistIds.set(p.id, await playlistVideoIds(p.id))

const details = await videoDetails([...new Set([...uploadIds, ...[...playlistIds.values()].flat()])])
const pick = (ids) => ids.map((id) => details.get(id)).filter(Boolean)
const uploads = pick(uploadIds).sort((a, b) => b.snippet.publishedAt.localeCompare(a.snippet.publishedAt))

const sheets = [
  { name: `All Videos (${uploads.length})`, rows: rowsFor(uploads) },
  ...playlists.map((p) => ({ name: p.snippet.title, rows: rowsFor(pick(playlistIds.get(p.id))) })),
]
fs.writeFileSync(`${outPrefix}.xlsx`, toXlsx(sheets))
fs.writeFileSync(`${outPrefix}.csv`, toCsv(sheets[0].rows))

console.log(`Videos: ${uploads.length} of ${uploadIds.length} listed; playlists: ${playlists.length}; API calls: ${calls}`)
console.log(`Saved ${outPrefix}.xlsx and .csv`)
