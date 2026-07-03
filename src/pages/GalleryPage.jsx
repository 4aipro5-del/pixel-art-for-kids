import { useState, useEffect } from 'react'
import { getRecentArtworks } from '../firebase'
import ArtworkThumb from '../components/ArtworkThumb'

const ACCENT_YELLOW = '#f7d070'
const PAGE_BG = '#1a1c1e'
const PANEL_BG = '#111214'

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

// 로딩 상태를 나타내는 세 가지 값: 'loading' | 'done' | 'error'
export default function GalleryPage({ onBack }) {
  const [status, setStatus] = useState('loading')  // 'loading' | 'done' | 'error'
  const [artworks, setArtworks] = useState([])
  const [errorMsg, setErrorMsg] = useState('')
  const [selected, setSelected] = useState(null)

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
                <button
                  key={artwork.id}
                  onClick={() => setSelected(artwork)}
                  className="text-left rounded-2xl overflow-hidden transition-all duration-200 hover:scale-[1.03]"
                  style={{ background: PANEL_BG }}
                >
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
                </button>
              ))}
            </div>
          </div>
        )}

      </div>

      {selected && (
        <ArtworkModal artwork={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}
