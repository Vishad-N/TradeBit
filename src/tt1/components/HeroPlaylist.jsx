// Free YouTube playlist preview for the hero. The embed is lazy-loaded (youtube-nocookie, no autoplay), so
// nothing plays or tracks until the visitor presses play.
const PLAYLIST_ID = 'PLOhfC5cp83nw'
const EMBED = `https://www.youtube-nocookie.com/embed/videoseries?list=${PLAYLIST_ID}&rel=0&modestbranding=1`
const PAGE = `https://www.youtube.com/playlist?list=${PLAYLIST_ID}`

export default function HeroPlaylist() {
  return (
    <figure className="hpl" aria-label="Free TradeBit India YouTube playlist">
      <figcaption className="hpl-cap">
        <span className="label">Free playlist · Watch first</span>
        <a className="hpl-link" href={PAGE} target="_blank" rel="noopener noreferrer">Open on YouTube <span aria-hidden="true">↗</span></a>
      </figcaption>
      <div className="hpl-frame">
        <iframe
          src={EMBED}
          title="TradeBit India free trading playlist"
          loading="lazy"
          allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      </div>
    </figure>
  )
}
