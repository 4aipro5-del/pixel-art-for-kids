import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ── Artworks (픽셀 데이터 저장 + 진입 화면 갤러리) ──────────────────────
// pixels는 jsonb 컬럼이라 2D 배열을 그대로 넘기면 된다(Firestore 때처럼 JSON.stringify 불필요).

export async function saveArtwork(userName, pixels, cols, rows) {
  const { error } = await supabase.from('artworks').insert({
    user_name: userName,
    pixels,
    cols,
    rows,
  })
  if (error) throw error
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

// ── Posts (담벼락) ──────────────────────────────────────────────────

export async function createPost(userName, imageUrl) {
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
  const [header, base64] = dataUrl.split(',')
  const mime = header.match(/:(.*?);/)[1]
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

// ── Wall (Storage 이미지 업로드 + posts 테이블 기록) ─────────────────────
// 이미지를 'wall' 버킷에 올리고, 공개 URL을 받아 posts 테이블에 기록한다.
export async function uploadWallPost(userName, dataUrl) {
  const blob = dataUrlToBlob(dataUrl)
  // Supabase Storage의 객체 키는 한글 등 비-ASCII 문자를 허용하지 않으므로, 사용자 이름은
  // 파일 경로에 넣지 않는다(작성자 표시는 posts 테이블의 user_name 컬럼이 이미 담당한다).
  const filePath = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}.png`

  const { error: uploadError } = await supabase
    .storage
    .from('wall')
    .upload(filePath, blob, { contentType: 'image/png', upsert: false })
  if (uploadError) throw uploadError

  const { data } = supabase.storage.from('wall').getPublicUrl(filePath)
  const imageUrl = data.publicUrl

  await createPost(userName, imageUrl)
  return imageUrl
}
