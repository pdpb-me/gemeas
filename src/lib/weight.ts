// Weight goes up and down with water and food, so show averages, not single days.
// Losing weight isn't the goal here: the app shows the numbers and says nothing about them.
export type Weight = { date: string; kg: number }

// Average of the entries between from and to (inclusive), or null
export function averageKg(weights: Weight[], from: string, to: string) {
  const xs = weights.filter((w) => w.date >= from && w.date <= to).map((w) => w.kg)
  return xs.length ? { kg: xs.reduce((t, x) => t + x, 0) / xs.length, n: xs.length } : null
}
