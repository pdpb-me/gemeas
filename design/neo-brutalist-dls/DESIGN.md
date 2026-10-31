# Neo-brutalist DLS

Follow this file for all UI in this project. Use `dls.css` for tokens and components, and `reference.html` as the visual reference.

## Character

Warm paper, black ink, solid outlines and hard shadows. Modern and minimal, with few elements and clear hierarchy. Always light mode.

## Principles

1. **Colour means status.** Sage, mustard and black mean good, fair and poor, and nothing else. Never use them for decoration or selection.
2. **Selection uses shape.** Show it with a bigger shadow, an arrow or an opened panel. The exception is pills, where the selected one is filled with ink.
3. **Never rely on colour alone.** Pair each status colour with a word, such as a chip or legend label.
4. **Outlines over fills.** Surfaces are paper or card, separated by 2 px ink lines.
5. **Hard shadows only.** Shadows have no blur.
6. **Numbers are mono.** Values, units, timestamps and axis labels use JetBrains Mono. Everything else uses Familjen Grotesk.

## Tokens

| Token | Value | Use |
|---|---|---|
| `--paper` | `#f2eee3` | Page background, inputs |
| `--card` | `#fbf9f2` | Cards, buttons, rows |
| `--ink` | `#16140f` | Text, lines, shadows, primary buttons |
| `--muted` | `#5f5a4d` | Secondary text, axis labels |
| `--panel` | `#2a2925` | Dark feature block |
| `--good` | `#a9d18e` | Status: good |
| `--fair` | `#f2c14e` | Status: fair |
| `--poor` | `#16140f` | Status: poor, with card-coloured text |

The checker pattern (ink and mustard) is the one decorative exception to principle 1. Use it sparingly, as on the corner of `.feature`.

## Type

| Role | Style |
|---|---|
| H1 | Familjen Grotesk 700, 28 px, with a 10 px ink square before it |
| H2 | Familjen Grotesk 700, 22 px, with the same square |
| Body | Familjen Grotesk 500, 16 px, line height 1.4 |
| Row label | Familjen Grotesk 700, 17 px |
| Chip | Familjen Grotesk 700, 13 px |
| Large value | JetBrains Mono 500, 28 px, letter spacing -0.02em |
| Small data | JetBrains Mono 400 or 500, 12 to 14 px |

## Shape and space

- **Lines:** 2 px solid ink. Limit lines in charts are 1 px dashed.
- **Radius:** chip 5, input and banner 8, card and row 10, panel and feature 12, button and pill 22 px.
- **Shadows:** 2 px resting row, 4 px panel and feature, 5 px selected row, always offset down and right.
- **Spacing:** 10 to 14 px between stacked items, 20 to 28 px between layout areas, 16 px page gutter on a phone.
- **Touch targets:** at least 40 px, and 44 px for main buttons.
- **Focus:** a 3 px ink outline with a 2 px offset.

## Components

All are in `dls.css` and shown in `reference.html`.

- **Button and select:** card fill, ink outline, pill shape. For a primary button, fill it with ink.
- **Pills (`.ranges`):** a row of options, with the selected one filled with ink.
- **Chip (`.chip` plus `.good`, `.fair` or `.poor`):** a one-word status.
- **Status (`.status`):** a small square and mono text. The square is hollow when stale.
- **Row (`.row`, `.row.on`):** label and chip on the left, large value and arrow on the right. Use ▸ for closed and ▾ for open.
- **Box (`.box`):** a flat container with no shadow, for content inside a layout.
- **Panel (`.panel`):** a raised container, for forms and focused tasks.
- **Feature (`.feature`):** the one dark block on a page, with a checker corner.
- **Banner (`.banner`):** a bold message in an outlined box.

## Charts

Use the status bar chart rather than a charting library's default look:

- Flat bars with no outline, coloured by the status of each value, with a 2 px gap.
- Dashed limit lines labelled at their right end, and no grid.
- A 2 px ink baseline, with muted mono axis labels at the start, middle and end.
- Leave gaps where data is missing, rather than drawing a zero.
- Tapping a bar outlines it and updates a mono readout above the chart.
- Keep a legend with status words below the chart.

## Icons

Geometric, square-ended and drawn with ink strokes of 2 to 2.5 px, with no gradients. App icons use a card background with an ink outline.

## Writing

Use short, plain words and sentence case. Status words should be readable at a glance, such as "Good" or "Offline". When something needs action, say what to do, such as "Open the window".

## Avoid

Soft or blurred shadows, gradients, glass effects, a dark mode, thin grey borders, extra accent colours such as blue or purple, and status colours used to mark a selection.

## Layout

Design for a phone first. From 900 px, use a 390 px side column with the detail area beside it. On a phone, open the detail directly under the selected row.
