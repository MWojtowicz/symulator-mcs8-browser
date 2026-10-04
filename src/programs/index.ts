// Programs from the lab, bundled so they can be loaded with one click.
const texts = import.meta.glob('./*.txt', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

export interface LabProgram {
  file: string
  desc: string
  text: string
}

export const LAB_PROGRAMS: LabProgram[] = ([
  ['start.txt', 'rozgrzewka: 5 + 3'],
  ['przyklad.txt', 'zadanie 1 – cykl rozkazowy'],
  ['flagi.txt', 'zadanie 2 – flagi'],
  ['suma.txt', 'zadanie 3 – pętla'],
  ['tablica.txt', 'zadanie 4 – tablica w pamięci'],
  ['podprogram.txt', 'zadanie 5 – stos i podprogram'],
] as const).map(([file, desc]) => ({ file, desc, text: texts[`./${file}`] }))
