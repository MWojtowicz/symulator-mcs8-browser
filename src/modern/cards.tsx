// Cards of the modern dashboard. All of them read the shared Simulator directly.
import { useEffect, useRef, useState } from 'react'
import { LAMPS, PROGRAM_START } from '../cpu/i8080'
import type { Simulator } from '../cpu/simulator'
import { CYCLE_NAMES, LAMP_HINTS, explainCycle } from '../cpu/labels'
import { listingRows } from '../cpu/listing'
import { hex2, hex4, parseNumber } from '../cpu/parse'
import { disassemble } from '../cpu/disasm'
import { Btn, Card, EditableValue, Icon, Segmented, Switch } from './ui'

interface CardProps {
  sim: Simulator
  refresh: () => void
}

const IO_CHIPS: Record<number, string> = { 0x84: '8251', 0x88: '8253', 0xa0: '8255', 0xa4: '8251' }

function Bits({ value, count }: { value: number | null; count: number }) {
  return (
    <div className="m-bits" aria-hidden>
      {[...Array(count)].map((_, i) => {
        const bit = count - 1 - i
        const on = value !== null && (value >> bit) & 1
        return <span key={i} className={`${on ? 'on' : ''}${bit % 4 === 0 && bit ? ' gap' : ''}`} />
      })}
    </div>
  )
}

function Readout({ label, value, digits }: { label: string; value: number | null; digits: number }) {
  const text = value === null ? '–'.repeat(digits) : value.toString(16).toUpperCase().padStart(digits, '0')
  return (
    <div className="m-readout">
      <div className="m-readout-label">{label}</div>
      <div className="m-readout-value" aria-label={value === null ? `${label}: wysoka impedancja` : `${label}: ${text}h`}>
        {text}
        {value !== null && <small>{value}</small>}
      </div>
      <Bits value={value} count={digits * 4} />
    </div>
  )
}

export function BusCard({ sim }: CardProps) {
  const { cycle } = sim
  const hold = sim.inHold
  const lamps = sim.lamps
  const instr = sim.history.at(-1)?.instr ?? disassemble(sim.cpu.mem, sim.instrAddr).text
  return (
    <Card title="Magistrale i sygnały" area="bus">
      <div className="m-cycle">
        <span className="m-badge">{hold ? 'HOLD' : cycle.type === 'HALTA' ? 'HLT' : `M${sim.cycleIndex}`}</span>
        <div>
          <div className="m-cycle-name">{hold ? 'Stan zawieszenia – magistrale odłączone' : CYCLE_NAMES[cycle.type]}</div>
          <div className="m-cycle-instr"><code>{hex4(sim.instrAddr)}</code> {instr}</div>
        </div>
      </div>
      <div className="m-readouts">
        <Readout label="ADDRESS BUS" value={hold ? null : cycle.addr} digits={4} />
        <Readout label="DATA BUS" value={hold ? null : cycle.data} digits={2} />
      </div>
      <ul className="m-lamps" aria-label="Kontrolki cyklu">
        {LAMPS.map((l) => (
          <li key={l} className={lamps.has(l) ? 'on' : undefined} title={LAMP_HINTS[l]}>
            <span className="m-led" aria-hidden />{l}
            <span className="m-sr">{lamps.has(l) ? ' świeci' : ' zgaszona'}</span>
          </li>
        ))}
      </ul>
      <p className="m-explain">
        {hold ? 'Magistrale w stanie wysokiej impedancji (HLDA). Wyłącz HOLD i naciśnij STEP, aby wrócić do pracy.' : explainCycle(cycle)}
      </p>
    </Card>
  )
}

export type Speed = 'slow' | 'medium' | 'fast' | 'max'

export function ControlsCard({ sim, refresh, running, onRun, speed, onSpeed }: CardProps & {
  running: boolean
  onRun: (v: boolean) => void
  speed: Speed
  onSpeed: (s: Speed) => void
}) {
  const act = (fn: () => void) => () => { fn(); refresh() }
  const finishing = sim.instrMode && !sim.cycle.first
  return (
    <Card title="Sterowanie" area="ctl" className="m-controls">
      <Btn variant="primary" className="m-step" onClick={act(() => { onRun(false); sim.step() })}>
        <Icon name="step" size={22} />
        <span>
          STEP
          <small>{sim.effectiveMode === 'instruction' ? 'jeden rozkaz' : 'jeden cykl maszynowy'}</small>
        </span>
        <kbd>Spacja</kbd>
      </Btn>

      <div className="m-field">
        <span className="m-field-label">Tryb pracy krokowej (M/INSTR)</span>
        <Segmented label="Tryb pracy krokowej" value={sim.instrMode ? 'i' : 'm'}
          options={[{ value: 'm', label: 'Cykle maszynowe' }, { value: 'i', label: 'Rozkazy' }]}
          onChange={(v) => { sim.instrMode = v === 'i'; refresh() }} />
        {finishing && <p className="m-note">Bieżący rozkaz zostanie dokończony po cyklach.</p>}
      </div>

      <div className="m-field">
        <span className="m-field-label">Praca ciągła</span>
        <div className="m-row">
          <Btn variant={running ? 'primary' : 'soft'} icon={running ? 'pause' : 'play'} onClick={() => onRun(!running)}
            disabled={!running && sim.cycle.type === 'HALTA' && !sim.cpu.intRequest}>
            {running ? 'Pauza' : 'Uruchom'}
          </Btn>
          <Segmented label="Szybkość" value={speed} onChange={onSpeed}
            options={[{ value: 'slow', label: '2/s' }, { value: 'medium', label: '10/s' }, { value: 'fast', label: '40/s' }, { value: 'max', label: 'max' }]} />
        </div>
      </div>

      <div className="m-row m-row-wrap">
        <Btn icon="start" onClick={act(() => { onRun(false); sim.startUser() })} disabled={!sim.programLoaded}
          title={sim.programLoaded ? 'Zeruje rejestry, PC = 0800h, SP = 0FFFh' : 'Najpierw wczytaj poprawny program'}>
          Start od 0800h
        </Btn>
        <Btn icon="reset" variant="danger" onClick={act(() => { onRun(false); sim.reset() })} title="Start BIOS-u od 0000h, porty = FFh">
          RESET
        </Btn>
      </div>
      <div className="m-row m-row-wrap">
        <Btn icon="bolt" onClick={act(() => sim.interrupt())} disabled={!sim.cpu.inte}
          className={sim.cpu.intRequest ? 'pending' : undefined}
          title={sim.cpu.inte ? 'Zgłoś przerwanie RST 7 (skok do 0B00h)' : 'Przerwania zablokowane (DI)'}>
          {sim.cpu.intRequest ? 'INT zgłoszone' : 'INT'}
        </Btn>
        <Switch label="HOLD" checked={sim.holdRequest} hint="Wstrzymanie procesora w następnym cyklu"
          onChange={(v) => { sim.holdRequest = v; refresh() }} />
      </div>
    </Card>
  )
}

type Reg8 = 'a' | 'b' | 'c' | 'd' | 'e' | 'h' | 'l'

function RegTile({ name, value, bits, onCommit, wide }: { name: string; value: number; bits: 8 | 16; onCommit: (v: number) => void; wide?: boolean }) {
  return (
    <div className={`m-reg${wide ? ' wide' : ''}`}>
      <span className="m-reg-name">{name}</span>
      <EditableValue value={value} bits={bits} label={name} onCommit={onCommit} className="m-reg-value" />
      <span className="m-reg-sub">{bits === 8 ? value.toString(2).padStart(8, '0') : `${value} dec`}</span>
    </div>
  )
}

export function RegistersCard({ sim, refresh }: CardProps) {
  const cpu = sim.cpu
  const set8 = (r: Reg8) => (v: number) => { cpu[r] = v; refresh() }
  const flags = [
    ['S', 'fs', 'znak – bit 7 wyniku'], ['Z', 'fz', 'zero – wynik = 0'], ['AC', 'fac', 'przeniesienie pomocnicze z bitu 3'],
    ['P', 'fp', 'parzystość – parzysta liczba jedynek'], ['CY', 'fcy', 'przeniesienie / pożyczka'],
  ] as const
  return (
    <Card title="Rejestry i flagi" area="reg" actions={<span className="m-hint">kliknij wartość, aby zmienić</span>}>
      <div className="m-regs">
        <RegTile name="A" value={cpu.a} bits={8} onCommit={set8('a')} wide />
        {(['b', 'c', 'd', 'e', 'h', 'l'] as const).map((r) => (
          <RegTile key={r} name={r.toUpperCase()} value={cpu[r]} bits={8} onCommit={set8(r)} />
        ))}
        <RegTile name="SP" value={cpu.sp} bits={16} onCommit={(v) => { cpu.sp = v; refresh() }} />
        <RegTile name="PC" value={cpu.pc} bits={16} onCommit={(v) => { sim.setPC(v); refresh() }} />
      </div>
      <div className="m-pairs">
        <span>BC = <code>{hex4(cpu.bc)}h</code></span>
        <span>DE = <code>{hex4(cpu.de)}h</code></span>
        <span>HL = <code>{hex4(cpu.hl)}h</code></span>
        <span>M[HL] = <code>{hex2(cpu.mem[cpu.hl])}h</code></span>
      </div>
      <div className="m-flags">
        {flags.map(([n, key, hint]) => (
          <button key={n} className={`m-flag${cpu[key] ? ' on' : ''}`} aria-pressed={cpu[key]}
            title={`${hint} — kliknij, aby przełączyć`} onClick={() => { cpu[key] = !cpu[key]; refresh() }}>
            <span>{n}</span><b>{+cpu[key]}</b>
          </button>
        ))}
      </div>
      <div className="m-flagreg">
        Rejestr flagowy <code>{cpu.flags.toString(2).padStart(8, '0')}</code>
        <span className="m-hint">S Z 0 AC 0 P 1 CY</span>
      </div>
    </Card>
  )
}

export function ListingCard({ sim, programName, onLoad }: CardProps & { programName: string | null; onLoad: () => void }) {
  const { inProgram, rows } = listingRows(sim)
  const cur = sim.instrAddr
  const empty = sim.programLength === 0 && cur >= PROGRAM_START
  const boxRef = useRef<HTMLDivElement>(null)

  // keep the current row visible inside the card without scrolling the page
  useEffect(() => {
    const box = boxRef.current
    const row = box?.querySelector<HTMLElement>('.current')
    if (!box || !row) return
    const top = row.offsetTop - box.offsetTop
    if (top < box.scrollTop || top + row.offsetHeight > box.scrollTop + box.clientHeight) {
      box.scrollTop = top - box.clientHeight / 3
    }
  })

  return (
    <Card area="lst" className="m-listing"
      title={inProgram ? (programName ?? 'Program') : empty ? 'Program' : `Kod od ${hex4(cur)}h`}
      actions={<Btn variant="ghost" icon="upload" onClick={onLoad}>Wczytaj</Btn>}>
      {empty ? (
        <div className="m-empty">
          <p>Brak programu w pamięci RAM.</p>
          <Btn variant="primary" icon="upload" onClick={onLoad}>Wczytaj program</Btn>
          <p className="m-hint">albo upuść plik .txt na okno</p>
        </div>
      ) : (
        <div className="m-listing-box" ref={boxRef}>
          <table>
            <thead><tr><th /><th>Adres</th><th>Bajty</th><th>Asembler</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.addr} className={r.addr === cur ? 'current' : undefined}>
                  <td className="m-gutter">{r.addr === cur ? '▶' : ''}</td>
                  <td>{hex4(r.addr)}</td>
                  <td className="m-muted">{r.bytes}</td>
                  <td>{r.text}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!inProgram && sim.programLength > 0 && <p className="m-note">Procesor wykonuje kod poza wczytanym programem (BIOS lub obsługa przerwania).</p>}
    </Card>
  )
}

export function PortsCard({ sim, refresh }: CardProps) {
  const ports = sim.cpu.ports
  const [sel, setSel] = useState<number | null>(null)
  const [text, setText] = useState('')
  const [bad, setBad] = useState(false)
  const io = !sim.inHold && (sim.cycle.type === 'INPUT' || sim.cycle.type === 'OUTPUT') ? sim.cycle.addr & 0xff : -1
  const changed = [...ports].map((v, i) => [i, v] as const).filter(([, v]) => v !== 0xff)

  const pick = (p: number) => { setSel(p); setText(hex2(ports[p]) + 'h'); setBad(false) }
  const save = () => {
    if (sel === null) return
    const v = parseNumber(text, 255)
    if (v === null) return setBad(true)
    ports[sel] = v
    refresh()
  }

  return (
    <Card title="Porty wejścia/wyjścia" area="prt"
      actions={<span className="m-hint">{changed.length ? `${changed.length} różnych od FFh` : 'wszystkie = FFh'}</span>}>
      <div className="m-port-editor">
        {sel === null ? (
          <span className="m-hint">Wybierz port w tabeli, aby zmienić jego wartość (np. dla rozkazu IN).</span>
        ) : (
          <form className="m-row" onSubmit={(e) => { e.preventDefault(); save() }}>
            <span>Port <b>{hex2(sel)}h</b>{IO_CHIPS[sel] ? ` (${IO_CHIPS[sel]})` : ''} =</span>
            <input className={`m-input${bad ? ' bad' : ''}`} value={text} size={8} aria-label="Nowa wartość portu"
              onChange={(e) => { setText(e.target.value); setBad(false) }} onFocus={(e) => e.target.select()} spellCheck={false} autoFocus key={sel} />
            <Btn variant="primary" type="submit">Ustaw</Btn>
            <Btn variant="ghost" type="button" onClick={() => { ports[sel] = 0xff; setText('FFh'); refresh() }}>FFh</Btn>
            {bad && <span className="m-error">0–255, przyrostek b/h/d</span>}
          </form>
        )}
      </div>
      <div className="m-ports-scroll">
        <table className="m-ports">
          <thead>
            <tr><th />{[...Array(16)].map((_, c) => <th key={c}>{c.toString(16).toUpperCase()}</th>)}</tr>
          </thead>
          <tbody>
            {[...Array(16)].map((_, r) => (
              <tr key={r}>
                <th>{r.toString(16).toUpperCase()}0</th>
                {[...Array(16)].map((_, c) => {
                  const p = r * 16 + c
                  const cls = [ports[p] !== 0xff && 'changed', p === io && 'active', p === sel && 'sel', IO_CHIPS[p] && 'chip'].filter(Boolean).join(' ')
                  return (
                    <td key={c} className={cls || undefined}>
                      <button onClick={() => pick(p)} title={`Port ${hex2(p)}h = ${ports[p]}${IO_CHIPS[p] ? ` · ${IO_CHIPS[p]}` : ''}`}>
                        {hex2(ports[p])}
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="m-legend">
        <span><i className="changed" /> zmieniony</span>
        <span><i className="active" /> bieżący cykl IN/OUT</span>
        <span><i className="chip" /> układy 8251/8253/8255</span>
      </div>
    </Card>
  )
}

export function StackCard({ sim }: CardProps) {
  const { cpu } = sim
  const top = cpu.mem[cpu.sp] | (cpu.mem[(cpu.sp + 1) & 0xffff] << 8)
  return (
    <Card title="Stos" area="stk" actions={<span className="m-hint">SP = {hex4(cpu.sp)}h</span>}>
      <ol className="m-stack">
        {[...Array(8)].map((_, i) => {
          const ad = (cpu.sp + i) & 0xffff
          return (
            <li key={i} className={i === 0 ? 'top' : undefined}>
              <span className="m-muted">{i === 0 ? 'SP →' : `+${i}`}</span>
              <code>{hex4(ad)}h</code>
              <b>{hex2(cpu.mem[ad])}h</b>
            </li>
          )
        })}
      </ol>
      <p className="m-note">Słowo na wierzchołku (np. adres powrotu): <code>{hex4(top)}h</code></p>
    </Card>
  )
}

export function HistoryCard({ sim }: CardProps) {
  const items = sim.history.slice(-60).reverse()
  return (
    <Card title="Historia cykli" area="his" actions={<span className="m-hint">ostatnie {items.length}</span>}>
      <div className="m-history">
        <table>
          <thead><tr><th>#</th><th>M</th><th>Cykl</th><th>Adres</th><th>Dane</th><th>Rozkaz</th></tr></thead>
          <tbody>
            {items.map((h, i) => (
              <tr key={h.n} className={`${h.m === 1 ? 'm1' : ''}${i === 0 ? ' now' : ''}`}>
                <td className="m-muted">{h.n}</td>
                <td>M{h.m}</td>
                <td>{CYCLE_NAMES[h.cycle.type]}</td>
                <td><code>{hex4(h.cycle.addr)}</code></td>
                <td><code>{h.cycle.data === null ? '––' : hex2(h.cycle.data)}</code></td>
                <td className="m-muted">{h.instr}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
