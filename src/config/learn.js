// Links for the "Ways to Learn" section. Set these in the frontend .env (see .env.example); nothing here is invented.
//
//   VITE_YOUTUBE_PLAYLIST_ID   the playlist id, e.g. PLxxxxxxxxxxxxxxxx  (the part after "list=" in the playlist URL)
//   VITE_CLASSPLUS_URL         the public Classplus course link
//   VITE_CLASSPLUS_PREVIEW_URL optional: a real course screenshot / thumbnail supplied by the client
//                              (put the file in /public and use e.g. /classplus-preview.jpg)
const env = import.meta.env;

const playlistId = (env.VITE_YOUTUBE_PLAYLIST_ID || '').trim();

export const LEARN = {
  youtubePlaylistId: playlistId,
  youtubePlaylistUrl: playlistId ? `https://www.youtube.com/playlist?list=${encodeURIComponent(playlistId)}` : '',
  // youtube-nocookie + no autoplay: nothing plays (or tracks) until the visitor presses play.
  youtubeEmbedUrl: playlistId ? `https://www.youtube-nocookie.com/embed/videoseries?list=${encodeURIComponent(playlistId)}&rel=0&modestbranding=1` : '',
  classplusUrl: (env.VITE_CLASSPLUS_URL || '').trim(),
  classplusPreviewUrl: (env.VITE_CLASSPLUS_PREVIEW_URL || '').trim(),
};
