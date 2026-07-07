import { useState, useEffect } from 'react'
import { getRecentArtworks, saveArtwork, deleteArtwork } from '../firebase'
import ArtworkThumb from '../components/ArtworkThumb'

const ACCENT_YELLOW = '#f7d070'
const PAGE_BG = '#1a1c1e'
const PANEL_BG = '#111214'
const SKETCHBOOK_KEY = 'pixelart_sketchbook'
const MY_ARTWORKS_KEY = 'pixelart_my_gallery_ids'

// 로그인이 없으므로, 이 브라우저에서 내가 올린 게시글 ID만 로컬스토리지로 기억해
// "본인 작품만 삭제 가능" 소유권 체크에 사용한다.
function getMyArtworkIds() {
  try {
    return JSON.parse(localStorage.getItem(MY_ARTWORKS_KEY) || '[]')
  } catch {
    return []
  }
}
function addMyArtworkId(id) {
  const ids = getMyArtworkIds()
  if (!ids.includes(id)) {
    localStorage.setItem(MY_ARTWORKS_KEY, JSON.stringify([...ids, id]))
  }
}
function removeMyArtworkId(id) {
  const ids = getMyArtworkIds()
  localStorage.setItem(MY_ARTWORKS_KEY, JSON.stringify(ids.filter(i => i !== id)))
}

const AVATAR_COLORS = [
  '#10B981', '#F87171', '#FB923C', '#4ADE80', '#38BDF8', '#C084FC', '#F472B6',
]
function avatarColor(name) {
  return AVATAR_COLORS[(name?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length]
}

function timeAgo(date) {
  if (!date) return ''
  const diff = (Date.now() - date.getTime()) / 1000
  if (diff < 60)    return '방금 전'
  if (diff < 3600)  return `${Math.floor(diff / 60)}분 전`
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`
  return date.toLocaleDateString('ko-KR')
}

// pixels 2D 배열 → 업스케일된 PNG 데이터 URL (다운로드용)
function getArtworkDataURL(artwork, minPx = 512) {
  const { pixels, cols, rows } = artwork
  const scale = Math.max(1, Math.ceil(minPx / Math.min(cols, rows)))
  const canvas = document.createElement('canvas')
  canvas.width = cols * scale
  canvas.height = rows * scale
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingEnabled = false
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (pixels[r]?.[c]) {
        ctx.fillStyle = pixels[r][c]
        ctx.fillRect(c * scale, r * scale, scale, scale)
      }
    }
  }
  return canvas.toDataURL('image/png')
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: PANEL_BG }}>
      <div className="aspect-square animate-pulse" style={{ background: 'rgba(255,255,255,0.06)' }} />
      <div className="px-3.5 py-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md animate-pulse flex-shrink-0" style={{ background: 'rgba(255,255,255,0.1)' }} />
          <div className="h-2.5 w-14 rounded-full animate-pulse" style={{ background: 'rgba(255,255,255,0.1)' }} />
        </div>
        <div className="h-2.5 w-10 rounded-full animate-pulse" style={{ background: 'rgba(255,255,255,0.06)' }} />
      </div>
    </div>
  )
}

// 작품 상세 보기 모달
function ArtworkModal({ artwork, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl p-6"
        style={{ background: PANEL_BG }}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="닫기"
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border text-lg font-bold transition-colors hover:bg-[#f7d070]/10"
          style={{ borderColor: ACCENT_YELLOW, color: ACCENT_YELLOW }}
        >
          ✕
        </button>

        <div
          className="mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-xl"
          style={{ background: 'rgba(255,255,255,0.04)' }}
        >
          <ArtworkThumb pixels={artwork.pixels} cols={artwork.cols} rows={artwork.rows} fill />
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <div
              className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-xs font-black text-white"
              style={{ background: avatarColor(artwork.userName) }}
            >
              {artwork.userName?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-gray-100">{artwork.userName}</p>
              <p className="text-xs text-gray-400">
                {timeAgo(artwork.createdAt)} · {artwork.cols} × {artwork.rows}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              const a = document.createElement('a')
              a.href = getArtworkDataURL(artwork)
              a.download = `픽셀아트_${artwork.userName}.png`
              a.click()
            }}
            className="flex-shrink-0 rounded-full px-4 py-2 text-sm font-bold text-black transition-all hover:brightness-105 active:scale-[0.97]"
            style={{ background: ACCENT_YELLOW }}
          >
            ↓ PNG 다운로드
          </button>
        </div>
      </div>
    </div>
  )
}

// 내 스케치북(로컬 저장소)에서 작품을 골라 갤러리 피드에 등록하는 모달
function PublishPickerModal({ userName, onClose, onPublished }) {
  const [items] = useState(() => {
    const all = JSON.parse(localStorage.getItem(SKETCHBOOK_KEY) || '[]')
    return all.filter(item => item.userName === userName)
  })
  const [publishingId, setPublishingId] = useState(null)

  const handlePublish = async (item) => {
    if (publishingId) return
    setPublishingId(item.id)
    try {
      const id = await saveArtwork(userName, item.pixels, item.cols, item.rows)
      addMyArtworkId(id)
      onPublished()
      onClose()
    } catch (err) {
      console.error(err)
      alert('갤러리에 올리지 못했어요. 다시 시도해주세요.')
      setPublishingId(null)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col"
        style={{ background: PAGE_BG, border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <h2 className="font-pixel text-lg" style={{ color: ACCENT_YELLOW }}>내 작품 선택</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:text-white transition-colors"
            style={{ background: PANEL_BG }}
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-gray-500">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ background: PANEL_BG }}>📭</div>
              <div className="text-center">
                <p className="text-sm font-bold text-gray-400">아직 저장된 그림이 없어요</p>
                <p className="text-xs text-gray-600 mt-1">그림을 그리면 자동으로 저장돼요. 그다음 여기서 갤러리에 올려보세요!</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {items.map(item => {
                const isPublishing = publishingId === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => handlePublish(item)}
                    disabled={!!publishingId}
                    className="relative text-left rounded-xl overflow-hidden border transition-all hover:border-[#f7d070] disabled:opacity-50"
                    style={{ background: PANEL_BG, borderColor: 'rgba(255,255,255,0.08)' }}
                  >
                    <div className="aspect-square flex items-center justify-center p-2" style={{ background: '#ffffff' }}>
                      <img src={item.dataUrl} alt="" className="max-w-full max-h-full" style={{ imageRendering: 'pixelated' }} />
                    </div>
                    <div className="px-2.5 py-2">
                      <p className="text-[10px] text-gray-300 font-bold truncate">
                        {item.fileName || `${item.cols}×${item.rows}칸`}
                      </p>
                    </div>
                    {isPublishing && (
                      <div className="absolute inset-0 bg-black/70 flex items-center justify-center text-xs font-bold text-white">
                        올리는 중…
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// 작품 삭제 확인 모달
function DeleteConfirmModal({ artwork, onCancel, onConfirm, isDeleting }) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
      onClick={e => e.target === e.currentTarget && onCancel()}
    >
      <div
        className="rounded-2xl px-8 py-8 flex flex-col items-center gap-6 mx-4"
        style={{ maxWidth: 360, width: '100%', background: PANEL_BG, border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="text-center flex flex-col gap-2">
          <p className="font-pixel text-base text-white">작품을 삭제할까요?</p>
          <p className="text-sm text-gray-400 leading-relaxed">
            갤러리에서 완전히 사라져요.<br />
            이 작업은 되돌릴 수 없어요.
          </p>
        </div>

        <div className="flex gap-3 w-full">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="font-pixel flex-1 py-3 rounded-full text-sm transition-colors active:scale-[0.97] disabled:opacity-50"
            style={{ background: 'rgba(255,255,255,0.08)', color: '#e2e8f0' }}
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="font-pixel flex-1 py-3 rounded-full text-sm transition-colors active:scale-[0.97] disabled:opacity-50"
            style={{ background: '#f87171', color: '#000000' }}
          >
            {isDeleting ? '삭제 중…' : '삭제하기'}
          </button>
        </div>
      </div>
    </div>
  )
}

// 로딩 상태를 나타내는 세 가지 값: 'loading' | 'done' | 'error'
export default function GalleryPage({ userName, onBack }) {
  const [status, setStatus] = useState('loading')  // 'loading' | 'done' | 'error'
  const [artworks, setArtworks] = useState([])
  const [errorMsg, setErrorMsg] = useState('')
  const [selected, setSelected] = useState(null)
  const [showPicker, setShowPicker] = useState(false)
  const [toast, setToast] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const myArtworkIds = getMyArtworkIds()

  // 등록 성공 후 피드를 조용히 새로고침 (실패해도 방금 등록한 작품은 이미 저장된 상태라 무시)
  const refreshArtworks = () => {
    getRecentArtworks(100)
      .then(data => {
        const sorted = [...data].sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0))
        setArtworks(sorted)
        setStatus('done')
      })
      .catch(console.warn)
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await deleteArtwork(deleteTarget.id)
      removeMyArtworkId(deleteTarget.id)
      setArtworks(prev => prev.filter(a => a.id !== deleteTarget.id))
      if (selected?.id === deleteTarget.id) setSelected(null)
      setToast('작품을 삭제했어요!')
      setTimeout(() => setToast(null), 2500)
      setDeleteTarget(null)
    } catch (err) {
      console.error(err)
      alert('삭제하지 못했어요. 다시 시도해주세요.')
    } finally {
      setIsDeleting(false)
    }
  }

  useEffect(() => {
    let cancelled = false

    // 8초 타임아웃 — Firebase가 hang되어도 스켈레톤이 무한 노출되지 않도록
    const timeoutId = setTimeout(() => {
      if (!cancelled) {
        setErrorMsg('데이터를 불러오는 시간이 초과됐어요. 네트워크를 확인해주세요.')
        setStatus('error')
      }
    }, 8000)

    ;(async () => {
      try {
        const data = await getRecentArtworks(100)
        // 최신 작품이 맨 앞에 오도록 createdAt 기준 내림차순 정렬
        const sorted = [...data].sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0))
        if (!cancelled) {
          setArtworks(sorted)
          setStatus('done')
        }
      } catch (err) {
        if (!cancelled) {
          setErrorMsg('작품을 불러올 수 없어요. 잠시 후 다시 시도해주세요.')
          setStatus('error')
        }
      } finally {
        clearTimeout(timeoutId)
      }
    })()

    return () => {
      cancelled = true
      clearTimeout(timeoutId)
    }
  }, [])

  const isLoading = status === 'loading'
  const isError   = status === 'error'
  const isEmpty   = status === 'done' && artworks.length === 0
  const hasData   = status === 'done' && artworks.length > 0

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden" style={{ background: PAGE_BG }}>

      {/* ── Header ─────────────────────────────────── */}
      <header
        className="flex items-center gap-4 px-6 h-16 flex-shrink-0 z-10"
        style={{ background: PAGE_BG, borderBottom: '1px solid rgba(255,255,255,0.08)' }}
      >
        <button
          onClick={onBack}
          title="처음으로"
          className="flex h-10 w-10 items-center justify-center rounded-full border text-lg transition-colors flex-shrink-0 hover:bg-[#f7d070]/10"
          style={{ borderColor: ACCENT_YELLOW, color: ACCENT_YELLOW }}
        >
          ←
        </button>

        <span className="font-pixel text-xl tracking-tight" style={{ color: ACCENT_YELLOW }}>
          PIXEL ART
        </span>

        <div className="ml-auto">
          {hasData && (
            <span
              className="text-xs font-bold px-3 py-1.5 rounded-full border"
              style={{ borderColor: ACCENT_YELLOW, color: ACCENT_YELLOW }}
            >
              {artworks.length}개의 작품
            </span>
          )}
        </div>
      </header>

      {/* ── Content ────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">

        {/* 로딩 중 — 스켈레톤 (isLoading이 true일 때만) */}
        {isLoading && (
          <div className="p-6">
            <div
              className="grid gap-5"
              style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}
            >
              {Array.from({ length: 12 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          </div>
        )}

        {/* 에러 */}
        {isError && (
          <div className="flex flex-col items-center justify-center h-full gap-5 p-6">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl"
              style={{ background: 'rgba(248,113,113,0.12)' }}
            >
              😢
            </div>
            <div className="text-center">
              <p className="text-base font-black text-red-400 mb-1">앗, 문제가 생겼어요!</p>
              <p className="text-sm text-gray-400">{errorMsg}</p>
            </div>
            <button
              onClick={onBack}
              className="mt-2 px-5 py-2.5 rounded-full text-sm font-bold text-black"
              style={{ background: ACCENT_YELLOW }}
            >
              처음으로 돌아가기
            </button>
          </div>
        )}

        {/* 빈 상태 — 데이터 0개 */}
        {isEmpty && (
          <div className="flex flex-col items-center justify-center h-full gap-5 p-6">
            <div
              className="w-24 h-24 rounded-2xl border-2 flex items-center justify-center"
              style={{ borderColor: ACCENT_YELLOW, background: PANEL_BG, fontSize: '3rem' }}
            >
              🖼️
            </div>
            <div className="text-center">
              <p className="text-lg font-black text-gray-100 mb-2">
                아직 등록된 친구들의 작품이 없어요!
              </p>
              <p className="text-sm text-gray-400">
                첫 번째 주인공이 되어보세요 🎨
              </p>
            </div>
            <button
              onClick={onBack}
              className="mt-1 px-6 py-3 rounded-full text-sm font-bold text-black transition-all hover:brightness-105 hover:scale-[1.02]"
              style={{ background: ACCENT_YELLOW }}
            >
              ✏️ 그림 그리러 가기
            </button>
          </div>
        )}

        {/* 작품 그리드 */}
        {hasData && (
          <div className="p-6">
            <div
              className="grid gap-5"
              style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}
            >
              {artworks.map(artwork => (
                <div
                  key={artwork.id}
                  onClick={() => setSelected(artwork)}
                  className="relative text-left rounded-2xl overflow-hidden transition-all duration-200 hover:scale-[1.03] cursor-pointer"
                  style={{ background: PANEL_BG }}
                >
                  {myArtworkIds.includes(artwork.id) && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget(artwork) }}
                      aria-label="삭제"
                      className="absolute top-2 right-2 z-10 flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:brightness-110"
                      style={{ background: 'rgba(0,0,0,0.6)' }}
                    >
                      <span
                        aria-hidden="true"
                        className="w-4 h-4"
                        style={{
                          background: '#f87171',
                          WebkitMaskImage: 'url(/images/trash.png)',
                          maskImage: 'url(/images/trash.png)',
                          WebkitMaskSize: 'contain',
                          maskSize: 'contain',
                          WebkitMaskRepeat: 'no-repeat',
                          maskRepeat: 'no-repeat',
                          WebkitMaskPosition: 'center',
                          maskPosition: 'center',
                        }}
                      />
                    </button>
                  )}
                  <div className="aspect-square overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <ArtworkThumb
                      pixels={artwork.pixels}
                      cols={artwork.cols}
                      rows={artwork.rows}
                      fill
                    />
                  </div>
                  <div className="px-3 py-2.5 flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <div
                        className="w-5 h-5 rounded-md flex-shrink-0 text-[9px] font-black text-white flex items-center justify-center"
                        style={{ background: avatarColor(artwork.userName) }}
                      >
                        {artwork.userName?.[0]?.toUpperCase() ?? '?'}
                      </div>
                      <p className="font-bold text-gray-100 text-xs truncate">
                        {artwork.userName}
                      </p>
                    </div>
                    <p className="text-xs text-gray-400 flex-shrink-0">
                      {timeAgo(artwork.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* 작품 등록 버튼 */}
      {userName && (
        <button
          onClick={() => setShowPicker(true)}
          title="작품 등록"
          className="fixed bottom-8 right-8 z-40 flex items-center justify-center w-16 h-16 rounded-full transition-all hover:brightness-105 active:scale-95"
          style={{ background: ACCENT_YELLOW, boxShadow: '0 8px 24px rgba(247,208,112,0.35)' }}
        >
          <img src="/images/add.png" alt="작품 등록" className="w-7 h-7" />
        </button>
      )}

      {selected && (
        <ArtworkModal artwork={selected} onClose={() => setSelected(null)} />
      )}

      {showPicker && (
        <PublishPickerModal
          userName={userName}
          onClose={() => setShowPicker(false)}
          onPublished={() => {
            refreshArtworks()
            setToast('갤러리에 올렸어요!')
            setTimeout(() => setToast(null), 2500)
          }}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          artwork={deleteTarget}
          isDeleting={isDeleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleConfirmDelete}
        />
      )}

      {toast && (
        <div
          className="font-pixel fixed bottom-8 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-xs z-50 whitespace-nowrap"
          style={{ background: PANEL_BG, color: ACCENT_YELLOW, border: `1px solid ${ACCENT_YELLOW}` }}
        >
          {toast}
        </div>
      )}
    </div>
  )
}
