import { useState, useEffect } from 'react'
import EntryPage from './pages/EntryPage'
import SetupPage from './pages/SetupPage'
import EditorPage from './pages/EditorPage'
import WallPage from './pages/WallPage'
import GalleryPage from './pages/GalleryPage'

const SESSION_KEY = 'pixelart_username'

function readStoredUserName() {
  try {
    return localStorage.getItem(SESSION_KEY) || ''
  } catch {
    return '' // localStorage가 막혀있는 환경(시크릿 모드 등)에서도 앱이 죽지 않게
  }
}

export default function App() {
  // 새로고침해도 로그인 상태가 유지되도록, 저장된 이름이 있으면 이름 입력 단계를 건너뛴다.
  const [userName, setUserName] = useState(() => readStoredUserName())
  const [page, setPage] = useState(() => (readStoredUserName() ? 'setup' : 'entry'))
  const [canvasConfig, setCanvasConfig] = useState({ cols: 16, rows: 16 })
  const [resumeArtwork, setResumeArtwork] = useState(null)

  useEffect(() => {
    window.history.replaceState({ page }, '')
    const onPopState = (e) => setPage(e.state?.page || 'entry')
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, []) // eslint-disable-line

  const login = (name) => {
    try { localStorage.setItem(SESSION_KEY, name) } catch { /* 저장 실패해도 이번 세션은 계속 진행 */ }
    setUserName(name)
  }

  const logout = () => {
    try { localStorage.removeItem(SESSION_KEY) } catch { /* no-op */ }
    setUserName('')
    setResumeArtwork(null)
    navigate('entry')
  }

  const navigate = (newPage) => {
    window.history.pushState({ page: newPage }, '')
    setPage(newPage)
  }

  return (
    <div className="h-screen w-screen overflow-hidden">
      {page === 'entry' && (
        <EntryPage
          onNext={(name) => { login(name); navigate('setup') }}
          onGoToGallery={() => navigate('gallery')}
        />
      )}
      {page === 'setup' && (
        <SetupPage
          userName={userName}
          onNext={(cfg) => { setCanvasConfig(cfg); setResumeArtwork(null); navigate('editor') }}
          onResume={(artwork) => { setCanvasConfig({ cols: artwork.cols, rows: artwork.rows }); setResumeArtwork(artwork); navigate('editor') }}
          onGoHome={logout}
        />
      )}
      {page === 'editor' && (
        <EditorPage
          userName={userName}
          gridCols={canvasConfig.cols}
          gridRows={canvasConfig.rows}
          resumeArtwork={resumeArtwork}
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
