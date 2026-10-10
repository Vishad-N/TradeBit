import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { prefersReducedMotion } from '../shared/utils.js'
import { CLOCK_PULSE_EVENT, FlipDigit, useSecondsLeft } from './FlipCountdown.jsx'
import { COUNTRIES } from '../../lib/countries.js'
import { PHONE_ERROR, cleanPhone, isValidPhone } from '../../lib/phone.js'
import PhoneField from '../../components/PhoneField.jsx'
import { registerWebinar } from '../lib/registerWebinar.js'

// Timing: the popup opens FIRST_DELAY_MS after the page loads and stays until it is closed. Once closed it
// comes back CYCLE_MS later, and keeps repeating. It stops for good once the visitor has registered.
const FIRST_DELAY_MS = 20_000
const CYCLE_MS = 5 * 60_000
const CLOSE_MS = 720
const REGISTERED_KEY = 'tb-registered'

const wasRegistered = () => {
  try { return localStorage.getItem(REGISTERED_KEY) === '1' } catch { return false }
}

const FIELD_RULES = {
  name: { error: 'Please enter your full name.', ok: v => v.trim().length >= 2 },
  email: { error: 'Enter a valid email address.', ok: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) },
  phone: { error: PHONE_ERROR, ok: v => isValidPhone(v) },
}

// Analog clock face: a ring that sweeps once a minute, 60 ticks, real-time hands and a second hand that
// ticks once a second.
function ClockFace() {
  const [now, setNow] = useState(() => new Date())
  const ticks = useRef(Math.floor(Date.now() / 1000))
  useEffect(() => {
    const id = setInterval(() => { ticks.current += 1; setNow(new Date()) }, 1000)
    return () => clearInterval(id)
  }, [])
  const sec = ticks.current * 6
  const min = now.getMinutes() * 6 + now.getSeconds() * 0.1
  const hr = (now.getHours() % 12) * 30 + now.getMinutes() * 0.5
  const R = 112
  return (
    <svg className="up-face" viewBox="0 0 240 240" aria-hidden="true">
      <defs>
        <radialGradient id="up-glow" cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#d7b56d" stopOpacity=".28" />
          <stop offset="1" stopColor="#d7b56d" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="120" cy="120" r="118" fill="url(#up-glow)" />
      <circle cx="120" cy="120" r={R} fill="rgba(7,17,14,.55)" stroke="rgba(231,240,234,.16)" />
      <circle
        className="up-ring"
        cx="120" cy="120" r={R} fill="none" stroke="#d7b56d" strokeWidth="3" strokeLinecap="round"
        strokeDasharray={2 * Math.PI * R} transform="rotate(-90 120 120)"
        style={{ '--len': 2 * Math.PI * R }}
      />
      {Array.from({ length: 60 }, (_, i) => {
        const major = i % 5 === 0
        return (
          <line key={i} x1="120" x2="120" y1={major ? 14 : 17} y2={major ? 26 : 22}
            stroke="#e7f0ea" strokeOpacity={major ? 0.9 : 0.35} strokeWidth={major ? 2.2 : 1}
            transform={`rotate(${i * 6} 120 120)`} />
        )
      })}
      <line className="up-hand" x1="120" y1="120" x2="120" y2="64" stroke="#e7f0ea" strokeWidth="4.5" strokeLinecap="round" style={{ transform: `rotate(${hr}deg)` }} />
      <line className="up-hand" x1="120" y1="120" x2="120" y2="40" stroke="#e7f0ea" strokeWidth="3" strokeLinecap="round" style={{ transform: `rotate(${min}deg)` }} />
      <g className="up-hand up-sec" style={{ transform: `rotate(${sec}deg)` }}>
        <line x1="120" y1="136" x2="120" y2="30" stroke="#d7b56d" strokeWidth="2" strokeLinecap="round" />
        <circle cx="120" cy="30" r="3.4" fill="#d7b56d" />
      </g>
      <circle cx="120" cy="120" r="6" fill="#d7b56d" />
      <circle cx="120" cy="120" r="2.2" fill="#07110e" />
    </svg>
  )
}

function BigCountdown() {
  const left = useSecondsLeft()
  const parts = [
    ['hours', String(Math.floor(left / 3600)).padStart(2, '0')],
    ['minutes', String(Math.floor((left % 3600) / 60)).padStart(2, '0')],
    ['seconds', String(left % 60).padStart(2, '0')],
  ]
  return (
    <div className="up-count" role="timer" aria-label={`Seats close in ${parts[0][1]} hours ${parts[1][1]} minutes ${parts[2][1]} seconds`}>
      {parts.map(([unit, val], i) => (
        <span className="up-unit" key={unit}>
          {i > 0 && <b className="up-colon" aria-hidden="true">:</b>}
          <span className="up-pair">
            <FlipDigit value={val[0]} />
            <FlipDigit value={val[1]} />
          </span>
          <small aria-hidden="true">{unit}</small>
        </span>
      ))}
    </div>
  )
}

function RegisterForm({ onDone }) {
  const [v, setV] = useState({ name: '', email: '', iso: 'IN', phone: '' })
  const [bad, setBad] = useState({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const refs = useRef({})
  const set = k => e => {
    const value = e.target.value
    setV(s => ({ ...s, [k]: value }))
    if (bad[k] && FIELD_RULES[k]?.ok(value)) setBad(b => ({ ...b, [k]: false }))
  }
  const submit = async e => {
    e.preventDefault()
    setError('')
    const next = Object.fromEntries(Object.keys(FIELD_RULES).map(k => [k, !FIELD_RULES[k].ok(v[k])]))
    setBad(next)
    const first = Object.keys(next).find(k => next[k])
    if (first) { refs.current[first]?.focus(); return }
    const dial = COUNTRIES.find(c => c.iso === v.iso)?.dial ?? ''
    setBusy(true)
    try {
      await registerWebinar({ name: v.name.trim(), email: v.email.trim(), phone: dial + cleanPhone(v.phone), country: v.iso, source: 'popup' })
    } catch (err) {
      setError(err.message)
      setBusy(false)
      return
    }
    // TODO: fire the Meta Pixel "Lead" event here.
    try { localStorage.setItem(REGISTERED_KEY, '1') } catch { /* storage blocked: popup may return next visit */ }
    onDone()
  }
  return (
    <form className="up-form" noValidate onSubmit={submit} aria-label="Webinar registration">
      <p className="up-kicker">Free live masterclass</p>
      <h2 id="up-title">Reserve your seat</h2>
      <p className="up-formsub">Three details and you&apos;re in. We&apos;ll send the joining link on WhatsApp and email.</p>

      <div className="up-fld">
        <label htmlFor="up-name">Full name</label>
        <input id="up-name" ref={el => (refs.current.name = el)} value={v.name} onChange={set('name')} autoComplete="name" placeholder="Your full name" aria-invalid={bad.name || undefined} />
        <span className="up-err">{FIELD_RULES.name.error}</span>
      </div>
      <div className="up-fld">
        <label htmlFor="up-email">Email</label>
        <input id="up-email" ref={el => (refs.current.email = el)} type="email" value={v.email} onChange={set('email')} autoComplete="email" placeholder="you@example.com" aria-invalid={bad.email || undefined} />
        <span className="up-err">{FIELD_RULES.email.error}</span>
      </div>
      <div className="up-fld">
        <label htmlFor="up-phone">WhatsApp / phone number</label>
        <PhoneField id="up-phone" className="up-phone" iso={v.iso} digits={v.phone} invalid={bad.phone} inputRef={el => (refs.current.phone = el)}
          onChange={({ iso, digits }) => { setV(s => ({ ...s, iso, phone: digits })); if (bad.phone && isValidPhone(digits)) setBad(b => ({ ...b, phone: false })) }} />
        <span className="up-err">{FIELD_RULES.phone.error}</span>
      </div>
      {error && <p className="up-error" role="alert">{error}</p>}
      <button className="up-cta" type="submit" disabled={busy}>{busy ? 'Please wait…' : 'Reserve my free seat'} <span aria-hidden="true">↗</span></button>
      <p className="up-fine">Educational content only; no trading signals or guaranteed results.</p>
    </form>
  )
}

export default function UrgencyPopup() {
  const [phase, setPhase] = useState('hidden') // hidden | open | closing
  const [view, setView] = useState('clock') // clock | form | done
  const phaseRef = useRef('hidden')
  const viewRef = useRef('clock')
  const cardRef = useRef(null)
  const closeBtn = useRef(null)
  const rootRef = useRef(null)
  const clockRef = useRef(null)
  const timers = useRef([])
  const shownOnce = useRef(false)
  phaseRef.current = phase
  viewRef.current = view

  const later = (fn, ms) => { const t = setTimeout(fn, ms); timers.current.push(t); return t }

  const close = useCallback(() => {
    if (phaseRef.current !== 'open') return
    const card = cardRef.current
    const target = document.querySelector('.flipcd')
    if (card && target) {
      // Fly the card into the sticky timer: translate its centre onto the timer's centre while it shrinks.
      const a = card.getBoundingClientRect()
      const b = target.getBoundingClientRect()
      card.style.setProperty('--dx', `${b.left + b.width / 2 - (a.left + a.width / 2)}px`)
      card.style.setProperty('--dy', `${b.top + b.height / 2 - (a.top + a.height / 2)}px`)
    }
    setPhase('closing')
    later(() => window.dispatchEvent(new Event(CLOCK_PULSE_EVENT)), prefersReducedMotion ? 0 : CLOSE_MS - 160)
    later(() => setPhase('hidden'), prefersReducedMotion ? 150 : CLOSE_MS)
  }, [])

  const openPopup = useCallback(() => {
    if (phaseRef.current !== 'hidden' || wasRegistered()) return
    shownOnce.current = true
    setView('clock')
    setPhase('open')
  }, [])

  // First open FIRST_DELAY_MS after the page loads.
  useEffect(() => {
    if (wasRegistered()) return undefined
    const t = setTimeout(openPopup, FIRST_DELAY_MS)
    return () => clearTimeout(t)
  }, [openPopup])

  // After each close, schedule the next appearance CYCLE_MS later.
  useEffect(() => {
    if (phase !== 'hidden' || !shownOnce.current || wasRegistered()) return undefined
    const t = setTimeout(openPopup, CYCLE_MS)
    return () => clearTimeout(t)
  }, [phase, openPopup])

  // The expanding rings radiate from the middle of the clock: measure it and hand the centre to CSS.
  useLayoutEffect(() => {
    if (phase !== 'open') return undefined
    const place = () => {
      const root = rootRef.current
      const el = clockRef.current
      if (!root) return
      if (!el) { root.style.setProperty('--cx', '50%'); root.style.setProperty('--cy', '38%'); return }
      const r = el.getBoundingClientRect()
      root.style.setProperty('--cx', `${r.left + r.width / 2}px`)
      root.style.setProperty('--cy', `${r.top + r.height / 2}px`)
      root.style.setProperty('--cs', `${r.width}px`)
    }
    place()
    window.addEventListener('resize', place)
    const t = setTimeout(place, 760) // after the card's entrance animation has settled
    return () => { window.removeEventListener('resize', place); clearTimeout(t) }
  }, [phase, view])

  // Lock page scroll, move focus into the dialog and close on Escape while it is open.
  useEffect(() => {
    if (phase !== 'open') return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeBtn.current?.focus()
    const onKey = e => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey) }
  }, [phase, close])

  // After a successful registration, show the thank-you for a moment and tuck the popup away.
  const onDone = () => { setView('done'); later(close, 2600) }

  if (phase === 'hidden') return null
  return (
    <div ref={rootRef} className={`up-root ${phase}`} role="dialog" aria-modal="true" aria-labelledby="up-title">
      <div className="up-bg" aria-hidden="true">
        <i /><i /><i /><i />
      </div>
      <div className="up-card" ref={cardRef}>
        <button type="button" ref={closeBtn} className="up-x" onClick={close} aria-label="Close and shrink into the countdown timer">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>

        {view === 'clock' && (
          <div className="up-main">
            <p className="up-pill"><span aria-hidden="true" /> Live masterclass · seats filling fast</p>
            <div className="up-clock" ref={clockRef}><ClockFace /></div>
            <h2 id="up-title">Hurry up. <em>The clock is ticking.</em></h2>
            <p className="up-sub">Free seats for the live 1% Club masterclass close when the timer hits zero. Once they&apos;re gone, they&apos;re gone.</p>
            <BigCountdown />
            <div className="up-actions">
              <button type="button" className="up-cta" onClick={() => setView('form')}>Register now <span aria-hidden="true">↗</span></button>
              <button type="button" className="up-later" onClick={close}>Maybe later</button>
            </div>
          </div>
        )}
        {view === 'form' && <RegisterForm onDone={onDone} />}
        {view === 'done' && (
          <div className="up-done" role="status">
            <svg viewBox="0 0 64 64" fill="none" stroke="#d7b56d" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="32" cy="32" r="28" /><path className="up-tick" d="M19 33l9 9 17-19" /></svg>
            <h2 id="up-title">You&apos;re on the list.</h2>
            <p>We&apos;ll send the joining details shortly.</p>
          </div>
        )}
      </div>
    </div>
  )
}
