import { useStore } from '../store/useStore'

const shortcuts = [
  { keys: 'Ctrl+Enter', label: 'Run' },
  { keys: 'Ctrl+S', label: 'Download' },
  { keys: 'Ctrl+Shift+C', label: 'Copy Output' },
  { keys: '?', label: 'Shortcuts' },
]

export default function ShortcutsBar() {
  const toggleShortcuts = useStore(s => s.toggleShortcuts)

  return (
    <div className="flex items-center justify-center gap-4 border-t border-zinc-200/60 bg-zinc-50/80 px-3 py-1 text-[10px] text-zinc-400 backdrop-blur-sm dark:border-zinc-800/60 dark:bg-zinc-950/80 dark:text-zinc-500">
      {shortcuts.map(s => (
        <button
          key={s.keys}
          className="flex items-center gap-1.5 hover:text-amber-500 transition-colors"
          onClick={s.keys === '?' ? toggleShortcuts : undefined}
        >
          <kbd className="rounded border border-zinc-300/70 bg-white px-1 py-0.5 font-mono text-[9px] font-medium text-zinc-500 shadow-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
            {s.keys}
          </kbd>
          <span>{s.label}</span>
        </button>
      ))}
    </div>
  )
}
