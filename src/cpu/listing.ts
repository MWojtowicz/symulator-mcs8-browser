// Rows for the memory views: the loaded program from 0800h, or the code around
// the current instruction when it runs elsewhere (BIOS, interrupt handler at 0B00h).
import type { Simulator } from './simulator'
import { disassemble } from './disasm'
import { hex2 } from './parse'
import { PROGRAM_START } from './i8080'

export interface ListingRow {
  addr: number
  bytes: string
  text: string
}

export function listingRows(sim: Simulator): { inProgram: boolean; rows: ListingRow[] } {
  const { mem } = sim.cpu
  const cur = sim.instrAddr
  const progEnd = PROGRAM_START + Math.max(sim.programLength, 1)
  const inProgram = sim.programLength > 0 && cur >= PROGRAM_START && cur < progEnd

  const rows: ListingRow[] = []
  let addr = inProgram ? PROGRAM_START : cur
  const end = inProgram ? progEnd : Infinity
  while (addr < end && rows.length < (inProgram ? 4096 : 24)) {
    const d = disassemble(mem, addr)
    const bytes = [...Array(d.length)].map((_, i) => hex2(mem[(addr + i) & 0xffff])).join(' ')
    rows.push({ addr, bytes, text: d.text })
    addr = (addr + d.length) & 0xffff
    if (addr === 0) break
  }
  return { inProgram, rows }
}
