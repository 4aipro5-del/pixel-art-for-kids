import { useEffect, useState } from 'react'

const STORAGE_KEY = 'pixel_art_sketchbook'

// localStorage에서 내 이름과 일치하는 항목만 필터링해서 읽어온다 — 모달을 열 때마다
// 이 함수로 매번 새로 읽어야, 그림을 그리다 방금 나가기 직전 저장한 최신 상태가
// (캐시된 옛 State가 아니라) 확실히 반영된다.
function loadSketchbookItems(userName) {
  const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  return all.filter(item => item.userName === userName)
}

export default function SketchbookModal({ userName, onClose, onEdit }) {
  // 초기 렌더부터 곧바로 최신 데이터로 채워, "0개의 작품"이 잠깐이라도 보이는 깜빡임 없이 시작한다.
  const [items, setItems] = useState(() => loadSketchbookItems(userName))

  // 모달은 열릴 때마다 완전히 새로 mount되지만(showSketchbook 조건부 렌더링), 혹시라도
  // userName이 바뀌거나 다시 열리는 타이밍에 대비해 한 번 더 확실하게 최신 상태로 동기화한다.
  useEffect(() => {
    setItems(loadSketchbookItems(userName))
  }, [userName])

  const handleDelete = (id) => {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all.filter(i => i.id !== id)))
    setItems(prev => prev.filter(i => i.id !== id))
  }

  const handleDownload = (item) => {
    const a = document.createElement('a')
    a.href = item.dataUrl
    a.download = `픽셀아트_${userName}_${item.id}.png`
    a.click()
  }

  const handleEdit = (item) => {
    onEdit({
      id: item.id,
      pixels: item.pixels,
      cols: item.cols,
      rows: item.rows,
      fileName: item.fileName || `픽셀아트_${userName}_${item.id}`,
    })
  }

  return (
    <div
      className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl min-h-[400px] max-h-[80vh] flex flex-col border border-gray-100">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="text-base font-black text-gray-900">내 스케치북</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {items.length}개의 작품 · 클릭해서 이어 그리기
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 text-sm transition-colors"
          >
            ✕
          </button>
        </div>

        {/* 빈 상태 문구 — 헤더 아래 콘텐츠 영역만 기준으로 중앙 정렬하면 헤더 높이만큼 아래로
            치우쳐 보여서, 모달 전체(inset-0)를 기준으로 절대 위치시켜 창 정중앙에 오도록 한다.
            pointer-events-none이라 뒤에 있는 헤더의 닫기 버튼 클릭은 그대로 통과된다. */}
        {items.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-gray-300">
            <p className="font-pixel-kr text-lg sm:text-xl font-bold text-gray-400">아직 저장된 그림이 없어요</p>
            <p className="font-pixel-kr text-xs text-gray-300 mt-1">그림을 그리면 자동으로 저장돼요!</p>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-auto p-5">
          {items.length === 0 ? null : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {items.map(item => (
                <div
                  key={item.id}
                  className="rounded-xl overflow-hidden border border-gray-100 hover:border-[#fdd835] transition-all group bg-gray-50 cursor-pointer"
                  onClick={() => handleEdit(item)}
                >
                  <div className="aspect-square flex items-center justify-center p-2 relative bg-white">
                    <img
                      src={item.dataUrl}
                      alt="saved"
                      className="max-w-full max-h-full"
                      style={{ imageRendering: 'pixelated' }}
                    />
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-gray-900/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEdit(item) }}
                        className="w-8 h-8 bg-white rounded-xl flex items-center justify-center hover:bg-[#fdd835] transition-colors"
                        title="편집하기"
                      >
                        <img src="/images/draw.png" alt="편집하기" className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDownload(item) }}
                        className="w-8 h-8 bg-white rounded-xl flex items-center justify-center text-gray-700 hover:bg-gray-100 text-sm transition-colors"
                        title="다운로드"
                      >↓</button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(item.id) }}
                        className="w-8 h-8 bg-white rounded-xl flex items-center justify-center text-red-500 hover:bg-red-50 text-sm transition-colors"
                        title="삭제"
                      >✕</button>
                    </div>
                  </div>
                  <div className="px-2.5 py-2 bg-gray-50">
                    <p className="text-[10px] text-gray-600 font-bold truncate">
                      {item.fileName || `${item.cols}×${item.rows}칸`}
                    </p>
                    <p className="text-[10px] text-gray-400">
                      {new Date(item.updatedAt || item.createdAt).toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' })} · {item.cols}×{item.rows}칸
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
