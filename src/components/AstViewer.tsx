import { useState, useMemo } from 'react'
import { parse } from '@babel/parser'

interface AstNodeProps {
  name: string
  value: unknown
  depth: number
}

const SKIP_KEYS = new Set([
  'start', 'end', 'loc', 'leadingComments',
  'trailingComments', 'innerComments', 'extra',
])

function AstNode({ name, value, depth }: AstNodeProps) {
  const [expanded, setExpanded] = useState(depth < 2)
  const isObject = value !== null && typeof value === 'object'
  const isArray = Array.isArray(value)

  if (!isObject) {
    const display = typeof value === 'string'
      ? `"${value.length > 60 ? value.slice(0, 60) + '\u2026' : value}"`
      : String(value)
    const color = typeof value === 'string'
      ? 'text-emerald-600 dark:text-emerald-400'
      : typeof value === 'number'
        ? 'text-blue-600 dark:text-blue-400'
        : typeof value === 'boolean'
          ? 'text-amber-600 dark:text-amber-400'
          : 'text-zinc-500 dark:text-zinc-400'
    return (
      <div className="flex items-baseline gap-1 py-0.5" style={{ paddingLeft: depth * 16 }}>
        <span className="text-zinc-500 dark:text-zinc-400">{name}:</span>
        <span className={`${color} truncate`}>{display}</span>
      </div>
    )
  }

  const entries = isArray
    ? (value as unknown[]).map((v, i) => [String(i), v] as const)
    : Object.entries(value as Record<string, unknown>).filter(
        ([k]) => !SKIP_KEYS.has(k)
      )

  const typeLabel = isArray
    ? `Array(${entries.length})`
    : ((value as any)?.type ?? 'Object')

  return (
    <div>
      <div
        className="flex items-center gap-1 py-0.5 cursor-pointer hover:bg-amber-50/50 dark:hover:bg-amber-500/5 rounded"
        style={{ paddingLeft: depth * 16 }}
        onClick={() => setExpanded(!expanded)}
      >
        <svg
          className={`w-3 h-3 text-zinc-400 transition-transform ${expanded ? 'rotate-90' : ''}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M6 4l8 6-8 6V4z" />
        </svg>
        <span className="text-zinc-500 dark:text-zinc-400">{name}:</span>
        <span className="text-purple-600 dark:text-purple-400 font-medium">
          {typeLabel}
        </span>
        {!expanded && (
          <span className="text-zinc-400 text-[10px]">({entries.length})</span>
        )}
      </div>
      {expanded &&
        entries.map(([key, val]) => (
          <AstNode key={key} name={key} value={val} depth={depth + 1} />
        ))}
    </div>
  )
}

interface AstViewerProps {
  code: string
}

export default function AstViewer({ code }: AstViewerProps) {
  const { ast, error } = useMemo(() => {
    if (!code.trim()) return { ast: null, error: null }
    try {
      const result = parse(code, {
        sourceType: 'unambiguous',
        allowReturnOutsideFunction: true,
        errorRecovery: true,
        plugins: ['jsx'],
      })
      return { ast: result, error: null }
    } catch (e: any) {
      return { ast: null, error: e.message }
    }
  }, [code])

  if (error) {
    return (
      <div className="p-3 text-xs text-red-500 dark:text-red-400">
        AST parse error: {error}
      </div>
    )
  }

  if (!ast) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-zinc-500 dark:text-zinc-400">
        Run deobfuscation to view AST
      </div>
    )
  }

  return (
    <div className="h-full w-full overflow-auto p-2 font-mono text-[11px] leading-5">
      <AstNode name="Program" value={ast} depth={0} />
    </div>
  )
}
