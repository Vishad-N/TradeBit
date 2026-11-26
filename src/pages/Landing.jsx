import { startTransition, useCallback, useEffect, useState } from 'react';
import Nav, { NAV_LINKS } from '../components/Nav.jsx';
import Hero from '../components/Hero.jsx';
import Trust from '../components/Trust.jsx';
import Problem from '../components/Problem.jsx';
import Solution from '../components/Solution.jsx';
import Method from '../components/Method.jsx';
import Education from '../components/Education.jsx';
import WaysToLearn from '../components/WaysToLearn.jsx';
import LiveAnalysis from '../components/LiveAnalysis.jsx';
import Mentor from '../components/Mentor.jsx';
import Platform from '../components/Platform.jsx';
import TradingPlatforms from '../components/TradingPlatforms.jsx';
import Stories from '../components/Stories.jsx';
import Offer from '../components/Offer.jsx';
import FinalCta from '../components/FinalCta.jsx';
import ProfitMarquee from '../components/ProfitMarquee.jsx';
import Footer from '../components/Footer.jsx';
import VideoModal from '../components/VideoModal.jsx';
import { usePageReveal } from '../hooks/motion.js';
import { useScrollState } from '../hooks/useScrollState.js';
import { formatInr, usePricing } from '../context/PricingContext.jsx';

const LINK_HREFS = NAV_LINKS.map(([href]) => href);

// Everything under the hero. It is rendered just after the first paint, so the nav and headline are not held back
// while the browser builds and lays out thousands of nodes that are not on screen yet.
function BelowHero({ onPlayVideo }) {
  usePageReveal(); // lives here so that it runs once these sections are in the DOM
  return (
    <>
      <Trust />
      <Mentor />
      <Problem />
      <Solution />
      <Method />
      <Education />
      <WaysToLearn />
      <LiveAnalysis />
      <Platform />
      <TradingPlatforms />
      <Stories onPlayVideo={onPlayVideo} />
      <Offer />
      <FinalCta />
    </>
  );
}

function useAfterFirstPaint() {
  // A link straight to a section (/#offer) needs that section immediately.
  const [ready, setReady] = useState(() => Boolean(window.location.hash));
  useEffect(() => {
    if (ready) return undefined;
    let timer;
    // rAF runs just before the paint; the timeout inside it runs just after.
    const raf = requestAnimationFrame(() => { timer = setTimeout(() => startTransition(() => setReady(true))); });
    // rAF does not fire in a background tab, so a plain timer makes sure the page is complete there too.
    const fallback = setTimeout(() => setReady(true), 1000);
    return () => { cancelAnimationFrame(raf); clearTimeout(timer); clearTimeout(fallback); };
  }, [ready]);
  return ready;
}

export default function Landing() {
  const { invitation } = usePricing();
  const [menuOpen, setMenuOpen] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);
  const showRest = useAfterFirstPaint();
  const { solid, activeHref, showCta } = useScrollState(LINK_HREFS, menuOpen, showRest);

  const openVideo = useCallback(() => setVideoOpen(true), []);
  const closeVideo = useCallback(() => setVideoOpen(false), []);

  useEffect(() => {
    document.body.classList.toggle('m-open', menuOpen);
  }, [menuOpen]);

  // The hero is dark, so the transparent nav (before it turns solid) needs light text on this page only.
  useEffect(() => {
    document.body.classList.add('lp');
    return () => document.body.classList.remove('lp');
  }, []);

  useEffect(() => {
    const onKey = e => {
      if (e.key !== 'Escape') return;
      setVideoOpen(false);
      setMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <Nav
        solid={solid}
        activeHref={activeHref}
        menuOpen={menuOpen}
        onToggleMenu={() => setMenuOpen(o => !o)}
        onCloseMenu={() => setMenuOpen(false)}
      />
      <main id="main">
        <Hero onPlayVideo={openVideo} />
        {showRest && <BelowHero onPlayVideo={openVideo} />}
      </main>
      {showRest && (
        <>
          <ProfitMarquee />
          <Footer />
        </>
      )}
      <div className={showCta ? 'm-cta show' : 'm-cta'}><a href="#offer">START YOUR JOURNEY → <small>{formatInr(invitation.price)}</small></a></div>
      <VideoModal open={videoOpen} onClose={closeVideo} />
    </>
  );
}
