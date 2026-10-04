// The original look: an 800x600 Authorware screen scaled to the window.
import { useCallback, useEffect, useState } from 'react'
import { hex2, hex4 } from '../cpu/parse'
import type { UIProps } from '../App'
import { img, Lamps, PanelKey, SevenSeg } from './Panel'
import { LoadScreen, PortsScreen, RegistersScreen } from './Screens'
import { Listing } from './Listing'
import { Credits } from '../Credits'
import './classic.css'

type Screen = 'main' | 'load' | 'ports' | 'registers'

const STAGE_W = 800
const STAGE_H = 600
const IO_CHIP_PORTS = new Set([0x84, 0x88, 0xa0, 0xa4])

function useStageScale() {
  const [scale, setScale] = useState(1)
  useEffect(() => {
    const fit = () => {
      const w = window.innerWidth - 16
      const h = window.innerHeight - 120
      setScale(Math.max(0.3, Math.min(w / STAGE_W, h / STAGE_H, 2)))
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])
  return scale
}

export default function ClassicApp({ sim, refresh, loadInfo, loadProgram: load, viewSwitch }: UIProps) {
  const [screen, setScreen] = useState<Screen>('main')
  const [portToEdit, setPortToEdit] = useState<number | null>(null)
  const [showListing, setShowListing] = useState(false)
  const scale = useStageScale()

  const act = useCallback((fn: () => void) => () => { fn(); refresh() }, [refresh])

  const loadProgram = useCallback((name: string, text: string) => {
    load(name, text)
    setScreen('main')
  }, [load])

  // Space / Enter = STEP while on the main screen
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (screen !== 'main') return
      const t = e.target as HTMLElement
      if (t.closest('input, textarea, select, button')) return
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        sim.step()
        refresh()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [screen, sim, refresh])

  const { cpu, cycle } = sim
  const hold = sim.inHold
  const ioPort = !hold && (cycle.type === 'INPUT' || cycle.type === 'OUTPUT') ? cycle.addr & 0xff : -1
  const flagBits = cpu.flags.toString(2).padStart(8, '0')

  return (
    <div className="page classic-root">
      <div className="stage-frame" style={{ width: STAGE_W * scale, height: STAGE_H * scale }}>
        <div className="stage" style={{ transform: `scale(${scale})` }}>
          <img className="title" src={img('sym.png')} alt="Symulator MCS-8" draggable={false} />

          {screen === 'main' && (
            <>
              <div className="bus bus-addr">
                <SevenSeg value={hold ? null : cycle.addr} digits={4} />
                <div className="bus-label">ADRESS BUS</div>
              </div>
              <div className="bus bus-data">
                <SevenSeg value={hold ? null : cycle.data} digits={2} />
                <div className="bus-label">DATA BUS</div>
              </div>

              <table className="ports" aria-label="Porty wejścia/wyjścia">
                <thead>
                  <tr>
                    <th />
                    {[...Array(16)].map((_, c) => <th key={c}>{c.toString(16).toUpperCase()}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {[...Array(16)].map((_, r) => (
                    <tr key={r}>
                      <th>{(r * 16).toString(16).toUpperCase().padStart(2, '0')}:</th>
                      {[...Array(16)].map((_, c) => {
                        const port = r * 16 + c
                        const cls = [IO_CHIP_PORTS.has(port) && 'chip', port === ioPort && 'active'].filter(Boolean).join(' ')
                        return (
                          <td
                            key={c}
                            className={cls || undefined}
                            title={`Port ${hex2(port)}h = ${cpu.ports[port]} — kliknij, aby zmienić`}
                            onClick={() => { setPortToEdit(port); setScreen('ports') }}
                          >
                            {hex2(cpu.ports[port])}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>

              <Lamps on={sim.lamps} />

              <PanelKey label="STEP" color="red" onPress={act(() => sim.step())} title="Spacja / Enter" style={{ left: 240, top: 340 }} />
              <PanelKey label="INT" color="grey" pressed={cpu.intRequest} onPress={act(() => sim.interrupt())} style={{ left: 240, top: 402 }}
                title={cpu.inte ? 'Zgłoś przerwanie (RST 7)' : 'Przerwania zablokowane (DI)'} />
              <PanelKey label="HOLD" color="grey" pressed={sim.holdRequest} onPress={act(() => { sim.holdRequest = !sim.holdRequest })} style={{ left: 240, top: 463 }} />
              <PanelKey label="RESET" color="red" onPress={act(() => sim.reset())} title="Start BIOS-u od 0000h" style={{ left: 367, top: 340 }} />
              <PanelKey label="M/INSTR" color="grey" pressed={sim.instrMode} onPress={act(() => { sim.instrMode = !sim.instrMode })} style={{ left: 367, top: 402 }} />

              <div className="regs">
                <div>
                  {([['A', cpu.a], ['B', cpu.b], ['C', cpu.c], ['D', cpu.d], ['E', cpu.e], ['H', cpu.h], ['L', cpu.l]] as const).map(([n, v]) => (
                    <div key={n}><b>{n}:</b> {hex2(v)}h</div>
                  ))}
                  <div><b>SP:</b> {hex4(cpu.sp)}h</div>
                  <div><b>PC:</b> {hex4(cpu.pc)}h</div>
                </div>
                <div>
                  <div><b>Rej. flagowy:</b></div>
                  <div className="flagbits">{[...flagBits].map((b, i) => <span key={i}>{b}</span>)}</div>
                  <div className="flagbits names">{['S', 'Z', '', 'AC', '', 'P', '', 'CY'].map((n, i) => <span key={i}>{n}</span>)}</div>
                  <div className="stack-title"><b>Stos:</b></div>
                  {[0, 1, 2, 3].map((i) => {
                    const ad = (cpu.sp + i) & 0xffff
                    return <div key={i}>{hex4(ad)}h: {hex2(cpu.mem[ad])}h</div>
                  })}
                </div>
              </div>
              <div className="mode">
                Aktualny tryb: Praca krokowa po cyklach <b>{sim.effectiveMode === 'instruction' ? 'rozkazowych' : 'maszynowych'}</b>.
              </div>

              {loadInfo && (
                <div className={`load-msg${loadInfo.parsed.badTokens.length ? ' error' : ''}`} role="status">
                  {loadInfo.parsed.badTokens.length
                    ? `Błędna składnia pliku ${loadInfo.name}! Niepoprawne bajty (nr ${loadInfo.parsed.badTokens.slice(0, 6).map((i) => i + 1).join(', ')}${loadInfo.parsed.badTokens.length > 6 ? '…' : ''}) zastąpiono 00.`
                    : `Wczytano ${loadInfo.name}: ${loadInfo.parsed.bytes.length} B od 0800h`}
                </div>
              )}

              <div className="actions">
                <button className="action" onClick={() => setScreen('load')}>Wczytaj plik do RAM</button>
                <button className="action" disabled={!sim.programLoaded} onClick={act(() => sim.startUser())}
                  title={sim.programLoaded ? '' : 'Najpierw wczytaj poprawny plik z programem'}>Start od komórki 800h</button>
                <button className="action" onClick={() => { setPortToEdit(null); setScreen('ports') }}>Zmień zaw. portów</button>
                <button className="action" onClick={() => setScreen('registers')}>Zmień zaw. rejestrów</button>
              </div>
            </>
          )}

          {screen === 'load' && <LoadScreen onLoad={loadProgram} onCancel={() => setScreen('main')} />}
          {screen === 'ports' && (
            <PortsScreen
              ports={cpu.ports}
              initialPort={portToEdit}
              onSet={(port, v) => { cpu.ports[port] = v; refresh() }}
              onClose={() => setScreen('main')}
            />
          )}
          {screen === 'registers' && (
            <RegistersScreen sim={sim} onChange={refresh} onClose={() => setScreen('main')} />
          )}
        </div>
      </div>

      <div className="extras" style={{ width: STAGE_W * scale }}>
        <span>Spacja / Enter = STEP · klik w port = zmiana wartości · plik .txt można upuścić na okno</span>
        <button onClick={() => setShowListing((s) => !s)} aria-expanded={showListing}>
          {showListing ? 'Ukryj' : 'Pokaż'} podgląd pamięci
        </button>
      </div>
      {showListing && <Listing sim={sim} width={STAGE_W * scale} />}
      <div className="view-switch-bar">{viewSwitch}</div>
      <div className="credits-bar" style={{ width: STAGE_W * scale }}><Credits /></div>
    </div>
  )
}
