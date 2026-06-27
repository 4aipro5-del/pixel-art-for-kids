import { useState, useEffect } from 'react'
import { getRecentArtworks } from '../firebase'
import ArtworkThumb from '../components/ArtworkThumb'

const ACCENT = '#10B981'
const RAINBOW = ['#F87171', '#FB923C', '#FCD34D', '#4ADE80', '#38BDF8', '#6366F1', '#C084FC']

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

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
      <div className="aspect-square bg-gray-100 animate-pulse" />
      <div className="px-3.5 py-3 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-gray-200 animate-pulse flex-shrink-0" />
          <div className="h-3 w-16 rounded-full bg-gray-200 animate-pulse" />
        </div>
        <div className="h-2.5 w-12 rounded-full bg-gray-100 animate-pulse ml-8" />
      </div>
    </div>
  )
}

// 로딩 상태를 나타내는 세 가지 값: 'loading' | 'done' | 'error'
export default function GalleryPage({ onBack }) {
  const [status, setStatus] = useState('loading')  // 'loading' | 'done' | 'error'
  const [artworks, setArtworks] = useState([])
  const [errorMsg, setErrorMsg] = useState('')

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
        if (!cancelled) {
          setArtworks(data)
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
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-gray-50">

      {/* ── Header ─────────────────────────────────── */}
      <header className="flex items-center gap-4 px-6 h-14 bg-white border-b border-gray-100 flex-shrink-0 z-10">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-bold transition-colors flex-shrink-0"
        >
          ← 처음으로
        </button>

        <div className="flex items-center gap-2.5">
          <div className="flex gap-1">
            {RAINBOW.slice(0, 5).map((c, i) => (
              <div key={i} className="w-2.5 h-2.5 rounded-sm" style={{ background: c }} />
            ))}
          </div>
          <span className="text-sm font-black text-gray-900 tracking-tight">
            친구들의 픽셀아트 담벼락
          </span>
        </div>

        <div className="ml-auto">
          {hasData && (
            <span
              className="text-xs font-bold px-2.5 py-1 rounded-full"
              style={{ background: `${ACCENT}15`, color: ACCENT }}
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
              className="grid gap-4"
              style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}
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
            <div className="w-20 h-20 rounded-3xl bg-red-50 flex items-center justify-center text-4xl">
              😢
            </div>
            <div className="text-center">
              <p className="text-base font-black text-red-400 mb-1">앗, 문제가 생겼어요!</p>
              <p className="text-sm text-gray-400">{errorMsg}</p>
            </div>
            <button
              onClick={onBack}
              className="mt-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white"
              style={{ background: ACCENT }}
            >
              처음으로 돌아가기
            </button>
          </div>
        )}

        {/* 빈 상태 — 데이터 0개 */}
        {isEmpty && (
          <div className="flex flex-col items-center justify-center h-full gap-5 p-6">
            <div
              className="w-24 h-24 rounded-3xl flex items-center justify-center"
              style={{ background: `${ACCENT}12`, fontSize: '3rem' }}
            >
              🖼️
            </div>
            <div className="text-center">
              <p className="text-lg font-black text-gray-600 mb-2">
                아직 등록된 친구들의 작품이 없어요!
              </p>
              <p className="text-sm text-gray-400">
                첫 번째 주인공이 되어보세요 🎨
              </p>
            </div>
            <button
              onClick={onBack}
              className="mt-1 px-6 py-3 rounded-2xl text-sm font-bold text-white transition-all hover:scale-[1.02]"
              style={{ background: 'linear-gradient(135deg, #10B981 0%, #34D399 100%)' }}
            >
              ✏️ 그림 그리러 가기
            </button>
          </div>
        )}

        {/* 작품 그리드 */}
        {hasData && (
          <div className="p-6">
            <div
              className="grid gap-4"
              style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}
            >
              {artworks.map(artwork => (
                <div
                  key={artwork.id}
                  className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm transition-all duration-200 hover:scale-[1.03] hover:shadow-md"
                >
                  <div className="aspect-square bg-gray-50 overflow-hidden">
                    <ArtworkThumb
                      pixels={artwork.pixels}
                      cols={artwork.cols}
                      rows={artwork.rows}
                      fill
                    />
                  </div>
                  <div className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5 mb-1">
                      <div
                        className="w-5 h-5 rounded-md flex-shrink-0 text-[9px] font-black text-white flex items-center justify-center"
                        style={{ background: avatarColor(artwork.userName) }}
                      >
                        {artwork.userName?.[0]?.toUpperCase() ?? '?'}
                      </div>
                      <p className="font-bold text-gray-700 text-sm truncate">
                        {artwork.userName}
                      </p>
                    </div>
                    <p className="text-[11px] text-gray-400 ml-[26px]">
                      {timeAgo(artwork.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
