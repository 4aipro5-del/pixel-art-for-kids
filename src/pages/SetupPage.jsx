import { useState } from 'react'

const ACCENT = '#10B981'

const RATIOS = [
  {
    id: '1:1',
    label: '정사각형',
    sublabel: '가로 세로가 같아요',
    pw: 60, ph: 60,
  },
  {
    id: '9:16',
    label: '스마트폰',
    sublabel: '세로가 긴 화면이에요',
    pw: 34, ph: 60,
  },
  {
    id: 'a4',
    label: '문서 A4',
    sublabel: '종이처럼 긴 비율이에요',
    pw: 43, ph: 60,
  },
]

const RESOLUTIONS = [
  {
    id: 16,
    badge: '쉬움',
    badgeClass: 'bg-emerald-50 text-emerald-600',
    desc: '큼직한 픽셀로 편하게',
    dotCount: 3,
    dotSize: 14,
  },
  {
    id: 24,
    badge: '보통',
    badgeClass: 'bg-amber-50 text-amber-600',
    desc: '딱 알맞은 크기예요',
    dotCount: 4,
    dotSize: 10,
  },
  {
    id: 32,
    badge: '고급',
    badgeClass: 'bg-blue-50 text-blue-600',
    desc: '더 세밀하게 그려봐요',
    dotCount: 5,
    dotSize: 7,
  },
  {
    id: 64,
    badge: '전문가',
    badgeClass: 'bg-rose-50 text-rose-500',
    desc: '섬세하게 표현 가능해요',
    dotCount: 6,
    dotSize: 5,
  },
]


function getGrid(ratio, res) {
  if (ratio === '1:1')  return { cols: res, rows: res }
  if (ratio === '9:16') return { cols: Math.round(res * 9 / 16), rows: res }
  return { cols: res, rows: Math.round(res * Math.SQRT2) }
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
              ? (i % 5 === 0 || i % 7 === 0 ? ACCENT : `${ACCENT}30`)
              : (i % 5 === 0 || i % 7 === 0 ? '#D1D5DB' : '#F3F4F6'),
          }}
        />
      ))}
    </div>
  )
}

export default function SetupPage({ onNext }) {
  const [ratio, setRatio] = useState('1:1')
  const [resolution, setResolution] = useState(16)
  const grid = getGrid(ratio, resolution)
  const selectedRatio = RATIOS.find(r => r.id === ratio)
  const selectedResolution = RESOLUTIONS.find(res => res.id === resolution)

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-gray-50">

      {/* Scrollable main area */}
      <div className="relative z-10 h-full overflow-y-auto">
        <div className="min-h-full flex flex-col items-center justify-start sm:justify-center py-6 sm:py-12 px-6">
          <div className="w-full max-w-3xl flex flex-col gap-6 sm:gap-10">

            {/* Title */}
            <div className="text-center">
              <h1 className="text-4xl sm:text-5xl font-black text-gray-900 leading-tight mb-2 sm:mb-3">
                어떤 크기에 그릴까요?
              </h1>
              <p className="text-base sm:text-lg text-gray-500">화면 비율과 픽셀 해상도를 골라요</p>
            </div>

            <div className="hidden sm:flex items-center justify-between rounded-3xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50">
                  <div
                    className="rounded"
                    style={{
                      width: selectedRatio.pw * 0.55,
                      height: selectedRatio.ph * 0.55,
                      background: ACCENT,
                    }}
                  />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-400">선택한 캔버스</p>
                  <p className="text-xl font-bold text-gray-900">
                    {selectedRatio.label} · {grid.cols} × {grid.rows}
                  </p>
                </div>
              </div>
              <span className={`rounded-xl px-4 py-2 text-sm font-bold ${selectedResolution.badgeClass}`}>
                {selectedResolution.badge}
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
                  return (
                    <button
                      key={r.id}
                      onClick={() => setRatio(r.id)}
                      className="flex flex-col items-center gap-2 sm:gap-4 py-4 sm:py-7 px-2 sm:px-4 rounded-xl sm:rounded-2xl border-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
                      style={{
                        borderColor: active ? ACCENT : '#E5E7EB',
                        background: active ? `rgba(16,185,129,0.08)` : '#FFFFFF',
                        boxShadow: active
                          ? `0 0 0 1px ${ACCENT}, 0 6px 24px rgba(16,185,129,0.18)`
                          : '0 2px 8px rgba(0,0,0,0.04)',
                      }}
                    >
                      {/* 비율 시각화 */}
                      <div className="flex items-end justify-center h-11 sm:h-16">
                        <div
                          className="rounded transition-all"
                          style={{
                            width: `clamp(${Math.round(r.pw * 0.62)}px, 10vw, ${r.pw}px)`,
                            height: `clamp(${Math.round(r.ph * 0.62)}px, 10vw, ${r.ph}px)`,
                            background: active ? ACCENT : '#D1D5DB',
                          }}
                        />
                      </div>
                      <div className="text-center">
                        <p
                          className="text-base sm:text-xl font-bold"
                          style={{ color: active ? ACCENT : '#374151' }}
                        >
                          {r.label}
                        </p>
                        <p className="hidden sm:block text-xs text-gray-400 mt-1 leading-snug">{r.sublabel}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* ── 해상도 선택 ──────────────────────────────────── */}
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 sm:mb-4">
                픽셀 해상도
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                {RESOLUTIONS.map(res => {
                  const g = getGrid(ratio, res.id)
                  const active = resolution === res.id
                  return (
                    <button
                      key={res.id}
                      onClick={() => setResolution(res.id)}
                      className="flex flex-col items-center gap-2.5 sm:gap-4 py-4 sm:py-7 px-3 sm:px-4 rounded-xl sm:rounded-2xl border-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
                      style={{
                        borderColor: active ? ACCENT : '#E5E7EB',
                        background: active ? `rgba(16,185,129,0.08)` : '#FFFFFF',
                        boxShadow: active
                          ? `0 0 0 1px ${ACCENT}, 0 6px 24px rgba(16,185,129,0.18)`
                          : '0 2px 8px rgba(0,0,0,0.04)',
                      }}
                    >
                      {/* 미니 픽셀 그리드 */}
                      <MiniGrid count={res.dotCount} size={res.dotSize} active={active} />

                      {/* 격자 크기 */}
                      <p
                        className="text-xl sm:text-2xl font-bold tabular-nums"
                        style={{ color: active ? ACCENT : '#374151' }}
                      >
                        {g.cols} × {g.rows}
                      </p>

                      {/* 난이도 뱃지 */}
                      <span className={`text-xs sm:text-sm font-bold px-3 py-1 rounded-lg ${res.badgeClass}`}>
                        {res.badge}
                      </span>

                      <p className="hidden sm:block text-xs text-gray-400 text-center leading-snug">{res.desc}</p>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* CTA 버튼 */}
            <div className="sticky bottom-0 -mx-6 flex justify-center bg-gradient-to-t from-gray-50 via-gray-50 to-gray-50/80 px-6 pt-4 pb-3 sm:static sm:mx-0 sm:bg-none sm:px-0 sm:pt-0 sm:pb-2">
              <button
                onClick={() => onNext(grid)}
                className="w-full sm:w-auto rounded-2xl text-lg sm:text-xl font-bold text-white transition-all hover:scale-[1.02] active:scale-[0.97]"
                style={{
                  paddingTop: '1rem',
                  paddingBottom: '1rem',
                  paddingLeft: '5rem',
                  paddingRight: '5rem',
                  background: 'linear-gradient(135deg, #10B981 0%, #34D399 100%)',
                  boxShadow: '0 4px 24px rgba(16,185,129,0.40)',
                }}
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
