---
name: mcs8-simulator
description: Working on the MCS-8 (Intel 8080) browser simulator in this repo — how the original mcs8krok.exe behaves and which deviations are intentional, how the cycle-level CPU core and the two UIs (classic/modern) are built, how to verify changes in a headless browser, and how to build, publish GitHub Pages and cut a release. Use for any change to the CPU, the panels, the build or the release.
---

# MCS-8 browser simulator

Browser port of `mcs8krok.exe`, the step-by-step MCS-8 simulator written in Macromedia Authorware (Jakub Pawlewski's 2004 diploma thesis, Uniwersytet Śląski). The thesis PDF, the EXE and the lab instructions live in the parent lab folder, **not** in this repo:
`../symulator_MCS-8/Pawlewski.pdf` (chapter 5 describes the UI and behaviour; figure 6 on page 25 is the reference screenshot), `../Instrukcja_Lab1.docx`, `../programy/*.txt`.

React 19 + TypeScript + Vite. UI text is Polish; code comments are English.

## Commands

```
npm test              # vitest: CPU + front-panel behaviour on the lab programs
npm run dev           # dev server
npm run build         # tsc -b + vite build → dist/index.html (single self-contained file)
npm run build:pages   # build + copy to docs/index.html (+ docs/.nojekyll) for GitHub Pages
```

## Layout

- `src/cpu/i8080.ts` – 8080 core. `run()` is a generator that **yields one machine cycle per bus transfer** (`Cycle {type, addr, data, first}`). `CYCLE_LAMPS` maps cycle type → status lamps (thesis table II).
- `src/cpu/simulator.ts` – front-panel logic shared by both UIs: STEP, RESET, INT, HOLD, M/INSTR, `load()`, `startUser()`, `setPC()`, cycle `history`, `cycleIndex` (M1…M5), `instrAddr`.
- `src/cpu/parse.ts` (program file + number formats), `disasm.ts`, `listing.ts` (rows for memory views), `labels.ts` (Polish cycle names, lamp hints, `explainCycle`), `bios.txt` (original BIOS, loaded into 0000–07FFh).
- `src/programs/` – lab programs + `LAB_PROGRAMS` list.
- `src/App.tsx` – root: owns the single `Simulator`, `loadInfo` (with `seq`), file drop, and which view is shown. `src/ViewSwitch.tsx` – the bottom "Interfejs" toggle, rendered by both views via the `viewSwitch` prop.
- `src/classic/` – faithful 800×600 Authorware screen scaled to the window, using the original bitmaps in `src/classic/img/`. **Default view.**
- `src/modern/` – card dashboard (bus readouts, controls with continuous run, registers/flags/ports editable inline, listing, stack, cycle history), light/dark theme. Uses none of the classic bitmaps or controls.
- `src/Credits.tsx` – "Autorzy i licencje" panel shown at the bottom of both views. It carries React's MIT notice (imported from `node_modules/react/LICENSE?raw`), which the minified bundle would otherwise drop, so keep it in both views. `CREDITS.md` holds the full attribution; update both when adding third-party material. The BIOS author is unknown: web searches (2026-10) found nothing beyond this repo.
- localStorage keys: `mcs8.ui` (`classic`|`modern`), `mcs8.theme`. Always wrap storage access in try/catch.
- CSS scoping: classic rules under `.classic-root` / its own class names, modern under `.m-*` with variables on `.m-root`, switcher under `.vs`. Both stylesheets are bundled together, so never add bare global selectors.

## Behaviour of the original (keep it)

- The display shows the **current** machine cycle: ADDRESS/DATA bus, lamps, registers. STEP performs it and shows the next one. Register effects of an instruction appear on the following cycle.
- In the generator: reads `yield` first and apply their effect after; writes store to memory first, then `yield`; FETCH yields before `PC++`. That makes PC equal the address on the bus, as in the thesis screenshot (after RESET: `0000` / `C3`, M1+MEMR lit).
- Cycle structure follows the 8080 datasheet: e.g. MVI = 2 cycles, ADD r = 1, JMP/Jcc = 3, CALL = 5 (taken), Ccc not taken = 3, RET = 3, PUSH/POP = 3, OUT/IN = 3 (port address on both address bytes). Undocumented opcodes act like their documented twins (NOP/JMP/RET/CALL).
- Lamps per cycle type: FETCH M1+MEMR, MEMR, MEMW, STACKR MEMR+STACK, STACKW MEMW+STACK, INPUT IOR, OUTPUT IOW, INTA M1+INTA, HALTA MEMR+HLTA, INTAH M1+HLTA+INTA. HLDA is lit in HOLD, INTE shows the interrupt-enable flip-flop.
- M/INSTR: instruction mode runs to the next `first` cycle. If you switch to instruction mode mid-instruction, that instruction is finished **cycle by cycle** (`effectiveMode`), and the mode label keeps saying "maszynowych" until then.
- HLT: after the fetch, repeated HALTA cycles with `first: true` (so instruction mode can't spin) and the data bus floating. `instrAddr` ignores HALTA so the HLT line stays highlighted.
- INT: latched only if INTE is set; taken at an instruction boundary as an INTA cycle with FFh on the data bus = RST 7 → 0038h, where the BIOS has `JMP 0B00h`. INTE is enabled after RESET/Start (as in the original). DI/EI toggle it.
- HOLD: STEP with HOLD latched shows dashes on both buses and lights HLDA, leaving the other lamps unchanged. STEP after releasing HOLD continues normally.
- Program file: whitespace-separated tokens; anything that isn't exactly two hex digits becomes 00 and is reported as a syntax error (`ef DH 32 56d 3 21` → `EF 00 32 00 00 21`). Loaded from 0800h, max 62 KB. In the classic view, "Start od komórki 800h" is enabled only after an error-free load.
- Start: registers and flags cleared, PC=0800h, SP=0FFFh. RESET: registers cleared, ports back to FFh, PC=0000h (BIOS).
- Number input in dialogs: suffix `b` / `h` / `d`; no suffix = decimal. Limits: 255 for 8-bit, 65535 for 16-bit.
- Flag register shown as 8 bits `S Z 0 AC 0 P 1 CY` (so the initial value reads `00000010`). Classic stack view = 4 bytes from SP. Port table 16×16, with ports 84h, 88h, A0h and A4h boxed (the 8251/8253/8255 chips).

## Intentional deviations (documented in README)

- RESET keeps RAM: the lab instructions say "click Start again after RESET".
- INT is taken after any instruction (the original allowed it only after 1-cycle instructions in instruction mode).
- Writes to ROM (0000–07FFh) are ignored.
- Extras: Space/Enter = STEP, click a port to edit it, drop a .txt file to load it, optional memory listing in classic.
- The modern view starts a program automatically after an error-free load, and has continuous run. The classic view stays faithful.

## Expected lab results (the tests assert these)

start.txt A=8 · suma.txt port 10h = 37h (55) · tablica.txt port 11h = 96h (150), M[0830h]=96h · podprogram.txt port 12h = 18h (24), SP back to 0FFFh, the first CALL pushes 0805h · flagi.txt after each ADD/SUB: `96 S1 Z0 P1 CY0`, `2C S0 Z0 P0 CY1`, `FE S1 Z0 P0 CY1`, `00 S0 Z1 P1 CY1`.

## Build gotchas

- The release is one self-contained `index.html` (vite-plugin-singlefile). It must open from `file://`: browsers block external module scripts there.
- So **images are imported** (`import.meta.glob('./img/*', { query: '?url', import: 'default', eager: true })`) and CSS uses **relative** `url(./img/...)`. Don't put assets in `public/` and don't use absolute `/img/...`, or they break in the single-file and `file://` build.
- `vite.config.ts` has `base: './'`.

## Verifying UI changes

The Chrome extension may not be connected. Use system Chrome headless:
- Quick screenshot: `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --window-size=1440,1000 --screenshot=<scratch>/shot.png --virtual-time-budget=3000 <url>`
- Scripted clicks: `scripts/browser-check.mjs` (next to this file). Copy it to a scratch dir, `npm i puppeteer-core` there, then run `node browser-check.mjs <dist/index.html or URL> <outdir>`. It loads programs, steps, edits, switches views, saves screenshots and prints page errors.
- Puppeteer gotchas: changing `isMobile` in `setViewport` reloads the page, which resets simulator state. Cmd+A select-all is unreliable, so inputs here select their content on focus — just type.
- Check both views, both modern themes, a phone width (390px), and that the page doesn't scroll horizontally.

## Publish workflow

Repo: `git@github.com:MWojtowicz/symulator-mcs8-browser.git` (public). Pages: https://mwojtowicz.github.io/symulator-mcs8-browser/ served from `main` → `/docs`.

1. `npm test`, bump `version` in package.json, `npm run build:pages`.
2. Commit (message ends with the Co-Authored-By attribution line), `git push`.
3. Wait for Pages: poll `gh api repos/MWojtowicz/symulator-mcs8-browser/pages/builds/latest --jq '.status + " " + .commit'` until it is `built <sha>`, then check `curl -s <pages url> | cmp - docs/index.html`.
4. Release: in a scratch dir, make `symulator-mcs8.html` (copy of dist/index.html) and `symulator-mcs8-vX.Y.Z.zip` (folder `symulator-mcs8/` with the html, `programy/*.txt`, README.md and CREDITS.md). Then `gh release create vX.Y.Z <html> <zip> --target main --title "Symulator MCS-8 vX.Y.Z" --notes-file notes.md`. Notes are in Polish: the online link, "Nowości", "Pobieranie", and end with the Claude Code footer.
