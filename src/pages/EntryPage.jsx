import { useState } from 'react'

const NEON_MINT = '#4deeea'
const CARD_BG = '#262e35'
const CARD_BORDER = '#3a434b'

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
      className="relative w-full max-w-[17.5rem] rounded-sm border bg-white p-3 sm:max-w-sm sm:p-4"
      style={{ borderColor: CARD_BORDER, boxShadow: '0 12px 32px rgba(0,0,0,0.35)' }}
      aria-hidden="true"
    >
      <div className="mb-2 flex items-center gap-1.5 sm:mb-3">
        <div className="h-2.5 w-2.5 rounded-full bg-gray-200" />
        <div className="h-2.5 w-2.5 rounded-full bg-gray-200" />
        <div className="h-2.5 w-2.5 rounded-full bg-gray-200" />
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
      <main className="relative min-h-screen w-full px-4 py-6 sm:px-8 sm:py-10">
        <div className="mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-6xl items-center gap-5 sm:gap-8 lg:grid-cols-[1.08fr_0.92fr]">
          <section className="flex flex-col items-center gap-4 text-center sm:gap-5 lg:items-start lg:text-left">
            <div
              className="font-pixel inline-flex items-center gap-2 rounded-sm border px-4 py-2 text-xs"
              style={{ borderColor: CARD_BORDER, background: CARD_BG, color: NEON_MINT }}
            >
              오늘의 픽셀 스튜디오
            </div>

            <div className="flex flex-col gap-4">
              <h1
                className="font-pixel leading-[0.9] select-none text-white"
                style={{
                  fontSize: 'clamp(3.4rem, 6vw, 5.5rem)',
                  letterSpacing: '0.06em',
                }}
              >
                <span className="block">PIXEL</span>
                <span className="block">ART</span>
              </h1>

              <p className="text-xl font-black text-[#94a3b8] sm:text-2xl">
                나만의 픽셀 아트를 그려봐요.
              </p>
            </div>

            <PixelBoardPreview />
          </section>

          <section
            className="rounded-sm border p-4 sm:p-7"
            style={{ borderColor: CARD_BORDER, background: CARD_BG }}
          >
            <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:gap-5">
              <div className="flex items-start gap-4">
                <div
                  className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-sm border text-2xl sm:h-14 sm:w-14 sm:text-3xl"
                  style={{ borderColor: CARD_BORDER, background: '#1a2025' }}
                >
                  ✏️
                </div>
                <div className="min-w-0">
                  <h2 className="font-pixel text-xl tracking-tight text-white sm:text-2xl">
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
              className="mt-3 flex w-full items-center gap-4 rounded-sm border px-5 py-3 text-left transition-colors active:scale-[0.98]"
              style={{ borderColor: CARD_BORDER, background: '#1e252b' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = NEON_MINT }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = CARD_BORDER }}
            >
              <div
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-sm border text-lg"
                style={{ borderColor: CARD_BORDER, background: CARD_BG }}
              >
                🖼️
              </div>

              <div className="min-w-0 flex-1">
                <p className="font-pixel text-sm tracking-tight text-white">친구들 작품 보기</p>
                <p className="mt-0.5 text-xs font-bold text-[#94a3b8]">
                  다른 친구들이 그린 픽셀아트를 구경해요!
                </p>
              </div>

              <span className="flex-shrink-0 text-xl font-black" style={{ color: NEON_MINT }}>→</span>
            </button>
          </section>
        </div>
      </main>
    </div>
  )
}
