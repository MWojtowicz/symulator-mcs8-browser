// Optional memory view (not in the original simulator), shown below the classic panel.
import type { Simulator } from '../cpu/simulator'
import { listingRows } from '../cpu/listing'
import { hex4 } from '../cpu/parse'

export function Listing({ sim, width }: { sim: Simulator; width: number }) {
  const cur = sim.instrAddr
  const { inProgram, rows } = listingRows(sim)

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
