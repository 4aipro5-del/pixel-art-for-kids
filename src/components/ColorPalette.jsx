const PALETTE = [
  '#FFFFFF', '#C0C0C0', '#808080', '#000000',
  '#FF4444', '#FF8C00', '#FFD700', '#44CC44',
  '#00AAFF', '#4444FF', '#9933CC', '#FF44AA',
]

export default function ColorPalette({ selectedColor, onColorChange }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-white border-b border-gray-200 flex-shrink-0 overflow-x-auto">
      {/* Current color indicator */}
      <div
        className="w-9 h-9 rounded-xl border-2 border-gray-300 flex-shrink-0 shadow-inner"
        style={{ background: selectedColor }}
        title="현재 색상"
      />
      <div className="w-px h-7 bg-gray-200 flex-shrink-0 mx-1" />

      {/* Fixed palette chips */}
      {PALETTE.map(color => (
        <button
          key={color}
          onClick={() => onColorChange(color)}
          className="w-8 h-8 rounded-xl flex-shrink-0 transition-transform hover:scale-110 focus:outline-none"
          style={{
            background: color,
            border: selectedColor === color ? '3px solid #7c3aed' : '2px solid rgba(0,0,0,0.12)',
            transform: selectedColor === color ? 'scale(1.18)' : undefined,
            boxShadow: selectedColor === color ? '0 0 0 1px #a78bfa' : undefined,
          }}
          title={color}
        />
      ))}

      {/* Color picker */}
      <div className="relative flex-shrink-0 ml-1">
        <div
          className="w-8 h-8 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-xl cursor-pointer hover:border-purple-400 hover:text-purple-400 transition-colors select-none"
          title="직접 색상 선택"
        >
          +
        </div>
        <input
          type="color"
          value={selectedColor}
          onChange={e => onColorChange(e.target.value)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>
    </div>
  )
}
