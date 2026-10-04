// Secondary screens: loading a program, changing a port, changing registers/flags.
import { useRef, useState } from 'react'
import type { Simulator } from '../cpu/simulator'
import { hex2, hex4, parseNumber } from '../cpu/parse'

const programs = import.meta.glob('../programs/*.txt', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

const PROGRAM_INFO: [string, string][] = [
  ['start.txt', 'rozgrzewka: 5 + 3'],
  ['przyklad.txt', 'zadanie 1 – cykl rozkazowy'],
  ['flagi.txt', 'zadanie 2 – flagi'],
  ['suma.txt', 'zadanie 3 – pętla'],
  ['tablica.txt', 'zadanie 4 – tablica w pamięci'],
  ['podprogram.txt', 'zadanie 5 – stos i podprogram'],
]

const NUMBER_HINT = 'Liczbę podaj z przyrostkiem: b – dwójkowo, h – szesnastkowo, d lub brak – dziesiętnie.'

export function LoadScreen({ onLoad, onCancel }: { onLoad: (name: string, text: string) => void; onCancel: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [text, setText] = useState('')
  return (
    <div className="screen">
      <p className="prompt">Wybierz plik tekstowy z kodem maszynowym (bajty szesnastkowe oddzielone spacjami, np. <code>3E 04 47 80 76</code>). Program trafi do RAM od adresu 0800h.</p>
      <div className="screen-row">
        <button className="action" onClick={() => fileRef.current?.click()}>Plik z dysku…</button>
        <input
          ref={fileRef}
          type="file"
          accept=".txt,text/plain"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0]
            if (f) onLoad(f.name, await f.text())
          }}
        />
        <button className="action" onClick={onCancel}>Anuluj</button>
      </div>
      <p className="prompt">Programy z laboratorium:</p>
      <div className="program-list">
        {PROGRAM_INFO.map(([file, desc]) => (
          <button key={file} className="action wide" onClick={() => onLoad(file, programs[`../programs/${file}`])}>
            <b>{file}</b> <span>{desc}</span>
          </button>
        ))}
      </div>
      <p className="prompt">…albo wpisz bajty ręcznie:</p>
      <textarea
        className="bytes-input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="3E 05 06 03 80 76"
        spellCheck={false}
      />
      <div className="screen-row">
        <button className="action" disabled={!text.trim()} onClick={() => onLoad('wpisany program', text)}>Wczytaj</button>
      </div>
    </div>
  )
}

function NumberEntry({ onSubmit, autoFocus = true }: { onSubmit: (raw: string) => void; autoFocus?: boolean }) {
  const [value, setValue] = useState('')
  return (
    <form
      className="entry"
      onSubmit={(e) => { e.preventDefault(); onSubmit(value); setValue('') }}
    >
      <span aria-hidden>▸</span>
      <input value={value} onChange={(e) => setValue(e.target.value)} autoFocus={autoFocus} aria-label="Wartość" spellCheck={false} />
      <button className="action small" type="submit">OK</button>
    </form>
  )
}

export function PortsScreen({ ports, initialPort, onSet, onClose }: {
  ports: Uint8Array
  initialPort: number | null
  onSet: (port: number, value: number) => void
  onClose: () => void
}) {
  const [port, setPort] = useState<number | null>(initialPort)
  const [error, setError] = useState('')
  return (
    <div className="screen">
      {port === null ? (
        <>
          <p className="prompt">Podaj numer portu, którego zawartość chcesz zmienić (0–255).</p>
          <p className="hint">{NUMBER_HINT}</p>
          <NumberEntry key="port" onSubmit={(raw) => {
            const n = parseNumber(raw, 255)
            if (n === null) setError('Niepoprawna liczba!')
            else { setError(''); setPort(n) }
          }} />
        </>
      ) : (
        <>
          <p className="prompt">Aktualna zawartość portu {hex2(port)}h to {hex2(ports[port])}h. Podaj nową wartość (0–255).</p>
          <p className="hint">{NUMBER_HINT}</p>
          <NumberEntry key="value" onSubmit={(raw) => {
            const n = parseNumber(raw, 255)
            if (n === null) setError('Niepoprawna liczba!')
            else { onSet(port, n); onClose() }
          }} />
        </>
      )}
      {error && <p className="error-text" role="alert">{error}</p>}
      <div className="screen-row">
        <button className="action" onClick={onClose}>Anuluj</button>
      </div>
    </div>
  )
}

type Reg8 = 'a' | 'b' | 'c' | 'd' | 'e' | 'h' | 'l'
type Flag = 'fac' | 'fz' | 'fcy' | 'fp' | 'fs'

export function RegistersScreen({ sim, onChange, onClose }: { sim: Simulator; onChange: () => void; onClose: () => void }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const cpu = sim.cpu

  const set8 = (r: Reg8) => {
    const n = parseNumber(value, 255)
    if (n === null) return setError('Niepoprawna liczba! (rejestr 8-bitowy: 0–255)')
    cpu[r] = n
    done()
  }
  const set16 = (r: 'pc' | 'sp') => {
    const n = parseNumber(value, 65535)
    if (n === null) return setError('Niepoprawna liczba! (rejestr 16-bitowy: 0–65535)')
    cpu[r] = n
    // a new PC means decoding starts again from that address
    if (r === 'pc') { cpu.halted = false; sim.restart() }
    done()
  }
  const toggle = (f: Flag) => { cpu[f] = !cpu[f]; setError(''); onChange() }
  const done = () => { setError(''); setValue(''); onChange(); inputRef.current?.focus() }

  const list: [string, string][] = [
    ['A', hex2(cpu.a) + 'h'], ['B', hex2(cpu.b) + 'h'], ['C', hex2(cpu.c) + 'h'], ['D', hex2(cpu.d) + 'h'],
    ['E', hex2(cpu.e) + 'h'], ['H', hex2(cpu.h) + 'h'], ['L', hex2(cpu.l) + 'h'],
    ['SP', hex4(cpu.sp) + 'h'], ['PC', hex4(cpu.pc) + 'h'],
    ['AC', String(+cpu.fac)], ['CY', String(+cpu.fcy)], ['Z', String(+cpu.fz)], ['P', String(+cpu.fp)], ['S', String(+cpu.fs)],
  ]
  const R = (label: string, fn: () => void) => <button key={label} className="action reg-btn" onClick={fn}>{label}</button>

  return (
    <div className="screen regs-screen">
      <div className="reg-list">
        {list.map(([n, v]) => <div key={n}><b>{n}:</b> {v}</div>)}
      </div>
      <div className="reg-edit">
        <p className="prompt">Wpisz nową wartość rejestru i kliknij odpowiedni przycisk, lub kliknij flagę, której wartość chcesz zmienić:</p>
        <div className="reg-grid">
          {R('A', () => set8('a'))}{R('H', () => set8('h'))}
          {R('B', () => set8('b'))}{R('L', () => set8('l'))}
          {R('C', () => set8('c'))}{R('PC', () => set16('pc'))}
          {R('D', () => set8('d'))}{R('SP', () => set16('sp'))}
          {R('E', () => set8('e'))}<span />
        </div>
        <div className="reg-grid flags">
          {R('AC', () => toggle('fac'))}{R('P', () => toggle('fp'))}
          {R('Z', () => toggle('fz'))}{R('S', () => toggle('fs'))}
          {R('CY', () => toggle('fcy'))}<span />
        </div>
        <div className="reg-grid">{R('Powrót', onClose)}</div>
        <div className="entry">
          <span aria-hidden>▸</span>
          <input ref={inputRef} value={value} onChange={(e) => setValue(e.target.value)} autoFocus aria-label="Nowa wartość" spellCheck={false} placeholder="np. 34h" />
        </div>
        <p className="hint">{NUMBER_HINT}</p>
        {error && <p className="error-text" role="alert">{error}</p>}
      </div>
    </div>
  )
}
