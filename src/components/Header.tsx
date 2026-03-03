import { useDarkMode } from '../hooks/useDarkMode'

export default function Header() {
  const { isDark, toggle } = useDarkMode()

  return (
    <header className="flex items-center justify-between gap-3 border-b border-zinc-200/80 bg-white/80 px-3 py-2 backdrop-blur-xl sm:px-4 sm:py-2.5 dark:border-zinc-800/80 dark:bg-zinc-900/70">
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-600 text-white shadow-sm sm:h-9 sm:w-9">
          <span className="text-xs font-bold font-mono sm:text-sm">JS</span>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold leading-tight sm:text-sm">JS Deobfuscator</p>
          <span className="hidden rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700 sm:inline dark:bg-amber-500/15 dark:text-amber-400">
            v1.0
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          className="inline-flex items-center justify-center rounded-lg border border-zinc-300 bg-white p-1.5 text-zinc-600 transition-all hover:border-amber-400 hover:bg-amber-50 hover:text-amber-600 active:scale-95 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:border-amber-500 dark:hover:bg-amber-500/10 dark:hover:text-amber-400"
          onClick={toggle}
          aria-label="Toggle dark mode"
        >
          {isDark ? (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          )}
        </button>
        <a
          className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-sm transition-all hover:bg-black active:scale-95 dark:bg-zinc-700 dark:hover:bg-zinc-600"
          href="https://github.com/0xpanadol/js-deobfuscator"
          target="_blank"
          rel="noopener noreferrer"
        >
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
          <span className="hidden sm:inline">GitHub</span>
        </a>
      </div>
    </header>
  )
}
