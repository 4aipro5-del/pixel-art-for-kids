const ACCENT = '#f7d070'
const DANGER = '#f87171'
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

const TOOLS = [
  { id: 'pen',        iconSrc: '/images/draw.png',       title: '펜' },
  { id: 'eraser',     iconSrc: '/images/eraser.png',      title: '지우개' },
  { id: 'eyedropper', iconSrc: '/images/eyedropper.png',  title: '스포이드' },
]

const ACTIONS = [
  { id: 'clear',     iconSrc: '/images/trash.png',     title: '전체 지우기' },
  { id: 'png',       iconSrc: '/images/downloads.png', title: 'PNG 저장' },
  { id: 'sketchbook', iconSrc: '/images/photo.png',      title: '스케치북' },
  { id: 'doan',      iconSrc: '/images/doan.png',       title: '도안 만들기' },
]

export default function MobileEditorControls({
  tool,
  onToolChange,
  onEyedropper,
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
  const actionHandlers = { clear: onClearAll, png: onSavePNG, sketchbook: onSaveSketchbook, doan: onOpenDoan }

  return (
    <div className="md:hidden flex-shrink-0 shadow-[0_-8px_24px_rgba(0,0,0,0.35)]" style={{ background: PANEL_BG, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
      <div
        className="px-3 pt-2 pb-3"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      >
        <div className="grid grid-cols-3 gap-1.5">
          {TOOLS.map(t => {
            const active = tool === t.id
            return (
              <button
                key={t.id}
                onClick={() => t.id === 'eyedropper' ? onEyedropper() : onToolChange(t.id)}
                title={t.title}
                className="flex items-center justify-center h-11 rounded-full transition-colors duration-200 active:scale-95"
                style={{ background: active ? ACCENT : 'transparent' }}
              >
                <img src={t.iconSrc} alt={t.title} className={`w-5 h-5 ${active ? '' : 'invert'}`} />
              </button>
            )
          })}
        </div>

        <div className="mt-2 flex items-center gap-2 overflow-x-auto header-scrollbar pb-1">
          <div
            className="w-10 h-10 rounded-lg border flex-shrink-0"
            style={{ background: selectedColor, borderColor: 'rgba(255,255,255,0.15)' }}
          />
          {[...PASTEL_COLORS, ...recentColors].filter((color, index, all) => all.indexOf(color) === index).map(color => (
            <button
              key={color}
              onClick={() => onColorChange(color)}
              aria-label={`${color} 색상 선택`}
              className="w-9 h-9 rounded-lg border flex-shrink-0 active:scale-95"
              style={{
                background: color,
                borderColor: 'rgba(255,255,255,0.15)',
                outline: selectedColor === color ? `2.5px solid ${ACCENT}` : 'none',
                outlineOffset: '2px',
              }}
            />
          ))}
          <label
            className="h-9 px-3 rounded-full text-xs font-semibold text-gray-400 flex items-center flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.04)' }}
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
          {ACTIONS.map(a => (
            <button
              key={a.id}
              onClick={actionHandlers[a.id]}
              title={a.title}
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 active:scale-95 transition-colors"
              style={{ background: 'rgba(255,255,255,0.06)' }}
            >
              <img src={a.iconSrc} alt={a.title} className="w-4 h-4 invert" />
            </button>
          ))}
          <label
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 active:scale-95"
            style={{ background: 'rgba(255,255,255,0.06)' }}
            title="밑그림"
          >
            <img src="/images/tracing.png" alt="밑그림" className="w-4 h-4 invert" />
            <input
              ref={tracingInputRef}
              type="file"
              accept="image/png, image/jpeg"
              className="hidden"
              onChange={onTracingUpload}
            />
          </label>
        </div>

        {tracingImage && (
          <div className="mt-2 flex items-center gap-2">
            <span className="w-12 text-xs font-bold text-gray-400">밑그림</span>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(tracingOpacity * 100)}
              onChange={e => onTracingOpacityChange(Number(e.target.value) / 100)}
              className="flex-1 cursor-pointer"
              style={{ accentColor: ACCENT }}
            />
            <button
              onClick={onTracingRemove}
              className="h-8 rounded-full px-3 text-xs font-semibold transition-colors active:scale-[0.97]"
              style={{ background: 'rgba(255,255,255,0.08)', color: DANGER }}
            >
              지우기
            </button>
          </div>
        )}

        <div className="mt-2 flex items-center gap-2">
          <span className="w-12 text-xs font-bold text-gray-400">확대</span>
          <input
            type="range"
            min={0.25}
            max={2}
            step={0.25}
            value={zoom}
            onChange={e => onZoomChange(Number(e.target.value))}
            className="flex-1 cursor-pointer"
            style={{ accentColor: ACCENT }}
          />
          <button
            onClick={onZoomReset}
            className="h-8 min-w-12 px-2 text-xs font-semibold hover:underline transition-colors"
            style={{ color: '#9ca3af' }}
          >
            {Math.round(zoom * 100)}%
          </button>
        </div>
      </div>
    </div>
  )
}
