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

  // 캔버스 backing store를 devicePixelRatio에 맞춰 설정 — 이렇게 해야
  // 0.5px 두께의 모눈 선이 화면 배율(HiDPI 등)에 상관없이 항상 선명하게 렌더링된다.
  // CSS 픽셀 크기(cssW/cssH)는 그대로 두고 실제 비트맵 해상도만 dpr배로 키운다.
  function applyCanvasSize(canvas, cssW, cssH) {
    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.round(cssW * dpr)
    canvas.height = Math.round(cssH * dpr)
    canvas.style.width = `${cssW}px`
    canvas.style.height = `${cssH}px`
    canvas.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  // ── ResizeObserver ────────────────────────────────────────────────────
  useEffect(() => {
    const resize = () => {
      const container = containerRef.current
      const canvas = canvasRef.current
      if (!container || !canvas) return
      const availW = container.clientWidth
      const availH = container.clientHeight
      const base = Math.max(1, Math.min(
        Math.floor(availW / gridCols),
        Math.floor(availH / gridRows),
      ))
      baseCellSizeRef.current = base
      cellSizeRef.current = Math.max(1, Math.round(base * zoomRef.current))
      applyCanvasSize(canvas, gridCols * cellSizeRef.current, gridRows * cellSizeRef.current)
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
    applyCanvasSize(canvas, gridCols * cellSizeRef.current, gridRows * cellSizeRef.current)
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
    // ctx에 dpr 스케일 transform이 걸려 있으므로, 그리기 좌표는 항상 CSS 픽셀 기준(backing store 크기가 아님)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, gridColsRef.current * cs, gridRowsRef.current * cs)
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

    // Convert clientX/Y → grid cell coords. clamp=true면 캔버스 밖 좌표도
    // 가장 가까운 가장자리 셀로 스냅한다 (드래그 중 커서가 캔버스 밖으로 나가도
    // 선이 끊기지 않고 가장자리까지 자연스럽게 이어지도록).
    const hitCell = (cx, cy, clamp = false) => {
      const rect = canvas.getBoundingClientRect()
      const cs = cellSizeRef.current
      const cols = gridColsRef.current
      const rows = gridRowsRef.current
      let c = Math.floor((cx - rect.left) / cs)
      let r = Math.floor((cy - rect.top) / cs)
      if (clamp) {
        c = Math.min(Math.max(c, 0), cols - 1)
        r = Math.min(Math.max(r, 0), rows - 1)
        return { r, c }
      }
      return (r >= 0 && r < rows && c >= 0 && c < cols) ? { r, c } : null
    }

    // 두 셀 사이를 브레젠험 알고리즘으로 보간 — 빠른 드래그로 mousemove 이벤트가
    // 듬성듬성 발생해도 시작점과 끝점 사이 모든 칸을 빠짐없이 채워 선이 끊기지 않게 한다.
    const bresenhamLine = (r0, c0, r1, c1) => {
      const points = []
      const dr = Math.abs(r1 - r0)
      const dc = Math.abs(c1 - c0)
      const sr = r0 < r1 ? 1 : -1
      const sc = c0 < c1 ? 1 : -1
      let err = dr - dc
      let r = r0
      let c = c0
      while (true) {
        points.push({ r, c })
        if (r === r1 && c === c1) break
        const e2 = 2 * err
        if (e2 > -dc) { err -= dc; r += sr }
        if (e2 < dr) { err += dr; c += sc }
      }
      return points
    }

    // Read actual rendered HEX from canvas pixel data (cell center)
    // Returns null on failure (tainted canvas, lost context, etc.)
    const readCanvasColor = (cell) => {
      try {
        const cs = cellSizeRef.current
        const dpr = window.devicePixelRatio || 1
        // getImageData는 ctx의 transform을 무시하고 backing store의 실제 픽셀을 읽으므로 dpr을 곱해준다
        const px = Math.floor((cell.c * cs + cs * 0.5) * dpr)
        const py = Math.floor((cell.r * cs + cs * 0.5) * dpr)
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

    // ── pointerdown ───────────────────────────────────────────────────
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

    // ── pointermove ──────────────────────────────────────────────────
    const onMove = (cx, cy) => {
      if (!drawing) return
      // 드래그 중에는 클램프된 좌표를 사용 — 커서가 캔버스 밖으로 나가도
      // 가장 가까운 가장자리 칸까지 선이 계속 이어진다.
      const cell = hitCell(cx, cy, true)
      if (lastCell && lastCell.r === cell.r && lastCell.c === cell.c) return
      if (lastCell) {
        // 시작점과 끝점 사이를 보간해 빠짐없이 채운다 (첫 점은 이미 칠해졌으므로 제외)
        const line = bresenhamLine(lastCell.r, lastCell.c, cell.r, cell.c)
        for (let i = 1; i < line.length; i++) paint(line[i])
      } else {
        paint(cell)
      }
      lastCell = cell
    }

    // ── pointerup / pointercancel ───────────────────────────────────────
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

    // Pointer Events + setPointerCapture: 마우스/터치/펜을 하나의 경로로 통합하고,
    // 캔버스 바깥으로 드래그가 나가거나 브라우저 밖에서 버튼을 놓아도 이 엘리먼트가
    // 계속 이벤트를 받도록 강제해 드래그 상태가 꼬이지 않게 한다.
    const onPointerDown = e => {
      if (e.pointerType === 'mouse' && e.button !== 0) return
      canvas.setPointerCapture(e.pointerId)
      onDown(e.clientX, e.clientY)
    }
    const onPointerMove = e => onMove(e.clientX, e.clientY)
    const onPointerUp = e => {
      onUp()
      if (canvas.hasPointerCapture?.(e.pointerId)) canvas.releasePointerCapture(e.pointerId)
    }

    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('pointerup', onPointerUp)
    canvas.addEventListener('pointercancel', onPointerUp)

    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerup', onPointerUp)
      canvas.removeEventListener('pointercancel', onPointerUp)
    }
  }, []) // ← 의도적 빈 deps: 모든 값을 ref로 읽으므로 재등록 불필요

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex overflow-auto"
      style={{ background: '#1a1c1e' }}
    >
      <div style={{ position: 'relative', margin: 'auto' }}>
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
            boxShadow: '0 12px 48px rgba(0,0,0,0.55)',
            border: '1px solid rgba(255,255,255,0.08)',
            display: 'block',
          }}
        />
      </div>
    </div>
  )
}
