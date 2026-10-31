import { useState } from 'react'
import { ExternalLinkIcon, PlayIcon } from 'lucide-react'
import { Dachshunds } from '@/components/dachshunds'
import { EmptyNote } from '@/components/states'
import { Button, buttonVariants } from '@/components/ui/button'
import { demo } from '@/demo/state'
import { LIBRARY, type LibraryVideo, type VideoType } from '@/demo/video-data'
import { useHour, useToday } from '@/lib/clock'
import { plural } from '@/lib/format'
import { cn } from '@/lib/utils'

const TYPES: { id: VideoType | 'all'; label: string }[] = [
  { id: 'all', label: 'Tutti' },
  { id: 'foot', label: 'Piede' },
  { id: 'pilates', label: 'Pilates' },
  { id: 'strength', label: 'Forza' },
  { id: 'yoga', label: 'Yoga' },
]
const LENGTHS = [
  { id: 'all', label: 'Tutte', from: 0, to: Infinity },
  { id: 'short', label: 'Fino a 15 min', from: 0, to: 900 },
  { id: 'mid', label: '15–30 min', from: 900, to: 1800 },
  { id: 'long', label: 'Oltre 30', from: 1800, to: Infinity },
]
// The kind of session a video becomes in the plan
const KIND: Record<VideoType, string> = { foot: 'foot', pilates: 'strength', strength: 'strength', yoga: 'mobility' }
const POSE = { foot: 'ball', pilates: 'plank', strength: 'lift', yoga: 'sit' } as const

function Pills<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: readonly { id: T; label: string }[]
  value: T
  onChange: (id: T) => void
}) {
  return (
    <div className="ranges" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.id} type="button" className={cn(o.id === value && 'on')} aria-pressed={o.id === value} onClick={() => onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

// The thumbnail until it's tapped: YouTube's player only loads when it's wanted
function Player({ video }: { video: LibraryVideo }) {
  const [playing, setPlaying] = useState(false)
  if (playing)
    return (
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${video.yt_id}?autoplay=1&playsinline=1`}
        title={video.name}
        allow="autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
        className="aspect-video w-full rounded-lg border"
      />
    )
  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      aria-label={`Guarda ${video.name}`}
      className="plain relative block aspect-video w-full overflow-hidden rounded-lg border bg-muted"
    >
      <img src={`https://i.ytimg.com/vi/${video.yt_id}/mqdefault.jpg`} alt="" loading="lazy" className="size-full object-cover" />
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="flex size-12 items-center justify-center rounded-lg border-2 bg-card">
          <PlayIcon className="ml-0.5 size-5 fill-current" />
        </span>
      </span>
    </button>
  )
}

// A list of videos to try: filter, open one under its row, watch it, or add it to today
export default function Library() {
  const today = useToday()
  const hour = useHour()
  const [type, setType] = useState<VideoType | 'all'>('all')
  const [length, setLength] = useState('all')
  const [open, setOpen] = useState<string | null>(null)
  const span = LENGTHS.find((l) => l.id === length)!
  const shown = LIBRARY.filter((v) => (type === 'all' || v.type === type) && v.duration_s >= span.from && v.duration_s < span.to)

  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col">
      <header className="flex flex-col gap-3 border-b bg-card px-4 pt-4 pb-3">
        <h1 className="text-display font-bold">Esercizi</h1>
        <Pills label="Tipo" options={TYPES} value={type} onChange={setType} />
        <Pills label="Durata" options={LENGTHS} value={length} onChange={setLength} />
      </header>

      <div className="flex flex-col gap-3 p-4">
        <p className="banner">Scelti dai titoli: ancora da guardare, prima di metterli in un piano.</p>
        <span className="status">
          <span className="dot" />
          {plural(shown.length, 'video', 'video')}
        </span>
        {shown.length === 0 && <EmptyNote title="Nessun video">Prova un’altra durata.</EmptyNote>}
        <div className="rows">
          {shown.map((v) => {
            const isOpen = open === v.yt_id
            return (
              <div key={v.yt_id} className="flex flex-col gap-2.5">
                <button type="button" className={cn('row', isOpen && 'on')} aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : v.yt_id)}>
                  <span className="flex min-w-0 items-center gap-2.5">
                    <Dachshunds pose={POSE[v.type]} solo className="w-14 shrink-0" />
                    <span className="text">
                      <span className="label">{v.name}</span>
                      <span className="sub">{v.channel}</span>
                    </span>
                  </span>
                  <span className="end">
                    <span className="flex items-baseline gap-1">
                      <span className="value">{Math.round(v.duration_s / 60)}</span>
                      <span className="font-mono text-xs">min</span>
                    </span>
                    <span className="mark" aria-hidden>
                      {isOpen ? '▾' : '▸'}
                    </span>
                  </span>
                </button>
                {isOpen && (
                  <div className="box animate-fade-in">
                    <Player video={v} />
                    <p className="text-sm text-muted-foreground">{v.title}</p>
                    <div className="grid grid-cols-2 gap-2">
                      <a
                        href={`https://www.youtube.com/watch?v=${v.yt_id}`}
                        target="_blank"
                        rel="noreferrer"
                        className={buttonVariants({ variant: 'outline', className: 'h-11 px-2' })}
                      >
                        <ExternalLinkIcon />
                        YouTube
                      </a>
                      <Button
                        className="h-11 px-2"
                        disabled={demo.hasVideoOn(today, v.yt_id)}
                        onClick={() => demo.addVideo(v, KIND[v.type], today, hour < 12 ? 'am' : 'pm')}
                      >
                        {demo.hasVideoOn(today, v.yt_id) ? 'Già in Oggi' : 'Aggiungi a Oggi'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </main>
  )
}
