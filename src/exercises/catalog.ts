// Exercise catalog + figure definitions (flat-colour style, 15 Oct).
// Keep every number as is.
// plan_sessions.exercises holds these slugs; an unknown slug shows nothing.
import {
  arrow,
  bbox,
  body,
  f,
  footRp,
  lerp,
  limb,
  pt,
  render,
  solve,
  type Joints,
  type LegPose,
  type Part,
  type Scene,
} from '@/exercises/rig'

export type Exercise = {
  slug: string
  name: string
  session: string
  dose: string
  minutes: number // typical time with rests, for the day's rough total
  tempo?: string
  setup: string
  cues: string[]
  donts: string[]
  stop?: string
  frameW?: number
  frames: (() => Scene)[]
  inset?: () => Scene
}

const GROUND = 238
const hl = (...a: Part[]) => new Set(a)

const STAND = { tl: 3, tu: 2, nk: 6, hd: 90 }
const LIFTED: LegPose = { th: 196, sh: 252, ft: 162 }
const reachWall = (x: number) => ({ reach: { x: x - 1.5, dy: 20 } })

function heelRaise(ft: number, o: { single?: boolean; wallX: number; ballAt: [number, number] }) {
  const flat: LegPose = { th: 180, sh: 180, ft, toe: 90 }
  return solve({ ...STAND, near: flat, far: o.single ? LIFTED : flat, arm: reachWall(o.wallX), anchor: { at: 'near.ball', to: o.ballAt } })
}
const liftArrow = (j: Joints, y0: number, x = j.near.heel.x - 15): Scene[number] => ({
  k: 'arrow',
  pts: [pt(x, y0), pt(x, j.near.heel.y - 4)],
})

export const EXERCISES: Exercise[] = [
  {
    slug: 'ball_squeeze_heel_raise',
    name: 'Sollevamento talloni con pallina',
    session: 'Piede',
    dose: '3 × 15',
    minutes: 6,
    tempo: '3 s su · 3 s giù',
    setup: 'In piedi con una pallina o un asciugamano arrotolato stretto tra i talloni, punta delle dita sul muro.',
    cues: ['Stringi la pallina per tutto il tempo', 'Sali dritta', 'Peso sull’alluce'],
    donts: ['Talloni che si allontanano', 'Rotolare verso il mignolo'],
    frames: [90, 132].map((ft, i) => () => {
      const j = heelRaise(ft, { wallX: 142, ballAt: [100, GROUND] })
      const s: Scene = [
        { k: 'ground', y: GROUND },
        { k: 'wall', x: 142, y0: 40, y1: GROUND },
        ...body(j, hl('nearShank', 'nearFoot'), { farDx: -4 }),
        { k: 'ball', c: lerp(j.near.heel, j.near.A, 0.5), r: 5.5 },
      ]
      if (i) s.push(liftArrow(j, GROUND - 3, j.near.heel.x - 17))
      return s
    }),
    inset: () => [
      { k: 'ring', c: pt(55, 125), r: 52 },
      { k: 'ground', y: 156, x0: 14, x1: 96 },
      limb('shank', [pt(44, 84), pt(44, 146)], { r: [7.5, 4.5] }),
      limb('ankle', [pt(44, 146), pt(44, 152)], { r: [4.5, 4.5] }),
      limb('shank', [pt(66, 84), pt(66, 146)], { hl: true, r: [7.5, 4.5] }),
      limb('ankle', [pt(66, 146), pt(66, 152)], { hl: true, r: [4.5, 4.5] }),
      { k: 'ball', c: pt(55, 145), r: 5.5 },
      { k: 'arrow', pts: [pt(14, 128), pt(33, 128)] },
      { k: 'arrow', pts: [pt(96, 128), pt(77, 128)] },
    ],
  },
  {
    slug: 'sl_heel_raise_step',
    name: 'Sollevamento su una gamba, sul gradino',
    session: 'Piede',
    dose: '3 × 8–12 per lato',
    minutes: 8,
    tempo: '3 s su · 3 s giù',
    setup: 'Un piede sul bordo del gradino, tallone fuori, l’altro piede sollevato, punta delle dita sul muro.',
    cues: ['Sali fino in alto', 'Scendi sotto il gradino', 'Spingi con l’alluce'],
    donts: ['Rotolare verso l’esterno', 'Rimbalzare in basso'],
    frames: [132, 64].map((ft, i) => () => {
      const sy = 218
      const j = heelRaise(ft, { single: true, wallX: 150, ballAt: [96, sy] })
      const s: Scene = [
        { k: 'ground', y: GROUND },
        { k: 'block', x0: 91, y: sy, x1: 150, gy: GROUND },
        { k: 'wall', x: 150, y0: 40, y1: sy },
        { k: 'dash', pts: [pt(40, sy), pt(88, sy)] },
        ...body(j, hl('nearShank', 'nearFoot')),
      ]
      if (i) s.push({ k: 'arrow', pts: [pt(j.near.heel.x - 16, sy - 32), pt(j.near.heel.x - 16, j.near.heel.y)] })
      return s
    }),
  },
  {
    slug: 'banded_inversion',
    name: 'Inversione del piede con elastico',
    session: 'Piede',
    dose: '3 × 15',
    minutes: 5,
    tempo: 'circa 2 s per direzione',
    setup: 'Seduta, una gamba accavallata sull’altro ginocchio. Elastico intorno all’avampiede, fissato verso l’esterno.',
    cues: ['Muovi solo il piede', 'Porta verso l’interno e in alto', 'Controlla il ritorno'],
    donts: ['Ruotare tutta la gamba'],
    frameW: 190,
    frames: [
      [12, 0],
      [-30, 12],
    ].map(([rot, dx], i) => () => {
      const A = pt(105 + dx, 120),
        rp = footRp({ A, rot })
      const s: Scene = [
        { k: 'post', x: 22, y0: 112, y1: GROUND },
        { k: 'ground', y: GROUND, x0: 8, x1: 60 },
        { k: 'band', pts: [pt(22, 150), rp(-22, 34)] },
        limb('shank', [pt(105, 20), A], { hl: true, r: [8.5, 5.5] }),
        { k: 'footFront', A, rot, hl: true },
      ]
      if (i) s.push({ k: 'arc', c: pt(105, 120), r: 70, a0: 202, a1: 156 })
      return s
    }),
  },
  {
    slug: 'sl_heel_hold_towel',
    name: 'Tenuta su una gamba, sull’asciugamano',
    session: 'Piede',
    dose: '3 × 30 s per lato',
    minutes: 5,
    setup: 'In piedi su un piede, su un asciugamano piegato o un cuscino, tallone alzato, l’altro piede sollevato, punta delle dita sul muro.',
    cues: ['Tallone alto', 'La caviglia non cede verso l’esterno', 'Respira'],
    donts: ['Rotolare verso l’esterno', 'Aggrapparti al muro'],
    frames: [
      () => {
        const ty = GROUND - 7
        const j = heelRaise(124, { single: true, wallX: 142, ballAt: [100, ty] })
        return [
          { k: 'ground', y: GROUND },
          { k: 'wall', x: 142, y0: 40, y1: GROUND },
          { k: 'towel', x: 70, y: ty, w: 56, h: 7 },
          ...body(j, hl('nearShank', 'nearFoot')),
        ]
      },
    ],
  },
  {
    slug: 'sl_heel_raise_test',
    name: 'Sollevamenti su una gamba, fino a fatica',
    session: 'Test',
    dose: 'Massimo di ripetizioni, prima sinistra poi destra',
    minutes: 8,
    tempo: '2 s su · 2 s giù',
    setup: 'In piedi su un piede, sul pavimento, punta delle dita sul muro solo per l’equilibrio.',
    cues: ['Fino in alto a ogni ripetizione', 'Stesso ritmo', 'Solo la punta delle dita'],
    donts: ['Piegare il ginocchio', 'Appoggiarti al muro'],
    stop: 'non arrivi più in alto, perdi il ritmo o il dolore supera Lieve.',
    frames: [90, 132].map((ft, i) => () => {
      const j = heelRaise(ft, { single: true, wallX: 142, ballAt: [100, GROUND] })
      const s: Scene = [{ k: 'ground', y: GROUND }, { k: 'wall', x: 142, y0: 40, y1: GROUND }, ...body(j, hl('nearShank', 'nearFoot'))]
      if (i) s.push(liftArrow(j, GROUND - 3))
      return s
    }),
  },
]

export function exerciseFor(slug: string) {
  return EXERCISES.find((e) => e.slug === slug)
}

// Compose a strip: frames left to right, a small grey arrow between them, optional inset at the end.
// inset: only in the enlarged view. endOnly: just the last frame. The viewBox is cropped to the
// content, so the strip fills whatever box it's put in.
export function strip(ex: Exercise, { inset = true, endOnly = false, pad = 10 } = {}) {
  const FW = ex.frameW || 170,
    GAP = 30
  const scenes = (endOnly ? [ex.frames[ex.frames.length - 1]] : ex.frames).map((fr) => fr())
  const bb = scenes.map(bbox).reduce((a, b) => ({
    x0: Math.min(a.x0, b.x0),
    y0: Math.min(a.y0, b.y0),
    x1: Math.max(a.x1, b.x1),
    y1: Math.max(a.y1, b.y1),
  }))
  const fx0 = Math.max(0, bb.x0 - pad),
    fw = Math.min(FW, bb.x1 + pad) - fx0
  let y0 = bb.y0 - pad,
    y1 = bb.y1 + pad,
    x = 0,
    g = ''
  scenes.forEach((sc, i) => {
    if (i) {
      g += arrow([pt(x + 8, (y0 + y1) / 2), pt(x + GAP - 6, (y0 + y1) / 2)], 'var(--fig-prop)', true)
      x += GAP
    }
    g += `<g transform="translate(${f(x - fx0)},0)">${render(sc)}</g>`
    x += fw
  })
  if (inset && ex.inset) {
    const sc = ex.inset(),
      ib = bbox(sc)
    y0 = Math.min(y0, ib.y0 - 4)
    y1 = Math.max(y1, ib.y1 + 4)
    x += 14
    g += `<g transform="translate(${f(x - ib.x0)},0)">${render(sc)}</g>`
    x += ib.x1 - ib.x0
  }
  const h = y1 - y0
  return { svg: `<svg viewBox="0 ${f(y0)} ${f(x)} ${f(h)}" xmlns="http://www.w3.org/2000/svg">${g}</svg>`, w: x, h }
}
