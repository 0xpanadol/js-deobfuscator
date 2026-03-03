declare module 'deob' {
  export interface Options {
    decoderLocationMethod?: 'callCount' | 'stringArray' | 'evalCode'
    decoderCallCount?: number
    setupCode?: string
    decoderNames?: string | string[]
    isMarkEnable?: boolean
    keywords?: string[]
    mangleMode?: 'off' | 'all' | 'hex' | 'short' | 'custom'
    manglePattern?: string
    mangleFlags?: string
  }

  export interface DeobResult {
    code: string
    save: (path: string) => Promise<void>
  }

  export const defaultOptions: Required<Options>
  export function deob(rawCode: string, options?: Options): Promise<DeobResult>
  export function evalCode(sandbox: unknown, code: string): Promise<void>
  export function codePrettier(code: string): string
}
