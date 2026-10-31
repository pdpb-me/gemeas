import { useMemo } from 'react'
import { soloSvg, twinsSvg, type DogPose } from '@/lib/dachshunds'
import { cn } from '@/lib/utils'

// The twin dachshunds, only for calm moments: never next to a sore foot or the weight.
// A span, so it can sit inside a button. Purely decoration: hidden from screen readers.
export function Dachshunds({ pose, solo, className }: { pose: DogPose; solo?: boolean; className?: string }) {
  const svg = useMemo(() => (solo && pose !== 'highfive' ? soloSvg(pose) : twinsSvg(pose)), [pose, solo])
  return (
    <span
      aria-hidden
      className={cn('block [&_svg]:block [&_svg]:h-auto [&_svg]:w-full', className)}
      // Safe: the SVG is built by our own code from constants, with no user input
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
