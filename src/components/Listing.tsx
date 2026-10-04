// Optional memory view (not in the original simulator): disassembly of the loaded
// program, or of the code around the current instruction when it runs elsewhere (BIOS, 0B00h).
import type { Simulator } from '../cpu/simulator'
import { disassemble } from '../cpu/disasm'
import { hex2, hex4 } from '../cpu/parse'
import { PROGRAM_START } from '../cpu/i8080'

export function Listing({ sim, width }: { sim: Simulator; width: number }) {
  const { mem } = sim.cpu
  const cur = sim.instrAddr
  const progEnd = PROGRAM_START + Math.max(sim.programLength, 1)
  const inProgram = sim.programLength > 0 && cur >= PROGRAM_START && cur < progEnd

  const rows: { addr: number; bytes: string; text: string }[] = []
  let addr = inProgram ? PROGRAM_START : cur
  const end = inProgram ? progEnd : Infinity
  while (addr < end && rows.length < (inProgram ? 4096 : 24)) {
    const d = disassemble(mem, addr)
    const bytes = [...Array(d.length)].map((_, i) => hex2(mem[(addr + i) & 0xffff])).join(' ')
    rows.push({ addr, bytes, text: d.text })
    addr = (addr + d.length) & 0xffff
    if (addr === 0) break
  }

  return (
    <section className="listing" style={{ width }} aria-label="Podgląd pamięci">
      <h2>{inProgram ? 'Program od 0800h' : `Kod od ${hex4(cur)}h (bieżący rozkaz)`}</h2>
      <p className="hint">Dodatek – oryginalny symulator nie ma podglądu pamięci. Dane (np. tablica w zadaniu 4) też są tu pokazane jako rozkazy.</p>
      <table>
        <thead><tr><th>Adres</th><th>Bajty</th><th>Asembler</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.addr} className={r.addr === cur ? 'current' : undefined}>
              <td>{hex4(r.addr)}</td>
              <td>{r.bytes}</td>
              <td>{r.text}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
