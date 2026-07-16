const ACCENT = '#f7d070'
const PANEL_BG = '#111214'

const TOOLS = [
  { id: 'pen',        iconSrc: '/images/draw.png',       title: '펜' },
  { id: 'eraser',     iconSrc: '/images/eraser.png',      title: '지우개' },
  { id: 'eyedropper', iconSrc: '/images/eyedropper.png',  title: '스포이드' },
]

function SectionLabel({ children }) {
  return (
    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2.5">
      {children}
    </p>
  )
}

export default function ToolPanel({
  tool,
  onToolChange,
  onEyedropper,
}) {
  return (
    <div className="rounded-2xl p-3" style={{ background: PANEL_BG }}>
      <SectionLabel>도구</SectionLabel>
      <div className="grid grid-cols-3 gap-1.5">
        {TOOLS.map(t => {
          const active = tool === t.id
          return (
            <button
              key={t.id}
              onClick={() => t.id === 'eyedropper' ? onEyedropper() : onToolChange(t.id)}
              title={t.title}
              className="flex items-center justify-center py-2.5 rounded-full transition-colors duration-200"
              style={{ background: active ? ACCENT : 'transparent' }}
            >
              <img src={t.iconSrc} alt={t.title} className={`w-6 h-6 ${active ? '' : 'invert'}`} />
            </button>
          )
        })}
      </div>
    </div>
  )
}
