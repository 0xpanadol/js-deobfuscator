import { useState, useEffect, useRef, useCallback } from 'react'
import Editor from '@monaco-editor/react'
import { useStore } from '../store/useStore'
import { useDarkMode } from '../hooks/useDarkMode'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { downloadByData } from '../utils/file'
import OptionsModal from './OptionsModal'
import Console from './Console'
import OutputStats from './OutputStats'
import AstViewer from './AstViewer'
import DeobWorker from '../utils/deobfuscate.worker?worker'

type OutputTab = 'code' | 'ast'

/* shared button styles */
const btnBase = 'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[11px] font-medium shadow-sm transition-all active:scale-95'
const btnDefault = `${btnBase} border-zinc-300 bg-white text-zinc-700 hover:border-amber-400 hover:bg-amber-50 hover:text-amber-700 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-amber-500 dark:hover:bg-amber-500/10 dark:hover:text-amber-300`
const btnConfig = `${btnBase} border-amber-300 bg-amber-50 text-amber-800 font-semibold hover:border-amber-400 hover:bg-amber-100 dark:border-amber-500/50 dark:bg-amber-500/15 dark:text-amber-200 dark:hover:bg-amber-500/25`

export default function DeobfuscatorOutput() {
  const {
    output, setOutput, loading, setLoading,
    error, setError, parseTime, setParseTime,
    logs, clearLogs,
    consoleCollapsed, toggleConsole,
    addToast,
  } = useStore()

  const { isDark } = useDarkMode()
  const [optionsOpen, setOptionsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<OutputTab>('code')
  const workerRef = useRef<Worker | null>(null)

  useEffect(() => {
    const worker = new DeobWorker()
    workerRef.current = worker

    worker.onmessage = ({ data }) => {
      if (data?.type === 'log') {
        useStore.getState().pushLog(String(data.message ?? ''), data.timestamp)
        return
      }
      if (data?.type === 'error') {
        useStore.getState().setLoading(false)
        useStore.getState().setError(data.message)
        useStore.getState().pushLog(String(data.message ?? ''), data.timestamp)
        useStore.getState().addToast('Deobfuscation failed', 'error')
        return
      }
      if (data?.type === 'result') {
        useStore.getState().setLoading(false)
        useStore.getState().setError(null)
        useStore.getState().setOutput(data.code)
        useStore.getState().setParseTime(Number(data.parseTime))
        useStore.getState().pushLog(
          `Deobfuscation completed, time: ${data.parseTime} ms | Method: ${useStore.getState().options.decoderLocationMethod}`
        )
        useStore.getState().addToast(`Done in ${data.parseTime}ms`, 'success')
      }
    }

    worker.onerror = (event) => {
      useStore.getState().setLoading(false)
      useStore.getState().setOutput('')
      useStore.getState().setError(event.message)
      useStore.getState().pushLog(event.message)
      useStore.getState().addToast('Worker error', 'error')
    }

    return () => worker.terminate()
  }, [])

  const run = useCallback(() => {
    const currentCode = useStore.getState().code
    if (!currentCode?.trim()) {
      setError('Please input code first')
      addToast('No code to deobfuscate', 'error')
      return
    }
    setError(null)
    setParseTime(0)
    setLoading('parse')
    clearLogs()
    setActiveTab('code')

    const opts = useStore.getState().options
    workerRef.current?.postMessage({
      code: currentCode,
      options: JSON.parse(JSON.stringify(opts)),
    })
  }, [setError, setParseTime, setLoading, clearLogs, addToast])

  const download = useCallback(() => {
    const currentOutput = useStore.getState().output
    if (currentOutput) {
      downloadByData(currentOutput, 'output.js')
      addToast('File downloaded', 'success')
    } else {
      addToast('No output to download', 'error')
    }
  }, [addToast])

  const copyOutput = useCallback(() => {
    const currentOutput = useStore.getState().output
    if (!currentOutput) {
      addToast('No output to copy', 'error')
      return
    }
    navigator.clipboard.writeText(currentOutput).then(
      () => addToast('Copied to clipboard', 'success'),
      () => addToast('Failed to copy', 'error'),
    )
  }, [addToast])

  useKeyboardShortcuts({ onRun: run, onDownload: download, onCopyOutput: copyOutput })

  return (
    <div className="flex h-full flex-col bg-white/70 p-2 sm:rounded-l-xl sm:p-3 dark:bg-zinc-900/60">
      <div className="flex flex-col flex-1 min-h-0">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200/80 bg-white/90 px-2.5 py-1.5 text-xs font-medium shadow-sm sm:px-3 sm:py-2 dark:border-zinc-700 dark:bg-zinc-950/50">
          <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-200">
            <svg className="w-4 h-4 hidden sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="font-semibold text-[11px] sm:text-xs">Output</span>
            {parseTime > 0 && (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                {parseTime}ms
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Run */}
            <button
              disabled={loading === 'parse'}
              className={`${btnBase} border-transparent bg-gradient-to-r from-amber-400 to-orange-500 font-semibold text-white shadow-md hover:shadow-lg hover:from-amber-500 hover:to-orange-600 disabled:cursor-not-allowed disabled:opacity-60`}
              title="Deobfuscate (Ctrl+Enter)"
              onClick={run}
            >
              {loading === 'parse' ? (
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
              )}
              <span className="hidden sm:inline">{loading === 'parse' ? 'Processing...' : 'Deobfuscate'}</span>
              <span className="sm:hidden">{loading === 'parse' ? '...' : 'Run'}</span>
            </button>
            {/* Config */}
            <button className={btnConfig} onClick={() => setOptionsOpen(true)}>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="hidden sm:inline">Config</span>
            </button>
            <div className="w-px h-5 bg-zinc-200 dark:bg-zinc-700 hidden sm:block" />
            {/* Copy */}
            <button className={btnDefault} title="Copy (Ctrl+Shift+C)" onClick={copyOutput}>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span className="hidden sm:inline">Copy</span>
            </button>
            {/* Download */}
            <button className={btnDefault} title="Download (Ctrl+S)" onClick={download}>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span className="hidden sm:inline">Save</span>
            </button>
          </div>
        </div>

        {/* Stats bar */}
        {logs.length > 0 && (
          <div className="mt-2">
            <OutputStats logs={logs} parseTime={parseTime} />
          </div>
        )}

        {/* Tab bar */}
        {output && (
          <div className="mt-2 flex gap-0.5 border-b border-zinc-200/50 dark:border-zinc-800/50">
            {(['code', 'ast'] as const).map(tab => (
              <button
                key={tab}
                className={`px-3 py-1.5 text-[11px] font-medium transition-colors relative ${
                  activeTab === tab
                    ? 'text-amber-700 dark:text-amber-400'
                    : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
                }`}
                onClick={() => setActiveTab(tab)}
              >
                {tab === 'code' ? 'Code' : 'AST Tree'}
                {activeTab === tab && (
                  <span className="absolute bottom-0 left-1 right-1 h-0.5 rounded-full bg-amber-500" />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Editor / AST area */}
        <div className={`${output ? 'mt-0' : 'mt-2'} flex min-h-0 flex-1 rounded-lg border border-zinc-200/70 bg-white/90 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-950/60 overflow-hidden`}>
          {loading === 'parse' ? (
            <div className="flex w-full flex-col items-center justify-center gap-3">
              <div className="relative">
                <svg className="w-10 h-10 animate-spin text-amber-500/30" fill="none" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                </svg>
                <svg className="w-10 h-10 animate-spin absolute inset-0 text-amber-500" fill="none" viewBox="0 0 24 24">
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
              <span className="text-xs text-zinc-400 dark:text-zinc-500">Analyzing obfuscated code...</span>
            </div>
          ) : error ? (
            <div className="w-full overflow-auto p-3 sm:p-4 text-sm">
              <div className="rounded-lg border border-red-200 bg-red-50/90 p-3 sm:p-4 shadow-sm dark:border-red-900/60 dark:bg-red-900/20">
                <div className="flex items-start gap-3">
                  <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40">
                    <svg className="w-3.5 h-3.5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <div className="flex-1 space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-red-600 dark:text-red-400">Deobfuscation Failed</p>
                    <pre className="max-h-40 whitespace-pre-wrap break-all rounded-md bg-red-100/50 p-2 font-mono text-[11px] leading-5 text-red-800 dark:bg-red-900/30 dark:text-red-200">{String(error)}</pre>
                    <p className="text-[10px] text-red-500/80 dark:text-red-400/60">
                      Try a different decoder method in Config, or check if the input is valid JavaScript.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : !output ? (
            <div className="flex w-full flex-col items-center justify-center gap-3 text-zinc-400 dark:text-zinc-500">
              <svg className="w-12 h-12 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <div className="text-center">
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Paste code on the left, then hit Deobfuscate</p>
                <p className="mt-1 text-[10px]">or press <kbd className="rounded border border-zinc-300 bg-zinc-100 px-1 py-0.5 font-mono text-[9px] dark:border-zinc-600 dark:bg-zinc-800">Ctrl+Enter</kbd></p>
              </div>
            </div>
          ) : activeTab === 'ast' ? (
            <AstViewer code={output} />
          ) : (
            <Editor
              height="100%"
              defaultLanguage="javascript"
              value={output}
              theme={isDark ? 'vs-dark' : 'vs'}
              options={{
                automaticLayout: true,
                readOnly: true,
                fontSize: 13,
                tabSize: 2,
                wordWrap: 'on',
                minimap: { enabled: false },
                stickyScroll: { enabled: true },
                smoothScrolling: true,
                renderLineHighlight: 'gutter',
              }}
            />
          )}
        </div>
      </div>

      {/* Console */}
      <div className={`mt-2 transition-all duration-200 ${consoleCollapsed ? '' : 'min-h-[100px] h-[22%]'}`}>
        <Console
          logs={logs}
          collapsed={consoleCollapsed}
          onToggle={toggleConsole}
          onClear={clearLogs}
        />
      </div>

      <OptionsModal open={optionsOpen} onClose={() => setOptionsOpen(false)} />
    </div>
  )
}
