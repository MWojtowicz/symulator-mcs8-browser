// Modern dashboard over the same simulator core as the classic panel.
import { useEffect, useRef, useState } from 'react'
import type { UIProps } from '../App'
import { BusCard, ControlsCard, HistoryCard, ListingCard, PortsCard, RegistersCard, StackCard, type Speed } from './cards'
import { LoadDialog } from './LoadDialog'
import { Btn, Icon } from './ui'
import './modern.css'

const THEME_KEY = 'mcs8.theme'
type Theme = 'light' | 'dark'

function initialTheme(): Theme {
  try {
    const t = localStorage.getItem(THEME_KEY)
    if (t === 'light' || t === 'dark') return t
  } catch { /* storage unavailable */ }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/** interval in ms and steps per tick */
const SPEEDS: Record<Speed, [number, number]> = { slow: [500, 1], medium: [100, 1], fast: [25, 1], max: [16, 250] }

interface Toast { id: number; kind: 'ok' | 'error'; text: string }

export default function ModernApp({ sim, refresh, loadInfo, loadProgram, viewSwitch }: UIProps) {
  const [theme, setTheme] = useState<Theme>(initialTheme)
  const [loading, setLoading] = useState(false)
  const [running, setRunning] = useState(false)
  const [speed, setSpeed] = useState<Speed>('medium')
  const [toast, setToast] = useState<Toast | null>(null)
  const seenLoad = useRef(loadInfo?.seq ?? 0)

  useEffect(() => {
    try { localStorage.setItem(THEME_KEY, theme) } catch { /* not remembered */ }
    document.body.dataset.theme = theme
  }, [theme])

  // a successful load starts the program right away (the classic panel needs "Start od 800h")
  useEffect(() => {
    if (!loadInfo || loadInfo.seq === seenLoad.current) return
    seenLoad.current = loadInfo.seq
    setLoading(false)
    setRunning(false)
    const bad = loadInfo.parsed.badTokens
    if (bad.length === 0) {
      sim.startUser()
      refresh()
      setToast({ id: loadInfo.seq, kind: 'ok', text: `Wczytano ${loadInfo.name} (${loadInfo.parsed.bytes.length} B) · start od 0800h` })
    } else {
      setToast({ id: loadInfo.seq, kind: 'error', text: `Błędna składnia ${loadInfo.name}: ${bad.length} bajtów zastąpiono 00. Popraw plik i wczytaj ponownie.` })
    }
  }, [loadInfo, sim, refresh])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), toast.kind === 'ok' ? 3500 : 8000)
    return () => clearTimeout(t)
  }, [toast])

  // continuous run until HLT or HOLD
  useEffect(() => {
    if (!running) return
    const [ms, perTick] = SPEEDS[speed]
    const id = setInterval(() => {
      for (let i = 0; i < perTick; i++) {
        sim.step()
        if (sim.inHold || (sim.cycle.type === 'HALTA' && !sim.cpu.intRequest)) { setRunning(false); break }
      }
      refresh()
    }, ms)
    return () => clearInterval(id)
  }, [running, speed, sim, refresh])

  // Space / Enter = STEP
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (loading) return
      const t = e.target as HTMLElement
      if (t.closest('input, textarea, select, button, dialog')) return
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        setRunning(false)
        sim.step()
        refresh()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [loading, sim, refresh])

  const card = { sim, refresh }
  return (
    <div className="m-root" data-theme={theme}>
      <header className="m-header">
        <div className="m-brand">
          <span className="m-logo"><Icon name="chip" size={22} /></span>
          <div>
            <h1>MCS-8</h1>
            <p>Symulator Intel 8080 · praca krokowa</p>
          </div>
        </div>
        <div className="m-header-actions">
          <Btn variant="primary" icon="upload" onClick={() => setLoading(true)}>Wczytaj program</Btn>
          <Btn variant="ghost" icon={theme === 'dark' ? 'sun' : 'moon'} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label={theme === 'dark' ? 'Jasny motyw' : 'Ciemny motyw'} title={theme === 'dark' ? 'Jasny motyw' : 'Ciemny motyw'} />
          <a className="m-btn m-btn-ghost" href="https://github.com/MWojtowicz/symulator-mcs8-browser" target="_blank" rel="noreferrer"
            aria-label="Kod źródłowy na GitHubie" title="GitHub"><Icon name="github" /></a>
        </div>
      </header>

      <main className="m-grid">
        <BusCard {...card} />
        <ControlsCard {...card} running={running} onRun={setRunning} speed={speed} onSpeed={setSpeed} />
        <RegistersCard {...card} />
        <ListingCard {...card} programName={loadInfo?.name ?? null} onLoad={() => setLoading(true)} />
        <PortsCard {...card} />
        <StackCard {...card} />
        <HistoryCard {...card} />
      </main>

      <footer className="m-footer">
        <div className="m-footer-switch">{viewSwitch}</div>
        Spacja / Enter = STEP · liczby: <code>34h</code>, <code>1010b</code>, <code>52</code> · port oryginalnego symulatora MCS-8 (J. Pawlewski, UŚ 2004)
      </footer>

      {loading && <LoadDialog onLoad={loadProgram} onClose={() => setLoading(false)} />}
      {toast && (
        <div key={toast.id} className={`m-toast ${toast.kind}`} role="status">
          {toast.text}
          <button onClick={() => setToast(null)} aria-label="Zamknij"><Icon name="close" size={16} /></button>
        </div>
      )}
    </div>
  )
}
