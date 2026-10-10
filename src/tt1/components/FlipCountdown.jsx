import { useEffect, useRef, useState } from 'react'

// Decorative urgency timer. It is NOT tied to a real event: each visitor gets a rolling 2-hour window that is
// remembered in localStorage and restarted when it runs out.
const WINDOW_SECONDS = 2 * 60 * 60
const STORAGE_KEY = 'tb-1pc-deadline'

function readDeadline() {
  const now = Date.now()
  try {
    const saved = Number(localStorage.getItem(STORAGE_KEY))
    if (saved > now) return saved
    const next = now + WINDOW_SECONDS * 1000
    localStorage.setItem(STORAGE_KEY, String(next))
    return next
  } catch {
    // Storage blocked: the timer still runs, it just restarts on reload.
    return now + WINDOW_SECONDS * 1000
  }
}

export function useSecondsLeft() {
  const deadline = useRef(null)
  if (deadline.current === null) deadline.current = readDeadline()
  const calc = () => Math.max(0, Math.round((deadline.current - Date.now()) / 1000))
  const [left, setLeft] = useState(calc)
  useEffect(() => {
    const id = setInterval(() => {
      if (deadline.current - Date.now() <= 0) deadline.current = readDeadline()
      setLeft(calc())
    }, 1000)
    return () => clearInterval(id)
  }, [])
  return left
}

const Half = ({ v, pos, className = '' }) => (
  <span className={`fh ${pos} ${className}`} aria-hidden="true">
    <i>{v}</i>
  </span>
)

// One split-flap digit: the top flap falls over the old digit, then the bottom flap lands with the new one.
export function FlipDigit({ value }) {
  const [state, setState] = useState({ cur: value, prev: value, flip: false })
  useEffect(() => {
    if (value === state.cur) return
    setState({ cur: value, prev: state.cur, flip: true })
    const t = setTimeout(() => setState(s => ({ ...s, prev: s.cur, flip: false })), 520)
    return () => clearTimeout(t)
  }, [value]) // eslint-disable-line react-hooks/exhaustive-deps
  const { cur, prev, flip } = state
  return (
    <span className="fd" aria-hidden="true">
      <Half v={cur} pos="t" />
      <Half v={prev} pos="b" />
      {flip && (
        <>
          <Half key={`t${cur}`} v={prev} pos="t" className="flap-t" />
          <Half key={`b${cur}`} v={cur} pos="b" className="flap-b" />
        </>
      )}
    </span>
  )
}

// Dispatched by the urgency popup when it shrinks into this timer, so the timer can pulse on arrival.
export const CLOCK_PULSE_EVENT = 'tb:clock-pulse'

export default function FlipCountdown() {
  const left = useSecondsLeft()
  const [pulse, setPulse] = useState(false)
  useEffect(() => {
    let t
    const on = () => {
      setPulse(true)
      clearTimeout(t)
      t = setTimeout(() => setPulse(false), 1100)
    }
    window.addEventListener(CLOCK_PULSE_EVENT, on)
    return () => { window.removeEventListener(CLOCK_PULSE_EVENT, on); clearTimeout(t) }
  }, [])
  const h = String(Math.floor(left / 3600)).padStart(2, '0')
  const m = String(Math.floor((left % 3600) / 60)).padStart(2, '0')
  const s = String(left % 60).padStart(2, '0')
  const groups = [['hrs', h], ['min', m], ['sec', s]]
  return (
    <div className={pulse ? 'flipcd pulse' : 'flipcd'} role="timer" aria-label={`Free seats close in ${h} hours ${m} minutes ${s} seconds`}>
      <span className="flipcd-label">Seats close in</span>
      {groups.map(([unit, val]) => (
        <span className="flipcd-grp" key={unit}>
          <span className="flipcd-pair">
            <FlipDigit value={val[0]} />
            <FlipDigit value={val[1]} />
          </span>
          <span className="flipcd-unit" aria-hidden="true">{unit}</span>
        </span>
      ))}
    </div>
  )
}
