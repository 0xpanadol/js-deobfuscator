import Editor from '@monaco-editor/react'
import { useStore } from '../store/useStore'
import { useDarkMode } from '../hooks/useDarkMode'
import { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import { SAMPLE_CODE } from '../utils/sampleCode'

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/* shared button base for toolbar actions */
const btnBase = 'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-medium shadow-sm transition-all active:scale-95'
const btnDefault = `${btnBase} border-zinc-300 bg-white text-zinc-700 hover:border-amber-400 hover:bg-amber-50 hover:text-amber-700 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-amber-500 dark:hover:bg-amber-500/10 dark:hover:text-amber-300`
const btnDanger = `${btnBase} border-zinc-300 bg-white text-zinc-500 hover:border-red-400 hover:bg-red-50 hover:text-red-600 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:border-red-500 dark:hover:bg-red-500/10 dark:hover:text-red-400`
const btnAccent = `${btnBase} border-amber-300 bg-amber-50 text-amber-700 font-semibold hover:border-amber-400 hover:bg-amber-100 dark:border-amber-500/50 dark:bg-amber-500/15 dark:text-amber-300 dark:hover:bg-amber-500/25`

export default function SourceCodeEditor() {
  const { code, setCode, editorWordWrap, toggleWordWrap } = useStore()
  const { isDark } = useDarkMode()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const editorRef = useRef<any>(null)
  const prevCodeRef = useRef(code)
  const [dragging, setDragging] = useState(false)

  const stats = useMemo(() => {
    if (!code) return null
    const lines = code.split('\n').length
    const size = new TextEncoder().encode(code).length
    return { lines, size: formatSize(size) }
  }, [code])

  const handleEditorMount = (editor: any) => {
    editorRef.current = editor
    editor.onDidChangeModelContent(() => {
      const val = editor.getValue()
      prevCodeRef.current = val
      setCode(val)
    })
  }

  useEffect(() => {
    const editor = editorRef.current
    if (editor && code !== prevCodeRef.current) {
      prevCodeRef.current = code
      editor.setValue(code)
    }
  }, [code])

  const handleFileLoad = useCallback((file: File) => {
    if (!file.name.endsWith('.js') && !file.name.endsWith('.txt')) {
      useStore.getState().addToast('Only .js and .txt files are supported', 'error')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setCode(reader.result as string)
      useStore.getState().addToast(`Loaded ${file.name}`, 'success')
    }
    reader.readAsText(file)
  }, [setCode])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFileLoad(file)
    e.target.value = ''
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFileLoad(file)
  }, [handleFileLoad])

  const loadSample = () => {
    setCode(SAMPLE_CODE)
    useStore.getState().addToast('Sample code loaded', 'info')
  }

  const clearCode = () => {
    setCode('')
    useStore.getState().setOutput('')
    useStore.getState().setError(null)
    useStore.getState().clearLogs()
    useStore.getState().setParseTime(0)
  }

  return (
    <div
      className="flex h-full flex-col bg-white/70 p-2 sm:rounded-r-xl sm:p-3 dark:bg-zinc-900/60 relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {dragging && (
        <div className="absolute inset-0 z-50 flex items-center justify-center rounded-xl border-2 border-dashed border-amber-400 bg-amber-50/90 dark:bg-amber-900/30 transition-all">
          <div className="flex flex-col items-center gap-2 text-amber-700 dark:text-amber-300">
            <svg className="w-10 h-10 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <span className="text-sm font-semibold">Drop .js or .txt file here</span>
          </div>
        </div>
      )}
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed border-amber-200/80 bg-amber-50/70 px-2.5 py-1.5 text-xs text-amber-800 sm:px-3 sm:py-2 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 hidden sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <span className="font-semibold text-zinc-800 dark:text-zinc-100">Source Code</span>
          {stats && (
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
              {stats.lines} lines · {stats.size}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {!code && (
            <button className={btnAccent} onClick={loadSample}>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="hidden xs:inline">Try Sample</span>
              <span className="xs:hidden">Sample</span>
            </button>
          )}
          {code && (
            <button className={btnDanger} onClick={clearCode} title="Clear editor">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Clear
            </button>
          )}
          <button
            className={editorWordWrap ? btnAccent : btnDefault}
            title="Toggle Word Wrap"
            onClick={toggleWordWrap}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h11.5m0 0a3.5 3.5 0 010 7H13m2.5-7v7" />
            </svg>
            <span className="hidden sm:inline">{editorWordWrap ? 'No Wrap' : 'Wrap'}</span>
          </button>
          <label htmlFor="fileInput" className={`${btnDefault} cursor-pointer`}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <span className="hidden sm:inline">Upload</span>
          </label>
          <input
            ref={fileInputRef}
            id="fileInput"
            type="file"
            accept=".js,.txt"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </div>
      {/* Editor */}
      <div className="mt-2 flex min-h-0 flex-1 rounded-lg border border-zinc-200/70 bg-white/90 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-950/60 overflow-hidden">
        <Editor
          height="100%"
          defaultLanguage="javascript"
          defaultValue={code}
          onMount={handleEditorMount}
          theme={isDark ? 'vs-dark' : 'vs'}
          options={{
            automaticLayout: true,
            fontSize: 13,
            tabSize: 2,
            wordWrap: editorWordWrap ? 'on' : 'off',
            minimap: { enabled: false },
            stickyScroll: { enabled: true },
            smoothScrolling: true,
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            renderLineHighlight: 'gutter',
          }}
          loading={
            <div className="flex h-full w-full flex-col items-center justify-center gap-2">
              <svg className="w-6 h-6 animate-spin text-amber-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-xs text-zinc-400">Loading editor...</span>
            </div>
          }
        />
      </div>
    </div>
  )
}
