// Moments in the made-up 12 weeks worth visiting (see src/demo/simulate.ts).
import { addDays } from '@/lib/dates'
import { FIRST_MONDAY } from '@/demo/simulate'

export type Scenario = { id: string; title: string; about: string; at: string; empty?: boolean }

const W = (w: number, dow: number) => addDays(FIRST_MONDAY, (w - 1) * 7 + dow)

// Moments worth visiting (local time). The first one is where the demo opens.
export const SCENARIOS: Scenario[] = [
  { id: 'today', title: 'Un giovedì mattina', about: 'Settimana 10: lezione col trainer stasera, con una pillola per il piede', at: `${W(10, 3)}T07:10` },
  { id: 'ordinary', title: 'Una settimana normale', about: 'Settimana 2, martedì sera, giorno di lezione', at: `${W(2, 1)}T19:30` },
  { id: 'cancelled', title: 'Lezione saltata', about: 'Settimana 4, venerdì: la lezione di giovedì è saltata', at: `${W(4, 4)}T08:00` },
  { id: 'moved', title: 'Lezione spostata', about: 'Settimana 5, mercoledì: la lezione è passata da martedì a oggi', at: `${W(5, 2)}T17:00` },
  { id: 'sick', title: 'Una settimana malata', about: 'Settimana 6, venerdì: quasi tutto saltato', at: `${W(6, 4)}T20:30` },
  { id: 'flare', title: 'Il piede fa male', about: 'Settimana 7, venerdì: mattina con dolore Forte', at: `${W(7, 4)}T07:20` },
  { id: 'late', title: 'Check-in dimenticati', about: 'Settimana 8, mercoledì: ieri non è ancora registrato', at: `${W(8, 2)}T07:30` },
  { id: 'test', title: 'Risultati del test', about: 'Settimana 9, lunedì sera: sinistra e destra registrate', at: `${W(9, 0)}T20:30` },
  { id: 'test-day', title: 'Giorno del test', about: 'Settimana 12, giovedì: il test di sollevamento tallone', at: `${W(12, 3)}T07:40` },
  { id: 'gap', title: 'Ritorno dalle vacanze', about: 'Settimana 12, lunedì: 10 giorni senza l’app', at: `${W(12, 0)}T07:30` },
  { id: 'day-one', title: 'Primo giorno', about: 'Un database vuoto: ancora nessun piano', at: `${W(1, 0)}T09:00`, empty: true },
]
