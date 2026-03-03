import { useEffect } from 'react'

interface ShortcutHandlers {
  onRun: () => void
  onDownload: () => void
  onCopyOutput: () => void
}

export function useKeyboardShortcuts({ onRun, onDownload, onCopyOutput }: ShortcutHandlers) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey

      // Ctrl+Enter = Run deobfuscation
      if (ctrl && e.key === 'Enter') {
        e.preventDefault()
        onRun()
        return
      }

      // Ctrl+S = Download output
      if (ctrl && e.key === 's') {
        e.preventDefault()
        onDownload()
        return
      }

      // Ctrl+Shift+C = Copy output
      if (ctrl && e.shiftKey && e.key === 'C') {
        e.preventDefault()
        onCopyOutput()
        return
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onRun, onDownload, onCopyOutput])
}
