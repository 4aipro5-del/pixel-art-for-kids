import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const ACCENT = '#f7d070'
const PAGE_BG = '#1a1c1e'

function HeaderBtn({ onClick, disabled, children, title, variant = 'ghost', iconOnly = true, size = 'md', className = 'inline-flex' }) {
  const base = 'font-pixel flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed select-none whitespace-nowrap shrink-0'
  const iconSizes = { md: 'w-9 h-9 md:w-10 md:h-10 rounded-full text-lg', lg: 'w-10 h-10 md:w-11 md:h-11 rounded-full text-lg' }
  const shape = iconOnly ? iconSizes[size] : 'gap-2 px-4 md:px-5 py-2 md:py-2.5 rounded-full text-xs md:text-sm'
  const styles = {
    ghost:   'bg-[#111214] text-white hover:brightness-125',
    danger:  'bg-[#111214] text-white hover:text-red-400',
    primary: 'bg-[#f7d070] text-black font-bold hover:brightness-105',
  }
  const btnRef = useRef(null)
  const [tooltipPos, setTooltipPos] = useState(null)

  const showTooltip = () => {
    if (!title || !btnRef.current) return
    const rect = btnRef.current.getBoundingClientRect()
    setTooltipPos({ top: rect.bottom + 8, left: rect.left + rect.width / 2 })
  }
  const hideTooltip = () => setTooltipPos(null)

  return (
    <div className={className}>
      <button
        ref={btnRef}
        onClick={onClick}
        disabled={disabled}
        aria-label={title}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        className={`${base} ${shape} ${styles[variant]}`}
      >
        {children}
      </button>
      {tooltipPos && createPortal(
        <span
          className="font-pixel-kr pointer-events-none fixed z-[999] -translate-x-1/2 whitespace-nowrap rounded-md px-2 py-1 text-[10px] text-white"
          style={{ top: tooltipPos.top, left: tooltipPos.left, background: '#000000' }}
        >
          {title}
        </span>,
        document.body
      )}
    </div>
  )
}

export default function EditorHeader({
  userName,
  canUndo,
  canRedo,
  uploading,
  onBack,
  onUndo,
  onRedo,
  onClearAll,
  onSavePNG,
  onSaveSketchbook,
  onOpenDoan,
  onShareWall,
  onTracingUpload,
}) {
  return (
    <header className="flex-shrink-0 z-10 h-14 md:h-16 overflow-x-auto header-scrollbar" style={{ background: PAGE_BG, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="flex items-center justify-between gap-3 px-3 md:px-6 h-full min-w-max">

        {/* Brand + 이전 단계 */}
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          <span
            className="font-pixel text-lg md:text-2xl tracking-tight whitespace-nowrap inline-block leading-none"
            style={{ color: ACCENT, transform: 'translateY(0.3em)' }}
          >
            PIXEL ART
          </span>
          <HeaderBtn onClick={onBack} title="이전 단계" size="lg">
            <img src="/images/home.png" alt="이전 단계" className="w-5 h-5 md:w-6 md:h-6 invert" />
          </HeaderBtn>
          <span className="hidden sm:inline text-sm text-white/40 font-medium whitespace-nowrap">{userName}</span>
        </div>

        {/* Edit controls */}
        <div className="flex items-center gap-2 shrink-0">
          <HeaderBtn onClick={onUndo} disabled={!canUndo} title="되돌리기">
            <img src="/images/undo.png" alt="되돌리기" className="w-4 h-4 md:w-5 md:h-5 invert scale-x-[-1]" />
          </HeaderBtn>
          <HeaderBtn onClick={onRedo} disabled={!canRedo} title="다시하기">
            <img src="/images/undo.png" alt="다시하기" className="w-4 h-4 md:w-5 md:h-5 invert" />
          </HeaderBtn>
          <div className="w-px h-5 mx-1 shrink-0" style={{ background: 'rgba(255,255,255,0.1)' }} />
          <HeaderBtn onClick={onClearAll} variant="danger" title="전체 지우기">
            <img src="/images/trash.png" alt="전체 지우기" className="w-4 h-4 md:w-5 md:h-5 invert" />
          </HeaderBtn>
        </div>

        {/* Save actions */}
        <div className="hidden md:flex items-center gap-2 shrink-0">
          <label
            title="밑그림 불러오기"
            className="font-pixel flex items-center justify-center w-9 h-9 md:w-10 md:h-10 rounded-full text-lg transition-colors bg-[#111214] text-white hover:brightness-125 cursor-pointer select-none shrink-0"
          >
            <img src="/images/tracing.png" alt="밑그림 불러오기" className="w-5 h-5 invert" />
            <input
              type="file"
              accept="image/png, image/jpeg"
              className="hidden"
              onChange={onTracingUpload}
            />
          </label>
          <HeaderBtn onClick={onSavePNG} title="PNG 저장">
            <img src="/images/downloads.png" alt="PNG 저장" className="w-5 h-5 invert" />
          </HeaderBtn>
          <HeaderBtn onClick={onSaveSketchbook} title="나의 스케치북">
            <img src="/images/photo.png" alt="나의 스케치북" className="w-5 h-5 invert" />
          </HeaderBtn>
          <HeaderBtn onClick={onOpenDoan} title="도안 만들기">
            <img src="/images/doan.png" alt="도안 만들기" className="w-5 h-5 invert" />
          </HeaderBtn>
          <HeaderBtn onClick={onShareWall} disabled={uploading} variant="primary" iconOnly={false} title="담벼락 공유">
            {uploading ? '올리는 중…' : '↗ 담벼락 공유'}
          </HeaderBtn>
        </div>

        <HeaderBtn onClick={onShareWall} disabled={uploading} variant="primary" iconOnly={false} className="md:hidden inline-flex" title="담벼락 공유">
          {uploading ? '중…' : '공유'}
        </HeaderBtn>

      </div>
    </header>
  )
}
