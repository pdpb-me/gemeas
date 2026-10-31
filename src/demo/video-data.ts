// The Esercizi tab: a hand-picked sample of public YouTube videos. `title` is as on YouTube;
// `name` is ours, short and in Italian. Chosen from the titles only: nobody has watched
// them yet. Short clips and high-impact classes are left out.
export type VideoType = 'foot' | 'pilates' | 'strength' | 'yoga'

export type LibraryVideo = {
  yt_id: string
  name: string
  title: string
  channel: string
  type: VideoType
  duration_s: number
}

const NICOLE = 'Move With Nicole'
const ASH = 'Run Better With Ash'

const row = (type: VideoType, channel: string, yt_id: string, length: string, name: string, title: string): LibraryVideo => {
  const [min, sec] = length.split(':').map(Number)
  return { yt_id, name, title, channel, type, duration_s: min * 60 + sec }
}

export const LIBRARY: LibraryVideo[] = [
  row('foot', ASH, 'wZp-TGqgBCY', '6:56', 'Forza del piede, ogni giorno', 'Run Stronger: The 6-Minute Daily Foot Strength Ritual'),
  row('foot', ASH, 'YIT6cSjpZIA', '6:55', 'Caviglia e piede, prima di partire', "6 Minute Pre-Run 'Ankle & Foot' Bulletproofing Routine"),
  row('foot', ASH, 'deUExvA0Md8', '8:42', 'Massaggio del piede', 'Runners Relief: Soothing Foot Massage Routine'),
  row('foot', ASH, 'ppYyoqmSXfs', '9:07', 'Allungare i polpacci', 'After Running Stretches for Tight Calves'),
  row('foot', ASH, 'kh4Gisy4_VY', '11:01', 'Piedi più forti, da seguire', 'Stronger Feet, Stronger Runs: Foot Exercises for EVERY Runner (Follow Along Routine)'),
  row('foot', ASH, '9283qtQPGwA', '11:07', 'Polpacci e femorali', 'Calf and Hamstring Stretching After Running'),
  row('foot', ASH, 'D8dbPEgNOgA', '11:27', 'Gambe fresche dopo una camminata', 'Refresh Your Legs: Stretching Exercises After Walking or Running'),
  row('foot', ASH, 'CMD0zoHT1AI', '12:14', 'Rinforzare i piedi', 'Stop Over-Pronation Strengthen Feet with This Practice'),
  row('foot', ASH, 'aYHa3xvFoAo', '13:28', 'Caviglie più stabili', 'Run with Confidence: Bulletproof Your Ankles Routine'),
  row('foot', ASH, 'qcv1ZOJGnjA', '15:17', 'Esercizi per i piedi', 'These Foot Exercises Will Change Your ENTIRE Body When Running!'),

  row('pilates', NICOLE, '136ZLuy40TE', '13:19', 'Pilates espresso sul tappetino', '10 MIN EXPRESS PILATES WORKOUT || At-Home Mat Pilates (Moderate)'),
  row('pilates', NICOLE, 'gXn-b_ov3n8', '18:37', 'Pilates sul tappetino, 15 minuti', '15 MIN EXPRESS PILATES WORKOUT || At-Home Mat Pilates (Moderate)'),
  row('pilates', NICOLE, 'aHknM6bNlYA', '19:28', 'Addominali e centro', '20 MIN TOTAL CORE WORKOUT || At-Home Pilates Abs'),
  row('pilates', NICOLE, 'DAdjf01N310', '19:46', 'Pilates del mattino', '20 MIN MORNING PILATES || Full Body Mat Pilates Workout (Moderate)'),
  row('pilates', NICOLE, 'ezke0GlKeM4', '21:39', 'Pilates di ogni giorno', '20 MIN EXPRESS PILATES WORKOUT || Everyday Pilates For Energy (Moderate)'),
  row('pilates', NICOLE, 'dF2dXejdKHM', '23:28', 'Centro, per tutti i livelli', '20 MIN PILATES CORE & ABS WORKOUT || At-Home Pilates For All Levels'),
  row('pilates', NICOLE, 'y2RcYo36boM', '24:05', 'Pilates, da principiante a medio', '20 MIN EXPRESS PILATES WORKOUT || Beginner to Moderate Pilates (No Equipment)'),
  row('pilates', NICOLE, 'imWc_27U9w8', '27:56', 'Postura e schiena sana', '25 MIN PILATES WORKOUT || Pilates For Better Posture & A Healthy Spine (Moderate)'),
  row('pilates', NICOLE, '_Rg7nToY1dg', '29:36', 'Pilates dolce', '30 MIN GENTLE PILATES FLOW || Morning/Evening Workout'),
  row('pilates', NICOLE, 'wtVyZmHnlxM', '30:19', 'Pilates completo, livello medio', '30 MIN PILATES WORKOUT || Beginner to Moderate Pilates (No Equipment)'),
  row('pilates', NICOLE, 'cTsZweJPois', '31:46', 'Pilates per principianti', '30 MIN PILATES FOR BEGINNERS || At-Home Mat Pilates (No Equipment)'),
  row('pilates', NICOLE, 'Xs6gah4DseA', '34:50', 'Pilates dolce, tutto il corpo', '35 MIN GENTLE PILATES || Full Body Workout (No Equipment)'),
  row('pilates', NICOLE, 'kQACrehFaLA', '38:42', 'Pilates senza stare in piedi', '35 MIN PILATES WORKOUT || At-Home Mat Pilates (No Standing & No Equipment)'),
  row('pilates', NICOLE, 'v3B2vk5THOU', '39:25', 'Pilates classico', '35 MIN PILATES WORKOUT || Classical Mat Pilates Inspired (Knee & Wrist Friendly)'),

  row('strength', NICOLE, 'rq_X1KMHeGE', '6:45', 'Parte alta, 5 minuti', '5 MIN UPPER BODY WORKOUT || Strong Arms, Chest &  Back (No Equipment)'),
  row('strength', NICOLE, 'BS7ZmDZ-PF4', '11:14', 'Braccia e parte alta', '10 MIN ARMS & UPPER BODY WORKOUT || At-Home Pilates'),
  row('strength', NICOLE, 'oiToJsf_SQ4', '31:50', 'Parte alta e postura', '30 MIN PILATES WORKOUT || Upper Body Pilates For Strength & Better Posture (Moderate)'),
  row('strength', NICOLE, '6wSbM7Oz7F0', '33:23', 'Pilates con i pesi', '30 MIN FULL BODY WORKOUT || Power Pilates With Weights (Moderate)'),
  row('strength', NICOLE, '9kelSX3a3AQ', '34:06', 'Tutto il corpo con l’elastico', '30 MIN FULL BODY MINI RESISTANCE BAND WORKOUT || At-Home Pilates'),
  row('strength', NICOLE, 'AMLSBnAxLbU', '36:24', 'Schiena forte', '35 MIN PILATES WORKOUT || Pilates For A Strong & Healthy Back (Intermediate)'),
  row('strength', NICOLE, 'YTN65n-a5t4', '41:55', 'Pesi ed elastico', '40 MIN FULL BODY WORKOUT || Pilates with Weights & Band'),

  row('yoga', ASH, 'yqqlLSrtlCk', '11:08', 'Anche più mobili', 'Hip Mobility Yoga at home 10 minute hips flexibility'),
  row('yoga', ASH, '9PM-ykqWjuE', '11:40', 'Stretching prima di dormire', 'Sleep Easy Relaxing Bedtime Stretch Routine'),
  row('yoga', NICOLE, 'UxU8OCsNbYY', '12:59', 'Yoga del mattino, 10 minuti', '10 MIN MORNING YOGA FLOW || Stretch Routine To Wake Up & Feel Good'),
  row('yoga', NICOLE, 'D0LvavdptdM', '13:31', 'Allungamento per chiudere', '10 MIN STRETCH & COOL DOWN ROUTINE || Feel Good Flow'),
  row('yoga', NICOLE, 'YKtDkKUHtPU', '19:12', 'Stretching di ogni giorno', '20 MIN DAILY YOGA STRETCH || Full Body Yoga Flow for Relaxation & Flexibility'),
  row('yoga', NICOLE, 'TDo4HU60IXY', '20:06', 'Stretching di tutto il corpo', '20 MIN YOGA FULL BODY STRETCH || Feel Good Flow'),
  row('yoga', NICOLE, '8cltCOUpYTQ', '20:22', 'Yoga dolce', '20 MIN GENTLE YOGA FLOW || Relaxing Flow to Stretch & Feel Good'),
  row('yoga', NICOLE, 'HvluUhDizIY', '21:25', 'Stretching del mattino', '20 MIN STRETCH ROUTINE || Morning Yoga Flow'),
  row('yoga', NICOLE, 'X5mR2UbzZ-g', '27:16', 'Stretching lungo', 'FULL BODY STRETCH || Feel Good Morning/Evening Flow + Cool Down'),
  row('yoga', NICOLE, 'HIuJA4xS4WM', '29:40', 'Yoga e pilates per le anche', '30 MIN YOGA PILATES FLOW || Yoga Workout For Healthy & Happy Hips'),
]
