import { useEffect, useRef, useState } from 'react'
import JSZip from 'jszip'
import QRCode from 'qrcode'
import {
  getClassDashboard, getClassArtworks, resetStudentPin, deleteClassArtwork, DashboardError,
} from '../firebase'

const ACCENT_YELLOW = '#f7d070'
const PAGE_BG = '#1a1c1e'
const PANEL_BG = '#111214'
const DANGER = '#f87171'

const DASHBOARD_ERROR_MESSAGES = {
  [DashboardError.INVALID_MANAGE_CODE]: '관리 링크가 올바르지 않아요. 링크를 다시 확인해주세요.',
  [DashboardError.UNKNOWN]: '학급 정보를 불러오지 못했어요. 다시 시도해주세요.',
}

// 서버는 pixels 배열만 주므로(PNG가 아님) 캔버스에 직접 그려 썸네일/다운로드용 이미지를 만든다.
function PixelThumb({ pixels, cols, rows }) {
  const canvasRef = useRef(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !cols || !rows) return
    canvas.width = cols
    canvas.height = rows
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, cols, rows)
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const color = pixels[r]?.[c]
        if (color) {
          ctx.fillStyle = color
          ctx.fillRect(c, r, 1, 1)
        }
      }
    }
  }, [pixels, cols, rows])
  return (
    <canvas
      ref={canvasRef}
      className="max-w-full max-h-full"
      style={{ imageRendering: 'pixelated', width: '100%', height: '100%' }}
    />
  )
}

function pixelsToBlob(pixels, cols, rows, scale = 16) {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    canvas.width = cols * scale
    canvas.height = rows * scale
    const ctx = canvas.getContext('2d')
    ctx.imageSmoothingEnabled = false
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const color = pixels[r]?.[c]
        if (color) {
          ctx.fillStyle = color
          ctx.fillRect(c * scale, r * scale, scale, scale)
        }
      }
    }
    canvas.toBlob(resolve, 'image/png')
  })
}

export default function TeacherDashboardPage({ manageCode, onGoHome }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dashboard, setDashboard] = useState(null) // { classId, className, joinCode, authType, expiresAt, students }
  const [artworks, setArtworks] = useState([])
  const [artworksLoading, setArtworksLoading] = useState(false)

  const [joinQrDataUrl, setJoinQrDataUrl] = useState('')
  const [zipping, setZipping] = useState(false)

  const [resetTarget, setResetTarget] = useState(null) // nickname | null
  const [resetBusy, setResetBusy] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null) // artwork | null
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [toast, setToast] = useState('')

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    getClassDashboard(manageCode)
      .then(async (data) => {
        if (cancelled) return
        setDashboard(data)
        setArtworksLoading(true)
        const list = await getClassArtworks(data.classId).catch(() => [])
        if (cancelled) return
        setArtworks(list)
        setArtworksLoading(false)

        const url = `${window.location.origin}/?join=${encodeURIComponent(data.joinCode)}`
        const qr = await QRCode.toDataURL(url, { width: 240, margin: 1 }).catch(() => '')
        if (!cancelled) setJoinQrDataUrl(qr)
      })
      .catch(err => {
        if (!cancelled) setError(DASHBOARD_ERROR_MESSAGES[err.message] || DASHBOARD_ERROR_MESSAGES[DashboardError.UNKNOWN])
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [manageCode])

  const handleResetPin = async () => {
    if (!resetTarget || resetBusy) return
    setResetBusy(true)
    try {
      await resetStudentPin(dashboard.classId, manageCode, resetTarget)
      setDashboard(prev => ({
        ...prev,
        students: prev.students.map(s => s.nickname === resetTarget ? { ...s, hasPassword: false, failCount: 0 } : s),
      }))
      showToast(`'${resetTarget}'의 비밀번호를 초기화했어요.`)
    } catch {
      showToast('초기화에 실패했어요. 다시 시도해주세요.')
    } finally {
      setResetBusy(false)
      setResetTarget(null)
    }
  }

  const handleDeleteArtwork = async () => {
    if (!deleteTarget || deleteBusy) return
    setDeleteBusy(true)
    try {
      await deleteClassArtwork(dashboard.classId, manageCode, deleteTarget.id)
      setArtworks(prev => prev.filter(a => a.id !== deleteTarget.id))
      showToast('작품을 삭제했어요.')
    } catch {
      showToast('삭제에 실패했어요. 다시 시도해주세요.')
    } finally {
      setDeleteBusy(false)
      setDeleteTarget(null)
    }
  }

  const handleDownloadAll = async () => {
    if (zipping || artworks.length === 0) return
    setZipping(true)
    try {
      const zip = new JSZip()
      const nameCount = {}
      for (const artwork of artworks) {
        const blob = await pixelsToBlob(artwork.pixels, artwork.cols, artwork.rows)
        if (!blob) continue
        const base = artwork.studentId || artwork.userName || 'artwork'
        nameCount[base] = (nameCount[base] || 0) + 1
        const suffix = nameCount[base] > 1 ? `_${nameCount[base]}` : ''
        zip.file(`${base}${suffix}.png`, blob)
      }
      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(zipBlob)
      a.download = `${dashboard.className || '우리반'}_작품모음.zip`
      a.click()
      URL.revokeObjectURL(a.href)
    } catch {
      showToast('전체 다운로드에 실패했어요. 다시 시도해주세요.')
    } finally {
      setZipping(false)
    }
  }

  const handleDownloadOne = async (artwork) => {
    const blob = await pixelsToBlob(artwork.pixels, artwork.cols, artwork.rows)
    if (!blob) return
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${artwork.studentId || artwork.userName || 'artwork'}.png`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center" style={{ background: PAGE_BG }}>
        <p className="font-pixel text-lg text-gray-400">불러오는 중...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center gap-5 px-4" style={{ background: PAGE_BG }}>
        <p className="font-pixel text-lg text-center" style={{ color: ACCENT_YELLOW }}>{error}</p>
        <button
          onClick={onGoHome}
          className="font-pixel rounded-full px-6 py-3 text-sm text-black"
          style={{ background: ACCENT_YELLOW }}
        >
          처음으로
        </button>
      </div>
    )
  }

  return (
    <div className="relative h-screen w-screen overflow-y-auto" style={{ background: PAGE_BG }}>

      {/* 인쇄 전용: 로그인 안내 카드, 바둑판 배열 — 화면에는 숨김 */}
      <div className="app-print-area hidden print:grid print:grid-cols-3 print:gap-6 print:p-8">
        {dashboard.students.map(s => (
          <div key={s.nickname} className="flex flex-col items-center gap-2 border border-gray-400 rounded-xl p-4 break-inside-avoid">
            <p className="text-lg font-bold">픽셀아트 로그인</p>
            <p className="text-sm">별명: {s.nickname}</p>
            <p className="text-sm text-gray-600">학급코드: {dashboard.joinCode}</p>
            {joinQrDataUrl && <img src={joinQrDataUrl} alt="QR" className="w-32 h-32 mt-1" />}
          </div>
        ))}
      </div>

      <div className="print:hidden">
        <main className="relative flex min-h-screen w-full flex-col items-center px-4 py-10 sm:px-8">
          <div className="flex w-full max-w-4xl flex-col gap-6">

            <button
              onClick={onGoHome}
              className="font-pixel self-start flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              ← 처음으로
            </button>

            {/* 헤더 */}
            <div className="rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4" style={{ background: PANEL_BG }}>
              <div>
                <h1 className="font-pixel text-xl text-white">{dashboard.className || '우리 반'}</h1>
                <p className="text-sm text-gray-400 mt-1">
                  참여 코드 <span className="font-pixel" style={{ color: ACCENT_YELLOW }}>{dashboard.joinCode}</span>
                  {' · '}학생 {dashboard.students.length}명{' · '}작품 {artworks.length}개
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadAll}
                  disabled={zipping || artworks.length === 0}
                  className="font-pixel rounded-xl px-4 py-2.5 text-sm transition-colors hover:brightness-125 disabled:opacity-40"
                  style={{ background: PAGE_BG, color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.15)' }}
                >
                  {zipping ? '압축 중...' : '전체 다운로드'}
                </button>
                <button
                  onClick={() => window.print()}
                  className="font-pixel rounded-xl px-4 py-2.5 text-sm text-black transition-all hover:brightness-105"
                  style={{ background: ACCENT_YELLOW }}
                >
                  로그인 카드 인쇄
                </button>
              </div>
            </div>

            {/* 학생 목록 */}
            <div className="rounded-2xl p-6 flex flex-col gap-4" style={{ background: PANEL_BG }}>
              <p className="text-sm font-bold text-gray-400">학생 목록</p>
              {dashboard.students.length === 0 ? (
                <p className="text-sm text-gray-500">아직 등록된 학생이 없어요.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {dashboard.students.map(s => (
                    <div
                      key={s.nickname}
                      className="flex items-center justify-between gap-3 rounded-xl px-4 py-3"
                      style={{ background: PAGE_BG }}
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-pixel text-white">{s.nickname}</span>
                        <span
                          className="text-xs px-2 py-1 rounded-full"
                          style={{
                            background: s.hasPassword ? 'rgba(134,239,172,0.12)' : 'rgba(252,165,165,0.12)',
                            color: s.hasPassword ? '#86efac' : '#fca5a5',
                          }}
                        >
                          {s.hasPassword ? '비밀번호 설정됨' : '아직 미설정'}
                        </span>
                        {s.failCount > 0 && (
                          <span className="text-xs text-gray-500">틀린 횟수 {s.failCount}</span>
                        )}
                      </div>
                      <button
                        onClick={() => setResetTarget(s.nickname)}
                        className="font-pixel text-xs px-3 py-1.5 rounded-lg transition-colors hover:brightness-125"
                        style={{ background: PANEL_BG, color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.15)' }}
                        title="비밀번호 초기화"
                      >
                        🔑 초기화
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 작품 갤러리 */}
            <div className="rounded-2xl p-6 flex flex-col gap-4" style={{ background: PANEL_BG }}>
              <p className="text-sm font-bold text-gray-400">작품 모음</p>
              {artworksLoading ? (
                <p className="text-sm text-gray-500">불러오는 중...</p>
              ) : artworks.length === 0 ? (
                <p className="text-sm text-gray-500">아직 저장된 작품이 없어요.</p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {artworks.map(artwork => (
                    <div
                      key={artwork.id}
                      className="rounded-xl overflow-hidden border group relative bg-white"
                      style={{ borderColor: 'rgba(255,255,255,0.1)' }}
                    >
                      <div className="aspect-square p-2 relative">
                        <PixelThumb pixels={artwork.pixels} cols={artwork.cols} rows={artwork.rows} />
                        <div className="absolute inset-0 bg-gray-900/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleDownloadOne(artwork)}
                            className="w-8 h-8 bg-white rounded-xl flex items-center justify-center text-gray-700 hover:bg-gray-100 text-sm"
                            title="다운로드"
                          >↓</button>
                          <button
                            onClick={() => setDeleteTarget(artwork)}
                            className="w-8 h-8 bg-white rounded-xl flex items-center justify-center text-red-500 hover:bg-red-50 text-sm"
                            title="삭제"
                          >✕</button>
                        </div>
                      </div>
                      <div className="px-2 py-1.5 bg-gray-50">
                        <p className="text-[10px] text-gray-600 font-bold truncate">{artwork.studentId || artwork.userName}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </main>
      </div>

      {/* PIN 초기화 확인 모달 */}
      {resetTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
        >
          <div className="rounded-2xl px-8 pt-6 pb-8 flex flex-col items-center gap-6 mx-4" style={{ maxWidth: 380, width: '100%', background: PANEL_BG }}>
            <div className="text-center flex flex-col gap-2">
              <p className="font-pixel text-base text-white">'{resetTarget}'의 비밀번호를 초기화할까요?</p>
              <p className="text-sm text-gray-400 leading-relaxed">
                초기화하면 이 학생은 다음 참여 시<br />새 비밀번호를 처음부터 다시 설정하게 돼요.
              </p>
            </div>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => setResetTarget(null)}
                className="flex-1 py-3 rounded-full text-sm font-semibold transition-colors active:scale-[0.97]"
                style={{ background: 'rgba(255,255,255,0.08)', color: '#e2e8f0' }}
              >
                취소
              </button>
              <button
                onClick={handleResetPin}
                disabled={resetBusy}
                className="flex-1 py-3 rounded-full text-sm font-semibold transition-colors active:scale-[0.97] disabled:opacity-50"
                style={{ background: ACCENT_YELLOW, color: '#000000' }}
              >
                {resetBusy ? '처리 중...' : '초기화'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 작품 삭제 확인 모달 */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
        >
          <div className="rounded-2xl px-8 pt-6 pb-8 flex flex-col items-center gap-6 mx-4" style={{ maxWidth: 380, width: '100%', background: PANEL_BG }}>
            <div className="text-center flex flex-col gap-2">
              <p className="font-pixel text-base text-white">이 작품을 삭제할까요?</p>
              <p className="text-sm text-gray-400 leading-relaxed">
                '{deleteTarget.studentId || deleteTarget.userName}'의 작품이 서버에서<br />완전히 삭제되고 되돌릴 수 없어요.
              </p>
            </div>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-3 rounded-full text-sm font-semibold transition-colors active:scale-[0.97]"
                style={{ background: 'rgba(255,255,255,0.08)', color: '#e2e8f0' }}
              >
                취소
              </button>
              <button
                onClick={handleDeleteArtwork}
                disabled={deleteBusy}
                className="flex-1 py-3 rounded-full text-sm font-semibold transition-colors active:scale-[0.97] disabled:opacity-50"
                style={{ background: DANGER, color: '#000000' }}
              >
                {deleteBusy ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          className="font-pixel fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-xs z-50 whitespace-nowrap"
          style={{ background: PANEL_BG, color: ACCENT_YELLOW }}
        >
          {toast}
        </div>
      )}
    </div>
  )
}
