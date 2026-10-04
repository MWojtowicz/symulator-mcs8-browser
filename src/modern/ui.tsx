// Small building blocks of the modern interface.
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { parseNumber } from '../cpu/parse'

const ICONS = {
  step: 'M6 5v14M10 5l9 7-9 7z',
  play: 'M7 5l12 7-12 7z',
  pause: 'M8 5v14M16 5v14',
  reset: 'M4 4v6h6M4.5 15a8 8 0 1 0 1.9-8.3L4 10',
  start: 'M5 12h12M13 6l6 6-6 6',
  upload: 'M12 16V4M7 9l5-5 5 5M5 20h14',
  sun: 'M12 4V2M12 22v-2M4 12H2M22 12h-2M5.6 5.6 4.2 4.2M19.8 19.8l-1.4-1.4M5.6 18.4l-1.4 1.4M19.8 4.2l-1.4 1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z',
  bolt: 'M13 2 4 14h7l-1 8 9-12h-7z',
  hand: 'M8 13V5.5a1.5 1.5 0 0 1 3 0V12M11 11V4.5a1.5 1.5 0 0 1 3 0V12M14 11.5V6a1.5 1.5 0 0 1 3 0v8a6 6 0 0 1-6 6h-.5a6 6 0 0 1-5-2.7L3 13.5a1.5 1.5 0 0 1 2.5-1.7L8 15',
  close: 'M6 6l12 12M18 6 6 18',
  file: 'M14 3H6v18h12V7zM14 3v4h4',
  chip: 'M8 8h8v8H8zM5 9H3M5 15H3M21 9h-2M21 15h-2M9 5V3M15 5V3M9 21v-2M15 21v-2M5 5h14v14H5z',
  github: 'M9 19c-4 1.5-4-2-6-2.5M15 21v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.3 4.3 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12 12 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.3 4.3 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21',
} as const
export type IconName = keyof typeof ICONS

export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg className="m-icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={ICONS[name]} />
    </svg>
  )
}

export function Card({ title, area, actions, children, className = '' }: {
  title: ReactNode
  area: string
  actions?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`m-card ${className}`} style={{ gridArea: area }}>
      <header className="m-card-head">
        <h2>{title}</h2>
        {actions && <div className="m-card-actions">{actions}</div>}
      </header>
      {children}
    </section>
  )
}

type Variant = 'primary' | 'ghost' | 'soft' | 'danger'

export function Btn({ variant = 'soft', icon, children, className = '', ...rest }: {
  variant?: Variant
  icon?: IconName
  children?: ReactNode
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`m-btn m-btn-${variant} ${className}`} {...rest}>
      {icon && <Icon name={icon} />}
      {children}
    </button>
  )
}

export function Segmented<T extends string>({ value, options, onChange, label }: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
  label: string
}) {
  return (
    <div className="m-seg" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} role="radio" aria-checked={o.value === value}
          className={o.value === value ? 'on' : undefined} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Switch({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <button className="m-switch" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} title={hint}>
      <span className="m-switch-track"><span className="m-switch-thumb" /></span>
      {label}
    </button>
  )
}

/**
 * Value that turns into an input on click. Accepts the simulator's number format
 * (suffix b / h / d, none = decimal); Enter or blur commits, Escape cancels.
 */
export function EditableValue({ value, bits, onCommit, label, className = '' }: {
  value: number
  bits: 8 | 16
  onCommit: (v: number) => void
  label: string
  className?: string
}) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState('')
  const [bad, setBad] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const digits = bits / 4
  const shown = value.toString(16).toUpperCase().padStart(digits, '0')

  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  const commit = () => {
    const v = parseNumber(text, bits === 8 ? 255 : 65535)
    if (v === null) { setBad(true); inputRef.current?.focus(); return }
    onCommit(v)
    setEditing(false)
  }

  if (!editing) {
    return (
      <button className={`m-edit ${className}`} onClick={() => { setText(shown + 'h'); setBad(false); setEditing(true) }}
        title={`${label}: ${value} dziesiętnie — kliknij, aby zmienić`} aria-label={`${label} = ${shown}h, zmień`}>
        {shown}<small>h</small>
      </button>
    )
  }
  return (
    <input
      ref={inputRef}
      className={`m-edit-input ${className}${bad ? ' bad' : ''}`}
      value={text}
      size={digits + 3}
      aria-label={`Nowa wartość ${label}`}
      aria-invalid={bad}
      spellCheck={false}
      onChange={(e) => { setText(e.target.value); setBad(false) }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit()
        if (e.key === 'Escape') setEditing(false)
      }}
      onBlur={() => (parseNumber(text, bits === 8 ? 255 : 65535) === null ? setEditing(false) : commit())}
    />
  )
}

export function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (d && !d.open) d.showModal()
  }, [])
  return (
    <dialog ref={ref} className="m-dialog" onClose={onClose} onClick={(e) => { if (e.target === ref.current) onClose() }}>
      <div className="m-dialog-body">
        <header className="m-dialog-head">
          <h2>{title}</h2>
          <Btn variant="ghost" icon="close" onClick={onClose} aria-label="Zamknij" />
        </header>
        {children}
      </div>
    </dialog>
  )
}
