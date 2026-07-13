import { useState, useEffect } from 'react'
import EntryPage from './pages/EntryPage'
import SetupPage from './pages/SetupPage'
import EditorPage from './pages/EditorPage'
import WallPage from './pages/WallPage'
import GalleryPage from './pages/GalleryPage'
import TeacherCreateClassPage from './pages/TeacherCreateClassPage'
import TeacherDashboardPage from './pages/TeacherDashboardPage'
import { logoutStudent } from './firebase'

// 학급 참여 세션(classId/studentId/nickname)을 저장 — 개인정보 아님, 편의용 캐시일 뿐이라
// 언제든 "학급 코드+별명+PIN" 재입력으로도 동일하게 복구 가능해야 한다.
const CLASS_SESSION_KEY = 'pixelart_class_session'

function loadClassSession() {
  try {
    const raw = localStorage.getItem(CLASS_SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export default function App() {
  const [page, setPage] = useState('entry')
  const [userName, setUserName] = useState('')
  const [classSession, setClassSession] = useState(loadClassSession)
  const [canvasConfig, setCanvasConfig] = useState({ cols: 16, rows: 16 })
  const [resumeArtwork, setResumeArtwork] = useState(null)
  // 새로 시작하거나 다른 작품을 불러올 때마다 값을 바꿔 EditorPage를 완전히 새로 마운트시킨다
  const [editorKey, setEditorKey] = useState(0)
  // 교사가 발급받은 관리 링크(/manage/:manageCode)로 직접 들어온 경우의 원문 코드
  const [manageCodeFromUrl, setManageCodeFromUrl] = useState(null)

  useEffect(() => {
    // 관리 링크(/manage/:manageCode)로 곧장 들어온 경우 — 내부 가상 라우팅과는 별개로
    // 실제 URL 경로를 봐야 하는 유일한 진입점이다.
    const match = window.location.pathname.match(/^\/manage\/([^/]+)\/?$/)
    if (match) {
      setManageCodeFromUrl(decodeURIComponent(match[1]))
      setPage('teacherDashboard')
    } else {
      window.history.replaceState({ page: 'entry' }, '')
    }
    const onPopState = (e) => setPage(e.state?.page || 'entry')
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const navigate = (newPage) => {
    window.history.pushState({ page: newPage }, '')
    setPage(newPage)
  }

  // /manage/:code로 들어온 뒤 "처음으로"를 누르면, 다음 새로고침에서 다시 대시보드로
  // 튕기지 않도록 실제 URL 경로도 "/"로 되돌린다.
  const goHomeFromDashboard = () => {
    window.history.pushState({ page: 'entry' }, '', '/')
    setPage('entry')
  }

  // 공용 PC 대비 "이 기기에서 내 정보 지우기" — Firebase Auth 로그아웃 + 로컬 세션/이름/캔버스
  // 설정을 전부 지우고 첫 화면으로 돌아간다. SetupPage의 "처음으로"도 같은 리셋을 쓴다.
  const resetToEntry = () => {
    logoutStudent()
    setUserName('')
    setClassSession(null)
    try { localStorage.removeItem(CLASS_SESSION_KEY) } catch {}
    setCanvasConfig({ cols: 16, rows: 16 })
    setResumeArtwork(null)
    navigate('entry')
  }

  return (
    <div className="h-screen w-screen overflow-hidden">
      {page === 'entry' && (
        <EntryPage
          onNext={(name) => {
            if (classSession) logoutStudent()
            setUserName(name)
            setClassSession(null)
            try { localStorage.removeItem(CLASS_SESSION_KEY) } catch {}
            navigate('setup')
          }}
          onGoToGallery={() => navigate('gallery')}
          onJoinClass={(session) => {
            setUserName(session.nickname)
            setClassSession(session)
            try { localStorage.setItem(CLASS_SESSION_KEY, JSON.stringify(session)) } catch {}
            navigate('setup')
          }}
          onGoToTeacherCreate={() => navigate('teacherCreate')}
        />
      )}
      {page === 'teacherCreate' && (
        <TeacherCreateClassPage onGoHome={() => navigate('entry')} />
      )}
      {page === 'teacherDashboard' && (
        <TeacherDashboardPage manageCode={manageCodeFromUrl} onGoHome={goHomeFromDashboard} />
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
          ratio={canvasConfig.ratio}
          orientation={canvasConfig.orientation}
          resumeArtwork={resumeArtwork}
          classSession={classSession}
          onGoToGallery={() => navigate('gallery')}
          onGoToSetup={() => navigate('setup')}
          onEditArtwork={(artwork) => {
            setCanvasConfig({ cols: artwork.cols, rows: artwork.rows, ratio: artwork.ratio, orientation: artwork.orientation })
            setResumeArtwork(artwork)
            setEditorKey(k => k + 1)
          }}
          onLogout={resetToEntry}
        />
      )}
      {page === 'wall' && (
        <WallPage onBack={() => window.history.back()} />
      )}
      {page === 'gallery' && (
        <GalleryPage userName={userName} onBack={() => window.history.back()} />
      )}
    </div>
  )
}
