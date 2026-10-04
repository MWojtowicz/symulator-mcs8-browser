// Text formats used by the simulator: program files ("3E 05 06 03 80 76") and
// numbers typed into the port/register dialogs ("1010b", "34h", "52d", "52").

export interface ParsedProgram {
  bytes: Uint8Array
  /** 0-based indices of tokens that were not a 2-digit hex byte (loaded as 00) */
  badTokens: number[]
}

export const MAX_PROGRAM_SIZE = 0x10000 - 0x800 // 62 KB

/** Tokens are whitespace-separated; anything other than exactly two hex digits becomes 00. */
export function parseProgram(text: string): ParsedProgram {
  const tokens = text.split(/\s+/).filter(Boolean)
  const badTokens: number[] = []
  const n = Math.min(tokens.length, MAX_PROGRAM_SIZE)
  const bytes = new Uint8Array(n)
  for (let i = 0; i < n; i++) {
    if (/^[0-9a-f]{2}$/i.test(tokens[i])) bytes[i] = parseInt(tokens[i], 16)
    else badTokens.push(i)
  }
  return { bytes, badTokens }
}

/** Suffix b = binary, h = hex, d or none = decimal. Returns null when malformed or > max. */
export function parseNumber(input: string, max: number): number | null {
  const s = input.replace(/\s+/g, '').toUpperCase()
  if (!s) return null
  const suffix = s[s.length - 1]
  let digits = s
  let radix = 10
  if (suffix === 'B') { radix = 2; digits = s.slice(0, -1) }
  else if (suffix === 'H') { radix = 16; digits = s.slice(0, -1) }
  else if (suffix === 'D') { digits = s.slice(0, -1) }
  const valid = radix === 2 ? /^[01]+$/ : radix === 16 ? /^[0-9A-F]+$/ : /^[0-9]+$/
  if (!valid.test(digits)) return null
  const v = parseInt(digits, radix)
  return v > max ? null : v
}

export const hex2 = (v: number) => v.toString(16).toUpperCase().padStart(2, '0')
export const hex4 = (v: number) => v.toString(16).toUpperCase().padStart(4, '0')
