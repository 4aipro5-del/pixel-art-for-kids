import { useState } from 'react'

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

// 밑그림 가이드처럼 세부 기능이 여러 개로 늘어난 카드만 접기/펼치기로 처리 — 평소엔 한 줄
// 요약만 보여줘서 화면이 복잡해 보이지 않고, 궁금하면 눌러서 나머지 기능을 볼 수 있게 한다.
function ExpandableRow({ icon, summary, details }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-xl col-span-2 overflow-hidden" style={{ background: PANEL_BG }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-4 py-4 px-6 text-left"
      >
        <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }}>
          {icon}
        </div>
        <p className="flex-1 text-base text-gray-300 tracking-tight leading-snug">{summary}</p>
        <span className="text-gray-500 text-xs flex-shrink-0">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="flex flex-col gap-1.5 pb-4 px-6 pl-[4.5rem]">
          {details.map((d, i) => (
            <p key={i} className="text-sm text-gray-400 leading-snug">· {d}</p>
          ))}
        </div>
      )}
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
              그리기 기능
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

              <ExpandableRow
                icon={<Icon src="/images/tracing.png" alt="밑그림 불러오기" />}
                summary="원하는 그림이나 사진을 불러와 밑그림으로 두고 따라 그릴 수 있어요."
                details={[
                  '사이드바에서 크기를 조절할 수 있어요.',
                  <>
                    눈 버튼(
                    <img src="/images/eye.png" alt="보이기" className="inline-block w-4 h-4 mx-0.5 invert align-text-bottom" />
                    : 보이기), (
                    <img src="/images/hide.png" alt="숨기기" className="inline-block w-4 h-4 mx-0.5 invert align-text-bottom" />
                    : 숨기기)으로 밑그림을 보이거나 숨길 수 있어요.
                  </>,
                ]}
              />

              <Row icon={<Icon src="/images/photo.png" alt="나의 스케치북" />}>
                내가 그린 작품들을 모아 보는 보관함을 열어요.
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
              캔버스 설정을 변경할 수 있도록 이전 화면으로 돌아가요.{' '}
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
