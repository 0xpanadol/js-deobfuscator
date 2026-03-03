import { loader } from '@monaco-editor/react'
import * as monaco from 'monaco-editor'
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'

// Configure Monaco workers for local bundling
self.MonacoEnvironment = {
  getWorker(_: unknown, label: string) {
    if (label === 'typescript' || label === 'javascript') {
      return new tsWorker()
    }
    return new editorWorker()
  },
}

// Use local monaco instance instead of CDN
loader.config({ monaco })

// Fix "unknown service productService" error on Ctrl+V in Monaco 0.52+
// The built-in clipboard action references VS Code's productService which
// doesn't exist in standalone mode. Override with native clipboard + executeEdits
// for efficient bulk paste (trigger('type') is character-by-character and crashes on large input).
monaco.editor.addEditorAction({
  id: 'editor.action.clipboardPasteAction',
  label: 'Paste',
  keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyV],
  run: async (editor) => {
    try {
      const text = await navigator.clipboard.readText()
      if (!text) return

      const selection = editor.getSelection()
      if (!selection) return

      editor.pushUndoStop()
      editor.executeEdits('paste', [{
        range: selection,
        text,
        forceMoveMarkers: true,
      }])
      editor.pushUndoStop()
    } catch {
      // Clipboard API denied - browser will handle natively
    }
  },
})
