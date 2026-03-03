import { useRef, useEffect, useCallback } from 'react'
import { useStore } from '../store/useStore'
import { defaultOptions, defaultTransformToggles } from '../types/options'
import type { TransformToggles } from '../types/options'
import Tooltip from './Tooltip'

interface OptionsModalProps {
  open: boolean
  onClose: () => void
}

const decoderMethods = [
  { value: 'stringArray', label: 'String Array Length (Suitable for most scenarios)' },
  { value: 'callCount', label: 'Decoder Call Count (Ensure sufficient call count)' },
  { value: 'evalCode', label: 'Inject Custom Decryption Code (Need manual extraction)' },
] as const

const mangleModes = [
  { value: 'off', label: 'Off' },
  { value: 'hex', label: 'Hex (_0x)' },
  { value: 'short', label: 'Short Variable Name' },
  { value: 'all', label: 'All Variables' },
  { value: 'custom', label: 'Custom Regex' },
] as const

const transformLabels: Record<keyof TransformToggles, { label: string; tip: string }> = {
  prepare: { label: 'Prepare', tip: 'Block statements, sequences, variable splitting' },
  decodeStrings: { label: 'Decode Strings', tip: 'Locate and decode obfuscated strings' },
  controlFlow: { label: 'Control Flow', tip: 'Simplify control flow flattening (objects + switch)' },
  unminify: { label: 'Unminify', tip: 'Transpile and unminify code for readability' },
  mangle: { label: 'Mangle', tip: 'Optimize variable names based on mangle mode' },
  selfDefending: { label: 'Self-Defending', tip: 'Remove self-defending and debug protection code' },
  mergeObjects: { label: 'Merge Objects', tip: 'Merge object assignments and evaluate globals' },
  markKeywords: { label: 'Mark Keywords', tip: 'Highlight specified keywords in output' },
}

export default function OptionsModal({ open, onClose }: OptionsModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const { options, setOptions, updateOption } = useStore()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    else if (!open && dialog.open) dialog.close()
  }, [open])

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }, [onClose])

  const resetOptions = () => {
    if (!window.confirm('Are you sure you want to restore default settings? Modified settings will be reset.')) return
    const { setupCode: _, ...rest } = defaultOptions
    setOptions({ ...rest, setupCode: '', transforms: { ...defaultTransformToggles } })
  }

  const keywordsStr = options.keywords.join(', ')
  const setKeywords = (v: string) => {
    updateOption('keywords', v.split(',').map(s => s.trim()).filter(Boolean))
  }

  const toggleTransform = (key: keyof TransformToggles) => {
    const transforms = { ...options.transforms, [key]: !options.transforms[key] }
    updateOption('transforms', transforms)
  }

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 m-auto w-[calc(100vw-2rem)] sm:min-w-96 max-w-lg max-h-[85vh] overflow-y-auto rounded-xl border border-zinc-200/70 bg-white/95 p-0 shadow-xl backdrop:bg-black/30 backdrop:backdrop-blur-sm dark:border-zinc-800/70 dark:bg-zinc-900/90"
      onClick={handleBackdropClick}
      onClose={onClose}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5 sm:py-4">
        <div className="min-w-0">
          <p className="text-sm sm:text-base font-semibold text-zinc-900 dark:text-zinc-50">Deobfuscation Configuration</p>
          <p className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400">Core options and transform toggles.</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 shadow-sm transition-all active:scale-95 hover:border-amber-400 hover:bg-amber-100 dark:border-amber-500/50 dark:bg-amber-500/15 dark:text-amber-200 dark:hover:border-amber-500 dark:hover:bg-amber-500/25"
            onClick={resetOptions}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="hidden sm:inline">Reset</span>
          </button>
          <button
            className="inline-flex items-center justify-center w-7 h-7 rounded-lg border border-zinc-300 bg-white text-zinc-500 shadow-sm transition-all active:scale-95 hover:border-amber-400 hover:bg-amber-50 hover:text-amber-700 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-amber-500 dark:hover:bg-amber-500/10 dark:hover:text-amber-300"
            onClick={onClose}
            aria-label="Close"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      <hr className="border-zinc-200 dark:border-zinc-800" />
      <div className="space-y-4 px-4 py-3 sm:px-5 sm:py-4 text-sm text-zinc-800 dark:text-zinc-100">
        {/* Decoder Location Method */}
        <div className="space-y-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Decoder Location Method</span>
            <select
              value={options.decoderLocationMethod}
              onChange={e => updateOption('decoderLocationMethod', e.target.value as typeof options.decoderLocationMethod)}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-amber-400 dark:border-zinc-700 dark:bg-zinc-900"
            >
              {decoderMethods.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </label>

          {options.decoderLocationMethod === 'callCount' && (
            <div className="flex items-center justify-between gap-3 rounded-lg bg-amber-50/70 px-3 py-2 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-100">
              <span>Call Count</span>
              <input
                type="number"
                min={1}
                step={1}
                value={options.decoderCallCount}
                onChange={e => updateOption('decoderCallCount', Number(e.target.value))}
                className="w-24 rounded border border-amber-200 bg-white px-2 py-1 text-right focus:outline-none focus:ring-1 focus:ring-amber-400 dark:border-amber-500/40 dark:bg-zinc-900"
              />
            </div>
          )}

          {options.decoderLocationMethod === 'evalCode' && (
            <div className="space-y-2 rounded-lg bg-amber-50/70 px-3 py-3 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-100">
              <label className="flex items-center justify-between gap-3">
                <span>Specify Decoder (Function Name)</span>
                <input
                  type="text"
                  value={options.decoderNames}
                  onChange={e => updateOption('decoderNames', e.target.value)}
                  placeholder="e.g. _0xabc123"
                  className="w-48 rounded border border-amber-200 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-amber-400 dark:border-amber-500/40 dark:bg-zinc-900"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-zinc-600 dark:text-zinc-300">Inject Execution Code</span>
                <textarea
                  value={options.setupCode}
                  onChange={e => updateOption('setupCode', e.target.value)}
                  placeholder="// Code to be injected before execution"
                  className="min-h-28 rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm leading-relaxed focus:outline-none focus:ring-1 focus:ring-amber-400 dark:border-amber-500/40 dark:bg-zinc-900"
                />
              </label>
            </div>
          )}
        </div>

        {/* Selective Transforms */}
        <div className="space-y-2 rounded-lg border border-zinc-200/80 bg-white/80 px-3 py-3 shadow-sm dark:border-zinc-800/70 dark:bg-zinc-900/70">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Transform Stages</span>
            <Tooltip text="Toggle individual deobfuscation stages on/off. Useful for debugging or when specific transforms cause issues.">
              <span className="cursor-help text-zinc-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </span>
            </Tooltip>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {(Object.keys(transformLabels) as (keyof TransformToggles)[]).map(key => (
              <label key={key} className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer" title={transformLabels[key].tip}>
                <input
                  type="checkbox"
                  checked={options.transforms[key]}
                  onChange={() => toggleTransform(key)}
                  className="h-3.5 w-3.5 rounded border-zinc-300 text-amber-500 focus:ring-amber-400 dark:border-zinc-600 dark:bg-zinc-800"
                />
                <span className="text-[11px] font-medium">{transformLabels[key].label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Keyword Marking */}
        <div className="space-y-2 rounded-lg border border-zinc-200/80 bg-white/80 px-3 py-3 shadow-sm dark:border-zinc-800/70 dark:bg-zinc-900/70">
          <div className="flex items-center gap-2">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={options.isMarkEnable}
                onChange={e => updateOption('isMarkEnable', e.target.checked)}
                className="h-4 w-4 rounded border-zinc-300 text-amber-500 focus:ring-amber-400 dark:border-zinc-600 dark:bg-zinc-800"
              />
              <span className="text-sm font-medium">Enable Keyword Marking</span>
            </label>
            <Tooltip text="Highlight specific keywords in deobfuscated code for quick location of key logic (e.g. sign, token), separated by commas">
              <span className="cursor-help text-zinc-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </span>
            </Tooltip>
          </div>
          {options.isMarkEnable && (
            <div className="space-y-1">
              <label className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-300">
                <span>Keyword List</span>
              </label>
              <input
                type="text"
                value={keywordsStr}
                onChange={e => setKeywords(e.target.value)}
                placeholder="debugger, sign, token"
                className="w-full rounded border border-zinc-200 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-amber-400 dark:border-zinc-700 dark:bg-zinc-900"
              />
            </div>
          )}
        </div>

        {/* Mangle Mode */}
        <div className="space-y-2 rounded-lg border border-zinc-200/80 bg-white/80 px-3 py-3 shadow-sm dark:border-zinc-800/70 dark:bg-zinc-900/70">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium">Variable Name Optimization (mangle)</span>
            <select
              value={options.mangleMode}
              onChange={e => updateOption('mangleMode', e.target.value as typeof options.mangleMode)}
              className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-amber-400 dark:border-zinc-700 dark:bg-zinc-900"
            >
              {mangleModes.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          {options.mangleMode === 'custom' && (
            <div className="space-y-2 text-xs text-zinc-600 dark:text-zinc-300">
              <label className="flex items-center gap-2">
                <span className="whitespace-nowrap">Regex</span>
                <input
                  value={options.manglePattern}
                  onChange={e => updateOption('manglePattern', e.target.value)}
                  placeholder="e.g. _0x[a-f\\d]+"
                  className="flex-1 rounded border border-zinc-200 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-amber-400 dark:border-zinc-700 dark:bg-zinc-900"
                />
              </label>
              <label className="flex items-center gap-2">
                <span className="whitespace-nowrap">Flags</span>
                <input
                  value={options.mangleFlags}
                  onChange={e => updateOption('mangleFlags', e.target.value)}
                  placeholder="e.g. gim"
                  className="flex-1 rounded border border-zinc-200 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-amber-400 dark:border-zinc-700 dark:bg-zinc-900"
                />
              </label>
            </div>
          )}
        </div>

        {/* Multi-Pass */}
        <div className="space-y-2 rounded-lg border border-zinc-200/80 bg-white/80 px-3 py-3 shadow-sm dark:border-zinc-800/70 dark:bg-zinc-900/70">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Multi-Pass Execution</span>
              <Tooltip text="Run deobfuscation multiple times. Useful for heavily obfuscated code that needs several passes to fully clean up.">
                <span className="cursor-help text-zinc-400">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
              </Tooltip>
            </div>
            <input
              type="number"
              min={1}
              max={10}
              value={options.passes}
              onChange={e => updateOption('passes', Math.max(1, Math.min(10, Number(e.target.value))))}
              className="w-20 rounded border border-zinc-200 bg-white px-2 py-1 text-right text-sm focus:outline-none focus:ring-1 focus:ring-amber-400 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
          {options.passes > 1 && (
            <p className="text-[11px] text-amber-600 dark:text-amber-400">
              Will run {options.passes} consecutive deobfuscation passes
            </p>
          )}
        </div>
      </div>
    </dialog>
  )
}
