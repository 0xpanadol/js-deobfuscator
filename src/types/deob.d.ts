declare module 'deob' {
  export interface TransformToggles {
    prepare?: boolean
    decodeStrings?: boolean
    controlFlow?: boolean
    unminify?: boolean
    mangle?: boolean
    selfDefending?: boolean
    mergeObjects?: boolean
    markKeywords?: boolean
  }

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
    transforms?: TransformToggles
    onProgress?: (stage: string, index: number, total: number) => void
  }

  export interface DeobResult {
    code: string
    save: (path: string) => Promise<void>
  }

  export const defaultOptions: Required<Options>
  export function deob(rawCode: string, options?: Options): Promise<DeobResult>
  export function parseCode(code: string): any
  export function evalCode(sandbox: unknown, code: string): Promise<void>
  export function codePrettier(code: string): string
}
