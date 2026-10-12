// Turns a pasted video link into something the testimonial player can show.
// Returns { type: 'embed', src } for YouTube / Vimeo, { type: 'file', src } for a direct video file,
// or null when the link is not a recognised video (the caller then opens it in a new tab).
export function parseVideo(raw) {
  let u;
  try { u = new URL(String(raw || '').trim()); } catch { return null; }
  if (u.protocol !== 'https:') return null;
  const host = u.hostname.replace(/^www\.|^m\./, '');

  let id = '';
  if (host === 'youtu.be') id = u.pathname.slice(1).split('/')[0];
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    if (u.pathname === '/watch') id = u.searchParams.get('v') || '';
    else { const m = u.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]{6,})/); id = m ? m[1] : ''; }
  }
  if (/^[\w-]{6,}$/.test(id)) {
    return { type: 'embed', src: `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1` };
  }

  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const m = u.pathname.match(/(\d{5,})/);
    if (m) return { type: 'embed', src: `https://player.vimeo.com/video/${m[1]}?autoplay=1` };
  }

  if (/\.(mp4|webm|ogg)$/i.test(u.pathname)) return { type: 'file', src: u.toString() };
  return null;
}
