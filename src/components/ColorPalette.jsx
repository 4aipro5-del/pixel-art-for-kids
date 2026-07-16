const ACCENT = '#f7d070'
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

function SectionLabel({ children }) {
  return (
    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2.5">
      {children}
    </p>
  )
}

export default function ColorPalette({ selectedColor, onColorChange, recentColors }) {
  return (
    <div className="rounded-2xl p-3" style={{ background: PANEL_BG }}>
      <SectionLabel>색상</SectionLabel>

      {/* Active color preview */}
      <div
        className="w-full h-9 rounded-xl mb-3 border"
        style={{ background: selectedColor, borderColor: 'rgba(255,255,255,0.15)' }}
      />

      {/* Palette grid */}
      <div className="grid grid-cols-4 gap-1.5 mb-2.5">
        {PASTEL_COLORS.map(color => (
          <button
            key={color}
            onClick={() => onColorChange(color)}
            aria-label={`${color} 색상 선택`}
            className="aspect-square rounded-lg border transition-transform hover:scale-110 active:scale-95"
            style={{
              background: color,
              borderColor: 'rgba(255,255,255,0.15)',
              outline: selectedColor === color ? `3px solid ${ACCENT}` : 'none',
              outlineOffset: '2px',
            }}
          />
        ))}
      </div>

      {/* Recent colors */}
      {recentColors.length > 0 && (
        <div className="mb-2.5">
          <p className="text-xs text-gray-500 font-semibold mb-1.5">최근 사용</p>
          <div className="flex gap-1.5 flex-wrap">
            {recentColors.map((color, i) => (
              <button
                key={i}
                onClick={() => onColorChange(color)}
                aria-label={`${color} 최근 색상 선택`}
                className="w-7 h-7 rounded-lg border transition-transform hover:scale-110 active:scale-95"
                style={{
                  background: color,
                  borderColor: 'rgba(255,255,255,0.15)',
                  outline: selectedColor === color ? `3px solid ${ACCENT}` : 'none',
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
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-colors duration-200"
          style={{ background: 'rgba(255,255,255,0.04)' }}
        >
          <div
            className="w-3.5 h-3.5 rounded border border-dashed flex-shrink-0"
            style={{ background: selectedColor, borderColor: 'rgba(255,255,255,0.3)' }}
          />
          <span className="text-xs text-gray-400 font-medium">직접 선택…</span>
        </div>
        <input
          type="color"
          value={selectedColor === '#FFFFFF' ? '#FFFFFF' : selectedColor}
          onChange={e => onColorChange(e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer w-full"
        />
      </div>
    </div>
  )
}
