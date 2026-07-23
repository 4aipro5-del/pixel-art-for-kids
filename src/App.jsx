import { useState } from 'react'
import EntryPage from './pages/EntryPage'
import SetupPage from './pages/SetupPage'
import EditorPage from './pages/EditorPage'

export default function App() {
  const [page, setPage] = useState('entry')
  const [userName, setUserName] = useState('')
  const [canvasConfig, setCanvasConfig] = useState({ cols: 16, rows: 16 })
  const [resumeArtwork, setResumeArtwork] = useState(null)
  // 새로 시작하거나 스케치북에서 다른 작품을 불러올 때마다 값을 바꿔 EditorPage를 완전히 새로 마운트시킨다
  const [editorKey, setEditorKey] = useState(0)

  const navigate = (newPage) => setPage(newPage)

  const resetToEntry = () => {
    setUserName('')
    setCanvasConfig({ cols: 16, rows: 16 })
    setResumeArtwork(null)
    navigate('entry')
  }

  return (
    <div className="h-svh w-screen overflow-hidden">
      {page === 'entry' && (
        <EntryPage
          onNext={(name) => {
            setUserName(name)
            navigate('setup')
          }}
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
          onGoHome={resetToEntry}
        />
      )}
      {page === 'editor' && (
        <EditorPage
          key={editorKey}
          userName={userName}
          gridCols={canvasConfig.cols}
          gridRows={canvasConfig.rows}
          resumeArtwork={resumeArtwork}
          onGoToSetup={() => navigate('setup')}
          onEditArtwork={(artwork) => {
            setCanvasConfig({ cols: artwork.cols, rows: artwork.rows })
            setResumeArtwork(artwork)
            setEditorKey(k => k + 1)
          }}
        />
      )}
    </div>
  )
}
