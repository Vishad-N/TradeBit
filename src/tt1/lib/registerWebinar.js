// Sends a webinar registration to the backend (stored, then listed in Admin -> Webinar Registrations).
const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1').replace(/\/$/, '')

export async function registerWebinar({ name, email, phone, country, source }) {
  let res
  try {
    res = await fetch(`${API_URL}/webinar/registrations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, phone, country, source }),
    })
  } catch {
    throw new Error('Network error. Check your connection and try again.')
  }
  if (!res.ok) {
    let message = ''
    try {
      const body = await res.json()
      message = Array.isArray(body.message) ? body.message[0] : body.message
    } catch { /* not json */ }
    if (res.status === 429) message = 'Too many attempts. Please wait a minute and try again.'
    throw new Error(message || 'Could not save your registration. Please try again.')
  }
}
