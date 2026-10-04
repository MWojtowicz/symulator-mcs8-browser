// Intel 8080 modelled at machine-cycle level, as in the original MCS-8 simulator.
// Execution is a generator: every bus transfer yields one machine cycle, so the UI
// can stop after each cycle (M mode) or run to the next instruction fetch (INSTR mode).

export type CycleType =
  | 'FETCH' // instruction fetch (M1)
  | 'MEMR' // memory read
  | 'MEMW' // memory write
  | 'STACKR' // stack read
  | 'STACKW' // stack write
  | 'INPUT' // input read
  | 'OUTPUT' // output write
  | 'INTA' // interrupt acknowledge
  | 'HALTA' // halt acknowledge
  | 'INTAH' // interrupt acknowledge while halt

export interface Cycle {
  type: CycleType
  addr: number
  /** byte on the data bus, null when the bus floats */
  data: number | null
  /** first machine cycle of an instruction (INSTR mode stops here) */
  first: boolean
}

export const LAMPS = ['M1', 'MEMR', 'MEMW', 'IOR', 'IOW', 'STACK', 'HLTA', 'INTA', 'HLDA', 'INTE'] as const
export type Lamp = (typeof LAMPS)[number]

// Status lamps per cycle type (thesis, table II).
export const CYCLE_LAMPS: Record<CycleType, Lamp[]> = {
  FETCH: ['M1', 'MEMR'],
  MEMR: ['MEMR'],
  MEMW: ['MEMW'],
  STACKR: ['MEMR', 'STACK'],
  STACKW: ['MEMW', 'STACK'],
  INPUT: ['IOR'],
  OUTPUT: ['IOW'],
  INTA: ['M1', 'INTA'],
  HALTA: ['MEMR', 'HLTA'],
  INTAH: ['M1', 'HLTA', 'INTA'],
}

export const ROM_SIZE = 0x800
export const PROGRAM_START = 0x800
export const STACK_START = 0x0fff

type Gen<T = void> = Generator<Cycle, T, void>

const PARITY = new Uint8Array(256).map((_, v) => {
  let n = 0
  for (let i = 0; i < 8; i++) n += (v >> i) & 1
  return n % 2 === 0 ? 1 : 0
})

export class I8080 {
  mem = new Uint8Array(0x10000)
  ports = new Uint8Array(256).fill(0xff)

  a = 0; b = 0; c = 0; d = 0; e = 0; h = 0; l = 0
  sp = 0; pc = 0
  fs = false; fz = false; fac = false; fp = false; fcy = false

  inte = true
  halted = false
  intRequest = false

  // ---------- register helpers ----------
  get bc() { return (this.b << 8) | this.c }
  get de() { return (this.d << 8) | this.e }
  get hl() { return (this.h << 8) | this.l }
  set bc(v: number) { this.b = (v >> 8) & 0xff; this.c = v & 0xff }
  set de(v: number) { this.d = (v >> 8) & 0xff; this.e = v & 0xff }
  set hl(v: number) { this.h = (v >> 8) & 0xff; this.l = v & 0xff }

  /** flag register: S Z 0 AC 0 P 1 CY */
  get flags() {
    return (+this.fs << 7) | (+this.fz << 6) | (+this.fac << 4) | (+this.fp << 2) | 0x02 | +this.fcy
  }
  set flags(v: number) {
    this.fs = !!(v & 0x80); this.fz = !!(v & 0x40); this.fac = !!(v & 0x10)
    this.fp = !!(v & 0x04); this.fcy = !!(v & 0x01)
  }

  write(addr: number, v: number) {
    if (addr >= ROM_SIZE) this.mem[addr & 0xffff] = v & 0xff
  }

  /** registers/flags zeroed, ports back to FFh, PC = 0 (the BIOS starts) */
  reset() {
    this.a = this.b = this.c = this.d = this.e = this.h = this.l = 0
    this.sp = 0; this.pc = 0
    this.flags = 0
    this.ports.fill(0xff)
    this.inte = true; this.halted = false; this.intRequest = false
  }

  /** "Start od komórki 800h": pretend the BIOS ran, jump to the user program */
  startUser() {
    this.a = this.b = this.c = this.d = this.e = this.h = this.l = 0
    this.flags = 0
    this.sp = STACK_START; this.pc = PROGRAM_START
    this.inte = true; this.halted = false; this.intRequest = false
  }

  // ---------- main loop ----------
  *run(): Gen<never> {
    for (;;) {
      if (this.intRequest && this.inte) {
        this.intRequest = false
        this.inte = false
        const wasHalted = this.halted
        this.halted = false
        // the interrupting device puts FFh (RST 7) on the data bus
        yield { type: wasHalted ? 'INTAH' : 'INTA', addr: this.pc, data: 0xff, first: true }
        yield* this.rst(7)
        continue
      }
      if (this.halted) {
        yield { type: 'HALTA', addr: this.pc, data: null, first: true }
        continue
      }
      const op = this.mem[this.pc]
      yield { type: 'FETCH', addr: this.pc, data: op, first: true }
      this.pc = (this.pc + 1) & 0xffff
      yield* this.exec(op)
    }
  }

  // ---------- bus cycles ----------
  private *read(addr: number, type: CycleType = 'MEMR'): Gen<number> {
    addr &= 0xffff
    const v = this.mem[addr]
    yield { type, addr, data: v, first: false }
    return v
  }
  private *imm(): Gen<number> {
    const v = yield* this.read(this.pc)
    this.pc = (this.pc + 1) & 0xffff
    return v
  }
  private *imm16(): Gen<number> {
    const lo = yield* this.imm()
    const hi = yield* this.imm()
    return (hi << 8) | lo
  }
  private *store(addr: number, v: number, type: CycleType = 'MEMW'): Gen {
    addr &= 0xffff
    this.write(addr, v)
    yield { type, addr, data: v & 0xff, first: false }
  }
  private *push(v: number): Gen {
    this.sp = (this.sp - 1) & 0xffff
    yield* this.store(this.sp, v >> 8, 'STACKW')
    this.sp = (this.sp - 1) & 0xffff
    yield* this.store(this.sp, v & 0xff, 'STACKW')
  }
  private *pop(): Gen<number> {
    const lo = yield* this.read(this.sp, 'STACKR')
    this.sp = (this.sp + 1) & 0xffff
    const hi = yield* this.read(this.sp, 'STACKR')
    this.sp = (this.sp + 1) & 0xffff
    return (hi << 8) | lo
  }
  private *rst(n: number): Gen {
    yield* this.push(this.pc)
    this.pc = n * 8
  }

  // ---------- registers by 3-bit code (B C D E H L M A) ----------
  private getR(r: number) {
    switch (r) {
      case 0: return this.b
      case 1: return this.c
      case 2: return this.d
      case 3: return this.e
      case 4: return this.h
      case 5: return this.l
      case 7: return this.a
    }
    throw new Error('M is not a register')
  }
  private setR(r: number, v: number) {
    v &= 0xff
    switch (r) {
      case 0: this.b = v; break
      case 1: this.c = v; break
      case 2: this.d = v; break
      case 3: this.e = v; break
      case 4: this.h = v; break
      case 5: this.l = v; break
      case 7: this.a = v; break
    }
  }
  /** register pair by 2-bit code (BC DE HL SP) */
  private getRP(p: number) { return [this.bc, this.de, this.hl, this.sp][p] }
  private setRP(p: number, v: number) {
    v &= 0xffff
    if (p === 0) this.bc = v
    else if (p === 1) this.de = v
    else if (p === 2) this.hl = v
    else this.sp = v
  }
  private cond(cc: number) {
    switch (cc) {
      case 0: return !this.fz // NZ
      case 1: return this.fz // Z
      case 2: return !this.fcy // NC
      case 3: return this.fcy // C
      case 4: return !this.fp // PO
      case 5: return this.fp // PE
      case 6: return !this.fs // P
      default: return this.fs // M
    }
  }

  // ---------- ALU ----------
  private szp(v: number) {
    this.fs = (v & 0x80) !== 0
    this.fz = v === 0
    this.fp = PARITY[v] === 1
  }
  private alu(op: number, v: number) {
    const a = this.a
    switch (op) {
      case 0: // ADD
      case 1: { // ADC
        const cin = op === 1 && this.fcy ? 1 : 0
        const r = a + v + cin
        this.fac = (a & 0xf) + (v & 0xf) + cin > 0xf
        this.fcy = r > 0xff
        this.a = r & 0xff
        this.szp(this.a)
        return
      }
      case 2: // SUB
      case 3: // SBB
      case 7: { // CMP
        const bin = op === 3 && this.fcy ? 1 : 0
        const r = a - v - bin
        // 8080 subtracts by adding the complement: AC is the carry out of bit 3
        this.fac = (a & 0xf) + (~v & 0xf) + (1 - bin) > 0xf
        this.fcy = r < 0
        if (op !== 7) this.a = r & 0xff
        this.szp(r & 0xff)
        return
      }
      case 4: // ANA
        this.fac = ((a | v) & 0x08) !== 0
        this.a = a & v
        this.fcy = false
        this.szp(this.a)
        return
      case 5: // XRA
        this.a = a ^ v
        this.fcy = false; this.fac = false
        this.szp(this.a)
        return
      case 6: // ORA
        this.a = a | v
        this.fcy = false; this.fac = false
        this.szp(this.a)
        return
    }
  }
  private inr(v: number) {
    const r = (v + 1) & 0xff
    this.fac = (r & 0xf) === 0
    this.szp(r)
    return r
  }
  private dcr(v: number) {
    const r = (v - 1) & 0xff
    this.fac = (r & 0xf) !== 0xf
    this.szp(r)
    return r
  }
  private daa() {
    let add = 0
    let cy = this.fcy
    if ((this.a & 0xf) > 9 || this.fac) add = 0x06
    if (this.a > 0x99 || this.fcy) { add |= 0x60; cy = true }
    this.alu(0, add)
    this.fcy = cy
  }

  // ---------- instruction execution (cycles after M1) ----------
  private *exec(op: number): Gen {
    // MOV / HLT
    if ((op & 0xc0) === 0x40) {
      if (op === 0x76) { this.halted = true; return }
      const dst = (op >> 3) & 7, src = op & 7
      if (src === 6) this.setR(dst, yield* this.read(this.hl))
      else if (dst === 6) yield* this.store(this.hl, this.getR(src))
      else this.setR(dst, this.getR(src))
      return
    }
    // ADD..CMP r / M
    if ((op & 0xc0) === 0x80) {
      const src = op & 7
      const v = src === 6 ? yield* this.read(this.hl) : this.getR(src)
      this.alu((op >> 3) & 7, v)
      return
    }

    const r = (op >> 3) & 7 // register / condition / RST field
    const p = (op >> 4) & 3 // register pair field

    if ((op & 0xc0) === 0x00) {
      switch (op & 7) {
        case 0: return // NOP (and undocumented 08,10,...,38)
        case 1:
          if (op & 8) { // DAD
            const res = this.hl + this.getRP(p)
            this.fcy = res > 0xffff
            this.hl = res & 0xffff
          } else this.setRP(p, yield* this.imm16()) // LXI
          return
        case 2:
          switch (r) {
            case 0: yield* this.store(this.bc, this.a); return // STAX B
            case 1: this.a = yield* this.read(this.bc); return // LDAX B
            case 2: yield* this.store(this.de, this.a); return // STAX D
            case 3: this.a = yield* this.read(this.de); return // LDAX D
            case 4: { // SHLD
              const ad = yield* this.imm16()
              yield* this.store(ad, this.l)
              yield* this.store(ad + 1, this.h)
              return
            }
            case 5: { // LHLD
              const ad = yield* this.imm16()
              this.l = yield* this.read(ad)
              this.h = yield* this.read(ad + 1)
              return
            }
            case 6: yield* this.store(yield* this.imm16(), this.a); return // STA
            case 7: this.a = yield* this.read(yield* this.imm16()); return // LDA
          }
          return
        case 3: // INX / DCX
          this.setRP(p, this.getRP(p) + (op & 8 ? -1 : 1))
          return
        case 4: // INR
          if (r === 6) { const v = yield* this.read(this.hl); yield* this.store(this.hl, this.inr(v)) }
          else this.setR(r, this.inr(this.getR(r)))
          return
        case 5: // DCR
          if (r === 6) { const v = yield* this.read(this.hl); yield* this.store(this.hl, this.dcr(v)) }
          else this.setR(r, this.dcr(this.getR(r)))
          return
        case 6: { // MVI
          const v = yield* this.imm()
          if (r === 6) yield* this.store(this.hl, v)
          else this.setR(r, v)
          return
        }
        case 7:
          switch (r) {
            case 0: // RLC
              this.fcy = (this.a & 0x80) !== 0
              this.a = ((this.a << 1) | +this.fcy) & 0xff
              return
            case 1: // RRC
              this.fcy = (this.a & 1) !== 0
              this.a = ((this.a >> 1) | (+this.fcy << 7)) & 0xff
              return
            case 2: { // RAL
              const c = +this.fcy
              this.fcy = (this.a & 0x80) !== 0
              this.a = ((this.a << 1) | c) & 0xff
              return
            }
            case 3: { // RAR
              const c = +this.fcy
              this.fcy = (this.a & 1) !== 0
              this.a = ((this.a >> 1) | (c << 7)) & 0xff
              return
            }
            case 4: this.daa(); return
            case 5: this.a = ~this.a & 0xff; return // CMA
            case 6: this.fcy = true; return // STC
            case 7: this.fcy = !this.fcy; return // CMC
          }
      }
    }

    // 0xC0..0xFF
    switch (op & 7) {
      case 0: // Rcc
        if (this.cond(r)) this.pc = yield* this.pop()
        return
      case 1:
        if (!(op & 8)) { // POP
          const v = yield* this.pop()
          if (p === 3) { this.a = v >> 8; this.flags = v & 0xff }
          else this.setRP(p, v)
          return
        }
        switch (p) {
          case 0: case 1: this.pc = yield* this.pop(); return // RET (D9 undocumented)
          case 2: this.pc = this.hl; return // PCHL
          case 3: this.sp = this.hl; return // SPHL
        }
        return
      case 2: { // Jcc
        const ad = yield* this.imm16()
        if (this.cond(r)) this.pc = ad
        return
      }
      case 3:
        switch (r) {
          case 0: case 1: this.pc = yield* this.imm16(); return // JMP (CB undocumented)
          case 2: { // OUT
            const port = yield* this.imm()
            this.ports[port] = this.a
            yield { type: 'OUTPUT', addr: (port << 8) | port, data: this.a, first: false }
            return
          }
          case 3: { // IN
            const port = yield* this.imm()
            const v = this.ports[port]
            yield { type: 'INPUT', addr: (port << 8) | port, data: v, first: false }
            this.a = v
            return
          }
          case 4: { // XTHL
            const lo = yield* this.read(this.sp, 'STACKR')
            const hi = yield* this.read(this.sp + 1, 'STACKR')
            yield* this.store(this.sp + 1, this.h, 'STACKW')
            yield* this.store(this.sp, this.l, 'STACKW')
            this.h = hi; this.l = lo
            return
          }
          case 5: { const t = this.de; this.de = this.hl; this.hl = t; return } // XCHG
          case 6: this.inte = false; return // DI
          case 7: this.inte = true; return // EI
        }
        return
      case 4: { // Ccc
        const ad = yield* this.imm16()
        if (this.cond(r)) { yield* this.push(this.pc); this.pc = ad }
        return
      }
      case 5:
        if (!(op & 8)) { // PUSH
          yield* this.push(p === 3 ? (this.a << 8) | this.flags : this.getRP(p))
          return
        }
        { // CALL (DD, ED, FD undocumented)
          const ad = yield* this.imm16()
          yield* this.push(this.pc)
          this.pc = ad
        }
        return
      case 6: this.alu(r, yield* this.imm()); return // ADI..CPI
      case 7: yield* this.rst(r); return // RST n
    }
  }
}
