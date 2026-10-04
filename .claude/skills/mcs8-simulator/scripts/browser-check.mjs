// Headless smoke test of both interfaces. Needs puppeteer-core next to this file
// (copy it to a scratch dir and `npm i puppeteer-core` there) and system Chrome.
// Usage: node browser-check.mjs <dist/index.html path or URL> [outdir]
import puppeteer from 'puppeteer-core'
import { resolve } from 'node:path'
import { mkdirSync } from 'node:fs'

const target = process.argv[2] ?? 'dist/index.html'
const url = /^https?:|^file:/.test(target) ? target : 'file://' + resolve(target)
const out = process.argv[3] ?? '.'
mkdirSync(out, { recursive: true })
const shot = (p, name, full = false) => p.screenshot({ path: `${out}/${name}.png`, fullPage: full })

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
})
const p = await browser.newPage()
const errors = []
p.on('pageerror', (e) => errors.push(e.message))
p.on('console', (m) => m.type() === 'error' && !/favicon/.test(m.text()) && errors.push(m.text()))
const click = async (text) => {
  const [el] = await p.$$(`xpath/.//button[contains(., '${text}')]`)
  if (!el) throw new Error(`button not found: ${text}`)
  await el.click()
}
const view = () => p.evaluate(() => (document.querySelector('.classic-root') ? 'classic' : 'modern'))
const pause = (ms) => new Promise((r) => setTimeout(r, ms))

await p.setViewport({ width: 1440, height: 1000 })
await p.goto(url)
await p.evaluate(() => localStorage.clear())
await p.reload()
console.log('default view:', await view())

// classic: load podprogram, run in instruction mode to HLT
await click('Wczytaj plik do RAM')
await click('podprogram.txt')
await click('Start od komórki')
await click('M/INSTR')
for (let i = 0; i < 14; i++) await click('STEP')
const port12 = await p.evaluate(() => document.querySelector('td[title^="Port 12h"]')?.textContent)
console.log('classic port 12h =', port12, '(expected 18)')
await shot(p, 'classic')

// modern: load suma, step, edit a register and a port, run to HLT
await click('Nowy interfejs')
await click('Wczytaj program')
await pause(150)
await shot(p, 'modern-dialog')
await click('suma.txt')
await click('Rozkazy')
for (let i = 0; i < 3; i++) await click('STEP')
await p.click('button[aria-label^="B = "]')
await p.keyboard.type('34h')
await p.keyboard.press('Enter')
await p.click('button[title^="Port DEh"]')
await p.keyboard.type('1010b')
await p.keyboard.press('Enter')
await click('Uruchom')
await click('max')
await pause(800)
console.log('modern B / DEh / 10h:', await p.evaluate(() => [
  document.querySelector('button[aria-label^="B = "]')?.getAttribute('aria-label'),
  document.querySelector('button[title^="Port DEh"]')?.textContent,
  document.querySelector('button[title^="Port 10h"]')?.textContent,
]), '(expected 34h, 0A, 37)')
await shot(p, 'modern-light', true)
await p.click('button[aria-label^="Ciemny"]')
await shot(p, 'modern-dark', true)

// the view choice is remembered
await p.reload()
console.log('after reload:', await view())
await p.setViewport({ width: 390, height: 844 })
await shot(p, 'modern-mobile', true)
console.log('horizontal overflow:', await p.evaluate(() => document.documentElement.scrollWidth > innerWidth))
await click('Widok klasyczny')
await shot(p, 'classic-mobile', true)

console.log('page errors:', errors.length ? errors : 'none')
await browser.close()
