import { useCallback, useRef, useState } from 'react'
import { useStore } from '../store/useStore'
import { downloadByData } from '../utils/file'
import type { BatchFile } from '../types/options'

interface BatchPanelProps {
  workerRef: React.MutableRefObject<Worker | null>
  onClose: () => void
}

const statusColors: Record<BatchFile['status'], string> = {
  pending: 'text-zinc-400 dark:text-zinc-500',
  processing: 'text-amber-500 dark:text-amber-400',
  done: 'text-emerald-500 dark:text-emerald-400',
  error: 'text-red-500 dark:text-red-400',
}

const statusLabels: Record<BatchFile['status'], string> = {
  pending: 'Pending',
  processing: 'Processing...',
  done: 'Done',
  error: 'Error',
}

export default function BatchPanel({ workerRef, onClose }: BatchPanelProps) {
  const { batchFiles, setBatchFiles, setLoading, addToast, options } = useStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const addFiles = useCallback((fileList: FileList) => {
    const newFiles: BatchFile[] = []
    const promises: Promise<void>[] = []

    Array.from(fileList).forEach(file => {
      if (!file.name.endsWith('.js') && !file.name.endsWith('.txt')) return
      promises.push(
        new Promise(resolve => {
          const reader = new FileReader()
          reader.onload = () => {
            newFiles.push({
              name: file.name,
              code: reader.result as string,
              status: 'pending',
            })
            resolve()
          }
          reader.readAsText(file)
        })
      )
    })

    Promise.all(promises).then(() => {
      setBatchFiles([...batchFiles, ...newFiles])
      addToast(`Added ${newFiles.length} file(s)`, 'info')
    })
  }, [batchFiles, setBatchFiles, addToast])

  const runBatch = useCallback(() => {
    if (!batchFiles.length) {
      addToast('No files to process', 'error')
      return
    }
    const pending = batchFiles.map(f => ({ ...f, status: 'pending' as const, output: undefined, error: undefined }))
    setBatchFiles(pending)
    setLoading('parse')
    workerRef.current?.postMessage({
      type: 'batch',
      files: pending.map(f => ({ name: f.name, code: f.code })),
      options: JSON.parse(JSON.stringify(options)),
    })
  }, [batchFiles, setBatchFiles, setLoading, workerRef, options, addToast])

  const downloadAll = useCallback(() => {
    const done = batchFiles.filter(f => f.status === 'done' && f.output)
    if (!done.length) {
      addToast('No completed files to download', 'error')
      return
    }
    done.forEach(f => {
      downloadByData(f.output!, f.name.replace(/\.js$/, '.deob.js'))
    })
    addToast(`Downloaded ${done.length} file(s)`, 'success')
  }, [batchFiles, addToast])

  const clearBatch = () => {
    setBatchFiles([])
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files)
  }, [addFiles])

  return (
    <div className="mt-2 rounded-lg border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">Batch Processing</span>
        <div className="flex items-center gap-1.5">
          {batchFiles.length > 0 && (
            <>
              <button onClick={runBatch} className="rounded-md bg-emerald-50 border border-emerald-300 px-2 py-0.5 text-[10px] font-medium text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/15 dark:border-emerald-500/50 dark:text-emerald-300">
                Run All
              </button>
              <button onClick={downloadAll} className="rounded-md bg-amber-50 border border-amber-300 px-2 py-0.5 text-[10px] font-medium text-amber-700 hover:bg-amber-100 dark:bg-amber-500/15 dark:border-amber-500/50 dark:text-amber-300">
                Download All
              </button>
              <button onClick={clearBatch} className="rounded-md bg-zinc-50 border border-zinc-300 px-2 py-0.5 text-[10px] font-medium text-zinc-500 hover:bg-zinc-100 dark:bg-zinc-800 dark:border-zinc-600 dark:text-zinc-400">
                Clear
              </button>
            </>
          )}
          <button onClick={onClose} className="rounded-md p-0.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div
        className={`rounded-lg border-2 border-dashed p-4 text-center transition-colors ${dragging ? 'border-amber-400 bg-amber-50/50 dark:bg-amber-500/10' : 'border-zinc-200 dark:border-zinc-700'}`}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
          Drop .js/.txt files here or{' '}
          <button className="text-amber-600 underline dark:text-amber-400" onClick={() => fileInputRef.current?.click()}>
            browse
          </button>
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".js,.txt"
          multiple
          className="hidden"
          onChange={e => { if (e.target.files) addFiles(e.target.files); e.target.value = '' }}
        />
      </div>

      {batchFiles.length > 0 && (
        <div className="mt-2 max-h-40 overflow-auto space-y-1">
          {batchFiles.map((f, i) => (
            <div key={`${f.name}-${i}`} className="flex items-center justify-between rounded-md bg-zinc-50 px-2 py-1 text-[11px] dark:bg-zinc-800">
              <span className="truncate max-w-[60%] text-zinc-700 dark:text-zinc-300">{f.name}</span>
              <div className="flex items-center gap-2">
                {f.parseTime && <span className="text-zinc-400">{f.parseTime}ms</span>}
                <span className={`font-medium ${statusColors[f.status]}`}>{statusLabels[f.status]}</span>
                {f.error && (
                  <span className="text-red-400 truncate max-w-[100px]" title={f.error}>err</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
