import { useRef } from 'react'
import Snowfall from './components/Snowfall.jsx'
import StickyCta from './components/StickyCta.jsx'
import Agenda from './sections/Agenda.jsx'
import Audience from './sections/Audience.jsx'
import Authority from './sections/Authority.jsx'
import Compare from './sections/Compare.jsx'
import Course from './sections/Course.jsx'
import EventDetails from './sections/EventDetails.jsx'
import Faq from './sections/Faq.jsx'
import FinalCta from './sections/FinalCta.jsx'
import Footer from './sections/Footer.jsx'
import Framework from './sections/Framework.jsx'
import Header from './sections/Header.jsx'
import Hero from './sections/Hero.jsx'
import Learn from './sections/Learn.jsx'
import Materials from './sections/Materials.jsx'
import Mentor from './sections/Mentor.jsx'
import Problem from './sections/Problem.jsx'
import Registration from './sections/Registration.jsx'
import Testimonials from './sections/Testimonials.jsx'

// Trade Bit — Live Trading Masterclass landing page, served at /tt-1/.
export default function TradeBitPage() {
  // The sticky mobile CTA shows between the hero and the registration panel.
  const heroRef = useRef(null)
  const registerRef = useRef(null)

  return (
    <>
      <Snowfall />
      <Header />
      <main id="top">
        <Hero ref={heroRef} />
        <EventDetails />
        <Problem />
        <Learn />
        <Framework />
        <Compare />
        <Mentor />
        <Authority />
        <Course />
        <Materials />
        <Testimonials />
        <Audience />
        <Agenda />
        <Registration ref={registerRef} />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
      <StickyCta heroRef={heroRef} registerRef={registerRef} />
    </>
  )
}
