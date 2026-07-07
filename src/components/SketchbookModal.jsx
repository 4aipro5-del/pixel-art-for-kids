import { useState } from 'react'

const STORAGE_KEY = 'pixelart_sketchbook'

// 예전 버전에서 저장된 항목은 pixels가 없고 dataUrl(PNG 스냅샷)만 있다.
// PNG가 항상 cols×rows 원본 해상도로 저장돼 있으므로(getDataURL() 기본값),
// 이미지를 다시 캔버스에 그려 픽셀 단위로 색상을 읽어 grid 데이터를 복원한다.
function reconstructPixelsFromDataUrl(dataUrl, cols, rows) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      try {
        const off = document.createElement('canvas')
        off.width = cols
        off.height = rows
        const ctx = off.getContext('2d')
        ctx.imageSmoothingEnabled = false
        ctx.drawImage(img, 0, 0, cols, rows)
        const { data } = ctx.getImageData(0, 0, cols, rows)
        const pixels = []
        for (let r = 0; r < rows; r++) {
          const row = []
          for (let c = 0; c < cols; c++) {
            const i = (r * cols + c) * 4
            const [red, green, blue, alpha] = [data[i], data[i + 1], data[i + 2], data[i + 3]]
            row.push(alpha === 0 || (red === 255 && green === 255 && blue === 255)
              ? null
              : '#' + [red, green, blue].map(v => v.toString(16).padStart(2, '0')).join(''))
          }
          pixels.push(row)
        }
        resolve(pixels)
      } catch (err) {
        reject(err)
      }
    }
    img.onerror = reject
    img.src = dataUrl
  })
}

export default function SketchbookModal({ userName, onClose, onEdit }) {
  const [items, setItems] = useState(() => {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    return all.filter(item => item.userName === userName)
  })
  const [loadingId, setLoadingId] = useState(null)

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

  const handleEdit = async (item) => {
    if (loadingId) return
    setLoadingId(item.id)
    try {
      const pixels = item.pixels || await reconstructPixelsFromDataUrl(item.dataUrl, item.cols, item.rows)
      onEdit({
        pixels,
        cols: item.cols,
        rows: item.rows,
        ratio: item.ratio,
        orientation: item.orientation,
        fileName: item.fileName || `픽셀아트_${userName}_${item.id}`,
      })
    } catch (err) {
      console.error(err)
      alert('그림을 불러오지 못했어요. 다시 시도해주세요.')
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col border border-gray-100">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="text-base font-black text-gray-900">내 스케치북</h2>
            <p className="text-xs text-gray-400 mt-0.5">{items.length}개의 작품 · 클릭해서 이어 그리기</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 text-sm transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-5">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-gray-300">
              <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center text-2xl">📭</div>
              <div className="text-center">
                <p className="text-sm font-bold text-gray-400">아직 저장된 그림이 없어요</p>
                <p className="text-xs text-gray-300 mt-1">스케치북 저장 버튼으로 그림을 저장해보세요!</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {items.map(item => {
                const isLoading = loadingId === item.id
                return (
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
                      {isLoading && (
                        <div className="absolute inset-0 bg-white/70 flex items-center justify-center text-xs font-bold text-gray-500">
                          불러오는 중…
                        </div>
                      )}
                    </div>
                    <div className="px-2.5 py-2 bg-gray-50">
                      <p className="text-[10px] text-gray-600 font-bold truncate">
                        {item.fileName || `${item.cols}×${item.rows}칸`}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {new Date(item.updatedAt || item.createdAt).toLocaleDateString('ko-KR')} · {item.cols}×{item.rows}칸
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
