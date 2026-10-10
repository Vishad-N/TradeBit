// Links for the "Ways to Learn" section. Set these in the frontend .env (see .env.example); nothing here is invented.
//
//   VITE_YOUTUBE_PLAYLIST_ID   the playlist id, e.g. PLxxxxxxxxxxxxxxxx  (the part after "list=" in the playlist URL)
//   VITE_CLASSPLUS_URL         the public Classplus course link
//   VITE_CLASSPLUS_PREVIEW_URL optional: a real course screenshot / thumbnail supplied by the client
//                              (put the file in /public and use e.g. /classplus-preview.jpg)
const env = import.meta.env;

// Default is the TradeBit India playlist; VITE_YOUTUBE_PLAYLIST_ID overrides it.
const playlistId = (env.VITE_YOUTUBE_PLAYLIST_ID || 'PLOhfC5cp83nw').trim();

// Telegram channel for the "Get Started Now" button. Same link as TELEGRAM_URL in backend/.env; VITE_TELEGRAM_URL overrides it.
export const TELEGRAM_URL = (env.VITE_TELEGRAM_URL || 'https://t.me/tradebitindia_Official').trim();

// WhatsApp number for the sticky chat button (country code + number, digits only). VITE_WHATSAPP_NUMBER overrides it.
export const WHATSAPP_NUMBER = (env.VITE_WHATSAPP_NUMBER || '917805888599').replace(/\D/g, '');
export const WHATSAPP_MESSAGE = 'Hi TradeBit India, I would like to know more about your trading courses.';

// Optional: shown as a footer button only when set (no Instagram link has been supplied yet).
export const INSTAGRAM_URL = (env.VITE_INSTAGRAM_URL || '').trim();
export const TRADINGVIEW_URL = 'https://in.tradingview.com/?aff_id=1172080';

export const LEARN = {
  youtubePlaylistId: playlistId,
  youtubePlaylistUrl: playlistId ? `https://www.youtube.com/playlist?list=${encodeURIComponent(playlistId)}` : '',
  // youtube-nocookie + no autoplay: nothing plays (or tracks) until the visitor presses play.
  youtubeEmbedUrl: playlistId ? `https://www.youtube-nocookie.com/embed/videoseries?list=${encodeURIComponent(playlistId)}&rel=0&modestbranding=1` : '',
  classplusUrl: (env.VITE_CLASSPLUS_URL || '').trim(),
  classplusPreviewUrl: (env.VITE_CLASSPLUS_PREVIEW_URL || '').trim(),
};
