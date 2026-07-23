import { useRef, useEffect, useState } from 'react'

export default function PixelCanvas({
  pixels, gridCols, gridRows,
  selectedColor, tool, brushSize, zoom,
  onCommit, onColorPick, onPaintComplete,
  tracingImage, tracingOpacity, tracingScale = 1,
  tracingOffset = { x: 0, y: 0 }, tracingMoveMode = false, onTracingOffsetChange,
}) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const pixelsRef = useRef(null)
  const cellSizeRef = useRef(20)
  const baseCellSizeRef = useRef(20)
  const tracingDragRef = useRef(null) // 밑그림 이동 드래그 중 { pointerId, startX, startY, startOffset }

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
  const tracingOffsetRef = useRef(tracingOffset)
  const onTracingOffsetChangeRef = useRef(onTracingOffsetChange)

  selectedColorRef.current = selectedColor
  toolRef.current = tool
  brushSizeRef.current = brushSize
  zoomRef.current = zoom
  onCommitRef.current = onCommit
  onColorPickRef.current = onColorPick
  onPaintCompleteRef.current = onPaintComplete
  gridColsRef.current = gridCols
  gridRowsRef.current = gridRows
  tracingOffsetRef.current = tracingOffset
  onTracingOffsetChangeRef.current = onTracingOffsetChange

  // 캔버스 실제 렌더 크기(cellSize)가 바뀌면(전체화면 진입/해제, 창 크기 변경, 확대 슬라이더 등)
  // 밑그림 드래그 오프셋도 같은 비율로 리스케일해야, 두 레이어가 같이 확대·이동한 것처럼 보인다.
  // 오프셋은 화면 px 절대값으로 저장되므로 그대로 두면 캔버스만 커지고 밑그림 위치는 고정돼 어긋난다.
  function rescaleTracingOffset(oldCellSize, newCellSize) {
    if (oldCellSize <= 0 || newCellSize === oldCellSize) return
    const off = tracingOffsetRef.current
    if (!off || (off.x === 0 && off.y === 0)) return
    const scale = newCellSize / oldCellSize
    onTracingOffsetChangeRef.current?.({ x: off.x * scale, y: off.y * scale })
  }

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
      const oldCellSize = cellSizeRef.current
      const newCellSize = Math.max(1, Math.round(base * zoomRef.current))
      cellSizeRef.current = newCellSize
      applyCanvasSize(canvas, gridCols * newCellSize, gridRows * newCellSize)
      redrawAll()
      rescaleTracingOffset(oldCellSize, newCellSize)
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
    const oldCellSize = cellSizeRef.current
    const newCellSize = Math.max(1, Math.round(baseCellSizeRef.current * zoom))
    cellSizeRef.current = newCellSize
    applyCanvasSize(canvas, gridCols * newCellSize, gridRows * newCellSize)
    redrawAll()
    rescaleTracingOffset(oldCellSize, newCellSize)
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

    // 렌더링과 동일한 규칙(null → 흰색)으로 정규화한 칸 색상 — 대소문자도 통일해
    // '#FFFFFF'(펜으로 칠한 흰색)와 null(칠한 적 없는 흰색)을 같은 색으로 취급한다.
    const getCellColor = (r, c) => (pixelsRef.current[r]?.[c] || '#ffffff').toLowerCase()

    // 페인트통: 클릭한 칸과 4방향으로 이어진 동일 색상 영역을 스택 기반 BFS로 한 번에 채운다.
    // 실제로 채운 칸이 있었는지를 반환해, 이미 같은 색인 영역을 클릭했을 때는 커밋을 건너뛴다.
    const floodFill = (cell) => {
      const rows = gridRowsRef.current
      const cols = gridColsRef.current
      const targetColor = getCellColor(cell.r, cell.c)
      const fillColor = selectedColorRef.current
      if (targetColor === fillColor.toLowerCase()) return false

      const ctx = canvas.getContext('2d')
      const cs = cellSizeRef.current
      const stack = [[cell.r, cell.c]]
      const visited = new Set()
      while (stack.length) {
        const [r, c] = stack.pop()
        if (r < 0 || r >= rows || c < 0 || c >= cols) continue
        const key = r * cols + c
        if (visited.has(key)) continue
        if (getCellColor(r, c) !== targetColor) continue
        visited.add(key)
        pixelsRef.current[r][c] = fillColor
        drawCell(ctx, r, c, cs)
        stack.push([r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1])
      }
      return true
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

      if (currentTool === 'bucket') {
        // ── 페인트통: 드래그로 이어그리지 않는 단일 클릭 동작 ──
        const changed = floodFill(cell)
        if (changed) {
          onCommitRef.current(pixelsRef.current.map(row => [...row]))
          onPaintCompleteRef.current(selectedColorRef.current)
        }
        return
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

  // ── 밑그림 이동(Pan) — 그리기 이벤트와는 완전히 분리된 별도 오버레이 엘리먼트가
  // tracingMoveMode일 때만 pointerEvents를 받아 처리한다. 이 모드가 꺼져 있으면
  // pointerEvents: 'none'이라 캔버스 드로잉에는 전혀 영향을 주지 않는다 — 이벤트 충돌 없음.
  // (다른 그리기 로직처럼 ref를 쓰지 않는 이유: 이 핸들러들은 JSX에 인라인으로 매 렌더
  // 새로 만들어지므로 tracingOffset/onTracingOffsetChange가 항상 최신 값이다.)
  // 호버 중엔 grab, 실제로 드래그하는 동안만 grabbing으로 바뀌도록 구분
  const [isPanningTracing, setIsPanningTracing] = useState(false)

  // 드래그 도중 이동 모드가 꺼지면(버튼을 다시 누르는 등) 드래그 상태가 붙잡혀 남지 않도록 정리
  useEffect(() => {
    if (!tracingMoveMode) {
      tracingDragRef.current = null
      setIsPanningTracing(false)
    }
  }, [tracingMoveMode])

  const handleTracingPointerDown = (e) => {
    if (!tracingMoveMode) return
    e.currentTarget.setPointerCapture(e.pointerId)
    tracingDragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startOffset: tracingOffset,
    }
    setIsPanningTracing(true)
  }
  const handleTracingPointerMove = (e) => {
    const drag = tracingDragRef.current
    if (!drag || drag.pointerId !== e.pointerId) return
    onTracingOffsetChange?.({
      x: drag.startOffset.x + (e.clientX - drag.startX),
      y: drag.startOffset.y + (e.clientY - drag.startY),
    })
  }
  const handleTracingPointerUp = (e) => {
    const drag = tracingDragRef.current
    if (!drag || drag.pointerId !== e.pointerId) return
    tracingDragRef.current = null
    setIsPanningTracing(false)
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex overflow-auto"
      style={{ background: '#1a1c1e' }}
    >
      <div style={{ position: 'relative', margin: 'auto', overflow: 'hidden' }}>
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
              // translate가 scale 바깥에 있어야 확대 배율과 무관하게 드래그한 픽셀만큼
              // 그대로 이동한다 (화면 이동량 = 실제 이동량, 1:1 드래그 느낌).
              transform: `translate(${tracingOffset.x}px, ${tracingOffset.y}px) scale(${tracingScale})`,
              transformOrigin: 'center',
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
        {/* 밑그림 이동 오버레이 — tracingMoveMode가 아니면 pointerEvents: 'none'이라
            아래 캔버스의 그리기 이벤트를 그대로 통과시킨다. */}
        {tracingImage && (
          <div
            onPointerDown={handleTracingPointerDown}
            onPointerMove={handleTracingPointerMove}
            onPointerUp={handleTracingPointerUp}
            onPointerCancel={handleTracingPointerUp}
            style={{
              position: 'absolute',
              inset: 0,
              touchAction: 'none',
              cursor: tracingMoveMode ? (isPanningTracing ? 'grabbing' : 'grab') : 'auto',
              pointerEvents: tracingMoveMode ? 'auto' : 'none',
            }}
          />
        )}
      </div>
    </div>
  )
}
