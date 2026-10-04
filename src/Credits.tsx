// "Autorzy i licencje" panel at the bottom of both views. It also carries React's MIT
// notice, which must ship with every copy of the bundled app (see CREDITS.md).
import reactLicense from '../node_modules/react/LICENSE?raw'
import './credits.css'

export function Credits() {
  return (
    <details className="cr">
      <summary>Autorzy i licencje</summary>
      <div className="cr-body">
        <p>
          <b>Oryginalny symulator:</b> Jakub Pawlewski, <i>Symulator systemu MCS-8 w środowisku MAMS. Praca krokowa</i>,
          praca dyplomowa (promotor: dr inż. Jarosław Zyguła), Uniwersytet Śląski, Instytut Informatyki,
          Zakład Systemów Komputerowych, Sosnowiec 2004. Z tej pracy pochodzą działanie symulatora oraz grafiki
          i układ widoku klasycznego.
        </p>
        <p>
          <b>BIOS systemu MCS-8.2:</b> z dystrybucji oryginalnego symulatora (autor nieustalony). System MCS-8 opisali
          m.in. Miłosz Dąbrowski i Rafał Gałuszka w pracy <i>Platforma projektowania aplikacji MCS-8</i>.
          Oryginał powstał dla platformy kształcenia zdalnego MAMS Uniwersytetu Śląskiego.
        </p>
        <p><b>Programy z laboratorium:</b> instrukcja <i>Laboratorium 1: Procesor 8-bitowy Intel 8080</i>, autor instrukcji: Damian Grygierczyk.</p>
        <p>Intel i 8080 są znakami towarowymi Intel Corporation; projekt nie jest związany z firmą Intel.</p>
        <p>
          <b>Port przeglądarkowy:</b> Michal Wojtowicz, z pomocą Claude Code (Anthropic), 2026 ·{' '}
          <a href="https://github.com/MWojtowicz/symulator-mcs8-browser/blob/main/CREDITS.md" target="_blank" rel="noreferrer">CREDITS.md</a>
        </p>
        <p><b>React, React DOM, Scheduler</b> (dołączone do aplikacji):</p>
        <pre>{reactLicense.trim()}</pre>
      </div>
    </details>
  )
}
