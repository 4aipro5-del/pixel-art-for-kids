import { initializeApp } from 'firebase/app'
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, getDocs, orderBy, query, where, limit } from 'firebase/firestore'
import { getStorage, ref, uploadString, getDownloadURL } from 'firebase/storage'
import { getAuth, signInWithCustomToken, signOut } from 'firebase/auth'
import { getFunctions, httpsCallable } from 'firebase/functions'

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
export const auth = getAuth(app)
const functionsInstance = getFunctions(app)

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
// 생성된 문서 ID를 반환 — 로그인 없이도(개인 모드) "내 작품"을 로컬스토리지로 식별하기 위해 필요.
// classSession이 있으면(학급 모드) classId/studentId를 함께 저장해 서버 소유권을 연결한다.
// 개인 모드에서는 두 필드 모두 null로 저장되어 기존 데이터 구조와 완전히 동일하게 유지된다.
export async function saveArtwork(userName, pixels, cols, rows, classSession = null) {
  const docRef = await addDoc(collection(db, 'artworks'), {
    userName,
    pixelsJson: JSON.stringify(pixels),
    cols,
    rows,
    createdAt: new Date(),
    classId: classSession?.classId ?? null,
    studentId: classSession?.studentId ?? null,
  })
  return docRef.id
}

// "이어 그리기" 덮어쓰기 저장 — 새 문서를 만들지 않고 같은 artworkId를 계속 갱신한다.
// Firestore 보안 규칙상 로그인(커스텀 토큰)된 본인 소유 작품만 통과된다.
export async function updateArtwork(id, pixels, cols, rows) {
  await updateDoc(doc(db, 'artworks', id), {
    pixelsJson: JSON.stringify(pixels),
    cols,
    rows,
    updatedAt: new Date(),
  })
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

// 학급 모드 "나의 스케치북" — 이 classId+studentId로 저장된 내 작품만 서버에서 불러온다.
export async function getMyClassArtworks(classId, studentId) {
  const q = query(
    collection(db, 'artworks'),
    where('classId', '==', classId),
    where('studentId', '==', studentId),
    orderBy('createdAt', 'desc'),
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
//
// 등록(신규 별명)과 로그인(이미 있는 별명 + PIN 대조)을 모두 서버(Cloud Functions)의
// joinOrLoginStudent 콜러블 함수 하나가 처리한다. PIN 해시 대조는 Firestore 보안 규칙만으로는
// 할 수 없는 "조건부로 비교 후 판단" 로직이라 반드시 이 서버 함수를 거쳐야 한다.
// 성공하면 함수가 Firebase Auth 커스텀 토큰을 돌려주고, 그 토큰으로 로그인해야 이후
// artworks 생성/수정 시 보안 규칙이 "본인 확인"을 통과시켜준다.

export const JoinClassError = {
  MISSING_FIELDS: 'MISSING_FIELDS',
  INVALID_PIN: 'INVALID_PIN',
  CLASS_NOT_FOUND: 'CLASS_NOT_FOUND',
  WRONG_PIN: 'WRONG_PIN',
  LOCKED: 'LOCKED',
  UNKNOWN: 'UNKNOWN',
}

export async function joinOrLoginStudent(joinCode, nickname, pin) {
  const trimmedCode = (joinCode || '').trim()
  const trimmedNickname = (nickname || '').trim()
  if (!trimmedCode || !trimmedNickname) throw new Error(JoinClassError.MISSING_FIELDS)
  if (!/^\d{4}$/.test(pin || '')) throw new Error(JoinClassError.INVALID_PIN)

  const call = httpsCallable(functionsInstance, 'joinOrLoginStudent')
  let data
  try {
    const res = await call({ joinCode: trimmedCode, nickname: trimmedNickname, pin })
    data = res.data
  } catch (err) {
    const reason = err?.message
    throw new Error(Object.values(JoinClassError).includes(reason) ? reason : JoinClassError.UNKNOWN)
  }

  const { token, ...session } = data
  await signInWithCustomToken(auth, token)
  return session
}

// 공용 PC 대비 "이 기기에서 내 정보 지우기" — Firebase Auth 로그아웃까지 함께 처리한다.
export async function logoutStudent() {
  try { await signOut(auth) } catch { /* 이미 로그아웃 상태 등은 무시 */ }
}

// ── 교사: 학급 생성/학생 별명 등록 (가입·로그인 없음, 관리 코드로 인증) ────────────

export const CreateClassError = {
  JOIN_CODE_GENERATION_FAILED: 'JOIN_CODE_GENERATION_FAILED',
  UNKNOWN: 'UNKNOWN',
}

// 성공 시 { classId, joinCode, manageCode, className, authType }를 반환한다.
// manageCode는 원문 그대로 딱 이 응답에만 담겨 오고, 서버 DB에는 해시만 남는다 —
// 이 값을 잃어버리면 학급을 다시 관리할 방법이 없으므로 호출한 쪽에서 반드시 저장을 유도해야 한다.
export async function createClass(className, authType) {
  const call = httpsCallable(functionsInstance, 'createClass')
  try {
    const res = await call({ className, authType })
    return res.data
  } catch (err) {
    const reason = err?.message
    throw new Error(Object.values(CreateClassError).includes(reason) ? reason : CreateClassError.UNKNOWN)
  }
}

export const RegisterStudentsError = {
  CLASS_NOT_FOUND: 'CLASS_NOT_FOUND',
  INVALID_MANAGE_CODE: 'INVALID_MANAGE_CODE',
  NO_NICKNAMES: 'NO_NICKNAMES',
  UNKNOWN: 'UNKNOWN',
}

// nicknames: string[] — 반환값 results: [{ requested, final, renamed }] (중복이라 이름이
// 바뀐 경우 renamed=true로 표시되어 화면에서 "OO는 중복이라 OO2로 등록됐어요" 안내 가능).
export async function registerStudents(classId, manageCode, nicknames) {
  const call = httpsCallable(functionsInstance, 'registerStudents')
  try {
    const res = await call({ classId, manageCode, nicknames })
    return res.data.results
  } catch (err) {
    const reason = err?.message
    throw new Error(Object.values(RegisterStudentsError).includes(reason) ? reason : RegisterStudentsError.UNKNOWN)
  }
}
