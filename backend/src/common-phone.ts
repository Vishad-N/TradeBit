/** Country calling codes offered in the sign-up forms (keep in step with src/lib/countries.js). */
const DIAL_CODES = ['968', '254', '977', '965', '234', '974', '852', '966', '971', '973', '880', '63', '34', '49', '62', '66', '61', '33', '31', '65', '60', '91', '92', '27', '94', '44', '39', '55', '1'];

/** A phone number is "+" + one of the offered country codes + exactly 10 digits. */
export const PHONE_PATTERN = new RegExp(`^\\+(?:${DIAL_CODES.join('|')})[0-9]{10}$`);
export const PHONE_MESSAGE = 'Enter a 10-digit phone number with a country code';
