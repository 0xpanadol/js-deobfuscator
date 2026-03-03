interface ProgressBarProps {
  stage: string | null
  index: number
  total: number
}

export default function ProgressBar({ stage, index, total }: ProgressBarProps) {
  const pct = total > 0 ? Math.round((index / total) * 100) : 0

  return (
    <div className="mt-2 space-y-1">
      <div className="flex items-center justify-between text-[10px] text-zinc-500 dark:text-zinc-400">
        <span className="truncate max-w-[70%]">{stage ?? 'Starting...'}</span>
        {total > 0 && <span>{index}/{total} ({pct}%)</span>}
      </div>
      <div className="h-1.5 w-full rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-300 ease-out"
          style={{ width: `${total > 0 ? pct : 100}%` }}
        />
      </div>
    </div>
  )
}
