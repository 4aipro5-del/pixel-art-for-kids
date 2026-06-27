import { initializeApp } from 'firebase/app'
import { getFirestore, collection, addDoc, getDocs, orderBy, query, limit } from 'firebase/firestore'
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
export async function saveArtwork(userName, pixels, cols, rows) {
  await addDoc(collection(db, 'artworks'), {
    userName,
    pixelsJson: JSON.stringify(pixels),
    cols,
    rows,
    createdAt: new Date(),
  })
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
