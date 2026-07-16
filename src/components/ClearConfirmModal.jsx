const DANGER = '#f87171'
const PANEL_BG = '#111214'

export default function ClearConfirmModal({ open, onCancel, onConfirm }) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={onCancel}
    >
      <div
        className="rounded-2xl px-8 py-8 flex flex-col items-center gap-6 mx-4"
        style={{ maxWidth: 360, width: '100%', background: PANEL_BG }}
        onClick={e => e.stopPropagation()}
      >
        <div
          className="w-16 h-16 rounded-full border-2 flex items-center justify-center"
          style={{ borderColor: DANGER }}
        >
          <img src="/images/trash.png" alt="전체 지우기" className="w-8 h-8 invert" />
        </div>

        <div className="text-center flex flex-col gap-2">
          <p className="font-pixel text-base text-white">캔버스를 전체 지울까요?</p>
          <p className="text-sm text-gray-400 leading-relaxed">
            지금까지 그린 그림이 모두 사라져요.<br />
            이 작업은 되돌릴 수 있어요.
          </p>
        </div>

        <div className="flex gap-3 w-full">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-full text-sm font-semibold transition-all active:scale-[0.97]"
            style={{ background: 'rgba(255,255,255,0.08)', color: '#e2e8f0' }}
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 rounded-full text-sm font-semibold transition-all active:scale-[0.97]"
            style={{ background: DANGER, color: '#000000' }}
          >
            전체 지우기
          </button>
        </div>
      </div>
    </div>
  )
}
