// The time ranges of the detail screens
export const RANGES = [
  { id: '4w', days: 28, label: '4 settimane', text: 'ultime 4 settimane', before: 'le 4 settimane prima' },
  { id: '3m', days: 91, label: '3 mesi', text: 'ultimi 3 mesi', before: 'i 3 mesi prima' },
  { id: '6m', days: 182, label: '6 mesi', text: 'ultimi 6 mesi', before: 'i 6 mesi prima' },
] as const
export type Range = (typeof RANGES)[number]
export type RangeId = Range['id']
