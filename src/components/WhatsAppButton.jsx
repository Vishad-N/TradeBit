import { useLocation } from 'react-router-dom';
import { WHATSAPP_MESSAGE, WHATSAPP_NUMBER } from '../config/learn.js';

// Sticky chat button, shown site-wide except in the admin area.
export default function WhatsAppButton() {
  const { pathname } = useLocation();
  if (!WHATSAPP_NUMBER || pathname.startsWith('/admin')) return null;
  const href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;
  return (
    <a className="wa-fab" href={href} target="_blank" rel="noopener noreferrer" aria-label="Chat with us on WhatsApp">
      <svg viewBox="0 0 32 32" aria-hidden="true"><path fill="currentColor" d="M16.04 3C9.4 3 4 8.4 4 15.04c0 2.12.55 4.19 1.6 6.01L4 28l7.12-1.87a12 12 0 0 0 4.92 1.05C22.68 27.18 28 21.78 28 15.14 28 8.4 22.68 3 16.04 3Zm0 21.98c-1.5 0-2.96-.4-4.24-1.16l-.3-.18-4.22 1.1 1.13-4.1-.2-.32a9.9 9.9 0 0 1-1.52-5.28c0-5.5 4.48-9.98 9.98-9.98 5.52 0 9.98 4.48 9.98 9.98 0 5.5-4.46 9.94-9.94 9.94h-.67Zm5.46-7.46c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.22 3.08.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.7.63.71.23 1.36.2 1.88.12.57-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35Z"/></svg>
      <span className="wa-tip">Chat on WhatsApp</span>
    </a>
  );
}
