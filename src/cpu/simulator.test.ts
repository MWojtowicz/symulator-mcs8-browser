import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { Simulator } from './simulator'
import { parseNumber, parseProgram } from './parse'
import { disassemble } from './disasm'

const prog = (name: string) => readFileSync(new URL(`../programs/${name}.txt`, import.meta.url), 'utf8')

function runToHalt(sim: Simulator, max = 10000) {
  sim.instrMode = true
  for (let i = 0; i < max && sim.cycle.type !== 'HALTA'; i++) sim.step()
  expect(sim.cycle.type).toBe('HALTA')
}

function boot(name: string) {
  const sim = new Simulator()
  expect(sim.load(prog(name)).badTokens).toEqual([])
  sim.startUser()
  return sim
}

/** cycle types of the instruction starting at the current fetch */
function cyclesOfNext(sim: Simulator) {
  sim.instrMode = false
  const types = [sim.cycle.type]
  sim.step()
  while (!sim.cycle.first) { types.push(sim.cycle.type); sim.step() }
  return types
}

describe('lab programs', () => {
  it('start: 5 + 3', () => {
    const sim = boot('start'); runToHalt(sim)
    expect(sim.cpu.a).toBe(8)
  })
  it('suma: 1..10 to port 10h', () => {
    const sim = boot('suma'); runToHalt(sim)
    expect(sim.cpu.ports[0x10]).toBe(55)
  })
  it('tablica: sum to 0830h and port 11h', () => {
    const sim = boot('tablica'); runToHalt(sim)
    expect(sim.cpu.ports[0x11]).toBe(150)
    expect(sim.cpu.mem[0x830]).toBe(150)
  })
  it('podprogram: 3*8 to port 12h, SP restored', () => {
    const sim = boot('podprogram'); runToHalt(sim)
    expect(sim.cpu.ports[0x12]).toBe(24)
    expect(sim.cpu.sp).toBe(0x0fff)
  })
  it('flagi: four operations', () => {
    const sim = boot('flagi')
    const after: string[] = []
    sim.instrMode = true
    while (sim.cycle.type !== 'HALTA') {
      const op = sim.cpu.mem[sim.cycle.addr]
      sim.step()
      const c = sim.cpu
      if (op === 0x80 || op === 0x90) after.push(`${c.a.toString(16)} S${+c.fs} Z${+c.fz} P${+c.fp} CY${+c.fcy}`)
    }
    expect(after).toEqual(['96 S1 Z0 P1 CY0', '2c S0 Z0 P0 CY1', 'fe S1 Z0 P0 CY1', '0 S0 Z1 P1 CY1'])
  })
  it('przyklad: cycle counts and registers', () => {
    const sim = boot('przyklad')
    expect(cyclesOfNext(sim)).toEqual(['FETCH']) // NOP
    expect(cyclesOfNext(sim)).toEqual(['FETCH']) // INR D
    expect(cyclesOfNext(sim)).toEqual(['FETCH', 'STACKW', 'STACKW']) // PUSH D
    expect(cyclesOfNext(sim)).toEqual(['FETCH', 'STACKR', 'STACKR']) // POP B
    expect(sim.cpu.b).toBe(1)
    expect(cyclesOfNext(sim)).toEqual(['FETCH']) // NOP
    expect(cyclesOfNext(sim)).toEqual(['FETCH', 'MEMR']) // MVI A
    expect(cyclesOfNext(sim)).toEqual(['FETCH']) // MOV B,A
    expect(cyclesOfNext(sim)).toEqual(['FETCH']) // ADD B
    expect(cyclesOfNext(sim)).toEqual(['FETCH']) // DCR A
    expect(cyclesOfNext(sim)).toEqual(['FETCH', 'MEMR', 'MEMR']) // JNZ
    runToHalt(sim)
    expect(sim.cpu.a).toBe(0)
    expect(sim.cpu.fz).toBe(true)
  })
  it('CALL pushes the return address', () => {
    const sim = boot('podprogram')
    sim.instrMode = true
    sim.step() // MVI
    sim.step() // CALL
    expect(sim.cpu.sp).toBe(0x0ffd)
    expect(sim.cpu.mem[0x0ffd]).toBe(0x05)
    expect(sim.cpu.mem[0x0ffe]).toBe(0x08)
    expect(sim.cycle.addr).toBe(0x080e)
  })
})

describe('front panel', () => {
  it('RESET starts BIOS fetch at 0000h with C3 on the data bus', () => {
    const sim = new Simulator()
    expect(sim.cycle).toMatchObject({ type: 'FETCH', addr: 0, data: 0xc3 })
    expect(sim.cpu.flags).toBe(0x02)
  })
  it('INT executes RST 7 and jumps to 0B00h', () => {
    const sim = new Simulator()
    sim.load('00 00 00 00')
    sim.startUser()
    sim.interrupt()
    sim.instrMode = true
    sim.step()
    expect(sim.cycle).toMatchObject({ type: 'INTA', data: 0xff })
    sim.step()
    expect(sim.cycle.addr).toBe(0x38)
    sim.step()
    expect(sim.cycle.addr).toBe(0x0b00)
    expect(sim.cpu.inte).toBe(false)
  })
  it('HOLD floats the bus and resumes', () => {
    const sim = boot('start')
    sim.holdRequest = true
    sim.step()
    expect(sim.inHold).toBe(true)
    expect(sim.lamps.has('HLDA')).toBe(true)
    sim.holdRequest = false
    sim.step()
    expect(sim.inHold).toBe(false)
    expect(sim.cycle).toMatchObject({ type: 'MEMR', addr: 0x801, data: 5 })
  })
  it('file syntax errors load as 00', () => {
    const p = parseProgram('ef DH 32 56d 3 21')
    expect([...p.bytes]).toEqual([0xef, 0, 0x32, 0, 0, 0x21])
    expect(p.badTokens).toEqual([1, 3, 4])
  })
  it('number formats', () => {
    expect(parseNumber('34h', 255)).toBe(0x34)
    expect(parseNumber('1010b', 255)).toBe(10)
    expect(parseNumber('200', 255)).toBe(200)
    expect(parseNumber('77d', 255)).toBe(77)
    expect(parseNumber('300', 255)).toBeNull()
    expect(parseNumber('12x', 255)).toBeNull()
    expect(parseNumber('FFFFh', 65535)).toBe(65535)
  })
  it('disassembler', () => {
    const m = new Uint8Array(0x10000)
    m.set([0xc2, 0x09, 0x08, 0x3e, 0x04, 0xd3, 0x10, 0x86], 0)
    expect(disassemble(m, 0).text).toBe('JNZ 0809h')
    expect(disassemble(m, 3).text).toBe('MVI A,04h')
    expect(disassemble(m, 5).text).toBe('OUT 10h')
    expect(disassemble(m, 7).text).toBe('ADD M')
  })
})
