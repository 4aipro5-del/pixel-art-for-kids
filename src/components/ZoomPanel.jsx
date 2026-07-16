const ACCENT = '#f7d070'
const PANEL_BG = '#111214'

function SectionLabel({ children }) {
  return (
    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2.5">
      {children}
    </p>
  )
}

export default function ZoomPanel({ zoom, onZoomChange, onZoomReset }) {
  return (
    <div className="rounded-2xl p-3" style={{ background: PANEL_BG }}>
      <div className="flex items-center justify-between mb-2.5">
        <SectionLabel>확대 / 축소</SectionLabel>
        <span
          className="text-xs font-bold mb-2.5"
          style={{ color: ACCENT }}
        >
          {Math.round(zoom * 100)}%
        </span>
      </div>
      <input
        type="range"
        min={0.25}
        max={2}
        step={0.25}
        value={zoom}
        onChange={e => onZoomChange(Number(e.target.value))}
        className="w-full cursor-pointer"
        style={{ accentColor: ACCENT }}
      />
      <div className="flex justify-between items-center mt-1.5">
        <span className="text-xs text-gray-500">25%</span>
        <button
          onClick={onZoomReset}
          className="text-xs font-semibold hover:underline transition-colors"
          style={{ color: '#9ca3af' }}
        >
          초기화
        </button>
        <span className="text-xs text-gray-500">200%</span>
      </div>
    </div>
  )
}
