import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ── Artworks (픽셀 데이터 저장 + 진입 화면 갤러리) ──────────────────────
// pixels는 jsonb 컬럼이라 2D 배열을 그대로 넘기면 된다(Firestore 때처럼 JSON.stringify 불필요).

// artworkId를 넘기면 그 행을 덮어쓰기(update)하고, 안 넘기면 새 행을 insert한다 —
// 어느 쪽이든 최종적으로 남은 행의 id를 반환하므로, 호출부는 첫 저장 후 그 id를
// 저장해두고 이어지는 저장부터 계속 같은 id로 update를 이어갈 수 있다(세션당 한 행 유지).
export async function saveArtwork(userName, pixels, cols, rows, artworkId = null) {
  if (!userName || !userName.trim()) throw new Error('작품을 저장하려면 이름이 필요해요.')
  if (!Array.isArray(pixels) || pixels.length === 0) throw new Error('저장할 그림 데이터가 없어요.')
  if (!Number.isInteger(cols) || cols <= 0 || !Number.isInteger(rows) || rows <= 0) {
    throw new Error('캔버스 크기(cols/rows) 정보가 올바르지 않아요.')
  }

  if (artworkId) {
    const { error } = await supabase
      .from('artworks')
      .update({ pixels, cols, rows })
      .eq('id', artworkId)
    if (error) throw error
    return artworkId
  }

  const { data, error } = await supabase
    .from('artworks')
    .insert({ user_name: userName, pixels, cols, rows })
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

export async function getRecentArtworks(limitCount = 24) {
  const { data, error } = await supabase
    .from('artworks')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limitCount)
  if (error) throw error
  return data.map(row => ({
    id: row.id,
    userName: row.user_name,
    pixels: row.pixels,
    cols: row.cols,
    rows: row.rows,
    createdAt: new Date(row.created_at),
  }))
}

// 캔버스 설정 화면의 "내 이전 작품 — 이어서 그리기" 목록용. user_name으로 좁혀서 최신순으로 가져온다.
export async function getMyArtworks(userName, limitCount = 50) {
  if (!userName || !userName.trim()) return []
  const { data, error } = await supabase
    .from('artworks')
    .select('*')
    .eq('user_name', userName)
    .order('created_at', { ascending: false })
    .limit(limitCount)
  if (error) throw error
  return data.map(row => ({
    id: row.id,
    userName: row.user_name,
    pixels: row.pixels,
    cols: row.cols,
    rows: row.rows,
    createdAt: new Date(row.created_at),
  }))
}

// ── Posts (담벼락) ──────────────────────────────────────────────────

export async function createPost(userName, imageUrl) {
  if (!userName || !userName.trim()) throw new Error('게시물을 올리려면 이름이 필요해요.')
  if (!imageUrl || !imageUrl.trim()) throw new Error('업로드된 이미지 URL이 없어요.')

  const { error } = await supabase.from('posts').insert({
    user_name: userName,
    image_url: imageUrl,
  })
  if (error) throw error
}

export async function getPosts(limitCount = 100) {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limitCount)
  if (error) throw error
  return data.map(row => ({
    id: row.id,
    userName: row.user_name,
    imageUrl: row.image_url,
    createdAt: new Date(row.created_at),
  }))
}

// data URL(캔버스 PNG 스냅샷)을 Storage에 올릴 수 있는 Blob으로 변환한다.
function dataUrlToBlob(dataUrl) {
  const match = typeof dataUrl === 'string' && dataUrl.match(/^data:(.+?);base64,(.*)$/s)
  if (!match) throw new Error('올바른 이미지 데이터가 아니에요.')
  const [, mime, base64] = match
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

// ── Wall (Storage 이미지 업로드 + posts 테이블 기록) ─────────────────────
// 이미지를 'wall' 버킷에 올리고, 공개 URL을 받아 posts 테이블에 새 행으로 기록한다.
// 이어그리기로 수정한 뒤 다시 공유해도 기존 포스트를 덮어쓰지 않고 항상 새 스냅샷을 새
// posts 행으로 추가한다(그 순간의 그림을 "게시"하는 개념이라 과거 포스트는 그대로 둔다).
export async function uploadWallPost(userName, dataUrl) {
  if (!userName || !userName.trim()) throw new Error('담벼락에 올리려면 이름이 필요해요.')
  if (!dataUrl) throw new Error('업로드할 그림 데이터가 없어요.')

  const blob = dataUrlToBlob(dataUrl)
  // Supabase Storage의 객체 키는 한글 등 비-ASCII 문자를 허용하지 않으므로, 사용자 이름은
  // 파일 경로에 넣지 않는다(작성자 표시는 posts 테이블의 user_name 컬럼이 이미 담당한다).
  const filePath = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}.png`

  const { error: uploadError } = await supabase
    .storage
    .from('wall')
    .upload(filePath, blob, { contentType: 'image/png', upsert: false })
  if (uploadError) throw new Error(`이미지 업로드에 실패했어요: ${uploadError.message}`)

  const { data: publicUrlData } = supabase.storage.from('wall').getPublicUrl(filePath)
  const imageUrl = publicUrlData?.publicUrl
  if (!imageUrl) throw new Error('업로드된 이미지의 주소를 가져오지 못했어요.')

  await createPost(userName, imageUrl)
  return imageUrl
}
