const { onCall, HttpsError } = require('firebase-functions/v2/https')
const admin = require('firebase-admin')
const { getFirestore, FieldValue } = require('firebase-admin/firestore')
const crypto = require('crypto')

admin.initializeApp()
const db = getFirestore()

const MAX_FAIL_COUNT = 5
const PIN_PATTERN = /^\d{4}$/

function sha256Hex(text) {
  return crypto.createHash('sha256').update(text).digest('hex')
}

function randomSalt() {
  return crypto.randomBytes(16).toString('hex')
}

// 학급 참여 + 로그인을 하나로 처리하는 콜러블 함수.
// - 닉네임이 그 학급에 아직 없으면: 신규 등록(PIN을 salt와 함께 해시해 저장).
// - 이미 있으면: 제출한 PIN의 해시를 저장된 해시와 서버에서 직접 대조(로그인).
// 두 경우 모두 성공하면 Firebase Auth 커스텀 토큰을 발급해서, 이후 클라이언트가
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
