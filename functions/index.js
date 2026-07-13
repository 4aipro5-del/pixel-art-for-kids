const { onCall, HttpsError } = require('firebase-functions/v2/https')
const admin = require('firebase-admin')
const { getFirestore, FieldValue, Timestamp } = require('firebase-admin/firestore')
const crypto = require('crypto')

admin.initializeApp()
const db = getFirestore()

const MAX_FAIL_COUNT = 5
const PIN_PATTERN = /^\d{4}$/
const CLASS_TTL_MS = 90 * 24 * 60 * 60 * 1000 // 학급 자동 만료: 생성 후 90일

function sha256Hex(text) {
  return crypto.createHash('sha256').update(text).digest('hex')
}

function randomSalt() {
  return crypto.randomBytes(16).toString('hex')
}

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

// ── 참여 코드(joinCode) 생성용 단어 목록 — "형용사-동물-숫자" 형식 ──
const JOIN_ADJECTIVES = ['바다', '하늘', '숲', '노을', '별빛', '아침', '저녁', '봄날', '겨울', '여름']
const JOIN_ANIMALS = ['여우', '호랑이', '사자', '고래', '수달', '펭귄', '다람쥐', '부엉이', '판다', '기린']

function generateJoinCode() {
  const num = Math.floor(Math.random() * 90) + 10 // 10~99
  return `${randomFrom(JOIN_ADJECTIVES)}-${randomFrom(JOIN_ANIMALS)}-${num}`
}

const MAX_JOINCODE_ATTEMPTS = 10
const MAX_NICKNAME_LEN = 10
const MAX_STUDENTS_PER_BATCH = 60

// ── 학급 만들기 — 교사는 가입/로그인 없이 즉시 학급을 개설한다 ──────────────
// 참여 코드(joinCode)는 원문 그대로 저장(학생에게 공개 공유되는 값).
// 관리 코드(manageCode)는 이 응답으로 딱 1회만 돌려주고, DB에는 해시(manageCodeHash)만 남긴다
// — 이후로는 그 누구도(교사 포함) 원문을 다시 조회할 수 없고, 매번 이 관리 코드를 직접
// 가지고 있어야만(브라우저 저장/북마크) 학급을 관리할 수 있다.
exports.createClass = onCall(async (request) => {
  const { className, authType } = request.data || {}
  const finalAuthType = authType === 'picture' ? 'picture' : 'pin'
  const trimmedClassName = typeof className === 'string' ? className.trim().slice(0, 30) : ''

  let joinCode = null
  for (let i = 0; i < MAX_JOINCODE_ATTEMPTS; i++) {
    const candidate = generateJoinCode()
    const existing = await db.collection('classes').where('joinCode', '==', candidate).limit(1).get()
    if (existing.empty) { joinCode = candidate; break }
  }
  if (!joinCode) {
    throw new HttpsError('resource-exhausted', 'JOIN_CODE_GENERATION_FAILED')
  }

  const manageCode = crypto.randomUUID()
  const manageCodeHash = sha256Hex(manageCode)

  const classRef = db.collection('classes').doc()
  await classRef.set({
    joinCode,
    manageCodeHash,
    className: trimmedClassName,
    authType: finalAuthType,
    createdAt: FieldValue.serverTimestamp(),
    expiresAt: Timestamp.fromMillis(Date.now() + CLASS_TTL_MS),
  })

  return {
    classId: classRef.id,
    joinCode,
    manageCode, // 원문 — 이 응답 이후로는 서버 어디에도 다시 존재하지 않는다
    className: trimmedClassName,
    authType: finalAuthType,
  }
})

// ── 학생 별명 등록(교사 전용, manageCode로 인증) ──────────────────────────
// 닉네임만 미리 만들어두고 PIN/그림 비밀번호는 비워둔다(secretHash: null) — 학생이
// "학급 코드로 참여하기"에서 이 별명을 처음 고르고 비밀번호를 입력하는 순간 joinOrLoginStudent가
// 그 비밀번호를 지금 이 문서에 채워 넣는다(등록도 로그인도 아닌 "이 자리 인수받기").
// 같은 학급 안에서 별명이 이미 있으면 뒤에 숫자를 붙여 자동으로 피해간다.
exports.registerStudents = onCall(async (request) => {
  const { classId, manageCode, nicknames } = request.data || {}
  if (typeof classId !== 'string' || typeof manageCode !== 'string' || !Array.isArray(nicknames)) {
    throw new HttpsError('invalid-argument', 'INVALID_INPUT')
  }

  const classRef = db.collection('classes').doc(classId)
  const classSnap = await classRef.get()
  if (!classSnap.exists) {
    throw new HttpsError('not-found', 'CLASS_NOT_FOUND')
  }
  const classData = classSnap.data()
  if (sha256Hex(manageCode) !== classData.manageCodeHash) {
    throw new HttpsError('permission-denied', 'INVALID_MANAGE_CODE')
  }

  const cleaned = [...new Set(
    nicknames
      .map(n => (typeof n === 'string' ? n.trim().slice(0, MAX_NICKNAME_LEN) : ''))
      .filter(Boolean),
  )].slice(0, MAX_STUDENTS_PER_BATCH)
  if (cleaned.length === 0) {
    throw new HttpsError('invalid-argument', 'NO_NICKNAMES')
  }

  const studentsCol = classRef.collection('students')
  const existingSnap = await studentsCol.get()
  const takenNames = new Set(existingSnap.docs.map(d => d.id))

  const results = []
  for (const requested of cleaned) {
    let finalName = requested
    if (takenNames.has(finalName)) {
      let suffix = 2
      while (takenNames.has(`${requested}${suffix}`)) suffix++
      finalName = `${requested}${suffix}`
    }
    takenNames.add(finalName)

    await studentsCol.doc(finalName).set({
      nickname: finalName,
      authType: classData.authType || 'pin',
      secretHash: null,
      salt: null,
      failCount: 0,
      createdAt: FieldValue.serverTimestamp(),
    })
    results.push({ requested, final: finalName, renamed: finalName !== requested })
  }

  return { results }
})

// 학급 참여 + 로그인을 하나로 처리하는 콜러블 함수.
// - 닉네임이 그 학급에 전혀 없으면: 신규 등록(PIN을 salt와 함께 해시해 저장).
// - 닉네임은 있지만 아직 비밀번호가 없으면(교사가 registerStudents로 미리 등록해둔 자리):
//   지금 입력한 PIN을 그 자리의 최초 비밀번호로 설정한다("이 자리 인수받기").
// - 닉네임에 비밀번호가 이미 있으면: 제출한 PIN의 해시를 저장된 해시와 서버에서 직접 대조(로그인).
// 세 경우 모두 성공하면 Firebase Auth 커스텀 토큰을 발급해서, 이후 클라이언트가
// Firestore 보안 규칙에서 "이 studentId/classId는 진짜 본인이다"를 증명할 수 있게 한다.
//
// 이 비교(해시 대조)는 Firestore 보안 규칙만으로는 절대 할 수 없다 — 규칙은
// "읽어도 되는지"만 판단할 뿐 "제출한 값과 저장된 해시가 일치하는지 계산"할 수는 없기 때문에,
// PIN 원문이 새는 것을 막으려면 이렇게 신뢰할 수 있는 서버(Cloud Functions, Admin SDK)에서
// secretHash를 직접 읽고 비교해야 한다. 클라이언트는 secretHash를 절대 읽을 수 없다
// (firestore.rules에서 students 컬렉션 전체를 클라이언트 read 금지로 막아둠).
exports.joinOrLoginStudent = onCall(async (request) => {
  const { joinCode, nickname, pin } = request.data || {}

  if (typeof joinCode !== 'string' || typeof nickname !== 'string' || !PIN_PATTERN.test(pin || '')) {
    throw new HttpsError('invalid-argument', 'INVALID_INPUT')
  }
  const trimmedCode = joinCode.trim()
  const trimmedNickname = nickname.trim()
  if (!trimmedCode || !trimmedNickname) {
    throw new HttpsError('invalid-argument', 'MISSING_FIELDS')
  }

  const classSnap = await db.collection('classes').where('joinCode', '==', trimmedCode).limit(1).get()
  if (classSnap.empty) {
    throw new HttpsError('not-found', 'CLASS_NOT_FOUND')
  }
  const classDoc = classSnap.docs[0]
  const classId = classDoc.id
  const className = classDoc.data().className || ''

  const studentRef = db.collection('classes').doc(classId).collection('students').doc(trimmedNickname)

  // 트랜잭션 안에서 절대 throw하지 않고 결과 객체만 반환한다 — 그래야 "PIN 틀림" 케이스에서도
  // failCount 증가 write가 실제로 커밋된다(트랜잭션 중간에 throw하면 그 트랜잭션의 모든 write가
  // 통째로 취소되어, 틀린 횟수 자체가 기록되지 않는 문제가 생긴다).
  const result = await db.runTransaction(async (tx) => {
    const studentSnap = await tx.get(studentRef)

    if (!studentSnap.exists) {
      // 완전히 새로운 별명 — 즉석 등록
      const salt = randomSalt()
      const secretHash = sha256Hex(salt + pin)
      tx.set(studentRef, {
        nickname: trimmedNickname,
        authType: 'pin',
        secretHash,
        salt,
        failCount: 0,
        createdAt: FieldValue.serverTimestamp(),
      })
      return { ok: true }
    }

    const student = studentSnap.data()

    if (!student.secretHash) {
      // 교사가 registerStudents로 미리 만들어둔 별명 — 학생이 지금 처음 로그인하며
      // 입력한 PIN을 이 자리의 비밀번호로 지금 설정한다.
      const salt = randomSalt()
      const secretHash = sha256Hex(salt + pin)
      tx.update(studentRef, { secretHash, salt, failCount: 0 })
      return { ok: true }
    }

    if ((student.failCount || 0) >= MAX_FAIL_COUNT) {
      return { ok: false, reason: 'LOCKED' }
    }

    const hash = sha256Hex(student.salt + pin)
    if (hash !== student.secretHash) {
      tx.update(studentRef, { failCount: (student.failCount || 0) + 1 })
      return { ok: false, reason: 'WRONG_PIN' }
    }

    tx.update(studentRef, { failCount: 0 })
    return { ok: true }
  })

  if (!result.ok) {
    const code = result.reason === 'LOCKED' ? 'resource-exhausted' : 'permission-denied'
    throw new HttpsError(code, result.reason)
  }

  // uid 자체는 비밀이 아니다(추측 방지의 핵심은 PIN 해시 대조 쪽에 있음) —
  // classId+닉네임으로 결정적으로 만들어 같은 학생은 항상 같은 Firebase Auth 계정을 갖게 한다.
  const uid = `student_${classId}_${trimmedNickname}`
  const token = await admin.auth().createCustomToken(uid, {
    classId,
    studentId: trimmedNickname,
  })

  return {
    token,
    classId,
    studentId: trimmedNickname,
    nickname: trimmedNickname,
    className,
  }
})
