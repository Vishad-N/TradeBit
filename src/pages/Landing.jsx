import { useCallback, useEffect, useState } from 'react';
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
import Footer from '../components/Footer.jsx';
import VideoModal from '../components/VideoModal.jsx';
import { usePageReveal } from '../hooks/motion.js';
import { useScrollState } from '../hooks/useScrollState.js';

const LINK_HREFS = NAV_LINKS.map(([href]) => href);

export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);
  const { solid, activeHref, showCta } = useScrollState(LINK_HREFS, menuOpen);
  usePageReveal();

  const openVideo = useCallback(() => setVideoOpen(true), []);
  const closeVideo = useCallback(() => setVideoOpen(false), []);

  useEffect(() => {
    document.body.classList.toggle('m-open', menuOpen);
  }, [menuOpen]);

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
        <Stories onPlayVideo={openVideo} />
        <Offer />
        <FinalCta />
      </main>
      <Footer />
      <div className={showCta ? 'm-cta show' : 'm-cta'}><a href="#offer">START YOUR JOURNEY → <small>₹0</small></a></div>
      <VideoModal open={videoOpen} onClose={closeVideo} />
    </>
  );
}
