import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { createClass, registerStudents, CreateClassError, RegisterStudentsError } from '../firebase'

const ACCENT_YELLOW = '#f7d070'
const PAGE_BG = '#1a1c1e'
const PANEL_BG = '#111214'
const WARNING_RED = '#fca5a5'

// 학생 별명 랜덤 생성용 단어 목록 — 서버(functions/index.js)와 같은 취지로 실명이 배제된
// 형용사+명사 조합. 최종 중복 검사는 registerStudents가 서버에서 다시 하므로, 여기선
// 미리보기 속도가 중요해 클라이언트에서 즉시 만든다.
const NICK_ADJECTIVES = [
  '용감한', '반짝이는', '날쌘', '씩씩한', '포근한', '즐거운', '명랑한', '든든한', '재빠른', '상냥한',
  '엉뚱한', '똑똑한', '부드러운', '화려한', '신나는', '용맹한', '살랑이는', '몽글몽글한', '새콤한', '상큼한',
]
const NICK_NOUNS = [
  '토끼', '사슴', '여우', '호랑이', '사자', '곰', '다람쥐', '고양이', '강아지', '부엉이',
  '펭귄', '코끼리', '기린', '판다', '수달', '오리', '거북', '고래', '나비', '늑대',
]

function generateRandomNicknames(count) {
  const used = new Set()
  const results = []
  let guard = 0
  while (results.length < count && guard < count * 50) {
    guard++
    const adj = NICK_ADJECTIVES[Math.floor(Math.random() * NICK_ADJECTIVES.length)]
    const noun = NICK_NOUNS[Math.floor(Math.random() * NICK_NOUNS.length)]
    let name = `${adj}${noun}`
    if (used.has(name)) {
      let suffix = 2
      while (used.has(`${name}${suffix}`)) suffix++
      name = `${name}${suffix}`
    }
    used.add(name)
    results.push(name)
  }
  return results
}

const CREATE_ERROR_MESSAGES = {
  [CreateClassError.JOIN_CODE_GENERATION_FAILED]: '참여 코드 생성에 실패했어요. 다시 시도해주세요.',
  [CreateClassError.UNKNOWN]: '학급을 만들지 못했어요. 다시 시도해주세요.',
}
const REGISTER_ERROR_MESSAGES = {
  [RegisterStudentsError.CLASS_NOT_FOUND]: '학급 정보를 찾지 못했어요.',
  [RegisterStudentsError.INVALID_MANAGE_CODE]: '관리 코드가 올바르지 않아요. 페이지를 새로고침하지 말고 다시 시도해주세요.',
  [RegisterStudentsError.NO_NICKNAMES]: '등록할 별명을 입력해주세요.',
  [RegisterStudentsError.UNKNOWN]: '별명 등록에 실패했어요. 다시 시도해주세요.',
}

function CopyButton({ text, label = '복사' }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { /* 클립보드 권한이 없는 환경 — 조용히 무시 */ }
  }
  return (
    <button
      onClick={handleCopy}
      className="font-pixel rounded-xl px-4 py-2 text-sm transition-colors hover:brightness-125"
      style={{ background: PANEL_BG, color: copied ? '#86efac' : '#e2e8f0', border: '1px solid rgba(255,255,255,0.15)' }}
    >
      {copied ? '복사됨!' : label}
    </button>
  )
}

export default function TeacherCreateClassPage({ onGoHome }) {
  const [className, setClassName] = useState('')
  const [authType, setAuthType] = useState('pin')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [created, setCreated] = useState(null)
  const [qrDataUrl, setQrDataUrl] = useState('')

  const [nicknameText, setNicknameText] = useState('')
  const [randomCount, setRandomCount] = useState(25)
  const [registering, setRegistering] = useState(false)
  const [registerError, setRegisterError] = useState('')
  const [registeredList, setRegisteredList] = useState([])

  // 참여 코드가 생기면 QR도 함께 준비 — 스캔하면 홈 화면이 이 코드를 채운 참여 모달을 자동으로 띄운다.
  useEffect(() => {
    if (!created) return
    const url = `${window.location.origin}${window.location.pathname}?join=${encodeURIComponent(created.joinCode)}`
    QRCode.toDataURL(url, { width: 220, margin: 1 }).then(setQrDataUrl).catch(() => setQrDataUrl(''))
  }, [created])

  const handleCreate = async () => {
    if (creating) return
    setCreateError('')
    setCreating(true)
    try {
      const result = await createClass(className, authType)
      setCreated(result)
    } catch (err) {
      setCreateError(CREATE_ERROR_MESSAGES[err.message] || CREATE_ERROR_MESSAGES[CreateClassError.UNKNOWN])
    } finally {
      setCreating(false)
    }
  }

  const handleFillRandom = () => {
    const names = generateRandomNicknames(randomCount)
    setNicknameText(prev => (prev.trim() ? prev.trim() + '\n' + names.join('\n') : names.join('\n')))
  }

  const handleRegister = async () => {
    const nicknames = nicknameText.split('\n').map(s => s.trim()).filter(Boolean)
    if (nicknames.length === 0) {
      setRegisterError(REGISTER_ERROR_MESSAGES[RegisterStudentsError.NO_NICKNAMES])
      return
    }
    if (registering) return
    setRegisterError('')
    setRegistering(true)
    try {
      const results = await registerStudents(created.classId, created.manageCode, nicknames)
      setRegisteredList(prev => [...prev, ...results])
      setNicknameText('')
    } catch (err) {
      setRegisterError(REGISTER_ERROR_MESSAGES[err.message] || REGISTER_ERROR_MESSAGES[RegisterStudentsError.UNKNOWN])
    } finally {
      setRegistering(false)
    }
  }

  return (
    <div className="relative h-screen w-screen overflow-y-auto" style={{ background: PAGE_BG }}>

      {/* 인쇄 시에는 참여 코드만 크게 보이도록 — 화면에는 숨김 */}
      {created && (
        <div className="app-print-area hidden print:flex print:flex-col print:items-center print:gap-6 print:p-[20mm]">
          <p className="text-2xl font-bold">{created.className || '우리 반'} 참여 코드</p>
          <p className="text-7xl font-mono font-bold tracking-widest">{created.joinCode}</p>
          {qrDataUrl && <img src={qrDataUrl} alt="QR" className="w-56 h-56" />}
          <p className="text-base text-gray-500">칠판에 적거나 이 QR을 스캔해서 참여할 수 있어요</p>
        </div>
      )}

      <div className="print:hidden">
        <main className="relative flex min-h-screen w-full items-center justify-center px-4 py-10 sm:px-8">
          <div className="flex w-full max-w-xl flex-col gap-6">

            <button
              onClick={onGoHome}
              className="font-pixel self-start flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              ← 처음으로
            </button>

            {!created ? (
              /* ── 학급 만들기 전: 간단한 설정 폼 ── */
              <div className="rounded-2xl p-8 flex flex-col gap-6" style={{ background: PANEL_BG }}>
                <h1 className="font-pixel text-2xl text-white">학급 만들기</h1>
                <p className="text-sm text-gray-400 leading-relaxed">
                  회원가입도 로그인도 필요 없어요. 지금 바로 학급을 만들고, 발급되는 코드로
                  학생들을 초대하세요.
                </p>

                <div>
                  <label className="block text-sm font-bold text-gray-400 mb-2">학급 이름 (선택)</label>
                  <input
                    type="text"
                    value={className}
                    onChange={e => setClassName(e.target.value)}
                    placeholder="예: 3학년 2반"
                    maxLength={30}
                    className="font-pixel w-full rounded-xl px-4 py-3 text-lg text-white outline-none placeholder:text-gray-600"
                    style={{ background: PAGE_BG }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-400 mb-2">학생 인증 방식</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setAuthType('pin')}
                      className="font-pixel rounded-xl py-4 text-sm transition-all"
                      style={{
                        background: authType === 'pin' ? ACCENT_YELLOW : PAGE_BG,
                        color: authType === 'pin' ? '#000000' : '#e2e8f0',
                        border: authType === 'pin' ? 'none' : '1px solid rgba(255,255,255,0.15)',
                      }}
                    >
                      비밀번호 4자리
                      <div className="text-xs mt-1 font-normal" style={{ color: authType === 'pin' ? 'rgba(0,0,0,0.6)' : '#9ca3af' }}>
                        고학년 · 일반 추천
                      </div>
                    </button>
                    <button
                      onClick={() => setAuthType('picture')}
                      className="font-pixel rounded-xl py-4 text-sm transition-all"
                      style={{
                        background: authType === 'picture' ? ACCENT_YELLOW : PAGE_BG,
                        color: authType === 'picture' ? '#000000' : '#e2e8f0',
                        border: authType === 'picture' ? 'none' : '1px solid rgba(255,255,255,0.15)',
                      }}
                    >
                      그림 비밀번호
                      <div className="text-xs mt-1 font-normal" style={{ color: authType === 'picture' ? 'rgba(0,0,0,0.6)' : '#9ca3af' }}>
                        저학년 추천
                      </div>
                    </button>
                  </div>
                </div>

                {createError && (
                  <p className="text-center text-sm font-bold" style={{ color: ACCENT_YELLOW }}>{createError}</p>
                )}

                <button
                  onClick={handleCreate}
                  disabled={creating}
                  className="font-pixel w-full rounded-full px-8 py-4 text-xl text-black transition-all hover:brightness-105 active:scale-[0.98] disabled:opacity-50"
                  style={{ background: ACCENT_YELLOW, boxShadow: '0 8px 24px rgba(247,208,112,0.25)' }}
                >
                  {creating ? '만드는 중...' : '학급 만들기'}
                </button>
              </div>
            ) : (
              /* ── 학급 만들기 완료: 코드 발급 + 별명 등록 화면 ── */
              <div className="flex flex-col gap-5">
                <h1 className="font-pixel text-2xl text-white text-center">학급이 만들어졌어요! 🎉</h1>

                {/* ① 참여 코드 */}
                <div className="rounded-2xl p-6 flex flex-col gap-4" style={{ background: PANEL_BG }}>
                  <p className="text-sm font-bold text-gray-400">① 학생에게 알려줄 참여 코드</p>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span
                      className="font-pixel text-2xl px-5 py-3 rounded-xl flex-1 text-center"
                      style={{ background: PAGE_BG, color: ACCENT_YELLOW }}
                    >
                      {created.joinCode}
                    </span>
                    <CopyButton text={created.joinCode} />
                    <button
                      onClick={() => window.print()}
                      className="font-pixel rounded-xl px-4 py-2 text-sm transition-colors hover:brightness-125"
                      style={{ background: PAGE_BG, color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.15)' }}
                    >
                      인쇄
                    </button>
                  </div>
                  {qrDataUrl && (
                    <div className="flex flex-col items-center gap-2 pt-2">
                      <img src={qrDataUrl} alt="참여 QR 코드" className="w-40 h-40 rounded-xl bg-white p-2" />
                      <p className="text-xs text-gray-500">칠판에 적거나 QR로 보여주세요</p>
                    </div>
                  )}
                </div>

                {/* ② 관리 링크 */}
                <div className="rounded-2xl p-6 flex flex-col gap-4" style={{ background: PANEL_BG }}>
                  <p className="text-sm font-bold text-gray-400">② 선생님 전용 관리 링크</p>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span
                      className="font-mono text-sm px-4 py-3 rounded-xl flex-1 truncate text-gray-300"
                      style={{ background: PAGE_BG }}
                    >
                      {window.location.origin}/manage/{created.manageCode}
                    </span>
                    <CopyButton text={`${window.location.origin}/manage/${created.manageCode}`} label="링크 복사" />
                  </div>
                  <p className="text-xs text-gray-500">
                    Ctrl+D(Mac은 ⌘+D)로 지금 바로 북마크해두시는 걸 추천해요.
                  </p>
                  <div
                    className="rounded-xl px-4 py-3 text-sm font-bold"
                    style={{ background: 'rgba(252,165,165,0.1)', color: WARNING_RED, border: `1px solid ${WARNING_RED}` }}
                  >
                    ⚠️ 이 링크를 잃어버리면 학급을 다시 열 수 없어요. 꼭 저장해두세요!
                  </div>
                </div>

                {/* ③ 학생 별명 등록 */}
                <div className="rounded-2xl p-6 flex flex-col gap-4" style={{ background: PANEL_BG }}>
                  <p className="text-sm font-bold text-gray-400">③ 학생 별명 등록</p>
                  <p className="text-xs text-gray-500">
                    실명 대신 별명을 등록해주세요. 학생은 참여 시 이 목록에 있는 별명을 골라 비밀번호를 처음 설정해요.
                  </p>

                  <textarea
                    value={nicknameText}
                    onChange={e => setNicknameText(e.target.value)}
                    placeholder={'한 줄에 별명 하나씩 입력하거나 붙여넣으세요\n예)\n용감한토끼\n반짝이는사슴'}
                    rows={6}
                    className="font-pixel w-full rounded-xl px-4 py-3 text-sm text-white outline-none placeholder:text-gray-600 resize-none"
                    style={{ background: PAGE_BG }}
                  />

                  <div className="flex items-center gap-2 flex-wrap">
                    <input
                      type="number"
                      min={1}
                      max={60}
                      value={randomCount}
                      onChange={e => setRandomCount(Math.min(60, Math.max(1, Number(e.target.value) || 1)))}
                      className="font-pixel w-16 rounded-xl px-3 py-2 text-sm text-white outline-none text-center"
                      style={{ background: PAGE_BG }}
                    />
                    <button
                      onClick={handleFillRandom}
                      className="font-pixel rounded-xl px-4 py-2 text-sm transition-colors hover:brightness-125"
                      style={{ background: PAGE_BG, color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.15)' }}
                    >
                      명 랜덤 생성
                    </button>
                    <span className="text-xs text-gray-500">→ 텍스트 칸에 채워져요. 등록 전 자유롭게 수정하세요.</span>
                  </div>

                  {registerError && (
                    <p className="text-center text-sm font-bold" style={{ color: ACCENT_YELLOW }}>{registerError}</p>
                  )}

                  <button
                    onClick={handleRegister}
                    disabled={registering}
                    className="font-pixel w-full rounded-full px-8 py-3 text-base text-black transition-all hover:brightness-105 active:scale-[0.98] disabled:opacity-50"
                    style={{ background: ACCENT_YELLOW }}
                  >
                    {registering ? '등록 중...' : '별명 등록하기'}
                  </button>

                  {registeredList.length > 0 && (
                    <div className="flex flex-col gap-2 pt-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                      <p className="text-xs font-bold text-gray-400">등록된 별명 {registeredList.length}명</p>
                      <div className="flex flex-wrap gap-2">
                        {registeredList.map((r, i) => (
                          <span
                            key={`${r.final}-${i}`}
                            className="font-pixel text-xs px-3 py-1.5 rounded-full"
                            style={{ background: PAGE_BG, color: r.renamed ? ACCENT_YELLOW : '#e2e8f0' }}
                            title={r.renamed ? `'${r.requested}'는 중복이라 '${r.final}'로 등록됐어요` : ''}
                          >
                            {r.final}{r.renamed && ' *'}
                          </span>
                        ))}
                      </div>
                      {registeredList.some(r => r.renamed) && (
                        <p className="text-xs text-gray-500">* 중복된 별명은 뒤에 번호를 붙여 등록했어요.</p>
                      )}
                    </div>
                  )}
                </div>

                <button
                  onClick={onGoHome}
                  className="font-pixel w-full rounded-full px-8 py-3 text-base transition-colors hover:brightness-125"
                  style={{ background: PANEL_BG, color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.15)' }}
                >
                  완료 · 처음으로
                </button>
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  )
}
