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
}
