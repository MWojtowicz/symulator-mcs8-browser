// Holds the simulator shared by both interfaces and switches between them.
import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { Simulator } from './cpu/simulator'
import type { ParsedProgram } from './cpu/parse'
import ClassicApp from './classic/ClassicApp'
import ModernApp from './modern/ModernApp'
import { ViewSwitch, type UI } from './ViewSwitch'

export interface LoadInfo {
  /** increases with every load, so views can react to a new one */
  seq: number
  name: string
  parsed: ParsedProgram
}

export interface UIProps {
  sim: Simulator
  refresh: () => void
  loadInfo: LoadInfo | null
  loadProgram: (name: string, text: string) => void
  /** view switcher, rendered by each view at its bottom */
  viewSwitch: React.ReactNode
}

const UI_KEY = 'mcs8.ui'

function storedUI(): UI {
  try {
    return localStorage.getItem(UI_KEY) === 'modern' ? 'modern' : 'classic'
  } catch {
    return 'classic'
  }
}

export default function App() {
  const simRef = useRef<Simulator>(null)
  simRef.current ??= new Simulator()
  const sim = simRef.current
  const [, refresh] = useReducer((n: number) => n + 1, 0)
  const [loadInfo, setLoadInfo] = useState<LoadInfo | null>(null)
  const [ui, setUI] = useState<UI>(storedUI)

  useEffect(() => {
    document.body.dataset.ui = ui
    try { localStorage.setItem(UI_KEY, ui) } catch { /* private mode: not remembered */ }
  }, [ui])

  const loadProgram = useCallback((name: string, text: string) => {
    const parsed = sim.load(text)
    setLoadInfo((prev) => ({ seq: (prev?.seq ?? 0) + 1, name, parsed }))
    refresh()
  }, [sim])

  // dropping a program file anywhere loads it
  useEffect(() => {
    const over = (e: DragEvent) => e.preventDefault()
    const drop = async (e: DragEvent) => {
      e.preventDefault()
      const file = e.dataTransfer?.files[0]
      if (file) loadProgram(file.name, await file.text())
    }
    window.addEventListener('dragover', over)
    window.addEventListener('drop', drop)
    return () => { window.removeEventListener('dragover', over); window.removeEventListener('drop', drop) }
  }, [loadProgram])

  const props: UIProps = {
    sim, refresh, loadInfo, loadProgram,
    viewSwitch: <ViewSwitch ui={ui} onChange={setUI} />,
  }
  return ui === 'modern' ? <ModernApp {...props} /> : <ClassicApp {...props} />
}
