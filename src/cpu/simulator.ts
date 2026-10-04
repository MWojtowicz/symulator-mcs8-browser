// Front-panel logic of the MCS-8 simulator: STEP, RESET, INT, HOLD, M/INSTR,
// loading a program into RAM and "Start od komórki 800h".
import { CYCLE_LAMPS, I8080, PROGRAM_START, type Cycle, type Lamp } from './i8080'
import { parseProgram } from './parse'
import { disassemble } from './disasm'
import biosText from './bios.txt?raw'

export type StepMode = 'machine' | 'instruction'

export interface HistoryEntry {
  /** running cycle number since RESET / Start */
  n: number
  cycle: Cycle
  /** machine cycle number within the instruction (1 = M1) */
  m: number
  /** instruction the cycle belongs to */
  instr: string
}

const HISTORY_LIMIT = 200

export class Simulator {
  cpu = new I8080()
  cycle!: Cycle
  private gen!: Generator<Cycle, never, void>

  /** M/INSTR button latched = instruction mode */
  instrMode = false
  /** HOLD button latched */
  holdRequest = false
  inHold = false

  programLoaded = false
  programLength = 0
  /** address of the instruction currently being executed (last M1 / INTA) */
  instrAddr = 0
  /** machine cycle number within the current instruction (1 = M1) */
  cycleIndex = 1
  /** most recent machine cycles, oldest first */
  history: HistoryEntry[] = []
  private cycleCount = 0
  private instrText = ''

  constructor() {
    const bios = parseProgram(biosText).bytes
    this.cpu.mem.set(bios.subarray(0, 0x800), 0)
    this.reset()
  }

  /** RESET: registers and ports to initial values, the BIOS starts from 0000h. RAM is kept. */
  reset() {
    this.cpu.reset()
    this.holdRequest = false
    this.inHold = false
    this.clearHistory()
    this.restart()
  }

  /** Begin decoding from the current PC (after RESET, Start or a PC change). */
  restart() {
    this.gen = this.cpu.run()
    this.advance()
  }

  private advance() {
    const c = (this.cycle = this.gen.next().value)
    if (c.first) {
      this.cycleIndex = 1
      if (c.type !== 'HALTA') this.instrAddr = c.addr
      this.instrText =
        c.type === 'FETCH' ? disassemble(this.cpu.mem, c.addr).text
        : c.type === 'HALTA' ? 'HLT (zatrzymanie)'
        : 'RST 7 (przerwanie)'
    } else this.cycleIndex++
    this.history.push({ n: ++this.cycleCount, cycle: c, m: this.cycleIndex, instr: this.instrText })
    if (this.history.length > HISTORY_LIMIT) this.history.shift()
  }

  private clearHistory() {
    this.history = []
    this.cycleCount = 0
  }

  /** a new PC means decoding starts again from that address */
  setPC(v: number) {
    this.cpu.pc = v & 0xffff
    this.cpu.halted = false
    this.restart()
  }

  /** Copies program bytes to RAM from 0800h. Returns the parse result for error reporting. */
  load(text: string) {
    const parsed = parseProgram(text)
    this.cpu.mem.fill(0, PROGRAM_START)
    this.cpu.mem.set(parsed.bytes, PROGRAM_START)
    this.programLoaded = parsed.badTokens.length === 0
    this.programLength = parsed.bytes.length
    return parsed
  }

  startUser() {
    this.cpu.startUser()
    this.inHold = false
    this.clearHistory()
    this.restart()
  }

  /** Mode actually in effect: an instruction begun in M mode is finished cycle by cycle. */
  get effectiveMode(): StepMode {
    return this.instrMode && this.cycle.first ? 'instruction' : 'machine'
  }

  step() {
    if (this.holdRequest) {
      // the processor floats its buses and acknowledges HOLD until the button is released
      this.inHold = true
      return
    }
    this.inHold = false
    if (this.effectiveMode === 'machine') {
      this.advance()
      return
    }
    // run to the first cycle of the next instruction (an 8080 instruction has at most 5)
    for (let i = 0; i < 16; i++) {
      this.advance()
      if (this.cycle.first) break
    }
  }

  interrupt() {
    if (this.cpu.inte) this.cpu.intRequest = true
  }

  get lamps(): Set<Lamp> {
    const on = new Set<Lamp>(CYCLE_LAMPS[this.cycle.type])
    if (this.inHold) on.add('HLDA')
    if (this.cpu.inte) on.add('INTE')
    return on
  }
}
