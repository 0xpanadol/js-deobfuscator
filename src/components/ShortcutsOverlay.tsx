import { useEffect } from 'react'
import { useStore } from '../store/useStore'

const shortcuts = [
  { keys: ['Ctrl', 'Enter'], label: 'Run deobfuscation' },
  { keys: ['Ctrl', 'S'], label: 'Download output file' },
  { keys: ['Ctrl', 'Shift', 'C'], label: 'Copy output to clipboard' },
  { keys: ['?'], label: 'Toggle this shortcuts panel' },
]

export default function ShortcutsOverlay() {
  const open = useStore(s => s.shortcutsOpen)
  const toggle = useStore(s => s.toggleShortcuts)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const tag = (e.target as HTMLElement)?.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
        e.preventDefault()
        toggle()
      }
      if (e.key === 'Escape' && open) {
        toggle()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, toggle])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={toggle}>
      <div
        className="w-80 rounded-xl border border-zinc-200 bg-white p-5 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">Keyboard Shortcuts</h2>
          <button onClick={toggle} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="space-y-3">
          {shortcuts.map(s => (
            <div key={s.label} className="flex items-center justify-between">
              <span className="text-xs text-zinc-600 dark:text-zinc-300">{s.label}</span>
              <div className="flex items-center gap-1">
                {s.keys.map(k => (
                  <kbd key={k} className="rounded border border-zinc-300 bg-zinc-50 px-1.5 py-0.5 font-mono text-[10px] font-medium text-zinc-600 shadow-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
