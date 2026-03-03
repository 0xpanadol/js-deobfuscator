import { useMemo, type ReactNode } from 'react'
import type { ConsoleLogEntry } from '../types/logger'

interface OutputStatsProps {
  logs: ConsoleLogEntry[]
  parseTime: number
}

interface Stat {
  label: string
  value: string
  icon: ReactNode
  color: string
}

const icons = {
  strings: <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>,
  array: <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>,
  decoder: <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>,
  keyword: <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>,
  passes: <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>,
  time: <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
}

export default function OutputStats({ logs, parseTime }: OutputStatsProps) {
  const stats = useMemo<Stat[]>(() => {
    if (!logs.length) return []

    const allText = logs.map(l => l.message).join('\n')
    const result: Stat[] = []

    const decryptMatch = allText.match(/Decrypted items:\s*(\d+)/i)
    if (decryptMatch) {
      result.push({ label: 'Decrypted', value: decryptMatch[1], icon: icons.strings, color: 'text-emerald-600 dark:text-emerald-400' })
    }

    const arrayMatch = allText.match(/String Array:.*?Total (\d+) items/i)
    if (arrayMatch) {
      result.push({ label: 'Array', value: arrayMatch[1], icon: icons.array, color: 'text-blue-600 dark:text-blue-400' })
    }

    const decoderMatch = allText.match(/Decoder functions:\s*([^\n]+)/i)
    if (decoderMatch) {
      result.push({ label: 'Decoders', value: decoderMatch[1].trim(), icon: icons.decoder, color: 'text-purple-600 dark:text-purple-400' })
    }

    const keywordMatch = allText.match(/Keyword list:\s*\[([^\]]*)\]/i)
    if (keywordMatch && keywordMatch[1].trim()) {
      result.push({ label: 'Keywords', value: keywordMatch[1].trim(), icon: icons.keyword, color: 'text-amber-600 dark:text-amber-400' })
    }

    const passMatches = allText.match(/=== Pass \d+\/(\d+) ===/g)
    if (passMatches && passMatches.length > 1) {
      result.push({ label: 'Passes', value: String(passMatches.length), icon: icons.passes, color: 'text-zinc-600 dark:text-zinc-400' })
    }

    if (parseTime > 0) {
      result.push({ label: 'Time', value: `${parseTime}ms`, icon: icons.time, color: 'text-zinc-600 dark:text-zinc-400' })
    }

    return result
  }, [logs, parseTime])

  if (!stats.length) return null

  return (
    <div className="flex flex-wrap gap-1.5 px-0.5">
      {stats.map(s => (
        <div key={s.label} className="flex items-center gap-1 rounded-md border border-zinc-200/60 bg-white/80 px-2 py-0.5 text-[10px] dark:border-zinc-700/60 dark:bg-zinc-800/60">
          <span className={s.color}>{s.icon}</span>
          <span className="text-zinc-400 dark:text-zinc-500">{s.label}</span>
          <span className={`font-semibold ${s.color}`}>{s.value}</span>
        </div>
      ))}
    </div>
  )
}
