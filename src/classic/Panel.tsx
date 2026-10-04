// Front-panel pieces drawn with the original simulator's bitmaps.
import { LAMPS, type Lamp as LampName } from '../cpu/i8080'

// bundled (inlined in the single-file build) so the app also runs straight from disk
const images = import.meta.glob('./img/*', { query: '?url', import: 'default', eager: true }) as Record<string, string>
export const img = (name: string) => images[`./img/${name}`]

/** 7-segment display; null shows dashes (bus in high impedance) */
export function SevenSeg({ value, digits }: { value: number | null; digits: number }) {
  const chars = value === null ? '-'.repeat(digits) : value.toString(16).padStart(digits, '0')
  return (
    <div className="seg" aria-label={value === null ? 'magistrala w stanie wysokiej impedancji' : chars.toUpperCase() + 'h'}>
      {[...chars].map((ch, i) => (
        <img key={i} src={img(ch === '-' ? 'seg_dash.gif' : `seg_${ch}.gif`)} alt="" draggable={false} />
      ))}
    </div>
  )
}

export function Lamps({ on }: { on: Set<LampName> }) {
  return (
    <ul className="lamps">
      {LAMPS.map((name) => (
        <li key={name}>
          <img src={img(on.has(name) ? 'lamp_on.png' : 'lamp_off.png')} alt={on.has(name) ? 'świeci' : 'zgaszona'} />
          {name}
        </li>
      ))}
    </ul>
  )
}

interface KeyProps {
  label: string
  color: 'red' | 'grey'
  /** latched keys show their pressed state; momentary keys look pressed while held */
  pressed?: boolean
  onPress: () => void
  title?: string
  style?: React.CSSProperties
}

export function PanelKey({ label, color, pressed, onPress, title, style }: KeyProps) {
  return (
    <button
      className={`key key-${color}${pressed ? ' latched' : ''}`}
      onClick={onPress}
      aria-pressed={pressed}
      title={title}
      style={style}
    >
      <span className="key-cap" />
      <span className="key-label">{label}</span>
    </button>
  )
}
