import { create } from 'zustand'
import type { ConsoleLogEntry } from '../types/logger'
import type { DeobOptions } from '../types/options'
import { defaultOptions } from '../types/options'

const PREFIX = 'js-deobfuscator:'
const MAX_LOGS = 200
const MAX_CODE_BYTES = 1024 * 1024

function loadPersistedOptions(): DeobOptions {
  try {
    const raw = localStorage.getItem(`${PREFIX}options`)
    if (raw) {
      const parsed = JSON.parse(raw)
      return { ...defaultOptions, ...parsed }
    }
  } catch { /* noop */ }
  return { ...defaultOptions }
}

function loadPersistedCode(): string {
  try {
    return localStorage.getItem(`${PREFIX}code`) ?? ''
  } catch { return '' }
}

export interface Toast {
  id: number
  message: string
  type: 'success' | 'error' | 'info'
}

interface AppState {
  code: string
  output: string
  loading: 'parse' | false
  error: string | null
  parseTime: number
  logs: ConsoleLogEntry[]
  options: DeobOptions
  isDark: boolean
  editorWordWrap: boolean
  consoleCollapsed: boolean
  toasts: Toast[]

  toggleDark: () => void
  setCode: (code: string) => void
  setOutput: (output: string) => void
  setLoading: (loading: 'parse' | false) => void
  setError: (error: string | null) => void
  setParseTime: (time: number) => void
  pushLog: (message: string, timestamp?: number) => void
  clearLogs: () => void
  setOptions: (options: DeobOptions) => void
  updateOption: <K extends keyof DeobOptions>(key: K, value: DeobOptions[K]) => void
  toggleWordWrap: () => void
  toggleConsole: () => void
  addToast: (message: string, type?: Toast['type']) => void
  removeToast: (id: number) => void
}

function loadInitialDark(): boolean {
  try {
    const stored = localStorage.getItem(`${PREFIX}dark`)
    if (stored !== null) return stored === 'true'
  } catch { /* noop */ }
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

const encoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : undefined

export const useStore = create<AppState>((set, get) => ({
  code: loadPersistedCode(),
  output: '',
  loading: false,
  error: null,
  parseTime: 0,
  logs: [],
  options: loadPersistedOptions(),
  isDark: loadInitialDark(),
  editorWordWrap: localStorage.getItem(`${PREFIX}editor:wrap`) !== 'false',
  consoleCollapsed: false,
  toasts: [],

  toggleDark: () => {
    const next = !get().isDark
    set({ isDark: next })
    try { localStorage.setItem(`${PREFIX}dark`, String(next)) } catch { /* noop */ }
  },

  setCode: (code) => {
    set({ code })
    const size = encoder ? encoder.encode(code).length : code.length
    if (size <= MAX_CODE_BYTES) {
      try { localStorage.setItem(`${PREFIX}code`, code) } catch { /* noop */ }
    }
  },

  setOutput: (output) => set({ output }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setParseTime: (parseTime) => set({ parseTime }),

  pushLog: (message, timestamp = Date.now()) => {
    const logs = get().logs
    const next = [
      ...logs.slice(-(MAX_LOGS - 1)),
      { id: timestamp + Math.random(), message, timestamp },
    ]
    set({ logs: next })
  },

  clearLogs: () => set({ logs: [] }),

  setOptions: (options) => {
    set({ options })
    try {
      const { setupCode: _, ...rest } = options
      localStorage.setItem(`${PREFIX}options`, JSON.stringify({ ...rest, setupCode: '' }))
    } catch { /* noop */ }
  },

  updateOption: (key, value) => {
    const options = { ...get().options, [key]: value }
    get().setOptions(options)
  },

  toggleWordWrap: () => {
    const next = !get().editorWordWrap
    set({ editorWordWrap: next })
    localStorage.setItem(`${PREFIX}editor:wrap`, String(next))
  },

  toggleConsole: () => set({ consoleCollapsed: !get().consoleCollapsed }),

  addToast: (message, type = 'success') => {
    const id = Date.now() + Math.random()
    set({ toasts: [...get().toasts, { id, message, type }] })
    setTimeout(() => {
      set({ toasts: get().toasts.filter(t => t.id !== id) })
    }, 2500)
  },

  removeToast: (id) => set({ toasts: get().toasts.filter(t => t.id !== id) }),
}))
