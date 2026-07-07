import { useState } from 'react'

const ACCENT_YELLOW = '#f7d070'
const PAGE_BG = '#1a1c1e'
const PANEL_BG = '#111214'

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
      className="relative mx-auto w-full max-w-[15rem] rounded-2xl bg-white p-3"
      style={{ boxShadow: '0 16px 40px rgba(0,0,0,0.45)' }}
      aria-hidden="true"
    >
      <div className="mb-2 flex items-center gap-1.5">
        <div className="h-2.5 w-2.5 rounded-full bg-gray-200" />
        <div className="h-2.5 w-2.5 rounded-full bg-gray-200" />
        <div className="h-2.5 w-2.5 rounded-full bg-gray-200" />
        <div className="ml-auto h-3 w-16 rounded-full bg-gray-100" />
      </div>
      <div className="grid grid-cols-[repeat(14,minmax(0,1fr))] gap-0.5 rounded-xl bg-gray-100 p-2">
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
    <div className="relative h-screen w-screen overflow-y-auto" style={{ background: PAGE_BG }}>
      <main className="flex min-h-screen w-full items-center justify-center px-4 py-6 sm:px-8">
        <div className="flex w-full max-w-3xl flex-col items-center gap-4 text-center sm:gap-5">

          <div
            className="font-pixel inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs text-black"
            style={{ background: ACCENT_YELLOW }}
          >
            오늘의그림 스튜디오
          </div>

          <h1
            className="font-pixel leading-[0.9] select-none text-white"
            style={{
              fontSize: 'clamp(2.8rem, 7vw, 5rem)',
              letterSpacing: '0.06em',
            }}
          >
            <span className="block">PIXEL</span>
            <span className="block">ART</span>
          </h1>

          <p className="text-xl font-black text-gray-400 sm:text-2xl">
            나만의 픽셀 아트를 그려봐요.
          </p>

          <PixelBoardPreview />

          <form onSubmit={handleSubmit} className="flex w-full flex-col items-center gap-4 sm:gap-5">
            <div className="w-full rounded-2xl px-8 py-4 sm:py-5" style={{ background: PANEL_BG }}>
              <input
                id="entry-name"
                type="text"
                value={name}
                onChange={e => { setName(e.target.value); setError('') }}
                placeholder="이름을 입력해요..."
                maxLength={10}
                autoFocus
                className="w-full bg-transparent text-center text-2xl font-bold text-white outline-none placeholder:text-gray-600 sm:text-3xl"
              />
            </div>

            {error && (
              <p className="text-center text-lg font-bold" style={{ color: ACCENT_YELLOW }}>{error}</p>
            )}

            <button
              type="submit"
              className="font-pixel w-full rounded-full px-8 py-5 text-2xl text-black transition-all hover:brightness-105 active:scale-[0.98] sm:py-6 sm:text-3xl"
              style={{ background: ACCENT_YELLOW, boxShadow: '0 8px 24px rgba(247,208,112,0.25)' }}
            >
              시작하기 →
            </button>
          </form>

          <button
            onClick={onGoToGallery}
            className="font-pixel mt-6 flex items-center justify-center gap-2 rounded-md border border-[#f7d070] px-6 py-3 text-lg font-bold tracking-tight transition-colors hover:brightness-125"
            style={{ background: PANEL_BG, color: ACCENT_YELLOW }}
          >
            <span
              aria-hidden="true"
              className="w-5 h-5"
              style={{
                background: ACCENT_YELLOW,
                WebkitMaskImage: 'url(/images/search.png)',
                maskImage: 'url(/images/search.png)',
                WebkitMaskSize: 'contain',
                maskSize: 'contain',
                WebkitMaskRepeat: 'no-repeat',
                maskRepeat: 'no-repeat',
                WebkitMaskPosition: 'center',
                maskPosition: 'center',
              }}
            />
            픽셀 아트 갤러리 가기
          </button>

        </div>
      </main>
    </div>
  )
}
