import { useRef, useState } from 'react'
import { parseProgram } from '../cpu/parse'
import { LAB_PROGRAMS } from '../programs'
import { Btn, Dialog, Icon } from './ui'

export function LoadDialog({ onLoad, onClose }: { onLoad: (name: string, text: string) => void; onClose: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [text, setText] = useState('')
  const parsed = text.trim() ? parseProgram(text) : null

  return (
    <Dialog title="Wczytaj program do RAM" onClose={onClose}>
      <p className="m-hint">Program trafia do pamięci od adresu 0800h i startuje automatycznie.</p>

      <h3>Programy z laboratorium</h3>
      <div className="m-programs">
        {LAB_PROGRAMS.map((p) => (
          <button key={p.file} className="m-program" onClick={() => onLoad(p.file, p.text)}>
            <Icon name="file" />
            <span>
              <b>{p.file}</b>
              <small>{p.desc}</small>
            </span>
            <code>{p.text.trim().split(/\s+/).length} B</code>
          </button>
        ))}
      </div>

      <h3>Własny plik</h3>
      <button className="m-drop" onClick={() => fileRef.current?.click()}>
        <Icon name="upload" size={22} />
        <span><b>Wybierz plik .txt</b> albo upuść go w dowolnym miejscu okna</span>
      </button>
      <input ref={fileRef} type="file" accept=".txt,text/plain" hidden onChange={async (e) => {
        const f = e.target.files?.[0]
        if (f) onLoad(f.name, await f.text())
      }} />

      <h3>Wpisz bajty</h3>
      <textarea className="m-textarea" value={text} onChange={(e) => setText(e.target.value)}
        placeholder="3E 05 06 03 80 76" spellCheck={false} rows={3} aria-label="Bajty programu" />
      <div className="m-row m-row-between">
        <span className={parsed?.badTokens.length ? 'm-error' : 'm-hint'}>
          {!parsed ? 'Bajty szesnastkowe oddzielone spacjami.'
            : parsed.badTokens.length ? `${parsed.badTokens.length} niepoprawnych bajtów (nr ${parsed.badTokens.slice(0, 5).map((i) => i + 1).join(', ')}${parsed.badTokens.length > 5 ? '…' : ''}) – zostaną wczytane jako 00`
            : `${parsed.bytes.length} B · 0800h–${(0x800 + parsed.bytes.length - 1).toString(16).toUpperCase().padStart(4, '0')}h`}
        </span>
        <Btn variant="primary" disabled={!parsed} onClick={() => onLoad('wpisany program', text)}>Wczytaj</Btn>
      </div>
    </Dialog>
  )
}
