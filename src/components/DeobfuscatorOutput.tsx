import { useState, useEffect, useRef, useCallback } from 'react'
import Editor from '@monaco-editor/react'
import { useStore, FILE_SIZE_WARNING_BYTES } from '../store/useStore'
import { useDarkMode } from '../hooks/useDarkMode'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { downloadByData } from '../utils/file'
import OptionsModal from './OptionsModal'
import Console from './Console'
import OutputStats from './OutputStats'
import AstViewer from './AstViewer'
import ProgressBar from './ProgressBar'
import BatchPanel from './BatchPanel'
import DeobWorker from '../utils/deobfuscate.worker?worker'

type OutputTab = 'code' | 'ast'

const btnBase = 'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[11px] font-medium shadow-sm transition-all active:scale-95'
const btnDefault = `${btnBase} border-zinc-300 bg-white text-zinc-700 hover:border-amber-400 hover:bg-amber-50 hover:text-amber-700 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-amber-500 dark:hover:bg-amber-500/10 dark:hover:text-amber-300`
const btnConfig = `${btnBase} border-amber-300 bg-amber-50 text-amber-800 font-semibold hover:border-amber-400 hover:bg-amber-100 dark:border-amber-500/50 dark:bg-amber-500/15 dark:text-amber-200 dark:hover:bg-amber-500/25`
const btnDanger = `${btnBase} border-red-300 bg-red-50 text-red-700 font-semibold hover:border-red-400 hover:bg-red-100 dark:border-red-500/50 dark:bg-red-500/15 dark:text-red-200 dark:hover:bg-red-500/25`

function createWorker() {
  return new DeobWorker()
}

export default function DeobfuscatorOutput() {
  const {
    output, setOutput, loading, setLoading,
    error, setError, parseTime, setParseTime,
    logs, clearLogs,
    consoleCollapsed, toggleConsole,
    addToast, setProgress, batchMode,
  } = useStore()

  const { isDark } = useDarkMode()
  const [optionsOpen, setOptionsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<OutputTab>('code')
  const [batchOpen, setBatchOpen] = useState(false)
  const workerRef = useRef<Worker | null>(null)

  const setupWorker = useCallback(() => {
    if (workerRef.current) workerRef.current.terminate()
    const worker = createWorker()
    workerRef.current = worker

    worker.onmessage = ({ data }) => {
      if (data?.type === 'log') {
        useStore.getState().pushLog(String(data.message ?? ''), data.timestamp)
        return
      }
      if (data?.type === 'progress') {
        useStore.getState().setProgress(data.stage, data.index, data.total)
        useStore.getState().pushLog(`[${data.index}/${data.total}] ${data.stage}`, data.timestamp)
        return
      }
      if (data?.type === 'error') {
        useStore.getState().setLoading(false)
        useStore.getState().setError(data.message)
        useStore.getState().setProgress(null)
        useStore.getState().pushLog(String(data.message ?? ''), data.timestamp)
        useStore.getState().addToast('Deobfuscation failed', 'error')
        return
      }
      if (data?.type === 'result') {
        useStore.getState().setLoading(false)
        useStore.getState().setError(null)
        useStore.getState().setProgress(null)
        useStore.getState().setOutput(data.code)
        useStore.getState().setParseTime(Number(data.parseTime))
        useStore.getState().pushLog(
          `Deobfuscation completed, time: ${data.parseTime} ms | Method: ${useStore.getState().options.decoderLocationMethod}`
        )
        useStore.getState().addToast(`Done in ${data.parseTime}ms`, 'success')
      }
      if (data?.type === 'autoDetectResult') {
        useStore.getState().pushLog(`Auto-detected decoder method: ${data.method}`)
        useStore.getState().addToast(`Suggested method: ${data.method}`, 'info')
      }
      // Batch events
      if (data?.type === 'batchProgress') {
        useStore.getState().updateBatchFile(data.index, { status: 'processing' })
      }
      if (data?.type === 'batchResult') {
        useStore.getState().updateBatchFile(data.index, {
          status: 'done',
          output: data.code,
          parseTime: Number(data.parseTime),
        })
      }
      if (data?.type === 'batchError') {
        useStore.getState().updateBatchFile(data.index, {
          status: 'error',
          error: data.message,
        })
      }
      if (data?.type === 'batchDone') {
        useStore.getState().setLoading(false)
        useStore.getState().setProgress(null)
        useStore.getState().addToast('Batch processing complete', 'success')
      }
    }

    worker.onerror = (event) => {
      useStore.getState().setLoading(false)
      useStore.getState().setOutput('')
      useStore.getState().setError(event.message)
      useStore.getState().setProgress(null)
      useStore.getState().pushLog(event.message)
      useStore.getState().addToast('Worker error', 'error')
    }

    return worker
  }, [])

  useEffect(() => {
    setupWorker()
    return () => workerRef.current?.terminate()
  }, [setupWorker])

  const run = useCallback(() => {
    const currentCode = useStore.getState().code
    if (!currentCode?.trim()) {
      setError('Please input code first')
      addToast('No code to deobfuscate', 'error')
      return
    }

    // File size warning
    const size = new TextEncoder().encode(currentCode).length
    if (size > FILE_SIZE_WARNING_BYTES) {
      const sizeMB = (size / (1024 * 1024)).toFixed(1)
      if (!window.confirm(`This file is ${sizeMB}MB. Large files may take a while to process. Continue?`)) {
        return
      }
    }

    setError(null)
    setParseTime(0)
    setLoading('parse')
    setProgress(null)
    clearLogs()
    setActiveTab('code')

    const opts = useStore.getState().options
    workerRef.current?.postMessage({
      type: 'run',
      code: currentCode,
      options: JSON.parse(JSON.stringify(opts)),
    })
  }, [setError, setParseTime, setLoading, clearLogs, addToast, setProgress])

  const cancel = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate()
      workerRef.current = null
    }
    setLoading(false)
    setProgress(null)
    addToast('Deobfuscation cancelled', 'info')
    pushLog('Deobfuscation cancelled by user')
    // Spin up a fresh worker
    setupWorker()
  }, [setLoading, addToast, setProgress, setupWorker])

  const autoDetect = useCallback(() => {
    const currentCode = useStore.getState().code
    if (!currentCode?.trim()) {
      addToast('No code to analyze', 'error')
      return
    }
    workerRef.current?.postMessage({ type: 'autoDetect', code: currentCode })
  }, [addToast])

  const pushLog = useStore.getState().pushLog

  const download = useCallback(() => {
    const currentOutput = useStore.getState().output
    if (currentOutput) {
      downloadByData(currentOutput, 'output.js')
      addToast('File downloaded', 'success')
    } else {
      addToast('No output to download', 'error')
    }
  }, [addToast])

  const copyOutput = useCallback(async () => {
    const currentOutput = useStore.getState().output
    if (currentOutput) {
      await navigator.clipboard.writeText(currentOutput)
      addToast('Copied to clipboard', 'success')
    } else {
      addToast('No output to copy', 'error')
    }
  }, [addToast])

  const exportSettings = useCallback(() => {
    const opts = useStore.getState().options
    const { setupCode: _, ...exportable } = opts
    const json = JSON.stringify(exportable, null, 2)
    downloadByData(json, 'deob-settings.json', 'application/json')
    addToast('Settings exported', 'success')
  }, [addToast])

  const importSettings = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = () => {
        try {
          const parsed = JSON.parse(reader.result as string)
          const current = useStore.getState().options
          useStore.getState().setOptions({ ...current, ...parsed })
          addToast('Settings imported', 'success')
        } catch {
          addToast('Invalid settings file', 'error')
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }, [addToast])

  useKeyboardShortcuts({ onRun: run, onDownload: download, onCopyOutput: copyOutput })

  const progressStage = useStore(s => s.progressStage)
  const progressIndex = useStore(s => s.progressIndex)
  const progressTotal = useStore(s => s.progressTotal)

  return (
    <div className="flex h-full flex-col bg-white/70 p-2 sm:rounded-l-xl sm:p-3 dark:bg-zinc-900/60">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed border-amber-200/80 bg-amber-50/70 px-2.5 py-1.5 text-xs text-amber-800 sm:px-3 sm:py-2 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 hidden sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
          <span className="font-semibold text-zinc-800 dark:text-zinc-100">Output</span>
          {/* Tab switcher */}
          <div className="flex rounded-md border border-zinc-200 dark:border-zinc-700 overflow-hidden">
            {(['code', 'ast'] as const).map(tab => (
              <button
                key={tab}
                className={`px-2 py-0.5 text-[10px] font-medium transition-colors ${activeTab === tab ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200' : 'bg-white text-zinc-500 hover:bg-zinc-50 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {loading ? (
            <button className={btnDanger} onClick={cancel} title="Cancel deobfuscation">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cancel
            </button>
          ) : (
            <button className={`${btnBase} border-emerald-300 bg-emerald-50 text-emerald-700 font-semibold hover:border-emerald-400 hover:bg-emerald-100 dark:border-emerald-500/50 dark:bg-emerald-500/15 dark:text-emerald-300 dark:hover:bg-emerald-500/25`} onClick={run}>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              </svg>
              Run
            </button>
          )}
          <button className={btnDefault} onClick={autoDetect} title="Auto-detect decoder method">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <span className="hidden sm:inline">Detect</span>
          </button>
          <button className={btnConfig} onClick={() => setOptionsOpen(true)}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Config
          </button>
          <button className={btnDefault} onClick={() => setBatchOpen(!batchOpen)} title="Batch processing">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span className="hidden sm:inline">Batch</span>
          </button>
          <button className={btnDefault} onClick={exportSettings} title="Export settings">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>
          <button className={btnDefault} onClick={importSettings} title="Import settings">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </button>
          {output && (
            <>
              <button className={btnDefault} onClick={download} title="Download output (Ctrl+S)">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span className="hidden sm:inline">Save</span>
              </button>
              <button className={btnDefault} onClick={copyOutput} title="Copy output (Ctrl+Shift+C)">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span className="hidden sm:inline">Copy</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {loading && <ProgressBar stage={progressStage} index={progressIndex} total={progressTotal} />}

      {/* Batch panel */}
      {batchOpen && <BatchPanel workerRef={workerRef} onClose={() => setBatchOpen(false)} />}

      {/* Stats */}
      {!loading && logs.length > 0 && (
        <div className="mt-1.5">
          <OutputStats logs={logs} parseTime={parseTime} />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
          <pre className="whitespace-pre-wrap break-words">{error}</pre>
        </div>
      )}

      {/* Editor / AST */}
      <div className="mt-2 flex min-h-0 flex-1 rounded-lg border border-zinc-200/70 bg-white/90 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-950/60 overflow-hidden">
        {activeTab === 'code' ? (
          loading ? (
            <div className="flex h-full w-full flex-col items-center justify-center gap-3">
              <svg className="w-8 h-8 animate-spin text-amber-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {progressStage && (
                <span className="text-xs text-zinc-500 dark:text-zinc-400 text-center px-4">{progressStage}</span>
              )}
            </div>
          ) : (
            <Editor
              height="100%"
              defaultLanguage="javascript"
              value={output}
              theme={isDark ? 'vs-dark' : 'vs'}
              options={{
                readOnly: true,
                automaticLayout: true,
                fontSize: 13,
                tabSize: 2,
                wordWrap: useStore.getState().editorWordWrap ? 'on' : 'off',
                minimap: { enabled: false },
                stickyScroll: { enabled: true },
                smoothScrolling: true,
                renderLineHighlight: 'gutter',
              }}
              loading={
                <div className="flex h-full w-full items-center justify-center">
                  <span className="text-xs text-zinc-400">Loading editor...</span>
                </div>
              }
            />
          )
        ) : (
          <AstViewer code={output} />
        )}
      </div>

      {/* Console */}
      <div className={`mt-2 ${consoleCollapsed ? '' : 'min-h-[120px] max-h-[200px]'}`}>
        <Console logs={logs} collapsed={consoleCollapsed} onToggle={toggleConsole} onClear={clearLogs} />
      </div>

      <OptionsModal open={optionsOpen} onClose={() => setOptionsOpen(false)} />
    </div>
  )
}
