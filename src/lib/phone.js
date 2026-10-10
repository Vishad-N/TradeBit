// Phone numbers are a country code (dropdown) plus exactly 10 digits typed by the visitor.
export const PHONE_DIGITS = 10

/** Keeps digits only and caps the length, so letters, spaces and extra digits can never be typed or pasted. */
export const cleanPhone = value => String(value ?? '').replace(/\D/g, '').slice(0, PHONE_DIGITS)

export const isValidPhone = value => cleanPhone(value).length === PHONE_DIGITS && String(value).replace(/\D/g, '').length === PHONE_DIGITS

export const PHONE_ERROR = `Enter a ${PHONE_DIGITS}-digit phone number (numbers only).`
