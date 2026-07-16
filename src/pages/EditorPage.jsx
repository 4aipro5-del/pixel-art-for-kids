import { useState, useCallback, useRef, useEffect } from 'react'
import PixelCanvas from '../components/PixelCanvas'
import SketchbookModal from '../components/SketchbookModal'
import DoanView from '../components/DoanView'
import ClearConfirmModal from '../components/ClearConfirmModal'
import BackConfirmModal from '../components/BackConfirmModal'
import ToolPanel from '../components/ToolPanel'
import ColorPalette from '../components/ColorPalette'
import TracingPanel from '../components/TracingPanel'
import ZoomPanel from '../components/ZoomPanel'
import EditorHeader from '../components/EditorHeader'
import MobileEditorControls from '../components/MobileEditorControls'
import { saveArtwork, uploadWallPost } from '../supabase'

const MAX_HISTORY = 20
const SKETCHBOOK_KEY = 'pixelart_sketchbook'
const ACCENT = '#f7d070'
const PAGE_BG = '#1a1c1e'
const PANEL_BG = '#111214'

// 쨍한 원색 톤 기본 12색 팔레트
const PASTEL_COLORS = [
  '#EF4444', // 빨강  red-500
  '#F97316', // 주황  orange-500
  '#FACC15', // 노랑  yellow-400
  '#84CC16', // 연두  lime-500
  '#16A34A', // 초록  green-600
  '#0EA5E9', // 하늘  sky-500
  '#2563EB', // 파랑  blue-600
  '#9333EA', // 보라  purple-600
  '#78350F', // 갈색  amber-900
  '#FFFFFF', // 흰색
  '#9CA3AF', // 회색  gray-400
  '#000000', // 검은색
]

function makeEmpty(rows, cols) {
  return Array(rows).fill(null).map(() => Array(cols).fill(null))
}

export default function EditorPage({ userName, gridCols, gridRows, resumeArtwork, onGoToWall, onGoToSetup }) {
  const [pixels, setPixels] = useState(() => (
    resumeArtwork?.pixels ? resumeArtwork.pixels.map(row => [...row]) : makeEmpty(gridRows, gridCols)
  ))
  // 이번 편집 세션 동안 저장이 계속 덮어써야 할 artworks 행의 id. 이어그리기로 들어왔으면 그
  // 작품의 id를 그대로 물려받고, 새 캔버스면 null로 시작해 첫 저장 때 insert로 새로 발급받는다 —
  // 그 이후의 모든 저장은 이 id로 update되어, 세션당 중복 행이 쌓이지 않는다.
  const artworkIdRef = useRef(resumeArtwork?.id ?? null)
  const [history, setHistory] = useState([])
  const [future, setFuture] = useState([])
  const [selectedColor, setSelectedColor] = useState(PASTEL_COLORS[0])
  const [recentColors, setRecentColors] = useState([])
  const [tool, setTool] = useState('pen')
  const brushSize = 1 // 브러시 크기 선택 기능 제거 — 1칸 고정
  const [zoom, setZoom] = useState(1)
  const [showSketchbook, setShowSketchbook] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [showBackModal, setShowBackModal] = useState(false)
  const [showClearModal, setShowClearModal] = useState(false)
  const [doanMode, setDoanMode] = useState(false)
  const [toast, setToast] = useState(null)
  const [tracingImage, setTracingImage] = useState(null)
  const [tracingOpacity, setTracingOpacity] = useState(0.25)
  const [tracingScale, setTracingScale] = useState(1)
  const [tracingVisible, setTracingVisible] = useState(true)
  const toastTimer = useRef(null)
  const prevToolRef = useRef('pen')  // eyedrop 취소 시 이전 도구 복원용
  const tracingInputRef = useRef(null)

  // 밑그림이 사라지면(전체 지우기·되돌리기 등으로 tracingImage → null) 크기/보이기 상태도 기본값으로 리셋
  useEffect(() => {
    if (!tracingImage) {
      setTracingScale(1)
      setTracingVisible(true)
    }
  }, [tracingImage])

  const handleTracingUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      alert('PNG 또는 JPG 파일만 업로드할 수 있어요!')
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
      // 픽셀 데이터도 artworks 테이블에 저장(진입 화면 갤러리 + 이어그리기용) — 이 세션의
      // artworkIdRef가 있으면 그 행을 덮어쓰고, 없으면 새로 만들어 이후 저장에 이어서 쓴다.
      saveArtwork(userName, pixels, gridCols, gridRows, artworkIdRef.current)
        .then(id => { artworkIdRef.current = id })
        .catch(console.warn)
      showToast('담벼락에 올렸어요!')
      onGoToWall()
    } catch (err) {
      console.error(err)
      showToast('업로드 실패. 잠시 후 다시 시도해주세요.')
    } finally {
      setUploading(false)
    }
  }

  const handleOpenDoan = () => {
    // 도안 만들기 진입 시 작품 저장 (이어그리기 세션이면 같은 행을 덮어씀)
    saveArtwork(userName, pixels, gridCols, gridRows, artworkIdRef.current)
      .then(id => { artworkIdRef.current = id })
      .catch(console.warn)
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
      if (e.key === '=') { e.preventDefault(); setZoom(z => Math.min(2, +(z + 0.25).toFixed(2))) }
      if (e.key === '-') { e.preventDefault(); setZoom(z => Math.max(0.25, +(z - 0.25).toFixed(2))) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const canUndo = history.length > 0
  const canRedo = future.length > 0

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden" style={{ background: PAGE_BG }}>

      <EditorHeader
        userName={userName}
        canUndo={canUndo}
        canRedo={canRedo}
        uploading={uploading}
        onBack={() => setShowBackModal(true)}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onClearAll={() => setShowClearModal(true)}
        onSavePNG={handleSavePNG}
        onSaveSketchbook={handleSaveSketchbook}
        onOpenDoan={handleOpenDoan}
        onShareWall={handleShareWall}
        onTracingUpload={handleTracingUpload}
      />

      {/* ── Body ───────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {doanMode ? (
          <DoanView pixels={pixels} gridCols={gridCols} gridRows={gridRows} onClose={() => setDoanMode(false)} />
        ) : (<>

        {/* ── Left Sidebar ───────────────────────── */}
        <aside className="hidden md:flex w-60 flex-col flex-shrink-0 overflow-y-auto" style={{ background: PAGE_BG, borderRight: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex flex-col gap-4 p-4 flex-1">

            <ToolPanel
              tool={tool}
              onToolChange={setTool}
              onEyedropper={() => handleEyedrop(tool)}
            />

            <ColorPalette
              selectedColor={selectedColor}
              onColorChange={setSelectedColor}
              recentColors={recentColors}
            />

            <TracingPanel
              tracingImage={tracingImage}
              tracingScale={tracingScale}
              tracingVisible={tracingVisible}
              onTracingScaleChange={setTracingScale}
              onTracingVisibleToggle={() => setTracingVisible(v => !v)}
              onTracingReset={() => setTracingScale(1)}
            />

            {/* Spacer pushes 사용법 안내/줌을 하단으로 */}
            <div className="flex-1" />

            <button
              className="font-pixel flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-sm transition-colors hover:brightness-125"
              style={{ background: PANEL_BG, color: ACCENT, border: `1px solid ${ACCENT}` }}
            >
              ⓘ 사용법 안내
            </button>

            <ZoomPanel
              zoom={zoom}
              onZoomChange={setZoom}
              onZoomReset={() => setZoom(1)}
            />

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
            tracingScale={tracingScale}
            tracingVisible={tracingVisible}
          />

          <MobileEditorControls
            tool={tool}
            onToolChange={setTool}
            onEyedropper={() => handleEyedrop(tool)}
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
          className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl text-xs font-semibold shadow-xl z-50 whitespace-nowrap backdrop-blur-sm"
          style={{ background: PANEL_BG, color: ACCENT }}
        >
          {toast}
        </div>
      )}

      {showSketchbook && (
        <SketchbookModal userName={userName} onClose={() => setShowSketchbook(false)} />
      )}

      <ClearConfirmModal
        open={showClearModal}
        onCancel={() => setShowClearModal(false)}
        onConfirm={handleClearAll}
      />

      <BackConfirmModal
        open={showBackModal}
        onCancel={() => setShowBackModal(false)}
        onConfirm={() => { setShowBackModal(false); onGoToSetup() }}
      />
    </div>
  )
}
