import { useState, useCallback, useRef, useEffect } from 'react'
import PixelCanvas from '../components/PixelCanvas'
import SketchbookModal from '../components/SketchbookModal'
import DoanView from '../components/DoanView'
import { uploadWallPost, saveArtwork } from '../firebase'

const MAX_HISTORY = 20
const SKETCHBOOK_KEY = 'pixelart_sketchbook'
const NEON_MINT = '#4deeea'
const NEON_PINK = '#ff2d95'
const CARD_BG = '#262e35'
const CARD_BORDER = '#3a434b'
const PAGE_BG = '#1e252b'

// 무지개 + 기본 12색 팔레트
const PASTEL_COLORS = [
  '#F87171', // 빨강  red-400
  '#FB923C', // 주황  orange-400
  '#FCD34D', // 노랑  amber-300
  '#4ADE80', // 초록  green-400
  '#38BDF8', // 파랑  sky-400
  '#6366F1', // 남색  indigo-500
  '#C084FC', // 보라  purple-400
  '#F472B6', // 분홍  pink-400
  '#92400E', // 갈색  amber-800
  '#FFFFFF', // 흰색
  '#94A3B8', // 회색  slate-400
  '#000000', // 검은색
]

const TOOLS = [
  { id: 'pen',        label: '펜' },
  { id: 'eraser',     label: '지우개' },
  { id: 'eyedropper', label: '스포이드' },
]

function makeEmpty(rows, cols) {
  return Array(rows).fill(null).map(() => Array(cols).fill(null))
}

function SectionLabel({ children }) {
  return (
    <p className="text-xs font-bold text-[#94a3b8] uppercase tracking-wider mb-2.5">
      {children}
    </p>
  )
}

function HeaderBtn({ onClick, disabled, children, variant = 'ghost', className = '' }) {
  const base = 'font-pixel flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-sm border text-xs transition-colors disabled:opacity-30 disabled:cursor-not-allowed select-none whitespace-nowrap shrink-0'
  const styles = {
    ghost:   'bg-[#262e35] text-[#e2e8f0] border-[#3a434b] hover:border-[#4deeea] hover:text-[#4deeea]',
    danger:  'bg-[#262e35] text-[#e2e8f0] border-[#3a434b] hover:border-[#ff2d95] hover:text-[#ff2d95]',
    primary: 'bg-[#4deeea] text-black border-transparent hover:brightness-110',
  }
  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${styles[variant]} ${className}`}>
      {children}
    </button>
  )
}

function MobileEditorControls({
  tool,
  onToolChange,
  onEyedropper,
  brushSize,
  onBrushSizeChange,
  selectedColor,
  onColorChange,
  recentColors,
  zoom,
  onZoomChange,
  onZoomReset,
  onClearAll,
  onSavePNG,
  onSaveSketchbook,
  onOpenDoan,
  tracingImage,
  tracingOpacity,
  onTracingOpacityChange,
  onTracingRemove,
  tracingInputRef,
  onTracingUpload,
}) {
  const toolButtonClass = 'font-pixel h-11 rounded-sm border text-xs transition-colors active:scale-95'
  const actionButtonClass = 'font-pixel h-10 rounded-sm border px-3 text-[10px] whitespace-nowrap active:scale-95 transition-colors'

  return (
    <div className="md:hidden flex-shrink-0" style={{ background: PAGE_BG, borderTop: `1px solid ${CARD_BORDER}` }}>
      <div
        className="px-3 pt-2 pb-3"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      >
        <div className="flex items-center gap-2">
          <div className="grid grid-cols-3 gap-1.5 flex-1">
            {TOOLS.map(t => {
              const active = tool === t.id
              return (
                <button
                  key={t.id}
                  onClick={() => t.id === 'eyedropper' ? onEyedropper() : onToolChange(t.id)}
                  className={toolButtonClass}
                  style={{
                    borderColor: active ? NEON_MINT : CARD_BORDER,
                    background: active ? `${NEON_MINT}1f` : CARD_BG,
                    color: active ? NEON_MINT : '#e2e8f0',
                  }}
                >
                  {t.label}
                </button>
              )
            })}
          </div>

          <div className="grid grid-cols-2 gap-1.5 w-24">
            {[
              { id: 1, label: '1칸' },
              { id: 2, label: '4칸' },
            ].map(b => (
              <button
                key={b.id}
                onClick={() => onBrushSizeChange(b.id)}
                className={toolButtonClass}
                style={{
                  borderColor: brushSize === b.id ? NEON_MINT : CARD_BORDER,
                  background: brushSize === b.id ? `${NEON_MINT}1f` : CARD_BG,
                  color: brushSize === b.id ? NEON_MINT : '#e2e8f0',
                }}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-2 flex items-center gap-2 overflow-x-auto header-scrollbar pb-1">
          <div
            className="w-10 h-10 rounded-sm border flex-shrink-0"
            style={{ background: selectedColor, borderColor: '#ffffff40' }}
          />
          {[...PASTEL_COLORS, ...recentColors].filter((color, index, all) => all.indexOf(color) === index).map(color => (
            <button
              key={color}
              onClick={() => onColorChange(color)}
              aria-label={`${color} 색상 선택`}
              className="w-9 h-9 rounded-sm border flex-shrink-0 active:scale-95"
              style={{
                background: color,
                borderColor: '#ffffff40',
                outline: selectedColor === color ? `3px solid ${NEON_MINT}` : 'none',
                outlineOffset: '2px',
              }}
            />
          ))}
          <label
            className="font-pixel h-9 px-3 rounded-sm border text-[10px] flex items-center flex-shrink-0"
            style={{ borderColor: CARD_BORDER, background: CARD_BG, color: '#e2e8f0' }}
          >
            직접
            <input
              type="color"
              value={selectedColor === '#FFFFFF' ? '#FFFFFF' : selectedColor}
              onChange={e => onColorChange(e.target.value)}
              className="sr-only"
            />
          </label>
        </div>

        <div className="mt-2 flex items-center gap-2 overflow-x-auto header-scrollbar pb-1">
          <button onClick={onClearAll} className={actionButtonClass} style={{ borderColor: CARD_BORDER, background: CARD_BG, color: NEON_PINK }}>전체 지우기</button>
          <button onClick={onSavePNG} className={actionButtonClass} style={{ borderColor: CARD_BORDER, background: CARD_BG, color: '#e2e8f0' }}>PNG 저장</button>
          <button onClick={onSaveSketchbook} className={actionButtonClass} style={{ borderColor: CARD_BORDER, background: CARD_BG, color: '#e2e8f0' }}>스케치북</button>
          <button onClick={onOpenDoan} className={actionButtonClass} style={{ borderColor: CARD_BORDER, background: CARD_BG, color: '#e2e8f0' }}>도안 만들기</button>
          <label className={`${actionButtonClass} flex items-center`} style={{ borderColor: CARD_BORDER, background: CARD_BG, color: '#e2e8f0' }}>
            밑그림
            <input
              ref={tracingInputRef}
              type="file"
              accept="image/png"
              className="hidden"
              onChange={onTracingUpload}
            />
          </label>
        </div>

        {tracingImage && (
          <div className="mt-2 flex items-center gap-2">
            <span className="w-12 text-xs font-semibold text-[#94a3b8]">밑그림</span>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(tracingOpacity * 100)}
              onChange={e => onTracingOpacityChange(Number(e.target.value) / 100)}
              className="flex-1 cursor-pointer"
              style={{ accentColor: NEON_MINT }}
            />
            <button
              onClick={onTracingRemove}
              className="font-pixel h-8 rounded-sm border px-2 text-[10px]"
              style={{ borderColor: CARD_BORDER, background: CARD_BG, color: NEON_PINK }}
            >
              지우기
            </button>
          </div>
        )}

        <div className="mt-2 flex items-center gap-2">
          <span className="w-12 text-xs font-semibold text-[#94a3b8]">확대</span>
          <input
            type="range"
            min={0.25}
            max={4}
            step={0.25}
            value={zoom}
            onChange={e => onZoomChange(Number(e.target.value))}
            className="flex-1 cursor-pointer"
            style={{ accentColor: NEON_MINT }}
          />
          <button
            onClick={onZoomReset}
            className="font-pixel h-8 min-w-12 rounded-sm border px-2 text-[10px]"
            style={{ borderColor: NEON_MINT, background: CARD_BG, color: NEON_MINT }}
          >
            {Math.round(zoom * 100)}%
          </button>
        </div>
      </div>
    </div>
  )
}

export default function EditorPage({ userName, gridCols, gridRows, onGoToWall, onGoToSetup }) {
  const [pixels, setPixels] = useState(() => makeEmpty(gridRows, gridCols))
  const [history, setHistory] = useState([])
  const [future, setFuture] = useState([])
  const [selectedColor, setSelectedColor] = useState(PASTEL_COLORS[0])
  const [recentColors, setRecentColors] = useState([])
  const [tool, setTool] = useState('pen')
  const [brushSize, setBrushSize] = useState(1)
  const [zoom, setZoom] = useState(1)
  const [showSketchbook, setShowSketchbook] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [showBackModal, setShowBackModal] = useState(false)
  const [showClearModal, setShowClearModal] = useState(false)
  const [doanMode, setDoanMode] = useState(false)
  const [toast, setToast] = useState(null)
  const [tracingImage, setTracingImage] = useState(null)
  const [tracingOpacity, setTracingOpacity] = useState(0.25)
  const toastTimer = useRef(null)
  const prevToolRef = useRef('pen')  // eyedrop 취소 시 이전 도구 복원용
  const tracingInputRef = useRef(null)

  const handleTracingUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.type !== 'image/png') {
      alert('PNG 파일만 업로드할 수 있어요!')
      e.target.value = ''
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => setTracingImage(ev.target.result)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const showToast = (msg) => {
    setToast(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2500)
  }

  const addRecentColor = useCallback((color) => {
    setRecentColors(prev => [color, ...prev.filter(c => c !== color)].slice(0, 7))
  }, [])

  const handleColorPick = useCallback((color) => {
    setSelectedColor(color)
    setRecentColors(prev => [color, ...prev.filter(c => c !== color)].slice(0, 7))
    setTool('pen')
    setToast('색상을 추출했어요!')
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2500)
  }, []) // state setters are stable — no deps needed

  // EyeDropper API: 화면 어디서든 색상 추출
  const handleEyedrop = async (currentTool) => {
    prevToolRef.current = currentTool  // ESC 취소 시 복원할 도구 저장

    if (!('EyeDropper' in window)) {
      // Safari 등 미지원 브라우저 → 기존 캔버스 스포이드 모드로 자동 전환
      setTool('eyedropper')
      showToast('캔버스를 클릭해 색상을 추출하세요')
      return
    }

    setTool('eyedropper')  // 버튼 하이라이트 표시
    try {
      const result = await new window.EyeDropper().open()
      handleColorPick(result.sRGBHex)  // 색상 등록 + 최근 색상 추가 + 펜 모드 복귀
    } catch (e) {
      // AbortError: ESC 취소 — 조용히 이전 도구로 복원
      // 그 외 예기치 못한 에러: 토스트 없이 복원
      if (e.name !== 'AbortError') {
        console.warn('EyeDropper error:', e)
      }
      setTool(prevToolRef.current)
    }
  }

  // minPx=1 → 원본 해상도(스케치북용), minPx≥512 → 업스케일(다운로드/공유용)
  const getDataURL = useCallback((minPx = 1) => {
    const scale = minPx <= 1 ? 1 : Math.max(1, Math.ceil(minPx / Math.min(gridCols, gridRows)))
    const off = document.createElement('canvas')
    off.width = gridCols * scale
    off.height = gridRows * scale
    const ctx = off.getContext('2d')
    ctx.imageSmoothingEnabled = false
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, off.width, off.height)
    for (let r = 0; r < gridRows; r++) {
      for (let c = 0; c < gridCols; c++) {
        if (pixels[r][c]) {
          ctx.fillStyle = pixels[r][c]
          ctx.fillRect(c * scale, r * scale, scale, scale)
        }
      }
    }
    return off.toDataURL('image/png')
  }, [pixels, gridCols, gridRows])

  const handleCommit = useCallback((newPixels) => {
    setHistory(prev => [...prev.slice(-(MAX_HISTORY - 1)), pixels.map(r => [...r])])
    setFuture([])
    setPixels(newPixels)
  }, [pixels])

  const handleUndo = useCallback(() => {
    setHistory(prev => {
      if (!prev.length) return prev
      const restored = prev[prev.length - 1]
      setFuture(f => [pixels.map(r => [...r]), ...f])
      setPixels(restored)
      return prev.slice(0, -1)
    })
  }, [pixels])

  const handleRedo = useCallback(() => {
    setFuture(prev => {
      if (!prev.length) return prev
      const restored = prev[0]
      setHistory(h => [...h.slice(-(MAX_HISTORY - 1)), pixels.map(r => [...r])])
      setPixels(restored)
      return prev.slice(1)
    })
  }, [pixels])

  const handleClearAll = () => {
    setHistory(prev => [...prev.slice(-(MAX_HISTORY - 1)), pixels.map(r => [...r])])
    setFuture([])
    setPixels(makeEmpty(gridRows, gridCols))
    setShowClearModal(false)
  }

  const handleSavePNG = useCallback(() => {
    const a = document.createElement('a')
    a.href = getDataURL(512)
    a.download = `픽셀아트_${userName}.png`
    a.click()
    showToast('PNG로 저장했어요!')
  }, [getDataURL, userName])

  const handleSaveSketchbook = () => {
    const dataUrl = getDataURL()
    const all = JSON.parse(localStorage.getItem(SKETCHBOOK_KEY) || '[]')
    all.unshift({ id: Date.now(), userName, dataUrl, cols: gridCols, rows: gridRows, createdAt: new Date().toISOString() })
    localStorage.setItem(SKETCHBOOK_KEY, JSON.stringify(all.slice(0, 50)))
    setShowSketchbook(true)
    showToast('스케치북에 저장했어요!')
  }

  const handleShareWall = async () => {
    setUploading(true)
    try {
      await uploadWallPost(userName, getDataURL(512))
      // 픽셀 데이터도 artworks 컬렉션에 저장 (진입 화면 갤러리용)
      saveArtwork(userName, pixels, gridCols, gridRows).catch(console.warn)
      showToast('담벼락에 올렸어요!')
      onGoToWall()
    } catch (err) {
      console.error(err)
      showToast('업로드 실패. Firebase 설정을 확인해주세요.')
    } finally {
      setUploading(false)
    }
  }

  const handleOpenDoan = () => {
    // 도안 만들기 진입 시 작품 저장
    saveArtwork(userName, pixels, gridCols, gridRows).catch(console.warn)
    setDoanMode(true)
  }

  // Keyboard shortcuts via stable refs
  const undoRef = useRef(null); undoRef.current = handleUndo
  const redoRef = useRef(null); redoRef.current = handleRedo
  const savePNGRef = useRef(null); savePNGRef.current = handleSavePNG

  useEffect(() => {
    const onKey = (e) => {
      if (!(e.ctrlKey || e.metaKey)) return
      if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undoRef.current() }
      if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) { e.preventDefault(); redoRef.current() }
      if (e.key === 's') { e.preventDefault(); savePNGRef.current() }
      if (e.key === '=') { e.preventDefault(); setZoom(z => Math.min(4, +(z + 0.25).toFixed(2))) }
      if (e.key === '-') { e.preventDefault(); setZoom(z => Math.max(0.25, +(z - 0.25).toFixed(2))) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const canUndo = history.length > 0
  const canRedo = future.length > 0

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden" style={{ background: PAGE_BG }}>

      {/* ── Header ─────────────────────────────────── */}
      <header
        className="flex-shrink-0 z-10 h-14 md:h-12 overflow-hidden md:overflow-x-auto header-scrollbar"
        style={{ background: PAGE_BG, borderBottom: `1px solid ${CARD_BORDER}` }}
      >
        <div className="flex items-center justify-between gap-2 px-3 md:px-5 h-full min-w-0 md:min-w-max">

          {/* Brand + 이전 단계 */}
          <div className="flex items-center gap-2 md:gap-2.5 min-w-0">
            <div className="flex gap-1">
              {PASTEL_COLORS.slice(0, 4).map((c, i) => (
                <div key={i} className="w-2.5 h-2.5 rounded-sm" style={{ background: c }} />
              ))}
            </div>
            <span className="font-pixel text-lg tracking-tight whitespace-nowrap" style={{ color: NEON_PINK }}>픽셀아트</span>
            <div className="hidden sm:block w-px h-4 shrink-0" style={{ background: CARD_BORDER }} />
            <span className="hidden sm:inline text-sm text-[#94a3b8] font-medium whitespace-nowrap">{userName}</span>
            <div className="hidden md:block w-px h-4 shrink-0" style={{ background: CARD_BORDER }} />
            <HeaderBtn onClick={() => setShowBackModal(true)}>
              <span className="hidden sm:inline">← 이전 단계</span>
              <span className="sm:hidden">←</span>
            </HeaderBtn>
          </div>

          {/* Edit controls */}
          <div className="flex items-center gap-1 shrink-0">
            <HeaderBtn onClick={handleUndo} disabled={!canUndo}>
              <span className="hidden sm:inline">↩ 되돌리기</span>
              <span className="sm:hidden">↩</span>
            </HeaderBtn>
            <HeaderBtn onClick={handleRedo} disabled={!canRedo}>
              <span className="hidden sm:inline">↪ 다시하기</span>
              <span className="sm:hidden">↪</span>
            </HeaderBtn>
            <div className="hidden md:block w-px h-4 mx-1.5 shrink-0" style={{ background: CARD_BORDER }} />
            <HeaderBtn onClick={() => setShowClearModal(true)} variant="danger" className="hidden md:flex">✕ 전체 지우기</HeaderBtn>
          </div>

          {/* Save actions */}
          <div className="hidden md:flex items-center gap-1.5 shrink-0">
            <HeaderBtn onClick={handleSavePNG}>↓ PNG 저장</HeaderBtn>
            <HeaderBtn onClick={handleSaveSketchbook}>◉ 스케치북</HeaderBtn>
            <HeaderBtn onClick={handleOpenDoan}>◈ 도안 만들기</HeaderBtn>
            <HeaderBtn onClick={handleShareWall} disabled={uploading} variant="primary">
              {uploading ? '올리는 중…' : '↗ 담벼락 공유'}
            </HeaderBtn>
          </div>

          <HeaderBtn onClick={handleShareWall} disabled={uploading} variant="primary" className="md:hidden">
            {uploading ? '중…' : '공유'}
          </HeaderBtn>

        </div>
      </header>

      {/* ── Body ───────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {doanMode ? (
          <DoanView pixels={pixels} gridCols={gridCols} gridRows={gridRows} onClose={() => setDoanMode(false)} />
        ) : (<>

        {/* ── Left Sidebar ───────────────────────── */}
        <aside
          className="hidden md:flex w-60 flex-col flex-shrink-0 overflow-y-auto"
          style={{ background: PAGE_BG, borderRight: `1px solid ${CARD_BORDER}` }}
        >
          <div className="flex flex-col gap-4 p-4 flex-1">

            {/* Tools */}
            <div className="rounded-sm p-3 border" style={{ background: CARD_BG, borderColor: CARD_BORDER }}>
              <SectionLabel>도구</SectionLabel>
              <div className="flex flex-col gap-0.5">
                {TOOLS.map(t => {
                  const active = tool === t.id
                  return (
                    <button
                      key={t.id}
                      onClick={() => t.id === 'eyedropper' ? handleEyedrop(tool) : setTool(t.id)}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-sm text-sm transition-colors duration-200"
                      style={{
                        background: active ? `${NEON_MINT}1f` : 'transparent',
                        color: active ? NEON_MINT : '#e2e8f0',
                        fontWeight: active ? 600 : 500,
                      }}
                    >
                      {t.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Brush size */}
            <div className="rounded-sm p-3 border" style={{ background: CARD_BG, borderColor: CARD_BORDER }}>
              <SectionLabel>브러시 크기</SectionLabel>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 1, label: '1칸',  cells: 1 },
                  { id: 2, label: '4칸',  cells: 4 },
                ].map(b => {
                  const active = brushSize === b.id
                  return (
                    <button
                      key={b.id}
                      onClick={() => setBrushSize(b.id)}
                      className="flex flex-col items-center gap-2 py-3 rounded-sm border text-xs font-semibold transition-colors duration-200"
                      style={{
                        borderColor: active ? NEON_MINT : CARD_BORDER,
                        background: active ? `${NEON_MINT}1f` : 'transparent',
                        color: active ? NEON_MINT : '#e2e8f0',
                      }}
                    >
                      <div className={`grid gap-0.5 ${b.id === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                        {Array(b.cells).fill(0).map((_, i) => (
                          <div
                            key={i}
                            className="w-3 h-3 rounded-sm"
                            style={{ background: active ? NEON_MINT : '#4b5560' }}
                          />
                        ))}
                      </div>
                      <span>{b.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Color palette */}
            <div className="rounded-sm p-3 border" style={{ background: CARD_BG, borderColor: CARD_BORDER }}>
              <SectionLabel>색상</SectionLabel>

              {/* Active color preview */}
              <div
                className="w-full h-9 rounded-sm mb-3 border"
                style={{ background: selectedColor, borderColor: '#ffffff30' }}
              />

              {/* Palette grid */}
              <div className="grid grid-cols-4 gap-1.5 mb-2.5">
                {PASTEL_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    aria-label={`${color} 색상 선택`}
                    className="aspect-square rounded-sm border transition-transform hover:scale-110 active:scale-95"
                    style={{
                      background: color,
                      borderColor: '#ffffff30',
                      outline: selectedColor === color ? `3px solid ${NEON_MINT}` : 'none',
                      outlineOffset: '2px',
                    }}
                  />
                ))}
              </div>

              {/* Recent colors */}
              {recentColors.length > 0 && (
                <div className="mb-2.5">
                  <p className="text-xs text-[#6b7684] font-semibold mb-1.5">최근 사용</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {recentColors.map((color, i) => (
                      <button
                        key={i}
                        onClick={() => setSelectedColor(color)}
                        aria-label={`${color} 최근 색상 선택`}
                        className="w-7 h-7 rounded-sm border transition-transform hover:scale-110 active:scale-95"
                        style={{
                          background: color,
                          borderColor: '#ffffff30',
                          outline: selectedColor === color ? `3px solid ${NEON_MINT}` : 'none',
                          outlineOffset: '2px',
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Custom color picker */}
              <div className="relative">
                <div
                  className="flex items-center gap-2 px-3 py-2.5 rounded-sm border cursor-pointer transition-colors duration-200"
                  style={{ background: '#1a2025', borderColor: CARD_BORDER }}
                >
                  <div
                    className="w-3.5 h-3.5 rounded-sm border border-dashed flex-shrink-0"
                    style={{ background: selectedColor, borderColor: '#ffffff50' }}
                  />
                  <span className="text-xs text-[#94a3b8] font-medium">직접 선택…</span>
                </div>
                <input
                  type="color"
                  value={selectedColor === '#FFFFFF' ? '#FFFFFF' : selectedColor}
                  onChange={e => setSelectedColor(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full"
                />
              </div>
            </div>

            {/* 밑그림 (트레이싱) */}
            <div className="rounded-sm p-3 border" style={{ background: CARD_BG, borderColor: CARD_BORDER }}>
              <SectionLabel>밑그림</SectionLabel>
              {!tracingImage ? (
                <label
                  className="flex items-center gap-2 px-3 py-2.5 rounded-sm border cursor-pointer transition-colors duration-200"
                  style={{ background: '#1a2025', borderColor: CARD_BORDER }}
                >
                  <span className="text-xs text-[#94a3b8] font-medium">PNG 이미지 올리기…</span>
                  <input
                    ref={tracingInputRef}
                    type="file"
                    accept="image/png"
                    className="hidden"
                    onChange={handleTracingUpload}
                  />
                </label>
              ) : (
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#94a3b8] font-semibold">투명도</span>
                    <span className="text-xs font-bold" style={{ color: NEON_MINT }}>
                      {Math.round(tracingOpacity * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(tracingOpacity * 100)}
                    onChange={e => setTracingOpacity(Number(e.target.value) / 100)}
                    className="w-full cursor-pointer"
                    style={{ accentColor: NEON_MINT }}
                  />
                  <button
                    onClick={() => setTracingImage(null)}
                    className="flex items-center justify-center gap-1 px-3 py-2 rounded-sm border text-xs font-semibold transition-colors"
                    style={{ borderColor: CARD_BORDER, color: NEON_PINK }}
                  >
                    ✕ 밑그림 지우기
                  </button>
                </div>
              )}
            </div>

            {/* Spacer pushes zoom to bottom */}
            <div className="flex-1" />

            {/* Zoom */}
            <div className="rounded-sm p-3 border" style={{ background: CARD_BG, borderColor: CARD_BORDER }}>
              <div className="flex items-center justify-between mb-2.5">
                <SectionLabel>확대 / 축소</SectionLabel>
                <span className="text-xs font-bold mb-2.5" style={{ color: NEON_MINT }}>
                  {Math.round(zoom * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0.25}
                max={4}
                step={0.25}
                value={zoom}
                onChange={e => setZoom(Number(e.target.value))}
                className="w-full cursor-pointer"
                style={{ accentColor: NEON_MINT }}
              />
              <div className="flex justify-between items-center mt-1.5">
                <span className="text-xs text-[#6b7684]">25%</span>
                <button
                  onClick={() => setZoom(1)}
                  className="text-xs font-semibold hover:underline transition-colors"
                  style={{ color: '#94a3b8' }}
                >
                  초기화
                </button>
                <span className="text-xs text-[#6b7684]">400%</span>
              </div>
            </div>

          </div>
        </aside>

        {/* ── Canvas area ────────────────────────── */}
        <div className="flex flex-1 min-w-0 min-h-0 flex-col overflow-hidden">
          <PixelCanvas
            pixels={pixels}
            gridCols={gridCols}
            gridRows={gridRows}
            selectedColor={selectedColor}
            tool={tool}
            brushSize={brushSize}
            zoom={zoom}
            onCommit={handleCommit}
            onColorPick={handleColorPick}
            onPaintComplete={addRecentColor}
            tracingImage={tracingImage}
            tracingOpacity={tracingOpacity}
          />

          <MobileEditorControls
            tool={tool}
            onToolChange={setTool}
            onEyedropper={() => handleEyedrop(tool)}
            brushSize={brushSize}
            onBrushSizeChange={setBrushSize}
            selectedColor={selectedColor}
            onColorChange={setSelectedColor}
            recentColors={recentColors}
            zoom={zoom}
            onZoomChange={setZoom}
            onZoomReset={() => setZoom(1)}
            onClearAll={() => setShowClearModal(true)}
            onSavePNG={handleSavePNG}
            onSaveSketchbook={handleSaveSketchbook}
            onOpenDoan={handleOpenDoan}
            tracingImage={tracingImage}
            tracingOpacity={tracingOpacity}
            onTracingOpacityChange={setTracingOpacity}
            onTracingRemove={() => setTracingImage(null)}
            tracingInputRef={tracingInputRef}
            onTracingUpload={handleTracingUpload}
          />
        </div>
        </>)}
      </div>

      {/* Toast */}
      {toast && (
        <div
          className="font-pixel fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-sm text-xs z-50 whitespace-nowrap border"
          style={{ background: CARD_BG, borderColor: NEON_MINT, color: NEON_MINT }}
        >
          {toast}
        </div>
      )}

      {showSketchbook && (
        <SketchbookModal userName={userName} onClose={() => setShowSketchbook(false)} />
      )}

      {/* 전체 지우기 확인 모달 */}
      {showClearModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowClearModal(false)}
        >
          <div
            className="rounded-sm border px-8 py-8 flex flex-col items-center gap-6 mx-4"
            style={{ maxWidth: 360, width: '100%', background: CARD_BG, borderColor: CARD_BORDER }}
            onClick={e => e.stopPropagation()}
          >
            <div
              className="w-16 h-16 rounded-sm border flex items-center justify-center text-3xl"
              style={{ background: '#1a2025', borderColor: NEON_PINK }}
            >
              🗑️
            </div>

            <div className="text-center flex flex-col gap-2">
              <p className="font-pixel text-base" style={{ color: NEON_PINK }}>캔버스를 전체 지울까요?</p>
              <p className="text-sm text-[#94a3b8] leading-relaxed">
                지금까지 그린 그림이 모두 사라져요.<br />
                이 작업은 되돌릴 수 있어요.
              </p>
            </div>

            <div className="flex gap-3 w-full">
              <button
                onClick={() => setShowClearModal(false)}
                className="flex-1 py-3 rounded-sm border text-sm font-semibold transition-colors active:scale-[0.97]"
                style={{ borderColor: CARD_BORDER, background: 'transparent', color: '#e2e8f0' }}
              >
                취소
              </button>
              <button
                onClick={handleClearAll}
                className="flex-1 py-3 rounded-sm border text-sm font-semibold transition-colors active:scale-[0.97]"
                style={{ borderColor: NEON_PINK, background: NEON_PINK, color: '#000000' }}
              >
                전체 지우기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 이전 단계 확인 모달 */}
      {showBackModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
        >
          <div
            className="rounded-sm border px-8 py-8 flex flex-col items-center gap-6 mx-4"
            style={{ maxWidth: 380, width: '100%', background: CARD_BG, borderColor: CARD_BORDER }}
          >
            {/* 아이콘 */}
            <div
              className="w-16 h-16 rounded-sm border flex items-center justify-center text-3xl"
              style={{ background: '#1a2025', borderColor: NEON_MINT }}
            >
              🖌️
            </div>

            {/* 메시지 */}
            <div className="text-center flex flex-col gap-2">
              <p className="font-pixel text-base" style={{ color: NEON_MINT }}>크기 선택 화면으로 돌아갈까요?</p>
              <p className="text-sm text-[#94a3b8] leading-relaxed">
                캔버스 크기 선택 화면으로 돌아가요.<br />
                다시 크기를 고르면 지금 그린 그림이<br />
                사라질 수 있어요. 정말 돌아갈까요?
              </p>
            </div>

            {/* 버튼 */}
            <div className="flex gap-3 w-full">
              <button
                onClick={() => setShowBackModal(false)}
                className="flex-1 py-3 rounded-sm border text-sm font-semibold transition-colors active:scale-[0.97]"
                style={{ borderColor: CARD_BORDER, background: 'transparent', color: '#e2e8f0' }}
              >
                취소
              </button>
              <button
                onClick={() => { setShowBackModal(false); onGoToSetup() }}
                className="flex-1 py-3 rounded-sm border text-sm font-semibold transition-colors active:scale-[0.97]"
                style={{ borderColor: NEON_MINT, background: NEON_MINT, color: '#000000' }}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
