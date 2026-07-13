const ACCENT_YELLOW = '#f7d070'
const PAGE_BG = '#1a1c1e'
const PANEL_BG = '#111214'
const SAVED_GREEN = '#86efac'

function Row({ icon, wide, children }) {
  return (
    <div
      className={`flex items-center gap-4 rounded-xl py-4 px-6 ${wide ? 'col-span-2' : ''}`}
      style={{ background: PANEL_BG }}
    >
      <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }}>
        {icon}
      </div>
      <p className="text-base text-gray-300 tracking-tight leading-snug">{children}</p>
    </div>
  )
}

function Icon({ src, alt }) {
  return <img src={src} alt={alt} className="w-8 h-8 invert flex-shrink-0" />
}

export default function HelpModal({ onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col"
        style={{ background: PAGE_BG, border: '1px solid rgba(255,255,255,0.08)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-end px-6 pt-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:text-white transition-colors"
            style={{ background: PANEL_BG }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 pt-0 pb-5 flex flex-col gap-5">

          <div className="flex flex-col gap-3">
            <p className="font-pixel text-lg font-bold tracking-tight" style={{ color: '#9ca3af' }}>
              저장 기능
            </p>

            <div className="grid grid-cols-2 gap-3">
              <Row
                wide
                icon={<span className="text-lg font-bold" style={{ color: SAVED_GREEN }}>✓</span>}
              >
                따로 저장 버튼을 안 눌러도 그릴 때마다{' '}
                <span className="font-bold" style={{ color: SAVED_GREEN }}>✓ 스케치북에 자동 저장됨</span>{' '}
                문구가 뜨며 실시간으로 보관돼요!
              </Row>

              <Row icon={<Icon src="/images/photo.png" alt="나의 스케치북" />}>
                내가 그린 작품들을 모아 보는 보관함을 열어요.
              </Row>

              <Row icon={<Icon src="/images/tracing.png" alt="밑그림 불러오기" />}>
                사진을 배경에 흐리게 깔아 따라 그릴 수 있어요.
              </Row>

              <Row icon={<Icon src="/images/downloads.png" alt="PNG 저장" />}>
                완성한 그림을 이미지 파일로 다운로드해요.
              </Row>

              <Row icon={<Icon src="/images/doan.png" alt="도안 만들기" />}>
                그림을 선과 숫자가 있는 컬러링 도안으로 바꿔요.
              </Row>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <p className="font-pixel text-lg font-bold tracking-tight" style={{ color: '#9ca3af' }}>
              나가기 기능
            </p>

            <Row icon={<Icon src="/images/home.png" alt="처음 화면으로" />}>
              새 그림을 그리도록 처음 화면으로 돌아가요.{' '}
              <span style={{ color: '#9ca3af' }}>(그린 그림은 자동 저장되니 걱정 마세요!)</span>
            </Row>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <button
            onClick={onClose}
            className="font-pixel w-full py-4 rounded-full text-lg text-black font-bold transition-all hover:brightness-105 active:scale-[0.98]"
            style={{ background: ACCENT_YELLOW }}
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}
