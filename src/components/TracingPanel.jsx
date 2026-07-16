const ACCENT = '#f7d070'
const PAGE_BG = '#1a1c1e'
const PANEL_BG = '#111214'

function SectionLabel({ children }) {
  return (
    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2.5">
      {children}
    </p>
  )
}

export default function TracingPanel({
  tracingImage,
  tracingScale,
  tracingVisible,
  onTracingScaleChange,
  onTracingVisibleToggle,
  onTracingReset,
}) {
  return (
    <div className="rounded-2xl p-3" style={{ background: PANEL_BG }}>
      <div className="flex items-center justify-between mb-2">
        <SectionLabel>밑그림 크기</SectionLabel>
        <span className="text-xs font-bold" style={{ color: ACCENT }}>
          {Math.round(tracingScale * 100)}%
        </span>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={50}
          max={300}
          step={5}
          value={Math.round(tracingScale * 100)}
          onChange={e => onTracingScaleChange(Number(e.target.value) / 100)}
          disabled={!tracingImage || !tracingVisible}
          className="flex-1 cursor-pointer disabled:cursor-not-allowed disabled:opacity-30"
          style={{ accentColor: ACCENT }}
        />
        <button
          onClick={onTracingVisibleToggle}
          disabled={!tracingImage}
          aria-label={tracingVisible ? '밑그림 숨기기' : '밑그림 보이기'}
          title={tracingVisible ? '밑그림 숨기기' : '밑그림 보이기'}
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ background: PAGE_BG, border: `1px solid ${tracingVisible ? 'rgba(255,255,255,0.15)' : ACCENT}` }}
        >
          <img
            src={tracingVisible ? '/images/eye.png' : '/images/hide.png'}
            alt={tracingVisible ? '밑그림 숨기기' : '밑그림 보이기'}
            className="w-5 h-5 invert"
          />
        </button>
      </div>
      <div className="flex justify-center mt-2 mb-3">
        <button
          onClick={onTracingReset}
          disabled={!tracingImage}
          className="font-pixel text-xs px-4 py-1.5 rounded-full transition-colors hover:brightness-125 disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ background: PAGE_BG, color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.15)' }}
        >
          초기화
        </button>
      </div>

      <div
        className="w-full aspect-square rounded-xl overflow-hidden flex items-center justify-center"
        style={{
          background: tracingImage ? '#ffffff' : PAGE_BG,
          border: tracingImage ? 'none' : '1px dashed rgba(255,255,255,0.15)',
        }}
      >
        {tracingImage ? (
          <img
            src={tracingImage}
            alt="원본 그림"
            className="w-full h-full object-contain"
          />
        ) : (
          <p className="text-xs text-gray-500 text-center px-4 leading-relaxed">
            밑그림을 불러오면<br />원본 이미지가 여기 보여요
          </p>
        )}
      </div>
    </div>
  )
}
