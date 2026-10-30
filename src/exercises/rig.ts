// Gemeas exercise figures: parametric rig + flat-colour renderer (style locked 15 Oct).
// Ported from docs/figures/rig.js. Keep every number as is.
// Angles are absolute, in degrees: 0 = up, 90 = forward (right), 180 = down, 270 = back.
// Exercises build a scene (a list of items: limbs, head, props, arrows) and render() turns it
// into SVG. Colours come only from CSS variables (--fig-*, in src/index.css), so figures follow
// light/dark mode. Sizes are viewBox units, so the whole figure scales with its box.

export type Pt = { x: number; y: number }
export type LegPose = { th: number; sh: number; ft: number; toe?: number }
export type ArmPose = { ua: number; fa: number } | { reach: { x: number; dy: number } }
export type Pose = {
  tl: number
  tu: number
  nk: number
  hd: number
  near: LegPose
  far?: LegPose
  arm: ArmPose
  anchor: { at: string; to: [number, number] }
}
type Leg = { K: Pt; A: Pt; heel: Pt; ball: Pt; toe: Pt; mid: Pt }
export type Joints = {
  P: Pt
  M: Pt
  S: Pt
  N: Pt
  Hc: Pt
  hd: number
  near: Leg
  far: Leg
  E: Pt
  Wr: Pt
  Hn: Pt
}
export type Part = 'neck' | 'head' | 'upper' | 'lower' | 'nearThigh' | 'nearShank' | 'nearFoot' | 'arms'
export type LimbPart =
  | 'lower'
  | 'upper'
  | 'neck'
  | 'thigh'
  | 'shank'
  | 'ankle'
  | 'foot'
  | 'upperArm'
  | 'forearm'
  | 'hand'
  | 'thumb'

// Scene items. hl = drawn with the accent glow; far = the other leg, drawn faded.
export type Item =
  | { k: 'limb'; part: LimbPart; pts: Pt[]; hl?: boolean; far?: boolean; r?: [number, number] }
  | { k: 'head'; c: Pt; hd: number | null; hl?: boolean } // hd null = front view
  | { k: 'ground'; y: number; x0?: number; x1?: number }
  | { k: 'wall' | 'post'; x: number; y0: number; y1: number }
  | { k: 'chair'; bx: number; seatY: number; fx: number; gy: number; top: Pt }
  | { k: 'chairF'; x0: number; x1: number; y: number; legs: number[]; gy: number }
  | { k: 'block'; x0: number; y: number; x1: number; gy: number }
  | { k: 'dash' | 'band' | 'arrow'; pts: Pt[] }
  | { k: 'towel'; x: number; y: number; w: number; h: number }
  | { k: 'ball' | 'ring' | 'mark'; c: Pt; r: number }
  | { k: 'arc'; c: Pt; r: number; a0: number; a1: number }
  | { k: 'footFront'; A: Pt; rot: number; hl?: boolean }
export type Scene = Item[]

export const L = { tl: 26, tu: 32, nk: 9, hr: 11, ua: 28, fa: 27, hand: 7, th: 50, sh: 50 }

const rad = (a: number) => (a * Math.PI) / 180
export const dir = (a: number): Pt => ({ x: Math.sin(rad(a)), y: -Math.cos(rad(a)) })
export const add = (p: Pt, a: number, l: number): Pt => {
  const d = dir(a)
  return { x: p.x + d.x * l, y: p.y + d.y * l }
}
export const lerp = (a: Pt, b: Pt, t: number): Pt => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })
export const mv = (p: Pt, dx: number, dy: number): Pt => ({ x: p.x + dx, y: p.y + dy })
export const pt = (x: number, y: number): Pt => ({ x, y })

function leg(P: Pt, s: LegPose): Leg {
  const K = add(P, s.th, L.th),
    A = add(K, s.sh, L.sh)
  const u = dir(s.ft),
    n = dir(s.ft + 90)
  const base = { x: A.x + n.x * 9, y: A.y + n.y * 9 }
  const heel = { x: base.x - u.x * 7, y: base.y - u.y * 7 }
  const ball = { x: base.x + u.x * 17, y: base.y + u.y * 17 }
  const toe = add(ball, s.toe ?? s.ft, 8)
  return { K, A, heel, ball, toe, mid: lerp(heel, ball, 0.3) }
}

// Two-bone IK for an arm reaching a world point; elbow bends downward.
function ik(S: Pt, T: Pt) {
  const dx = T.x - S.x,
    dy = T.y - S.y
  const d = Math.min(Math.hypot(dx, dy), L.ua + L.fa + L.hand - 0.5)
  const a = Math.atan2(dy, dx),
    l2 = L.fa + L.hand
  const c = Math.max(-1, Math.min(1, (L.ua * L.ua + d * d - l2 * l2) / (2 * L.ua * d)))
  const e = a + Math.acos(c)
  const E = { x: S.x + L.ua * Math.cos(e), y: S.y + L.ua * Math.sin(e) }
  const H = { x: S.x + d * Math.cos(a), y: S.y + d * Math.sin(a) }
  return { E, Wr: lerp(E, H, L.fa / l2), H }
}

// anchor.at is 'P' or 'near.ball' (a joint, optionally inside a leg)
export function solve(ps: Pose): Joints {
  const P = { x: 0, y: 0 }
  const M = add(P, ps.tl, L.tl),
    S = add(M, ps.tu, L.tu),
    N = add(S, ps.nk, L.nk)
  const Hc = add(N, ps.nk, L.hr)
  const j = { P, M, S, N, Hc, near: leg(P, ps.near), far: leg(P, ps.far || ps.near) }
  const [k, sub] = ps.anchor.at.split('.')
  const node = (j as unknown as Record<string, Pt & Record<string, Pt>>)[k]
  const src: Pt = sub ? node[sub] : node
  const dx = ps.anchor.to[0] - src.x,
    dy = ps.anchor.to[1] - src.y
  const shift = (o: Record<string, unknown>) => {
    for (const key in o) {
      const v = o[key] as Pt | Record<string, unknown> | undefined
      if (v && typeof (v as Pt).x === 'number') o[key] = mv(v as Pt, dx, dy)
      else if (v && typeof v === 'object') shift(v as Record<string, unknown>)
    }
  }
  shift(j)
  let E: Pt, Wr: Pt, Hn: Pt
  if ('reach' in ps.arm) {
    const r = ik(j.S, { x: ps.arm.reach.x, y: j.S.y + ps.arm.reach.dy })
    E = r.E
    Wr = r.Wr
    Hn = r.H
  } else {
    E = add(j.S, ps.arm.ua, L.ua)
    Wr = add(E, ps.arm.fa, L.fa)
    Hn = add(Wr, ps.arm.fa, L.hand)
  }
  return { ...j, hd: ps.hd, E, Wr, Hn }
}

export const limb = (part: LimbPart, pts: Pt[], o: { hl?: boolean; far?: boolean; r?: [number, number] } = {}): Item => ({
  k: 'limb',
  part,
  pts,
  ...o,
})

// Side-view body from solved joints. hl: the highlighted parts.
export function body(j: Joints, hl: Set<Part> = new Set(), o: { farDx?: number; hideFar?: boolean } = {}): Scene {
  const s: Scene = [],
    fd = (p: Pt) => mv(p, o.farDx || 0, 0),
    F = j.far,
    N = j.near,
    h = (p: Part) => hl.has(p)
  if (!o.hideFar) {
    s.push(
      limb('thigh', [j.P, F.K].map(fd), { far: true }),
      limb('shank', [F.K, F.A].map(fd), { far: true }),
      limb('ankle', [F.A, F.mid].map(fd), { far: true }),
      limb('foot', [F.heel, F.ball, F.toe].map(fd), { far: true }),
    )
  }
  s.push(limb('lower', [j.P, j.M], { hl: h('lower') }), limb('upper', [j.M, j.S], { hl: h('upper') }))
  s.push(
    limb('thigh', [j.P, N.K], { hl: h('nearThigh') }),
    limb('shank', [N.K, N.A], { hl: h('nearShank') }),
    limb('ankle', [N.A, N.mid], { hl: h('nearShank') }),
    limb('foot', [N.heel, N.ball, N.toe], { hl: h('nearFoot') }),
  )
  s.push(limb('neck', [j.S, j.N], { hl: h('neck') }), { k: 'head', c: j.Hc, hd: j.hd, hl: h('head') })
  s.push(
    limb('upperArm', [j.S, j.E], { hl: h('arms') }),
    limb('forearm', [j.E, j.Wr], { hl: h('arms') }),
    limb('hand', [j.Wr, j.Hn], { hl: h('arms') }),
  )
  return s
}

// ---------- flat-colour renderer ----------
export const f = (n: number) => n.toFixed(1)
const pts = (a: Pt[]) => a.map((p) => f(p.x) + ',' + f(p.y)).join(' ')
const NS = ' vector-effect="non-scaling-stroke"'
const V = (n: string) => `var(--fig-${n})`
const stroke = (a: Pt[], color: string, w: number, extra = '') =>
  `<polyline points="${pts(a)}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${extra}/>`
const disc = (c: Pt, r: number, fill: string, extra = '') => `<circle cx="${f(c.x)}" cy="${f(c.y)}" r="${f(r)}" fill="${fill}"${extra}/>`
const rect = (x: number, y: number, w: number, h: number, fill: string, rx = 0) =>
  `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${rx}" fill="${fill}"/>`

// Limb radii (start → end) and the clothing colour of each part.
const RAD: Record<LimbPart, [number, number]> = {
  lower: [12, 10.5],
  upper: [10.5, 11.5],
  neck: [5, 5],
  thigh: [10, 6.5],
  shank: [6.5, 4],
  ankle: [4, 3.6],
  foot: [4.2, 2.6],
  upperArm: [5.5, 4.3],
  forearm: [4.3, 3.3],
  hand: [3.3, 2.8],
  thumb: [2, 1.8],
}
const CLOTH: Record<LimbPart, string> = {
  lower: 'shorts',
  upper: 'shirt',
  neck: 'skin',
  thigh: 'shorts',
  shank: 'skin',
  ankle: 'shoe',
  foot: 'shoe',
  upperArm: 'shirt',
  forearm: 'skin',
  hand: 'skin',
  thumb: 'skin',
}
const HALO = 4.5 // glow width around the working area

// Tapered capsule through points (union of circles and tangent quads).
function taper(a: Pt[], r0: number, r1: number, fill: string, extra = '') {
  let g = ''
  const r = (i: number) => r0 + (r1 - r0) * (a.length > 1 ? i / (a.length - 1) : 0)
  for (let i = 0; i < a.length - 1; i++) {
    const p = a[i],
      q = a[i + 1],
      ra = r(i),
      rb = r(i + 1)
    const dx = q.x - p.x,
      dy = q.y - p.y,
      d = Math.hypot(dx, dy) || 1e-6,
      ux = dx / d,
      uy = dy / d
    const s = Math.max(-0.99, Math.min(0.99, (ra - rb) / d)),
      c = Math.sqrt(1 - s * s)
    const n1 = { x: s * ux - c * uy, y: s * uy + c * ux },
      n2 = { x: s * ux + c * uy, y: s * uy - c * ux }
    g += `<polygon points="${pts([mv(p, ra * n1.x, ra * n1.y), mv(q, rb * n1.x, rb * n1.y), mv(q, rb * n2.x, rb * n2.y), mv(p, ra * n2.x, ra * n2.y)])}"/>`
  }
  a.forEach((p, i) => (g += `<circle cx="${f(p.x)}" cy="${f(p.y)}" r="${f(r(i))}"/>`))
  return `<g fill="${fill}"${extra}>${g}</g>`
}

// Front/top view of a foot (banded inversion): a local shape rotated about the ankle.
const TOES = [
  [-18, 4],
  [-10, 4.5],
  [-2, 5],
  [7, 5.5],
  [17, 7],
]
export function footRp(it: { A: Pt; rot: number }) {
  const r = rad(it.rot),
    A = it.A
  return (x: number, y: number): Pt => ({ x: A.x + x * Math.cos(r) - y * Math.sin(r), y: A.y + x * Math.sin(r) + y * Math.cos(r) })
}

export function arrow(a: Pt[], color = V('accent'), thin = false) {
  const size = thin ? 7 : 9.5
  const p = a[a.length - 1],
    q = a[a.length - 2]
  const d = Math.hypot(p.x - q.x, p.y - q.y) || 1,
    ux = (p.x - q.x) / d,
    uy = (p.y - q.y) / d
  const cut = Math.min(size * 0.7, d * 0.9)
  const line = a.slice(0, -1).concat([mv(p, -ux * cut, -uy * cut)])
  const b = mv(p, -ux * size, -uy * size),
    w = size * 0.55
  return (
    (thin ? stroke(line, color, 1.5, NS) : stroke(line, color, 3.2)) +
    `<polygon points="${pts([p, mv(b, -uy * w, ux * w), mv(b, uy * w, -ux * w)])}" fill="${color}" stroke="${color}" stroke-width="1" stroke-linejoin="round"/>`
  )
}
const arcPts = (c: Pt, r: number, a0: number, a1: number) => {
  const p: Pt[] = []
  for (let i = 0; i <= 14; i++) p.push(add(c, a0 + ((a1 - a0) * i) / 14, r))
  return p
}

function item(it: Item): string {
  switch (it.k) {
    case 'limb': {
      const [r0, r1] = it.r || RAD[it.part]
      return taper(it.pts, r0, r1, V(CLOTH[it.part]), it.far ? ' opacity="0.45"' : '')
    }
    case 'head': {
      const c = it.c
      if (it.hd == null) return disc(c, 11.6, V('hair')) + disc(mv(c, 0, 2.2), 10.2, V('skin'))
      return disc(c, 11.6, V('hair')) + disc(mv(add(c, it.hd, 2.2), 0, 1.2), 10.2, V('skin')) + disc(add(c, it.hd, 10.6), 2.9, V('skin'))
    }
    case 'ground':
      return stroke([pt(it.x0 ?? 8, it.y), pt(it.x1 ?? 162, it.y)], V('prop'), 1.5, NS)
    case 'wall':
      return rect(it.x, it.y0, 6, it.y1 - it.y0, V('prop-fill'))
    case 'post':
      return rect(it.x - 3, it.y0, 6, it.y1 - it.y0, V('prop-fill'), 1.5)
    case 'chair': {
      const { bx, seatY, fx, gy, top } = it
      return (
        stroke([pt(bx, seatY), top], V('prop-fill'), 6) +
        stroke([pt(bx, seatY), pt(bx, gy)], V('prop-fill'), 3.5) +
        stroke([pt(fx, seatY), pt(fx, gy)], V('prop-fill'), 3.5) +
        rect(bx - 3, seatY, fx - bx + 6, 6, V('prop-fill'), 3)
      )
    }
    case 'chairF':
      return it.legs.map((x) => stroke([pt(x, it.y), pt(x, it.gy)], V('prop-fill'), 3.5)).join('') + rect(it.x0, it.y, it.x1 - it.x0, 6, V('prop-fill'), 3)
    case 'block':
      return rect(it.x0, it.y, it.x1 - it.x0, it.gy - it.y, V('prop-fill'), 1.5)
    case 'dash':
      return stroke(it.pts, V('prop'), 1.5, NS + ' stroke-dasharray="3 4"')
    case 'towel':
      return rect(it.x, it.y, it.w, it.h, V('towel'), 3.5) + stroke([pt(it.x + 6, it.y + it.h / 2), pt(it.x + it.w - 6, it.y + it.h / 2)], V('prop'), 1, NS)
    case 'ball':
      return disc(it.c, it.r + 0.5, V('ball'), ` stroke="${V('panel')}" stroke-width="1.5"${NS}`)
    case 'band':
      return stroke(it.pts, V('band'), 3.5)
    case 'ring':
      return disc(it.c, it.r, V('inset'))
    case 'mark':
      return disc(it.c, it.r, V('accent'))
    case 'arrow':
      return arrow(it.pts)
    case 'arc':
      return arrow(arcPts(it.c, it.r, it.a0, it.a1))
    case 'footFront': {
      const rp = footRp(it),
        col = V('skin')
      let g = `<polygon points="${pts([rp(-8, 3), rp(-23, 39), rp(25, 39), rp(9, 3)])}" fill="${col}" stroke="${col}" stroke-width="5" stroke-linejoin="round"/>`
      TOES.forEach(([x, r]) => (g += disc(rp(x, 40 + r * 0.35), r, col, ` stroke="${V('panel')}" stroke-width="1.2"${NS}`)))
      return g
    }
  }
}

// Accent glow behind every highlighted part, drawn once under the whole body.
function halos(scene: Scene) {
  let g = ''
  for (const it of scene) {
    if (it.k === 'limb' && it.hl && !it.far) {
      const [r0, r1] = it.r || RAD[it.part]
      g += taper(it.pts, r0 + HALO, r1 + HALO, V('accent'))
    }
    if (it.k === 'head' && it.hl) g += disc(it.c, 16.5, V('accent'))
    if (it.k === 'footFront' && it.hl) {
      const rp = footRp(it)
      g += `<polygon points="${pts([rp(-8, 3), rp(-23, 39), rp(-18, 49), rp(17, 52), rp(25, 39), rp(9, 3)])}" fill="${V('accent')}" stroke="${V('accent')}" stroke-width="13" stroke-linejoin="round"/>`
    }
  }
  return g ? `<g opacity="0.42">${g}</g>` : ''
}

export function render(scene: Scene) {
  let g = '',
    haloDone = false
  for (const it of scene) {
    if (!haloDone && (it.k === 'limb' || it.k === 'head' || it.k === 'footFront')) {
      g += halos(scene)
      haloDone = true
    }
    g += item(it)
  }
  return g
}

export type Box = { x0: number; y0: number; x1: number; y1: number }

// Bounding box of a scene, for tight viewBoxes (thumbnails fill their box).
export function bbox(scene: Scene): Box {
  const P: Pt[] = []
  const push = (p: Pt, m = 0) => P.push(mv(p, -m, -m), mv(p, m, m))
  for (const it of scene) {
    switch (it.k) {
      case 'limb':
        it.pts.forEach((p) => push(p, 12))
        break
      case 'head':
        push(it.c, 17)
        break
      case 'ground':
        push(pt(it.x0 ?? 8, it.y))
        push(pt(it.x1 ?? 162, it.y))
        break
      case 'wall':
      case 'post':
        push(pt(it.x - 3, it.y0))
        push(pt(it.x + 6, it.y1))
        break
      case 'chair':
        push(pt(it.bx - 4, it.seatY))
        push(pt(it.fx + 4, it.gy))
        push(it.top, 4)
        break
      case 'chairF':
        push(pt(it.x0, it.y))
        push(pt(it.x1, it.gy))
        break
      case 'block':
        push(pt(it.x0, it.y))
        push(pt(it.x1, it.gy))
        break
      case 'towel':
        push(pt(it.x, it.y))
        push(pt(it.x + it.w, it.y + it.h))
        break
      case 'ball':
      case 'ring':
      case 'mark':
        push(it.c, it.r + 2)
        break
      case 'band':
      case 'dash':
      case 'arrow':
        it.pts.forEach((p) => push(p, 6))
        break
      case 'arc':
        arcPts(it.c, it.r, it.a0, it.a1).forEach((p) => push(p, 6))
        break
      case 'footFront': {
        const rp = footRp(it)
        ;[rp(-30, 0), rp(30, 0), rp(-30, 58), rp(30, 58)].forEach((p) => push(p))
        break
      }
    }
  }
  const xs = P.map((p) => p.x),
    ys = P.map((p) => p.y)
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) }
}
