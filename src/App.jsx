import { useState, useEffect } from 'react'
import EntryPage from './pages/EntryPage'
import SetupPage from './pages/SetupPage'
import EditorPage from './pages/EditorPage'
import WallPage from './pages/WallPage'
import GalleryPage from './pages/GalleryPage'

export default function App() {
  const [page, setPage] = useState('entry')
  const [userName, setUserName] = useState('')
  const [canvasConfig, setCanvasConfig] = useState({ cols: 16, rows: 16 })

  useEffect(() => {
    window.history.replaceState({ page: 'entry' }, '')
    const onPopState = (e) => setPage(e.state?.page || 'entry')
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const navigate = (newPage) => {
    window.history.pushState({ page: newPage }, '')
    setPage(newPage)
  }

  return (
    <div className="h-screen w-screen overflow-hidden">
      {page === 'entry' && (
        <EntryPage
          onNext={(name) => { setUserName(name); navigate('setup') }}
          onGoToGallery={() => navigate('gallery')}
        />
      )}
      {page === 'setup' && (
        <SetupPage
          onNext={(cfg) => { setCanvasConfig(cfg); navigate('editor') }}
        />
      )}
      {page === 'editor' && (
        <EditorPage
          userName={userName}
          gridCols={canvasConfig.cols}
          gridRows={canvasConfig.rows}
          onGoToWall={() => navigate('wall')}
          onGoToSetup={() => navigate('setup')}
        />
      )}
      {page === 'wall' && (
        <WallPage onBack={() => window.history.back()} />
      )}
      {page === 'gallery' && (
        <GalleryPage onBack={() => window.history.back()} />
      )}
    </div>
  )
}
