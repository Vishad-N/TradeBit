import { useEffect, useRef, useState } from 'react'
import Reveal from '../shared/Reveal.jsx'
import EventMeta from '../components/EventMeta.jsx'
import { EVENT } from '../content.js'
import { GoldAsset } from '../components/FloatingAssets.jsx'

const FIELDS = [
  {
    id: 'fn',
    name: 'first_name',
    label: 'First name',
    type: 'text',
    autoComplete: 'given-name',
    placeholder: 'Your first name',
    error: 'Please enter your first name.',
    isValid: (v) => v.trim().length >= 2,
  },
  {
    id: 'wa',
    name: 'whatsapp',
    label: 'WhatsApp',
    type: 'tel',
    inputMode: 'tel',
    autoComplete: 'tel',
    placeholder: '+91 98765 43210',
    error: 'Enter a valid WhatsApp number.',
    isValid: (v) => /^[0-9+\s-]{8,16}$/.test(v.trim()),
  },
  {
    id: 'em',
    name: 'email',
    label: 'Email',
    type: 'email',
    autoComplete: 'email',
    placeholder: 'you@example.com',
    error: 'Enter a valid email address.',
    isValid: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()),
  },
]

function RegistrationForm() {
  const [values, setValues] = useState({ fn: '', wa: '', em: '' })
  const [invalid, setInvalid] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const inputRefs = useRef({})
  const successRef = useRef(null)

  useEffect(() => {
    if (submitted) successRef.current.focus()
  }, [submitted])

  const onChange = (field) => (e) => {
    const value = e.target.value
    setValues((v) => ({ ...v, [field.id]: value }))
    // Errors only clear while typing; they are raised on submit, not mid-entry.
    if (invalid[field.id] && field.isValid(value)) setInvalid((s) => ({ ...s, [field.id]: false }))
  }

  const onSubmit = (e) => {
    e.preventDefault()
    const nextInvalid = Object.fromEntries(FIELDS.map((f) => [f.id, !f.isValid(values[f.id])]))
    setInvalid(nextInvalid)
    const firstBad = FIELDS.find((f) => nextInvalid[f.id])
    if (firstBad) {
      inputRefs.current[firstBad.id].focus()
      return
    }
    // TODO: send the registration to the CRM / webhook and fire the Meta Pixel "Lead" event here.
    // Nothing is transmitted yet: the form only validates and shows the confirmation.
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div id="formOk" className="show" role="status" aria-live="polite" tabIndex={-1} ref={successRef}>
        <strong>You&apos;re on the list.</strong>
        <br />
        We&apos;ll send the joining details shortly.
      </div>
    )
  }

  return (
    <form noValidate aria-label="Webinar registration" onSubmit={onSubmit}>
      {FIELDS.map((f) => (
        <div className="fld" key={f.id}>
          <label htmlFor={f.id}>{f.label}</label>
          <input
            ref={(el) => (inputRefs.current[f.id] = el)}
            id={f.id}
            name={f.name}
            type={f.type}
            inputMode={f.inputMode}
            autoComplete={f.autoComplete}
            placeholder={f.placeholder}
            required
            value={values[f.id]}
            onChange={onChange(f)}
            aria-invalid={invalid[f.id] || undefined}
            aria-describedby={invalid[f.id] ? `e-${f.id}` : undefined}
          />
          <span className="err" id={`e-${f.id}`}>
            {f.error}
          </span>
        </div>
      ))}
      <button className="btn light block" type="submit">
        Reserve my free seat <span aria-hidden="true">↗</span>
      </button>
      <p className="fine">
        By registering you agree to receive webinar details on WhatsApp and email. Educational content only; no trading
        signals or guaranteed results.
      </p>
    </form>
  )
}

export default function Registration({ ref }) {
  return (
    <section id="register" ref={ref}>
      <GoldAsset />
      <div className="wrap">
        <Reveal className="glass g3 reg-panel">
          <div className="rgrid">
            <div>
              <p className="label">Registration</p>
              <h2>Reserve your seat.</h2>
              <p className="reg-sub">Live Trading Masterclass</p>
              <EventMeta items={[EVENT.date, EVENT.time, 'Online']} />
            </div>
            <div>
              <RegistrationForm />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
