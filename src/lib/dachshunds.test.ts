import { describe, expect, it } from 'vitest'
import { dogForSport, soloSvg, twinsSvg, type DogPose } from '@/lib/dachshunds'

const POSES: DogPose[] = ['stretch', 'plank', 'lift', 'bridge', 'sit', 'ball', 'walk', 'run', 'cycle', 'rest', 'highfive']

describe('the twin dachshunds', () => {
  it('draws both twins in every pose', () => {
    for (const pose of POSES) {
      const svg = twinsSvg(pose)
      expect(svg.startsWith('<svg ')).toBe(true)
      expect(svg).toContain('--dog-red')
      expect(svg).toContain('--dog-black')
      expect(svg).not.toContain('undefined')
    }
  })

  it('draws one twin alone', () => {
    const svg = soloSvg('ball', 'black')
    expect(svg).toContain('--dog-black')
    expect(svg).not.toContain('--dog-red')
  })

  it.each([
    ['walk', 'walk'],
    ['speed_walking', 'walk'],
    ['running', 'run'],
    ['treadmill_running', 'run'],
    ['trail_running', 'run'],
    ['cycling', 'cycle'],
    ['indoor_cycling', 'cycle'],
    ['road_biking', 'cycle'],
    ['e_bike_fitness', 'cycle'],
    ['virtual_ride', 'cycle'],
    ['motorcycling', null],
    ['strength', null],
    ['pilates', null],
    ['indoor_cardio', null],
    ['hike', null],
  ])('goes with %s: %s', (sport, pose) => {
    expect(dogForSport(sport)).toBe(pose)
  })
})
