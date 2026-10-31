// The twin dachshunds: decoration for calm moments, drawn as SVG from constants.
// Each dog is built from thick round strokes: an ink pass first, then the colours on top,
// so the whole silhouette gets one outline. The colours (--dog-*) live in src/index.css.
export type DogPose = 'stretch' | 'plank' | 'lift' | 'bridge' | 'sit' | 'ball' | 'walk' | 'rest' | 'highfive'

type Coat = { coat: string; far: string; ear: string; tan: string; brow: boolean }
type Pose = {
  body: string
  w: number
  near: string[]
  far: string[]
  arm?: string[] // drawn over the head
  tail: string
  head: { x: number; y: number; r: number; closed?: boolean }
  prop?: 'bar' | 'ball'
  zz?: boolean
}

const INK = 'var(--ink)'
const OUTLINE = 2.5
const LIMB = 11
const RED: Coat = { coat: 'var(--dog-red)', far: 'var(--dog-red-far)', ear: 'var(--dog-red-ear)', tan: 'var(--dog-red-tan)', brow: false }
const BLACK: Coat = { coat: 'var(--dog-black)', far: 'var(--dog-black-far)', ear: 'var(--ink)', tan: 'var(--dog-black-tan)', brow: true }

// Facing left, on a mat at y = 122
const POSES: Record<Exclude<DogPose, 'highfive'>, Pose> = {
  stretch: {
    body: 'M68 104 Q110 98 136 58',
    w: 28,
    near: ['M70 110 L44 117', 'M140 52 L170 44'],
    far: ['M82 112 L56 118', 'M132 50 L160 32'],
    tail: 'M140 46 Q138 28 124 16',
    head: { x: 42, y: 98, r: -6 },
  },
  plank: {
    body: 'M68 98 L158 86',
    w: 26,
    near: ['M74 106 L50 117', 'M156 92 L174 117'],
    far: ['M86 106 L62 118', 'M146 94 L162 117'],
    tail: 'M168 80 Q182 70 186 56',
    head: { x: 56, y: 80, r: 4 },
  },
  lift: {
    body: 'M100 98 L100 58',
    w: 28,
    near: ['M92 108 L90 117'],
    far: ['M110 108 L112 117', 'M110 62 L128 20'],
    arm: ['M90 62 L72 20'],
    tail: 'M112 104 Q134 104 146 90',
    head: { x: 100, y: 40, r: 0 },
    prop: 'bar',
  },
  bridge: {
    body: 'M58 104 C58 36, 146 36, 146 104',
    w: 24,
    near: ['M58 108 L54 117', 'M146 108 L150 117'],
    far: ['M68 106 L66 117', 'M136 106 L138 117'],
    tail: 'M152 88 Q172 82 178 66',
    head: { x: 40, y: 94, r: -34 },
  },
  sit: {
    body: 'M100 102 Q98 80 100 66',
    w: 30,
    near: ['M92 112 L60 117', 'M92 74 L72 106'],
    far: ['M108 112 L140 117', 'M108 74 L128 106'],
    tail: 'M116 112 Q140 112 156 100',
    head: { x: 100, y: 44, r: 0, closed: true },
  },
  ball: {
    body: 'M66 82 L150 82',
    w: 28,
    near: ['M72 90 L52 98', 'M148 90 L156 117'],
    far: ['M86 90 L86 117', 'M134 90 L144 117'],
    tail: 'M160 78 Q176 66 180 50',
    head: { x: 52, y: 62, r: -24 },
    prop: 'ball',
  },
  walk: {
    body: 'M62 78 Q105 72 150 78',
    w: 28,
    near: ['M72 86 L58 117', 'M146 86 L160 117'],
    far: ['M84 86 L96 117', 'M134 86 L122 117'],
    tail: 'M160 74 Q178 58 180 38',
    head: { x: 46, y: 60, r: 6 },
  },
  rest: {
    body: 'M66 104 C68 66, 150 62, 152 100 C152 116, 110 118, 92 110',
    w: 24,
    near: ['M122 112 L98 117'],
    far: [],
    tail: 'M158 92 Q172 96 174 110',
    head: { x: 60, y: 96, r: -8, closed: true },
    zz: true,
  },
}

// Two upright dogs, one mirrored, paws touching
const HIGH_FIVE: Pose = {
  body: 'M100 100 L98 62',
  w: 28,
  near: ['M92 110 L90 117'],
  far: ['M108 110 L110 117', 'M106 68 L114 92'],
  arm: ['M90 66 L56 28'],
  tail: 'M112 106 Q132 106 144 92',
  head: { x: 100, y: 42, r: 4 },
}

const stroke = (d: string, w: number, c: string) =>
  `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`

function head(h: Pose['head'], c: Coat) {
  const eye = h.closed
    ? `<path d="M-13 -3 Q-8.5 1 -4 -3" fill="none" stroke="${c.brow ? c.tan : INK}" stroke-width="2" stroke-linecap="round"/>`
    : `<circle cx="-8.5" cy="-3.5" r="3.2" fill="var(--card)"/><circle cx="-9" cy="-3.5" r="2" fill="${INK}"/>`
  return (
    `<g transform="translate(${h.x} ${h.y}) rotate(${h.r})">` +
    `<circle r="${15 + OUTLINE}" fill="${INK}"/>${stroke('M-6 3 L-27 7', 13 + 2 * OUTLINE, INK)}` +
    `<circle r="15" fill="${c.coat}"/>${stroke('M-6 3 L-27 7', 13, c.coat)}${stroke('M-14 7 L-27 8', 7, c.tan)}` +
    `<circle cx="-33" cy="6" r="4" fill="${INK}"/>${eye}` +
    (c.brow ? `<circle cx="-9" cy="-10" r="2.4" fill="${c.tan}"/>` : '') +
    `<ellipse cx="7" cy="8" rx="8.5" ry="16" transform="rotate(-8 7 8)" fill="${c.ear}" stroke="${INK}" stroke-width="${OUTLINE}"/></g>`
  )
}

// The paw at the end of a limb, in the tan colour
const paw = (d: string, c: Coat) => {
  const [, x, y] = d.match(/(-?[\d.]+) (-?[\d.]+)$/)!
  return `<circle cx="${x}" cy="${y}" r="5.5" fill="${c.tan}"/>`
}

function dog(p: Pose, c: Coat) {
  const arms = p.arm ?? []
  const limbs = [...p.far, ...p.near]
  return (
    [...limbs, ...arms].map((d) => stroke(d, LIMB + 2 * OUTLINE, INK)).join('') +
    stroke(p.tail, 5 + 2 * OUTLINE, INK) +
    stroke(p.body, p.w + 2 * OUTLINE, INK) +
    p.far.map((d) => stroke(d, LIMB, c.far)).join('') +
    stroke(p.tail, 5, c.coat) +
    stroke(p.body, p.w, c.coat) +
    p.near.map((d) => stroke(d, LIMB, c.coat)).join('') +
    limbs.map((d) => paw(d, c)).join('') +
    head(p.head, c) +
    arms.map((d) => stroke(d, LIMB, c.coat) + paw(d, c)).join('')
  )
}

function prop(p: Pose) {
  if (p.prop === 'ball') return `<circle cx="42" cy="109" r="12" fill="var(--dog-mat)" stroke="${INK}" stroke-width="${OUTLINE}"/>`
  if (p.prop === 'bar')
    return `<rect x="52" y="12" width="96" height="5" fill="${INK}"/><rect x="46" y="1" width="9" height="27" fill="${INK}"/><rect x="145" y="1" width="9" height="27" fill="${INK}"/>`
  return ''
}

const zz = (p: Pose) =>
  p.zz
    ? `<g font-family="var(--mono)" font-weight="700" fill="${INK}"><text x="28" y="52" font-size="17">z</text><text x="42" y="38" font-size="22">z</text></g>`
    : ''

const mat = (x: number, w: number) =>
  `<rect x="${x}" y="122" width="${w}" height="9" rx="2" fill="var(--dog-mat)" stroke="${INK}" stroke-width="${OUTLINE}"/>`

// Both twins on one mat
export function twinsSvg(pose: DogPose) {
  if (pose === 'highfive')
    return (
      `<svg viewBox="20 8 360 128" xmlns="http://www.w3.org/2000/svg">${mat(44, 312)}` +
      `<g transform="translate(144 0)">${dog(HIGH_FIVE, BLACK)}</g>` +
      `<g transform="translate(256 0) scale(-1 1)">${dog(HIGH_FIVE, RED)}</g></svg>`
    )
  const p = POSES[pose]
  const one = (x: number, c: Coat) => `<g transform="translate(${x} 0)">${prop(p)}${dog(p, c)}${zz(p)}</g>`
  return `<svg viewBox="4 -8 392 146" xmlns="http://www.w3.org/2000/svg">${mat(14, 372)}${one(-4, RED)}${one(192, BLACK)}</svg>`
}

// One twin, for small places such as a row
export function soloSvg(pose: Exclude<DogPose, 'highfive'>, twin: 'red' | 'black' = 'red') {
  const p = POSES[pose]
  return `<svg viewBox="4 -8 190 146" xmlns="http://www.w3.org/2000/svg">${mat(14, 170)}${prop(p)}${dog(p, twin === 'red' ? RED : BLACK)}${zz(p)}</svg>`
}
