import { useState } from 'react'

const NEON_MINT = '#4deeea'
const NEON_PINK = '#ff2d95'
const NEON_LAVENDER = '#b98eff'

const DECO_PIXELS = [
  '#F87171','#FB923C','#FCD34D','#4ADE80','#38BDF8','#6366F1','#C084FC',
  '#C084FC','#F87171','#FB923C','#FCD34D','#4ADE80','#38BDF8','#6366F1',
  '#6366F1','#C084FC','#F87171','#FB923C','#FCD34D','#4ADE80','#38BDF8',
]

const FLOATING_PIXELS = [
  { color: '#F87171', top: '10%', left: '8%', size: 18 },
  { color: '#FCD34D', top: '18%', left: '88%', size: 14 },
  { color: '#38BDF8', top: '74%', left: '7%', size: 20 },
  { color: '#4ADE80', top: '84%', left: '86%', size: 18 },
  { color: '#C084FC', top: '42%', left: '93%', size: 12 },
  { color: '#FB923C', top: '58%', left: '4%', size: 12 },
]

const PREVIEW_PATTERN = [
  '..............',
  '..RRR....BBBB.',
  '.RYYYR..BSSSB.',
  '.RYYYR..BSSSB.',
  '..RRR....BBBB.',
  '....GGGGGG....',
  '...GWWWWWWG...',
  '..GWWKWWKWWG..',
  '..GWWWWWWWWG..',
  '...GWWPPWWG...',
  '....GGGGGG....',
  '.MMMM....CCCC.',
  '.MMMM....CCCC.',
  '..............',
]

const PREVIEW_COLORS = {
  R: '#F87171',
  Y: '#FCD34D',
  B: '#6366F1',
  S: '#38BDF8',
  G: '#4ADE80',
  W: '#FFFFFF',
  K: '#111827',
  P: '#F472B6',
  M: '#C084FC',
  C: '#FB923C',
}

function PixelBoardPreview() {
  return (
    <div
      className="relative w-full max-w-[17.5rem] rounded-sm border-2 bg-white p-3 sm:max-w-sm sm:p-4"
      style={{ borderColor: NEON_MINT, boxShadow: `6px 6px 0 ${NEON_PINK}` }}
      aria-hidden="true"
    >
      <div className="mb-2 flex items-center gap-2 sm:mb-3">
        {DECO_PIXELS.slice(0, 4).map((color, i) => (
          <div key={i} className="h-4 w-4 rounded-sm" style={{ background: color }} />
        ))}
        <div className="ml-auto h-3 w-20 rounded-sm bg-gray-100" />
      </div>
      <div className="grid grid-cols-[repeat(14,minmax(0,1fr))] gap-0.5 rounded-sm bg-gray-100 p-2 sm:gap-1 sm:p-3">
        {PREVIEW_PATTERN.flatMap((row, rowIndex) =>
          row.split('').map((cell, colIndex) => (
            <div
              key={`${rowIndex}-${colIndex}`}
              className="aspect-square rounded-[2px]"
              style={{
                background: PREVIEW_COLORS[cell] || '#E5E7EB',
                boxShadow: cell === '.' ? 'inset 0 0 0 1px rgba(255,255,255,0.55)' : 'none',
              }}
            />
          )),
        )}
      </div>
    </div>
  )
}

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
    <div className="relative h-screen w-screen overflow-y-auto bg-[#1e252b]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {FLOATING_PIXELS.map((pixel, i) => (
          <div
            key={i}
            className="absolute rounded-sm opacity-90"
            style={{
              top: pixel.top,
              left: pixel.left,
              width: pixel.size,
              height: pixel.size,
              background: pixel.color,
            }}
          />
        ))}
      </div>

      <main className="relative min-h-screen w-full px-4 py-6 sm:px-8 sm:py-10">
        <div className="mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-6xl items-center gap-5 sm:gap-8 lg:grid-cols-[1.08fr_0.92fr]">
          <section className="flex flex-col items-center gap-4 text-center sm:gap-5 lg:items-start lg:text-left">
            <div
              className="font-pixel inline-flex items-center gap-2 rounded-sm border px-4 py-2 text-xs"
              style={{ borderColor: NEON_MINT, background: '#262e35', color: NEON_MINT }}
            >
              <span className="grid grid-cols-2 gap-0.5">
                {DECO_PIXELS.slice(0, 4).map((color, i) => (
                  <span key={i} className="h-2 w-2 rounded-[2px]" style={{ background: color }} />
                ))}
              </span>
              오늘의 픽셀 스튜디오
            </div>

            <div className="flex flex-col gap-4">
              <h1
                className="font-pixel leading-[0.9] select-none"
                style={{
                  fontSize: 'clamp(3.4rem, 6vw, 5.5rem)',
                  letterSpacing: '0.06em',
                }}
              >
                <span className="block" style={{ color: NEON_PINK, textShadow: `0 0 18px ${NEON_PINK}66` }}>PIXEL</span>
                <span className="block" style={{ color: NEON_MINT, textShadow: `0 0 18px ${NEON_MINT}66` }}>ART</span>
              </h1>

              <p className="text-xl font-black text-[#e2e8f0] sm:text-2xl">
                나만의 픽셀 아트를 그려봐요.
              </p>
            </div>

            <PixelBoardPreview />
          </section>

          <section
            className="rounded-sm border p-4 sm:p-7"
            style={{ borderColor: '#3a434b', background: '#262e35' }}
          >
            <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:gap-5">
              <div className="flex items-start gap-4">
                <div
                  className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-sm border text-2xl sm:h-14 sm:w-14 sm:text-3xl"
                  style={{ borderColor: NEON_MINT, background: '#1a2025' }}
                >
                  ✏️
                </div>
                <div className="min-w-0">
                  <h2 className="font-pixel text-xl tracking-tight sm:text-2xl" style={{ color: NEON_LAVENDER }}>
                    새 그림 그리기
                  </h2>
                  <p className="mt-1 text-sm font-bold text-[#94a3b8] sm:text-base">
                    이름을 입력하고 바로 시작해요.
                  </p>
                </div>
              </div>

              <input
                type="text"
                value={name}
                onChange={e => { setName(e.target.value); setError('') }}
                placeholder="내 이름은..."
                maxLength={10}
                autoFocus
                className="font-pixel w-full rounded-sm border-2 border-white bg-[#141a1f] px-6 py-3 text-center text-lg text-white outline-none transition-all placeholder:text-gray-500 focus:border-[#4deeea] focus:ring-4 focus:ring-[#4deeea]/20 sm:py-4 sm:text-xl"
              />

              {error && (
                <p className="text-center text-sm font-bold text-red-400">{error}</p>
              )}

              <button
                type="submit"
                className="font-pixel w-full rounded-sm bg-[#4deeea] px-6 py-3 text-xl text-black transition-all hover:brightness-110 active:scale-[0.98] sm:py-4 sm:text-2xl"
                style={{ boxShadow: '4px 4px 0 #000000' }}
              >
                시작하기 →
              </button>
            </form>

            <button
              onClick={onGoToGallery}
              className="mt-3 flex w-full items-center gap-4 rounded-sm border-2 px-5 py-3 text-left transition-all hover:bg-[#2f3944] active:scale-[0.98] sm:mt-4 sm:py-4"
              style={{ borderColor: NEON_PINK, background: '#1e252b' }}
            >
              <div className="grid flex-shrink-0 grid-cols-4 gap-1">
                {DECO_PIXELS.slice(0, 8).map((color, i) => (
                  <div
                    key={i}
                    className="h-4 w-4 rounded-sm"
                    style={{ background: color, opacity: 0.85 }}
                  />
                ))}
              </div>

              <div className="min-w-0 flex-1">
                <p className="font-pixel text-lg tracking-tight" style={{ color: NEON_PINK }}>친구들 작품 보기</p>
                <p className="mt-0.5 text-sm font-bold text-[#94a3b8]">
                  다른 친구들이 그린 픽셀아트를 구경해요!
                </p>
              </div>

              <span className="flex-shrink-0 text-xl font-black text-white">→</span>
            </button>
          </section>
        </div>
      </main>
    </div>
  )
}
