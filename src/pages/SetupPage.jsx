import { useState, useEffect } from 'react'

const ACCENT_YELLOW = '#f7d070'
const PAGE_BG = '#1a1c1e'
const PANEL_BG = '#111214'

const RATIOS = [
  { id: 'square', label: '정사각형', sublabel: '가로 세로가 같아요',     hasOrientation: false },
  { id: 'tablet', label: '태블릿',   sublabel: '화면 비율 4:3',          hasOrientation: true, defaultOrientation: 'landscape' },
  { id: 'a4',     label: 'A4 출력',  sublabel: '종이처럼 긴 비율이에요', hasOrientation: true, defaultOrientation: 'portrait' },
]

// 각 비율의 "기준 방향" 해상도 [쉬움, 보통, 어려움]. 반대 방향은 cols/rows를 서로 바꿔 계산한다.
// 정사각형: 방향 없음(고정) · 태블릿: 기준 = 가로 · A4: 기준 = 세로
const BASE_GRIDS = {
  square: [{ cols: 24, rows: 24 }, { cols: 32, rows: 32 }, { cols: 64, rows: 64 }],
  tablet: [{ cols: 28, rows: 21 }, { cols: 36, rows: 27 }, { cols: 48, rows: 36 }],
  a4:     [{ cols: 20, rows: 28 }, { cols: 30, rows: 42 }, { cols: 45, rows: 63 }],
}

const LEVELS = [
  { badge: '쉬움',   desc: '큼직한 픽셀로 편하게',   dotCount: 3, dotSize: 14 },
  { badge: '보통',   desc: '딱 알맞은 크기예요',     dotCount: 4, dotSize: 10 },
  { badge: '어려움', desc: '섬세하게 표현 가능해요', dotCount: 5, dotSize: 7 },
]

function isBaseOrientation(ratioId, orientation) {
  return (ratioId === 'tablet' && orientation === 'landscape')
      || (ratioId === 'a4' && orientation === 'portrait')
      || ratioId === 'square'
}

function getGrid(ratioId, orientation, levelIndex) {
  const base = BASE_GRIDS[ratioId][levelIndex]
  if (isBaseOrientation(ratioId, orientation)) return base
  return { cols: base.rows, rows: base.cols } // 방향 전환 시 X/Y를 서로 바꾼다
}

// 비율 카드 미리보기 박스 크기(정사각형 60x60 기준 박스 안에 맞춘 비율)
function getPreviewBox(ratioId, orientation) {
  const boxes = { square: { w: 60, h: 60 }, tablet: { w: 60, h: 45 }, a4: { w: 43, h: 60 } }
  const box = boxes[ratioId]
  return isBaseOrientation(ratioId, orientation) ? box : { w: box.h, h: box.w }
}

// 해상도 카드 안의 미니 픽셀 그리드 미리보기
function MiniGrid({ count, size, active }) {
  return (
    <div
      className="grid gap-0.5"
      style={{ gridTemplateColumns: `repeat(${count}, ${size}px)` }}
    >
      {Array(count * count).fill(0).map((_, i) => (
        <div
          key={i}
          className="rounded-[2px]"
          style={{
            width: size,
            height: size,
            background: active
              ? (i % 5 === 0 || i % 7 === 0 ? '#000000' : 'rgba(0,0,0,0.35)')
              : (i % 5 === 0 || i % 7 === 0 ? '#4b5560' : '#2a2d30'),
          }}
        />
      ))}
    </div>
  )
}

export default function SetupPage({ onNext }) {
  const [ratio, setRatio] = useState('square')
  const [orientation, setOrientation] = useState('landscape')
  const [levelIndex, setLevelIndex] = useState(0)

  const selectedRatio = RATIOS.find(r => r.id === ratio)
  const grid = getGrid(ratio, orientation, levelIndex)
  const selectedLevel = LEVELS[levelIndex]

  // 비율을 바꾸면 그 비율의 기본 방향으로 리셋
  useEffect(() => {
    if (selectedRatio.hasOrientation) setOrientation(selectedRatio.defaultOrientation)
  }, [ratio]) // eslint-disable-line

  return (
    <div className="relative h-screen w-screen overflow-hidden" style={{ background: PAGE_BG }}>

      {/* Scrollable main area */}
      <div className="relative z-10 h-full overflow-y-auto">
        <div className="min-h-full flex flex-col items-center justify-start sm:justify-center py-6 sm:py-12 px-6">
          <div className="w-full max-w-3xl flex flex-col gap-6 sm:gap-10">

            {/* Title */}
            <div className="text-center">
              <h1 className="font-pixel text-4xl sm:text-5xl leading-tight mb-4 sm:mb-6 text-white">
                <span className="block">어떤 크기에</span>
                <span className="block">그릴까요?</span>
              </h1>
              <p className="text-base sm:text-lg text-gray-400">화면 비율과 픽셀 해상도를 골라요</p>
            </div>

            <div
              className="hidden sm:flex items-center justify-between rounded-2xl px-5 py-4"
              style={{ background: PANEL_BG }}
            >
              <div className="flex items-center gap-4">
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-xl border-2"
                  style={{ borderColor: ACCENT_YELLOW }}
                >
                  <div
                    className="rounded-sm"
                    style={{
                      width: getPreviewBox(ratio, orientation).w * 0.55,
                      height: getPreviewBox(ratio, orientation).h * 0.55,
                      background: ACCENT_YELLOW,
                    }}
                  />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-400">선택한 캔버스</p>
                  <p className="font-pixel text-lg text-white">
                    {selectedRatio.label} · {grid.cols} × {grid.rows}
                  </p>
                </div>
              </div>
              <span
                className="font-pixel rounded-full px-4 py-2 text-sm text-black"
                style={{ background: ACCENT_YELLOW }}
              >
                {selectedLevel.badge}
              </span>
            </div>

            {/* ── 비율 선택 ────────────────────────────────────── */}
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 sm:mb-4">
                화면 비율
              </p>
              <div className="grid grid-cols-3 gap-2 sm:gap-4">
                {RATIOS.map(r => {
                  const active = ratio === r.id
                  const box = getPreviewBox(r.id, active ? orientation : r.defaultOrientation)
                  return (
                    <button
                      key={r.id}
                      onClick={() => setRatio(r.id)}
                      className="flex flex-col items-center gap-2 sm:gap-4 py-4 sm:py-7 px-2 sm:px-4 rounded-2xl transition-all active:scale-[0.98]"
                      style={{ background: active ? ACCENT_YELLOW : PANEL_BG }}
                    >
                      {/* 비율 시각화 */}
                      <div className="flex items-end justify-center h-11 sm:h-16">
                        <div
                          className="rounded-sm transition-all"
                          style={{
                            width: `clamp(${Math.round(box.w * 0.62)}px, 10vw, ${box.w}px)`,
                            height: `clamp(${Math.round(box.h * 0.62)}px, 10vw, ${box.h}px)`,
                            background: active ? '#000000' : '#4b5560',
                          }}
                        />
                      </div>
                      <div className="text-center">
                        <p className="font-pixel text-base sm:text-lg" style={{ color: active ? '#000000' : '#e2e8f0' }}>
                          {r.label}
                        </p>
                        <p
                          className="hidden sm:block text-xs mt-1 leading-snug"
                          style={{ color: active ? 'rgba(0,0,0,0.6)' : '#9ca3af' }}
                        >
                          {r.sublabel}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* ── 화면 방향 선택 (정사각형 제외) ───────────────────── */}
            {selectedRatio.hasOrientation && (
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 sm:mb-4">
                  화면 방향
                </p>
                <div className="grid grid-cols-2 gap-2 sm:gap-4">
                  {[
                    { id: 'landscape', label: '가로 방향' },
                    { id: 'portrait',  label: '세로 방향' },
                  ].map(o => {
                    const active = orientation === o.id
                    return (
                      <button
                        key={o.id}
                        onClick={() => setOrientation(o.id)}
                        className="font-pixel py-3 sm:py-4 rounded-2xl text-sm sm:text-base transition-all active:scale-[0.98]"
                        style={{
                          background: active ? ACCENT_YELLOW : PANEL_BG,
                          color: active ? '#000000' : '#e2e8f0',
                        }}
                      >
                        {o.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── 해상도 선택 ──────────────────────────────────── */}
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 sm:mb-4">
                픽셀 해상도
              </p>
              <div className="grid grid-cols-3 gap-3 sm:gap-4">
                {LEVELS.map((lv, i) => {
                  const g = getGrid(ratio, orientation, i)
                  const active = levelIndex === i
                  return (
                    <button
                      key={lv.badge}
                      onClick={() => setLevelIndex(i)}
                      className="flex flex-col items-center gap-2.5 sm:gap-4 py-4 sm:py-7 px-3 sm:px-4 rounded-2xl transition-all active:scale-[0.98]"
                      style={{ background: active ? ACCENT_YELLOW : PANEL_BG }}
                    >
                      {/* 미니 픽셀 그리드 */}
                      <MiniGrid count={lv.dotCount} size={lv.dotSize} active={active} />

                      {/* 격자 크기 */}
                      <p className="font-pixel text-lg sm:text-xl tabular-nums" style={{ color: active ? '#000000' : '#e2e8f0' }}>
                        {g.cols} × {g.rows}
                      </p>

                      {/* 난이도 뱃지 */}
                      <span
                        className="font-pixel text-[10px] sm:text-xs px-3 py-1 rounded-full"
                        style={{
                          background: active ? 'rgba(0,0,0,0.15)' : 'transparent',
                          color: active ? '#000000' : ACCENT_YELLOW,
                          border: active ? 'none' : `1px solid ${ACCENT_YELLOW}`,
                        }}
                      >
                        {lv.badge}
                      </span>

                      <p
                        className="hidden sm:block text-xs text-center leading-snug"
                        style={{ color: active ? 'rgba(0,0,0,0.6)' : '#9ca3af' }}
                      >
                        {lv.desc}
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* CTA 버튼 */}
            <div
              className="sticky bottom-0 -mx-6 flex justify-center px-6 pt-4 pb-3 sm:static sm:mx-0 sm:bg-none sm:px-0 sm:pt-0 sm:pb-2"
              style={{ background: `linear-gradient(to top, ${PAGE_BG}, ${PAGE_BG}, transparent)` }}
            >
              <button
                onClick={() => onNext(grid)}
                className="font-pixel w-full sm:w-auto py-4 px-20 rounded-full text-lg sm:text-xl text-black transition-all hover:brightness-105 active:scale-[0.97]"
                style={{ background: ACCENT_YELLOW, boxShadow: '0 8px 24px rgba(247,208,112,0.25)' }}
              >
                {grid.cols} × {grid.rows} 그리기 →
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
