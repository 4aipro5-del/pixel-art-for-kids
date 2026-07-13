import { useRef, useState } from 'react'
import { joinOrLoginStudent, JoinClassError } from '../firebase'

const ACCENT_YELLOW = '#f7d070'
const PAGE_BG = '#1a1c1e'
const PANEL_BG = '#111214'
const WARNING_RED = '#fca5a5'

// 신규 별명이면 등록, 이미 있는 별명이면 PIN을 대조해 로그인 — 서버(joinOrLoginStudent)가
// 한 번에 판단하므로 여기선 "이미 사용 중"과 "비밀번호가 다름"을 구분하지 않고 하나의
// 메시지로 안내한다(어느 쪽인지 알려주면 존재하는 별명을 추측하는 데 쓰일 수 있어서).
const ERROR_MESSAGES = {
  [JoinClassError.MISSING_FIELDS]: '학급 코드와 별명을 모두 입력해주세요!',
  [JoinClassError.INVALID_PIN]: '비밀번호 4자리를 모두 입력해주세요!',
  [JoinClassError.CLASS_NOT_FOUND]: '학급 코드를 다시 확인해주세요.',
  [JoinClassError.WRONG_PIN]: '비밀번호가 다르거나 이미 다른 친구가 쓰는 별명이에요. 확인 후 다시 시도해주세요!',
  [JoinClassError.LOCKED]: '비밀번호를 너무 많이 틀렸어요. 잠시 후 다시 시도하거나 선생님께 요청해주세요.',
}
const DEFAULT_ERROR_MESSAGE = '문제가 발생했어요. 잠시 후 다시 시도해주세요.'

export default function JoinClassModal({ onClose, onJoined }) {
  const [joinCode, setJoinCode] = useState('')
  const [nickname, setNickname] = useState('')
  const [pinDigits, setPinDigits] = useState(['', '', '', ''])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const pinRefs = [useRef(null), useRef(null), useRef(null), useRef(null)]

  const focusPin = (index) => pinRefs[index]?.current?.focus()

  const handlePinChange = (index, value) => {
    const digit = value.replace(/\D/g, '').slice(-1)
    setPinDigits(prev => {
      const next = [...prev]
      next[index] = digit
      return next
    })
    if (digit && index < 3) focusPin(index + 1)
  }

  const handlePinKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !pinDigits[index] && index > 0) {
      focusPin(index - 1)
    }
  }

  const handlePinPaste = (e) => {
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4)
    if (digits.length === 4) {
      e.preventDefault()
      setPinDigits(digits.split(''))
      focusPin(3)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (loading) return
    setError('')

    const pin = pinDigits.join('')
    setLoading(true)
    try {
      const session = await joinOrLoginStudent(joinCode, nickname, pin)
      onJoined(session)
    } catch (err) {
      setError(ERROR_MESSAGES[err.message] || DEFAULT_ERROR_MESSAGE)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="relative w-full max-w-md rounded-2xl p-6"
        style={{ background: PAGE_BG, border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <button
          onClick={onClose}
          className="absolute right-5 top-5 w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:text-white transition-colors"
          style={{ background: PANEL_BG }}
        >
          ✕
        </button>

        <h2 className="font-pixel text-xl text-white mb-6">학급에 참여하기</h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label htmlFor="join-code" className="block text-sm font-bold text-gray-400 mb-2">
              학급 코드
            </label>
            <input
              id="join-code"
              type="text"
              value={joinCode}
              onChange={e => { setJoinCode(e.target.value); setError('') }}
              placeholder="바다-여우-17"
              autoFocus
              className="font-pixel w-full rounded-xl px-4 py-3 text-lg text-white outline-none placeholder:text-gray-600"
              style={{ background: PANEL_BG }}
            />
          </div>

          <div>
            <label htmlFor="join-nickname" className="block text-sm font-bold mb-2" style={{ color: WARNING_RED }}>
              내 별명 (실명 쓰지 마세요!)
            </label>
            <input
              id="join-nickname"
              type="text"
              value={nickname}
              onChange={e => { setNickname(e.target.value); setError('') }}
              placeholder="픽셀왕민준"
              maxLength={10}
              className="font-pixel w-full rounded-xl px-4 py-3 text-lg text-white outline-none placeholder:text-gray-600"
              style={{ background: PANEL_BG }}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-400 mb-2">
              비밀번호 4자리 (나만 아는 숫자)
            </label>
            <div className="flex gap-3">
              {pinDigits.map((digit, i) => (
                <input
                  key={i}
                  ref={pinRefs[i]}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  value={digit}
                  onChange={e => { handlePinChange(i, e.target.value); setError('') }}
                  onKeyDown={e => handlePinKeyDown(i, e)}
                  onPaste={handlePinPaste}
                  className="font-pixel w-full aspect-square rounded-xl text-center text-2xl text-white outline-none"
                  style={{ background: PANEL_BG, boxShadow: digit ? `inset 0 0 0 2px ${ACCENT_YELLOW}` : 'none' }}
                />
              ))}
            </div>
          </div>

          {error && (
            <p className="text-center text-base font-bold" style={{ color: ACCENT_YELLOW }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="font-pixel w-full rounded-full px-8 py-4 text-xl text-black transition-all hover:brightness-105 active:scale-[0.98] disabled:opacity-50"
            style={{ background: ACCENT_YELLOW, boxShadow: '0 8px 24px rgba(247,208,112,0.25)' }}
          >
            {loading ? '확인 중...' : '입장하기'}
          </button>
        </form>
      </div>
    </div>
  )
}
