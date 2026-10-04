# Symulator MCS-8 (wersja przeglądarkowa)

[![Tests](https://github.com/MWojtowicz/symulator-mcs8-browser/actions/workflows/test.yml/badge.svg)](https://github.com/MWojtowicz/symulator-mcs8-browser/actions/workflows/test.yml)

**▶ Uruchom w przeglądarce: https://mwojtowicz.github.io/symulator-mcs8-browser/**

Port symulatora `mcs8krok.exe` (J. Pawlewski, UŚ 2004) do przeglądarki: React + TypeScript + Vite.
Wygląd i grafika (wyświetlacze, kontrolki, przyciski, tło) pochodzą z oryginału; BIOS z `bios.txt`.

```
npm install
npm run dev      # http://localhost:5173
npm test         # testy procesora na programach z laboratorium
npm run build    # dist/index.html – jeden samodzielny plik
npm run build:pages  # to samo + kopia do docs/index.html (GitHub Pages)
```

Gotową wersję można pobrać ze strony [Releases](https://github.com/MWojtowicz/symulator-mcs8-browser/releases):
plik `symulator-mcs8.html` otwiera się bezpośrednio w przeglądarce (bez instalacji i bez serwera).

## Dwa interfejsy
- **Klasyczny** (domyślny): wierne odwzorowanie ekranu oryginalnego symulatora.
- **Nowoczesny**: panel z kartami – magistrale z podglądem bitów i opisem bieżącego cyklu, kontrolki,
  sterowanie (STEP, tryb, praca ciągła z regulacją szybkości), rejestry i flagi edytowane kliknięciem, listing programu,
  porty, stos i historia cykli maszynowych. Jasny i ciemny motyw, układ dopasowany do telefonu.
  Poprawnie wczytany program startuje od razu od 0800h.

Przełącznik „Interfejs” znajduje się na dole strony w obu widokach. Oba korzystają z tego samego stanu
symulatora, więc można je przełączać w trakcie pracy; wybór jest zapamiętywany w przeglądarce.

## Obsługa (jak w oryginale)
- **Wczytaj plik do RAM** – plik z bajtami hex od 0800h (z dysku, gotowe programy z laboratorium albo wpisane ręcznie). Błędne bajty → 00 i komunikat.
- **Start od komórki 800h** – zeruje rejestry i flagi, PC = 0800h, SP = 0FFFh (aktywny tylko po poprawnym wczytaniu).
- **STEP** – jeden cykl maszynowy albo (po wciśnięciu **M/INSTR**) jeden rozkaz. Rozkaz zaczęty w trybie cykli jest kończony cykl po cyklu.
- **RESET** – start BIOS-u od 0000h (porty → FFh, program w RAM zostaje).
- **INT** – przerwanie RST 7 (skok przez 0038h do 0B00h), gdy świeci INTE.
- **HOLD** – stan zawieszenia: magistrale „----”, świeci HLDA.
- **Zmień zaw. portów / rejestrów** – liczby z przyrostkiem `b`, `h`, `d` (brak = dziesiętnie).

## Dodatki względem oryginału
- Spacja / Enter = STEP, kliknięcie komórki portu = edycja portu, upuszczenie pliku .txt = wczytanie.
- Opcjonalny podgląd pamięci z deasemblacją (pod panelem).
- INT działa po każdym rozkazie (oryginał – tylko po rozkazach jednocyklowych w trybie rozkazowym).
