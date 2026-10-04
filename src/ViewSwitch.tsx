// Toggle between the classic panel and the modern interface, shown at the bottom of both.
import './view-switch.css'

export type UI = 'classic' | 'modern'

const OPTIONS: { value: UI; label: string; hint: string }[] = [
  { value: 'classic', label: 'Widok klasyczny', hint: 'wygląd oryginalnego symulatora' },
  { value: 'modern', label: 'Nowy interfejs', hint: 'karty, historia cykli, praca ciągła' },
]

export function ViewSwitch({ ui, onChange }: { ui: UI; onChange: (ui: UI) => void }) {
  return (
    <div className="vs" role="radiogroup" aria-label="Wybór interfejsu">
      <span className="vs-label">Interfejs:</span>
      {OPTIONS.map((o) => (
        <button key={o.value} role="radio" aria-checked={ui === o.value} className={ui === o.value ? 'on' : undefined}
          onClick={() => onChange(o.value)} title={o.hint}>
          {o.label}
        </button>
      ))}
    </div>
  )
}
