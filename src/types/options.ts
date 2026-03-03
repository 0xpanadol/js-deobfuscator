export interface TransformToggles {
  prepare: boolean
  decodeStrings: boolean
  controlFlow: boolean
  unminify: boolean
  mangle: boolean
  selfDefending: boolean
  mergeObjects: boolean
  markKeywords: boolean
}

export const defaultTransformToggles: TransformToggles = {
  prepare: true,
  decodeStrings: true,
  controlFlow: true,
  unminify: true,
  mangle: true,
  selfDefending: true,
  mergeObjects: true,
  markKeywords: true,
}

export interface DeobOptions {
  decoderLocationMethod: 'stringArray' | 'callCount' | 'evalCode'
  decoderCallCount: number
  setupCode: string
  decoderNames: string

  isMarkEnable: boolean
  keywords: string[]

  mangleMode: 'off' | 'all' | 'hex' | 'short' | 'custom'
  manglePattern: string
  mangleFlags: string
  passes: number

  transforms: TransformToggles
}

export const defaultOptions: DeobOptions = {
  decoderLocationMethod: 'stringArray',
  decoderCallCount: 150,
  setupCode: '',
  decoderNames: '',

  isMarkEnable: true,
  keywords: ['debugger'],

  mangleMode: 'off',
  manglePattern: '',
  mangleFlags: '',
  passes: 1,

  transforms: { ...defaultTransformToggles },
}

export interface BatchFile {
  name: string
  code: string
  status: 'pending' | 'processing' | 'done' | 'error'
  output?: string
  error?: string
  parseTime?: number
}
