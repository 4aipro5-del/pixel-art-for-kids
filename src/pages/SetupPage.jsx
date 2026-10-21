import { useState, useEffect, useRef } from 'react'
import { BASE_GRIDS } from '../utils/gridPresets'
import { loadImageFile, detectArtwork } from '../utils/importArtwork'

const ACCENT_YELLOW = '#f7d070'
const DANGER = '#f87171'
const PAGE_BG = '#1a1c1e'
const PANEL_BG = '#111214'

const RATIOS = [
  { id: 'square', label: '정사각형', sublabel: '가로 세로가 같아요',     hasOrientation: false },
  { id: 'tablet', label: '태블릿',   sublabel: '화면 비율 4:3',          hasOrientation: true, defaultOrientation: 'landscape' },
  { id: 'a4',     label: 'A4 출력',  sublabel: '종이처럼 긴 비율이에요', hasOrientation: true, defaultOrientation: 'portrait' },
]

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

// 불러온 그림 후보를 작게 그려 보여주는 미리보기 — 학생이 숫자 대신 그림을 보고 고르도록
function ArtworkPreview({ artwork, size = 140 }) {
  const canvasRef = useRef(null)
  // 칸 하나를 1px로 그리고 CSS로 키운다 — 칸 수가 달라도 후보들이 같은 크기로 보이게
  useEffect(() => {
    const ctx = canvasRef.current.getContext('2d')
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, artwork.cols, artwork.rows)
    artwork.pixels.forEach((row, r) => row.forEach((color, c) => {
      if (!color) return
      ctx.fillStyle = color
      ctx.fillRect(c, r, 1, 1)
    }))
  }, [artwork])
  return (
    <canvas
      ref={canvasRef}
      width={artwork.cols}
      height={artwork.rows}
      className="rounded-md"
      style={{ width: '100%', maxWidth: size, aspectRatio: `${artwork.cols} / ${artwork.rows}`, imageRendering: 'pixelated' }}
    />
  )
}

export default function SetupPage({ onNext, onImport, onGoHome }) {
  const [ratio, setRatio] = useState('square')
  const [orientation, setOrientation] = useState('landscape')
  const [levelIndex, setLevelIndex] = useState(0)

  const importInputRef = useRef(null)
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState(null)
  const [importOptions, setImportOptions] = useState(null) // 칸 수가 애매할 때 고를 후보들

  const selectedRatio = RATIOS.find(r => r.id === ratio)
  const grid = getGrid(ratio, orientation, levelIndex)
  const selectedLevel = LEVELS[levelIndex]

  // 비율을 바꾸면 그 비율의 기본 방향으로 리셋
  useEffect(() => {
    if (selectedRatio.hasOrientation) setOrientation(selectedRatio.defaultOrientation)
  }, [ratio]) // eslint-disable-line

  // 지난 시간에 저장한 그림 파일을 열어 칸 수를 알아낸 뒤, 크기 선택 없이 바로 그 크기로 이어 그린다
  const handleImportFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = '' // 같은 파일을 다시 골라도 change 이벤트가 오도록
    if (!file) return
    setImportError(null)
    setImporting(true)
    try {
      const result = detectArtwork(await loadImageFile(file))
      if (result.status === 'ok') onImport(result.artwork)
      else if (result.status === 'ambiguous') setImportOptions(result.options)
      else setImportError('이 앱에서 저장한 그림이 아닌 것 같아요. 저장했던 그림 파일을 골라 주세요.')
    } catch {
      setImportError('그림 파일을 열 수 없어요. 다른 파일을 골라 주세요.')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="relative h-svh w-screen overflow-hidden" style={{ background: PAGE_BG }}>

      {/* Scrollable main area */}
      <div className="relative z-10 h-full overflow-y-auto">
        <div className="min-h-full flex flex-col items-center justify-start sm:justify-center py-6 sm:py-12 px-6">
          <div className="w-full max-w-3xl flex flex-col gap-6 sm:gap-10">

            {/* Title */}
            <div className="text-center">
              <h1 className="font-pixel whitespace-nowrap text-3xl sm:text-5xl leading-tight mb-4 sm:mb-6 text-white">
                어떤 크기에 그릴까요?
              </h1>
              <p className="text-[1.1rem] sm:text-[1.2375rem] text-gray-400">화면 비율과 픽셀 해상도를 골라요</p>
            </div>

            {/* ── 이어 그리기: 저장한 그림 불러오기 ─────────────────── */}
            <div>
              <div
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 rounded-2xl px-5 py-4"
                style={{ background: PANEL_BG, border: '1px dashed rgba(247,208,112,0.45)' }}
              >
                <div className="min-w-0">
                  <p className="font-pixel-kr text-lg sm:text-xl text-white">지난번에 그리던 그림이 있나요?</p>
                  <p className="text-sm sm:text-base text-gray-400 mt-1 leading-snug break-keep">
                    저장한 그림 파일을 불러오면 크기를 고르지 않아도 그대로 이어서 그려요
                  </p>
                </div>
                <button
                  onClick={() => importInputRef.current?.click()}
                  disabled={importing}
                  className="font-pixel shrink-0 rounded-full px-5 py-3 text-base sm:text-lg text-black transition-all hover:brightness-105 active:scale-[0.97] disabled:opacity-50"
                  style={{ background: ACCENT_YELLOW }}
                >
                  {importing ? '여는 중...' : '그림 불러오기'}
                </button>
                <input
                  ref={importInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImportFile}
                />
              </div>
              {importError && (
                <p className="mt-2 px-1 text-sm sm:text-base" style={{ color: DANGER }}>{importError}</p>
              )}
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
                  <p className="text-[0.825rem] font-bold uppercase tracking-widest text-gray-400">선택한 캔버스</p>
                  <p className="font-pixel-kr text-2xl text-white">
                    {selectedRatio.label} · {grid.cols} × {grid.rows}
                  </p>
                </div>
              </div>
              <span
                className="font-pixel rounded-full px-5 py-2.5 text-lg text-black"
                style={{ background: ACCENT_YELLOW }}
              >
                {selectedLevel.badge}
              </span>
            </div>

            {/* ── 비율 선택 ────────────────────────────────────── */}
            <div>
              <p className="text-[0.825rem] font-bold text-gray-400 uppercase tracking-widest mb-3 sm:mb-4">
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
                        <p className="font-pixel-kr text-xl sm:text-2xl" style={{ color: active ? '#000000' : '#e2e8f0' }}>
                          {r.label}
                        </p>
                        <p
                          className="hidden sm:block text-base mt-1.5 leading-snug"
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
                <p className="text-[0.825rem] font-bold text-gray-400 uppercase tracking-widest mb-3 sm:mb-4">
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
                        className="font-pixel py-3 sm:py-4 rounded-2xl text-[0.9625rem] sm:text-[1.1rem] transition-all active:scale-[0.98]"
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
              <p className="text-[0.825rem] font-bold text-gray-400 uppercase tracking-widest mb-3 sm:mb-4">
                픽셀 해상도
              </p>
              <div className="grid grid-cols-3 gap-2 sm:gap-4">
                {LEVELS.map((lv, i) => {
                  const g = getGrid(ratio, orientation, i)
                  const active = levelIndex === i
                  return (
                    <button
                      key={lv.badge}
                      onClick={() => setLevelIndex(i)}
                      className="flex flex-col items-center gap-2.5 sm:gap-4 py-4 sm:py-7 px-2 sm:px-4 rounded-2xl transition-all active:scale-[0.98]"
                      style={{ background: active ? ACCENT_YELLOW : PANEL_BG }}
                    >
                      {/* 미니 픽셀 그리드 */}
                      <MiniGrid count={lv.dotCount} size={lv.dotSize} active={active} />

                      {/* 격자 크기 */}
                      <p className="font-pixel whitespace-nowrap text-xl sm:text-3xl tabular-nums" style={{ color: active ? '#000000' : '#e2e8f0' }}>
                        {g.cols} × {g.rows}
                      </p>

                      {/* 난이도 뱃지 */}
                      <span
                        className="font-pixel text-sm sm:text-base px-3.5 py-1.5 rounded-full"
                        style={{
                          background: active ? 'rgba(0,0,0,0.15)' : 'transparent',
                          color: active ? '#000000' : ACCENT_YELLOW,
                          border: active ? 'none' : `1px solid ${ACCENT_YELLOW}`,
                        }}
                      >
                        {lv.badge}
                      </span>

                      <p
                        className="hidden sm:block text-base text-center leading-snug"
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
              className="sticky bottom-0 -mx-6 flex items-center justify-center gap-3 px-6 pt-4 pb-3 sm:static sm:mx-0 sm:bg-none sm:px-0 sm:pt-0 sm:pb-2"
              style={{ background: `linear-gradient(to top, ${PAGE_BG}, ${PAGE_BG}, transparent)` }}
            >
              <button
                onClick={onGoHome}
                title="처음으로"
                className="flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center transition-all hover:brightness-125 active:scale-[0.97]"
                style={{ background: PANEL_BG, border: `1px solid ${ACCENT_YELLOW}` }}
              >
                <span
                  aria-hidden="true"
                  className="w-7 h-7"
                  style={{
                    background: ACCENT_YELLOW,
                    WebkitMaskImage: 'url(/images/home.png)',
                    maskImage: 'url(/images/home.png)',
                    WebkitMaskSize: 'contain',
                    maskSize: 'contain',
                    WebkitMaskRepeat: 'no-repeat',
                    maskRepeat: 'no-repeat',
                    WebkitMaskPosition: 'center',
                    maskPosition: 'center',
                  }}
                />
              </button>
              <button
                onClick={() => onNext({ ...grid, ratio, orientation })}
                className="font-pixel flex-1 sm:flex-none sm:w-auto py-4 px-20 rounded-full text-[1.2375rem] sm:text-[1.375rem] text-black transition-all hover:brightness-105 active:scale-[0.97]"
                style={{ background: ACCENT_YELLOW, boxShadow: '0 8px 24px rgba(247,208,112,0.25)' }}
              >
                {grid.cols} × {grid.rows} 그리기 →
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* 칸 수를 확실히 알 수 없을 때: 후보 그림을 보여주고 내 그림과 똑같은 것을 고르게 한다 */}
      {importOptions && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4"
          onClick={e => e.target === e.currentTarget && setImportOptions(null)}
        >
          <div className="w-full max-w-2xl rounded-2xl p-5 sm:p-6" style={{ background: PANEL_BG }}>
            <p className="font-pixel-kr text-xl sm:text-2xl text-white text-center break-keep">어떤 그림이 내 그림이랑 똑같아 보여요?</p>
            <p className="text-sm sm:text-base text-gray-400 text-center mt-2">똑같아 보이는 그림을 눌러 주세요</p>
            <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-4">
              {importOptions.map(opt => (
                <button
                  key={`${opt.cols}x${opt.rows}`}
                  onClick={() => { setImportOptions(null); onImport(opt) }}
                  className="flex flex-col items-center gap-2 sm:gap-3 rounded-2xl p-2 sm:p-4 transition-all hover:brightness-125 active:scale-[0.98]"
                  style={{ background: PAGE_BG, border: `1px solid ${ACCENT_YELLOW}` }}
                >
                  <ArtworkPreview artwork={opt} />
                  <span className="font-pixel text-sm sm:text-lg text-white tabular-nums whitespace-nowrap">{opt.cols} × {opt.rows}</span>
                </button>
              ))}
            </div>
            <div className="mt-6 flex justify-center">
              <button
                onClick={() => setImportOptions(null)}
                className="font-pixel rounded-full px-8 py-3 text-white hover:brightness-125"
                style={{ background: PAGE_BG }}
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
