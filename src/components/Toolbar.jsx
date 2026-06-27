const TOOLS = [
  { id: 'pen',        icon: '✏️', label: '펜' },
  { id: 'eraser',     icon: '🧹', label: '지우개' },
  { id: 'eyedropper', icon: '💉', label: '스포이드' },
]

function ToolBtn({ active, onClick, icon, label, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all
        ${active
          ? 'bg-purple-100 text-purple-700 ring-1 ring-purple-300'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}
        disabled:opacity-30 disabled:cursor-not-allowed`}
    >
      <span className="text-base leading-none">{icon}</span>
      <span>{label}</span>
    </button>
  )
}

export default function Toolbar({
  tool, onToolChange,
  brushSize, onBrushSizeChange,
  onUndo, onRedo, canUndo, canRedo,
  onClearAll,
  userName,
}) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-2 bg-white border-b border-gray-200 flex-shrink-0 overflow-x-auto">

      {/* Brush size */}
      <div className="flex gap-1 pr-3 border-r border-gray-200">
        <button
          onClick={() => onBrushSizeChange(1)}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            brushSize === 1
              ? 'bg-purple-100 text-purple-700 ring-1 ring-purple-300'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          1칸
        </button>
        <button
          onClick={() => onBrushSizeChange(2)}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            brushSize === 2
              ? 'bg-purple-100 text-purple-700 ring-1 ring-purple-300'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          4칸
        </button>
      </div>

      {/* Tools */}
      <div className="flex gap-1 px-3 border-r border-gray-200">
        {TOOLS.map(t => (
          <ToolBtn
            key={t.id}
            active={tool === t.id}
            onClick={() => onToolChange(t.id)}
            icon={t.icon}
            label={t.label}
          />
        ))}
      </div>

      {/* Undo / Redo */}
      <div className="flex gap-1 px-3 border-r border-gray-200">
        <ToolBtn icon="↩️" label="되돌리기" onClick={onUndo} disabled={!canUndo} />
        <ToolBtn icon="↪️" label="다시하기" onClick={onRedo} disabled={!canRedo} />
      </div>

      {/* Clear */}
      <div className="flex gap-1 px-3 border-r border-gray-200">
        <button
          onClick={onClearAll}
          className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-gray-100 text-gray-600 hover:bg-red-100 hover:text-red-600 transition-all"
        >
          <span className="text-base leading-none">🗑️</span>
          <span>전체 지우기</span>
        </button>
      </div>

      <span className="ml-auto text-xs text-gray-400 font-semibold whitespace-nowrap pl-2">
        ✏️ {userName}
      </span>
    </div>
  )
}
