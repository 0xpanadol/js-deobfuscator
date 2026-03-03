import { useState, useEffect } from 'react'
import { Allotment } from 'allotment'
import 'allotment/dist/style.css'
import Header from './components/Header'
import SourceCodeEditor from './components/SourceCodeEditor'
import DeobfuscatorOutput from './components/DeobfuscatorOutput'
import ShortcutsBar from './components/ShortcutsBar'
import Toasts from './components/Toasts'
import ShortcutsOverlay from './components/ShortcutsOverlay'

function useIsMobile(breakpoint = 768) {
  const [mobile, setMobile] = useState(window.innerWidth < breakpoint)
  useEffect(() => {
    const handler = () => setMobile(window.innerWidth < breakpoint)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [breakpoint])
  return mobile
}

export default function App() {
  const isMobile = useIsMobile()

  return (
    <main className="h-screen flex flex-col bg-gradient-to-b from-amber-50 via-white to-white dark:from-zinc-950 dark:via-zinc-950 dark:to-black">
      <Header />
      <div className="flex-1 min-h-0">
        {isMobile ? (
          <div className="flex flex-col h-full overflow-auto">
            <div className="min-h-[45vh]">
              <SourceCodeEditor />
            </div>
            <div className="min-h-[45vh]">
              <DeobfuscatorOutput />
            </div>
          </div>
        ) : (
          <Allotment defaultSizes={[54, 46]}>
            <Allotment.Pane minSize={300}>
              <SourceCodeEditor />
            </Allotment.Pane>
            <Allotment.Pane minSize={300}>
              <DeobfuscatorOutput />
            </Allotment.Pane>
          </Allotment>
        )}
      </div>
      {!isMobile && <ShortcutsBar />}
      <Toasts />
      <ShortcutsOverlay />
    </main>
  )
}
