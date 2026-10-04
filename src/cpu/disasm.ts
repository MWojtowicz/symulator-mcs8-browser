// 8080 disassembler for the optional memory listing panel.
import { hex2, hex4 } from './parse'

const R = ['B', 'C', 'D', 'E', 'H', 'L', 'M', 'A']
const RP = ['B', 'D', 'H', 'SP']
const RPPSW = ['B', 'D', 'H', 'PSW']
const CC = ['NZ', 'Z', 'NC', 'C', 'PO', 'PE', 'P', 'M']
const ALU = ['ADD', 'ADC', 'SUB', 'SBB', 'ANA', 'XRA', 'ORA', 'CMP']
const ALUI = ['ADI', 'ACI', 'SUI', 'SBI', 'ANI', 'XRI', 'ORI', 'CPI']
const ROT = ['RLC', 'RRC', 'RAL', 'RAR', 'DAA', 'CMA', 'STC', 'CMC']

export interface Disasm {
  text: string
  length: number
}

/** n = 8-bit immediate, a = 16-bit address/immediate */
function decode(op: number): [string, 0 | 1 | 2] {
  const r = (op >> 3) & 7
  const p = (op >> 4) & 3
  if (op === 0x76) return ['HLT', 0]
  if ((op & 0xc0) === 0x40) return [`MOV ${R[r]},${R[op & 7]}`, 0]
  if ((op & 0xc0) === 0x80) return [`${ALU[r]} ${R[op & 7]}`, 0]
  if ((op & 0xc0) === 0x00) {
    switch (op & 7) {
      case 0: return [op ? 'NOP*' : 'NOP', 0]
      case 1: return op & 8 ? [`DAD ${RP[p]}`, 0] : [`LXI ${RP[p]},a`, 2]
      case 2: return ([
        ['STAX B', 0], ['LDAX B', 0], ['STAX D', 0], ['LDAX D', 0],
        ['SHLD a', 2], ['LHLD a', 2], ['STA a', 2], ['LDA a', 2],
      ] as [string, 0 | 2][])[r]
      case 3: return [`${op & 8 ? 'DCX' : 'INX'} ${RP[p]}`, 0]
      case 4: return [`INR ${R[r]}`, 0]
      case 5: return [`DCR ${R[r]}`, 0]
      case 6: return [`MVI ${R[r]},n`, 1]
      default: return [ROT[r], 0]
    }
  }
  switch (op & 7) {
    case 0: return [`R${CC[r]}`, 0]
    case 1:
      if (!(op & 8)) return [`POP ${RPPSW[p]}`, 0]
      return [['RET', 'RET*', 'PCHL', 'SPHL'][p], 0]
    case 2: return [`J${CC[r]} a`, 2]
    case 3: return ([
      ['JMP a', 2], ['JMP* a', 2], ['OUT n', 1], ['IN n', 1],
      ['XTHL', 0], ['XCHG', 0], ['DI', 0], ['EI', 0],
    ] as [string, 0 | 1 | 2][])[r]
    case 4: return [`C${CC[r]} a`, 2]
    case 5:
      if (!(op & 8)) return [`PUSH ${RPPSW[p]}`, 0]
      return [p === 0 ? 'CALL a' : 'CALL* a', 2]
    case 6: return [`${ALUI[r]} n`, 1]
    default: return [`RST ${r}`, 0]
  }
}

export function disassemble(mem: Uint8Array, addr: number): Disasm {
  const [tpl, extra] = decode(mem[addr & 0xffff])
  const b1 = mem[(addr + 1) & 0xffff]
  const b2 = mem[(addr + 2) & 0xffff]
  const text = tpl
    .replace(/\ba\b/, `${hex4((b2 << 8) | b1)}h`)
    .replace(/\bn\b/, `${hex2(b1)}h`)
  return { text, length: 1 + extra }
}
