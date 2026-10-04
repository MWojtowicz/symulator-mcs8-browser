# Autorzy i źródła

Ten projekt to przeglądarkowy port istniejącego symulatora. Poniżej wymieniono autorów materiałów,
z których korzysta, oraz licencje bibliotek dołączonych do aplikacji.

## Oryginalny symulator

**Symulator systemu MCS-8 w środowisku MAMS. Praca krokowa** (`mcs8krok.exe`)
Jakub Pawlewski, praca dyplomowa, promotor: dr inż. Jarosław Zyguła.
Uniwersytet Śląski, Wydział Informatyki i Nauki o Materiałach, Instytut Informatyki,
Zakład Systemów Komputerowych, Sosnowiec 2004.

Z tej pracy pochodzą:
- działanie symulatora odwzorowane w tym porcie (panel, kontrolki cykli maszynowych, praca krokowa,
  przerwanie INT, stan HOLD, format plików i liczb),
- grafiki widoku klasycznego (`src/classic/img/`): wyświetlacze siedmiosegmentowe, kontrolki,
  przyciski, tło i napis tytułowy,
- układ ekranu widoku klasycznego.

## BIOS systemu MCS-8.2

`src/cpu/bios.txt` – zawartość pamięci ROM (0000h–07FFh) systemu MCS-8.2, dołączona do dystrybucji
oryginalnego symulatora. Dostępne źródła nie podają autora BIOS-u. System MCS-8 opisano m.in. w pracy:
Miłosz Dąbrowski, Rafał Gałuszka, *Platforma projektowania aplikacji MCS-8* (Uniwersytet Śląski).

## Platforma MAMS

Oryginalny symulator powstał dla platformy kształcenia zdalnego MAMS Uniwersytetu Śląskiego.
Jej nazwa widnieje na tle widoku klasycznego (`src/classic/img/tlo.png`).

## Programy z laboratorium

`src/programs/*.txt` – programy przykładowe do instrukcji *Laboratorium 1: Procesor 8-bitowy Intel 8080*
(autor instrukcji: Damian Grygierczyk).

## Intel 8080

Intel i 8080 są znakami towarowymi Intel Corporation. Opis rozkazów i cykli maszynowych procesora
opiera się na dokumentacji Intel *8080 Microcomputer Systems User's Manual* / *8080 Data Sheet*.
Ten projekt nie jest związany z firmą Intel.

## Biblioteki dołączone do aplikacji

Zbudowana aplikacja (`dist/index.html`, `docs/index.html`, pliki z wydań) zawiera:

| Biblioteka | Wersja | Licencja |
|---|---|---|
| [React](https://github.com/facebook/react) | 19 | MIT |
| [React DOM](https://github.com/facebook/react) | 19 | MIT |
| [Scheduler](https://github.com/facebook/react) | 0.28 | MIT |

```
MIT License

Copyright (c) Meta Platforms, Inc. and affiliates.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

Narzędzia używane tylko przy budowaniu (Vite, TypeScript, Vitest, vite-plugin-singlefile)
nie są dołączane do aplikacji.

## Port przeglądarkowy

Michal Wojtowicz, z pomocą Claude Code (Anthropic), 2026.
Kod źródłowy: https://github.com/MWojtowicz/symulator-mcs8-browser
