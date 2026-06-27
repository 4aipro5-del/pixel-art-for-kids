import { useState } from 'react'

const DECO_PIXELS = [
  '#F87171','#FB923C','#FCD34D','#4ADE80','#38BDF8','#6366F1','#C084FC',
  '#C084FC','#F87171','#FB923C','#FCD34D','#4ADE80','#38BDF8','#6366F1',
  '#6366F1','#C084FC','#F87171','#FB923C','#FCD34D','#4ADE80','#38BDF8',
]

export default function EntryPage({ onNext, onGoToGallery }) {
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e) => {
    e?.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) { setError('이름을 입력해주세요!'); return }
    onNext(trimmed)
  }

  return (
    <div className="h-screen w-screen bg-gray-50 overflow-y-auto">

      {/* ── Main content ────────────────────────── */}
      <div className="min-h-screen w-full flex flex-col items-center justify-center py-12 px-4">
        <div className="w-full max-w-5xl mx-auto flex flex-col items-center gap-14">

          {/* ── 타이틀 섹션 ─────────────────────────── */}
          <div className="flex flex-col items-center gap-6">

            {/* 메인 타이틀 — 레트로 픽셀 다크 차콜 */}
            <h1
              className="font-pixel text-center leading-none select-none"
              style={{
                fontSize: 'clamp(5rem, 13vw, 10rem)',
                letterSpacing: '0.06em',
                color: '#1A1A1A',
                textShadow: '3px 3px 0 #D1D5DB, 6px 6px 0 #9CA3AF',
              }}
            >
              PIXEL ART
            </h1>

            {/* 서브타이틀 */}
            <p
              className="font-pixel text-center"
              style={{
                fontSize: 'clamp(1.4rem, 3vw, 2.2rem)',
                color: '#6B7280',
              }}
            >
              나만의 픽셀 아트를 그려봐요.
            </p>
          </div>

          {/* ── 액션 영역 — 단일 max-w-4xl 공유 컨테이너 ── */}
          <div className="w-full max-w-4xl mx-auto flex flex-col gap-4">

            {/* 새 그림 그리기 — 수직 패딩만, 좌우 패딩 없음 → input·버튼이 갤러리 바와 동일 너비 */}
            <div className="flex flex-col gap-5 py-8">

              {/* 헤더 */}
              <div className="flex items-center gap-3">
                <span style={{ fontSize: '2.4rem' }}>✏️</span>
                <h2 className="text-3xl font-black text-gray-800 tracking-tight">
                  새 그림 그리기
                </h2>
              </div>

              <p className="text-lg text-gray-500 font-medium -mt-2">
                이름을 입력하고 나만의 픽셀아트를 시작해요!
              </p>

              {/* 이름 입력 */}
              <input
                type="text"
                value={name}
                onChange={e => { setName(e.target.value); setError('') }}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder="내 이름은..."
                maxLength={10}
                autoFocus
                className="w-full px-6 text-2xl text-center bg-white border-2 border-gray-200 rounded-2xl outline-none transition-all placeholder:text-gray-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15"
                style={{ paddingTop: '1.25rem', paddingBottom: '1.25rem' }}
              />

              {error && (
                <p className="text-center text-sm text-red-400 font-bold -mt-3">{error}</p>
              )}

              {/* 시작 버튼 */}
              <button
                onClick={handleSubmit}
                className="w-full rounded-2xl text-2xl font-bold text-white bg-emerald-500 hover:bg-emerald-600 transition-all hover:scale-[1.02] active:scale-[0.97]"
                style={{
                  paddingTop: '1.25rem',
                  paddingBottom: '1.25rem',
                  boxShadow: '0 4px 20px rgba(16,185,129,0.30)',
                }}
              >
                시작하기 →
              </button>
            </div>

            {/* 담벼락 구경하기 — w-full로 부모 max-w-4xl 꽉 채움 */}
            <button
              onClick={onGoToGallery}
              className="w-full flex items-center gap-5 rounded-3xl px-10 py-6 bg-sky-500 hover:bg-sky-600 transition-all duration-200 hover:scale-[1.01] active:scale-[0.98]"
              style={{
                boxShadow: '0 4px 20px rgba(14,165,233,0.26)',
              }}
            >
              {/* 데코 픽셀 */}
              <div className="grid gap-1.5 flex-shrink-0" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                {DECO_PIXELS.slice(0, 8).map((c, i) => (
                  <div
                    key={i}
                    className="w-5 h-5 rounded-md"
                    style={{ background: 'rgba(255,255,255,0.50)' }}
                  />
                ))}
              </div>

              <div className="flex-1 text-left">
                <p className="text-xl font-black text-white tracking-tight">🎨 친구들 작품 보기</p>
                <p className="text-sm text-white/80 font-medium mt-0.5">
                  다른 친구들이 그린 픽셀아트를 구경해요!
                </p>
              </div>

              <span className="text-white font-black text-xl flex-shrink-0">→</span>
            </button>

          </div>
        </div>
      </div>
    </div>
  )
}
