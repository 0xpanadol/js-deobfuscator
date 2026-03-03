import type { Options } from 'deob'
import debug from 'debug'
import { deob } from 'deob'
import { parse } from '@babel/parser'

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

/** Auto-detect the best decoder location method by analyzing the AST */
function autoDetectMethod(code: string): 'stringArray' | 'callCount' | 'evalCode' {
  try {
    const ast = parse(code, {
      sourceType: 'unambiguous',
      allowReturnOutsideFunction: true,
      errorRecovery: true,
      plugins: ['jsx'],
    })
    const body = ast.program.body
    let hasStringArray = false

    for (const node of body) {
      if (
        node.type === 'VariableDeclaration' &&
        node.declarations[0]?.init?.type === 'ArrayExpression' &&
        node.declarations[0].init.elements.length > 5
      ) {
        const elements = node.declarations[0].init.elements
        const stringCount = elements.filter((e: any) => e?.type === 'StringLiteral').length
        if (stringCount / elements.length > 0.7) {
          hasStringArray = true
        }
      }
    }

    if (hasStringArray) return 'stringArray'
  } catch { /* fallback */ }
  return 'stringArray'
}

interface WorkerMessage {
  type: 'run' | 'batch' | 'autoDetect'
  code?: string
  options?: Options & { passes?: number; transforms?: Record<string, boolean> }
  files?: Array<{ name: string; code: string }>
}

self.addEventListener('message', async ({ data }: { data: WorkerMessage }) => {
  if (data.type === 'autoDetect' && data.code) {
    const method = autoDetectMethod(data.code)
    self.postMessage({ type: 'autoDetectResult', method })
    return
  }

  if (data.type === 'batch' && data.files) {
    for (let i = 0; i < data.files.length; i++) {
      const file = data.files[i]
      self.postMessage({ type: 'batchProgress', index: i, status: 'processing' })
      try {
        const start = performance.now()
        const options: Options = data.options ? { ...data.options } : {}
        const passes = Math.max(1, Math.min((options as any).passes ?? 1, 10))
        delete (options as any).passes

        let current = file.code
        for (let p = 0; p < passes; p++) {
          const { code: output } = await deob(current, { ...options })
          current = output
        }
        const end = performance.now()
        self.postMessage({
          type: 'batchResult',
          index: i,
          code: current,
          parseTime: (end - start).toFixed(0),
        })
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        self.postMessage({ type: 'batchError', index: i, message })
      }
    }
    self.postMessage({ type: 'batchDone' })
    return
  }

  // Standard single-file run
  const { code, options: rawOptions } = data as { code: string; options: Options & { passes?: number } }
  if (!code || !rawOptions) return

  const passes = Math.max(1, Math.min((rawOptions as any).passes ?? 1, 10))
  delete (rawOptions as any).passes

  // Add progress callback
  const options: Options = {
    ...rawOptions,
    onProgress: (stage: string, index: number, total: number) => {
      self.postMessage({ type: 'progress', stage, index, total, timestamp: Date.now() })
    },
  }

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
