import { initializeApp } from 'firebase/app'
import { getFirestore, collection, addDoc, deleteDoc, doc, getDoc, setDoc, getDocs, orderBy, query, where, limit } from 'firebase/firestore'
import { getStorage, ref, uploadString, getDownloadURL } from 'firebase/storage'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
export const storage = getStorage(app)

// ── Wall (이미지 업로드 + 담벼락 컬렉션) ─────────────────────────────

export async function uploadWallPost(userName, dataUrl) {
  const storageRef = ref(storage, `wall/${Date.now()}_${userName}.png`)
  const snapshot = await uploadString(storageRef, dataUrl, 'data_url')
  const imageUrl = await getDownloadURL(snapshot.ref)

  await addDoc(collection(db, 'wall'), {
    userName,
    imageUrl,
    createdAt: new Date(),
  })

  return imageUrl
}

export async function getWallPosts() {
  const q = query(collection(db, 'wall'), orderBy('createdAt', 'desc'), limit(100))
  const snapshot = await getDocs(q)
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate(),
  }))
}

// ── Artworks (픽셀 데이터 저장 + 진입 화면 갤러리) ──────────────────────

// pixels는 2D 배열이라 Firestore가 중첩 배열을 지원하지 않으므로 JSON 문자열로 직렬화
// 생성된 문서 ID를 반환 — 로그인 없이도 "내 작품"을 로컬스토리지로 식별하기 위해 필요
export async function saveArtwork(userName, pixels, cols, rows) {
  const docRef = await addDoc(collection(db, 'artworks'), {
    userName,
    pixelsJson: JSON.stringify(pixels),
    cols,
    rows,
    createdAt: new Date(),
  })
  return docRef.id
}

export async function deleteArtwork(id) {
  await deleteDoc(doc(db, 'artworks', id))
}

export async function getRecentArtworks(limitCount = 24) {
  const q = query(
    collection(db, 'artworks'),
    orderBy('createdAt', 'desc'),
    limit(limitCount),
  )
  const snapshot = await getDocs(q)
  return snapshot.docs.map(doc => {
    const data = doc.data()
    return {
      id: doc.id,
      userName: data.userName,
      pixels: JSON.parse(data.pixelsJson || '[]'),
      cols: data.cols,
      rows: data.rows,
      createdAt: data.createdAt?.toDate(),
    }
  })
}

// ── 학급/학생 (Firestore 기반 소유권 — 개인정보 무수집, PIN은 해시로만 저장) ────────

function bytesToHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

function randomSalt() {
  return bytesToHex(crypto.getRandomValues(new Uint8Array(16)))
}

// PIN 원문은 절대 저장/전송하지 않고, 매번 이 해시만 서버에 보낸다.
async function sha256Hex(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return bytesToHex(new Uint8Array(buf))
}

export const JoinClassError = {
  MISSING_FIELDS: 'MISSING_FIELDS',
  INVALID_PIN: 'INVALID_PIN',
  CLASS_NOT_FOUND: 'CLASS_NOT_FOUND',
  NICKNAME_TAKEN: 'NICKNAME_TAKEN',
}

// 학급 코드로 참여 + 별명 최초 등록. 같은 학급 안에서 닉네임을 문서 ID로 써서
// Firestore 보안 규칙의 !exists() 조건이 동시 요청에도 원자적으로 중복을 막아준다.
// PIN은 클라이언트에서 salt와 함께 SHA-256으로 해시한 뒤 그 해시만 저장한다.
export async function joinClass(joinCode, nickname, pin) {
  const trimmedCode = joinCode.trim()
  const trimmedNickname = nickname.trim()
  if (!trimmedCode || !trimmedNickname) throw new Error(JoinClassError.MISSING_FIELDS)
  if (!/^\d{4}$/.test(pin)) throw new Error(JoinClassError.INVALID_PIN)

  const classQuery = query(collection(db, 'classes'), where('joinCode', '==', trimmedCode), limit(1))
  const classSnap = await getDocs(classQuery)
  if (classSnap.empty) throw new Error(JoinClassError.CLASS_NOT_FOUND)
  const classDoc = classSnap.docs[0]
  const classId = classDoc.id

  const studentRef = doc(db, 'classes', classId, 'students', trimmedNickname)

  // 빠른 실패용 사전 확인(대부분의 경우 왕복 한 번으로 친절한 에러 표시).
  // 실제 중복 방지 보장은 아래 setDoc이 걸리는 Firestore 보안 규칙의 !exists()가 담당.
  const existing = await getDoc(studentRef)
  if (existing.exists()) throw new Error(JoinClassError.NICKNAME_TAKEN)

  const salt = randomSalt()
  const secretHash = await sha256Hex(salt + pin)

  try {
    await setDoc(studentRef, {
      nickname: trimmedNickname,
      authType: 'pin',
      secretHash,
      salt,
      failCount: 0,
      createdAt: new Date(),
    })
  } catch {
    // 동시에 같은 별명으로 요청이 들어와 규칙이 write를 막은 경우
    throw new Error(JoinClassError.NICKNAME_TAKEN)
  }

  return {
    classId,
    studentId: trimmedNickname,
    nickname: trimmedNickname,
    className: classDoc.data().className || '',
  }
}
