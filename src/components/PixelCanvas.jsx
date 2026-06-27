import { useRef, useEffect } from 'react'

export default function PixelCanvas({
  pixels, gridCols, gridRows,
  selectedColor, tool, brushSize, zoom,
  onCommit, onColorPick, onPaintComplete,
  tracingImage, tracingOpacity,
}) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const pixelsRef = useRef(null)
  const cellSizeRef = useRef(20)
  const baseCellSizeRef = useRef(20)

  // ── Stable refs (always current, no stale closures) ──────────────────
  const selectedColorRef = useRef(selectedColor)
  const toolRef = useRef(tool)
  const brushSizeRef = useRef(brushSize)
  const zoomRef = useRef(zoom)
  const onCommitRef = useRef(onCommit)
  const onColorPickRef = useRef(onColorPick)
  const onPaintCompleteRef = useRef(onPaintComplete)
  // gridCols/gridRows are also needed inside event handlers via refs
  const gridColsRef = useRef(gridCols)
  const gridRowsRef = useRef(gridRows)

  selectedColorRef.current = selectedColor
  toolRef.current = tool
  brushSizeRef.current = brushSize
  zoomRef.current = zoom
  onCommitRef.current = onCommit
  onColorPickRef.current = onColorPick
  onPaintCompleteRef.current = onPaintComplete
  gridColsRef.current = gridCols
  gridRowsRef.current = gridRows

  // ── Sync pixels prop → internal ref ──────────────────────────────────
  useEffect(() => {
    pixelsRef.current = pixels.map(row => [...row])
    redrawAll()
  }, [pixels]) // eslint-disable-line

  // ── ResizeObserver ────────────────────────────────────────────────────
  useEffect(() => {
    const resize = () => {
      const container = containerRef.current
      const canvas = canvasRef.current
      if (!container || !canvas) return
      const availW = container.clientWidth - 48
      const availH = container.clientHeight - 48
      const base = Math.max(1, Math.min(
        Math.floor(availW / gridCols),
        Math.floor(availH / gridRows),
      ))
      baseCellSizeRef.current = base
      cellSizeRef.current = Math.max(1, Math.round(base * zoomRef.current))
      canvas.width = gridCols * cellSizeRef.current
      canvas.height = gridRows * cellSizeRef.current
      redrawAll()
    }
    resize()
    const ro = new ResizeObserver(resize)
    if (containerRef.current) ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [gridCols, gridRows]) // eslint-disable-line

  // ── Zoom ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    cellSizeRef.current = Math.max(1, Math.round(baseCellSizeRef.current * zoom))
    canvas.width = gridCols * cellSizeRef.current
    canvas.height = gridRows * cellSizeRef.current
    redrawAll()
  }, [zoom]) // eslint-disable-line

  // ── Cursor ────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.style.cursor =
      tool === 'eyedropper' ? 'copy' :
      tool === 'eraser' ? 'cell' : 'crosshair'
  }, [tool])

  // ── Drawing helpers ───────────────────────────────────────────────────
  function redrawAll() {
    const canvas = canvasRef.current
    if (!canvas || !pixelsRef.current) return
    const ctx = canvas.getContext('2d')
    const cs = cellSizeRef.current
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    for (let r = 0; r < gridRowsRef.current; r++) {
      for (let c = 0; c < gridColsRef.current; c++) {
        drawCell(ctx, r, c, cs)
      }
    }
  }

  function drawCell(ctx, r, c, cs) {
    const x = c * cs
    const y = r * cs
    ctx.fillStyle = pixelsRef.current[r]?.[c] || '#ffffff'
    ctx.fillRect(x, y, cs, cs)
    if (cs >= 3) {
      ctx.strokeStyle = 'rgba(0,0,0,0.07)'
      ctx.lineWidth = 0.5
      ctx.strokeRect(x + 0.25, y + 0.25, cs - 0.5, cs - 0.5)
    }
  }

  // ── Event handlers (single useEffect, all refs-based) ─────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let drawing = false
    let lastCell = null
    let strokeColor = null  // pen 색상: 스트로크 시작 시 캡처, 완료 시 recent에 등록

    // Convert clientX/Y → grid cell coords
    const hitCell = (cx, cy) => {
      const rect = canvas.getBoundingClientRect()
      const cs = cellSizeRef.current
      const cols = gridColsRef.current
      const rows = gridRowsRef.current
      const c = Math.floor((cx - rect.left) / cs)
      const r = Math.floor((cy - rect.top) / cs)
      return (r >= 0 && r < rows && c >= 0 && c < cols) ? { r, c } : null
    }

    // Read actual rendered HEX from canvas pixel data (cell center)
    // Returns null on failure (tainted canvas, lost context, etc.)
    const readCanvasColor = (cell) => {
      try {
        const cs = cellSizeRef.current
        const px = Math.floor(cell.c * cs + cs * 0.5)
        const py = Math.floor(cell.r * cs + cs * 0.5)
        const ctx = canvas.getContext('2d')
        if (!ctx) return null
        const [r, g, b] = ctx.getImageData(px, py, 1, 1).data
        return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')
      } catch {
        return null
      }
    }

    // Paint one or four cells depending on brush size
    const paint = (cell) => {
      const ctx = canvas.getContext('2d')
      const cs = cellSizeRef.current
      const cols = gridColsRef.current
      const rows = gridRowsRef.current
      const t = toolRef.current
      const color = selectedColorRef.current
      const targets = brushSizeRef.current === 2
        ? [[cell.r, cell.c], [cell.r + 1, cell.c], [cell.r, cell.c + 1], [cell.r + 1, cell.c + 1]]
        : [[cell.r, cell.c]]
      targets.forEach(([br, bc]) => {
        if (br < 0 || br >= rows || bc < 0 || bc >= cols) return
        pixelsRef.current[br][bc] = t === 'eraser' ? null : color
        drawCell(ctx, br, bc, cs)
      })
    }

    // ── mousedown / touchstart ─────────────────────────────────────────
    const onDown = (cx, cy) => {
      const cell = hitCell(cx, cy)
      if (!cell) return

      const currentTool = toolRef.current  // read tool mode NOW from ref

      if (currentTool === 'eyedropper') {
        // ── EYEDROPPER (canvas fallback): read color → callback → never draw ──
        const picked = readCanvasColor(cell)
        if (picked !== null) {
          onColorPickRef.current(picked) // 색상 추출 성공 → EditorPage에 전달
        }
        // null이면 아무 동작 없이 eyedropper 모드 유지 (사용자가 다시 클릭 가능)
        return                           // 어떤 경우에도 그리기는 실행 안 함
      }

      // ── PEN / ERASER: start drawing ─────────────────────────────────
      drawing = true
      lastCell = cell
      // 펜일 때만 색상 캡처 (지우개는 null 유지)
      strokeColor = currentTool === 'pen' ? selectedColorRef.current : null
      paint(cell)
    }

    // ── mousemove / touchmove ──────────────────────────────────────────
    const onMove = (cx, cy) => {
      if (!drawing) return
      const cell = hitCell(cx, cy)
      if (!cell) return
      if (lastCell && lastCell.r === cell.r && lastCell.c === cell.c) return
      lastCell = cell
      paint(cell)
    }

    // ── mouseup / touchend / mouseleave ───────────────────────────────
    const onUp = () => {
      if (!drawing) return
      drawing = false
      lastCell = null
      onCommitRef.current(pixelsRef.current.map(row => [...row]))
      // 펜 스트로크 완료 시에만 최근 색상 등록
      if (strokeColor !== null) {
        onPaintCompleteRef.current(strokeColor)
        strokeColor = null
      }
    }

    const md = e => onDown(e.clientX, e.clientY)
    const mm = e => onMove(e.clientX, e.clientY)
    const ts = e => { e.preventDefault(); onDown(e.touches[0].clientX, e.touches[0].clientY) }
    const tm = e => { e.preventDefault(); onMove(e.touches[0].clientX, e.touches[0].clientY) }

    canvas.addEventListener('mousedown', md)
    canvas.addEventListener('mousemove', mm)
    canvas.addEventListener('mouseup', onUp)
    canvas.addEventListener('mouseleave', onUp)
    canvas.addEventListener('touchstart', ts, { passive: false })
    canvas.addEventListener('touchmove', tm, { passive: false })
    canvas.addEventListener('touchend', onUp)

    return () => {
      canvas.removeEventListener('mousedown', md)
      canvas.removeEventListener('mousemove', mm)
      canvas.removeEventListener('mouseup', onUp)
      canvas.removeEventListener('mouseleave', onUp)
      canvas.removeEventListener('touchstart', ts)
      canvas.removeEventListener('touchmove', tm)
      canvas.removeEventListener('touchend', onUp)
    }
  }, []) // ← 의도적 빈 deps: 모든 값을 ref로 읽으므로 재등록 불필요

  return (
    <div
      ref={containerRef}
      className="flex-1 flex items-center justify-center overflow-auto p-6"
      style={{ background: '#F3F4F6' }}
    >
      <div style={{ position: 'relative' }}>
        {tracingImage && (
          <img
            src={tracingImage}
            alt=""
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              opacity: tracingOpacity,
              pointerEvents: 'none',
            }}
          />
        )}
        <canvas
          ref={canvasRef}
          style={{
            touchAction: 'none',
            boxShadow: '0 4px 32px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)',
            border: '1px solid rgba(0,0,0,0.05)',
            display: 'block',
          }}
        />
      </div>
    </div>
  )
}
