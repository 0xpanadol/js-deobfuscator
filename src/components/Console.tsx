import { useEffect, useRef } from 'react'
import type { ConsoleLogEntry } from '../types/logger'

interface ConsoleProps {
  logs: ConsoleLogEntry[]
  collapsed: boolean
  onToggle: () => void
  onClear: () => void
}

function formatTime(value: number) {
  const d = new Date(value)
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  const s = String(d.getSeconds()).padStart(2, '0')
  const ms = String(d.getMilliseconds()).padStart(3, '0')
  return `${h}:${m}:${s}.${ms}`
}

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function formatMessage(message: string) {
  let html = escapeHtml(message)
  html = html.replace(/\x1B\[31m([\s\S]*?)\x1B\[0m/g, '<span class="text-red-400">$1</span>')
  html = html.replace(/\bDeob\b/g, '<span class="text-amber-400 font-semibold">Deob</span>')
  html = html.replace(/\+\d+ms\b/g, '<span class="text-zinc-500">$&</span>')
  html = html.replace(/(Decryption failed[^<]*|decode_error[^<]*|Error[:：][^<]*)/gi, '<span class="text-red-400">$1</span>')
  html = html.replace(/\n/g, '<br>')
  return html
}

export default function Console({ logs, collapsed, onToggle, onClear }: ConsoleProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!collapsed && containerRef.current) {
      containerRef.current.scrollTo({ top: containerRef.current.scrollHeight, behavior: 'smooth' })
    }
  }, [logs.length, collapsed])

  return (
    <div className={`flex flex-col rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-700/80 dark:bg-zinc-900/50 transition-all duration-200 ${collapsed ? 'h-auto' : 'h-full'}`}>
      <div className="flex items-center justify-between gap-3 border-b border-zinc-200/70 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:border-zinc-800/70 dark:text-zinc-200">
        <div className="flex items-center gap-2">
          <svg className="w-3.5 h-3.5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-[11px] font-semibold">Console</span>
          {logs.length > 0 && (
            <span className="rounded-full bg-zinc-200/80 px-1.5 py-0.5 text-[9px] font-medium text-zinc-500 dark:bg-zinc-700/80 dark:text-zinc-400">
              {logs.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {logs.length > 0 && (
            <button
              className="rounded-md p-1 text-zinc-400 transition hover:bg-zinc-200/80 hover:text-zinc-600 dark:hover:bg-zinc-700/80 dark:hover:text-zinc-300"
              title="Clear Logs"
              onClick={onClear}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
          <button
            className="rounded-md p-1 text-zinc-400 transition hover:bg-zinc-200/80 hover:text-zinc-600 dark:hover:bg-zinc-700/80 dark:hover:text-zinc-300"
            title={collapsed ? 'Expand' : 'Collapse'}
            onClick={onToggle}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {collapsed
                ? <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                : <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              }
            </svg>
          </button>
        </div>
      </div>
      {!collapsed && (
        <div
          ref={containerRef}
          className="min-h-0 flex-1 overflow-auto px-3 py-2 font-mono text-[11px] leading-5 text-zinc-700 dark:text-zinc-300"
        >
          {logs.length > 0 ? (
            logs.map(entry => (
              <div key={entry.id} className="mb-1.5 last:mb-0 flex gap-2 rounded border border-zinc-200/60 bg-white/70 px-2 py-1.5 dark:border-zinc-700/50 dark:bg-zinc-800/50">
                <span className="flex-shrink-0 text-[9px] font-medium text-emerald-500/70 tabular-nums">
                  {formatTime(entry.timestamp)}
                </span>
                <pre
                  className="flex-1 whitespace-pre-wrap break-words"
                  dangerouslySetInnerHTML={{ __html: formatMessage(entry.message) }}
                />
              </div>
            ))
          ) : (
            <div className="flex h-full items-center justify-center text-[11px] text-zinc-400 dark:text-zinc-500">
              Logs appear here after running deobfuscation
            </div>
          )}
        </div>
      )}
    </div>
  )
}
