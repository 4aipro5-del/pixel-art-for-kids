import { useState } from 'react'

const NEON_MINT = '#4deeea'
const NEON_PINK = '#ff2d95'
const NEON_LAVENDER = '#b98eff'
const CARD_BG = '#262e35'
const CARD_BORDER = '#3a434b'

const RATIOS = [
  {
    id: '1:1',
    label: '정사각형',
    sublabel: '가로 세로가 같아요',
    pw: 60, ph: 60,
    neon: NEON_MINT,
  },
  {
    id: '9:16',
    label: '스마트폰',
    sublabel: '세로가 긴 화면이에요',
    pw: 34, ph: 60,
    neon: NEON_PINK,
  },
  {
    id: 'a4',
    label: '문서 A4',
    sublabel: '종이처럼 긴 비율이에요',
    pw: 43, ph: 60,
    neon: NEON_LAVENDER,
  },
]

const RESOLUTIONS = [
  { id: 16, badge: '쉬움',   desc: '큼직한 픽셀로 편하게',     dotCount: 3, dotSize: 14, neon: NEON_MINT },
  { id: 24, badge: '보통',   desc: '딱 알맞은 크기예요',       dotCount: 4, dotSize: 10, neon: NEON_LAVENDER },
  { id: 32, badge: '고급',   desc: '더 세밀하게 그려봐요',     dotCount: 5, dotSize: 7,  neon: NEON_PINK },
  { id: 64, badge: '전문가', desc: '섬세하게 표현 가능해요',   dotCount: 6, dotSize: 5,  neon: NEON_MINT },
]

function getGrid(ratio, res) {
  if (ratio === '1:1')  return { cols: res, rows: res }
  if (ratio === '9:16') return { cols: Math.round(res * 9 / 16), rows: res }
  return { cols: res, rows: Math.round(res * Math.SQRT2) }
}

// 해상도 카드 안의 미니 픽셀 그리드 미리보기
function MiniGrid({ count, size, active, neon }) {
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
              ? (i % 5 === 0 || i % 7 === 0 ? neon : `${neon}40`)
              : (i % 5 === 0 || i % 7 === 0 ? '#4b5560' : '#333c44'),
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
    <div className="relative h-screen w-screen overflow-hidden bg-[#1e252b]">

      {/* Scrollable main area */}
      <div className="relative z-10 h-full overflow-y-auto">
        <div className="min-h-full flex flex-col items-center justify-start sm:justify-center py-6 sm:py-12 px-6">
          <div className="w-full max-w-3xl flex flex-col gap-6 sm:gap-10">

            {/* Title */}
            <div className="text-center">
              <h1 className="font-pixel text-4xl sm:text-5xl leading-tight mb-4 sm:mb-6">
                <span className="block text-[#e2e8f0]">어떤 크기에</span>
                <span className="block" style={{ color: NEON_LAVENDER, textShadow: `0 0 16px ${NEON_LAVENDER}55` }}>그릴까요?</span>
              </h1>
              <p className="text-base sm:text-lg text-[#94a3b8]">화면 비율과 픽셀 해상도를 골라요</p>
            </div>

            <div
              className="hidden sm:flex items-center justify-between rounded-sm border px-5 py-4"
              style={{ borderColor: CARD_BORDER, background: CARD_BG }}
            >
              <div className="flex items-center gap-4">
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-sm border"
                  style={{ borderColor: selectedRatio.neon, background: '#1a2025' }}
                >
                  <div
                    className="rounded-sm"
                    style={{
                      width: selectedRatio.pw * 0.55,
                      height: selectedRatio.ph * 0.55,
                      background: selectedRatio.neon,
                    }}
                  />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-[#94a3b8]">선택한 캔버스</p>
                  <p className="font-pixel text-lg text-[#e2e8f0]">
                    {selectedRatio.label} · {grid.cols} × {grid.rows}
                  </p>
                </div>
              </div>
              <span
                className="font-pixel rounded-sm border px-4 py-2 text-sm"
                style={{ borderColor: selectedResolution.neon, color: selectedResolution.neon, background: '#1a2025' }}
              >
                {selectedResolution.badge}
              </span>
            </div>

            {/* ── 비율 선택 ────────────────────────────────────── */}
            <div>
              <p className="text-xs font-bold text-[#94a3b8] uppercase tracking-widest mb-3 sm:mb-4">
                화면 비율
              </p>
              <div className="grid grid-cols-3 gap-2 sm:gap-4">
                {RATIOS.map(r => {
                  const active = ratio === r.id
                  return (
                    <button
                      key={r.id}
                      onClick={() => setRatio(r.id)}
                      className="flex flex-col items-center gap-2 sm:gap-4 py-4 sm:py-7 px-2 sm:px-4 rounded-sm border-2 transition-all active:scale-[0.98]"
                      style={{
                        borderColor: active ? r.neon : CARD_BORDER,
                        background: active ? `${r.neon}1a` : CARD_BG,
                        boxShadow: active ? `0 0 16px ${r.neon}55` : 'none',
                      }}
                    >
                      {/* 비율 시각화 */}
                      <div className="flex items-end justify-center h-11 sm:h-16">
                        <div
                          className="rounded-sm transition-all"
                          style={{
                            width: `clamp(${Math.round(r.pw * 0.62)}px, 10vw, ${r.pw}px)`,
                            height: `clamp(${Math.round(r.ph * 0.62)}px, 10vw, ${r.ph}px)`,
                            background: active ? r.neon : '#4b5560',
                          }}
                        />
                      </div>
                      <div className="text-center">
                        <p
                          className="font-pixel text-base sm:text-lg"
                          style={{ color: active ? r.neon : '#e2e8f0' }}
                        >
                          {r.label}
                        </p>
                        <p className="hidden sm:block text-xs text-[#94a3b8] mt-1 leading-snug">{r.sublabel}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* ── 해상도 선택 ──────────────────────────────────── */}
            <div>
              <p className="text-xs font-bold text-[#94a3b8] uppercase tracking-widest mb-3 sm:mb-4">
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
                      className="flex flex-col items-center gap-2.5 sm:gap-4 py-4 sm:py-7 px-3 sm:px-4 rounded-sm border-2 transition-all active:scale-[0.98]"
                      style={{
                        borderColor: active ? res.neon : CARD_BORDER,
                        background: active ? `${res.neon}1a` : CARD_BG,
                        boxShadow: active ? `0 0 16px ${res.neon}55` : 'none',
                      }}
                    >
                      {/* 미니 픽셀 그리드 */}
                      <MiniGrid count={res.dotCount} size={res.dotSize} active={active} neon={res.neon} />

                      {/* 격자 크기 */}
                      <p
                        className="font-pixel text-lg sm:text-xl tabular-nums"
                        style={{ color: active ? res.neon : '#e2e8f0' }}
                      >
                        {g.cols} × {g.rows}
                      </p>

                      {/* 난이도 뱃지 */}
                      <span
                        className="font-pixel text-[10px] sm:text-xs px-3 py-1 rounded-sm border"
                        style={{ borderColor: res.neon, color: res.neon }}
                      >
                        {res.badge}
                      </span>

                      <p className="hidden sm:block text-xs text-[#94a3b8] text-center leading-snug">{res.desc}</p>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* CTA 버튼 */}
            <div
              className="sticky bottom-0 -mx-6 flex justify-center px-6 pt-4 pb-3 sm:static sm:mx-0 sm:bg-none sm:px-0 sm:pt-0 sm:pb-2"
              style={{ background: 'linear-gradient(to top, #1e252b, #1e252b, rgba(30,37,43,0.8))' }}
            >
              <button
                onClick={() => onNext(grid)}
                className="font-pixel w-full sm:w-auto py-4 px-20 rounded-sm text-lg sm:text-xl text-black bg-[#4deeea] transition-all hover:brightness-110 active:scale-[0.97]"
                style={{ boxShadow: '4px 4px 0 #000000' }}
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
