const ACCENT = '#f7d070'
const PANEL_BG = '#111214'

export default function BackConfirmModal({ open, onCancel, onConfirm }) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="rounded-2xl px-8 pt-6 pb-8 flex flex-col items-center gap-6 mx-4"
        style={{ maxWidth: 380, width: '100%', background: PANEL_BG }}
      >
        {/* 메시지 */}
        <div className="text-center flex flex-col gap-2">
          <p className="font-pixel text-base text-white">크기 선택 화면으로 돌아갈까요?</p>
          <p className="text-sm text-gray-400 leading-relaxed">
            캔버스 크기 선택 화면으로 돌아가요.<br />
            다시 크기를 고르면 지금 그린 그림이<br />
            사라질 수 있어요. 정말 돌아갈까요?
          </p>
        </div>

        {/* 버튼 */}
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
            style={{ background: ACCENT, color: '#000000' }}
          >
            확인
          </button>
        </div>
      </div>
    </div>
  )
}
