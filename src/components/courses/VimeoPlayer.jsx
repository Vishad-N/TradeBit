import { useEffect, useRef } from 'react';

const LOAD_TIMEOUT_MS = 25000;

// Wrapper around the official Vimeo Player SDK (@vimeo/player), loaded on demand so it never weighs on the rest of the
// site. We create the player iframe ourselves and hand it to the SDK: that works for public, unlisted (privacy hash)
// and domain-restricted videos alike, with no oEmbed lookup. Mount with a `key` per lesson; the props are read once.
//   onReady({ duration })    the player is usable
//   onTime({ seconds, duration, percent })   ~4x a second while playing
//   onPause() / onEnded()
//   onError(message)         private / removed / blocked video, or the SDK could not load
export default function VimeoPlayer({ vimeoId, hash, startAt = 0, onReady, onTime, onPause, onEnded, onError }) {
  const host = useRef(null);
  const cb = useRef({});
  cb.current = { onReady, onTime, onPause, onEnded, onError };
  const start = useRef(startAt);

  useEffect(() => {
    let player;
    let dead = false;
    let ready = false;
    const fail = (m) => { if (!dead) cb.current.onError?.(m); };
    const timer = setTimeout(() => { if (!ready) fail('The video is taking too long to load. Check your connection and try again.'); }, LOAD_TIMEOUT_MS);

    (async () => {
      try {
        const { default: Player } = await import('@vimeo/player');
        if (dead || !host.current) return;
        // Unlisted videos carry a privacy hash (h=); do-not-track keeps Vimeo from setting tracking cookies.
        const q = new URLSearchParams({ dnt: '1', title: '0', byline: '0', portrait: '0', ...(hash ? { h: hash } : {}) });
        const iframe = document.createElement('iframe');
        iframe.src = `https://player.vimeo.com/video/${encodeURIComponent(vimeoId)}?${q}`;
        iframe.allow = 'autoplay; fullscreen; picture-in-picture';
        iframe.allowFullscreen = true;
        iframe.title = 'Lesson video';
        iframe.setAttribute('frameborder', '0');
        host.current.appendChild(iframe);

        player = new Player(iframe);
        player.on('timeupdate', (d) => cb.current.onTime?.(d));
        player.on('pause', () => cb.current.onPause?.());
        player.on('ended', () => cb.current.onEnded?.());
        player.on('error', (e) => fail(e?.message || 'This video could not be played.'));
        await player.ready();
        if (dead) return;
        ready = true;
        const duration = await player.getDuration().catch(() => 0);
        // Resume where the student stopped, unless they were practically at the start or the end.
        if (start.current > 5 && (!duration || duration - start.current > 8)) await player.setCurrentTime(start.current).catch(() => undefined);
        cb.current.onReady?.({ duration });
      } catch (e) {
        fail(e?.name === 'TypeError' ? 'The video player could not be loaded. Check your connection and reload.' : (e?.message || 'This video could not be loaded. It may be private or removed in Vimeo.'));
      }
    })();

    return () => {
      dead = true;
      clearTimeout(timer);
      if (player) player.destroy().catch(() => undefined);
      if (host.current) host.current.textContent = '';
    };
  }, [vimeoId, hash]);

  return <div className="cs-vimeo" ref={host} />;
}
