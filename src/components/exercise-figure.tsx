import { useMemo } from 'react'
import { exerciseFor, strip } from '@/exercises/catalog'
import { cn } from '@/lib/utils'

// One exercise drawn as a flat-colour strip (frames left to right). An unknown slug draws nothing.
// Thumbnails leave out the inset and use a tighter crop. The SVG's viewBox is cropped to the
// drawing, so it fills the box it's given.
// contain: fit the strip inside a box you size (e.g. a thumbnail), centred.
// The figure colours (--fig-*) live in src/index.css; --fig-panel must match the background
// behind the figure (bg-muted here).
export function ExerciseFigure({
  slug,
  inset = false,
  contain = false,
  className,
}: {
  slug: string
  inset?: boolean
  contain?: boolean
  className?: string
}) {
  const ex = exerciseFor(slug)

  const svg = useMemo(() => {
    if (!ex) return null
    return strip(ex, { inset, pad: inset ? 10 : 6 }).svg.replace('<svg ', '<svg aria-hidden="true" ')
  }, [ex, inset])

  if (!ex || !svg) return null
  return (
    <div
      role="img"
      aria-label={ex.name}
      className={cn('[&_svg]:block', contain ? '[&_svg]:size-full' : '[&_svg]:h-auto [&_svg]:w-full', className)}
      // Safe: the SVG is built by our own code from constants, with no user input
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
