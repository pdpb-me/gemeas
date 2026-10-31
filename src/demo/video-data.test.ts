import { describe, expect, it } from 'vitest'
import { LIBRARY } from '@/demo/video-data'

describe('the video list', () => {
  it('has each video once, with a YouTube id and a real length', () => {
    expect(new Set(LIBRARY.map((v) => v.yt_id)).size).toBe(LIBRARY.length)
    for (const v of LIBRARY) {
      expect(v.yt_id).toMatch(/^[\w-]{11}$/)
      expect(v.duration_s).toBeGreaterThan(60)
    }
  })
})
