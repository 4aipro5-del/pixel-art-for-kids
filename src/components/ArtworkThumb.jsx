import { useRef, useEffect } from 'react'

// pixels 2D 배열을 네이티브 해상도로 그린 뒤 CSS로 스케일 업
export default function ArtworkThumb({ pixels, cols, rows, size, fill = false }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !pixels?.length) return
    canvas.width = cols
    canvas.height = rows
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, cols, rows)
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (pixels[r]?.[c]) {
          ctx.fillStyle = pixels[r][c]
          ctx.fillRect(c, r, 1, 1)
        }
      }
    }
  }, [pixels, cols, rows])

  return (
    <canvas
      ref={canvasRef}
      style={
        fill
          ? { width: '100%', height: '100%', imageRendering: 'pixelated', display: 'block' }
          : { width: size ?? 72, height: size ?? 72, imageRendering: 'pixelated', display: 'block' }
      }
    />
  )
}
