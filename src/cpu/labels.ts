import type { Cycle, CycleType, Lamp } from './i8080'
import { hex2, hex4 } from './parse'

export const CYCLE_NAMES: Record<CycleType, string> = {
  FETCH: 'Pobranie rozkazu',
  MEMR: 'Odczyt z pamięci',
  MEMW: 'Zapis do pamięci',
  STACKR: 'Odczyt ze stosu',
  STACKW: 'Zapis na stos',
  INPUT: 'Odczyt z wejścia',
  OUTPUT: 'Zapis na wyjście',
  INTA: 'Potwierdzenie przerwania',
  HALTA: 'Potwierdzenie zatrzymania',
  INTAH: 'Potwierdzenie przerwania podczas zatrzymania',
}

export const LAMP_HINTS: Record<Lamp, string> = {
  M1: 'pierwszy cykl rozkazu (pobranie kodu)',
  MEMR: 'odczyt z pamięci',
  MEMW: 'zapis do pamięci',
  IOR: 'odczyt z portu',
  IOW: 'zapis do portu',
  STACK: 'adres z wskaźnika stosu',
  HLTA: 'procesor zatrzymany (HLT)',
  INTA: 'potwierdzenie przerwania',
  HLDA: 'stan zawieszenia (HOLD)',
  INTE: 'przerwania odblokowane',
}

/** one-sentence description of what the bus is doing in this cycle */
export function explainCycle(c: Cycle): string {
  const a = hex4(c.addr) + 'h'
  const d = c.data === null ? '' : hex2(c.data) + 'h'
  const port = hex2(c.addr & 0xff) + 'h'
  switch (c.type) {
    case 'FETCH': return `Procesor pobiera kod rozkazu ${d} spod adresu ${a}.`
    case 'MEMR': return `Odczyt bajtu ${d} z pamięci spod adresu ${a}.`
    case 'MEMW': return `Zapis bajtu ${d} do pamięci pod adres ${a}.`
    case 'STACKR': return `Odczyt ze stosu: bajt ${d} spod adresu ${a}.`
    case 'STACKW': return `Zapis na stos: bajt ${d} pod adres ${a}.`
    case 'INPUT': return `Odczyt z portu ${port}: wartość ${d} trafia do akumulatora.`
    case 'OUTPUT': return `Zapis zawartości A (${d}) do portu ${port}.`
    case 'INTA': return 'Urządzenie zgłaszające przerwanie podaje na magistralę danych FFh, czyli rozkaz RST 7.'
    case 'INTAH': return 'Przerwanie budzi zatrzymany procesor: na magistrali danych FFh (RST 7).'
    case 'HALTA': return 'Procesor zatrzymany rozkazem HLT. Wznowi pracę po przerwaniu (INT), RESET albo Start.'
  }
}
