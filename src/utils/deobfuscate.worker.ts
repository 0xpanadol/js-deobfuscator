import type { Options } from 'deob'
import debug from 'debug'
import { deob } from 'deob'

const originalDebugLog = debug.log

function normalizeLogArgs(args: unknown[]) {
  return args
    .map((value) => {
      if (typeof value === 'string') {
        const cleaned = value.replace(/%c/g, '').trim()
        if (!cleaned || /^color:/i.test(cleaned)) return ''
        return cleaned
      }
      return formatLogValue(value)
    })
    .filter(Boolean)
}

function formatLogValue(value: unknown) {
  if (value instanceof Error) return value.stack || value.message
  if (value instanceof Map) return JSON.stringify(Object.fromEntries(value.entries()), null, 2)
  if (value instanceof Set) return JSON.stringify(Array.from(value.values()), null, 2)
  if (typeof value === 'object') {
    try { return JSON.stringify(value, null, 2) }
    catch { return String(value) }
  }
  return String(value)
}

debug.log = (...args: unknown[]) => {
  originalDebugLog?.apply(debug, args as [string, ...unknown[]])
  self.postMessage({
    type: 'log',
    message: normalizeLogArgs(args).join(' '),
    timestamp: Date.now(),
  })
}

self.addEventListener('message', async ({ data }: { data: { code: string; options: Options & { passes?: number } } }) => {
  const { code, options } = data
  if (!code || !options) return

  const passes = Math.max(1, Math.min((options as any).passes ?? 1, 10))
  delete (options as any).passes

  try {
    const start = performance.now()
    let current = code

    for (let i = 0; i < passes; i++) {
      if (passes > 1) {
        self.postMessage({
          type: 'log',
          message: `=== Pass ${i + 1}/${passes} ===`,
          timestamp: Date.now(),
        })
      }
      const { code: output } = await deob(current, { ...options })
      current = output
    }

    const end = performance.now()
    self.postMessage({ type: 'result', code: current, parseTime: (end - start).toFixed(0) })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    self.postMessage({ type: 'error', message, timestamp: Date.now() })
  }
})
