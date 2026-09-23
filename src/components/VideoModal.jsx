import { useEffect, useRef } from 'react';

export default function VideoModal({ open, onClose }) {
  const closeRef = useRef(null);

  // Move focus into the dialog on open, and back to whatever opened it on close.
  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement;
    // The dialog is still visibility:hidden on the first frame of its fade-in,
    // and hidden elements can't take focus — so wait for the transition to start.
    const t = setTimeout(() => closeRef.current?.focus(), 50);
    return () => { clearTimeout(t); opener?.focus?.(); };
  }, [open]);

  return (
    <div className={open ? 'modal open' : 'modal'} role="dialog" aria-modal="true" aria-label="Overview video" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <button ref={closeRef} type="button" className="modal-x" aria-label="Close video" onClick={onClose}>✕</button>
        <div><p>A 2-minute tour of the TradeBit method</p><small>Embed your overview video (YouTube, Vimeo or MP4) inside this frame.</small></div>
      </div>
    </div>
  );
}
