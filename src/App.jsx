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
  const [resumeArtwork, setResumeArtwork] = useState(null)
  // 새로 시작하거나 다른 작품을 불러올 때마다 값을 바꿔 EditorPage를 완전히 새로 마운트시킨다
  const [editorKey, setEditorKey] = useState(0)

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
          onNext={(cfg) => {
            setCanvasConfig(cfg)
            setResumeArtwork(null)
            setEditorKey(k => k + 1)
            navigate('editor')
          }}
        />
      )}
      {page === 'editor' && (
        <EditorPage
          key={editorKey}
          userName={userName}
          gridCols={canvasConfig.cols}
          gridRows={canvasConfig.rows}
          ratio={canvasConfig.ratio}
          orientation={canvasConfig.orientation}
          resumeArtwork={resumeArtwork}
          onGoToWall={() => navigate('wall')}
          onGoToSetup={() => navigate('setup')}
          onEditArtwork={(artwork) => {
            setCanvasConfig({ cols: artwork.cols, rows: artwork.rows, ratio: artwork.ratio, orientation: artwork.orientation })
            setResumeArtwork(artwork)
            setEditorKey(k => k + 1)
          }}
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
