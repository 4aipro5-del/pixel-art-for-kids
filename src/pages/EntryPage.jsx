import { useState, useEffect } from 'react'

const RAINBOW_COLORS = [
  '#F87171', '#FB923C', '#FCD34D',
  '#4ADE80', '#38BDF8', '#6366F1', '#C084FC',
]

const FLOATER_COLORS = [
  '#F87171', '#FB923C', '#FCD34D', '#4ADE80',
  '#38BDF8', '#6366F1', '#C084FC', '#F472B6',
]

export default function EntryPage({ onNext }) {
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [floaters, setFloaters] = useState([])

  useEffect(() => {
    setFloaters(
      Array.from({ length: 32 }, (_, i) => ({
        id: i,
        color: FLOATER_COLORS[i % FLOATER_COLORS.length],
        size: 10 + (i * 7) % 30,
        left: (i * 31 + 5) % 96,
        top: (i * 23 + 8) % 92,
        duration: 2.5 + (i % 5) * 0.7,
        delay: (i % 6) * 0.5,
        opacity: 0.12 + (i % 4) * 0.06,
      }))
    )
  }, [])

  const handleSubmit = (e) => {
    e?.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) { setError('이름을 입력해주세요!'); return }
    onNext(trimmed)
  }

  return (
    <div
      className="relative h-screen w-screen flex items-center justify-center overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #FEF9C3 0%, #FCE7F3 35%, #EDE9FE 65%, #DBEAFE 100%)',
      }}
    >
      {/* Floating pixel decorations */}
      {floaters.map(f => (
        <div
          key={f.id}
          className="absolute rounded-xl pointer-events-none"
          style={{
            left: `${f.left}%`,
            top: `${f.top}%`,
            width: f.size,
            height: f.size,
            background: f.color,
            opacity: f.opacity,
            animation: `pixel-float ${f.duration}s ease-in-out ${f.delay}s infinite`,
          }}
        />
      ))}

      {/* Main content */}
      <div className="relative z-10 w-full max-w-xl mx-auto px-8 flex flex-col items-center gap-10">

        {/* Title section */}
        <div className="flex flex-col items-center gap-5">
          {/* Rainbow pixel bar */}
          <div className="flex gap-2.5">
            {RAINBOW_COLORS.map((c, i) => (
              <div
                key={i}
                className="w-8 h-8 rounded-xl"
                style={{ background: c, boxShadow: `0 3px 10px ${c}55` }}
              />
            ))}
          </div>

          {/* Main title — DungGeunMo pixel font */}
          <h1
            className="font-pixel text-center leading-tight"
            style={{
              fontSize: 'clamp(3.2rem, 9vw, 5.5rem)',
              color: '#1E1B4B',
              letterSpacing: '0.04em',
            }}
          >
            PIXEL ART
          </h1>

          {/* Subtitle */}
          <p
            className="font-pixel text-gray-500 text-center"
            style={{ fontSize: 'clamp(1.4rem, 4vw, 2.2rem)' }}
          >
            나만의 픽셀 아트를 그려봐요.
          </p>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4 w-full">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-base text-gray-400 whitespace-nowrap font-semibold">이름을 입력하고 시작해요</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Form */}
        <div className="w-full flex flex-col gap-4">
          <input
            type="text"
            value={name}
            onChange={e => { setName(e.target.value); setError('') }}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="내 이름은..."
            maxLength={10}
            autoFocus
            className="w-full px-6 text-xl text-center border-2 border-white/70 rounded-2xl outline-none transition-all placeholder:text-gray-300 focus:border-[#7C6AFF] focus:ring-4 focus:ring-[#7C6AFF]/15"
            style={{
              paddingTop: '1.25rem',
              paddingBottom: '1.25rem',
              background: 'rgba(255,255,255,0.85)',
              backdropFilter: 'blur(8px)',
              boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
            }}
          />

          {error && (
            <p className="text-center text-sm text-red-400 font-bold">{error}</p>
          )}

          <button
            onClick={handleSubmit}
            className="w-full rounded-2xl text-xl font-bold text-white transition-all hover:scale-[1.02] active:scale-[0.97]"
            style={{
              paddingTop: '1.25rem',
              paddingBottom: '1.25rem',
              background: 'linear-gradient(135deg, #7C6AFF 0%, #A78BFF 100%)',
              boxShadow: '0 4px 24px rgba(124,106,255,0.40)',
            }}
          >
            시작하기 →
          </button>
        </div>
      </div>
    </div>
  )
}
