import { useState, useEffect } from 'react'
import { getWallPosts } from '../firebase'

const ACCENT = '#10B981'

const RAINBOW = ['#F87171','#FB923C','#FCD34D','#4ADE80','#38BDF8','#6366F1','#C084FC']

function timeAgo(date) {
  if (!date) return ''
  const diff = (Date.now() - date.getTime()) / 1000
  if (diff < 60)    return '방금 전'
  if (diff < 3600)  return `${Math.floor(diff / 60)}분 전`
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`
  return date.toLocaleDateString('ko-KR')
}

export default function WallPage({ onBack }) {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    getWallPosts()
      .then(setPosts)
      .catch(() => setError('담벼락을 불러올 수 없어요.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-gray-50">

      {/* ── Header ─────────────────────────────────────────── */}
      <header className="flex items-center gap-4 px-6 h-14 bg-white border-b border-gray-100 flex-shrink-0 z-10">

        {/* 돌아가기 */}
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-bold transition-colors flex-shrink-0"
        >
          ← 돌아가기
        </button>

        {/* 브랜드 */}
        <div className="flex items-center gap-2.5">
          <div className="flex gap-1">
            {RAINBOW.slice(0, 4).map((c, i) => (
              <div key={i} className="w-2.5 h-2.5 rounded-sm" style={{ background: c }} />
            ))}
          </div>
          <span className="text-sm font-black text-gray-900 tracking-tight">공유 담벼락</span>
        </div>

        {/* 작품 수 */}
        <div className="ml-auto flex items-center gap-2">
          {!loading && !error && (
            <span className="text-xs font-semibold text-gray-400">
              {posts.length > 0 ? `${posts.length}개의 작품` : ''}
            </span>
          )}
        </div>
      </header>

      {/* ── Content ────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <div className="flex gap-2">
              {RAINBOW.map((c, i) => (
                <div
                  key={i}
                  className="w-4 h-4 rounded-md"
                  style={{
                    background: c,
                    animation: `pixel-float 1s ease-in-out ${i * 0.12}s infinite`,
                  }}
                />
              ))}
            </div>
            <p className="text-sm text-gray-400 font-semibold">그림을 불러오는 중...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center text-3xl">😢</div>
            <p className="text-sm font-bold text-red-400">{error}</p>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && posts.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl"
              style={{ background: `${ACCENT}15` }}>
              🖼️
            </div>
            <div className="text-center">
              <p className="text-lg font-black text-gray-600">아직 올라온 그림이 없어요</p>
              <p className="text-sm text-gray-400 mt-1">첫 번째로 그림을 올려보세요!</p>
            </div>
          </div>
        )}

        {/* Grid */}
        {!loading && posts.length > 0 && (
          <div className="p-6">
            <div className="grid gap-5"
              style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}
            >
              {posts.map(post => (
                <div
                  key={post.id}
                  className="group bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-md"
                >
                  {/* 이미지 */}
                  <div className="aspect-square bg-gray-50 flex items-center justify-center overflow-hidden">
                    <img
                      src={post.imageUrl}
                      alt={`${post.userName}의 픽셀아트`}
                      className="w-full h-full object-contain"
                      style={{ imageRendering: 'pixelated' }}
                    />
                  </div>

                  {/* 메타 */}
                  <div className="px-3.5 py-3">
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className="w-6 h-6 rounded-lg flex-shrink-0 text-[10px] font-black text-white flex items-center justify-center"
                        style={{ background: ACCENT }}
                      >
                        {post.userName?.[0]?.toUpperCase() || '?'}
                      </div>
                      <p className="font-bold text-gray-700 text-sm truncate">{post.userName}</p>
                    </div>
                    <p className="text-xs text-gray-400 ml-8">{timeAgo(post.createdAt)}</p>
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
