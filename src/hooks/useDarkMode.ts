import { useEffect } from 'react'
import { useStore } from '../store/useStore'

export function useDarkMode() {
  const isDark = useStore(s => s.isDark)
  const toggle = useStore(s => s.toggleDark)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
  }, [isDark])

  return { isDark, toggle }
}
