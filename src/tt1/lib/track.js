// Fires the Meta Pixel "Lead" event after a successful webinar registration.
// A no-op until the Pixel base code (which defines window.fbq) is added to tt-1/index.html.
export function trackLead() {
  try { if (typeof window.fbq === 'function') window.fbq('track', 'Lead'); } catch { /* tracking must never break sign-up */ }
}
