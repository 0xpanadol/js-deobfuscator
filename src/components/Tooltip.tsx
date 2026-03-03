import { useState, type ReactNode } from 'react'

interface TooltipProps {
  text: string
  children: ReactNode
}

export default function Tooltip({ text, children }: TooltipProps) {
  const [visible, setVisible] = useState(false)

  return (
    <span
      className="relative inline-flex items-center"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 w-max max-w-xs -translate-x-1/2 rounded-lg bg-zinc-800 px-2.5 py-2 text-xs leading-relaxed text-white shadow-lg dark:bg-zinc-100 dark:text-zinc-900">
          {text}
        </span>
      )}
    </span>
  )
}
